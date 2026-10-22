// Resolver de patrones sobre texto libre. Del mensaje pegado extrae:
//   1. los enlaces (también neutralizados: hxxps://, [.] , [dot], [:])
//   2. las señales de contenido publicadas por INCIBE (contexto.md, 5.4 y 5.6)
// Solo lee texto: nunca abre nada de lo que encuentra.
//
// Las señales y los organismos son DATOS, no código: viven en
// src/datos/senales.json y src/datos/organismos.json. Añadir una fuente de
// señales nueva es registrar un objeto más en ese fichero; este motor se
// limita a evaluarlo. Cómo añadir una: docs/anadir-datos.md.
import organismosData from "../datos/organismos.json";
import senalesData from "../datos/senales.json";
import type { Source } from "@/components/Fuentes";

export type Senal = { code: string; detalle: string };

export type Patron = {
  scheme: string;
  url: string;
  original: string;
};

// Desactiva las obfuscaciones para analizar (solo en memoria: al usuario se le
// muestra siempre el texto original neutralizado).
export function desneutralizar(texto: string): string {
  return texto
    .replace(/\[\s*\.\s*\]|\(\s*\.\s*\)|\{\s*\.\s*\}|\[dot\]/gi, ".")
    .replace(/\[:\]/g, ":")
    .replace(/\bhxxp/gi, "http");
}

// Vuelve a neutralizar para mostrar: nada de lo pegado se muestra clicable.
export const neutralizar = (texto: string) =>
  texto.replace(/^http/i, "hxxp").replaceAll(".", "[.]");

/**
 * Extrae los enlaces del mensaje. Cuenta como enlace lo que trae esquema
 * (http, https o sus versiones neutralizadas hxxp/hxxps): es lo que el
 * remitente quiere que pulses. Un dominio citado en el texto (p. ej. «entra
 * tecleando sede.agenciatributaria.gob.es») no es un enlace y no se analiza:
 * mencionar un dominio oficial no prueba quién envía el mensaje.
 */
