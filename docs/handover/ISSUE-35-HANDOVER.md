# Issue #35 – Unbelegte Preise in UI und CSV kennzeichnen

## Grundlage und Prüfgrenzen

- Ausgangsstand: `56d941593d1bea201ecc7244ac20e1deb7e1bb5b`. `HEAD` und das lokale `origin/main` waren identisch; der Arbeitsbaum war sauber. Die Umsetzung basiert vollständig auf diesem Stand.
- Grundlage ist der im Auftrag vollständig mitgelieferte Issue-Text einschließlich strukturierter und ursprünglicher Beschreibung. Der Zugriff über `gh` ist durch die Umgebungsberechtigungen gesperrt. **Der vollständige GitHub-Kommentar-Thread, aktuelle offene PRs und die Aktualität des lokalen Remote-Refs konnten nicht verifiziert werden.** Vor einem späteren PR diese Prüfung nachholen und mögliche zusätzliche Vorgaben oder Überschneidungen abgleichen.
- Im Repository sind keine `AGENTS.md`, `CLAUDE.md` oder CONTRIBUTING-Dateien vorhanden. Berücksichtigt wurden die zusätzlichen Regeln des Auftrags, `README.md`, `PRODUCT.md`, `SECURITY.md`, `.github/CODEOWNERS`, `package.json`, bestehende Tests und das Handover zur UI-Härtung (#36).
- Aus dem geprüften Code ergibt sich keine Abhängigkeit von einem offenen PR. Der aktuelle PR-Status bleibt ungeprüft. Es wurden keine anderen PR-Stände übernommen und keine Branches erstellt oder ausgecheckt.

## Verbindliche Akzeptanzkriterien

Die strukturierte Issue-Fassung konkretisiert die ursprünglichen vier Kriterien um AC-5 und AC-6. Zwischen den bereitgestellten Fassungen besteht kein Widerspruch. Fachlich gilt eine Komponente als unbelegt, wenn `todo_source === true` ist **oder** `valid_from` fehlt. `None` ist keine bepreiste Komponente und wird ausgefiltert.

| Kriterium | Umsetzung und Nachweis | Status |
| --- | --- | --- |
| AC-1: Empfehlung und Angebotszeile zeigen einen deutlichen Hinweis samt Komponenten | Eigenes, fett gesetztes und umrandetes Hinweisfeld neben dem Preisstand sowie entsprechender Hinweis in der Plan-Zelle. Beide Renderer bestimmen die Liste aus Basis und Add-ons aktuell über `priceInfo`, auch für importierte Positionen. UI-Tests prüfen Standalone, datierte `todo_source`-Einträge, Import und Laufzeitwechsel. | Erfüllt |
| AC-2: CSV enthält den Hinweis in `PriceNote`; Import bewahrt ihn | Export ergänzt fehlende Warnungen auch bei leeren oder älteren gespeicherten Notizen. Bestehender Notiztext bleibt erhalten, gespeicherte Positionsdaten werden nicht mutiert. Der Import übernimmt die gelesene Spalte unverändert. Export–Import–Export bleibt stabil. | Erfüllt |
| AC-3: Daten- und UI-Text-Tests in `test/`; `npm test` grün | Tests in `test/data.test.js`, `test/csv.test.js` und `test/teams-ui.test.js`; bestehender Escaping-Test erweitert. `npm test`: 213/213. | Erfüllt |
| AC-4: Keine Preisänderungen | `data/licenses.js` und `src/engine.js` bleiben unverändert; keine Änderung an Preisen, Featurezuordnungen oder Empfehlungslogik. Diff gegen `origin/main` für beide Dateien leer. | Erfüllt |
| AC-5: `todo_source: true` trotz `valid_from` erkennen | `priceInfo` liefert zusätzlich `unsourced`, einschließlich `O365 E3` und `Entra Suite`. Einzel- und kombinierte Fälle sind getestet. Ein vorhandenes Datum wird weiterhin als Datum ausgegeben, ohne die Warnung zu unterdrücken. | Erfüllt |
| AC-6: Belegte Positionen ohne Badge oder Zusatz in `PriceNote` | Leere Komponentenliste ergibt unveränderte Standardnotiz bzw. unveränderte eigene Notiz. Empfehlungshinweis wird geleert und ausgeblendet; Angebotszeilen erhalten kein Warn-Markup. Tests enthalten belegte Basis, belegtes Standalone-Add-on und `None`. | Erfüllt |

Alle aus dem bereitgestellten Text ableitbaren fachlichen Kriterien sind umgesetzt. Nicht erfüllbar war ausschließlich die vorgelagerte Live-Prüfung des GitHub-Threads und der offenen PRs wegen der Zugriffssperre.

## Hinweistext und Darstellung

Wortlaut für UI und Export: **„Preisstand nicht belegt: {Komponentenliste}“**.

Beispiel: **„Preisstand nicht belegt: O365 E3, Entra Suite“**.

- Die Reihenfolge ist Basislizenz, danach betroffene Add-ons. Belegte Komponenten werden nicht aufgelistet.
- Der bisherige deutsche Wortlaut wird beibehalten; vorhandene Listenpreis-/EUR-/MwSt.-Notiz und Datumsdarstellung bleiben erhalten.
- Das Hinweisfeld nutzt bestehende Farbvariablen, Fettschrift, Rahmen und Zeilenumbruch. Die einzige Anpassung am Empfehlungsgitter platziert den neuen Hinweis unter dem Preisstand. Es gibt keine neuen Bibliotheken oder CDN-Abhängigkeiten.
- Empfehlungstext wird über `innerText` gesetzt. Komponenten im Tabellenhinweis werden mit `escapeHTML` escaped; Laufzeit- und Quelltests sichern dies ab.
- Importierte Notizen werden weder beim Import noch beim Rendern überschrieben. Erst ein erneuter Export ergänzt den aktuellen Hinweis, wenn er fehlt. Ein bereits enthaltenes vollständiges Warnsignal wird nicht doppelt angehängt.
- AC-6 bedeutet, dass für belegte Komponenten kein neuer Hinweis erzeugt wird. Vom Import gelesener eigener Notiztext wird weiterhin unverändert bewahrt.

## Testgetriebener Nachweis

1. Zuerst acht neue Tests für Daten, CSV und UI sowie die zusätzliche Rückgabeeigenschaft im vorhandenen `priceInfo`-Test ergänzt; Produktionscode noch unverändert.
2. `node --test test/data.test.js test/csv.test.js test/teams-ui.test.js` vor dem Fix: **66/74 bestanden, 8 erwartete Fehler**. Fehlende `unsourced`-Rückgabe, fehlender CSV-Hinweis für datierte `todo_source`-Einträge und fehlendes eigenes UI-Hinweisfeld waren die Fehlerursachen.
3. Danach `src/csv.js` und `index.html` angepasst. Beim ersten Grünlauf bestanden **81/83** Tests; zwei bestehende Erwartungen mussten um die neu geforderte Kennzeichnung erweitert werden:
   - Der Sonderzeichen-Rundlauf prüft weiterhin alle ursprünglichen Metadaten exakt, jetzt einschließlich des angehängten Hinweises für die synthetischen unbelegten Komponenten. Zusätzlich wird geprüft, dass Export die gespeicherte Notiz nicht mutiert.
   - Der Escaping-Test erwartet sieben statt fünf escaped Payload-Vorkommen, weil Basis und Add-on zusätzlich im neuen Hinweis erscheinen. Die Prüfung auf echtes Markup und Event-Attribute bleibt erhalten; eine explizite Hinweisprüfung kam hinzu.
4. `node --test test/data.test.js test/csv.test.js test/teams-ui.test.js test/issue-36.test.js`: **83/83 bestanden**.
5. `npm test`: **213/213 bestanden**.
6. `npm run check`: **213/213 bestanden** (`check` führt gemäß `package.json` `npm test` aus).
7. `git diff --check`: grün. Kein Diff für `data/licenses.js` und `src/engine.js` gegen den Ausgangsstand.

Die UI-Nachweise führen die tatsächlichen Inline-Renderer in Node-VMs mit DOM-Stubs aus; sie sind keine visuelle Browserprüfung. Es gab keine Produktionsdeployments oder Datenänderungen. Die Lösung liegt als uncommitteter Arbeitsbaum-Diff vor; kein Commit, Push oder PR wurde erstellt.
