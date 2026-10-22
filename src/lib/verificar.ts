// Capa común de verificación: un solo punto de entrada que enruta cada
// entrada al verificador adecuado según su tipo. Las rutas de API (la
// genérica /api/verificar y los alias /api/verificar-url y
// /api/verificar-mensaje) llaman a esta función, así que el comportamiento es
// el mismo por cualquier puerta.
import { lookup } from "node:dns/promises";
import type { LookupOptions } from "node:dns";
import {
  noDeterminable,
  verificarEnlaces,
  verificarUrl,
  type Enlace,
  type Resultado,
} from "./verificar-url";
import { registrarAnalisis } from "./estadisticas";
import { verificarMensaje } from "./verificar-mensaje";
import { marcarDnsDegradado } from "./providers";

export type TipoEntrada = "url" | "web" | "sms" | "email";

// "web" es un alias de "url": por ejemplo, un enlace pegado en la pestaña de
// mensajes. Los límites de tamaño son los de cada endpoint de siempre.
export const TIPOS_ENTRADA: TipoEntrada[] = ["url", "web", "sms", "email"];

const LIMITE_CARACTERES: Record<TipoEntrada, number> = {
  url: 2000,
  web: 2000,
  sms: 4000,
  email: 4000,
};

export const esTipoEntrada = (valor: unknown): valor is TipoEntrada =>
  typeof valor === "string" && (TIPOS_ENTRADA as string[]).includes(valor);

export const limiteCaracteres = (tipo: TipoEntrada) => LIMITE_CARACTERES[tipo];

export type RespuestaVerificacion = { status: number; cuerpo: object };

// Solo para mensajes: lo que se sabe de una captura de pantalla (un enlace
// cuya dirección no se ve y quién envía el mensaje).
export type OpcionesMensaje = { enlaceOculto?: boolean; remitente?: string };

export const esErrorVerificacion = (c: object): c is { error: string } =>
  "error" in c;

export async function verificar(
  entrada: string,
  tipo: TipoEntrada,
  { enlaceOculto = false, remitente }: OpcionesMensaje = {},
): Promise<RespuestaVerificacion> {
  if (tipo === "url" || tipo === "web") {
    const resultado = verificarUrl(entrada);
    if ("error" in resultado) return { status: 400, cuerpo: resultado };
    const respuesta = { status: 200, cuerpo: await conDns(resultado) };
    // Métricas agregadas, solo el número: nada de la entrada sale de aquí.
    registrarAnalisis(tipo, respuesta.cuerpo.veredicto);
    return respuesta;
  }

  const respuesta = {
    status: 200,
    cuerpo: verificarMensaje(entrada, tipo, enlaceOculto, remitente),
  };
  // Métricas agregadas, solo el número: nada de la entrada sale de aquí.
  registrarAnalisis(tipo, respuesta.cuerpo.veredicto);
  return respuesta;
}

// Enlaces de un correo copiado ({texto, href}): cada uno pasa por el
// verificador de URLs (sin abrirlo) y la regla *.gob.es se comprueba con DNS;
// si alguno baja, baja el veredicto del conjunto.
export async function verificarListaEnlaces(
  enlaces: Enlace[],
): Promise<RespuestaVerificacion> {
  const resultado = verificarEnlaces(enlaces);
  if ("error" in resultado) return { status: 400, cuerpo: resultado };

  const verificados = await Promise.all(
    resultado.enlaces.map(async (e) => ({
      ...e,
      resultado: await conDns(e.resultado),
    })),
  );
  // La regla .gob.es puede haber cambiado algún veredicto (host inexistente o
  // DNS sin confirmar): se recalcula el peor.
  const bajado = verificados.some((e) =>
    ["gob_es_inexistente", "gob_es_dns_no_confirmado"].includes(e.resultado.motivo),
  );
  const cuerpo = {
    ...resultado,
    ...(bajado &&
      resultado.veredicto === "oficial_verificado" && {
        veredicto: "no_determinable" as const,
        titular: "No he podido confirmar que todos los enlaces sean oficiales",
      }),
    enlaces: verificados,
  };
  // Los enlaces llegan del correo copiado: cuentan como "email".
  registrarAnalisis("email", cuerpo.veredicto);
  return { status: 200, cuerpo };
}

