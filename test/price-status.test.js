const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/engine.js');
const csv = require('../src/csv.js');
const data = require('../data/licenses.js');
const { app, html } = require('./fixtures/ui-app.js');

test('standalone browser CSV preserves engine price metadata and byte-identical exports', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const browser = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/csv.js'), 'utf8'), browser);
  const catalog = { ...data, PRICES: { ...data.PRICES,
    dated: { valid_from: '2026-10-31', todo_source: true },
    undated: { valid_from: '', todo_source: false },
    confirmed: { valid_from: '2026-01-02', todo_source: false },
    missing: {},
  } };
  const positions = Object.keys(catalog.PRICES).flatMap(key => [
    { base: key }, { base: 'None', addons: [key] },
  ]);
  positions.push({ base: 'None' }, { base: '', addons: ['', 'None'] },
    { base: 'unknown', addons: ['confirmed', 'dated', 'undated', 'dated'] });
  for (const position of positions) {
    const expected = csv.priceInfo(position, catalog);
    assert.deepEqual(JSON.parse(JSON.stringify(browser.LicenseCSV.priceInfo(position, catalog))), expected);
    assert.deepEqual(expected.unsourced,
      engine.priceStatus(position, catalog).filter(status => !status.sourced).map(status => status.key));
  }
  const items = positions.map(position => ({
    persona: '=Müller, "Büro"\nTest', count: 2, price: 43.06, currentLic: 'None',
    addons: [], ...position, priceDate: '2026-01-02', priceNote: 'Gespeicherte "Angebotsnotiz"',
  }));
  const before = structuredClone(items);
  assert.equal(browser.LicenseCSV.exportCSV(items, catalog), csv.exportCSV(items, catalog));
  assert.deepEqual(items, before);
});

test('browser CSV matches Node byte-for-byte when engine and CSV load in application order', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const browser = { TextEncoder };
  for (const file of ['../src/engine.js', '../src/csv.js']) {
    vm.runInNewContext(fs.readFileSync(require.resolve(file), 'utf8'), browser);
  }
  const items = Object.keys(data.PRICES).map(key => ({
    persona: '=Müller, "Büro"\nTest', base: 'None', addons: [key], count: 2,
    price: data.PRICES[key].price, currentLic: 'None', teamsVariant: 'no_teams',
    priceNote: 'Unveränderte "Angebotsnotiz"', priceDate: '2026-01-02',
  }));
  const expected = csv.exportCSV(items, data);
  assert.equal(browser.LicenseCSV.exportCSV(items, data), expected);
  assert.equal(browser.LicenseCSV.exportCSV(browser.LicenseCSV.importCSV(expected, data).items, data), expected);
});

test('priceStatus classifies all catalog components and preserves metadata without mutation', () => {
  const catalog = structuredClone(data);
  for (const entry of Object.values(catalog.PRICES)) Object.freeze(entry);
  Object.freeze(catalog.PRICES);
  for (const [key, entry] of Object.entries(catalog.PRICES)) {
    const expected = key === 'None' ? [] : [{ key,
      sourced: Boolean(entry.valid_from) && entry.todo_source !== true,
      source: entry.source, validFrom: entry.valid_from || null,
      checked: entry.price_source_checked || entry.source_checked || null }];
    assert.deepEqual(engine.priceStatus([key], catalog), expected, key);
    assert.deepEqual(engine.priceStatus(Object.freeze({ base: 'None', addons: Object.freeze([key]) }), catalog), expected, key);
  }
  assert.deepEqual(catalog, data);
});

