// Tests del contador de métricas. Lo importante aquí no es sumar: es que el
// estado no pueda contener nada del usuario. Se comprueba que solo existen
// las claves conocidas, con números dentro, y que el hook en la capa de
// dominio (verificar()) cuenta los análisis.
import { describe, expect, test } from "bun:test";
import {
  obtenerEstadisticas,
  registrarAnalisis,
  type Estadisticas,
} from "../src/lib/estadisticas";
import { verificar } from "../src/lib/verificar";

const VEREDICTOS = ["oficial_verificado", "no_oficial", "no_determinable"];
const TIPOS = ["url", "web", "sms", "email"];

const claves = (o: object) => Object.keys(o).sort();

describe("contador de estadísticas", () => {
  test("sumariza por veredicto y por tipo, con total coherente", () => {
    const antes = obtenerEstadisticas();
    registrarAnalisis("sms", "no_oficial");
    registrarAnalisis("web", "no_determinable");
    registrarAnalisis("web", "no_oficial");
    const despues = obtenerEstadisticas();

    expect(despues.total).toBe(antes.total + 3);
    expect(despues.por_veredicto.no_oficial).toBe(antes.por_veredicto.no_oficial + 2);
    expect(despues.por_tipo.web).toBe(antes.por_tipo.web + 2);
    expect(despues.por_tipo.sms).toBe(antes.por_tipo.sms + 1);
    expect(
      Object.values(despues.por_veredicto).reduce((a, b) => a + b, 0),
    ).toBe(despues.total);
    expect(Object.values(despues.por_tipo).reduce((a, b) => a + b, 0)).toBe(
      despues.total,
    );
  });

  test("el formato es estable: {total, por_veredicto, por_tipo} con las claves conocidas", () => {
    const s: Estadisticas = obtenerEstadisticas();
    expect(claves(s)).toEqual(["por_tipo", "por_veredicto", "total"]);
    expect(claves(s.por_veredicto)).toEqual([...VEREDICTOS].sort());
    expect(claves(s.por_tipo)).toEqual([...TIPOS].sort());
  });

  test("el estado solo contiene números en las claves conocidas", () => {
    const s = obtenerEstadisticas() as unknown as Record<string, unknown>;
    for (const [clave, valor] of Object.entries(s)) {
      if (clave === "total") {
        expect(typeof valor).toBe("number");
        continue;
      }
      expect(typeof valor).toBe("object");
      for (const [sub, n] of Object.entries(valor as object)) {
        expect([...VEREDICTOS, ...TIPOS]).toContain(sub);
        expect(typeof n).toBe("number");
      }
    }
  });

  test("lo que devuelve la API es una copia: mutarlo no toca el contador", () => {
    const s = obtenerEstadisticas();
    s.total = -1;
    s.por_tipo.sms = -1;
    expect(obtenerEstadisticas().total).toBeGreaterThanOrEqual(0);
  });

  test("ignora veredictos o tipos que no están en el catálogo", () => {
    const antes = obtenerEstadisticas();
    // @ts-expect-error — así llega cualquier llamada mal hecha.
    registrarAnalisis("url", "dominio-sospechoso.example");
    // @ts-expect-error — tipo inventado.
    registrarAnalisis("dni", "no_oficial");
    expect(obtenerEstadisticas().total).toBe(antes.total);
  });
});

describe("enganche con la capa de dominio", () => {
  test("verificar() cuenta un análisis de mensaje con su veredicto", async () => {
    const antes = obtenerEstadisticas();
    const { status, cuerpo } = await verificar(
      "Le escribe Correos: tiene un paquete retenido, pague los gastos en…",
      "sms",
    );
    expect(status).toBe(200);
    expect(status).toBe(200);
    const v = (cuerpo as { veredicto: keyof typeof despues.por_veredicto })
      .veredicto;
    const despues = obtenerEstadisticas();
    expect(despues.total).toBe(antes.total + 1);
    expect(despues.por_tipo.sms).toBe(antes.por_tipo.sms + 1);
    expect(despues.por_veredicto[v]).toBe(antes.por_veredicto[v] + 1);
  });

  test("una entrada que no llega a analizarse no cuenta (URL inválida → 400)", async () => {
    const antes = obtenerEstadisticas();
    const { status } = await verificar("no es una url", "url");
    expect(status).toBe(400);
    expect(obtenerEstadisticas().total).toBe(antes.total);
  });
});
