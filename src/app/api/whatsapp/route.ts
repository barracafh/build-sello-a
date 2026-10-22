import { lookup } from "node:dns/promises";
import { after } from "next/server";
import { leerCaptura } from "../../../lib/leer-captura";
import { noDeterminable } from "../../../lib/verificar-url";
import { formatear, responder, responderCaptura } from "../../../lib/whatsapp";

// Leer una captura con el modelo puede tardar: se hace después de contestar
// al webhook (after), con este margen.
export const maxDuration = 60;

// Imágenes de más de ~6 MB (en base64) no se leen.
const MAX_IMAGEN = 8_000_000;

// Webhook de Evolution API v2 (evento messages.upsert). Responde por WhatsApp
// con el veredicto. No se guarda ni se registra el texto recibido.
//   POST /api/whatsapp?token=WHATSAPP_WEBHOOK_TOKEN
// Variables en .env.local (nunca en el código, el repo es público):
//   EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_WEBHOOK_TOKEN
// Quién recibe respuesta. Cerrado por defecto: sin ninguna de las dos, nadie.
//   WHATSAPP_PERMITIDOS: números separados por comas, con prefijo
//   WHATSAPP_GRUPO: JID de un grupo (…@g.us); vale cualquiera de sus participantes
export async function POST(req: Request) {
  const { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_WEBHOOK_TOKEN } =
    process.env;
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE || !WHATSAPP_WEBHOOK_TOKEN)
    return Response.json({ error: "Faltan variables de Evolution" }, { status: 503 });
  if (new URL(req.url).searchParams.get("token") !== WHATSAPP_WEBHOOK_TOKEN)
    return Response.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.event !== "messages.upsert") return Response.json({ ok: true });
  const mensajes = Array.isArray(body.data) ? body.data : [body.data];

  for (const m of mensajes) {
    // Evolution ya cambia los @lid por el número (remoteJidAlt) en chats privados.
    const jid: string = m?.key?.remoteJid ?? "";
    // Solo chats individuales y mensajes que nos llegan, nunca los nuestros.
    if (m?.key?.fromMe || !jid.endsWith("@s.whatsapp.net")) continue;
    const numero = jid.split("@")[0];
    if (!(await permitido(numero))) continue;
    // Una captura: se lee con el modelo (con su pie de foto, si lo trae).
    if (m.message?.imageMessage) {
      after(() => contestarCaptura(m, numero));
      continue;
    }
    const texto: string =
      m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? "";
    if (!texto.trim()) continue;

    const { texto: respuesta, resultado } = responder(texto);
    await enviar(numero, await conDns(respuesta, resultado), m.key.id, texto);
  }
  return Response.json({ ok: true });
}

type MensajeEvolution = {
  key: { id: string; remoteJid: string; fromMe?: boolean };
  message?: {
    base64?: string;
    imageMessage?: { caption?: string; mimetype?: string };
  };
};

async function contestarCaptura(m: MensajeEvolution, numero: string) {
  const pie = m.message?.imageMessage?.caption ?? "";
  await enviar(numero, "📷 Leyendo la captura…", m.key.id, "📷 Imagen");
  const imagen = await descargarImagen(m);
  if (!imagen)
    return enviar(
      numero,
      "📷 No he podido abrir esa imagen. Prueba a reenviarla o mándame el texto del mensaje.",
      m.key.id,
      "📷 Imagen",
    );
  const lectura = await leerCaptura(imagen).catch(() => undefined);
  const { texto: respuesta, resultado, ocultos } = responderCaptura(lectura, pie);
  await enviar(numero, await conDns(respuesta, resultado, ocultos), m.key.id, "📷 Imagen");
}

// La imagen en base64: viene en el webhook si Evolution tiene activado
// «webhook base64»; si no, se pide a Evolution. Solo vive en memoria.
async function descargarImagen(m: MensajeEvolution) {
  const { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE } = process.env;
  const tipo = m.message?.imageMessage?.mimetype?.split(";")[0] || "image/jpeg";
  let base64 = m.message?.base64;
  let mimetype = tipo;
  if (!base64) {
    const res = await fetch(
      `${EVOLUTION_API_URL!.replace(/\/$/, "")}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY!, "content-type": "application/json" },
        body: JSON.stringify({ message: { key: m.key }, convertToMp4: false }),
      },
    ).catch(() => undefined);
    const datos = res?.ok ? await res.json().catch(() => ({})) : {};
    base64 = typeof datos.base64 === "string" ? datos.base64 : undefined;
    if (typeof datos.mimetype === "string") mimetype = datos.mimetype.split(";")[0];
  }
  if (!base64 || base64.length > MAX_IMAGEN || !mimetype.startsWith("image/")) return;
  return `data:${mimetype};base64,${base64}`;
}

// Regla *.gob.es: solo cuenta si el host existe (como en /api/verificar-url).
async function conDns(
  respuesta: string,
  resultado?: ReturnType<typeof responder>["resultado"],
  ocultos: string[] = [],
) {
  if (!resultado?.requiereDns || !resultado.host || (await existe(resultado.host)))
    return respuesta;
  return formatear(
    {
      ...resultado,
      veredicto: "no_determinable",
      titular: "No he podido confirmar que sea oficial",
      consejo: noDeterminable(),
      pasos: [...resultado.pasos, "Pero esa dirección no existe: búscala desde la web del organismo."],
    },
    ocultos,
  );
}

async function enviar(numero: string, texto: string, citado: string, original: string) {
  const { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE } = process.env;
  await fetch(`${EVOLUTION_API_URL!.replace(/\/$/, "")}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: { apikey: EVOLUTION_API_KEY!, "content-type": "application/json" },
    body: JSON.stringify({
      number: numero,
      text: texto,
      delay: 800,
      quoted: { key: { id: citado }, message: { conversation: original.slice(0, 200) } },
    }),
  }).catch(() => {});
}

// Participantes del grupo, solo en memoria y 5 minutos: no se guardan en ningún sitio.
let grupo: { numeros: Set<string>; caduca: number } | undefined;

async function permitido(numero: string) {
  const { WHATSAPP_PERMITIDOS, WHATSAPP_GRUPO, EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE } =
    process.env;
  const lista = WHATSAPP_PERMITIDOS?.split(",").map((n) => n.replace(/\D/g, "")).filter(Boolean) ?? [];
  if (lista.includes(numero)) return true;
  if (!WHATSAPP_GRUPO) return false;
  if (!grupo || grupo.caduca < Date.now()) {
    const res = await fetch(
      `${EVOLUTION_API_URL!.replace(/\/$/, "")}/group/participants/${EVOLUTION_INSTANCE}?groupJid=${encodeURIComponent(WHATSAPP_GRUPO)}`,
      { headers: { apikey: EVOLUTION_API_KEY! } },
    ).catch(() => undefined);
    if (!res?.ok) return false;
    const { participants = [] } = await res.json();
    const numeros = new Set<string>();
    for (const p of participants as { id?: string; phoneNumber?: string }[])
      for (const j of [p.phoneNumber, p.id])
        if (j?.endsWith("@s.whatsapp.net") || /^\d+$/.test(j ?? "")) numeros.add(j!.split("@")[0]);
    grupo = { numeros, caduca: Date.now() + 5 * 60_000 };
  }
  return grupo.numeros.has(numero);
}

async function existe(host: string) {
  const limite = new Promise<false>((r) => setTimeout(() => r(false), 2000));
  return Promise.race([lookup(host).then(() => true, () => false), limite]);
}
