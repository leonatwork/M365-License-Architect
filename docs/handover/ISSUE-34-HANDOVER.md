# Issue #34 – Edit-Index nach Entfernen konsistent halten

## Ausgangsstand und Prüfgrenzen

- Ausgangscommit: `9ea370fb7355ad938cc6cc5fc143775e7540b01b`, identisch mit dem lokalen `origin/main`; der Arbeitsbaum war sauber.
- Grundlage ist der vollständige im Auftrag bereitgestellte Issue-Text einschließlich der strukturierten Akzeptanzkriterien. Der Versuch, den GitHub-Thread samt Kommentaren und offene PRs über `gh` abzurufen, wurde durch die Werkzeugberechtigungen blockiert. Neuere Kommentare, offene PR-Abhängigkeiten und der aktuelle Remote-Stand sind nicht verifiziert. Diese Prüfungen müssen vor Veröffentlichung nachgeholt werden; die entsprechenden Prozessanforderungen konnten hier nicht vollständig erfüllt werden.
- Im Repository sind keine `AGENTS.md`, `CLAUDE.md` oder `CONTRIBUTING` vorhanden. Übergeordnete Verzeichnisse konnten wegen der Zugriffsbeschränkung nicht auf zusätzliche Regeln geprüft werden. `README.md`, `PRODUCT.md`, `package.json`, vorhandene Tests und die zusätzlichen Regeln des Auftrags wurden berücksichtigt.
- Die Umsetzung basiert ausschließlich auf dem ausgecheckten Stand. Es wurden keine Branches erstellt oder gewechselt, keine fremden PR-Stände übernommen und keine Commits, Pushes, PR-Erstellung, Merges oder Deployments ausgeführt.

## Verbindliche Akzeptanzkriterien

| Kriterium | Umsetzung und Nachweis |
| --- | --- |
| AC-1: Bearbeitete Position entfernen beendet Edit-Modus und setzt Formular/Button zurück; davor verschiebt den Index um −1; dahinter lässt ihn unverändert | `removePersona(idx)` nutzt beim Entfernen der bearbeiteten Position `resetForm()`, verschiebt andernfalls bei einer davor liegenden Position den Index und rendert die Tabelle neu. Drei VM-/DOM-nahe Tests führen die gerenderten Remove-Handler aus; sie prüfen Formularzustand, Desktop-/Mobile-Buttons, Tabellenmarkierung und die Identität der beim nächsten Speichern geänderten Persona. |
| AC-2: Benannte testbare Remove-Funktion; kein Inline-`splice`; Tests im bestehenden Muster und Testeinstieg registriert | `index.html` enthält `removePersona(idx)` und der Remove-Button ruft ausschließlich diese Funktion auf. `test/issue-34.test.js` verwendet wie `test/teams-ui.test.js` den echten Inline-App-Code mit lokalen Daten-/Engine-/CSV-Modulen in einer Node-VM und DOM-Stubs; Registrierung in `test/index.js`. Ein Test prüft Funktion und gerenderten Handler. |
| AC-3: Update nur bei gültigem Index, sonst anhängen und Edit-Modus zurücksetzen | `addToQuote()` verlangt einen ganzzahligen Index mit `0 <= editingIndex < quoteItems.length`. Sonst wird per `push` angehängt; der bestehende anschließende `resetForm()` setzt `editingIndex` auf −1. Sechs Fälle prüfen Array-Länge, unveränderte vorhandene Einträge, neue Persona, lückenlose Array-Schlüssel und Formular-/Button-Reset. |
| AC-4: `npm test` und `npm run check` grün | Beide Befehle bestanden mit jeweils 136/136 Tests. |

### Auslegung und Widersprüche

- Für einen gültigen Array-Index ist zusätzlich zur im Issue genannten Bereichsprüfung Ganzzahligkeit erforderlich. Nichtganzzahlige Werte würden sonst Eigenschaften wie `quoteItems[0.5]` erzeugen, statt eine Persona zu aktualisieren.
- Die allgemeine Vorgabe deutscher UI-Texte steht beim Button im Konflikt mit dem ausdrücklich verlangten Label `ADD TO QUOTE`. Für diesen Fix gilt die konkrete AC-1-Vorgabe; das bestehende Label wird wiederhergestellt und auf Desktop und Mobile geprüft. Neue UI-Texte wurden nicht eingeführt.
- Alle fachlichen AC des bereitgestellten Issue-Texts sind erfüllt. Weitere Kriterien oder Abhängigkeiten aus nicht abrufbaren Kommentaren/offenen PRs können nicht beurteilt werden; aus dem lokalen Code ergibt sich keine benötigte PR-Abhängigkeit.

## Testgetriebener Nachweis

1. Zuerst ausschließlich `test/issue-34.test.js` und dessen Registrierung ergänzt.
2. Vor dem Fix: `node --test test/issue-34.test.js` – 10 Tests, 4 bestanden, 6 erwartete Fehler:
   - Entfernen der bearbeiteten Position: `editingIndex` bleibt 1 statt −1.
   - Entfernen davor: `editingIndex` bleibt 1 statt 0.
   - Benannte `removePersona`-Funktion fehlt.
   - Index `quoteItems.length + 3` erzeugt Array-Länge 7 statt 4 und damit Lücken.
   - Index `0.5` bzw. `Infinity` erzeugt eine Array-Eigenschaft, statt anzuhängen; Länge bleibt 3 statt 4.
   - Entfernen dahinter sowie Speichern mit Index gleich Array-Länge, −2 und `NaN` waren bereits korrekt und bleiben als Regressionen abgesichert.
3. Danach den Produktionsfix in `index.html` implementiert.
4. Nach Fix: `node --test test/issue-34.test.js` – 10/10 bestanden.
5. `npm test` und `npm run check` – jeweils 136/136 bestanden, keine abgeschwächten bestehenden Tests.
6. Diff-Review und `git diff --check` ohne Befund. Änderungen betreffen `index.html`, `test/issue-34.test.js`, `test/index.js` und dieses Handover; keine neuen Abhängigkeiten.

## Manuelle Review-Schritte

1. Drei verschiedene Personas hinzufügen und die zweite bearbeiten. Die erste entfernen, den Namen ändern und speichern: Es wird weiterhin die ursprünglich zweite Persona aktualisiert, die dritte bleibt erhalten.
2. Die zweite bearbeiten und die dritte entfernen: Formular und Edit-Modus bleiben erhalten; Speichern aktualisiert die zweite Persona.
3. Eine bearbeitete Persona entfernen: Formular und Anforderungen werden auf Standardwerte zurückgesetzt, beide Aktionsbuttons zeigen `ADD TO QUOTE`. Der nächste Speichervorgang hängt eine neue Persona an.

Ein Browser-Sichttest wurde nicht durchgeführt. Die automatisierten Tests führen die tatsächlichen App-Funktionen und gerenderten Remove-Handler in der Node-VM aus.
