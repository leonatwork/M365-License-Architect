(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LicenseEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getPrice(prices, key) {
    const entry = prices[key];
    if (typeof entry === 'number') {
      return entry;
    }
    if (entry && typeof entry === 'object') {
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
      copilot: toBoolean(i.copilot),
      visio: toBoolean(i.visio),
      project: toBoolean(i.project),
      pauto: toBoolean(i.pauto),
      rooms: toBoolean(i.rooms),
      serverProt: toBoolean(i.serverProt),
    };

    let base = 'None';
    let addons = [];
    let reason = '';
    let alt = '';

    const needsAdvSec = state.risk || state.def2 || state.casb || state.phone;
    const needsAdvComp = state.lbl || state.edisc;
    const needsIntuneAdv = state.epm || state.rh;

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
      if (state.phone || state.win || needsIntuneAdv) {
        base = 'M365 E5';
        reason = 'Frontline needs Ent. features (Voice/Win/Intune Suite).';
        alt = 'M365 F3';
      } else if (state.desktop) {
        base = 'M365 E3';
        reason = 'Desktop Apps not in F-SKU.';
        alt = 'M365 F3';
      } else {
        base = state.web ? 'M365 F3' : 'M365 F1';
        reason = state.web ? 'F3 for Web Edit.' : 'F1 for Read-only.';
        alt = state.web ? 'M365 F1' : 'M365 F3';
        if (needsAdvSec) {
          addons.push('M365 F5 Security Add-on');
        }
      }
    } else if (state.mdm || state.win || state.ca || state.def1 || needsIntuneAdv || needsAdvSec || needsAdvComp) {
      if (state.count <= 300 && !state.phone) {
        base = 'Business Premium';
        reason = 'SMB High Security (BizPrem + Add-ons).';
        alt = 'M365 E5';
      } else if (needsAdvSec || needsAdvComp || state.phone) {
        base = 'M365 E5';
        reason = 'E5 required (Security/Comp/Voice or >300 users).';
        alt = 'M365 E3';
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

    let teamsPrice = 0;
    if (state.teams) {
      let teamsKey = '';
      if (base.includes('F1') || base.includes('F3')) {
        teamsKey = 'Teams_F';
      } else if (base.includes('Basic')) {
        teamsKey = 'Teams_BizBasic';
      } else if (base.includes('Standard')) {
        teamsKey = 'Teams_BizStd';
      } else if (base.includes('Premium')) {
        teamsKey = 'Teams_BizPrem';
      } else if (base.includes('O365 E1')) {
        teamsKey = 'Teams_E1';
      } else if (base.includes('O365 E3')) {
        teamsKey = 'Teams_OE3';
      } else if (base.includes('M365 E3')) {
        teamsKey = 'Teams_ME3';
      } else if (base.includes('M365 E5')) {
        teamsKey = 'Teams_ME5';
      }

      teamsPrice = getPrice(PRICES, teamsKey) * mult;
      if (teamsPrice > 0) {
        addons.push({ name: 'Teams EEA', price: teamsPrice });
      }
    }

    if (state.epm || state.rh) {
      const individualCost = ((state.epm ? getPrice(PRICES, 'EPM Add-on') : 0) + (state.rh ? getPrice(PRICES, 'Remote Help Add-on') : 0)) * mult;
      const suiteCost = getPrice(PRICES, 'Intune Suite Add-on') * mult;

      if (individualCost > suiteCost) {
        addons.push('Intune Suite Add-on');
        reason += ' + Intune Suite.';
      } else {
        if (state.epm) {
          addons.push('EPM Add-on');
        }
        if (state.rh) {
          addons.push('Remote Help Add-on');
        }
      }
    }

    if (state.serverProt) {
      addons.push('Defender for Business Servers');
    }
    if (state.copilot) {
      addons.push('M365 Copilot');
    }
    if (state.visio) {
      addons.push('Visio Plan 2');
    }
    if (state.project) {
      addons.push('Project Plan 3');
    }
    if (state.pauto) {
      addons.push('Power Automate Premium');
    }
    if (state.rooms) {
      addons.push('Teams Rooms Pro');
    }

    if (!base.includes('E5')) {
      if (base === 'Business Premium') {
        if (needsAdvComp && needsAdvSec) {
          addons.push('BizPrem E5 Upgrade');
        } else if (needsAdvComp) {
          addons.push('Purview Suite for BizPrem');
        } else if (needsAdvSec) {
          addons.push('Defender Suite for BizPrem');
        }
      } else if (base.includes('F')) {
        if (needsAdvComp) {
          addons.push('M365 F5 Compliance Add-on');
        }
        if (needsAdvSec) {
          addons.push('M365 F5 Security Add-on');
        }
      } else {
        if (needsAdvComp) {
          addons.push('M365 E5 Compliance Add-on');
        }
        if (needsAdvSec) {
          addons.push('M365 E5 Security Add-on');
        }
      }
    }

    let price = getPrice(PRICES, base) * mult;
    let flatAddons = [];

    addons.forEach(function (addon) {
      if (addon && typeof addon === 'object') {
        price += addon.price;
        flatAddons.push(addon.name);
      } else {
        price += getPrice(PRICES, addon) * mult;
        flatAddons.push(addon);
      }
    });

    if (state.style !== 'standalone' && base !== 'M365 E5' && !base.includes('F')) {
      let e5Price = (getPrice(PRICES, 'M365 E5') * mult) + (teamsPrice > 0 ? (getPrice(PRICES, 'Teams_ME5') * mult) : 0);
      let keep = [];

      if (state.teams && teamsPrice > 0) {
        keep.push('Teams EEA');
      }

      flatAddons.forEach(function (flatAddon) {
        if (
          flatAddon.includes('Copilot')
          || flatAddon.includes('Visio')
          || flatAddon.includes('Project')
          || flatAddon.includes('Power')
          || flatAddon.includes('Rooms')
          || flatAddon.includes('Server')
          || flatAddon.includes('Intune')
          || flatAddon.includes('EPM')
          || flatAddon.includes('Remote')
        ) {
          e5Price += getPrice(PRICES, flatAddon) * mult;
          keep.push(flatAddon);
        }
      });

      if (price > e5Price) {
        base = 'M365 E5';
        price = e5Price;
        flatAddons = keep;
        reason = 'Auto-Upgrade to M365 E5 (Cheaper than Base + Add-ons).';
        teamsPrice = state.teams ? (getPrice(PRICES, 'Teams_ME5') * mult) : 0;
      }
    }

    let features = (FEATURES_MAP[base] || []).slice();
    if (state.teams) {
      features = features.filter(function (feature) {
        return feature !== 'No Teams';
      });
      if (!features.includes('Teams Phone') && !features.includes('Teams Collaboration')) {
        features.push('Teams Collaboration');
      }
    }

    return {
      base: base,
      addons: flatAddons,
      price: price,
      reason: reason,
      count: state.count,
      features: features,
      alt: alt,
      currentLic: state.current,
      teamsPrice: teamsPrice,
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

    const currentPrice = getPrice(PRICES, currentLicense) * mult;
    const recommendedPrice = typeof rec.price === 'number' ? rec.price : 0;
    const delta = recommendedPrice - currentPrice;

    const altLicense = rec.alt || 'None';
    const altPrice = getPrice(PRICES, altLicense) * mult;
    const altDiff = recommendedPrice - altPrice;

    const currentFeatures = FEATURES_MAP[currentLicense] || [];
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
