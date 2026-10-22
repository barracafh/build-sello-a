import {
  postVerificar,
  respuestaOptions,
} from "../../../lib/api";

// Endpoint único y genérico. POST {"entrada": "…", "tipo": "url" | "web" |
// "sms" | "email"} devuelve el veredicto ("web" es alias de "url"); para los
// enlaces de un correo copiado, POST {"enlaces": [{texto, href}]}.
// No se guarda ni se registra nada de lo que envía el usuario; la IP solo
// pasa por el contador en memoria del límite de peticiones (src/lib/limite.ts).
// Contrato, cabeceras y códigos de error: docs/anadir-datos.md (apartado «La API»).
export async function POST(req: Request) {
  return postVerificar(req);
}

// CORS cerrado: solo se consume desde la propia herramienta (mismo origen).
export async function OPTIONS() {
  return respuestaOptions("POST, OPTIONS");
}
