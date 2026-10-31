# Issue #46 – Tenantweite Angebotsprüfung

## Grundlage und offene Prüflücken

- Ausgangsstand: `dfb655aa50c48bb56f794ff2ccb23b7307987040`. `HEAD` und der lokale Ref `origin/main` stimmen überein; das Arbeitsverzeichnis war zu Beginn sauber. Kein Branchwechsel, kein Cherry-Pick, keine Übernahme aus offenen PRs.
- Grundlage ist die im Auftrag vollständig bereitgestellte strukturierte Issue-Fassung einschließlich der ursprünglichen Beschreibung und der fachlichen Entscheidungen 1B, 2A und 3A.
- **Nicht verifizierbar:** Der Zugriff über `gh` ist durch die Ausführungsregeln gesperrt. Deshalb konnten der vollständige aktuelle GitHub-Thread, zusätzliche Kommentare, offene PRs und die Aktualität des lokalen `origin/main` gegenüber GitHub nicht geprüft werden. Vor der Review diese Informationen abgleichen.
- Im Repository wurden keine `AGENTS.md`, `CLAUDE.md` oder CONTRIBUTING-Dateien gefunden. Übergeordnete Verzeichnisse sind gesperrt und konnten nicht auf zusätzliche Regeln geprüft werden. Berücksichtigt: die Regeln im Auftrag, `README.md`, `PRODUCT.md`, `SECURITY.md`, `.github/CODEOWNERS`, `package.json`, bestehende Tests und die relevanten Handover.
- **Manuelle Browser-QS offen:** In dieser Umgebung ist kein Chromium, Chrome oder Firefox verfügbar. Die ausgeführten HTML-Integrationstests verwenden den vorhandenen Node-VM-/Event-DOM-Testhelfer und ersetzen keine visuelle Browserprüfung. Anleitung und CSV zur Nachprüfung stehen unten.

## Verbindliche Akzeptanzkriterien

Die strukturierte Fassung konkretisiert die ursprüngliche Beschreibung: R1 ist nur ein Hinweis, ohne Mehrkosten und Aktion; Standalone ist von R2 ausgenommen; R3 gehört in einen späteren Auftrag. Aus diesen Fassungen ergibt sich damit kein ungelöster fachlicher Widerspruch.

| Kriterium | Umsetzung und Nachweis | Status |
| --- | --- | --- |
| AC-1: 2 × 200 Business Premium → genau ein R1 mit beiden Zeilen | `test/issue-46.test.js`: ein `warning`-Befund mit `items: [0, 1]`, Nutzerzahl 400 im Text. | Automatisiert erfüllt |
| AC-2: 300 erlaubt, 301 verteilt nicht | Einzelzeile mit 300; drei verschiedene Business-Basen mit zusammen 300/301; Enterprise-Zeile zählt nicht mit. | Automatisiert erfüllt |
| AC-3: Importiertes O365 E3 + Defender Suite fehlerhaft, M365 E3 gültig | Engine-Test verarbeitet echte `LicenseCSV.importCSV`-Ergebnisse; HTML-Test löst den Dateiimport über den registrierten Listener aus. | Automatisiert erfüllt |
| AC-4: Alle `PRICES.requires`, Standalone-Ausnahme | Datentest iteriert über sämtliche Einträge mit Voraussetzung, prüft ungültige Basis und alle erlaubten Katalogbasen. Tests für Flag, `base: 'None'`, gespeicherten Standalone-Workstyle und Zeilenlokalität. | Automatisiert erfüllt |
| AC-5: Befunde aktualisieren sich bei Add/Edit/Delete/Import und verschwinden nach Korrektur; leer ohne Bereich | `renderTable()` aktualisiert die Befunde; HTML-Laufzeittest prüft registrierte Aktionen, 400 → 300 → 301, Entfernen bis leer sowie R2-Korrektur nach Import. | Automatisiert erfüllt; Browserprüfung offen |
| AC-6: Optisch unterscheidbar, nicht blockierend, dieselben Hinweise vor Export; Format unverändert | Warnung: goldfarbener durchgezogener Rand; Fehler: roter doppelter Rand; zusätzlich deutsche Schweregradlabels. `exportCSV()` aktualisiert denselben Bereich vor Serialisierung ohne Dialog. Test prüft beide Befunde, erfolgreichen Download und identischen CSV-Inhalt/Kopf. | Automatisiert erfüllt; visuelle Prüfung offen |
| AC-7: R1 ohne Mehrkosten und Aktion, kein R3 | Befund enthält nur Nutzerzahl und Grenze; der Renderer enthält keine Aktion. Copilot Business auf Enterprise-Basis erzeugt keinen Befund. | Erfüllt |
| AC-8: Persona-Empfehlungen, Preise und Katalog unverändert; beide QS-Gates grün | `recommend` und `compare` unverändert, `data/licenses.js`, `src/csv.js` und `package.json` ohne Diff; bestehende Referenztests und zusätzliche Empfehlung-Gegenproben grün. | Erfüllt |

