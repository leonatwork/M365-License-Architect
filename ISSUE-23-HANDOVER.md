# Issue #23 – Intune-Einzelprodukte und Enterprise-Suiten

Vorbereiteter Review-/PR-Text für [#23](https://github.com/leonatwork/M365-License-Architect/issues/23).

## Grundlage und Lieferstand

- Vollständige Beschreibung und alle fünf Kommentare gelesen. Verbindlich: Maintainer-Korrektur zur Plan-1-Voraussetzung, Entscheidung **1B / 2A / 3A** und abschließender Freigabezuschnitt mit AC-1 bis AC-8.
- Ausgangsstand sauber: `HEAD = origin/main = 6ada21668d9bb7f54d1771f77e60cb77420aa4ea`; über GitHub gegen aktuellen main abgeglichen. Ausgecheckten Branch beibehalten, keinen Branch erstellt oder gewechselt.
- README, PRODUCT.md, Issue-Formular und Handover #8/#15 geprüft. Keine CLAUDE.md oder AGENTS.md im Repository oder den übergeordneten Verzeichnissen vorhanden. Die mitgelieferte Angabe „keine Tests“ ist überholt: `npm test` und `npm run check` existieren.
- Offene PRs #20, #22 und #24 anhand Beschreibungen und Dateilisten geprüft. #22 berührt `data/licenses.js` und `test/index.js`: möglicher späterer Merge-Konflikt, **keine technische Abhängigkeit**. Keine Änderungen dieser PRs übernommen.
- Lokale, uncommittete Lösung. Branch-/PR-Erstellung aus AC-8 ist durch die abschließende Aufgabenanweisung ausdrücklich ausgeschlossen; dieses Dokument liefert den PR-Text. Kein Commit, Push, PR, Merge oder Deployment.

## Umsetzung und Akzeptanzkriterien

| AC | Nachweis |
|---|---|
| 1 | IT Administrator: Business Premium + Remote Help + Defender Suite for BizPrem = **30,76 EUR**. Test prüft Desktop, Teams, Plan 1/MDM, Windows, Conditional Access, Defender XDR/Endpoint P2 und Remote Help. |
| 2 | Alle sechs Einzelprodukte mit EUR-Preis, Quelle, Datum und `requires: 'Intune Plan 1'`; Inhalte separat in ADDON_FEATURES/FEATURE_SOURCES. Bestehende zehn Pakettests prüfen enthaltene E3-/E5-Funktionen ohne Doppelpreis. |
| 3 | Defender Suite / Purview Suite jeweils **10,40 EUR**, getrennt von den Business-Premium-Produkten. Zulässige modellierte Basen E3/E5/E7; Office E3 ohne EMS genügt nicht. Alte E5-Schlüssel aus aktivem Katalog/Engine entfernt (Umbenennung laut Microsoft, unten). |
| 4 | 17 neue Tests: sechs Einzelanforderungen, XDR, XDR + Remote Help, Purview, IT Administrator, Voraussetzungen, Enterprise-Suiten, Bündel, Gleichstände und USD-Unabhängigkeit. |
| 5 | Nur EUR-Rechenwerte, Offline-Node-Tests ohne neue Abhängigkeiten. Aktualisierte todo_source-Liste unten. |
| 6 | Intune Suite bleibt **9,40 EUR / todo_source / valid_from: null** als dokumentierter Bestandswert, vom Vergleich ausgeschlossen. Test setzt sogar 0,01 EUR und beweist den Ausschluss. Synthetisch belegte Bündel testen günstigere/teurere Einzelprodukte und Gleichstand. |
| 7 | Regel ist Plan 1 in der Basis plus fehlende Funktion. Business Premium gewinnt bei reinem Remote Help; F3 bei Frontline + Web + Remote Help. Entfernt man ausschließlich Plan 1 aus Business Premium, gewinnt E3. Standalone kalkuliert ausschließlich Add-ons und nennt die separat erforderlichen Basislizenzen im Entscheidungstext. |
| 8 | Vorher/Nachher aller Vorlagen, Quellen und begründete Abweichungen hier dokumentiert. Lieferung als lokaler Diff auf unverändertem main-Ausgangsstand; kein PR gemäß Aufgabenanweisung. |

Die Engine vergleicht bei Intune-Bedarf alle zulässigen Basen, ergänzt ausschließlich fehlende Funktionen und prüft danach die vollständige Anforderungsabdeckung. Plan 1 ist ausdrücklich modelliert; das bestehende generische `Intune`-MDM-Feature ersetzt diese Voraussetzung nicht. Der Bündelvergleich zählt nur **fehlende** Einzelprodukte. Bei gleichem Gesamtpreis gewinnt die Kombination mit weniger Add-ons; bei gleicher Produktanzahl bleibt die bisherige Reihenfolge stabil. Teams-Varianten, Laufzeitfaktor, Business-Limit, Frontline-/Windows- und Copilot-Regeln werden weiter geprüft.

## Quellen und Preisentscheidungen

EUR pro Benutzer/Monat, Jahresabonnement, jährliche Abrechnung, zzgl. MwSt.; keine USD-Umrechnung. Direkte Prüfung am **19.10.2026**. `valid_from: 2026-07-01` folgt dem verbindlichen Issue-Datenstand, nicht einem rückwirkend auf den Produktseiten nachgewiesenen Preisdatum.

| Produkt / Änderung | EUR | Offizielle Quelle / Beleg |
|---|---:|---|
| Remote Help Add-on: 5,50 → 3,00 | 3,00 | [Intune-Preise](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing), Preiskachel, FAQ 6 und Fußnote 2: Plan 1 erforderlich. |
| EPM Add-on: 5,50 → 2,60 | 2,60 | [Intune-Preise](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing). |
| Advanced Analytics Add-on: neu | 4,30 | [Intune-Preise](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing). |
| EAM Add-on: neu | 1,73 | [Intune-Preise](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing): Betrag im HTML der Produktkachel; Textkonvertierung lässt ihn aus. |
| Cloud PKI Add-on: neu | 1,73 | [Intune-Preise](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing): Betrag im HTML der Produktkachel. |
| Intune Plan 2 Add-on: neu | 3,50 | EUR-Tabelle des Maintainers im [Issue](https://github.com/leonatwork/M365-License-Architect/issues/23), offizielle [Intune-Preisseite](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing), abgerufen laut Issue am **18.10.2026**. `price_source_checked` hält diesen Preisnachweis getrennt vom Folgeabruf fest. Einschränkung unten. |
| Defender Suite: ersetzt E5 Security 11,20 | 10,40 | [Enterprise-Suiten](https://www.microsoft.com/de-de/security/pricing/enterprise/security-suites): „ehemals Microsoft 365 E5 Security“, Preis und Voraussetzung M365 E3 oder Office E3 + EMS E3; XDR, Endpoint P2, Office P2, Cloud Apps und Entra P2. |
| Purview Suite: ersetzt E5 Compliance 11,20 | 10,40 | [Enterprise-Suiten](https://www.microsoft.com/de-de/security/pricing/enterprise/security-suites): „ehemals Microsoft 365 E5 Compliance“, Preis, Voraussetzung und erweiterte Kennzeichnung/DLP/eDiscovery/Audit. |
| Entra Suite: ungenutzter Einzelkatalogeintrag | 10,40 | [Enterprise-Suiten](https://www.microsoft.com/de-de/security/pricing/enterprise/security-suites), Preis belegt, Entra P1 erforderlich; gemäß Freigabe `todo_source`, noch keine eigene Anforderungszuordnung. |
| Intune Suite Add-on | 9,40 unbelegt | [Intune-Preise](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing): Funktionen und Plan-1-Voraussetzung bestätigt, FAQ nennt nur USD-Bündelpreise. Kein belegter EUR-Preis, daher ausgeschlossen. |

Weitere Funktionsnachweise:

- [Business Premium](https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-business-premium): 19,06 / 16,28 EUR, Desktop-Apps, Teams, Windows und Intune Plan 1. Bestehendes Windows-/VDA-Modell beibehalten; keine zusätzliche Windows-Enterprise-Anforderung erfunden.
- [Defender Suite for Business Premium](https://www.microsoft.com/de-de/security/small-medium-business/microsoft-defender-suite-business-premium), FAQ 5/6: ausdrücklich **Defender for Endpoint P2**, Defender XDR, Entra P2 und Office P2; 8,70 EUR. Damit fehlt für AC-1 keine der modellierten Anforderungen.
- [Business-Premium-Upgrades](https://www.microsoft.com/de-de/security/pricing/small-medium-business/security-add-on-plans): bestehende Varianten 8,70 / 8,70 / 13,00 EUR, keine Preisänderung.
- [Intune-Preise](https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing), FAQ 4: E3 enthält Remote Help, Advanced Analytics, Plan 2; E5 zusätzlich EPM, EAM, Cloud PKI. [Paketänderungen](https://www.microsoft.com/en-us/licensing/news/2026-m365-packaging-pricing-updates) bleiben die bestehende Paketquelle.
- [Frontline-Preise und Planvergleich](https://www.microsoft.com/de-de/microsoft-365/enterprise/frontline-plans-and-pricing): enthaltenes Intune der F-Pläne; explizites Plan-1-Merkmal ergänzt. [Enterprise-Suiten FAQ 17](https://www.microsoft.com/de-de/security/pricing/enterprise/security-suites) bestätigt die gemeinsame Plan-1-Voraussetzung für Einzelprodukte und Plan 2.

**Alte E5-Produkte:** Microsoft verkauft die Funktionen unter den neuen Namen („ehemals …“), nicht als zusätzliches paralleles Produkt mit 11,20 EUR. Deshalb alte aktive Einträge entfernt und durch die belegten Suiten ersetzt. Historische Legacy-/Juli-Fixtures behalten die alten Namen als Vorher-Nachweis; eine schmale Folge-Fixture überschreibt nur IT Administrator. Historische exportierte Quote-Namen werden in diesem Issue nicht migriert (CSV ist #19).

## Einschränkungen und widersprüchliche Vorgaben

1. **Plan-2-EUR-Preis nicht erneut direkt reproduzierbar:** Am 19.10.2026 liefert die deutsche Seite für diese Kachel „Dieses Produkt ist nicht in Ihrem Markt verfügbar“ und keinen Betrag. Die 3,50 EUR stammen daher aus dem ausdrücklich datierten offiziellen Preisnachweis des Maintainers vom 18.10.2026. Keine Schätzung oder USD-Umrechnung. AC-2 ist anhand dieses Issue-Nachweises erfüllt; eine unabhängige erneute Live-Bestätigung aller sechs EUR-Preise ist nicht möglich. EAM/PKI haben im HTML zugleich Preis und Marktverfügbarkeits-Hinweis; diese Inkonsistenz wird nicht als globales Verkaufsverbot interpretiert, da die Seite/FAQ die Einzelprodukte weiterhin anbietet.
2. **Offizielle Plan-2-Funktionsseiten sind inkonsistent:** [Microsoft Learn Intune-Lizenzierung](https://learn.microsoft.com/en-us/intune/fundamentals/licensing) nennt Remote Help/Advanced Analytics bei Plan 2, die aktuelle deutsche Intune-Preisseite FAQ 2/4/5 und Enterprise-Suiten FAQ 16/17 führen sie als getrennte Module. Für dieses Issue gilt der bestätigte Preisseiten-/Maintainer-Zuschnitt: Plan 2 deckt Spezialgeräte/Tunnel/FOTA, Remote Help und Analytics bleiben eigene Add-ons. Keine unbelegte Zusammenlegung, die die Empfehlung unterpreisen würde.
3. **Gleichstand:** Frühere synthetische Tests verlangten E3 + Phone bzw. E5 + Copilot bei Gleichstand. Das widerspricht dem verbindlichen „bei Gleichstand die einfachere“; jetzt gewinnen E5 mit enthaltener Phone-Lizenz bzw. E7 mit enthaltenem Copilot. E7 bleibt mit echten Listenpreisen teurer und wird weiterhin nicht empfohlen.
4. **Lieferform:** Frischer Branch und eigener PR aus AC-8 werden aufgrund der abschließenden Anweisung „Do NOT commit, push or create branches“ nicht erstellt. Kein offener PR wird vorausgesetzt.

## Vorher/Nachher aller Vorlagen

Standard: 10 Benutzer, Office/Frontline laut Vorlage, Teams im Paket, Jahrespreis pro Benutzer/Monat. Vorher: main `6ada216`; Nachher: Folge-Fixture und Tests. Monatspreise ergeben sich weiterhin durch Faktor 1,2.

| Vorlage | Vorher: Kombination / EUR | Nachher: Kombination / EUR | Begründung |
|---|---|---|---|
| Benutzerdefiniert (leer) | Business Basic / 6,07 | Business Basic / 6,07 | unverändert |
| Marketing Team | Business Premium / 19,06 | Business Premium / 19,06 | unverändert |
| Development Team | Business Premium / 19,06 | Business Premium / 19,06 | unverändert |
| Executive / C-Level | E5 + Copilot / 84,13 | E5 + Copilot / 84,13 | unverändert |
| Frontline Worker | F3 / 8,66 | F3 / 8,66 | unverändert |
| IT Administrator | E3 + E5 Security / 48,98 | Business Premium + Remote Help + Defender Suite for BizPrem / **30,76** | Plan-1-Basis zugelassen; Einzelpreis Remote Help belegt, Endpoint P2 im Upgrade bestätigt; **18,22 EUR weniger** |
| Sales Team | Business Premium + Phone + Visio / 40,46 | Business Premium + Phone + Visio / 40,46 | unverändert |
| Finance / Compliance | Business Premium + gemeinsames Defender/Purview-Paket / 32,06 | gleiche Kombination / 32,06 | unverändert |
| Project Manager | Business Premium + Visio + Project / 57,06 | gleiche Kombination / 57,06 | unverändert |

### Weitere Szenarien und einzeln begründete Erwartungsänderungen

| Anforderung | Vorher EUR / Basis | Nachher EUR / Kombination | Ursache |
|---|---|---|---|
| Nur Remote Help | 37,78 / E3 | 22,06 / Business Premium + Remote Help | Plan-1-Zulässigkeit statt Enterprise-Zwang |
| Nur EPM | 43,28 / E3 + EPM | 21,66 / Business Premium + EPM | Plan-1-Zulässigkeit und 2,60 statt 5,50 |
| Nur Advanced Analytics | 37,78 / E3 | 23,36 / Business Premium + Analytics | belegter Einzelpreis 4,30 |
| Nur EAM | 47,18 / E3 + unbelegte Suite | 20,79 / Business Premium + EAM | belegter Einzelpreis 1,73 |
| Nur Cloud PKI | 47,18 / E3 + unbelegte Suite | 20,79 / Business Premium + PKI | belegter Einzelpreis 1,73 |
| Nur Plan 2 | 37,78 / E3 | 22,56 / Business Premium + Plan 2 | Issue-Preisnachweis 3,50 und Plan-1-Basis |
| Nur Defender XDR | 27,76 / Business Premium + Defender | 27,76 / gleiche Kombination | unverändert |
| XDR + Remote Help | 48,98 / E3 + E5 Security | 30,76 / Business Premium + Remote Help + Defender | wie IT Administrator |
| Nur Purview eDiscovery | 27,76 / Business Premium + Purview | 27,76 / gleiche Kombination | unverändert |
| XDR, 301 Benutzer | 48,98 / E3 + E5 Security | 48,18 / E3 + Defender Suite | belegter neuer Suitepreis 10,40 statt 11,20 |
| eDiscovery, 301 Benutzer | 48,98 / E3 + E5 Compliance | 48,18 / E3 + Purview Suite | belegter neuer Suitepreis 10,40 statt 11,20 |
| Frontline + Web + Remote Help | 37,78 / E3 | 11,66 / F3 + Remote Help | F3 mit Plan 1 zulässig |

Weitere bestehende Teständerungen: Phone + EPM wechselt zu Business Premium + EPM + Phone, Frontline + Web + Phone + EPM zu F3 + EPM + Phone; dieselbe Plan-1-Regel. Risk + Remote Help im Upgrade-Test wechselt von E3 auf Business Premium für 30,76. Der synthetisch teure Business-Defender-Test erwartet E3 + neue Defender Suite für 48,18 statt 48,98. Standalone + EPM + Remote Help kalkuliert die belegten Einzelprodukte für 5,60 EUR statt des unbelegten Bündels für 9,40 EUR; Plan 1 bleibt separat erforderlich und wird ausdrücklich genannt. Der Bundle-Preisvergleich wird sowohl mit lizenzierter Basis als auch standalone mit synthetisch belegtem Bündel getestet. Gleichstandsänderungen siehe oben. Historische Fixtures werden nicht nachträglich umgeschrieben.

## Vollständige aktuelle todo_source-Liste

| Eintrag | EUR/Monat | Status |
|---|---:|---|
| O365 E3 | 26,27 / 18,85 ohne Teams | bestehende abgeleitete Zuordnung |
| Entra ID P2 | 8,40 | unbestätigter Bestandswert |
| M365 F5 Security Add-on | 8,00 | unverändert, außerhalb dieses Issues |
| M365 F5 Compliance Add-on | 8,00 | unverändert, außerhalb dieses Issues |
| Defender for Business Servers | 2,80 | unbestätigter Bestandswert |
| Intune Suite Add-on | 9,40 | kein bestätigter EUR-Preis; vom Vergleich ausgeschlossen |
| Entra Suite | 10,40 | Preis bestätigt, eigene Anforderungszuordnung ausstehend; nicht ausgewählt |
| Visio Plan 2 | 12,70 | unbestätigter Bestandswert |
| Project Plan 3 | 25,30 | unbestätigter Bestandswert |
| Power Automate Premium | 14,00 | unbestätigter Bestandswert |
| Teams Rooms Pro | 33,70 | unbestätigter Bestandswert |

## Testgetriebener Nachweis und QS

- Ausgangsstand `npm test`: **73/73 grün**.
- Vor Daten-/Engine-Änderung `node --test test/intune-suites.test.js`: **13/15 rot**, zwei unveränderte XDR-/Purview-Einzelfälle grün. Fehler: 5,50 statt 3,00, Business-/Frontline-Basen gesperrt, alte Suiten und fehlende Einzelprodukte.
- Nach Fix: **15/15 grün**. Gesamtlauf: sieben bewusst veraltete Erwartungen/Dokumentverweise identifiziert und wie oben begründet angepasst.
- Ergänzter Bundle-Gleichstandstest vor Folgefix: **1/17 rot**, zwei Einzelprodukte statt einfacherem gemeinsamen Produkt. Danach Gleichstandsvergleich korrigiert.
- Abschließende QS: `npm run check` (führt `npm test` aus), **90/90 grün**; `git diff --check`, `node --check` für Daten, Engine und alle geänderten JS-Test-/Fixture-Dateien erfolgreich. Kein Build; Tests haben keine Netzwerkzugriffe oder neuen Abhängigkeiten.

### Nacharbeit: Standalone-Regression

- Review-Befund: Die neue Voraussetzungsprüfung verwarf bei Basis `None` alle Intune-Einzelprodukte sowie Defender/Purview. Dadurch verschwanden ausgewählte Produkte ohne Hinweis und ergaben 0 EUR.
- Gezielter Fix: Standalone kalkuliert die ausgewählten Add-ons ohne Basispreis und nennt deren `requires` als separat erforderliche, nicht eingepreiste Voraussetzungen. Reguläre Empfehlungen prüfen die Basis weiterhin verbindlich. Es werden keine Basisfeatures als enthalten ausgegeben.
- Standalone Defender bzw. Purview: jeweils **10,40 EUR** statt main **11,20 EUR** für die alten Produkte; gleiche belegte Umbenennung/Preisentscheidung wie bei Enterprise-Empfehlungen. Standalone EPM + Remote Help: **5,60 EUR**. Unbelegte Intune-Bündel bleiben auch standalone ausgeschlossen; belegte Bündel gewinnen bei günstigerem Preis oder Gleichstand.
- Vor Fix: `node --test --test-name-pattern=standalone test/intune-suites.test.js test/scenarios.test.js`, **11/11 korrekt rot** (leere Add-on-Listen). Danach beide Testdateien **52/52 grün**.
- Abschließende QS der Nacharbeit: `npm run check` einschließlich `npm test`, **100/100 grün**, `git diff --check` und `node --check` für Engine und beide betroffenen Testdateien erfolgreich. Änderungen lokal, kein Commit oder Push.
