import { Copy, ExternalLink, Eye, WandSparkles } from "lucide-react";
import { IconoDestacado } from "@/components/Cejilla";

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

// Los cuatro pasos de «¿Cómo funciona Varita?».
export function PasosVarita() {
  return (
    <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
        <li key={titulo}>
          <IconoDestacado>
            <Icono className="size-6" />
          </IconoDestacado>
          <h3 className="mt-5 text-xl font-semibold">
            <span className="sr-only">Paso {i + 1}: </span>
            {titulo}
          </h3>
          <p className="mt-2 text-base text-(--text-secondary)">{texto}</p>
        </li>
      ))}
    </ol>
  );
}
