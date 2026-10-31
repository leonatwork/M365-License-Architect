const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, html } = require('./fixtures/ui-app.js');

test('index.html has no inline event attributes', () => {
  const markup = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  for (const [tag] of markup.matchAll(/<[^>]*>/g)) {
    assert.doesNotMatch(tag, /\son[a-z]+\s*=/i, `inline on*-attribute found: ${tag}`);
  }
});

test('every interpolation in an HTML template explicitly escapes its value', () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  let checked = 0;
  // Conservative source gate: HTML templates must use direct escapeHTML calls.
  // Nested templates / object literals in interpolations require refactoring,
  // rather than silently bypassing this dependency-free check.
  for (const template of script.matchAll(/`([^`]*)`/g)) {
    if (!/<\/?[a-z]/i.test(template[1])) continue;
    const expressions = [...template[1].matchAll(/\$\{([^}]*)\}/g)];
    assert.equal(expressions.length, (template[1].match(/\$\{/g) || []).length);
    for (const [, expression] of expressions) {
      assert.match(expression.trim(), /^escapeHTML\([\s\S]*\)$/,
        `Unescaped HTML interpolation: ${expression}`);
      // Ensure the wrapper covers the entire expression, not just its prefix.
      let depth = 0;
      let quote = '';
      for (const [index, char] of [...expression.trim()].entries()) {
        if (quote) { if (char === quote) quote = ''; continue; }
        if (char === '"' || char === "'") { quote = char; continue; }
        if (char === '(') depth++;
        if (char === ')') {
          depth--;
          assert.ok(depth > 0 || index === expression.trim().length - 1,
            `Content outside escapeHTML: ${expression}`);
        }
      }
      assert.equal(depth, 0);
      checked++;
    }
  }
  assert.ok(checked > 0, 'HTML interpolation gate must inspect actual templates');
});

test('feature tags and both live/modal delta lists render hostile text inertly', () => {
  const ui = app();
  ui.run('resetForm()');
  const payload = `<img src=x onerror="alert('x')"> & "'`;
  ui.context.payload = payload;
  ui.context.LicenseEngine = { ...ui.context.LicenseEngine,
    compare: () => ({ delta: 0, altPrice: 0, altDiff: 0, gained: [payload], lost: [payload] }) };
  ui.run('currentCalc.features = [payload]; render(); addToQuote(); showComparison(0)');
  for (const id of ['featureTags', 'liveGained', 'liveLost', 'listGained', 'listLost']) {
    // addToQuote resets the form, so restore the tainted tags after that reset.
    if (id === 'featureTags') ui.run('currentCalc.features = [payload]; render()');
    assert.doesNotMatch(ui.elements[id].innerHTML, /<img\b/);
    assert.match(ui.elements[id].innerHTML, /&lt;img/);
    assert.match(ui.elements[id].innerHTML, /&amp; &quot;&#39;/);
  }
});

test('quote rendering escapes persona, plan, add-ons, count and price metadata', () => {
  const ui = app();
  ui.run('resetForm(); addToQuote()');
  ui.context.payload = `"><svg onload='alert(1)'> &`;
  ui.run('Object.assign(quoteItems[0], { persona: payload, base: payload, addons: [payload], count: payload, priceNote: payload }); renderTable()');
  assert.doesNotMatch(ui.elements.quoteBody.innerHTML, /<svg\b/);
  assert.equal((ui.elements.quoteBody.innerHTML.match(/&lt;svg/g) || []).length, 5);
  for (const [tag] of ui.elements.quoteBody.innerHTML.matchAll(/<[^>]*>/g)) {
    assert.doesNotMatch(tag, /\bon[a-z]+\s*=/i);
  }
});

test('load, input, selects and every requirement checkbox use registered listeners', () => {
  const ui = app();
  ui.load();
  assert.match(ui.elements.recPrice.innerText, /^€ \d/);
  const ids = JSON.parse(ui.run('JSON.stringify(FORM_IDS)')).filter(id => id !== 'personaName');
  let calls = 0;
  ui.context.recalc = () => calls++;
  for (const id of ids) ui.elements[id].dispatch(id === 'userCount' ? 'input' : 'change');
  assert.equal(calls, ids.length);
});

