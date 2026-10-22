import type { Metadata } from "next";
import { Cabecera } from "@/components/Cabecera";
import { PieVarita } from "@/components/PieVarita";
import { Compartir } from "@/components/Compartir";
import { AyudaCompartirIos } from "@/components/InstalarSello";
import ficha from "../../../ficha.json";

export const metadata: Metadata = {
  title: `Compartir con ${ficha.nombre}`,
  // El texto compartido no es para buscadores ni se guarda en ninguna parte.
  robots: { index: false, follow: false },
};

const MAX = 4000;

// Aterriza el «Compartir → Sello» de Android (share_target del manifest) y
// los enlaces manuales /compartir?text=…. El chat comprueba el mensaje
// automáticamente; sin texto, cae amablemente a su formulario normal.
export default async function PaginaCompartir({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; title?: string }>;
}) {
  const { text, title } = await searchParams;
  const textoGet = (text?.trim() || title?.trim() || "").slice(0, MAX);

  return (
    <>
      <Cabecera />
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[760px] px-(--page-gutter) pt-10 pb-20 outline-none md:pt-14"
      >
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          {ficha.frase}
        </p>
        <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
          ¿Ese mensaje es oficial de verdad?
        </h1>
        <p className="mt-6 text-lg text-(--text-secondary)">
          {textoGet ? (
            "Estamos comprobando lo que has compartido. El resultado aparece aquí abajo en unos segundos."
          ) : (
            "Comparte un SMS o un correo sospechoso con Sello desde la app de mensajería (Compartir → Sello), o pégalo aquí abajo."
          )}
        </p>

        <div className="mt-12">
          <Compartir textoGet={textoGet} />
        </div>

        <AyudaCompartirIos />
      </main>

      <PieVarita />
    </>
  );
}
