import { Cabecera } from "@/components/Cabecera";
import { Cejilla } from "@/components/Cejilla";
import { ComprobarAhora } from "@/components/ComprobarAhora";
import { AyudaCompartirIos } from "@/components/InstalarSello";
import { ChatEstafas } from "@/components/ChatEstafas";
import { ComoFuncionaVarita } from "@/components/PasosVarita";
import { Pestanas } from "@/components/Pestanas";
import { PieVarita } from "@/components/PieVarita";
import { PorQueVarita } from "@/components/PorQueVarita";
import { VerificadorMensaje } from "@/components/VerificadorMensaje";
import { VerificadorUrl } from "@/components/VerificadorUrl";

export default function Home() {
  return (
    <>
      <Cabecera />

      <main id="contenido" tabIndex={-1} className="outline-none">
        <div className="mx-auto max-w-[760px] px-(--page-gutter) pt-10 pb-4 md:pt-14">
        <Cejilla>Experimental · No es un servicio oficial</Cejilla>
        <h1 className="mt-3 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
          Destapa el truco antes de pinchar.
        </h1>
        <p className="mt-6 text-lg text-(--text-secondary)">
          Pega el SMS, el correo o el enlace que dice venir de Tráfico,
          Hacienda, Correos u otro organismo, sube una captura de pantalla o
          reenvíanoslo por WhatsApp o Telegram. Te decimos si es la web oficial
          y cuál es la buena.
        </p>

        <div id="comprobar" className="mt-10 scroll-mt-6">
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
              {
                id: "captura",
                etiqueta: "SMS o correo",
                contenido: (
                  <>
                    <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                      Verificador de capturas
                    </p>
                    <h2 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
                      ¿Este mensaje es de verdad?
                    </h2>
                    <p className="mt-6 text-lg text-(--text-secondary)">
                      Pega el SMS o el correo, o sube una captura de pantalla
                      como la que te llegó por WhatsApp. Te decimos si es
                      oficial y cuál es la web buena.
                    </p>
                    <VerificadorMensaje />
                  </>
                ),
              },
            ]}
          />
        </div>

        <AyudaCompartirIos />
        </div>

        <ComoFuncionaVarita />
        <PorQueVarita />
        <ComprobarAhora enPortada />
      </main>

      <PieVarita />
    </>
  );
}
