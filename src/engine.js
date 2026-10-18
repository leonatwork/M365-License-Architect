(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LicenseEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  function recommend(input, options, data) {
    const i = input || {};
    const cfg = options || {};
    const term = cfg.term || 'annual';
    const mult = getMultiplier(term);

    const sourceData = data || {};
    const PRICES = sourceData.PRICES || {};
    const FEATURES_MAP = sourceData.FEATURES_MAP || {};

    const mdmMobile = toBoolean(i.mdmMobile);
    const mdmDesktop = toBoolean(i.mdmDesktop);

    const state = {
      count: parseInt(i.count, 10) || 1,
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
      reason = 'Standalone Mode: Only selected Add-ons are calculated.';
      alt = 'None';
    } else if (state.copilot) {
      base = 'M365 E3';
      reason = 'M365 Copilot selected: Requires E3/E5.';
      alt = 'M365 E5';
    } else if (
      needsIntuneAdv
      && (state.current === 'None'
        || state.current.includes('Business')
        || state.current.includes('F')
        || state.current.includes('O365'))
    ) {
      base = 'M365 E3';
      reason = 'Intune Suite Add-ons need M365 E3 base.';
      alt = 'Business Premium';
    } else if (state.style === 'frontline') {
      if (state.win || needsIntuneAdv) {
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
      base = state.count < 300 ? 'Business Standard' : 'O365 E3';
      reason = 'Desktop Apps req.';
      alt = state.count < 300 ? 'Business Basic' : 'O365 E1';
    } else {
      base = state.count < 300 ? 'Business Basic' : 'O365 E1';
      reason = 'Cloud only.';
      alt = 'Business Standard';
    }

    const intuneRequirements = { epm: 'EPM', rh: 'Remote Help', aa: 'Advanced Analytics', intune2: 'Intune Plan 2', eam: 'EAM', pki: 'Cloud PKI' };
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
      // Für neue Einzelprodukte fehlt ein belegter EUR-Preis; die vorhandene Suite deckt sie ab.
      const individualCost = missing.reduce((sum, key) => sum + getPrice(PRICES, key === 'epm' ? 'EPM Add-on' : 'Remote Help Add-on'), 0);
      if (missing.length && (missing.some(key => key !== 'epm' && key !== 'rh') || individualCost > getPrice(PRICES, 'Intune Suite Add-on'))) {
        extra.push('Intune Suite Add-on');
        features.push(...Object.values(intuneRequirements).filter(feature => !features.includes(feature)));
      } else {
        for (const key of missing) {
          extra.push(key === 'epm' ? 'EPM Add-on' : 'Remote Help Add-on');
          features.push(intuneRequirements[key]);
        }
      }
      if (needsAdvSec && !features.includes('Entra P2')) {
        extra.push(candidate === 'Business Premium' ? (needsAdvComp ? 'BizPrem E5 Upgrade' : 'Defender Suite for BizPrem') : candidate.includes('F') ? 'M365 F5 Security Add-on' : 'M365 E5 Security Add-on');
      }
      if (needsAdvComp && !features.includes('Comp E5')) {
        if (!extra.includes('BizPrem E5 Upgrade')) extra.push(candidate === 'Business Premium' ? 'Purview Suite for BizPrem' : candidate.includes('F') ? 'M365 F5 Compliance Add-on' : 'M365 E5 Compliance Add-on');
      }
      if (state.phone && !features.includes('Teams Phone')) {
        extra.push('Teams Phone Add-on');
        features.push('Teams Phone');
      }
      for (const [flag, key] of Object.entries({ serverProt: 'Defender for Business Servers', copilot: 'M365 Copilot', visio: 'Visio Plan 2', project: 'Project Plan 3', pauto: 'Power Automate Premium', rooms: 'Teams Rooms Pro' })) {
        if (state[flag]) extra.push(key);
      }
      const unitPrice = getPrice(PRICES, candidate, state.teamsVariant) + extra.reduce((sum, key) => sum + getPrice(PRICES, key), 0);
      return { base: candidate, addons: extra, unitPrice, features };
    }
    // Zulässigkeit einer Basis gemäß den Regeln des Hauptpfads oben.
    const isEnterprise = key => key.startsWith('M365 E');
    const isFrontlineSku = key => key.startsWith('M365 F');
    function isEligibleBase(candidate) {
      if (candidate === 'None' || !PRICES[candidate]) return false;
      if (candidate.includes('Business') && state.count > 300) return false;
      if (isFrontlineSku(candidate) && state.style !== 'frontline') return false;
      // Frontline erhält nur F-SKUs oder M365 Enterprise, nie Business-/Office-365-Pläne.
      if (state.style === 'frontline' && !isFrontlineSku(candidate) && !isEnterprise(candidate)) return false;
      if (state.copilot && !isEnterprise(candidate)) return false;
      // Intune Suite Add-ons need M365 E3 base.
      if (needsIntuneAdv && !isEnterprise(candidate)) return false;
      if ((needsAdvSec || needsAdvComp) && !candidate.startsWith('M365') && candidate !== 'Business Premium') return false;
      return true;
    }
    let selected = combination(base);
    if (state.phone && state.style !== 'standalone') {
      // Nur zulässige Basen mit allen nötigen Add-ons vergleichen.
      const required = { desktop: 'Desktop Apps', web: 'Web Apps (Edit)', mdm: 'Intune', win: 'Win OS', ca: 'Entra P1', def1: 'Def P1', dlp: 'Comp Basic', defO365: 'Def O365 P1' };
      const hierarchy = sourceData.HIERARCHY || {};
      const covers = (features, feature) => features.includes(feature)
        || (feature === 'Win OS' && features.includes('Win OS (VDA)'))
        || Object.values(hierarchy).some(group => group.includes(feature) && features.some(f => group.indexOf(f) >= group.indexOf(feature)));
      const candidates = Object.keys(FEATURES_MAP).filter(isEligibleBase);
      let cheapest = null;
      for (const candidate of candidates) {
        const combo = combination(candidate);
        if (!Object.entries(required).every(([flag, feature]) => !state[flag] || covers(combo.features, feature))) continue;
        if (!cheapest || combo.unitPrice < cheapest.unitPrice - 1e-9) cheapest = combo;
      }
      if (cheapest) selected = cheapest;
      reason = selected.base === 'M365 E5' ? 'M365 E5 ist inklusive aller Anforderungen günstiger als die Kombination mit Teams Phone.' : 'Günstigste passende Kombination mit Teams Phone.';
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
    // Teams EWR steht in addons; ein separater teamsPrice würde es doppelt anzeigen.
    const teamsPrice = 0;

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
    recommend: recommend,
    compare: compare,
  };
});
