(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.LicenseCSV = factory(root.LicenseEngine);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  const MAX_IMPORT_BYTES = 1000000; // 1 MB (UTF-8), einschließlich Kopfzeile.
  const MAX_IMPORT_ROWS = 1000; // Datensätze ohne Kopfzeile und Leerzeilen.
  function priceInfo(item, data) {
    const unitKeys = (item.unitItems || []).map(unitItem => unitItem.key);
    const keys = [item.base, ...(item.addons || []), ...unitKeys].filter(key => key && key !== 'None');
    const dates = keys.map(key => data.PRICES[key]?.valid_from).filter(Boolean).sort();
    const missing = keys.filter(key => !data.PRICES[key]?.valid_from || data.PRICES[key]?.todo_source === true);
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
    // Unit (user|room|server) steht hinter den positionsgebundenen Altspalten; Import liest sie per Name.
    const header = 'Persona,Count,Base,Addons,Price,Total,CurrentLic,Unit,TeamsVariant,PriceDate,PriceNote\n';
    return header + items.map(item => {
      const catalogInfo = priceInfo(item, data);
      const info = { ...catalogInfo, ...item };
      // Retain offer notes, but do not let older metadata hide unconfirmed prices.
      const warning = catalogInfo.unsourced.length ? 'Preisstand nicht belegt: ' + catalogInfo.unsourced.join(', ') : '';
      if (warning && !String(info.priceNote ?? '').includes(warning)) {
        info.priceNote = (info.priceNote ? info.priceNote + '; ' : '') + warning;
      }
      return [escapeCSV(item.persona), item.count, escapeCSV(item.base), escapeCSV(item.addons.join('|')),
        item.price, (item.price * item.count).toFixed(2), escapeCSV(item.currentLic), escapeCSV(item.unit || 'user'),
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
    const unitIndex = header.indexOf('Unit');
    const units = data.UNITS || { user: { per: 'pro Benutzer' } };
    let legacyTeams = false;
    // Je Art (Produkt) genau eine tenantweite Zeile; Alt-CSV-Add-ons werden in Auftrittsreihenfolge überführt.
    const unitKeys = new Set();
    const migrated = new Map();
    const items = [];
    const errors = [];
    const knownPrice = key => Object.hasOwn(data.PRICES, key);
    const knownLicense = key => knownPrice(key) && Object.hasOwn(data.FEATURES_MAP, key);
    const unitOf = key => (knownPrice(key) && data.PRICES[key].unit) || 'user';
    const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
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
      let addons = cols[3] ? cols[3].split('|') : [];
      const unit = (unitIndex < 0 ? '' : cols[unitIndex]) || 'user';
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
      if (!Object.hasOwn(units, unit)) {
        rowErrors.push(`Unbekannte Einheit (Unit): ${unit}. Erlaubt: ${Object.keys(units).join(', ')}.`);
      } else if (unit !== 'user') {
        if (cols[2] !== 'None') rowErrors.push(`Raum-/Serverposition: Basislizenz muss None sein, nicht ${cols[2]}.`);
        if (addons.length !== 1) rowErrors.push('Raum-/Serverposition muss genau ein Produkt in Addons enthalten.');
        else if (knownPrice(addons[0]) && unitOf(addons[0]) !== unit) {
          rowErrors.push(`Unit ${unit} passt nicht zu ${addons[0]} (Einheit ${unitOf(addons[0])}).`);
        } else if (unitKeys.has(addons[0])) {
          rowErrors.push(`Je Art ist nur eine Zeile erlaubt: ${addons[0]}.`);
        }
        if (addons.length === 1) unitKeys.add(addons[0]);
      } else if (unitIndex >= 0) {
        for (const addon of addons.filter(key => unitOf(key) !== 'user')) {
          rowErrors.push(`${addon} wird ${units[unitOf(addon)]?.per || unitOf(addon)} gerechnet und ist nur als eigene Zeile mit Unit ${unitOf(addon)} zulässig.`);
        }
      }
      if (rowErrors.length) {
        errors.push({ line, message: rowErrors.join(' ') });
        continue;
      }
      // Alt-CSV ohne Unit-Spalte: Raum-/Serverlizenz aus der Benutzerzeile lösen und den Benutzerpreis korrigieren.
      // Der Abzug nutzt den Katalog-Listenpreis (jährliche Abrechnung, vgl. PRICE_NOTE).
      const moved = unitIndex < 0 ? addons.filter(key => unitOf(key) !== 'user') : [];
      let rowPrice = price;
      let clamped = false;
      if (moved.length) {
        addons = addons.filter(key => !moved.includes(key));
        const corrected = cents(price - moved.reduce((sum, key) => sum + data.PRICES[key].price, 0));
        clamped = corrected < 0;
        rowPrice = Math.max(0, corrected);
        for (const key of moved) if (!migrated.has(key)) migrated.set(key, unitOf(key));
      }
      const missingTeams = teamsIndex < 0 || !cols[teamsIndex];
      legacyTeams ||= missingTeams;
      const item = {
        persona: cols[0], count, base: cols[2], addons, price: rowPrice, currentLic, unit,
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
      if (moved.length) {
        // Ausgegliederte Produkte aus dem übernommenen Belegvermerk der Benutzerzeile entfernen.
        item.priceNote = item.priceNote.replace(/Preisstand nicht belegt: ([^;]*)(; )?/, (match, list, separator) => {
          const rest = list.split(', ').filter(key => !moved.includes(key));
          return rest.length ? `Preisstand nicht belegt: ${rest.join(', ')}${separator || ''}` : '';
        }).replace(/;\s*$/, '');
        item.priceNote += (item.priceNote ? '; ' : '') + 'Raum-/Serverlizenz als eigene Position ausgegliedert: ' + moved.join(', ')
          + (clamped ? ' (Benutzerpreis auf 0 begrenzt)' : '');
      }
      // Tenantweite Positionen haben keine Benutzerfunktionen (z. B. kein Teams aus „Teams Rooms Pro“).
      if (unit !== 'user') item.features = [];
      // Imported rows retain offer values; requirement inputs cannot be reconstructed.
      items.push(item);
    }
    for (const [key, unit] of migrated) {
      const item = { persona: `${key} (${units[unit]?.per || unit})`, count: 1, base: 'None', addons: [key],
        price: data.PRICES[key].price, currentLic: 'None', unit, teamsVariant: 'included', features: [], migrated: true };
      const info = priceInfo(item, data);
      item.priceDate = info.priceDate;
      item.priceNote = info.priceNote + '; Aus Alt-CSV übernommen: Menge 1 angenommen, bitte Anzahl prüfen';
      items.push(item);
    }
    return { items, legacyTeams, errors, migratedUnits: [...migrated.keys()] };
  }

  return { exportCSV, importCSV, priceInfo, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS };
});