## Umsetzung und API

- `src/engine.js`: neue reine Funktion `validateQuote(items, data)`; Rückgabe ist eine Liste `{ rule, severity, items, message }`. `items` enthält **nullbasierte Indizes der Angebotszeilen**, keine Objekte oder CSV-Quelldokumentzeilen. R1 kommt einmal je Angebot; R2 einmal je nicht erfülltem Add-on.
- R1 summiert `count` ausschließlich für `Business Basic`, `Business Standard` und `Business Premium` im gesamten Angebot. Es gibt keine automatische Umstellung oder Neuberechnung.
- R2 nutzt ausschließlich die konkrete Zeile und den Katalog: `requires` als Array verlangt eine darin genannte Basis; ein String verlangt dieselbe Basis, ein passendes Feature aus `FEATURES_MAP[base]` bzw. `item.features` oder eine höhere Stufe derselben vorhandenen `HIERARCHY`-Gruppe. So erfüllt Entra P2 auch Entra P1. Voraussetzungen werden nicht aus anderen Zeilen bezogen; die Empfehlungsprüfung bleibt unverändert.
- R2 überspringt `standalone: true`, `base === 'None'` und `item.inputs?.workstyle === 'standalone'`. Neue/bearbeitete Angebotszeilen erhalten das Flag aus Basis/Workstyle; die UI ergänzt es bei importierten Zeilen aus `None`. Das CSV-Format braucht dafür keine neue Spalte.
- `index.html`: beständiger, initial ausgeblendeter Live-Bereich `quoteFindings` über der Tabelle. Zeilenbezug über sichtbare Zeilennummer und Persona. Befundtexte und Persona-Namen werden escaped. Ohne Befunde wird der Inhalt geleert und der Bereich ausgeblendet. Export nutzt denselben Renderer wie Tabellenänderungen.
- Tests: acht neue Engine-/Datenregressionstests und vier HTML-Integrationstests. Der vorhandene DOM-Testhelfer berücksichtigt jetzt das `hidden`-Attribut des initialen Markups.

## Testgetriebener Nachweis

1. Zuerst `test/issue-46.test.js`, Registrierung in `test/index.js` und Erweiterung von `test/html-integration.test.js`, ohne Produktionsänderungen.
2. `node --test test/issue-46.test.js test/html-integration.test.js` vor dem Fix: **4 bestanden, 12 fehlgeschlagen**. Alle acht neuen Engine-Tests scheiterten an der fehlenden `validateQuote`-Funktion; die vier neuen HTML-Tests an fehlendem Bereich bzw. Standalone-Flag. Die bestehenden vier HTML-Tests blieben grün.
3. Nach Implementierung zeigte die gezielte Prüfung eine Lücke im DOM-Stub: Er hatte das initiale HTML-`hidden` nicht abgebildet. Den Helfer entsprechend ergänzt; keine bestehende Assertion abgeschwächt. Der Reinheitstest verwendet eine eingefrorene Katalogkopie, um andere Tests nicht durch Einfrieren des gemeinsam geladenen Katalogs zu beeinflussen.
4. `node --test test/issue-46.test.js test/html-integration.test.js test/issue-36.test.js`: **25/25 bestanden**; einschließlich Escaping- und Inline-Handler-Gates.
5. `npm test`: **225/225 bestanden**, keine übersprungenen Tests.
6. `npm run check`: **225/225 bestanden**, keine übersprungenen Tests (`check` führt gemäß `package.json` `npm test` aus).
7. `git diff --check`: bestanden. Diff für Katalog, CSV-Modul und Paketkonfiguration leer.

