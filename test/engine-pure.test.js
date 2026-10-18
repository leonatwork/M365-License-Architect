const test = require('node:test');
const assert = require('node:assert/strict');

const julyReferenceResults = require('./fixtures/july-2026-reference-results.js');
const legacyConstants = require('./fixtures/legacy-constants.js');
const data = require('../data/licenses.js');

function withPoisonedGlobals(run) {
  const descriptors = {
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
  };

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    get() {
      throw new Error('document access is forbidden in engine tests');
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    get() {
      throw new Error('window access is forbidden in engine tests');
    },
  });

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('localStorage access is forbidden in engine tests');
    },
  });

  try {
    return run();
  } finally {
    for (const [name, descriptor] of Object.entries(descriptors)) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  }
}

function presetToEngineInput(presetName) {
  const preset = legacyConstants.PERSONA_PRESETS[presetName] || {};

  const input = {
    count: 10,
    style: 'office',
    current: 'None',
    desktop: false,
    web: false,
    teams: false,
    phone: false,
    mdmMobile: false,
    mdmDesktop: false,
    mdm: false,
    win: false,
    ca: false,
    risk: false,
    def1: false,
    def2: false,
    casb: false,
    dlp: false,
    lbl: false,
    edisc: false,
    epm: false,
    rh: false,
    copilot: false,
    visio: false,
    project: false,
    pauto: false,
    rooms: false,
    serverProt: false,
  };

  const map = {
    workstyle: 'style',
    desktopApps: 'desktop',
    webEdit: 'web',
    teamsCollab: 'teams',
    teamsPhone: 'phone',
    mdmMobile: 'mdmMobile',
    mdmDesktop: 'mdmDesktop',
    winOS: 'win',
    sec_ca: 'ca',
    sec_risk_ca: 'risk',
    sec_def_p1: 'def1',
    sec_def_p2: 'def2',
    sec_casb: 'casb',
    comp_dlp: 'dlp',
    comp_labeling: 'lbl',
    comp_ediscovery: 'edisc',
    adv_epm: 'epm',
    adv_remotehelp: 'rh',
    adv_copilot: 'copilot',
    add_visio: 'visio',
    add_project: 'project',
    add_powerauto: 'pauto',
    add_rooms: 'rooms',
    serverProt: 'serverProt',
  };

  for (const [legacyKey, value] of Object.entries(preset)) {
    const engineKey = map[legacyKey];
    if (engineKey) {
      input[engineKey] = value;
    }
  }

  input.mdm = Boolean(input.mdmMobile || input.mdmDesktop);
  return input;
}

function getExpectedFeatureDiff(currentLic, recommendedFeatures) {
  const curF = legacyConstants.FEATURES_MAP[currentLic] || [];
  const recF = recommendedFeatures || [];

  const gained = recF.filter((newFeature) => {
    if (curF.includes(newFeature)) {
      return false;
    }

    let groupName = null;
    for (const [group, members] of Object.entries(legacyConstants.HIERARCHY)) {
      if (members.includes(newFeature)) {
        groupName = group;
        break;
      }
    }

    if (groupName) {
      const members = legacyConstants.HIERARCHY[groupName];
      const newRank = members.indexOf(newFeature);
      const hasSuperior = curF.some((oldFeature) => {
        const oldRank = members.indexOf(oldFeature);
        return oldRank > -1 && oldRank >= newRank;
      });
      if (hasSuperior) {
        return false;
      }
    }

    return true;
  });

  const lost = curF.filter((lostFeature) => {
    if (recF.includes(lostFeature)) {
      return false;
    }

    let groupName = null;
    for (const [group, members] of Object.entries(legacyConstants.HIERARCHY)) {
      if (members.includes(lostFeature)) {
        groupName = group;
        break;
      }
    }

    if (groupName) {
      const members = legacyConstants.HIERARCHY[groupName];
      const lostRank = members.indexOf(lostFeature);
      const hasSuperiorOrEqual = recF.some((feature) => {
        const rank = members.indexOf(feature);
        return rank > -1 && rank >= lostRank;
      });
      if (hasSuperiorOrEqual) {
        return false;
      }
    }

    return true;
  });

  return { gained, lost };
}

test('engine module can be required in node without browser globals', () => {
  withPoisonedGlobals(() => {
    const engine = require('../src/engine.js');
    assert.equal(typeof engine.recommend, 'function');
    assert.equal(typeof engine.compare, 'function');
  });
});

test('recommend matches reviewed July prices and combinations for every preset', () => {
  const engine = require('../src/engine.js');
  const presetNames = Object.keys(legacyConstants.PERSONA_PRESETS).filter((name) => name !== 'Benutzerdefiniert');

  for (const presetName of presetNames) {
    const input = presetToEngineInput(presetName);
    const annual = engine.recommend(input, { term: 'annual' }, data);
    const monthly = engine.recommend(input, { term: 'monthly' }, data);

    const expected = julyReferenceResults[presetName];
    assert.equal(annual.base, expected.base, presetName);
    assert.deepEqual(annual.addons, expected.addons, presetName);
    assert.ok(Math.abs(annual.price - expected.price) < 1e-9, presetName);
    assert.equal(monthly.base, expected.base, presetName);
    assert.deepEqual(monthly.addons, expected.addons, presetName);
    assert.ok(Math.abs(monthly.price - expected.price * 1.2) < 1e-9, presetName);
  }
});

test('compare reproduces pricing delta and smart feature diff logic', () => {
  const engine = require('../src/engine.js');

  const result = engine.recommend({
    count: 10,
    style: 'office',
    current: 'Business Basic',
    desktop: true,
    web: true,
    teams: true,
    phone: false,
    mdm: false,
    win: false,
    ca: false,
    risk: false,
    def1: false,
    def2: false,
    casb: false,
    dlp: false,
    lbl: false,
    edisc: false,
    epm: false,
    rh: false,
    copilot: false,
    visio: false,
    project: false,
    pauto: false,
    rooms: false,
    serverProt: false,
  }, { term: 'annual' }, data);

  const comparison = engine.compare('Business Basic', result, 'annual', data);
  const expectedFeatureDiff = getExpectedFeatureDiff('Business Basic', result.features);

  assert.equal(comparison.currentPrice, 6.07);
  assert.equal(comparison.delta, result.price - 6.07);
  assert.equal(comparison.altPrice, 6.07);
  assert.equal(comparison.altDiff, result.price - 6.07);
  assert.deepEqual(comparison.gained, expectedFeatureDiff.gained);
  assert.deepEqual(comparison.lost, expectedFeatureDiff.lost);
});
