// Límite de peticiones por IP con ventana deslizante. SOLO EN MEMORIA, SOLO
// CONTADORES: se guarda para cada IP una lista de marcas de tiempo y nada más.
//   · Nunca se escribe en disco, base de datos ni logs (regla de plataforma:
//     no se guarda nada de lo que envía el ciudadano; la IP solo existe como
//     clave del contador mientras su ventana está viva).
//   · En serverless (Vercel) cada instancia tiene su propio proceso, así que
//     el límite es POR INSTANCIA: dos instancias no comparten contadores y el
//     límite real por IP puede multiplicarse por el número de instancias
//     activas. Es una protección antiautomatización básica, no un tope
//     estricto; se documenta así en el PR y en docs/anadir-datos.md.

export const LIMITE_PETICIONES = 60; // peticiones
export const VENTANA_MS = 60_000; // por minuto (ventana deslizante)

// Si el mapa crece mucho (flood con IPs falsas), se barren las ventanas
// vacías. Cada entrada ocupa pocas decenas de bytes: el barre regular evita
// que crezca sin tope. Nada de esto persiste: al reiniciar la instancia,
// el mapa empieza vacío.
const topeMemoria = 5_000;

type Contador = { marcas: number[]; ultimoUso: number };
const contadores = new Map<string, Contador>();

function barrer(ahora: number) {
  if (contadores.size <= topeMemoria) return;
  const desde = ahora - VENTANA_MS;
  for (const [ip, contador] of contadores) {
    if (contador.ultimoUso <= desde) contadores.delete(ip);
  }
}

export type EstadoLimite = {
  permitido: boolean;
  /** Peticiones que aún caben en la ventana (0 si está bloqueado). */
  restantes: number;
  /** Milisegundos hasta que caduca la marca más antigua (solo si bloqueado). */
  reintentaEnMs: number;
};

/** Registra una petición de la IP y dice si pasa. `ahora` se inyecta para los
 * tests. La marca de tiempo es el único dato que se guarda, sin contenido. */
export function comprobarLimite(ip: string, ahora = Date.now()): EstadoLimite {
  const desde = ahora - VENTANA_MS;
  const contador = contadores.get(ip) ?? { marcas: [], ultimoUso: ahora };
  contador.marcas = contador.marcas.filter((m) => m > desde);

  if (contador.marcas.length >= LIMITE_PETICIONES) {
    contador.ultimoUso = ahora;
    contadores.set(ip, contador);
    barrer(ahora);
    const reintentaEnMs = Math.max(1, contador.marcas[0] + VENTANA_MS - ahora);
    return { permitido: false, restantes: 0, reintentaEnMs };
  }

  contador.marcas.push(ahora);
  contador.ultimoUso = ahora;
  contadores.set(ip, contador);
  barrer(ahora);
  return {
    permitido: true,
    restantes: LIMITE_PETICIONES - contador.marcas.length,
    reintentaEnMs: 0,
  };
}

/** Solo para tests: vacía los contadores. */
export function _restablecerLimite() {
  contadores.clear();
}
