import {
  postVerificarMensaje,
  respuestaOptions,
} from "../../../lib/api";

// Alias de compatibilidad de /api/verificar con tipo "sms" o "email" (el front
// antiguo lo usa). POST {"texto": "…", "tipo": "sms" | "email",
// "enlaceOculto"?: true, "remitente"?: "…"} devuelve el veredicto del mensaje.
// `enlaceOculto` y `remitente` vienen de una captura: un enlace cuya dirección
// no se ve y quién envía el mensaje. No se guarda ni se registra nada de lo
// que envía el usuario. Mismo contrato, cabeceras y límite de peticiones que
// el genérico.
export async function POST(req: Request) {
  return postVerificarMensaje(req);
}

// CORS cerrado: solo se consume desde la propia herramienta (mismo origen).
export async function OPTIONS() {
  return respuestaOptions("POST, OPTIONS");
}