// Regla *.gob.es: solo cuenta si el host existe. Consultar el DNS no abre la
// web, y estos dominios solo los registran administraciones.
async function conDns(resultado: Resultado) {
  const { host, requiereDns, ...respuesta } = resultado;
  if (!requiereDns || !host) return respuesta;
  const estado = await existe(host);
  if (estado === "existe") return respuesta;

  if (estado === "no_existe")
    return {
      ...respuesta,
      veredicto: "no_determinable" as const,
      motivo: "gob_es_inexistente",
      titular: "No he podido confirmar que sea oficial",
      consejo: noDeterminable(),
      pasos: [
        ...respuesta.pasos,
        "Pero esa dirección no existe: no la deduzcas, búscala desde la web del organismo.",
      ],
    };

  // DNS sin confirmar (expiró o falló): no se puede afirmar ni negar que el
  // host exista, así que se degrada a no_determinable con un motivo claro y
  // se marca el provider para que /api/health lo refleje. Nunca cuelga ni
  // lanza 500 (src/lib/api.ts lo envuelve todo; aquí la consulta tiene
  // techo de tiempo). No se marca degradado cuando el DNS respondió que el
  // host no existe: eso es una respuesta válida, no un fallo.
  marcarDnsDegradado();
  return {
    ...respuesta,
    veredicto: "no_determinable" as const,
    motivo: "gob_es_dns_no_confirmado",
    titular: "No he podido confirmar que sea oficial",
    consejo: noDeterminable(),
    pasos: [
      ...respuesta.pasos,
      "No he podido comprobar en DNS que exista: entra tú tecleando la web oficial del organismo.",
    ],
  };
}

// ---- Consulta DNS con techo de tiempo -----------------------------------
// AbortSignal.timeout corta la consulta si tarda más de DNS_TIMEOUT_MS. Para
// que no dependa solo de que la consulta respete la señal, Promise.race con
// un temporizador deja listo el resultado aunque la consulta se cuelgue: la
// petición nunca espera más de DNS_TIMEOUT_MS + un margen mínimo.

export const ajustesDns = {
  timeoutMs: 2000,
  // Sustituible en los tests; en producción es la lookup estándar, que no
  // abre ninguna conexión a la web analizada: solo pregunta por su nombre.
  // El AbortSignal corta la consulta; LookupOptions en @types/node aún no
  // declara signal (el runtime sí lo acepta, Node ≥ 16.7), por eso el cast.
  consulta: (host: string, senal: AbortSignal) =>
    lookup(host, { signal: senal } as LookupOptions),
};

type EstadoDns = "existe" | "no_existe" | "sin_confirmar";

// ENOTFOUND es el DNS respondiendo «este nombre no existe». Cualquier otro
// fallo (red, expiración, servidor caído) no prueba nada: sin_confirmar.
const esInexistente = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "ENOTFOUND";

async function existe(host: string): Promise<EstadoDns> {
  const { timeoutMs, consulta } = ajustesDns;
  let despejar = () => {};
  const temporizador = new Promise<"sin_confirmar">((resolver) => {
    const t = setTimeout(() => resolver("sin_confirmar"), timeoutMs + 250);
    despejar = () => clearTimeout(t);
  });
  try {
    return await Promise.race([
      consulta(host, AbortSignal.timeout(timeoutMs)).then(
        () => "existe" as const,
        (e: unknown) => (esInexistente(e) ? ("no_existe" as const) : ("sin_confirmar" as const)),
      ),
      temporizador,
    ]);
  } finally {
    despejar();
  }
}
