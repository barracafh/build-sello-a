import type { ReactNode } from "react";

// La cejilla de Varita DS (badge group): la etiqueta corta encima de un titular.
export function Cejilla({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex rounded-full bg-[#f9f5ff] px-3 py-1 text-sm font-medium text-(--brand-dark) ring-1 ring-[#e9d7fe] ring-inset">
      {children}
    </p>
  );
}

// El icono destacado de Varita DS (featured icon), en morado claro.
export function IconoDestacado({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f4ebff] text-(--brand-dark) ring-8 ring-[#f9f5ff]"
    >
      {children}
    </span>
  );
}
