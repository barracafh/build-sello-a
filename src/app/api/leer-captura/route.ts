import { completar } from "../../../lib/ia";

// POST {"imagen": "data:image/jpeg;base64,…"} devuelve el texto de una
// captura de pantalla y las palabras que parecen enlaces sin dirección
// visible. Ni la imagen ni el texto se guardan ni se registran.

// Vercel corta los cuerpos de más de 4,5 MB; el navegador ya la reduce antes.
const MAX = 4_000_000;

const INSTRUCCIONES = `Eres un lector de capturas de pantalla para una herramienta antiestafas.
Transcribe el texto del mensaje (SMS, correo, chat o web) que aparece en la imagen, tal cual, sin corregir faltas ni traducir.
Copia las direcciones web exactamente como se ven, carácter a carácter.
No inventes ni completes nada que no se lea. Omite la barra de estado del móvil, la hora y los botones de la interfaz.
Si el remitente se ve (nombre o número), ponlo en "remitente".
En "enlaces_ocultos" pon cada palabra o botón que parece un enlace (subrayado, en azul o con aspecto de botón) pero que no muestra la dirección web. Si la dirección se ve, no lo incluyas.
Responde solo con JSON, sin texto alrededor:
{"texto": "…", "remitente": "…" o null, "enlaces_ocultos": ["…"]}
Si no hay texto legible, responde {"texto": "", "remitente": null, "enlaces_ocultos": []}.`;

export type Lectura = {
  texto: string;
  remitente: string | null;
  enlacesOcultos: string[];
};

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

  // Las instrucciones van con la imagen en el mensaje del usuario: con un
  // mensaje de sistema, glm5.3-flash devuelve a veces una respuesta vacía.
  let lectura: Lectura | undefined;
  try {
    for (let intento = 0; intento < 2 && !lectura; intento++)
      lectura = interpretar(
        await completar([
          {
            role: "user",
            content: [
              { type: "text", text: INSTRUCCIONES },
              { type: "image_url", image_url: { url: imagen } },
            ],
          },
        ]),
      );
  } catch {
    return Response.json(
      {
        error:
          "No he podido leer la captura ahora. Inténtalo en un momento o pega el texto.",
      },
      { status: 502 },
    );
  }

  if (!lectura)
    return Response.json(
      {
        error:
          "No he podido leer la captura. Prueba con otra más nítida o pega el texto.",
      },
      { status: 502 },
    );
  return Response.json(lectura);
}

// El modelo a veces envuelve el JSON en ```json … ```: nos quedamos con el objeto.
function interpretar(respuesta: string): Lectura | undefined {
  const inicio = respuesta.indexOf("{");
  const fin = respuesta.lastIndexOf("}");
  if (inicio < 0 || fin < inicio) return;
  try {
    const datos = JSON.parse(respuesta.slice(inicio, fin + 1));
    if (typeof datos.texto !== "string") return;
    return {
      texto: datos.texto.trim().slice(0, 4000),
      remitente:
        typeof datos.remitente === "string" && datos.remitente.trim()
          ? datos.remitente.trim().slice(0, 100)
          : null,
      enlacesOcultos: Array.isArray(datos.enlaces_ocultos)
        ? datos.enlaces_ocultos
            .filter(
              (e: unknown): e is string => typeof e === "string" && !!e.trim(),
            )
            .map((e: string) => e.trim().slice(0, 80))
            .slice(0, 10)
        : [],
    };
  } catch {}
}
