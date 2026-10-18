# Issue #19 – Teams-Auswahl, Preisstand und CSV

## Grundlage und Review-Zuschnitt

Vollständiger Thread von #19 mit allen Kommentaren sowie die verbindlichen Entscheidungen aus #8 gelesen. Grundlage sind der letzte Freigabezuschnitt von #19 (Teams pro Persona, eigene Spalten je Zeile, minimaler Roundtrip-Fix), `PRODUCT.md`, README, Issue-Formular und die Handovers von #8/#15. `CLAUDE.md` und `AGENTS.md` sind im Repository nicht vorhanden. Die Aufgabenangaben zu fehlenden Tests und Tailwind sind durch den aktuellen Code überholt.

Ausgangsstand nach `git fetch origin main`: **HEAD = origin/main = 6ada216**. Offener PR #20 mit Beschreibung, Dateiliste und Kommentaren geprüft: README/Screenshots und zwei Layout-Zeilen. Diese Lösung baut ausschließlich auf main auf und benötigt keinen offenen PR. Keine fremden Branches ausgecheckt oder übernommen.

## Umsetzung und verbindliche Akzeptanzkriterien

| Kriterium | Umsetzung / Nachweis |
|---|---|
| AC-1 | Optionsgruppe „Microsoft Teams“ pro Persona; Standard `included`, EWR `no_teams`. Übergabe an `LicenseEngine.recommend`; bestehende Engine unverändert. Beide Preise und Laufzeitfaktoren ohne Teams-Doppelzählung getestet. Ausnahme bei explizitem Teams-/Phone-Bedarf unten. |
| AC-2 | Klassisches UMD-Modul `src/csv.js` mit `buildCsv(items, data)`, `parseCsv(text, data)` und gemeinsamem `priceInfo`. Inline bleiben Datei-/Download-Handling und Darstellung. Erste sieben CSV-Spalten, Zahlen-/Importdefaults, Pipe-getrennte Add-ons, appendender Import und fehlender Editierzustand bleiben erhalten. |
| AC-3 | Je Zeile `TeamsVariant`, `PriceValidFrom` (ISO-Datum aus `valid_from`) und `PriceNote` (Hinweistext). Kein zusätzlicher Metadaten-Kopf. |
| AC-4 | Alte Dateien ohne Teams-Spalte werden `included`; sichtbarer deutscher Statushinweis in der Quote. Unbekannte Varianten fallen ebenfalls auf `included`. |
| AC-5 | Export–Import–Export bytegleich für neue Exporte: Umlaute, Kommas, Quotes, Zeilenumbrüche, Leerraum, `=+-@` und originale Apostrophpräfixe. Export verdoppelt Quotes auch bei Formelpräfix; Import dekodiert Quotes und entfernt genau das schützende Apostroph. |
| AC-6 | Datum und Hinweistext an Empfehlung und je Quote-Persona; identische Metadaten im CSV. `PRICE_TEXT` enthält ausschließlich neue deutsche Anzeigetexte. Keine Preis-/Feature-/Engineänderungen. Importierte Angebotsdaten werden beim erneuten Export nicht durch aktuelle Daten ersetzt. Unbestätigte Bestandswerte werden gekennzeichnet. |
| AC-7 | Formularpersistenz einschließlich Radios, Quote-Edit, Reset, Preset-Standard, Alternative, Preisdelta und Monat/Jahr getestet. Variantengerechter Basisanteil im Dashboard. Neue Elemente mit scoped Dark-Styles, Tastaturfokus, mobilen Touch-Zielen und Umbruch; Desktop-Empfehlung scrollbar statt abgeschnitten. Visuelle Abnahme noch offen (siehe unten). |
| AC-8 | Keine neuen Abhängigkeiten, kein Netzwerk in Tests. Tests prüfen klassische CSV-Skripteinbindung sowie fehlende Netzwerkaufrufe/externe URLs in den neuen JS-Dateien. |

Importtext für Persona, Basis, Add-ons und Preisnotiz wird vor `innerHTML` escaped; Variante wird ausschließlich aus festen deutschen Texten dargestellt. Importierte Items besitzen weiterhin keine Formularinputs. Ihre Teams-Features werden für den bestehenden Quote-Vergleich aus ihrer Variante rekonstruiert.

