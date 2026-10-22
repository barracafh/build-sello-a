"use client";

import { useEffect, useState } from "react";
import { ruta } from "@/config/sitio";

// Línea discreta del pie: «N fraudes detectados esta noche» (y si aún no
// hay ninguno pero sí comprobaciones, «N comprobaciones»). Solo aparece con
// datos. La cifra es agregada y volátil (src/lib/estadisticas.ts): se pide
// al montar, sin caché, y si la API no responde la línea simplemente no se
// pinta. Nada de la entrada del usuario vuelve jamás por aquí.
export function ContadorNoche() {
  const [cifra, setCifra] = useState<{ total: number; noOficial: number } | null>(
    null,
  );

  useEffect(() => {
    fetch(ruta("/api/stats"), { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          datos: {
            total?: unknown;
            por_veredicto?: { no_oficial?: unknown };
          } | null,
        ) => {
          if (!datos || typeof datos.total !== "number") return;
          const noOficial = datos.por_veredicto?.no_oficial;
          setCifra({
            total: datos.total,
            noOficial:
              typeof noOficial === "number" && Number.isFinite(noOficial)
                ? noOficial
                : 0,
          });
        },
      )
      .catch(() => {});
  }, []);

  if (cifra === null || cifra.total <= 0) return null;

  const esFraude = cifra.noOficial > 0;
  const n = esFraude ? cifra.noOficial : cifra.total;

  return (
    <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
      {n.toLocaleString("es-ES")}{" "}
      {esFraude
        ? n === 1
          ? "fraude detectado esta noche"
          : "fraudes detectados esta noche"
        : n === 1
          ? "comprobación esta noche"
          : "comprobaciones esta noche"}
    </p>
  );
}
