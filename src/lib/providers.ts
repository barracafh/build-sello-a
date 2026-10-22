// Registro de providers: cada pieza de la que depende el veredicto que puede
// fallar de forma independiente (una consulta externa, una clave opcional).
// /api/health informa de su estado; aquí no hay nada de datos de usuarios.
//
// Añadir un provider nuevo (p. ej. Google Safe Browsing v5 o RDAP cuando se
// implementen) es añadir un objeto a PROVIDERS: la health lo mostrará sin
// tocar la ruta.

export type EstadoProvider = "operativo" | "degradado" | "no_configurado";

export type Provider = {
  nombre: string;
  descripcion: string;
  /** Los opcionales no afectan al veredicto cuando faltan. */
  opcional: boolean;
  estado: () => EstadoProvider;
};

// ---- Provider dns_gob_es ------------------------------------------------
// La regla *.gob.es se comprueba con DNS (src/lib/verificar.ts). Si la
// consulta expira o falla, se marca degradado DURANTE UN RATO: solo es una
// marca de tiempo en memoria (dato operativo, nunca contenido del usuario),
// para que la health refleje que en ese periodo los veredictos *.gob.es salen
// «no confirmado» en lugar de comprobados.

const DEGRADACION_MS = 5 * 60_000;
let dnsDegradadoDesde: number | null = null;

/** La consulta DNS de la regla *.gob.es ha expirado o ha fallado. */
export function marcarDnsDegradado() {
  dnsDegradadoDesde = Date.now();
}

/** Solo para tests. */
export function _restablecerDns() {
  dnsDegradadoDesde = null;
}

const dnsGobEs: Provider = {
  nombre: "dns_gob_es",
  descripcion:
    "Consulta DNS de la regla *.gob.es (Orden ITC/1542/2005). No abre ninguna URL analizada.",
  opcional: false,
  estado: () =>
    dnsDegradadoDesde !== null && Date.now() - dnsDegradadoDesde < DEGRADACION_MS
      ? "degradado"
      : "operativo",
};

// ---- Provider safe_browsing ---------------------------------------------
// Opcional (SETUP.md): sin clave configurada se sigue solo con la lista, y la
// respuesta ya dice «reputación no consultada». Aquí solo se mira la clave,
// no se llama a nada.

const safeBrowsing: Provider = {
  nombre: "safe_browsing",
  descripcion:
    "Reputación de URL de Google Safe Browsing v5 (opcional, clave SAFE_BROWSING_API_KEY). Aún sin implementar en el verificador: la health lo lista para que se vea que falta.",
  opcional: true,
  estado: () => "no_configurado",
};

export const PROVIDERS: Provider[] = [dnsGobEs, safeBrowsing];
