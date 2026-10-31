# Issue #47 – Unbestätigte Preise in der Oberfläche

## Lieferstatus

Implementierung und elf neue Tests liegen als lokaler Diff vor. **Der gemeldete CSV-Blocker ist behoben:** `npm test` und `npm run check` melden jeweils **239 bestanden, 0 fehlgeschlagen**. Der eigenständige Browser-CSV-Export funktioniert wieder ohne geladene Engine. Keine Tests übersprungen oder Assertions abgeschwächt. GitHub-Abgleich und manuelle Browser-QS bleiben offen.

## Grundlage und Prüflücken

- Ausgangsstand: `da43f2cfe8dfc58eef4ee07655f1d4eac234a19b`; `HEAD` entspricht dem lokalen `origin/main`, Arbeitsbaum anfangs sauber. Kein Branchwechsel und keine Übernahme aus fremden PRs.
- Grundlage ist die im Auftrag bereitgestellte strukturierte Issue-Fassung einschließlich ursprünglicher Beschreibung und Entscheidungen 1A/2A/3A.
- GitHub-Zugriff über `gh` ist durch die Umgebung gesperrt. Der aktuelle vollständige Thread, zusätzliche Kommentare, vorhandene PRs und die Aktualität des lokalen `origin/main` gegenüber GitHub konnten nicht geprüft werden. Diese Informationen vor der Abnahme abgleichen.
- Im Repository sind keine `AGENTS.md` oder `CLAUDE.md` vorhanden. Übergeordnete Verzeichnisse sind gesperrt. Gelesen und berücksichtigt: Regeln im Auftrag, `README.md`, `PRODUCT.md`, `SECURITY.md`, `.github/CODEOWNERS`, `package.json`, bestehende Tests und Handover #46.
- Kein Chromium, Chrome, Firefox oder Playwright als ausführbares Programm verfügbar. Die UI-Tests laufen im bestehenden Node-VM-/DOM-Stub, nicht in einem echten Browser. Visuelle Prüfung, native Tab-/Enter-/Leertastenbedienung und tatsächliche Screenreader-Ausgabe bleiben manuell offen.

## Verbindliche Akzeptanzkriterien

Die strukturierte Fassung konkretisiert die ursprüngliche Beschreibung: deutscher UI-Text „Preis unbestätigt“, CSV-Text unverändert, fokussierbarer Info-Button mit Popover statt Tippy; Anforderungs-Schalter und Druckansicht sind ausgeschlossen.

| Kriterium | Umsetzung und Nachweis | Status |
| --- | --- | --- |
| AC-1: `todo_source === true` oder fehlender `valid_from` kennzeichnet Empfehlung und Angebot; belegte Positionen ohne Warnung | Katalogweiter Test für jede Basis und jedes Standalone-Add-on, einschließlich datiertem O365 E3/Entra Suite; Warnung direkt beim Empfehlungs- bzw. Zeilenpreis. | Automatisiert erfüllt |
| AC-2: CSV und UI verwenden dieselbe Statusfunktion | `LicenseEngine.priceStatus` in `src/engine.js`; `LicenseCSV.priceInfo`, UI-Warnung, Stand, Details und Summenhinweis verwenden sie in der Anwendung. Katalogweite Parität plus Test mit ersetzter Statusfunktion. Ausschließlich bei fehlender Engine erhält ein separat paritätsgeprüfter Fallback den eigenständigen CSV-Export (siehe unten). | Automatisiert erfüllt; Kompatibilitätsausnahme dokumentiert |
| AC-3: Quelle, Stand und Prüfdatum; deutsche Datumsdarstellung; zugänglicher Info-Button/Popover | Details für belegte und unbelegte Komponenten; native Buttons, `aria-label`, `aria-expanded`, `aria-controls`, `aria-describedby`; beschriftete, fokussierbare Detailregion. Tests prüfen Beziehungen, Fokus, Öffnen/Schließen und Escape mit Fokusrückgabe. | VM-Tests erfüllt; Browser-/Screenreader-QS offen |
| AC-4: Gesamtsumme warnt genau dann, wenn mindestens eine Position unbelegt ist | `grandTotalWarning` am Summenlabel, mit `grandTotal` über `aria-describedby` verknüpft; `role="status"`. Tests für leer, nur belegt, gemischt, Hinzufügen, Bearbeiten, Löschen, Import und Laufzeitwechsel. | Automatisiert erfüllt |
| AC-5: Berechnung, Preise und CSV unverändert; bestehende CSV-/Datentests unverändert grün; beide Gates grün | Katalog und Rechenfunktionen ohne Änderung; CSV-Format/Text und bestehende CSV-/Datentestdateien unverändert. Browser-VM-Tests bestätigen bytegleichen Export mit und ohne Engine sowie Rundlauf mit Engine. Beide Gates: 239/239 grün. | Automatisiert erfüllt |

