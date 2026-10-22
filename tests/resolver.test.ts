// Tests unitarios del resolver de patrones (src/lib/resolver.ts).
import { describe, expect, test } from "bun:test";
import {
  desneutralizar,
  detectarOrganismo,
  neutralizar,
  patronesContenido,
  resolverEnlaces,
} from "../src/lib/resolver";

describe("desneutralizar", () => {
  test("convierte hxxps:// en https://", () => {
    expect(desneutralizar("hxxps://ejemplo.com")).toBe("https://ejemplo.com");
    // En mayúsculas deja la S como está (httpS://); no importa: la regex de
    // extracción de enlaces no distingue mayúsculas.
    expect(desneutralizar("HXXPS://ejemplo.com")).toBe("httpS://ejemplo.com");
  });

  test("convierte las variantes de punto ofuscado", () => {
    expect(desneutralizar("ejemplo[.]com")).toBe("ejemplo.com");
    expect(desneutralizar("ejemplo[ . ]com")).toBe("ejemplo.com");
    expect(desneutralizar("ejemplo[.]com")).toBe("ejemplo.com");
    expect(desneutralizar("ejemplo(.)com")).toBe("ejemplo.com");
    expect(desneutralizar("ejemplo{.}com")).toBe("ejemplo.com");
    expect(desneutralizar("ejemplo[dot]com")).toBe("ejemplo.com");
    expect(desneutralizar("ejemplo[DOT]com")).toBe("ejemplo.com");
  });

  test("convierte [:] en dos puntos", () => {
    expect(desneutralizar("hxxps[:]//example.com")).toBe("https://example.com");
  });

  test("no toca un texto sin ofuscación", () => {
    expect(desneutralizar("https://sede.dgt.gob.es")).toBe("https://sede.dgt.gob.es");
  });
});

describe("neutralizar", () => {
  test("devuelve una URL no clicable: hxxp y [.]", () => {
    const n = neutralizar("https://sede.dgt.gob.es/multas");
    expect(n).toBe("hxxps://sede[.]dgt[.]gob[.]es/multas");
    expect(n.startsWith("http://")).toBe(false);
    expect(n).not.toContain(".gob");
  });

  test("es la inversa de desneutralizar para una URL normal", () => {
    const url = "https://sede.dgt.gob.es/multas";
    expect(desneutralizar(neutralizar(url))).toBe(url);
  });
});

describe("resolverEnlaces", () => {
  test("extrae una URL https normal", () => {
    const enlaces = resolverEnlaces("Consulte https://sede.dgt.gob.es/es/multas para más información");
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].scheme).toBe("https");
    expect(enlaces[0].url).toBe("https://sede.dgt.gob.es/es/multas");
    expect(enlaces[0].original).toBe("hxxps://sede[.]dgt[.]gob[.]es/es/multas");
  });

  test("extrae una URL neutralizada con hxxps y [.]", () => {
    const enlaces = resolverEnlaces(
      "más información en hxxps://agenciatributaria-devolucion[.]top/renta2023",
    );
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].url).toBe("https://agenciatributaria-devolucion.top/renta2023");
    // El original se guarda neutralizado para mostrarlo al usuario.
    expect(enlaces[0].original).toBe("hxxps://agenciatributaria-devolucion[.]top/renta2023");
  });

  test("extrae una URL neutralizada con [:]", () => {
    const enlaces = resolverEnlaces("entre en hxxps[:]//example.com ahora");
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].url).toBe("https://example.com");
  });

  test("un dominio citado sin esquema NO se analiza", () => {
    // Es la regla de L01–L04: mencionar un dominio oficial no prueba quién
    // envía el mensaje, y no es un enlace que el remitente pida pulsar.
    expect(resolverEnlaces("acceda tecleando sede.agenciatributaria.gob.es en su navegador")).toEqual([]);
    expect(resolverEnlaces("consulte www.correos.es o la app")).toEqual([]);
    expect(
      resolverEnlaces(
        "puede acceder a ella en dehu.redsara.es identificándose con Cl@ve, certificado o DNIe",
      ),
    ).toEqual([]);
  });

  test("el marcador [URL fraudulenta] de INCIBE no produce enlace", () => {
    expect(resolverEnlaces("Siga las instrucciones: [URL fraudulenta]")).toEqual([]);
  });

  test("quita la puntuación final que no es de la URL", () => {
    const enlaces = resolverEnlaces(
      "Entra en https://correos.es, después en https://correos.es/localizador y por último en https://correos.es.",
    );
    expect(enlaces.map((e) => e.url)).toEqual([
      "https://correos.es",
      "https://correos.es/localizador",
    ]);
  });

  test("no duplica la misma URL", () => {
    const enlaces = resolverEnlaces(
      "Visite https://correos.es y también https://correos.es",
    );
    expect(enlaces).toHaveLength(1);
  });

  test("extrae varias URLs distintas en orden", () => {
    const enlaces = resolverEnlaces(
      "Vea https://bit.ly/abc y después hxxps://multa-pago[.]top/x",
    );
    expect(enlaces.map((e) => e.url)).toEqual(["https://bit.ly/abc", "https://multa-pago.top/x"]);
  });

  test("no incluye paréntesis ni corchetes de cierre", () => {
    const enlaces = resolverEnlaces("(https://ejemplo.com) y [https://otro.es]");
    expect(enlaces.map((e) => e.url)).toEqual(["https://ejemplo.com", "https://otro.es"]);
  });

  test("marcase hxxp (sin s) también cuenta como enlace", () => {
    const enlaces = resolverEnlaces("hxxp://multas-pago[.]com/pago");
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].scheme).toBe("http");
  });
});

