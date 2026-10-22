import fraudes from "@/datos/dominios-fraude.json";

// Resumen de src/datos/FUENTES.md: qué fuente puede decir qué. Lo usan el
// verificador de webs y el chat.
export function ComoComprobamos() {
  return (
    <details className="text-[15px]">
      <summary className="cursor-pointer font-medium">
        ¿Cómo lo comprobamos?
      </summary>
      <ol className="mt-2 grid gap-1 pl-5 [list-style:decimal]">
        <li>
          <strong className="font-medium">Lista oficial.</strong> Cada dominio
          está respaldado por la web del propio organismo. Es lo único que nos
          permite decir «oficial» y de quién.
        </li>
        <li>
          <strong className="font-medium">Dominios .gob.es.</strong> Por norma,
          solo los registran administraciones. Comprobamos además que la
          dirección existe.
        </li>
        <li>
          <strong className="font-medium">Señales de fraude.</strong> Las
          trampas que publica INCIBE: el nombre de un organismo en un dominio
          ajeno, letras de otro alfabeto, direcciones disfrazadas.
        </li>
        <li>
          <strong className="font-medium">Lista de phishing activo.</strong>{" "}
          {fraudes.dominios.length} dominios que imitan a organismos españoles,
          de {fraudes.origen} (lista comunitaria, se actualiza cada día
          {fraudes.actualizado &&
            `; última, ${new Date(fraudes.actualizado).toLocaleDateString("es-ES", { timeZone: "UTC" })}`}
          ). Solo sirve para decir «no oficial», nunca «oficial».
        </li>
      </ol>
      <p className="mt-2 text-(--text-secondary)">
        Si nada de esto lo confirma, te lo decimos: no podemos asegurarlo.
      </p>
    </details>
  );
}
