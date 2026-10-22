import { verificarMensaje } from "../../../lib/verificar-mensaje";

// POST {"texto": "…", "tipo": "sms" | "email", "enlaceOculto"?: true,
// "remitente"?: "…"} devuelve el veredicto del mensaje. `enlaceOculto` y
// `remitente` vienen de una captura: un enlace cuya dirección no se ve y
// quién envía el mensaje. No se guarda ni se registra nada de lo que envía el usuario.
export async function POST(req: Request) {
  const { texto, tipo, enlaceOculto, remitente } = await req.json().catch(() => ({}));
  if (typeof texto !== "string" || !texto.trim() || texto.length > 4000)
    return Response.json(
      { error: "Pega un SMS o un correo de hasta 4.000 caracteres." },
      { status: 400 },
    );
  const t = tipo === "email" ? "email" : "sms";
  return Response.json(
    verificarMensaje(
      texto.trim(),
      t,
      enlaceOculto === true,
      typeof remitente === "string" ? remitente.slice(0, 100) : undefined,
    ),
  );
}
