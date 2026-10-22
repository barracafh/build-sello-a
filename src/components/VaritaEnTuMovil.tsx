"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Enlace directo al APK. Al llevar la versión en el nombre (y esquivar así la
// caché de GitHub), toca actualizarlo cuando se suba una nueva.
const APK = "https://github.com/barracafh/build-sello-a/raw/main/apk/Varita-v1.3.apk";

// Tarjeta discreta con el estado de la app móvil: Android instalable (PWA en
// Chrome, o APK directo en teléfonos sin Google) e iPhone en progreso.
export function VaritaEnTuMovil() {
  const [esIos, setEsIos] = useState(false);

  useEffect(() => {
    setEsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  return (
    <Card
      render={<aside />}
      aria-label="Varita en tu móvil"
      className="mt-8 grid gap-4 px-6 py-6 text-[15px] ring-0 bg-muted"
    >
      <h2 className="text-lg leading-snug font-medium">Varita en tu móvil</h2>

      <div className="grid gap-1">
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          Android
        </p>
        <p>
          Instálala desde Chrome: te saldrá el aviso abajo, o en el menú
          «Añadir a pantalla de inicio». Aparecerá en Compartir y podrás
          enviarle los mensajes directamente.
        </p>
        <p>
          ¿Tu teléfono viene sin Google (Huawei y otros)? Descarga la app
          directa:
        </p>
        <a
          href={APK}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-auto min-h-9 justify-self-start py-1.5",
          )}
        >
          Descargar la app de Android (APK)
        </a>
      </div>

      {!esIos && (
        <div className="grid gap-1">
          <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
            iPhone
          </p>
          <p>
            En progreso: Apple no permite todavía compartir directamente con
            una web. Mientras tanto, copia el mensaje y pégalo aquí en el
            chat: el resultado es el mismo.
          </p>
        </div>
      )}
    </Card>
  );
}
