import Link from "next/link";
import { NavPrincipal } from "@/components/NavPrincipal";
import { ruta } from "@/config/sitio";
import ficha from "../../ficha.json";

export function Cabecera() {
  return (
    <header className="mx-auto flex min-h-20 max-w-(--container-content) flex-wrap items-center justify-between gap-x-8 gap-y-2 px-(--page-gutter) py-4">
      <Link
        href="/"
        className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ruta("/logo-varita.svg")}
          alt={`${ficha.nombre}: inicio`}
          width={128}
          height={46}
          className="h-10 w-auto"
        />
      </Link>
      <NavPrincipal />
    </header>
  );
}
