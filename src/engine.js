(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LicenseEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Gemeinsame Nutzergrenze für Formular, Engine und CSV-Import: 100.000.
  const MAX_USERS = 100000;

  // Mengenfeld je Nicht-Benutzer-Einheit (PRICES[key].unit); weitere Einheiten lassen sich hier ergänzen.
  const QUANTITY_INPUTS = { room: 'roomCount', server: 'serverCount' };
  // Zusatzprodukte je Anforderungsflag; die Einheit entscheidet über Benutzer-unitPrice oder unitItems.
  const PRODUCT_FLAGS = { serverProt: 'Defender for Business Servers', copilot: 'M365 Copilot', visio: 'Visio Plan 2',
    project: 'Project Plan 3', pauto: 'Power Automate Premium', rooms: 'Teams Rooms Pro' };

  function normalizeCount(value) {
    const count = Number(value);
    return Number.isNaN(count) ? 1 : Math.min(MAX_USERS, Math.max(1, Math.trunc(count)));
  }

  function getPrice(prices, key, teamsVariant) {
    const entry = prices[key];
    if (typeof entry === 'number') {
      return entry;
    }
    if (entry && typeof entry === 'object') {
      if (teamsVariant === 'no_teams' && typeof entry.price_no_teams === 'number') return entry.price_no_teams;
      return typeof entry.price === 'number' ? entry.price : 0;
    }
    return 0;
  }

  function getMultiplier(term) {
    return term === 'monthly' ? 1.2 : 1.0;
  }

  function toBoolean(value) {
    return Boolean(value);
  }

  // Gemeinsames Mapping für das aktuelle Formular und gespeicherte Quote-Inputs, ohne DOM.
  function mapFormInputs(form) {
    const f = form || {};
    const input = {
      count: normalizeCount(f.userCount),
      style: f.workstyle || 'office',
      current: f.currentLicense || 'None',
      teamsVariant: f.teamsVariant === 'no_teams' ? 'no_teams' : 'included',
      mdm: toBoolean(f.mdmMobile || f.mdmDesktop),
    };
    const flags = {
      desktopApps: 'desktop', webEdit: 'web', teamsCollab: 'teams', teamsPhone: 'phone',
      winOS: 'win', sec_ca: 'ca', sec_risk_ca: 'risk', sec_def_p1: 'def1', sec_def_p2: 'def2',
      sec_casb: 'casb', comp_dlp: 'dlp', comp_labeling: 'lbl', comp_ediscovery: 'edisc',
      adv_epm: 'epm', adv_remotehelp: 'rh', adv_copilot: 'copilot', add_visio: 'visio',
      add_project: 'project', add_powerauto: 'pauto', add_rooms: 'rooms', serverProt: 'serverProt',
    };
    for (const [id, flag] of Object.entries(flags)) input[flag] = toBoolean(f[id]);
    // Tenantweite Mengen (Räume, Server) folgen denselben Grenzen wie die Benutzeranzahl.
    for (const id of Object.values(QUANTITY_INPUTS)) input[id] = normalizeCount(f[id]);
    return input;
  }

  function recommend(input, options, data) {
    const i = input || {};
    const cfg = options || {};
    const term = cfg.term || 'annual';
    const mult = getMultiplier(term);

    const sourceData = data || {};
    const PRICES = sourceData.PRICES || {};
    const FEATURES_MAP = sourceData.FEATURES_MAP || {};
    const ADDON_FEATURES = sourceData.ADDON_FEATURES || {};

    const unitOf = key => (PRICES[key] && PRICES[key].unit) || 'user';
    // Raum-/Serverlizenzen fließen nie in den Benutzer-unitPrice ein.
    const isUnitProduct = key => unitOf(key) !== 'user';

    const mdmMobile = toBoolean(i.mdmMobile);
    const mdmDesktop = toBoolean(i.mdmDesktop);

    const state = {
      count: normalizeCount(i.count),
      style: i.style || 'office',
      current: i.current || 'None',
      desktop: toBoolean(i.desktop),
      web: toBoolean(i.web),
      teams: toBoolean(i.teams),
      phone: toBoolean(i.phone),
      teamsVariant: i.teamsVariant === 'no_teams' ? 'no_teams' : 'included',
      mdm: Object.hasOwn(i, 'mdm') ? toBoolean(i.mdm) : (mdmMobile || mdmDesktop),
      win: toBoolean(i.win),
      ca: toBoolean(i.ca),
      risk: toBoolean(i.risk),
      def1: toBoolean(i.def1),
      def2: toBoolean(i.def2),
      casb: toBoolean(i.casb),
      dlp: toBoolean(i.dlp),
      lbl: toBoolean(i.lbl),
      edisc: toBoolean(i.edisc),
      epm: toBoolean(i.epm),
      rh: toBoolean(i.rh),
      aa: toBoolean(i.aa),
      intune2: toBoolean(i.intune2),
      eam: toBoolean(i.eam),
      pki: toBoolean(i.pki),
      defO365: toBoolean(i.defO365),
      copilot: toBoolean(i.copilot),
      visio: toBoolean(i.visio),
      project: toBoolean(i.project),
      pauto: toBoolean(i.pauto),
      rooms: toBoolean(i.rooms),
      serverProt: toBoolean(i.serverProt),
    };

    let base = 'None';
    let reason = '';
    let alt = '';

    const needsAdvSec = state.risk || state.def2 || state.casb;
    const needsAdvComp = state.lbl || state.edisc;
    const needsIntuneAdv = state.epm || state.rh || state.aa || state.intune2 || state.eam || state.pki;

    if (state.style === 'standalone') {
      base = 'None';
      reason = 'Standalone-Modus: Nur ausgewählte Add-ons werden berechnet.';
      alt = 'None';
    } else if (state.copilot) {
      base = 'M365 E3';
      reason = 'M365 Copilot selected: Requires E3/E5.';
      alt = 'M365 E5';
    } else if (state.style === 'frontline') {
      if (state.win) {
        base = 'M365 E5';
        reason = 'Frontline benötigt Enterprise-Funktionen (Windows/Intune).';
        alt = 'M365 F3';
      } else if (state.desktop) {
        base = 'M365 E3';
        reason = 'Desktop Apps not in F-SKU.';
        alt = 'M365 F3';
      } else {
        base = state.web ? 'M365 F3' : 'M365 F1';
        reason = state.web ? 'F3 for Web Edit.' : 'F1 for Read-only.';
        alt = state.web ? 'M365 F1' : 'M365 F3';
      }
    } else if (state.defO365) {
      base = 'M365 E3';
      reason = 'Defender for Office 365 Plan 1 ist in E3 enthalten.';
      alt = 'M365 E5';
    } else if (state.mdm || state.win || state.ca || state.def1 || needsIntuneAdv || needsAdvSec || needsAdvComp) {
      if (state.count <= 300) {
        base = 'Business Premium';
        reason = 'SMB High Security (BizPrem + Add-ons).';
        alt = 'M365 E5';
      } else {
        base = 'M365 E3';
        reason = 'Enterprise Standard (Intune/Sec).';
        alt = 'Business Premium';
      }
    } else if (state.desktop) {
      base = state.count <= 300 ? 'Business Standard' : 'O365 E3';
      reason = 'Desktop Apps req.';
      alt = state.count <= 300 ? 'Business Basic' : 'O365 E1';
    } else {
      base = state.count <= 300 ? 'Business Basic' : 'O365 E1';
      reason = 'Cloud only.';
      alt = state.count <= 300 ? 'Business Standard' : 'O365 E3';
    }

    const intuneRequirements = { epm: 'EPM', rh: 'Remote Help', aa: 'Advanced Analytics', intune2: 'Intune Plan 2', eam: 'EAM', pki: 'Cloud PKI' };
    const intuneProducts = { epm: 'EPM Add-on', rh: 'Remote Help Add-on', aa: 'Advanced Analytics Add-on', intune2: 'Intune Plan 2 Add-on', eam: 'EAM Add-on', pki: 'Cloud PKI Add-on' };
    // Teams Phone setzt Teams voraus.
    const needsTeams = state.teams || state.phone;
    function combination(candidate) {
      let features = (FEATURES_MAP[candidate] || []).slice();
      const extra = [];
      if (state.teamsVariant === 'no_teams' && features.includes('Teams Collaboration')) {
        // EWR-Variante: Suite ohne Teams; benötigtes Teams kommt genau einmal als Add-on Teams EWR hinzu.
        if (needsTeams) {
          extra.push('Teams EWR');
        } else {
          features = features.filter(feature => feature !== 'Teams Collaboration');
          features.push('No Teams');
        }
      }
      const missing = Object.keys(intuneRequirements).filter(key => state[key] && !features.includes(intuneRequirements[key]));
      function addProduct(key) {
        const entry = PRICES[key];
        if (!entry) return;
        const requires = entry.requires;
        // Standalone kalkuliert Add-ons; die erforderliche Basis wird separat lizenziert.
        if (state.style !== 'standalone' && (Array.isArray(requires) ? !requires.includes(candidate)
          : requires && requires !== candidate && !features.includes(requires))) return;
        extra.push(key);
        features.push(...(ADDON_FEATURES[key] || []).filter(feature => !features.includes(feature)));
      }
      const individualCost = missing.reduce((sum, key) => sum + getPrice(PRICES, intuneProducts[key]), 0);
      const bundle = PRICES['Intune Suite Add-on'];
      const sourcedBundle = bundle && !bundle.todo_source && bundle.currency === 'EUR'
        && /^https:\/\/www\.microsoft\.com\//.test(bundle.source || '') && bundle.valid_from
        && typeof bundle.price === 'number'
        && missing.every(key => (ADDON_FEATURES['Intune Suite Add-on'] || []).includes(intuneRequirements[key]));
      if (missing.length && (state.style === 'standalone' || features.includes('Intune Plan 1'))) {
        if (sourcedBundle && getPrice(PRICES, 'Intune Suite Add-on') <= individualCost + 1e-9) {
          addProduct('Intune Suite Add-on');
        } else {
          for (const key of missing) addProduct(intuneProducts[key]);
        }
      }
      const missingSecurity = (state.risk && !features.includes('Entra P2'))
        || ((state.def2 || state.casb) && !features.includes('Def XDR'));
      const missingCompliance = needsAdvComp && !features.includes('Comp E5');
      if (candidate === 'Business Premium') {
        const security = 'Defender Suite for BizPrem';
        const compliance = 'Purview Suite for BizPrem';
        const bundle = 'BizPrem E5 Upgrade';
        const chosen = missingSecurity && missingCompliance
          && getPrice(PRICES, bundle) <= getPrice(PRICES, security) + getPrice(PRICES, compliance) + 1e-9
          ? [bundle] : [...(missingSecurity ? [security] : []), ...(missingCompliance ? [compliance] : [])];
        for (const key of chosen) {
          if (PRICES[key] && PRICES[key].requires === candidate) {
            addProduct(key);
          }
        }
      } else {
        if (missingSecurity) {
          if (candidate.startsWith('M365 F')) {
            extra.push('M365 F5 Security Add-on');
            features.push('Entra P2', 'Def XDR');
          } else addProduct('Defender Suite');
        }
        if (missingCompliance) {
          if (candidate.startsWith('M365 F')) {
            extra.push('M365 F5 Compliance Add-on');
            features.push('Comp E5');
          } else addProduct('Purview Suite');
        }
      }
      if (state.phone && !features.includes('Teams Phone')) {
        extra.push('Teams Phone Add-on');
        features.push('Teams Phone');
      }
      for (const [flag, key] of Object.entries(PRODUCT_FLAGS)) {
        if (isUnitProduct(key)) continue;
        if (state[flag] && !features.includes(key)) {
          extra.push(key);
          if (flag === 'copilot') features.push(key);
        }
      }
      const unitPrice = getPrice(PRICES, candidate, state.teamsVariant) + extra.reduce((sum, key) => sum + getPrice(PRICES, key), 0);
      return { base: candidate, addons: extra, unitPrice, features };
    }
    // Zulässigkeit einer Basis gemäß den Regeln des Hauptpfads oben.
    const isEnterprise = key => key.startsWith('M365 E');
    const isFrontlineSku = key => key.startsWith('M365 F');
    function isEligibleBase(candidate) {
      if (candidate === 'None' || !PRICES[candidate]) return false;
      if (candidate === 'M365 E7' && !state.copilot) return false;
      if (candidate.includes('Business') && state.count > 300) return false;
      if (isFrontlineSku(candidate) && state.style !== 'frontline') return false;
      // Frontline erhält nur F-SKUs oder M365 Enterprise, nie Business-/Office-365-Pläne.
      if (state.style === 'frontline' && !isFrontlineSku(candidate) && !isEnterprise(candidate)) return false;
      if (state.copilot && !isEnterprise(candidate)) return false;
      // Erweiterte Intune-Funktionen benötigen Plan 1, unabhängig vom Suite-Namen.
      if (needsIntuneAdv && !(FEATURES_MAP[candidate] || []).includes('Intune Plan 1')) return false;
      if ((needsAdvSec || needsAdvComp) && !candidate.startsWith('M365') && candidate !== 'Business Premium') return false;
      return true;
    }
    let selected = combination(base);
    if ((state.phone || needsAdvSec || needsAdvComp || needsIntuneAdv || state.copilot) && state.style !== 'standalone') {
      // Nur zulässige Basen mit allen nötigen Add-ons vergleichen.
      const required = { desktop: 'Desktop Apps', web: 'Web Apps (Edit)', teams: 'Teams Collaboration', mdm: 'Intune', win: 'Win OS', ca: 'Entra P1', def1: 'Def P1', dlp: 'Comp Basic', defO365: 'Def O365 P1', risk: 'Entra P2', def2: 'Def XDR', casb: 'Def XDR', lbl: 'Comp E5', edisc: 'Comp E5', phone: 'Teams Phone', copilot: 'M365 Copilot', ...intuneRequirements };
      const hierarchy = sourceData.HIERARCHY || {};
      const covers = (features, feature) => features.includes(feature)
        || (feature === 'Win OS' && features.includes('Win OS (VDA)'))
        || Object.values(hierarchy).some(group => group.includes(feature) && features.some(f => group.indexOf(f) >= group.indexOf(feature)));
      const candidates = Object.keys(FEATURES_MAP).filter(isEligibleBase);
      let cheapest = null;
      for (const candidate of candidates) {
        const combo = combination(candidate);
        if (!Object.entries(required).every(([flag, feature]) => !state[flag] || covers(combo.features, feature))) continue;
        if (!cheapest || combo.unitPrice < cheapest.unitPrice - 1e-9
          || (Math.abs(combo.unitPrice - cheapest.unitPrice) < 1e-9 && combo.addons.length < cheapest.addons.length)) cheapest = combo;
      }
      if (cheapest) selected = cheapest;
      reason = `${selected.base}: günstigste zulässige Kombination inklusive aller Anforderungen${state.phone ? ' und Teams Phone' : ''}.`;
    } else if (state.style !== 'standalone' && base !== 'M365 E5' && !base.includes('F')) {
      const e5 = combination('M365 E5');
      if (e5.unitPrice < selected.unitPrice - 1e-9) {
        selected = e5;
        reason = 'Auto-Upgrade to M365 E5 (Cheaper than Base + Add-ons).';
      }
    }
    base = selected.base;
    const price = selected.unitPrice * mult;
    const flatAddons = selected.addons;
    if (state.style === 'standalone') {
      const prerequisites = [...new Set(flatAddons.map(key => PRICES[key]?.requires)
        .filter(Boolean).map(requires => Array.isArray(requires) ? requires.join(' oder ') : requires))];
      if (prerequisites.length) reason += ` Voraussetzungen: ${prerequisites.join('; ')} – separat erforderlich und nicht im Preis enthalten.`;
    }
    // Teams EWR steht in addons; ein separater teamsPrice würde es doppelt anzeigen.
    const teamsPrice = 0;
    // Tenantweite Positionen mit eigener Menge; der Monatsfaktor gilt wie beim Benutzerpreis.
    const unitItems = Object.entries(PRODUCT_FLAGS)
      .filter(([flag, key]) => toBoolean(i[flag]) && isUnitProduct(key))
      .map(([, key]) => ({ key, unit: unitOf(key), quantity: normalizeCount(i[QUANTITY_INPUTS[unitOf(key)]]),
        price: getPrice(PRICES, key) * mult }));

    return {
      base: base,
      addons: flatAddons,
      price: price,
      reason: reason,
      count: state.count,
      features: selected.features,
      alt: alt,
      currentLic: state.current,
      teamsPrice: teamsPrice,
      teamsVariant: state.teamsVariant,
      unitItems: unitItems,
    };
  }

  function compare(currentLic, result, term, data) {
    const sourceData = data || {};
    const PRICES = sourceData.PRICES || {};
    const HIERARCHY = sourceData.HIERARCHY || {};
    const FEATURES_MAP = sourceData.FEATURES_MAP || {};

    const currentLicense = currentLic || 'None';
    const rec = result || {};
    const mult = getMultiplier(term || 'annual');

    const currentPrice = getPrice(PRICES, currentLicense, rec.teamsVariant) * mult;
    const recommendedPrice = typeof rec.price === 'number' ? rec.price : 0;
    const delta = recommendedPrice - currentPrice;

    const altLicense = rec.alt || 'None';
    const altPrice = getPrice(PRICES, altLicense, rec.teamsVariant) * mult;
    const altDiff = recommendedPrice - altPrice;

    const currentFeatures = (FEATURES_MAP[currentLicense] || []).filter(feature => rec.teamsVariant !== 'no_teams' || feature !== 'Teams Collaboration');
    if (rec.teamsVariant === 'no_teams') currentFeatures.push('No Teams');
    const recommendedFeatures = rec.features || [];

    const gained = recommendedFeatures.filter(function (newFeature) {
      if (currentFeatures.includes(newFeature)) {
        return false;
      }

      let groupName = null;
      Object.keys(HIERARCHY).some(function (group) {
        if (HIERARCHY[group].includes(newFeature)) {
          groupName = group;
          return true;
        }
        return false;
      });

      if (groupName) {
        const members = HIERARCHY[groupName];
        const newRank = members.indexOf(newFeature);
        const hasSuperior = currentFeatures.some(function (oldFeature) {
          const oldRank = members.indexOf(oldFeature);
          return oldRank > -1 && oldRank >= newRank;
        });
        if (hasSuperior) {
          return false;
        }
      }

      return true;
    });

    const lost = currentFeatures.filter(function (lostFeature) {
      if (recommendedFeatures.includes(lostFeature)) {
        return false;
      }

      let groupName = null;
      Object.keys(HIERARCHY).some(function (group) {
        if (HIERARCHY[group].includes(lostFeature)) {
          groupName = group;
          return true;
        }
        return false;
      });

      if (groupName) {
        const members = HIERARCHY[groupName];
        const lostRank = members.indexOf(lostFeature);
        const hasSuperiorOrEqual = recommendedFeatures.some(function (feature) {
          const rank = members.indexOf(feature);
          return rank > -1 && rank >= lostRank;
        });
        if (hasSuperiorOrEqual) {
          return false;
        }
      }

      return true;
    });

    return {
      currentLic: currentLicense,
      currentPrice: currentPrice,
      delta: delta,
      alt: altLicense,
      altPrice: altPrice,
      altDiff: altDiff,
      gained: gained,
      lost: lost,
    };
  }

  return {
    MAX_USERS: MAX_USERS,
    QUANTITY_INPUTS: QUANTITY_INPUTS,
    mapFormInputs: mapFormInputs,
    recommend: recommend,
    compare: compare,
  };
});
