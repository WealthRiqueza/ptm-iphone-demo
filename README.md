# PTM Bot 3.3 — iPhone PREGAME V1 (read-only)

Demo: https://wealthriqueza.github.io/ptm-iphone-demo/

## Qué funciona hoy
- Identificar dos jugadores desde texto `JUGADOR A VS JUGADOR B`.
- Mostrar los 14 indicadores PTM, con `SIN VERIFICAR` si faltan datos.
- Consultar candidatos públicos de Polymarket.com y, separadamente, Polymarket US. No son una fuente de H2H, ni prueban precios ejecutables.
- **Nuevo (7 nov, 12:27 Miami):** cargar directamente en el iPhone un JSON de resultados individuales autorizados (hasta 200 partidos), calcular localmente los 14 indicadores con corte temporal, H2H normalizado, sets y alertas, y presentar el informe sin ejecutar Python ni subir el archivo. Abrir **Importar resultados autorizados y generar PREGAME aquí mismo**. Los datos y permisos siguen siendo declarados, no autenticados; el filtro del 70% permanece SIN VERIFICAR.
- Cargar un informe `ptm-pregame-v1` generado por el motor Python: abrir **Prueba técnica: cargar informe JSON PREGAME** y seleccionar un archivo `.json` en Archivos de iPhone, o pegar el contenido JSON. La importación ocurre localmente en el navegador; no sube el archivo.
- El navegador exige identidad exacta de ambos jugadores, esquema, corte temporal, campos y decisión conservadora. `NO OPERAR | $0`.

## Generar un informe JSON descriptivo
En `WealthRiqueza/PTM-Bot-3-3`, usando el código de PR #88:

```sh
python ptm_pregame_v1_import.py input.json > report.json
```

El `input.json` debe contener `player_a`, `player_b`, `scheduled_at_utc`, `matches` (máximo 200 resultados completos con puntos por set, fecha, ID y URL) y `provenance` con `source_url` HTTPS, `permission` y `captured_at_utc` anterior al inicio. **Solo usar datos suministrados legalmente.** El motor no verifica derechos upstream ni obtiene por sí solo resultados históricos.

Prueba de interfaz con Node.js:

```sh
node test_pregame_mobile.cjs
node test_pregame_on_demand.js
```

Esta prueba usa datos sintéticos únicamente para validar la interfaz, no el rendimiento predictivo ni Safari real. El nuevo `test_pregame_on_demand.js` contiene 17 aserciones offline; en esta revisión se ejecutaron las mismas aserciones en V8 y pasaron. La ejecución de Node en GitHub Actions y la prueba Safari real siguen sin verificarse.


## Consulta puntual HTTPS desde iPhone (7 nov, 14:28 Miami)

La pantalla ahora permite **consultar un endpoint JSON HTTPS autorizado** desde el panel «Importar resultados autorizados». Introduce un URL que devuelva el objeto de resultados documentado arriba y pulsa **CONSULTAR JSON AUTORIZADO Y CALCULAR**. La petición ocurre una sola vez al pulsar el botón, sin cookies, sin credenciales, sin redirecciones y con tiempo máximo de 10 segundos. El proveedor debe permitir CORS desde GitHub Pages y devolver un JSON de hasta 150 KB con identidad exacta, fecha de captura anterior al partido y partidos previos completos. La página calcula y muestra los 14 campos localmente; si hay error, mantiene `SIN VERIFICAR / DESCARTAR / $0`.

Esto habilita la **integración genérica con una fuente autorizada que entregue el formato**, pero **no incluye un proveedor Setka preconfigurado, licencia de datos ni autenticación independiente de la procedencia**. No calcula aún una probabilidad PTM verificada. No introduzcas tokens ni datos privados en URLs. No se realizan compras ni apuestas.

Prueba adicional: `node test_pregame_authorized_fetch.js` (navegador simulado y datos sintéticos). El CI iPhone «PREGAME V1 iPhone offline checks» del commit `f18cd3b` reportó **success** el 7 nov 2026; eso no equivale a Safari real ni a un feed de resultados reales.

## Lo que todavía falta para entregar V1
1. Seleccionar y verificar un proveedor real autorizado con respuesta compatible y CORS; el lector genérico HTTPS ya está conectado, pero no hay feed Setka validado.
2. Estimación de probabilidad PTM independiente con evidencia y validación; filtro >=70% sin depender del precio de mercado.
3. E2E con red real en Safari/iPhone y CI verde en el motor principal.

No exigir dataset histórico permanente ni pasos avanzados 17–19 para V1. No scraping masivo, compras, apuestas ni LIVE/RADAR durante esta fase.

## Prueba E2E de navegador (7 nov, tarde Miami)

Además de las pruebas Node con DOM simulado, el repositorio ahora incluye `test_pregame_browser_e2e.cjs` y el workflow `pregame_v1_webkit_e2e.yml`. Ejecuta Chromium y WebKit **reales** en un runner Linux y comprueba: identificación de jugadores, 14 campos, cálculo local desde resultados sintéticos, importación manual de informe ChatGPT sin hora, rechazo de cifras inválidas, limpieza de estadísticas al cambiar el partido y una sola consulta HTTPS **simulada** con CORS.

Para ejecutar localmente con Node 22:

```sh
npm install --no-save playwright
npx playwright install --with-deps chromium webkit
node test_pregame_browser_e2e.cjs
```

**Limitación:** WebKit en Linux no equivale a Safari físico en iPhone. La respuesta HTTPS de esta prueba está interceptada y es sintética; tampoco demuestra un proveedor Setka real ni probabilidad independiente validada. El workflow solo cuenta como aprobado cuando GitHub Actions confirme `success`.

El importador también rechaza partidos con sets adicionales después de que alguien ganó tres sets, y exige captura **estrictamente anterior** al inicio. Un error al importar el JSON generado ya no debe mostrar un falso mensaje de cálculo exitoso.
