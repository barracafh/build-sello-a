"use client";

import { useState, type ClipboardEvent, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Fuentes, type Source } from "@/components/Fuentes";
import { ruta } from "@/config/sitio";
import { ComoComprobamos } from "@/components/ComoComprobamos";

type Veredicto = "oficial_verificado" | "no_oficial" | "no_determinable";
type Resultado = {
  veredicto: Veredicto;
  motivo: string;
  titular: string;
  consejo?: string;
  pasos: string[];
  avisos: string[];
  urlNeutralizada: string;
  entidad?: string;
  webOficial?: string;
  fuentes: Source[];
};
export type Enlace = { texto: string; href: string };
type ResultadoEnlaces = {
  veredicto: Veredicto;
  titular: string;
  enlaces: { texto: string; resultado: Resultado }[];
};

const ETIQUETAS = {
  oficial_verificado: { texto: "Oficial verificado", variante: "default" },
  no_oficial: { texto: "No oficial", variante: "destructive" },
  no_determinable: { texto: "No determinable", variante: "outline" },
} as const;

// Casos de prueba ficticios para la demo. El último simula un correo copiado
// con un botón que enseña una web y lleva a otra.
const EJEMPLOS: { etiqueta: string; texto: string; enlaces?: Enlace[] }[] = [
  { etiqueta: "https://sede.dgt.gob.es", texto: "https://sede.dgt.gob.es" },
  { etiqueta: "hxxps://dgt.es.multas-pago[.]com", texto: "hxxps://dgt.es.multas-pago[.]com" },
  { etiqueta: "https://mi-pueblo-ejemplo.com", texto: "https://mi-pueblo-ejemplo.com" },
  {
    etiqueta: "Correo con un enlace disfrazado",
    texto: "Tiene una multa pendiente. Consulte su expediente en sede.dgt.gob.es o pulse Pagar ahora.",
    enlaces: [
      { texto: "sede.dgt.gob.es", href: "https://dgt-expedientes-pago.top/consulta" },
      { texto: "Pagar ahora", href: "https://dgt-expedientes-pago.top/pago" },
    ],
  },
];

// Del HTML que guarda el portapapeles al copiar un correo, cada enlace con su
// texto visible. DOMParser no carga imágenes ni ejecuta scripts.
export function enlacesDe(html: string): Enlace[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.querySelectorAll<HTMLAnchorElement | HTMLAreaElement>("a[href], area[href]")]
    .map((a) => ({
      texto: (a.textContent || a.getAttribute("alt") || a.getAttribute("title") || "").trim(),
      href: a.getAttribute("href") ?? "",
    }))
    .filter((e) => /^https?:\/\//i.test(e.href));
}

