import Link from "next/link";
import { WandSparkles } from "lucide-react";

const boton =
  "inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-base font-semibold text-(--brand-dark) transition-colors outline-none hover:bg-[#f9f5ff] focus-visible:ring-3 focus-visible:ring-white/60";

// Prefooter: lleva al verificador de la portada.
export function ComprobarAhora({ enPortada = false }: { enPortada?: boolean }) {
  const contenido = (
    <>
      <WandSparkles aria-hidden="true" className="size-5" />
      Pasar la varita
    </>
  );

  return (
    <section
      aria-labelledby="comprobar-ahora"
      className="mx-auto max-w-(--container-content) px-(--page-gutter) pb-16"
    >
      <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-(--brand) px-6 py-10 text-white md:flex-row md:items-center md:px-12">
        <div>
          <h2
            id="comprobar-ahora"
            className="text-[clamp(26px,3vw,36px)] leading-[1.15] tracking-[-0.02em]"
          >
            Comprueba un mensaje o una URL
          </h2>
          <p className="mt-3 text-lg">
            Pega lo que te ha llegado y pasa la varita antes de pinchar.
          </p>
        </div>
        {enPortada ? (
          <a href="#comprobar" className={boton}>
            {contenido}
          </a>
        ) : (
          <Link href="/#comprobar" className={boton}>
            {contenido}
          </Link>
        )}
      </div>
    </section>
  );
}
