import { ExternalLink, Eye, PhoneCall, ShieldCheck } from "lucide-react";
import { Cejilla, IconoDestacado } from "@/components/Cejilla";
import { ruta } from "@/config/sitio";

const VENTAJAS = [
  {
    icono: Eye,
    titulo: "Te enseña el truco",
    texto:
      "Ves lo que de verdad pone el enlace, con el dominio real resaltado. Así aprendes a detectarlo tú.",
  },
  {
    icono: ShieldCheck,
    titulo: "Sin riesgos",
    texto:
      "No abrimos el enlace, no seguimos sus redirecciones y no guardamos lo que pegas.",
  },
  {
    icono: ExternalLink,
    titulo: "Siempre con la web buena",
    texto:
      "Salga lo que salga, te damos la dirección oficial del organismo para que entres tú.",
  },
  {
    icono: PhoneCall,
    titulo: "Ayuda si ya has pinchado",
    texto:
      "Te llevamos al 017 de INCIBE: gratis y confidencial, de 8:00 a 23:00 todos los días.",
  },
];

// Bloque «Por qué Varita». En su propia página el titular es el h1.
export function PorQueVarita({ comoPagina = false }: { comoPagina?: boolean }) {
  const Titulo = comoPagina ? "h1" : "h2";

  return (
    <section aria-labelledby="por-que-varita" className="bg-[#fafafa]">
      <div className="mx-auto max-w-(--container-content) px-(--page-gutter) py-16 md:py-20">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_290px] lg:gap-20">
        <div>
          <Cejilla>Por qué Varita</Cejilla>
          <Titulo
            id="por-que-varita"
            className="mt-4 text-[clamp(32px,4vw,48px)] leading-[1.1] tracking-[-0.02em]"
          >
            Los timos copian el logo. La dirección, no.
          </Titulo>
          <div className="mt-6 max-w-[60ch] space-y-4 text-lg text-(--text-secondary)">
            <p>
              Los mensajes falsos de la DGT, Hacienda o Correos están cada vez
              mejor hechos: mismo tono, mismas prisas, mismo logo.
            </p>
            <p>
              Lo único que no pueden copiar es la dirección de la web oficial.
              Varita mira justo eso y te lo cuenta en lenguaje claro.
            </p>
            <p>
              Y cuando no podemos comprobarlo, te lo decimos. Nunca te diremos
              «oficial» de algo que no lo es.
            </p>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ruta("/varita-senor.jpg")}
          alt=""
          width={290}
          height={477}
          loading="lazy"
          className="mx-auto h-auto w-full max-w-[290px] rounded-3xl"
        />
      </div>

      <ul className="mt-14 grid gap-x-10 gap-y-10 rounded-3xl bg-white p-6 sm:grid-cols-2 md:p-10 lg:grid-cols-4">
        {VENTAJAS.map(({ icono: Icono, titulo, texto }) => (
          <li key={titulo}>
            <IconoDestacado>
              <Icono className="size-6" />
            </IconoDestacado>
            <h3 className="mt-5 text-lg font-bold">{titulo}</h3>
            <p className="mt-2 text-base text-(--text-secondary)">{texto}</p>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
