const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

function app() {
  const elements = {};
  for (const match of html.matchAll(/<(input|select|[a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
    elements[match[2]] = { tagName: match[1].toUpperCase(), type: /type="([^"]+)"/.exec(match[0])?.[1], value: /value="([^"]*)"/.exec(match[0])?.[1] || '', checked: /\bchecked\b/.test(match[0]), innerHTML: '', style: {}, classList: { add() {}, remove() {} } };
  }
  elements.workstyle.value = 'office';
  elements.currentLicense.value = 'Business Standard';
  const context = vm.createContext({ LICENSE_DATA: data, LicenseEngine: engine, LicenseCSV: fs.existsSync(path.join(__dirname, '../src/csv.js')) ? require('../src/csv.js') : {}, document: { getElementById: id => elements[id] }, window: { scrollTo() {} }, alert() {}, FileReader: class { readAsText(file) { this.onload({ target: { result: file.text } }); } } });
  vm.runInContext(html.match(/<script>\s*\/\/ CONFIG([\s\S]*?)<\/script>/)[1], context);
  return { elements, run: code => vm.runInContext(code, context) };
}

test('UI carries variant through recommendation, alternative, quote, edit, preset and reset', () => {
  const ui = app();
  ui.elements.teamsNoTeams.checked = true;
  ui.elements.teamsIncluded.checked = false;
  ui.run('recalc()');
  assert.equal(ui.run('currentCalc.teamsVariant'), 'no_teams');
  assert.equal(ui.run('currentCalc.price'), data.PRICES['Business Basic'].price_no_teams);
  assert.equal(ui.elements.altPrice.innerText, '€9.34');
  assert.equal(ui.elements.priceDelta.innerText, '-€4.67');
  assert.match(ui.elements.recPriceStand.innerText, /01\.07\.2026/);
  ui.run('addToQuote()');
  assert.equal(ui.run('quoteItems[0].teamsVariant'), 'no_teams');
  assert.match(ui.elements.quoteBody.innerHTML, /ohne Teams \(EWR-Variante\)/);
  assert.match(ui.elements.quoteBody.innerHTML, /01\.07\.2026/);
  ui.run('editPersona(0)');
  assert.equal(ui.elements.teamsNoTeams.checked, true);
  ui.run('setTerm("monthly")');
  assert.equal(ui.run('currentCalc.price'), 4.67 * 1.2);
  ui.run('applyPreset("Marketing Team")');
  assert.equal(ui.run('currentCalc.teamsVariant'), 'included');
  ui.run('resetForm()');
  assert.equal(ui.elements.teamsIncluded.checked, true);
});

test('UI legacy import shows a persistent notice and escapes imported text', () => {
  const ui = app();
  ui.run('handleFileSelect({files:[{text:\'Persona,Count,Base,Addons,Price,Total,CurrentLic\\n"<img onerror=x>",1,"Business Basic","",6.07,6.07,"None"\'}],value:"file"})');
  assert.match(ui.elements.csvImportNotice.innerText, /im Paket/);
  assert.equal(ui.elements.csvImportNotice.hidden, false);
  assert.ok(ui.elements.quoteBody.innerHTML.includes('&lt;img onerror=x&gt;'));
  assert.ok(!ui.elements.quoteBody.innerHTML.includes('<img onerror=x>'));
});

test('engine supports both variants without Teams double-counting at both terms', () => {
  for (const term of ['annual', 'monthly']) {
    for (const teamsVariant of ['included', 'no_teams']) {
      const result = engine.recommend({ count: 10, desktop: true, teamsVariant }, { term }, data);
      assert.equal(result.price, data.PRICES[result.base][teamsVariant === 'included' ? 'price' : 'price_no_teams'] * (term === 'monthly' ? 1.2 : 1));
      assert.ok(!result.addons.includes('Teams EWR'));
      assert.equal(result.features.includes('Teams Collaboration'), teamsVariant === 'included');
    }
  }
});

test('CSV loads as a classic local script and new files have no network references', () => {
  assert.ok(html.indexOf('<script src="src/csv.js"></script>') > -1);
  assert.ok(html.indexOf('<script src="src/csv.js"></script>') < html.indexOf('<script>\n        // CONFIG'));
  for (const file of ['src/csv.js', 'test/csv.test.js', 'test/teams-ui.test.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), /fetch\s*\(|https?:\/\//);
  }
});

test('new controls have scoped dark styles, keyboard focus and narrow-screen wrapping', () => {
  const css = fs.readFileSync(path.join(__dirname, '../.impeccable/build/scaffold/layout.css'), 'utf8');
  assert.match(css, /\.dark \.teams-options/);
  assert.match(css, /\.dark \.price-stand/);
  assert.match(css, /input:focus-visible \+ \.box/);
  assert.match(css, /\.teams-options \.req-grid \{ grid-template-columns: 1fr;/);
  assert.match(css, /\.right-col > \.rec-block \{ overflow: auto;/);
});
