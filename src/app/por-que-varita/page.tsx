import type { Metadata } from "next";
import { Cabecera } from "@/components/Cabecera";
import { ComprobarAhora } from "@/components/ComprobarAhora";
import { Fuentes } from "@/components/Fuentes";
import { PieVarita } from "@/components/PieVarita";
import { PorQueVarita } from "@/components/PorQueVarita";

export const metadata: Metadata = {
  title: "Por qué Varita",
  description:
    "Los timos copian el logo. La dirección, no. Varita mira la dirección de la web y te lo cuenta en lenguaje claro.",
};

const FUENTES = [
  {
    nombre: "INCIBE · Avisos de seguridad para la ciudadanía",
    url: "https://www.incibe.es/ciudadania/avisos",
  },
  {
    nombre: "INCIBE · Línea de ayuda en ciberseguridad (017)",
    url: "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad",
  },
];

export default function PorQue() {
  return (
    <>
      <Cabecera />

      <main id="contenido" tabIndex={-1} className="outline-none">
        <PorQueVarita comoPagina />

        <section className="mx-auto max-w-(--container-content) px-(--page-gutter) pb-16">
          <div className="max-w-[760px]">
            <Fuentes fuentes={FUENTES} />
          </div>
        </section>

        <ComprobarAhora />
      </main>

      <PieVarita />
    </>
  );
}
