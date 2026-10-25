import type { NextConfig } from "next";
import ficha from "./ficha.json";

// build.barraca.house sirve cada herramienta de la Build night 003 en
// /punto-atencion-ciudadana/<equipo>. La app vive en esa ruta en todas partes,
// también en local, para que nada se rompa al juntarla.
const basePath = `/punto-atencion-ciudadana/${ficha.equipo}`;

const config: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Adoptado en la actualización de seguridad 16.4.0 → 16.4.2
  // (next upgrade --agent=security).
  experimental: { agentUpgrade: "security" },
};
export default config;
