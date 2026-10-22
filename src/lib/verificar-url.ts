// ¿Esta web es oficial? Analiza solo el texto de la URL: no la abre, no sigue
// redirecciones, no expande acortadores y no se conecta a ella (SETUP.md).
// Pasos de contexto.md, apartado 5.2, sin la PSL completa ni el TLS.
import { domainToUnicode } from "node:url";
import lista from "../../datos/dominios-oficiales.json";
import fraudes from "../datos/dominios-fraude.json";
import type { Source } from "@/components/Fuentes";

export type Veredicto = "oficial_verificado" | "no_oficial" | "no_determinable";

export type Resultado = {
  veredicto: Veredicto;
  motivo: string;
  titular: string;
  consejo?: string;
  pasos: string[];
  avisos: string[];
  urlNeutralizada: string;
  entidad?: string;
  webOficial?: string;
  fuentes: Source[];
  // Solo para la regla *.gob.es: la ruta comprueba que el host existe en DNS.
  host?: string;
  requiereDns?: boolean;
};

type Entidad = (typeof lista.entidades)[number];

const INCIBE_AVISOS: Source = {
  nombre: "INCIBE · Avisos a la ciudadanía",
  url: "https://www.incibe.es/ciudadania/avisos",
};
const INCIBE_017: Source = {
  nombre: "INCIBE · Línea de Ayuda en Ciberseguridad 017",
  url: "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad",
};
const PAG = "https://administracion.gob.es";
// Fuente comunitaria, no oficial: se cita como origen del dato junto a INCIBE.
const FUENTE_FRAUDES: Source = {
  nombre: `${fraudes.origen} · lista comunitaria de phishing activo (licencia ${fraudes.licencia})`,
  url: fraudes.repositorio,
};
const fechaFraudes = fraudes.actualizado
  ? new Date(fraudes.actualizado).toLocaleDateString("es-ES", { timeZone: "UTC" })
  : "fecha desconocida";

const ACORTADORES = new Set([
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
  "v.gd", "x.gd", "buff.ly", "cutt.ly", "rebrand.ly", "shorturl.at", "s.id",
  "t.ly", "rb.gy", "tiny.cc", "lnkd.in", "qrco.de", "short.gy", "bl.ink",
  "acortar.link", "urlz.fr",
]);

// Plataformas con comodín: cualquiera de sus subdominios resuelve, así que el
// inquilino tiene que constar en una lista (comun/04b). No lo damos por oficial.
const PLATAFORMAS = ["sede.gob.es", "sedelectronica.es", "sedipualba.es", "sede.dival.es"];

// Marcas que suplantan las campañas publicadas (contexto.md, 5.2 paso 10).
export const MARCAS: Record<string, string> = {
  agenciatributaria: "Agencia Tributaria (AEAT)",
  aeat: "Agencia Tributaria (AEAT)",
  hacienda: "Agencia Tributaria (AEAT)",
  dgt: "Dirección General de Tráfico (DGT)",
  "seg-social": "Seguridad Social (INSS / TGSS)",
  segsocial: "Seguridad Social (INSS / TGSS)",
  seguridadsocial: "Seguridad Social (INSS / TGSS)",
  sepe: "Servicio Público de Empleo Estatal (SEPE)",
  correos: "Correos",
  clave: "Cl@ve (identificación electrónica)",
  carpetaciudadana: "Mi Carpeta Ciudadana (Estado)",
  dehu: "DEHú (Dirección Electrónica Habilitada única) – notificaciones",
};

// Letras de otros alfabetos que se confunden con las latinas (UTS #39, mínimo).
const CONFUSABLES: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", х: "x", у: "y", і: "i", ј: "j",
  ѕ: "s", ԁ: "d", ɡ: "g", һ: "h", ӏ: "l", т: "t", к: "k", м: "m", ο: "o", α: "a", ε: "e", ι: "i",
  κ: "k", ν: "v", τ: "t", υ: "u", ρ: "p", "0": "o", "1": "l",
};

const dominios = lista.entidades.flatMap((e) =>
  e.dominios.map((dominio) => ({ dominio, entidad: e })),
);
const porNombre = (nombre: string) =>
  lista.entidades.find((e) => e.entidad === nombre);

export const neutralizar = (texto: string) =>
  texto.replace(/^http/i, "hxxp").replaceAll(".", "[.]");

const desneutralizar = (texto: string) =>
  texto
    .replace(/\[\s*\.\s*\]|\(\s*\.\s*\)|\{\s*\.\s*\}|\[dot\]/gi, ".")
    .replace(/\[:\]/g, ":")
    .replace(/\bhxxp/gi, "http");

