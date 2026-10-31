const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('../data/licenses.js');
const load = () => require('../src/csv.js');

test('CSV export-import-export preserves special characters, formula prefixes and offer metadata', () => {
  const csv = load();
  const names = ['Müller, "Büro"\nZürich', '=SUM("a,b")', '+"Quote", Team', '-Wert', '@Name', "'Original", "'=Original", '  Leerraum  ', '\tFormel', '\rFormel', "'\tOriginal", "'\rOriginal"];
  const items = names.map((persona, index) => ({ persona, count: index + 1,
    base: index % 2 ? '=Basis,"Test"' : 'M365 E3', addons: ['+Zusatz,"Test"'], price: 43.06, currentLic: '@Ist,"Test"',
    teamsVariant: index % 2 ? 'included' : 'no_teams', priceDate: '2026-07-01', priceNote: 'Listenpreis, "EUR"' }));
  const exported = csv.exportCSV(items, data);
  // Synthetic catalog keeps special-character coverage without importing unknown licenses.
  const catalog = structuredClone(data);
  for (const key of ['=Basis,"Test"', '+Zusatz,"Test"', '@Ist,"Test"']) {
    catalog.PRICES[key] = { price: 0 };
    catalog.FEATURES_MAP[key] = [];
  }
  assert.match(exported.split('\n')[0], /TeamsVariant,PriceDate,PriceNote$/);
  const imported = csv.importCSV(exported, catalog);
  assert.equal(imported.legacyTeams, false);
  assert.deepEqual(imported.items.map(i => i.persona), names);
  assert.deepEqual(imported.items.map(({ persona, count, base, addons, price, currentLic, teamsVariant, priceDate, priceNote }) =>
    ({ persona, count, base, addons, price, currentLic, teamsVariant, priceDate, priceNote })), items);
  assert.equal(csv.exportCSV(imported.items, data), exported);
  const browser = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/csv.js'), 'utf8'), browser);
  assert.equal(browser.LicenseCSV.exportCSV(items, data), exported);
});

const header = 'Persona,Count,Base,Addons,Price,Total,CurrentLic';
const validRow = 'Test,1,M365 E3,,37.78,37.78,None';

