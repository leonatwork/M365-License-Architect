const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/licenses.js');

test('CSV roundtrips quotes, commas, newlines, apostrophes and formula-like values', () => {
  const csv = require('../src/csv.js');
  const items = ['Ä, "Beratung"\nNord', '=SUM("A",1)', '+Team', '-Team', '@Team', "'=Original", "''@Original", '  Leerraum  '].map((persona, index) => ({
    persona, count: 2, base: 'Business Premium', addons: ['Visio Plan 2'], price: 31.76,
    currentLic: 'M365 E3', teamsVariant: index % 2 ? 'no_teams' : 'included'
  }));
  const text = csv.buildCsv(items, data);
  assert.ok(text.startsWith('Persona,Count,Base,Addons,Price,Total,CurrentLic,TeamsVariant,PriceValidFrom,PriceNote\n'));
  const parsed = csv.parseCsv(text, data);
  assert.equal(parsed.legacyTeams, false);
  assert.deepEqual(parsed.items.map(i => i.persona), items.map(i => i.persona));
  assert.deepEqual(parsed.items.map(i => i.teamsVariant), items.map(i => i.teamsVariant));
  assert.ok(parsed.items.every(i => i.priceValidFrom === data.PRICES[i.base].valid_from));
  assert.equal(csv.buildCsv(parsed.items, data), text);
  assert.match(text, /Listenpreis in EUR/);
  assert.match(text, /unbestätigt/);
});

test('old CSV files default to included and retain numeric import defaults', () => {
  const csv = require('../src/csv.js');
  const parsed = csv.parseCsv('Persona,Count,Base,Addons,Price,Total,CurrentLic\r\n"Alt",2,"Business Basic","",6.07,12.14,"None"\r\n"Default",,"Business Basic","",,\r\n', data);
  assert.equal(parsed.legacyTeams, true);
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].teamsVariant, 'included');
  assert.equal(parsed.items[0].priceValidFrom, '');
  assert.equal(parsed.items[1].count, 1);
  assert.equal(parsed.items[1].price, 0);
  assert.equal(parsed.items[1].currentLic, 'None');
  assert.ok(parsed.items[0].features.includes('Teams Collaboration'));
});

test('CSV preserves offered dates and reconstructs variant features for comparison', () => {
  const csv = require('../src/csv.js');
  const items = [{ persona: 'EWR', count: 1, base: 'Business Basic', addons: [], price: 4.67, currentLic: 'Business Standard', teamsVariant: 'no_teams', priceValidFrom: '2025-01-01', priceNote: 'Angebotsstand' }];
  const parsed = csv.parseCsv(csv.buildCsv(items, data), data).items[0];
  assert.equal(parsed.priceValidFrom, '2025-01-01');
  assert.equal(parsed.priceNote, 'Angebotsstand');
  assert.ok(parsed.features.includes('No Teams'));
  assert.ok(!parsed.features.includes('Teams Collaboration'));
  const unknown = csv.parseCsv('Persona,Count,Base,Addons,Price,Total,CurrentLic,TeamsVariant\nX,1,Business Basic,,6.07,6.07,None,invalid', data);
  assert.equal(unknown.items[0].teamsVariant, 'included');
});

test('price information uses data dates/text and marks undated prices', () => {
  const csv = require('../src/csv.js');
  const synthetic = { ...data, PRICE_TEXT: { ...data.PRICE_TEXT, notice: 'Test-Listenpreis' }, PRICES: { ...data.PRICES, 'Business Basic': { ...data.PRICES['Business Basic'], valid_from: '2027-02-03' } } };
  const info = csv.priceInfo({ base: 'Business Basic', addons: [] }, synthetic);
  assert.equal(info.priceValidFrom, '2027-02-03');
  assert.match(info.text, /Test-Listenpreis.*03\.02\.2027/);
  assert.equal(csv.priceInfo({ base: 'None', addons: ['Visio Plan 2'] }, data).priceValidFrom, '');
});
