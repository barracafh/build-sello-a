# Varita · Destapa el truco antes de pinchar

Herramienta del squad `sello-a` para el Build night BARRACA x SOTI (track **Sello + estafas**). Comprueba si un SMS, un correo, una web o una captura de pantalla que dice venir de un organismo público es oficial y, si no lo es, cuál es la web buena.

Publicada en **https://build.barraca.house/sello-a**. Herramienta experimental. No es un servicio oficial.

## En media página

**El problema.** Cada semana llegan SMS y correos que suplantan a la DGT, Hacienda, la Seguridad Social o Correos para robar datos y dinero. Distinguir `dgt.es.multas-pago.com` de `dgt.es`, o saber si un «pulse aquí» es de fiar, exige conocimientos que la mayoría no tiene, y el texto bien redactado no prueba quién lo envía.

**Para quién.** Cualquier persona que recibe un mensaje dudoso y quiere saber, antes de pinchar, si es oficial. Pensado para quien no sabe leer un dominio: puede pegar el mensaje, subir una captura o reenviarlo por WhatsApp, y recibe un veredicto claro con su motivo.

**Qué hemos hecho.**

- Un verificador de webs y otro de mensajes, deterministas, que nunca abren lo que analizan. Dan `oficial_verificado`, `no_oficial` o `no_determinable`, con el motivo, la web oficial buena y las fuentes. Ante la duda, `no_determinable`: el peor error es llamar oficial a algo que no lo es.
- Un chat que acepta texto o capturas de pantalla, analiza por separado el mensaje y cada uno de sus enlaces, tiene en cuenta el remitente y avisa de los enlaces que no se ven («pulse aquí»).
- Un bot de WhatsApp, una PWA que aparece en la hoja de Compartir del móvil (y una app Android mínima para los teléfonos sin Google), y una API única `/api/verificar`.
- Datos separados de la lógica en `src/datos/`, una lista comunitaria de phishing activo que se actualiza cada día y 171 tests más 18 casos de ejemplo.

**Qué falta para producción.**

