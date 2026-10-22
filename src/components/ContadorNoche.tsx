"use client";

import { useEffect, useState } from "react";
import { ruta } from "@/config/sitio";

// Línea discreta del pie: «N comprobaciones esta noche». Solo aparece con
// datos. La cifra es agregada y volátil (src/lib/estadisticas.ts): se pide
// al montar, sin caché, y si la API no responde la línea simplemente no se
// pinta. Nada de la entrada del usuario vuelve jamás por aquí.
export function ContadorNoche() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    fetch(ruta("/api/stats"), { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((datos: { total?: unknown } | null) => {
        if (datos && typeof datos.total === "number" && Number.isFinite(datos.total))
          setTotal(datos.total);
      })
      .catch(() => {});
  }, []);

  if (total === null || total <= 0) return null;

  return (
    <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
      {total.toLocaleString("es-ES")}{" "}
      {total === 1 ? "comprobación" : "comprobaciones"} esta noche
    </p>
  );
}
