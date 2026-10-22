// Contador agregado de análisis, para dar impacto a la demo: cuántas
// comprobaciones se han hecho esta noche y con qué resultado.
//
// PRIVACIDAD POR DISEÑO: aquí no hay texto, dominios, IPs, marcas de tiempo
// ni nada derivado de lo que pega el ciudadano. Solo números agregados, en
// memoria, dentro de un módulo sin estado exportable más allá de los
// contadores. Tampoco hay persistencia: en serverless (Vercel) cada función
// tiene su propia memoria y se vacía con cada arranque frío, así que estas
// cifras son por-instancia y volátiles. Es intencionado: guardar el total en
// una base de datos obligaría a decidir qué se conserva y durante cuánto
// tiempo, y la regla del proyecto es no guardar nada del usuario. Un número
// que se olvida solo no puede filtrarse.
//
// El front lo lee de GET /api/stats; ningún endpoint acepta escritura.

import type { Veredicto } from "./verificar-url";

const VEREDICTOS: Veredicto[] = ["oficial_verificado", "no_oficial", "no_determinable"];

export type TipoEntradaStats = "url" | "web" | "sms" | "email";

const TIPOS: TipoEntradaStats[] = ["url", "web", "sms", "email"];

export type Estadisticas = {
  total: number;
  por_veredicto: Record<Veredicto, number>;
  por_tipo: Record<TipoEntradaStats, number>;
};

// Estado del módulo: solo los tres números de arriba. Cualquier clave nueva
// que se quiera contar tiene que existir primero en VEREDICTOS o TIPOS.
const estado: Estadisticas = {
  total: 0,
  por_veredicto: { oficial_verificado: 0, no_oficial: 0, no_determinable: 0 },
  por_tipo: { url: 0, web: 0, sms: 0, email: 0 },
};

// Un análisis con veredicto, una llamada. Las entradas con error de
// validación (400) no cuentan: no hubo análisis.
export const registrarAnalisis = (tipo: TipoEntradaStats, veredicto: Veredicto) => {
  if (!TIPOS.includes(tipo) || !VEREDICTOS.includes(veredicto)) return;
  estado.total += 1;
  estado.por_veredicto[veredicto] += 1;
  estado.por_tipo[tipo] += 1;
};

// Copia solo lectura, para la respuesta de /api/stats.
export const obtenerEstadisticas = (): Estadisticas => ({
  total: estado.total,
  por_veredicto: { ...estado.por_veredicto },
  por_tipo: { ...estado.por_tipo },
});
