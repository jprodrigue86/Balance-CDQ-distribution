// CDQ V26.22 — archive locale des PDF réellement envoyés.
// Écrit uniquement dans l'arborescence historique actuellement utilisée.

var CDQ_SENT_ARCHIVE_MASTER_ID_V2622 = '1cU0ekKqfuf9nOytUsnH1Mbljx8gWWe77';
var CDQ_SENT_ARCHIVE_REPORT_CANONICAL_V2622 = "Rapports d'étalonnages";
var CDQ_SENT_ARCHIVE_ARCHIVE_CANONICAL_V2622 = 'Archive';
var CDQ_SENT_ARCHIVE_REPORT_ALIASES_V2622 = [
  "Rapports d'étalonnages",
  "Rapports d'étalonnage",
  "Rapport d'étalonnage",
  "Rapport d'étalonnages"
];
var CDQ_SENT_ARCHIVE_ARCHIVE_ALIASES_V2622 = [
  'Archive',
  'Archives',
  'Archive des rapports',
  'Archives des rapports'
];

function cdqArchiveNormalizeFolderV2622_(value) {
  var text = String(value == null ? '' : value).trim().toLowerCase();
  try { text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
  return text.replace(/[’\`]/g, "'").replace(/\s+/g, ' ');
}

function cdqArchiveFindFolderV2622_(parent, aliases) {
  var wanted = {};
  (aliases || []).forEach(function(name) {
    wanted[cdqArchiveNormalizeFolderV2622_(name)] = true;
  });
  var folders = parent.getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    if (wanted[cdqArchiveNormalizeFolderV2622_(folder.getName())]) return folder;
  }
  return null;
}

function cdqArchiveEnsureFolderV2622_(parent, aliases, canonical) {
  return cdqArchiveFindFolderV2622_(parent, aliases) || parent.createFolder(canonical);
}

function cdqArchiveClientInOriginalMasterV2622_(client) {
  var parents = client.getParents();
  while (parents.hasNext()) {
    if (String(parents.next().getId()) === CDQ_SENT_ARCHIVE_MASTER_ID_V2622) return true;
  }
  return false;
}

function cdqArchiveSafePdfNameV2622_(name) {
  var clean = String(name || 'Rapport.pdf')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) clean = 'Rapport.pdf';
  if (!/\.pdf$/i.test(clean)) clean += '.pdf';
  return clean.slice(0, 180);
}

function cdqArchiveUniquePdfNameV2622_(folder, name) {
  var clean = cdqArchiveSafePdfNameV2622_(name);
  var base = clean.replace(/\.pdf$/i, '');
  var candidate = clean;
  var n = 2;
  while (folder.getFilesByName(candidate).hasNext()) {
    candidate = base + ' (' + n + ').pdf';
    n++;
    if (n > 250) throw new Error('Impossible de générer un nom PDF unique dans les archives.');
  }
  return candidate;
}

function cdqArchiveIsPdfBlobV2622_(blob) {
  if (!blob) return false;
  var type = '';
  var name = '';
  try { type = String(blob.getContentType() || '').toLowerCase(); } catch (e) {}
  try { name = String(blob.getName() || ''); } catch (e) {}
  return type === 'application/pdf' || /\.pdf$/i.test(name);
}

function cdqArchiverPiecesEnvoyeesV2622_(piecesJointes, idCompagnie, contexte) {
  contexte = contexte || {};
  var blobs = Array.isArray(piecesJointes) ? piecesJointes : [];
  var clientId = String(idCompagnie || '').trim();
  if (!clientId) throw new Error('Client manquant pour l’archivage des rapports envoyés.');

  var client = DriveApp.getFolderById(clientId);
  if (!client || !cdqArchiveClientInOriginalMasterV2622_(client)) {
    throw new Error('Archivage refusé : le client n’appartient pas au CDQ Système d’origine.');
  }

  var pdfs = blobs.filter(cdqArchiveIsPdfBlobV2622_);
  if (!pdfs.length) {
    return {ok:true,archives:0,ignores:blobs.length,chemin:'',clientId:clientId};
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var reportFolder = cdqArchiveEnsureFolderV2622_(
      client,
      CDQ_SENT_ARCHIVE_REPORT_ALIASES_V2622,
      CDQ_SENT_ARCHIVE_REPORT_CANONICAL_V2622
    );
    var archiveFolder = cdqArchiveEnsureFolderV2622_(
      reportFolder,
      CDQ_SENT_ARCHIVE_ARCHIVE_ALIASES_V2622,
      CDQ_SENT_ARCHIVE_ARCHIVE_CANONICAL_V2622
    );
    var dateName = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'America/Toronto',
      'yyyy-MM-dd'
    );
    var dateFolder = cdqArchiveEnsureFolderV2622_(archiveFolder, [dateName], dateName);
    var archived = [];

    pdfs.forEach(function(blob) {
      var name = cdqArchiveUniquePdfNameV2622_(dateFolder, blob.getName());
      var copy = blob.copyBlob();
      copy.setName(name);
      var file = dateFolder.createFile(copy);
      try {
        file.setDescription(JSON.stringify({
          schema:1,
          type:'cdq-archive-envoi',
          archivedAt:new Date().toISOString(),
          clientId:clientId,
          sessionId:String(contexte.sessionId || ''),
          email:String(contexte.email || '').trim().toLowerCase(),
          source:'convertir-et-envoyer-v26.22'
        }));
      } catch (e) {}
      archived.push({id:file.getId(),nom:file.getName()});
    });

    return {
      ok:true,
      archives:archived.length,
      ignores:blobs.length - pdfs.length,
      clientId:clientId,
      date:dateName,
      chemin:client.getName() + ' / ' + reportFolder.getName() + ' / ' + archiveFolder.getName() + ' / ' + dateName,
      fichiers:archived
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
