const test = require('node:test');
const assert = require('node:assert/strict');

const legacy = require('./fixtures/legacy-constants.js');
const dataModule = require('../data/licenses.js');

const SOURCE = 'm365maps.com + Microsoft-Preisseite';

test('LICENSE_DATA keeps all legacy constants unchanged', () => {
  assert.deepEqual(Object.keys(dataModule.PRICES).sort(), Object.keys(legacy.PRICES).sort());

  for (const [key, legacyPrice] of Object.entries(legacy.PRICES)) {
    const entry = dataModule.PRICES[key];
    assert.ok(entry, `missing price entry for ${key}`);
    assert.equal(entry.price, legacyPrice);
  }

  assert.deepEqual(dataModule.HIERARCHY, legacy.HIERARCHY);
  assert.deepEqual(dataModule.FEATURES_MAP, legacy.FEATURES_MAP);
  assert.deepEqual(dataModule.PERSONA_PRESETS, legacy.PERSONA_PRESETS);
});

test('every price entry includes required metadata', () => {
  for (const [key, entry] of Object.entries(dataModule.PRICES)) {
    assert.equal(entry.currency, 'EUR', `${key} currency`);
    assert.equal(entry.source, SOURCE, `${key} source`);
    assert.equal(entry.valid_from, null, `${key} valid_from`);
  }
});
