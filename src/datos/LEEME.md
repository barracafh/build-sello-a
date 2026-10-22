# Datos del equipo (`src/datos/`)

Configuración y datos del equipo, separados del código de `src/lib/`. Al
arrancar, el verificador los combina con los de la organización en `datos/`
(raíz del repo, que no se edita).

| Fichero               | Qué hay aquí                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `dominios-extra.json` | Entidades y dominios oficiales que añade el equipo, sumados a la lista de la organización.          |
| `dominios-fraude.json` | Lista comunitaria de phishing activo (Phishing.Database, MIT), actualizada cada día por un workflow; no editar a mano. |
| `FUENTES.md`          | Cuadro de las fuentes que usa el verificador y qué puede concluir cada una.                        |
| `marcas.json`         | Tokens de marca que aparecen en dominios falsos (p. ej. `dgt`, `hacienda`) y a qué entidad remiten. |
| `acortadores.json`    | Acortadores de enlaces: salen `no_determinable`, nunca se expanden.                                 |
| `plataformas.json`    | Bases de sede electrónica compartidas: el inquilino no listado sale `no_determinable`.              |
| `organismos.json`     | Organismos suplantados y cómo se nombran en los mensajes.                                           |
| `senales.json`        | Señales de contenido de INCIBE: conceptos reutilizables y señales concluyentes o de aviso.          |
| `tlds.json`           | Extensiones baratas que generan aviso en la respuesta (p. ej. `.top`).                              |
| `fuentes.json`        | Fuentes genéricas de las respuestas y su orden.                                                     |
| `casos-extra.json`    | Casos de prueba del equipo, que se suman a los 10 de la organización en las pruebas.                |

**Para añadir cualquier cosa** — un dominio oficial, un caso de prueba, una
señal de contenido, una fuente, un acortador… — sigue las recetas con ejemplo
real de [`docs/anadir-datos.md`](../../docs/anadir-datos.md). No hace falta
tocar el código: editar el JSON correspondiente y comprobar con
`bun scripts/probar-mensajes.ts` y `bun test`.
