// Tests unitarios del verificador de webs (src/lib/verificar-url.ts).
// Analiza solo el texto de la URL: nunca hay red, así que los tests son
// deterministas y rápidos.
import { describe, expect, test } from "bun:test";
import { noDeterminable, verificarUrl, type Resultado } from "../src/lib/verificar-url";

// Estrecha el tipo tras comprobar que no hay error (para tsc --noEmit).
const v = (entrada: string): Resultado => {
  const r = verificarUrl(entrada);
  if ("error" in r) throw new Error(`No debía dar error con «${entrada}»: ${r.error}`);
  return r;
};

const resumen = (r: ReturnType<typeof verificarUrl>) =>
  "error" in r ? { error: r.error } : { veredicto: r.veredicto, motivo: r.motivo };

describe("entradas que no se pueden analizar", () => {
  test("un texto sin dirección web da error", () => {
    const r = verificarUrl("Esto no tiene ninguna dirección");
    expect("error" in r).toBe(true);
  });

  test("una cadena vacía da error", () => {
    expect("error" in verificarUrl("")).toBe(true);
  });

  test("un dominio citado con www pero sin esquema sí se analiza", () => {
    // El usuario pega «www.ejemplo.com» a secas: es lo que quiere comprobar.
    const r = v("www.example.com");
    expect(resumen(r)).toEqual({ veredicto: "no_determinable", motivo: "desconocido" });
  });
});

describe("acortadores: nunca se expanden (SETUP.md)", () => {
  test("bit.ly sale no_determinable, no no_oficial", () => {
    const r = v("https://bit.ly/3xYzAbC");
    expect(resumen(r)).toEqual({ veredicto: "no_determinable", motivo: "acortador_no_resuelto" });
    expect(r.pasos.join(" ")).toContain("acortador");
  });

  test("t.co también es acortador", () => {
    expect(resumen(verificarUrl("https://t.co/abc123"))).toEqual({
      veredicto: "no_determinable",
      motivo: "acortador_no_resuelto",
    });
  });

  test("un subdominio www del acortador también", () => {
    expect(resumen(verificarUrl("https://www.tinyurl.com/abc"))).toEqual({
      veredicto: "no_determinable",
      motivo: "acortador_no_resuelto",
    });
  });
});

describe("rechazos de entrada: credenciales e IP", () => {
  test("credenciales en la URL: el dominio real es lo que va después de @", () => {
    const r = v("https://sede.agenciatributaria.gob.es@malicia-ejemplo.com/pago");
    expect(resumen(r)).toEqual({ veredicto: "no_oficial", motivo: "credenciales_en_url" });
    // Señala la entidad suplantada y la web oficial buena.
    expect(r.entidad).toBe("Agencia Tributaria (AEAT)");
    expect(r.webOficial).toBe("https://sede.agenciatributaria.gob.es");
  });

  test("credenciales con una marca conocida antes de @ se atribuyen a la entidad", () => {
    const r = v("https://dgt.es@estafa-ejemplo.com");
    expect(resumen(r)).toEqual({ veredicto: "no_oficial", motivo: "credenciales_en_url" });
    expect(r.entidad).toBe("Dirección General de Tráfico (DGT)");
  });

  test("una IP en lugar de dominio es fraude", () => {
    const r = v("http://192.168.0.10/multa");
    expect(resumen(r)).toEqual({ veredicto: "no_oficial", motivo: "ip_en_url" });
  });
});

describe("lista de dominios oficiales (allowlist)", () => {
  test("coincidencia exacta: san.gva.es", () => {
    const r = v("https://www.san.gva.es/es/web/portal-del-paciente");
    expect(resumen(r)).toEqual({ veredicto: "oficial_verificado", motivo: "en_allowlist" });
    expect(r.entidad).toBe("Conselleria de Sanitat – GVA (cita previa sanitaria)");
    expect(r.webOficial).toBe("https://www.san.gva.es/es/web/portal-del-paciente");
  });

  test("www.dominio cuenta como coincidencia exacta", () => {
    expect(resumen(verificarUrl("https://www.dgt.es"))).toEqual({
      veredicto: "oficial_verificado",
      motivo: "en_allowlist",
    });
  });

  test("subdominio válido de un dominio de la lista", () => {
    const r = v("https://cita.san.gva.es/cita");
    expect(resumen(r)).toEqual({
      veredicto: "oficial_verificado",
      motivo: "subdominio_en_allowlist",
    });
    expect(r.entidad).toBe("Conselleria de Sanitat – GVA (cita previa sanitaria)");
  });

  test("la entrada más concreta gana: sede.agenciatributaria.gob.es", () => {
    const r = v("https://sede.agenciatributaria.gob.es/Sede/ayuda/Phishing.html");
    expect(resumen(r)).toEqual({ veredicto: "oficial_verificado", motivo: "en_allowlist" });
    expect(r.entidad).toBe("Agencia Tributaria (AEAT)");
  });

  test("un dominio de la lista nunca se marca como imitación de marca", () => {
    // «correos» es marca suplantada, pero correos.es está en la lista.
    expect(resumen(verificarUrl("https://correos.es"))).toEqual({
      veredicto: "oficial_verificado",
      motivo: "en_allowlist",
    });
  });

  test("http (sin cifrar) sobre un dominio oficial: aviso, pero sigue oficial", () => {
    const r = v("http://dgt.es");
    expect(resumen(r)).toEqual({ veredicto: "oficial_verificado", motivo: "en_allowlist" });
    expect(r.avisos.join(" ")).toContain("http");
  });

  test("puerto poco habitual: aviso", () => {
    const r = v("https://dgt.es:8443/multas");
    expect(r.avisos.join(" ")).toContain("8443");
  });
});

