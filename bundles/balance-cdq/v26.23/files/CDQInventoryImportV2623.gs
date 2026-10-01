// CDQ V26.23 — import unique de l'inventaire réel fourni le 30 septembre 2026.
// L'import ne s'exécute qu'après déploiement de V26.23. Il sauvegarde Articles et Stock
// avant toute écriture. Les unités sérialisées existantes sont elles aussi sauvegardées puis
// remises à zéro, car le fichier source ne contient aucun numéro de série. Mouvements,
// Alertes et PushTokens restent intacts.

var CDQ_INV_IMPORT_MARKER_V2623 = 'CDQ_INV_IMPORT_V2623_DONE_20260930';
var CDQ_INV_IMPORT_VERSION_V2623 = '26.23';

function cdqInventorySeedAllV2623_(){
  var parts = [];
  var getters = [
    cdqInventorySeedV2623_0,
    cdqInventorySeedV2623_1,
    cdqInventorySeedV2623_2,
    cdqInventorySeedV2623_3
  ];
  getters.forEach(function(fn, i) {
    if (typeof fn !== 'function') throw new Error('Bloc de données inventaire V26.23 manquant : ' + (i + 1) + '/4.');
    var rows = fn();
    if (!Array.isArray(rows)) throw new Error('Bloc de données inventaire V26.23 invalide : ' + (i + 1) + '/4.');
    parts = parts.concat(rows);
  });
  if (parts.length !== 136) throw new Error('Inventaire V26.23 incomplet : ' + parts.length + '/136 articles.');
  return parts;
}

function cdqInventoryBackupNameV2623_(ss, base){
  var stamp = Utilities.formatDate(new Date(), 'America/Toronto', 'yyyyMMdd_HHmmss');
  var candidate = base + '_avant_V2623_' + stamp;
  var n = 2;
  while (ss.getSheetByName(candidate)) {
    candidate = base + '_avant_V2623_' + stamp + '_' + n;
    n++;
  }
  return candidate.slice(0, 99);
}

function cdqInventoryEnsureGridV2623_(sh, rows, cols){
  rows = Math.max(1, Number(rows) || 1);
  cols = Math.max(1, Number(cols) || 1);
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
}

function cdqInventoryEnsureSeedV2623_(){
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(CDQ_INV_IMPORT_MARKER_V2623) === '1') {
    return {ok:true, version:CDQ_INV_IMPORT_VERSION_V2623, alreadyImported:true, articles:136};
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (props.getProperty(CDQ_INV_IMPORT_MARKER_V2623) === '1') {
      return {ok:true, version:CDQ_INV_IMPORT_VERSION_V2623, alreadyImported:true, articles:136};
    }

    var seed = cdqInventorySeedAllV2623_();
    var ss = cdqInvSSV2593_();
    var articles = ss.getSheetByName('Articles');
    var stock = ss.getSheetByName('Stock');
    var units = ss.getSheetByName('Unites');
    if (!articles || !stock) throw new Error('Les feuilles Articles et Stock doivent exister avant l’import V26.23.');

    var articleBackup = articles.copyTo(ss);
    articleBackup.setName(cdqInventoryBackupNameV2623_(ss, 'Articles'));
    var stockBackup = stock.copyTo(ss);
    stockBackup.setName(cdqInventoryBackupNameV2623_(ss, 'Stock'));
    var unitsBackup = null;
    if (units) {
      unitsBackup = units.copyTo(ss);
      unitsBackup.setName(cdqInventoryBackupNameV2623_(ss, 'Unites'));
    }

    var articleHeaders = [
      'articleId','numero','description','categorie','fabricant','minimumCamion','minimumShop',
      'actif','majLe','modele','prixClient','codeBarres','photoFileId',
      'disponibleVente','skuSource','imageUrl','imageSourceUrl'
    ];
    var stockHeaders = ['emplacementId','emplacementNom','articleId','quantite','majLe'];
    var now = cdqInvNowV2593_();
    var articleRows = [];
    var stockRows = [];

    seed.forEach(function(r){
      // r = [id, numero, nom, qtePhysique, qteVente, prix, fabricant, categorie,
      //      modele, skuSource, imageUrl, imageSourceUrl]
      var id = String(r[0] || '');
      var physical = Number(r[3] || 0);
      var availableSale = Number(r[4] || 0);
      if (!id) throw new Error('Article V26.23 sans identifiant interne.');
      articleRows.push([
        id,
        String(r[1] || ''),
        String(r[2] || ''),
        String(r[7] || 'Autres'),
        String(r[6] || 'Divers'),
        0,
        0,
        true,
        now,
        String(r[8] || ''),
        Number(r[5] || 0),
        '',
        '',
        availableSale,
        String(r[9] || ''),
        String(r[10] || ''),
        String(r[11] || '')
      ]);
      stockRows.push(['SHOP','Shop (Atelier)',id,physical,now]);
    });

    cdqInventoryEnsureGridV2623_(articles, articleRows.length + 1, articleHeaders.length);
    cdqInventoryEnsureGridV2623_(stock, stockRows.length + 1, stockHeaders.length);
    articles.clearContents();
    stock.clearContents();

    articles.getRange(1,1,1,articleHeaders.length).setValues([articleHeaders]);
    articles.getRange(2,1,articleRows.length,articleHeaders.length).setValues(articleRows);
    stock.getRange(1,1,1,stockHeaders.length).setValues([stockHeaders]);
    stock.getRange(2,1,stockRows.length,stockHeaders.length).setValues(stockRows);

    // Le fichier source décrit des quantités agrégées et ne contient pas de numéros de série.
    // On évite donc de laisser d’anciennes unités de test pointer vers des articleId remplacés.
    if (units) {
      var unitHeaders = ['unitId','articleId','numeroSerie','codeBarres','emplacementId','emplacementNom','statut','dateEntree','dateSortie','dernierMouvement','utilisateur','motifSortie','destinationDetail','note'];
      cdqInventoryEnsureGridV2623_(units, 2, unitHeaders.length);
      units.clearContents();
      units.getRange(1,1,1,unitHeaders.length).setValues([unitHeaders]);
      try { units.setFrozenRows(1); } catch (e) {}
    }

    try { articles.setFrozenRows(1); } catch (e) {}
    try { stock.setFrozenRows(1); } catch (e) {}

    props.setProperty(CDQ_INV_IMPORT_MARKER_V2623, '1');
    props.setProperty('CDQ_INV_IMPORT_V2623_AT', new Date().toISOString());
    return {
      ok:true,
      version:CDQ_INV_IMPORT_VERSION_V2623,
      alreadyImported:false,
      articles:articleRows.length,
      shopRows:stockRows.length,
      articleBackup:articleBackup.getName(),
      stockBackup:stockBackup.getName(),
      unitsBackup:unitsBackup ? unitsBackup.getName() : ''
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function cdqInventoryImportStatusV2623(){
  var props = PropertiesService.getScriptProperties();
  return {
    ok:true,
    version:CDQ_INV_IMPORT_VERSION_V2623,
    imported:props.getProperty(CDQ_INV_IMPORT_MARKER_V2623) === '1',
    importedAt:String(props.getProperty('CDQ_INV_IMPORT_V2623_AT') || ''),
    articleCount:136
  };
}
