var CDQ_INVOICE_ROOT_ID_V2590 = '1HCjws2mraGJr3UpUBMNeeyc2uioug0Q5';
var CDQ_INVOICE_CATEGORIES_V2590 = ['Essence','Outils','Hébergement','Réparation véhicule'];

function cdqInvoiceCleanV2590_(value, maxLen) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen || 160);
}

function cdqInvoiceIdentityV2590_() {
  var name = '';
  var email = '';
  try {
    if (typeof obtenirListeTechniciensRapports === 'function') {
      var state = obtenirListeTechniciensRapports() || {};
      var current = state.courant || {};
      name = cdqInvoiceCleanV2590_(current.nom || state.nomCourant || '', 100);
      email = cdqInvoiceCleanV2590_(current.email || '', 180).toLowerCase();
    }
  } catch (e) {}
  try {
    if (!email) email = cdqInvoiceCleanV2590_(Session.getActiveUser().getEmail() || '', 180).toLowerCase();
  } catch (e) {}
  if (!name && email) name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
  if (!name) throw new Error('Le nom du technicien connecté n’est pas configuré.');
  return {nom:name,email:email};
}

function cdqInvoiceSystemFolderV2590_() {
  var folder = DriveApp.getFolderById(CDQ_INVOICE_ROOT_ID_V2590);
  if (!folder) throw new Error('Le dossier _CDQ_System est introuvable.');
  return folder;
}

function cdqInvoiceFindChildV2590_(parent, name) {
  var clean = cdqInvoiceCleanV2590_(name, 100).replace(/[\\/]+/g, '-');
  var it = parent.getFoldersByName(clean);
  return it.hasNext() ? it.next() : null;
}

function cdqInvoiceChildFolderV2590_(parent, name) {
  var clean = cdqInvoiceCleanV2590_(name, 100).replace(/[\\/]+/g, '-');
  if (!clean) throw new Error('Nom de dossier invalide.');
  var found = cdqInvoiceFindChildV2590_(parent, clean);
  return found || parent.createFolder(clean);
}

function cdqInvoiceDestinationV2590_(technicien, categorie) {
  if (CDQ_INVOICE_CATEGORIES_V2590.indexOf(categorie) < 0) throw new Error('Catégorie de facture invalide.');
  var root = cdqInvoiceSystemFolderV2590_();
  var facture = cdqInvoiceChildFolderV2590_(root, 'Facture');
  var tech = cdqInvoiceChildFolderV2590_(facture, technicien);
  var cat = cdqInvoiceChildFolderV2590_(tech, categorie);
  return {root:root,facture:facture,tech:tech,category:cat};
}

function cdqInvoiceExistingTechV2590_(technicien) {
  var root = cdqInvoiceSystemFolderV2590_();
  var facture = cdqInvoiceFindChildV2590_(root, 'Facture');
  if (!facture) return null;
  var tech = cdqInvoiceFindChildV2590_(facture, technicien);
  return tech ? {root:root,facture:facture,tech:tech} : null;
}

function cdqInvoiceAmountV2590_(value) {
  var n = Number(value);
  if (!isFinite(n) || n < 0 || n > 1000000) throw new Error('Montant de facture invalide.');
  return Math.round(n * 100) / 100;
}

function cdqInvoiceFileNameV2590_(amount, date, suffix) {
  var money = amount.toFixed(2).replace('.', ',');
  return money + ' - ' + date + (suffix ? ' (' + suffix + ')' : '') + '.jpg';
}