describe("detectarOrganismo", () => {
  test("detecta los cinco organismos más suplantados", () => {
    expect(detectarOrganismo("AGENCIA TRIBUTARIA: devolución del IRPF")?.id).toBe("aeat");
    expect(detectarOrganismo("DGT: multa pendiente de pago")?.id).toBe("dgt");
    expect(detectarOrganismo("Correos: su paquete está retenido")?.id).toBe("correos");
    expect(detectarOrganismo("SEGURIDAD SOCIAL: tarjeta sanitaria")?.id).toBe("seg-social");
    expect(detectarOrganismo("SEPE: prestación por desempleo")?.id).toBe("sepe");
  });

  test("detecta sin tildes ni mayúsculas", () => {
    expect(detectarOrganismo("direccion general de trafico")?.id).toBe("dgt");
    expect(detectarOrganismo("agencia tributaria")?.id).toBe("aeat");
  });

  test("devuelve undefined si el mensaje no nombra a un organismo", () => {
    expect(detectarOrganismo("Su paquete de Amazon está en reparto")).toBeUndefined();
    expect(detectarOrganismo("")).toBeUndefined();
  });
});

describe("patronesContenido", () => {
  test("pago por enlace de un organismo de la lista es concluyente", () => {
    const { concluyentes } = patronesContenido(
      "AEAT: pague sus tasas pendientes en el enlace recibido",
      "sms",
      true,
    );
    expect(concluyentes.map((s) => s.code)).toContain("pago_por_enlace");
  });

  test("pago sin enlace no concluye por sí solo", () => {
    const { concluyentes } = patronesContenido(
      "AEAT: pague sus tasas pendientes antes del plazo",
      "sms",
      false,
    );
    expect(concluyentes).toHaveLength(0);
  });

  test("devolución de la AEAT con enlace es concluyente", () => {
    const { concluyentes } = patronesContenido(
      "AEAT: se ha ordenado el pago de su devolucion del IRPF, pulse el enlace",
      "sms",
      true,
    );
    expect(concluyentes.map((s) => s.code)).toContain("devolucion_enlace");
  });

  test("multa de la DGT con enlace es concluyente en SMS", () => {
    const { concluyentes } = patronesContenido(
      "DGT: dispone de 24 horas para pagar su multa en el enlace",
      "sms",
      true,
    );
    expect(concluyentes.map((s) => s.code)).toContain("dgt_multa_enlace");
    expect(concluyentes.map((s) => s.code)).not.toContain("dgt_no_email");
  });

  test("multa de la DGT por email es concluyente aunque no traiga enlace", () => {
    // La DGT no notifica multas por correo electrónico, con o sin enlace.
    const { concluyentes } = patronesContenido(
      "DGT: ultimo recordatorio antes del recargo de su multa",
      "email",
      false,
    );
    expect(concluyentes.map((s) => s.code)).toContain("dgt_no_email");
  });

  test("actualización de datos de la Seguridad Social con enlace es concluyente", () => {
    const { concluyentes } = patronesContenido(
      "SEGURIDAD SOCIAL: su tarjeta sanitaria requiere una actualizacion, entre en el enlace",
      "sms",
      true,
    );
    expect(concluyentes.map((s) => s.code)).toContain("seg_social_actualizar");
  });

  test("pedir datos bancarios o de tarjeta es concluyente incluso sin enlace", () => {
    const { concluyentes } = patronesContenido(
      "SEGURIDAD SOCIAL: envie numero de tarjeta, caducidad y CVV para verificar su identidad",
      "sms",
      false,
    );
    expect(concluyentes.map((s) => s.code)).toContain("pide_datos_bancarios");
  });

  test("amenaza de arresto en 48/72 horas es concluyente", () => {
    const { concluyentes } = patronesContenido(
      "Tiene una orden de detencion pendiente. Debe presentarse en 48 horas",
      "sms",
      false,
    );
    expect(concluyentes.map((s) => s.code)).toContain("amenaza_arresto");
  });

  test("la urgencia es un aviso, no concluye", () => {
    const { concluyentes, avisos } = patronesContenido(
      "Tiene 24 horas para responder a este aviso",
      "sms",
      false,
    );
    expect(concluyentes).toHaveLength(0);
    expect(avisos.map((s) => s.code)).toContain("urgencia");
  });

  test("los fallos de codificación son un aviso (411,00¿)", () => {
    const { avisos } = patronesContenido(
      "Se ha ordenado el pago 411,00¿ de su devolucion",
      "sms",
      false,
    );
    expect(avisos.map((s) => s.code)).toContain("errores_codificacion");
  });

  test("un aviso informativo bien escrito no genera señales", () => {
    // Texto de L01: sin enlace, sin pago, sin datos, sin urgencia.
    const { concluyentes, avisos } = patronesContenido(
      "AEAT: Tiene una nueva notificación disponible. Este mensaje es solo informativo.",
      "sms",
      false,
    );
    expect(concluyentes).toHaveLength(0);
    expect(avisos).toHaveLength(0);
  });
});
