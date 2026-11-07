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
x=fixture();x.provenance.permission="unknown";
assert.throws(()=>analyze(x),/Procedencia/);
console.log("PTM PREGAME V1 browser engine: 17 offline assertions PASS (synthetic fixtures; NO predictive validation)");
