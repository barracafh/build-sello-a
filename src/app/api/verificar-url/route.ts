import {
  postVerificarUrl,
  respuestaOptions,
} from "../../../lib/api";

// Alias de compatibilidad de /api/verificar. POST {"texto": "…"} o
// {"enlaces": [{texto, href}]} (el HTML de un correo copiado) devuelve el
// veredicto. No se guarda ni se registra lo que llega. Mismo contrato,
// cabeceras y límite de peticiones que el endpoint genérico.
export async function POST(req: Request) {
  return postVerificarUrl(req);
}

// CORS cerrado: solo se consume desde la propia herramienta (mismo origen).
export async function OPTIONS() {
  return respuestaOptions("POST, OPTIONS");
}