function cdqInvoiceUniqueNameV2590_(folder, amount, date, requestId) {
  var index = 0;
  while (index < 100) {
    var name = cdqInvoiceFileNameV2590_(amount, date, index ? index + 1 : 0);
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

function cdqInvoiceMetaV2590_(file, fallbackCategory) {
  var meta = {};
  try { meta = JSON.parse(file.getDescription() || '{}') || {}; } catch (e) {}
  return {
    id:file.getId(),
    nom:file.getName(),
    url:file.getUrl(),
    categorie:cdqInvoiceCleanV2590_(meta.categorie || fallbackCategory || '', 80),
    montant:Number(meta.montant || 0),
    date:cdqInvoiceCleanV2590_(meta.date || '', 10),
    commercant:cdqInvoiceCleanV2590_(meta.commercant || '', 120),
    description:cdqInvoiceCleanV2590_(meta.description || '', 240),
    createdAt:cdqInvoiceCleanV2590_(meta.createdAt || '', 40),
    updatedAt:file.getLastUpdated().toISOString()
  };
}

function cdqContexteFactureV2590() {
  var identity = cdqInvoiceIdentityV2590_();
  return {
    ok:true,
    technicien:identity.nom,
    email:identity.email,
    categories:CDQ_INVOICE_CATEGORIES_V2590.slice(),
    chemin:'CDQ System / Facture / ' + identity.nom
  };
}

function cdqEnregistrerFactureV2590(payload) {
  payload = payload || {};
  var requestId = cdqInvoiceCleanV2590_(payload.requestId || '', 120);
  if (!/^[A-Za-z0-9._-]{8,120}$/.test(requestId)) throw new Error('Identifiant de facture invalide.');
  var identity = cdqInvoiceIdentityV2590_();
  var category = cdqInvoiceCleanV2590_(payload.categorie || '', 80);
  if (CDQ_INVOICE_CATEGORIES_V2590.indexOf(category) < 0) throw new Error('Choisissez une catégorie de dépense.');
  var amount = cdqInvoiceAmountV2590_(payload.montant);
  var date = cdqInvoiceCleanV2590_(payload.date || '', 10);
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
    var dest = cdqInvoiceDestinationV2590_(identity.nom, category);
    var unique = cdqInvoiceUniqueNameV2590_(dest.category, amount, date, requestId);
    if (unique.existing) {
      return {ok:true,id:unique.existing.getId(),url:unique.existing.getUrl(),nom:unique.name,technicien:identity.nom,categorie:category,duplicate:true,chemin:'CDQ System / Facture / ' + identity.nom + ' / ' + category};
    }
    var blob = Utilities.newBlob(bytes, 'image/jpeg', unique.name);
    var file = dest.category.createFile(blob);
    var meta = {
      schema:2,
      requestId:requestId,
      technicien:identity.nom,
      email:identity.email,
      categorie:category,
      montant:amount,
      date:date,
      commercant:cdqInvoiceCleanV2590_(payload.commercant || '', 120),
      description:cdqInvoiceCleanV2590_(payload.description || '', 240),
      createdAt:new Date().toISOString()
    };
    try { file.setDescription(JSON.stringify(meta)); } catch (e) {}
    return {ok:true,id:file.getId(),url:file.getUrl(),nom:file.getName(),technicien:identity.nom,categorie:category,chemin:'CDQ System / Facture / ' + identity.nom + ' / ' + category};
  } finally {
    lock.releaseLock();
  }
}

function cdqListerFacturesV2590(limit) {
  var identity = cdqInvoiceIdentityV2590_();
  var existing = cdqInvoiceExistingTechV2590_(identity.nom);
  if (!existing) return [];
  var max = Math.max(1, Math.min(250, Number(limit) || 100));
  var rows = [];
  CDQ_INVOICE_CATEGORIES_V2590.forEach(function(category) {
    var folder = cdqInvoiceFindChildV2590_(existing.tech, category);
    if (!folder) return;
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      if (file.isTrashed()) continue;
      rows.push(cdqInvoiceMetaV2590_(file, category));
    }
  });
  rows.sort(function(a,b) {
    var aa = Date.parse(a.createdAt || a.updatedAt || 0) || 0;
    var bb = Date.parse(b.createdAt || b.updatedAt || 0) || 0;
    return bb - aa;
  });
  return rows.slice(0, max);
}

function cdqSupprimerFactureV2590(fileId) {
  var id = cdqInvoiceCleanV2590_(fileId || '', 200);
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new Error('Facture invalide.');
  var identity = cdqInvoiceIdentityV2590_();
  var existing = cdqInvoiceExistingTechV2590_(identity.nom);
  if (!existing) throw new Error('Aucun dossier Facture n’existe pour ce technicien.');

  var allowed = {};
  CDQ_INVOICE_CATEGORIES_V2590.forEach(function(category) {
    var folder = cdqInvoiceFindChildV2590_(existing.tech, category);
    if (folder) allowed[folder.getId()] = true;
  });

  var file;
  try { file = DriveApp.getFileById(id); } catch (e) { throw new Error('Facture introuvable.'); }
  var parents = file.getParents();
  var authorized = false;
  while (parents.hasNext()) {
    var parent = parents.next();
    if (allowed[parent.getId()]) { authorized = true; break; }
  }
  if (!authorized) throw new Error('Cette facture n’appartient pas au dossier du technicien connecté.');
  file.setTrashed(true);
  return {ok:true,id:id,nom:file.getName(),technicien:identity.nom};
}
