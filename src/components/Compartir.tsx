"use client";

import { useEffect, useState } from "react";
import { ChatEstafas } from "@/components/ChatEstafas";

const CLAVE = "sello-compartido";
const MAX = 4000;

// Vista de /compartir. El texto compartido puede llegar por dos caminos:
// - sessionStorage («sello-compartido»), que dejó el POST del share target:
//   así el SMS no pasa por la URL ni por ningún log.
// - la query ?text=… (respaldo sin JavaScript, enlaces manuales y pruebas).
// En cuanto llega, se lanza el análisis solo. Sin texto, el chat cae
// amablemente a su formulario normal.
export function Compartir({ textoGet }: { textoGet: string }) {
  const [texto, setTexto] = useState(textoGet);

  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(CLAVE);
      sessionStorage.removeItem(CLAVE);
      const datos = bruto ? (JSON.parse(bruto) as { text?: string }) : null;
      const compartido = datos?.text?.trim();
      if (compartido) setTexto(compartido.slice(0, MAX));
    } catch {
      // Sin sesión (o contenido raro): seguimos con la query o el formulario.
    }
  }, []);

  // La clave fuerza a remontar el chat cuando cambia el texto, para que el
  // análisis se lance una sola vez y con el texto definitivo.
  return <ChatEstafas key={texto} textoInicial={texto || undefined} />;
}
