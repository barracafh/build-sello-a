"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ComoComprobamos } from "@/components/ComoComprobamos";
import { Fuentes, type Source } from "@/components/Fuentes";
import { enlacesDe, type Enlace } from "@/components/VerificadorUrl";
import { ruta } from "@/config/sitio";
import { resolverDominiosSueltos, resolverEnlaces } from "@/lib/resolver";
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
  // La web buena que se enlaza: un dominio de la lista oficial, un inquilino
  // verificado de una plataforma compartida (src/datos/inquilinos.ts) o, si no
  // se identifica la entidad, la del Punto de Acceso General.
  webOficial?: string;
  // Solo en las URL sueltas: la dirección analizada, neutralizada.
  urlNeutralizada?: string;
  // Solo en los mensajes: hay un enlace sin dirección visible («pulse aquí»).
  enlaceSinDireccion?: { frase?: string };
  // Solo en los mensajes: los enlaces encontrados, ya neutralizados.
  enlaces?: { neutralizado: string }[];
  // Solo en los mensajes: quién lo envía y qué concluimos de ello.
  remitente?: {
    valor: string;
    explicacion: string;
    peso: "fraude" | "aviso" | "neutro";
  };
  fuentes: Source[];
};

// Lo que devuelve /api/verificar-url con los enlaces de un correo copiado.
type ResultadoEnlaces = {
  veredicto: Veredicto;
  titular: string;
  enlaces: { texto: string; resultado: ResultadoChat }[];
};

// Lo que devuelve /api/leer-captura: el texto de la imagen y las palabras que
// parecen enlaces sin dirección visible.
type Lectura = {
  texto: string;
  remitente: string | null;
  enlacesOcultos: string[];
};

type Contenido =
  | { autor: "usuario"; texto: string; ocultos?: number; imagen?: string }
  | { autor: "asistente"; texto: string }
  | { autor: "asistente"; lectura: Lectura }
  | {
      autor: "asistente";
      sinDireccion: {
        palabras: string[];
        veredicto?: Veredicto;
        enCaptura: boolean;
      };
    }
  | {
      autor: "asistente";
      resultado: ResultadoChat;
      etiqueta?: "mensaje" | "enlace";
    }
  | { autor: "asistente"; enlaces: ResultadoEnlaces };

type Mensaje = Contenido & { id: number; hora?: string };

const ETIQUETAS = {
  oficial_verificado: { texto: "Oficial verificado", variante: "default" },
  no_oficial: { texto: "No oficial", variante: "destructive" },
  no_determinable: { texto: "No determinable", variante: "outline" },
} as const;

// Textos de datos/mensajes-ejemplo.json, con las URL ya neutralizadas. El
// correo simula uno copiado con enlaces que enseñan una web y llevan a otra.
const EJEMPLOS: {
  etiqueta: string;
  texto?: string;
  enlaces?: Enlace[];
  captura?: string;
}[] = [
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
  // +44 7700 900xxx es un rango que Ofcom reserva para ficción: no es de nadie.
  {
    etiqueta: "SMS desde un número extranjero",
    texto:
      "De: +44 7700 900123\nDGT: Tiene una multa pendiente. Evite el recargo y abónela hoy en dgt-multas-pago[.]top/pago",
  },
  // SMS inventado, con el enlace escondido en «aquí».
  { etiqueta: "Captura de un SMS", captura: "/ejemplos/captura-sms-dgt.png" },
];

const SALUDO: Mensaje = {
  id: 0,
  autor: "asistente",
  texto:
    "Hola. Pega aquí el SMS, el correo o la dirección web que te ha llegado, o adjunta una captura de pantalla, y te digo si es oficial. No abro los enlaces ni guardo lo que envías.",
};

const MAX = 4000;
// Lo que aceptamos del usuario antes de reducirla en el navegador.
const MAX_IMAGEN = 20 * 1024 * 1024;