test('priceStatus handles missing metadata, dated todo_source, empty and unknown positions', () => {
  const catalog = { PRICES: {
    dated: { valid_from: '2026-07-01', todo_source: true },
    undated: { todo_source: false },
    checked: { valid_from: '2026-07-01', source_checked: '2026-10-19' },
    priceChecked: { valid_from: '2026-07-01', price_source_checked: '2026-10-18' },
  } };
  assert.deepEqual(engine.priceStatus({ base: 'None' }, catalog), []);
  assert.deepEqual(engine.priceStatus([], catalog), []);
  assert.deepEqual(engine.priceStatus(['unknown'], catalog), [
    { key: 'unknown', sourced: false, source: null, validFrom: null, checked: null },
  ]);
  const statuses = engine.priceStatus(Object.keys(catalog.PRICES), catalog);
  assert.deepEqual(statuses.map(status => status.sourced), [false, false, true, true]);
  assert.deepEqual(statuses.map(status => status.checked), [null, null, '2026-10-19', '2026-10-18']);
});

test('CSV and both UI locations agree with priceStatus for every catalog component', () => {
  const ui = app();
  ui.load();
  for (const key of Object.keys(data.PRICES)) {
    for (const item of [{ base: key, addons: [] }, { base: 'None', addons: [key] }]) {
      const missing = engine.priceStatus(item, data).filter(status => !status.sourced).map(status => status.key);
      assert.deepEqual(csv.priceInfo(item, data).unsourced, missing);
      const warning = missing.length ? 'Preis unbestätigt: ' + missing.join(', ') : '';
      ui.context.item = item;
      ui.run('Object.assign(currentCalc, item); render(); quoteItems = [{ ...currentCalc, persona: "Test" }]; renderTable()');
      assert.equal(ui.elements.recPriceWarning.innerText, warning, key);
      assert.equal(ui.elements.recPriceWarning.hidden, !warning, key);
      assert.equal(ui.elements.quoteBody.innerHTML.includes('class="price-warning"'), Boolean(warning), key);
      if (warning) assert.ok(ui.elements.quoteBody.innerHTML.includes(warning), key);
      assert.doesNotMatch(ui.elements.recPriceStand.innerText + ui.elements.quoteBody.innerHTML, /Preisstand nicht belegt:/);
    }
  }
});

test('CSV and UI actually call the shared status function rather than duplicate classification', () => {
  const original = engine.priceStatus;
  const status = [{ key: 'Business Basic', sourced: false, source: 'Testquelle', validFrom: '2026-01-02', checked: null }];
  let calls = 0;
  engine.priceStatus = () => { calls++; return status; };
  try {
    assert.deepEqual(csv.priceInfo({ base: 'Business Basic' }, data), {
      priceDate: '2026-01-02', priceNote: data.PRICE_NOTE + '; Preisstand nicht belegt: Business Basic', unsourced: ['Business Basic'],
    });
    const ui = app();
    ui.context.LicenseEngine = { ...engine };
    ui.load();
    assert.equal(ui.elements.recPriceWarning.innerText, 'Preis unbestätigt: Business Basic');
    assert.match(ui.elements.recPriceStand.innerText, /02\.01\.2026/);
    assert.match(ui.elements.recPriceDetails.innerHTML, /Testquelle/);
    assert.ok(calls >= 4);
  } finally { engine.priceStatus = original; }
});

test('price details include each component, German dates and explicit missing metadata', () => {
  const ui = app();
  ui.load();
  ui.run('currentCalc.base = "M365 E7"; currentCalc.addons = ["Visio Plan 2", "Intune Plan 2 Add-on"]; render(); addToQuote()');
  const quote = ui.elements.quoteBody.innerHTML;
  assert.match(quote, /M365 E7[\s\S]*Quelle: https:\/\/www\.microsoft\.com[\s\S]*Stand: 01\.07\.2026[\s\S]*Prüfdatum: 18\.10\.2026/);
  assert.match(quote, /Visio Plan 2[\s\S]*Quelle: m365maps\.com \+ Microsoft-Preisseite[\s\S]*Stand: nicht belegt[\s\S]*Prüfdatum: nicht vorhanden/);
  assert.match(quote, /Intune Plan 2 Add-on[\s\S]*Prüfdatum: 18\.10\.2026/);
  assert.match(ui.elements.recPriceDetails.innerHTML, /Business Basic[\s\S]*Quelle:[\s\S]*Stand: 01\.07\.2026/);
  ui.run('currentCalc.base = "None"; currentCalc.addons = ["Unbekannt"]; render()');
  assert.match(ui.elements.recPriceDetails.innerHTML, /Quelle: nicht vorhanden/);
});

