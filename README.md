# License Architect

**Microsoft 365 licensing calculator for consultants and IT architects.**

License Architect turns persona requirements into a cost-aware SKU recommendation in real time — with Frontline guardrails, E5 break-even logic, Intune Suite optimization, EEA Teams pricing, and an As-Is / To-Be feature delta. The whole workshop flow stays on one page: profile → requirements → live recommendation → quote → CSV.

![License Architect desktop overview](docs/screenshots/overview.png)

---

## Design

The UI is an **exposure-record workbench**: cream paper surface, iron-black rules, monospace type (Nanum Gothic Coding), hatch marks for selected requirements, and a single pink accent reserved for prices and primary actions. Numbers stay the visual focus — no glassmorphism, no dashboard chrome.

| Desktop workshop | Feature compare |
| --- | --- |
| ![Workshop quote](docs/screenshots/workshop-quote.png) | ![License comparison modal](docs/screenshots/compare.png) |

Mobile and tablet use a stacked layout with the recommendation and quote kept in reach:

![Mobile layout](docs/screenshots/mobile.png)

---

## Key features

### Intelligent licensing engine
- **Frontline guardrails** — upgrades the base when a Frontline persona needs enterprise features (Desktop Apps, Windows OS, Teams Phone, …).
- **E5 break-even** — if Base + add-ons costs more than M365 E5, the tool recommends E5.
- **Intune Suite optimization** — compares individual Intune add-ons against the full Suite bundle.

### Pricing (EEA / Juli 2026)
- Base licenses support **with Teams** and **No Teams** variants; the Teams EEA add-on is applied only when needed.
- Covers Copilot, Intune Suite, Teams Phone, Defender for Business Servers, and more.
- Annual vs monthly (+20%) term switch.

### Comparison & quote
- Live **As-Is vs To-Be** feature delta next to the recommendation.
- Modal compare from any quote row (hierarchy-aware gained / lost features).
- Quote list with edit, grand total, CSV import / export.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | Vanilla HTML / CSS / JS in `index.html` |
| Engine | `src/engine.js` (`recommend`, `compare`) — no DOM |
| Data | `data/licenses.js` — prices, features, hierarchy, presets |
| Fonts | Local `fonts/NanumGothicCoding-*.ttf` |
| Icons / tips | Font Awesome, Tippy.js (CDN) |
| Tests | `node:test` under `test/` |

No backend. No build step for normal use. Open `index.html` in a modern browser (network needed for CDN assets).

---

## Project layout

```
index.html          UI, form handling, rendering, CSV file picker/download
src/engine.js       Pure recommendation / compare logic
src/csv.js          CSV export/import with Teams variant, price date and roundtrip guard
data/licenses.js    License catalog and persona presets
fonts/              Nanum Gothic Coding
test/               Regression + scenario tests
docs/handover/      Issue handovers and review notes
docs/screenshots/   README screenshots
```

---

## Usage

1. **Profile** — name, quantity, workstyle (Office / Frontline / Standalone), optional current license.
2. **Requirements** — toggle productivity, endpoint, security, compliance, and add-ons (or pick a preset).
3. **Recommendation** — read the live SKU, € price plate, and decision reason; check Compare for the feature delta.
4. **Add to Quote** — collect personas in the quote table.
5. **Export** — CSV for Excel / further processing. Import to restore a quote.

### Eingabe- und CSV-Importgrenzen

- `MAX_USERS = 100000` in `src/engine.js`: Formular und Engine verwenden dieselbe
  Anzahl-Regel. Bruchzahlen werden abgeschnitten und auf **1 bis 100.000** begrenzt;
  nicht numerische Eingaben/`NaN` ergeben 1, positive Unendlichkeit ergibt 100.000.
- CSV-Dateien: höchstens **1 MB (1.000.000 Bytes, UTF-8)** und **1.000 Datenzeilen**.
  Kopfzeile und Leerzeilen zählen nicht als Datenzeilen; Zeilenumbrüche innerhalb
  zitierter Felder bleiben Teil eines Datensatzes. Fehlermeldungen nennen die
  tatsächliche Zeilennummer im Quelldokument.
