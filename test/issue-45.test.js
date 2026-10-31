const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');
const csv = require('../src/csv.js');
const { app: createApp, html } = require('./fixtures/ui-app.js');

const ROOMS = 'Teams Rooms Pro';
const SERVERS = 'Defender for Business Servers';
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message || ''} ${actual} != ${expected}`);
const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
const sales = (extra = {}) => engine.mapFormInputs({ ...data.PERSONA_PRESETS['Sales Team'], userCount: 50, ...extra });

// AC-3: Datenmodell
test('AC-3: every PRICES entry declares a unit from user, room, server', () => {
  assert.deepEqual(Object.keys(data.UNITS), ['user', 'room', 'server']);
  for (const [key, entry] of Object.entries(data.PRICES)) {
    assert.ok(Object.keys(data.UNITS).includes(entry.unit), `${key}: ${entry.unit}`);
  }
  assert.equal(data.PRICES[ROOMS].unit, 'room');
  assert.equal(data.PRICES[SERVERS].unit, 'server');
  const nonUser = Object.keys(data.PRICES).filter(key => data.PRICES[key].unit !== 'user');
  assert.deepEqual(nonUser.sort(), [SERVERS, ROOMS].sort());
  // Preise und Belegstatus bleiben unverändert (Out of Scope).
  assert.equal(data.PRICES[ROOMS].price, 33.70);
  assert.equal(data.PRICES[SERVERS].price, 2.80);
  assert.equal(data.PRICES[ROOMS].todo_source, true);
  for (const unit of Object.values(data.UNITS)) assert.ok(unit.per && unit.many);
});

// AC-1, AC-2, AC-7: Engine
test('AC-1: 50 users plus Teams Rooms Pro for 3 rooms = user cost × 50 + 3 × 33.70', () => {
  const plain = engine.recommend(sales(), {}, data);
  const result = engine.recommend(sales({ add_rooms: true, roomCount: '3' }), {}, data);
  assert.equal(result.count, 50);
  assert.equal(result.addons.includes(ROOMS), false);
  close(result.price, plain.price, 'user unit price');
  assert.deepEqual(result.unitItems, [{ key: ROOMS, unit: 'room', quantity: 3, price: 33.70 }]);
  const total = result.price * result.count + result.unitItems.reduce((sum, u) => sum + u.price * u.quantity, 0);
  close(total, plain.price * 50 + 3 * 33.70, 'total');
  assert.equal(cents(total), 2124.10);
});

test('AC-2: Defender for Business Servers for 4 servers costs 4 × 2.80 regardless of user count', () => {
  for (const userCount of [1, 50, 300, 1000]) {
    for (const workstyle of ['office', 'frontline', 'standalone']) {
      const result = engine.recommend(engine.mapFormInputs({ userCount, workstyle, serverProt: true, serverCount: 4 }), {}, data);
      assert.equal(result.addons.includes(SERVERS), false, `${workstyle}/${userCount}`);
      assert.deepEqual(result.unitItems, [{ key: SERVERS, unit: 'server', quantity: 4, price: 2.80 }]);
      close(result.unitItems[0].price * result.unitItems[0].quantity, 11.20);
    }
  }
});

test('AC-5 (engine): the monthly factor applies to unit items as well', () => {
  const result = engine.recommend(sales({ add_rooms: true, roomCount: 3, serverProt: true, serverCount: 4 }), { term: 'monthly' }, data);
  assert.deepEqual(result.unitItems.map(u => [u.key, u.unit, u.quantity]), [[SERVERS, 'server', 4], [ROOMS, 'room', 3]]);
  close(result.unitItems[0].price, 2.80 * 1.2);
  close(result.unitItems[1].price, 33.70 * 1.2);
  close(result.price, engine.recommend(sales(), { term: 'monthly' }, data).price);
});

test('AC-7: room/server flags never change the user recommendation', () => {
  const variants = [];
  for (const preset of Object.keys(data.PERSONA_PRESETS)) {
    for (const teamsVariant of ['included', 'no_teams']) {
      for (const userCount of [5, 300, 301]) variants.push({ ...data.PERSONA_PRESETS[preset], teamsVariant, userCount });
    }
  }
  variants.push({ workstyle: 'standalone', adv_epm: true }, { workstyle: 'standalone' }, { workstyle: 'frontline', webEdit: true });
  for (const form of variants) {
    for (const term of ['annual', 'monthly']) {
      const plain = engine.recommend(engine.mapFormInputs(form), { term }, data);
      assert.deepEqual(plain.unitItems, []);
      const flagged = engine.recommend(engine.mapFormInputs({ ...form, add_rooms: true, serverProt: true, roomCount: 7, serverCount: 2 }), { term }, data);
      for (const field of ['base', 'addons', 'price', 'features', 'alt', 'count', 'reason']) {
        assert.deepEqual(flagged[field], plain[field], `${JSON.stringify(form)} ${term} ${field}`);
      }
      assert.equal(flagged.unitItems.length, 2);
    }
  }
});

// AC-6: Mengengrenzen
test('AC-6: room/server quantities are integers clamped to 1..MAX_USERS like the user count', () => {
  for (const [value, expected] of [['3', 3], [3, 3], ['0', 1], ['-5', 1], ['2.9', 2], ['abc', 1], ['', 1], [undefined, 1],
    ['100000', 100000], ['100001', engine.MAX_USERS], [Infinity, engine.MAX_USERS]]) {
    const mapped = engine.mapFormInputs({ add_rooms: true, serverProt: true, roomCount: value, serverCount: value });
    assert.equal(mapped.roomCount, expected, String(value));
    assert.equal(mapped.serverCount, expected, String(value));
    const result = engine.recommend({ style: 'office', rooms: true, serverProt: true, roomCount: value, serverCount: value }, {}, data);
    assert.deepEqual(result.unitItems.map(u => u.quantity), [expected, expected], String(value));
  }
  for (const id of ['roomCount', 'serverCount']) {
    const tag = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0];
    assert.ok(tag, `missing quantity field ${id}`);
    assert.match(tag, /type="number"/);
    assert.match(tag, /min="1"/);
    assert.match(tag, /max="100000"/);
    assert.match(tag, /step="1"/);
  }
});

// UI: Mengenfeld, eigene Zeilen, Summen, Dashboard
function ui() {
  const instance = createApp();
  instance.load();
  instance.run('resetForm()');
  return instance;
}

function addSalesWithRooms(instance, rooms = '3') {
  const el = instance.elements;
  el.presetSelector.value = 'Sales Team';
  el.presetSelector.dispatch('change');
  el.userCount.value = '50';
  el.add_rooms.checked = true;
  el.roomCount.value = rooms;
  instance.run('recalc(); addToQuote()');
}

test('quantity fields are shown only while the corresponding product is selected', () => {
  const instance = ui();
  const el = instance.elements;
  assert.equal(el.roomCountField.hidden, true);
  assert.equal(el.serverCountField.hidden, true);
  el.add_rooms.checked = true;
  el.add_rooms.dispatch('change');
  assert.equal(el.roomCountField.hidden, false);
  assert.equal(el.serverCountField.hidden, true);
  el.serverProt.checked = true;
  el.serverProt.dispatch('change');
  assert.equal(el.serverCountField.hidden, false);
  el.roomCount.value = '4';
  el.roomCount.dispatch('input');
  assert.match(el.recAddon.innerText, /Teams Rooms Pro: 4 Räume/);
  instance.run('resetForm()');
  assert.equal(el.roomCountField.hidden, true);
  assert.equal(String(el.roomCount.value), '1');
});

test('AC-1/AC-5: quote, grand total and dashboard use the room quantity, also after switching term', () => {
  const instance = ui();
  const el = instance.elements;
  addSalesWithRooms(instance);
  const items = instance.items();
  assert.equal(items.length, 2);
  const [persona, rooms] = items;
  assert.equal(persona.count, 50);
  assert.equal(persona.addons.includes(ROOMS), false);
  close(persona.price, 40.46);
  assert.equal(Object.hasOwn(persona, 'unitItems'), false);
  assert.deepEqual({ unit: rooms.unit, count: rooms.count, base: rooms.base, addons: rooms.addons, price: rooms.price },
    { unit: 'room', count: 3, base: 'None', addons: [ROOMS], price: 33.70 });
  assert.equal(el.grandTotal.innerText, '€2124.10');
  assert.equal(el.dashBaseVal.innerText, '€953.00');
  assert.equal(el.dashAddonVal.innerText, '€1171.10');
  assert.match(el.quoteBody.innerHTML, /3 Räume/);
  assert.match(el.quoteBody.innerHTML, /pro Raum/);
  assert.match(el.quoteBody.innerHTML, /€101\.10/);
  // Eigene Zeilen sind tenantweit: kein Bearbeiten/Vergleich, aber Entfernen.
  assert.equal([...el.quoteBody.innerHTML.matchAll(/data-action="edit"/g)].length, 1);
  assert.equal([...el.quoteBody.innerHTML.matchAll(/data-action="remove"/g)].length, 2);
  instance.run("setTerm('monthly')");
  assert.equal(el.grandTotal.innerText, '€2548.92');
  assert.equal(el.dashBaseVal.innerText, '€1143.60');
  assert.equal(el.dashAddonVal.innerText, '€1405.32');
  close(instance.items()[1].price, 40.44);
  instance.run("setTerm('annual')");
  assert.equal(el.grandTotal.innerText, '€2124.10');
  assert.deepEqual(instance.items(), items);
});

test('exactly one tenant-wide row per kind; the quantity field shows the quoted quantity', () => {
  const instance = ui();
  const el = instance.elements;
  addSalesWithRooms(instance, '3');
  assert.equal(String(el.roomCount.value), '3', 'reset prefills existing room quantity');
  el.personaName.value = 'Zweite';
  el.add_rooms.checked = true;
  el.roomCount.value = '5';
  el.serverProt.checked = true;
  el.serverCount.value = '4';
  instance.run('recalc(); addToQuote()');
  const items = instance.items();
  assert.deepEqual(items.map(item => [item.unit || 'user', item.count]), [['user', 50], ['room', 5], ['user', 10], ['server', 4]]);
  assert.equal(el.grandTotal.innerText, '€' + (40.46 * 50 + 5 * 33.70 + 10 * engine.recommend(engine.mapFormInputs({ userCount: 10 }), {}, data).price + 4 * 2.80).toFixed(2));
  // Bearbeiten einer Persona übernimmt die aktuelle tenantweite Menge statt eines veralteten Werts.
  instance.rowAction('edit', 0);
  assert.equal(String(el.roomCount.value), '5');
  instance.run('recalc(); addToQuote()');
  assert.equal(instance.items().filter(item => item.unit === 'room').length, 1);
  assert.equal(instance.items().find(item => item.unit === 'room').count, 5);
  // Entfernen der Raumzeile lässt die Persona unverändert.
  const roomIndex = instance.items().findIndex(item => item.unit === 'room');
  instance.rowAction('remove', roomIndex);
  assert.equal(instance.items().some(item => item.unit === 'room'), false);
  assert.equal(instance.items().length, 3);
});

test('AC-6 (UI): invalid quantities are clamped like the user count', () => {
  for (const [value, expected] of [['0', 1], ['-2', 1], ['2.5', 2], ['100001', 100000], ['abc', 1]]) {
    const instance = ui();
    addSalesWithRooms(instance, value);
    assert.equal(instance.items().find(item => item.unit === 'room').count, expected, value);
  }
});

// AC-4: CSV
const roomRow = { persona: 'Teams Rooms Pro (pro Raum)', unit: 'room', count: 3, base: 'None', addons: [ROOMS], price: 33.70,
  currentLic: 'None', teamsVariant: 'included' };
const serverRow = { persona: 'Defender for Business Servers (pro Server)', unit: 'server', count: 4, base: 'None', addons: [SERVERS],
  price: 2.80, currentLic: 'None', teamsVariant: 'included' };
const userRow = { persona: 'Sales Team', count: 50, base: 'Business Premium', addons: ['Teams Phone Add-on', 'Visio Plan 2'],
  price: 40.46, currentLic: 'None', teamsVariant: 'included' };
const pick = ({ persona, unit, count, base, addons, price, currentLic, teamsVariant }) =>
  ({ persona, unit, count, base, addons, price, currentLic, teamsVariant });

test('AC-4: CSV export/import of room and server rows is lossless with a Unit column', () => {
  const exported = csv.exportCSV([userRow, roomRow, serverRow], data);
  const lines = exported.split('\n');
  const header = lines[0].split(',');
  assert.ok(header.includes('Unit'));
  assert.deepEqual(header.slice(0, 5), ['Persona', 'Count', 'Base', 'Addons', 'Price']);
  const unitIndex = header.indexOf('Unit');
  assert.equal(lines[1].split(',')[unitIndex], '"user"');
  assert.match(lines[2], /^"Teams Rooms Pro \(pro Raum\)",3,"None","Teams Rooms Pro",33\.7,101\.10,/);
  assert.match(lines[3], /,4,"None","Defender for Business Servers",2\.8,11\.20,/);
  assert.ok(lines[2].includes('"room"'));
  assert.ok(lines[3].includes('"server"'));
  const imported = csv.importCSV(exported, data);
  assert.deepEqual(imported.errors, []);
  assert.deepEqual(imported.migratedUnits, []);
  assert.deepEqual(imported.items.map(pick), [{ ...userRow, unit: 'user' }, roomRow, serverRow]);
  assert.equal(csv.exportCSV(imported.items, data), exported);
});

test('AC-4: CSV rejects duplicate kinds, inconsistent unit rows and unknown units', () => {
  const header = 'Persona,Count,Base,Addons,Price,Total,CurrentLic,Unit';
  const room = 'Räume,3,None,Teams Rooms Pro,33.7,101.10,None,room';
  for (const [rows, pattern] of [
    [[room, room], /eine Zeile/],
    [['Räume,3,M365 E3,Teams Rooms Pro,33.7,101.10,None,room'], /Basis/],
    [['Räume,3,None,Visio Plan 2,12.7,38.10,None,room'], /room/],
    [['Räume,3,None,Teams Rooms Pro|Defender for Business Servers,36.5,109.50,None,room'], /genau ein/],
    [['Räume,3,None,Teams Rooms Pro,33.7,101.10,None,device'], /Einheit/],
    [['Sales,50,Business Premium,Teams Rooms Pro,52.76,2638.00,None,user'], /eigene Zeile/],
    [['Räume,0,None,Teams Rooms Pro,0,0,None,room'], /Anzahl/],
  ]) {
    const result = csv.importCSV([header, ...rows].join('\n'), data);
    assert.equal(result.errors.length, 1, rows.join(' / '));
    assert.match(result.errors[0].message, pattern, rows.join(' / '));
  }
  assert.deepEqual(csv.importCSV(header + '\nTest,1,M365 E3,,37.78,37.78,None,', data).items[0].unit, 'user');
});

test('AC-4: legacy CSV fixture migrates room/server add-ons into one row per kind with quantity 1 and a note', () => {
  const text = fs.readFileSync(path.join(__dirname, 'fixtures', 'issue-45-legacy.csv'), 'utf8');
  const result = csv.importCSV(text, data);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.migratedUnits, [ROOMS, SERVERS]);
  const [salesItem, admins, office, rooms, servers] = result.items;
  assert.equal(result.items.length, 5);
  assert.deepEqual(pick(salesItem), { ...userRow, unit: 'user' });
  assert.deepEqual(pick(admins), { persona: 'Server Admins', unit: 'user', count: 4, base: 'M365 E3', addons: [], price: 37.78,
    currentLic: 'None', teamsVariant: 'included' });
  assert.equal(office.price, 6.07);
  assert.doesNotMatch(office.priceNote, /ausgegliedert/);
  assert.match(salesItem.priceNote, /ausgegliedert: Teams Rooms Pro/);
  assert.match(admins.priceNote, /ausgegliedert: Defender for Business Servers, Teams Rooms Pro/);
  // Der übernommene Belegvermerk nennt ausgegliederte Produkte nicht mehr als Bestandteil der Benutzerzeile.
  assert.match(salesItem.priceNote, /Preisstand nicht belegt: Visio Plan 2; Raum/);
  assert.equal(admins.priceNote, 'Listenpreis in EUR, zzgl. MwSt., jährliche Abrechnung; '
    + 'Raum-/Serverlizenz als eigene Position ausgegliedert: Defender for Business Servers, Teams Rooms Pro');
  assert.deepEqual(pick(rooms), { ...roomRow, count: 1 });
  assert.deepEqual(pick(servers), { ...serverRow, count: 1 });
  for (const item of [rooms, servers]) {
    assert.match(item.priceNote, /Alt-CSV.*Menge 1/);
    assert.equal(item.migrated, true);
  }
  // The migrated file re-exports in the new format and re-imports without further migration.
  const again = csv.importCSV(csv.exportCSV(result.items, data), data);
  assert.deepEqual(again.errors, []);
  assert.deepEqual(again.migratedUnits, []);
  assert.deepEqual(again.items.map(pick), result.items.map(pick));
  // Old export format without TeamsVariant column migrates too.
  const oldest = csv.importCSV('Persona,Count,Base,Addons,Price,Total,CurrentLic\nAlt,2,M365 E3,Teams Rooms Pro,71.48,142.96,None', data);
  assert.deepEqual(oldest.migratedUnits, [ROOMS]);
  close(oldest.items[0].price, 37.78);
  assert.deepEqual(oldest.items[1].unit, 'room');
  // A legacy price that cannot have contained the add-on is clamped to 0 and flagged.
  const clamped = csv.importCSV('Persona,Count,Base,Addons,Price,Total,CurrentLic\nAlt,2,None,Teams Rooms Pro,10,20,None', data);
  assert.equal(clamped.items[0].price, 0);
  assert.match(clamped.items[0].priceNote, /auf 0 begrenzt/);
});

function importInto(instance, text) {
  let reader;
  instance.context.alert = () => {};
  instance.context.FileReader = class {
    constructor() { reader = this; this.listeners = {}; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    readAsText() {}
  };
  instance.context.input = { files: [{ size: 100 }], value: 'import.csv' };
  instance.run('handleFileSelect(input)');
  reader.listeners.load({ target: { result: text } });
}

test('AC-4 (UI): an imported new-format unit row replaces the existing row of the same kind', () => {
  const instance = ui();
  addSalesWithRooms(instance, '3');
  importInto(instance, csv.exportCSV([{ ...roomRow, count: 7 }], data));
  const rows = instance.items().filter(item => item.unit === 'room');
  assert.deepEqual(rows.map(item => item.count), [7]);
  assert.equal(instance.items().length, 2);
});

test('AC-4 (UI): migrated legacy rows use the current term and are added when no row of that kind exists', () => {
  const instance = ui();
  instance.run("setTerm('monthly')");
  importInto(instance, fs.readFileSync(path.join(__dirname, 'fixtures', 'issue-45-legacy.csv'), 'utf8'));
  const rooms = instance.items().find(item => item.unit === 'room');
  assert.equal(rooms.count, 1);
  assert.equal(rooms.price, 40.44);
  instance.run("setTerm('annual')");
  assert.equal(instance.items().find(item => item.unit === 'room').price, 33.70);
});

test('AC-4 (UI): import shows the migration note and keeps an existing quantity instead of the placeholder', () => {
  const instance = ui();
  addSalesWithRooms(instance, '3');
  const messages = [];
  instance.context.alert = message => messages.push(message);
  let reader;
  instance.context.FileReader = class {
    constructor() { reader = this; this.listeners = {}; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    readAsText() {}
  };
  instance.context.input = { files: [{ size: 100 }], value: 'alt.csv' };
  instance.run('handleFileSelect(input)');
  reader.listeners.load({ target: { result: fs.readFileSync(path.join(__dirname, 'fixtures', 'issue-45-legacy.csv'), 'utf8') } });
  assert.match(instance.elements.csvNotice.textContent, /Menge 1/);
  assert.match(instance.elements.csvNotice.textContent, /Teams Rooms Pro/);
  const items = instance.items();
  assert.equal(items.filter(item => item.unit === 'room').length, 1);
  assert.equal(items.filter(item => item.unit === 'server').length, 1);
  assert.equal(items.length, 1 + 1 + 3 + 1);
  assert.equal(items.find(item => item.unit === 'room').count, 3);
  assert.equal(items.find(item => item.unit === 'server').count, 1);
  assert.match(instance.elements.csvNotice.textContent, /Vorhandene Menge beibehalten: Teams Rooms Pro/);
});