Weitere Abweichung zur Beschreibung: Die vorhandenen Anforderungs-Schalter enthalten teilweise Preistext, etwa Defender Server. Trotz der gegenteiligen Bestandsbeschreibung bleiben sie gemäß ausdrücklichem Scope-Ausschluss unberührt.

## Umsetzung

- `priceStatus(itemOrKeys, data)` akzeptiert `{ base, addons }` oder eine Schlüsselliste. Rückgabe je Komponente: `{ key, sourced, source, validFrom, checked }`. Leere Schlüssel und `None` werden ausgelassen; unbekannte Schlüssel sind unbelegt. Fehlende Metadaten sind `null`. Eingaben und Katalog bleiben unverändert, Reihenfolge und Duplikate bleiben für CSV-Kompatibilität erhalten.
- `checked` verwendet vorrangig `price_source_checked`, sonst `source_checked`. Intune Plan 2 zeigt damit den spezifischen Preisnachweis vom **18.10.2026**, nicht den späteren allgemeinen Quellenabruf vom 19.10.2026.
- `src/csv.js` delegiert nur die Ermittlung von Status und Datumswerten. `priceDate`, `priceNote`, `unsourced`, CSV-Spalten, Warntext und Behandlung gespeicherter Angebotsnotizen behalten ihre Semantik.
- Die UI zeigt ihren Stand aus dem aktuellen Katalogstatus und den allgemeinen EUR-Listenpreishinweis. CSV-spezifischer Warntext wird nicht mehr als UI-Preisstand wiederholt. Importierte `priceDate`/`priceNote` bleiben in den Angebotsdaten für den Export erhalten.
- Ein Info-Button an der Empfehlung und einer je Angebotszeile erläutert sämtliche enthaltenen Preis-Komponenten, auch belegte. Der Zeilenbutton ist ausdrücklich als Information zu Einzel- und Gesamtpreis beschriftet. Fehlende Quelle/Prüfdatum erscheinen als „nicht vorhanden“, fehlender Stand als „nicht belegt“.
- Das Popover verwendet vorhandene Farbvariablen, keine neue Akzentfarbe oder Bibliothek. Feste Viewport-Position verhindert Abschneiden durch die scrollbaren Angebots-/Empfehlungsbereiche; lange Inhalte sind scrollbar und die Region ist per Tab fokussierbar. Öffnen per nativem Button, Schließen per erneutem Klick, Außenklick oder Escape. Es bleibt höchstens ein Popover offen; Rendern schließt veraltete Details.
- Dynamische HTML-Werte werden escaped; reine Warntexte über Text-Properties gesetzt. Delegierte Listener überstehen Tabellen-Neurendern. Preis, Warnung und Info sind für das mobile Label-/Inhaltsraster zusammengefasst. Der Zahleninhalt von `grandTotal` bleibt unverändert.

## Behobener Blocker: eigenständiger CSV-Browser-Export

`test/csv.test.js:32–34` erstellt `const browser = {}`, führt ausschließlich `src/csv.js` darin aus und ruft den Export auf. Der neue unbedingte Aufruf von `LicenseEngine.priceStatus` verursachte dort `TypeError: Cannot read properties of undefined (reading 'priceStatus')`.

Die Anwendung lädt `engine.js` vor `csv.js` und verwendet weiterhin die gemeinsame Statusfunktion, ebenso Node. Für den bisherigen eigenständigen Browser-Export verwendet `priceInfo` nur bei fehlender Engine einen kleinen Fallback für Schlüssel, Stand und Belegstatus. Das ist eine bewusst dokumentierte Ausnahme von vollständig zentralisierter Klassifikation, um den bestehenden Exportvertrag ohne Änderungen am CSV-Test-Setup zu erhalten. Der Import benötigt wie zuvor die Engine für `MAX_USERS`.

Der zusätzliche Regressionstest „standalone browser CSV preserves engine price metadata and byte-identical exports“ prüft ohne Engine sämtliche Katalogeinträge als Basis und Add-on, datierte `todo_source`-Einträge, fehlende Metadaten, unbekannte Schlüssel, `None`, leere Schlüssel und Duplikate. Status und Preis-Metadaten entsprechen der Engine; Exportbytes einschließlich Sonderzeichen und gespeicherter Notizen stimmen mit Node überein; Eingaben bleiben unverändert. Der vorhandene Test für die reguläre Ladereihenfolge und CSV-Rundlauf bleibt grün.

Die Reviewkorrektur betrifft ausschließlich `src/csv.js`, den neuen Regressionstest in `test/price-status.test.js` und diese Übergabe. Der bereits vorhandene lokale Issue-Diff bleibt die Grundlage.

## Testgetriebener Nachweis

