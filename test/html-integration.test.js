const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('index.html loads data and engine scripts before main inline script', () => {
  const dataScript = '<script src="data/licenses.js"></script>';
  const engineScript = '<script src="src/engine.js"></script>';
  const mainScriptStart = '<script>\n        // CONFIG';

  const dataIndex = html.indexOf(dataScript);
  const engineIndex = html.indexOf(engineScript);
  const mainScriptIndex = html.indexOf(mainScriptStart);

  assert.notEqual(dataIndex, -1, 'missing data/licenses.js script include');
  assert.notEqual(engineIndex, -1, 'missing src/engine.js script include');
  assert.notEqual(mainScriptIndex, -1, 'missing main inline script block');
  assert.ok(dataIndex < mainScriptIndex, 'data script must be loaded before inline script');
  assert.ok(engineIndex < mainScriptIndex, 'engine script must be loaded before inline script');
});

test('index.html does not use module imports or fetch for local app files', () => {
  assert.equal(html.includes('type="module"'), false);
  assert.equal(html.includes('fetch('), false);
});

test('index.html uses LICENSE_DATA and LicenseEngine instead of inline logic constants', () => {
  assert.equal(html.includes('const HIERARCHY = {'), false);
  assert.equal(html.includes('const FEATURES_MAP = {'), false);
  assert.equal(html.includes('const PERSONA_PRESETS = {'), false);
  assert.equal(html.includes('const PRICES = {'), false);
  assert.ok(html.includes('LICENSE_DATA'), 'LICENSE_DATA reference missing');
  assert.ok(html.includes('LicenseEngine.recommend('), 'recalc must use LicenseEngine.recommend');
  assert.ok(html.includes('LicenseEngine.compare('), 'render/showComparison must use LicenseEngine.compare');
});
