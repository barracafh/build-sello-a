import { lookup } from "node:dns/promises";
import { noDeterminable } from "../../../lib/verificar-url";
import { formatear, responder } from "../../../lib/whatsapp";

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
    const texto: string =
      m.message?.conversation ??
      m.message?.extendedTextMessage?.text ??
      m.message?.imageMessage?.caption ??
      "";
    if (!texto.trim()) continue;

    let { texto: respuesta, resultado } = responder(texto);
    // Regla *.gob.es: solo cuenta si el host existe (como en /api/verificar-url).
    if (resultado?.requiereDns && resultado.host && !(await existe(resultado.host)))
      respuesta = formatear({
        ...resultado,
        veredicto: "no_determinable",
        titular: "No he podido confirmar que sea oficial",
        consejo: noDeterminable(),
        pasos: [...resultado.pasos, "Pero esa dirección no existe: búscala desde la web del organismo."],
      });

    await fetch(`${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        number: numero,
        text: respuesta,
        delay: 800,
        quoted: { key: { id: m.key.id }, message: { conversation: texto.slice(0, 200) } },
      }),
    }).catch(() => {});
  }
  return Response.json({ ok: true });
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
