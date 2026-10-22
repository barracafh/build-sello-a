import { lookup } from "node:dns/promises";
import {
  noDeterminable,
  verificarEnlaces,
  verificarUrl,
  type Enlace,
  type Resultado,
} from "../../../lib/verificar-url";

// POST {"texto": "…"} o {"enlaces": [{texto, href}]} (el HTML de un correo
// copiado) devuelve el veredicto. No se guarda ni se registra lo que llega.
export async function POST(req: Request) {
  const { texto, enlaces } = await req.json().catch(() => ({}));

  if (Array.isArray(enlaces) && enlaces.length) {
    const validos: Enlace[] = enlaces
      .slice(0, 50)
      .filter(
        (e): e is Enlace =>
          typeof e?.texto === "string" && typeof e?.href === "string" && e.href.length <= 2000,
      );
    const resultado = verificarEnlaces(validos);
    if ("error" in resultado) return Response.json(resultado, { status: 400 });
    const verificados = await Promise.all(
      resultado.enlaces.map(async (e) => ({ ...e, resultado: await conDns(e.resultado) })),
    );
    // La regla .gob.es puede haber cambiado algún veredicto: se recalcula el peor.
    const bajado = verificados.some((e) => e.resultado.motivo === "gob_es_inexistente");
    return Response.json({
      ...resultado,
      ...(bajado && resultado.veredicto === "oficial_verificado" && {
        veredicto: "no_determinable",
        titular: "No he podido confirmar que todos los enlaces sean oficiales",
      }),
      enlaces: verificados,
    });
  }

  if (typeof texto !== "string" || !texto.trim() || texto.length > 2000)
    return Response.json(
      { error: "Pega una dirección web de hasta 2.000 caracteres." },
      { status: 400 },
    );
  const resultado = verificarUrl(texto);
  if ("error" in resultado) return Response.json(resultado, { status: 400 });
  return Response.json(await conDns(resultado));
}

// Regla *.gob.es: solo cuenta si el host existe. Consultar el DNS no abre la
// web, y estos dominios solo los registran administraciones.
async function conDns(resultado: Resultado) {
  const { host, requiereDns, ...respuesta } = resultado;
  if (!requiereDns || !host || (await existe(host))) return respuesta;
  return {
    ...respuesta,
    veredicto: "no_determinable" as const,
    motivo: "gob_es_inexistente",
    titular: "No he podido confirmar que sea oficial",
    consejo: noDeterminable(),
    pasos: [
      ...respuesta.pasos,
      "Pero esa dirección no existe: no la deduzcas, búscala desde la web del organismo.",
    ],
  };
}

async function existe(host: string) {
  const limite = new Promise<false>((r) => setTimeout(() => r(false), 2000));
  const consulta = lookup(host).then(
    () => true,
    () => false,
  );
  return Promise.race([consulta, limite]);
}
