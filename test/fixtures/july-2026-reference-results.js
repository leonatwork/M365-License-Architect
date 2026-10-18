// Bewusst getrennt von den eingefrorenen 2025-Referenzen: Juli-Preise,
// Teams im Paket, Remote Help in E3 und Phone als preisverglichenes Add-on.
module.exports = {
  'Marketing Team': { base: 'Business Premium', addons: [], price: 19.06 },
  'Development Team': { base: 'Business Premium', addons: [], price: 19.06 },
  'Executive / C-Level': { base: 'M365 E5', addons: ['M365 Copilot'], price: 84.13 },
  'Frontline Worker': { base: 'M365 F3', addons: [], price: 8.66 },
  'IT Administrator': { base: 'M365 E3', addons: ['M365 E5 Security Add-on'], price: 48.98 },
  'Sales Team': { base: 'Business Premium', addons: ['Teams Phone Add-on', 'Visio Plan 2'], price: 40.46 },
  'Finance / Compliance': { base: 'Business Premium', addons: ['BizPrem E5 Upgrade'], price: 34.06 },
  'Project Manager': { base: 'Business Premium', addons: ['Visio Plan 2', 'Project Plan 3'], price: 57.06 },
};
