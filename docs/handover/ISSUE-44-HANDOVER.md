# Issue #44 – Copilot Business und datenbasierte Anforderungspreise

## Ausgangsstand und geprüfte Regeln

- Issue: https://github.com/leonatwork/M365-License-Architect/issues/44
- Bearbeitet am 31.10.2026 auf Commit `dfb655aa50c48bb56f794ff2ccb23b7307987040`.
  HEAD entsprach vor Beginn dem lokalen `origin/main`; der Arbeitsbaum war sauber.
- Gelesen: der vollständige im Auftrag mitgelieferte Issue-Text einschließlich
  strukturierter Entscheidungen und ursprünglicher Beschreibung, `PRODUCT.md`,
  `README.md`, `package.json`, `.github/CODEOWNERS` sowie relevante Engine-, Daten-,
  UI- und Testdateien. Im Repository sind keine `CLAUDE.md` oder `AGENTS.md` vorhanden.
- GitHub-CLI-Zugriffe sind durch die Ausführungsregeln gesperrt. Der vollständige
  Live-Thread einschließlich zusätzlicher Kommentare, vorhandene/offene PRs und
  die Aktualität des Remote-Standes konnten deshalb nicht unabhängig geprüft werden.
  Vor Abnahme diese Informationen mit dem mitgelieferten Auftrag abgleichen.
- Die Lösung verwendet ausschließlich den vorhandenen ausgecheckten Code.
  Eine Abhängigkeit von einem offenen PR ist im lokalen Code nicht erkennbar;
  eine Remote-Prüfung bleibt offen.

## Verbindliche Kriterien und Widersprüche

Maßgeblich sind AC-1 bis AC-8 und die Entscheidungen 1A/2A/3A der strukturierten
Fassung. Die ursprüngliche Beschreibung widerspricht ihr in zwei Punkten:

1. Ursprüngliches AC-1 erlaubte O365-/F-Basen mit Copilot. Entscheidung 1A und
   strukturiertes AC-1 schließen sie weiterhin aus.
2. Ursprünglich vorgeschlagene laufzeitabhängige Beschriftungspreise werden durch
   Entscheidung 3A und strukturiertes AC-5 ersetzt: Listenpreise bleiben konstant,
   Monthly +20 % wirkt nur in der Kalkulation.

Es gibt anhand des mitgelieferten Textes keine unerfüllbaren fachlichen Kriterien.
Live-Thread-/PR-Prüfung und manueller Browsernachweis sind offene Nachweislücken.

| Kriterium | Umsetzung und automatisierter Nachweis |
| --- | --- |
| AC-1 | Business Basic/Standard/Premium verwenden `Copilot Business` (18,20 EUR), E3/E5 `M365 Copilot` (26,00 EUR); E7 enthält das Feature und bekommt kein Copilot-Add-on. Basismatrix in `test/issue-44.test.js` mit beiden Teams-Varianten und Laufzeiten; E7-Auswahl zusätzlich mit synthetischem Preis. O365/F bleiben auch bei synthetisch niedrigeren Basispreisen ausgeschlossen. |
| AC-2 | Alle vorhandenen Presets mit `adv_copilot` (aktuell Executive) sowie Marketing/Development mit zusätzlich aktiviertem Flag werden bei 50/300/301 Benutzern und beiden Laufzeiten auf Komponenten- und Gesamtkosten geprüft. Executive bis 300 Benutzer: 58,96 EUR pro Benutzer jährlich. Andere Anforderungen dürfen weiterhin eine Enterprise-Basis erfordern. |
| AC-3 | Beide Einträge in `ADDON_FEATURES` liefern `M365 Copilot`; `FEATURE_SOURCES` übernimmt die bestehenden Microsoft-Quellen. Vergleichstests prüfen gained, retained und lost gegenüber Basisplänen und E7. |
| AC-4 | Alle vier bisher festen Anforderungsbeträge werden bei Initialisierung über `LICENSE_DATA.PRICES` als Text ausgegeben, mit zwei Nachkommastellen und deutscher Formatierung. Copilot: `Microsoft 365 Copilot (ab 18,20 €)`. HTML-Test prüft alle `.req-item`-Labels auf feste Eurobeträge; VM-Test prüft auch synthetisch geänderte Katalogpreise. |
| AC-5 | VM-UI-Test prüft jährlich → monatlich → jährlich, unveränderte Beschriftungen und korrekt skalierte Empfehlungs-/Angebotssummen. |
| AC-6 | Business Copilot ist nur bei einer Business-Basis verfügbar. Tests prüfen alle drei Business-Tiers an der inklusiven 300-Grenze; Standalone bleibt ausdrücklich `None` + `M365 Copilot`. |
| AC-7 | Bei 301 Benutzern wird mit Copilot eine M365-Enterprise-Basis ohne `Copilot Business` gewählt. |
| AC-8 | `npm test` und `npm run check`: jeweils 227/227 grün. Jede geänderte bestehende Erwartung ist unten einzeln begründet. |

## Änderungen

- `src/engine.js`: Copilot-Schlüssel hängt vom Kandidaten ab; die Kombination
  übernimmt das gemeinsame Feature aus `ADDON_FEATURES`. Zulässige Business-Basen
  werden einschließlich ihres Copilot-Preises verglichen. Bestehende 300-Grenze,
  Frontline-Regeln und Gleichstandsentscheidung bleiben wirksam.
