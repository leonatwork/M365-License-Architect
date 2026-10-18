const test = require('node:test');
const assert = require('node:assert/strict');

const data = require('../data/licenses.js');
const engine = require('../src/engine.js');
const legacyConstants = require('./fixtures/legacy-constants.js');

function recommend(overrides, term) {
  const input = {
    count: 10,
    style: 'office',
    current: 'None',
    desktop: false,
    web: false,
    teams: false,
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
    ...overrides,
  };

  return engine.recommend(input, { term: term || 'annual' }, data);
}

test('office persona with only base requirements recommends Business Basic', () => {
  const result = recommend({ style: 'office' });
  assert.equal(result.base, 'Business Basic');
  assert.deepEqual(result.addons, []);
  assert.equal(result.price, 4.6);
});

test('frontline persona with enterprise voice requirement triggers guardrail to E5', () => {
  const result = recommend({ style: 'frontline', phone: true });
  assert.equal(result.base, 'M365 E5');
  assert.equal(result.reason, 'Frontline needs Ent. features (Voice/Win/Intune Suite).');
});

test('E5 break-even auto-upsell is preserved', () => {
  const result = recommend({
    style: 'office',
    desktop: true,
    teams: true,
    phone: true,
    mdm: true,
    risk: true,
    lbl: true,
    copilot: true,
  });

  assert.equal(result.base, 'M365 E5');
  assert.equal(result.reason, 'Auto-Upgrade to M365 E5 (Cheaper than Base + Add-ons).');
  assert.ok(result.addons.includes('M365 Copilot'));
});

test('Intune Suite bundle is selected when cheaper than individual add-ons', () => {
  const result = recommend({ epm: true, rh: true });
  assert.ok(result.addons.includes('Intune Suite Add-on'));
  assert.equal(result.addons.includes('EPM Add-on'), false);
  assert.equal(result.addons.includes('Remote Help Add-on'), false);
});

test('single Intune add-on stays individual when bundle is not cheaper', () => {
  const result = recommend({ epm: true });
  assert.equal(result.addons.includes('Intune Suite Add-on'), false);
  assert.ok(result.addons.includes('EPM Add-on'));
});

test('compare returns as-is/to-be delta for positive investment', () => {
  const result = recommend({ desktop: true, teams: true, current: 'Business Basic' });
  const comparison = engine.compare('Business Basic', result, 'annual', data);

  assert.equal(comparison.currentPrice, 4.6);
  assert.equal(comparison.delta, 7.1);
  assert.equal(comparison.currentLic, 'Business Basic');
});

test('compare returns feature diff arrays', () => {
  const result = recommend({ desktop: true, teams: true, current: 'Business Basic' });
  const comparison = engine.compare('Business Basic', result, 'annual', data);

  assert.ok(Array.isArray(comparison.gained));
  assert.ok(Array.isArray(comparison.lost));
  assert.ok(comparison.gained.includes('Desktop Apps'));
});

test('user count above 1 is kept and affects base choice thresholds', () => {
  const result = recommend({ count: 500, style: 'office', teams: true });
  assert.equal(result.count, 500);
  assert.equal(result.base, 'O365 E1');
});

const teamsTierScenarios = [
  { name: 'M365 F1', input: { style: 'frontline', teams: true }, teamsPrice: 0.5 },
  { name: 'M365 F3', input: { style: 'frontline', web: true, teams: true }, teamsPrice: 0.5 },
  { name: 'Business Basic', input: { style: 'office', teams: true }, teamsPrice: 1.0 },
  { name: 'Business Standard', input: { style: 'office', desktop: true, teams: true }, teamsPrice: 2.0 },
  { name: 'Business Premium', input: { style: 'office', mdm: true, teams: true }, teamsPrice: 2.0 },
  { name: 'O365 E1', input: { style: 'office', count: 500, teams: true }, teamsPrice: 1.0 },
  { name: 'O365 E3', input: { style: 'office', count: 500, desktop: true, teams: true }, teamsPrice: 8.3 },
  { name: 'M365 E3', input: { style: 'office', count: 500, mdm: true, teams: true }, teamsPrice: 8.0 },
  { name: 'M365 E5', input: { style: 'office', teams: true, phone: true }, teamsPrice: 8.0 },
];

teamsTierScenarios.forEach((scenario) => {
  test(`Teams EEA add-on is mapped for ${scenario.name}`, () => {
    const result = recommend(scenario.input);
    assert.equal(result.base, scenario.name);
    assert.equal(result.teamsPrice, scenario.teamsPrice);
    assert.ok(result.addons.includes('Teams EEA'));
  });
});

const presetNames = Object.keys(legacyConstants.PERSONA_PRESETS).filter((name) => name !== 'Benutzerdefiniert');

presetNames.forEach((presetName) => {
  test(`persona preset ${presetName} can be processed by the engine`, () => {
    const preset = legacyConstants.PERSONA_PRESETS[presetName];
    const result = recommend({
      style: preset.workstyle || 'office',
      desktop: Boolean(preset.desktopApps),
      web: Boolean(preset.webEdit),
      teams: Boolean(preset.teamsCollab),
      phone: Boolean(preset.teamsPhone),
      mdm: Boolean(preset.mdmMobile || preset.mdmDesktop),
      win: Boolean(preset.winOS),
      ca: Boolean(preset.sec_ca),
      risk: Boolean(preset.sec_risk_ca),
      def1: Boolean(preset.sec_def_p1),
      def2: Boolean(preset.sec_def_p2),
      casb: Boolean(preset.sec_casb),
      dlp: Boolean(preset.comp_dlp),
      lbl: Boolean(preset.comp_labeling),
      edisc: Boolean(preset.comp_ediscovery),
      epm: Boolean(preset.adv_epm),
      rh: Boolean(preset.adv_remotehelp),
      copilot: Boolean(preset.adv_copilot),
      visio: Boolean(preset.add_visio),
      project: Boolean(preset.add_project),
      pauto: Boolean(preset.add_powerauto),
      rooms: Boolean(preset.add_rooms),
    });

    assert.equal(typeof result.base, 'string');
    assert.equal(typeof result.price, 'number');
    assert.ok(result.features.length >= 0);
  });
});
