"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Pestana = { id: string; etiqueta: string; contenido: ReactNode };

// Pestañas accesibles (patrón ARIA tabs) con botones nativos: flechas,
// Inicio y Fin mueven el foco y activan la pestaña.
export function Pestanas({ pestanas }: { pestanas: Pestana[] }) {
  const [activa, setActiva] = useState(pestanas[0].id);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  function teclado(e: KeyboardEvent, i: number) {
    const ultima = pestanas.length - 1;
    const destino = {
      ArrowRight: i === ultima ? 0 : i + 1,
      ArrowLeft: i === 0 ? ultima : i - 1,
      Home: 0,
      End: ultima,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    setActiva(pestanas[destino].id);
    botones.current[destino]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Herramientas"
        className="flex gap-1 border-b"
      >
        {pestanas.map((p, i) => {
          const seleccionada = p.id === activa;
          return (
            <button
              key={p.id}
              ref={(el) => {
                botones.current[i] = el;
              }}
              id={`pestana-${p.id}`}
              type="button"
              role="tab"
              aria-selected={seleccionada}
              aria-controls={`panel-${p.id}`}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => setActiva(p.id)}
              onKeyDown={(e) => teclado(e, i)}
              className={cn(
                "-mb-px min-h-11 rounded-t-lg border-b-2 px-4 text-base font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                seleccionada
                  ? "border-foreground text-foreground"
                  : "border-transparent text-(--text-secondary) hover:text-foreground",
              )}
            >
              {p.etiqueta}
            </button>
          );
        })}
      </div>
      {pestanas.map((p) => (
        <div
          key={p.id}
          id={`panel-${p.id}`}
          role="tabpanel"
          aria-labelledby={`pestana-${p.id}`}
          hidden={p.id !== activa}
          className="pt-12 md:pt-16"
        >
          {p.contenido}
        </div>
      ))}
    </>
  );
}
