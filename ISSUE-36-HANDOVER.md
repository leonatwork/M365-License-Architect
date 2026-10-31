# Issue #36 – UI-Härtung und CSP-Vorbereitung

## Grundlage und Prüfgrenzen

- Ausgangscommit: `aaebc105414fb5d59aea37d446013f28b9685797`, identisch mit dem lokalen `origin/main`; der Arbeitsbaum war sauber. Der Merge von PR #39 ist in diesem Commit enthalten.
- Verbindliche Grundlage ist die strukturierte Issue-Beschreibung aus dem Auftrag. Der Abruf des vollständigen GitHub-Threads inklusive Kommentaren und der offenen PRs mit `gh` wurde durch die Werkzeugberechtigungen gesperrt. Weitere Kommentare, offene PR-Abhängigkeiten und die Aktualität des Remote-Stands konnten deshalb nicht verifiziert werden. Diese Prozessanforderung bleibt offen und muss vor Veröffentlichung nachgeholt werden.
- Im Repository sind keine `AGENTS.md`, `CLAUDE.md` oder CONTRIBUTING-Regeln vorhanden. Übergeordnete Regeln konnten wegen der Zugriffsbeschränkung nicht geprüft werden. Berücksichtigt wurden `README.md`, `PRODUCT.md`, `package.json`, vorhandene Tests, das Handover zu #34 und die Regeln des Auftrags.
- Die Lösung basiert ausschließlich auf dem ausgecheckten Main-Stand. Keine Branch-Erstellung oder -Wechsel, keine Übernahme fremder PR-Stände, keine Commits, Pushes, PR-Erstellung, Merges oder Deployments.

## Akzeptanzkriterien

| Kriterium | Umsetzung und Nachweis | Status |
| --- | --- | --- |
| AC-1: Keine Inline-Handler in `index.html`, einschließlich generierter Tabellenbuttons | Alle 43 bisherigen Attribut-Fundstellen entfernt. `window.addEventListener('load', init, { once: true })` initialisiert die App; `bindUIEvents()` registriert die Eingaben und Aktionen. Edit/Compare/Remove nutzen Delegation am beständigen `quoteBody` und `data-action`/`data-index`. Quelltest und gerenderte Tabellen werden auf `on*=` geprüft. | Erfüllt |
| AC-2: Dynamische Inhalte in allen `innerHTML`-Templates sicher einfügen | Feature-Tags, beide Live- und Modal-Listen sowie sämtliche Tabellen-Interpolationen nutzen `escapeHTML`, einschließlich Zahlenausgaben und Attributwerten. Add-on-Markup wird ausschließlich aus dem ebenfalls geprüften, escaped Tag-Template oder einer Konstante zusammengesetzt. Quelltest und Laufzeittests mit HTML-/Attribut-Payloads sichern das ab. | Erfüllt |
| AC-3: Keine CSP-Meta; CSP-Folgeschritt im README | README dokumentiert #9, Auslagerung von Inline-Script und Inline-Style, Überführung der Style-Attribute, `default-src 'self'` und `script-src 'self'` ohne `'unsafe-inline'` für Scripts sowie anschließende Browser-Prüfungen. Ein Test prüft die Dokumentation und das Fehlen einer CSP-Meta. | Erfüllt |
| AC-4: Funktionalität erhalten; `npm test` und `npm run check` grün | Beide Gates bestehen mit 145/145 Tests. Automatisierte UI-Abläufe prüfen Import/Export, Theme, Clear, Laufzeit, Preset, beide Add-Buttons, Bearbeiten, Vergleichen und Entfernen einschließlich Icon-Klicks und erneutem Rendering. | Automatisiert erfüllt; manueller Browser-Nachweis offen |

### Auslegung und Abhängigkeiten

