"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Fuentes, type Source } from "@/components/Fuentes";
import { ruta } from "@/config/sitio";
import ficha from "../../ficha.json";

type Veredicto = "oficial_verificado" | "no_oficial" | "no_determinable";

// Lo que devuelven /api/verificar-url y /api/verificar-mensaje.
export type ResultadoChat = {
  veredicto: Veredicto;
  titular: string;
  consejo?: string;
  pasos: string[];
  avisos: string[];
  entidad?: string;
  // Solo se rellena con una web de datos/dominios-oficiales.json.
  webOficial?: string;
  // Solo en las URL sueltas: la dirección analizada, neutralizada.
  urlNeutralizada?: string;
  fuentes: Source[];
};

type Contenido =
  | { autor: "usuario"; texto: string }
  | { autor: "asistente"; texto: string }
  | { autor: "asistente"; resultado: ResultadoChat };

type Mensaje = Contenido & { id: number; hora?: string };

const ETIQUETAS = {
  oficial_verificado: { texto: "Oficial verificado", variante: "default" },
  no_oficial: { texto: "No oficial", variante: "destructive" },
  no_determinable: { texto: "No determinable", variante: "outline" },
} as const;

// Textos de datos/mensajes-ejemplo.json, con las URL ya neutralizadas.
const EJEMPLOS = [
  {
    etiqueta: "SMS de la DGT",
    texto:
      "DGT: Dispone de 24 horas restantes para pagar su multa del 13/06/2024. Consulte en el siguiente enlace: hxxps://dgt-multas-pago[.]com/expediente",
  },
  {
    etiqueta: "SMS de Hacienda",
    texto:
      "AGENCIA TRIBUTARIA: Se ha ordenado el pago 411,00€ de su devolucion del IRPF de la renta 2023. mas informacion en la web: hxxps://agenciatributaria-devolucion[.]top/renta2023",
  },
  {
    etiqueta: "Aviso legítimo de la AEAT",
    texto:
      "AEAT: Tiene una nueva notificación disponible. Puede consultarla accediendo por sus propios medios a la Sede electrónica de la Agencia Tributaria (sede.agenciatributaria.gob.es) o a la DEHú. Este mensaje es solo informativo.",
  },
  { etiqueta: "Web falsa de la DGT", texto: "hxxps://dgt.es.multas-pago[.]com" },
  { etiqueta: "Web oficial de la DGT", texto: "https://sede.dgt.gob.es" },
];

const SALUDO: Mensaje = {
  id: 0,
  autor: "asistente",
  texto:
    "Hola. Pega aquí el SMS, el correo o la dirección web que te ha llegado y te digo si es oficial. No abro los enlaces ni guardo lo que escribes.",
};

const MAX = 4000;

const ahora = () =>
  new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// Una sola palabra sin espacios es una URL: va al verificador de webs, que
// además comprueba en DNS los *.gob.es. Lo demás es un SMS o un correo.
async function analizar(texto: string): Promise<ResultadoChat> {
  const esUrl = !/\s/.test(texto);
  const esCorreo = /^\s*(asunto|de|from|subject)\s*:/im.test(texto);
  const res = await fetch(
    ruta(esUrl ? "/api/verificar-url" : "/api/verificar-mensaje"),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        esUrl ? { texto } : { texto, tipo: esCorreo ? "email" : "sms" },
      ),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || "error" in data)
    throw new Error(data.error ?? "No he podido comprobarlo. Inténtalo de nuevo.");
  return data;
}

