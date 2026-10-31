const test = require('node:test');
const assert = require('node:assert/strict');
const legacy = require('./fixtures/legacy-constants.js');
const data = require('../data/licenses.js');

test('unchanged prices and presets retain legacy values except the three removed mailbox keys', () => {
  for (const [key, entry] of Object.entries(data.PRICES)) {
    if (entry.valid_from === null) assert.equal(entry.price, legacy.PRICES[key], key);
  }
  const expectedPresets = structuredClone(legacy.PERSONA_PRESETS);
  delete expectedPresets['Executive / C-Level'].largeMailbox;
  delete expectedPresets['Frontline Worker'].needMailbox;
  delete expectedPresets['Sales Team'].largeMailbox;
  assert.deepEqual(data.PERSONA_PRESETS, expectedPresets);
});

test('every changed price and mapping has a source and effective date', () => {
  for (const [key, entry] of Object.entries(data.PRICES)) {
    assert.equal(entry.currency, 'EUR', key);
    assert.ok(entry.source, key);
    if (entry.price !== legacy.PRICES[key] || Object.hasOwn(entry, 'price_no_teams')) {
      assert.match(entry.source, /^https:\/\/www\.microsoft\.com\//, key);
      assert.equal(entry.valid_from, '2026-07-01', key);
    } else if (key !== 'None') {
      assert.equal(entry.todo_source, true, key);
    }
  }
  for (const [key, features] of Object.entries(data.FEATURES_MAP)) {
    if (JSON.stringify(features) !== JSON.stringify(legacy.FEATURES_MAP[key])) {
      assert.ok(data.FEATURE_SOURCES[key].source, key);
      assert.equal(data.FEATURE_SOURCES[key].valid_from, '2026-07-01', key);
    }
  }
});

test('handover lists every unconfirmed price', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const handover = fs.readFileSync(path.join(__dirname, '..', 'docs/handover/ISSUE-23-HANDOVER.md'), 'utf8');
  for (const [key, entry] of Object.entries(data.PRICES)) {
    if (entry.todo_source) assert.ok(handover.includes(`| ${key} |`), key);
  }
});

test('priceInfo classifies every catalog price including dated todo_source entries', () => {
  const { priceInfo } = require('../src/csv.js');
  for (const [key, entry] of Object.entries(data.PRICES)) {
    const expected = key !== 'None' && (entry.todo_source === true || !entry.valid_from) ? [key] : [];
    assert.deepEqual(priceInfo({ base: key }, data).unsourced, expected, key);
    assert.deepEqual(priceInfo({ base: 'None', addons: [key] }, data).unsourced, expected, key);
  }
  for (const key of ['O365 E3', 'Entra Suite']) {
    assert.equal(data.PRICES[key].todo_source, true, key);
    assert.ok(data.PRICES[key].valid_from, key);
  }
});
