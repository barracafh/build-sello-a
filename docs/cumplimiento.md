# Cumplimiento · Sello (squad sello-a)

Auditoría de cumplimiento del verificador de webs y mensajes frente a los objetivos de `SETUP.md`, las reglas de plataforma de `AGENTS.md` y el algoritmo de referencia de `contexto.md` (§5). Solo documenta: no cambia código (salvo anotar lo que habría que tocar).

- **Fecha:** 22/10/2026 · **Rama:** `docs/cumplimiento` · **Commit auditado:** `0be1c63`
- **Método:** se ejecutó de verdad cada comprobación que se cita. Local: `bun run dev` y llamadas a `/sello-a/api/verificar-url` y `/sello-a/api/verificar-mensaje` con `curl`; lógica idéntica a la que usa la UI (mismo código en `src/lib/`).

## 1. Resumen ejecutivo

| Verificación                         | Resultado                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `bun scripts/probar-mensajes.ts`     | **10/10** casos de `datos/mensajes-ejemplo.json` correctos                |
| `bun run build`                      | Pasa (con aviso de vulnerabilidad conocida de Next.js, ver §5)            |
| Tabla §5.3 de `contexto.md` (18 URL) | **15/18** veredicto exacto · 2/18 caen en el fallback correcto del §5.2.6 · **1/18 desviación** (`portalseiq[.]eu[.]cc`) |
| Reglas de plataforma                 | Cumplidas (fuentes, neutralización, no abrir URLs, no guardar, duda no acusa, aviso experimental) |
| Pasos §5.2                           | 8 de 12 implementados; 4 ausentes o parciales (5, 9, 11 y parte de 4 y 6) |
| E2E en navegador (320 px)            | Sin scroll horizontal; aviso, botón «Avísanos», fuentes y 017 visibles    |

Los dos riesgos demo-relevantes: **(1)** el caso `portalseiq[.]eu[.]cc` sale `no_determinable` porque no hay paso 11 (indicadores publicados), y **(2)** la imitación de marca acusa sin señal independiente, al revés de lo que exige §5.2.10.

## 2. Objetivos de SETUP.md («Hecho cuando…»)

### Pieza «¿Esta web es oficial?»

| Criterio                                                        | Estado | Evidencia                                                                                                   |
| --------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Distingue coincidencia exacta                                   | ✅     | `https://sede.seg-social.gob.es/` → `oficial_verificado`, motivo `en_allowlist`                              |
| Distingue subdominio válido                                     | ✅     | `https://dehu.redsara.es/` → `oficial_verificado`; `sede.agenciatributaria.gob.es/…/Phishing.html` → oficial |
| No equipara desconocido con fraude                              | ✅     | `https://mi-pueblo-ejemplo[.]com/` → `no_determinable`; `https://ugt.es/` y `https://cgt.es/` → `no_determinable` |
| Muestra la URL analizada neutralizada y sin enlace              | ✅     | Respuesta con `urlNeutralizada: "hxxps://www[.]dgt[.]es/"`; los únicos `href` de la UI son `webOficial` y fuentes |
| Da la web oficial correcta                                      | ✅     | `dgt-es@ejemplo[.]top` → `webOficial: https://sede.dgt.gob.es`; `correos.com` → `www.correos.es`              |

### Pieza «¿Este mensaje es de verdad?»

| Criterio                                                       | Estado | Evidencia                                                                                          |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Acierta el resultado `esperado` de los 10 casos                | ✅     | `bun scripts/probar-mensajes.ts` → 10/10                                                            |
| Explica el motivo                                              | ✅     | Respuesta con `motivo` y `pasos` numerados; comprobado en la UI (SMS multa DGT → 4 pasos explicados) |
| Ante la duda, remite a la web oficial y al 017                 | ✅     | SMS legítimo AEAT → `no_determinable` con web oficial; la UI muestra «llama gratis al 017 de INCIBE» en ambas pestañas |

### Requisitos de la demo

- Veredicto + motivo + web oficial correcta: ✅ (JSON y UI).
- «Un dominio desconocido o un mensaje bien redactado, sin otra señal, salen `no_determinable`»: ✅ (mi-pueblo-ejemplo; aviso legítimo AEAT y SEPE).
- Trampas de dominio (`dgt.es.multas-pago[.]com`): ✅ → `no_oficial`, motivo `marca_como_subdominio`.
- **Falta para la demo:** dominio del tipo `portalseiq[.]eu[.]cc` (indicador publicado por la Seguridad Social) sale `no_determinable`; ver §4.1.

