# Issue #8 – Paket 1: Preise und Regeln

## Lieferumfang und Akzeptanz

Grundlage: vollständiger [Issue-Thread](https://github.com/leonatwork/M365-License-Architect/issues/8), insbesondere [EUR-Tabelle](https://github.com/leonatwork/M365-License-Architect/issues/8#issuecomment-6252571937) und [abschließender Paket-1-Zuschnitt](https://github.com/leonatwork/M365-License-Architect/issues/8#issuecomment-6252674597).
Ausgangsstand: `origin/main`, Commit `3cb1fda`; bei Prüfung keine offenen PRs. Repository-Regeln: README und Issue-Formular; keine CLAUDE.md/AGENTS.md vorhanden.

- **AC-1:** Geänderte Preise haben Microsoft-URL und `valid_from: '2026-07-01'`. Geänderte Paketzuordnungen haben separat `FEATURE_SOURCES` mit Quelle und Datum; Test vergleicht gegen die historische Fixture.
- **AC-2:** Remote Help, Advanced Analytics, Intune Plan 2 und Defender for Office 365 P1 in E3; E5 zusätzlich EPM, EAM und Cloud PKI. Zehn einzelne Tests prüfen die enthaltenen Leistungen ohne zusätzliche Add-ons. Office 365 E3 erhält ebenfalls das offiziell dokumentierte Defender-for-Office-P1-Update. Defender for Endpoint und Defender for Office werden getrennt modelliert.
- **AC-3:** Phone allein löst kein Security-Upgrade aus. Für Phone werden zulässige Basen mit sämtlichen erforderlichen Add-ons verglichen; die Zulässigkeit folgt denselben Regeln wie der Hauptpfad (`isEligibleBase`): Business bis 300 Benutzer, F-SKUs nur Frontline, Frontline nur F-SKU oder M365 Enterprise, Copilot und Intune-Suite-Add-ons nur auf M365 E3/E5, erweiterte Security/Compliance nur auf M365 oder Business Premium. E5 wird nur bei niedrigerem Gesamtpreis gewählt; Gleichstand führt nicht zum E5-Upsell. Vergleich vor Anwendung des Laufzeitfaktors verhindert Rundungs-Upsells. Externe Produkte bleiben erhalten, enthaltene Intune-/Phone-Leistungen entfallen als Add-on.
- **AC-4:** Jede Suite hat mit-/ohne-Teams-Preis. Engine-Feld `teamsVariant`: `included` (Standard auch bei fehlendem Feld), `no_teams` (EWR). Die Variante bestimmt Empfehlung sowie Ist-/Alternativvergleich. `included` hängt nie ein Teams-Add-on an. `no_teams` rechnet mit `price_no_teams`; wird Teams benötigt (`teams: true` oder `phone: true`, da Teams Phone Teams voraussetzt), kommt genau einmal das Add-on Teams EWR 7,41 hinzu, sonst entfällt „Teams Collaboration“ („No Teams“). Teams EWR ersetzt alle bisherigen Teams-Tierpreise. 30,36 + 7,41 = 37,77; Abweichung zu 37,78 ist 0,01 EUR.
- **AC-7:** Vollständige `todo_source`-Liste unten; Tests grün.
- **AC-8:** Nur EUR-Rechenwerte. Tests injizieren abweichende USD-Referenzwerte und prüfen unveränderte Empfehlung und Vergleich.
- **AC-5/AC-6:** Laut verbindlicher Aufteilung Paket 2: UI-Auswahl, Preisstand in UI/CSV, Import/Roundtrip, neue Business-Premium-Upgradepreise/-regeln und E7. Dieses Issue ist mit Paket 1 noch nicht vollständig abgeschlossen. Paket 2 setzt den gemergten Paket-1-Stand auf main voraus und muss von dort starten.

## PR-Text: Preisänderungen

EUR pro Benutzer/Monat, zzgl. MwSt., Jahresabonnement mit jährlicher Abrechnung. Keine Währungsumrechnung. Die vom Inhaber belegte EUR-Tabelle gilt als Preisnachweis. Stand aller geänderten Preise: 01.07.2026.

| Produkt | Altpreis im Modell | Neu mit Teams | Neu ohne Teams | Microsoft-Quelle |
|---|---:|---:|---:|---|
| M365 F1 | 1,60 | 2,60 | 2,16 | [Frontline](https://www.microsoft.com/de-de/microsoft-365/enterprise/frontline-plans-and-pricing) |
| M365 F3 | 7,00 | 8,66 | 7,73 | [Frontline](https://www.microsoft.com/de-de/microsoft-365/enterprise/frontline-plans-and-pricing) |
| Business Basic | 4,60 | 6,07 | 4,67 | [Business](https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-plans-and-pricing) |
| Business Standard | 9,70 | 12,13 | 9,34 | [Standard](https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-business-standard) |
| Business Premium | 18,60 | 19,06 | 16,28 | [Premium](https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-business-premium) |
| O365 E1 | 7,40 | 8,66 | 5,88 | [E1](https://www.microsoft.com/de-de/microsoft-365/enterprise/office-365-e1) |
| O365 E3 | 23,10 | 26,27 | 18,85 | [E1-Vergleichsansicht](https://www.microsoft.com/de-de/microsoft-365/enterprise/office-365-e1), abgeleitet, `todo_source` |
| O365 E5 | neu | 41,42 | 34,01 | [Office-Vergleich](https://www.microsoft.com/de-de/microsoft-365/enterprise/office-365-e3) |
| M365 E3 | 29,70 | 37,78 | 30,36 | [Enterprise](https://www.microsoft.com/de-de/microsoft-365/enterprise/microsoft-365-plans-and-pricing) |
| M365 E5 | 51,70 | 58,13 | 50,71 | [Enterprise](https://www.microsoft.com/de-de/microsoft-365/enterprise/microsoft-365-plans-and-pricing) |

| Zusatzprodukt | Alt → neu | Microsoft-Quelle |
|---|---|---|
| Teams EWR | ersetzt Teams_ME3/ME5 je 8,00 und übrige alte Teams-Tierpreise → 7,41 | [Enterprise](https://www.microsoft.com/de-de/microsoft-365/enterprise/microsoft-365-plans-and-pricing) |
| Teams Phone Add-on | neu → 8,70 | [Business](https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-plans-and-pricing) |
| M365 Copilot | 30,00 → 26,00 | [Enterprise](https://www.microsoft.com/de-de/microsoft-365/enterprise/microsoft-365-plans-and-pricing) |
| Copilot Business | neu → 18,20 | [Business](https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-plans-and-pricing) |
| Apps for Business | neu → 11,00 | [Business](https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-plans-and-pricing) |
| Apps for Enterprise | neu → 15,40 | [Frontline](https://www.microsoft.com/de-de/microsoft-365/enterprise/frontline-plans-and-pricing) |

Copilot-Business-Aktion 15,60 bis 31.12.2026 nur als Codekommentar. Auswahl von Copilot Business und eine breitere Copilot-Basisoptimierung werden durch Paket 1 nicht eingeführt.

## Quellen und nicht belegbare Kriterien

[Microsoft-Paketänderungen](https://www.microsoft.com/en-us/licensing/news/2026-m365-packaging-pricing-updates) wurden abgerufen und bestätigen die E3-/E5-Zuordnungen. Microsoft beschreibt einen Rollout ab Juni bis 01.08.2026; das Datenmodell nutzt den im Issue verbindlich verlangten Stand 01.07.2026 und modelliert keine tenantabhängige Freischaltung.
[Microsoft Intune](https://www.microsoft.com/en-us/security/business/microsoft-intune-pricing) bestätigt die Inhalte der Suite und die neuen enthaltenen Leistungen. USD-Seitenwerte werden nicht übernommen.

Für Intune Plan 2, EAM, Cloud PKI und Advanced Analytics existiert auf main **kein bisheriger Einzelpreis**. „Unverändert lassen“ ist für diese Einzelprodukte daher nicht umsetzbar. Statt erfundener Nullpreise werden die Funktionen modelliert und bei fehlender Abdeckung über die bestehende Intune Suite (unbestätigter EUR-Bestandswert) erfüllt. Neue Einzelpreis-Einträge können nach Beleg ergänzt werden. EPM/Remote Help behalten ihre bestehenden Einzelpreise.

### Vollständige `todo_source: true`-Liste

| Eintrag | EUR/Monat | Status |
|---|---:|---|
| O365 E3 | 26,27 / 18,85 ohne Teams | neue Tabellenwerte, Zuordnung abgeleitet |
| Entra ID P2 | 8,40 | unveränderter Bestandswert |
| M365 E5 Security Add-on | 11,20 | unveränderter Bestandswert |
| M365 E5 Compliance Add-on | 11,20 | unveränderter Bestandswert |
| M365 F5 Security Add-on | 8,00 | unveränderter Bestandswert |
| M365 F5 Compliance Add-on | 8,00 | unveränderter Bestandswert |
| Defender for Business Servers | 2,80 | unveränderter Bestandswert, keine fachliche Erweiterung |
| Intune Suite Add-on | 9,40 | unveränderter Bestandswert |
| EPM Add-on | 5,50 | unveränderter Bestandswert |
| Remote Help Add-on | 5,50 | unveränderter Bestandswert |
| Visio Plan 2 | 12,70 | unveränderter Bestandswert |
| Project Plan 3 | 25,30 | unveränderter Bestandswert |
| Power Automate Premium | 14,00 | unveränderter Bestandswert |
| Teams Rooms Pro | 33,70 | unveränderter Bestandswert |
| Defender Suite for BizPrem | 10,00 | bisheriger Wert, Aktualisierung in Paket 2 |
| Purview Suite for BizPrem | 10,00 | bisheriger Wert, Aktualisierung in Paket 2 |
| BizPrem E5 Upgrade | 15,00 | bisheriger Wert, Aktualisierung in Paket 2 |

Unbestätigte Bestandswerte behalten `valid_from: null`: Sie werden nicht als bestätigte Juli-Preise ausgegeben. Break-even nutzt damit weiterhin einen transparent dokumentierten Mischstand.

## Testnachweis und bewusste Fixture-Anpassungen

- Ausgangsstand: `npm test`, 37/37 grün.
- Vor Produktionsänderungen: `node --test test/july-2026.test.js`, 16/17 rot; insbesondere #5 mit tatsächlicher Basis **M365 E5** statt **Business Basic**, sowie Frontline-Fehlsprung und fehlende Paketinhalte. USD-Test bereits grün.
- Nach Fix: alle neuen Tests grün; zusätzliche Prüfungen für SMB-/Windows-/DLP-Zulässigkeit und Entfall enthaltener Intune-Add-ons beim E5-Break-even.
- Die bisherige Empfehlungsanzeige blendete alle Namen mit „Teams“ aus und würde damit das neue Phone-Add-on verbergen. Ein weiterer Regressionstest war vor dem einzeiligen Rendering-Fix rot. Die Empfehlung zeigt das Phone-Add-on jetzt an.
- Nacharbeit Review-Befunde: Zwei Regressionstests in `test/july-2026.test.js` (Teams EWR in der EWR-Variante; Zulässigkeitsregeln im Phone-Pfad) und die erweiterte Teams-Tier-Prüfung in `test/scenarios.test.js` waren vor dem Fix rot (11 Fehlschläge), danach grün.
- Abschließende QS: `npm test` und `npm run check`, jeweils **60/60 Tests grün**. Die neuen Regressionstests werden über `test/index.js` geladen. `git diff --check` sowie `node --check data/licenses.js` und `node --check src/engine.js` erfolgreich.
- Historische `legacy-constants`, `legacy-recalc` und `legacy-reference-results` bleiben eingefroren und werden weiter gegen die alte Berechnung geprüft. Die neue, manuell nachvollziehbare Fixture `july-2026-reference-results.js` ersetzt den Altvergleich für die aktuelle Engine (jährlich/monatlich, alle acht Presets).
- Begründete Szenarioänderungen: Teams ist im Suitepreis enthalten; Phone allein hebt nicht auf E5; Remote Help entfällt bei E3 und EPM bei E5. Intune-Bundle-Vergleich wird im Standalone-Szenario geprüft, wo beide Einzel-Add-ons tatsächlich gebraucht werden. Projekt-/Visio-/Copilot-Zusätze bleiben erhalten.

Lokale Änderungen sind uncommitted. Kein Commit, Push oder PR erstellt.