export function VerificadorUrl() {
  const [texto, setTexto] = useState("");
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [resultado, setResultado] = useState<Resultado | ResultadoEnlaces>();
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);

  function alPegar(e: ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    setEnlaces(html ? enlacesDe(html) : []);
  }

  async function comprobar(e?: FormEvent, valor = texto, ocultos = enlaces) {
    e?.preventDefault();
    if (!valor.trim() && !ocultos.length) return;
    setCargando(true);
    setError(undefined);
    try {
      const res = await fetch(ruta("/api/verificar"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          ocultos.length ? { enlaces: ocultos } : { entrada: valor, tipo: "url" },
        ),
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
      <form onSubmit={comprobar} className="mt-10 grid gap-3">
        <label htmlFor="url" className="text-base font-medium">
          Dirección web, enlace o correo copiado
        </label>
        <Textarea
          id="url"
          name="url"
          value={texto}
          onPaste={alPegar}
          onChange={(e) => {
            setTexto(e.target.value);
            if (!e.target.value.trim()) setEnlaces([]);
          }}
          placeholder="sede.dgt.gob.es, o selecciona el correo entero, cópialo y pégalo aquí"
          autoComplete="off"
          spellCheck={false}
          rows={3}
          className="max-h-60 min-h-24 px-4 py-3 font-mono text-base md:text-base"
        />
        {enlaces.length > 0 && (
          <p className="text-base">
            He encontrado {enlaces.length}{" "}
            {enlaces.length === 1 ? "enlace" : "enlaces"} en lo que has pegado,
            también los que se esconden detrás de un texto o un botón. Comprobaré
            adónde llevan de verdad.
          </p>
        )}
        <Button
          type="submit"
          variant="sunset"
          size="lg"
          disabled={cargando}
          className="h-12 justify-self-start px-6 text-base max-md:w-full"
        >
          {cargando ? "Pasando la varita…" : "Pasar la varita"}
        </Button>
        <p className="text-[15px] text-(--text-secondary)">
          No abrimos ninguna dirección ni guardamos lo que pegas: solo leemos el
          texto.
        </p>
        <details className="text-[15px]">
          <summary className="cursor-pointer font-medium">
            ¿El enlace está escondido detrás de un botón?
          </summary>
          <ul className="mt-2 grid gap-1 pl-5 [list-style:disc]">
            <li>
              En el ordenador: selecciona el correo entero, cópialo y pégalo
              aquí. Leemos adónde lleva cada enlace sin abrirlo.
            </li>
            <li>
              En el móvil: mantén pulsado el botón o el enlace, elige «Copiar
              enlace» y pégalo aquí. No lo abras.
            </li>
          </ul>
        </details>
        <ComoComprobamos />
        <div className="flex flex-wrap items-center gap-2 text-[15px]">
          <span className="text-(--text-secondary)">Prueba con:</span>
          {EJEMPLOS.map((ejemplo) => (
            <Button
              key={ejemplo.etiqueta}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-auto min-h-7 max-w-full shrink py-1 text-left whitespace-normal [overflow-wrap:anywhere]",
                !ejemplo.enlaces && "font-mono",
              )}
              onClick={() => {
                setTexto(ejemplo.texto);
                setEnlaces(ejemplo.enlaces ?? []);
                comprobar(undefined, ejemplo.texto, ejemplo.enlaces ?? []);
              }}
            >
              {ejemplo.etiqueta}
            </Button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="mt-12">
        {error && <p className="text-lg">{error}</p>}
        {resultado &&
          ("enlaces" in resultado ? (
            <RespuestaEnlaces r={resultado} />
          ) : (
            <Respuesta r={resultado} />
          ))}
      </div>
    </>
  );
}

function Cabecera({ veredicto, titular }: { veredicto: Veredicto; titular: string }) {
  const etiqueta = ETIQUETAS[veredicto];
  return (
    <>
      <Badge variant={etiqueta.variante} className="font-mono uppercase">
        {etiqueta.texto}
      </Badge>
      <h2
        id="veredicto"
        className="mt-4 font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]"
      >
        {titular}
      </h2>
    </>
  );
}

function Pasos({ pasos }: { pasos: string[] }) {
  return (
    <ol className="grid gap-5">
      {pasos.map((paso, i) => (
        <li
          key={paso}
          className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 md:grid-cols-[32px_minmax(0,1fr)] md:gap-x-4"
        >
          <span className="text-[22px] leading-[1.1] font-light text-brand tabular-nums md:text-[26px]">
            {i + 1}
          </span>
          <p>{paso}</p>
        </li>
      ))}
    </ol>
  );
}

function QueHacer({ veredicto, consejo, avisos }: { veredicto: Veredicto; consejo?: string; avisos: string[] }) {
  if (!avisos.length && !consejo && veredicto === "oficial_verificado") return null;
  return (
    <Card render={<section />} className="gap-2 bg-muted px-6 py-6 text-base ring-0">
      <h3 className="text-sm font-medium text-(--text-secondary)">Qué hacer</h3>
      {consejo && <p>{consejo}</p>}
      {veredicto === "no_oficial" && <p>No pulses el enlace ni des datos. Bórralo.</p>}
      {avisos.map((aviso) => (
        <p key={aviso}>{aviso}</p>
      ))}
      {veredicto !== "oficial_verificado" && (
        <p>
          Si tienes dudas, llama gratis al 017 de INCIBE, de 8:00 a 23:00 todos
          los días.
        </p>
      )}
    </Card>
  );
}

// Una sola tarjeta con el sol por vista: la web buena. Es el único enlace.
function WebOficial({ url, entidad }: { url?: string; entidad?: string }) {
  if (!url) return null;
  return (
    <Card
      render={<section />}
      className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#e9d7fe_0%,rgba(233,215,254,0)_60%),#f9f5ff]"
    >
      <div className="min-w-0 flex-[1_1_260px]">
        <p className="text-sm font-medium">La web oficial</p>
        <h3 className="mt-1 text-lg leading-[1.35] font-medium">
          {entidad ?? "Punto de Acceso General de la Administración"}
        </h3>
        <p className="mt-1 font-mono text-sm">{new URL(url).hostname}</p>
      </div>
      <a
        href={url}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "max-md:w-full")}
      >
        Ir a la web oficial <span aria-hidden="true">↗</span>
      </a>
    </Card>
  );
}