export function resolverEnlaces(texto: string): Patron[] {
  const limpio = desneutralizar(texto);
  const encontrados = limpio.match(/https?:\/\/[^\s<>"'»«)\]]+/gi) ?? [];
  const patrones: Patron[] = [];
  for (const bruto of encontrados) {
    const url = bruto.replace(/[.,;:!?¡¿"')\]]+$/, "");
    if (!url) continue;
    const scheme = url.match(/^https?/i)?.[0].toLowerCase() ?? "http";
    const original = neutralizar(url);
    if (!patrones.some((p) => p.url === url)) patrones.push({ scheme, url, original });
  }
  return patrones;
}

// Terminaciones con las que un dominio sin esquema cuenta como enlace. Los
// móviles convierten «dgt-multas.com» o «bit.ly/x» en enlace sin http, pero
// una lista cerrada evita leer como dominio abreviaturas como «p.ej.».
const TLDS =
  "com|es|net|org|info|eu|top|xyz|click|link|online|site|website|shop|store|" +
  "app|live|me|io|co|cc|ly|gl|gd|at|to|ws|cat|gal|eus|biz|icu|vip|buzz|lat|" +
  "sbs|cfd|bond|help|support|space|fun|club|pro|page|cn|ru|pw|tk|ml|ga|cf|gq|" +
  "pt|fr|de|it|uk|us";
const DOMINIO_SUELTO = new RegExp(
  `(?<![@\\w./:-])((?:[a-z0-9-]+\\.)+(?:${TLDS}))(?![\\w@-])(/[^\\s<>"'»«)\\]]*)?`,
  "gi",
);

/**
 * Dominios escritos sin http ni hxxp («www.dgt-pago.com», «bit.ly/3xYz»).
 * No incluye los que ya trae resolverEnlaces ni las direcciones de correo.
 * Quien llama decide si un dominio oficial citado cuenta como enlace.
 */
export function resolverDominiosSueltos(texto: string): Patron[] {
  const sinUrls = desneutralizar(texto).replace(/https?:\/\/[^\s<>"'»«)\]]+/gi, " ");
  const patrones: Patron[] = [];
  for (const m of sinUrls.matchAll(DOMINIO_SUELTO)) {
    const bruto = (m[1] + (m[2] ?? "")).replace(/[.,;:!?¡¿"')\]]+$/, "");
    const url = `https://${bruto}`;
    if (!patrones.some((p) => p.url === url))
      patrones.push({ scheme: "", url, original: neutralizar(bruto) });
  }
  return patrones;
}

/**
 * Frases que te mandan a un enlace que no se ve: «pulse aquí», «en el
 * siguiente enlace», o el «[URL fraudulenta]» con que INCIBE tapa la dirección.
 * Devuelve la frase encontrada, tal cual aparece en el texto.
 */
export function aludeEnlace(texto: string): string | undefined {
  const t = sinAcentos(texto);
  const m =
    /\b(pulse|pulsa|pulsar|pinche|pincha|toque|toca|haga clic|haz clic|hacer clic|clic|click|acceda|accede|entre|entra)\b[^.\n]{0,20}?\b(aqui|aca|en el enlace|en este enlace|en el boton|en el link)\b|\b(el siguiente|este|el|del) (enlace|link|boton)\b|\[(url|enlace|link)[^\]]*\]/.exec(
      t,
    );
  // sinAcentos no cambia la longitud del texto: la posición vale para el original.
  return m ? texto.slice(m.index, m.index + m[0].length) : undefined;
}

const sinAcentos = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Organismos más suplantados, y cómo se nombran en los mensajes (4.2).
// Vienen de src/datos/organismos.json: 'id' es como las señales los citan,
// 'nombre' debe coincidir con la entidad de la lista de dominios oficiales.
type OrganismoConfig = { id: string; nombre: string; patron: string };

const ORGANISMOS = (organismosData.organismos as OrganismoConfig[]).map((o) => ({
  ...o,
  regex: new RegExp(o.patron),
}));

/** Detecta a qué organismo dice pertenecer el mensaje. */
export function detectarOrganismo(texto: string): { id: string; nombre: string } | undefined {
  const t = sinAcentos(texto);
  return ORGANISMOS.find((o) => o.regex.test(t));
}

// ---- Señales de contenido (src/datos/senales.json) ----
// Cada señal es un objeto de configuración; el motor de aquí abajo es genérico
// y no sabe nada de organismos ni campañas concretas.

type Condicion = string;

type SenalConfig = {
  code: string;
  concluyente: boolean;
  detalle: string;
  organismos?: string[];
  sinOrganismo?: boolean;
  tipos?: ("sms" | "email")[];
  necesitaEnlace?: boolean;
  sinEnlace?: boolean;
  todo?: Condicion[];
  alguno?: Condicion[];
  sobre?: "sin_acentos" | "texto_original";
  fuente?: Source;
};

const CONCEPTOS = senalesData.conceptos as Record<string, string>;
const SENALES = senalesData.senales as unknown as SenalConfig[];

// Una condición es "@concepto" (busca en senales.json, sección conceptos),
// una expresión regular literal, o "@enlace" (el mensaje trae enlaces).
const compilar = (cond: Condicion): RegExp | "@enlace" => {
  if (cond === "@enlace") return cond;
  const patron = cond.startsWith("@") ? CONCEPTOS[cond.slice(1)] : cond;
  if (!patron) throw new Error(`Señal con condición desconocida: ${cond}`);
  return new RegExp(patron);
};

const detalleDe = (plantilla: string, organismo?: { id: string; nombre: string }) =>
  plantilla.replaceAll("{organismo}", organismo?.nombre ?? "el organismo");

/**
 * Señales de contenido (contexto.md, 5.4). Las que tienen `concluyente: true`
 * convierten el mensaje en no_oficial por sí solas; las demás son avisos que
 * suman sin concluir. Devuelve también las fuentes de las señales que han
 * disparado, para citarlas en la respuesta.
 */
export function patronesContenido(
  texto: string,
  tipo: "sms" | "email",
  hayEnlace: boolean,
): { concluyentes: Senal[]; avisos: Senal[]; fuentes: Source[] } {
  const sinAcentosTexto = sinAcentos(texto);
  const organismo = detectarOrganismo(texto);
  const concluyentes: Senal[] = [];
  const avisos: Senal[] = [];
  const fuentes: Source[] = [];

  for (const senal of SENALES) {
    if (senal.tipos && !senal.tipos.includes(tipo)) continue;
    if (senal.sinOrganismo && organismo) continue;
    if (
      senal.organismos &&
      (!organismo || !senal.organismos.includes(organismo.id))
    )
      continue;
    if (senal.necesitaEnlace && !hayEnlace) continue;
    if (senal.sinEnlace && hayEnlace) continue;

    const objetivo = senal.sobre === "texto_original" ? texto : sinAcentosTexto;
    const cumple = (cond: Condicion) => {
      const patron = compilar(cond);
      return patron === "@enlace" ? hayEnlace : patron.test(objetivo);
    };
    const todoOk = (senal.todo ?? []).every(cumple);
    const algunoOk = !senal.alguno || senal.alguno.some(cumple);
    if (!todoOk || !algunoOk) continue;

    const disparada: Senal = {
      code: senal.code,
      detalle: detalleDe(senal.detalle, organismo),
    };
    (senal.concluyente ? concluyentes : avisos).push(disparada);
    if (senal.fuente) fuentes.push(senal.fuente);
  }

  return { concluyentes, avisos, fuentes };
}
