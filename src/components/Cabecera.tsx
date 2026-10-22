import { Badge } from "@/components/ui/badge";
import ficha from "../../ficha.json";

// Cabecera común de todas las vistas: icono y nombre de ficha.json.
export function Cabecera() {
  return (
    <header className="mx-auto flex min-h-20 max-w-(--container-content) flex-wrap items-center justify-between gap-4 px-(--page-gutter) py-4">
      <span className="inline-flex items-center gap-3 text-lg leading-tight font-semibold tracking-tight">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand font-mono text-xl text-white"
        >
          {ficha.icono}
        </span>
        {ficha.nombre}
      </span>
      <Badge variant="outline">
        {ficha.datos === "reales" ? "Datos públicos" : "Datos simulados"}
      </Badge>
    </header>
  );
}
