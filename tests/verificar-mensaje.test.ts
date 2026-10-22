// Tests unitarios del verificador de mensajes (src/lib/verificar-mensaje.ts):
// combina el análisis de enlaces con las reglas de contenido de INCIBE.
import { describe, expect, test } from "bun:test";
import { verificarMensaje } from "../src/lib/verificar-mensaje";

describe("combinación de veredictos de enlaces", () => {
  test("un enlace no_oficial hace el mensaje no_oficial", () => {
    const r = verificarMensaje(
      "DGT: tiene 24 horas para pagar su multa. Entra en hxxps://dgt-multas-pago[.]com/x",
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.titular).toBe("No es oficial: es un fraude");
    expect(r.entidad).toBe("Dirección General de Tráfico (DGT)");
    expect(r.webOficial).toBe("https://sede.dgt.gob.es");
    expect(r.consejo).toContain("017");
  });

  test("basta un enlace fraudulento entre varios", () => {
    const r = verificarMensaje(
      "Consulte https://sede.dgt.gob.es o, mejor aún, hxxps://correos-aduanas-pago[.]com/envio para su paquete",
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
  });

  test("todos los enlaces oficiales y sin señales: se confirma", () => {
    // Sin «multa», «pago» ni urgencia en el texto: solo el enlace oficial.
    const r = verificarMensaje(
      "Consulte su notificación en https://sede.agenciatributaria.gob.es/Sede/ayuda/Phishing.html",
      "email",
    );
    expect(r.veredicto).toBe("oficial_verificado");
    expect(r.titular).toContain("oficial de Agencia Tributaria (AEAT)");
  });

  test("un enlace oficial con aviso de urgencia no se confirma", () => {
    // La prisa no acusa al mensaje, pero tampoco lo valida: queda en duda.
    // (Con DGT + multa + enlace la regla de contenido sí concluiría fraude.)
    const r = verificarMensaje(
      "AGENCIA TRIBUTARIA: consulte https://sede.agenciatributaria.gob.es antes de que pasen 24 horas",
      "sms",
    );
    expect(r.veredicto).toBe("no_determinable");
    expect(r.motivo).toBe("senales_sin_concluir");
  });

  test("un acortador como único enlace sale no_determinable", () => {
    const r = verificarMensaje("Siga el enlace https://bit.ly/xyz123 para ver su paquete", "sms");
    expect(r.veredicto).toBe("no_determinable");
    expect(r.enlaces).toHaveLength(1);
    expect(r.enlaces[0]).toEqual({
      neutralizado: "hxxps://bit[.]ly/xyz123",
      veredicto: "no_determinable",
      motivo: "acortador_no_resuelto",
    });
  });

  test("los enlaces se devuelven analizados y neutralizados, nunca clicables", () => {
    const r = verificarMensaje(
      "Multa: https://bit.ly/abc y hxxps://correos-paquetes[.]com/pago de tasas",
      "sms",
    );
    expect(r.enlaces).toHaveLength(2);
    for (const enlace of r.enlaces) {
      expect(enlace.neutralizado.startsWith("hxxp")).toBe(true);
    }
    expect(r.enlaces.map((e) => e.veredicto)).toEqual([
      "no_determinable",
      "no_oficial",
    ]);
    // Y el mensaje entero es fraude por el segundo enlace.
    expect(r.veredicto).toBe("no_oficial");
  });
});

describe("reglas de contenido de INCIBE", () => {
  test("pedir un Bizum o una transferencia ya es fraude, sin enlace", () => {
    const r = verificarMensaje(
      "Agencia: regularice su deuda realizando una transferencia al numero de cuenta indicado hoy mismo",
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.motivo).toBe("transferencia_o_bizum");
  });

  test("confirmar DNI y contraseña en un enlace es fraude", () => {
    const r = verificarMensaje(
      "Cl@ve: verifique su identidad y contrasena en el enlace hxxps://clave-verificacion[.]top/login",
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
  });

  test("pedir datos bancarios sin enlace ya es fraude", () => {
    const r = verificarMensaje(
      "SEGURIDAD SOCIAL: envie numero de tarjeta, caducidad y CVV para verificar su identidad",
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.motivo).toBe("pide_datos_bancarios");
  });

  test("multa de la DGT por email, sin enlace, es fraude anunciado", () => {
    const r = verificarMensaje(
      "DGT: ultimo recordatorio sobre su multa, expediente 2026/X",
      "email",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.motivo).toBe("dgt_no_email");
  });

  test("las señales de contenido se suman a las del enlace", () => {
    const r = verificarMensaje(
      "AGENCIA TRIBUTARIA: Se ha ordenado el pago 411,00¿ de su devolucion del IRPF. hxxps://agenciatributaria-devolucion[.]top/renta2023",
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
    // La URL da el motivo principal (imitación de marca en un .top)…
    expect(r.motivo).toBe("imitacion_de_marca");
    // …y el texto añade los avisos de urgencia y codificación.
    expect(r.avisos.join(" ")).toContain("codificación");
    expect(r.webOficial).toBe("https://sede.agenciatributaria.gob.es");
  });

  test("las avisos duplicados se deduplican", () => {
    const r = verificarMensaje(
      "DGT: tiene 24 horas para pagar su multa. Entra en hxxps://dgt-multas-pago[.]com/x antes de 24 horas",
      "sms",
    );
    const urgencias = r.avisos.filter((a) => a.includes("prisa"));
    expect(urgencias.length).toBeLessThanOrEqual(1);
  });
});

describe("sin señales: la duda no acusa", () => {
  test("un mensaje bien escrito sin enlaces sale no_determinable", () => {
    const r = verificarMensaje("Hola, le escribimos para recordarle su cita de mañana", "sms");
    expect(r.veredicto).toBe("no_determinable");
    expect(r.motivo).toBe("sin_señales");
  });

  test("un dominio oficial citado sin esquema NO confirma el mensaje", () => {
    // Regla de L01: el remitente se puede falsificar; mencionar la sede no
    // prueba nada. Si se analizara, este mensaje saldría oficial_verificado.
    const r = verificarMensaje(
      "AEAT: Tiene una nueva notificación disponible. Acceda tecleando sede.agenciatributaria.gob.es en su navegador. Este mensaje es solo informativo.",
      "sms",
    );
    expect(r.veredicto).toBe("no_determinable");
    expect(r.motivo).toBe("sin_señales");
    expect(r.enlaces).toHaveLength(0);
  });

  test("remite a la sede del organismo que parece suplantar", () => {
    const r = verificarMensaje(
      "Correos: su envío está en reparto. Puede seguirlo en el Localizador de Envíos de www.correos.es",
      "email",
    );
    expect(r.veredicto).toBe("no_determinable");
    expect(r.consejo).toContain("Correos");
  });
});

describe("fuentes y metadatos", () => {
  test("siempre incluye INCIBE avisos y 017", () => {
    const r = verificarMensaje("mensaje cualquiera", "sms");
    const nombres = r.fuentes.map((f) => f.nombre).join(" ");
    expect(nombres).toContain("INCIBE · Avisos a la ciudadanía");
    expect(nombres).toContain("017");
  });

  test("una entidad identificada añade su fuente de dominios", () => {
    const r = verificarMensaje(
      "DGT: tiene 24 horas para pagar su multa. Entra en hxxps://dgt-multas-pago[.]com/x",
      "sms",
    );
    expect(r.fuentes.some((f) => f.nombre.includes("Dirección General de Tráfico"))).toBe(true);
  });

  test("los pasos cuentan que no se abrió nada", () => {
    const r = verificarMensaje("mira hxxps://ejemplo-raro[.]top/x", "sms");
    expect(r.pasos[0]).toContain("no he abierto");
  });
});
