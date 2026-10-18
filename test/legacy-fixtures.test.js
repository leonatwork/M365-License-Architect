const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PRICES,
  HIERARCHY,
  FEATURES_MAP,
  PERSONA_PRESETS,
} = require('./fixtures/legacy-constants.js');
const packageJson = require('../package.json');
const {
  runLegacyRecalc,
  measurePresetReferences,
} = require('./fixtures/legacy-recalc.js');
const legacyReferenceResults = require('./fixtures/legacy-reference-results.js');

test('legacy constants fixture exposes the original data blocks', () => {
  assert.equal(PRICES['M365 E5'], 51.70);
  assert.deepEqual(HIERARCHY.MDM, ['Mobile MDM', 'Intune']);
  assert.ok(FEATURES_MAP['Business Premium'].includes('Win OS (VDA)'));
  assert.equal(Object.keys(PERSONA_PRESETS).length, 9);
});

test('package.json contains only the required test script without dependencies', () => {
  assert.deepEqual(Object.keys(packageJson), ['scripts']);
  assert.equal(packageJson.scripts.test, 'node --test test/');
  assert.equal(Object.hasOwn(packageJson, 'dependencies'), false);
  assert.equal(Object.hasOwn(packageJson, 'devDependencies'), false);
});

test('legacy recalc fixture reproduces a known annual scenario', () => {
  const result = runLegacyRecalc({
    count: 10,
    style: 'office',
    current: 'None',
    desktop: true,
    web: true,
    teams: true,
  }, false);

  assert.equal(result.base, 'Business Standard');
  assert.equal(result.price, 11.7);
  assert.deepEqual(result.addons, ['Teams EEA']);
});

test('legacy recalc fixture can measure all presets for annual and monthly terms', () => {
  const refs = measurePresetReferences();
  const presetNames = Object.keys(PERSONA_PRESETS).filter((name) => name !== 'Benutzerdefiniert');

  assert.equal(Object.keys(refs).length, presetNames.length);
  for (const presetName of presetNames) {
    assert.ok(refs[presetName]);
    assert.ok(refs[presetName].annual);
    assert.ok(refs[presetName].monthly);
    assert.equal(typeof refs[presetName].annual.price, 'number');
    assert.equal(typeof refs[presetName].monthly.price, 'number');
  }

  assert.deepEqual(refs, legacyReferenceResults);
});