function Respuesta({ r }: { r: Resultado }) {
  return (
    <section aria-labelledby="veredicto" className="text-lg [&>*+*]:mt-8">
      <div>
        <Cabecera veredicto={r.veredicto} titular={r.titular} />
        <p className="mt-3 text-[15px] text-(--text-secondary)">
          Dirección analizada (no es un enlace):
        </p>
        <p className="mt-1 font-mono text-base [overflow-wrap:anywhere]">
          {r.urlNeutralizada}
        </p>
      </div>
      <Pasos pasos={r.pasos} />
      <QueHacer veredicto={r.veredicto} consejo={r.consejo} avisos={r.avisos} />
      <WebOficial url={r.webOficial} entidad={r.entidad} />
      <Fuentes fuentes={r.fuentes} />
    </section>
  );
}

function RespuestaEnlaces({ r }: { r: ResultadoEnlaces }) {
  const resultados = r.enlaces.map((e) => e.resultado);
  // La web buena del organismo que más importa: el suplantado, si lo hay.
  const guia =
    resultados.find((x) => x.veredicto === "no_oficial" && x.webOficial) ??
    resultados.find((x) => x.webOficial);
  const fuentes = [
    ...new Map(resultados.flatMap((x) => x.fuentes).map((f) => [f.url, f])).values(),
  ];
  const consejo = resultados.find((x) => x.consejo)?.consejo;
  const avisos = [...new Set(resultados.flatMap((x) => x.avisos))];
  return (
    <section aria-labelledby="veredicto" className="text-lg [&>*+*]:mt-8">
      <div>
        <Cabecera veredicto={r.veredicto} titular={r.titular} />
        <p className="mt-3 text-[15px] text-(--text-secondary)">
          {r.enlaces.length === 1
            ? "He comprobado el enlace de lo que has pegado."
            : `He comprobado los ${r.enlaces.length} enlaces de lo que has pegado.`}
        </p>
      </div>

      <ol className="grid gap-4">
        {r.enlaces.map(({ texto, resultado: x }, i) => (
          <li key={x.urlNeutralizada}>
            <Card render={<section />} className="gap-3 px-6 py-6 text-base">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">
                  <span className="text-brand tabular-nums">{i + 1}</span> · Enlace
                </h3>
                <Badge
                  variant={ETIQUETAS[x.veredicto].variante}
                  className="font-mono uppercase"
                >
                  {ETIQUETAS[x.veredicto].texto}
                </Badge>
              </div>
              <dl className="grid gap-2">
                <div>
                  <dt className="text-sm text-(--text-secondary)">Lo que se ve</dt>
                  <dd className="[overflow-wrap:anywhere]">«{texto}»</dd>
                </div>
                <div>
                  <dt className="text-sm text-(--text-secondary)">
                    Adónde lleva de verdad (no es un enlace)
                  </dt>
                  <dd className="font-mono [overflow-wrap:anywhere]">{x.urlNeutralizada}</dd>
                </div>
              </dl>
              <ul className="grid gap-1 pl-5 text-[15px] [list-style:disc]">
                {x.pasos.slice(1).map((paso) => (
                  <li key={paso}>{paso}</li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ol>

      <QueHacer veredicto={r.veredicto} consejo={consejo} avisos={avisos} />
      <WebOficial url={guia?.webOficial} entidad={guia?.entidad} />
      <Fuentes fuentes={fuentes} />
    </section>
  );
}
