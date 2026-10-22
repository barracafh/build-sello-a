import { leerCaptura, type Lectura } from "../../../lib/leer-captura";

// POST {"imagen": "data:image/jpeg;base64,…"} devuelve el texto de una
// captura de pantalla y las palabras que parecen enlaces sin dirección
// visible. Ni la imagen ni el texto se guardan ni se registran.

// Leer una captura puede tardar si HelmCode va cargado.
export const maxDuration = 60;

// Vercel corta los cuerpos de más de 4,5 MB; el navegador ya la reduce antes.
const MAX = 4_000_000;

export async function POST(req: Request) {
  const { imagen } = await req.json().catch(() => ({}));
  if (
    typeof imagen !== "string" ||
    !/^data:image\/(png|jpeg|webp|gif);base64,/.test(imagen) ||
    imagen.length > MAX
  )
    return Response.json(
      { error: "Adjunta una imagen PNG, JPG o WebP de menos de 3 MB." },
      { status: 400 },
    );

  let lectura: Lectura | undefined;
  try {
    lectura = await leerCaptura(imagen);
  } catch {
    return Response.json(
      { error: "No he podido leer la captura ahora. Inténtalo en un momento o pega el texto." },
      { status: 502 },
    );
  }
  if (!lectura)
    return Response.json(
      { error: "No he podido leer la captura. Prueba con otra más nítida o pega el texto." },
      { status: 502 },
    );
  return Response.json(lectura);
}
