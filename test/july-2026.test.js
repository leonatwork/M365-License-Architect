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
  const excluded = rec({ count: 500, mdm: true, teamsVariant: 'no_teams' });
  assert.equal(included.price, 37.78);
  assert.equal(excluded.price, 30.36);
  assert.deepEqual(included.addons, []);
  assert.deepEqual(excluded.addons, []);
  assert.equal(included.teamsPrice, 0);
  assert.equal(excluded.features.includes('Teams Collaboration'), false);
  assert.ok(excluded.features.includes('No Teams'));
  assert.equal(engine.compare('M365 E3', excluded, 'annual', data).currentPrice, 30.36);
  assert.equal(engine.compare('M365 E3', excluded, 'annual', data).delta, 0);
  assert.ok(Math.abs(data.PRICES['M365 E3'].price_no_teams + data.PRICES['Teams EWR'].price - included.price) <= 0.02);
  assert.equal(data.PRICES.Teams_ME3, undefined);
  assert.equal(data.PRICES.Teams_ME5, undefined);
});

test('no-Teams variant adds Teams EWR as add-on when Teams or Teams Phone is required', () => {
  const ewr = data.PRICES['Teams EWR'].price;
  const teams = rec({ count: 500, mdm: true, teams: true, teamsVariant: 'no_teams' });
  assert.equal(teams.base, 'M365 E3');
  assert.deepEqual(teams.addons, ['Teams EWR']);
  assert.ok(Math.abs(teams.price - (30.36 + ewr)) < 1e-9);
  assert.ok(Math.abs(teams.price - 37.78) <= 0.02, 'EWR suite plus Teams EWR must not double count Teams');
  assert.ok(teams.features.includes('Teams Collaboration'));
  assert.equal(teams.features.includes('No Teams'), false);
  assert.equal(teams.teamsPrice, 0);

  // Teams Phone setzt Teams voraus: nie "Suite ohne Teams + Teams Phone Add-on".
  const phone = rec({ count: 500, mdm: true, phone: true, teamsVariant: 'no_teams' });
  assert.equal(phone.base, 'M365 E3');
  assert.deepEqual(phone.addons, ['Teams EWR', 'Teams Phone Add-on']);
  assert.ok(Math.abs(phone.price - (30.36 + ewr + 8.70)) < 1e-9);
  assert.ok(phone.features.includes('Teams Collaboration'));
  assert.ok(phone.features.includes('Teams Phone'));

  // Der Vergleich sieht den Gewinn von Teams gegenüber der Ist-Suite ohne Teams.
  const comparison = engine.compare('M365 E3', teams, 'annual', data);
  assert.equal(comparison.currentPrice, 30.36);
  assert.ok(Math.abs(comparison.delta - ewr) < 1e-9);
  assert.ok(comparison.gained.includes('Teams Collaboration'));

  // Im Paket wird Teams nie als Add-on angehängt; Standalone kennt keine Suite mit Teams.
  const included = rec({ count: 500, mdm: true, teams: true, phone: true });
  assert.equal(included.addons.includes('Teams EWR'), false);
  const standalone = rec({ style: 'standalone', teams: true, teamsVariant: 'no_teams' });
  assert.deepEqual(standalone.addons, []);
  assert.equal(standalone.price, 0);
});

test('Phone path keeps main-path eligibility: Intune add-ons need M365 E3/E5, Frontline stays F-SKU or Enterprise', () => {
  // Hauptpfad: "Intune Suite Add-ons need M365 E3 base" – auch mit Phone kein Business Premium / F-SKU.
  const intune = rec({ phone: true, mdm: true, epm: true });
  assert.equal(intune.base, 'M365 E3');
  assert.deepEqual(intune.addons, ['EPM Add-on', 'Teams Phone Add-on']);
  const frontlineIntune = rec({ style: 'frontline', phone: true, web: true, epm: true });
  assert.equal(frontlineIntune.base, 'M365 E3');

  // Hauptpfad: Frontline erhält nur F-SKUs oder M365 Enterprise, nie Business-/Office-365-Pläne.
  const frontlineDesktop = rec({ style: 'frontline', phone: true, desktop: true });
  assert.equal(frontlineDesktop.base, 'M365 E3');
  assert.deepEqual(frontlineDesktop.addons, ['Teams Phone Add-on']);
  const frontlineLarge = rec({ style: 'frontline', phone: true, desktop: true, count: 500 });
  assert.equal(frontlineLarge.base, 'M365 E3');
  const frontlineWin = rec({ style: 'frontline', phone: true, web: true, win: true });
  assert.ok(frontlineWin.base.startsWith('M365 E'));
  assert.equal(frontlineWin.base, 'M365 E3', 'E3 covers Win OS and is cheaper than E5');

  // Bestehende Regeln bleiben: F-SKUs nur für Frontline, Business nur bis 300 Benutzer.
  assert.equal(rec({ phone: true, count: 301 }).base, 'O365 E1');
  assert.equal(rec({ phone: true }).base, 'Business Basic');
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
