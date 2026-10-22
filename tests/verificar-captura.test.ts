// Tests de la ruta /api/verificar-captura (src/app/api/verificar-captura/route.ts):
// la transcripción de la captura sale de la IA, así que completar() va SIEMPRE
// mockeada: en tests no se llama nunca a HelmCode de verdad.
import { describe, expect, mock, test } from "bun:test";

// Lo que respondería HelmCode: cada test lo cambia antes de llamar a la ruta.
let respuestaIA = "";
mock.module("../src/lib/ia", () => ({
  completar: async () => respuestaIA,
}));

const { POST } = await import("../src/app/api/verificar-captura/route");

const peticion = (image: unknown) =>
  POST(new Request("http://localhost/api/verificar-captura", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image }),
  }));

const IMAGEN = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const SMS_FRAUDE = "DGT: Dispone de 24 horas para pagar su multa. Entra en hxxps://dgt-multas-pago[.]com/expediente";

describe("validación de la imagen", () => {
  test("rechaza lo que no es una imagen en data URL", async () => {
    const res = await peticion("hola");
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("PNG, JPG o WebP");
  });

  test("rechaza un MIME que no es imagen", async () => {
    const res = await peticion("data:application/pdf;base64,AAA=");
    expect(res.status).toBe(400);
  });

  test("rechaza un cuerpo que no es JSON", async () => {
    const res = await POST(new Request("http://localhost/api/verificar-captura", {
      method: "POST",
      body: "no es json",
    }));
    expect(res.status).toBe(400);
  });

  test("rechaza una imagen demasiado grande (más de 4 MB)", async () => {
    const res = await peticion(`data:image/jpeg;base64,${"A".repeat(4_200_000)}`);
    expect(res.status).toBe(400);
  });
});

describe("transcripción y veredicto", () => {
  test("devuelve el veredicto de las reglas y la transcripción", async () => {
    respuestaIA = `[TIPO:sms]\n${SMS_FRAUDE}`;
    const res = await peticion(IMAGEN);
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    // El veredicto lo decide el verificador determinista, no la IA.
    expect(cuerpo.veredicto).toBe("no_oficial");
    expect(cuerpo.titular).toBe("No es oficial: es un fraude");
    expect(cuerpo.entidad).toBe("Dirección General de Tráfico (DGT)");
    expect(cuerpo.transcripcion).toBe(SMS_FRAUDE);
    expect(cuerpo.tipo).toBe("sms");
  });

  test("el prefijo [TIPO:email] marca el correo", async () => {
    respuestaIA =
      "[TIPO:email]\nDe: noreply@aeat.es\nAsunto: Devolución pendiente\nConsulte hxxps://agenciatributaria-devolucion[.]top/renta2023";
    const res = await peticion(IMAGEN);
    const cuerpo = await res.json();
    expect(cuerpo.tipo).toBe("email");
    expect(cuerpo.veredicto).toBe("no_oficial");
  });

  test("sin prefijo, unas reglas simples deducen el tipo", async () => {
    respuestaIA = "Asunto: Tu paquete está en aduana\nAbra el enlace adjunto";
    const res = await peticion(IMAGEN);
    const cuerpo = await res.json();
    expect(cuerpo.tipo).toBe("email");
  });

  test("sin pref ni señales de correo, sale sms", async () => {
    respuestaIA = "Correos: su envío espera en la oficina. hxxps://correos-aduanas-pago[.]com/envio";
    const res = await peticion(IMAGEN);
    const cuerpo = await res.json();
    expect(cuerpo.tipo).toBe("sms");
  });

  test("la transcripción se trunca a los 4.000 caracteres del verificador", async () => {
    respuestaIA = `[TIPO:sms]\n${"a".repeat(5_000)}`;
    const res = await peticion(IMAGEN);
    const cuerpo = await res.json();
    expect(cuerpo.transcripcion.length).toBe(4000);
  });
});

describe("fallos de la IA", () => {
  test("[SIN TEXTO] sale 422 con mensaje claro", async () => {
    respuestaIA = "[SIN TEXTO]";
    const res = await peticion(IMAGEN);
    expect(res.status).toBe(422);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("No veo texto legible");
  });

  test("si HelmCode falla, sale 502 invitando al formulario manual", async () => {
    // Reemplazamos el módulo mockeado: esta vez completar lanza.
    mock.module("../src/lib/ia", () => ({
      completar: async () => {
        throw new Error("HelmCode respondió 500");
      },
    }));
    const ruta = await import("../src/app/api/verificar-captura/route");
    const res = await ruta.POST(new Request("http://localhost/api/verificar-captura", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: IMAGEN }),
    }));
    expect(res.status).toBe(502);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("pega el texto a mano");
    // Se restaura el mock normal para los demás tests.
    mock.module("../src/lib/ia", () => ({ completar: async () => respuestaIA }));
  });
});
