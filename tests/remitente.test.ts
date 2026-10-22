// Tests del análisis del remitente (src/lib/remitente.ts) y de su peso en el
// veredicto del mensaje (src/lib/verificar-mensaje.ts).
import { describe, expect, test } from "bun:test";
import { analizarRemitente, remitenteDelTexto } from "../src/lib/remitente";
import { verificarMensaje } from "../src/lib/verificar-mensaje";

const MULTA = "Aviso: multa por exceso de velocidad pendiente. Evite recargos.";

describe("analizarRemitente", () => {
  test("un número extranjero que habla de multas es señal de fraude", () => {
    const r = analizarRemitente("+52 287 000 0000", MULTA, undefined, true);
    expect(r).toMatchObject({ tipo: "internacional", peso: "fraude" });
    expect(r.explicacion).toContain("México (+52)");
  });

  test("un número extranjero en un mensaje personal solo avisa", () => {
    const r = analizarRemitente("+44 7700 900123", "Hola, soy yo, cambié de número", undefined, false);
    expect(r).toMatchObject({ tipo: "internacional", peso: "aviso" });
  });

  test("un móvil español que dice ser la DGT avisa, y con enlace decide", () => {
    const texto = "DGT: tiene una notificación pendiente.";
    const dgt = "Dirección General de Tráfico (DGT)";
    expect(analizarRemitente("612 345 678", texto, dgt, false).peso).toBe("aviso");
    expect(analizarRemitente("+34612345678", texto, dgt, true).peso).toBe("fraude");
  });

  test("un nombre como remitente no confirma nada", () => {
    const r = analizarRemitente("DGT", "DGT: tiene una notificación.", "Dirección General de Tráfico (DGT)", false);
    expect(r).toMatchObject({ tipo: "nombre", peso: "neutro" });
  });
});

describe("remitenteDelTexto", () => {
  test("lee las líneas De:, Remitente: y la dirección de un correo", () => {
    expect(remitenteDelTexto("De: +44 7700 900123\nDGT: multa")).toBe("+44 7700 900123");
    expect(remitenteDelTexto("Remitente: DGT\nTiene una multa")).toBe("DGT");
    expect(remitenteDelTexto("De: Hacienda <avisos@hacienda-pago.com>\nAsunto: x")).toBe(
      "avisos@hacienda-pago.com",
    );
    expect(remitenteDelTexto("Sin remitente aquí")).toBeUndefined();
  });
});

describe("verificarMensaje con remitente", () => {
  test("el remitente extranjero decide un mensaje que sin él era no_determinable", () => {
    const texto =
      "Aviso SAS: Multa por exceso de velocidad pendiente. Consulta tu matricula antes de generar recargos. https://ln.run/ABC12";
    expect(verificarMensaje(texto).veredicto).toBe("no_determinable");
    const r = verificarMensaje(texto, "sms", false, "+52 287 000 0000");
    expect(r.veredicto).toBe("no_oficial");
    expect(r.remitente?.peso).toBe("fraude");
  });

  test("ln.run es un acortador y no se abre", () => {
    const r = verificarMensaje("Consulte su expediente en https://ln.run/ABC12 cuanto antes", "sms");
    expect(r.enlaces[0].motivo).toBe("acortador_no_resuelto");
  });
});
