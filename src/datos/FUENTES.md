# Cómo validamos las fuentes

El verificador de webs (`src/lib/verificar-url.ts`) solo lee el texto de la dirección. Para decidir usa varias fuentes, y no todas pesan igual: **solo una fuente oficial puede decir «oficial»; una fuente comunitaria solo puede decir «no oficial»**. Ante la duda, `no_determinable`.

## Jerarquía de confianza

| Orden | Fuente | Qué puede afirmar | Por qué la aceptamos |
| --- | --- | --- | --- |
| 1 | Lista de dominios oficiales (`datos/dominios-oficiales.json`, de la organización) | `oficial_verificado`, con el organismo y su web | Cada dominio lleva en `fuente` la página oficial del organismo que lo respalda, consultada el 17-18/10/2026. Es el único camino a «oficial» con nombre de organismo. No la editamos (regla 7). |
| 2 | Regla `*.gob.es` (Orden ITC/1542/2005) | `oficial_verificado` con confianza menor, sin organismo | Reserva por norma a las Administraciones Públicas. Además, la ruta comprueba en DNS que el host existe; si no existe, `no_determinable`. |
| 3 | Señales de fraude de `contexto.md` (5.2) e INCIBE | `no_oficial` | Reglas deterministas: credenciales en la URL, IP, homógrafos, dominio oficial como subdominio de otro, «gob.es» que no termina en `.gob.es`, marca de un organismo en un dominio ajeno. |
| 4 | Lista comunitaria de phishing activo ([Phishing.Database](https://github.com/Phishing-Database/Phishing.Database), MIT), filtrada en `src/datos/dominios-fraude.json` | `no_oficial`, solo para dominios que ninguna regla anterior ha resuelto | Ver criterios abajo. Se cita como origen del dato, junto a INCIBE; no es fuente oficial. |

El orden es el de evaluación: lo que resuelve un paso no llega al siguiente. Por eso un dominio de la lista oficial nunca puede salir como fraude aunque una lista comunitaria lo traiga, y la lista comunitaria no cambia ningún veredicto de las reglas 1 a 3.

## Criterios para aceptar una fuente comunitaria

Una lista de terceros entra solo si cumple todo esto:

1. **Licencia abierta** que permita copiar el dato al repo (Phishing.Database: MIT).
2. **Mantenida y fechada**: se actualiza a diario y comprueba que los dominios siguen activos.
3. **Trazable**: guardamos la URL de origen, la licencia, la fecha de la última actualización y el total de la lista.
4. **Filtrada a nuestro ámbito**: solo dominios que imitan a organismos españoles (marcas del verificador y nombres propios de la lista oficial, sin palabras genéricas como «portal» o «valencia»).
5. **Sin datos personales**: solo nombres de dominio (regla 2).
6. **Con salvaguardas**: nunca entra un dominio de la lista oficial, y si la descarga llega vacía o sospechosamente corta (menos de 1.000 entradas), no se actualiza.

## Actualización diaria

`.github/workflows/actualizar-fraude.yml` ejecuta cada día, a las 04:00 UTC, `bun scripts/actualizar-fraude.ts`. Si la lista filtrada cambia, comprueba `bun run build` y hace commit en `main`, que se publica solo. También se puede lanzar a mano desde la pestaña Actions o en local con el mismo comando. El script solo descarga una lista de texto: no visita ninguno de los dominios.

## Fuentes valoradas y descartadas

| Fuente | Decisión | Motivo |
| --- | --- | --- |
| [Daily-Mal-Phishing](https://github.com/criminalip/Daily-Mal-Phishing) | Descartada por ahora | Sin licencia: no podemos copiar su dato al repo. |
| [JPCERT phishurl-list](https://github.com/JPCERTCC/phishurl-list) | Descartada | Sin licencia y centrada en marcas japonesas. |
| [Smishing-Dataset-IMC25](https://github.com/reportsmishing/Smishing-Dataset-IMC25) | Solo para pruebas en local | Mensajes reales pseudoanonimizados: no se suben al repo (regla 2). |
| Google Safe Browsing v5 | Pendiente | Opcional según `SETUP.md`; necesita `SAFE_BROWSING_API_KEY`. |
