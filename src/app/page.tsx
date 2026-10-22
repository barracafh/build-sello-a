import { Cabecera } from "@/components/Cabecera";
import { ComprobarAhora } from "@/components/ComprobarAhora";
import { HeroVortice } from "@/components/HeroVortice";
import { AyudaCompartirIos } from "@/components/InstalarSello";
import { VaritaEnTuMovil } from "@/components/VaritaEnTuMovil";
import { ChatEstafas } from "@/components/ChatEstafas";
import { ComoFuncionaVarita } from "@/components/PasosVarita";
import { Pestanas } from "@/components/Pestanas";
import { PieVarita } from "@/components/PieVarita";
import { PorQueVarita } from "@/components/PorQueVarita";
import { VerificadorUrl } from "@/components/VerificadorUrl";

export default function Home() {
  return (
    <>
      <Cabecera />

      <main id="contenido" tabIndex={-1} className="outline-none">
        <HeroVortice />

        <div className="mx-auto max-w-[760px] px-(--page-gutter) pt-10 pb-4 md:pt-14">
        <p className="text-lg text-(--text-secondary)">
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
            ]}
          />
        </div>

        <AyudaCompartirIos />
        <VaritaEnTuMovil />
        </div>

        <ComoFuncionaVarita />
        <PorQueVarita />
        <ComprobarAhora enPortada />
      </main>

      <PieVarita />
    </>
  );
}
