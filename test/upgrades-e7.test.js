const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');

const rec = (input, catalog = data, term = 'annual') => engine.recommend(input, { term }, catalog);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const upgrades = ['Defender Suite for BizPrem', 'Purview Suite for BizPrem', 'BizPrem E5 Upgrade'];

test('approved upgrade and E7 prices have official sources, dates and prerequisites', () => {
  for (const [key, price] of upgrades.map((key, index) => [key, [8.70, 8.70, 13][index]])) {
    const entry = data.PRICES[key];
    assert.equal(entry.price, price, key);
    assert.equal(entry.requires, 'Business Premium', key);
    assert.equal(entry.currency, 'EUR');
    assert.match(entry.source, /^https:\/\/www\.microsoft\.com\/de-de\/security\//);
    assert.equal(entry.valid_from, '2026-07-01');
    assert.equal(entry.source_checked, '2026-10-18');
    assert.notEqual(entry.todo_source, true);
    assert.ok(data.ADDON_FEATURES[key].length);
    assert.equal(data.FEATURE_SOURCES[key].source, entry.source);
    assert.equal(data.FEATURE_SOURCES[key].valid_from, entry.valid_from);
  }
  assert.equal(data.PRICES['M365 E7'].price, 91.92);
  assert.equal(data.PRICES['M365 E7'].price_no_teams, 84.51);
  assert.equal(data.PRICES['M365 E7'].currency, 'EUR');
  assert.equal(data.PRICES['M365 E7'].source_checked, '2026-10-18');
  assert.equal(data.FEATURE_SOURCES['M365 E7'].valid_from, '2026-07-01');
  for (const feature of [...data.FEATURES_MAP['M365 E5'], 'M365 Copilot', 'Agent 365', 'Entra Suite']) {
    assert.ok(data.FEATURES_MAP['M365 E7'].includes(feature), feature);
  }
});

for (const [flag, upgrade, feature] of [
  ['risk', upgrades[0], 'Entra P2'], ['def2', upgrades[0], 'Def XDR'],
  ['casb', upgrades[0], 'Def XDR'], ['lbl', upgrades[1], 'Comp E5'], ['edisc', upgrades[1], 'Comp E5'],
]) {
  test(`Business Premium plus sourced upgrade covers ${flag} in both Teams variants`, () => {
    for (const teamsVariant of ['included', 'no_teams']) {
      const result = rec({ [flag]: true, desktop: true, teamsVariant });
      assert.equal(result.base, 'Business Premium');
      assert.deepEqual(result.addons, [upgrade]);
      close(result.price, (teamsVariant === 'included' ? 19.06 : 16.28) + 8.70);
      assert.ok(result.features.includes(feature));
      assert.equal(result.features.includes('Teams Collaboration'), teamsVariant === 'included');
      const diff = engine.compare('Business Premium', result, 'annual', data);
      assert.ok(diff.gained.includes(feature));
    }
  });
}

test('combined upgrade wins against single prices, but loses if the singles become cheaper', () => {
  for (const teamsVariant of ['included', 'no_teams']) {
    const input = { risk: true, def2: true, lbl: true, edisc: true, teamsVariant };
    const bundle = rec(input);
    assert.equal(bundle.base, 'Business Premium');
    assert.deepEqual(bundle.addons, [upgrades[2]]);
    close(bundle.price, (teamsVariant === 'included' ? 19.06 : 16.28) + 13);
    assert.ok(bundle.features.includes('Def XDR'));
    assert.ok(bundle.features.includes('Comp E5'));
    const catalog = structuredClone(data);
    catalog.PRICES[upgrades[2]].price = 18; // Synthetischer Preis, kein Listenpreis.
    const singles = rec(input, catalog);
    assert.deepEqual(singles.addons, upgrades.slice(0, 2));
    close(singles.price, (teamsVariant === 'included' ? 19.06 : 16.28) + 17.40);
  }
});

test('upgrade comparison considers E3/E5, user limits and all requested features', () => {
  const catalog = structuredClone(data);
  catalog.PRICES[upgrades[0]].price = 40;
  const e3 = rec({ risk: true, desktop: true }, catalog);
  assert.equal(e3.base, 'M365 E3');
  close(e3.price, 37.78 + 10.40);
  assert.ok(e3.features.includes('Entra P2'));
  assert.equal(rec({ count: 301, risk: true, lbl: true }).base, 'M365 E5');
  assert.equal(rec({ count: 300, risk: true, lbl: true }).base, 'Business Premium');
  const intune = rec({ risk: true, rh: true });
  assert.equal(intune.base, 'Business Premium');
  close(intune.price, 30.76);
  assert.ok(intune.features.includes('Remote Help'));
  for (const input of [{ count: 301 }, { style: 'frontline' }, { style: 'standalone' }, { count: 301, copilot: true }]) {
    const result = rec({ ...input, risk: true, lbl: true });
    assert.equal(result.addons.some(key => upgrades.includes(key)), false);
  }
  const copilot = rec({ copilot: true, risk: true, lbl: true });
  assert.equal(copilot.base, 'Business Premium');
  assert.deepEqual(copilot.addons, ['BizPrem E5 Upgrade', 'Copilot Business']);
  close(copilot.price, 50.26);
});

test('upgrades and E7 preserve explicit Teams/Phone need without double charging', () => {
  const input = { risk: true, lbl: true, phone: true, teamsVariant: 'no_teams' };
  const result = rec(input);
  assert.equal(result.base, 'Business Premium');
  assert.deepEqual(result.addons, ['Teams EWR', upgrades[2], 'Teams Phone Add-on']);
  close(result.price, 16.28 + 7.41 + 13 + 8.70);
  assert.equal(rec({ ...input, teamsVariant: 'included' }).addons.includes('Teams EWR'), false);
});

test('actual EUR prices never recommend E7 instead of cheaper E5 plus Copilot', () => {
  for (const teamsVariant of ['included', 'no_teams']) {
    assert.notEqual(rec({ teamsVariant }).base, 'M365 E7');
    const result = rec({ count: 500, risk: true, lbl: true, copilot: true, teamsVariant });
    assert.equal(result.base, 'M365 E5');
    assert.deepEqual(result.addons, ['M365 Copilot']);
    close(result.price, (teamsVariant === 'included' ? 58.13 : 50.71) + 26);
    assert.ok(result.price < (teamsVariant === 'included' ? 91.92 : 84.51));
  }
});

test('E7 wins below every eligible combination or with fewer products at equality; requires Copilot', () => {
  for (const teamsVariant of ['included', 'no_teams']) {
    for (const term of ['annual', 'monthly']) {
      const catalog = structuredClone(data);
      const field = teamsVariant === 'included' ? 'price' : 'price_no_teams';
      // Synthetischer Copilot-Preis macht den positiven Auswahlfall erreichbar.
      catalog.PRICES['M365 Copilot'].price = 40;
      const input = { count: 500, risk: true, lbl: true, copilot: true, teamsVariant, visio: true };
      const result = rec(input, catalog, term);
      assert.equal(result.base, 'M365 E7');
      assert.deepEqual(result.addons, ['Visio Plan 2']);
      close(result.price, (catalog.PRICES['M365 E7'][field] + 12.70) * (term === 'monthly' ? 1.2 : 1));
      assert.ok(result.features.includes('M365 Copilot'));
      const comparison = engine.compare('M365 E7', result, term, catalog);
      close(comparison.currentPrice, catalog.PRICES['M365 E7'][field] * (term === 'monthly' ? 1.2 : 1));
      const withTeams = rec({ ...input, teams: true }, catalog, term);
      assert.deepEqual(withTeams.addons, teamsVariant === 'included' ? ['Visio Plan 2'] : ['Teams EWR', 'Visio Plan 2']);
      const withPhone = rec({ ...input, phone: true }, catalog, term);
      assert.equal(withPhone.base, 'M365 E7');
      assert.deepEqual(withPhone.addons, withTeams.addons, 'E7 already includes Teams Phone');
      close(withPhone.price, withTeams.price);
      catalog.PRICES['M365 E7'][field] = catalog.PRICES['M365 E5'][field] + 40;
      assert.equal(rec(input, catalog, term).base, 'M365 E7', 'equal price prefers included Copilot');
      catalog.PRICES['M365 E7'][field] = 1;
      assert.notEqual(rec({ ...input, copilot: false }, catalog, term).base, 'M365 E7');
      assert.equal(rec({ copilot: true, teamsVariant }, catalog, term).base, 'M365 E7');
    }
  }
});

test('new combinations ignore USD reference fields', () => {
  const catalog = structuredClone(data);
  for (const entry of Object.values(catalog.PRICES)) entry.usd_list = 999999;
  for (const input of [{ risk: true, lbl: true }, { copilot: true, risk: true, lbl: true, count: 500 }]) {
    assert.deepEqual(rec(input, catalog), rec(input));
  }
});

test('Teams variant can change the cheapest upgrade base and E7 must also beat E3 plus add-ons', () => {
  const catalog = structuredClone(data);
  catalog.PRICES[upgrades[0]].price = 27; // Synthetischer Break-even an der Variantengrenze.
  assert.equal(rec({ risk: true, desktop: true }, catalog).base, 'Business Premium');
  assert.equal(rec({ risk: true, desktop: true, teamsVariant: 'no_teams' }, catalog).base, 'M365 E3');
  catalog.PRICES['M365 Copilot'].price = 40;
  // E7 schlägt E5 + Copilot, aber nicht E3 + Copilot: kein E7-Sonderpfad.
  assert.equal(rec({ count: 500, copilot: true }, catalog).base, 'M365 E3');
  catalog.PRICES['M365 E7'].price_no_teams = 55;
  assert.equal(rec({ count: 500, copilot: true, teamsVariant: 'no_teams' }, catalog).base, 'M365 E7');
});
