"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAGINAS } from "@/config/navegacion";

// Menú de la cabecera: los textos son los de las cejillas de cada página.
export function NavPrincipal() {
  const actual = usePathname();

  return (
    <nav aria-label="Principal">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
        {PAGINAS.map((pagina) => (
          <li key={pagina.href}>
            <Link
              href={pagina.href}
              aria-current={actual === pagina.href ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold sm:text-[15px] text-(--text-secondary) transition-colors outline-none hover:text-(--brand-dark) focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:text-(--brand-dark)"
            >
              {pagina.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
