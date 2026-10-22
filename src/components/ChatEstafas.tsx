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
import ficha from "../../ficha.json";

type Veredicto = "oficial_verificado" | "no_oficial" | "no_determinable";

export type ResultadoChat = {
  veredicto: Veredicto;
  titular: string;
  motivo: string;
  pasos: string[];
  // Solo se rellena con una web de datos/dominios-oficiales.json.
  webOficial?: { entidad: string; url: string };
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

const FUENTES_INCIBE: Source[] = [
  {
    nombre: "INCIBE · Avisos a la ciudadanía",
    url: "https://www.incibe.es/ciudadania/avisos",
  },
  {
    nombre: "Línea 017 de INCIBE",
    url: "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad",
  },
];

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
  { etiqueta: "Una web", texto: "https://sede.dgt.gob.es" },
];

const SALUDO: Mensaje = {
  id: 0,
  autor: "asistente",
  texto:
    "Hola. Pega aquí el SMS, el correo o la dirección web que te ha llegado y te digo si es oficial. No abro los enlaces ni guardo lo que escribes.",
};

const MAX = 2000;

const ahora = () =>
  new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// TODO(backend): sustituir por la llamada real, p. ej.
//   const res = await fetch(ruta("/api/analizar"), { method: "POST", body: JSON.stringify({ texto }) });
//   return (await res.json()) as ResultadoChat;
// Mientras tanto no analiza nada: responde siempre «no puedo confirmarlo»,
// que es lo único que podemos decir sin análisis.
async function analizar(_texto: string): Promise<ResultadoChat> {
  return {
    veredicto: "no_determinable",
    titular: "Todavía no puedo confirmarlo",
    motivo:
      "El análisis de mensajes aún no está conectado. Esta respuesta es provisional y no dice nada del mensaje que has enviado.",
    pasos: [
      "No pulses el enlace ni respondas al mensaje.",
      "Entra tú en la web oficial del organismo escribiendo su dirección, no desde el mensaje.",
      "Si tienes dudas, llama gratis al 017 de INCIBE, de 8:00 a 23:00 todos los días.",
    ],
    fuentes: FUENTES_INCIBE,
  };
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
    } catch {
      añadir({
        autor: "asistente",
        texto: "No he podido comprobarlo. Inténtalo de nuevo.",
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
        <p className="mt-1 text-(--text-secondary)">{r.motivo}</p>
      </div>

      <ol className="grid gap-2">
        {r.pasos.map((paso, i) => (
          <li key={paso} className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2">
            <span className="font-light text-brand tabular-nums">{i + 1}</span>
            <p>{paso}</p>
          </li>
        ))}
      </ol>

      {r.webOficial && (
        <div className="grid gap-3 rounded-xl bg-muted p-4">
          <div className="min-w-0">
            <p className="text-sm text-(--text-secondary)">La web oficial</p>
            <p className="font-medium">{r.webOficial.entidad}</p>
            <p className="font-mono text-sm">
              {new URL(r.webOficial.url).hostname}
            </p>
          </div>
          <a
            href={r.webOficial.url}
            className={buttonVariants({ variant: "outline" })}
          >
            Ir a la web oficial <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}

      <Fuentes fuentes={r.fuentes} />
    </div>
  );
}
