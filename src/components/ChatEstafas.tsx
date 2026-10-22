"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ComoComprobamos } from "@/components/ComoComprobamos";
import { Fuentes, type Source } from "@/components/Fuentes";
import { enlacesDe, type Enlace } from "@/components/VerificadorUrl";
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

// Lo que devuelve /api/verificar-url con los enlaces de un correo copiado.
type ResultadoEnlaces = {
  veredicto: Veredicto;
  titular: string;
  enlaces: { texto: string; resultado: ResultadoChat }[];
};

type Contenido =
  | { autor: "usuario"; texto: string; ocultos?: number }
  | { autor: "asistente"; texto: string }
  | { autor: "asistente"; resultado: ResultadoChat }
  | { autor: "asistente"; enlaces: ResultadoEnlaces };

type Mensaje = Contenido & { id: number; hora?: string };

const ETIQUETAS = {
  oficial_verificado: { texto: "Oficial verificado", variante: "default" },
  no_oficial: { texto: "No oficial", variante: "destructive" },
  no_determinable: { texto: "No determinable", variante: "outline" },
} as const;

// Textos de datos/mensajes-ejemplo.json, con las URL ya neutralizadas. El
// correo simula uno copiado con enlaces que enseñan una web y llevan a otra.
const EJEMPLOS: { etiqueta: string; texto: string; enlaces?: Enlace[] }[] = [
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
  {
    etiqueta: "Web falsa de la DGT",
    texto: "hxxps://dgt.es.multas-pago[.]com",
  },
  { etiqueta: "Web oficial de la DGT", texto: "https://sede.dgt.gob.es" },
  {
    etiqueta: "Correo con un enlace disfrazado",
    texto:
      "Tiene una multa pendiente. Consulte su expediente en sede.dgt.gob.es o pulse Pagar ahora.",
    enlaces: [
      {
        texto: "sede.dgt.gob.es",
        href: "https://dgt-expedientes-pago.top/consulta",
      },
      { texto: "Pagar ahora", href: "https://dgt-expedientes-pago.top/pago" },
    ],
  },
];

const SALUDO: Mensaje = {
  id: 0,
  autor: "asistente",
  texto:
    "Hola. Pega aquí el SMS, el correo o la dirección web que te ha llegado y te digo si es oficial. No abro los enlaces ni guardo lo que escribes.",
};

const MAX = 4000;

const ahora = () =>
  new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

async function pedir<T>(ruta_: string, cuerpo: object): Promise<T> {
  const res = await fetch(ruta(ruta_), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || "error" in data)
    throw new Error(
      data.error ?? "No he podido comprobarlo. Inténtalo de nuevo.",
    );
  return data;
}

// Una sola palabra sin espacios es una URL: va al verificador de webs, que
// además comprueba en DNS los *.gob.es. Lo demás es un SMS o un correo.
// Si al pegar venían enlaces escondidos (el HTML de un correo), se comprueba
// también adónde llevan de verdad, como en la pestaña Web.
async function analizar(
  texto: string,
  ocultos: Enlace[],
): Promise<Contenido[]> {
  const esUrl = !/\s/.test(texto);
  const esCorreo = /^\s*(asunto|de|from|subject)\s*:/im.test(texto);
  const tareas: Promise<Contenido>[] = [];
  if (!(esUrl && ocultos.length))
    tareas.push(
      esUrl
        ? pedir<ResultadoChat>("/api/verificar-url", { texto }).then(
            (resultado) => ({
              autor: "asistente" as const,
              resultado,
            }),
          )
        : pedir<ResultadoChat>("/api/verificar-mensaje", {
            texto,
            tipo: esCorreo ? "email" : "sms",
          }).then((resultado) => ({ autor: "asistente" as const, resultado })),
    );
  if (ocultos.length)
    tareas.push(
      pedir<ResultadoEnlaces>("/api/verificar-url", { enlaces: ocultos }).then(
        (enlaces) => ({ autor: "asistente" as const, enlaces }),
      ),
    );
  const hechas = await Promise.allSettled(tareas);
  return hechas.map((h) =>
    h.status === "fulfilled"
      ? h.value
      : {
          autor: "asistente",
          texto:
            h.reason instanceof Error
              ? h.reason.message
              : "No he podido comprobarlo. Inténtalo de nuevo.",
        },
  );
}