test('total warning follows add, edit, removal, imported notes and term changes', () => {
  const ui = app();
  ui.load();
  const check = expected => {
    assert.ok(ui.elements.grandTotalWarning, 'missing total warning');
    assert.equal(ui.elements.grandTotalWarning.hidden, !expected);
    assert.equal(ui.elements.grandTotalWarning.innerText, expected ? 'Gesamtsumme enthält unbestätigte Preise.' : '');
    const total = ui.items().reduce((sum, item) => sum + item.count * item.price, 0);
    assert.equal(ui.elements.grandTotal.innerText || '€0.00', '€' + total.toFixed(2));
  };
  check(false);
  ui.run('applyPreset("Marketing Team"); addToQuote()');
  check(false);
  ui.run('applyPreset("Project Manager"); addToQuote()');
  check(true);
  ui.run('editPersona(1); applyPreset("Marketing Team"); addToQuote()');
  check(false);
  ui.context.FileReader = class {
    addEventListener(type, callback) { this[type] = callback; }
    readAsText() { this.load({ target: { result: 'Persona,Count,Base,Addons,Price,Total,CurrentLic,PriceNote\nImport,1,None,Visio Plan 2,12.7,12.70,None,Bestätigt' } }); }
  };
  ui.elements.csvInput.files = [{ size: 130 }];
  ui.elements.csvInput.dispatch('change');
  check(true);
  ui.elements.btnMonthly.click();
  check(true);
  assert.equal(ui.items()[2].priceNote, 'Bestätigt');
  ui.rowAction('remove', 2);
  check(false);
  ui.rowAction('remove', 1);
  ui.rowAction('remove', 0);
  check(false);
  assert.match(html, /id="grandTotal"[^>]*aria-describedby="grandTotalWarning"/);
  assert.match(html, /id="grandTotalWarning"[^>]*role="status"/);
});

test('price detail templates escape product, source, dates and labels', () => {
  const ui = app();
  const payload = `"><svg onload='alert(1)'> &`;
  ui.context.LICENSE_DATA = { ...data, PRICES: { ...data.PRICES,
    [payload]: { valid_from: payload, source: payload, source_checked: payload, todo_source: true } } };
  ui.context.payload = payload;
  ui.load();
  ui.run('currentCalc.base = payload; currentCalc.addons = []; render(); quoteItems = [{ ...currentCalc, persona: payload }]; renderTable()');
  for (const markup of [ui.elements.recPriceDetails.innerHTML, ui.elements.quoteBody.innerHTML]) {
    assert.doesNotMatch(markup, /<svg\b/);
    assert.match(markup, /Quelle: &quot;&gt;&lt;svg/);
    assert.match(markup, /Stand: &quot;&gt;&lt;svg/);
    assert.match(markup, /Prüfdatum: &quot;&gt;&lt;svg/);
    for (const [tag] of markup.matchAll(/<[^>]*>/g)) assert.doesNotMatch(tag, /\son[a-z]+\s*=/i);
  }
});

