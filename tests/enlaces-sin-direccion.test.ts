// Tests de los enlaces que no llevan http: dominios sueltos, acortadores y
// frases que mandan a un enlace que no se ve (src/lib/resolver.ts y
// src/lib/verificar-mensaje.ts).
import { describe, expect, test } from "bun:test";
import { aludeEnlace, resolverDominiosSueltos } from "../src/lib/resolver";
import { verificarMensaje } from "../src/lib/verificar-mensaje";

const urls = (texto: string) => resolverDominiosSueltos(texto).map((p) => p.url);

describe("resolverDominiosSueltos", () => {
  test("encuentra dominios con www, sin esquema y acortadores", () => {
    expect(urls("Pague en www.dgt-multas-pago.com")).toEqual([
      "https://www.dgt-multas-pago.com",
    ]);
    expect(urls("Pague en dgt-multas-pago.com/expediente.")).toEqual([
      "https://dgt-multas-pago.com/expediente",
    ]);
    expect(urls("Pague las tasas en bit.ly/3xYz9")).toEqual([
      "https://bit.ly/3xYz9",
    ]);
  });

  test("lee también los dominios neutralizados", () => {
    expect(urls("entra en dgt-pago[.]top")).toEqual(["https://dgt-pago.top"]);
  });

  test("no repite lo que ya trae http ni toma correos o abreviaturas", () => {
    expect(urls("Pague en https://dgt-multas.top/pago")).toEqual([]);
    expect(urls("De: correos@correos.com")).toEqual([]);
    expect(urls("Quedamos a las 5, p.ej. en la plaza")).toEqual([]);
    expect(urls("Su multa del 13.06.2024")).toEqual([]);
  });
});

describe("aludeEnlace", () => {
  test("detecta las frases que mandan a un enlace", () => {
    expect(aludeEnlace("Pulse aquí para recibirla.")).toBe("Pulse aquí");
    expect(aludeEnlace("Haga clic aquí")).toBe("Haga clic aquí");
    expect(aludeEnlace("actualícela en el siguiente enlace")).toBe(
      "el siguiente enlace",
    );
    expect(aludeEnlace("Siga las instrucciones: [URL fraudulenta]")).toBe(
      "[URL fraudulenta]",
    );
  });

  test("no salta con un aviso sin enlace", () => {
    expect(
      aludeEnlace(
        "AEAT: Tiene una nueva notificación. Acceda por sus propios medios a la Sede electrónica.",
      ),
    ).toBeUndefined();
  });
});

describe("verificarMensaje con enlaces sin http", () => {
  test("un acortador cuenta como enlace y el mensaje sale no_oficial", () => {
    const r = verificarMensaje(
      "Correos: su paquete está retenido. Pague las tasas en bit.ly/3xYz9",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.enlaces).toHaveLength(1);
  });

  test("«pulse aquí» sin dirección cuenta como enlace y se avisa", () => {
    const r = verificarMensaje(
      "AEAT: tiene una devolución de 411€. Pulse aquí para recibirla.",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.enlaceSinDireccion).toEqual({ frase: "Pulse aquí" });
  });

  test("un enlace oculto en una captura cuenta como enlace", () => {
    const r = verificarMensaje(
      "DGT: Tiene una multa pendiente de pago. Abónela hoy pulsando aquí.",
      "sms",
      true,
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.enlaceSinDireccion).toBeDefined();
  });

  test("un dominio oficial citado sigue siendo mención, no enlace", () => {
    const r = verificarMensaje(
      "AEAT: Tiene una nueva notificación. Puede consultarla accediendo por sus propios medios a la Sede electrónica (sede.agenciatributaria.gob.es).",
    );
    expect(r.veredicto).toBe("no_determinable");
    expect(r.enlaces).toHaveLength(0);
    expect(r.enlaceSinDireccion).toBeUndefined();
  });
});
