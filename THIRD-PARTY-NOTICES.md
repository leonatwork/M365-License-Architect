# Drittanbieter-Lizenzhinweise

Diese Übersicht umfasst die mit der statischen Anwendung ausgelieferten lokalen Fonts
und die über `index.html` eingebundenen CDN-Assets einschließlich der von CSS geladenen Webfonts.
Die MIT-Lizenz des Repositorys ersetzt die jeweiligen Drittanbieter-Lizenzen nicht.
Lizenzangaben anhand der unten verlinkten Originalquellen geprüft am **31.10.2026**.

## D2Coding

- Dateien: `fonts/D2CodingLatin-Regular.woff2`, `fonts/D2CodingLatin-Bold.woff2`.
  Bestehende Latin-Subsets von D2Coding 1.3.2 (U+00A0–017F, U+2212), als Zeichen-Fallback.
- Lizenz: **SIL Open Font License 1.1**; lokaler vollständiger Lizenztext:
  [fonts/OFL-D2Coding.txt](fonts/OFL-D2Coding.txt).
- Originalquelle: [NAVER D2 Coding, Release 1.3.2](https://github.com/naver/d2codingfont/releases/tag/VER1.3.2).
  [Original-Lizenzhinweis im Release-README](https://github.com/naver/d2codingfont/blob/VER1.3.2/README.md#라이센스),
  [Original-Lizenztext](https://github.com/naver/d2-coding-font/blob/master/OFL.txt).
- Die Originalquelle nennt Copyright (c) 2015, NAVER Corporation und die Reserved Font Names
  `D2Coding` und `D2Coding-Bold`.
- **Offen: Copyright-/Namensnachweis der bestehenden Subsets.** Der vorhandene lokale
  Lizenzvorspann nennt abweichend „2015-2016 NHN Corporation“ und FONTRIX Inc.
  Die Zuordnung dieses Vorspanns und die internen Font-Namen der Subsets zur Release-Quelle
  sind noch zu verifizieren; die OFL-1.1-Lizenz ist durch die Originalquelle bestätigt.

## Nanum Gothic Coding

- Dateien: `fonts/NanumGothicCoding-Regular.ttf`, `fonts/NanumGothicCoding-Bold.ttf`.
- Lizenz: **SIL Open Font License 1.1**; vollständiger, inhaltlich unverändert übernommener Originaltext:
  [fonts/OFL-NanumGothicCoding.txt](fonts/OFL-NanumGothicCoding.txt).
- Originalquelle: [Google Fonts / Nanum Gothic Coding](https://github.com/google/fonts/tree/main/ofl/nanumgothiccoding),
  [Original-Lizenztext](https://github.com/google/fonts/blob/main/ofl/nanumgothiccoding/OFL.txt).
- Copyright (c) 2010, NHN Corporation. Die Reserved Font Names stehen im lokalen Lizenztext.

## Font Awesome Free 6.4.0

- CDN-Asset: <https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css>.
  Das Stylesheet referenziert die Solid-, Regular- und Brands-Webfonts unter
  `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/`.
- Lizenzen nach Asset-Typ: **MIT** für CSS und anderen Nicht-Font-/Nicht-Icon-Code;
  **SIL Open Font License 1.1** für Web-/Desktop-Fonts; **CC BY 4.0** für SVG-/JS-Icons
  (diese Icon-Dateiformate werden aktuell nicht eingebunden).
- Originalquelle und vollständige Lizenztexte:
  [Font Awesome Free 6.4.0 / LICENSE.txt](https://github.com/FortAwesome/Font-Awesome/blob/6.4.0/LICENSE.txt),
  [Lizenzübersicht des Herausgebers](https://fontawesome.com/license/free).
- Copyright 2023 Fonticons, Inc.; Reserved Font Name für Fonts: `Font Awesome`.
  Eingebettete Lizenz- und Attributionshinweise müssen erhalten bleiben.
  Marken-Icons sind Marken ihrer jeweiligen Inhaber; ihre Verwendung bedeutet keine Unterstützung.

## Popper 2

- CDN-Asset: <https://unpkg.com/@popperjs/core@2> (`@popperjs/core`, UMD-Bundle).
- Lizenz: **MIT**, Copyright (c) 2019 Federico Zivolo.
- Originalquelle und vollständiger Lizenztext:
  [Popper Core / LICENSE.md, v2.11.8](https://github.com/floating-ui/popper-core/blob/v2.11.8/LICENSE.md).
- Der bestehende Major-Alias `@2` löste beim Quellenabruf auf **2.11.8** auf;
  die URL fixiert keine Patch-Version.

## tippy.js 6

- CDN-Asset: <https://unpkg.com/tippy.js@6> (UMD-Bundle einschließlich Tooltip-CSS).
- Lizenz: **MIT**, Copyright (c) 2017-present atomiks.
- Originalquelle und vollständiger Lizenztext:
  [Tippy.js / LICENSE, v6.3.7](https://github.com/atomiks/tippyjs/blob/v6.3.7/LICENSE).
- Der bestehende Major-Alias `@6` löste beim Quellenabruf auf **6.3.7** auf;
  die URL fixiert keine Patch-Version. Tippy verwendet das separat aufgeführte Popper.
