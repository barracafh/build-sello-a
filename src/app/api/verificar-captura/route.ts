import { SinTextoError, transcribirCaptura } from "../../../lib/transcribir-captura";
import { verificar } from "../../../lib/verificar";

// POST {"image": "data:image/jpeg;base64,…"} con una captura de pantalla de
// un SMS o correo. La IA transcribe el texto (SOLO transcribe: el veredicto lo
// dan las reglas deterministas, la misma respuesta que /api/verificar) y se
// devuelve además la transcripción, para que el usuario vea qué se leyó y pueda
// corregirla. Ni la imagen ni el texto se guardan ni se registran.
// Documentación: docs/anadir-datos.md (apartado «La API»).

// Leer una captura puede tardar si HelmCode va cargado.
export const maxDuration = 60;

// Vercel corta los cuerpos de más de 4,5 MB; el navegador ya reduce la imagen
// antes de enviarla (lo mismo que hace /api/leer-captura).
const MAX = 4_000_000;
const MIMES = /^data:image\/(png|jpeg|webp|gif);base64,/;

export async function POST(req: Request) {
  const { image } = await req.json().catch(() => ({}));
  if (typeof image !== "string" || !MIMES.test(image) || image.length > MAX)
    return Response.json(
      { error: "Adjunta una imagen PNG, JPG o WebP de menos de 3 MB." },
      { status: 400 },
    );

  let transcripcion: Awaited<ReturnType<typeof transcribirCaptura>>;
  try {
    transcripcion = await transcribirCaptura(image);
  } catch (error) {
    if (error instanceof SinTextoError)
      return Response.json(
        {
          error:
            "No veo texto legible en la captura. Prueba con otra más nítida o pega el texto a mano.",
        },
        { status: 422 },
      );
    return Response.json(
      {
        error:
          "No he podido leer la captura ahora. Inténtalo en un momento o pega el texto a mano.",
      },
      { status: 502 },
    );
  }

  const { status, cuerpo } = await verificar(
    transcripcion.texto,
    transcripcion.tipo,
  );
  return Response.json(
    {
      ...cuerpo,
      transcripcion: transcripcion.texto,
      tipo: transcripcion.tipo,
    },
    { status },
  );
}
