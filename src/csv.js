(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LicenseCSV = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function priceInfo(item, data) {
    const keys = [item.base, ...(item.addons || [])].filter(key => key && key !== 'None');
    const dates = keys.map(key => data.PRICES[key]?.valid_from).filter(Boolean).sort();
    const missing = keys.filter(key => !data.PRICES[key]?.valid_from);
    return {
      priceDate: dates.at(-1) || '',
      priceNote: data.PRICE_NOTE + (missing.length ? '; Preisstand nicht belegt: ' + missing.join(', ') : ''),
    };
  }

  function escapeCSV(value) {
    let text = String(value ?? '');
    // Double literal apostrophes so the spreadsheet protection prefix is reversible.
    if (/^['=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCSV(items, data) {
    const header = 'Persona,Count,Base,Addons,Price,Total,CurrentLic,TeamsVariant,PriceDate,PriceNote\n';
    return header + items.map(item => {
      const info = { ...priceInfo(item, data), ...item };
      return [escapeCSV(item.persona), item.count, escapeCSV(item.base), escapeCSV(item.addons.join('|')),
        item.price, (item.price * item.count).toFixed(2), escapeCSV(item.currentLic),
        escapeCSV(item.teamsVariant || 'included'), escapeCSV(info.priceDate), escapeCSV(info.priceNote)].join(',');
    }).join('\n');
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false, wasQuoted = false;
    function finishField() {
      let value = wasQuoted ? field : field.trim();
      if (/^'['=+\-@]/.test(value)) value = value.slice(1);
      row.push(value);
      field = '';
      wasQuoted = false;
    }
    text = text.replace(/^\uFEFF/, '');
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (char === '"') {
        if (quoted && text[index + 1] === '"') { field += '"'; index++; }
        else { quoted = !quoted; wasQuoted = true; }
      } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
        finishField();
        if (char !== ',') {
          rows.push(row);
          row = [];
          if (char === '\r' && text[index + 1] === '\n') index++;
        }
      } else field += char;
    }
    if (field || row.length || wasQuoted) { finishField(); rows.push(row); }
    return rows;
  }

  function importCSV(text, data) {
    const rows = parseCSV(text);
    const header = rows.shift() || [];
    const teamsIndex = header.indexOf('TeamsVariant');
    const dateIndex = header.indexOf('PriceDate');
    const noteIndex = header.indexOf('PriceNote');
    let legacyTeams = false;
    const items = [];
    for (const cols of rows) {
      if (cols.length < 5) continue;
      const missingTeams = teamsIndex < 0 || !cols[teamsIndex];
      legacyTeams ||= missingTeams;
      const item = {
        persona: cols[0], count: parseInt(cols[1], 10) || 1, base: cols[2],
        addons: cols[3] ? cols[3].split('|') : [], price: parseFloat(cols[4]) || 0,
        currentLic: cols[6] ?? 'None', teamsVariant: cols[teamsIndex] === 'no_teams' ? 'no_teams' : 'included',
      };
      item.features = [...(data.FEATURES_MAP[item.base] || [])];
      if (item.teamsVariant === 'no_teams') {
        item.features = item.features.filter(feature => feature !== 'Teams Collaboration');
        if (!item.features.includes('No Teams')) item.features.push('No Teams');
      }
      if (item.addons.some(addon => addon.includes('Teams'))) {
        item.features = item.features.filter(feature => feature !== 'No Teams');
        if (!item.features.includes('Teams Collaboration')) item.features.push('Teams Collaboration');
      }
      const info = priceInfo(item, data);
      item.priceDate = dateIndex < 0 ? info.priceDate : cols[dateIndex] ?? '';
      item.priceNote = noteIndex < 0 ? info.priceNote : cols[noteIndex] ?? '';
      // Imported rows retain offer values; requirement inputs cannot be reconstructed.
      items.push(item);
    }
    return { items, legacyTeams };
  }

  return { exportCSV, importCSV, priceInfo };
});
