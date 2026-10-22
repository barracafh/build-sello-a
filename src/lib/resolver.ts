// Resolver de patrones sobre texto libre. Del mensaje pegado extrae:
//   1. los enlaces (también neutralizados: hxxps://, [.] , [dot], [:])
//   2. las señales de contenido publicadas por INCIBE (contexto.md, 5.4 y 5.6)
// Solo lee texto: nunca abre nada de lo que encuentra.

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

const sinAcentos = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Organismos más suplantados, y cómo se nombran en los mensajes (4.2).
const ORGANISMOS = [
  { id: "aeat", nombre: "Agencia Tributaria (AEAT)", patron: /agencia tributaria|aeat|agenciatributaria|irpf|\brenta\b/ },
  { id: "dgt", nombre: "Dirección General de Tráfico (DGT)", patron: /\bdgt\b|trafico|direccion electronica vial|\bdev\b/ },
  { id: "correos", nombre: "Correos", patron: /correos/ },
  { id: "seg-social", nombre: "Seguridad Social (INSS / TGSS)", patron: /seguridad social|seg-social|segsocial|tarjeta sanitaria|\binss\b|\btgss\b/ },
  { id: "sepe", nombre: "Servicio Público de Empleo Estatal (SEPE)", patron: /\bsepe\b|prestacion por desempleo|\bparo\b/ },
] as const;

/** Detecta a qué organismo dice pertenecer el mensaje. */
export function detectarOrganismo(texto: string): { id: string; nombre: string } | undefined {
  const t = sinAcentos(texto);
  return ORGANISMOS.find((o) => o.patron.test(t));
}

/**
 * Señales de contenido (contexto.md, 5.4). Las que devuelven
 * `concluyente: true` convierten el mensaje en no_oficial por sí solas;
 * las demás son avisos que suman sin concluir.
 */
export function patronesContenido(
  texto: string,
  tipo: "sms" | "email",
  hayEnlace: boolean,
): { concluyentes: Senal[]; avisos: Senal[] } {
  const t = sinAcentos(texto);
  const concluyentes: Senal[] = [];
  const avisos: Senal[] = [];

  const organismo = detectarOrganismo(t);
  const deLosCinco = organismo !== undefined;

  const pidePago = /\bpago\b|\bpagar\b|\btasas\b|\babonar\b|\brecargo\b/.test(t);
  const pideBancarios =
    /(tarjeta).*(cvv|caducidad|pin|numero)|\bcvv\b|datos bancarios|numero de tarjeta|codigo (de verificacion|sms)|clave de acceso/.test(t);
  const devolucion = /devolucion|reembolso/.test(t);
  const multa = /multa|expediente|denuncia|sancion/.test(t);
  const amenazaArresto = /arresto|detencion|orden de detencion/.test(t) && /(48|72) horas/.test(t);

  if (deLosCinco && pidePago && hayEnlace) {
    concluyentes.push({
      code: "pago_por_enlace",
      detalle: `Pide un pago a través de un enlace recibido, algo que ${organismo!.nombre} no hace por SMS ni por correo.`,
    });
  }
  if (organismo?.id === "aeat" && devolucion && hayEnlace) {
    concluyentes.push({
      code: "devolucion_enlace",
      detalle: "Promete una devolución de dinero y pide pulsar un enlace: patrón de fraude publicado por INCIBE.",
    });
  }
  if (organismo?.id === "dgt" && multa && (hayEnlace || pidePago)) {
    concluyentes.push({
      code: "dgt_multa_enlace",
      detalle: "La DGT notifica las multas por carta certificada o por la DEV, nunca con enlaces de pago en un SMS o correo.",
    });
  }
  if (organismo?.id === "seg-social" && /(actualizar|actualizaci[o]n|suspen[d]|deuda)/.test(t) && hayEnlace) {
    concluyentes.push({
      code: "seg_social_actualizar",
      detalle: "La Seguridad Social no pide actualizar datos ni pagar deudas mediante enlaces en un SMS o correo (INCIBE).",
    });
  }
  if (organismo?.id === "dgt" && multa && tipo === "email") {
    concluyentes.push({
      code: "dgt_no_email",
      detalle: "La DGT no notifica multas por correo electrónico: lo hace por carta certificada o por la DEV.",
    });
  }
  if (deLosCinco && pideBancarios) {
    concluyentes.push({
      code: "pide_datos_bancarios",
      detalle: `Pide datos de tarjeta o bancarios: ${organismo!.nombre} nunca los solicita por SMS ni por correo.`,
    });
  }
  if (amenazaArresto) {
    concluyentes.push({
      code: "amenaza_arresto",
      detalle: "Amenaza con un arresto en 48/72 h: patrón publicado por INCIBE en suplantaciones policiales.",
    });
  }

  if (/24 horas|48 horas|72 horas|recargo|ultimo recordatorio|ultima advertencia|inmediatamente/.test(t)) {
    avisos.push({
      code: "urgencia",
      detalle: "Mete prisa con un plazo corto: es una señal típica de fraude, aunque por sí sola no concluye.",
    });
  }
  if (/[0-9]{2,3},[0-9]{2}[¿?]|€\?|,00\?/.test(texto)) {
    avisos.push({
      code: "errores_codificacion",
      detalle: "El texto tiene errores de codificación o tildes ausentes: un aviso institucional real los pasa por control.",
    });
  }
  return { concluyentes, avisos };
}
