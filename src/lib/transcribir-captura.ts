// Transcribe una captura de pantalla de un SMS o correo con el modelo de
// HelmCode (glm5.3-flash, que entiende imágenes). La IA SOLO transcribe: el
// veredicto lo deciden después las reglas deterministas de src/lib/verificar.ts
// (línea roja del proyecto). Ni la imagen ni el texto se guardan ni se
// registran: viven solo en la petición.
import { completar, type Parte } from "./ia";

const INSTRUCCIONES = `Transcribe exactamente el texto visible de esta captura de pantalla de un SMS o un correo. No corrijas faltas, no traduzcas, no resumas y no añadas nada que no se lea.
Omite la hora, la batería y los demás elementos de la barra de estado del móvil.
Empieza la respuesta con [TIPO:sms] o [TIPO:email] según lo que muestre la captura, y en la línea siguiente, solo el texto transcrito, sin comentarios ni markdown.
Si no hay texto legible, devuelve exactamente: [SIN TEXTO]`;

// Leer una captura puede tardar si HelmCode va cargado: no dejamos al usuario
// colgado más de esto y le queda el formulario manual.
const TIMEOUT_MS = 45_000;

// La transcripción pasa luego por el verificador de mensajes, que admite 4.000.
const MAX_CARACTERES = 4000;

export type Transcripcion = { texto: string; tipo: "sms" | "email" };

// La captura no trae texto legible: lo comunicamos aparte del fallo técnico.
export class SinTextoError extends Error {}

/**
 * Devuelve el texto transcrito y el tipo deducido, o lanza:
 * - SinTextoError si la IA responde [SIN TEXTO].
 * - Error si HelmCode falla, se pasa del tiempo o la respuesta no vale.
 */
export async function transcribirCaptura(
  imagen: string,
): Promise<Transcripcion> {
  const partes: Parte[] = [
    { type: "text", text: INSTRUCCIONES },
    { type: "image_url", image_url: { url: imagen } },
  ];
  // Las instrucciones van con la imagen en el mensaje del usuario: con un
  // mensaje de sistema, glm5.3-flash devuelve a veces una respuesta vacía
  // (lo mismo que hace src/lib/leer-captura.ts).
  const respuesta = await conLimite(
    completar([{ role: "user", content: partes }]),
  );

  const limpio = respuesta.trim();
  if (limpio.includes("[SIN TEXTO]"))
    throw new SinTextoError("La captura no tiene texto legible");

  // El tipo llega con el prefijo controlado [TIPO:…]; si la IA se lo salta,
  // unas reglas simples lo deducen del texto.
  let tipo: "sms" | "email" | undefined =
    limpio.match(/^\[TIPO:(sms|email)\]/i)?.[1]?.toLowerCase() as
      | "sms"
      | "email"
      | undefined;
  const texto = limpio
    .replace(/^\[TIPO:(sms|email)\]\s*/i, "")
    .trim()
    .slice(0, MAX_CARACTERES);
  if (!texto) throw new Error("Respuesta vacía del modelo");
  tipo ??= /\b(asunto|subject)\s*:/i.test(texto) ? "email" : "sms";
  return { texto, tipo };
}

// completar() no admite cancelación: con la carrera, como mucho queda la
// petición huérfana detrás, y el usuario recibe el error a tiempo.
function conLimite<T>(tarea: Promise<T>): Promise<T> {
  const plazo = new Promise<never>((_, rechazar) =>
    setTimeout(
      () => rechazar(new Error("La transcripción ha tardado demasiado")),
      TIMEOUT_MS,
    ),
  );
  return Promise.race([tarea, plazo]);
}
