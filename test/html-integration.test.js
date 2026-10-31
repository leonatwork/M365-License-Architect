const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const { app } = require('./fixtures/ui-app.js');

test('index.html loads data and engine scripts before main inline script', () => {
  const dataScript = '<script src="data/licenses.js"></script>';
  const engineScript = '<script src="src/engine.js"></script>';
  const mainScriptStart = '<script>\n        // CONFIG';

  const dataIndex = html.indexOf(dataScript);
  const engineIndex = html.indexOf(engineScript);
  const mainScriptIndex = html.indexOf(mainScriptStart);

  assert.notEqual(dataIndex, -1, 'missing data/licenses.js script include');
  assert.notEqual(engineIndex, -1, 'missing src/engine.js script include');
  assert.notEqual(mainScriptIndex, -1, 'missing main inline script block');
  assert.ok(dataIndex < mainScriptIndex, 'data script must be loaded before inline script');
  assert.ok(engineIndex < mainScriptIndex, 'engine script must be loaded before inline script');
});

test('index.html does not use module imports or fetch for local app files', () => {
  assert.equal(html.includes('type="module"'), false);
  assert.equal(html.includes('fetch('), false);
});

test('index.html uses LICENSE_DATA and LicenseEngine instead of inline logic constants', () => {
  assert.equal(html.includes('const HIERARCHY = {'), false);
  assert.equal(html.includes('const FEATURES_MAP = {'), false);
  assert.equal(html.includes('const PERSONA_PRESETS = {'), false);
  assert.equal(html.includes('const PRICES = {'), false);
  assert.ok(html.includes('LICENSE_DATA'), 'LICENSE_DATA reference missing');
  assert.ok(html.includes('LicenseEngine.recommend('), 'recalc must use LicenseEngine.recommend');
  assert.ok(html.includes('LicenseEngine.compare('), 'render/showComparison must use LicenseEngine.compare');
});

test('recommendation does not hide the separately priced Teams Phone add-on', () => {
  assert.equal(html.includes('c.addons.filter(a => !a.includes("Teams"))'), false);
});

test('quote findings have a hidden live region above the table and distinct warning/error styles', () => {
  assert.match(html, /<div[^>]*id="quoteFindings"[^>]*role="status"[^>]*hidden/);
  assert.ok(html.indexOf('id="quoteFindings"') < html.indexOf('<tbody id="quoteBody"'));
  const warning = html.match(/\.quote-finding-warning\s*\{([^}]+)\}/)?.[1];
  const error = html.match(/\.quote-finding-error\s*\{([^}]+)\}/)?.[1];
  assert.ok(warning && error);
  assert.notEqual(warning, error);
});

test('quote findings update on add, edit and delete, without blocking editing or rewriting recommendations', () => {
  const ui = app();
  ui.load();
  assert.equal(ui.elements.quoteFindings.hidden, true);
  for (const persona of ['Erste', 'Zweite']) {
    ui.elements.personaName.value = persona;
    ui.elements.userCount.value = 200;
    ui.elements.mdmDesktop.checked = true;
    ui.elements.mdmDesktop.dispatch('change');
    ui.elements.actionBtn.click();
  }
  assert.deepEqual(ui.items().map(item => item.base), ['Business Premium', 'Business Premium']);
  assert.equal(ui.elements.quoteFindings.hidden, false);
  assert.match(ui.elements.quoteFindings.innerHTML, /quote-finding-warning/);
  assert.match(ui.elements.quoteFindings.innerHTML, /Warnung.*400/);
  assert.match(ui.elements.quoteFindings.innerHTML, /Zeile 1: Erste.*Zeile 2: Zweite/);
  ui.rowAction('edit', 1);
  ui.elements.userCount.value = 100;
  ui.elements.userCount.dispatch('input');
  ui.elements.actionBtn.click();
  assert.equal(ui.elements.quoteFindings.hidden, true);
  ui.rowAction('edit', 1);
  ui.elements.userCount.value = 101;
  ui.elements.userCount.dispatch('input');
  ui.elements.actionBtn.click();
  assert.equal(ui.elements.quoteFindings.hidden, false);
  ui.rowAction('remove', 0);
  assert.equal(ui.elements.quoteFindings.hidden, true);
  ui.rowAction('remove', 0);
  assert.equal(ui.elements.quoteFindings.hidden, true);
  assert.equal(ui.elements.quoteFindings.innerHTML, '');
});

test('CSV import shows R2 with escaped row references, correction removes it and standalone imports are exempt', () => {
  const ui = app();
  ui.load();
  const csv = 'Persona,Count,Base,Addons,Price\n<img src=x onerror=alert(1)>,1,O365 E3,Defender Suite,36.67\nEinzelprodukt,1,None,EPM Add-on,2.60';
  ui.context.FileReader = class {
    addEventListener(type, callback) { this[type] = callback; }
    readAsText() { this.load({ target: { result: csv } }); }
  };
  ui.elements.csvInput.files = [{ size: csv.length }];
  ui.elements.csvInput.dispatch('change');
  assert.equal(ui.items().length, 2);
  assert.equal(ui.items()[1].standalone, true);
  assert.equal(ui.elements.quoteFindings.hidden, false);
  assert.match(ui.elements.quoteFindings.innerHTML, /quote-finding-error/);
  assert.match(ui.elements.quoteFindings.innerHTML, /Fehler.*Defender Suite/);
  assert.match(ui.elements.quoteFindings.innerHTML, /Zeile 1: &lt;img/);
  assert.doesNotMatch(ui.elements.quoteFindings.innerHTML, /<img\b|Einzelprodukt/);
  ui.run('quoteItems[0].base = "M365 E3"; renderTable()');
  assert.equal(ui.elements.quoteFindings.hidden, true);
  ui.run('resetForm()');
  ui.elements.workstyle.value = 'standalone';
  ui.elements.adv_epm.checked = true;
  ui.elements.workstyle.dispatch('change');
  ui.elements.actionBtn.click();
  assert.equal(ui.items()[2].standalone, true);
});

test('export refreshes the same findings before CSV serialization and never blocks or changes the format', async () => {
  const ui = app();
  ui.load();
  ui.run('quoteItems = [{ persona: "Office", count: 301, base: "Business Premium", addons: ["Defender Suite"], price: 29.46, currentLic: "None" }]; renderTable()');
  const findings = ui.elements.quoteFindings.innerHTML;
  const originalExport = ui.context.LicenseCSV.exportCSV;
  ui.context.LicenseCSV = { ...ui.context.LicenseCSV, exportCSV(items, data) {
    assert.equal(ui.elements.quoteFindings.innerHTML, findings, 'findings must be restored before serialization');
    assert.equal(ui.elements.quoteFindings.hidden, false);
    return originalExport(items, data);
  } };
  ui.context.alert = () => assert.fail('findings must not open a blocking dialog');
  ui.elements.quoteFindings.innerHTML = '';
  ui.elements.quoteFindings.hidden = true;
  ui.elements.exportBtn.click();
  assert.equal(ui.downloads.length, 1);
  const exported = await ui.context.exportedBlob.text();
  assert.equal(exported, originalExport(ui.items(), ui.context.LICENSE_DATA));
  assert.equal(exported.split('\n')[0], 'Persona,Count,Base,Addons,Price,Total,CurrentLic,TeamsVariant,PriceDate,PriceNote');
  assert.doesNotMatch(exported, /R1|R2|Warnung|Voraussetzung/);
  ui.rowAction('remove', 0);
  assert.equal(ui.items().length, 0);
});
