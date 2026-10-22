import Link from "next/link";
import { BotonAviso } from "@/components/BotonAviso";
import { AYUDA_INCIBE, PAGINAS } from "@/config/navegacion";
import { ruta } from "@/config/sitio";
import ficha from "../../ficha.json";

const enlace =
  "inline-flex min-h-11 items-center rounded-md text-[15px] text-(--text-secondary) underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

// El pie de Varita, sin redes sociales.
export function PieVarita() {
  return (
    <footer className="p-2">
      <div className="rounded-[28px] bg-[#f9f5ff] px-(--page-gutter) pt-12 pb-8 md:px-12">
        <div className="mx-auto grid max-w-(--container-content) gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ruta("/logo-varita.svg")}
              alt={ficha.nombre}
              width={128}
              height={46}
              className="h-10 w-auto"
            />
            <p className="mt-4 max-w-[34ch] text-[15px] text-(--text-secondary)">
              Comprueba antes de confiar. Herramienta experimental: no es un
              servicio oficial.
            </p>
          </div>

          <nav aria-labelledby="pie-varita">
            <h2 id="pie-varita" className="font-sans text-sm font-semibold">
              Varita
            </h2>
            <ul className="mt-2">
              {PAGINAS.map((pagina) => (
                <li key={pagina.href}>
                  <Link href={pagina.href} className={enlace}>
                    {pagina.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-sans text-sm font-semibold">Ayuda</h2>
            <ul className="mt-2">
              {AYUDA_INCIBE.map((ayuda) => (
                <li key={ayuda.href}>
                  <a href={ayuda.href} className={enlace}>
                    {ayuda.texto}
                    <span aria-hidden="true" className="ml-1">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-sans text-sm font-semibold">Aviso</h2>
            <ul className="mt-2 space-y-2 py-2.5 text-[15px] text-(--text-secondary)">
              <li>No es un servicio oficial</li>
              <li>No guardamos lo que pegas</li>
            </ul>
            <div className="mt-4">
              <BotonAviso />
            </div>
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-(--container-content) border-t border-[#e9d7fe] pt-6 text-sm text-(--text-secondary)">
          © 2026 Varita · Build night BARRACA x SOTI · València
        </p>
      </div>
    </footer>
  );
}
