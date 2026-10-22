import { Copy, ExternalLink, Eye, WandSparkles } from "lucide-react";
import { Cejilla, IconoDestacado } from "@/components/Cejilla";

const PASOS = [
  {
    icono: Copy,
    titulo: "Copia el mensaje",
    texto: "El SMS, el correo, el WhatsApp o solo el enlace que te ha llegado.",
  },
  {
    icono: WandSparkles,
    titulo: "Pégalo y pasa la varita",
    texto: "Lo analizamos sin abrir el enlace y sin guardar nada.",
  },
  {
    icono: Eye,
    titulo: "Mira lo que de verdad pone",
    texto: "Te enseñamos el dominio real y si es de quien dice ser.",
  },
  {
    icono: ExternalLink,
    titulo: "Entra a la buena",
    texto:
      "Te damos la web oficial. Y si es un timo, el 017 de INCIBE para pedir ayuda.",
  },
];

// Bloque «¿Cómo funciona Varita?» del diseño: la entradilla a la izquierda y
// los cuatro pasos en línea vertical a la derecha.
export function ComoFuncionaVarita() {
  return (
    <section
      aria-labelledby="como-funciona"
      className="mx-auto grid max-w-(--container-content) gap-12 px-(--page-gutter) py-16 md:py-24 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] lg:gap-16"
    >
      <div>
        <Cejilla>Descubre el truco</Cejilla>
        <h2
          id="como-funciona"
          className="mt-4 text-[clamp(30px,3vw,36px)] leading-[1.2] tracking-[-0.02em]"
        >
          ¿Cómo funciona Varita?
        </h2>
        <p className="mt-4 text-xl text-(--text-secondary)">
          Sin instalar nada ni registrarte. Copias, pegas y sabes si el mensaje
          es de quien dice ser.
        </p>
      </div>

      <ol>
        {PASOS.map(({ icono: Icono, titulo, texto }, i) => {
          const ultimo = i === PASOS.length - 1;
          return (
            <li key={titulo} className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <IconoDestacado pequeno>
                  <Icono className="size-5" />
                </IconoDestacado>
                {!ultimo && (
                  <span
                    aria-hidden="true"
                    className="w-0.5 flex-1 rounded-full bg-[#e9d7fe]"
                  />
                )}
              </div>
              <div className={ultimo ? "pt-2" : "pt-2 pb-8"}>
                <h3 className="text-lg font-bold">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {titulo}
                </h3>
                <p className="mt-1 text-base text-(--text-secondary)">
                  {texto}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