- `data/licenses.js`: beide Copilot-Varianten erhalten dieselbe Featurezuordnung.
  Quellen sind die bereits im Katalog hinterlegten offiziellen Microsoft-Seiten.
  Katalogpreise und Produkte bleiben unverändert.
- `index.html`: vier Label-IDs und einmalige Textinitialisierung aus Listenpreisen.
- `test/issue-44.test.js` wird über `test/index.js` in das QS-Gate eingebunden.
- `test/fixtures/issue-44-reference-results.js` ergänzt die aktuelle Referenzkette
  um die neue Executive-Erwartung; historische Referenzdateien bleiben erhalten.

## Einzelbegründungen geänderter Erwartungen (für den späteren PR-Text)

1. **Executive / C-Level**, neue Referenz in
   `test/fixtures/issue-44-reference-results.js`, verwendet durch
   `test/engine-pure.test.js`: bisher E5 + M365 Copilot = 58,13 + 26,00 = 84,13 EUR.
   Jetzt Business Premium + BizPrem E5 Upgrade + Teams Phone Add-on + Copilot
   Business = 19,06 + 13,00 + 8,70 + 18,20 = **58,96 EUR**. Alle angeforderten
   Features sind abgedeckt; Business ist bei der Fixture-Anzahl zulässig.
   Monatlich bleibt der Faktor 1,2 unverändert.
2. **Copilot-/Security-/Phone-Szenario**, `test/scenarios.test.js`: dieselbe
   Komponentenrechnung ergibt bei 10 Benutzern **58,96 EUR**, deshalb ist E5
   nicht mehr die günstigste Kombination. Der Test prüft zusätzlich ausdrücklich
   bei 301 Benutzern E5 + M365 Copilot = **84,13 EUR** und erhält so den Nachweis
   für den Enterprise-Break-even. Teams Phone kostet 8,70 EUR zusätzlich zur
   Business-Kombination; 50,26 EUR wäre für dieses Szenario unvollständig.
3. **Copilot mit risk/lbl ohne Phone**, `test/upgrades-e7.test.js`: bisher wurde
   das Business-Upgrade wegen Copilot generell ausgeschlossen. Bis 300 Benutzer
   ist jetzt Business Premium + BizPrem E5 Upgrade + Copilot Business =
   19,06 + 13,00 + 18,20 = **50,26 EUR** korrekt. Der bisherige Ausschluss wird
   für 301 Benutzer weiter geprüft; Frontline und Standalone bleiben ebenfalls
   in der Ausschlussmatrix. Eine explizite positive Business-Erwartung ergänzt
   den Test.

## TDD und Qualitätsnachweise

1. Vor Änderungen am Produktcode: `node --test test/issue-44.test.js`.
   Ergebnis: **14 Tests, 4 grün, 10 rot**, Exit-Code 1.
   Fachlich erwartete Fehler: drei Business-Basiswahlen, fehlendes gemeinsames
   Add-on-Feature, 300-Grenze, Kandidatenkosten, Executive-Preset, feste HTML-Preise
   und zwei fehlende datenbasierte UI-Label-Nachweise. Enterprise, O365/F-Ausschluss,
   E7 und Standalone waren bereits grün.
2. Nach Fix: alle 14 neuen Tests grün. Die zusätzliche Marketing-Preset-Prüfung
   berücksichtigt die weiterhin erforderliche Enterprise-Basis für `comp_dlp`
   gemäß vorhandenem Featurekatalog; Copilot-Variante folgt der gewählten Basis.
3. Gesamt-Gate zeigte drei bestehende, durch die neue Business-Zulässigkeit
   überholte Erwartungen; Anpassungen siehe Einzelbegründungen oben.
4. Abschließendes `npm test`: **227/227 grün**, keine übersprungenen Tests.
5. Abschließendes `npm run check`: **227/227 grün**, keine übersprungenen Tests.
   Das vorgeschriebene Check-Script führt laut `package.json` erneut `npm test` aus.
6. `git diff --check`: grün.

## UI-Reproduktion und offener manueller Nachweis

Automatisierter Nachweis mit dem bestehenden VM-/DOM-Test-Harness:

- Office, 50 Benutzer, Desktop Apps + Copilot → Business Standard + Copilot
  Business: 12,13 + 18,20 = **30,33 EUR pro Benutzer**, **1.516,50 EUR gesamt**.
- Monthly → **36,40 EUR pro Benutzer angezeigt** (intern 36,396),
  **1.819,80 EUR gesamt**. Zurück jährlich → ursprüngliche Preise.
- Copilot-Beschriftung bleibt **ab 18,20 €**; weitere Beschriftungen:
  Power Automate **14,00 €**, Teams Rooms Pro **33,70 €**, Defender Server **2,80 €**.
- Empfehlung, gespeicherte Angebotsposition und Rückkehr zur jährlichen Laufzeit
  werden geprüft.

Ein echter manueller Browsercheck konnte nicht durchgeführt werden: kein Browser
und keine Browserautomatisierung sind in der Umgebung installiert. Zur Abnahme
`index.html` lokal öffnen, obiges Szenario einstellen und die Laufzeit umschalten;
Beschriftungen, Empfehlung und Angebotsgesamtsumme visuell bestätigen.

Die Lieferung ist ein uncommitteter lokaler Diff. Es wurden keine Branches
erstellt, keine Commits angelegt und keine Push-/PR-/Merge-/Deployment-Aktionen
ausgeführt.
