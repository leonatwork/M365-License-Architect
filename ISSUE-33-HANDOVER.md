# Issue #33 – CSV-Import und Eingabevalidierung

## Grundlage und offene Nachweise

- Ausgangsstand: `9ea370fb7355ad938cc6cc5fc143775e7540b01b`; `HEAD` entspricht dem lokalen `origin/main`, der Arbeitsbaum war zunächst sauber.
- Verbindliche Grundlage ist die im Auftrag enthaltene strukturierte Issue-Fassung einschließlich der Entscheidungen: `MAX_USERS = 100000`, Engine-Clamp, 1 MB und 1.000 Zeilen.
- Der Abruf des vollständigen GitHub-Threads samt Kommentaren und der offenen PRs wurde mit `gh` versucht, aber durch die Werkzeugberechtigungen gesperrt. Aktuelle Remote-Änderungen, zusätzliche Entscheidungen und mögliche offene PR-Abhängigkeiten sind deshalb **nicht verifiziert**. Vor Veröffentlichung muss dieser Abgleich nachgeholt werden. Die Implementierung verwendet ausschließlich den ausgecheckten Main-Stand.
- Im Repository wurden keine `AGENTS.md` und keine `CLAUDE.md` gefunden. Berücksichtigt wurden `PRODUCT.md`, `README.md`, `package.json`, die Issue-Vorlage, vorhandene Tests und die zusätzlichen Regeln des Auftrags.
- Der geforderte **manuelle Browser-Sichttest steht aus**: In der Umgebung ist kein Chromium, Chrome oder Firefox ausführbar. Die tatsächlichen Inline-UI-Funktionen wurden stattdessen in Node-VM-Integrationstests mit einem simulierten FileReader ausgeführt. Das ersetzt keinen manuellen Sichttest.

## Akzeptanzkriterien und Nachweis

| Kriterium | Umsetzung / Nachweis |
| --- | --- |
| AC-1: Eigene Lizenzschlüssel, Fehler mit Zeilennummer, ungültige Zeilen überspringen | `Object.hasOwn` gegen `PRICES` für alle Produkte, zusätzlich gegen `FEATURES_MAP` für Basis/Bestand. Fehlerliste `{ line, message }`; unbekannte Schlüssel, `__proto__`, `constructor`, `toString` und geerbte Katalogeinträge werden getestet. `None` und gültige Standalone-Add-ons bleiben zulässig. |
| AC-2: Import-Anzahl 1..100000 ganzzahlig, Preis endlich und >= 0 | Strikte numerische Prüfung ohne `parseInt`-/`parseFloat`-Fallback; Grenzwerte, 0, negative und gebrochene Anzahlen, leere Werte, Text, NaN, Infinity, Teilzahlen und Überläufe sind abgedeckt. README und Engine dokumentieren `MAX_USERS`. |
| AC-3: Gemeinsame Anzahl-Regel in Mapping und Empfehlung | Private `normalizeCount`-Funktion: `Number`, Bruchteil abschneiden, Clamp auf 1..MAX_USERS; NaN ergibt 1, +Infinity ergibt MAX_USERS, -Infinity ergibt 1. DOM-freie Tests prüfen beide Einstiegspunkte. |
| AC-4: Try/catch, reader.onerror, Limits, deutsche Meldung, unveränderter Zustand, HTML-max | Größe wird vor dem Lesen geprüft, Zeilenlimit im CSV-Modul; asynchrone und synchrone Lesefehler werden abgefangen. Die UI übernimmt nur vollständig fehlerfreie Importe und stellt bei einer Ausnahme die ursprüngliche `quoteItems`-Referenz wieder her, auch bei Renderingfehlern. `max="100000"` gesetzt. Automatisiert nachgewiesen; manueller Sichttest offen. |
| AC-5: Symmetrischer Formelschutz und identischer Rundlauf | `escapeCSV` und `parseCSV` schützen/entschützen `=`, `+`, `-`, `@`, Tab, CR und wörtliche Apostrophe. Tests prüfen tatsächlich gesetzte Schutzpräfixe sowie export → import → export für alle Zeichen, Umlaute, Anführungszeichen, Kommas, Zeilenumbrüche und Metadaten. |
| AC-6: Fehlerpfade und QS-Gates | Regressionen in `test/csv.test.js` und `test/engine-pure.test.js`; `npm test` und `npm run check` jeweils **180/180 grün**. Bestehende Regressionen bleiben grün. |

## Auslegung potenziell widersprüchlicher Kriterien

