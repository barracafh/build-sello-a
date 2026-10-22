// ¿Este mensaje es de verdad? Combina las dos fuentes de señales:
//   1. los enlaces del mensaje, analizados por el verificador de webs
//   2. las reglas de contenido de INCIBE (contexto.md, 5.4)
// Un dominio desconocido o un mensaje bien escrito, sin otra señal, salen
// no_determinable (SETUP.md). Nunca se abre nada de lo analizado.

import lista from "../../datos/dominios-oficiales.json";
import fuentesData from "../datos/fuentes.json";
import { noDeterminable, verificarUrl, type Veredicto } from "./verificar-url";
import {
  aludeEnlace,
  detectarOrganismo,
  neutralizar,
  patronesContenido,
  resolverDominiosSueltos,
  resolverEnlaces,
  type Senal,
} from "./resolver";
import {
  analizarRemitente,
  remitenteDelTexto,
  type AnalisisRemitente,
} from "./remitente";
import type { Source } from "@/components/Fuentes";

const FUENTES_GENERICAS: Source[] = fuentesData.orden
  .map((clave) => fuentesData.fuentes[clave as keyof typeof fuentesData.fuentes])
  .filter(Boolean);

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
  // Hay un enlace cuya dirección no se ve: en una captura, o una frase como
  // «pulse aquí». Trae la frase si la hemos encontrado en el texto.
  enlaceSinDireccion?: { frase?: string };
  // Quién lo envía, si se ve: de la captura o de una línea «De:».
  remitente?: AnalisisRemitente;
};

const entidadPorNombre = (nombre: string) =>
  lista.entidades.find((e) => e.entidad === nombre);

// `enlaceOculto`: en una captura de pantalla se ve una palabra con enlace
// («aquí», «Pagar») pero no su dirección. Cuenta como enlace para las reglas.
// `remitente`: el que se ve arriba en una captura; si no llega, se busca una
// línea «De:» en el texto.
export function verificarMensaje(
  texto: string,
  tipo: "sms" | "email" = "sms",
  enlaceOculto = false,
  remitente?: string,
): MensajeResultado {
  // Un dominio sin http («www.dgt-pago.com», «bit.ly/x») también se pulsa en
  // el móvil. Si es oficial, se queda en mención: citarlo no prueba quién
  // envía el mensaje (ver resolverEnlaces).
  const sueltos = resolverDominiosSueltos(texto).filter((p) => {
    const r = verificarUrl(p.url);
    return "error" in r || r.veredicto !== "oficial_verificado";
  });
  const enlaces = [...resolverEnlaces(texto), ...sueltos];
  // Sin ninguna dirección, una frase como «pulse aquí» delata un enlace oculto.
  const frase = enlaces.length ? undefined : aludeEnlace(texto);
  const sinDireccion = enlaceOculto || !!frase;
  const { concluyentes, avisos: senalesAviso, fuentes: fuentesSenales } = patronesContenido(
    texto,
    tipo,
    enlaces.length > 0 || sinDireccion,
  );

  // El remitente frente a lo que dice el mensaje: un número extranjero que
  // habla de multas decide; un móvil o un correo ajeno suman como aviso.
  const deQuien = remitente?.trim() || remitenteDelTexto(texto);
  const analisisRemitente = deQuien
    ? analizarRemitente(
        deQuien,
        texto,
        detectarOrganismo(texto)?.nombre,
        enlaces.length > 0 || sinDireccion,
      )
    : undefined;
  if (analisisRemitente?.peso === "fraude")
    concluyentes.push({ code: analisisRemitente.code!, detalle: analisisRemitente.explicacion });
  if (analisisRemitente?.peso === "aviso")
    senalesAviso.push({ code: analisisRemitente.code!, detalle: analisisRemitente.explicacion });

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
  if (sinDireccion)
    pasos.push(
      frase
        ? `Te manda a un enlace («${frase}») pero no se ve su dirección: no lo puedo comprobar, pero cuenta como enlace.`
        : "Tiene un enlace escondido tras una palabra: no se ve adónde lleva, así que no lo puedo comprobar, pero cuenta como enlace.",
    );
  const avisos: string[] = [];
  // Fuentes genéricas más las de las señales que han disparado (sin repetir).
  const fuentes: Source[] = [...FUENTES_GENERICAS];
  for (const fuente of fuentesSenales) {
    if (!fuentes.some((f) => f.url === fuente.url)) fuentes.push(fuente);
  }

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
        .filter((p) => p.startsWith("Coincide") || p.startsWith("Es un subdominio") || p.startsWith("Empieza") || p.startsWith("Usa") || p.startsWith("Contiene") || p.startsWith("Termina") || p.startsWith("Es un acortador") || p.startsWith("No está en la lista") || p.startsWith("Lo que va antes") || p.startsWith("Es una dirección") || p.startsWith("Aparece"))
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
    ...(sinDireccion && { enlaceSinDireccion: { frase } }),
    ...(analisisRemitente && { remitente: analisisRemitente }),
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
