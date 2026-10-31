// #44: Business Premium mit Upgrade, Phone und Copilot Business kostet
// 19,06 + 13,00 + 8,70 + 18,20 = 58,96 EUR statt E5 + Copilot (84,13 EUR).
module.exports = {
  ...require('./intune-suites-reference-results.js'),
  'Executive / C-Level': { base: 'Business Premium', addons: ['BizPrem E5 Upgrade', 'Teams Phone Add-on', 'Copilot Business'], price: 58.96 },
};
