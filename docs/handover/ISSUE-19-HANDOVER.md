# Issue #19 – Teams-Auswahl, Preisstand und CSV

## Grundlage und Review-Zuschnitt

Ausgangsstand: `HEAD = origin/main = 7ec4562d3029ac8f9b6c4173112d0f139a442a51`, sauberer Arbeitsbaum. Auf dem bereits ausgecheckten Arbeitsbranch wurden ausschließlich lokale Änderungen vorgenommen. Keine fremden PR-Branches ausgecheckt oder übernommen.

Grundlage ist der vollständige vom Auftraggeber mitgelieferte Issue-Text einschließlich strukturierter Kriterien und Originalbeschreibung. `PRODUCT.md`, `README.md`, das Issue-Formular sowie die Handovers zu #8 und #15 wurden geprüft. Im Repository existieren keine `AGENTS.md` oder `CLAUDE.md`. Zugriff auf übergeordnete Verzeichnisse ist gesperrt.

**Nachweislücke:** Die Umgebung sperrt `gh`. Zusätzliche Issue-Kommentare, der aktuelle Remote-main und offene PRs konnten daher nicht abgefragt werden. Die früheren Handovers dokumentieren die Entscheidungen aus #8; eine aktuelle Thread-/PR-Prüfung durch den Autor bleibt erforderlich. Im lokalen main sind die benötigten Daten und Engine-Schnittstellen bereits vorhanden; die Lösung verwendet keinen Anteil eines offenen PRs.

## Akzeptanzkriterien

| Kriterium | Umsetzung / Nachweis |
|---|---|
| AC-1 | Deutsche Teams-Auswahl pro Persona, Standard `included`; `recalc()` übergibt `teamsVariant` an `LicenseEngine.recommend`. Empfehlung, Alternativpreis, Ist-Vergleich und Quote-Vergleich verwenden die vorhandene Engine. Engine-Regeln unverändert. Ohne expliziten Teams-Bedarf kein Add-on; Sonderfall unten. Neuer Engine-Test prüft Office, Frontline und Standalone für beide Varianten und beide Laufzeiten. Bestehende Teams-/Phone-Regressionen bleiben aktiv. |
| AC-2 | Reine CSV-Funktionen in `src/csv.js`, als lokales klassisches Script und CommonJS-Modul nutzbar. Browser-Dateiauswahl und Download bleiben in `index.html`. Alte sieben Spalten, Zahlenformate, Dateiname, Anhängen importierter Zeilen und fehlende Editierbarkeit importierter Personas bleiben erhalten. |
| AC-3 | Neue Spalten `TeamsVariant`, `PriceDate`, `PriceNote` je Angebotszeile. Datum stammt aus `valid_from`, nicht aus einem festen UI-Datum. ISO-Datum im CSV; deutsche Datumsdarstellung in der UI. |
| AC-4 | Fehlendes/leer gebliebenes Teams-Feld wird `included`. Erfolgsdialog und dauerhafter Statushinweis in der Quote nennen die Übernahme als „im Paket“. Modul- und ausführbarer UI-Test. |
| AC-5 | Bytegleicher Export-Import-Export und gleiche Angebotsfelder bei Umlauten, Kommas, Quotes, Zeilenumbrüchen, Leerraum und führenden `=+-@` bzw. Apostrophen. Quotes werden immer verdoppelt, Schutzapostrophe beim Import reversibel entfernt; echte führende Apostrophe werden beim Export verdoppelt. Parser behandelt ausschließlich benötigte CSV-Quotes, Feld-/Zeilengrenzen, CRLF und BOM. Keine neue Parserbibliothek. |
| AC-6 | `LICENSE_DATA.PRICE_NOTE` enthält den deutschen Hinweistext; Preis- und Featurewerte unverändert. Preisstand an Empfehlung und pro Quote-Zeile sowie als Datum/Notiz im CSV. Quote speichert Metadaten mit der Empfehlung; Import bewahrt vorhandene Metadaten. Undatierte Produkte werden ausdrücklich genannt. |
| AC-7 | Bestehende Anforderungsgruppe, Formularpersistenz, Reset, Presets, Vergleich und mobile Quote-Karten werden weiterverwendet. Neuer UI-Test führt Empfehlung, Quote, Bearbeitung, Reset, Preset und Monatsfaktor aus. Neue Elemente verwenden die bestehenden Farbvariablen, Umbruch und native mobile Auswahl. Die im Review beanstandeten globalen Dunkelmodus-Overrides wurden entfernt; das bisherige Erscheinungsbild bleibt erhalten. Ein Regressionstest schützt vor appweiten Dunkel-Overrides. Tatsächliche Sichtprüfung bleibt offen. |
| AC-8 | Keine Abhängigkeiten, kein Build. Test prüft neue JS-Dateien auf Netzwerkaufrufe und externe URLs sowie die lokale CSV-Scripteinbindung. Tests laufen ohne Netzwerk. |

## Widersprüche und Datenlücken

