import {
  esTipoEntrada,
  limiteCaracteres,
  TIPOS_ENTRADA,
  verificar,
  verificarListaEnlaces,
} from "../../../lib/verificar";

// Endpoint único y genérico. POST {"entrada": "…", "tipo": "url" | "web" |
// "sms" | "email"} devuelve el veredicto ("web" es alias de "url"); para los
// enlaces de un correo copiado, POST {"enlaces": [{texto, href}]}.
// No se guarda ni se registra nada de lo que envía el usuario.
// Documentación: docs/anadir-datos.md (apartado «La API»).
export async function POST(req: Request) {
  const { entrada, tipo, enlaces } = await req.json().catch(() => ({}));

  if (Array.isArray(enlaces) && enlaces.length) {
    const validos = enlaces
      .slice(0, 50)
      .filter(
        (e): e is { texto: string; href: string } =>
          typeof e?.texto === "string" && typeof e?.href === "string" && e.href.length <= 2000,
      );
    const { status, cuerpo } = await verificarListaEnlaces(validos);
    return Response.json(cuerpo, { status });
  }

  if (typeof entrada !== "string" || !entrada.trim())
    return Response.json(
      { error: "Pega la dirección web o el mensaje que quieres comprobar." },
      { status: 400 },
    );

  if (!esTipoEntrada(tipo))
    return Response.json(
      { error: `Tipo no reconocido. Usa uno de: ${TIPOS_ENTRADA.join(", ")}.` },
      { status: 400 },
    );

  const limite = limiteCaracteres(tipo);
  if (entrada.length > limite)
    return Response.json(
      {
        error:
          tipo === "url" || tipo === "web"
            ? "Pega una dirección web de hasta 2.000 caracteres."
            : "Pega un SMS o un correo de hasta 4.000 caracteres.",
      },
      { status: 400 },
    );

  const { status, cuerpo } = await verificar(entrada, tipo);
  return Response.json(cuerpo, { status });
}
