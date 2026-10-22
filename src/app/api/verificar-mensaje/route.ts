import { verificar } from "../../../lib/verificar";

// Alias de compatibilidad de /api/verificar con tipo "sms" o "email" (el front
// antiguo lo usa). POST {"texto": "…", "tipo": "sms" | "email"} devuelve el
// veredicto del mensaje. No se guarda ni se registra nada de lo que envía el
// usuario.
export async function POST(req: Request) {
  const { texto, tipo } = await req.json().catch(() => ({}));
  if (typeof texto !== "string" || !texto.trim() || texto.length > 4000)
    return Response.json(
      { error: "Pega un SMS o un correo de hasta 4.000 caracteres." },
      { status: 400 },
    );
  const t = tipo === "email" ? "email" : "sms";
  const { cuerpo } = await verificar(texto.trim(), t);
  return Response.json(cuerpo);
}
