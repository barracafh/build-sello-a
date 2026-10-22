// Test de integración: los 10 casos de datos/mensajes-ejemplo.json deben dar
// exactamente el veredicto `esperado`. Es el criterio de «hecho» de la pieza
// «¿Este mensaje es de verdad?» en SETUP.md.
// Mismo criterio que scripts/probar-mensajes.ts, que se queda como atajo:
//   bun scripts/probar-mensajes.ts
import { describe, expect, test } from "bun:test";
import casos from "../datos/mensajes-ejemplo.json";
import { verificarMensaje } from "../src/lib/verificar-mensaje";
import { verificarUrl } from "../src/lib/verificar-url";

type Caso = {
  id: string;
  tipo: string;
  texto: string;
  texto_adicional_mismo_aviso?: string;
  url?: string;
  url_prueba_sintetica?: string | null;
  url_defanged?: string | null;
  esperado: string;
  web_oficial_correcta?: string;
};

const juzgar = (c: Caso): string => {
  if (c.tipo === "web") {
    const r = verificarUrl(c.url ?? c.texto);
    return "error" in r ? "no_determinable" : r.veredicto;
  }
  return verificarMensaje(
    [c.texto, c.texto_adicional_mismo_aviso, c.url_prueba_sintetica ?? c.url_defanged]
      .filter(Boolean)
      .join(" "),
    c.tipo === "sms" ? "sms" : "email",
  ).veredicto;
};

describe("datos/mensajes-ejemplo.json · veredicto esperado", () => {
  for (const c of casos as Caso[]) {
    test(`${c.id} sale ${c.esperado}`, () => {
      expect(juzgar(c)).toBe(c.esperado);
    });
  }

  test("son 10 casos y cada fraude tiene su URL sintética", () => {
    expect(casos).toHaveLength(10);
    const fraudes = (casos as Caso[]).filter((c) => c.esperado === "no_oficial");
    expect(fraudes).toHaveLength(5);
    for (const f of fraudes) {
      expect(f.url_prueba_sintetica).toBeTruthy();
    }
  });
});

describe("los fraudes explican el motivo y la web buena", () => {
  test("F01 (AEAT): fraude por imitación de marca y remite a la sede", () => {
    const c = (casos as Caso[]).find((x) => x.id === "F01")!;
    const r = verificarMensaje(
      [c.texto, c.url_prueba_sintetica].filter(Boolean).join(" "),
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.entidad).toBe("Agencia Tributaria (AEAT)");
    expect(r.webOficial).toBe(c.web_oficial_correcta);
    expect(r.consejo).toContain("017");
  });

  test("F05 (DGT por email): el asunto del expediente también acusa", () => {
    const c = (casos as Caso[]).find((x) => x.id === "F05")!;
    const r = verificarMensaje(
      [c.texto, c.texto_adicional_mismo_aviso, c.url_prueba_sintetica].filter(Boolean).join(" "),
      "email",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.entidad).toBe("Dirección General de Tráfico (DGT)");
  });

  test("L05 (web de la GVA): oficial_verificado con la entidad correcta", () => {
    const c = (casos as Caso[]).find((x) => x.id === "L05")!;
    const r = verificarUrl(c.url!);
    if ("error" in r) throw new Error("L05 no debía dar error");
    expect(r.veredicto).toBe("oficial_verificado");
    expect(r.entidad).toBe("Conselleria de Sanitat – GVA (cita previa sanitaria)");
  });
});
