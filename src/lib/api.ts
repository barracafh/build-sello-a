// Capa de transporte de la API: cabeceras de seguridad, CORS cerrado,
// límite de peticiones y validación de la entrada con códigos de error
// estables. Las rutas (src/app/api/*) solo delegan aquí, así que el
// comportamiento es el mismo por cualquier puerta y se puede testear sin
// servidor.
//
// Contrato de errores: SIEMPRE { error, codigo, detalle? }.
//   · `error`   — mensaje humano en español, es lo que muestra el front.
//   · `codigo`  — código estable y agnóstico de idioma (docs/anadir-datos.md).
//   · `detalle` — opcional, con más contexto.
// Estados: 400 JSON malformado · 422 entrada semánticamente inválida ·
// 429 demasiadas peticiones · 501 método no implementado (ver más abajo).
//
// Privacidad: no se guarda ni se registra nada de lo que envía el usuario.
// La IP solo se usa como clave del contador en memoria de src/lib/limite.ts.

import { comprobarLimite } from "./limite";
import {
  esErrorVerificacion,
  esTipoEntrada,
  limiteCaracteres,
  TIPOS_ENTRADA,
  verificar,
  verificarListaEnlaces,
  type TipoEntrada,
} from "./verificar";

// Cabeceras en todas las respuestas de la API, también en los errores.
export const CABECERAS_API: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  // Nunca cachear una respuesta que depende de lo que ha pegado el usuario.
  "Cache-Control": "no-store",
};

export function respuestaJson(
  cuerpo: object,
  status = 200,
  cabeceras: Record<string, string> = {},
) {
  return Response.json(cuerpo, { status, headers: { ...CABECERAS_API, ...cabeceras } });
}

export function respuestaError(
  codigo: string,
  error: string,
  status: number,
  extras: { detalle?: string; cabeceras?: Record<string, string> } = {},
) {
  return respuestaJson({ error, codigo, ...(extras.detalle && { detalle: extras.detalle }) }, status, extras.cabeceras);
}

// CORS cerrado: la API se consume desde la propia herramienta (mismo origen),
// así que no se emite ningún Access-Control-Allow-Origin. OPTIONS responde
// solo con los métodos permitidos, por si algo lo prefligea.
export function respuestaOptions(metodos: string) {
  return new Response(null, {
    status: 204,
    headers: { ...CABECERAS_API, Allow: metodos },
  });
}

// ---- Límite de peticiones -------------------------------------------------

