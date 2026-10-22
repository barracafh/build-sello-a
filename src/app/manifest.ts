import type { MetadataRoute } from "next";
import ficha from "../../ficha.json";

// Igual que next.config.ts: la app vive bajo /<equipo>, también en el manifest.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? `/${ficha.equipo}`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ficha.nombre,
    short_name: "Varita",
    description: ficha.frase,
    lang: "es",
    // Sin barra final: el alojamiento sirve la app en /<equipo> y /<equipo>/
    // responde 404, así que la app instalada abriría en un 404. El scope sin
    // barra también cubre /<equipo>/… porque la coincidencia es por prefijo.
    start_url: `${base}`,
    scope: `${base}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png" },
      {
        src: `${base}/icon-maskable-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${base}/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Android: «Compartir → Sello» desde la app de mensajería. Chrome envía
    // el SMS por POST con codificación de formulario al campo "text" (y
    // "title" si viene). Sin service worker: Chrome ya no lo exige para
    // considerar la app instalable (desde Chrome 89), y así garantizamos
    // que no se cache nada de lo que envía el ciudadano.
    share_target: {
      action: `${base}/api/compartir`,
      method: "POST",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
