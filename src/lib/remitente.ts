// ¿Quién envía el mensaje? Lee el remitente de un SMS o un correo: el que
// aparece arriba en una captura, o una línea «De:» / «Remitente:» del texto.
// Los organismos españoles envían sus SMS con un nombre (AEAT, DGT…), no
// desde un móvil ni desde un número de otro país. Un nombre, en cambio, se
// puede falsificar: nunca basta para decir «oficial».

import { verificarUrl } from "./verificar-url";

export type TipoRemitente =
  | "nombre"
  | "movil_es"
  | "fijo_es"
  | "corto"
  | "internacional"
  | "correo"
  | "desconocido";

export type AnalisisRemitente = {
  valor: string;
  tipo: TipoRemitente;
  // La conclusión que se le enseña al usuario, con su porqué.
  explicacion: string;
  // Cuánto pesa en el veredicto: «fraude» lo decide, «aviso» suma sin
  // concluir y «neutro» solo informa.
  peso: "fraude" | "aviso" | "neutro";
  code?: string;
};

// Prefijos de los países que más aparecen en campañas de smishing.
const PAISES: Record<string, string> = {
  "1": "EE. UU. o Canadá",
  "7": "Rusia",
  "20": "Egipto",
  "27": "Sudáfrica",
  "31": "Países Bajos",
  "32": "Bélgica",
  "33": "Francia",
  "39": "Italia",
  "40": "Rumanía",
  "44": "Reino Unido",
  "48": "Polonia",
  "49": "Alemania",
  "51": "Perú",
  "52": "México",
  "53": "Cuba",
  "54": "Argentina",
  "55": "Brasil",
  "56": "Chile",
  "57": "Colombia",
  "58": "Venezuela",
  "60": "Malasia",
  "62": "Indonesia",
  "63": "Filipinas",
  "84": "Vietnam",
  "86": "China",
  "90": "Turquía",
  "91": "India",
  "92": "Pakistán",
  "212": "Marruecos",
  "213": "Argelia",
  "234": "Nigeria",
  "351": "Portugal",
  "353": "Irlanda",
  "380": "Ucrania",
  "593": "Ecuador",
  "880": "Bangladés",
};

// Lo que suele pedir un fraude que se hace pasar por un organismo.
const TEMA_ADMINISTRATIVO =
  /multa|sancion|recargo|deuda|pago|pagar|abon|devolucion|reembolso|impuesto|hacienda|tributari|trafico|expediente|notificacion|paquete|aduana|envio|tarjeta sanitaria|seguridad social|prestacion|matricula/;

const sinAcentos = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca el remitente en el texto: «De: …», «Remitente: …» o «From: …». */
export function remitenteDelTexto(texto: string): string | undefined {
  const m = /^\s*(?:de|from|remitente|enviado por)\s*:\s*(.+)$/im.exec(texto);
  if (!m) return;
  // En un correo, «De: Nombre <dir@dominio>»: nos quedamos con la dirección.
  const correo = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(m[1]);
  return (correo?.[0] ?? m[1].split(/[.,;]\s/)[0]).trim().slice(0, 100);
}

function pais(digitos: string) {
  for (const largo of [3, 2, 1]) {
    const nombre = PAISES[digitos.slice(0, largo)];
    if (nombre) return { prefijo: digitos.slice(0, largo), nombre };
  }
}

/**
 * Analiza el remitente frente a lo que dice el mensaje. `organismo` es el
 * organismo que el texto dice ser (detectarOrganismo), si lo hay.
 */