// Reduce la captura (lado largo de una captura de móvil: hasta 2560 px) y la
// pasa a JPEG para no mandar varios MB al servidor. Sigue siendo legible.
async function reducirImagen(archivo: Blob): Promise<string> {
  if (!archivo.type.startsWith("image/") || archivo.size > MAX_IMAGEN)
    throw new Error("Adjunta una imagen PNG, JPG o WebP de menos de 20 MB.");
  const bitmap = await createImageBitmap(archivo).catch(() => {
    throw new Error("No he podido abrir esa imagen. Prueba con otra.");
  });
  const escala = Math.min(1, 1280 / bitmap.width, 2560 / bitmap.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  return lienzo.toDataURL("image/jpeg", 0.85);
}

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
// Con menos palabras que esto fuera de las direcciones, lo pegado es solo un
// enlace («mira: bit.ly/x») y se analiza solo el enlace.
const PALABRAS_MENSAJE = 4;
const pareceDireccion = (palabra: string) =>
  /^(h(tt|xx)ps?:|www\.)|[a-z0-9](\.|\[\.\])[a-z]/i.test(palabra);

// Qué analizar de lo que ha llegado:
// - solo un enlace: el verificador de webs (que además mira en DNS los *.gob.es);
// - un mensaje: el verificador de mensajes y, aparte, cada enlace que traiga;
// - enlaces escondidos al pegar un correo (HTML): adónde llevan de verdad.
async function analizar(
  texto: string,
  {
    ocultos = [],
    enlaceOculto = false,
    remitente,
  }: { ocultos?: Enlace[]; enlaceOculto?: boolean; remitente?: string } = {},
): Promise<Contenido[]> {
  const palabras = texto.split(/\s+/).filter((p) => p && !pareceDireccion(p));
  const esMensaje = enlaceOculto || palabras.length >= PALABRAS_MENSAJE;
  const esCorreo = /^\s*(asunto|de|from|subject)\s*:\s*\S+@/im.test(texto);

  const tareas: (() => Promise<Contenido[]>)[] = [];
  const delEnlace = (direccion: string) =>
    pedir<ResultadoChat>("/api/verificar-url", { texto: direccion }).then(
      (resultado): Contenido => ({
        autor: "asistente",
        resultado,
        etiqueta: "enlace",
      }),
    );

  if (esMensaje)
    tareas.push(async () => {
      const resultado = await pedir<ResultadoChat>("/api/verificar-mensaje", {
        texto,
        tipo: esCorreo ? "email" : "sms",
        enlaceOculto,
        remitente,
      });
      const enlaces = (resultado.enlaces ?? []).slice(0, 3);
      const porEnlace = await Promise.allSettled(
        enlaces.map((e) => delEnlace(e.neutralizado)),
      );
      return [
        {
          autor: "asistente",
          resultado,
          etiqueta: enlaces.length ? "mensaje" : undefined,
        },
        ...porEnlace.flatMap((h) =>
          h.status === "fulfilled" ? [h.value] : [],
        ),
      ];
    });
  else if (!ocultos.length) {
    const direcciones = [
      ...new Set(
        [...resolverEnlaces(texto), ...resolverDominiosSueltos(texto)].map(
          (e) => e.original,
        ),
      ),
    ].slice(0, 3);
    if (!direcciones.length) direcciones.push(texto);
    for (const d of direcciones)
      tareas.push(async () => {
        const r = await delEnlace(d);
        return [{ ...r, etiqueta: undefined }];
      });
  }
  if (ocultos.length)
    tareas.push(async () => [
      {
        autor: "asistente",
        enlaces: await pedir<ResultadoEnlaces>("/api/verificar-url", {
          enlaces: ocultos,
        }),
      },
    ]);

  const hechas = await Promise.allSettled(tareas.map((t) => t()));
  return hechas.flatMap((h): Contenido[] =>
    h.status === "fulfilled"
      ? h.value
      : [
          {
            autor: "asistente",
            texto:
              h.reason instanceof Error
                ? h.reason.message
                : "No he podido comprobarlo. Inténtalo de nuevo.",
          },
        ],
  );
}

export function ChatEstafas({ textoInicial }: { textoInicial?: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [ocultos, setOcultos] = useState<Enlace[]>([]);
  const [adjunto, setAdjunto] = useState<string>();
  const [errorAdjunto, setErrorAdjunto] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const selector = useRef<HTMLInputElement>(null);
  const siguienteId = useRef(1);
  const historial = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLTextAreaElement>(null);

  // Texto que llega compartido (share_target de Android o ?text=): se añade
  // como mensaje del ciudadano y se analiza al montar, una sola vez.
  const inicialEnviado = useRef(false);
  useEffect(() => {
    const valor = textoInicial?.trim();
    if (!valor || inicialEnviado.current || cargando) return;
    inicialEnviado.current = true;
    enviar(undefined, valor);
    // Solo al montar: el texto compartido no cambia durante la vida del chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function adjuntar(archivo: Blob) {
    setErrorAdjunto(undefined);
    try {
      setAdjunto(await reducirImagen(archivo));
    } catch (error) {
      setErrorAdjunto(
        error instanceof Error
          ? error.message
          : "No he podido abrir esa imagen.",
      );
    }
  }

  // Una imagen pegada se adjunta; del HTML de un correo copiado salen los
  // enlaces con su texto visible.
  function alPegar(e: ClipboardEvent<HTMLTextAreaElement>) {
    const imagen = [...e.clipboardData.files].find((f) =>
      f.type.startsWith("image/"),
    );
    if (imagen) {
      if (!e.clipboardData.getData("text/plain")) e.preventDefault();
      adjuntar(imagen);
    }
    const html = e.clipboardData.getData("text/html");
    setOcultos(html ? enlacesDe(html) : []);
  }

  function alSoltar(e: DragEvent<HTMLFormElement>) {
    const imagen = [...e.dataTransfer.files].find((f) =>
      f.type.startsWith("image/"),
    );
    if (!imagen) return;
    e.preventDefault();
    adjuntar(imagen);
  }

  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) adjuntar(archivo);
    e.target.value = "";
  }

  async function enviar(
    e?: FormEvent,
    valor = texto,
    enlaces = ocultos,
    imagen = adjunto,
  ) {
    e?.preventDefault();
    const limpio = valor.trim();
    if ((!limpio && !imagen) || cargando || limpio.length > MAX) return;
    añadir({
      autor: "usuario",
      texto: limpio,
      ocultos: enlaces.length,
      imagen,
    });
    setTexto("");
    setOcultos([]);
    setAdjunto(undefined);
    setErrorAdjunto(undefined);
    setCargando(true);
    try {
      // La captura se lee primero; su texto sigue el mismo camino que si
      // se hubiera pegado.
      let lectura: Lectura | undefined;
      if (imagen)
        try {
          lectura = await pedir<Lectura>("/api/leer-captura", { imagen });
        } catch (error) {
          añadir({
            autor: "asistente",
            texto:
              error instanceof Error
                ? error.message
                : "No he podido leer la captura. Pega el texto.",
          });
          return;
        }
      if (lectura && !lectura.texto) {
        añadir({
          autor: "asistente",
          texto:
            "No he encontrado texto en la captura. Prueba con otra más nítida o pega el texto del mensaje.",
        });
        return;
      }
      if (lectura) añadir({ autor: "asistente", lectura });
      const enCaptura = !!lectura?.enlacesOcultos.length;
      const respuestas = await analizar(
        [limpio, lectura?.texto].filter(Boolean).join("\n\n").slice(0, MAX),
        {
          ocultos: enlaces,
          enlaceOculto: enCaptura,
          remitente: lectura?.remitente ?? undefined,
        },
      );
      for (const r of respuestas) añadir(r);

      // Un enlace sin dirección visible: lo ha visto el modelo en la captura
      // o las reglas en el texto («pulse aquí»). Se avisa aparte.
      const resultado = respuestas.find((r) => "resultado" in r)?.resultado;
      const frase = resultado?.enlaceSinDireccion?.frase;
      if (enCaptura || resultado?.enlaceSinDireccion)
        añadir({
          autor: "asistente",
          sinDireccion: {
            palabras: enCaptura
              ? lectura!.enlacesOcultos
              : frase
                ? [frase]
                : [],
            veredicto: resultado?.veredicto,
            enCaptura,
          },
        });
    } finally {
      setCargando(false);
      caja.current?.focus();
    }
  }

  // Un ejemplo se carga en la caja: se envía a mano, para enseñarlo paso a paso.
  async function cargarEjemplo(ejemplo: (typeof EJEMPLOS)[number]) {
    setTexto(ejemplo.texto ?? "");
    setOcultos(ejemplo.enlaces ?? []);
    setAdjunto(undefined);
    setErrorAdjunto(undefined);
    if (ejemplo.captura) {
      const imagen = await fetch(ruta(ejemplo.captura))
        .then((r) => r.blob())
        .then(reducirImagen)
        .catch(() => undefined);
      if (imagen) setAdjunto(imagen);
      else setErrorAdjunto("No he podido cargar la captura de ejemplo.");
    }
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
    setAdjunto(undefined);
    setErrorAdjunto(undefined);
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
              <BurbujaUsuario
                key={m.id}
                hora={m.hora}
                ocultos={m.ocultos}
                imagen={m.imagen}
              >
                {m.texto}
              </BurbujaUsuario>
            ) : (
              <BurbujaAsistente key={m.id} hora={m.hora}>
                {"resultado" in m ? (
                  <Resultado r={m.resultado} etiqueta={m.etiqueta} />
                ) : "enlaces" in m ? (
                  <ResultadoDeEnlaces r={m.enlaces} />
                ) : "lectura" in m ? (
                  <LecturaCaptura l={m.lectura} />
                ) : "sinDireccion" in m ? (
                  <EnlaceSinDireccion {...m.sinDireccion} />
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
                  onClick={() => cargarEjemplo(ejemplo)}
                >
                  {ejemplo.etiqueta}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Caja de escribir */}
        <form
          onSubmit={enviar}
          onDragOver={(e) => e.preventDefault()}
          onDrop={alSoltar}
          className="border-t bg-background p-3"
        >
          <label htmlFor="mensaje-chat" className="sr-only">
            Mensaje o dirección web
          </label>
          {adjunto && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-muted p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, no pasa por next/image */}
              <img
                src={adjunto}
                alt="Captura adjunta"
                className="size-12 rounded-lg object-cover object-top"
              />
              <p className="min-w-0 flex-1 text-sm">
                Captura lista. Leeré su texto al enviar.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar la captura"
                onClick={() => setAdjunto(undefined)}
              >
                <X />
              </Button>
            </div>
          )}
          <input
            ref={selector}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={alElegir}
          />
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Adjuntar una captura de pantalla"
              title="Adjuntar una captura de pantalla"
              disabled={cargando}
              onClick={() => selector.current?.click()}
              className="size-11 shrink-0 rounded-full"
            >
              <Paperclip className="size-5" />
            </Button>
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
              placeholder="Pega el SMS, el correo, la URL o una captura…"
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
              disabled={
                cargando || (!texto.trim() && !adjunto) || demasiadoLargo
              }
              className="h-11 shrink-0 rounded-full px-5 text-base"
            >
              Enviar
            </Button>
          </div>
          <p
            id="mensaje-chat-ayuda"
            className={cn(
              "mt-2 px-1 text-sm",
              demasiadoLargo || errorAdjunto
                ? "text-destructive"
                : "text-(--text-secondary)",
            )}
          >
            {errorAdjunto
              ? errorAdjunto
              : demasiadoLargo
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
  imagen,
}: {
  children: string;
  hora?: string;
  ocultos?: number;
  imagen?: string;
}) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-base text-primary-foreground">
        <span className="sr-only">Tú: </span>
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element -- data URL local, no pasa por next/image
          <img
            src={imagen}
            alt="Captura de pantalla enviada"
            className={cn(
              "max-h-72 w-auto rounded-lg bg-background",
              children && "mb-2",
            )}
          />
        )}
        {/* Texto plano: las URL que pega el ciudadano nunca se vuelven enlaces. */}
        {children && (
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            {children}
          </p>
        )}
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

