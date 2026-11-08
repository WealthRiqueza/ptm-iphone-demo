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
// Cross-source duplicate: distinct IDs and URLs, swapped home/away, same UTC
// instant and same actual points. Reject rather than inflate form or H2H.
const duplicated=input([
  row("provider-one", [[11,8],[11,7],[11,9]]),
  {...row("provider-two", [[8,11],[7,11],[9,11]], "2026-11-06T12:00:00-05:00"),
   player_a:"B",player_b:"A"}
]);
assert.throws(() => globalThis.PTMOnDemand.analyze(duplicated), /Partido duplicado/);
// A conflicting 3-0 score at the same time must also fail closed.
duplicated.matches[1].sets=[[11,8],[11,7],[11,9]];
assert.throws(() => globalThis.PTMOnDemand.analyze(duplicated), /Partido duplicado/);
duplicated.matches[1].played_at_utc="2026-11-06T12:30:00-05:00";
assert.equal(globalThis.PTMOnDemand.analyze(duplicated).observed_rows, 2);
assert.equal(globalThis.PTMOnDemand.analyze(input([])).observed_rows, 0);
for (const url of [
  "https://", "https://user:secret@example.org/m",
  "https://example.org/m#fragment", "https://exa mple.org/m",
  "https://example.org@another.example/m"
]) {
  const p = input([row("bad-source", [[11,8],[11,8],[11,8]])]);
  p.matches[0].source_url = url;
  assert.throws(() => globalThis.PTMOnDemand.analyze(p), /URL de partido inválida/);
  p.matches[0].source_url = "https://example.org/m";
  p.provenance.source_url = url;
  assert.throws(() => globalThis.PTMOnDemand.analyze(p), /Procedencia HTTPS/);
}

// Calendar dates must be real, not normalized by browser Date.parse.
// Invalid capture/start/match timestamps must fail closed across time zones.
for (const bad of ["2026-02-30T12:00:00Z", "2026-04-31T12:00:00Z",
                  "2026-11-07T25:00:00Z", "2026-11-07T12:60:00Z"]) {
  const badStart=input([]);
  badStart.scheduled_at_utc=bad;
  assert.throws(() => globalThis.PTMOnDemand.analyze(badStart), /Fecha/);
  const badCapture=input([]);
  badCapture.provenance.captured_at_utc=bad;
  assert.throws(() => globalThis.PTMOnDemand.analyze(badCapture), /Fecha/);
  const badPlayed=input([row("date", [[11,8],[11,8],[11,8]], bad)]);
  assert.throws(() => globalThis.PTMOnDemand.analyze(badPlayed), /Fecha/);
}
const leap=input([]);
leap.scheduled_at_utc="2028-03-01T18:00:00Z";
leap.provenance.captured_at_utc="2028-02-29T18:00:00Z";
assert.equal(globalThis.PTMOnDemand.analyze(leap).decision, "DESCARTAR");

// The on-demand ChatGPT handoff must remain available without a paid dataset.
const html = require("node:fs").readFileSync(require("node:path").join(__dirname, "index.html"), "utf8");
assert.match(html, /COPIAR SOLICITUD PREGAME \+ JSON PARA IPHONE/);
assert.match(html, /schema_version:'ptm-pregame-v1'/);
assert.match(html, /cutoff_enforced:false/);
assert.match(html, /model_probability_verified:false/);
assert.match(html, /upstream_verified:false/);
assert.match(html, /Pegar informe PREGAME de ChatGPT/);
console.log("PREGAME on-demand offline regression: PASS (synthetic only)");
