(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LICENSE_DATA = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SOURCE = 'm365maps.com + Microsoft-Preisseite';
  const VALID_FROM = '2026-07-01';
  const BUSINESS = 'https://www.microsoft.com/de-de/microsoft-365/business/';
  const ENTERPRISE = 'https://www.microsoft.com/de-de/microsoft-365/enterprise/';
  const PACKAGING = 'https://www.microsoft.com/en-us/licensing/news/2026-m365-packaging-pricing-updates';
  const SECURITY_UPGRADES = 'https://www.microsoft.com/de-de/security/pricing/small-medium-business/security-add-on-plans';
  const INTUNE = 'https://www.microsoft.com/de-de/security/business/microsoft-intune-pricing';
  const SECURITY_SUITES = 'https://www.microsoft.com/de-de/security/pricing/enterprise/security-suites';
  const FRONTLINE = ENTERPRISE + 'frontline-plans-and-pricing';
  const SOURCE_CHECKED = '2026-10-18';
  const suite = (price, price_no_teams, source) => ({ price, price_no_teams, currency: 'EUR', source, valid_from: VALID_FROM });
  const addon = (price, source) => ({ price, currency: 'EUR', source, valid_from: VALID_FROM });
  const upgrade = price => ({ ...addon(price, SECURITY_UPGRADES), requires: 'Business Premium', source_checked: SOURCE_CHECKED });
  const intuneAddon = price => ({ ...addon(price, INTUNE), requires: 'Intune Plan 1', source_checked: '2026-10-19' });
  const enterpriseAddon = price => ({ ...addon(price, SECURITY_SUITES), requires: ['M365 E3', 'M365 E5', 'M365 E7'], source_checked: '2026-10-19' });

  const PRICES = {
    None: { price: 0, currency: 'EUR', source: SOURCE, valid_from: null },
    'M365 F1': suite(2.60, 2.16, ENTERPRISE + 'frontline-plans-and-pricing'),
    'M365 F3': suite(8.66, 7.73, ENTERPRISE + 'frontline-plans-and-pricing'),
    'Business Basic': suite(6.07, 4.67, BUSINESS + 'microsoft-365-plans-and-pricing'),
    'Business Standard': suite(12.13, 9.34, BUSINESS + 'microsoft-365-business-standard'),
    'Business Premium': suite(19.06, 16.28, BUSINESS + 'microsoft-365-business-premium'),
    'O365 E1': suite(8.66, 5.88, ENTERPRISE + 'office-365-e1'),
    // Die Zuordnung der Vergleichsansicht ist laut Issue abgeleitet.
    'O365 E3': { ...suite(26.27, 18.85, ENTERPRISE + 'office-365-e1'), todo_source: true },
    'O365 E5': suite(41.42, 34.01, ENTERPRISE + 'office-365-e3'),
    'M365 E3': suite(37.78, 30.36, ENTERPRISE + 'microsoft-365-plans-and-pricing'),
    'M365 E5': suite(58.13, 50.71, ENTERPRISE + 'microsoft-365-plans-and-pricing'),
    'M365 E7': { ...suite(91.92, 84.51, ENTERPRISE + 'microsoft-365-plans-and-pricing'), source_checked: SOURCE_CHECKED },
    'Entra ID P2': { price: 8.40, currency: 'EUR', source: SOURCE, valid_from: null },
    // Offizielle Seite: Defender/Purview Suite, ehemals M365 E5 Security/Compliance.
    'Defender Suite': enterpriseAddon(10.40),
    'Purview Suite': enterpriseAddon(10.40),
    'M365 F5 Security Add-on': { price: 8.00, currency: 'EUR', source: SOURCE, valid_from: null },
    'M365 F5 Compliance Add-on': { price: 8.00, currency: 'EUR', source: SOURCE, valid_from: null },
    'Defender for Business Servers': { price: 2.80, currency: 'EUR', source: SOURCE, valid_from: null },
    // Kein belegter EUR-Bündelpreis: Bestandswert bleibt dokumentiert, nicht preisvergleichbar.
    'Intune Suite Add-on': { price: 9.40, currency: 'EUR', source: INTUNE, valid_from: null, requires: 'Intune Plan 1', source_checked: '2026-10-19' },
    'EPM Add-on': intuneAddon(2.60),
    'Remote Help Add-on': intuneAddon(3.00),
    'Advanced Analytics Add-on': intuneAddon(4.30),
    'EAM Add-on': intuneAddon(1.73),
    'Cloud PKI Add-on': intuneAddon(1.73),
    // EUR-Nachweis des Maintainers vom 18.10.2026; beim Folgeabruf fehlt die Preiskachel.
    'Intune Plan 2 Add-on': { ...intuneAddon(3.50), price_source_checked: '2026-10-18' },
    // Noch keine eigene Anforderung/Funktionszuordnung: gemäß #23 als todo_source führen.
    'Entra Suite': { ...addon(10.40, SECURITY_SUITES), requires: 'Entra P1', source_checked: '2026-10-19', todo_source: true },
    'M365 Copilot': addon(26.00, ENTERPRISE + 'microsoft-365-plans-and-pricing'),
    // Aktion 15,60 EUR bis 31.12.2026; gerechnet wird nur der Listenpreis.
    'Copilot Business': addon(18.20, BUSINESS + 'microsoft-365-plans-and-pricing'),
    'Teams Phone Add-on': addon(8.70, BUSINESS + 'microsoft-365-plans-and-pricing'),
    'Teams EWR': addon(7.41, ENTERPRISE + 'microsoft-365-plans-and-pricing'),
    'Apps for Business': addon(11.00, BUSINESS + 'microsoft-365-plans-and-pricing'),
    'Apps for Enterprise': addon(15.40, ENTERPRISE + 'frontline-plans-and-pricing'),
    'Visio Plan 2': { price: 12.70, currency: 'EUR', source: SOURCE, valid_from: null },
    'Project Plan 3': { price: 25.30, currency: 'EUR', source: SOURCE, valid_from: null },
    'Power Automate Premium': { price: 14.00, currency: 'EUR', source: SOURCE, valid_from: null },
    'Teams Rooms Pro': { price: 33.70, currency: 'EUR', source: SOURCE, valid_from: null },
    'Defender Suite for BizPrem': upgrade(8.70),
    'Purview Suite for BizPrem': upgrade(8.70),
    // Bestehender Schlüssel bleibt kompatibel; das Produkt ist das gemeinsame Paket,
    // keine vollständige E5-Lizenz (insbesondere ohne Teams Phone / Intune Suite).
    'BizPrem E5 Upgrade': upgrade(13.00),
  };
  // Unbelegte Bestandswerte sind kein bestätigter Preisstand Juli 2026.
  for (const [key, entry] of Object.entries(PRICES)) {
    if (key !== 'None' && entry.valid_from === null) entry.todo_source = true;
  }

  const HIERARCHY = {
    Mail: ['2GB Mail', 'Exch 50GB', 'Exch 100GB'],
    Apps: ['Web Apps (Read-Only)', 'Web Apps (Edit)', 'Desktop Apps'],
    Entra: ['Entra P1', 'Entra P2'],
    Def: ['Def Biz', 'Def P1', 'Def XDR'],
    Comp: ['Comp Basic', 'Comp E5'],
    Teams: ['No Teams', 'Teams Collaboration', 'Teams Phone'],
    MDM: ['Mobile MDM', 'Intune'],
    IntunePlan: ['Intune Plan 1', 'Intune Plan 2'],
    DefOffice: ['Def O365 P1', 'Def O365 P2'],
  };

  const FEATURES_MAP = {
    None: [],
    'M365 F1': ['Intune', 'Entra P1', 'Teams Collaboration', 'Web Apps (Read-Only)', '2GB Mail'],
    'M365 F3': ['Intune', 'Entra P1', 'Teams Collaboration', 'Web Apps (Edit)', 'Win OS Kiosk', '2GB Mail'],
    'Business Basic': ['Web Apps (Edit)', 'Exch 50GB', 'SharePoint', 'Teams Collaboration'],
    'Business Standard': ['Desktop Apps', 'Web Apps (Edit)', 'Exch 50GB', 'SharePoint', 'Teams Collaboration'],
    'Business Premium': ['Intune', 'Def Biz', 'Entra P1', 'Desktop Apps', 'Web Apps (Edit)', 'Exch 50GB', 'SharePoint', 'Teams Collaboration', 'Win OS (VDA)'],
    'O365 E1': ['Web Apps (Edit)', 'Exch 50GB', 'SharePoint', 'Teams Collaboration'],
    'O365 E3': ['Desktop Apps', 'Web Apps (Edit)', 'Exch 100GB', 'SharePoint', 'Comp Basic', 'Teams Collaboration', 'Def O365 P1'],
    'O365 E5': ['Desktop Apps', 'Web Apps (Edit)', 'Exch 100GB', 'SharePoint', 'Comp E5', 'Teams Collaboration', 'Teams Phone', 'Def O365 P2'],
    'M365 E3': ['Win OS', 'Intune', 'Entra P1', 'Desktop Apps', 'Web Apps (Edit)', 'Exch 100GB', 'SharePoint', 'Def P1', 'Comp Basic', 'Teams Collaboration', 'Remote Help', 'Advanced Analytics', 'Intune Plan 2', 'Def O365 P1'],
    'M365 E5': ['Win OS', 'Intune', 'Entra P2', 'Desktop Apps', 'Web Apps (Edit)', 'Exch 100GB', 'SharePoint', 'Def XDR', 'Comp E5', 'PowerBI', 'Teams Phone', 'Teams Collaboration', 'Remote Help', 'Advanced Analytics', 'Intune Plan 2', 'Def O365 P2', 'EPM', 'EAM', 'Cloud PKI'],
  };
  FEATURES_MAP['M365 E7'] = [...FEATURES_MAP['M365 E5'], 'M365 Copilot', 'Agent 365', 'Entra Suite'];
  // Intune ist die bestehende MDM-Anzeige; Plan 1 ist die konkrete Add-on-Voraussetzung.
  for (const key of ['M365 F1', 'M365 F3', 'Business Premium', 'M365 E3', 'M365 E5', 'M365 E7']) {
    FEATURES_MAP[key].push('Intune Plan 1');
  }
  // Add-ons getrennt von Basislizenzen halten, damit sie nie als Basis gewählt werden.
  const ADDON_FEATURES = {
    'Defender Suite for BizPrem': ['Entra P2', 'Def XDR', 'Def O365 P2'],
    'Purview Suite for BizPrem': ['Comp E5'],
    'Defender Suite': ['Entra P2', 'Def XDR', 'Def O365 P2'],
    'Purview Suite': ['Comp E5'],
    'Remote Help Add-on': ['Remote Help'],
    'EPM Add-on': ['EPM'],
    'Advanced Analytics Add-on': ['Advanced Analytics'],
    'EAM Add-on': ['EAM'],
    'Cloud PKI Add-on': ['Cloud PKI'],
    'Intune Plan 2 Add-on': ['Intune Plan 2'],
    'Intune Suite Add-on': ['Remote Help', 'EPM', 'Advanced Analytics', 'EAM', 'Cloud PKI', 'Intune Plan 2'],
  };
  ADDON_FEATURES['BizPrem E5 Upgrade'] = [...ADDON_FEATURES['Defender Suite for BizPrem'], ...ADDON_FEATURES['Purview Suite for BizPrem']];
  // Preisquelle und Paketquelle getrennt: Jede geänderte Zuordnung ist datiert.
  const FEATURE_SOURCES = {
    'O365 E3': { source: PACKAGING, valid_from: VALID_FROM },
    'O365 E5': { source: ENTERPRISE + 'office-365-e3', valid_from: VALID_FROM },
    'M365 E3': { source: PACKAGING, valid_from: VALID_FROM },
    'M365 E5': { source: PACKAGING, valid_from: VALID_FROM },
    'M365 E7': { source: ENTERPRISE + 'microsoft-365-plans-and-pricing', valid_from: VALID_FROM, source_checked: SOURCE_CHECKED },
    'Business Premium': { source: BUSINESS + 'microsoft-365-business-premium', valid_from: VALID_FROM, source_checked: '2026-10-19' },
    'M365 F1': { source: FRONTLINE, valid_from: VALID_FROM, source_checked: '2026-10-19' },
    'M365 F3': { source: FRONTLINE, valid_from: VALID_FROM, source_checked: '2026-10-19' },
  };
  for (const key of Object.keys(ADDON_FEATURES)) {
    FEATURE_SOURCES[key] = { source: PRICES[key].source, valid_from: VALID_FROM, source_checked: PRICES[key].source_checked };
  }

  const PERSONA_PRESETS = {
    Benutzerdefiniert: {},
    'Marketing Team': {
      personaName: 'Marketing Team',
      workstyle: 'office',
      desktopApps: true,
      webEdit: true,
      teamsCollab: true,
      mdmMobile: true,
      sec_ca: true,
      comp_dlp: true,
    },
    'Development Team': {
      personaName: 'Development Team',
      workstyle: 'office',
      desktopApps: true,
      webEdit: true,
      teamsCollab: true,
      mdmDesktop: true,
      sec_ca: true,
      sec_def_p1: true,
      winOS: true,
    },
    'Executive / C-Level': {
      personaName: 'Executive',
      workstyle: 'office',
      desktopApps: true,
      teamsPhone: true,
      teamsCollab: true,
      mdmMobile: true,
      mdmDesktop: true,
      sec_risk_ca: true,
      sec_def_p2: true,
      comp_labeling: true,
      adv_copilot: true,
    },
    'Frontline Worker': {
      personaName: 'Frontline Worker',
      workstyle: 'frontline',
      webEdit: true,
      teamsCollab: true,
      mdmMobile: true,
    },
    'IT Administrator': {
      personaName: 'IT Admin',
      workstyle: 'office',
      desktopApps: true,
      teamsCollab: true,
      mdmDesktop: true,
      winOS: true,
      sec_ca: true,
      sec_def_p2: true,
      adv_remotehelp: true,
    },
    'Sales Team': {
      personaName: 'Sales Team',
      workstyle: 'office',
      desktopApps: true,
      teamsPhone: true,
      teamsCollab: true,
      mdmMobile: true,
      sec_ca: true,
      add_visio: true,
    },
    'Finance / Compliance': {
      personaName: 'Finance Team',
      workstyle: 'office',
      desktopApps: true,
      teamsCollab: true,
      sec_risk_ca: true,
      sec_def_p2: true,
      comp_dlp: true,
      comp_labeling: true,
      comp_ediscovery: true,
    },
    'Project Manager': {
      personaName: 'Project Manager',
      workstyle: 'office',
      desktopApps: true,
      teamsCollab: true,
      mdmMobile: true,
      sec_ca: true,
      add_project: true,
      add_visio: true,
    },
  };

  return {
    PRICE_NOTE: 'Listenpreis in EUR, zzgl. MwSt., jährliche Abrechnung',
    PRICES,
    HIERARCHY,
    FEATURES_MAP,
    ADDON_FEATURES,
    FEATURE_SOURCES,
    PERSONA_PRESETS,
  };
});
