const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');

const rec = (input, catalog = data, term = 'annual') => engine.recommend(input, { term }, catalog);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const products = [
  ['rh', 'Remote Help Add-on', 'Remote Help', 3],
  ['epm', 'EPM Add-on', 'EPM', 2.60],
  ['aa', 'Advanced Analytics Add-on', 'Advanced Analytics', 4.30],
  ['eam', 'EAM Add-on', 'EAM', 1.73],
  ['pki', 'Cloud PKI Add-on', 'Cloud PKI', 1.73],
  ['intune2', 'Intune Plan 2 Add-on', 'Intune Plan 2', 3.50],
];

test('six Intune products and enterprise suites have EUR prices, dated sources and prerequisites', () => {
  for (const [, key, feature, price] of products) {
    const entry = data.PRICES[key];
    assert.equal(entry?.price, price, key);
    assert.equal(entry.currency, 'EUR');
    assert.equal(entry.requires, 'Intune Plan 1');
    assert.match(entry.source, /^https:\/\/www\.microsoft\.com\/de-de\/security\//);
    assert.equal(entry.valid_from, '2026-07-01');
    assert.equal(entry.source_checked, '2026-10-19');
    assert.notEqual(entry.todo_source, true);
    assert.deepEqual(data.ADDON_FEATURES[key], [feature]);
    assert.equal(data.FEATURE_SOURCES[key].source, entry.source);
    assert.equal(data.FEATURE_SOURCES[key].valid_from, entry.valid_from);
  }
  for (const key of ['Defender Suite', 'Purview Suite']) {
    const entry = data.PRICES[key];
    assert.equal(entry?.price, 10.40);
    assert.deepEqual(entry.requires, ['M365 E3', 'M365 E5', 'M365 E7']);
    assert.equal(entry.currency, 'EUR');
    assert.match(entry.source, /^https:\/\/www\.microsoft\.com\/de-de\/security\//);
    assert.equal(entry.valid_from, '2026-07-01');
    assert.ok(data.ADDON_FEATURES[key].length);
    assert.equal(data.FEATURE_SOURCES[key].source, entry.source);
    assert.equal(data.PRICES[key === 'Defender Suite' ? 'M365 E5 Security Add-on' : 'M365 E5 Compliance Add-on'], undefined);
  }
});

test('IT Administrator covers all requirements for 30.76 EUR', () => {
  const result = rec({ desktop: true, teams: true, mdm: true, win: true, ca: true, def2: true, rh: true });
  assert.equal(result.base, 'Business Premium');
  assert.deepEqual(result.addons, ['Remote Help Add-on', 'Defender Suite for BizPrem']);
  close(result.price, 30.76);
  for (const feature of ['Desktop Apps', 'Teams Collaboration', 'Intune Plan 1', 'Win OS (VDA)', 'Entra P1', 'Def XDR', 'Remote Help']) {
    assert.ok(result.features.includes(feature), feature);
  }
});

for (const [flag, key, feature, price] of products) {
  test(`only ${feature}: Business Premium plus individual product is cheapest`, () => {
    for (const teamsVariant of ['included', 'no_teams']) {
      const input = { [flag]: true, teamsVariant };
      const result = rec(input);
      assert.equal(result.base, 'Business Premium');
      assert.deepEqual(result.addons, [key]);
      close(result.price, (teamsVariant === 'included' ? 19.06 : 16.28) + price);
      assert.ok(result.features.includes(feature));
      close(rec(input, data, 'monthly').price, result.price * 1.2);
    }
  });
}

for (const [name, input, addons, price] of [
  ['Defender XDR', { def2: true }, ['Defender Suite for BizPrem'], 27.76],
  ['Defender XDR plus Remote Help', { def2: true, rh: true }, ['Remote Help Add-on', 'Defender Suite for BizPrem'], 30.76],
  ['Purview eDiscovery', { edisc: true }, ['Purview Suite for BizPrem'], 27.76],
]) {
  test(`${name}: cheapest permitted SMB combination`, () => {
    const result = rec(input);
    assert.equal(result.base, 'Business Premium');
    assert.deepEqual(result.addons, addons);
    close(result.price, price);
  });
}

test('enterprise suites require enterprise base and do not charge included E5 features twice', () => {
  for (const [flag, key, feature] of [['def2', 'Defender Suite', 'Def XDR'], ['edisc', 'Purview Suite', 'Comp E5']]) {
    const result = rec({ count: 301, [flag]: true });
    assert.equal(result.base, 'M365 E3');
    assert.deepEqual(result.addons, [key]);
    close(result.price, 48.18);
    assert.ok(result.features.includes(feature));
  }
  const e5 = rec({ count: 301, def2: true, edisc: true, epm: true, eam: true, pki: true });
  assert.equal(e5.base, 'M365 E5');
  assert.deepEqual(e5.addons, []);
  close(e5.price, 58.13);
});

test('Intune prerequisites follow Plan 1 features, including Frontline', () => {
  const frontline = rec({ style: 'frontline', web: true, rh: true });
  assert.equal(frontline.base, 'M365 F3');
  assert.deepEqual(frontline.addons, ['Remote Help Add-on']);
  close(frontline.price, 11.66);
  const catalog = structuredClone(data);
  catalog.FEATURES_MAP['Business Premium'] = catalog.FEATURES_MAP['Business Premium'].filter(f => f !== 'Intune Plan 1');
  assert.equal(rec({ rh: true }, catalog).base, 'M365 E3', 'generic MDM is not a Plan 1 prerequisite');
  for (const current of ['None', 'Business Basic', 'M365 E3', 'M365 F3', 'O365 E3']) {
    assert.equal(rec({ current, rh: true }).base, 'Business Premium', current);
  }
});

for (const [flag, key, feature, price] of products) {
  test(`standalone ${feature} quotes the product and states its separate prerequisite`, () => {
    const result = rec({ style: 'standalone', [flag]: true });
    assert.equal(result.base, 'None');
    assert.deepEqual(result.addons, [key]);
    close(result.price, price);
    assert.ok(result.features.includes(feature));
    assert.equal(result.features.includes('Intune Plan 1'), false);
    assert.match(result.reason, /Intune Plan 1/);
    assert.match(result.reason, /separat erforderlich/);
    close(rec({ style: 'standalone', [flag]: true }, data, 'monthly').price, price * 1.2);
  });
}

for (const [name, input, addons, price, features] of [
  ['Defender', { def2: true }, ['Defender Suite'], 10.40, ['Def XDR']],
  ['Purview', { edisc: true }, ['Purview Suite'], 10.40, ['Comp E5']],
  ['Defender and Purview', { risk: true, casb: true, lbl: true, edisc: true }, ['Defender Suite', 'Purview Suite'], 20.80, ['Entra P2', 'Def XDR', 'Comp E5']],
]) {
  test(`standalone ${name} quotes enterprise add-ons without charging a base`, () => {
    const result = rec({ style: 'standalone', ...input });
    assert.equal(result.base, 'None');
    assert.deepEqual(result.addons, addons);
    close(result.price, price);
    for (const feature of features) assert.ok(result.features.includes(feature), feature);
    assert.match(result.reason, /M365 E3.*M365 E5.*M365 E7/);
    assert.match(result.reason, /separat erforderlich/);
    close(rec({ style: 'standalone', ...input }, data, 'monthly').price, price * 1.2);
  });
}

test('standalone Intune bundle compares sourced prices without assuming prerequisite coverage', () => {
  const input = { style: 'standalone', epm: true, rh: true };
  const catalog = structuredClone(data);
  catalog.PRICES['Intune Suite Add-on'].price = 0.01;
  const singles = rec(input, catalog);
  assert.deepEqual(singles.addons, ['EPM Add-on', 'Remote Help Add-on']);
  close(singles.price, 5.60);
  Object.assign(catalog.PRICES['Intune Suite Add-on'], { price: 5.60, todo_source: false, source: data.PRICES['Remote Help Add-on'].source, valid_from: '2026-07-01' });
  const bundle = rec(input, catalog);
  assert.equal(bundle.base, 'None');
  assert.deepEqual(bundle.addons, ['Intune Suite Add-on']);
  close(bundle.price, 5.60);
  assert.match(bundle.reason, /Intune Plan 1.*separat erforderlich/);
});

test('unconfirmed Intune bundle is excluded; confirmed bundle compares missing singles and wins ties', () => {
  const input = { rh: true, epm: true, aa: true, intune2: true, eam: true, pki: true };
  const catalog = structuredClone(data);
  catalog.PRICES['Intune Suite Add-on'].price = 0.01;
  assert.equal(catalog.PRICES['Intune Suite Add-on'].todo_source, true);
  const singles = rec(input, catalog);
  assert.equal(singles.base, 'Business Premium');
  assert.equal(singles.addons.includes('Intune Suite Add-on'), false);
  close(singles.price, 35.92);
  // Synthetic confirmed EUR prices exercise both branches without claiming a list price.
  Object.assign(catalog.PRICES['Intune Suite Add-on'], { price: 5.60, todo_source: false, source: data.PRICES['Remote Help Add-on'].source, valid_from: '2026-07-01' });
  const bundle = rec({ rh: true, epm: true }, catalog);
  assert.deepEqual(bundle.addons, ['Intune Suite Add-on'], 'same cost: one product is simpler');
  close(bundle.price, 24.66);
  assert.deepEqual(rec({ rh: true }, catalog).addons, ['Remote Help Add-on']);
  catalog.PRICES['Intune Suite Add-on'].price = 8;
  const e3 = rec({ count: 301, rh: true, epm: true, eam: true, pki: true }, catalog);
  assert.equal(e3.base, 'M365 E3');
  assert.deepEqual(e3.addons, ['EPM Add-on', 'EAM Add-on', 'Cloud PKI Add-on'], 'compare only missing features, not included Remote Help');
  close(e3.price, 43.84);
});

test('equal total prices prefer fewer products and EUR computation ignores USD metadata', () => {
  const catalog = structuredClone(data);
  catalog.PRICES['M365 E5'].price = 48.18;
  assert.equal(rec({ count: 301, def2: true }, catalog).base, 'M365 E5');
  for (const entry of Object.values(catalog.PRICES)) entry.usd_list = 999999;
  const result = rec({ rh: true, def2: true }, catalog);
  close(result.price, 30.76);
});

test('equal Business Premium upgrade prices prefer the single combined product', () => {
  const catalog = structuredClone(data);
  catalog.PRICES['BizPrem E5 Upgrade'].price = 17.40;
  assert.deepEqual(rec({ def2: true, edisc: true }, catalog).addons, ['BizPrem E5 Upgrade']);
});

test('enterprise suite prerequisites cannot be bypassed by a low price or missing eligibility', () => {
  const catalog = structuredClone(data);
  catalog.PRICES['Defender Suite'].price = 0.01;
  assert.deepEqual(rec({ def2: true }, catalog).addons, ['Defender Suite for BizPrem']);
  catalog.PRICES['Defender Suite'].requires = ['M365 E5'];
  const result = rec({ count: 301, def2: true }, catalog);
  assert.equal(result.base, 'M365 E5');
  assert.deepEqual(result.addons, []);
});