// Vercel reenvía la IP del cliente en x-forwarded-for (lista) o x-real-ip.
// En local no hay ninguna: se agrupa bajo una clave fija.
export function ipCliente(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function respuestaSiExcedeLimite(req: Request): Response | null {
  const estado = comprobarLimite(ipCliente(req));
  if (estado.permitido) return null;
  // Por instancia (ver src/lib/limite.ts): 30 peticiones por minuto e IP,
  // ventana deslizante, solo contadores en memoria.
  return respuestaError(
    "demasiadas_peticiones",
    "Has hecho muchas comprobaciones seguidas. Espera un momento y vuelve a intentarlo.",
    429,
    {
      detalle: `Límite por IP: 30 peticiones por minuto (por instancia). Reintenta en ${Math.ceil(estado.reintentaEnMs / 1000)} s.`,
      cabeceras: { "Retry-After": String(Math.ceil(estado.reintentaEnMs / 1000)) },
    },
  );
}

// ---- Validación de la entrada --------------------------------------------

export type Validacion<T> =
  | { ok: true; valor: T }
  | { ok: false; status: number; codigo: string; error: string; detalle?: string };

const MAL = { status: 400, codigo: "json_invalido", error: "No he recibido una petición JSON válida." } as const;

/** Lee el cuerpo como JSON. Un cuerpo vacío o corrupto no lanza: da error
 * controlado. Sin dependencias: los cuerpos son un objeto plano con dos o
 * tres campos, y zod añadiría una dependencia y movimiento en bun.lock para
 * esto mismo (lo valoré y decidí validador propio, documentado en el PR). */
export async function leerJson(req: Request): Promise<Validacion<Record<string, unknown>>> {
  let valor: unknown;
  try {
    valor = await req.json();
  } catch {
    return { ok: false, ...MAL };
  }
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return { ok: false, ...MAL };
  return { ok: true, valor: valor as Record<string, unknown> };
}

function esTexto(v: unknown): v is string {
  return typeof v === "string";
}

function errorTextoLargo(tipo: TipoEntrada) {
  return esTipoUrl(tipo)
    ? "Pega una dirección web de hasta 2.000 caracteres."
    : "Pega un SMS o un correo de hasta 4.000 caracteres.";
}

const esTipoUrl = (tipo: TipoEntrada) => tipo === "url" || tipo === "web";

/** POST /api/verificar: {entrada, tipo} o {enlaces: [{texto, href}]}. */
export function validarEntrada(cuerpo: Record<string, unknown>): Validacion<{ entrada: string; tipo: TipoEntrada }> {
  const { entrada, tipo } = cuerpo;
  if (!esTexto(entrada))
    return {
      ok: false,
      status: 422,
      codigo: "entrada_requerida",
      error: "Pega la dirección web o el mensaje que quieres comprobar.",
      detalle: "Campo «entrada» ausente o no textual.",
    };
  if (!esTipoEntrada(tipo))
    return {
      ok: false,
      status: 422,
      codigo: "tipo_no_valido",
      error: `Tipo no reconocido. Usa uno de: ${TIPOS_ENTRADA.join(", ")}.`,
      detalle: typeof tipo === "string" ? `Recibido: «${tipo}».` : "Campo «tipo» ausente o no textual.",
    };
  if (!entrada.trim())
    return {
      ok: false,
      status: 422,
      codigo: "entrada_vacia",
      error: "No me has pegado nada que comprobar.",
    };
  if (entrada.length > limiteCaracteres(tipo))
    return {
      ok: false,
      status: 422,
      codigo: "entrada_demasiado_larga",
      error: errorTextoLargo(tipo),
      detalle: `Máximo ${limiteCaracteres(tipo)} caracteres para «${tipo}».`,
    };
  return { ok: true, valor: { entrada, tipo } };
}

export type EnlaceEntrada = { texto: string; href: string };

/** La lista de enlaces de un correo copiado, común a los tres endpoints. */
export function validarEnlaces(cuerpo: Record<string, unknown>): Validacion<EnlaceEntrada[]> | null {
  const { enlaces } = cuerpo;
  if (!Array.isArray(enlaces)) return null; // no venía por aquí
  if (!enlaces.length)
    return {
      ok: false,
      status: 422,
      codigo: "enlaces_vacios",
      error: "No me ha llegado ningún enlace que comprobar.",
    };
  if (enlaces.length > 50)
    return {
      ok: false,
      status: 422,
      codigo: "demasiados_enlaces",
      error: "Puedo comprobar hasta 50 enlaces por petición.",
    };
  const validos = enlaces.filter(
    (e): e is EnlaceEntrada =>
      typeof e?.texto === "string" &&
      typeof e?.href === "string" &&
      e.href.length <= 2000 &&
      e.href.length > 0,
  );
  if (!validos.length)
    return {
      ok: false,
      status: 422,
      codigo: "enlaces_no_validos",
      error: "Los enlaces deben llevar texto y dirección (href).",
      detalle: "Formato esperado: [{texto: \"…\", href: \"…\"}].",
    };
  return { ok: true, valor: validos };
}

/** POST /api/verificar-url: {texto} o {enlaces}. */
export function validarTextoUrl(cuerpo: Record<string, unknown>): Validacion<{ texto: string }> {
  const { texto } = cuerpo;
  if (!esTexto(texto))
    return {
      ok: false,
      status: 422,
      codigo: "entrada_requerida",
      error: "Pega una dirección web de hasta 2.000 caracteres.",
      detalle: "Campo «texto» ausente o no textual.",
    };
  if (!texto.trim())
    return { ok: false, status: 422, codigo: "entrada_vacia", error: "No me has pegado nada que comprobar." };
  if (texto.length > 2000)
    return {
      ok: false,
      status: 422,
      codigo: "entrada_demasiado_larga",
      error: errorTextoLargo("url"),
      detalle: "Máximo 2.000 caracteres.",
    };
  return { ok: true, valor: { texto } };
}

/** POST /api/verificar-mensaje: {texto, tipo?, enlaceOculto?, remitente?}
 * (tipo falta → sms, como siempre; enlaceOculto y remitente vienen de una
 * captura de pantalla, los añadió main y solo pasan si son válidos). */
export function validarTextoMensaje(
  cuerpo: Record<string, unknown>,
): Validacion<{ texto: string; tipo: "sms" | "email"; enlaceOculto: boolean; remitente?: string }> {
  const { texto, tipo } = cuerpo;
  if (!esTexto(texto))
    return {
      ok: false,
      status: 422,
      codigo: "entrada_requerida",
      error: "Pega un SMS o un correo de hasta 4.000 caracteres.",
      detalle: "Campo «texto» ausente o no textual.",
    };
  if (tipo !== undefined && tipo !== "sms" && tipo !== "email")
    return {
      ok: false,
      status: 422,
      codigo: "tipo_no_valido",
      error: "Tipo no reconocido. Usa «sms» o «email».",
      detalle: typeof tipo === "string" ? `Recibido: «${tipo}».` : "El campo «tipo» no es textual.",
    };
  if (!texto.trim())
    return { ok: false, status: 422, codigo: "entrada_vacia", error: "No me has pegado nada que comprobar." };
  if (texto.length > 4000)
    return {
      ok: false,
      status: 422,
      codigo: "entrada_demasiado_larga",
      error: errorTextoLargo("sms"),
      detalle: "Máximo 4.000 caracteres.",
    };
  const remitente =
    typeof cuerpo.remitente === "string" ? cuerpo.remitente.slice(0, 100) : undefined;
  return {
    ok: true,
    valor: {
      texto,
      tipo: tipo === "email" ? "email" : "sms",
      enlaceOculto: cuerpo.enlaceOculto === true,
      ...(remitente && { remitente }),
    },
  };
}

// ---- Handlers compartidos -------------------------------------------------

export async function postVerificar(req: Request): Promise<Response> {
  const excedido = respuestaSiExcedeLimite(req);
  if (excedido) return excedido;

  const cuerpo = await leerJson(req);
  if (!cuerpo.ok) return respuestaError(cuerpo.codigo, cuerpo.error, cuerpo.status, cuerpo);

  // Enlaces de un correo copiado: el camino del front de mensajes.
  const enlaces = validarEnlaces(cuerpo.valor);
  if (enlaces) {
    if (!enlaces.ok) return respuestaError(enlaces.codigo, enlaces.error, enlaces.status, enlaces);
    const { status, cuerpo: resultado } = await verificarListaEnlaces(enlaces.valor);
    if (esErrorVerificacion(resultado))
      return respuestaError("enlaces_no_reconocidos", resultado.error, 422);
    return respuestaJson(resultado, status);
  }

  const validacion = validarEntrada(cuerpo.valor);
  if (!validacion.ok) return respuestaError(validacion.codigo, validacion.error, validacion.status, validacion);

  const { status, cuerpo: resultado } = await verificar(validacion.valor.entrada, validacion.valor.tipo);
  if (esErrorVerificacion(resultado))
    return respuestaError("entrada_no_reconocida", resultado.error, 422);
  return respuestaJson(resultado, status);
}

export async function postVerificarUrl(req: Request): Promise<Response> {
  const excedido = respuestaSiExcedeLimite(req);
  if (excedido) return excedido;

  const cuerpo = await leerJson(req);
  if (!cuerpo.ok) return respuestaError(cuerpo.codigo, cuerpo.error, cuerpo.status, cuerpo);

  const enlaces = validarEnlaces(cuerpo.valor);
  if (enlaces) {
    if (!enlaces.ok) return respuestaError(enlaces.codigo, enlaces.error, enlaces.status, enlaces);
    const { status, cuerpo: resultado } = await verificarListaEnlaces(enlaces.valor);
    if (esErrorVerificacion(resultado))
      return respuestaError("enlaces_no_reconocidos", resultado.error, 422);
    return respuestaJson(resultado, status);
  }

  const validacion = validarTextoUrl(cuerpo.valor);
  if (!validacion.ok) return respuestaError(validacion.codigo, validacion.error, validacion.status, validacion);

  const { status, cuerpo: resultado } = await verificar(validacion.valor.texto, "url");
  if (esErrorVerificacion(resultado))
    return respuestaError("entrada_no_reconocida", resultado.error, 422);
  return respuestaJson(resultado, status);
}

export async function postVerificarMensaje(req: Request): Promise<Response> {
  const excedido = respuestaSiExcedeLimite(req);
  if (excedido) return excedido;

  const cuerpo = await leerJson(req);
  if (!cuerpo.ok) return respuestaError(cuerpo.codigo, cuerpo.error, cuerpo.status, cuerpo);

  const validacion = validarTextoMensaje(cuerpo.valor);
  if (!validacion.ok) return respuestaError(validacion.codigo, validacion.error, validacion.status, validacion);

  const { texto, tipo, enlaceOculto, remitente } = validacion.valor;
  const { cuerpo: resultado } = await verificar(texto.trim(), tipo, {
    enlaceOculto,
    remitente,
  });
  if (esErrorVerificacion(resultado))
    return respuestaError("entrada_no_reconocida", resultado.error, 422);
  return respuestaJson(resultado);
}