## Widersprüche und Grenzen

1. **AC-1 „ohne Teams kein Teams-Add-on“:** Die verbindliche Entscheidung aus #8 und vorhandene main-Regressionen verlangen bei explizitem `teams`-/`phone`-Bedarf genau einmal Teams EWR. Daher gilt „kein Add-on“ bei fehlendem Teams-Bedarf. Ein pauschales Verbot wäre mit der unveränderten Engine-/Phone-Regel unvereinbar. Keine Berechnungsänderung in diesem Issue.
2. **Bestandswerte ohne belegten Stand:** Nicht alle vorhandenen Add-on-Preise haben `valid_from`; sie behalten ihren offenen Stand und werden im Hinweistext gekennzeichnet. Ohne datierten Bestandteil bleibt `PriceValidFrom` leer. Eine alte CSV ohne Datumsfeld belegt keinen Juli-Preisstand und erhält deshalb ebenfalls ein leeres Datum. Neue Empfehlungen beziehen ihr Datum aus den vorhandenen datierten Preisbestandteilen (bei Suiten zuerst Basis).
3. **AC-7 Sichtprüfung:** Automatisierte DOM-/CSS-Prüfungen ersetzen keine visuelle Browserabnahme. Diese wurde nicht ausgeführt. Main hat trotz Theme-Schalter keine allgemeinen Dark-Styles; nur die neuen Elemente erhalten in diesem Issue Dark-Styles. Das allgemeine Theme-/Layout-Verhalten ist Bestandsstand.
4. **CSV-Roundtrip-Abgrenzung:** Neue Exporte sind roundtrip-sicher. Historische Dateien können originale und als Formelschutz eingefügte Apostrophe nicht unterscheiden; das Entfernen des Schutzpräfixes ist die ausdrücklich beschlossene Verhaltensänderung. Pipe-getrennte Add-ons und der bestehende Import ohne Editierinputs werden nicht neu entworfen.

## Testgetriebener Nachweis und QS

- Vor Produktionsänderungen: `node --test test/csv.test.js test/teams-ui.test.js`: **7/8 rot**, 1 grün. Ursachen: fehlendes CSV-Modul, fehlende Auswahl, fehlender Importstatus und fehlende Einbindung. Engine-Variante bereits unterstützt.
- Nach erster Umsetzung: derselbe Befehl **8/8 grün**.
- `npm run check` (führt `npm test` aus): zunächst **81/81 grün**; anschließend zusätzliche Prüfung der neuen Dark-/Focus-/Mobilregeln und expliziter Altdatei-Datumsdefault.
- Abschließender QS-Stand: **82/82 grün**, einschließlich aller bestehenden Tests; keine Netzwerkzugriffe. `git diff --check` sowie Syntaxprüfung von CSV, Daten, neuen Tests und Inline-Anwendungs-JavaScript erfolgreich.

## Vorbereiteter Hinweis für PR-/Review-Text

Bitte im Browser bei Desktopbreite (auch ab 1280px) und ca. 390px Mobilbreite in Hell/Dunkel prüfen:

1. Ohne expliziten Teams-Bedarf beide Varianten wählen: Empfehlung, Preis, Alternative und Ist-/Soll-Vergleich prüfen. Mit Phone den ausdrücklich benötigten Teams-EWR-Zusatz prüfen.
2. Preisstand und Hinweise an Empfehlung und in einer gemischten Quote prüfen; neue Auswahl per Tastatur bedienen.
3. Quote-Persona bearbeiten, Vorlage anwenden, Formular zurücksetzen und Monat/Jahr wechseln.
4. CSV mit Umlauten, Komma, Quotes, Zeilenumbruch und Formelpräfixen exportieren, importieren und erneut exportieren; Variante und Angebotsstand müssen erhalten bleiben.
5. Alte CSV importieren: sichtbarer „Teams im Paket“-Hinweis und kein erfundener Preisstand.

Änderungen lokal und uncommitted. Kein Branch erstellt, Commit, Push, PR, Merge oder Deployment ausgeführt.