- CSV-Anzahlen werden strikt als ganze Dezimalzahlen von 1 bis `MAX_USERS` geprüft,
  nicht geklemmt. Preise müssen endlich und mindestens 0 sein (Dezimalpunkt).
  Basis- und Bestandslizenzen müssen eigene Schlüssel von `PRICES` und
  `FEATURES_MAP` sein; Add-ons eigene Schlüssel von `PRICES`. `None` bleibt erlaubt,
  insbesondere für Standalone-Angebote und eine fehlende Bestandslizenz.
- `LicenseCSV.importCSV` liefert `{ items, legacyTeams, errors }`: ungültige
  Datensätze werden übersprungen und in `errors` mit `{ line, message }` gemeldet.
  Strukturfehler und überschrittene Limits lösen eine Ausnahme aus. Im Browser
  wird bei **jedem Fehler die gesamte Datei abgelehnt**; die Angebotsliste bleibt
  unverändert. Fehlerfreie Dateien werden wie bisher an die Liste angehängt.
- Das CSV-Format bleibt erhalten. Formelanfänge (`=`, `+`, `-`, `@`, Tab, CR) und
  wörtliche Apostrophe werden im Export reversibel geschützt. `src/csv.js` nutzt
  die gemeinsame Nutzergrenze aus dem zuvor geladenen `src/engine.js`.

---

## Tests

```bash
npm test
```

Runs without extra packages and without network access. Also available as `npm run check`.

---

## UI-Härtung und CSP-Folgeschritt

`index.html` verwendet registrierte Event-Listener und Event-Delegation statt Inline-Handlern. Dynamische Werte in HTML-Templates werden mit `escapeHTML` escaped; reine Textausgaben verwenden Text-Properties. Regressionstests prüfen Handler-Freiheit, Template-Interpolationen und die Kernabläufe einschließlich CSV-Rundlauf.

Eine Content Security Policy (CSP) wird derzeit noch nicht als Meta-Tag gesetzt. Der Folgeschritt ist:

1. Nach Erledigung von [#9](https://github.com/leonatwork/M365-License-Architect/issues/9) die externen CDN-Assets lokal bereitstellen.
2. Inline-Script und Inline-Style aus `index.html` in lokale Dateien auslagern; verbliebene `style`-Attribute in CSS-Klassen überführen.
3. Anschließend eine restriktive CSP mit `default-src 'self'` und `script-src 'self'` ohne `'unsafe-inline'` für Scripts setzen. Styles ebenfalls auf lokale Quellen beschränken; benötigte Ausnahmen (z. B. Blob-Downloads und Tooltip-Styling) gezielt prüfen.
4. Import/Export, Theme, Clear, Laufzeit-Umschaltung, Presets, Angebot und Vergleiche unter der gesetzten CSP im Browser testen.

---

## Betrieb und Release

Die Anwendung wird statisch ohne Backend, Build oder Bundler ausgeliefert.
Für ein Release die zusammengehörigen Dateien aus einem geprüften Commit bereitstellen:
`index.html`, `src/`, `data/`, `fonts/` und `.impeccable/build/scaffold/layout.css`
sowie die Lizenztexte und [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
Den CSS-Pfad einschließlich des versteckten Verzeichnisses bei der Auslieferung erhalten.
`layout.css` bleibt getrackt, weil `index.html` es direkt als Laufzeit-Stylesheet lädt;
die übrigen `.impeccable/`-Mocks und Review-Artefakte sind lokal und per `.gitignore` ausgeschlossen.

Font Awesome 6.4.0 (cdnjs), Popper 2 und tippy.js 6 (unpkg) sind bestehende
CDN-Abhängigkeiten und benötigen Netzwerkzugriff. Die Major-Aliase von Popper und Tippy
fixieren keine Patch-Version. Vor einem Release `npm test` und `npm run check` ausführen
und beim lokalen Auslieferungstest prüfen, dass das Stylesheet ohne 404 geladen wird.
Sicherheitsmeldungen erfolgen privat gemäß [SECURITY.md](SECURITY.md).

---

## Credits

Feature mapping draws heavily from [Aaron Dinnage / m365maps.com](https://m365maps.com/).

---

## License

MIT — see [LICENSE](LICENSE).

Copyright (c) 2025–2026 Leon Machnik
