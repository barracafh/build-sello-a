import ficha from "../../../../ficha.json";

// Igual que next.config.ts: la app vive bajo /<equipo>.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? `/${ficha.equipo}`;

const MAX = 4000; // El mismo límite que /api/verificar-mensaje.

// Punto de entrada del share_target del manifest: Android envía aquí el SMS
// compartido por POST, application/x-www-form-urlencoded, en los campos
// "text" (el cuerpo), "title" y "url".
//
// El texto no viaja en la URL (acabaría en el access log del alojamiento y
// en la barra de direcciones): entregamos un HTML mínimo que lo deja en
// sessionStorage y salta a /compartir, donde el análisis se lanza solo.
// Nada se guarda en el servidor: ni base de datos ni logs.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => undefined);
  const campo = (nombre: string) => {
    const valor = form?.get(nombre);
    return typeof valor === "string" ? valor : "";
  };
  // El cuerpo del SMS llega en "text"; si viene vacío, "title" o "url".
  const texto = (campo("text") || campo("title") || campo("url")).trim();

  const destino = new URL(`${base}/compartir`, req.url);
  if (!texto) return Response.redirect(destino, 303);

  // sessionStorage como puente, borrado en cuanto lo lee /compartir.
  const puente = JSON.stringify({ text: texto.slice(0, MAX) });
  const guion = `try{sessionStorage.setItem("sello-compartido",${JSON.stringify(puente).replaceAll("<", "\\u003c")})}finally{location.replace(${JSON.stringify(`${destino.origin}${base}/compartir`)})}`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abriendo ${ficha.nombre}…</title></head><body><p>Abriendo ${ficha.nombre}…</p><script>${guion}</script><noscript><p><a href="${destino.origin}${base}/compartir?text=${encodeURIComponent(texto.slice(0, MAX))}">Continuar a ${ficha.nombre}</a></p></noscript></body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Respaldo sin JavaScript: GET /api/compartir?text=… lleva al mismo sitio
// por query (el texto pasa por la URL, igual que /compartir?text=…).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const texto = (
    searchParams.get("text") ??
    searchParams.get("title") ??
    ""
  ).trim();
  const destino = new URL(`${base}/compartir`, req.url);
  if (!texto) return Response.redirect(destino, 303);
  destino.searchParams.set("text", texto.slice(0, MAX));
  return Response.redirect(destino, 303);
}