// Del texto pegado, la primera cosa con forma de dirección web.
function extraer(texto: string) {
  const limpio = desneutralizar(texto.trim());
  const tokens = limpio.split(/\s+/).map((t) => t.replace(/^[<("'«]+|[>)"'».,;:!?]+$/g, ""));
  return (
    tokens.find((t) => /^https?:\/\//i.test(t)) ??
    tokens.find((t) => /^[^\s/@]+@?[^\s/]*\.[a-z]{2,}/i.test(t))
  );
}

const fuentesDe = (e: Entidad): Source[] => [
  { nombre: `${e.entidad} · fuente de sus dominios`, url: e.fuente },
  ...("fuente_adicional" in e && e.fuente_adicional
    ? [{ nombre: `${e.entidad} · fuente adicional`, url: e.fuente_adicional }]
    : []),
];

const termina = (host: string, dominio: string) =>
  host === dominio || host.endsWith(`.${dominio}`);

function distancia(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previo = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const actual = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = actual;
    }
  }
  return d[b.length];
}

// Marca dentro de un dominio ajeno: como etiqueta o trozo entre guiones, o a
// distancia ≤ 2 si la marca es larga (seg-socioal). Las cortas, solo exactas.
function marcaImitada(host: string) {
  const etiquetas = host.split(".").slice(0, -1);
  const trozos = etiquetas.flatMap((e) => [e, ...e.split("-")]);
  for (const [marca, entidad] of Object.entries(MARCAS)) {
    if (trozos.includes(marca)) return { marca, entidad };
    if (marca.length >= 6 && etiquetas.some((e) => distancia(e, marca) <= 2))
      return { marca, entidad };
  }
}

function homografo(host: string) {
  if (!host.includes("xn--")) return;
  const esqueleto = [...domainToUnicode(host)].map((c) => CONFUSABLES[c] ?? c).join("");
  if (esqueleto === host) return;
  return dominios.find(({ dominio }) => termina(esqueleto, dominio));
}

export const noDeterminable = (organismo = "del organismo") =>
  `No he podido confirmar que sea oficial. No introduzcas datos. Entra tecleando la dirección ${organismo} o llama al 060.`;

export function verificarUrl(texto: string): Resultado | { error: string } {
  const candidata = extraer(texto);
  if (!candidata)
    return { error: "No encuentro una dirección web en lo que has pegado." };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(candidata) ? candidata : `https://${candidata}`);
  } catch {
    return { error: "No encuentro una dirección web en lo que has pegado." };
  }
  if (!["http:", "https:"].includes(url.protocol))
    return { error: "Solo analizo direcciones que empiezan por http o https." };

  // new URL ya pasa el host a minúsculas y a punycode (xn--) y normaliza las IP.
  const host = url.hostname.replace(/\.$/, "");
  const urlNeutralizada = neutralizar(url.href);
  const pasos = [
    "He leído solo el texto de la dirección: no la he abierto ni he seguido sus enlaces.",
    `Dominio analizado: ${neutralizar(host)}`,
  ];
  const avisos: string[] = [];
  if (url.port) avisos.push(`Usa un puerto poco habitual (${url.port}).`);
  const tld = host.split(".").at(-1);
  if (tld === "top" || tld === "click")
    avisos.push(
      `Termina en .${tld}, una extensión barata que INCIBE ha visto en SMS falsos de la Agencia Tributaria.`,
    );
  const base = { urlNeutralizada, pasos, avisos };

  const fraude = (motivo: string, explicacion: string, entidad?: Entidad): Resultado => {
    pasos.push(explicacion);
    return {
      ...base,
      veredicto: "no_oficial",
      motivo,
      titular: "No es una web oficial",
      entidad: entidad?.entidad,
      webOficial: entidad?.web_oficial,
      fuentes: [...(entidad ? fuentesDe(entidad) : []), INCIBE_AVISOS, INCIBE_017],
    };
  };

  // Paso 2: rechazos de entrada.
  if (url.username || url.password) {
    const engano = marcaImitada(`${url.username}.x`) ?? marcaImitada(host);
    const ref = dominios.find(({ dominio }) => url.username.includes(dominio));
    return fraude(
      "credenciales_en_url",
      `Lo que va antes de «@» es un disfraz: el sitio real es ${neutralizar(host)}.`,
      ref?.entidad ?? (engano && porNombre(engano.entidad)),
    );
  }
  if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith("["))
    return fraude("ip_en_url", "Es una dirección IP, no un dominio. Los organismos no envían enlaces así.");

  // Paso 1: los acortadores no se expanden.
  if (ACORTADORES.has(host.replace(/^www\./, ""))) {
    pasos.push("Es un acortador de enlaces: esconde el destino y no lo voy a abrir para verlo.");
    return {
      ...base,
      veredicto: "no_determinable",
      motivo: "acortador_no_resuelto",
      titular: "No he podido confirmar que sea oficial",
      consejo: noDeterminable(),
      fuentes: [INCIBE_AVISOS, INCIBE_017],
    };
  }

  // Paso 4: letras de otro alfabeto que imitan un dominio de la lista.
  const parecido = homografo(host);
  if (parecido)
    return fraude(
      "homografo",
      `Usa letras de otro alfabeto para parecerse a ${parecido.dominio}.`,
      parecido.entidad,
    );

  // Paso 6: plataformas con comodín.
  const plataforma = PLATAFORMAS.find((p) => host.endsWith(`.${p}`));
  if (plataforma) {
    pasos.push(
      `Está alojado en ${neutralizar(plataforma)}, una plataforma que comparten muchas administraciones; este inquilino no está en la lista.`,
    );
    return {
      ...base,
      veredicto: "no_determinable",
      motivo: "plataforma_compartida",
      titular: "No he podido confirmar que sea oficial",
      consejo: noDeterminable(),
      webOficial: PAG,
      fuentes: [INCIBE_AVISOS, INCIBE_017],
    };
  }

  // Paso 7: lista de dominios oficiales. Gana la entrada más concreta.
  const coincidencia = dominios
    .filter(({ dominio }) => termina(host, dominio))
    .sort((a, b) => b.dominio.length - a.dominio.length)[0];
  if (coincidencia) {
    const { dominio, entidad } = coincidencia;
    const exacta = host === dominio || host === `www.${dominio}`;
    pasos.push(
      exacta
        ? `Coincide exactamente con ${neutralizar(dominio)}, de la lista de dominios oficiales de ${entidad.entidad}.`
        : `Es un subdominio de ${neutralizar(dominio)}, de la lista de dominios oficiales de ${entidad.entidad}.`,
    );
    if (url.protocol === "http:")
      avisos.push("Empieza por http, sin cifrar. Entra mejor por la web oficial de abajo.");
    return {
      ...base,
      veredicto: "oficial_verificado",
      motivo: exacta ? "en_allowlist" : "subdominio_en_allowlist",
      titular: `Es una web oficial de ${entidad.entidad}`,
      entidad: entidad.entidad,
      webOficial: entidad.web_oficial,
      fuentes: fuentesDe(entidad),
    };
  }

  // Un dominio oficial usado como subdominio de un tercero: dgt.es.multas-pago.com.
  const disfrazado = dominios.find(({ dominio }) => host.includes(`${dominio}.`));
  if (disfrazado)
    return fraude(
      "marca_como_subdominio",
      `Empieza por ${neutralizar(disfrazado.dominio)}, pero el dominio real es lo que va al final: ${neutralizar(host)}.`,
      disfrazado.entidad,
    );
  if (/(^|\.)gob\.es\.|gob-es/.test(host))
    return fraude(
      "imita_gob_es",
      "Contiene «gob.es», pero no termina en .gob.es. El dominio real se lee de derecha a izquierda.",
    );

  // Paso 8: *.gob.es está reservado a las administraciones por norma.
  if (host.endsWith(".gob.es")) {
    const fuente = lista.reglas.find((r) => r.patron === "*.gob.es")?.fuente ?? PAG;
    pasos.push(
      "Termina en .gob.es, un dominio reservado a las Administraciones Públicas españolas. No está en nuestra lista, así que no sé de qué organismo es.",
    );
    return {
      ...base,
      veredicto: "oficial_verificado",
      motivo: "regla_gob_es",
      titular: "Es un dominio reservado a las administraciones",
      webOficial: PAG,
      fuentes: [{ nombre: "Orden ITC/1542/2005 · reserva de .gob.es", url: fuente }],
      host,
      requiereDns: true,
    };
  }

  // Paso 10: la marca de un organismo en un dominio que no es suyo.
  const marca = marcaImitada(host);
  if (marca)
    return fraude(
      "imitacion_de_marca",
      `Usa el nombre «${marca.marca}», pero ${neutralizar(host)} no es un dominio de ${marca.entidad}.`,
      porNombre(marca.entidad),
    );

  // Paso 11: lista comunitaria de phishing activo, actualizada cada día. Va
  // después de la lista oficial: solo puede decir «no oficial», nunca «oficial».
  if (fraudes.dominios.some((d) => termina(host, d))) {
    const suplantada = Object.entries(MARCAS).find(([m]) => m.length >= 5 && host.includes(m));
    const r = fraude(
      "lista_phishing",
      `Aparece en una lista pública de webs de phishing activas (${fraudes.origen}, actualizada el ${fechaFraudes}).`,
      suplantada && porNombre(suplantada[1]),
    );
    r.fuentes.push(FUENTE_FRAUDES);
    return r;
  }

  // Paso 12: desconocido no es lo mismo que fraude.
  pasos.push(
    "No está en la lista de dominios oficiales ni tiene señales de fraude. Puede ser legítimo, pero no lo puedo confirmar.",
  );
  return {
    ...base,
    veredicto: "no_determinable",
    motivo: "desconocido",
    titular: "No he podido confirmar que sea oficial",
    consejo: noDeterminable(),
    fuentes: [INCIBE_AVISOS, INCIBE_017],
  };
}

