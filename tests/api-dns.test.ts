// La consulta DNS de la regla *.gob.es con techo de tiempo: si expira o
// falla, el veredicto se degrada a no_determinable con un motivo claro y la
// petición no se cuelga ni lanza 500. La consulta es un mock: no hay red.
import { describe, expect, test } from "bun:test";
import { ajustesDns, verificar } from "../src/lib/verificar";
import { _restablecerDns, PROVIDERS } from "../src/lib/providers";

// Host que NO está en la allowlist y termina en .gob.es: pasa por la regla
// reservada y exige consulta DNS (verificar-url.ts, paso 8).
const URL_REGLA = "https://instituto-ejemplo.gob.es";

const veredicto = async () => {
  const { status, cuerpo } = await verificar(URL_REGLA, "url");
  return { status, ...(cuerpo as { veredicto: string; motivo: string }) };
};

describe("consulta DNS con AbortSignal.timeout", () => {
  test("si el DNS responde que el host no existe, sale gob_es_inexistente", async () => {
    ajustesDns.consulta = () => Promise.reject(Object.assign(new Error("nx"), { code: "ENOTFOUND" }));
    const r = await veredicto();
    expect(r.status).toBe(200);
    expect(r.veredicto).toBe("no_determinable");
    expect(r.motivo).toBe("gob_es_inexistente");
  });

  test("si la consulta se cuelga, expira en ~2 s y degrada a gob_es_dns_no_confirmado", async () => {
    ajustesDns.timeoutMs = 30; // el techo real es 2.000 ms; aquí no queremos esperar
    ajustesDns.consulta = () => new Promise(() => {}); // nunca responde
    const r = await veredicto();
    expect(r.status).toBe(200);
    expect(r.veredicto).toBe("no_determinable");
    expect(r.motivo).toBe("gob_es_dns_no_confirmado");
    expect(r.motivo).not.toBe("gob_es_inexistente");
  });

  test("un error de red también degrada, sin fingir que el host no existe", async () => {
    ajustesDns.consulta = () => Promise.reject(new Error("ECONNREFUSED"));
    const r = await veredicto();
    expect(r.motivo).toBe("gob_es_dns_no_confirmado");
  });

  test("si el DNS responde bien, el veredicto se mantiene", async () => {
    ajustesDns.consulta = () => Promise.resolve([]);
    const r = await veredicto();
    expect(r.status).toBe(200);
    expect(r.veredicto).toBe("oficial_verificado");
    expect(r.motivo).toBe("regla_gob_es");
  });

  test("tras un fallo, el provider dns_gob_es sale degradado en la health", async () => {
    ajustesDns.consulta = () => Promise.reject(new Error("cortado"));
    await veredicto();
    const dns = PROVIDERS.find((p) => p.nombre === "dns_gob_es");
    expect(dns?.estado()).toBe("degradado");
    _restablecerDns();
    expect(dns?.estado()).toBe("operativo");
  });
});
