'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'inline script exists');
const ids = new Map();
function element(id) {
  if (ids.has(id)) return ids.get(id);
  const e = {
    id, children: [], dataset: {}, value: '', textContent: '',
    className: '', style: {}, disabled: false, listeners: {},
    classList: { toggle() {} },
    append(...items) { this.children.push(...items); },
    replaceChildren() { this.children = []; },
    querySelector(tag) { return this.children.find(x => x.tagName === tag); },
    querySelectorAll(selector) {
      assert.equal(selector, '[data-key]');
      return this.children.filter(x => x.dataset.key);
    },
    addEventListener(type, callback) { this.listeners[type] = callback; }
  };
  ids.set(id, e);
  return e;
}
const document = {
  getElementById: element,
  createElement(tag) {
    const e = element('created-' + ids.size);
    e.tagName = tag;
    return e;
  }
};
vm.runInNewContext(match[1], {
  document, navigator: { clipboard: {} },
  fetch: () => { throw Error('Network must not run in offline smoke'); },
  AbortController, setTimeout, clearTimeout
}, { timeout: 1000 });
const fields = element('report-fields').querySelectorAll('[data-key]');
assert.equal(fields.length, 14);
element('match').value = 'ALEX ALFA VS BORIS BETA';
element('analyze').listeners.click();
const statistics = Object.fromEntries(fields.map(row => [row.dataset.key, 'OBSERVADO']));
const payload = {
  schema_version: 'ptm-pregame-v1', player_a: 'ALEX ALFA', player_b: 'BORIS BETA',
  scheduled_at_utc: '2026-11-07T15:00:00Z', statistics, observed_rows: 10,
  cutoff_enforced: true, upstream_verified: false,
  model_probability_verified: false, decision: 'DESCARTAR', amount_usd: 0
};
function load(p) {
  element('pregame-json').value = JSON.stringify(p);
  element('load-pregame-json').listeners.click();
  return element('pregame-json-status').textContent;
}
assert.match(load(payload), /Informe descriptivo cargado/);
assert.ok(fields.every(row => row.querySelector('strong').textContent === 'OBSERVADO'));
assert.equal(element('ptm-probability').textContent, 'SIN VERIFICAR');
assert.equal(element('ptm-filter').textContent, 'SIN VERIFICAR');
for (const invalid of [
  { ...payload, player_b: 'OTHER' },
  { ...payload, cutoff_enforced: false },
  { ...payload, model_probability_verified: true },
  { ...payload, amount_usd: 100 },
  { ...payload, observed_rows: 201 }
]) assert.match(load(invalid), /No se cargó el informe/);
element('match').value = 'CARLOS VS DIEGO';
element('analyze').listeners.click();
assert.ok(fields.every(row => row.querySelector('strong').textContent === 'SIN VERIFICAR'));
console.log('PASS: 14/14 fields, fail-closed import, 70% unverified, reset on new match');
