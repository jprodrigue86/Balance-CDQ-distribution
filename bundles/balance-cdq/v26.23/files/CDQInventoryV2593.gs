var CDQ_INV_SHEET_ID_V2593='17PIDHtJ5C2-THFEsf-gdK6V0oRrAoljij0spy0IffwI';
var CDQ_INV_PHOTO_PARENT_V2593='1Xo6L1rziVxNniWeka_oOKtISALV8Ss7j';

function cdqInvSSV2593_(){return SpreadsheetApp.openById(CDQ_INV_SHEET_ID_V2593);}
function cdqInvCleanV2593_(v,n){return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n||180);}
function cdqInvEmailV2593_(){
  try{
    if(typeof obtenirListeTechniciensRapports==='function'){
      var data=obtenirListeTechniciensRapports()||{},cur=data.courant||{};
      var e=cdqInvCleanV2593_(cur.email||'',180).toLowerCase();
      if(e)return e;
    }
  }catch(e){}
  try{return cdqInvCleanV2593_(Session.getActiveUser().getEmail()||'',180).toLowerCase();}catch(e){return '';}
}
function cdqInvNowV2593_(){return Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd HH:mm:ss');}
function cdqInvActorV2593_(hint){
  var server=cdqInvEmailV2593_();
  if(server)return server;
  var h=cdqInvCleanV2593_(hint||'',180).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(h)?h:'';
}
function cdqInvSheetV2593_(name){
  var sh=cdqInvSSV2593_().getSheetByName(name);
  if(!sh)throw new Error('Feuille inventaire introuvable : '+name);
  return sh;
}
function cdqInvHeadersV2593_(sh){
  var last=Math.max(1,sh.getLastColumn());
  var vals=sh.getRange(1,1,1,last).getValues()[0];
  var map={};vals.forEach(function(v,i){var k=cdqInvCleanV2593_(v,80);if(k)map[k]=i+1;});
  return {values:vals,map:map};
}
function cdqInvEnsureHeadersV2593_(sh,names){
  var h=cdqInvHeadersV2593_(sh),col=Math.max(1,h.values.length);
  names.forEach(function(name){
    if(!h.map[name]){col++;sh.getRange(1,col).setValue(name);h.map[name]=col;h.values[col-1]=name;}
  });
  return h;
}
function cdqInvRowsV2593_(sh){
  var h=cdqInvHeadersV2593_(sh),last=sh.getLastRow();
  if(last<2)return {headers:h,rows:[]};
  var vals=sh.getRange(2,1,last-1,Math.max(1,h.values.length)).getValues();
  return {headers:h,rows:vals.map(function(row,idx){var o={_row:idx+2};Object.keys(h.map).forEach(function(k){o[k]=row[h.map[k]-1];});return o;})};
}
function cdqInvArticleColumnsV2593_(){
  return cdqInvEnsureHeadersV2593_(cdqInvSheetV2593_('Articles'),['prixClient','codeBarres','photoFileId','disponibleVente','skuSource','imageUrl','imageSourceUrl']);
}
function cdqInvUnitSchemaV2616_(){
  var ss=cdqInvSSV2593_(),sh=ss.getSheetByName('Unites');
  var required=['unitId','articleId','numeroSerie','codeBarres','emplacementId','emplacementNom','statut','dateEntree','dateSortie','dernierMouvement','utilisateur','motifSortie','destinationDetail','note'];
  if(!sh){sh=ss.insertSheet('Unites');sh.getRange(1,1,1,required.length).setValues([required]);}
  var h=cdqInvEnsureHeadersV2593_(sh,required),data=cdqInvRowsV2593_(sh);
  return {sheet:sh,headers:h,rows:data.rows};
}
function cdqInvSerialKeyV2616_(v){return cdqInvCleanV2593_(v||'',160).toLowerCase().replace(/[^a-z0-9]/g,'');}
function cdqInvActiveUnitV2616_(articleId,serial){
  var key=cdqInvSerialKeyV2616_(serial);if(!key)return null;
  var s=cdqInvUnitSchemaV2616_(),hit=s.rows.find(function(u){return String(u.articleId||'')===String(articleId)&&cdqInvSerialKeyV2616_(u.numeroSerie)===key&&String(u.statut||'stock').toLowerCase()!=='sortie';});
  return hit?{schema:s,row:hit}:null;
}
function cdqInvUnitObjectV2616_(u){
  return {unitId:String(u.unitId||''),articleId:String(u.articleId||''),numeroSerie:String(u.numeroSerie||''),codeBarres:String(u.codeBarres||''),emplacementId:String(u.emplacementId||''),emplacementNom:String(u.emplacementNom||''),statut:String(u.statut||'stock'),dateEntree:String(u.dateEntree||''),dateSortie:String(u.dateSortie||''),dernierMouvement:String(u.dernierMouvement||''),utilisateur:String(u.utilisateur||''),motifSortie:String(u.motifSortie||''),destinationDetail:String(u.destinationDetail||''),note:String(u.note||'')};
}
function cdqInvActiveUnitsV2616_(){return cdqInvUnitSchemaV2616_().rows.filter(function(u){return String(u.statut||'stock').toLowerCase()!=='sortie';}).map(cdqInvUnitObjectV2616_);}
function cdqInvAppendUnitV2616_(articleId,serial,barcode,locationId,actor,note){
  var key=cdqInvSerialKeyV2616_(serial);if(!key)throw new Error('Numéro de série invalide.');
  if(cdqInvActiveUnitV2616_(articleId,serial))throw new Error('Ce numéro de série est déjà en stock pour cet article.');
  var s=cdqInvUnitSchemaV2616_(),m=s.headers.map,line=new Array(s.headers.values.length).fill(''),now=cdqInvNowV2593_(),id=Utilities.getUuid();
  function set(k,v){if(m[k])line[m[k]-1]=v;}
  set('unitId',id);set('articleId',String(articleId));set('numeroSerie',cdqInvCleanV2593_(serial,160));set('codeBarres',cdqInvCleanV2593_(barcode||'',180));
  set('emplacementId',String(locationId||''));set('emplacementNom',cdqInvLocationNameV2593_(locationId));set('statut','stock');set('dateEntree',now);set('dernierMouvement',now);set('utilisateur',cdqInvActorV2593_(actor));set('note',cdqInvCleanV2593_(note||'',240));
  s.sheet.getRange(s.sheet.getLastRow()+1,1,1,line.length).setValues([line]);return id;
}
function cdqInvUpdateUnitLocationV2616_(unit,locationId,actor,note){
  var s=unit.schema,u=unit.row,m=s.headers.map,now=cdqInvNowV2593_();
  if(m.emplacementId)s.sheet.getRange(u._row,m.emplacementId).setValue(String(locationId||''));
  if(m.emplacementNom)s.sheet.getRange(u._row,m.emplacementNom).setValue(cdqInvLocationNameV2593_(locationId));
  if(m.dernierMouvement)s.sheet.getRange(u._row,m.dernierMouvement).setValue(now);
  if(m.utilisateur)s.sheet.getRange(u._row,m.utilisateur).setValue(cdqInvActorV2593_(actor));
  if(m.note&&note)s.sheet.getRange(u._row,m.note).setValue(cdqInvCleanV2593_(note,240));
}
function cdqInvCloseUnitV2616_(unit,actor,reason,destinationDetail,note){
  var s=unit.schema,u=unit.row,m=s.headers.map,now=cdqInvNowV2593_();
  if(m.statut)s.sheet.getRange(u._row,m.statut).setValue('sortie');
  if(m.dateSortie)s.sheet.getRange(u._row,m.dateSortie).setValue(now);
  if(m.dernierMouvement)s.sheet.getRange(u._row,m.dernierMouvement).setValue(now);
  if(m.utilisateur)s.sheet.getRange(u._row,m.utilisateur).setValue(cdqInvActorV2593_(actor));
  if(m.motifSortie)s.sheet.getRange(u._row,m.motifSortie).setValue(cdqInvCleanV2593_(reason||'',100));
  if(m.destinationDetail)s.sheet.getRange(u._row,m.destinationDetail).setValue(cdqInvCleanV2593_(destinationDetail||'',180));
  if(m.note)s.sheet.getRange(u._row,m.note).setValue(cdqInvCleanV2593_(note||'',240));
}
function cdqInvAppendLegacyClosedUnitV2616_(articleId,serial,barcode,locationId,actor,reason,destinationDetail,note){
  var s=cdqInvUnitSchemaV2616_(),m=s.headers.map,line=new Array(s.headers.values.length).fill(''),now=cdqInvNowV2593_();
  function set(k,v){if(m[k])line[m[k]-1]=v;}
  set('unitId',Utilities.getUuid());set('articleId',String(articleId));set('numeroSerie',cdqInvCleanV2593_(serial,160));set('codeBarres',cdqInvCleanV2593_(barcode||'',180));set('emplacementId',String(locationId||''));set('emplacementNom',cdqInvLocationNameV2593_(locationId));set('statut','sortie');set('dateSortie',now);set('dernierMouvement',now);set('utilisateur',cdqInvActorV2593_(actor));set('motifSortie',cdqInvCleanV2593_(reason||'',100));set('destinationDetail',cdqInvCleanV2593_(destinationDetail||'',180));set('note',cdqInvCleanV2593_(note||'',240));
  s.sheet.getRange(s.sheet.getLastRow()+1,1,1,line.length).setValues([line]);
}
function cdqInvFindArticleV2593_(articleId){
  var sh=cdqInvSheetV2593_('Articles'),data=cdqInvRowsV2593_(sh);
  var id=String(articleId||'');
  var row=data.rows.find(function(x){return String(x.articleId||'')===id;});
  if(!row)throw new Error('Article introuvable.');
  return {sheet:sh,headers:cdqInvArticleColumnsV2593_(),row:row};
}
function cdqInvCanAdminV2593_(){
  var email=cdqInvEmailV2593_();
  try{
    var users=[];
    if(typeof obtenirUtilisateurs==='function')users=obtenirUtilisateurs()||[];
    else if(typeof obtenirListeUtilisateurs==='function')users=obtenirListeUtilisateurs()||[];
    if(Array.isArray(users)){
      var hit=users.find(function(u){return cdqInvCleanV2593_(u&&u.email||'',180).toLowerCase()===email;});
      if(hit)return String(hit.role||'').toLowerCase()==='admin';
    }
  }catch(e){}
  return email==='jp.rodrigue86@gmail.com';
}
function cdqInvRequireAdminV2593_(){
  if(!cdqInvCanAdminV2593_())throw new Error('Seul un administrateur peut modifier les prix.');
}
function cdqInvAugmentV2593_(inv){
  inv=inv||{};
  var sh=cdqInvSheetV2593_('Articles'),h=cdqInvArticleColumnsV2593_(),last=sh.getLastRow(),meta={};
  if(last>=2){
    var vals=sh.getRange(2,1,last-1,Math.max(sh.getLastColumn(),h.values.length)).getValues();
    vals.forEach(function(r){
      var id=String(r[h.map.articleId-1]||'');if(!id)return;
      meta[id]={
        prixClient:Number(r[h.map.prixClient-1]||0)||0,
        codeBarres:cdqInvCleanV2593_(r[h.map.codeBarres-1]||'',120),
        photoFileId:cdqInvCleanV2593_(r[h.map.photoFileId-1]||'',220),
        disponibleVente:Number(r[h.map.disponibleVente-1]||0)||0,
        skuSource:cdqInvCleanV2593_(r[h.map.skuSource-1]||'',120),
        imageUrl:cdqInvCleanV2593_(r[h.map.imageUrl-1]||'',700),
        imageSourceUrl:cdqInvCleanV2593_(r[h.map.imageSourceUrl-1]||'',700)
      };
    });
  }
  inv.articles=(inv.articles||[]).map(function(a){var m=meta[String(a.articleId||'')]||{};return Object.assign({},a,m);});
  inv.unites=cdqInvActiveUnitsV2616_();
  inv.utilisateur=Object.assign({},inv.utilisateur||{},{email:cdqInvEmailV2593_(),peutModifierPrix:cdqInvCanAdminV2593_()});
  return inv;
}
function cdqInventoryGetV2593(){
  if(typeof cdqInventoryEnsureSeedV2623_==='function')cdqInventoryEnsureSeedV2623_();
  var inv;
  if(typeof obtenirInventaire==='function')inv=obtenirInventaire();
  else{
    var art=cdqInvRowsV2593_(cdqInvSheetV2593_('Articles')).rows;
    var stocks=cdqInvRowsV2593_(cdqInvSheetV2593_('Stock')).rows;
    var locMap={};
    stocks.forEach(function(s){var id=String(s.emplacementId||'');if(id)locMap[id]={emplacementId:id,emplacementNom:String(s.emplacementNom||id)};});
    inv={articles:art,stocks:stocks,emplacements:Object.keys(locMap).map(function(k){return locMap[k];}),utilisateur:{monCamion:''}};
  }
  return cdqInvAugmentV2593_(inv);
}
function cdqInventoryHistoryV2593(limit){
  var rows=cdqInvRowsV2593_(cdqInvSheetV2593_('Mouvements')).rows;
  var max=Math.max(1,Math.min(300,Number(limit)||120));
  rows.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
  return rows.slice(0,max);
}
function cdqInvStockRowV2593_(articleId,loc){
  var sh=cdqInvSheetV2593_('Stock'),data=cdqInvRowsV2593_(sh);
  var hit=data.rows.find(function(x){return String(x.articleId||'')===String(articleId)&&String(x.emplacementId||'')===String(loc);});
  return {sheet:sh,headers:data.headers,row:hit};
}
function cdqInvLocationNameV2593_(loc){
  if(String(loc)==='SHOP')return 'Shop (Atelier)';
  var data=cdqInvRowsV2593_(cdqInvSheetV2593_('Stock')).rows;
  var hit=data.find(function(x){return String(x.emplacementId||'')===String(loc);});
  return hit?String(hit.emplacementNom||loc):String(loc||'');
}
function cdqInvAppendMovementV2593_(article,qty,originId,originName,destId,destName,type,note,actor,extra){
  var sh=cdqInvSheetV2593_('Mouvements'),h=cdqInvEnsureHeadersV2593_(sh,['date','articleId','numero','description','quantite','origineId','origineNom','destinationId','destinationNom','utilisateur','type','note','numeroSerie','unitId','motif','destinationDetail']),m=h.map,line=new Array(h.values.length).fill(''),x=extra||{};
  function set(k,v){if(m[k])line[m[k]-1]=v;}
  set('date',cdqInvNowV2593_());set('articleId',article.articleId||'');set('numero',article.numero||'');set('description',article.description||'');set('quantite',Number(qty)||0);set('origineId',originId||'');set('origineNom',originName||'');set('destinationId',destId||'');set('destinationNom',destName||'');set('utilisateur',cdqInvActorV2593_(actor));set('type',type||'');set('note',cdqInvCleanV2593_(note||'',240));set('numeroSerie',cdqInvCleanV2593_(x.numeroSerie||'',160));set('unitId',cdqInvCleanV2593_(x.unitId||'',180));set('motif',cdqInvCleanV2593_(x.motif||'',100));set('destinationDetail',cdqInvCleanV2593_(x.destinationDetail||'',180));
  sh.getRange(sh.getLastRow()+1,1,1,line.length).setValues([line]);
}
function cdqInvSetQtyV2593_(articleId,loc,newQty){
  var q=Math.max(0,Math.floor(Number(newQty)||0)),item=cdqInvStockRowV2593_(articleId,loc),sh=item.sheet;
  var now=cdqInvNowV2593_(),name=cdqInvLocationNameV2593_(loc);
  if(item.row){
    sh.getRange(item.row._row,item.headers.map.quantite).setValue(q);
    if(item.headers.map.majLe)sh.getRange(item.row._row,item.headers.map.majLe).setValue(now);
    if(item.headers.map.emplacementNom&&!item.row.emplacementNom)sh.getRange(item.row._row,item.headers.map.emplacementNom).setValue(name);
  }else{
    sh.appendRow([loc,name,articleId,q,now]);
  }
  return q;
}
function cdqInvAdjustAvailableSaleV2623_(articleId,delta){
  var a=cdqInvFindArticleV2593_(articleId),h=a.headers,current=Number(a.row.disponibleVente||0)||0;
  var next=current+Number(delta||0);
  a.sheet.getRange(a.row._row,h.map.disponibleVente).setValue(next);
  if(h.map.majLe)a.sheet.getRange(a.row._row,h.map.majLe).setValue(cdqInvNowV2593_());
  return next;
}
function cdqInventoryMoveV2593(payload){
  payload=payload||{};
  var kind=cdqInvCleanV2593_(payload.kind||'',24).toLowerCase(),id=cdqInvCleanV2593_(payload.articleId||'',120),serial=cdqInvCleanV2593_(payload.serial||'',160),unitBarcode=cdqInvCleanV2593_(payload.unitBarcode||'',180),qty=serial?1:Math.max(1,Math.floor(Number(payload.qty)||1));
  var reason=cdqInvCleanV2593_(payload.reason||'',100),destinationDetail=cdqInvCleanV2593_(payload.destinationDetail||'',180);
  if(!id)throw new Error('Article invalide.');
  if(kind==='transfer'){
    var from=cdqInvCleanV2593_(payload.from||'',220),to=cdqInvCleanV2593_(payload.to||'',220);
    if(!from||!to||from===to)throw new Error('Choisissez deux emplacements différents.');
    var articleT=cdqInvFindArticleV2593_(id).row,unitT=serial?cdqInvActiveUnitV2616_(id,serial):null;
    if(serial&&!unitT)throw new Error('Ce numéro de série n’est pas présent dans le stock suivi.');
    if(unitT&&String(unitT.row.emplacementId||'')!==String(from))throw new Error('Cette unité sérialisée se trouve à '+cdqInvLocationNameV2593_(unitT.row.emplacementId)+'.');
    var lockT=LockService.getScriptLock();lockT.waitLock(30000);
    try{
      var fromStock=cdqInvStockRowV2593_(id,from),toStock=cdqInvStockRowV2593_(id,to),fromBefore=fromStock.row?Number(fromStock.row.quantite||0):0,toBefore=toStock.row?Number(toStock.row.quantite||0):0;
      if(fromBefore<qty)throw new Error('Quantité insuffisante à l’emplacement d’origine.');
      cdqInvSetQtyV2593_(id,from,fromBefore-qty);cdqInvSetQtyV2593_(id,to,toBefore+qty);
      if(unitT)cdqInvUpdateUnitLocationV2616_(unitT,to,payload.userEmail,payload.note||'Transfert');
      cdqInvAppendMovementV2593_(articleT,qty,from,cdqInvLocationNameV2593_(from),to,cdqInvLocationNameV2593_(to),'transfert',payload.note||'Transfert',payload.userEmail,{numeroSerie:serial,unitId:unitT&&unitT.row.unitId||''});
    }finally{lockT.releaseLock();}
    return cdqInventoryGetV2593();
  }
  if(kind!=='add'&&kind!=='remove')throw new Error('Type de mouvement invalide.');
  var loc=cdqInvCleanV2593_(payload.location||payload.to||payload.from||'',220);if(!loc)throw new Error('Choisissez un emplacement.');
  var article=cdqInvFindArticleV2593_(id).row,unit=serial?cdqInvActiveUnitV2616_(id,serial):null;
  if(kind==='add'&&unit)throw new Error('Ce numéro de série est déjà en stock à '+cdqInvLocationNameV2593_(unit.row.emplacementId)+'.');
  if(kind==='remove'&&unit&&String(unit.row.emplacementId||'')!==String(loc))throw new Error('Cette unité sérialisée se trouve à '+cdqInvLocationNameV2593_(unit.row.emplacementId)+'.');
  if(kind==='remove'&&serial&&!unit&&!payload.allowLegacySerial)throw new Error('Ce numéro de série n’est pas encore suivi. Confirmez le retrait depuis l’ancien stock.');
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    var stock=cdqInvStockRowV2593_(id,loc),before=stock.row?Number(stock.row.quantite||0):0,after=kind==='add'?before+qty:before-qty;
    if(after<0)throw new Error('Quantité insuffisante à cet emplacement.');
    cdqInvSetQtyV2593_(id,loc,after);
    cdqInvAdjustAvailableSaleV2623_(id,kind==='add'?qty:-qty);
    var locName=cdqInvLocationNameV2593_(loc),unitId='';
    if(kind==='add'){
      if(serial)unitId=cdqInvAppendUnitV2616_(id,serial,unitBarcode,loc,payload.userEmail,payload.note||'Ajout de stock');
      cdqInvAppendMovementV2593_(article,qty,'ENTREE','Entrée',loc,locName,'entree',payload.note||'Ajout de stock',payload.userEmail,{numeroSerie:serial,unitId:unitId});
    }else{
      if(serial&&unit){unitId=String(unit.row.unitId||'');cdqInvCloseUnitV2616_(unit,payload.userEmail,reason,destinationDetail,payload.note||'Retrait de stock');}
      else if(serial){cdqInvAppendLegacyClosedUnitV2616_(id,serial,unitBarcode,loc,payload.userEmail,reason,destinationDetail,payload.note||'Retrait de stock');}
      cdqInvAppendMovementV2593_(article,qty,loc,locName,'SORTIE','Retrait','sortie',payload.note||'Retrait de stock',payload.userEmail,{numeroSerie:serial,unitId:unitId,motif:reason,destinationDetail:destinationDetail});
    }
  }finally{lock.releaseLock();}
  return cdqInventoryGetV2593();
}
function cdqInventoryCreateV2593(payload){
  payload=payload||{};
  var numero=cdqInvCleanV2593_(payload.numero||'',90),description=cdqInvCleanV2593_(payload.description||'',180);
  if(!numero||!description)throw new Error('Numéro et description requis.');
  var sh=cdqInvSheetV2593_('Articles'),h=cdqInvArticleColumnsV2593_(),data=cdqInvRowsV2593_(sh),code=cdqInvCleanV2593_(payload.codeBarres||'',120),serial=cdqInvCleanV2593_(payload.serial||'',160);
  if(data.rows.some(function(x){return String(x.numero||'').toLowerCase()===numero.toLowerCase();}))throw new Error('Ce numéro d’article existe déjà.');
  if(code&&data.rows.some(function(x){return cdqInvCleanV2593_(x.codeBarres||'',120)===code;}))throw new Error('Ce code-barres est déjà associé à un article.');
  var id=Utilities.getUuid(),now=cdqInvNowV2593_(),row=new Array(Math.max(sh.getLastColumn(),h.values.length)).fill('');
  function set(k,v){if(h.map[k])row[h.map[k]-1]=v;}
  set('articleId',id);set('numero',numero);set('description',description);set('categorie',cdqInvCleanV2593_(payload.categorie||'Autres',80)||'Autres');set('fabricant',cdqInvCleanV2593_(payload.fabricant||'Divers',100)||'Divers');set('modele',cdqInvCleanV2593_(payload.modele||'',100));set('minimumCamion',Math.max(0,Math.floor(Number(payload.minimumCamion)||0)));set('minimumShop',Math.max(0,Math.floor(Number(payload.minimumShop)||0)));set('actif',true);set('majLe',now);set('codeBarres',code);set('disponibleVente',serial?1:Math.max(0,Math.floor(Number(payload.qty)||0)));set('skuSource',cdqInvCleanV2593_(payload.skuSource||'',120));set('imageUrl',cdqInvCleanV2593_(payload.imageUrl||'',700));set('imageSourceUrl',cdqInvCleanV2593_(payload.imageSourceUrl||'',700));
  if(cdqInvCanAdminV2593_())set('prixClient',Math.max(0,Number(payload.prixClient)||0));
  sh.getRange(sh.getLastRow()+1,1,1,row.length).setValues([row]);
  var qty=serial?1:Math.max(0,Math.floor(Number(payload.qty)||0)),loc=cdqInvCleanV2593_(payload.location||'SHOP',220)||'SHOP';
  if(qty>0){
    cdqInvSetQtyV2593_(id,loc,qty);var unitId=serial?cdqInvAppendUnitV2616_(id,serial,payload.unitBarcode||'',loc,payload.userEmail,'Création article'):'';
    cdqInvAppendMovementV2593_({articleId:id,numero:numero,description:description},qty,'ENTREE','Entrée',loc,cdqInvLocationNameV2593_(loc),'entree','Création article',payload.userEmail,{numeroSerie:serial,unitId:unitId});
  }
  return {articleId:id,inventory:cdqInventoryGetV2593()};
}
function cdqInventorySetPriceV2593(articleId,price){
  cdqInvRequireAdminV2593_();
  var p=Math.max(0,Number(price)||0),a=cdqInvFindArticleV2593_(articleId),h=a.headers;
  var old=Number(a.row.prixClient||0)||0;
  a.sheet.getRange(a.row._row,h.map.prixClient).setValue(p);
  if(h.map.majLe)a.sheet.getRange(a.row._row,h.map.majLe).setValue(cdqInvNowV2593_());
  var ss=cdqInvSSV2593_(),hist=ss.getSheetByName('PrixHistorique');
  if(!hist){hist=ss.insertSheet('PrixHistorique');hist.appendRow(['date','articleId','numero','ancienPrix','nouveauPrix','utilisateur']);}
  hist.appendRow([cdqInvNowV2593_(),a.row.articleId||'',a.row.numero||'',old,p,cdqInvEmailV2593_()]);
  return {ok:true,articleId:String(articleId),prixClient:p};
}
function cdqInventoryBindBarcodeV2593(articleId,code){
  var c=cdqInvCleanV2593_(code||'',120);if(!c)throw new Error('Code-barres invalide.');
  var sh=cdqInvSheetV2593_('Articles'),h=cdqInvArticleColumnsV2593_(),data=cdqInvRowsV2593_(sh);
  var duplicate=data.rows.find(function(x){return String(x.articleId||'')!==String(articleId)&&cdqInvCleanV2593_(x.codeBarres||'',120)===c;});
  if(duplicate)throw new Error('Ce code-barres est déjà utilisé par '+String(duplicate.numero||'un autre article')+'.');
  var a=cdqInvFindArticleV2593_(articleId);a.sheet.getRange(a.row._row,h.map.codeBarres).setValue(c);
  return {ok:true,articleId:String(articleId),codeBarres:c};
}
function cdqInvPhotoFolderV2593_(){
  var parent=DriveApp.getFolderById(CDQ_INV_PHOTO_PARENT_V2593),it=parent.getFoldersByName('Inventaire');
  return it.hasNext()?it.next():parent.createFolder('Inventaire');
}
function cdqInventorySavePhotoV2593(articleId,dataUrl){
  var a=cdqInvFindArticleV2593_(articleId),raw=String(dataUrl||''),m=raw.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if(!m)throw new Error('Photo invalide.');
  var bytes=Utilities.base64Decode(m[1].replace(/\s+/g,''));if(bytes.length>4*1024*1024)throw new Error('Photo trop volumineuse.');
  var old=cdqInvCleanV2593_(a.row.photoFileId||'',220);if(old){try{DriveApp.getFileById(old).setTrashed(true);}catch(e){}}
  var name='INV-'+cdqInvCleanV2593_(a.row.numero||a.row.articleId,70).replace(/[^A-Za-z0-9._-]+/g,'-')+'.jpg';
  var file=cdqInvPhotoFolderV2593_().createFile(Utilities.newBlob(bytes,'image/jpeg',name));
  a.sheet.getRange(a.row._row,a.headers.map.photoFileId).setValue(file.getId());
  return {ok:true,articleId:String(articleId),photoFileId:file.getId()};
}
function cdqInventoryGetPhotoV2593(articleId){
  var a=cdqInvFindArticleV2593_(articleId),id=cdqInvCleanV2593_(a.row.photoFileId||'',220);
  if(!id)return {ok:true,dataUrl:''};
  var blob=DriveApp.getFileById(id).getBlob(),bytes=blob.getBytes();
  return {ok:true,dataUrl:'data:'+blob.getContentType()+';base64,'+Utilities.base64Encode(bytes)};
}


