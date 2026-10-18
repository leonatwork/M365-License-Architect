const { PRICES, FEATURES_MAP, PERSONA_PRESETS } = require('./legacy-constants.js');

const FORM_IDS = [
  'personaName', 'userCount', 'workstyle', 'currentLicense',
  'needMailbox', 'largeMailbox', 'desktopApps', 'webEdit',
  'teamsCollab', 'teamsPhone',
  'mdmMobile', 'mdmDesktop', 'winOS',
  'sec_def_p1', 'sec_def_p2', 'sec_ca', 'sec_risk_ca', 'sec_casb',
  'comp_dlp', 'comp_labeling', 'comp_ediscovery',
  'adv_epm', 'adv_remotehelp', 'adv_copilot',
  'add_visio', 'add_project', 'add_powerauto', 'add_rooms', 'serverProt',
];

const CHECKBOX_IDS = new Set([
  'needMailbox', 'largeMailbox', 'desktopApps', 'webEdit',
  'teamsCollab', 'teamsPhone', 'mdmMobile', 'mdmDesktop', 'winOS',
  'sec_def_p1', 'sec_def_p2', 'sec_ca', 'sec_risk_ca', 'sec_casb',
  'comp_dlp', 'comp_labeling', 'comp_ediscovery',
  'adv_epm', 'adv_remotehelp', 'adv_copilot',
  'add_visio', 'add_project', 'add_powerauto', 'add_rooms', 'serverProt',
]);

function createElement(id) {
  if (CHECKBOX_IDS.has(id)) {
    return { type: 'checkbox', checked: false, value: 'on' };
  }

  return {
    type: id === 'workstyle' || id === 'currentLicense' ? 'select-one' : 'text',
    value: '',
    checked: false,
  };
}

function createStubDocument() {
  const fields = {};

  for (const id of FORM_IDS) {
    fields[id] = createElement(id);
  }

  fields.userCount.value = '10';
  fields.workstyle.value = 'office';
  fields.currentLicense.value = 'None';

  return {
    getElementById(id) {
      if (!fields[id]) {
        fields[id] = createElement(id);
      }

      return fields[id];
    },
  };
}

function applyPresetToDocument(document, presetName) {
  if (presetName === 'Benutzerdefiniert') {
    return;
  }

  const preset = PERSONA_PRESETS[presetName];
  if (!preset) {
    return;
  }

  FORM_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.type === 'checkbox') {
      el.checked = false;
    }
  });

  Object.keys(preset).forEach((key) => {
    const el = document.getElementById(key);
    if (!el) {
      return;
    }

    if (el.type === 'checkbox') {
      el.checked = preset[key];
    } else {
      el.value = preset[key];
    }
  });
}