## 3. Reglas de plataforma (AGENTS.md y SETUP.md)

| Regla                                                        | Estado | Evidencia                                                                                                                                |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Fuentes oficiales en cada respuesta (`<Fuentes />`)          | ✅     | Verificador de webs y de mensajes renderizan `<Fuentes />` con la fuente de la entidad + INCIBE avisos + 017                              |
| No abrir, seguir, expandir ni conectar con la URL analizada  | ✅     | `verificar-url.ts` solo lee texto. Única conexión: DNS (`lookup`) para hosts `*.gob.es`, que §5.2.8 exige expresamente y no visita la web. Sin acortadores resueltos, sin RDAP, sin TLS |
| No guardar lo que escribe el ciudadano                       | ✅     | Sin base de datos, sin `console.log`, sin ficheros: `grep` sobre `src/lib` y `src/app/api` no encuentra persistencia ni logging          |
| La duda no acusa; ante la duda, «no puedo confirmarlo»       | ✅ en general | Desconocido → `no_determinable` + «No introduzcas datos… llama al 060». **Excepción:** imitación de marca acusa sola (ver §4.2)   |
| Aviso «Herramienta experimental. No es un servicio oficial.» | ✅     | En `layout.tsx`, visible a 320 px                                                                                                        |
| Botón «¿Algo está mal? Avísanos»                             | ✅     | `BotonAviso` en el pie, con enlace a issues del repo                                                                                     |
| Claves solo en servidor; IA solo por rutas de servidor       | ✅     | Solo hay rutas `POST` en `src/app/api/`; sin `NEXT_PUBLIC_`                                                                              |
| `ficha.json` describe la herramienta; datos «simulados»      | ✅     | Badge «Datos simulados» en la cabecera; icono `#` y nombre de la ficha en la UI                                                          |
| Recomendar 017 en casos sospechosos                          | ✅     | Consejo de `no_oficial` y pie de ambos verificadores                                                                                     |
| Datos de `datos/` usados como lista blanca sin editarlos     | ✅     | `dominios-oficiales.json` importado tal cual (25 entidades + reglas)                                                                     |

## 4. Algoritmo de referencia (contexto.md §5.2, pasos 1–12)