// Mount only rendered price controls in the existing dependency-free event/DOM stub.
// Native button activation (Enter/Space -> click) remains a browser contract.
function priceControl(ui, container, index = 0) {
  const markup = container.innerHTML;
  const tags = [...markup.matchAll(/<button\b[^>]*data-price-info[^>]*>/g)];
  assert.ok(tags[index], 'missing focusable price info button');
  const attributes = Object.fromEntries([...tags[index][0].matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
  assert.equal(attributes.type, 'button');
  assert.equal(attributes.tabindex === '-1', false);
  assert.match(attributes['aria-label'], /Preisinformationen/);
  assert.equal(attributes['aria-expanded'], 'false');
  assert.equal(attributes['aria-describedby'], attributes['aria-controls']);
  const id = attributes['aria-controls'];
  const panelTag = [...markup.matchAll(/<div\b[^>]*>/g)].find(match => match[0].includes(`id="${id}"`))?.[0];
  assert.ok(panelTag, 'aria-controls must resolve to the rendered detail');
  assert.match(panelTag, /role="region"/);
  assert.match(panelTag, /tabindex="0"/);
  assert.match(panelTag, /\shidden[\s>]/);
  const panel = ui.elements[id] = { hidden: true,
    focus() { ui.context.document.activeElement = this; },
    closest: selector => selector.includes('.price-popover') ? panel : null,
  };
  const button = { dataset: { priceInfo: '' },
    getAttribute: name => attributes[name],
    setAttribute: (name, value) => { attributes[name] = value; },
    focus() { ui.context.document.activeElement = this; },
    closest: selector => selector.includes('data-price-info') ? button : null,
  };
  return { button, panel, attributes,
    activate() { button.focus(); container.dispatch('click', { closest: button.closest }); },
  };
}

test('price info buttons focus, toggle accessible state and close on Escape in recommendation and quote', () => {
  const ui = app();
  ui.load();
  ui.run('applyPreset("Project Manager"); addToQuote(); applyPreset("Marketing Team"); addToQuote()');
  const rec = priceControl(ui, ui.elements.recPriceDetails);
  const unsourced = priceControl(ui, ui.elements.quoteBody, 0);
  const sourced = priceControl(ui, ui.elements.quoteBody, 1);
  assert.equal(new Set([rec, unsourced, sourced].map(control => control.attributes['aria-controls'])).size, 3);
  for (const control of [rec, unsourced, sourced]) {
    control.activate();
    assert.equal(ui.context.document.activeElement, control.button);
    assert.equal(control.panel.hidden, false);
    assert.equal(control.attributes['aria-expanded'], 'true');
    ui.context.window.dispatch('keydown', control.button, { key: 'Tab' });
    assert.equal(control.panel.hidden, false, 'unrelated keys must not be swallowed');
    control.panel.focus();
    ui.context.window.dispatch('click', control.panel);
    assert.equal(control.panel.hidden, false, 'clicking detail text must keep it readable');
    let prevented = false;
    ui.context.window.dispatch('keydown', control.panel, { key: 'Escape', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(control.panel.hidden, true);
    assert.equal(control.attributes['aria-expanded'], 'false');
    assert.equal(ui.context.document.activeElement, control.button);
    control.activate();
    control.activate();
    assert.equal(control.panel.hidden, true);
  }
  rec.activate();
  sourced.activate();
  assert.equal(rec.panel.hidden, true, 'only one popover stays open');
  ui.run('renderTable()');
  assert.equal(sourced.panel.hidden, true, 'rerender clears stale popovers');
  const rerendered = priceControl(ui, ui.elements.quoteBody, 0);
  rerendered.activate();
  ui.context.window.dispatch('click', { closest: () => null });
  assert.equal(rerendered.panel.hidden, true, 'outside click dismisses the popover');
  assert.equal(ui.items().length, 2, 'price buttons must not trigger row actions');
});

test('price warnings sit at the recommendation price and quote unit, using theme tokens', () => {
  assert.match(html, /id="recPrice"[\s\S]*?id="recPriceWarning"[\s\S]*?id="priceDelta"/);
  const ui = app();
  ui.load();
  ui.run('applyPreset("Project Manager"); addToQuote()');
  const unitCell = ui.elements.quoteBody.innerHTML.match(/<td data-label="Unit"[^>]*>([\s\S]*?)<\/td>/)[1];
  assert.match(unitCell, /^<div class="price-summary">€[\s\S]*class="price-warning"[\s\S]*data-price-info[\s\S]*<\/div>$/,
    'keep price, warning and info together in the mobile label/content grid');
  for (const selector of ['price-info', 'price-popover']) {
    const rule = html.match(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`))?.[1];
    assert.ok(rule);
    assert.match(rule, /var\(--(?:ink|paper|rule)\)/);
    assert.doesNotMatch(rule, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  }
  assert.match(html, /\.price-info:focus-visible\s*\{[^}]*outline:/);
});