function recalcLegacy(document, isMonthly) {
  const i = {
    count: parseInt(document.getElementById('userCount').value, 10) || 1,
    style: document.getElementById('workstyle').value,
    current: document.getElementById('currentLicense').value,
    desktop: document.getElementById('desktopApps').checked,
    web: document.getElementById('webEdit').checked,
    teams: document.getElementById('teamsCollab').checked,
    phone: document.getElementById('teamsPhone').checked,
    mdm: document.getElementById('mdmMobile').checked || document.getElementById('mdmDesktop').checked,
    win: document.getElementById('winOS').checked,
    ca: document.getElementById('sec_ca').checked,
    risk: document.getElementById('sec_risk_ca').checked,
    def1: document.getElementById('sec_def_p1').checked,
    def2: document.getElementById('sec_def_p2').checked,
    casb: document.getElementById('sec_casb').checked,
    dlp: document.getElementById('comp_dlp').checked,
    lbl: document.getElementById('comp_labeling').checked,
    edisc: document.getElementById('comp_ediscovery').checked,
    epm: document.getElementById('adv_epm').checked,
    rh: document.getElementById('adv_remotehelp').checked,
    copilot: document.getElementById('adv_copilot').checked,
    visio: document.getElementById('add_visio').checked,
    project: document.getElementById('add_project').checked,
    pauto: document.getElementById('add_powerauto').checked,
    rooms: document.getElementById('add_rooms').checked,
    serverProt: document.getElementById('serverProt').checked,
  };

  const mult = isMonthly ? 1.2 : 1.0;

  let base = 'None';
  let addons = [];
  let reason = '';
  let alt = '';

  const needsAdvSec = i.risk || i.def2 || i.casb || i.phone;
  const needsAdvComp = i.lbl || i.edisc;
  const needsIntuneAdv = i.epm || i.rh;

  if (i.style === 'standalone') {
    base = 'None';
    reason = 'Standalone Mode: Only selected Add-ons are calculated.';
    alt = 'None';
  } else {
    if (i.copilot) {
      base = 'M365 E3';
      reason = 'M365 Copilot selected: Requires E3/E5.';
      alt = 'M365 E5';
    } else if (needsIntuneAdv && (i.current === 'None' || i.current.includes('Business') || i.current.includes('F') || i.current.includes('O365'))) {
      base = 'M365 E3';
      reason = 'Intune Suite Add-ons need M365 E3 base.';
      alt = 'Business Premium';
    } else {
      if (i.style === 'frontline') {
        if (i.phone || i.win || needsIntuneAdv) {
          base = 'M365 E5';
          reason = 'Frontline needs Ent. features (Voice/Win/Intune Suite).';
          alt = 'M365 F3';
        } else if (i.desktop) {
          base = 'M365 E3';
          reason = 'Desktop Apps not in F-SKU.';
          alt = 'M365 F3';
        } else {
          base = i.web ? 'M365 F3' : 'M365 F1';
          reason = i.web ? 'F3 for Web Edit.' : 'F1 for Read-only.';
          alt = i.web ? 'M365 F1' : 'M365 F3';
          if (needsAdvSec) addons.push('M365 F5 Security Add-on');
        }
      } else {
        if (i.mdm || i.win || i.ca || i.def1 || needsIntuneAdv || needsAdvSec || needsAdvComp) {
          if (i.count <= 300 && !i.phone) {
            base = 'Business Premium';
            reason = 'SMB High Security (BizPrem + Add-ons).';
            alt = 'M365 E5';
          } else {
            if (needsAdvSec || needsAdvComp || i.phone) {
              base = 'M365 E5';
              reason = 'E5 required (Security/Comp/Voice or >300 users).';
              alt = 'M365 E3';
            } else {
              base = 'M365 E3';
              reason = 'Enterprise Standard (Intune/Sec).';
              alt = 'Business Premium';
            }
          }
        } else if (i.desktop) {
          base = i.count < 300 ? 'Business Standard' : 'O365 E3';
          reason = 'Desktop Apps req.';
          alt = i.count < 300 ? 'Business Basic' : 'O365 E1';
        } else {
          base = i.count < 300 ? 'Business Basic' : 'O365 E1';
          reason = 'Cloud only.';
          alt = 'Business Standard';
        }
      }
    }
  }

  let tPrice = 0;
  if (i.teams) {
    let k = '';
    if (base.includes('F1') || base.includes('F3')) k = 'Teams_F';
    else if (base.includes('Basic')) k = 'Teams_BizBasic';
    else if (base.includes('Standard')) k = 'Teams_BizStd';
    else if (base.includes('Premium')) k = 'Teams_BizPrem';
    else if (base.includes('O365 E1')) k = 'Teams_E1';
    else if (base.includes('O365 E3')) k = 'Teams_OE3';
    else if (base.includes('M365 E3')) k = 'Teams_ME3';
    else if (base.includes('M365 E5')) k = 'Teams_ME5';
    tPrice = (PRICES[k] || 0) * mult;
    if (tPrice > 0) addons.push({ name: 'Teams EEA', price: tPrice });
  }

  if (i.epm || i.rh) {
    const indCost = ((i.epm ? PRICES['EPM Add-on'] : 0) + (i.rh ? PRICES['Remote Help Add-on'] : 0)) * mult;
    const suiteCost = PRICES['Intune Suite Add-on'] * mult;

    if (indCost > suiteCost) {
      addons.push('Intune Suite Add-on');
      reason += ' + Intune Suite.';
    } else {
      if (i.epm) addons.push('EPM Add-on');
      if (i.rh) addons.push('Remote Help Add-on');
    }
  }

  if (i.serverProt) addons.push('Defender for Business Servers');
  if (i.copilot) addons.push('M365 Copilot');

  if (i.visio) addons.push('Visio Plan 2');
  if (i.project) addons.push('Project Plan 3');
  if (i.pauto) addons.push('Power Automate Premium');
  if (i.rooms) addons.push('Teams Rooms Pro');

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
      if (needsAdvComp) addons.push('M365 F5 Compliance Add-on');
      if (needsAdvSec) addons.push('M365 F5 Security Add-on');
    } else {
      if (needsAdvComp) addons.push('M365 E5 Compliance Add-on');
      if (needsAdvSec) addons.push('M365 E5 Security Add-on');
    }
  }

  let price = (PRICES[base] || 0) * mult;
  let flatAddons = [];
  addons.forEach((a) => {
    if (typeof a === 'object') {
      price += a.price;
      flatAddons.push(a.name);
    } else {
      price += (PRICES[a] || 0) * mult;
      flatAddons.push(a);
    }
  });

  if (i.style !== 'standalone' && base !== 'M365 E5' && !base.includes('F')) {
    let e5P = (PRICES['M365 E5'] * mult) + (tPrice > 0 ? (PRICES.Teams_ME5 * mult) : 0);
    let keep = [];
    if (i.teams && tPrice > 0) keep.push('Teams EEA');
    flatAddons.forEach((fa) => {
      if (fa.includes('Copilot') || fa.includes('Visio') || fa.includes('Project') || fa.includes('Power') || fa.includes('Rooms') || fa.includes('Server') || fa.includes('Intune') || fa.includes('EPM') || fa.includes('Remote')) {
        e5P += (PRICES[fa] || 0) * mult;
        keep.push(fa);
      }
    });

    if (price > e5P) {
      base = 'M365 E5';
      price = e5P;
      flatAddons = keep;
      reason = 'Auto-Upgrade to M365 E5 (Cheaper than Base + Add-ons).';
      tPrice = i.teams ? (PRICES.Teams_ME5 * mult) : 0;
    }
  }

  let feats = [...(FEATURES_MAP[base] || [])];
  if (i.teams) {
    feats = feats.filter((f) => f !== 'No Teams');
    if (!feats.includes('Teams Phone') && !feats.includes('Teams Collaboration')) feats.push('Teams Collaboration');
  }

  return {
    base,
    addons: flatAddons,
    price,
    reason,
    count: i.count,
    features: feats,
    alt,
    currentLic: i.current,
    teamsPrice: tPrice,
  };
}

