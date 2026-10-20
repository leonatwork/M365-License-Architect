const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');

function app() {
  const elements = {};
  for (const match of html.matchAll(/<(input|select|div|span|button|tbody|td|ul)[^>]*id="([^"]+)"[^>]*>/g)) {
    elements[match[2]] = { tagName: match[1].toUpperCase(), type: /type="checkbox"/.test(match[0]) ? 'checkbox' : 'text',
      value: '', checked: false, innerText: '', innerHTML: '', style: {}, classList: { add() {}, remove() {} } };
  }
  Object.assign(elements.userCount, { value: '10' });
  elements.workstyle.value = 'office';
  elements.currentLicense.value = 'M365 E3';
  if (elements.teamsVariant) elements.teamsVariant.value = 'included';
  const context = { LICENSE_DATA: data, LicenseEngine: engine,
    document: { getElementById: id => elements[id] }, window: { scrollTo() {} }, alert() {} };
  const csvPath = require('node:path').join(__dirname, '..', 'src/csv.js');
  if (fs.existsSync(csvPath)) context.LicenseCSV = require(csvPath);
  vm.createContext(context);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { elements, run: code => vm.runInContext(code, context), context };
}

test('UI loads local CSV module before inline code', () => {
  const index = html.indexOf('<script src="src/csv.js"></script>');
  assert.ok(index > 0 && index < html.indexOf('<script>'));
});

test('Teams and price metadata do not introduce an app-wide dark redesign', () => {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
  for (const rule of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const darkSelectors = rule[1].split(',').filter(selector => /\.dark\b/.test(selector));
    for (const selector of darkSelectors) {
      assert.match(selector, /\.(?:teams-field|price-stand|quote-variant|csv-notice)\b/,
        `Dark styling must be scoped to new issue elements: ${selector.trim()}`);
      assert.doesNotMatch(rule[2], /--(?:paper|ink|mute|rule|sheet|hatch)\s*:/);
    }
  }
});

test('Teams selection drives engine, comparison, alternative, quote editing and reset', () => {
  const { elements: el, run } = app();
  assert.ok(el.teamsVariant, 'missing Teams selection');
  run('recalc()');
  assert.equal(el.recPrice.innerText, '€ 6.07');
  el.teamsVariant.value = 'no_teams';
  run('recalc()');
  assert.equal(el.recPrice.innerText, '€ 4.67');
  assert.equal(el.altPrice.innerText, '€9.34');
  assert.equal(run('currentCalc.addons.length'), 0);
  assert.equal(run('LicenseEngine.compare(currentCalc.currentLic, currentCalc, "annual", LICENSE_DATA).currentPrice'), 30.36);
  assert.match(el.recPriceStand.innerText, /Listenpreis in EUR, zzgl\. MwSt\., jährliche Abrechnung.*01\.07\.2026/);
  run('addToQuote()');
  assert.match(el.quoteBody.innerHTML, /ohne Teams \(EWR-Variante\)/);
  assert.match(el.quoteBody.innerHTML, /01\.07\.2026/);
  assert.equal(el.teamsVariant.value, 'included');
  run('editPersona(0)');
  assert.equal(el.teamsVariant.value, 'no_teams');
  run('setTerm("monthly")');
  assert.equal(el.recPrice.innerText, '€ 5.60');
  run('applyPreset("Marketing Team")');
  assert.equal(el.teamsVariant.value, 'no_teams');
  assert.equal(run('currentCalc.addons.filter(a => a === "Teams EWR").length'), 1);
});

test('legacy CSV import renders persistent notice in UI', () => {
  const { elements, run, context } = app();
  context.FileReader = class { readAsText() { this.onload({ target: { result: 'Persona,Count,Base,Addons,Price,Total,CurrentLic\nAlt,1,M365 E3,,37.78,37.78,None' } }); } };
  run('handleFileSelect({ files: [{}], value: "old.csv" })');
  assert.ok(elements.csvNotice, 'missing visible import notice');
  assert.match(elements.csvNotice.textContent, /im Paket/);
  assert.equal(elements.csvNotice.hidden, false);
});

test('engine preserves both Teams variants across office, frontline and standalone terms', () => {
  for (const style of ['office', 'frontline', 'standalone']) {
    for (const term of ['annual', 'monthly']) {
      for (const teamsVariant of ['included', 'no_teams']) {
        const result = engine.recommend({ style, teamsVariant }, { term }, data);
        const entry = data.PRICES[result.base];
        const unit = teamsVariant === 'no_teams' ? entry.price_no_teams ?? entry.price : entry.price;
        assert.equal(result.price, unit * (term === 'monthly' ? 1.2 : 1));
        assert.deepEqual(result.addons, []);
      }
    }
  }
});
