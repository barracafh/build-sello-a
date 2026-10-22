// Prueba los 10 casos de datos/mensajes-ejemplo.json. Los sms/email pasan por
// el verificador de mensajes; el caso «web», por el de URLs. Ejecutar con:
//   bun scripts/probar-mensajes.ts
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
};

let aciertos = 0;
for (const c of casos as Caso[]) {
  let veredicto: string;
  if (c.tipo === "web") {
    const r = verificarUrl(c.url ?? c.texto);
    veredicto = "error" in r ? "no_determinable" : r.veredicto;
  } else {
    veredicto = verificarMensaje(
      [c.texto, c.texto_adicional_mismo_aviso, c.url_prueba_sintetica ?? c.url_defanged]
        .filter(Boolean)
        .join(" "),
      c.tipo === "sms" ? "sms" : "email",
    ).veredicto;
  }
  const ok = veredicto === c.esperado;
  if (ok) aciertos++;
  console.log(
    `${ok ? "✓" : "✗"} ${c.id} esperado=${c.esperado} obtenido=${veredicto}`,
  );
}
console.log(`\n${aciertos}/${casos.length} casos correctos`);
process.exit(aciertos === casos.length ? 0 : 1);
