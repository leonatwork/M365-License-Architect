const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');

const rec = (input, catalog = data, term = 'annual') => engine.recommend(input, { term }, catalog);

test('Issue #5: Teams Phone alone uses Business Basic plus 8.70, without security upsell', () => {
  const result = rec({ phone: true });
  assert.equal(result.base, 'Business Basic');
  assert.deepEqual(result.addons, ['Teams Phone Add-on']);
  assert.ok(Math.abs(result.price - 14.77) < 1e-9);
  assert.ok(result.features.includes('Teams Phone'));
});

test('frontline phone alone remains F1 plus Phone', () => {
  const result = rec({ style: 'frontline', phone: true });
  assert.equal(result.base, 'M365 F1');
  assert.ok(Math.abs(result.price - 11.30) < 1e-9);
});

test('Phone compares the cheapest qualifying combination, including external add-ons', () => {
  const result = rec({ count: 500, mdm: true, phone: true, visio: true });
  assert.equal(result.base, 'M365 E3');
  assert.ok(Math.abs(result.price - (37.78 + 8.70 + 12.70)) < 1e-9);
  const expensive = rec({ count: 500, mdm: true, phone: true, risk: true, lbl: true, visio: true });
  assert.equal(expensive.base, 'M365 E5');
  assert.deepEqual(expensive.addons, ['Visio Plan 2']);
  assert.ok(Math.abs(expensive.price - (58.13 + 12.70)) < 1e-9);
});

test('E5 phone upgrade uses strict less-than, including monthly and no-Teams pricing', () => {
  for (const teamsVariant of ['included', 'no_teams']) {
    for (const term of ['annual', 'monthly']) {
      const catalog = structuredClone(data);
      const field = teamsVariant === 'included' ? 'price' : 'price_no_teams';
      catalog.PRICES['M365 E5'][field] = catalog.PRICES['M365 E3'][field] + 8.70;
      const result = rec({ count: 500, mdm: true, phone: true, teamsVariant }, catalog, term);
      assert.equal(result.base, 'M365 E3', 'equal prices must not upgrade');
    }
  }
});

const rules = [
  ['M365 E3', 'rh', 'Remote Help'],
  ['M365 E3', 'aa', 'Advanced Analytics'],
  ['M365 E3', 'intune2', 'Intune Plan 2'],
  ['M365 E3', 'defO365', 'Def O365 P1'],
  ['M365 E5', 'rh', 'Remote Help'],
  ['M365 E5', 'aa', 'Advanced Analytics'],
  ['M365 E5', 'intune2', 'Intune Plan 2'],
  ['M365 E5', 'epm', 'EPM'],
  ['M365 E5', 'eam', 'EAM'],
  ['M365 E5', 'pki', 'Cloud PKI'],
];
for (const [base, flag, feature] of rules) {
  test(`${base} includes ${feature} without an extra add-on`, () => {
    const result = rec({ count: 500, mdm: true, [flag]: true, ...(base === 'M365 E5' ? { risk: true, lbl: true } : {}) });
    assert.equal(result.base, base);
    assert.ok(result.features.includes(feature));
    assert.deepEqual(result.addons, []);
    assert.equal(data.PRICES[base].valid_from, '2026-07-01');
    assert.match(data.FEATURE_SOURCES[base].source, /^https:\/\/www\.microsoft\.com\//);
    assert.equal(data.FEATURE_SOURCES[base].valid_from, '2026-07-01');
  });
}

test('Teams variants charge the suite once and comparisons use the same variant', () => {
  const included = rec({ count: 500, mdm: true, teams: true });
  const excluded = rec({ count: 500, mdm: true, teams: true, teamsVariant: 'no_teams' });
  assert.equal(included.price, 37.78);
  assert.equal(excluded.price, 30.36);
  assert.deepEqual(included.addons, []);
  assert.deepEqual(excluded.addons, []);
  assert.equal(included.teamsPrice, 0);
  assert.equal(excluded.features.includes('Teams Collaboration'), false);
  assert.equal(engine.compare('M365 E3', excluded, 'annual', data).currentPrice, 30.36);
  assert.equal(engine.compare('M365 E3', excluded, 'annual', data).delta, 0);
  assert.ok(Math.abs(data.PRICES['M365 E3'].price_no_teams + data.PRICES['Teams EWR'].price - included.price) <= 0.02);
  assert.equal(data.PRICES.Teams_ME3, undefined);
  assert.equal(data.PRICES.Teams_ME5, undefined);
});

test('all suite variants and new Copilot prices match the approved EUR table', () => {
  const suites = {
    'M365 F1': [2.60, 2.16], 'M365 F3': [8.66, 7.73],
    'Business Basic': [6.07, 4.67], 'Business Standard': [12.13, 9.34],
    'Business Premium': [19.06, 16.28], 'O365 E1': [8.66, 5.88],
    'O365 E3': [26.27, 18.85], 'O365 E5': [41.42, 34.01],
    'M365 E3': [37.78, 30.36], 'M365 E5': [58.13, 50.71],
  };
  for (const [key, prices] of Object.entries(suites)) {
    assert.deepEqual([data.PRICES[key].price, data.PRICES[key].price_no_teams], prices);
    assert.match(data.PRICES[key].source, /^https:\/\/www\.microsoft\.com\//);
    assert.equal(data.PRICES[key].valid_from, '2026-07-01');
  }
  assert.equal(data.PRICES['M365 Copilot'].price, 26);
  assert.equal(data.PRICES['Copilot Business'].price, 18.20);
});

test('USD reference fields never affect calculation', () => {
  for (const entry of Object.values(data.PRICES)) assert.equal(entry.currency, 'EUR');
  const catalog = structuredClone(data);
  for (const entry of Object.values(catalog.PRICES)) entry.usd_list = 999999;
  const input = { count: 500, mdm: true, phone: true, copilot: true };
  assert.deepEqual(rec(input, catalog), rec(input));
  assert.deepEqual(engine.compare('M365 E3', rec(input, catalog), 'annual', catalog), engine.compare('M365 E3', rec(input), 'annual', data));
});

test('Phone comparison preserves Windows/DLP requirements and SMB eligibility', () => {
  const smb = rec({ phone: true, win: true, desktop: true });
  assert.equal(smb.base, 'Business Premium');
  assert.deepEqual(smb.addons, ['Teams Phone Add-on']);
  const enterprise = rec({ phone: true, count: 500, mdm: true });
  assert.equal(enterprise.base, 'M365 E3');
  const dlp = rec({ phone: true, dlp: true, count: 500 });
  assert.equal(dlp.base, 'O365 E3');
});

test('E5 break-even removes included Intune add-ons but retains external products', () => {
  const result = rec({ count: 500, mdm: true, epm: true, risk: true, lbl: true, copilot: true, visio: true });
  assert.equal(result.base, 'M365 E5');
  assert.deepEqual(result.addons, ['M365 Copilot', 'Visio Plan 2']);
  assert.ok(Math.abs(result.price - 96.83) < 1e-9);
});
