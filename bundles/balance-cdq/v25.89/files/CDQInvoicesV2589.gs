var CDQ_INVOICE_ROOT_ID_V2589 = '1HCjws2mraGJr3UpUBMNeeyc2uioug0Q5';
var CDQ_INVOICE_CATEGORIES_V2589 = ['Essence','Outils','Hébergement','Réparation véhicule'];

function cdqInvoiceCleanV2589_(value, maxLen) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen || 160);
}

function cdqInvoiceIdentityV2589_() {
  var name = '';
  var email = '';
  try {
    if (typeof obtenirListeTechniciensRapports === 'function') {
      var state = obtenirListeTechniciensRapports() || {};
      var current = state.courant || {};
      name = cdqInvoiceCleanV2589_(current.nom || state.nomCourant || '', 100);
      email = cdqInvoiceCleanV2589_(current.email || '', 180).toLowerCase();
    }
  } catch (e) {}
  try {
    if (!email) email = cdqInvoiceCleanV2589_(Session.getActiveUser().getEmail() || '', 180).toLowerCase();
  } catch (e) {}
  if (!name && email) name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
  if (!name) throw new Error('Le nom du technicien connecté n’est pas configuré.');
  return {nom:name,email:email};
}

function cdqInvoiceSystemFolderV2589_() {
  var folder = DriveApp.getFolderById(CDQ_INVOICE_ROOT_ID_V2589);
  if (!folder) throw new Error('Le dossier _CDQ_System est introuvable.');
  return folder;
}

function cdqInvoiceChildFolderV2589_(parent, name) {
  var clean = cdqInvoiceCleanV2589_(name, 100).replace(/[\\/]+/g, '-');
  if (!clean) throw new Error('Nom de dossier invalide.');
  var it = parent.getFoldersByName(clean);
  if (it.hasNext()) return it.next();
  return parent.createFolder(clean);
}

function cdqInvoiceDestinationV2589_(technicien, categorie) {
  if (CDQ_INVOICE_CATEGORIES_V2589.indexOf(categorie) < 0) throw new Error('Catégorie de facture invalide.');
  var root = cdqInvoiceSystemFolderV2589_();
  var facture = cdqInvoiceChildFolderV2589_(root, 'Facture');
  var tech = cdqInvoiceChildFolderV2589_(facture, technicien);
  var cat = cdqInvoiceChildFolderV2589_(tech, categorie);
  return {root:root,facture:facture,tech:tech,category:cat};
}

function cdqInvoiceAmountV2589_(value) {
  var n = Number(value);
  if (!isFinite(n) || n < 0 || n > 1000000) throw new Error('Montant de facture invalide.');
  return Math.round(n * 100) / 100;
}

function cdqInvoiceFileNameV2589_(amount, date, suffix) {
  var money = amount.toFixed(2).replace('.', ',');
  return money + ' - ' + date + (suffix ? ' (' + suffix + ')' : '') + '.jpg';
}

function cdqInvoiceUniqueNameV2589_(folder, amount, date, requestId) {
  var index = 0;
  while (index < 100) {
    var name = cdqInvoiceFileNameV2589_(amount, date, index ? index + 1 : 0);
    var files = folder.getFilesByName(name);
    var occupied = false;
    while (files.hasNext()) {
      var existing = files.next();
      var description = '';
      try { description = existing.getDescription() || ''; } catch (e) {}
      if (description.indexOf('"requestId":"' + requestId + '"') >= 0) return {name:name,existing:existing};
      occupied = true;
    }
    if (!occupied) return {name:name,existing:null};
    index++;
  }
  throw new Error('Impossible de générer un nom de facture unique.');
}

function cdqContexteFactureV2589() {
  var identity = cdqInvoiceIdentityV2589_();
  return {
    ok:true,
    technicien:identity.nom,
    email:identity.email,
    categories:CDQ_INVOICE_CATEGORIES_V2589.slice(),
    chemin:'CDQ System / Facture / ' + identity.nom
  };
}

function cdqEnregistrerFactureV2589(payload) {
  payload = payload || {};
  var requestId = cdqInvoiceCleanV2589_(payload.requestId || '', 120);
  if (!/^[A-Za-z0-9._-]{8,120}$/.test(requestId)) throw new Error('Identifiant de facture invalide.');
  var identity = cdqInvoiceIdentityV2589_();
  var category = cdqInvoiceCleanV2589_(payload.categorie || '', 80);
  if (CDQ_INVOICE_CATEGORIES_V2589.indexOf(category) < 0) throw new Error('Choisissez une catégorie de dépense.');
  var amount = cdqInvoiceAmountV2589_(payload.montant);
  var date = cdqInvoiceCleanV2589_(payload.date || '', 10);
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) throw new Error('Date de facture invalide.');
  var dataUrl = String(payload.dataUrl || '');
  var match = dataUrl.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error('La photo de facture est invalide.');
  var bytes = Utilities.base64Decode(match[1].replace(/\s+/g, ''));
  if (!bytes || !bytes.length) throw new Error('La photo de facture est vide.');
  if (bytes.length > 10 * 1024 * 1024) throw new Error('La photo dépasse 10 Mo après optimisation.');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var dest = cdqInvoiceDestinationV2589_(identity.nom, category);
    var unique = cdqInvoiceUniqueNameV2589_(dest.category, amount, date, requestId);
    if (unique.existing) {
      return {ok:true,id:unique.existing.getId(),url:unique.existing.getUrl(),nom:unique.name,technicien:identity.nom,categorie:category,duplicate:true,chemin:'CDQ System / Facture / ' + identity.nom + ' / ' + category};
    }
    var blob = Utilities.newBlob(bytes, 'image/jpeg', unique.name);
    var file = dest.category.createFile(blob);
    var meta = {
      schema:1,
      requestId:requestId,
      technicien:identity.nom,
      email:identity.email,
      categorie:category,
      montant:amount,
      date:date,
      commercant:cdqInvoiceCleanV2589_(payload.commercant || '', 120),
      description:cdqInvoiceCleanV2589_(payload.description || '', 240),
      createdAt:new Date().toISOString()
    };
    try { file.setDescription(JSON.stringify(meta)); } catch (e) {}
    return {ok:true,id:file.getId(),url:file.getUrl(),nom:file.getName(),technicien:identity.nom,categorie:category,chemin:'CDQ System / Facture / ' + identity.nom + ' / ' + category};
  } finally {
    lock.releaseLock();
  }
}
