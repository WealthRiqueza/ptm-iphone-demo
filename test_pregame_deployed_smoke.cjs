"use strict";
const assert = require("node:assert/strict");
const {chromium, webkit} = require("playwright");

const SITE = "https://wealthriqueza.github.io/ptm-iphone-demo/";
const MATCH = "DUKHOVENKO OLEKSANDR VS REZNYCHENKO ROMAN";

async function smoke(engine) {
  const browser = await engine.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    const response = await page.goto(SITE,{waitUntil:"domcontentloaded",timeout:30000});
    assert(response && response.ok(), "La página pública no respondió 2xx");
    await page.locator("#match").waitFor({state:"visible",timeout:15000});
    await page.locator("#match").fill(MATCH);
    await page.locator("#analyze").click();
    assert.equal(await page.locator("#results").isVisible(),true,"El informe no se abrió");
    assert.equal(await page.locator("#name1").textContent(),"DUKHOVENKO OLEKSANDR");
    assert.equal(await page.locator("#name2").textContent(),"REZNYCHENKO ROMAN");
    assert.equal(await page.locator("#report-fields [data-key]").count(),14);
    assert.equal(await page.locator("#ptm-probability").textContent(),"SIN VERIFICAR");
    assert.equal(await page.locator("#ptm-filter").textContent(),"SIN VERIFICAR");
    assert.equal(await page.locator("#ptm-market").textContent(),"SIN VERIFICAR");
    assert.deepEqual(errors,[],"Errores de JavaScript en la página desplegada");
    console.log(engine.name()+": HTTPS GitHub Pages + identificar partido + 14 campos PASS");
  } finally {
    await browser.close();
  }
}
(async()=>{await smoke(chromium);await smoke(webkit);})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
