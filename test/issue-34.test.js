const test = require('node:test');
const assert = require('node:assert/strict');
const { app: createApp } = require('./fixtures/ui-app.js');

function app() {
  const ui = createApp();
  const { elements, run } = ui;
  ui.load();
  run('resetForm()');
  for (const [index, persona] of ['Erste', 'Zweite', 'Dritte'].entries()) {
    elements.personaName.value = persona;
    elements.userCount.value = String(index + 2);
    elements.teamsVariant.value = 'no_teams';
    elements.desktopApps.checked = true;
    run('recalc(); addToQuote()');
  }
  return { ...ui, remove: index => ui.rowAction('remove', index) };
}

function assertAddMode({ elements: el, run }) {
  assert.equal(run('editingIndex'), -1);
  assert.equal(el.personaName.value, '');
  assert.equal(String(el.userCount.value), '10');
  assert.equal(el.workstyle.value, 'office');
  assert.equal(el.currentLicense.value, 'None');
  assert.equal(el.teamsVariant.value, 'included');
  assert.equal(el.desktopApps.checked, false);
  assert.equal(run('FORM_IDS.every(id => document.getElementById(id).type !== "checkbox" || !document.getElementById(id).checked)'), true);
  assert.equal(el.actionBtnText.innerText, 'ADD TO QUOTE');
  assert.equal(el.actionBtnTextMobile.innerText, 'ADD TO QUOTE');
  assert.equal(el.actionBtn.className, 'hold-btn');
  assert.equal(el.actionBtnMobile.className, 'btn-primary');
}

test('removing the edited persona exits edit mode, resets the form and next save appends', () => {
  const ui = app();
  const original = ui.items();
  ui.run('editPersona(1)');
  ui.elements.personaName.value = 'Ungespeichert';
  ui.remove(1);
  assertAddMode(ui);
  assert.deepEqual(ui.items(), [original[0], original[2]]);
  assert.doesNotMatch(ui.elements.quoteBody.innerHTML, /is-editing/);
  assert.equal(ui.elements.quoteCount.innerText, '2 Personas');
  ui.elements.personaName.value = 'Neue Persona';
  ui.run('recalc(); addToQuote()');
  assert.deepEqual(ui.items().slice(0, 2), [original[0], original[2]]);
  assert.equal(ui.items()[2].persona, 'Neue Persona');
});

for (const [position, removedIndex, expectedIndex] of [['before', 0, 0], ['after', 2, 1]]) {
  test(`removing a persona ${position} the edited row keeps editing the same persona`, () => {
    const ui = app();
    const original = ui.items();
    ui.run('editPersona(1)');
    ui.elements.personaName.value = 'Zweite aktualisiert';
    const pendingInputs = JSON.parse(ui.run('JSON.stringify(captureFormInputs())'));
    ui.remove(removedIndex);
    assert.equal(ui.run('editingIndex'), expectedIndex);
    assert.deepEqual(JSON.parse(ui.run('JSON.stringify(captureFormInputs())')), pendingInputs);
    assert.equal(ui.elements.actionBtnText.innerText, 'UPDATE PERSONA');
    assert.equal(ui.elements.actionBtnTextMobile.innerText, 'UPDATE PERSONA');
    assert.equal(ui.elements.actionBtn.className, 'hold-btn editing');
    assert.equal(ui.elements.actionBtnMobile.className, 'btn-primary editing');
    const rows = [...ui.elements.quoteBody.innerHTML.matchAll(/<tr class="([^"]*)">/g)];
    assert.equal(rows[expectedIndex][1], 'is-editing');
    assert.equal(rows.filter(row => row[1] === 'is-editing').length, 1);
    ui.run('recalc(); addToQuote()');
    const items = ui.items();
    assert.equal(items.length, 2);
    assert.equal(items[expectedIndex].persona, 'Zweite aktualisiert');
    assert.deepEqual(items[expectedIndex].inputs, pendingInputs);
    assert.deepEqual(items[1 - expectedIndex], original[removedIndex === 0 ? 2 : 0]);
    assertAddMode(ui);
  });
}

test('Remove buttons delegate to the named removePersona function without inline splice', () => {
  const ui = app();
  assert.equal(ui.run('typeof removePersona'), 'function');
  assert.match(ui.elements.quoteBody.innerHTML, /data-action="remove" data-index="0"/);
  let removedIndex;
  ui.context.removePersona = index => { removedIndex = index; };
  ui.remove(0);
  assert.equal(removedIndex, 0);
  assert.doesNotMatch(ui.elements.quoteBody.innerHTML, /\bon[a-z]+\s*=/i);
  assert.doesNotMatch(ui.elements.quoteBody.innerHTML, /splice\s*\(/);
});

for (const index of ['quoteItems.length', 'quoteItems.length + 3', '-2', '0.5', 'NaN', 'Infinity']) {
  test(`saving with invalid editingIndex ${index} appends without holes or array properties`, () => {
    const ui = app();
    const original = ui.items();
    ui.run('editPersona(1)');
    ui.elements.personaName.value = 'Neue Persona';
    ui.run(`editingIndex = ${index}; recalc(); addToQuote()`);
    const items = ui.items();
    assert.equal(items.length, original.length + 1);
    assert.deepEqual(items.slice(0, original.length), original);
    assert.equal(items[original.length].persona, 'Neue Persona');
    assert.deepEqual(JSON.parse(ui.run('JSON.stringify(Object.keys(quoteItems))')), ['0', '1', '2', '3']);
    assertAddMode(ui);
  });
}
