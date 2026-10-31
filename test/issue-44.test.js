const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');
const { app, html } = require('./fixtures/ui-app.js');

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const rec = (input, term = 'annual', catalog = data) => engine.recommend(input, { term }, catalog);

for (const [base, input, addon, unit] of [
  ['Business Basic', {}, 'Copilot Business', 24.27],
  ['Business Standard', { desktop: true }, 'Copilot Business', 30.33],
  ['Business Premium', { mdm: true }, 'Copilot Business', 37.26],
  ['M365 E3', { count: 301, desktop: true }, 'M365 Copilot', 63.78],
  ['M365 E5', { count: 301, risk: true, lbl: true }, 'M365 Copilot', 84.13],
]) {
  test(`Copilot variant and list price for ${base}`, () => {
    for (const teamsVariant of ['included', 'no_teams']) {
      for (const term of ['annual', 'monthly']) {
        const result = rec({ count: 50, style: 'office', ...input, teamsVariant, copilot: true }, term);
        assert.equal(result.base, base);
        assert.deepEqual(result.addons, [addon]);
        const expected = unit - (teamsVariant === 'no_teams' ? data.PRICES[base].price - data.PRICES[base].price_no_teams : 0);
        close(result.price, expected * (term === 'monthly' ? 1.2 : 1));
        assert.equal(result.features.filter(f => f === 'M365 Copilot').length, 1);
        assert.equal(result.features.includes('Copilot Business'), false);
      }
    }
  });
}

test('both Copilot add-ons expose the same sourced comparison feature', () => {
  for (const key of ['Copilot Business', 'M365 Copilot']) {
    assert.deepEqual(data.ADDON_FEATURES[key], ['M365 Copilot']);
    assert.equal(data.FEATURE_SOURCES[key].source, data.PRICES[key].source);
    assert.equal(data.FEATURE_SOURCES[key].valid_from, data.PRICES[key].valid_from);
  }
  for (const count of [50, 301]) {
    const result = rec({ count, desktop: true, copilot: true });
    const gained = engine.compare(result.base, result, 'annual', data);
    assert.deepEqual(gained.gained.filter(f => /Copilot/.test(f)), ['M365 Copilot']);
    assert.equal(gained.lost.includes('M365 Copilot'), false);
    const retained = engine.compare('M365 E7', result, 'annual', data);
    assert.equal(retained.gained.some(f => /Copilot/.test(f)), false);
    assert.equal(retained.lost.some(f => /Copilot/.test(f)), false);
    const removed = engine.compare('M365 E7', rec({ count, desktop: true }), 'annual', data);
    assert.ok(removed.lost.includes('M365 Copilot'));
  }
});

test('Business Copilot is available at 300 users but not 301', () => {
  for (const requirements of [{}, { desktop: true }, { mdm: true }]) {
    const atLimit = rec({ count: 300, copilot: true, ...requirements });
    assert.match(atLimit.base, /^Business /);
    assert.deepEqual(atLimit.addons, ['Copilot Business']);
    const aboveLimit = rec({ count: 301, copilot: true, ...requirements });
    assert.match(aboveLimit.base, /^M365 E/);
    assert.equal(aboveLimit.addons.includes('Copilot Business'), false);
    assert.deepEqual(aboveLimit.addons, ['M365 Copilot']);
  }
});

test('O365 and F bases remain ineligible for Copilot even at a lower price', () => {
  for (const base of ['O365 E1', 'O365 E3', 'O365 E5', 'M365 F1', 'M365 F3']) {
    const catalog = structuredClone(data);
    catalog.PRICES[base].price = 0; // Synthetischer Auswahltest, kein Katalogpreis.
    const result = rec({ count: 301, copilot: true, style: base.startsWith('M365 F') ? 'frontline' : 'office' }, 'annual', catalog);
    assert.match(result.base, /^M365 E/);
    assert.deepEqual(result.addons, ['M365 Copilot']);
  }
  assert.match(rec({ style: 'frontline', count: 50, copilot: true }).base, /^M365 E/);
});

test('candidate evaluation uses Business Copilot cost and preserves tie-breaking', () => {
  const catalog = structuredClone(data);
  const input = { count: 50, risk: true, lbl: true, copilot: true };
  catalog.PRICES['M365 E5'].price = 29; // E5 + Copilot = 55, Business-Kombination = 50,26.
  const business = rec(input, 'annual', catalog);
  assert.equal(business.base, 'Business Premium');
  assert.deepEqual(business.addons, ['BizPrem E5 Upgrade', 'Copilot Business']);
  close(business.price, 50.26);
  catalog.PRICES['M365 E5'].price = 24.26;
  assert.equal(rec(input, 'annual', catalog).base, 'M365 E5', 'equal cost prefers fewer add-ons');
});

