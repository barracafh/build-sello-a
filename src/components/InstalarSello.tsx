"use client";

import { useEffect, useState } from "react";
import { Copy, MessageSquareText, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const esIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  // Chrome y Firefox en iOS no son Safari: tampoco comparten con apps.
  !/crios|fxios|edgios/i.test(navigator.userAgent);

// Aviso discreto y fijo abajo, solo cuando Chrome ofrece instalar la app
// (beforeinstallprompt). Al instalarla, Sello aparece en «Compartir → Sello».
export function BannerInstalar() {
  const [evento, setEvento] = useState<EventoInstalar>();
  const [descartado, setDescartado] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches)
      setInstalada(true);
    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const alInstalar = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alOfrecer);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (!evento || descartado || instalada) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 md:inset-x-auto md:right-6 md:bottom-6 md:w-[420px]">
      <Card
        render={<aside />}
        aria-label="Instalar Varita"
        className="flex-row flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 text-base shadow-(--shadow-overlay)"
      >
        <p className="min-w-0 flex-[1_1_200px] text-[15px] leading-snug">
          Instala Varita en tu móvil para compartir desde tus mensajes
        </p>
        <div className="flex gap-2">
          <Button
            variant="sunset"
            size="sm"
            onClick={async () => {
              await evento.prompt();
              const { outcome } = await evento.userChoice;
              if (outcome === "accepted") setInstalada(true);
              setEvento(undefined);
            }}
          >
            Instalar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDescartado(true)}
          >
            Ahora no
          </Button>
        </div>
      </Card>
    </div>
  );
}

// iPhone: no soporta Web Share Target, así que no existe «Compartir → Sello».
// Ayuda en tres pasos para quien llega desde un iPhone.
export function AyudaCompartirIos() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (
      esIos() &&
      !window.matchMedia("(display-mode: standalone)").matches &&
      !window.matchMedia("(display-mode: fullscreen)").matches
    )
      setMostrar(true);
  }, []);

  if (!mostrar) return null;

  const pasos = [
    { icono: MessageSquareText, texto: "Mantén pulsado el mensaje recibido" },
    { icono: Copy, texto: "Toca «Copiar»" },
    { icono: Share, texto: "Vuelve aquí y pégalo en el recuadro" },
  ] as const;

  return (
    <Card
      render={<aside />}
      aria-label="Cómo comprobar un mensaje en iPhone"
      className="mt-8 grid gap-4 px-6 py-6 text-base ring-0 bg-muted"
    >
      <h2 className="text-lg leading-snug font-medium">
        ¿Te ha llegado en un iPhone? Comparte con Varita copiando el mensaje
      </h2>
      <ol className="grid gap-3">
        {pasos.map(({ icono: Icono, texto }, i) => (
          <li
            key={texto}
            className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-x-3"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-background ring-1 ring-foreground/10"
            >
              <Icono className="size-4.5 text-brand" strokeWidth={2.2} />
            </span>
            <p>
              <span className="mr-2 font-medium text-brand tabular-nums">
                {i + 1}
              </span>
              {texto}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-[15px] text-(--text-secondary)">
        En iPhone la compartición directa con una web no está disponible: es
        una limitación del sistema. Con copiar y pegar llega.
      </p>
    </Card>
  );
}
