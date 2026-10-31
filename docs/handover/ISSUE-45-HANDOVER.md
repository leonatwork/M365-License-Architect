# Issue #45 – Mengenarten: Raum- und Serverlizenzen nicht pro Benutzer berechnen

## Grundlage und Prüfgrenzen

- Ausgangsstand: `origin/main` `dfb655a`. Gearbeitet wurde nur auf diesem Stand; es wurden keine fremden PR-Branches verwendet.
- Verbindliche Grundlage war die strukturierte Issue-Fassung aus dem Auftrag, einschließlich der geklärten Entscheidungen: eigene Zeilen, Spalte `Unit`, je Art genau eine Zeile, Mengengrenzen wie bei Benutzern und die Alt-CSV-Regel „Menge 1, Hinweis, Benutzerpreis korrigiert“.
- Den Thread samt Kommentaren und die offenen PRs konnte ich nicht über `gh` abrufen, weil die Werkzeugberechtigungen das sperren. Weitere Kommentare und mögliche Konflikte mit offenen PRs sind deshalb **nicht geprüft**. Das muss vor dem Review nachgeholt werden.
- Im Repository gibt es keine `AGENTS.md` oder `CLAUDE.md`. Berücksichtigt wurden `README.md`, `PRODUCT.md`, `package.json`, die vorhandenen Tests und die Handover-Dokumente unter `docs/handover/`.
- Die Leitlinie aus dem Issue sieht 3 PRs vor (Daten+Engine, UI, CSV). Der Auftrag verlangte eine Umsetzung in einem Schritt. Der Diff ist so geschnitten, dass er sich bei Bedarf in genau diese 3 Teile zerlegen lässt: (1) `data/licenses.js`, `src/engine.js`; (2) `index.html`; (3) `src/csv.js`.

## Akzeptanzkriterien

| Kriterium | Umsetzung und Nachweis | Status |
| --- | --- | --- |
| AC-1: 50 Benutzer + 3 Räume | `recommend` liefert `price` ohne Teams Rooms Pro und `unitItems: [{ key, unit, quantity, price }]`. Sales Team × 50: 40,46 € × 50 + 3 × 33,70 € = 2.124,10 €. Das ist in Engine- und UI-Tests geprüft. | Erfüllt |
| AC-2: 4 Server × 2,80 € | Getestet für 1, 50, 300 und 1.000 Benutzer, jeweils in den Modi Office, Frontline und Standalone | Erfüllt |
| AC-3: Einheit je `PRICES`-Eintrag | `unit` ist `user` (Standard), `room` oder `server`. Die Beschriftungen stehen in `UNITS`. Der Datentest prüft alle Einträge und unveränderte Preise. | Erfüllt |
| AC-4: CSV verlustfrei, Alt-CSV-Migration | Neue Spalte `Unit` nach `CurrentLic`. Der Rundlauf Export → Import → Export ergibt identischen Text. Doppelte oder inkonsistente Zeilen und unbekannte Einheiten werden abgelehnt. Die Fixture `test/fixtures/issue-45-legacy.csv` erzeugt je Art eine Position mit Menge 1, Hinweis und korrigiertem Benutzerpreis. | Erfüllt |
| AC-5: Angebot, Gesamtsumme, Dashboard, Laufzeit | Eigene Zeilen „pro Raum“ / „pro Server“. Im Dashboard zählen sie zu den Add-ons. Monatlich: Gesamtsumme 2.548,92 €, Basis 1.143,60 €, Add-ons 1.405,32 €. Nach dem Zurückschalten auf jährlich sind die Positionen identisch. | Erfüllt (automatisiert) |
| AC-6: Mengenfeld 1..MAX_USERS | `type="number" min="1" max="100000" step="1"`. Die Engine klemmt wie bei der Benutzeranzahl: 0/−5/abc/leer → 1, 2,9 → 2, 100001 → 100000. | Erfüllt |
| AC-7: Benutzerempfehlung unabhängig | Für alle Presets, beide Teams-Varianten, 5/300/301 Benutzer, Standalone und Frontline sowie jährlich und monatlich sind `base`, `addons`, `price`, `features`, `alt` und `reason` mit und ohne Raum-/Serverflags identisch. | Erfüllt |
| AC-8: `npm run test` / `npm run check` | Beide jeweils **229/229** bestanden | Erfüllt |

## Fachliche Auslegung (bitte im Review bestätigen)

