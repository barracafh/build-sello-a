import { PROVIDERS } from "../../../lib/providers";
import { respuestaJson, respuestaOptions } from "../../../lib/api";
import { LISTA_DOMINIOS } from "../../../lib/verificar-url";
import { NUM_SENALES } from "../../../lib/resolver";
import pkg from "../../../../package.json";

// GET /api/health: ¿está vivo el servicio y con qué datos trabaja? Solo datos
// operativos del despliegue: nunca hay nada de lo que envía el ciudadano.
//
//   · version  — versión del paquete (package.json).
//   · commit   — SHA del despliegue en Vercel, si la plataforma lo inyecta.
//   · datos    — versión de la allowlist, cuántas entidades, dominios y
//                señales de contenido tiene cargadas la instancia.
//   · providers — estado de cada pieza que puede fallar por su cuenta
//                (src/lib/providers.ts). dns_gob_es sale «degradado» durante
//                un rato cuando su consulta DNS ha expirado o ha fallado.
export async function GET() {
  const entidades = LISTA_DOMINIOS.entidades;
  const dominios = entidades.reduce((n, e) => n + e.dominios.length, 0);
  return respuestaJson({
    estado: "ok",
    version: pkg.version,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    datos: {
      versionListaDominios: LISTA_DOMINIOS.version,
      entidades: entidades.length,
      dominios,
      senalesContenido: NUM_SENALES,
    },
    providers: PROVIDERS.map((p) => ({
      nombre: p.nombre,
      opcional: p.opcional,
      estado: p.estado(),
    })),
  });
}

// CORS cerrado: solo se consume desde la propia herramienta (mismo origen).
export async function OPTIONS() {
  return respuestaOptions("GET, OPTIONS");
}