// Enlaces de un correo copiado: el texto que se ve y la dirección real (href).
export type Enlace = { texto: string; href: string };
export type EnlaceVerificado = { texto: string; resultado: Resultado };
export type ResultadoEnlaces = {
  veredicto: Veredicto;
  titular: string;
  enlaces: EnlaceVerificado[];
};

const conEsquema = (c: string) =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(c) ? c : `https://${c}`;

function hostDe(texto: string) {
  const candidata = extraer(texto);
  if (!candidata) return;
  try {
    return new URL(conEsquema(candidata)).hostname.replace(/\.$/, "");
  } catch {}
}

const enLista = (host: string) =>
  dominios
    .filter(({ dominio }) => termina(host, dominio))
    .sort((a, b) => b.dominio.length - a.dominio.length)[0]?.entidad;

// Outlook y Google envuelven los enlaces: el destino va dentro, como parámetro.
// Se lee del texto; no se visita ninguna de las dos.
function desenvolver(href: string) {
  try {
    const url = new URL(href);
    const destino = url.hostname.endsWith("safelinks.protection.outlook.com")
      ? url.searchParams.get("url")
      : /(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname === "/url"
        ? url.searchParams.get("q") ?? url.searchParams.get("url")
        : null;
    if (destino && /^https?:\/\//i.test(destino))
      return { url: destino, envoltorio: url.hostname };
  } catch {}
  return { url: href };
}

const GRAVEDAD: Record<Veredicto, number> = {
  oficial_verificado: 0,
  no_determinable: 1,
  no_oficial: 2,
};

export function verificarEnlaces(enlaces: Enlace[]): ResultadoEnlaces | { error: string } {
  const vistos = new Set<string>();
  const verificados: EnlaceVerificado[] = [];

  for (const { texto, href } of enlaces) {
    if (!/^https?:\/\//i.test(href) || vistos.has(href)) continue;
    vistos.add(href);
    const destino = desenvolver(href);
    const r = verificarUrl(destino.url);
    if ("error" in r) continue;

    const visible = texto.trim().replace(/\s+/g, " ").slice(0, 120);
    const real = new URL(destino.url).hostname.replace(/\.$/, "");
    const hostVisible = hostDe(visible);
    if (destino.envoltorio)
      r.pasos.splice(1, 0, `Venía envuelto por ${neutralizar(destino.envoltorio)}; he leído el destino que lleva dentro.`);

    if (hostVisible && hostVisible !== real && !termina(real, hostVisible)) {
      const trampa = `El texto dice ${neutralizar(hostVisible)}, pero el enlace lleva a ${neutralizar(real)}.`;
      if (r.veredicto === "oficial_verificado") r.avisos.push(trampa);
      else {
        // Lo más claro del phishing: enseña una web y te lleva a otra.
        const suplantada = enLista(hostVisible);
        // Ya no es «puede ser legítimo»: el disfraz es la señal de fraude.
        if (r.motivo === "desconocido") r.pasos.pop();
        Object.assign(r, {
          veredicto: "no_oficial",
          motivo: "enlace_enmascarado",
          titular: "No es una web oficial",
          consejo: undefined,
          pasos: [...r.pasos, `${trampa} Es la trampa típica del phishing.`],
          ...(suplantada && {
            entidad: suplantada.entidad,
            webOficial: suplantada.web_oficial,
            fuentes: [...fuentesDe(suplantada), INCIBE_AVISOS, INCIBE_017],
          }),
        });
      }
    } else if (!hostVisible && visible)
      r.pasos.splice(1, 0, `El texto «${visible}» esconde esta dirección.`);

    verificados.push({ texto: visible || "(sin texto)", resultado: r });
    if (verificados.length === 20) break;
  }

  if (!verificados.length)
    return { error: "No encuentro enlaces web en lo que has pegado." };

  const peor = verificados.reduce((a, b) =>
    GRAVEDAD[b.resultado.veredicto] > GRAVEDAD[a.resultado.veredicto] ? b : a,
  ).resultado.veredicto;
  const uno = verificados.length === 1;
  const titular = {
    no_oficial: uno ? "El enlace no es oficial" : "Hay enlaces que no son oficiales",
    no_determinable: uno
      ? "No he podido confirmar que el enlace sea oficial"
      : "No he podido confirmar que todos los enlaces sean oficiales",
    oficial_verificado: uno ? "El enlace lleva a una web oficial" : "Todos los enlaces llevan a webs oficiales",
  }[peor];
  return { veredicto: peor, titular, enlaces: verificados };
}
