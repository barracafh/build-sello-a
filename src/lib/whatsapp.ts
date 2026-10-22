// Bot de WhatsApp: del texto que alguien reenvía, el veredicto como mensaje.
// Una dirección suelta va al verificador de webs; un SMS o correo, al de
// mensajes. Solo lee texto: no abre nada y no guarda nada.
import { verificarMensaje } from "./verificar-mensaje";
import { verificarUrl, type Resultado, type Veredicto } from "./verificar-url";

type Respuesta = Pick<
  Resultado,
  "veredicto" | "titular" | "consejo" | "pasos" | "avisos" | "webOficial" | "entidad" | "fuentes"
> & { requiereDns?: boolean; host?: string };

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

export function analizar(texto: string): Respuesta | undefined {
  const limpio = texto.trim();
  if (esDireccion(limpio)) {
    const r = verificarUrl(limpio);
    return "error" in r ? undefined : r;
  }
  // Sin enlaces ni señales sale no_determinable: también sirve de respuesta.
  return verificarMensaje(limpio, /^(de|from|asunto|subject):/im.test(limpio) ? "email" : "sms");
}

export function formatear(r: Respuesta) {
  const lineas = [`${ICONO[r.veredicto]} *${r.titular}*`];
  // El aviso de que no se abre nada ya va en el saludo: aquí sobra.
  const pasos = r.pasos.filter((p) => !p.startsWith("He leído"));
  if (pasos.length) lineas.push("", ...pasos.slice(0, 3).map((p) => `• ${p}`));
  if (r.avisos.length) lineas.push("", ...r.avisos.slice(0, 2).map((a) => `• ${a}`));
  if (r.consejo) lineas.push("", r.consejo);
  if (r.webOficial)
    lineas.push("", `🔗 Web oficial${r.entidad ? ` de ${r.entidad}` : ""}: ${r.webOficial}`);
  if (r.veredicto !== "oficial_verificado" && !r.consejo?.includes("017"))
    lineas.push("", "📞 Si tienes dudas, llama gratis al 017 de INCIBE (8:00–23:00, todos los días).");
  if (r.fuentes.length) lineas.push("", `Fuente: ${r.fuentes[0].url}`);
  lineas.push("", "_Herramienta experimental. No es un servicio oficial._");
  return lineas.join("\n");
}

export function responder(texto: string) {
  if (!texto.trim() || /^(hola|ayuda|help|info|\?)$/i.test(texto.trim())) return { texto: AYUDA };
  const r = analizar(texto.slice(0, 4000));
  return r ? { texto: formatear(r), resultado: r } : { texto: AYUDA };
}
