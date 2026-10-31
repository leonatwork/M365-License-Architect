const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../data/licenses.js');
const engine = require('../src/engine.js');
const { runLegacyRecalc } = require('./fixtures/legacy-recalc.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

function app() {
  const elements = {};
  for (const match of html.matchAll(/<(input|select|div|span|button|tbody|td|ul)[^>]*id="([^"]+)"[^>]*>/g)) {
    elements[match[2]] = { tagName: match[1].toUpperCase(), type: /type="checkbox"/.test(match[0]) ? 'checkbox' : 'text',
      value: '', checked: false, innerText: '', innerHTML: '', style: {}, classList: { add() {}, remove() {} } };
  }
  elements.userCount.value = '10';
  elements.workstyle.value = 'office';
  elements.currentLicense.value = 'None';
  elements.teamsVariant.value = 'included';
  const context = { LICENSE_DATA: data, LicenseEngine: engine, LicenseCSV: require('../src/csv.js'),
    document: { getElementById: id => elements[id] }, window: { scrollTo() {}, addEventListener() {} }, alert() {} };
  vm.createContext(context);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { elements, run: code => vm.runInContext(code, context) };
}

for (const count of [299, 300, 301]) {
  for (const [branch, input, business, enterprise, businessAlt, enterpriseAlt] of [
    ['Business Premium', { mdm: true }, 'Business Premium', 'M365 E3', 'M365 E5', 'Business Premium'],
    ['Desktop', { desktop: true }, 'Business Standard', 'O365 E3', 'Business Basic', 'O365 E1'],
    ['Cloud-only', {}, 'Business Basic', 'O365 E1', 'Business Standard', 'O365 E3'],
  ]) {
    test(`${branch}: ${count} users respect the inclusive Business limit and alternative`, () => {
      for (const term of ['annual', 'monthly']) {
        const result = engine.recommend({ ...input, count }, { term }, data);
        assert.equal(result.base, count <= 300 ? business : enterprise);
        assert.equal(result.alt, count <= 300 ? businessAlt : enterpriseAlt);
      }
    });
  }
}

test('legacy fixture uses the corrected inclusive limit at 300 for Desktop and Cloud-only', () => {
  assert.equal(runLegacyRecalc({ count: 300, desktop: true }, false).base, 'Business Standard');
  assert.equal(runLegacyRecalc({ count: 300, desktop: true }, false).alt, 'Business Basic');
  assert.equal(runLegacyRecalc({ count: 300 }, false).base, 'Business Basic');
});

test('mailbox controls are absent from active UI, persistence and presets', () => {
  assert.equal(/needMailbox|largeMailbox|Mailbox > 0GB|Large Mailbox/.test(html), false);
  const { run } = app();
  for (const key of ['needMailbox', 'largeMailbox']) {
    assert.equal(run(`FORM_IDS.includes('${key}')`), false);
    for (const preset of Object.values(data.PERSONA_PRESETS)) assert.equal(Object.hasOwn(preset, key), false);
  }
});

test('form mapping is DOM-free, complete and ignores obsolete mailbox fields', () => {
  const flags = { desktopApps: 'desktop', webEdit: 'web', teamsCollab: 'teams', teamsPhone: 'phone',
    winOS: 'win', sec_ca: 'ca', sec_risk_ca: 'risk', sec_def_p1: 'def1', sec_def_p2: 'def2',
    sec_casb: 'casb', comp_dlp: 'dlp', comp_labeling: 'lbl', comp_ediscovery: 'edisc', adv_epm: 'epm',
    adv_remotehelp: 'rh', adv_copilot: 'copilot', add_visio: 'visio', add_project: 'project',
    add_powerauto: 'pauto', add_rooms: 'rooms', serverProt: 'serverProt' };
  const form = { userCount: '300', workstyle: 'frontline', currentLicense: 'M365 F3', teamsVariant: 'no_teams',
    mdmMobile: true, mdmDesktop: false, needMailbox: true, largeMailbox: true };
  const expected = { count: 300, style: 'frontline', current: 'M365 F3', teamsVariant: 'no_teams', mdm: true };
  for (const [id, flag] of Object.entries(flags)) { form[id] = true; expected[flag] = true; }
  const context = { module: { exports: {} } };
  Object.defineProperty(context, 'document', { get() { throw new Error('DOM access'); } });
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src/engine.js'), 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.module.exports.mapFormInputs(form))), expected);
  for (const mdm of [{ mdmMobile: false, mdmDesktop: true }, { mdmMobile: false, mdmDesktop: false }]) {
    assert.equal(engine.mapFormInputs(mdm).mdm, mdm.mdmDesktop);
  }
  assert.equal(engine.mapFormInputs({}).count, 1);
});