1. **AC-1 „ohne Teams kein Teams-Add-on“ ist pauschal nicht erfüllbar:** Die bereits gemergte Engine und die Handovers zu #8/#15 verlangen bei explizitem Teams-Collaboration- oder Phone-Bedarf einmal `Teams EWR`. Die UI lässt diese unabhängigen Anforderungen bestehen. Ohne diesen Bedarf wird ausschließlich der Basispreis `price_no_teams` verwendet; „im Paket“ zählt Teams nicht doppelt. Preise und Regeln werden für dieses UI-Issue nicht geändert.
2. **Nicht alle Produkte haben `valid_from`:** Bestandsprodukte mit fehlendem Datum erhalten keinen erfundenen Preisstand. Die Zeile nennt „Preisstand nicht belegt: …“. Ohne datiertes Produkt bleibt `PriceDate` leer und die UI zeigt „Stand nicht belegt“. Standalone berücksichtigt ausschließlich gewählte Produkte, niemals das undatierte Pseudoprodukt `None`. Bei mehreren belegten Datumsständen wird das neueste vorhandene Datum verwendet. Aktuell haben die datierten Produkte denselben Stand.
3. **Alternative bleibt der vorhandene Basislizenzvergleich:** Kein Umbau zum zweitbesten vollständigen Angebot; diese Konsistenzarbeit gehört laut vorherigem Handover zu #13.
4. **CSV-Roundtrip ist der app-eigene Export/Import:** Die bestehende `|`-Trennung von Add-ons und importierte Zeilen ohne rekonstruierte Anforderungsinputs bleiben erhalten. Literal führende Apostrophe im alten Format waren nicht eindeutig von Schutzapostrophen unterscheidbar; neue Exporte kodieren sie reversibel. Die neue Preisnotiz ist beim Rendern HTML-escaped, ebenso importierte Persona-/Produkttexte, damit Sonderzeichen als Text erscheinen.

## Testgetriebener Nachweis und QS

- Vor Produktänderungen: `node --test test/csv.test.js test/teams-ui.test.js`: **8 rot / 1 grün**. Fehlendes CSV-Modul, fehlende Einbindung, Teams-Auswahl und Importhinweis. Zwei fehlende Elementtypen im UI-Teststub wurden korrigiert; anschließend war der Importtest nachweislich am fehlenden sichtbaren Hinweis rot, nicht an einem Stubfehler.
- Nach Implementierung: dieselben gezielten Tests **9/9 grün**. Roundtrip-Test zusätzlich auf alle Angebotsfelder und Sonderzeichen in Basis, Add-ons und Ist-Lizenz erweitert.
- QS-Gate: `npm run check` → `npm test` → `node --test test/`, **109/109 grün**. Neue Tests über den bestehenden `test/index.js` registriert. Keine Netzwerkzugriffe.
- `git diff --check`, Syntaxprüfungen für Daten, CSV-Modul, neue Tests und Inline-Appscript erfolgreich.
- Kein Browser in der Umgebung verfügbar: keine behauptete visuelle Abnahme oder Screenshots.
- Review-Korrektur zum Dunkel-Design: Neuer Regressionstest vor dem Fix gezielt an `html.dark` rot; danach `node --test test/teams-ui.test.js` **5/5 grün**, `npm run check` **110/110 grün** und `git diff --check` erfolgreich. Sieben globale Dunkel-CSS-Regeln entfernt.

## Vorbereiteter PR-Text / Sichtprüfung für den Autor

**Zusammenfassung:** Teams-Variante pro Persona auswählbar; datierter deutscher Preisstand an Empfehlung und Quote; CSV-Modul mit drei neuen Angebotsspalten, Altimport-Hinweis und regressionsgeprüftem Roundtrip. Daten-/Engine-Berechnungen bleiben unverändert.

**Bitte vor Freigabe prüfen:**

- In hellem und dunklem Modus, Desktop sowie 390 px und 768 px Breite: beide Teams-Optionen, Tastaturfokus, lange Preisnotizen und Erreichbarkeit in der Anforderungsliste.
- Ohne Teams-Bedarf: Variantenpreis, Alternative und Vergleich. Mit Collaboration/Phone: genau ein Teams-EWR-Add-on in der EWR-Variante.
- Mehrere Personas beider Varianten zur Quote hinzufügen, bearbeiten und vergleichen; Reset-Standard, Vorlagen und Monat/Jahr prüfen.
- Empfehlung und Quote: „Listenpreis in EUR, zzgl. MwSt., jährliche Abrechnung, Stand 01.07.2026“ sowie Hinweis bei undatierten Add-ons.
- CSV exportieren, importieren und erneut exportieren; Variante, Datum, Notiz und Sonderzeichen prüfen. Alte sieben-spaltige Datei importieren und sichtbaren Standardhinweis kontrollieren.
- Aktuellen Issue-Thread und offene PRs gegen den dokumentierten Zuschnitt abgleichen.

Lieferung uncommitted. Kein Commit, Push, neuer Branch, PR, Merge oder Deployment; keine Produktionsdaten geändert.