1. Vor Produktionsänderungen: neun Regressionstests in `test/price-status.test.js`, Registrierung in `test/index.js`, Ereignisparameter im UI-Testhelfer sowie gezielte Anpassung der bestehenden UI-Text-/Escaping-Erwartungen.
2. `node --test test/price-status.test.js test/teams-ui.test.js test/issue-36.test.js` vor dem Fix: **13 bestanden, 13 fehlgeschlagen**. Fehlende Statusfunktion, fehlende Detail-/Summenelemente, fehlender gemeinsamer Aufruf und alter UI-Text wurden nachgewiesen.
3. Nach Implementierung mit unveränderten CSV-/Datentests: `node --test test/price-status.test.js test/teams-ui.test.js test/issue-36.test.js test/csv.test.js test/data.test.js` → **91 bestanden, 1 fehlgeschlagen**; verbleibend der oben beschriebene CSV-VM-Konflikt.
4. Reviewkorrektur für mobile Darstellung: verschärfter Test auf gemeinsame Preis-/Warnungs-/Info-Gruppe zunächst rot (`node --test --test-name-pattern="price warnings sit" test/price-status.test.js`: 0 bestanden, 1 fehlgeschlagen), danach Inhaltsgruppe ergänzt. Tastaturtest um Fokus im Detail und Außenklick erweitert.
5. Zehnter Test ergänzt: korrekte Browser-Script-Ladereihenfolge und bytegleicher CSV-Rundlauf. Der neue VM-Aufbau benötigt dafür auch die Browser-API `TextEncoder`; diese wurde im neuen Test bereitgestellt.
6. Reviewkorrektur, vor dem Fix: `node --test --test-name-pattern='standalone browser CSV|CSV export-import-export preserves' test/price-status.test.js test/csv.test.js` → **0 bestanden, 2 fehlgeschlagen**, beide mit dem gemeldeten `TypeError`.
7. Nach dem Fix: `node --test test/price-status.test.js test/csv.test.js test/data.test.js` → **77/77 bestanden**.
8. Letzter Lauf `npm test`: **239/239 bestanden**, keine übersprungenen Tests.
9. Letzter Lauf `npm run check`: **239/239 bestanden** (`check` führt `npm test` aus).
10. `git diff --check`: bestanden. `git diff --exit-code -- test/csv.test.js test/data.test.js data/licenses.js package.json`: bestanden, diese Dateien sind unverändert.

## Manuelle Abnahme durch Leon

1. `index.html` lokal öffnen. Preset **Project Manager** wählen: am Preis „Preis unbestätigt: Visio Plan 2, Project Plan 3“. Per Tab zu Info, per Enter bzw. Leertaste öffnen. Quelle und fehlenden Stand/Prüfdatum je Komponente prüfen. Business Premium bleibt im Detail als belegt ausgewiesen.
2. Per Tab in die Detailregion wechseln, bei Bedarf scrollen; Escape schließt und fokussiert den zugehörigen Info-Button. Erneuter Klick und Außenklick schließen ebenfalls. Screenreader: zugänglicher Buttonname, aufgeklappt/eingeklappt, Verknüpfung und Detailinhalt prüfen.
3. Zum Angebot hinzufügen: Zeilenpreis kennzeichnet die unbestätigten Komponenten, Info enthält dieselben Daten. Gesamtsumme zeigt „Gesamtsumme enthält unbestätigte Preise.“
4. **Marketing Team** wählen: keine Warnung am Empfehlungs-Preis, Info mit belegtem Stand **01.07.2026** weiterhin vorhanden. Hinzufügen: nur die erste Zeile warnt; Summe warnt weiterhin. Erste Zeile löschen oder zu Marketing Team ändern: Summenhinweis verschwindet. Letzte Zeile löschen: kein Summenhinweis.
5. Beide Presets in Hell/Dunkel sowie auf schmalem Viewport wiederholen; Fokus, Umbrüche, Scrollbarkeit und Lesbarkeit prüfen. Der bestehende Theme-Umfang wird nicht erweitert.
6. CSV exportieren: vorhandenes Format und „Preisstand nicht belegt: …“ prüfen. Importieren, Laufzeit wechseln und nochmals exportieren; Warnungen und Summe bleiben konsistent.

## Abhängigkeiten und Lieferung

Keine technische Abhängigkeit von einer Änderung außerhalb dieses lokalen Anteils erkennbar; #10 und Preisrecherche bleiben außerhalb des Umfangs. Mögliche Überschneidungen mit offenen PRs sind wegen des gesperrten GitHub-Zugriffs ungeprüft.

Keine Commits, Pushes, neuen Branches, PR-Erstellungen, Merges oder Deployments. Keine Produktionsdaten oder Infrastruktur berührt. Für die Abnahme verbleiben der GitHub-Abgleich und die manuelle Browser-QS.
