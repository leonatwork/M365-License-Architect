const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('../data/licenses.js');
const load = () => require('../src/csv.js');

test('CSV export-import-export preserves special characters, formula prefixes and offer metadata', () => {
  const csv = load();
  const names = ['Müller, "Büro"\nZürich', '=SUM("a,b")', '+"Quote", Team', '-Wert', '@Name', "'Original", "'=Original", '  Leerraum  '];
  const items = names.map((persona, index) => ({ persona, count: index + 1,
    base: index % 2 ? '=Basis,"Test"' : 'M365 E3', addons: ['+Zusatz,"Test"'], price: 43.06, currentLic: '@Ist,"Test"',
    teamsVariant: index % 2 ? 'included' : 'no_teams', priceDate: '2026-07-01', priceNote: 'Listenpreis, "EUR"' }));
  const exported = csv.exportCSV(items, data);
  assert.match(exported.split('\n')[0], /TeamsVariant,PriceDate,PriceNote$/);
  const imported = csv.importCSV(exported, data);
  assert.equal(imported.legacyTeams, false);
  assert.deepEqual(imported.items.map(i => i.persona), names);
  assert.deepEqual(imported.items.map(({ persona, count, base, addons, price, currentLic, teamsVariant, priceDate, priceNote }) =>
    ({ persona, count, base, addons, price, currentLic, teamsVariant, priceDate, priceNote })), items);
  assert.equal(csv.exportCSV(imported.items, data), exported);
  const browser = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/csv.js'), 'utf8'), browser);
  assert.equal(browser.LicenseCSV.exportCSV(items, data), exported);
});

test('legacy CSV defaults to included Teams and signals a visible import notice', () => {
  const result = load().importCSV('Persona,Count,Base,Addons,Price,Total,CurrentLic\r\n"Alt",10,"M365 E3","",37.78,377.80,"None"\r\n', data);
  assert.equal(result.legacyTeams, true);
  assert.equal(result.items[0].teamsVariant, 'included');
  assert.equal(result.items[0].priceDate, '2026-07-01');
  assert.ok(result.items[0].features.includes('Teams Collaboration'));
});

test('CSV import reconstructs no-Teams features and explicit Teams EWR correctly', () => {
  const csv = load();
  for (const addons of [[], ['Teams EWR']]) {
    const item = csv.importCSV(csv.exportCSV([{ persona: 'Test', count: 1, base: 'M365 E3',
      addons, price: 30.36, currentLic: 'None', teamsVariant: 'no_teams' }], data), data).items[0];
    assert.equal(item.features.includes('Teams Collaboration'), addons.length > 0);
    assert.equal(item.features.includes('No Teams'), addons.length === 0);
  }
});

test('price metadata uses catalog dates and copy, preserves gaps and standalone products', () => {
  const csv = load();
  const catalog = structuredClone(data);
  catalog.PRICES['M365 E3'].valid_from = '2027-02-03';
  catalog.PRICE_NOTE = 'Eigener Hinweis';
  assert.deepEqual(csv.priceInfo({ base: 'M365 E3', addons: [] }, catalog), { priceDate: '2027-02-03', priceNote: 'Eigener Hinweis' });
  assert.match(csv.priceInfo({ base: 'M365 E3', addons: ['Visio Plan 2'] }, data).priceNote, /Preisstand nicht belegt: Visio Plan 2/);
  assert.equal(csv.priceInfo({ base: 'None', addons: ['Teams Phone Add-on'] }, data).priceDate, '2026-07-01');
  assert.equal(csv.priceInfo({ base: 'None', addons: ['Visio Plan 2'] }, data).priceDate, '');
});

test('new CSV implementation and tests have no external URLs or fetch calls', () => {
  for (const file of ['src/csv.js', 'test/csv.test.js', 'test/teams-ui.test.js']) {
    const source = fs.readFileSync(require('node:path').join(__dirname, '..', file), 'utf8');
    assert.equal(/fetch\s*\(/.test(source), false, file);
    assert.equal(/https?:\/\//.test(source), false, file);
  }
});