test('CSV spreadsheet protection covers every dangerous prefix and is reversible', () => {
  const csv = load();
  for (const prefix of ['=', '+', '-', '@', '\t', '\r', "'"]) {
    for (const value of [prefix + 'Text', "'" + prefix + 'Text']) {
      const exported = csv.exportCSV([{ persona: value, count: 1, base: 'M365 E3', addons: [],
        price: 0, currentLic: 'None', priceNote: value }], data);
      assert.ok(exported.includes('"\'' + value.replace(/"/g, '""') + '"'), JSON.stringify(value));
      const imported = csv.importCSV(exported, data);
      assert.equal(imported.items[0].persona, value);
      assert.equal(imported.items[0].priceNote, value);
      assert.equal(csv.exportCSV(imported.items, data), exported);
    }
  }
});

for (const key of ['Unbekannt', '__proto__', 'constructor', 'toString']) {
  for (const [field, index] of [['Basislizenz', 2], ['Add-on', 3], ['Bestandslizenz', 6]]) {
    test(`CSV rejects ${key} as ${field} and keeps other valid rows`, () => {
      const cols = validRow.split(',');
      cols[index] = index === 3 ? 'Teams EWR|' + key : key;
      const result = load().importCSV(header + '\n' + validRow + '\n' + cols.join(',') + '\n' + validRow, data);
      assert.equal(result.items.length, 2);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].line, 3);
      assert.match(result.errors[0].message, new RegExp(field));
    });
  }
}

test('CSV requires own price and feature keys for base/current and own price keys for add-ons', () => {
  for (const map of ['PRICES', 'FEATURES_MAP']) {
    const catalog = structuredClone(data);
    const inherited = catalog[map]['M365 E3'];
    delete catalog[map]['M365 E3'];
    Object.setPrototypeOf(catalog[map], { 'M365 E3': inherited });
    for (const index of [2, 6]) {
      const cols = validRow.split(',');
      cols[2] = 'Business Basic';
      cols[index] = 'M365 E3';
      const result = load().importCSV(header + '\n' + cols.join(','), catalog);
      assert.equal(result.items.length, 0);
      assert.equal(result.errors[0].line, 2);
    }
  }
  const catalog = structuredClone(data);
  const inherited = catalog.PRICES['Teams EWR'];
  delete catalog.PRICES['Teams EWR'];
  Object.setPrototypeOf(catalog.PRICES, { 'Teams EWR': inherited });
  assert.equal(load().importCSV(header + '\nTest,1,None,Teams EWR,7.41,7.41,None', catalog).items.length, 0);
});

for (const value of ['0', '-1', '-3', '1.5', 'abc', 'NaN', 'Infinity', '100001', '', '12abc', '0x10']) {
  test(`CSV rejects invalid count ${JSON.stringify(value)}`, () => {
    const cols = validRow.split(',');
    cols[1] = value;
    const result = load().importCSV(header + '\n' + cols.join(','), data);
    assert.equal(result.items.length, 0);
    assert.equal(result.errors[0].line, 2);
    assert.match(result.errors[0].message, /Anzahl/);
  });
}

for (const value of ['-1', '-3', 'NaN', 'Infinity', 'abc', '', '12abc', '0x10', '1e309']) {
  test(`CSV rejects invalid price ${JSON.stringify(value)}`, () => {
    const cols = validRow.split(',');
    cols[4] = value;
    const result = load().importCSV(header + '\n' + cols.join(','), data);
    assert.equal(result.items.length, 0);
    assert.equal(result.errors[0].line, 2);
    assert.match(result.errors[0].message, /Preis/);
  });
}

test('CSV accepts count boundaries, zero price, standalone add-ons and None current license', () => {
  for (const count of [1, 100000]) {
    const result = load().importCSV(header + `\nTest,${count},None,Visio Plan 2|Defender Suite,0,0,None`, data);
    assert.deepEqual(result.errors, []);
    assert.equal(result.items[0].count, count);
    assert.equal(result.items[0].price, 0);
  }
});

test('CSV errors report physical source lines after quoted newlines and blank lines', () => {
  const result = load().importCSV('\uFEFF' + header + '\r\n"Mehr\r\nzeilig",1,M365 E3,,0,0,None\r\n\r\nTest,0,M365 E3,,0,0,None', data);
  assert.equal(result.items.length, 1);
  assert.equal(result.errors[0].line, 5);
});

for (const text of ['', 'Falscher,Header\n' + validRow, header + '\n"Offen,1,M365 E3,,0,0,None',
  header + '\n"Text"kaputt,1,M365 E3,,0,0,None', header + '\nTe"xt,1,M365 E3,,0,0,None']) {
  test(`CSV rejects malformed structure ${JSON.stringify(text)}`, () => {
    assert.throws(() => load().importCSV(text, data), /CSV|Zeile/);
  });
}

test('CSV reports missing or surplus row columns instead of silently skipping', () => {
  for (const row of ['Test,1,M365 E3', validRow + ',Extra']) {
    const result = load().importCSV(header + '\n' + row, data);
    assert.equal(result.items.length, 0);
    assert.equal(result.errors[0].line, 2);
    assert.match(result.errors[0].message, /Spalten/);
  }
});

test('CSV limits are 1 MB UTF-8 and 1000 data rows; boundary imports succeed', () => {
  const csv = load();
  assert.equal(csv.MAX_IMPORT_BYTES, 1000000);
  assert.equal(csv.MAX_IMPORT_ROWS, 1000);
  assert.equal(csv.importCSV(header + '\n' + Array(1000).fill(validRow).join('\n'), data).items.length, 1000);
  assert.throws(() => csv.importCSV(header + '\n' + Array(1001).fill(validRow).join('\n'), data), /1[. ]?000.*[Zz]eilen/);
  const prefix = header + '\n';
  const suffix = ',1,M365 E3,,0,0,None';
  const boundary = prefix + 'a'.repeat(1000000 - prefix.length - suffix.length) + suffix;
  assert.equal(csv.importCSV(boundary, data).items.length, 1);
  assert.throws(() => csv.importCSV(boundary + 'a', data), /1 MB/);
  assert.throws(() => csv.importCSV(prefix + 'ü'.repeat(500000) + suffix, data), /1 MB/);
});

function importUI() {
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const notice = {};
  const messages = [];
  let reader;
  const context = { LICENSE_DATA: data, LicenseCSV: load(), LicenseEngine: require('../src/engine.js'),
    document: { getElementById: () => notice }, alert: message => messages.push(message),
    window: { addEventListener() {} },
    FileReader: class {
      constructor() { reader = this; this.listeners = {}; }
      addEventListener(type, callback) { this.listeners[type] = callback; }
      readAsText() {}
    } };
  vm.createContext(context);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  vm.runInContext('quoteItems = [{ persona: "Vorhanden" }]; renderTable = function () {};', context);
  const original = vm.runInContext('quoteItems', context);
  const input = { files: [{ size: 100 }], value: 'test.csv' };
  return { context, notice, messages, input, original, reader: () => reader,
    run: code => vm.runInContext(code, context) };
}

for (const scenario of ['size', 'rows', 'malformed', 'mixed', 'read-error', 'read-throw', 'render-throw', 'empty']) {
  test(`UI CSV ${scenario} failure preserves quoteItems and shows a German message`, () => {
    const app = importUI();
    if (scenario === 'size') app.input.files[0].size = 1000001;
    if (scenario === 'read-throw') app.context.FileReader = class {
      addEventListener() {}
      readAsText() { throw new Error('read failed'); }
    };
    if (scenario === 'render-throw') app.run('renderTable = function () { throw new Error("render failed"); };');
    app.context.input = app.input;
    app.run('handleFileSelect(input)');
    if (scenario === 'read-error') {
      assert.equal(typeof app.reader().listeners.error, 'function');
      app.reader().listeners.error();
    } else if (!['size', 'read-throw'].includes(scenario)) {
      const text = scenario === 'rows' ? header + '\n' + Array(1001).fill(validRow).join('\n')
        : scenario === 'malformed' ? header + '\n"Offen'
          : scenario === 'mixed' ? header + '\n' + validRow + '\nTest,0,M365 E3,,0,0,None'
            : scenario === 'empty' ? header : header + '\n' + validRow;
      app.reader().listeners.load({ target: { result: text } });
    }
    assert.strictEqual(app.run('quoteItems'), app.original);
    assert.equal(app.original.length, 1);
    assert.equal(app.notice.hidden, false);
    assert.match(app.notice.textContent, /Import.*(fehlgeschlagen|abgebrochen)/);
    if (scenario === 'mixed') assert.match(app.notice.textContent, /Zeile 3.*Anzahl/);
    assert.equal(app.messages.at(-1), app.notice.textContent);
    assert.equal(app.input.value, '');
    if (scenario === 'size') assert.equal(app.reader(), undefined, 'oversized file must not be read');
  });
}

test('UI successful CSV import appends once, renders and resets the file picker', () => {
  const app = importUI();
  app.context.input = app.input;
  app.run('let renders = 0; renderTable = function () { renders++; }; handleFileSelect(input);');
  app.reader().listeners.load({ target: { result: header + '\n' + validRow } });
  assert.equal(app.run('quoteItems.length'), 2);
  assert.equal(app.run('renders'), 1);
  assert.match(app.notice.textContent, /1 Personas erfolgreich importiert/);
  assert.equal(app.input.value, '');
});

test('userCount declares the same maximum as the engine', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html.match(/<input[^>]*id="userCount"[^>]*>/)[0], /max="100000"/);
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
