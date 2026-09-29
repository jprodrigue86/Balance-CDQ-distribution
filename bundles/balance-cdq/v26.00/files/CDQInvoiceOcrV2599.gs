/* Balance CDQ V25.99 — OCR facture multiplateforme.
 * L'image est convertie temporairement en Google Doc par Drive OCR,
 * le texte est lu, puis le document temporaire est mis à la corbeille.
 */
function cdqLireFactureOcrV2599(dataUrl) {
  cdqInvoiceIdentityV2590_();
  var source = String(dataUrl || '');
  var match = source.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error('La photo du reçu est invalide.');
  var bytes = Utilities.base64Decode(match[2].replace(/\s+/g, ''));
  if (!bytes || !bytes.length) throw new Error('La photo du reçu est vide.');
  if (bytes.length > 6 * 1024 * 1024) throw new Error('La photo est trop volumineuse pour la lecture automatique.');

  if (typeof Drive === 'undefined' || !Drive.Files || typeof Drive.Files.create !== 'function') {
    throw new Error('Le service OCR Drive n’est pas activé dans cette version CDQ.');
  }

  var ext = String(match[1] || 'jpeg').toLowerCase();
  if (ext === 'jpg') ext = 'jpeg';
  var mime = 'image/' + ext;
  var tempId = '';
  try {
    var blob = Utilities.newBlob(bytes, mime, 'CDQ-OCR-recu.' + (ext === 'jpeg' ? 'jpg' : ext));
    var meta = {
      name: 'CDQ-OCR-temp-' + new Date().getTime(),
      mimeType: 'application/vnd.google-apps.document'
    };
    var created = Drive.Files.create(meta, blob, {
      fields: 'id',
      ocrLanguage: 'fr'
    });
    tempId = String(created && created.id || '');
    if (!tempId) throw new Error('Le service OCR n’a pas créé le document temporaire.');

    var textValue = '';
    var lastError = '';
    for (var attempt = 0; attempt < 7; attempt++) {
      if (attempt) Utilities.sleep(450 * attempt);
      try {
        var doc = DocumentApp.openById(tempId);
        textValue = String(doc.getBody().getText() || '').trim();
        if (textValue) break;
      } catch (e) {
        lastError = e && e.message ? e.message : String(e || '');
      }
    }
    if (!textValue) {
      throw new Error(lastError || 'Aucun texte lisible n’a été détecté dans ce reçu.');
    }
    if (textValue.length > 60000) textValue = textValue.slice(0, 60000);
    return {ok:true, text:textValue};
  } finally {
    if (tempId) {
      try { DriveApp.getFileById(tempId).setTrashed(true); } catch (e) {}
    }
  }
}
