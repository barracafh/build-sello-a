"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Fuentes, type Source } from "@/components/Fuentes";
import { ruta } from "@/config/sitio";

type Enlace = { neutralizado: string; veredicto: string; motivo: string };

type Resultado = {
  veredicto: "oficial_verificado" | "no_oficial" | "no_determinable";
  motivo: string;
  titular: string;
  consejo?: string;
  pasos: string[];
  avisos: string[];
  enlaces: Enlace[];
  entidad?: string;
  webOficial?: string;
  fuentes: Source[];
};

const ETIQUETAS = {
  oficial_verificado: { texto: "Oficial verificado", variante: "default" },
  no_oficial: { texto: "No oficial", variante: "destructive" },
  no_determinable: { texto: "No determinable", variante: "outline" },
} as const;

const EJEMPLOS: { etiqueta: string; texto: string }[] = [
  {
    etiqueta: "SMS · multa DGT",
    texto:
      "DGT: Dispone de 24 horas restantes para pagar su multa del 13/06/2024. Consulte en el siguiente enlace: hxxps://dgt-multas-pago[.]com/expediente",
  },
  {
    etiqueta: "SMS · devolución AEAT",
    texto:
      "AGENCIA TRIBUTARIA: Se ha ordenado el pago 411,00¿ de su devolucion del IRPF de la renta 2023. mas informacion en la web: hxxps://agenciatributaria-devolucion[.]top/renta2023",
  },
  {
    etiqueta: "SMS · aviso legítimo AEAT",
    texto:
      "AEAT: Tiene una nueva notificación disponible. Puede consultarla accediendo por sus propios medios a la Sede electrónica de la Agencia Tributaria (sede.agenciatributaria.gob.es) o a la DEHú. Este mensaje es solo informativo.",
  },
];

export function VerificadorMensaje() {
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<"sms" | "email">("sms");
  const [resultado, setResultado] = useState<Resultado>();
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);

  async function comprobar(e?: FormEvent, valor = texto) {
    e?.preventDefault();
    if (!valor.trim()) return;
    setCargando(true);
    setError(undefined);
    try {
      const res = await fetch(ruta("/api/verificar"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entrada: valor, tipo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResultado(undefined);
        setError(data.error ?? "No he podido comprobarlo. Inténtalo de nuevo.");
      } else setResultado(data);
    } catch {
      setError("No he podido comprobarlo. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <form onSubmit={comprobar} className="mt-10 grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="text-base font-medium">¿Qué has recibido?</legend>
          <div className="flex gap-2" role="group">
            {(
              [
                ["sms", "Un SMS"],
                ["email", "Un correo"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <Button
                key={valor}
                type="button"
                variant={tipo === valor ? "sunset" : "outline"}
                size="sm"
                aria-pressed={tipo === valor}
                onClick={() => setTipo(valor)}
              >
                {etiqueta}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <label htmlFor="mensaje" className="text-base font-medium">
            Pega aquí el {tipo === "sms" ? "SMS" : "correo"} completo
          </label>
          <Textarea
            id="mensaje"
            name="mensaje"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              tipo === "sms"
                ? "DGT: Dispone de 24 horas para pagar su multa…"
                : "Asunto: Último recordatorio…"
            }
            rows={5}
            className="min-h-28 px-4 py-3 text-base md:text-base"
          />
        </div>

        <Button
          type="submit"
          variant="sunset"
          size="lg"
          disabled={cargando}
          className="h-12 px-6 text-base max-md:w-full md:justify-self-start"
        >
          {cargando ? "Comprobando…" : "Comprobar mensaje"}
        </Button>

        <p className="text-[15px] text-(--text-secondary)">
          No abrimos los enlaces del mensaje ni guardamos lo que pegas: solo
          leemos el texto.
        </p>

        <div className="flex flex-wrap items-center gap-2 text-[15px]">
          <span className="text-(--text-secondary)">Prueba con:</span>
          {EJEMPLOS.map((ejemplo) => (
            <Button
              key={ejemplo.etiqueta}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-h-7 shrink py-1"
              onClick={() => {
                setTexto(ejemplo.texto);
                comprobar(undefined, ejemplo.texto);
              }}
            >
              {ejemplo.etiqueta}
            </Button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="mt-12">
        {error && <p className="text-lg">{error}</p>}
        {resultado && <Respuesta r={resultado} />}
      </div>
    </>
  );
}

function Respuesta({ r }: { r: Resultado }) {
  const etiqueta = ETIQUETAS[r.veredicto];
  return (
    <section aria-labelledby="veredicto-mensaje" className="text-lg [&>*+*]:mt-8">
      <div>
        <Badge variant={etiqueta.variante} className="font-mono uppercase">
          {etiqueta.texto}
        </Badge>
        <h2
          id="veredicto-mensaje"
          className="mt-4 font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]"
        >
          {r.titular}
        </h2>
        {r.entidad && (
          <p className="mt-3 text-[15px] text-(--text-secondary)">
            El mensaje dice venir de {r.entidad}.
          </p>
        )}
      </div>

      <ol className="grid gap-5">
        {r.pasos.map((paso, i) => (
          <li
            key={paso}
            className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 md:grid-cols-[32px_minmax(0,1fr)] md:gap-x-4"
          >
            <span className="text-[22px] leading-[1.1] font-light text-brand tabular-nums md:text-[26px]">
              {i + 1}
            </span>
            <p className="[overflow-wrap:anywhere]">{paso}</p>
          </li>
        ))}
      </ol>

      <Card render={<section />} className="gap-2 bg-muted px-6 py-6 text-base ring-0">
        <h3 className="text-sm font-medium text-(--text-secondary)">Qué hacer</h3>
        {r.consejo && <p>{r.consejo}</p>}
        {r.avisos.map((aviso) => (
          <p key={aviso}>{aviso}</p>
        ))}
        {r.veredicto !== "oficial_verificado" && (
          <p>
            Si tienes dudas, llama gratis al 017 de INCIBE, de 8:00 a 23:00
            todos los días.
          </p>
        )}
      </Card>

      {/* Una sola tarjeta con el sol por vista: la web buena. Es el único enlace. */}
      {r.webOficial && (
        <Card
          render={<section />}
          className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
        >
          <div className="min-w-0 flex-[1_1_260px]">
            <p className="text-sm font-medium">La web oficial</p>
            <h3 className="mt-1 text-lg leading-[1.35] font-medium">
              {r.entidad ?? "Punto de Acceso General de la Administración"}
            </h3>
            <p className="mt-1 font-mono text-sm">
              {new URL(r.webOficial).hostname}
            </p>
          </div>
          <a
            href={r.webOficial}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "max-md:w-full",
            )}
          >
            Ir a la web oficial <span aria-hidden="true">↗</span>
          </a>
        </Card>
      )}

      <Fuentes fuentes={r.fuentes} />
    </section>
  );
}
