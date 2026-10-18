# Issue #15 – Paket 2c-1: Business-Premium-Upgrades und E7

## Grundlage und Lieferumfang

Vollständige Threads von [#15](https://github.com/leonatwork/M365-License-Architect/issues/15) und [#8](https://github.com/leonatwork/M365-License-Architect/issues/8) einschließlich aller Kommentare geprüft. Verbindlich ist der [letzte Freigabezuschnitt](https://github.com/leonatwork/M365-License-Architect/issues/15#issuecomment-6254294105) nach [Antwort 1B](https://github.com/leonatwork/M365-License-Architect/issues/15#issuecomment-6254261512): zuerst Daten/Engine, UI/CSV später. Für Preise und Pakete gilt die [Umfangserweiterung aus #8](https://github.com/leonatwork/M365-License-Architect/issues/8#issuecomment-6252606154).

Ausgangsstand: `HEAD = origin/main = 437cec6`, auch mit dem Remote-main abgeglichen. Keine offenen PRs; #12 und #14 sind gemergt. Beschreibung, Kommentare, Reviews und Inline-Befunde von #14 geprüft. README, Issue-Formular und die zusätzlichen Aufgabenregeln gelesen; keine `CLAUDE.md` oder `AGENTS.md` im Repository oder den übergeordneten Verzeichnissen vorhanden. Die Angaben „keine Tests vorhanden“ sind durch den aktuellen Stand überholt: Node-Tests und `npm run check` existieren.

Die Lösung benötigt keinen offenen PR. Paket 2c-2 (Teams-Auswahl, Preisstand-Anzeige, CSV-Import/-Export/Roundtrip) folgt laut Entscheidung nach dem Merge von 2c-1 auf frischem main; ob als Folge-Issue oder weiterer Lauf, entscheidet Leon. Dieses Handover ist zugleich der vorbereitete Review-/PR-Text.

## Akzeptanzkriterien und Nachweise

| Kriterium | Umsetzung / Test |
|---|---|
| AC-1 | `teamsVariant` bestimmt Basispreis, Empfehlung und Ist-Vergleich; Upgrades behalten denselben Add-on-Preis. Ohne Teams-Bedarf kein Teams-Add-on, im Paket keine Doppelzählung. Bei explizitem Teams-/Phone-Bedarf Teams EWR genau einmal (Widerspruch unten). Beide Varianten einschließlich E7, Jahres-/Monatsfaktor und synthetischer Variantengrenze getestet. |
| AC-3 | Drei Upgrades mit `requires: 'Business Premium'`, EUR-Preisen 8,70 / 8,70 / 13,00. Bundle gegen 17,40 Einzelpreise; bei synthetisch teurerem Bundle gewinnen die Einzelprodukte. Quellen und datierte Zuordnungen in `FEATURE_SOURCES`, Inhalte getrennt in `ADDON_FEATURES`. Business-Limit 300, Frontline-, Standalone-, Copilot- und Intune-Zulässigkeit geprüft. |
| AC-4 | E7 mit 91,92 / 84,51, allen modellierten E5-Inhalten plus Copilot, Agent 365 und Entra Suite. Copilot-Anlass ist die bestehende Anforderung, keine neuen Auswahlfelder. Vergleich gegen alle zulässigen Kombinationen, kein Copilot-Doppelpreis; E7 nur bei strikt niedrigerem Gesamtpreis. Positive Fälle mit synthetischem Preis, Gleichstand, kein Anlass sowie E3 als billigere Alternative getestet. Positiver Fall mit echten Listenpreisen nicht erfüllbar (unten). |
| AC-5 | Dedizierte Upgrade-/E7-Szenarien und alle acht Persona-Presets jährlich/monatlich geprüft. Historische 2025- und Paket-1-Fixtures bleiben unverändert; eine kleine Folge-Fixture dokumentiert den neuen Finance-Preis. |
| AC-6 | Ausschließlich EUR-Rechenwerte, USD-Referenzfelder beeinflussen die neuen Kombinationen nicht. Keine Test-Netzwerkzugriffe oder neuen Abhängigkeiten. Vollständige `todo_source`-Liste unten. |
| AC-7 | Defender und Purview jeweils von 10,00 auf 8,70, `valid_from: '2026-07-01'`; Datentest prüft Quelle, Datum und Voraussetzung. |

Die Engine erweitert den vorhandenen Vergleichspfad auf Security, Compliance und Copilot. Jeder Kandidat erhält zunächst seine erforderlichen Add-ons; danach wird die Feature-Abdeckung geprüft. Enthaltene Leistungen werden nicht zusätzlich berechnet. Der Vergleich erfolgt vor dem Laufzeitfaktor und mit strikt kleinerem Preis (kein Upsell bei Gleichstand). Intune-/Frontline-/Copilot-Basisregeln aus main bleiben die Zulässigkeitsgrundlage.

## Preis- und Zuordnungsänderungen mit Quellen

EUR pro Benutzer/Monat, zzgl. MwSt., Jahresabonnement mit jährlicher Abrechnung. Quellen am **18.10.2026** direkt abgerufen (`source_checked`); `valid_from: '2026-07-01'` folgt dem verbindlichen Datenstand des Issues, nicht einem auf der Produktseite ausgewiesenen historischen Inkrafttretensdatum.

| Eintrag | Alt → neu | Quelle / Zuordnung |
|---|---|---|
| Defender Suite for BizPrem | 10,00 → 8,70 | [Microsoft-Add-on-Preise](https://www.microsoft.com/de-de/security/pricing/small-medium-business/security-add-on-plans); [Defender FAQ 5/6](https://www.microsoft.com/de-de/security/small-medium-business/microsoft-defender-suite-business-premium) bestätigt Entra ID P2, Defender XDR und Defender for Office 365 P2. |
| Purview Suite for BizPrem | 10,00 → 8,70 | [Microsoft-Add-on-Preise und Vergleich](https://www.microsoft.com/de-de/security/pricing/small-medium-business/security-add-on-plans) bestätigt automatische Kennzeichnung, erweiterte DLP und Premium-eDiscovery/Audit; im bestehenden Modell `Comp E5`. |
| BizPrem E5 Upgrade | 15,00 → 13,00 | [Microsoft-Add-on-Preise](https://www.microsoft.com/de-de/security/pricing/small-medium-business/security-add-on-plans): gemeinsames Defender-/Purview-Paket, Business Premium erforderlich. Bestehender Schlüssel bleibt kompatibel, Inhalte sind die Vereinigung der zwei Upgrades, keine volle E5-Suite. |
| M365 E7 | neu: 91,92 / 84,51 ohne Teams | [Microsoft-Enterprise-Preise](https://www.microsoft.com/de-de/microsoft-365/enterprise/microsoft-365-plans-and-pricing) und [E7-Produktseite](https://www.microsoft.com/de-de/microsoft-365/enterprise/e7): E5 plus Microsoft 365 Copilot, Agent 365 und Microsoft Entra Suite. |

Die neuen Zuordnungen sind im bestehenden groben Featuremodell belegt. Insbesondere `Def XDR` umfasst weiterhin den Security-Bedarf `def2`/`casb`, `Comp E5` den Bedarf `lbl`/`edisc`. Keine neuen Anforderungen für Entra Suite oder Agent 365, keine neuen Einzelprodukte. Enterprise-/Frontline-Security- und Compliance-Add-ons erhalten im Vergleich die bisher implizit vorausgesetzte Featureabdeckung (Entra P2/Def XDR bzw. Comp E5); deren unbestätigte Bestandsquellen/-preise bleiben als `todo_source` markiert.

## Nicht erfüllbare oder widersprüchliche Kriterien

1. **E7 gewinnt mit den verbindlichen Listenpreisen nicht:** E5 + Copilot kostet 58,13 + 26,00 = **84,13**, E7 **91,92** (7,79 mehr). Ohne Teams: 50,71 + 26,00 = **76,71**, E7 **84,51** (7,80 mehr). Alle derzeit auswählbaren Anforderungen sind über E5 + Copilot erfüllbar. Ohne neue Entra-/Agent-Anforderungen oder andere belegte Preise ist ein echter positiver E7-Auswahlfall mit AC-4 „günstigste zulässige Lösung“ unvereinbar. Deshalb keine erzwungene Empfehlung. Tests mit synthetischem Copilot-Preis 40,00 belegen den echten Preisvergleich; Produktionspreise werden dafür nicht verändert.
2. **AC-1 „ohne Teams kein Add-on“ versus expliziter Teams-Bedarf:** #8 verlangt Teams EWR 7,41 als Add-on zur Suite ohne Teams; main enthält explizite Regressionstests für `teams: true` und `phone: true`. Die wörtliche pauschale Aussage in #15 ist damit widersprüchlich. Umsetzung: ohne Teams-Bedarf nur `price_no_teams`; bei explizitem Bedarf genau ein Teams-EWR-Add-on. Bestehende Fixtures/Regressionen bleiben gültig.
3. **Historische Fixture versus Preisänderung:** Finance enthält das Bundle und muss von **34,06 auf 32,06 EUR** sinken (19,06 + 13,00 statt +15,00). Die unveränderte Juli-Fixture dokumentiert Paket 1; `upgrades-e7-reference-results.js` überschreibt genau diesen Erwartungswert für Paket 2c-1. Alle anderen Preset-Basen, Add-ons und Preise bleiben gleich. Der Szenariotest für E5 erwartet jetzt den allgemeinen deutschen Grund „günstigste“ statt „günstiger“, da derselbe Vergleichspfad auch Upgrades und E7 erklärt.

## Vollständige aktuelle `todo_source: true`-Liste

| Eintrag | EUR/Monat | Status |
|---|---:|---|
| O365 E3 | 26,27 / 18,85 ohne Teams | abgeleitete Zuordnung aus #8 |
| Entra ID P2 | 8,40 | unbestätigter Bestandswert |
| M365 E5 Security Add-on | 11,20 | unbestätigter Bestandswert / grobe bestehende Zuordnung |
| M365 E5 Compliance Add-on | 11,20 | unbestätigter Bestandswert / grobe bestehende Zuordnung |
| M365 F5 Security Add-on | 8,00 | unbestätigter Bestandswert / grobe bestehende Zuordnung |
| M365 F5 Compliance Add-on | 8,00 | unbestätigter Bestandswert / grobe bestehende Zuordnung |
| Defender for Business Servers | 2,80 | unveränderter Bestandswert |
| Intune Suite Add-on | 9,40 | unbestätigter Bestandswert |
| EPM Add-on | 5,50 | unbestätigter Bestandswert |
| Remote Help Add-on | 5,50 | unbestätigter Bestandswert |
| Visio Plan 2 | 12,70 | unbestätigter Bestandswert |
| Project Plan 3 | 25,30 | unbestätigter Bestandswert |
| Power Automate Premium | 14,00 | unbestätigter Bestandswert |
| Teams Rooms Pro | 33,70 | unbestätigter Bestandswert |

Die drei Business-Premium-Upgrades entfallen aus dieser Liste. E7 ist belegt; keine neue Quellenlücke. Unbelegte Bestandswerte behalten `valid_from: null`, der Preisvergleich nutzt damit weiterhin einen dokumentierten Mischstand.

## Testgetriebener Nachweis und QS

- Ausgangsstand: `npm test`, **60/60 grün**.
- Vor Codeänderungen: `node --test test/upgrades-e7.test.js`, **10/12 rot**. Korrekte Ursachen: Preise 10,00 statt 8,70 bzw. 15,00 statt 13,00; fehlende Upgrade-Featureabdeckung; E3 wird als günstigere Alternative übergangen; E7 wird selbst beim synthetisch gerechtfertigten Bedarf nicht berücksichtigt. Zwei Negativ-/USD-Tests bereits grün.
- Nach Daten-/Engine-Fix: **12/12 grün**. Gesamtlauf identifiziert bewusst anzupassenden Finance-Preis und den geänderten Begründungstext. Zusätzliches Szenario prüft die Teams-Variantengrenze und E7 gegen die günstigere E3-Kombination.
- Abschließende QS: `npm run check` (führt `npm test` aus), **73/73 grün**, davon 13 neue Tests. `git diff --check` und `node --check` für Daten, Engine und neue Szenariotests erfolgreich. Der synthetische Variantengrenztest wurde rechnerisch auf 27,00 korrigiert: Business Premium + 27,00 = 46,06 / 43,28, E3 + Security = 48,98 / 41,56; nur ohne Teams gewinnt E3.

### Abgrenzung der vorhandenen Review-Befunde aus #14

Die Inline-Befunde zu Defender-for-Office-only-Basisauswahl, „No Teams“ neben enthaltener Phone-Lizenz und dem vom Hauptpfad übernommenen `alt` sind im Ausgangsstand vorhanden. Eine allgemeine Überarbeitung dieser Regeln bzw. des Alternativvergleichs gehört zur geplanten Konsistenzprüfung #13. Insbesondere `alt`/`altPrice` bleibt ein Basislizenzvergleich, kein preisberechneter zweitbester Kandidat inklusive Add-ons. Die neue günstigste Empfehlung und deren Gesamtpreis werden unabhängig davon mit allen Anforderungen berechnet. E7 erbt die bestehende E5-Phone-Lizenz und setzt bei aktivem Phone-Bedarf Teams voraus; die Tests prüfen das ohne zusätzliches Phone-Add-on.

Änderungen lokal und uncommitted. Kein Branch erstellt, Commit, Push, PR, Merge oder Deployment ausgeführt.
