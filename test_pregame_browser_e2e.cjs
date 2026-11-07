"use strict";
// Browser-level PREGAME V1 smoke: synthetic fixtures only; no real provider or iPhone Safari.
// Run after installing Playwright browsers: node test_pregame_browser_e2e.cjs
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium, webkit } = require("playwright");

const fields = [
 "h2h_historico","h2h_reciente","forma_ultimos_10","forma_ultimos_5",
 "primer_set_conversion","remontadas","quinto_set_h2h","quinto_set_general",
 "rivales_comunes","fatiga_mismo_dia","alerta_sorpresa",
 "alerta_contradiccion_h2h","riesgo_remontada","cuotas_externas"
];
const source = () => ({
 player_a:"A", player_b:"B", scheduled_at_utc:"2026-11-07T18:00:00Z",
 provenance:{source_url:"https://ptm-fixture.example/source",permission:"user-provided",captured_at_utc:"2026-11-07T17:00:00Z"},
 matches:[
  {id:"one",player_a:"B",player_b:"A",played_at_utc:"2026-11-06T17:00:00Z",
   sets:[[11,8],[7,11],[8,11],[9,11]],source_url:"https://ptm-fixture.example/one"},
  {id:"two",player_a:"A",player_b:"B",played_at_utc:"2026-11-05T17:00:00Z",
   sets:[[11,9],[9,11],[11,9],[8,11],[9,11]],source_url:"https://ptm-fixture.example/two"}
 ]
});
const manual = () => ({
 schema_version:"ptm-pregame-v1",player_a:"A",player_b:"B",
 scheduled_at_utc:"SIN VERIFICAR",
 statistics:Object.fromEntries(fields.map(k=>[k,k==="h2h_historico"?"A 1 - 1 B (NO AUTENTICADO)":"SIN VERIFICAR"])),
 observed_rows:0,cutoff_enforced:false,upstream_verified:false,
 model_probability_verified:false,decision:"DESCARTAR",amount_usd:0
});

async function testBrowser(type) {
 const browser = await type.launch({headless:true});
 const page = await browser.newPage({viewport:{width:390,height:844},ignoreHTTPSErrors:true});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try {
  await page.goto(pathToFileURL(path.join(__dirname,"index.html")).href);
  await page.locator("#match").fill("A VS B");
  await page.locator("#analyze").click();
  assert.equal(await page.locator("#ptm-probability").textContent(),"SIN VERIFICAR");
  assert.equal(await page.locator("#report-fields [data-key]").count(),14);

  // Raw observations -> 14 descriptive fields; never approve 70% or any amount.
  await page.locator("#pregame-source-json").fill(JSON.stringify(source()));
  await page.locator("#generate-pregame").click();
  assert.match(await page.locator("#pregame-source-status").textContent(),/Calculados 2/);
  assert.match(await page.locator('[data-key="h2h_historico"] strong').textContent(),/1 - 1/);
  assert.match(await page.locator('[data-key="h2h_reciente"] strong').textContent(),/3-1/);
  assert.equal(await page.locator("#ptm-filter").textContent(),"SIN VERIFICAR");

  // Invalid source cannot retain previous stats or falsely report success.
  const bad=source();bad.matches[0].sets[0]=[11,10];
  await page.locator("#pregame-source-json").fill(JSON.stringify(bad));
  await page.locator("#generate-pregame").click();
  assert.match(await page.locator("#pregame-source-status").textContent(),/No se pudo calcular/);
  assert.equal(await page.locator('[data-key="h2h_historico"] strong').textContent(),"SIN VERIFICAR");

  // ChatGPT display-only report works without a scheduled kickoff.
  await page.locator("#pregame-json").fill(JSON.stringify(manual()));
  await page.locator("#load-pregame-json").click();
  assert.match(await page.locator("#pregame-json-status").textContent(),/Informe manual de ChatGPT cargado/);
  assert.match(await page.locator('[data-key="h2h_historico"] strong').textContent(),/NO AUTENTICADO/);
  const unsafe=manual();unsafe.amount_usd=100;
  await page.locator("#pregame-json").fill(JSON.stringify(unsafe));
  await page.locator("#load-pregame-json").click();
  assert.match(await page.locator("#pregame-json-status").textContent(),/No se cargó el informe/);
  assert.equal(await page.locator('[data-key="h2h_historico"] strong').textContent(),"SIN VERIFICAR");

  // Browser fetch: one HTTPS request, mocked CORS response, no real provider.
  let requests=0;
  await page.route("https://ptm-fixture.example/match.json",async route=>{
   requests++;
   await route.fulfill({status:200,contentType:"application/json",
    headers:{"access-control-allow-origin":"*"},body:JSON.stringify(source())});
  });
  await page.locator("#pregame-source-url").fill("https://ptm-fixture.example/match.json");
  await page.locator("#fetch-pregame-source").click();
  await page.waitForFunction(()=>document.getElementById("pregame-source-status").textContent.includes("Consulta puntual HTTPS completada"),{timeout:12000});
  assert.equal(requests,1);
  assert.match(await page.locator('[data-key="h2h_historico"] strong').textContent(),/1 - 1/);
  assert.equal(await page.locator("#ptm-filter").textContent(),"SIN VERIFICAR");

  // Changing the matchup invalidates any old statistics.
  await page.locator("#match").fill("C VS D");
  await page.locator("#analyze").click();
  assert.equal(await page.locator('[data-key="h2h_historico"] strong').textContent(),"SIN VERIFICAR");
  assert.equal(await page.locator("#ptm-market").textContent(),"SIN VERIFICAR");
  assert.deepEqual(errors,[]);
  console.log(type.name()+": real browser DOM + synthetic JSON + mocked HTTPS PASS; no Safari/iPhone signoff");
 } finally {await browser.close();}
}
(async()=>{await testBrowser(chromium);await testBrowser(webkit);})().catch(e=>{console.error(e);process.exitCode=1;});
