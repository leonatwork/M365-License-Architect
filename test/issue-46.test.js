const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/engine.js');
const data = require('../data/licenses.js');
const csv = require('../src/csv.js');

const row = (base, count = 1, addons = []) => ({ base, count, addons });
const validate = items => engine.validateQuote(items, data);

test('R1: two 200-user Business Premium rows produce one tenant warning with both indices', () => {
  const findings = validate([row('Business Premium', 200), row('Business Premium', 200)]);
  assert.equal(findings.length, 1);
  assert.deepEqual(Object.keys(findings[0]).sort(), ['items', 'message', 'rule', 'severity']);
  assert.equal(findings[0].rule, 'R1');
  assert.equal(findings[0].severity, 'warning');
  assert.deepEqual(findings[0].items, [0, 1]);
  assert.match(findings[0].message, /400/);
  assert.match(findings[0].message, /300/);
  assert.doesNotMatch(findings[0].message, /€|EUR|Mehrkosten|neu berechnen/i);
});

test('R1: exactly 300 is allowed, 301 across Business bases is not; Enterprise is excluded', () => {
  assert.deepEqual(validate([row('Business Premium', 300)]), []);
  assert.deepEqual(validate([row('Business Basic', 100), row('Business Standard', 100), row('Business Premium', 100)]), []);
  const findings = validate([row('M365 E3', 1000), row('Business Basic', 100), row('Business Standard', 101), row('Business Premium', 100)]);
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].items, [1, 2, 3]);
  assert.match(findings[0].message, /301/);
});

test('R2: imported O365 E3 + Defender Suite fails, M365 E3 + Defender Suite passes', () => {
  const imported = csv.importCSV('Persona,Count,Base,Addons,Price\nOffice,1,O365 E3,Defender Suite,36.67\nMicrosoft,1,M365 E3,Defender Suite,48.18', data);
  assert.deepEqual(imported.errors, []);
  const findings = validate(imported.items);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'R2');
  assert.equal(findings[0].severity, 'error');
  assert.deepEqual(findings[0].items, [0]);
  assert.match(findings[0].message, /Defender Suite/);
  assert.match(findings[0].message, /M365 E3/);
});

test('R2: imported M365 E5 and E7 fulfill Entra Suite prerequisites through Entra P2', () => {
  const imported = csv.importCSV('Persona,Count,Base,Addons,Price\nEnterprise E5,1,M365 E5,Entra Suite,60\nEnterprise E7,1,M365 E7,Entra Suite,100\nOffice,1,O365 E3,Entra Suite,40', data);
  assert.deepEqual(imported.errors, []);
  const findings = validate(imported.items);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'R2');
  assert.equal(findings[0].severity, 'error');
  assert.deepEqual(findings[0].items, [2]);
  assert.match(findings[0].message, /Entra P1/);
});

test('R2: edited row features fulfill lower Entra prerequisites only within the same row', () => {
  const edited = { ...row('O365 E3', 1, ['Entra Suite']), features: ['Entra P2'] };
  assert.deepEqual(validate([edited]), []);
  assert.deepEqual(validate([row('O365 E3', 1, ['Entra Suite']), edited]).map(finding => finding.items), [[0]]);
  const { HIERARCHY, ...withoutHierarchy } = data;
  assert.equal(engine.validateQuote([edited], withoutHierarchy).length, 1);
});

test('R2: hierarchy coverage is directional and does not relax explicit base requirements', () => {
  const fixture = { ...data, PRICES: { ...data.PRICES, 'P2 prerequisite': { requires: 'Entra P2' } } };
  assert.equal(engine.validateQuote([row('M365 E3', 1, ['P2 prerequisite'])], fixture).length, 1);
  assert.deepEqual(engine.validateQuote([row('M365 E5', 1, ['P2 prerequisite'])], fixture), []);
  assert.equal(validate([row('M365 E5', 1, ['BizPrem E5 Upgrade'])]).length, 1);
  assert.equal(validate([{ ...row('O365 E3', 1, ['Defender Suite']), features: ['Entra P2'] }]).length, 1);
});