| Paso | Qué exige §5.2                                                 | Estado | Notas |
| ---- | -------------------------------------------------------------- | ------ | ----- |
| 1    | Extraer URLs (http/https, `hxxp`, `[.]`, `[dot]`); acortador → `no_determinable`; neutralizar | ✅ parcial | `resolverEnlaces` desneutraliza en memoria y muestra neutralizado. **No** extrae enlaces en QR ni con espacios intercalados |
| 2    | Rechazar IP (dec/oct/hex) y credenciales; avisar `http` y puerto no estándar | ✅ | `ip_en_url`, `credenciales_en_url`; el host real tras `@` se identifica bien. IP en octal/hex: `new URL` normaliza a decimal y cae en el rechazo igualmente |
| 3    | Normalizar host IDNA/UTS #46, forma Unicode y ASCII            | ✅ | `new URL` + `domainToUnicode` (Node). Sin librería IDNA 2008 dedicada |
| 4    | Homógrafos y mezcla de alfabetos (UTS #39), esqueleto vs allowlist | ⚠️ parcial | Tabla mínima de confusables aplicada solo a hosts con `xn--`. Sin esqueleto UTS #39 completo ni detección de mezcla de scripts. El caso §5.3 del punycode sale `no_oficial` correcto, pero por el camino de «imitación de marca», no por `homografo` |
| 5    | Dominio registrable con la PSL; anotar sufijo PRIVATE          | ❌ | No hay PSL. El «registrable» se infiere de la lista; `portalseiq[.]eu[.]cc` se trata bien de hecho porque el host completo es el registrable, pero un host tipo `a.b.eu.cc` no se computaría como §5 espera |
| 6    | Plataformas compartidas: modo inquilino; si no consta, `no_determinable`; no usar DNS como prueba | ⚠️ parcial | Detecta las 4 plataformas y no concluye (`plataforma_compartida`) ✅. **Falta el registro de inquilinos**: sedes reales (`almodovardelpinar.sedelectronica.es`, `rocafort.sede.dival.es`) nunca salen `oficial_verificado`. Sin sonda de etiqueta aleatoria para comodines |
| 7    | Coincidencia exacta del registrable → `oficial_verificado` y web buena | ✅ | Elige la entrada más concreta (orden por longitud); dominios legados (`dgt.es`, `agenciatributaria.es`, `correos.com`) funcionan |
| 8    | `*.gob.es` reservado, con DNS y sin comodín                    | ✅ | `oficial_verificado` solo si el host resuelve (`gob_es_inexistente` si no: `www.dgt.gob.es` y `www.seg-social.gob.es` salen `no_determinable`, como espera §5.3). Excluye `sede.gob.es` (plataforma, paso 6) ✅ |
| 9    | TLS solo para dominios de los pasos 7–8 (SAN, caducidad, NIF/DIR3) | ❌ | No implementado |
| 10   | Parecido con la allowlist: `posible_imitacion_de_marca`; `no_oficial` **solo con otra señal independiente** | ⚠️ desviado | Distancia ≤ 2 y marcas por etiqueta/trozo con guion ✅. Pero `imitacion_de_marca` concluye `no_oficial` **sin** segunda señal: `sepe-cursos[.]com` → `no_oficial` solo por el token. §5.2.10 lo dejaría en `no_determinable`. Ver §4.2 |
| 11   | Alertas de INCIBE / indicadores publicados → `no_oficial` (`aviso_incibe`) | ❌ | No hay feed (ni copia local de Ciberalertas de la Seguridad Social ni avisos INCIBE con dominio señalado). Consecuencia directa: `portalseiq[.]eu[.]cc` → `desconocido` en vez de `no_oficial` |
| 12   | Por defecto `no_determinable` con el texto literal (060)        | ✅ | Texto casi literal de §5.2.12 en `noDeterminable()` |

### 4.1 Tabla §5.3 (18 casos), resultado real de la API

| # | Entrada | Esperado | Obtenido | |
| -- | ------- | -------- | -------- | - |
| 1 | `https://sede.agenciatributaria.gob.es/Sede/ayuda/Phishing.html` | `oficial_verificado` | `oficial_verificado` (`en_allowlist`) | ✅ |
| 2 | `http://www.agenciatributaria.es` | `oficial_verificado` + aviso http | `oficial_verificado` + aviso «sin cifrar» | ✅ |
| 3 | `https://www.dgt.es/` | `oficial_verificado` | `oficial_verificado` | ✅ |
| 4 | `https://dehu.redsara.es/` | `oficial_verificado` | `oficial_verificado` | ✅ |
| 5 | `https://www.citapreviadnie.es/citaPreviaDni/` | `oficial_verificado` | `oficial_verificado` | ✅ |
| 6 | `https://sede.seg-social.gob.es/` | `oficial_verificado` | `oficial_verificado` | ✅ |
| 7 | `https://almodovardelpinar.sedelectronica.es/` | oficial **solo si el inquilino consta** | `no_determinable` (`plataforma_compartida`) | ⚠️ fallback correcto; falta registro de inquilinos |
| 8 | `https://zzqx-nonexistent-test1.sedelectronica.es/` | `no_determinable` | `no_determinable` | ✅ |
| 9 | `https://sede.gva.es/va/` | `oficial_verificado` | `oficial_verificado` | ✅ |
| 10 | `https://www.dgt.gob.es/` | `no_determinable` (host inexistente) | `no_determinable` (`gob_es_inexistente`) | ✅ |
| 11 | `https://qwerty-zz91.sede.gob.es/` | `no_determinable` (comodín) | `no_determinable` | ✅ |
| 12 | `https://rocafort.sede.dival.es/` | oficial **solo si el inquilino consta** | `no_determinable` | ⚠️ ídem caso 7 |
| 13 | `portal[.]seg-socioal[.]cfd` | `no_oficial` | `no_oficial` (`imitacion_de_marca`) | ✅ |
| 14 | `portalseiq[.]eu[.]cc` | `no_oficial` (indicador publicado SS) | `no_determinable` (`desconocido`) | ❌ falta paso 11 |
| 15 | `https://dgt.es@ejemplo[.]top/pago` | `no_oficial` | `no_oficial` (`credenciales_en_url`) | ✅ |
| 16 | `https://agenciatributaria.gob.es.ejemplo[.]top/` | `no_oficial` | `no_oficial` (`marca_como_subdominio`) | ✅ |
| 17 | `https://xn--dgt-…` homógrafo | `no_oficial` | `no_oficial` (`imitacion_de_marca`; el código `homografo` no se disparó) | ✅ veredicto, ⚠️ camino |
| 18 | `https://mi-pueblo-ejemplo[.]com/` | `no_determinable` | `no_determinable` | ✅ |

### 4.2 Pruebas propias de reglas de plataforma y falsos positivos

| Entrada | Obtenido | Lectura |
| ------- | -------- | ------- |
| `https://bit.ly/abc123` | `no_determinable`, `acortador_no_resuelto` | ✅ §5.2.1 |
| `https://192.168.1.1/pago` | `no_oficial`, `ip_en_url` | ✅ §5.2.2 |
| `https://sede.agenciatributaria.gob.es.devolucion[.]top/` | `no_oficial`, `marca_como_subdominio`, web buena AEAT | ✅ §5.2.10 |
| `https://ugt.es/` y `https://cgt.es/` | `no_determinable` | ✅ no acusa sindicatos (ejemplo explícito de §5.2.10) |
| `https://www.interior.gob.es/` | `oficial_verificado` | ✅ DV/certificado no se comprueba, no penaliza |
| `https://correos.com/` | `oficial_verificado` (Correos) | ✅ sociedad mercantil en lista (§7.1) |
| `https://www.correosexpress.com/` | `no_determinable` | ✅ sin falsa imitación de «correos» |
| `https://sepe-cursos[.]com/` | `no_oficial`, `imitacion_de_marca` | ❌ falso positivo: la marca sola concluye; §5.2.10 exige otra señal |
| `https://miclavedefactura[.]com/` | `no_determinable` | ✅ «clave» no está como trozo |
| `https://aegente-tributaria[.]com/` | `no_determinable` | ⚠️ typo (distancia 1 por letra duplicada) no lo marca; §5.2.10 lo dejaría en `no_determinable` de todos modos, así que el veredicto es conforme |

### 4.3 Reglas de contenido (§5.4) y mensajes sin enlace (§5.6)

| Regla §5.4 | Estado |
| ---------- | ------ |
| Pago / datos bancarios por enlace en nombre de los cinco organismos | ✅ (`pago_por_enlace`, `pide_datos_bancarios`); verificado con SMS Correos y SEPE |
| Multa o denuncia de tráfico con QR o enlace de pago (DGT) | ⚠️ parcial: multa + enlace ✅ (`dgt_multa_enlace`); multa **con QR** sin enlace no se detecta (no hay extracción de QR) |
| Devolución o «ingreso» con enlace (AEAT, Carpeta Ciudadana) | ⚠️ parcial: AEAT ✅ (`devolucion_enlace`); Carpeta Ciudadana no está en la lista de organismos detectables |
| Responder al correo para «gestionar» un trámite (Carpeta Ciudadana, Policía, GC) | ❌ no implementada |
| Cl@ve Permanente con correo en vez de DNI | ❌ no implementada |
| Remitente que usa el nombre del servicio con otro dominio | ✅ vía `imitacion_de_marca` sobre el dominio del enlace |
| Amenaza de arresto o publicación en medios en 48/72 h | ⚠️ parcial: arresto/detención ✅; «publicación en medios» no |
| Aviso legítimo (art. 41.6) no marcado como fraude | ✅ avisos legítimos AEAT y SEPE → `no_determinable` |

Reglas de contenido para ayuntamientos/CCAA: correctamente ausentes (§5.4 dice que no hay regla general publicada) → paquete de aduana genérico → `no_determinable`.

### 4.4 Mensajes sin enlace (§5.6)

- **Alias de remitente (§5.6.1):** no se analiza. Falta el Registro de Alias de la CNMC (su buscador no estaba operativo según §7.4.6); sin él, el verificador ignora el remitente alfanumérico. Los 10 casos de `mensajes-ejemplo.json` se resuelven por contenido y enlaces, así que la prueba pasa igualmente.
- **Números citados (§5.6.2–3):** no se analizan; el consejo genérico remite a la sede y al 060/017, que es el comportamiento seguro esperado.
- **Ya entregó datos (§5.6.6):** ✅ el consejo de `no_oficial` manda al banco y al 017.

## 5. Listado priorizado de carencias

### Debe estar para la demo

1. **Paso 11 — indicadores publicados** (`contexto.md` §5.2.11, §6, caso §5.3 núm. 14). Sin esto, un dominio que la Seguridad Social ha publicado como fraudulento (`portalseiq[.]eu[.]cc`) sale `no_determinable`. Basta una copia local pequeña (JSON en `src/datos/`) con los dominios citados expresamente como fraudulentos por Ciberalertas de la Seguridad Social y por avisos de INCIBE, con su fuente y fecha, consultada solo si no hubo coincidencia en los pasos 7–8. Es la única desviación dura frente a la tabla §5.3.
2. **`imitacion_de_marca` acusa sin señal independiente** (§5.2.10). `sepe-cursos[.]com` sale `no_oficial` solo por contener el token «sepe». §5.2.10 exige una señal adicional (TLD barato, regla de contenido §5.4 o indicador publicado) y, sin ella, `no_determinable` + `posible_imitacion_de_marca`. Es falso positivo del tipo que la demo puede enseñar mal («la duda no acusa»). El arreglo es trivial: devolver `no_determinable` con el aviso cuando no haya segunda señal (la señal `.top/.click` ya existe como aviso y puede reutilizarse como señal concluyente).
3. **Registro de inquilinos de plataformas** (§5.2.6, §3.5, casos §5.3 núm. 7 y 12). `almodovardelpinar.sedelectronica.es` y `rocafort.sede.dival.es` no se confirman jamás: siempre `no_determinable`. Como veredicto es seguro, no rompe la demo, pero si en la demo se pega una sede municipal real de plataforma compartida, la herramienta no la reconoce. Basta añadir la lista de inquilinos de `comun/04b` (leída, no editada) como `src/datos/inquilinos.ts`.

### Debería estar (calidad, no bloquea la demo)

4. **PSL completa** (§5.2.5, §3.5): calcular el registrable con la Public Suffix List y anotar si el sufijo es PRIVATE. Hoy el registrable se infiere; casos como `a.b.eu.cc` o futuras plataformas PRIVATE quedarían mal computados. Incluir la versión de la PSL en la respuesta (§5.7).
5. **Homógrafos UTS #39 completos** (§5.2.4): esqueleto confusable completo y mezcla de scripts, no solo la tabla mínima actual aplicada a `xn--`. El caso §5.3 núm. 17 sale bien pero por `imitacion_de_marca`, no por `homografo`.
6. **RDAP** (fuentes de SETUP.md, §6): fecha de registro y titular vía `https://rdap.org/domain/<dominio>`, con «no disponible» y sin contar como señal (no cubre `.es`). No conecta con la web sospechosa: consulta un registro público por nombre, es conforme con «no abrir URLs».
7. **Google Safe Browsing v5** (SETUP.md): reputación opcional con `SAFE_BROWSING_API_KEY`; sin clave, decir «reputación no consultada». Hoy no existe ningún rastro de esta pieza ni del mensaje de «reputación no consultada».
8. **Registro de Alias de la CNMC** (§5.6.1, §4.3): consulta del alias de remitente («inscrito a nombre de X» / «no inscrito» / «no disponible»). Conscientes de que el buscador público no estaba operativo (§7.4.6): al menos reconocer el alias y avisar de que no se puede consultar (`registro_alias_no_disponible`).
9. **Reglas de contenido que faltan** (§5.4): Cl@ve Permanente con correo; Carpeta Ciudadana (devolución y «responder al correo»); Policía/Guardia Civil «responder al correo para gestionar un trámite»; «publicación en medios» en la amenaza 48/72 h; multa DGT con QR (depende de extraer enlaces de QR, §5.2.1).
10. **«La web buena es…» más útil** (§5.5): hoy se identifica el organismo suplantado solo entre los 5 grandes y se muestra la web canónica. Faltan la acción oficial («sede de la DGT, sección Multas»), los `alternates` de dominios legados (§7.1), y la resolución por INE/directorio de sedes para ayuntamientos.
11. **Respuesta conforme a §5.7** al completo: se muestran los pasos ✅, pero no la versión de la PSL ni las fechas de la allowlist y del feed (lógicamente, sin PSL ni feed no hay fecha que mostrar).

### Opcional para producción

12. **TLS de los pasos 7–8** (§5.2.9): conectar y comprobar SAN, caducidad y NIF/DIR3 de los dominios ya confirmados, con `tls_no_comprobable` si falla. Nunca para sospechosos.
13. **Sonda de comodín** (§5.2.6): resolver una etiqueta aleatoria bajo un registrable ajeno antes de fiarse de él.
14. **Feed de INCIBE en vivo** (§6): hoy la carencia se tapa con una copia local; en producción, consulta periódica de los avisos y de Ciberalertas.
15. **Fecha de verificación por entrada de allowlist** y aviso si la lista envejece (§7.2): mitigación de dominios caducados reutilizados.
16. **Rechazo de parámetros de redirección hacia fuera** en dominios oficiales (§7.2, marcado [sin verificar] en contexto.md).

### Riesgos de §7 que nos aplican hoy

| Riesgo (§7) | Aplica | Situación actual |
| ----------- | ------ | ---------------- |
| §7.1 Ayuntamientos con `.com/.org/.cat/...` → acusar | Mitigado | Salen `no_determinable` (`mi-pueblo-ejemplo`, `sepe-cursos` salvo el caso de marca) |
| §7.1 UGT/CGT a distancia 1 de DGT | Mitigado | Verificado: `no_determinable` |
| §7.2 Plataforma compartida con comodín | Parcial | Comodín no concluye, pero sin registro de inquilinos (carencia demo núm. 3) |
| §7.2 Lookalike sin parecido léxico (`portalseiq`) | Abierto | Es la carencia demo núm. 1 |
| §7.2 Mensaje legítimo con web oficial en contexto engañoso | Abierto | Un enlace oficial confirma el mensaje aunque el texto engañe (el aviso de urgencia no lo frena); aceptable para §5.4, a vigilar |
| §7.2 Alias legítimo reusado | Abierto | No se analiza el remitente (carencia núm. 8) |
| §7.3 Feed no estructurado / detección tardía | Abierto | Estrategia de positivos (allowlist) + reglas de contenido, como pide §7.3 |
| §7.4 Un `gob.es` que resuelve no es sede real | Mitigado | `sede.gob.es` tratado como plataforma; `*.gob.es` requiere DNS pero solo da confianza menor |

## 6. Bugs y desviaciones menores anotados (no arreglados aquí)

1. **Códigos de motivo no conforme a §5.1:** `plataforma_compartida` donde §5.2.6 llama al caso `inquilino_no_listado`; `desconocido`/`sin_señales`/`senales_sin_concluir` no existen en el vocabulario de §5.1. No afecta al veredicto ni a la demo; conviene alinear los códigos si se desea trazabilidad con §5.1.
2. **`homografo()` no llega a dispararse** en el caso §5.3 núm. 17: el esqueleto confusable solo se compara contra la allowlist (`termina(esqueleto, dominio)`), y un homógrafo de `dgt` dentro de otro dominio cae en `marcaImitada`. Veredicto correcto, camino distinto.
3. **`dgt_multa_enlace` se dispara también sin enlace** si el SMS menciona multa y pago (condición `hayEnlace || pidePago`), y además existe la regla `dgt_no_email` para email. Es más agresivo que §5.4, pero en la dirección segura (duda no acusa: no hay riesgo de falsos positivos demostrables con avisos legítimos de multa por enlace, que DGT no envía).
4. **`build` de Next.js emite un aviso de vulnerabilidad conocida** en la versión instalada (Next.js 16.4.0, advisory de npm). El build pasa al reintentarlo. No es del código del proyecto: es de la dependencia. Revisar `next upgrade` cuando la demo lo permita.
5. **Longitud máxima de mensaje (4.000) y URL (2.000) sin mensaje al usuario sobre el límite exacto en la UI:** la API responde 400 con texto claro; la UI lo muestra como error genérico. Menor.
