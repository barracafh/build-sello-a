import type { ReactNode } from "react";

// La cejilla de Varita DS: la línea corta en morado encima de un titular.
export function Cejilla({ children }: { children: ReactNode }) {
  return <p className="text-base font-bold text-(--brand)">{children}</p>;
}

// El icono destacado de Varita DS (featured icon), en morado claro.
export function IconoDestacado({
  children,
  pequeno = false,
}: {
  children: ReactNode;
  pequeno?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#f4ebff] text-(--brand-dark) ${pequeno ? "size-10" : "size-12"}`}
    >
      {children}
    </span>
  );
}