test('annual → monthly → annual reprices every saved persona like a fresh configuration', () => {
  const { elements: el, run } = app();
  const forms = [
    { personaName: 'Office', userCount: '300', workstyle: 'office', currentLicense: 'O365 E3', teamsVariant: 'no_teams', desktopApps: true, teamsCollab: true, add_visio: true },
    { personaName: 'Frontline', userCount: '7', workstyle: 'frontline', currentLicense: 'M365 F1', teamsVariant: 'included', webEdit: true, teamsPhone: true },
    { personaName: 'Add-ons', userCount: '3', workstyle: 'standalone', currentLicense: 'None', teamsVariant: 'included', adv_epm: true, adv_remotehelp: true },
  ];
  for (const form of forms) {
    for (const [id, value] of Object.entries(form)) {
      if (el[id].type === 'checkbox') el[id].checked = value;
      else el[id].value = value;
    }
    run('recalc(); addToQuote()');
  }
  const annual = JSON.parse(run('JSON.stringify(quoteItems)'));
  for (const term of ['monthly', 'monthly', 'annual', 'annual']) {
    run(`setTerm('${term}')`);
    const items = JSON.parse(run('JSON.stringify(quoteItems)'));
    let total = 0;
    for (const [index, item] of items.entries()) {
      close(item.price, annual[index].price * (term === 'monthly' ? 1.2 : 1));
      const fresh = engine.recommend(engine.mapFormInputs(item.inputs), { term }, data);
      close(item.price, fresh.price);
      close(item.price, annual[index].price * (term === 'monthly' ? 1.2 : 1));
      assert.deepEqual(item.inputs, annual[index].inputs);
      assert.equal(item.persona, annual[index].persona);
      assert.deepEqual(item.addons, fresh.addons);
      total += fresh.price * fresh.count;
    }
    assert.equal(el.grandTotal.innerText, `€${total.toFixed(2)}`);
    assert.match(el.quoteBody.innerHTML, new RegExp(`€${items[0].price.toFixed(2).replace('.', '\\.')}`));
  }
  assert.deepEqual(JSON.parse(run('JSON.stringify(quoteItems)')), annual);
});

test('legacy positions scale in both directions, round to cents and ignore repeated term selection', () => {
  const { elements: el, run } = app();
  run('quoteItems = [{ persona: "Alt", count: 2, base: "Business Basic", addons: [], price: 6.07, teamsPrice: 0, teamsVariant: "included", currentLic: "None", features: [], priceNote: "Historischer Preis" }]; renderTable()');
  run('setTerm("monthly")');
  assert.equal(run('quoteItems[0].price'), 7.28);
  assert.equal(el.grandTotal.innerText, '€14.56');
  run('setTerm("monthly")');
  assert.equal(run('quoteItems[0].price'), 7.28);
  run('setTerm("annual")');
  assert.equal(run('quoteItems[0].price'), 6.07);
  assert.equal(run('quoteItems[0].priceNote'), 'Historischer Preis');
  run('setTerm("annual")');
  assert.equal(run('quoteItems[0].price'), 6.07);
});

test('dashboard base uses the correct term and Teams variant; rounded shares equal the total', () => {
  const { elements: el, run } = app();
  el.teamsVariant.value = 'no_teams';
  el.teamsCollab.checked = true;
  el.desktopApps.checked = true;
  el.add_visio.checked = true;
  el.userCount.value = '3';
  run('recalc(); addToQuote()');
  for (const term of ['annual', 'monthly', 'annual']) {
    run(`setTerm('${term}')`);
    const expectedBase = Number((data.PRICES['Business Standard'].price_no_teams * 3 * (term === 'monthly' ? 1.2 : 1)).toFixed(2));
    assert.equal(el.dashBaseVal.innerText, `€${expectedBase.toFixed(2)}`);
    const base = Number(el.dashBaseVal.innerText.slice(1));
    const addon = Number(el.dashAddonVal.innerText.slice(1));
    close(base + addon, Number(el.grandTotal.innerText.slice(1)));
    assert.ok(addon > 0);
  }
});

test('dashboard assigns the cent remainder to add-ons instead of rounding both shares independently', () => {
  const { elements: el, run } = app();
  el.teamsVariant.value = 'no_teams';
  el.teamsCollab.checked = true;
  el.mdmDesktop.checked = true;
  el.userCount.value = '2';
  run('recalc(); addToQuote(); setTerm("monthly")');
  assert.equal(el.grandTotal.innerText, '€56.86');
  assert.equal(el.dashBaseVal.innerText, '€39.07');
  assert.equal(el.dashAddonVal.innerText, '€17.79');
});
