import { verificar, verificarListaEnlaces } from "../../../lib/verificar";

// Alias de compatibilidad de /api/verificar. POST {"texto": "…"} o
// {"enlaces": [{texto, href}]} (el HTML de un correo copiado) devuelve el
// veredicto. No se guarda ni se registra lo que llega.
export async function POST(req: Request) {
  const { texto, enlaces } = await req.json().catch(() => ({}));

  if (Array.isArray(enlaces) && enlaces.length) {
    const validos = enlaces
      .slice(0, 50)
      .filter(
        (e): e is { texto: string; href: string } =>
          typeof e?.texto === "string" && typeof e?.href === "string" && e.href.length <= 2000,
      );
    const { status, cuerpo } = await verificarListaEnlaces(validos);
    return Response.json(cuerpo, { status });
  }

  if (typeof texto !== "string" || !texto.trim() || texto.length > 2000)
    return Response.json(
      { error: "Pega una dirección web de hasta 2.000 caracteres." },
      { status: 400 },
    );
  const { status, cuerpo } = await verificar(texto, "url");
  return Response.json(cuerpo, { status });
}
