import { Badge } from "@/components/ui/badge";
import { BotonAviso } from "@/components/BotonAviso";
import { ChatEstafas } from "@/components/ChatEstafas";
import { Pestanas } from "@/components/Pestanas";
import { VerificadorUrl } from "@/components/VerificadorUrl";
import ficha from "../../ficha.json";

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
        <Pestanas
          pestanas={[
            {
              id: "web",
              etiqueta: "Verificar web",
              contenido: (
                <>
                  <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                    Verificador de webs
                  </p>
                  <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
                    ¿Esta web es oficial?
                  </h1>
                  <p className="mt-6 text-lg text-(--text-secondary)">
                    Pega la dirección de un SMS, un correo o un aviso que dice
                    venir de la DGT, Hacienda u otro organismo. Te decimos si es
                    suya y cuál es la buena.
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
                    Mensajes y enlaces
                  </p>
                  <h2 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
                    ¿Este mensaje es de verdad?
                  </h2>
                  <p className="mt-6 text-lg text-(--text-secondary)">
                    Pega un SMS, un correo o una URL que dice venir de un
                    organismo público y pregúntanos.
                  </p>
                  <ChatEstafas />
                </>
              ),
            },
          ]}
        />
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
