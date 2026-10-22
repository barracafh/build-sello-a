// Tests de regresión de las trampas del reto (SETUP.md «A tener en cuenta» y
// datos/dominios-oficiales.json `notas`). Si alguno falla, la herramienta se
// ha vuelto a equivocar en el caso que más importa.
import { describe, expect, test } from "bun:test";
import casosOrganizacion from "../datos/mensajes-ejemplo.json";
import { verificarMensaje } from "../src/lib/verificar-mensaje";
import { verificarUrl, type Resultado } from "../src/lib/verificar-url";

// Estrecha el tipo tras comprobar que no hay error (para tsc --noEmit).
const v = (entrada: string): Resultado => {
  const r = verificarUrl(entrada);
  if ("error" in r) throw new Error(`No debía dar error con «${entrada}»: ${r.error}`);
  return r;
};

describe("trampa: el dominio oficial como disfraz de un tercero", () => {
  test("dgt.es.multas-pago[.]com NO es dgt.es", () => {
    const r = v("hxxps://dgt[.]es[.]multas-pago[.]com/expediente");
    expect(r.veredicto).toBe("no_oficial");
    expect(r.motivo).toBe("marca_como_subdominio");
    expect(r.entidad).toBe("Dirección General de Tráfico (DGT)");
    expect(r.webOficial).toBe("https://sede.dgt.gob.es");
  });

  test("y como enlace dentro de un SMS tampoco lo es", () => {
    const r = verificarMensaje(
      "DGT: Dispone de 24 horas restantes para pagar su multa. hxxps://dgt[.]es[.]multas-pago[.]com/expediente",
      "sms",
    );
    expect(r.veredicto).toBe("no_oficial");
    expect(r.enlaces[0].veredicto).toBe("no_oficial");
  });
});

describe("trampa: hxxps://…[.]top, el patrón de la campaña AEAT", () => {
  test("la URL neutralizada se desofusca en memoria y se acusa", () => {
    const r = v("hxxps://agenciatributaria-devolucion[.]top/renta2023");
    expect(r.veredicto).toBe("no_oficial");
    // El aviso del TLD muestra el sufijo neutralizado, como toda la URL.
    expect(r.avisos.join(" ")).toContain("[.]top");
  });

  test("una URL .top con dominio desconocido avisa, pero no acusa", () => {
    // El .top por sí solo no es prueba: solo un aviso de INCIBE.
    const r = v("hxxps://compra-sin-nombre[.]top");
    expect(r.veredicto).toBe("no_determinable");
    expect(r.motivo).toBe("desconocido");
  });
});

describe("trampa: credenciales en la URL", () => {
  test("https://sede.agenciatributaria.gob.es@… es fraude, no la sede", () => {
    const r = v("https://sede.agenciatributaria.gob.es@malicia.example.com/pago");
    expect(r.veredicto).toBe("no_oficial");
    expect(r.motivo).toBe("credenciales_en_url");
  });

  test("el disfraz antes de @ no vale como subdominio oficial", () => {
    const r = v("https://sede.dgt.gob.es@ajeno.example.com");
    expect(r.veredicto).toBe("no_oficial");
    expect(r.entidad).toBe("Dirección General de Tráfico (DGT)");
  });
});

describe("trampa: acortadores", () => {
  test("no se expanden: salen no_determinable y con el aviso correspondiente", () => {
    for (const url of ["https://bit.ly/abc", "https://tinyurl.com/abc", "https://cutt.ly/abc"]) {
      const r = v(url);
      expect(r.veredicto).toBe("no_determinable");
      expect(r.motivo).toBe("acortador_no_resuelto");
      expect(r.pasos.join(" ")).toContain("no lo voy a abrir");
    }
  });

  test("un SMS con solo un acortador tampoco acusa al mensaje", () => {
    const r = verificarMensaje("Correos: siga su envío en https://cutt.ly/abc", "sms");
    expect(r.veredicto).toBe("no_determinable");
  });
});

describe("avisos legítimos L01–L04: nunca se confirman solos", () => {
  // Un texto que encaja con un aviso oficial no prueba quién lo envía: el
  // remitente se puede falsificar. Todos salen no_determinable y remiten a la
  // sede tecleando la dirección. Y en ninguno se analiza el dominio citado
  // sin esquema, porque si se analizara saldrían oficial_verificado.
  const casos: { id: string; texto: string; tipo: "sms" | "email"; sede: string }[] = [
    {
      id: "L01",
      texto:
        "AEAT: Tiene una nueva notificación disponible. Puede consultarla accediendo por sus propios medios a la Sede electrónica de la Agencia Tributaria (sede.agenciatributaria.gob.es) o a la DEHú. Este mensaje es solo informativo.",
      tipo: "sms",
      sede: "Agencia Tributaria",
    },
    {
      id: "L02",
      texto:
        "Asunto: Dirección Electrónica Vial – Tiene una nueva notificación. Para consultarla, acceda a la Sede electrónica de la DGT (sede.dgt.gob.es) e identifíquese con DNI electrónico, certificado digital o Cl@ve.",
      tipo: "email",
      sede: "DGT",
    },
    {
      id: "L03",
      // El texto de L03 se lee de datos/ (material de la organización) para no
      // copiar su dirección de correo en el código.
      texto: casosOrganizacion.find((c) => c.id === "L03")!.texto,
      tipo: "email",
      sede: "Correos",
    },
    {
      id: "L04",
      texto:
        "Asunto: DEHú – Aviso de nueva notificación. Puede acceder a ella en dehu.redsara.es identificándose con Cl@ve, certificado o DNIe. Este es un aviso de cortesía.",
      tipo: "email",
      sede: "DEHú",
    },
  ];

  for (const c of casos) {
    test(`${c.id} sale no_determinable y remite a la sede de ${c.sede}`, () => {
      const r = verificarMensaje(c.texto, c.tipo);
      expect(r.veredicto).toBe("no_determinable");
      expect(r.consejo).toContain("tecleando");
      expect(r.enlaces).toHaveLength(0);
      // La duda no acusa: el titular no puede ser «No es oficial».
      expect(r.titular).not.toContain("No es oficial");
    });
  }

  test("L01 no confirma por citar la sede de la AEAT", () => {
    // Regresión exacta: si resolverEnlaces analizara dominios sin esquema,
    // este mensaje saldría oficial_verificado y se rompería la regla de SETUP.
    const r = verificarMensaje(casos[0].texto, "sms");
    expect(r.veredicto).not.toBe("oficial_verificado");
  });
});

describe("regla *.gob.es: reservado, pero no cualquier cosa", () => {
  test("un *.gob.es fuera de la lista se da por oficial con comprobación DNS", () => {
    const r = v("https://tramites-ejemplo.gob.es");
    expect(r.veredicto).toBe("oficial_verificado");
    expect(r.motivo).toBe("regla_gob_es");
    expect(r.requiereDns).toBe(true);
  });

  test("«gob-es» con guiones en un dominio ajeno es fraude", () => {
    const r = v("https://sede-dgt-gob-es[.]click/revisar");
    expect(r.veredicto).toBe("no_oficial");
  });
});
