import { Badge } from "@/components/ui/badge";
import { BotonAviso } from "@/components/BotonAviso";
import { ChatEstafas } from "@/components/ChatEstafas";
import { Pestanas } from "@/components/Pestanas";
import { VerificadorUrl } from "@/components/VerificadorUrl";
import ficha from "../../ficha.json";

// Qué hace la herramienta, en tres pasos. Es la explicación que ve cualquiera
// antes de usarla.
const QUE_HACEMOS = [
  {
    titulo: "Pegas lo que has recibido",
    detalle:
      "Un SMS, un correo o la dirección de una web que dice venir de la DGT, Hacienda, la Seguridad Social, Correos u otro organismo.",
  },
  {
    titulo: "Lo leemos solo como texto",
    detalle:
      "Nunca abrimos los enlaces, no seguimos redirecciones y no guardamos nada de lo que pegas. Comparamos con listas oficiales y con los patrones de fraude que publica INCIBE.",
  },
  {
    titulo: "Te decimos la verdad que sabemos",
    detalle:
      "Un veredicto claro con su motivo y, si no es oficial, cuál es la web buena. Si no lo podemos confirmar, lo decimos: un dominio desconocido no es un fraude demostrado.",
  },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex min-h-20 max-w-(--container-content) flex-wrap items-center justify-between gap-4 px-(--page-gutter) py-4">
        <span className="inline-flex items-center gap-3 text-lg leading-tight font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand font-mono text-xl text-white"
          >
            {ficha.icono}
          </span>
          {ficha.nombre}
        </span>
        <Badge variant="outline">
          {ficha.datos === "reales" ? "Datos públicos" : "Datos simulados"}
        </Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[760px] px-(--page-gutter) pt-10 pb-20 outline-none md:pt-14"
      >
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          {ficha.frase}
        </p>
        <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
          ¿Ese SMS o esa web es oficial de verdad?
        </h1>
        <p className="mt-6 text-lg text-(--text-secondary)">
          Cada semana se suplanta a la DGT, a Hacienda o a Correos para robar
          datos y dinero. Comprueba aquí el mensaje o el enlace antes de
          confiar, y te decimos cuál es la web buena si no lo es.
        </p>

        {/* Qué hacemos, en tres pasos */}
        <ol className="mt-10 grid gap-8">
          {QUE_HACEMOS.map((paso, i) => (
            <li
              key={paso.titulo}
              className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 md:grid-cols-[44px_minmax(0,1fr)] md:gap-x-5"
            >
              <span className="text-[26px] leading-[1.1] font-light text-brand tabular-nums md:text-[34px]">
                {i + 1}
              </span>
              <div>
                <h2 className="text-lg font-medium">{paso.titulo}</h2>
                <p className="mt-1 text-[15px] text-(--text-secondary)">
                  {paso.detalle}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <Pestanas
            pestanas={[
              {
                id: "web",
                etiqueta: "Web",
                contenido: (
                  <>
                    <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                      Verificador de webs
                    </p>
                    <h2 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
                      ¿Esta web es oficial?
                    </h2>
                    <p className="mt-6 text-lg text-(--text-secondary)">
                      Pega la dirección de un SMS, un correo o un aviso que dice
                      venir de la DGT, Hacienda u otro organismo. Te decimos si
                      es suya y cuál es la buena.
                    </p>
                    <VerificadorUrl />
                  </>
                ),
              },
              {
                id: "chat",
                etiqueta: "Chat",
                contenido: (
                  <>
                    <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                      SMS, correos y webs
                    </p>
                    <h2 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
                      Pregúntanos por lo que te ha llegado
                    </h2>
                    <p className="mt-6 text-lg text-(--text-secondary)">
                      Copia y pega el SMS, el correo o la dirección web tal
                      cual. Te decimos si es oficial y cuál es la web buena.
                    </p>
                    <ChatEstafas />
                  </>
                ),
              },
            ]}
          />
        </div>
      </main>

      <footer className="p-2">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] px-(--page-gutter) py-12 [background:radial-gradient(80%_70%_at_50%_-12%,#ffe58f_0%,rgba(255,229,143,0)_70%),linear-gradient(180deg,#ffd34d_0%,var(--brand-yellow)_46%,var(--brand-orange)_100%)] md:px-12">
          <p className="text-[15px]">
            Una pieza del squad{" "}
            <span className="font-mono">{ficha.equipo}</span> · Build night
          </p>
          <BotonAviso />
        </div>
      </footer>
    </>
  );
}