export function ChatEstafas() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [ocultos, setOcultos] = useState<Enlace[]>([]);
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
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reducido ? "auto" : "smooth",
    });
  }, [mensajes, cargando]);

  function añadir(c: Contenido) {
    const m = { ...c, id: siguienteId.current++, hora: ahora() };
    setMensajes((prev) => [...prev, m]);
  }

  // Del HTML del portapapeles, los enlaces con su texto visible.
  function alPegar(e: ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    setOcultos(html ? enlacesDe(html) : []);
  }

  async function enviar(e?: FormEvent, valor = texto, enlaces = ocultos) {
    e?.preventDefault();
    const limpio = valor.trim();
    if (!limpio || cargando || limpio.length > MAX) return;
    añadir({ autor: "usuario", texto: limpio, ocultos: enlaces.length });
    setTexto("");
    setOcultos([]);
    setCargando(true);
    for (const respuesta of await analizar(limpio, enlaces)) añadir(respuesta);
    setCargando(false);
    caja.current?.focus();
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
    setOcultos([]);
    caja.current?.focus();
  }

  const demasiadoLargo = texto.length > MAX;
  const vacio = mensajes.length === 1;

  return (
    <>
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
              <BurbujaUsuario key={m.id} hora={m.hora} ocultos={m.ocultos}>
                {m.texto}
              </BurbujaUsuario>
            ) : (
              <BurbujaAsistente key={m.id} hora={m.hora}>
                {"resultado" in m ? (
                  <Resultado r={m.resultado} />
                ) : "enlaces" in m ? (
                  <ResultadoDeEnlaces r={m.enlaces} />
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
                  onClick={() =>
                    enviar(undefined, ejemplo.texto, ejemplo.enlaces ?? [])
                  }
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
              onPaste={alPegar}
              onChange={(e) => {
                setTexto(e.target.value);
                if (!e.target.value.trim()) setOcultos([]);
              }}
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
              : ocultos.length
                ? `He encontrado ${ocultos.length} ${ocultos.length === 1 ? "enlace" : "enlaces"} en lo que has pegado, también los escondidos tras un texto o un botón. Comprobaré adónde llevan.`
                : "Intro para enviar · Mayús + Intro para otra línea"}
          </p>
        </form>
      </section>
      <div className="mt-4">
        <ComoComprobamos />
      </div>
    </>
  );
}

function BurbujaUsuario({
  children,
  hora,
  ocultos,
}: {
  children: string;
  hora?: string;
  ocultos?: number;
}) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-base text-primary-foreground">
        <span className="sr-only">Tú: </span>
        {/* Texto plano: las URL que pega el ciudadano nunca se vuelven enlaces. */}
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
          {children}
        </p>
        {!!ocultos && (
          <p className="mt-1 text-sm opacity-80">
            + {ocultos}{" "}
            {ocultos === 1 ? "enlace escondido" : "enlaces escondidos"}
          </p>
        )}
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

function Cabecera({
  veredicto,
  titular,
}: {
  veredicto: Veredicto;
  titular: string;
}) {
  const etiqueta = ETIQUETAS[veredicto];
  return (
    <>
      <Badge variant={etiqueta.variante} className="font-mono uppercase">
        {etiqueta.texto}
      </Badge>
      <p className="mt-2 text-lg leading-snug font-medium">{titular}</p>
    </>
  );
}

function QueHacer({
  veredicto,
  consejo,
  avisos,
}: {
  veredicto: Veredicto;
  consejo?: string;
  avisos: string[];
}) {
  if (!avisos.length && !consejo && veredicto === "oficial_verificado")
    return null;
  return (
    <div className="grid gap-2 rounded-xl bg-muted p-4">
      <p className="text-sm font-medium text-(--text-secondary)">Qué hacer</p>
      {consejo && <p>{consejo}</p>}
      {avisos.map((aviso) => (
        <p key={aviso}>{aviso}</p>
      ))}
      {veredicto !== "oficial_verificado" && (
        <p>
          Si tienes dudas, llama gratis al 017 de INCIBE, de 8:00 a 23:00 todos
          los días.
        </p>
      )}
    </div>
  );
}

