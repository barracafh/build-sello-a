import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";
import { Cabecera } from "@/components/Cabecera";
import { Cejilla, IconoDestacado } from "@/components/Cejilla";
import { ComprobarAhora } from "@/components/ComprobarAhora";
import { Fuentes } from "@/components/Fuentes";
import { ComoFuncionaVarita } from "@/components/PasosVarita";
import { PieVarita } from "@/components/PieVarita";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cómo funciona · Varita",
  description:
    "Varita no adivina. Compara el enlace con la lista de webs oficiales y te enseña lo que de verdad pone.",
};

const RESPUESTAS = [
  {
    etiqueta: "Es la web oficial",
    texto: "El dominio está en la lista.",
    color: "bg-[#ecfdf3] text-[#067647] ring-[#abefc6]",
  },
  {
    etiqueta: "No es oficial",
    texto: "Dice ser de un organismo y el enlace no es suyo.",
    color: "bg-[#fef3f2] text-[#b42318] ring-[#fecdca]",
  },
  {
    etiqueta: "No podemos confirmarlo",
    texto:
      "No hay pruebas suficientes. Entra tú por la web oficial. Es una respuesta honesta, no un fallo.",
    color: "bg-[#fffaeb] text-[#b54708] ring-[#fedf89]",
  },
];

const FUENTES = [
  {
    nombre: "INCIBE · Línea de ayuda en ciberseguridad (017)",
    url: "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad",
  },
  {
    nombre: "INCIBE · Avisos de seguridad para la ciudadanía",
    url: "https://www.incibe.es/ciudadania/avisos",
  },
  {
    nombre: "Red.es · Carta de servicios de dominios .es (.gob.es)",
    url: "https://www.dominios.es/sites/dominios/files/2026-04/carta-de-servicio-dominios-26-29.pdf",
  },
];

const tarjeta = "rounded-2xl bg-[#fafafa] p-6 ring-1 ring-foreground/5 md:p-8";
const lista = "mt-4 space-y-3 text-base text-(--text-secondary)";

export default function ComoFunciona() {
  return (
    <>
      <Cabecera />

      <main id="contenido" tabIndex={-1} className="outline-none">
        <section className="mx-auto max-w-(--container-content) px-(--page-gutter) pt-10 md:pt-16">
          <div className="max-w-[760px]">
            <Cejilla>Cómo funciona</Cejilla>
            <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
              No es magia.
            </h1>
            <p className="mt-6 text-lg text-(--text-secondary)">
              Varita no adivina. Compara el enlace con la lista de webs
              oficiales y te enseña lo que de verdad pone.
            </p>
          </div>
        </section>

        <ComoFuncionaVarita />

        <section
          aria-label="Qué miramos, qué no hacemos y qué significa cada respuesta"
          className="mx-auto grid max-w-(--container-content) gap-6 px-(--page-gutter) pb-16 lg:grid-cols-3"
        >
          <div className={tarjeta}>
            <h2 className="text-2xl">Qué miramos</h2>
            <ul className={lista}>
              <li>
                Una lista de 25 organismos con sus dominios oficiales, cada uno
                con la página que lo respalda.
              </li>
              <li>
                La regla .gob.es: ese dominio está reservado a las
                Administraciones Públicas españolas (Orden ITC/1542/2005).
              </li>
              <li>
                Las señales de fraude que publica INCIBE: prisa, pagos por
                enlace, datos de tarjeta.
              </li>
            </ul>
          </div>

          <div className={tarjeta}>
            <h2 className="text-2xl">Qué no hacemos</h2>
            <ul className={lista}>
              <li>No abrimos ni visitamos el enlace.</li>
              <li>No seguimos redirecciones ni desplegamos acortadores.</li>
              <li>No guardamos lo que pegas.</li>
            </ul>
          </div>

          <div className={tarjeta}>
            <h2 className="text-2xl">Qué significa cada respuesta</h2>
            <ul className="mt-4 space-y-4">
              {RESPUESTAS.map((r) => (
                <li key={r.etiqueta}>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset ${r.color}`}
                  >
                    {r.etiqueta}
                  </span>
                  <p className="mt-1.5 text-base text-(--text-secondary)">
                    {r.texto}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="ayuda-017"
          className="mx-auto max-w-(--container-content) px-(--page-gutter) pb-16"
        >
          <div className="flex flex-col gap-6 rounded-[28px] bg-[#fafafa] p-6 md:flex-row md:items-center md:p-10">
            <IconoDestacado>
              <PhoneCall className="size-6" />
            </IconoDestacado>
            <div className="flex-1">
              <h2
                id="ayuda-017"
                className="text-[clamp(22px,2.4vw,28px)] leading-[1.2]"
              >
                ¿Tienes dudas o crees que te han timado?
              </h2>
              <p className="mt-2 max-w-[70ch] text-base text-(--text-secondary)">
                Llama al 017 de INCIBE. Es gratuito y confidencial, de 8:00 a
                23:00 todos los días. También por WhatsApp en el 900 116 117 y
                por Telegram en @INCIBE017.
              </p>
            </div>
            <a
              href="https://www.incibe.es/linea-de-ayuda-en-ciberseguridad"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Línea de ayuda de INCIBE
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

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
