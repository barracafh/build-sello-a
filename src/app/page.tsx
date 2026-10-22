import { Cabecera } from "@/components/Cabecera";
import { ComprobarAhora } from "@/components/ComprobarAhora";
import { AyudaCompartirIos } from "@/components/InstalarSello";
import { ChatEstafas } from "@/components/ChatEstafas";
import { Pestanas } from "@/components/Pestanas";
import { PieVarita } from "@/components/PieVarita";
import { PorQueVarita } from "@/components/PorQueVarita";
import { VerificadorUrl } from "@/components/VerificadorUrl";
import ficha from "../../ficha.json";

// Qué hace la herramienta, en tres pasos. Es la explicación que ve cualquiera
// antes de usarla.
const QUE_HACEMOS = [
  {
    titulo: "Nos pasas lo que has recibido",
    detalle:
      "Un SMS, un correo, la dirección de una web o una captura de pantalla que dice venir de la DGT, Hacienda, la Seguridad Social, Correos u otro organismo. Pégalo aquí o reenvíanoslo por WhatsApp.",
  },
  {
    titulo: "Lo leemos solo como texto",
    detalle:
      "De una captura sacamos el texto, el remitente y los enlaces escondidos con un modelo de IA. Nunca abrimos los enlaces, no seguimos redirecciones y no guardamos nada de lo que nos mandas. Comparamos con listas oficiales y con los patrones de fraude que publica INCIBE.",
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
      <Cabecera />

      <main id="contenido" tabIndex={-1} className="outline-none">
        <div className="mx-auto max-w-[760px] px-(--page-gutter) pt-10 pb-20 md:pt-14">
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          {ficha.frase}
        </p>
        <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
          Destapa el truco antes de pinchar.
        </h1>
        <p className="mt-6 text-lg text-(--text-secondary)">
          Pega el SMS, el correo o el enlace que dice venir de Tráfico,
          Hacienda, Correos u otro organismo, sube una captura de pantalla o
          reenvíanoslo por WhatsApp. Te decimos si es la web oficial y cuál es
          la buena.
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

        <div id="comprobar" className="mt-12 scroll-mt-6">
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

        <AyudaCompartirIos />
        </div>

        <PorQueVarita />
        <ComprobarAhora enPortada />
      </main>

      <PieVarita />
    </>
  );
}