function WebOficial({ url, entidad }: { url?: string; entidad?: string }) {
  if (!url) return null;
  return (
    <div className="grid gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
      <div className="min-w-0">
        <p className="text-sm text-(--text-secondary)">La web oficial</p>
        <p className="font-medium">
          {entidad ?? "Punto de Acceso General de la Administración"}
        </p>
        <p className="font-mono text-sm">{new URL(url).hostname}</p>
      </div>
      <a
        href={url}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "justify-self-start",
        )}
      >
        Ir a la web oficial <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

function Resultado({ r }: { r: ResultadoChat }) {
  return (
    <div className="grid gap-4 py-1">
      <div>
        <Cabecera veredicto={r.veredicto} titular={r.titular} />
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
          <li
            key={paso}
            className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2"
          >
            <span className="font-light text-brand tabular-nums">{i + 1}</span>
            <p className="[overflow-wrap:anywhere]">{paso}</p>
          </li>
        ))}
      </ol>

      <QueHacer veredicto={r.veredicto} consejo={r.consejo} avisos={r.avisos} />
      <WebOficial url={r.webOficial} entidad={r.entidad} />
      <Fuentes fuentes={r.fuentes} />
    </div>
  );
}

// Los enlaces escondidos de un correo copiado: lo que se ve y adónde lleva.
function ResultadoDeEnlaces({ r }: { r: ResultadoEnlaces }) {
  const resultados = r.enlaces.map((e) => e.resultado);
  // La web buena del organismo que más importa: el suplantado, si lo hay.
  const guia =
    resultados.find((x) => x.veredicto === "no_oficial" && x.webOficial) ??
    resultados.find((x) => x.webOficial);
  const fuentes = [
    ...new Map(
      resultados.flatMap((x) => x.fuentes).map((f) => [f.url, f]),
    ).values(),
  ];
  return (
    <div className="grid gap-4 py-1">
      <div>
        <Cabecera veredicto={r.veredicto} titular={r.titular} />
        <p className="mt-1 text-(--text-secondary)">
          {r.enlaces.length === 1
            ? "He comprobado el enlace escondido en lo que has pegado."
            : `He comprobado los ${r.enlaces.length} enlaces escondidos en lo que has pegado.`}
        </p>
      </div>

      <ol className="grid gap-3">
        {r.enlaces.map(({ texto, resultado: x }, i) => (
          <li
            key={x.urlNeutralizada ?? i}
            className="grid gap-2 rounded-xl p-4 ring-1 ring-foreground/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                <span className="text-brand tabular-nums">{i + 1}</span> ·
                Enlace
              </p>
              <Badge
                variant={ETIQUETAS[x.veredicto].variante}
                className="font-mono uppercase"
              >
                {ETIQUETAS[x.veredicto].texto}
              </Badge>
            </div>
            <dl className="grid gap-1">
              <dt className="text-sm text-(--text-secondary)">Lo que se ve</dt>
              <dd className="[overflow-wrap:anywhere]">«{texto}»</dd>
              <dt className="mt-1 text-sm text-(--text-secondary)">
                Adónde lleva de verdad (no es un enlace)
              </dt>
              <dd className="font-mono text-sm [overflow-wrap:anywhere]">
                {x.urlNeutralizada}
              </dd>
            </dl>
            <ul className="grid gap-1 pl-5 text-[15px] [list-style:disc]">
              {x.pasos.slice(1).map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <QueHacer
        veredicto={r.veredicto}
        consejo={resultados.find((x) => x.consejo)?.consejo}
        avisos={[...new Set(resultados.flatMap((x) => x.avisos))]}
      />
      <WebOficial url={guia?.webOficial} entidad={guia?.entidad} />
      <Fuentes fuentes={fuentes} />
    </div>
  );
}
