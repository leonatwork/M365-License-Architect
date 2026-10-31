(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.LicenseCSV = factory(root.LicenseEngine);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  const MAX_IMPORT_BYTES = 1000000; // 1 MB (UTF-8), einschließlich Kopfzeile.
  const MAX_IMPORT_ROWS = 1000; // Datensätze ohne Kopfzeile und Leerzeilen.
  function priceInfo(item, data) {
    // Anwendung und Node nutzen die Engine. Der bisherige eigenständige Browser-
    // Export bleibt ohne Engine nutzbar; Paritätstests sichern diesen Fallback ab.
    const statuses = engine ? engine.priceStatus(item, data)
      : [item.base, ...(item.addons || [])].filter(key => key && key !== 'None').map(key => ({
        key,
        validFrom: data.PRICES[key]?.valid_from || null,
        sourced: Boolean(data.PRICES[key]?.valid_from) && data.PRICES[key]?.todo_source !== true,
      }));
    const dates = statuses.map(status => status.validFrom).filter(Boolean).sort();
    const missing = statuses.filter(status => !status.sourced).map(status => status.key);
    return {
      priceDate: dates.at(-1) || '',
      priceNote: data.PRICE_NOTE + (missing.length ? '; Preisstand nicht belegt: ' + missing.join(', ') : ''),
      unsourced: missing,
    };
  }

  function escapeCSV(value) {
    let text = String(value ?? '');
    // Double literal apostrophes so the spreadsheet protection prefix is reversible.
    if (/^['=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCSV(items, data) {
    const header = 'Persona,Count,Base,Addons,Price,Total,CurrentLic,TeamsVariant,PriceDate,PriceNote\n';
    return header + items.map(item => {
      const catalogInfo = priceInfo(item, data);
      const info = { ...catalogInfo, ...item };
      // Retain offer notes, but do not let older metadata hide unconfirmed prices.
      const warning = catalogInfo.unsourced.length ? 'Preisstand nicht belegt: ' + catalogInfo.unsourced.join(', ') : '';
      if (warning && !String(info.priceNote ?? '').includes(warning)) {
        info.priceNote = (info.priceNote ? info.priceNote + '; ' : '') + warning;
      }
      return [escapeCSV(item.persona), item.count, escapeCSV(item.base), escapeCSV(item.addons.join('|')),
        item.price, (item.price * item.count).toFixed(2), escapeCSV(item.currentLic),
        escapeCSV(item.teamsVariant || 'included'), escapeCSV(info.priceDate), escapeCSV(info.priceNote)].join(',');
    }).join('\n');
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false, wasQuoted = false, closedQuote = false;
    let line = 1, rowLine = 1;
    function malformed(message) {
      throw new Error(`CSV-Fehler in Zeile ${line}: ${message}`);
    }
    function finishField() {
      let value = wasQuoted ? field : field.trim();
      if (/^'['=+\-@\t\r]/.test(value)) value = value.slice(1);
      row.push(value);
      field = '';
      wasQuoted = false;
      closedQuote = false;
    }
    function finishRow() {
      finishField();
      if (row.length !== 1 || row[0] !== '') {
        rows.push({ cols: row, line: rowLine });
        if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error('CSV darf höchstens 1.000 Datenzeilen enthalten.');
      }
      row = [];
    }
    text = text.replace(/^\uFEFF/, '');
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (char === '"') {
        if (quoted && text[index + 1] === '"') { field += '"'; index++; }
        else if (quoted) { quoted = false; closedQuote = true; }
        else {
          if (field || closedQuote) malformed('Unerwartetes Anführungszeichen.');
          quoted = true;
          wasQuoted = true;
        }
      } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
        if (char === ',') finishField();
        else {
          finishRow();
          if (char === '\r' && text[index + 1] === '\n') index++;
          line++;
          rowLine = line;
        }
      } else {
        if (closedQuote) malformed('Unerwartetes Zeichen nach dem schließenden Anführungszeichen.');
        field += char;
        if (char === '\n' || (char === '\r' && text[index + 1] !== '\n')) line++;
      }
    }
    if (quoted) malformed('Anführungszeichen wurde nicht geschlossen.');
    if (field || row.length || wasQuoted) finishRow();
    return rows;
  }

  function importCSV(text, data) {
    if (typeof text !== 'string') throw new Error('CSV-Datei konnte nicht als Text gelesen werden.');
    if (text.length > MAX_IMPORT_BYTES || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) {
      throw new Error('CSV-Datei darf höchstens 1 MB groß sein.');
    }
    const rows = parseCSV(text);
    const header = rows.shift()?.cols || [];
    if (['Persona', 'Count', 'Base', 'Addons', 'Price'].some((name, index) => header[index] !== name)
      || new Set(header).size !== header.length) {
      throw new Error('CSV-Kopfzeile ist ungültig. Bitte das CSV-Exportformat verwenden.');
    }
    if (!rows.length) throw new Error('CSV-Datei enthält keine Datenzeilen.');
    const teamsIndex = header.indexOf('TeamsVariant');
    const dateIndex = header.indexOf('PriceDate');
    const noteIndex = header.indexOf('PriceNote');
    let legacyTeams = false;
    const items = [];
    const errors = [];
    const knownPrice = key => Object.hasOwn(data.PRICES, key);
    const knownLicense = key => knownPrice(key) && Object.hasOwn(data.FEATURES_MAP, key);
    for (const { cols, line } of rows) {
      const rowErrors = [];
      if (cols.length !== header.length) {
        errors.push({ line, message: `Spaltenanzahl stimmt nicht mit der Kopfzeile überein (erwartet: ${header.length}).` });
        continue;
      }
      const countText = cols[1].trim();
      const priceText = cols[4].trim();
      const count = Number(countText);
      const price = Number(priceText);
      const addons = cols[3] ? cols[3].split('|') : [];
      const currentLic = cols[6] ?? 'None';
      if (!knownLicense(cols[2])) rowErrors.push(`Unbekannte Basislizenz: ${cols[2]}`);
      for (const addon of addons) {
        if (!knownPrice(addon)) rowErrors.push(`Unbekanntes Add-on: ${addon}`);
      }
      if (currentLic !== 'None' && !knownLicense(currentLic)) rowErrors.push(`Unbekannte Bestandslizenz: ${currentLic}`);
      if (!/^\d+$/.test(countText) || !Number.isInteger(count) || count < 1 || count > engine.MAX_USERS) {
        rowErrors.push('Anzahl muss eine ganze Zahl zwischen 1 und 100.000 sein.');
      }
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+\-]?\d+)?$/.test(priceText) || !Number.isFinite(price) || price < 0) {
        rowErrors.push('Preis muss eine endliche Zahl größer oder gleich 0 sein (Dezimalpunkt verwenden).');
      }
      if (rowErrors.length) {
        errors.push({ line, message: rowErrors.join(' ') });
        continue;
      }
      const missingTeams = teamsIndex < 0 || !cols[teamsIndex];
      legacyTeams ||= missingTeams;
      const item = {
        persona: cols[0], count, base: cols[2], addons, price, currentLic,
        teamsVariant: cols[teamsIndex] === 'no_teams' ? 'no_teams' : 'included',
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
    return { items, legacyTeams, errors };
  }

  return { exportCSV, importCSV, priceInfo, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS };
});
