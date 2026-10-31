const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      const callbacks = listeners.get(type) || [];
      callbacks.push(callback);
      listeners.set(type, callbacks);
    },
    dispatch(type, target = this) {
      for (const callback of listeners.get(type) || []) callback({ target });
    },
    click() { this.dispatch('click'); },
  };
}

function classList() {
  const classes = new Set();
  return { add: name => classes.add(name), remove: name => classes.delete(name),
    contains: name => classes.has(name) };
}

function app() {
  const elements = {};
  for (const match of html.matchAll(/<(input|select|div|span|button|tbody|td|ul)[^>]*id="([^"]+)"[^>]*>/g)) {
    const el = elements[match[2]] = { ...eventTarget(), tagName: match[1].toUpperCase(),
      type: /type="checkbox"/.test(match[0]) ? 'checkbox' : 'text',
      value: match[0].match(/value="([^"]*)"/)?.[1] || '', checked: false,
      hidden: /\shidden(?:\s|>)/.test(match[0]),
      innerText: '', innerHTML: '', textContent: '', style: {}, classList: classList() };
    if (el.tagName === 'SELECT') {
      const options = html.slice(match.index).match(/^[\s\S]*?<\/select>/)[0];
      const firstValue = options.match(/<option[^>]*value="([^"]*)"/)[1];
      el.value = firstValue;
      Object.defineProperty(el, 'selectedIndex', { set(index) {
        assert.equal(index, 0, 'DOM stub only supports resetting to the first option');
        this.value = firstValue;
      } });
    }
  }
  elements.compModal.classList.add('hidden');
  const downloads = [];
  const context = { LICENSE_DATA: require('../../data/licenses.js'), LicenseEngine: require('../../src/engine.js'),
    LicenseCSV: require('../../src/csv.js'),
    document: { getElementById: id => elements[id], documentElement: { classList: classList() },
      createElement: () => ({ click() { downloads.push({ href: this.href, download: this.download }); } }) },
    window: { ...eventTarget(), scrollTo() {}, matchMedia: () => ({ ...eventTarget(), matches: false }) },
    localStorage: { getItem(key) { return this[key] ?? null; }, setItem(key, value) { this[key] = value; } },
    tippy() {}, alert() {}, Blob, URL: { createObjectURL(blob) { context.exportedBlob = blob; return 'blob:test'; } } };
  vm.createContext(context);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  const run = code => vm.runInContext(code, context);
  return { elements, context, run, downloads,
    items: () => JSON.parse(run('JSON.stringify(quoteItems)')),
    load: () => context.window.dispatch('load'),
    rowAction(action, index, nested = true) {
      const buttons = [...elements.quoteBody.innerHTML.matchAll(/<button\b[^>]*>/g)]
        .filter(match => match[0].includes(`data-action="${action}"`));
      assert.ok(buttons[index], `missing rendered ${action} button at row ${index}`);
      const dataset = Object.fromEntries([...buttons[index][0].matchAll(/data-([\w-]+)="([^"]*)"/g)]
        .map(match => [match[1], match[2]]));
      const button = { dataset, closest: () => button };
      elements.quoteBody.dispatch('click', nested ? { closest: () => button } : button);
    },
  };
}

module.exports = { app, html };
