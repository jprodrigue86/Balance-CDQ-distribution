/**
 * CDQ System / Cloudflare — passerelle de lecture miroir, inactive par défaut.
 * Version de préparation 2026-11-11.
 *
 * Les RPC, les fichiers Google Drive, les feuilles, les factures et les rapports
 * de CDQ ne sont PAS modifiés par l'installation de ce module.
 * AUCUNE écriture, suppression, publication ni action automatique.
 *
 * IMPORTANT : le service privé Cloudflare existant n'est pas encore raccordé
 * au serveur Apps Script. Ne pas basculer les données avant la qualification
 * du chemin d'écriture et le test de retour arrière.
 *
 * Clés privées de Script Properties (jamais dans le navigateur ou le code) :
 *   CDQ_SYSTEM_CF_MIRROR_V1 : 'on' (off par défaut)
 *   CDQ_SYSTEM_CF_READER_URL_V1 : HTTPS, URL contrôlée du Worker privé
 *   CDQ_SYSTEM_CF_READER_TOKEN_V1 : jeton secret serveur, >= 48 caractères
 *
 * Ce module n'exige aucune propriété pour être installé sans effet de bord.
 */

/** Renvoie uniquement l'état de préparation, sans révéler d'URL ni de jeton. */
function cdqSystemCloudflareEtatV20261111() {
  var props = PropertiesService.getScriptProperties();
  var enabled = props.getProperty('CDQ_SYSTEM_CF_MIRROR_V1') === 'on';
  var rawUrl = String(props.getProperty('CDQ_SYSTEM_CF_READER_URL_V1') || '').trim();
  var token = String(props.getProperty('CDQ_SYSTEM_CF_READER_TOKEN_V1') || '');
  var endpointConfigured = /^https:\/\/[a-z0-9][a-z0-9.-]+(?:\:[0-9]{2,5})?(?:\/[a-z0-9._~\/-]*)?\/?$/i.test(rawUrl);
  return {
    ok: true,
    protocol: 20261111,
    role: 'cdq-system-cloudflare-mirror-read',
    activeStorage: 'google-drive',
    cloudReadEnabled: enabled,
    cloudEndpointConfigured: endpointConfigured,
    cloudSecretConfigured: token.length >= 48,
    writesMigrated: false,
    canRemoveOriginalDriveFiles: false,
    migrationComplete: false
  };
}

/**
 * Fonction interne destinée aux futurs essais de lecture côté serveur.
 * Les utilisateurs de l'application n'appellent jamais directement cette API.
 * Ne pas inclure le token dans une réponse client ou un fichier journal.
 */
function cdqSystemCloudflareLireMiroirV20261111_(kind, driveId, tabId) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('CDQ_SYSTEM_CF_MIRROR_V1') !== 'on') {
    throw new Error('CDQ_SYSTEM_CF_MIRROR_DISABLED');
  }
  var base = String(props.getProperty('CDQ_SYSTEM_CF_READER_URL_V1') || '').trim().replace(/\/$/, '');
  var token = String(props.getProperty('CDQ_SYSTEM_CF_READER_TOKEN_V1') || '');
  if (!/^https:\/\/[a-z0-9][a-z0-9.-]+(?:\:[0-9]{2,5})?(?:\/[a-z0-9._~\/-]*)?$/i.test(base) || token.length < 48) {
    throw new Error('CDQ_SYSTEM_CF_SERVICE_UNCONFIGURED');
  }
  var id = String(driveId || '').trim();
  if (!/^[A-Za-z0-9_-]{12,130}$/.test(id)) {
    throw new Error('CDQ_SYSTEM_CF_INVALID_ID');
  }
  var resource;
  if (kind === 'snapshot') {
    resource = '/v1/snapshots/' + encodeURIComponent(id);
  } else if (kind === 'sheet') {
    var tab = String(tabId == null ? '' : tabId);
    if (!/^\d{1,12}$/.test(tab)) throw new Error('CDQ_SYSTEM_CF_INVALID_TAB');
    resource = '/v1/sheets/' + encodeURIComponent(id) + '/' + encodeURIComponent(tab);
  } else {
    throw new Error('CDQ_SYSTEM_CF_INVALID_RESOURCE');
  }
  // UrlFetchApp est exécuté côté Apps Script, jamais dans l'APK ou le navigateur.
  var res = UrlFetchApp.fetch(base + resource, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    muteHttpExceptions: true,
    followRedirects: false,
    validateHttpsCertificates: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('CDQ_SYSTEM_CF_READ_UNAVAILABLE_' + res.getResponseCode());
  }
  var output;
  try { output = JSON.parse(res.getContentText('UTF-8')); }
  catch (_) { throw new Error('CDQ_SYSTEM_CF_INVALID_RESPONSE'); }
  if (!output || output.sourceId !== id ||
      (kind === 'snapshot' && output.kind !== 'source-snapshot') ||
      (kind === 'sheet' && (output.kind !== 'sheet-tab-snapshot' || String(output.tabId) !== String(tabId)))) {
    throw new Error('CDQ_SYSTEM_CF_RESPONSE_MISMATCH');
  }
  return output;
}