function cdqInvDecodeHtmlV2623_(value){
  return String(value||'')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>');
}
function cdqInvAbsoluteUrlV2623_(base, value){
  var v=cdqInvDecodeHtmlV2623_(value).trim();
  if(!v)return '';
  if(/^https?:\/\//i.test(v))return v;
  if(/^\/\//.test(v)){
    var proto=(String(base).match(/^https?:/i)||['https:'])[0];
    return proto+v;
  }
  var m=String(base||'').match(/^(https?:\/\/[^\/]+)(\/.*)?$/i);
  if(!m)return '';
  if(v.charAt(0)==='/')return m[1]+v;
  var path=(m[2]||'/').replace(/[?#].*$/,'');
  path=path.substring(0,path.lastIndexOf('/')+1);
  var joined=path+v,parts=[];
  joined.split('/').forEach(function(p){
    if(!p||p==='.')return;
    if(p==='..'){parts.pop();return;}
    parts.push(p);
  });
  return m[1]+'/'+parts.join('/');
}
function cdqInvExtractPageImageV2623_(html, sourceUrl){
  var text=String(html||'').slice(0,2500000),m=null;
  var patterns=[
    /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i,
    /<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*(?:property|name)\s*=\s*["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/i,
    /<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i,
    /<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']image_src["'][^>]*>/i,
    /"image"\s*:\s*"([^"]+)"/i
  ];
  for(var i=0;i<patterns.length;i++){
    m=text.match(patterns[i]);
    if(m&&m[1]){
      var url=cdqInvAbsoluteUrlV2623_(sourceUrl,m[1]);
      if(/^https?:\/\//i.test(url))return url;
    }
  }
  return '';
}
function cdqInventoryResolveOfficialImageV2623(articleId){
  var a=cdqInvFindArticleV2593_(articleId),h=a.headers;
  var direct=cdqInvCleanV2593_(a.row.imageUrl||'',900);
  if(direct)return {ok:true,articleId:String(articleId),imageUrl:direct,cached:true};
  var source=cdqInvCleanV2593_(a.row.imageSourceUrl||'',900);
  if(!/^https?:\/\//i.test(source))return {ok:true,articleId:String(articleId),imageUrl:'',sourceUrl:source};

  var cache=CacheService.getScriptCache(),cacheKey='cdq_img_v2623_'+String(articleId);
  var cached=cache.get(cacheKey);
  if(cached==='-')return {ok:true,articleId:String(articleId),imageUrl:'',sourceUrl:source,cached:true};
  if(cached)return {ok:true,articleId:String(articleId),imageUrl:cached,sourceUrl:source,cached:true};

  try{
    var response=UrlFetchApp.fetch(source,{
      muteHttpExceptions:true,
      followRedirects:true,
      validateHttpsCertificates:true,
      headers:{
        'User-Agent':'Mozilla/5.0 (compatible; BalanceCDQ/26.23; +https://groupecdq.com)',
        'Accept':'text/html,application/xhtml+xml'
      }
    });
    var status=Number(response.getResponseCode()||0);
    if(status<200||status>=400){
      cache.put(cacheKey,'-',1800);
      return {ok:false,articleId:String(articleId),imageUrl:'',sourceUrl:source,httpStatus:status};
    }
    var image=cdqInvExtractPageImageV2623_(response.getContentText(),source);
    if(!image){
      cache.put(cacheKey,'-',1800);
      return {ok:true,articleId:String(articleId),imageUrl:'',sourceUrl:source};
    }
    if(h.map.imageUrl){
      a.sheet.getRange(a.row._row,h.map.imageUrl).setValue(image);
      if(h.map.majLe)a.sheet.getRange(a.row._row,h.map.majLe).setValue(cdqInvNowV2593_());
    }
    cache.put(cacheKey,image,21600);
    return {ok:true,articleId:String(articleId),imageUrl:image,sourceUrl:source,cached:false};
  }catch(e){
    cache.put(cacheKey,'-',900);
    return {ok:false,articleId:String(articleId),imageUrl:'',sourceUrl:source,error:String(e&&e.message||e)};
  }
}

function cdqInventoryCapabilitiesV2616(){return {ok:true,version:'26.23',serialTracking:true,labelPhoto:true,realInventory:true,availableForSale:true,officialImageFallback:true};}