export function ChatEstafas() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const siguienteId = useRef(1);
  const historial = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLTextAreaElement>(null);

  // Baja al último mensaje dentro del recuadro, sin mover la página.
  useEffect(() => {
    const el = historial.current;
    if (!el || mensajes.length < 2) return;
    const reducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reducido ? "auto" : "smooth" });
  }, [mensajes, cargando]);

  function añadir(c: Contenido) {
    const m = { ...c, id: siguienteId.current++, hora: ahora() };
    setMensajes((prev) => [...prev, m]);
  }

  async function enviar(e?: FormEvent, valor = texto) {
    e?.preventDefault();
    const limpio = valor.trim();
    if (!limpio || cargando || limpio.length > MAX) return;
    añadir({ autor: "usuario", texto: limpio });
    setTexto("");
    setCargando(true);
    try {
      añadir({ autor: "asistente", resultado: await analizar(limpio) });
    } catch (error) {
      añadir({
        autor: "asistente",
        texto:
          error instanceof Error
            ? error.message
            : "No he podido comprobarlo. Inténtalo de nuevo.",
      });
    } finally {
      setCargando(false);
      caja.current?.focus();
    }
  }

  // Intro envía; Mayús + Intro hace un salto de línea.
  function teclado(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
    }
  }

  function reiniciar() {
    setMensajes([SALUDO]);
    setTexto("");
    caja.current?.focus();
  }

  const demasiadoLargo = texto.length > MAX;
  const vacio = mensajes.length === 1;

  return (
    <section
      aria-label="Chat"
      className="mt-10 flex h-[min(680px,calc(100svh-120px))] min-h-[480px] flex-col overflow-hidden rounded-2xl ring-1 ring-foreground/10"
    >
      {/* Cabecera */}
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-mono text-lg text-white"
          >
            {ficha.icono}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base leading-tight font-medium">
              {ficha.nombre}
            </p>
            <p className="truncate text-sm text-(--text-secondary)">
              {cargando ? "Escribiendo…" : "Asistente antiestafas"}
            </p>
          </div>
        </div>
        {!vacio && (
          <Button variant="outline" size="sm" onClick={reiniciar}>
            Nueva<span className="max-sm:sr-only">conversación</span>
          </Button>
        )}
      </header>

      {/* Mensajes */}
      <div
        ref={historial}
        role="log"
        aria-live="polite"
        aria-label="Conversación"
        tabIndex={0}
        className="flex flex-1 flex-col gap-4 overflow-y-auto bg-muted px-3 py-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-5"
      >
        {mensajes.map((m) =>
          m.autor === "usuario" ? (
            <BurbujaUsuario key={m.id} hora={m.hora}>
              {m.texto}
            </BurbujaUsuario>
          ) : (
            <BurbujaAsistente key={m.id} hora={m.hora}>
              {"resultado" in m ? (
                <Resultado r={m.resultado} />
              ) : (
                <p>{m.texto}</p>
              )}
            </BurbujaAsistente>
          ),
        )}

        {cargando && (
          <BurbujaAsistente>
            <span className="sr-only">Comprobando…</span>
            <span aria-hidden="true" className="flex gap-1 py-2">
              {[0, 150, 300].map((retraso) => (
                <span
                  key={retraso}
                  style={{ animationDelay: `${retraso}ms` }}
                  className="size-2 animate-bounce rounded-full bg-(--text-secondary) motion-reduce:animate-none"
                />
              ))}
            </span>
          </BurbujaAsistente>
        )}

        {vacio && (
          <div className="mt-auto flex flex-wrap justify-center gap-2 pt-4">
            <p className="w-full text-center text-sm text-(--text-secondary)">
              Prueba con un ejemplo
            </p>
            {EJEMPLOS.map((ejemplo) => (
              <Button
                key={ejemplo.etiqueta}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => enviar(undefined, ejemplo.texto)}
              >
                {ejemplo.etiqueta}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Caja de escribir */}
      <form onSubmit={enviar} className="border-t bg-background p-3">
        <label htmlFor="mensaje-chat" className="sr-only">
          Mensaje o dirección web
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={caja}
            id="mensaje-chat"
            name="mensaje"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={teclado}
            placeholder="Pega el SMS, el correo o la URL…"
            autoComplete="off"
            spellCheck={false}
            rows={1}
            aria-invalid={demasiadoLargo || undefined}
            aria-describedby="mensaje-chat-ayuda"
            className="field-sizing-content max-h-40 min-h-11 min-w-0 flex-1 resize-none rounded-3xl border border-input bg-transparent px-4 py-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
          />
          <Button
            type="submit"
            variant="sunset"
            disabled={cargando || !texto.trim() || demasiadoLargo}
            className="h-11 shrink-0 rounded-full px-5 text-base"
          >
            Enviar
          </Button>
        </div>
        <p
          id="mensaje-chat-ayuda"
          className={cn(
            "mt-2 px-1 text-sm",
            demasiadoLargo ? "text-destructive" : "text-(--text-secondary)",
          )}
        >
          {demasiadoLargo
            ? `Máximo ${MAX.toLocaleString("es-ES")} caracteres.`
            : "Intro para enviar · Mayús + Intro para otra línea"}
        </p>
      </form>
    </section>
  );
}

function BurbujaUsuario({
  children,
  hora,
}: {
  children: string;
  hora?: string;
}) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-base text-primary-foreground">
        <span className="sr-only">Tú: </span>
        {/* Texto plano: las URL que pega el ciudadano nunca se vuelven enlaces. */}
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
          {children}
        </p>
      </div>
      {hora && <Hora>{hora}</Hora>}
    </div>
  );
}