export function analizarRemitente(
  remitente: string,
  texto: string,
  organismo: string | undefined,
  hayEnlace: boolean,
): AnalisisRemitente {
  const valor = remitente.trim();
  const t = sinAcentos(texto);
  const pareceAdministrativo = !!organismo || TEMA_ADMINISTRATIVO.test(t);
  const quien = organismo ?? "un organismo";

  // Correo electrónico: el dominio se puede falsificar, así que solo avisa.
  const correo = /@([\w-]+(?:\.[\w-]+)+)$/.exec(valor);
  if (correo) {
    const r = verificarUrl(correo[1]);
    const oficial = !("error" in r) && r.veredicto === "oficial_verificado";
    // Un dominio que imita a un organismo («agenciatributaria-pago.com») ya
    // es la trampa, como en una web.
    if (!("error" in r) && r.veredicto === "no_oficial")
      return {
        valor,
        tipo: "correo",
        peso: "fraude",
        code: "correo_imitacion",
        explicacion: `Viene de ${r.urlNeutralizada.replace(/^hxxps?:\/\//, "")}, un dominio que imita a ${r.entidad ?? quien} sin serlo.`,
      };
    return oficial
      ? {
          valor,
          tipo: "correo",
          peso: "neutro",
          explicacion: `Viene de ${correo[1]}, un dominio oficial${"entidad" in r && r.entidad ? ` de ${r.entidad}` : ""}. Aun así, el remitente de un correo se puede falsificar: no prueba quién lo envía.`,
        }
      : {
          valor,
          tipo: "correo",
          peso: pareceAdministrativo ? "aviso" : "neutro",
          code: "correo_no_oficial",
          explicacion: pareceAdministrativo
            ? `Viene de ${correo[1]}, que no es un dominio oficial de ${quien}.`
            : `Viene de ${correo[1]}, que no está en la lista de dominios oficiales.`,
        };
  }

  const digitos = valor.replace(/[\s().-]/g, "");
  if (/^(\+|00)?\d{5,15}$/.test(digitos)) {
    const internacional = /^(\+|00)/.test(digitos);
    const numero = digitos.replace(/^(\+|00)/, "");

    if (internacional && !numero.startsWith("34")) {
      const p = pais(numero);
      const origen = p ? `de ${p.nombre} (+${p.prefijo})` : "de otro país";
      return pareceAdministrativo
        ? {
            valor,
            tipo: "internacional",
            peso: "fraude",
            code: "remitente_extranjero",
            explicacion: `Llega desde un número ${origen}. Un organismo público español no te escribe desde un teléfono extranjero, y menos para hablar de ${organismo ? "sus trámites" : "multas, pagos o envíos"}.`,
          }
        : {
            valor,
            tipo: "internacional",
            peso: "aviso",
            code: "remitente_extranjero",
            explicacion: `Llega desde un número ${origen}. Desconfía si no esperabas un mensaje de fuera de España.`,
          };
    }

    const nacional = internacional ? numero.slice(2) : numero;
    if (/^[67]\d{8}$/.test(nacional))
      return pareceAdministrativo
        ? {
            valor,
            tipo: "movil_es",
            code: "remitente_movil",
            peso: hayEnlace ? "fraude" : "aviso",
            explicacion: `Llega desde un móvil normal. Los avisos oficiales llegan con un nombre como remitente (AEAT, DGT…), no desde un 6xx o 7xx${hayEnlace ? ", y además trae un enlace" : ""}.`,
          }
        : {
            valor,
            tipo: "movil_es",
            peso: "neutro",
            explicacion: "Llega desde un móvil normal de España.",
          };
    if (/^[89]\d{8}$/.test(nacional))
      return {
        valor,
        tipo: "fijo_es",
        peso: pareceAdministrativo ? "aviso" : "neutro",
        code: "remitente_fijo",
        explicacion: pareceAdministrativo
          ? "Llega desde un teléfono fijo. Los avisos oficiales por SMS llegan con un nombre como remitente, no desde un número."
          : "Llega desde un teléfono fijo de España.",
      };
    if (/^\d{5,6}$/.test(nacional))
      return {
        valor,
        tipo: "corto",
        peso: "neutro",
        explicacion:
          "Llega desde un número corto, de los que usan empresas y servicios para envíos masivos. No dice quién está detrás.",
      };
  }

  // Un nombre (remitente alfanumérico): es lo normal en un aviso real, pero
  // se puede falsificar, y el SMS falso puede caer en el mismo hilo que los
  // auténticos (INCIBE).
  if (/[a-z]/i.test(valor) && valor.length <= 20)
    return {
      valor,
      tipo: "nombre",
      peso: "neutro",
      explicacion: `Llega con el nombre «${valor}» como remitente, como los avisos reales. Pero ese nombre se puede falsificar, incluso para que el SMS falso aparezca junto a los auténticos: no prueba quién lo envía.`,
    };

  return {
    valor,
    tipo: "desconocido",
    peso: "neutro",
    explicacion:
      "No reconozco el formato del remitente, así que no lo tengo en cuenta.",
  };
}
