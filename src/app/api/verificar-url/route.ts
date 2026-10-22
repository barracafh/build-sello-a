import { lookup } from "node:dns/promises";
import { noDeterminable, verificarUrl } from "../../../lib/verificar-url";

// POST {"texto": "…"} devuelve el veredicto. No se guarda ni se registra el texto.
export async function POST(req: Request) {
  const { texto } = await req.json().catch(() => ({}));
  if (typeof texto !== "string" || !texto.trim() || texto.length > 2000)
    return Response.json(
      { error: "Pega una dirección web de hasta 2.000 caracteres." },
      { status: 400 },
    );

  const resultado = verificarUrl(texto);
  if ("error" in resultado) return Response.json(resultado, { status: 400 });

  // Regla *.gob.es: solo cuenta si el host existe. Consultar el DNS no abre la
  // web, y estos dominios solo los registran administraciones.
  const { host, requiereDns, ...respuesta } = resultado;
  if (requiereDns && host && !(await existe(host)))
    return Response.json({
      ...respuesta,
      veredicto: "no_determinable",
      motivo: "gob_es_inexistente",
      titular: "No he podido confirmar que sea oficial",
      consejo: noDeterminable(),
      pasos: [
        ...respuesta.pasos,
        "Pero esa dirección no existe: no la deduzcas, búscala desde la web del organismo.",
      ],
    });
  return Response.json(respuesta);
}

async function existe(host: string) {
  const limite = new Promise<false>((r) => setTimeout(() => r(false), 2000));
  const consulta = lookup(host).then(
    () => true,
    () => false,
  );
  return Promise.race([consulta, limite]);
}
