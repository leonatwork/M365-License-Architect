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
  assert.equal(result.price, 6.07);
});

test('frontline persona with voice requirement gets Phone without E5 guardrail', () => {
  const result = recommend({ style: 'frontline', phone: true });
  assert.equal(result.base, 'M365 F1');
  assert.deepEqual(result.addons, ['Teams Phone Add-on']);
});

test('Copilot compares Business upgrades and preserves enterprise E5 break-even', () => {
  const input = {
    style: 'office',
    desktop: true,
    teams: true,
    phone: true,
    mdm: true,
    risk: true,
    lbl: true,
    copilot: true,
  };

  const result = recommend(input);
  assert.equal(result.base, 'Business Premium');
  assert.deepEqual(result.addons, ['BizPrem E5 Upgrade', 'Teams Phone Add-on', 'Copilot Business']);
  assert.ok(Math.abs(result.price - 58.96) < 1e-9);
  assert.match(result.reason, /günstigste/);
  const enterprise = recommend({ ...input, count: 301 });
  assert.equal(enterprise.base, 'M365 E5');
  assert.deepEqual(enterprise.addons, ['M365 Copilot']);
  assert.ok(Math.abs(enterprise.price - 84.13) < 1e-9);
});

test('standalone quotes Intune products with a separate Plan 1 prerequisite', () => {
  const result = recommend({ style: 'standalone', epm: true, rh: true });
  assert.equal(result.base, 'None');
  assert.deepEqual(result.addons, ['EPM Add-on', 'Remote Help Add-on']);
  assert.ok(Math.abs(result.price - 5.60) < 1e-9);
  assert.match(result.reason, /Intune Plan 1.*separat erforderlich/);
});

test('single Intune add-on stays individual when bundle is not cheaper', () => {
  const result = recommend({ epm: true });
  assert.equal(result.addons.includes('Intune Suite Add-on'), false);
  assert.ok(result.addons.includes('EPM Add-on'));
});

test('compare returns as-is/to-be delta for positive investment', () => {
  const result = recommend({ desktop: true, teams: true, current: 'Business Basic' });
  const comparison = engine.compare('Business Basic', result, 'annual', data);

  assert.equal(comparison.currentPrice, 6.07);
  assert.ok(Math.abs(comparison.delta - 6.06) < 1e-9);
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
  { name: 'M365 F1', input: { style: 'frontline', teams: true } },
  { name: 'M365 F3', input: { style: 'frontline', web: true, teams: true } },
  { name: 'Business Basic', input: { style: 'office', teams: true } },
  { name: 'Business Standard', input: { style: 'office', desktop: true, teams: true } },
  { name: 'Business Premium', input: { style: 'office', mdm: true, teams: true } },
  { name: 'O365 E1', input: { style: 'office', count: 500, teams: true } },
  { name: 'O365 E3', input: { style: 'office', count: 500, desktop: true, teams: true } },
  { name: 'M365 E3', input: { style: 'office', count: 500, mdm: true, teams: true } },
  { name: 'M365 E5', input: { style: 'office', count: 500, mdm: true, risk: true, lbl: true, teams: true } },
];

teamsTierScenarios.forEach((scenario) => {
  test(`Teams is included once for ${scenario.name}`, () => {
    const result = recommend(scenario.input);
    assert.equal(result.base, scenario.name);
    assert.equal(result.teamsPrice, 0);
    assert.equal(result.addons.includes('Teams EEA'), false);
    assert.equal(result.price, data.PRICES[scenario.name].price);
    // EWR-Variante ohne Teams-Bedarf: nur price_no_teams, kein Teams-Add-on.
    const noTeams = recommend({ ...scenario.input, teams: false, teamsVariant: 'no_teams' });
    assert.equal(noTeams.base, scenario.name);
    assert.equal(noTeams.price, data.PRICES[scenario.name].price_no_teams);
    assert.deepEqual(noTeams.addons, []);
    assert.equal(noTeams.features.includes('Teams Collaboration'), false);
    // EWR-Variante mit Teams-Bedarf: Teams EWR genau einmal als Add-on.
    const ewr = recommend({ ...scenario.input, teamsVariant: 'no_teams' });
    assert.equal(ewr.base, scenario.name);
    assert.deepEqual(ewr.addons, ['Teams EWR']);
    assert.ok(Math.abs(ewr.price - (data.PRICES[scenario.name].price_no_teams + data.PRICES['Teams EWR'].price)) < 1e-9);
    assert.ok(ewr.features.includes('Teams Collaboration'));
    assert.equal(ewr.teamsPrice, 0);
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
