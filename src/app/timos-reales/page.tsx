import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Cabecera } from "@/components/Cabecera";
import { Cejilla } from "@/components/Cejilla";
import { ComprobarAhora } from "@/components/ComprobarAhora";
import { Fuentes } from "@/components/Fuentes";
import { PieVarita } from "@/components/PieVarita";
import mensajes from "../../../datos/mensajes-ejemplo.json";

export const metadata: Metadata = {
  title: "Timos reales · Varita",
  description:
    "Cinco mensajes que han circulado de verdad, avisados por INCIBE. Así se reconocen y esta es la web buena de cada uno.",
};

// El aviso de INCIBE y la web oficial salen de datos/mensajes-ejemplo.json.
const fuenteDe = (id: string) => {
  const m = mensajes.find((x) => x.id === id);
  return { aviso: m?.fuente ?? "", web: m?.web_oficial_correcta ?? "" };
};

const CASOS = [
  {
    id: "F01",
    organismo: "Agencia Tributaria",
    meta: "SMS · aviso de INCIBE del 08/04/2024",
    dice: "AGENCIA TRIBUTARIA: Se ha ordenado el pago 411,00¿ de su devolucion del IRPF de la renta 2023. mas informacion en la web:",
    truco:
      "Promete una devolución y lleva a una web que imita a Hacienda para pedirte la tarjeta, el CVV y el PIN. La Agencia Tributaria nunca pide datos de tarjeta por SMS.",
    dominio: "sede.agenciatributaria.gob.es",
  },
  {
    id: "F02",
    organismo: "DGT",
    meta: "SMS · aviso de INCIBE del 20/06/2024",
    dice: "DGT: Dispone de 24 horas restantes para pagar su multa del 13/06/2024. Consulte en el siguiente enlace:",
    truco:
      "Mete prisa con un plazo de 24 horas. La DGT notifica las multas por carta certificada o en la DEV, nunca con un enlace de pago en un SMS.",
    dominio: "sede.dgt.gob.es",
  },
  {
    id: "F03",
    organismo: "Correos",
    meta: "SMS · aviso de INCIBE del 22/11/2022",
    dice: "[CORREOS] Estimado cliente: Su paquete no se ha podido entregar el aa/mm porque no se han pagado las tasas de aduana X,XX€: Siga las instrucciones: [URL fraudulenta]",
    truco:
      "Pide pagar una pequeña cantidad de aduanas en un enlace que lleva «correos» en el nombre. Correos nunca pide pagos ni datos bancarios por SMS o email.",
    dominio: "www.correos.es",
  },
  {
    id: "F04",
    organismo: "Seguridad Social",
    meta: "SMS · aviso de INCIBE del 20/12/2022",
    dice: "SEGURIDAD SOCIAL: Su tarjeta sanitària requiere una actualización. Por favor actualícelo a través del sitio seguro para mantener sus servicios: [URL maliciosa]",
    truco:
      "Amenaza con que pierdas servicios si no «actualizas» tus datos en un enlace. La Seguridad Social no pide actualizar datos ni pagar deudas por SMS.",
    dominio: "sede.seg-social.gob.es",
  },
  {
    id: "F05",
    organismo: "DGT",
    meta: "Email · aviso de INCIBE del 28/09/2026",
    dice: "Asunto: Ultimo recordatorio antes del recargo de su multa – Expediente n,º XXXXXXX",
    truco:
      "Un correo con un botón para «revisar el expediente». La DGT nunca notifica las multas por correo electrónico y el remitente no es de su dominio.",
    dominio: "sede.dgt.gob.es",
  },
].map((caso) => ({ ...caso, ...fuenteDe(caso.id) }));

const FUENTES = CASOS.map((caso) => ({
  nombre: `INCIBE · ${caso.organismo} (${caso.meta.split("del ")[1]})`,
  url: caso.aviso,
}));

export default function TimosReales() {
  return (
    <>
      <Cabecera />

      <main id="contenido" tabIndex={-1} className="outline-none">
        <section className="mx-auto max-w-(--container-content) px-(--page-gutter) pt-10 pb-12 md:pt-16">
          <div className="max-w-[760px]">
            <Cejilla>Timos reales avisados por INCIBE</Cejilla>
            <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
              Los trucos más comunes
            </h1>
            <p className="mt-6 text-lg text-(--text-secondary)">
              Cinco mensajes que han circulado de verdad. Así se reconocen y
              esta es la web buena de cada uno.
            </p>
          </div>
        </section>

        <section
          aria-label="Casos"
          className="mx-auto max-w-(--container-content) px-(--page-gutter) pb-16"
        >
          <ul className="grid gap-6 lg:grid-cols-2">
            {CASOS.map((caso) => (
              <li
                key={caso.id}
                className="flex flex-col rounded-2xl p-6 ring-1 ring-foreground/10 md:p-8"
              >
                <article aria-labelledby={`caso-${caso.id}`} className="flex flex-1 flex-col">
                  <h2
                    id={`caso-${caso.id}`}
                    className="text-2xl leading-[1.2]"
                  >
                    {caso.organismo}
                  </h2>
                  <p className="mt-1 font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                    {caso.meta}
                  </p>

                  <h3 className="mt-6 text-sm font-semibold">Lo que dice</h3>
                  <blockquote className="mt-2 rounded-2xl rounded-tl-sm bg-[#fafafa] px-4 py-3 text-base [overflow-wrap:anywhere] ring-1 ring-foreground/5">
                    {caso.dice}
                  </blockquote>

                  <h3 className="mt-6 text-sm font-semibold">El truco</h3>
                  <p className="mt-2 text-base text-(--text-secondary)">
                    {caso.truco}
                  </p>

                  <div className="mt-auto pt-6">
                    <h3 className="text-sm font-semibold">La web de verdad</h3>
                    <a
                      href={caso.web}
                      className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ecfdf3] px-4 font-mono text-sm font-semibold text-[#067647] ring-1 ring-[#abefc6] outline-none ring-inset hover:bg-[#dcfae6] focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <ShieldCheck aria-hidden="true" className="size-4" />
                      {caso.dominio}
                    </a>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-(--container-content) px-(--page-gutter) pb-16">
          <div className="max-w-[760px]">
            <h2 className="text-[clamp(26px,3vw,36px)] leading-[1.15] tracking-[-0.02em]">
              ¿Te ha llegado algo parecido?
            </h2>
            <p className="mt-3 text-lg text-(--text-secondary)">
              Pégalo en Varita antes de pinchar y te decimos cuál es la web
              buena.
            </p>
            <div className="mt-10">
              <Fuentes fuentes={FUENTES} />
            </div>
          </div>
        </section>

        <ComprobarAhora />
      </main>

      <PieVarita />
    </>
  );
}
