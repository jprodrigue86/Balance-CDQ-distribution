var CDQ_INVOICE_ROOT_ID_V2590 = '1baB1UcQYcZ3szDlJp3y1geGbRuHWs335';
var CDQ_INVOICE_LEGACY_ROOT_ID_V2615 = '1HCjws2mraGJr3UpUBMNeeyc2uioug0Q5';
var CDQ_INVOICE_CATEGORIES_V2590 = ['Essence','Outils','Hébergement','Réparation véhicule','Restaurant','Autre'];
var CDQ_INVOICE_MONTHS_V2615 = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function cdqInvoiceCleanV2590_(value, maxLen) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen || 160);
}

// Invoice folders only: employee codes never change report names or permissions.
var CDQ_INVOICE_TECHNICIANS_V2635 = [{"nom":"Jean-Pierre Rodrigue","code":"0016"},{"nom":"Karim Khalfaoui","code":"1014"},{"nom":"Samuel Pintal","code":"4017"},{"nom":"Simon Claveau","code":"5014"},{"nom":"Joel Guifo","code":"3001"}];

function cdqInvoiceNormalizeNameV2635_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
}

function cdqInvoiceTechnicianV2635_(value) {
  var original = cdqInvoiceCleanV2590_(value,100);
  var base = original.replace(/\s*[-–—]\s*\d{4}\s*$/,'').trim();
  var key = cdqInvoiceNormalizeNameV2635_(base);
  var record = CDQ_INVOICE_TECHNICIANS_V2635.filter(function(row){return cdqInvoiceNormalizeNameV2635_(row.nom) === key;})[0];
  return record ? {nom:record.nom,code:record.code,dossier:record.nom+' - '+record.code,original:original}
    : {nom:original,code:'',dossier:original,original:original};
}

function cdqInvoiceTechFoldersAtParentV2635_(parent, technicien) {
  var identity=cdqInvoiceTechnicianV2635_(technicien),key=cdqInvoiceNormalizeNameV2635_(identity.nom);
  var folders=parent.getFolders(),rows=[];
  while(folders.hasNext()){
    var folder=folders.next(),name=folder.getName();
    var match=String(name).match(/^(.*?)\s*[-–—]\s*(\d{4})\s*$/);
    if(match){
      if(identity.code && match[2]===identity.code && cdqInvoiceNormalizeNameV2635_(match[1])===key)rows.push(folder);
      else if(!identity.code && name===identity.dossier)rows.push(folder);
    }else if(cdqInvoiceNormalizeNameV2635_(name)===key)rows.push(folder);
  }
  rows.sort(function(a,b){return Number(b.getName()===identity.dossier)-Number(a.getName()===identity.dossier);});
  return rows;
}

function cdqInvoiceTechFolderForWriteV2635_(parent, technicien) {
  var identity=cdqInvoiceTechnicianV2635_(technicien);
  var rows=cdqInvoiceTechFoldersAtParentV2635_(parent,technicien);
  if(rows.length){
    var folder=rows[0];
    if(identity.code && folder.getName()!==identity.dossier)folder.setName(identity.dossier);
    return folder;
  }
  return cdqInvoiceChildFolderV2590_(parent,identity.dossier);
}

