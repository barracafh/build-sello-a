// Actualiza src/datos/dominios-fraude.json desde Phishing.Database (MIT), que
// publica cada día los dominios de phishing que siguen activos. Nos quedamos
// solo con los que imitan a organismos españoles de nuestra lista. Ejecutar con:
//   bun scripts/actualizar-fraude.ts
// Lo lanza cada día .github/workflows/actualizar-fraude.yml. Solo descarga una
// lista de texto: no visita ninguno de los dominios.
import { writeFile } from "node:fs/promises";
import actual from "../src/datos/dominios-fraude.json";
import { MARCAS, verificarUrl } from "../src/lib/verificar-url";

const DESTINO = new URL("../src/datos/dominios-fraude.json", import.meta.url);

// Marcas del verificador y nombres propios de la lista oficial. Sin palabras
// genéricas (portal, administracion, interior, valencia), que traerían phishing
// de cualquier país. Las largas basta con que aparezcan dentro del dominio; las
// cortas (dgt, aeat, sepe, dehu, clave), solo como etiqueta o trozo entre guiones.
const PROPIAS = [
  "incibe", "redsara", "dnielectronico", "citapreviadnie", "guardiacivil",
  "juntaelectoralcentral", "sedeaepd", "clientebancario",
];
const marcas = [...Object.keys(MARCAS), ...PROPIAS];
const largas = marcas.filter((m) => m.length >= 6);
const cortas = marcas.filter((m) => m.length < 6);

const imitaOrganismo = (host: string) => {
  const trozos = host.split(".").flatMap((e) => [e, ...e.split("-")]);
  return (
    largas.some((m) => host.includes(m)) ||
    cortas.some((m) => trozos.includes(m)) ||
    /gob\.es\.|gob-es/.test(host)
  );
};

const res = await fetch(actual.lista);
if (!res.ok) throw new Error(`Phishing.Database respondió ${res.status}`);
const lineas = (await res.text()).split("\n").map((l) => l.trim().toLowerCase());
const hosts = lineas.filter((l) => l && !l.startsWith("#") && /^[a-z0-9.-]+\.[a-z0-9-]{2,}$/.test(l));

// Un dominio de la lista oficial nunca entra, aunque la lista comunitaria lo traiga.
const dominios = [
  ...new Set(
    hosts.filter((h) => {
      if (!imitaOrganismo(h)) return false;
      const r = verificarUrl(h);
      return "error" in r || r.veredicto !== "oficial_verificado";
    }),
  ),
].sort();

if (hosts.length < 1000) throw new Error(`Lista sospechosamente corta (${hosts.length}); no se actualiza.`);
if (JSON.stringify(dominios) === JSON.stringify(actual.dominios)) {
  console.log(`Sin cambios: ${dominios.length} dominios de ${hosts.length}.`);
} else {
  const datos = {
    ...actual,
    actualizado: new Date().toISOString().slice(0, 10),
    total_lista: hosts.length,
    dominios,
  };
  await writeFile(DESTINO, `${JSON.stringify(datos, null, 2)}\n`);
  console.log(`Actualizado: ${dominios.length} dominios de ${hosts.length}.`);
}
