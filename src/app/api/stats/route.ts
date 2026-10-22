import { obtenerEstadisticas } from "../../../lib/estadisticas";

// Métricas agregadas de la demo: cuántos análisis se han hecho y con qué
// veredicto y tipo de entrada. Solo números: no hay forma de preguntar por
// una entrada concreta porque no se guarda nada de lo que envía el usuario.
// El contador vive en la memoria de cada instancia del serverless y se
// vacía al arrancar en frío: es volátil a propósito (src/lib/estadisticas.ts).
export async function GET() {
  return Response.json(obtenerEstadisticas(), {
    headers: { "cache-control": "no-store" },
  });
}
