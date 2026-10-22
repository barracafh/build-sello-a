// Bot de WhatsApp: del texto que alguien reenvía, el veredicto como mensaje.
// Una dirección suelta va al verificador de webs; un SMS o correo, al de
// mensajes. Solo lee texto: no abre nada y no guarda nada.
import type { Lectura } from "./leer-captura";
import type { OpcionesMensaje } from "./verificar";
import { verificarMensaje, type MensajeResultado } from "./verificar-mensaje";
import { verificarUrl, type Resultado, type Veredicto } from "./verificar-url";

type Respuesta = Pick<
  Resultado,
  "veredicto" | "titular" | "consejo" | "pasos" | "avisos" | "webOficial" | "entidad" | "fuentes"
> &
  Pick<MensajeResultado, "remitente" | "enlaceSinDireccion"> & {
    requiereDns?: boolean;
    host?: string;
  };

const ICONO: Record<Veredicto, string> = {
  oficial_verificado: "✅",
  no_oficial: "⛔",
  no_determinable: "⚠️",
};

const AYUDA =
  "Hola, soy Sello 👋\n\n" +
  "Reenvíame el SMS, el correo o el enlace que te ha llegado y te digo si es oficial o una estafa. " +
  "No abro nada de lo que me mandas y no guardo tus mensajes.\n\n" +
  "_Herramienta experimental. No es un servicio oficial._";

// Una sola palabra con forma de dirección web: se analiza como web.
const esDireccion = (texto: string) =>
  !/\s/.test(texto.trim()) && /\.[a-z]{2,}|\[\.\]/i.test(texto);

// `opciones` llega de una captura: un enlace sin dirección visible y quién
// envía el mensaje.
export function analizar(texto: string, opciones: OpcionesMensaje = {}): Respuesta | undefined {
  const limpio = texto.trim();
  if (esDireccion(limpio) && !opciones.enlaceOculto) {
    const r = verificarUrl(limpio);
    return "error" in r ? undefined : r;
  }
  // Sin enlaces ni señales sale no_determinable: también sirve de respuesta.
  return verificarMensaje(
    limpio,
    /^(de|from|asunto|subject):/im.test(limpio) ? "email" : "sms",
    opciones.enlaceOculto,
    opciones.remitente,
  );
}

// `ocultos`: las palabras con enlace que se ven en una captura («aquí»).
export function formatear(r: Respuesta, ocultos: string[] = []) {
  const lineas = [`${ICONO[r.veredicto]} *${r.titular}*`];
  // Quién lo envía va en su propia línea, no repetido entre los pasos.
  const delRemitente = r.remitente?.explicacion;
  if (r.remitente) lineas.push("", `👤 Remitente ${r.remitente.valor}: ${r.remitente.explicacion}`);
  // El aviso de que no se abre nada ya va en el saludo: aquí sobra.
  const pasos = r.pasos.filter((p) => !p.startsWith("He leído") && p !== delRemitente);
  const avisos = r.avisos.filter((a) => a !== delRemitente);
  if (pasos.length) lineas.push("", ...pasos.slice(0, 3).map((p) => `• ${p}`));
  if (avisos.length) lineas.push("", ...avisos.slice(0, 2).map((a) => `• ${a}`));
  if (r.enlaceSinDireccion || ocultos.length) {
    const palabras = ocultos.length ? ocultos : r.enlaceSinDireccion?.frase ? [r.enlaceSinDireccion.frase] : [];
    lineas.push(
      "",
      `🔗 Hay un enlace que no se ve${palabras.length ? ` (${palabras.map((p) => `«${p}»`).join(", ")})` : ""}: no sé adónde lleva, así que no lo pulses. ` +
        "Para comprobarlo, mantén pulsado el enlace, elige «Copiar enlace» (sin abrirlo) y reenvíamelo.",
    );
  }
  if (r.consejo) lineas.push("", r.consejo);
  if (r.webOficial)
    lineas.push("", `🔗 Web oficial${r.entidad ? ` de ${r.entidad}` : ""}: ${r.webOficial}`);
  if (r.veredicto !== "oficial_verificado" && !r.consejo?.includes("017"))
    lineas.push("", "📞 Si tienes dudas, llama gratis al 017 de INCIBE (8:00–23:00, todos los días).");
  if (r.fuentes.length) lineas.push("", `Fuente: ${r.fuentes[0].url}`);
  lineas.push("", "_Herramienta experimental. No es un servicio oficial._");
  return lineas.join("\n");
}

// Una captura ya leída: se analiza su texto (más el pie de foto, si lo hay)
// como si lo hubieran reenviado, con su remitente y sus enlaces ocultos.
export function responderCaptura(lectura: Lectura | undefined, pie = "") {
  if (!lectura?.texto)
    return {
      texto:
        "📷 No he podido leer texto en esa imagen. Prueba con una captura más nítida o reenvíame el texto del mensaje.",
    };
  const r = analizar([pie.trim(), lectura.texto].filter(Boolean).join("\n\n").slice(0, 4000), {
    enlaceOculto: lectura.enlacesOcultos.length > 0,
    remitente: lectura.remitente ?? undefined,
  });
  const citado = lectura.texto.slice(0, 300).replace(/\n/g, "\n> ");
  const leido = `📷 He leído en la captura${lectura.remitente ? ` (de ${lectura.remitente})` : ""}:\n> ${citado}${lectura.texto.length > 300 ? "…" : ""}`;
  return r
    ? { texto: `${leido}\n\n${formatear(r, lectura.enlacesOcultos)}`, resultado: r, ocultos: lectura.enlacesOcultos }
    : { texto: `${leido}\n\n${AYUDA}` };
}

export function responder(texto: string) {
  if (!texto.trim() || /^(hola|ayuda|help|info|\?)$/i.test(texto.trim())) return { texto: AYUDA };
  const r = analizar(texto.slice(0, 4000));
  return r ? { texto: formatear(r), resultado: r } : { texto: AYUDA };
}