1. **Zeilen überspringen versus Zustand bei Fehlern unverändert:** Das reine CSV-Modul liefert gültige Positionen und die Fehlerliste, ohne ungültige Positionen zu übernehmen. Die UI lehnt bei jeder gemeldeten ungültigen Zeile die gesamte Datei ab. Es gibt keine stillschweigende Teilübernahme einer fehlerhaften Datei. Die Meldung nennt alle betroffenen Zeilen.
2. **Lizenzschlüssel gegen PRICES/FEATURES_MAP:** Basis und Bestand müssen in beiden Maps eigene Schlüssel besitzen. Add-ons müssen eigene Schlüssel in `PRICES` sein. Eine zusätzliche verpflichtende Add-on-Prüfung gegen `FEATURES_MAP` widerspräche dem vorhandenen Katalog: Add-ons sind dort bewusst getrennt; selbst `ADDON_FEATURES` enthält nicht jedes gültige Einzelprodukt. Eine solche wörtliche Auslegung wäre ohne Änderungen an Lizenzdaten und Formatkompatibilität nicht erfüllbar. Gültige Einzelprodukte und Suiten werden ohne neue Basisplan-Voraussetzungen importiert.
3. **Definition der Limits:** 1 MB bedeutet 1.000.000 UTF-8-Bytes einschließlich Kopfzeile/BOM. 1.000 Zeilen bedeutet 1.000 CSV-Datensätze ohne Kopfzeile und Leerzeilen. Zitierte Zeilenumbrüche gehören zum jeweiligen Datensatz; Fehler nennen dennoch physische Quelldokument-Zeilen. Exakt beide Grenzwerte werden akzeptiert, darüber wird abgelehnt.

## Änderungen

- `src/csv.js`: eigene Katalogschlüssel, strikte Anzahl-/Preisprüfung, zeilengenaue Fehlerliste; Syntaxprüfung für Anführungszeichen, Header und Spaltenanzahl; Größen-/Zeilenlimits; Tab-/CR-Formelschutz.
- `src/engine.js`: exportiertes `MAX_USERS` und gemeinsame Anzahl-Normalisierung für Formular und Empfehlung. Das CSV-Modul nutzt dieselbe Konstante über die vorhandene lokale Engine.
- `index.html`: HTML-Obergrenze und atomare CSV-Übernahme mit deutschen Fehler-/Erfolgsmeldungen; Dateiauswahl wird nach Erfolg und Fehler zurückgesetzt.
- `README.md`: API-Verhalten, Anzahl-Regel und genaue Import-Limits.
- Tests: 54 neue Regressionstests. Der bestehende Sonderzeichen-Roundtrip verwendet jetzt einen ausdrücklich synthetischen Testkatalog für seine künstlichen Lizenznamen; seine bisherigen Assertions bleiben erhalten und werden um Tab/CR erweitert.

## Testgetriebener Nachweis

1. **Vor dem Produktionsfix:** `node --test test/csv.test.js test/engine-pure.test.js` – 62 Tests, 9 bestanden, **53 erwartete Fehler**. Nachgewiesen wurden ungeprüfte unbekannte/Prototype-Schlüssel, ungültige Anzahl-/Preiswerte, fehlender Tab-/CR-Schutz, fehlende CSV-Syntaxfehler, fehlende Limits, nicht abgefangene Lesefehler, Änderungen an `quoteItems` bei Fehlern und fehlende Nutzerobergrenze.
2. **Nach Fix:** `node --test test/csv.test.js test/engine-pure.test.js test/teams-ui.test.js` – **67/67 bestanden**, inklusive bestehender Teams-/Legacy-Importprüfungen.
3. **Gesamte QS:** `npm test` und `npm run check` – jeweils **180/180 bestanden**. `npm run check` delegiert laut `package.json` an dieselbe Testsuite.
4. `git diff --check` ohne Befund. Keine neuen Pakete, Bibliotheken oder CDNs; Lizenzdaten und Preise wurden nicht verändert.

## Ausstehender manueller Browser-Test

1. `index.html` lokal öffnen, mindestens eine Persona zur Angebotsliste hinzufügen und Positionen/Gesamtsumme merken.
2. Eine CSV mit einer gültigen und einer ungültigen Zeile importieren, beispielsweise:

   ```csv
   Persona,Count,Base,Addons,Price,Total,CurrentLic
   Gültig,1,M365 E3,,37.78,37.78,None
   Ungültig,0,M365 E3,,37.78,0,None
   ```

   Erwartung: Meldung „CSV-Import abgebrochen“, Hinweis auf **Zeile 3 / Anzahl**; keine neue Position, unveränderte Gesamtsumme. Danach dieselbe korrigierte Datei erneut auswählen können.
3. Unbekannte Lizenz, `__proto__`/`constructor`, Preis `Infinity` und ein nicht geschlossenes Anführungszeichen prüfen: deutsche Meldung, keine Änderung der Liste.
4. Eine Datei über 1.000.000 Bytes sowie eine Datei mit 1.001 Datenzeilen auswählen: Abbruch mit verständlichem Limit-Hinweis, keine Änderung der Liste.
5. Fehlerfreie Datei importieren: Positionen genau einmal angehängt, Erfolgsmeldung sichtbar. Legacy-Datei ohne Teams-Spalte behält den Hinweis „im Paket“.
6. Personas mit `=`, `+`, `-`, `@`, Tab, CR und Apostroph am Namensanfang exportieren, wieder importieren und exportieren: CSV-Inhalt bleibt identisch.

## Lieferstand

Reviewbare lokale Änderungen samt Tests und Dokumentation. Keine Commits, Pushes, Branch-Erstellung, PR-Erstellung, Merges oder Deployments durchgeführt; keine Produktionsdaten oder Produktions-Supabase angesprochen. GitHub-Thread-/PR-Abgleich und manueller Browser-Sichttest sind die oben ausdrücklich offenen Nachweise.