// Lo que el modelo ha leído en la captura, para que el usuario lo compare.
function LecturaCaptura({ l }: { l: Lectura }) {
  return (
    <div className="grid gap-2">
      <p>He leído esto en la captura:</p>
      <blockquote className="rounded-xl bg-muted px-4 py-3 whitespace-pre-wrap [overflow-wrap:anywhere]">
        {l.remitente && (
          <span className="mb-1 block text-sm text-(--text-secondary)">
            Remitente: {l.remitente}
          </span>
        )}
        {l.texto}
      </blockquote>
      <p className="text-sm text-(--text-secondary)">
        Si algo no coincide con tu captura, pega el texto y lo compruebo de
        nuevo.
      </p>
    </div>
  );
}

// Un enlace sobre una palabra («aquí», «Pagar») no deja ver adónde lleva: en
// una captura no hay dirección que leer, y en un texto copiado se pierde.
function EnlaceSinDireccion({
  palabras,
  veredicto,
  enCaptura,
}: {
  palabras: string[];
  veredicto?: Veredicto;
  enCaptura: boolean;
}) {
  const varios = palabras.length > 1;
  const lista = palabras.map((p) => `«${p}»`).join(", ");
  return (
    <div className="grid gap-2 rounded-xl bg-(--warning) p-4 text-(--warning-foreground)">
      <p className="font-medium">
        {varios
          ? "Hay enlaces que no puedo comprobar"
          : "Hay un enlace que no puedo comprobar"}
      </p>
      <p>
        {enCaptura
          ? `En la captura, ${lista} ${varios ? "son enlaces" : "es un enlace"}, pero una imagen no muestra adónde ${varios ? "llevan" : "lleva"}.`
          : `El mensaje te manda a un enlace${lista ? ` (${lista})` : ""}, pero no se ve su dirección.`}{" "}
        No he podido comprobar adónde lleva.
      </p>
      <p>
        {veredicto === "no_oficial"
          ? "Con lo que se ve, el mensaje ya tiene señales de fraude: no lo pulses."
          : "No lo pulses hasta saber adónde lleva."}
      </p>
      <p>
        Para comprobarlo: en el móvil, mantén pulsado el enlace, elige «Copiar
        enlace» (sin abrirlo) y pégalo aquí.
      </p>
    </div>
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

const ETIQUETA_ANALISIS = {
  mensaje: "Análisis del mensaje",
  enlace: "Análisis del enlace",
} as const;

function Resultado({
  r,
  etiqueta,
}: {
  r: ResultadoChat;
  etiqueta?: "mensaje" | "enlace";
}) {
  // La conclusión sobre el remitente se enseña en su tarjeta, no repetida
  // entre los pasos ni en «Qué hacer».
  const delRemitente = r.remitente?.explicacion;
  const pasos = r.pasos.filter((p) => p !== delRemitente);
  const avisos = r.avisos.filter((a) => a !== delRemitente);
  return (
    <div className="grid gap-4 py-1">
      <div>
        {etiqueta && (
          <p className="mb-2 font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
            {ETIQUETA_ANALISIS[etiqueta]}
          </p>
        )}
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

      {r.remitente && <Remitente {...r.remitente} />}

      <ol className="grid gap-2">
        {pasos.map((paso, i) => (
          <li
            key={paso}
            className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2"
          >
            <span className="font-light text-brand tabular-nums">{i + 1}</span>
            <p className="[overflow-wrap:anywhere]">{paso}</p>
          </li>
        ))}
      </ol>

      <QueHacer veredicto={r.veredicto} consejo={r.consejo} avisos={avisos} />
      <WebOficial url={r.webOficial} entidad={r.entidad} />
      <Fuentes fuentes={r.fuentes} />
    </div>
  );
}

const PESO_REMITENTE = {
  fraude: { texto: "Señal de fraude", variante: "destructive" },
  aviso: { texto: "Sospechoso", variante: "outline" },
  neutro: { texto: "No lo confirma", variante: "secondary" },
} as const;

// Quién envía el mensaje y qué peso ha tenido en el veredicto.
function Remitente({
  valor,
  explicacion,
  peso,
}: {
  valor: string;
  explicacion: string;
  peso: "fraude" | "aviso" | "neutro";
}) {
  return (
    <div className="grid gap-1 rounded-xl p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-(--text-secondary)">Remitente</p>
        <Badge variant={PESO_REMITENTE[peso].variante}>
          {PESO_REMITENTE[peso].texto}
        </Badge>
      </div>
      <p className="font-mono [overflow-wrap:anywhere]">{valor}</p>
      <p>{explicacion}</p>
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
