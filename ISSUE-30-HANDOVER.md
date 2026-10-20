# Issue #30 – Engine- und Quote-Konsistenz

## Ausgangsstand und Prüfgrenzen

- Implementiert auf dem unveränderten Ausgangsstand `edcdf40785b6e47aeed23d98c6bbd100b98840d9`, identisch mit dem lokalen `origin/main`.
- Grundlage ist der vollständige im Auftrag enthaltene Issue-Text einschließlich der strukturierten Entscheidungen. Der Abruf des GitHub-Threads samt Kommentaren und der offenen PRs wurde versucht, ist aber durch die Werkzeugberechtigungen gesperrt. Neuere Kommentare, der aktuelle Remote-Stand und mögliche offene PR-Abhängigkeiten sind deshalb nicht verifiziert. Vor Veröffentlichung müssen diese Prüfungen nachgeholt werden.
- Im Repository wurden keine `AGENTS.md` oder `CLAUDE.md` gefunden. `PRODUCT.md`, `README.md`, `package.json`, vorhandene Tests und die zusätzlichen Regeln des Auftrags wurden berücksichtigt.
- Es wurden keine Branches erstellt oder ausgecheckt, keine fremden PR-Stände verwendet und keine Commits, Pushes, PR-Erstellung, Merges oder Deployments ausgeführt.

## Verbindliche Akzeptanzkriterien und Umsetzung

| Kriterium | Nachweis |
| --- | --- |
| AC-1: Regressionen für Postfach, Schwelle und Vertragswechsel | `test/issue-30.test.js`, im QS-Einstieg `test/index.js` registriert |
| AC-2: 299/300 Business, 301 Enterprise | Grenzwerte für Business Premium, Desktop und Cloud-only, jeweils annual und monthly; Desktop- und Cloud-only-Alternativen ebenfalls geprüft |
| AC-3: annual → monthly → annual wie frisch konfiguriert | Drei gespeicherte Personas (Office, Frontline, Standalone), Positionspreise, Add-ons, Inputs, Persona und Gesamtsumme; erneute Auswahl desselben Vertragsmodells bleibt stabil |
| AC-4: monthly = annual × 1,2 für bestehende Positionen | Neuberechnung aller Positionen mit Inputs über `LicenseEngine.recommend`; Rückwechsel stellt die Jahreswerte wieder her |
| AC-5: Basis/Add-ons ergeben Gesamtsumme | Basisberechnung verwendet bereits korrekt Vertragsfaktor und Teams-Variante. Dashboard wird nach Wechsel neu gerendert; Cent-Rest wird dem Add-on-Anteil zugerechnet |
| AC-6: Postfach-Checkboxen vollständig entfernt | Beide Controls, aktive `FORM_IDS` und die drei aktiven Preset-Schlüssel entfernt; Regression prüft deren Abwesenheit |
| AC-7: Altpositionen ohne Inputs skalieren | Vorwärts × 1,2, rückwärts ÷ 1,2, auf Cent gerundet; bestehende Metadaten bleiben erhalten; wiederholte Auswahl skaliert nicht erneut |
| AC-8: QS grün, Preise unverändert, Fixture nur Grenzkorrektur | `npm run test` und `npm run check`: jeweils 126/126 bestanden; Daten-Diff entfernt nur drei Postfach-Preset-Schlüssel; Fixture-Diff ändert ausschließlich drei `< 300` zu `<= 300` |

### Auslegung der Kriterien

- Die Formulierung „inkl. Alternative“ bezieht sich auf die schwellenabhängigen Desktop-/Cloud-only-Alternativen. Der Business-Premium-Zweig behält seine bestehenden Vergleichsalternativen (`M365 E5` bis 300, `Business Premium` darüber); deren Neugestaltung ist kein Bestandteil des beschriebenen Fixes. Eine Interpretation, die sämtliche Alternativen auf Business bis 300 und Enterprise ab 301 festlegt, widerspricht diesen bestehenden Vergleichsalternativen und würde zusätzliche Produktentscheidungen benötigen.
- Die Cloud-only-Alternative ist nun bis 300 `Business Standard`, ab 301 `O365 E3`.
- Historische Postfach-Schlüssel bleiben in den Legacy-Fixtures erhalten: AC-8 verlangt ausdrücklich, die Fixture nur an der 300-Grenze zu ändern. Aktive UI und Presets enthalten diese Schlüssel nicht mehr. Der bestehende Daten-Konsistenztest vergleicht weiterhin alle Preset-Werte exakt, abzüglich der drei ausdrücklich entfernten historischen Schlüssel.
- Positionspreise mit gespeicherten Inputs behalten die bisherige Engine-Präzision; nur Altpositionen werden gemäß AC-7 auf Cent gerundet. Daher sind minimale Rundungsdifferenzen für Altpositionen fachlich möglich, statt einer garantierten verlustfreien Wiederherstellung beliebiger historischer Nachkommastellen.

## Implementierung

- `src/engine.js`: DOM-freie, wiederverwendbare Funktion `mapFormInputs(form)`; konsistente inklusive Business-Grenze.
- `index.html`: gemeinsame Formular-Erfassung für Live-Berechnung und Speicherung; Vertragswechsel berechnet gespeicherte Anforderungen neu und skaliert Altpositionen; Quote und Dashboard werden aktualisiert.
- `data/licenses.js`: ausschließlich Entfernung von Postfach-Preset-Schlüsseln; Preise, Quellen, Features und sonstige Daten unverändert.
- `test/fixtures/legacy-recalc.js`: ausschließlich die drei Grenzvergleiche korrigiert. Historische Preis- und Preset-Referenzergebnisse bleiben unverändert und grün.

## Testgetriebener Nachweis

1. Vor dem Produktionsfix: `node --test test/issue-30.test.js` – 15 Tests, 6 bestanden, 9 erwartete Fehler. Nachgewiesen wurden falsche Empfehlungen bei 300, die falsche Cloud-only-Alternative bei 301, vorhandene Postfach-Controls, fehlendes DOM-freies Mapping, unveränderte gespeicherte Preise und fehlendes Dashboard-Update.
2. Separater Cent-Regressionsnachweis ohne Dashboard-Rundungsfix: `node --test --test-name-pattern='cent remainder' test/issue-30.test.js` – erwarteter Fehler: Add-on-Anteil `17,78 €` statt `17,79 €` bei `39,07 €` Basis und `56,86 €` Gesamt.
3. Nach Fix: `npm run test` und `npm run check` – jeweils alle 126 Tests bestanden, einschließlich 16 neuer Issue-Tests und aller bestehenden Legacy-Regressionen.
4. `git diff --check` ohne Befund. Keine neuen Abhängigkeiten, Bibliotheken oder CDNs.

## Manuelle Review-Schritte

1. Jeweils 299, 300 und 301 Nutzer mit Cloud-only, Desktop und Intune-Anforderung konfigurieren; Empfehlung und Desktop-/Cloud-only-Alternative prüfen.
2. Mehrere Personas mit Basis und Add-ons hinzufügen, annual → monthly → annual wechseln; Positionspreise, Gesamtsumme und Dashboard beobachten.
3. Einen CSV-Import ohne Anforderungsinputs durchführen und beide Vertragsrichtungen prüfen; historische Preise werden skaliert.
4. Postfach-Controls sind nicht mehr sichtbar; Presets und Bearbeiten bestehender Personas funktionieren weiter.

Ein Browser-Sichttest wurde nicht durchgeführt; die UI-Funktionen werden durch die bestehenden und neuen Node-VM-Integrationstests ausgeführt.