- **Telegram:** la portada lo anuncia, pero todavía no hay bot.
- **WhatsApp:** el bot solo contesta a una lista cerrada de números o a un grupo (`WHATSAPP_PERMITIDOS`, `WHATSAPP_GRUPO`), su número no se publica y depende de una instancia propia de Evolution API.
- **Next.js:** actualizar de 16.4.0 a 16.4.2 (PR #3). La build falla a veces con `SecurityFatalError` por una vulnerabilidad conocida.
- **Fuentes por implementar:** Google Safe Browsing v5 y RDAP (ver [`src/datos/FUENTES.md`](src/datos/FUENTES.md)).
- **Capturas:** las lee un modelo de IA de un tercero (HelmCode); puede leer mal y la imagen sale del servidor. Hace falta un acuerdo de tratamiento o un lector propio.
- **Límite de peticiones y métricas:** viven en la memoria de cada instancia; para producción, un almacén compartido.
- **Lista blanca:** algunos dominios de `datos/dominios-oficiales.json` se confirmaron solo con un resultado de búsqueda (lo indica su campo `notas`). Hay que revisarlos.
- **App Android:** está firmada con una clave de demo que está en el repo; no sirve para publicar.
- **Diseño:** Varita cambia los tokens y la tipografía de Sol (`src/styles/tema.css`). Si la plataforma exige Sol, hay que volver a él.

## Qué hace

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Verificador de webs | Portada, pestaña **Web** | Comprueba una dirección contra la lista oficial, la regla `*.gob.es` (con DNS), las trampas de dominio y la lista de phishing. Lee también los enlaces escondidos de un correo copiado (el HTML del portapapeles). |
| Chat | Portada, pestaña **Chat** | Texto o captura (clip, pegar o arrastrar). Analiza el mensaje y cada enlace por separado, el remitente y los enlaces sin dirección visible. Los ejemplos se cargan en la caja para hacer la demo paso a paso. |
| Lectura de capturas | `src/lib/leer-captura.ts`, `/api/leer-captura` | El modelo `glm5.3-flash` de HelmCode transcribe el texto, el remitente y las palabras con enlace oculto. Solo lee: el veredicto lo dan las reglas. |
| Remitente | `src/lib/remitente.ts` | Un número extranjero que habla de multas o pagos es señal de fraude; un móvil español que dice ser un organismo es sospechoso (y fraude si trae enlace); un nombre como «DGT» no confirma nada porque se puede falsificar. |
| Enlaces sin `http` | `src/lib/resolver.ts` | Detecta `www.…`, dominios sueltos y acortadores (`bit.ly/…`), y frases como «pulse aquí» o «el siguiente enlace» cuando no se ve la dirección. |
| Bot de WhatsApp | `/api/whatsapp`, `src/lib/whatsapp.ts` | Webhook de Evolution API. Responde a textos y a capturas (las descarga, las lee y contesta). |
| Compartir desde el móvil | `/compartir`, `src/app/manifest.ts`, `apk/` | PWA con `share_target`: «Compartir → Varita» abre el chat con el mensaje. `apk/` es un envoltorio Android para teléfonos sin Google Play Services. |
| API | `POST /api/verificar` | `{"entrada": "…", "tipo": "url" \| "web" \| "sms" \| "email"}`. Alias: `/api/verificar-url` y `/api/verificar-mensaje` (este acepta además `remitente` y `enlaceOculto`). `/api/health` y `/api/stats` dan estado y métricas agregadas. |

## Cómo decide

Solo una fuente oficial puede decir «oficial»; una comunitaria solo puede decir «no oficial». Por orden: la lista de dominios oficiales de la organización, la regla `*.gob.es` (Orden ITC/1542/2005) comprobando que el dominio existe, las señales de fraude publicadas por INCIBE y la lista comunitaria [Phishing.Database](https://github.com/Phishing-Database/Phishing.Database), filtrada a organismos españoles y actualizada cada día por `.github/workflows/actualizar-fraude.yml`. El detalle y los criterios están en [`src/datos/FUENTES.md`](src/datos/FUENTES.md); cómo añadir datos sin tocar código, en [`docs/anadir-datos.md`](docs/anadir-datos.md).

## Privacidad

No se guarda lo que envía el ciudadano: ni base de datos ni logs con su texto o sus imágenes. Las direcciones analizadas no se abren, no se siguen sus redirecciones y se muestran neutralizadas (`hxxps://ejemplo[.]com`), nunca como enlace. El límite por IP y las métricas son solo contadores en memoria. Los números de teléfono y correos de los ejemplos y los tests son inventados o de dominios reservados (`example.com`).

## Arrancar y probar

Con Bun y Node 22 o superior:

```sh
bun install --frozen-lockfile
bun run dev                     # http://localhost:3000/sello-a
bun test                        # tests unitarios y de la API
bun scripts/probar-mensajes.ts  # casos de datos/ y src/datos/casos-extra.json
bun run build                   # tiene que pasar antes de cada push
```

Variables en `.env.local` (nunca se sube; en la versión publicada ya están puestas):

| Variable | Para qué |
| --- | --- |
| `HELMCODE_API_KEY`, `HELMCODE_MODEL`, `HELMCODE_BASE_URL` (opcional) | Lectura de capturas con IA |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `WHATSAPP_WEBHOOK_TOKEN` | Bot de WhatsApp |
| `WHATSAPP_PERMITIDOS`, `WHATSAPP_GRUPO` | A quién contesta el bot (cerrado si faltan) |
| `SAFE_BROWSING_API_KEY` | Reservada para Google Safe Browsing v5 (aún no se usa) |

La IA se llama solo desde el servidor (`src/lib/ia.ts`). Ninguna clave lleva el prefijo `NEXT_PUBLIC_`.

## Publicar y entregar

Cada push a `main` se publica solo en `https://build.barraca.house/sello-a`. La CLI del evento revisa las seis reglas y entrega la ficha (necesita `gh auth login`):

```sh
curl -fsSL https://build.barraca.house/instalar.sh | sh
buildnight ficha validar   # ficha.json contra el esquema
buildnight revisar         # las seis reglas de la plataforma
buildnight registrar       # entrega la ficha
```

`ficha.json` describe la herramienta (nombre, frase, icono, track, equipo, URL, fuentes y `datos`). No cambiéis `equipo`: de él sale la ruta. Conservad `.buildnight/plantilla.json`.

## Diseño

Parte de Sol, el sistema visual de [Reforma Digital](https://reforma-digital.es) (origen y licencia en [AVISO.md](AVISO.md)), con la identidad propia de Varita: Space Grotesk y Space Mono, y una paleta morada en `src/styles/tema.css`. Los componentes son los de `src/components/ui/` (shadcn/ui con Base UI). Las reglas de la plataforma están en [AGENTS.md](AGENTS.md).
