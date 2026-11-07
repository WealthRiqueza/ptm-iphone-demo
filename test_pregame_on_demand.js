"use strict";
// Run: node test_pregame_on_demand.js
// All match records below are SYNTHETIC fixtures, not predictive evidence.
const assert=require("node:assert/strict");
require("./pregame-on-demand.js");
const analyze=globalThis.PTMOnDemand.analyze;
const fixture=()=>({
 player_a:"A",player_b:"B",scheduled_at_utc:"2026-11-07T18:00:00Z",
 provenance:{source_url:"https://example.org/feed",permission:"user-provided",captured_at_utc:"2026-11-07T17:00:00Z"},
 matches:[
  {id:"1",player_a:"B",player_b:"A",played_at_utc:"2026-11-06T17:00:00Z",
   sets:[[11,8],[7,11],[8,11],[9,11]],source_url:"https://example.org/1"},
  {id:"2",player_a:"A",player_b:"B",played_at_utc:"2026-11-05T17:00:00Z",
   sets:[[11,9],[9,11],[11,9],[8,11],[9,11]],source_url:"https://example.org/2"},
  {id:"3",player_a:"A",player_b:"C",played_at_utc:"2026-11-04T17:00:00Z",
   sets:[[11,8],[11,8],[11,8]],source_url:"https://example.org/3"},
  {id:"4",player_a:"B",player_b:"C",played_at_utc:"2026-11-03T17:00:00Z",
   sets:[[11,8],[11,8],[11,8]],source_url:"https://example.org/4"}
 ]
});
const report=analyze(fixture());
assert.equal(report.schema_version,"ptm-pregame-v1");
assert.equal(report.observed_rows,4);
assert.equal(Object.keys(report.statistics).length,14);
assert.match(report.statistics.h2h_reciente,/A 3-1 B/);
assert.match(report.statistics.h2h_reciente,/11:8/);
assert.match(report.statistics.rivales_comunes,/c:/);
assert.match(report.statistics.remontadas,/A: 1\/1/);
assert.equal(report.cutoff_enforced,true);
assert.equal(report.upstream_verified,false);
assert.equal(report.model_probability_verified,false);
assert.equal(report.decision,"DESCARTAR");
assert.equal(report.amount_usd,0);
let x=fixture();x.provenance.captured_at_utc="2026-11-07T19:00:00Z";
assert.throws(()=>analyze(x),/Captura posterior/);
x=fixture();x.matches.push(x.matches[0]);
assert.throws(()=>analyze(x),/duplicado/);
x=fixture();x.matches.push({...x.matches[0],id:"future",played_at_utc:"2026-11-07T19:00:00Z"});
assert.throws(()=>analyze(x),/evidencia futura/);
x=fixture();x.matches[0].sets[0]=[11,10];
assert.throws(()=>analyze(x),/Puntos de set/);
x=fixture();x.matches[0].sets=[[11,8],[11,8],[11,8],[8,11],[8,11]];
assert.throws(()=>analyze(x),/continuó después/);
x=fixture();x.provenance.permission="unknown";
assert.throws(()=>analyze(x),/Procedencia/);
console.log("PTM PREGAME V1 browser engine: 17 offline assertions PASS (synthetic fixtures; NO predictive validation)");


// End-to-end DOM import check: ChatGPT's display-only 14-field JSON must
// load even when the kickoff time is unknown. It must never approve a bet.
const fs=require("node:fs"),vm=require("node:vm");
const html=fs.readFileSync(require("node:path").join(__dirname,"index.html"),"utf8");
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(inline,"Inline iPhone UI script must exist");
class MockElement {
 constructor(tag="div"){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.value="";this.textContent="";this.className="";this.style={};this.classList={toggle(){}};}
 addEventListener(type,fn){this.listeners[type]=fn;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 querySelectorAll(selector){return selector==="[data-key]"?this.children.filter(n=>n.dataset.key):[];}
 querySelector(selector){return this.children.find(n=>n.tagName===selector)||null;}
 click(){return this.listeners.click?.();}
}
const dom=new Map();
const document={getElementById(id){if(!dom.has(id))dom.set(id,new MockElement());return dom.get(id);},createElement(tag){return new MockElement(tag);}};
const sandbox={document,Date,Intl,URL,AbortController,setTimeout,clearTimeout,console};
sandbox.globalThis=sandbox;
vm.runInNewContext(inline[1],sandbox,{filename:"iphone-index-inline.js"});
const el=id=>document.getElementById(id);
el("match").value="A VS B";el("analyze").click();
const fields=Object.fromEntries([
 "h2h_historico","h2h_reciente","forma_ultimos_10","forma_ultimos_5",
 "primer_set_conversion","remontadas","quinto_set_h2h","quinto_set_general",
 "rivales_comunes","fatiga_mismo_dia","alerta_sorpresa",
 "alerta_contradiccion_h2h","riesgo_remontada","cuotas_externas"
].map(k=>[k,k==="h2h_historico"?"A 2 - 1 B (fuente NO autenticada)":"SIN VERIFICAR"]));
const manual={schema_version:"ptm-pregame-v1",player_a:"A",player_b:"B",
 scheduled_at_utc:"SIN VERIFICAR",statistics:fields,observed_rows:0,
 cutoff_enforced:false,upstream_verified:false,model_probability_verified:false,
 decision:"DESCARTAR",amount_usd:0};
el("pregame-json").value=JSON.stringify(manual);
el("load-pregame-json").click();
assert.match(el("pregame-json-status").textContent,/Informe manual de ChatGPT cargado/);
assert.match(el("report-fields").children[0].querySelector("strong").textContent,/A 2 - 1 B/);
assert.equal(el("ptm-filter").textContent,"SIN VERIFICAR");
assert.equal(el("ptm-probability").textContent,"SIN VERIFICAR");
assert.equal(el("ptm-market").textContent,"SIN VERIFICAR");
assert.equal(el("ptm-scheduled").textContent,"SIN VERIFICAR");
for(const unsafe of [{...manual,decision:"ESPERAR"},{...manual,model_probability_verified:true},
                     {...manual,observed_rows:1},{...manual,amount_usd:100}]){
 el("pregame-json").value=JSON.stringify(unsafe);el("load-pregame-json").click();
 assert.match(el("pregame-json-status").textContent,/No se cargó el informe/);
 assert.equal(el("report-fields").children[0].querySelector("strong").textContent,"SIN VERIFICAR");
}
console.log("PTM PREGAME V1 iPhone manual JSON import: PASS (mock DOM; Safari real not tested)");
