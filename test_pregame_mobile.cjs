'use strict';
// Browser-free smoke test of the iPhone JSON contract. Synthetic inputs only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.style = {};
    this.className = '';
    this.classList = { toggle() {}, add() {}, remove() {} };
    this.textContent = '';
    this.value = '';
    this.files = [];
    this.disabled = false;
  }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  querySelectorAll(selector) {
    if (selector === '[data-key]') return this.children.filter(node => node.dataset.key);
    return [];
  }
  querySelector(selector) {
    if (selector === 'strong') return this.children.find(node => node.tagName === 'strong');
    return undefined;
  }
  click() { return this.listeners.click?.(); }
}

async function main() {
  const html = fs.readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'Inline iPhone script is present');
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement(tag) { return new Element(tag); },
  };
  vm.runInNewContext(match[1], {
    document, console, Date, AbortController, setTimeout, clearTimeout,
    navigator: { clipboard: { writeText: async () => {} } },
    fetch: async () => { throw new Error('Network must not be used by smoke test'); },
  }, { timeout: 2000, filename: 'index.html inline script' });
  const get = id => document.getElementById(id);
  const keys = [...get('report-fields').children].map(row => row.dataset.key);
  assert.equal(keys.length, 14, '14 PREGAME statistical indicators');
  get('match').value = 'A VS B';
  get('analyze').click();
  const payload = {
    schema_version: 'ptm-pregame-v1', player_a: 'A', player_b: 'B',
    scheduled_at_utc: '2026-11-07T18:00:00Z',
    provenance: { source_url: 'https://example.org/records', captured_at_utc: '2026-11-07T17:00:00Z' },
    cutoff_enforced: true, upstream_verified: false, model_probability_verified: false,
    decision: 'DESCARTAR', amount_usd: 0, observed_rows: 2,
    statistics: Object.fromEntries(keys.map(key => [key, 'OBSERVADO - SIN VERIFICAR'])),
  };
  const raw = JSON.stringify(payload);
  const picker = get('pregame-json-file');
  picker.files = [{ size: Buffer.byteLength(raw), text: async () => raw }];
  assert.equal(typeof picker.listeners.change, 'function', 'iPhone Files listener registered');
  await picker.listeners.change({ target: picker });
  for (const row of get('report-fields').children) {
    assert.equal(row.querySelector('strong').textContent, 'OBSERVADO - SIN VERIFICAR');
  }
  assert.match(get('pregame-json-status').textContent, /cargado/);
  assert.equal(get('ptm-probability').textContent, 'SIN VERIFICAR');
  assert.equal(get('ptm-filter').textContent, 'SIN VERIFICAR');
  assert.match(get('ptm-scheduled').textContent, /2026/);
  assert.match(get('ptm-provenance').textContent, /NO autenticada/);
  get('match').value = 'C VS D';
  get('analyze').click();
  for (const row of get('report-fields').children) {
    assert.equal(row.querySelector('strong').textContent, 'SIN VERIFICAR');
  }
  picker.files = [{ size: 100001, text: async () => raw }];
  await picker.listeners.change({ target: picker });
  assert.match(get('pregame-json-status').textContent, /demasiado grande/);
  console.log('PASS: 14 fields, local iPhone JSON import, conservative filter, match reset, file size');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