function runLegacyRecalc(input, monthly) {
  const document = createStubDocument();

  document.getElementById('userCount').value = String(input.count ?? 10);
  document.getElementById('workstyle').value = input.style ?? 'office';
  document.getElementById('currentLicense').value = input.current ?? 'None';
  document.getElementById('desktopApps').checked = Boolean(input.desktop);
  document.getElementById('webEdit').checked = Boolean(input.web);
  document.getElementById('teamsCollab').checked = Boolean(input.teams);
  document.getElementById('teamsPhone').checked = Boolean(input.phone);
  document.getElementById('mdmMobile').checked = Boolean(input.mdmMobile);
  document.getElementById('mdmDesktop').checked = Boolean(input.mdmDesktop);
  document.getElementById('winOS').checked = Boolean(input.win);
  document.getElementById('sec_ca').checked = Boolean(input.ca);
  document.getElementById('sec_risk_ca').checked = Boolean(input.risk);
  document.getElementById('sec_def_p1').checked = Boolean(input.def1);
  document.getElementById('sec_def_p2').checked = Boolean(input.def2);
  document.getElementById('sec_casb').checked = Boolean(input.casb);
  document.getElementById('comp_dlp').checked = Boolean(input.dlp);
  document.getElementById('comp_labeling').checked = Boolean(input.lbl);
  document.getElementById('comp_ediscovery').checked = Boolean(input.edisc);
  document.getElementById('adv_epm').checked = Boolean(input.epm);
  document.getElementById('adv_remotehelp').checked = Boolean(input.rh);
  document.getElementById('adv_copilot').checked = Boolean(input.copilot);
  document.getElementById('add_visio').checked = Boolean(input.visio);
  document.getElementById('add_project').checked = Boolean(input.project);
  document.getElementById('add_powerauto').checked = Boolean(input.pauto);
  document.getElementById('add_rooms').checked = Boolean(input.rooms);
  document.getElementById('serverProt').checked = Boolean(input.serverProt);

  return recalcLegacy(document, Boolean(monthly));
}

function measurePresetReferences() {
  const references = {};
  const presetNames = Object.keys(PERSONA_PRESETS).filter((name) => name !== 'Benutzerdefiniert');

  presetNames.forEach((presetName) => {
    const annualDocument = createStubDocument();
    applyPresetToDocument(annualDocument, presetName);
    const annual = recalcLegacy(annualDocument, false);

    const monthlyDocument = createStubDocument();
    applyPresetToDocument(monthlyDocument, presetName);
    const monthly = recalcLegacy(monthlyDocument, true);

    references[presetName] = { annual, monthly };
  });

  return references;
}

module.exports = {
  runLegacyRecalc,
  measurePresetReferences,
};