test('preset, both add buttons, Clear, term and theme controls retain their behavior', () => {
  const ui = app();
  ui.load();
  ui.elements.presetSelector.value = 'Marketing Team';
  ui.elements.presetSelector.dispatch('change');
  assert.equal(ui.elements.desktopApps.checked, true);
  assert.equal(ui.elements.comp_dlp.checked, true);
  ui.elements.personaName.value = 'Marketing';
  ui.elements.actionBtn.click();
  assert.equal(ui.items().length, 1);
  const annual = ui.items()[0].price;
  ui.elements.btnMonthly.click();
  assert.ok(Math.abs(ui.items()[0].price - annual * 1.2) < 1e-9);
  ui.elements.btnAnnual.click();
  assert.equal(ui.items()[0].price, annual);
  ui.elements.actionBtnMobile.click();
  assert.equal(ui.items().length, 2);
  ui.elements.personaName.value = 'Verwerfen';
  ui.elements.clearBtn.click();
  assert.equal(ui.elements.personaName.value, '');
  ui.elements.themeBtn.click();
  assert.equal(ui.context.document.documentElement.classList.contains('dark'), true);
  assert.equal(ui.context.localStorage.theme, 'dark');
  ui.elements.themeBtn.click();
  assert.equal(ui.context.localStorage.theme, 'light');
});

test('delegated row actions survive rerendering and work from nested icons', () => {
  const ui = app();
  ui.load();
  for (const persona of ['Erste', 'Zweite', 'Dritte']) {
    ui.elements.personaName.value = persona;
    ui.elements.actionBtn.click();
  }
  ui.rowAction('edit', 1);
  assert.equal(ui.elements.personaName.value, 'Zweite');
  ui.rowAction('remove', 0);
  assert.equal(ui.run('editingIndex'), 0);
  ui.elements.personaName.value = 'Aktualisiert';
  ui.elements.actionBtnMobile.click();
  assert.deepEqual(ui.items().map(item => item.persona), ['Aktualisiert', 'Dritte']);
  ui.rowAction('compare', 0);
  assert.equal(ui.elements.compModal.classList.contains('hidden'), false);
  ui.elements.closeModalBtn.click();
  assert.equal(ui.elements.compModal.classList.contains('hidden'), true);
  ui.rowAction('compare', 1, false);
  ui.elements.modalBackdrop.click();
  assert.equal(ui.elements.compModal.classList.contains('hidden'), true);
  ui.elements.quoteBody.dispatch('click', { closest: () => null });
  assert.equal(ui.items().length, 2);
  ui.rowAction('remove', 1);
  assert.equal(ui.items().length, 1);
});

test('Import and Export listeners perform a CSV roundtrip with inert persona text', async () => {
  const ui = app();
  ui.load();
  const persona = '<img src=x onerror=alert(1)> & Import';
  ui.elements.personaName.value = persona;
  ui.elements.actionBtn.click();
  ui.elements.exportBtn.click();
  assert.equal(ui.downloads[0].download, 'M365_Quote_Export.csv');
  const csv = await ui.context.exportedBlob.text();
  let pickerClicks = 0;
  ui.elements.csvInput.click = () => pickerClicks++;
  ui.elements.importBtn.click();
  assert.equal(pickerClicks, 1);
  ui.context.FileReader = class {
    addEventListener(type, callback) {
      assert.ok(type === 'load' || type === 'error');
      this[type] = callback;
    }
    readAsText() { this.load({ target: { result: csv } }); }
  };
  ui.elements.csvInput.files = [{ size: 64 }];
  ui.elements.csvInput.value = 'quote.csv';
  ui.elements.csvInput.dispatch('change');
  assert.equal(ui.items().length, 2);
  assert.equal(ui.items()[1].persona, persona);
  assert.match(ui.elements.csvNotice.textContent, /1 Personas erfolgreich importiert/);
  assert.equal(ui.elements.csvInput.value, '');
  assert.doesNotMatch(ui.elements.quoteBody.innerHTML, /<img\b/);
});

test('CSP remains a documented follow-up after CDN removal and script/style extraction', () => {
  assert.doesNotMatch(html, /<meta\b[^>]*http-equiv\s*=\s*["']Content-Security-Policy/i);
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  assert.match(readme, /CSP/);
  assert.match(readme, /#9/);
  assert.match(readme, /script-src[^\n]*ohne[^\n]*'unsafe-inline'/);
  assert.match(readme, /Inline-Script[^\n]*Inline-Style/);
});
