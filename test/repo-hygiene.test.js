const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scaffold = '.impeccable/build/scaffold/layout.css';

test('security reports use the private GitHub channel and all files have an owner', () => {
  const security = read('SECURITY.md');
  assert.ok(security.includes('https://github.com/leonatwork/M365-License-Architect/security/advisories/new'));
  assert.match(security, /GitHub Private Vulnerability Reporting/);
  assert.match(security, /keine Exploit-Details.*Issues/i);
  const rules = read('.github/CODEOWNERS').split('\n').filter(line => line.trim() && !line.startsWith('#'));
  assert.deepEqual(rules, ['* @leonatwork']);
});

test('notices cover every local font and CDN asset loaded by the application', () => {
  const notices = read('THIRD-PARTY-NOTICES.md');
  const html = read('index.html');
  const fonts = [...html.matchAll(/url\(['"](fonts\/[^'"]+)['"]\)/g)].map(match => match[1]);
  assert.equal(fonts.length, 4);
  for (const font of fonts) {
    assert.ok(notices.includes(font), `missing font notice: ${font}`);
    assert.ok(fs.statSync(path.join(root, font)).size > 0, font);
  }
  const cdnAssets = [...html.matchAll(/(?:src|href)="(https:\/\/[^"\s]+)"/g)].map(match => match[1]);
  assert.equal(cdnAssets.length, 3);
  for (const asset of cdnAssets) assert.ok(notices.includes(asset), `missing CDN notice: ${asset}`);
  for (const [name, license, source] of [
    ['D2Coding', 'SIL Open Font License 1.1', 'https://github.com/naver/d2'],
    ['Nanum Gothic Coding', 'SIL Open Font License 1.1', 'https://github.com/google/fonts/'],
    ['Font Awesome Free 6.4.0', 'MIT', 'https://github.com/FortAwesome/Font-Awesome/'],
    ['Popper 2', 'MIT', 'https://github.com/floating-ui/popper-core/'],
    ['tippy.js 6', 'MIT', 'https://github.com/atomiks/tippyjs/'],
  ]) {
    const section = notices.split(`## ${name}\n`)[1]?.split('\n## ')[0];
    assert.ok(section, `missing component: ${name}`);
    assert.ok(section.includes(license), `missing license: ${name}`);
    assert.ok(section.includes(source), `missing original source: ${name}`);
  }
  assert.match(notices, /CC BY 4\.0/);
  for (const license of ['fonts/OFL-D2Coding.txt', 'fonts/OFL-NanumGothicCoding.txt']) {
    assert.ok(notices.includes(license));
    const text = read(license);
    assert.match(text, /SIL OPEN FONT LICENSE/);
    assert.match(text, /Version 1\.1 - 26 February 2007/);
    assert.match(text, /PERMISSION & CONDITIONS/);
    assert.match(text, /TERMINATION/);
    assert.match(text, /DISCLAIMER/);
  }
  assert.match(read('fonts/OFL-NanumGothicCoding.txt'), /Copyright \(c\) 2010, NHN Corporation/);
});

test('historical handovers live under docs and the source-consistency test uses the relocated file', () => {
  for (const issue of [8, 15, 19, 23, 30, 34]) {
    const name = `ISSUE-${issue}-HANDOVER.md`;
    assert.equal(fs.existsSync(path.join(root, name)), false, `handover remains in root: ${issue}`);
    assert.ok(read(`docs/handover/${name}`).length > 0, `missing handover: ${issue}`);
  }
  assert.ok(read('test/data.test.js').includes('docs/handover/'));
});

test('scaffold remains available at the stylesheet URL used by index.html', () => {
  assert.ok(read('index.html').includes(`href="${scaffold}"`));
  assert.ok(read(scaffold).length > 0);
});

test('git ignores review artifacts including new nested files but keeps the runtime scaffold', {
  skip: !fs.existsSync(path.join(root, '.git')) && 'Git metadata unavailable in source archive',
}, () => {
  for (const file of [
    '.impeccable/config.json',
    '.impeccable/review/new-screenshot.png',
    '.impeccable/mocks/new/nested/mock.webp',
    '.impeccable/build/scaffold/hero-reference.html',
    '.impeccable/build/scaffold/new.css',
    scaffold,
  ]) {
    const result = spawnSync('git', ['check-ignore', '--no-index', '-q', file], { cwd: root });
    assert.ifError(result.error);
    assert.equal(result.status, file === scaffold ? 1 : 0, `incorrect ignore rule: ${file}`);
  }
});

test('release instructions include static assets, CDN requirements, quality gates and private reporting', () => {
  const section = read('README.md').split('## Betrieb und Release\n')[1]?.split('\n## ')[0];
  assert.ok(section, 'missing Betrieb und Release section');
  for (const required of ['statisch', 'CDN', 'npm test', 'npm run check', 'SECURITY.md', scaffold, 'THIRD-PARTY-NOTICES.md']) {
    assert.ok(section.includes(required), `missing release guidance: ${required}`);
  }
});