test('E7 includes Copilot without an add-on; standalone keeps M365 Copilot', () => {
  const catalog = structuredClone(data);
  catalog.PRICES['M365 E7'].price = 1;
  const e7 = rec({ copilot: true }, 'annual', catalog);
  assert.equal(e7.base, 'M365 E7');
  assert.deepEqual(e7.addons, []);
  assert.equal(e7.features.filter(f => f === 'M365 Copilot').length, 1);
  for (const count of [300, 301]) {
    const standalone = rec({ style: 'standalone', count, copilot: true });
    assert.equal(standalone.base, 'None');
    assert.deepEqual(standalone.addons, ['M365 Copilot']);
    close(standalone.price, 26);
  }
});

test('Copilot presets have correct component, per-user and total costs', () => {
  // Alle bestehenden Copilot-Presets plus weitere Presets mit aktiviertem adv_copilot.
  const presets = Object.entries(data.PERSONA_PRESETS).filter(([, preset]) => preset.adv_copilot);
  assert.ok(presets.some(([name]) => name === 'Executive / C-Level'));
  for (const name of ['Marketing Team', 'Development Team']) presets.push([name, { ...data.PERSONA_PRESETS[name], adv_copilot: true }]);
  for (const [name, preset] of presets) {
    for (const count of [50, 300, 301]) {
      for (const term of ['annual', 'monthly']) {
        const result = rec(engine.mapFormInputs({ ...preset, userCount: count }), term);
        const addon = result.base.startsWith('Business ') ? 'Copilot Business' : 'M365 Copilot';
        assert.ok(result.addons.includes(addon), name);
        if (count > 300) assert.equal(addon, 'M365 Copilot');
        const unit = data.PRICES[result.base].price + result.addons.reduce((sum, key) => sum + data.PRICES[key].price, 0);
        close(result.price, unit * (term === 'monthly' ? 1.2 : 1));
        close(result.price * result.count, unit * (term === 'monthly' ? 1.2 : 1) * count);
        if (name === 'Executive / C-Level' && count <= 300) close(result.price, 58.96 * (term === 'monthly' ? 1.2 : 1));
      }
    }
  }
});

const labels = [
  ['copilotLabel', 'Copilot Business', 'Microsoft 365 Copilot', true],
  ['powerAutoLabel', 'Power Automate Premium', 'Power Automate'],
  ['roomsLabel', 'Teams Rooms Pro', 'Teams Rooms Pro'],
  ['serverLabel', 'Defender for Business Servers', 'Defender Server'],
];

test('requirement labels contain no hard-coded euro amounts', () => {
  const requirements = [...html.matchAll(/<label\b[^>]*class="req-item"[^>]*>([\s\S]*?)<\/label>/g)];
  assert.ok(requirements.length > 0);
  for (const [, content] of requirements) assert.doesNotMatch(content, /€\s*\d|\d(?:[.,]\d+)?\s*€/);
});

test('UI displays German data-driven list prices and keeps labels fixed across terms', () => {
  const ui = app();
  ui.load();
  for (const [id, key, title, from] of labels) {
    assert.ok(ui.elements[id], `missing label ${id}`);
    assert.equal(ui.elements[id].textContent, `${title} (${from ? 'ab ' : ''}${data.PRICES[key].price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)`);
  }
  assert.equal(ui.elements.copilotLabel.textContent, 'Microsoft 365 Copilot (ab 18,20 €)');
  const original = labels.map(([id]) => ui.elements[id].textContent);
  ui.elements.userCount.value = '50';
  ui.elements.desktopApps.checked = true;
  ui.elements.adv_copilot.checked = true;
  ui.run('recalc()');
  assert.equal(ui.run('currentCalc.base'), 'Business Standard');
  assert.equal(ui.elements.recPrice.innerText, '€ 30.33');
  ui.run('addToQuote(); editPersona(0)');
  for (const term of ['monthly', 'annual']) {
    ui.run(`setTerm("${term}")`);
    assert.deepEqual(labels.map(([id]) => ui.elements[id].textContent), original);
    close(ui.run('currentCalc.price'), 30.33 * (term === 'monthly' ? 1.2 : 1));
    close(ui.items()[0].price * 50, 30.33 * (term === 'monthly' ? 1.2 : 1) * 50);
  }
});

test('label initialization reads catalog prices rather than duplicated constants', () => {
  const ui = app();
  ui.context.LICENSE_DATA = structuredClone(data);
  for (const [, key] of labels) ui.context.LICENSE_DATA.PRICES[key].price = 1234.56;
  ui.load();
  for (const [id] of labels) assert.ok(ui.elements[id]?.textContent.includes('1.234,56 €'), id);
});
