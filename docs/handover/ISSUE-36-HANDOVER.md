# Issue #36 – UI-Härtung und CSP-Vorbereitung

## Grundlage und Prüfgrenzen

- Erster Arbeitsstand: `aaebc105414fb5d59aea37d446013f28b9685797` (PR #39). Danach auf `origin/main` `1bf48e2` nachgezogen. Enthalten sind #33 (CSV-Grenzen, `max="100000"`) und #37 (Handover unter `docs/handover/`, Abschnitt „Betrieb und Release“).
- Issue #36, die Triage-Antworten (CSP nur dokumentieren, Script/Style nicht auslagern, eigener PR) und die offenen PRs wurden gelesen. Offener PR zum Zeitpunkt der Nacharbeit: nur #41. #9 ist weiter offen und bleibt die Voraussetzung für die gesetzte CSP. Kein anderer offener PR ändert `index.html`.
- Im Repository sind keine `AGENTS.md`, `CLAUDE.md` oder CONTRIBUTING-Regeln vorhanden. Berücksichtigt wurden `README.md`, `PRODUCT.md`, `package.json`, vorhandene Tests und die Handover unter `docs/handover/`.

## Akzeptanzkriterien

| Kriterium | Umsetzung und Nachweis | Status |
| --- | --- | --- |
| AC-1: Keine Inline-Handler in `index.html`, einschließlich generierter Tabellenbuttons | Alle bisherigen `on*`-Attribute entfernt. `window.addEventListener('load', init, { once: true })` initialisiert die App; `bindUIEvents()` registriert die Eingaben und Aktionen. Edit/Compare/Remove nutzen Delegation am beständigen `quoteBody` und `data-action`/`data-index`. CSV-`FileReader` nutzt `addEventListener` für `load` und `error`. Der Quelltest prüft Tag-Attribute außerhalb von `<script>`, damit spätere Zuweisungen wie `onX =` keinen Fehlalarm auslösen. Gerenderte Tabellen werden zusätzlich auf `on*=` geprüft. | Erfüllt |
| AC-2: Dynamische Inhalte in allen `innerHTML`-Templates sicher einfügen | Feature-Tags, beide Live- und Modal-Listen sowie sämtliche Tabellen-Interpolationen nutzen `escapeHTML`, einschließlich Zahlenausgaben und Attributwerten. Add-on-Markup wird ausschließlich aus dem ebenfalls geprüften, escaped Tag-Template oder einer Konstante zusammengesetzt. Quelltest und Laufzeittests mit HTML-/Attribut-Payloads sichern das ab. | Erfüllt |
| AC-3: Keine CSP-Meta; CSP-Folgeschritt im README | README dokumentiert #9, Auslagerung von Inline-Script und Inline-Style, Überführung der Style-Attribute, `default-src 'self'` und `script-src 'self'` ohne `'unsafe-inline'` für Scripts sowie anschließende Browser-Prüfungen. Ein Test prüft die Dokumentation und das Fehlen einer CSP-Meta. | Erfüllt |
| AC-4: Funktionalität erhalten; `npm test` und `npm run check` grün | `npm test` und `npm run check`: **205/205**. Chrome-Smoke-Test gegen `index.html`: Anzahl, Bestandslizenz, Teams-Variante, Anforderungen, Marketing-Preset, Frontline/Standalone, Desktop- und Mobile-Add, Annual/Monthly, Theme, Clear, Bearbeiten, Entfernen, Vergleich über Close und Hintergrund, Export/Import mit eingeschleustem Markup, leerer Export und abgebrochene Dateiauswahl. Keine Seitenfehler. Die einzige Konsolenmeldung ist der fehlende `favicon.ico`. | Erfüllt |

### Auslegung und Abhängigkeiten

- Die strukturierte Fassung ersetzt die ursprüngliche bedingte Forderung nach einer CSP-Meta: Für dieses Issue ist ausdrücklich nur die Dokumentation verlangt. Eine gesetzte CSP ist der Folgeschritt nach #9 und der Script-/Style-Auslagerung.
- PR #39 ist Bestandteil des Stands. Der Remove-Pfad bleibt `removePersona`; die #34-Tests lösen ihn über die Delegation aus.
- Die CSV-Ablehnung aus #33 bleibt erhalten: Größen- und Inhaltsfehler verwerfen die ganze Datei, die Angebotsliste bleibt unverändert. `userCount` behält `max="100000"`.
- #9 ist nur Voraussetzung für den späteren CSP-Schritt. Bestehende gemischtsprachige UI-Labels bleiben erhalten. Empfehlungslogik, Lizenzdaten, Preise und Design wurden nicht geändert.

## Testgetriebener Nachweis

1. Zuerst `test/issue-36.test.js`, einen kleinen VM-/Event-DOM-Testhelfer und die Registrierung in `test/index.js` ergänzt; Produktionscode noch unverändert.
2. `node --test test/issue-36.test.js` vor dem Fix: **0/9 bestanden**, neun erwartete Fehler:
   - Inline-Event-Attribute vorhanden.
   - Erste unescapte HTML-Interpolation ist der Feature-Tag-Wert `f`.
   - HTML-Payload erzeugt ein echtes `<img>` im Feature-Tag-Markup.
   - Tabellenwert `count` erzeugt ein echtes `<svg>`; weitere Textfelder waren schon escaped.
   - Load-/Eingabe-Listener fehlen; initiale Preisberechnung bleibt aus.
   - Preset-Auswahl löst keine registrierte Aktion aus.
   - Delegierte Tabellenaktionen fehlen.
   - Import-/Export-Buttons haben keine Listener-Anbindung über IDs.
   - CSP-Folgeschritt fehlt im README.
3. Danach `index.html` und README angepasst. Bestehende VM-Stubs um die neue Listener-API ergänzt; die #34-Tests führen jetzt die Delegation aus. Eine neue Preset-Erwartung wurde anhand des unveränderten Marketing-Presets korrigiert: DLP, nicht Copilot.
4. `node --test test/issue-36.test.js test/issue-34.test.js test/issue-30.test.js test/teams-ui.test.js`: **40/40 bestanden**.
5. Nach dem Merge mit `origin/main`: `npm test` und `npm run check`: **205/205 bestanden**.
6. Chrome-Smoke-Test der Kernabläufe aus AC-4 bestanden, einschließlich Escaping im gerenderten Angebot und CSV-Rundlauf.

Der Quelltest verlangt direkte `escapeHTML(...)`-Aufrufe für alle Interpolationen der vorhandenen HTML-Templates und prüft, dass der Aufruf den gesamten Ausdruck umschließt. Er ist ein konservatives, abhängigkeitenfreies Gate für den bestehenden Template-Stil, kein allgemeiner JavaScript-/Datenfluss-Parser. Die ergänzenden Laufzeittests prüfen die tatsächlichen Renderer und den CSV-Import gegen eingeschleustes Markup und doppelte Anführungszeichen, einfache Anführungszeichen und Ampersands. Der Event-DOM-Testhelfer ist eine Node-VM mit Stubs, kein Browser.

## Browser-Smoke-Test

Mit Google Chrome gegen `http://127.0.0.1/index.html` geprüft:

1. Seite lädt mit sichtbarer Empfehlung und Live-Vergleich. Anzahl 25 kommt in `currentCalc` und in der Angebotszeile an. Bestandslizenz, Teams-Variante und Anforderungen ändern die Empfehlung.
2. Marketing-Preset setzt Desktop Apps und DLP. Frontline und Standalone wechseln die Empfehlung. Desktop-Add und der Mobile-Button (Viewport 390px) hängen Personas an.
3. Annual → Monthly skaliert den Positionspreis mit 1,2; Annual stellt ihn wieder her. Theme wechselt zweimal. Clear leert den Namen und setzt die Anzahl auf 10.
4. Drei Personas: die zweite wird bearbeitet, die erste entfernt, die bearbeitete Persona gespeichert. Entfernen der bearbeiteten Persona beendet den Edit-Modus.
5. Vergleich öffnet über das Zeilen-Icon und schließt über Close und über den Hintergrund.
6. Der Name `<img src=x onerror=alert(1)> & "Test"` bleibt Text, erzeugt kein `<img>` und keinen Dialog. Export und Import behalten den Namen; der Import-Hinweis erscheint.
7. Export einer leeren Liste zeigt den bestehenden Hinweis. Abbrechen der Dateiauswahl lässt das Angebot unverändert. Keine Seitenfehler; die Konsole meldet nur das fehlende Favicon.