test('R2 data coverage: every requires entry rejects an invalid base and accepts each valid base', () => {
  const entries = Object.entries(data.PRICES).filter(([, entry]) => entry.requires);
  assert.ok(entries.length > 0, 'catalog must contain prerequisites');
  for (const [addon, { requires }] of entries) {
    const invalid = validate([row('O365 E1', 1, [addon])]);
    assert.equal(invalid.length, 1, addon);
    assert.equal(invalid[0].rule, 'R2', addon);
    assert.equal(invalid[0].severity, 'error', addon);
    assert.deepEqual(invalid[0].items, [0], addon);
    assert.ok(invalid[0].message.includes(addon), addon);
    const bases = Array.isArray(requires) ? requires : Object.keys(data.FEATURES_MAP)
      .filter(base => base === requires || data.FEATURES_MAP[base].includes(requires));
    assert.ok(bases.length > 0, `no valid base for ${addon}`);
    for (const base of bases) assert.deepEqual(validate([row(base, 1, [addon])]), [], `${addon} on ${base}`);
    assert.deepEqual(validate([row('None', 1, [addon])]), [], `${addon} standalone import`);
  }
});

test('R2: prerequisites stay in the same row; string features and exact array bases match recommendation semantics', () => {
  assert.equal(validate([row('O365 E3', 1, ['Defender Suite']), row('M365 E3')]).length, 1);
  assert.deepEqual(validate([{ ...row('O365 E3', 1, ['EPM Add-on', 'Entra Suite']), features: ['Intune Plan 1', 'Entra P1'] }]), []);
  assert.equal(validate([{ ...row('O365 E3', 1, ['Defender Suite']), features: ['M365 E3'] }]).length, 1);
  assert.equal(validate([row('O365 E3', 1, ['EPM Add-on', 'Remote Help Add-on'])]).length, 2);
});

test('R2: explicit standalone and saved standalone workstyle are exempt; R1 still applies', () => {
  const addons = Object.keys(data.PRICES).filter(key => data.PRICES[key].requires);
  assert.deepEqual(validate([{ ...row('O365 E3', 1, addons), standalone: true }]), []);
  assert.deepEqual(validate([{ ...row('O365 E3', 1, addons), inputs: { workstyle: 'standalone' } }]), []);
  const findings = validate([{ ...row('Business Premium', 301, ['Defender Suite']), standalone: true }]);
  assert.deepEqual(findings.map(finding => finding.rule), ['R1']);
});

test('quote validation is pure, deterministic and empty without findings; no R3 for Copilot Business', () => {
  const items = [row('Business Premium', 200), row('Business Basic', 101), row('O365 E3', 1, ['Defender Suite', 'Copilot Business'])];
  const before = structuredClone({ items, data });
  const frozenData = structuredClone(data);
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  freeze(items);
  freeze(frozenData);
  assert.deepEqual(engine.validateQuote(items, frozenData), engine.validateQuote(items, frozenData));
  assert.deepEqual({ items, data: frozenData }, before);
  assert.deepEqual(validate([]), []);
  assert.deepEqual(validate([row('M365 E3', 1, ['Copilot Business', 'Teams EWR', 'M365 F5 Security Add-on'])]), []);
});

test('recommended personas remain R2-free across workstyles, Teams variants and advanced requirements', () => {
  const requirements = [{}, { epm: true, rh: true }, { risk: true, def2: true }, { lbl: true, edisc: true },
    { epm: true, rh: true, risk: true, lbl: true, phone: true }, { copilot: true }];
  for (const style of ['office', 'frontline', 'standalone']) {
    for (const teamsVariant of ['included', 'no_teams']) {
      for (const count of [10, 300, 301]) {
        for (const flags of requirements) {
          const input = { style, teamsVariant, count, ...flags };
          const recommended = engine.recommend(input, { term: 'annual' }, data);
          assert.deepEqual(validate([recommended]), [], JSON.stringify(input));
        }
      }
    }
  }
});
