// Capa común de verificación: un solo punto de entrada que enruta cada
// entrada al verificador adecuado según su tipo. Las rutas de API (la
// genérica /api/verificar y los alias /api/verificar-url y
// /api/verificar-mensaje) llaman a esta función, así que el comportamiento es
// el mismo por cualquier puerta.
import { lookup } from "node:dns/promises";
import {
  noDeterminable,
  verificarEnlaces,
  verificarUrl,
  type Enlace,
  type Resultado,
} from "./verificar-url";
import { verificarMensaje } from "./verificar-mensaje";

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

export async function verificar(
  entrada: string,
  tipo: TipoEntrada,
  { enlaceOculto = false, remitente }: OpcionesMensaje = {},
): Promise<RespuestaVerificacion> {
  if (tipo === "url" || tipo === "web") {
    const resultado = verificarUrl(entrada);
    if ("error" in resultado) return { status: 400, cuerpo: resultado };
    return { status: 200, cuerpo: await conDns(resultado) };
  }

  return {
    status: 200,
    cuerpo: verificarMensaje(entrada, tipo, enlaceOculto, remitente),
  };
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
  // La regla .gob.es puede haber cambiado algún veredicto: se recalcula el peor.
  const bajado = verificados.some((e) => e.resultado.motivo === "gob_es_inexistente");
  return {
    status: 200,
    cuerpo: {
      ...resultado,
      ...(bajado &&
        resultado.veredicto === "oficial_verificado" && {
          veredicto: "no_determinable",
          titular: "No he podido confirmar que todos los enlaces sean oficiales",
        }),
      enlaces: verificados,
    },
  };
}

// Regla *.gob.es: solo cuenta si el host existe. Consultar el DNS no abre la
// web, y estos dominios solo los registran administraciones.
async function conDns(resultado: Resultado) {
  const { host, requiereDns, ...respuesta } = resultado;
  if (!requiereDns || !host || (await existe(host))) return respuesta;
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
}

async function existe(host: string) {
  const limite = new Promise<false>((r) => setTimeout(() => r(false), 2000));
  const consulta = lookup(host).then(
    () => true,
    () => false,
  );
  return Promise.race([consulta, limite]);
}