1. **Je Art eine tenantweite Zeile:** Wird eine Persona mit Raum-/Serverflag hinzugefügt oder aktualisiert, wird die Zeile dieser Art angelegt oder ersetzt. Das Mengenfeld wird nach dem Zurücksetzen und beim Bearbeiten mit der bereits erfassten Menge vorbelegt. So überschreibt der Standardwert 1 keine erfasste Menge. Die Zeile bleibt bestehen, wenn eine Persona entfernt wird oder das Flag beim Bearbeiten abgewählt wird. Gelöscht wird sie über ihren eigenen Entfernen-Button. Bearbeiten und Vergleich gibt es für diese Zeilen nicht.
2. **Import:** Eine Raum-/Serverzeile aus einer CSV im neuen Format ersetzt die vorhandene Zeile derselben Art. Eine aus einer Alt-CSV migrierte Zeile ist nur ein Platzhalter mit Menge 1. Sie wird nur übernommen, wenn noch keine Zeile dieser Art existiert. Andernfalls bleibt die vorhandene Menge stehen, und der Import-Hinweis nennt das.
3. **Preiskorrektur in Alt-CSV:** Der Benutzerpreis wird um den jährlichen Katalog-Listenpreis gekürzt, weil die Alt-CSV die Laufzeit nicht enthält (`PriceNote` sagt immer „jährliche Abrechnung“). Bei monatlich exportierten Alt-Dateien bleibt deshalb eine Abweichung von 20 % des Add-on-Preises. Negative Ergebnisse werden auf 0 begrenzt und markiert. Die neue Position übernimmt in der UI die aktuell gewählte Laufzeit.
4. **Alt-Zeile nur mit Raum-/Serverprodukt:** Die Benutzerzeile bleibt erhalten (Basis `None`, keine Add-ons, 0 €), damit der Persona-Name nicht verloren geht.
5. **CSV mit Spalte `Unit`:** Ein Raum-/Serverprodukt in einer Benutzerzeile wird hier abgelehnt und nicht migriert. Sonst könnte neben einer expliziten Zeile ein Duplikat entstehen.
6. **Spaltenposition:** `Unit` steht hinter `CurrentLic`. Die ersten 5 Spalten werden positionsgebunden geprüft. `TeamsVariant`, `PriceDate` und `PriceNote` bleiben am Ende.

## Angepasste bestehende Test-Erwartung

- `test/issue-30.test.js` („form mapping is DOM-free, complete …“): Die erwartete Ausgabe von `mapFormInputs` enthält zusätzlich `roomCount: 1, serverCount: 1`. Grund: Der Test prüft die *vollständige* Abbildung des Formulars. Die neuen Mengenfelder gehören dazu und werden bei fehlendem Wert wie die Benutzeranzahl auf 1 normalisiert. Die Prüfung ist damit strenger, nicht schwächer.
- Andere Fixtures oder Referenzergebnisse mussten nicht geändert werden. Kein Preset aktiviert Teams Rooms Pro oder Defender Server, und die Legacy-Nachbildung bleibt unverändert.

## Testgetriebener Nachweis

1. `test/issue-45.test.js` und die Alt-CSV-Fixture zuerst angelegt und in `test/index.js` registriert.
2. Vor dem Fix: `node --test test/issue-45.test.js` → **0/14 bestanden**. Alle Fehler waren erwartet: `UNITS` und `unit` fehlen, Raum/Server stehen in `addons` und `price`, `unitItems` ist undefiniert, Mengenfelder fehlen, die Spalte `Unit` fehlt, `migratedUnits` ist undefiniert.
3. Nach der Umsetzung schlug wie erwartet nur `issue-30` (Mapping) fehl. Die Erwartung wurde wie oben begründet angepasst.
4. Nach dem Review sind 2 UI-Tests dazugekommen: Import im neuen Format ersetzt die Zeile; migrierte Zeile übernimmt die Laufzeit. Der Alt-Import-Test erwartet jetzt, dass die vorhandene Menge erhalten bleibt. Dazu kamen Prüfungen für den bereinigten Belegvermerk und das Begrenzen auf 0.
5. `npm test` und `npm run check`: jeweils **229/229** bestanden.

## Ausstehender manueller Browser-Test

In der Umgebung ist kein Browser verfügbar. Die Abläufe wurden in der Node-VM mit dem echten Inline-Script geprüft. Einen Sichttest ersetzt das nicht. Vor dem Merge bitte prüfen:

1. Preset „Sales Team“, Anzahl 50, „Teams Rooms Pro“ aktivieren. Das Mengenfeld „Anzahl Räume“ erscheint. 3 eintragen. Die Empfehlung zeigt 40,46 € je Benutzer und den Hinweis „Teams Rooms Pro: 3 Räume × €33.70“.
2. Zum Angebot hinzufügen. Erwartet werden 2 Zeilen: Sales Team mit 2.023,00 € und Teams Rooms Pro mit 3 Räumen, 101,10 €, „pro Raum“. Gesamtsumme 2.124,10 €, Dashboard Basis 953,00 € / Add-ons 1.171,10 €.
3. Auf monatlich umschalten: 2.548,92 €. Zurück auf jährlich: 2.124,10 €.
4. Defender Server mit 4 Servern ergänzen: eigene Zeile über 11,20 €.
5. CSV exportieren und erneut importieren. Die Zeilen und Mengen bleiben gleich, es gibt keine doppelte Raumzeile.
6. `test/fixtures/issue-45-legacy.csv` importieren. Der Hinweis nennt Menge 1, die Benutzerpreise sind korrigiert.
7. Layout der Mengenfelder auf Desktop und auf schmalem Viewport (≤ 560 px) prüfen.
