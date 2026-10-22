// Lee una captura de pantalla con el modelo de HelmCode (glm5.3-flash, que
// entiende imágenes): el texto del mensaje, el remitente y las palabras que
// parecen enlaces sin dirección visible. El modelo solo lee: el veredicto lo
// dan las reglas. Lo usan el chat (/api/leer-captura) y el bot de WhatsApp.
// Ni la imagen ni el texto se guardan ni se registran.
import { completar } from "./ia";

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

/**
 * Devuelve la lectura, o undefined si el modelo no da una respuesta válida.
 * Lanza un error si HelmCode no responde.
 */
export async function leerCaptura(imagen: string): Promise<Lectura | undefined> {
  // Las instrucciones van con la imagen en el mensaje del usuario: con un
  // mensaje de sistema, glm5.3-flash devuelve a veces una respuesta vacía.
  let lectura: Lectura | undefined;
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
  return lectura;
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
