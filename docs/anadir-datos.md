# Cómo añadir datos al verificador

El verificador está pensado para crecer sin tocar la lógica: las marcas, los
acortadores, las plataformas, los organismos, las señales de contenido, los
TLD avisados, las fuentes y los casos de prueba viven en **ficheros JSON de
`src/datos/`**, y el código de `src/lib/` solo los interpreta. Aquí tienes
las cuatro ampliaciones más habituales, con un ejemplo real de cada una.

> `datos/` (raíz del repo) es material de la organización y **no se edita**.
> Todo lo del equipo va en `src/datos/` y se suma a lo de la organización al
> arrancar. Ver indice rápido en [`src/datos/LEEME.md`](../src/datos/LEEME.md).

Contenido:

1. [Añadir un dominio oficial nuevo](#1-añadir-un-dominio-oficial-nuevo)
2. [Añadir un ejemplo o caso de prueba](#2-añadir-un-ejemplo-o-caso-de-prueba)
3. [Añadir una señal de contenido nueva](#3-añadir-una-señal-de-contenido-nueva)
4. [Añadir una fuente nueva](#4-añadir-una-fuente-nueva)
5. [Otras listas: acortadores, plataformas, marcas y TLD](#5-otras-listas-acortadores-plataformas-marcas-y-tld)
6. [La API](#6-la-api)
7. [Comprobar que todo sigue en verde](#7-comprobar-que-todo-sigue-en-verde)

---

## 1. Añadir un dominio oficial nuevo

**Dónde:** `src/datos/dominios-extra.json`, con el mismo esquema que cada
entidad de `datos/dominios-oficiales.json`.

**Pasos:**

1. Verifica en la web oficial del organismo qué dominios son suyos y guarda la
   página exacta que lo respalda en `fuente`.
2. Copia el objeto `ejemplo` del propio fichero a la lista `entidades` y
   cámbialo por los datos reales.
3. Si la entidad nueva puede ser suplantada, añade en `marcas.json` los
   tokens por los que la gente la escribe en dominios falsos y, si le llegan
   mensajes de fraude, un patrón en `organismos.json`.

**Ejemplo real** (así quedaría la entrada de la AEAT si no estuviera ya en la
lista de la organización):

```json
{
  "entidad": "Agencia Tributaria (AEAT)",
  "dominios": ["agenciatributaria.gob.es", "sede.agenciatributaria.gob.es", "agenciatributaria.es"],
  "web_oficial": "https://sede.agenciatributaria.gob.es",
  "fuente": "https://sede.agenciatributaria.gob.es/Sede/ayuda/Phishing.html",
  "nota": "agenciatributaria.es redirige (301) a la sede; la AEAT nunca pide datos por SMS o correo."
}
```

El campo `entidad` es el nombre que verá el ciudadano y el que une todo:
debe coincidir con los valores de `marcas.json` y `organismos.json` si la
entidad aparece en ellos.

Comprueba: `hxxps://aeat-devolucion[.]top` debe seguir saliendo `no_oficial`
y `https://sede.agenciatributaria.gob.es`, `oficial_verificado`.

## 2. Añadir un ejemplo o caso de prueba

**Dónde:** `src/datos/casos-extra.json`, con el mismo esquema que
`datos/mensajes-ejemplo.json`.

**Pasos:**

1. Añade un objeto a la lista `casos` con `id`, `tipo` (`web`, `sms` o
   `email`), `texto`, `esperado` y, si aplica, `url` o `url_prueba_sintetica`.
2. Ejecuta `bun scripts/probar-mensajes.ts`: si sale un veredicto distinto del
   `esperado`, o el texto activa una señal que no esperabas (apartado 3), o el
   dominio necesita entrar en la lista (apartado 1).

**Reglas:** URLs sintéticas, inventadas y neutralizadas (`hxxps://…[.]top`);
nunca URL reales de fraude ni datos personales. El caso entra también en
`bun test` sin tocar ningún código.

**Ejemplo real** (uno de los que ya incluye el fichero):

```json
{
  "id": "EX02",
  "tipo": "web",
  "texto": "hxxps://dgt.es.multas-pago[.]com",
  "url": "hxxps://dgt.es.multas-pago[.]com",
  "url_prueba_sintetica": null,
  "url_defanged": null,
  "esperado": "no_oficial",
  "pistas": "Trampa de dominio: empieza por dgt.es pero el dominio real es multas-pago.com."
}
```

## 3. Añadir una señal de contenido nueva

**Dónde:** `src/datos/senales.json`. Es la única fuente de señales: el motor
(`src/lib/resolver.ts`) es genérico y no sabe nada de campañas concretas.

**Pasos:**

1. Si el patrón se reutiliza, añádelo a `conceptos` y referéncialo como
   `@concepto`; si no, pon la expresión regular directamente (recuerda
   duplicar las barras invertidas en JSON: `\\b`).
2. Añade la señal a `senales` con estos campos:

| Campo            | Obligatorio | Qué hace                                                                                                   |
| ---------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `code`           | sí          | Motivo que devuelve la API (en inglés y con guiones bajos).                                                |
| `concluyente`    | sí          | `true` convierte el mensaje en `no_oficial` por sí sola; `false` solo añade un aviso.                       |
| `detalle`        | sí          | Lo que se le cuenta al ciudadano. `{organismo}` se sustituye por el nombre detectado.                       |
| `organismos`     | no          | Lista de `id` de `organismos.json`. Si falta, vale cualquier organismo detectado.                           |
| `sinOrganismo`   | no          | `true`: solo dispara si el mensaje NO nombra a un organismo de `organismos.json`.                          |
| `tipos`          | no          | `["sms"]`, `["email"]` o ambos si falta.                                                                   |
| `necesitaEnlace` | no          | `true`: solo dispara si el mensaje trae enlaces.                                                            |
| `sinEnlace`      | no          | `true`: solo dispara si el mensaje NO trae enlaces.                                                         |
| `todo`           | no          | TODAS estas condiciones deben encajar.                                                                      |
| `alguno`         | no          | Al menos UNA debe encajar (útil con `@enlace` alternado con `@pago`).                                       |
| `sobre`          | no          | `sin_acentos` (por defecto) o `texto_original`, si el patrón necesita tildes o símbolos como `¿` o `€`.     |
| `fuente`         | no          | `{nombre, url}` que se cita en la respuesta cuando la señal dispara (apartado 4).                           |

3. Comprueba con `bun scripts/probar-mensajes.ts` y `bun test` que los casos
   existentes siguen saliendo.

**Ejemplo real** — la campaña de «responder al correo para gestionar un
trámite» de Mi Carpeta Ciudadana (INCIBE-2026-165, contexto.md 5.4). Primero
el concepto, si no existe:

```json
"responder_correo": "responda|responde a este|responde al correo"
```

y después la señal (aviso, no concluyente, porque la fuente no la da por
fraude segura):

```json
{
  "code": "carpeta_ciudadana_responder",
  "concluyente": false,
  "todo": ["@responder_correo"],
  "detalle": "Mi Carpeta Ciudadana no gestiona trámites pidiendo responder a un correo: entra siempre desde su web oficial (INCIBE-2026-165).",
  "fuente": {
    "nombre": "INCIBE · Avisos a la ciudadanía",
    "url": "https://www.incibe.es/ciudadania/avisos"
  }
}
```

Al omitir `organismos`, la señal vale aunque el mensaje no nombre a uno de
los cinco organismos del apartado 4.2; si quieres limitarla a una entidad
nueva, pon su `id` de `organismos.json` (p. ej. `"organismos":
["carpeta-ciudadana"]` cuando esa entidad se dé de alta). No pongas una
lista vacía: significa «solo si el organismo detectado está en esta lista»,
y nunca lo estaría.

## 4. Añadir una fuente nueva

Hay tres sitios donde vive una fuente:

1. **Fuente genérica de las respuestas** (la que aparece siempre, como los
   avisos de INCIBE): `src/datos/fuentes.json`. Añade la entrada en `fuentes`
   y su clave en `orden` para controlar el orden de aparición.
2. **Fuente que respalda los dominios de una entidad**: el campo `fuente`
   (y opcional `fuente_adicional`) de cada entidad, en
   `datos/dominios-oficiales.json` (organización) o en
   `src/datos/dominios-extra.json` (equipo). Debe ser la página concreta que
   demuestra que esos dominios son del organismo, no la portada.
3. **Fuente que sostiene una señal**: el campo `fuente` de la señal en
   `senales.json`. Se cita en la respuesta solo cuando la señal dispara.

**Ejemplo real** — añadir la línea 017 de INCIBE como fuente genérica:

```json
"fuentes": {
  "incibe_avisos": { "nombre": "INCIBE · Avisos a la ciudadanía", "url": "https://www.incibe.es/ciudadania/avisos" },
  "incibe_017": { "nombre": "INCIBE · Línea de Ayuda en Ciberseguridad 017", "url": "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad" }
},
"orden": ["incibe_avisos", "incibe_017"]
```

## 5. Otras listas: acortadores, plataformas, marcas y TLD

- **Acortador nuevo:** `src/datos/acortadores.json`, dominio tal cual sin
  `www.` (p. ej. `"shorturl.at"`). Sale `no_determinable`
  (`acortador_no_resuelto`): nunca se expande.
- **Plataforma de sede compartida:** `src/datos/plataformas.json`, la base
  completa (p. ej. `"sedelectronica.es"`). El inquilino no listado sale
  `no_determinable` (`plataforma_compartida`).
- **Marca suplantada:** `src/datos/marcas.json`, clave = token tal como se
  escribe en dominios falsos, valor = nombre exacto de la entidad en la lista
  de dominios. Añádelo cuando una entidad nueva empieza a suplantarse.
- **TLD barato avisado:** `src/datos/tlds.json`. Añade la extensión a `tlds`;
  el texto del aviso admite el comodín `{tld}`.

## 6. La API

Un solo endpoint genérico, los dos alias de siempre y la health:

| Endpoint                | Cuerpo                                            | Uso                                                |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `POST /api/verificar`   | `{"entrada": "…", "tipo": "url" \| "web" \| "sms" \| "email"}` | El recomendado. `web` es alias de `url`. |
| `POST /api/verificar-url`  | `{"texto": "…"}`                               | Alias de compatibilidad de `url`.                  |
| `POST /api/verificar-mensaje` | `{"texto": "…", "tipo": "sms" \| "email"}`  | Alias de compatibilidad de `sms`/`email` (`tipo` falta → `sms`). |
| `GET /api/health`       | —                                                 | Estado del despliegue (para el paso de operaciones). |

Los tres de verificación devuelven la misma forma de respuesta (`veredicto`,
`motivo`, `titular`, `pasos`, `avisos`, `fuentes`, …) porque los tres pasan
por `src/lib/verificar.ts`, que enruta al verificador adecuado. Los límites
de tamaño se aplican por tipo (2.000 caracteres para URL, 4.000 para
mensajes). Enrutar un tipo nuevo de entrada ahí es añadir una rama en
`verificar()`.

### Contrato de errores

Cualquier respuesta que no sea un veredicto lleva SIEMPRE esta forma:

```json
{ "error": "mensaje humano en español (es lo que muestra el front)",
  "codigo": "codigo_estable_agnostico_de_idioma",
  "detalle": "opcional, más contexto técnico" }
```

Códigos de motivo estables (los añade `src/lib/api.ts`, que es donde viven
la validación, las cabeceras y los handlers de las tres rutas):

| Código                     | HTTP | Qué pasa                                                            |
| -------------------------- | ---- | ------------------------------------------------------------------- |
| `json_invalido`            | 400  | El cuerpo no es JSON o no es un objeto.                             |
| `entrada_requerida`        | 422  | Falta el campo de texto (`entrada` o `texto`).                      |
| `entrada_vacia`            | 422  | El campo de texto está en blanco.                                   |
| `entrada_demasiado_larga`  | 422  | Más de 2.000 caracteres (URL) o 4.000 (mensajes).                   |
| `tipo_no_valido`           | 422  | `tipo` no es uno de `url`, `web`, `sms`, `email` (o `sms`/`email` en el alias de mensajes). |
| `entrada_no_reconocida`    | 422  | En la entrada no hay nada que el verificador sepa leer.             |
| `enlaces_vacios`           | 422  | `enlaces` llegó vacío.                                              |
| `enlaces_no_validos`       | 422  | Los enlaces no llevan `{texto, href}` o `href` supera 2.000 caracteres. |
| `demasiados_enlaces`       | 422  | Más de 50 enlaces por petición.                                     |
| `enlaces_no_reconocidos`   | 422  | En los enlaces no hay nada que el verificador sepa leer.            |
| `demasiadas_peticiones`    | 429  | Límite por IP superado (ver más abajo).                             |

Se validó con un validador propio (`src/lib/api.ts`) en vez de zod: los
cuerpos son un objeto plano con dos o tres campos y zod añadiría una
dependencia nueva y movimiento en `bun.lock` para el mismo trabajo.

### Cabeceras, CORS y límite de peticiones

- **Cabeceras de seguridad** en todas las respuestas de la API (también en
  los errores): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer` y `Cache-Control: no-store`.
- **CORS cerrado**: la API solo se consume desde la propia herramienta (mismo
  origen), así que no se emite ningún `Access-Control-Allow-Origin`. Cada
  ruta responde a `OPTIONS` con `204` y su lista `Allow`.
- **Límite por IP**: 30 peticiones por minuto con ventana deslizante. Al
  superarlas, `429` con código `demasiadas_peticiones` y cabecera
  `Retry-After` (segundos). Implementación en `src/lib/limite.ts`: SOLO
  contadores en memoria, nunca se escribe la IP en disco, base de datos ni
  logs (regla de plataforma: no se guarda nada del ciudadano). En serverless
  cada instancia lleva su propio mapa: el límite es **por instancia**, no
  global, y sirve como protección básica antiautomatización, no como tope
  estricto.

### Regla `*.gob.es` y DNS

La regla reservada `*.gob.es` (Orden ITC/1542/2005) se comprueba con una
consulta DNS al host, con techo de tiempo de ~2 s (`AbortSignal.timeout`, en
`src/lib/verificar.ts`). La consulta nunca abre la web analizada: solo
pregunta por su nombre. Tres salidas:

| Situación                          | `motivo`                    | Veredicto         |
| ---------------------------------- | --------------------------- | ----------------- |
| El host existe                     | `regla_gob_es`              | `oficial_verificado` |
| El DNS responde que no existe      | `gob_es_inexistente`        | `no_determinable` |
| La consulta expira o falla (red)   | `gob_es_dns_no_confirmado`  | `no_determinable` |

Nunca se lanza 500 ni se cuelga la petición: si el DNS no responde, el
veredicto se degrada y el provider `dns_gob_es` queda «degradado» en la
health durante unos minutos.

### `GET /api/health`

Datos operativos del despliegue, sin nada de lo que envía el ciudadano:

```json
{
  "estado": "ok",
  "version": "0.0.0",
  "commit": "sha del despliegue en Vercel, si lo inyecta la plataforma",
  "datos": {
    "versionListaDominios": "2026-10-18",
    "entidades": 25,
    "dominios": 54,
    "senalesContenido": 18
  },
  "providers": [
    { "nombre": "dns_gob_es", "opcional": false, "estado": "operativo" },
    { "nombre": "safe_browsing", "opcional": true, "estado": "no_configurado" }
  ]
}
```

`estado` de un provider: `operativo`, `degradado` (ha fallado hace poco) o
`no_configurado` (opcional y aún sin clave/implementación). Los providers
viven en `src/lib/providers.ts`: añadir uno nuevo es añadir un objeto a
`PROVIDERS` y la health lo mostrará sin tocar la ruta.

## 7. Comprobar que todo sigue en verde

```sh
bun scripts/probar-mensajes.ts   # los 10 casos de la organización + los del equipo
bun test                         # lo mismo, más la API (contrato, 429, DNS, health)
bun run typecheck                # tipos
bun run build                    # tiene que pasar antes de cada push
```

Si `bun scripts/probar-mensajes.ts` devuelve 14/14 (o más, según tus casos),
todo está absorvido.
