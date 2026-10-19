// Historische Paket-Fixtures bleiben unverändert; #23 korrigiert die Intune-Basiswahl.
module.exports = {
  ...require('./upgrades-e7-reference-results.js'),
  'IT Administrator': { base: 'Business Premium', addons: ['Remote Help Add-on', 'Defender Suite for BizPrem'], price: 30.76 },
};