## Reviewkorrektur: Entra-Hierarchie in R2

- Befund: Importierte oder bearbeitete Zeilen mit M365 E5/E7 und Entra Suite erzeugten fälschlich R2, weil die Basis Entra P2 statt Entra P1 enthält.
- Korrektur ausschließlich in `validateQuote`: String-Voraussetzungen berücksichtigen zusätzlich die vorhandene Kataloghierarchie. Explizite Basisvoraussetzungen (String oder Array) werden dadurch nicht gelockert.
- Drei gezielte Regressionstests ergänzen CSV-Import mit E5/E7 und ungültiger O365-E3-Gegenprobe, bearbeitete Zeilen mit P2-Feature, Zeilenlokalität, fehlende Hierarchiedaten, Hierarchierichtung und unveränderte Basisvoraussetzungen.
- Rotnachweis vor der Korrektur: `node --test test/issue-46.test.js` → **9 bestanden, 2 fehlgeschlagen**; beide Fehler reproduzieren die falsche Entra-P1-Meldung.
- Nach der Korrektur: `node --test test/issue-46.test.js test/html-integration.test.js` → **19/19 bestanden**; `npm test` und `npm run check` → jeweils **228/228 bestanden**, keine übersprungenen Tests.
- Die oben dokumentierten GitHub- und Browser-Prüflücken bestehen weiterhin. Kein Commit oder Push.

## Manuelle Nachprüfung im Browser

1. `index.html` lokal öffnen. Im leeren Angebot ist kein Befundbereich sichtbar.
2. Zwei Office-Personas mit je 200 Nutzern und Desktop-MDM hinzufügen: Beide Empfehlungen bleiben Business Premium; oberhalb der Tabelle erscheint genau eine Warnung über 400/300 mit beiden Persona-Namen.
3. Zweite Persona auf 100 korrigieren: Warnung verschwindet. Auf 101 ändern: Warnung erscheint. Erste Persona löschen: Warnung verschwindet. Letzte Persona löschen: Bereich bleibt ausgeblendet.
4. Folgenden Inhalt lokal als CSV speichern und importieren. Erwartet: ein R1 für die ersten beiden Zeilen, ein R2 für „Office“; kein R2 für „Microsoft“ und „Einzelprodukt“.

```csv
Persona,Count,Base,Addons,Price,Total,CurrentLic,TeamsVariant
Business A,200,Business Premium,,19.06,3812.00,None,included
Business B,200,Business Premium,,19.06,3812.00,None,included
Office,1,O365 E3,Defender Suite,36.67,36.67,None,included
Microsoft,1,M365 E3,Defender Suite,48.18,48.18,None,included
Einzelprodukt,1,None,EPM Add-on,2.60,2.60,None,included
```

5. Export klicken: Dieselben Befunde bleiben angezeigt; Download erfolgt ohne Bestätigungsdialog. Export enthält weiterhin die bisherigen zehn Spalten und keine Befunde. Die zusätzlichen bestehenden Preisstand-Hinweise sind von den neuen Lizenzbefunden unabhängig.
6. „Office“ löschen: R2 verschwindet. „Business B“ löschen: R1 verschwindet. Darstellung auch bei schmalem Viewport prüfen; Warnung und Fehler unterscheiden sich durch Label, Farbe und Randform.

## Abhängigkeiten und Lieferung

Für R1/R2 besteht keine technische Abhängigkeit von #44 oder #45. R3 bleibt ausdrücklich der spätere Folgeschritt; Katalogeinträge für Copilot Business werden hier nicht verändert. Ob offene PRs neue Konflikte oder Abhängigkeiten einführen, ist wegen des gesperrten GitHub-Zugriffs nicht verifiziert.

Die Lösung liegt als lokaler, uncommitteter Diff vor. Keine neuen Abhängigkeiten oder CDN-Einbindungen; keine Commits, Pushes, Branch-Erstellungen, PR-Erstellungen, Merges oder Deployments. Keine Produktionsdaten oder Infrastruktur berührt.
