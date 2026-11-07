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

## Lo que todavía falta para entregar V1
1. Conector de consulta puntual, legítima y automática de resultados históricos reales de los dos jugadores.
2. Estimación de probabilidad PTM independiente con evidencia y validación; filtro >=70% sin depender del precio de mercado.
3. E2E con red real en Safari/iPhone y CI verde en el motor principal.

No exigir dataset histórico permanente ni pasos avanzados 17–19 para V1. No scraping masivo, compras, apuestas ni LIVE/RADAR durante esta fase.