function BurbujaAsistente({
  children,
  hora,
}: {
  children: ReactNode;
  hora?: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <span
        aria-hidden="true"
        className="mb-6 grid size-7 shrink-0 place-items-center rounded-full bg-brand font-mono text-sm text-white"
      >
        {ficha.icono}
      </span>
      <div className="flex max-w-[85%] min-w-0 flex-col items-start">
        <div className="min-w-0 rounded-2xl rounded-bl-sm bg-background px-4 py-2.5 text-base ring-1 ring-foreground/10">
          <span className="sr-only">{ficha.nombre}: </span>
          {children}
        </div>
        <Hora>{hora ?? " "}</Hora>
      </div>
    </div>
  );
}

function Hora({ children }: { children: string }) {
  return (
    <span className="mt-1 min-h-5 px-1 font-mono text-xs text-(--text-secondary)">
      {children}
    </span>
  );
}

function Resultado({ r }: { r: ResultadoChat }) {
  const etiqueta = ETIQUETAS[r.veredicto];
  return (
    <div className="grid gap-4 py-1">
      <div>
        <Badge variant={etiqueta.variante} className="font-mono uppercase">
          {etiqueta.texto}
        </Badge>
        <p className="mt-2 text-lg leading-snug font-medium">{r.titular}</p>
        {r.entidad && (
          <p className="mt-1 text-(--text-secondary)">
            {r.veredicto === "oficial_verificado" ? "Es de" : "Dice venir de"}{" "}
            {r.entidad}.
          </p>
        )}
        {r.urlNeutralizada && (
          <>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Dirección analizada (no es un enlace):
            </p>
            <p className="font-mono text-sm [overflow-wrap:anywhere]">
              {r.urlNeutralizada}
            </p>
          </>
        )}
      </div>

      <ol className="grid gap-2">
        {r.pasos.map((paso, i) => (
          <li key={paso} className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2">
            <span className="font-light text-brand tabular-nums">{i + 1}</span>
            <p className="[overflow-wrap:anywhere]">{paso}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-2 rounded-xl bg-muted p-4">
        <p className="text-sm font-medium text-(--text-secondary)">Qué hacer</p>
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
      </div>

      {r.webOficial && (
        <div className="grid gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
          <div className="min-w-0">
            <p className="text-sm text-(--text-secondary)">La web oficial</p>
            <p className="font-medium">
              {r.entidad ?? "Punto de Acceso General de la Administración"}
            </p>
            <p className="font-mono text-sm">{new URL(r.webOficial).hostname}</p>
          </div>
          <a
            href={r.webOficial}
            className={cn(buttonVariants({ variant: "outline" }), "justify-self-start")}
          >
            Ir a la web oficial <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}

      <Fuentes fuentes={r.fuentes} />
    </div>
  );
}
