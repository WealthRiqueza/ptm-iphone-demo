// Offline regression tests. All examples synthetic; not predictive evidence.
"use strict";
const assert = require("node:assert/strict");
require("./pregame-on-demand.js");
const row = (id, sets, when = "2026-11-06T17:00:00Z") => ({
  id, played_at_utc: when, player_a: "A", player_b: "B", sets,
  source_url: "https://example.org/match/" + id
});
const input = matches => ({
  player_a: "A", player_b: "B", scheduled_at_utc: "2026-11-07T18:00:00Z",
  provenance: {
    source_url: "https://example.org/source", permission: "user-provided",
    captured_at_utc: "2026-11-07T17:00:00Z"
  },
  matches
});
const report = globalThis.PTMOnDemand.analyze(input([
  row("a", [[12,10],[11,9],[13,11]])
]));
assert.equal(report.observed_rows, 1);
assert.equal(report.decision, "DESCARTAR");
assert.equal(report.amount_usd, 0);
assert.equal(report.model_probability_verified, false);
assert.equal(Object.keys(report.statistics).length, 14);
assert.match(report.statistics.h2h_reciente, /12:10/);
for (const invalid of [[13,8],[11,10],[12,9],[20,10]]) {
  assert.throws(() => globalThis.PTMOnDemand.analyze(input([
    row("bad", [invalid,[11,8],[11,7]])
  ])), /Puntos de set inválidos/);
}
assert.throws(() => globalThis.PTMOnDemand.analyze(input([
  row("future", [[11,8],[11,8],[11,8]], "2026-11-07T17:30:00Z")
])), /evidencia futura/);
assert.equal(globalThis.PTMOnDemand.analyze(input([])).observed_rows, 0);
console.log("PREGAME on-demand offline regression: PASS (synthetic only)");