- Die strukturierte Fassung ersetzt die ursprüngliche bedingte Forderung nach einer CSP-Meta: Für dieses Issue ist ausdrücklich nur die Dokumentation verlangt. Eine gesetzte CSP ist der Folgeschritt nach #9 und der Script-/Style-Auslagerung.
- PR #39 ist bereits Bestandteil des Ausgangsstands. Seine Regressionen bleiben erhalten; der Test auf den alten Inline-Remove-Handler wurde durch die Prüfung des tatsächlichen delegierten Aufrufs von `removePersona` ersetzt.
- Aus dem lokalen Code ergibt sich keine benötigte offene PR-Abhängigkeit für diesen Fix. #9 ist nur Voraussetzung für den späteren CSP-Schritt. Nicht abrufbare Kommentare und offene PRs können weitere Informationen enthalten.
- Bestehende gemischtsprachige UI-Labels bleiben für die ausdrücklich geforderte Funktionsgleichheit erhalten; neue UI-Texte wurden nicht eingeführt. Empfehlungslogik, Lizenzdaten, Preise, Design und Abhängigkeiten wurden nicht geändert.

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
5. `npm test`: **145/145 bestanden**.
6. `npm run check`: **145/145 bestanden**.
7. `git diff --check`: ohne Befund; eigener Diff-Review durchgeführt.

Der Quelltest verlangt direkte `escapeHTML(...)`-Aufrufe für alle Interpolationen der vorhandenen HTML-Templates und prüft, dass der Aufruf den gesamten Ausdruck umschließt. Er ist ein konservatives, abhängigkeitenfreies Gate für den bestehenden Template-Stil, kein allgemeiner JavaScript-/Datenfluss-Parser. Die ergänzenden Laufzeittests prüfen die tatsächlichen Renderer und den CSV-Import gegen eingeschleustes Markup und doppelte Anführungszeichen, einfache Anführungszeichen und Ampersands. Der Event-DOM-Testhelfer ist eine Node-VM mit Stubs, kein Browser.

## Offener manueller Smoke-Test

In der Sitzung steht weder ein Browser-Werkzeug noch ein Browser-Executable zur Verfügung. Ein manueller Browser-Smoke-Test wurde **nicht durchgeführt**; automatisierte VM-Abläufe ersetzen diesen ausdrücklich verlangten Nachweis nicht.

Im modernen Browser lokal mit `index.html` nachholen:

1. Seite laden: Live-Empfehlung und Vergleich sind initial sichtbar. Anzahl, aktuelle Lizenz, Teams-Variante und Anforderungen ändern; Werte reagieren unmittelbar.
2. Office mit Marketing-Preset, Frontline und Standalone/Add-ons getrennt prüfen. Jeweils eine Persona hinzufügen; Desktop- und Mobile-Add-Button verwenden.
3. Annual → Monthly → Annual wechseln: Empfehlung, Positionen, Summe und Dashboard werden aktualisiert. Theme zweimal wechseln. Clear setzt das Formular zurück.
4. Drei Personas hinzufügen, die zweite über das Stift-Icon bearbeiten, die erste über das Papierkorb-Icon entfernen und speichern: Die richtige Persona wird aktualisiert. Entfernen der bearbeiteten Persona beendet den Edit-Modus.
5. Vergleich über das Icon einer Zeile öffnen; über Close und Hintergrund schließen. Nach Bearbeiten, Löschen und Laufzeitwechsel erneut öffnen.
6. Einen Namen wie `<img src=x onerror=alert(1)> & "Test"` hinzufügen: Er bleibt sichtbarer Text. CSV exportieren und wieder importieren; Name und Preisstand bleiben erhalten, keine zusätzlichen HTML-Elemente entstehen, Import-Hinweis erscheint.
7. Leere Liste exportieren und Dateiauswahl abbrechen: Bestehendes Verhalten bleibt erhalten. Browser-Konsole auf Fehler prüfen.

Zusätzlich vor Veröffentlichung den vollständigen Issue-Thread und offene PRs gegen diese Lösung prüfen.
