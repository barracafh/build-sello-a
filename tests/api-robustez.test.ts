// Robustez de la API: contrato de errores, cabeceras de seguridad, CORS
// cerrado, límite de peticiones y /api/health. Se llama a los handlers
// directamente con Request: sin servidor, sin red y sin guardar nada.
import { beforeEach, describe, expect, test } from "bun:test";
import {
  postVerificar,
  postVerificarMensaje,
  postVerificarUrl,
  respuestaOptions,
  validarEntrada,
  validarTextoMensaje,
  validarTextoUrl,
} from "../src/lib/api";
import { _restablecerLimite, LIMITE_PETICIONES } from "../src/lib/limite";
import { GET as health } from "../src/app/api/health/route";

const peticion = (cuerpo: unknown, ip = "203.0.113.10") =>
  new Request("http://localhost/api/verificar", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });

beforeEach(() => {
  _restablecerLimite();
});

describe("validación de la entrada: {error, codigo} siempre", () => {
  test("JSON corrupto → 400 json_invalido", async () => {
    const res = await postVerificar(peticion("{no soy json"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.codigo).toBe("json_invalido");
    expect(typeof data.error).toBe("string");
  });

  test("cuerpo que no es objeto → 400 json_invalido", async () => {
    const res = await postVerificar(peticion("hola"));
    expect(res.status).toBe(400);
    expect((await res.json()).codigo).toBe("json_invalido");
  });

  test("sin entrada → 422 entrada_requerida", async () => {
    const res = await postVerificar(peticion({ tipo: "url" }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("entrada_requerida");
  });

  test("tipo no reconocido → 422 tipo_no_valido", async () => {
    const res = await postVerificar(peticion({ entrada: "https://example.com", tipo: "fax" }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("tipo_no_valido");
  });

  test("entrada vacía → 422 entrada_vacia", async () => {
    const res = await postVerificar(peticion({ entrada: "   ", tipo: "url" }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("entrada_vacia");
  });

  test("entrada demasiado larga → 422 entrada_demasiado_larga", async () => {
    const res = await postVerificar(
      peticion({ entrada: "a".repeat(2001), tipo: "url" }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("entrada_demasiado_larga");
  });

  test("alias verificar-url: texto no textual y demasiado largo", async () => {
    const largo = await postVerificarUrl(peticion({ texto: "a".repeat(2001) }));
    expect(largo.status).toBe(422);
    expect((await largo.json()).codigo).toBe("entrada_demasiado_larga");

    const vacio = await postVerificarUrl(peticion({}));
    expect(vacio.status).toBe(422);
    expect((await vacio.json()).codigo).toBe("entrada_requerida");
  });

  test("alias verificar-mensaje: tipo inválido → 422", async () => {
    const res = await postVerificarMensaje(peticion({ texto: "hola", tipo: "web" }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("tipo_no_valido");
  });

  test("enlaces mal formados → 422 enlaces_no_validos", async () => {
    const res = await postVerificar(peticion({ enlaces: [{ texto: "solo texto" }] }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("enlaces_no_validos");
  });

  test("lista de enlaces vacía → 422 enlaces_vacios", async () => {
    const res = await postVerificar(peticion({ enlaces: [] }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("enlaces_vacios");
  });

  test("más de 50 enlaces → 422 demasiados_enlaces", async () => {
    const enlaces = Array.from({ length: 51 }, (_, i) => ({ texto: `t${i}`, href: `https://a${i}.com` }));
    const res = await postVerificar(peticion({ enlaces }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("demasiados_enlaces");
  });

  test("una URL que el verificador no puede leer → 422 entrada_no_reconocida", async () => {
    const res = await postVerificar(peticion({ entrada: "esto no es una web", tipo: "url" }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("entrada_no_reconocida");
  });

  test("los validadores no rompen el contrato del front: `error` sigue siendo el mensaje humano", () => {
    const v = validarEntrada({ entrada: "x".repeat(4001), tipo: "sms" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(typeof v.error).toBe("string");
    expect(validarTextoUrl({}).ok).toBe(false);
    expect(validarTextoMensaje({ texto: "hola" }).ok).toBe(true);
  });
});

describe("cabeceras de seguridad y CORS cerrado", () => {
  test("toda respuesta lleva nosniff, no-referrer y no-store", async () => {
    const res = await postVerificar(
      peticion({ entrada: "https://sede.agenciatributaria.gob.es", tipo: "url" }),
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("también en los errores", async () => {
    const res = await postVerificar(peticion("{malo"));
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  test("OPTIONS responde 204 con Allow y sin Access-Control-Allow-Origin", async () => {
    const res = respuestaOptions("POST, OPTIONS");
    expect(res.status).toBe(204);
    expect(res.headers.get("allow")).toBe("POST, OPTIONS");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("límite de peticiones: 429 con Retry-After", () => {
  test("la petición que supera el límite en un minuto bloquea, con Retry-After", async () => {
    const cuerpo = { entrada: "https://bit.ly/abc123", tipo: "url" };
    for (let i = 0; i < LIMITE_PETICIONES; i++) {
      const res = await postVerificar(peticion(cuerpo, "198.51.100.7"));
      expect(res.status).toBe(200);
    }
    const bloqueada = await postVerificar(peticion(cuerpo, "198.51.100.7"));
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers.get("retry-after"))).toBeGreaterThan(0);
    const data = await bloqueada.json();
    expect(data.codigo).toBe("demasiadas_peticiones");
    expect(typeof data.error).toBe("string");
  });

  test("otra IP no se ve afectada por la bloqueada", async () => {
    const cuerpo = { entrada: "https://bit.ly/abc123", tipo: "url" };
    for (let i = 0; i < LIMITE_PETICIONES; i++)
      await postVerificar(peticion(cuerpo, "198.51.100.8"));
    const otra = await postVerificar(peticion(cuerpo, "198.51.100.9"));
    expect(otra.status).toBe(200);
  });
});

describe("GET /api/health", () => {
  test("versión, datos cargados y providers, sin nada del usuario", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.estado).toBe("ok");
    expect(typeof data.version).toBe("string");
    expect(data.datos.versionListaDominios).toBe("2026-10-18");
    expect(data.datos.entidades).toBeGreaterThanOrEqual(25);
    expect(data.datos.dominios).toBeGreaterThan(0);
    expect(data.datos.senalesContenido).toBeGreaterThan(0);
    expect(Array.isArray(data.providers)).toBe(true);
    const dns = data.providers.find((p: { nombre: string }) => p.nombre === "dns_gob_es");
    expect(dns.estado).toBe("operativo");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("enlaces con href inservible: nunca un 500", () => {
  test("un href neutralizado (hxxps://…[.]com) no lanza: se analiza desneutralizado", async () => {
    const res = await postVerificarUrl(
      peticion({ enlaces: [{ texto: "pague aquí", href: "https://aeat-devolucion[.]top" }] }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enlaces).toHaveLength(1);
    expect(data.enlaces[0].resultado.veredicto).toBe("no_oficial");
  });

  test("un href sin esquema válido se salta, y sin enlaces válidos da 422, no 500", async () => {
    const res = await postVerificarUrl(peticion({ enlaces: [{ texto: "x", href: "no-es-una-url" }] }));
    expect(res.status).toBe(422);
    expect((await res.json()).codigo).toBe("enlaces_no_reconocidos");
  });

  test("la detección de enlace enmascarado sigue igual con href bien formado", async () => {
    const res = await postVerificarUrl(
      peticion({ enlaces: [{ texto: "www.agenciatributaria.gob.es", href: "https://multas-pago.com/pago" }] }),
    );
    const data = await res.json();
    expect(data.enlaces[0].resultado.motivo).toBe("enlace_enmascarado");
  });
});
