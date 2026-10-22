// Tests del verificador con `bun test`. Cubren los 10 casos de la
// organización (datos/mensajes-ejemplo.json) y los del equipo
// (src/datos/casos-extra.json): añadir un caso allí lo añade aquí, sin tocar
// este fichero. Cómo añadir casos: docs/anadir-datos.md.
import { describe, expect, test } from "bun:test";
import casosBase from "../datos/mensajes-ejemplo.json";
import casosExtra from "../src/datos/casos-extra.json";
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
};

const casos = [...(casosBase as Caso[]), ...(casosExtra.casos as Caso[])];

function veredictoDe(c: Caso): string {
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
}

describe("casos del verificador", () => {
  for (const c of casos) {
    test(`${c.id} → ${c.esperado}`, () => {
      expect(veredictoDe(c)).toBe(c.esperado);
    });
  }
});