function cdqInvoiceExistingTechFoldersV2635_(technicien) {
  var roots=[CDQ_INVOICE_ROOT_ID_V2590,CDQ_INVOICE_LEGACY_ROOT_ID_V2615],seen={},rows=[];
  roots.forEach(function(rootId){
    try{
      var root=DriveApp.getFolderById(rootId),facture=cdqInvoiceFindChildV2590_(root,'Facture');
      if(!facture)return;
      cdqInvoiceTechFoldersAtParentV2635_(facture,technicien).forEach(function(tech){
        var id=tech.getId();if(seen[id])return;seen[id]=true;
        rows.push({root:root,facture:facture,tech:tech,rootId:rootId});
      });
    }catch(e){}
  });
  return rows;
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
  return {nom:name,email:email,dossier:cdqInvoiceTechnicianV2635_(name).dossier};
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

function cdqInvoiceMonthFolderNameV2615_(date) {
  var clean = cdqInvoiceCleanV2590_(date || '', 10);
  var match = clean.match(/^(20\d{2})-(0[1-9]|1[0-2])-([0-3]\d)$/);
  if (!match) throw new Error('Date de facture invalide.');
  var month = Number(match[2]);
  return match[1] + '-' + match[2] + ' - ' + CDQ_INVOICE_MONTHS_V2615[month - 1];
}

function cdqInvoiceIsMonthFolderV2615_(name) {
  return /^20\d{2}-(0[1-9]|1[0-2]) - /.test(String(name || ''));
}

function cdqInvoiceDestinationV2590_(technicien, categorie, date) {
  if (CDQ_INVOICE_CATEGORIES_V2590.indexOf(categorie) < 0) throw new Error('Catégorie de facture invalide.');
  var root = cdqInvoiceSystemFolderV2590_();
  var facture = cdqInvoiceChildFolderV2590_(root, 'Facture');
  var tech = cdqInvoiceTechFolderForWriteV2635_(facture, technicien);
  var monthName = cdqInvoiceMonthFolderNameV2615_(date);
  var month = cdqInvoiceChildFolderV2590_(tech, monthName);
  return {root:root,facture:facture,tech:tech,month:month,monthName:monthName};
}

function cdqInvoiceExistingTechAtRootV2615_(rootId, technicien) {
  try {
    var root = DriveApp.getFolderById(rootId);
    if (!root) return null;
    var facture = cdqInvoiceFindChildV2590_(root, 'Facture');
    if (!facture) return null;
    var tech = cdqInvoiceFindChildV2590_(facture, technicien);
    return tech ? {root:root,facture:facture,tech:tech,rootId:rootId} : null;
  } catch (e) {
    return null;
  }
}

function cdqInvoiceExistingTechV2590_(technicien) {
  return cdqInvoiceExistingTechAtRootV2615_(CDQ_INVOICE_ROOT_ID_V2590, technicien);
}

function cdqInvoiceExistingTechFoldersV2615_(technicien) {
  return cdqInvoiceExistingTechFoldersV2635_(technicien);
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
  var user=cdqWsAccessV2638_(false);
  var identity = cdqInvoiceIdentityV2590_();
  if(['admin','technicien'].indexOf(user.role)>=0){
    cdqInvoiceDestinationV2590_(identity.nom,'Autre',Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd'));
    cdqWsInstallV2638_();
  }
  return {
    ok:true,
    technicien:identity.dossier,
    nomTechnicien:identity.nom,
    codeTechnicien:cdqInvoiceTechnicianV2635_(identity.nom).code,
    email:identity.email,
    categories:CDQ_INVOICE_CATEGORIES_V2590.slice(),
    chemin:'CDQ System / Facture / ' + identity.dossier + ' / [AAAA-MM - Mois]',
    classement:'mensuel'
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
    var dest = cdqInvoiceDestinationV2590_(identity.nom, category, date);
    var unique = cdqInvoiceUniqueNameV2590_(dest.month, amount, date, requestId);
    if (unique.existing) {
      return {ok:true,id:unique.existing.getId(),url:unique.existing.getUrl(),nom:unique.name,technicien:identity.dossier,categorie:category,duplicate:true,mois:dest.monthName,chemin:'CDQ System / Facture / ' + identity.dossier + ' / ' + dest.monthName};
    }
    var blob = Utilities.newBlob(bytes, 'image/jpeg', unique.name);
    var file = dest.month.createFile(blob);
    var meta = {
      schema:3,
      requestId:requestId,
      technicien:identity.nom,
      email:identity.email,
      categorie:category,
      mois:dest.monthName,
      montant:amount,
      date:date,
      commercant:cdqInvoiceCleanV2590_(payload.commercant || '', 120),
      description:cdqInvoiceCleanV2590_(payload.description || '', 240),
      createdAt:new Date().toISOString()
    };
    try { file.setDescription(JSON.stringify(meta)); } catch (e) {}
    return {ok:true,id:file.getId(),url:file.getUrl(),nom:file.getName(),technicien:identity.dossier,categorie:category,mois:dest.monthName,chemin:'CDQ System / Facture / ' + identity.dossier + ' / ' + dest.monthName};
  } finally {
    lock.releaseLock();
  }
}

function cdqInvoicePushFilesV2615_(rows, folder, fallbackCategory) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.isTrashed()) continue;
    rows.push(cdqInvoiceMetaV2590_(file, fallbackCategory || ''));
  }
}

function cdqListerFacturesV2590(limit) {
  var identity = cdqInvoiceIdentityV2590_();
  var locations = cdqInvoiceExistingTechFoldersV2615_(identity.nom);
  if (!locations.length) return [];
  var max = Math.max(1, Math.min(250, Number(limit) || 100));
  var rows = [];

  locations.forEach(function(existing) {
    // Nouveau classement : tous les reçus du même mois, toutes catégories
    // confondues, sont rangés dans un seul dossier mensuel.
    var folders = existing.tech.getFolders();
    while (folders.hasNext()) {
      var monthFolder = folders.next();
      if (cdqInvoiceIsMonthFolderV2615_(monthFolder.getName())) {
        cdqInvoicePushFilesV2615_(rows, monthFolder, '');
      }
    }

    // Compatibilité : les anciens dossiers par catégorie restent lisibles,
    // y compris ceux de l'ancien _CDQ_System.
    CDQ_INVOICE_CATEGORIES_V2590.forEach(function(category) {
      var legacy = cdqInvoiceFindChildV2590_(existing.tech, category);
      if (legacy) cdqInvoicePushFilesV2615_(rows, legacy, category);
    });
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
  var locations = cdqInvoiceExistingTechFoldersV2615_(identity.nom);
  if (!locations.length) throw new Error('Aucun dossier Facture n’existe pour ce technicien.');

  var allowed = {};
  locations.forEach(function(existing) {
    var folders = existing.tech.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      if (cdqInvoiceIsMonthFolderV2615_(folder.getName())) allowed[folder.getId()] = true;
    }
    CDQ_INVOICE_CATEGORIES_V2590.forEach(function(category) {
      var legacy = cdqInvoiceFindChildV2590_(existing.tech, category);
      if (legacy) allowed[legacy.getId()] = true;
    });
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