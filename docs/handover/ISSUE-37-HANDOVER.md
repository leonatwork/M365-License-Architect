# Issue #37 – Repo-Hygiene und Drittanbieter-Lizenzen

## Grundlage und Prüfgrenzen

- Ausgangsstand: `HEAD = origin/main = aaebc105414fb5d59aea37d446013f28b9685797`,
  sauberer Arbeitsbaum. Der bereits ausgecheckte Arbeitsbranch wurde beibehalten.
- Grundlage ist die vollständige im Auftrag enthaltene Issue-Beschreibung einschließlich
  strukturierter Entscheidungen und ursprünglicher Beschreibung. Maßgeblich sind die
  präzisierten AC-1 bis AC-6 und Entscheidungen 1A / 2A / 3A.
- **Offen: vollständiger aktueller Issue-Thread, Kommentare und offene PRs.** Der Abruf
  über `gh` ist durch die Werkzeugberechtigungen gesperrt. Der aktuelle Remote-main
  konnte ebenfalls nicht unabhängig abgeglichen werden. Vor Veröffentlichung diese
  Prüfungen nachholen und mögliche neuere Entscheidungen berücksichtigen.
- Im Repository existieren keine `AGENTS.md` oder `CLAUDE.md`; übergeordnete Verzeichnisse
  sind für die Regelprüfung gesperrt. README, PRODUCT.md, Issue-Formular, package.json,
  vorhandene Tests, historische Handovers und die zusätzlichen Auftragsregeln wurden geprüft.
- Aus dem ausgecheckten Code ergibt sich keine technische Abhängigkeit von einem offenen PR.
  Dessen aktuellen Status konnte die Umgebung nicht prüfen.

## Verbindliche Akzeptanzkriterien und Nachweise

| Kriterium | Umsetzung / Nachweis |
| --- | --- |
| AC-1 | `SECURITY.md` mit GitHub Private Vulnerability Reporting und Verbot öffentlicher Exploit-Details; `.github/CODEOWNERS` mit `* @leonatwork`. Regression prüft Melde-URL, Hinweis und globale Ownership. |
| AC-2 | `THIRD-PARTY-NOTICES.md` enthält D2Coding, Nanum Gothic Coding, Font Awesome Free 6.4.0 einschließlich CSS/Webfonts, Popper 2 und tippy.js 6 mit Lizenz und Originalquelle. Vollständige Nanum-OFL unter `fonts/OFL-NanumGothicCoding.txt`. Regression vergleicht die Notices mit allen lokalen Font-URLs und CDN-Assets aus `index.html`. |
| AC-3 | Handovers zu #8, #15, #19, #23, #30 und #34 nach `docs/handover/` verschoben; Inhalte unverändert. `test/data.test.js` liest den neuen Pfad. Regression prüft Existenz am Ziel und Abwesenheit im Root; Suche nach alten Root-Referenzen ohne Treffer. |
| AC-4 | 59 Design-/Review-Dateien aus dem Git-Index entfernt, lokal erhalten. `git ls-files .impeccable` liefert ausschließlich `.impeccable/build/scaffold/layout.css`. Verschachtelte Ignore-Regeln erlauben nur diese Datei; Regression prüft auch neue verschachtelte Mocks, Screenshots und weitere Scaffold-Dateien. CSS und Einbindung in `index.html` unverändert; lokaler HTTP-Smoke-Test liefert für beide HTTP 200. README begründet den Laufzeit-Verbleib. |
| AC-5 | Kurzer README-Abschnitt „Betrieb und Release“: statische Auslieferung einschließlich verstecktem CSS-Pfad, bestehende CDN-Abhängigkeiten, beide QS-Befehle, Notices und `SECURITY.md`. |
| AC-6 / QS | `npm test` und `npm run check` jeweils 142/142 bestanden. |

## Auslegung und verbleibende Unklarheiten

- Die präzisierten Kriterien verlangen Notices für die bereits eingebundenen CDN-Assets
  und das Behalten des Laufzeit-CSS. Die frühere Formulierung „später Icons/Tooltips aus #9“
  begründet daher keine Abhängigkeit von #9; Änderungen an Icons oder Tooltips sind nicht nötig.
- **Offen: D2Coding-Copyright-/Namensnachweis der bestehenden Subsets.** Die Originalquelle
  bestätigt OFL 1.1 und nennt NAVER (2015) sowie Reserved Font Names. Der vorhandene lokale
  Lizenzvorspann nennt abweichend NHN (2015–2016) und FONTRIX. Die Unklarheit ist ausdrücklich
  in den Notices dokumentiert. Font-Metadaten konnten mit den vorhandenen Werkzeugen nicht
  verifiziert werden; `fontTools` ist nicht installiert. Es wurden keine Pakete hinzugefügt.
- Popper und Tippy verwenden bestehende Major-Aliase: Quellenabruf am 31.10.2026 ergibt
  2.11.8 bzw. 6.3.7. Diese Auflösung ist kein dauerhaftes Patch-Pinning.
- Die Aktivierung von Private Vulnerability Reporting ist eine GitHub-Einstellung und
  konnte hier nicht geprüft werden. Der dokumentierte Meldeweg entspricht der Issue-Entscheidung.
- Die fachlichen Kriterien des bereitgestellten Issue-Texts sind umgesetzt. Die vorgeschriebene
  vollständige Thread-/PR- und übergeordnete Regelprüfung bleibt wegen der Zugriffssperren offen.

## Testgetriebener Nachweis

1. Zuerst ausschließlich `test/repo-hygiene.test.js` und Registrierung in `test/index.js` ergänzt.
2. Vor dem Fix: `node --test test/repo-hygiene.test.js` – **5 rot, 1 grün**.
   Erwartete Ursachen: fehlende Security-Datei und Notices, Handovers im Root,
   fehlende Ignore-Regeln und fehlender README-Abschnitt. Der vorhandene CSS-Pfad war bereits grün.
3. Nach Umsetzung: `node --test test/repo-hygiene.test.js test/data.test.js` – **9/9 grün**.
4. `npm test` und `npm run check` – jeweils **142/142 grün**, keine bestehenden Tests abgeschwächt.
5. `git diff --check` und `git diff --cached --check` ohne Befund;
   Nanum-Lizenztext mit der Originalquelle verglichen, ausschließlich nachgestellte Leerzeichen normalisiert.
6. Lokaler HTTP-Smoke-Test: `index.html` und die daraus aufgelöste CSS-URL liefern HTTP 200;
   ausgelieferter CSS-Inhalt entspricht der lokalen Datei. Keine Produktionsauslieferung.

## Handover für den Review

- Neue Dokumente und Tests sowie verschobene Handovers sind noch ungestagt;
  die `.impeccable/`-Entfernungen liegen durch `git rm --cached` bereits im Index.
  Für die vollständige Review-Diff sowohl Arbeitsbaum, Index als auch neue Dateien berücksichtigen.
- Vor Veröffentlichung den aktuellen Issue-Thread und offene PRs abgleichen,
  Private Vulnerability Reporting prüfen und die dokumentierte D2Coding-Unklarheit klären.
- Keine Commits, Pushes, Branch-Erstellung/-Wechsel, fremden PR-Übernahmen, PR-Erstellung,
  Merges, Deployments oder Änderungen an Produktionsdaten durchgeführt.
