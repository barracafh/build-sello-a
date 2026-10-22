// Las páginas del menú y del pie. Las rutas van sin la del equipo: <Link> la añade.
export const PAGINAS = [
  { href: "/como-funciona", texto: "Cómo funciona" },
  { href: "/por-que-varita", texto: "Por qué Varita" },
  { href: "/timos-reales", texto: "Timos reales" },
] as const;

export const AYUDA_INCIBE = [
  {
    href: "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad",
    texto: "Línea 017 de INCIBE",
  },
  { href: "https://www.incibe.es/ciudadania/avisos", texto: "Avisos de INCIBE" },
] as const;
