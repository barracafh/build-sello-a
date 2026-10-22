import { Badge } from "@/components/ui/badge";
import { ruta } from "@/config/sitio";
import ficha from "../../ficha.json";

// Cabecera común de todas las vistas: icono y nombre de ficha.json.
export function Cabecera() {
  return (
    <header className="mx-auto flex min-h-20 max-w-(--container-content) flex-wrap items-center justify-between gap-4 px-(--page-gutter) py-4">
      {/* Logo de Varita (símbolo de la varita y nombre), exportado de Varita DS. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ruta("/logo-varita.svg")}
        alt={ficha.nombre}
        width={128}
        height={46}
        className="h-10 w-auto"
      />
      <Badge variant="outline">
        {ficha.datos === "reales" ? "Datos públicos" : "Datos simulados"}
      </Badge>
    </header>
  );
}
