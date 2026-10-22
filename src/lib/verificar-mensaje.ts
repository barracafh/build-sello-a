// ¿Este mensaje es de verdad? Combina las dos fuentes de señales:
//   1. los enlaces del mensaje, analizados por el verificador de webs
//   2. las reglas de contenido de INCIBE (contexto.md, 5.4)
// Un dominio desconocido o un mensaje bien escrito, sin otra señal, salen
// no_determinable (SETUP.md). Nunca se abre nada de lo analizado.

import lista from "../../datos/dominios-oficiales.json";
import { noDeterminable, verificarUrl, type Veredicto } from "./verificar-url";
import {
  detectarOrganismo,
  neutralizar,
  patronesContenido,
  resolverEnlaces,
  type Senal,
} from "./resolver";
import type { Source } from "@/components/Fuentes";

const INCIBE_AVISOS: Source = {
  nombre: "INCIBE · Avisos a la ciudadanía",
  url: "https://www.incibe.es/ciudadania/avisos",
};
const INCIBE_017: Source = {
  nombre: "INCIBE · Línea de Ayuda en Ciberseguridad 017",
  url: "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad",
};

export type EnlaceAnalizado = {
  neutralizado: string;
  veredicto: Veredicto;
  motivo: string;
};

export type MensajeResultado = {
  veredicto: Veredicto;
  motivo: string;
  titular: string;
  consejo?: string;
  pasos: string[];
  avisos: string[];
  enlaces: EnlaceAnalizado[];
  entidad?: string;
  webOficial?: string;
  fuentes: Source[];
};

const entidadPorNombre = (nombre: string) =>
  lista.entidades.find((e) => e.entidad === nombre);

export function verificarMensaje(
  texto: string,
  tipo: "sms" | "email" = "sms",
): MensajeResultado {
  const enlaces = resolverEnlaces(texto);
  const { concluyentes, avisos: senalesAviso } = patronesContenido(
    texto,
    tipo,
    enlaces.length > 0,
  );

  // 1. Cada enlace, por el verificador de webs (sin abrirlo).
  const analizados: { enlace: string; resultado: ReturnType<typeof verificarUrl> }[] = [];
  for (const patron of enlaces) {
    analizados.push({ enlace: patron.original, resultado: verificarUrl(patron.url) });
  }
  const enlacesAnalizados: EnlaceAnalizado[] = analizados.map(({ enlace, resultado }) => ({
    neutralizado: enlace,
    veredicto: "error" in resultado ? "no_determinable" : resultado.veredicto,
    motivo: "error" in resultado ? resultado.error : resultado.motivo,
  }));

  const pasos: string[] = [
    "He leído tu mensaje solo como texto: no he abierto sus enlaces ni he seguido redirecciones.",
  ];
  const avisos: string[] = [];
  const fuentes: Source[] = [INCIBE_AVISOS, INCIBE_017];

  const fraudeUrl = analizados.find(
    ({ resultado }) => !("error" in resultado) && resultado.veredicto === "no_oficial",
  );
  const oficialUrl = analizados.find(
    ({ resultado }) => !("error" in resultado) && resultado.veredicto === "oficial_verificado",
  );

  for (const { enlace, resultado } of analizados) {
    if ("error" in resultado) {
      pasos.push(`${enlace}: ${resultado.error}`);
      continue;
    }
    pasos.push(
      `Enlace ${enlace} — ${resultado.titular.toLowerCase()}: ${resultado.pasos
        .filter((p) => p.startsWith("Coincide") || p.startsWith("Es un subdominio") || p.startsWith("Empieza") || p.startsWith("Usa") || p.startsWith("Contiene") || p.startsWith("Termina") || p.startsWith("Es un acortador") || p.startsWith("No está en la lista") || p.startsWith("Lo que va antes") || p.startsWith("Es una dirección"))
        .join(" ") || resultado.motivo}`,
    );
    if (!("error" in resultado)) avisos.push(...resultado.avisos);
  }

  // 2. Reglas de contenido de INCIBE sobre el texto.
  for (const senal of concluyentes) pasos.push(senal.detalle);
  for (const senal of senalesAviso) avisos.push(senal.detalle);

  // 3. «La web buena es…»: el organismo que suplanta el mensaje (5.5).
  const entidadSuplantada =
    (fraudeUrl && !("error" in fraudeUrl.resultado) && fraudeUrl.resultado.entidad) ||
    detectarOrganismo(texto)?.nombre;
  const entidadDatos = entidadSuplantada ? entidadPorNombre(entidadSuplantada) : undefined;
  if (entidadDatos) fuentes.unshift({ nombre: `${entidadDatos.entidad} · fuente de sus dominios`, url: entidadDatos.fuente });

  const base = {
    avisos: [...new Set(avisos)],
    enlaces: enlacesAnalizados,
    entidad: entidadDatos?.entidad,
    webOficial: entidadDatos?.web_oficial,
    fuentes,
  };

  if (fraudeUrl || concluyentes.length > 0) {
    return {
      ...base,
      veredicto: "no_oficial",
      motivo: fraudeUrl ? enlacesAnalizados.find((e) => e.veredicto === "no_oficial")!.motivo : concluyentes[0].code,
      titular: "No es oficial: es un fraude",
      consejo:
        "No pulses el enlace, no respondas y no des datos. Borra el mensaje. " +
        "Si ya diste datos, llama a tu banco y al 017 de INCIBE (gratis, 8:00–23:00 todos los días).",
      pasos,
    };
  }

  // Mensaje con todos los enlaces oficiales y sin señales: se confirma.
  // Un dominio citado en el texto no cuenta: el remitente se puede falsificar.
  if (oficialUrl && !("error" in oficialUrl.resultado) && senalesAviso.length === 0) {
    return {
      ...base,
      veredicto: "oficial_verificado",
      motivo: oficialUrl.resultado.motivo,
      titular: `El enlace es oficial de ${oficialUrl.resultado.entidad}`,
      entidad: oficialUrl.resultado.entidad ?? base.entidad,
      webOficial: oficialUrl.resultado.webOficial ?? base.webOficial,
      consejo:
        "Aunque el enlace sea oficial, entra siempre tecleando la dirección de la sede en el navegador.",
      pasos,
    };
  }

  // Sin señales concluyentes: la duda no acusa (paso 12 de contexto.md).
  if (senalesAviso.length > 0) {
    pasos.push(
      "No hay señales que confirmen o descarten el mensaje. Un aviso bien escrito no prueba quién lo envía.",
    );
  }
  const organismo = detectarOrganismo(texto);
  return {
    ...base,
    veredicto: "no_determinable",
    motivo: senalesAviso.length > 0 ? "senales_sin_concluir" : "sin_señales",
    titular: "No he podido confirmar que sea oficial",
    consejo: noDeterminable(organismo ? `de la web de ${organismo.nombre}` : undefined),
    pasos,
  };
}