describe("la regla *.gob.es", () => {
  test("un *.gob.es que no está en la lista sale oficial_verificado con verificación DNS pendiente", () => {
    const r = v("https://ciudadano.municipios.gob.es");
    expect(resumen(r)).toEqual({ veredicto: "oficial_verificado", motivo: "regla_gob_es" });
    expect(r.requiereDns).toBe(true);
    expect(r.host).toBe("ciudadano.municipios.gob.es");
    expect(r.fuentes.map((f) => f.nombre).join(" ")).toContain("ITC/1542/2005");
  });

  test("«gob.es» dentro del dominio pero no al final es fraude", () => {
    expect(resumen(verificarUrl("hxxps://sede-dgt-gob-es[.]click/revisar"))).toEqual({
      veredicto: "no_oficial",
      motivo: "imita_gob_es",
    });
    expect(resumen(verificarUrl("https://administracion.gob-es.com"))).toEqual({
      veredicto: "no_oficial",
      motivo: "imita_gob_es",
    });
  });
});

describe("plataformas compartidas con comodín", () => {
  test("un inquilino no listado en sede.gob.es sale no_determinable", () => {
    const r = v("https://taller-ejemplo.sede.gob.es/tramite");
    expect(resumen(r)).toEqual({ veredicto: "no_determinable", motivo: "plataforma_compartida" });
    expect(r.pasos.join(" ")).toContain("inquilino");
  });
});

describe("trampas de dominio del reto", () => {
  test("dgt.es.multas-pago.com NO es dgt.es", () => {
    const r = v("https://dgt.es.multas-pago.com/expediente");
    expect(resumen(r)).toEqual({ veredicto: "no_oficial", motivo: "marca_como_subdominio" });
    expect(r.entidad).toBe("Dirección General de Tráfico (DGT)");
    expect(r.webOficial).toBe("https://sede.dgt.gob.es");
    expect(r.pasos.join(" ")).toContain("el dominio real es lo que va al final");
  });

  test("sede.agenciatributaria.gob.es.devolucion.top tampoco", () => {
    const r = v("hxxps://sede.agenciatributaria.gob.es.devolucion[.]top/renta2023");
    expect(resumen(r)).toEqual({ veredicto: "no_oficial", motivo: "marca_como_subdominio" });
    expect(r.entidad).toBe("Agencia Tributaria (AEAT)");
  });

  test("la marca DGT en un dominio ajeno es imitación", () => {
    const r = v("hxxps://dgt-multas-pago[.]com/expediente");
    expect(resumen(r)).toEqual({ veredicto: "no_oficial", motivo: "imitacion_de_marca" });
    expect(r.entidad).toBe("Dirección General de Tráfico (DGT)");
  });

  test("marcas cortas como ugt o cgt no se confunden con dgt", () => {
    // La distancia de edición solo aplica a marcas largas (≥ 6 letras).
    expect(resumen(verificarUrl("https://www.ugt.es"))).toEqual({
      veredicto: "no_determinable",
      motivo: "desconocido",
    });
  });

  test("un TLD .top añade el aviso de INCIBE", () => {
    const r = v("hxxps://tienda-barata[.]top/oferta");
    expect(r.avisos.join(" ")).toContain(".top");
  });

  test("un homógrafo punycode de un dominio de la lista es fraude", () => {
    // Primera «a» cirílica: mismo aspecto, dominio distinto.
    const r = v("https://xn--genciatributaria-sdn.gob.es");
    expect(resumen(r)).toEqual({ veredicto: "no_oficial", motivo: "homografo" });
    expect(r.entidad).toBe("Agencia Tributaria (AEAT)");
  });
});

describe("dominio desconocido: no es lo mismo que fraude", () => {
  test("example.com sale no_determinable con consejo", () => {
    const r = v("https://example.com");
    expect(resumen(r)).toEqual({ veredicto: "no_determinable", motivo: "desconocido" });
    expect(r.consejo).toBe(noDeterminable());
    expect(r.titular).toBe("No he podido confirmar que sea oficial");
  });

  test("un dominio desconocido con TLD barato avisa, pero no acusa", () => {
    const r = v("https://pagina-desconocida[.]click");
    expect(resumen(r)).toEqual({ veredicto: "no_determinable", motivo: "desconocido" });
    expect(r.avisos.join(" ")).toContain(".click");
  });
});

describe("la URL analizada nunca se muestra clicable", () => {
  test("urlNeutralizada va neutralizada en todos los veredictos", () => {
    for (const entrada of [
      "https://dgt.es",
      "https://bit.ly/abc",
      "https://dgt.es.multas-pago.com",
      "https://example.com",
    ]) {
      const r = verificarUrl(entrada);
      if ("error" in r) continue;
      expect(r.urlNeutralizada.startsWith("hxxp")).toBe(true);
      expect(r.urlNeutralizada).not.toMatch(/(?<!\[)\.(?!\])/);
    }
  });
});
