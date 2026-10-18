const test = require('node:test');
const assert = require('node:assert/strict');
const legacy = require('./fixtures/legacy-constants.js');
const data = require('../data/licenses.js');

test('unchanged prices and presets retain their legacy values', () => {
  for (const [key, entry] of Object.entries(data.PRICES)) {
    if (entry.valid_from === null) assert.equal(entry.price, legacy.PRICES[key], key);
  }
  assert.deepEqual(data.PERSONA_PRESETS, legacy.PERSONA_PRESETS);
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
  const handover = fs.readFileSync(path.join(__dirname, '..', 'ISSUE-8-HANDOVER.md'), 'utf8');
  for (const [key, entry] of Object.entries(data.PRICES)) {
    if (entry.todo_source) assert.ok(handover.includes(`| ${key} |`), key);
  }
});
