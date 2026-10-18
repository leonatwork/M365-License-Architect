(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LicenseCSV = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const HEADER = 'Persona,Count,Base,Addons,Price,Total,CurrentLic,TeamsVariant,PriceValidFrom,PriceNote';

  function priceInfo(item, data) {
    const entries = [item.base, ...(item.addons || [])].filter(key => key !== 'None').map(key => (data.PRICES || {})[key]);
    const dated = entries.find(entry => entry && entry.valid_from);
    const priceValidFrom = Object.hasOwn(item, 'priceValidFrom') ? item.priceValidFrom : (dated ? dated.valid_from : '');
    const copy = data.PRICE_TEXT || {};
    const unconfirmed = entries.some(entry => !entry || entry.todo_source || !entry.valid_from);
    const priceNote = Object.hasOwn(item, 'priceNote') ? item.priceNote : [copy.notice, unconfirmed ? copy.unconfirmed : ''].filter(Boolean).join('; ');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(priceValidFrom) ? priceValidFrom.split('-').reverse().join('.') : priceValidFrom;
    return { priceValidFrom, priceNote, text: `${priceNote}${date ? ', Stand ' + date : ', ' + copy.undated}` };
  }

  function escapeCSV(value) {
    let text = String(value ?? '');
    // Ein zusätzliches Apostroph schützt Formeln; auch originale Präfixe bleiben reversibel.
    if (/^'*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function buildCsv(items, data) {
    return HEADER + '\n' + items.map(item => {
      const info = priceInfo(item, data || {});
      return [escapeCSV(item.persona), item.count, escapeCSV(item.base), escapeCSV(item.addons.join('|')),
        item.price, (item.price * item.count).toFixed(2), escapeCSV(item.currentLic),
        escapeCSV(item.teamsVariant === 'no_teams' ? 'no_teams' : 'included'), escapeCSV(info.priceValidFrom), escapeCSV(info.priceNote)].join(',');
    }).join('\n');
  }

  function parseCsv(text, data) {
    const rows = [];
    let row = [], field = '', quoted = false;
    // Nur CSV-Trennzeichen und Quote-Escaping; kein zusätzlicher Import-Dialekt.
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
        row.push(field); field = '';
        if (char !== ',') {
          rows.push(row); row = [];
          if (char === '\r' && text[i + 1] === '\n') i++;
        }
      } else field += char;
    }
    row.push(field);
    rows.push(row);
    const header = (rows.shift() || []).map(value => value.trim().replace(/^\uFEFF/, ''));
    const variantIndex = header.indexOf('TeamsVariant');
    const dateIndex = header.indexOf('PriceValidFrom');
    const noteIndex = header.indexOf('PriceNote');
    const legacyTeams = variantIndex === -1;
    const clean = value => {
      let result = value || '';
      if (legacyTeams) result = result.trim();
      if (/^'+[=+\-@]/.test(result)) result = result.slice(1);
      return result;
    };
    const items = rows.filter(cols => cols.length >= 5 && cols.some(value => value.trim())).map(cols => {
      const item = {
        persona: clean(cols[0]), count: parseInt(cols[1], 10) || 1, base: clean(cols[2]),
        addons: clean(cols[3]) ? clean(cols[3]).split('|') : [], price: parseFloat(cols[4]) || 0,
        currentLic: cols[6] !== undefined ? clean(cols[6]) : 'None',
        teamsVariant: cols[variantIndex] === 'no_teams' ? 'no_teams' : 'included'
      };
      // Ein altes Angebot belegt keinen aktuellen Preisstand.
      item.priceValidFrom = dateIndex !== -1 ? clean(cols[dateIndex]) : '';
      if (noteIndex !== -1) item.priceNote = clean(cols[noteIndex]);
      const source = data || {};
      item.features = [...((source.FEATURES_MAP || {})[item.base] || [])];
      if (item.teamsVariant === 'no_teams') {
        item.features = item.features.filter(feature => feature !== 'Teams Collaboration');
        item.features.push('No Teams');
      }
      if (item.addons.some(addon => addon.includes('Teams'))) {
        item.features = item.features.filter(feature => feature !== 'No Teams');
        if (!item.features.includes('Teams Collaboration')) item.features.push('Teams Collaboration');
      }
      return item;
    });
    return { items, legacyTeams };
  }

  return { buildCsv, parseCsv, priceInfo };
});
