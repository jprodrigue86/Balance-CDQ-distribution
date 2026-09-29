var CDQ_INV_SHEET_ID_V2593='17PIDHtJ5C2-THFEsf-gdK6V0oRrAoljij0spy0IffwI';
var CDQ_INV_PHOTO_PARENT_V2593='1Xo6L1rziVxNniWeka_oOKtISALV8Ss7j';

function cdqInvSSV2593_(){return SpreadsheetApp.openById(CDQ_INV_SHEET_ID_V2593);}
function cdqInvCleanV2593_(v,n){return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n||180);}
function cdqInvEmailV2593_(){try{return cdqInvCleanV2593_(Session.getActiveUser().getEmail()||'',180).toLowerCase();}catch(e){return '';}}
function cdqInvNowV2593_(){return Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd HH:mm:ss');}
function cdqInvActorV2593_(hint){
  var h=cdqInvCleanV2593_(hint||'',180).toLowerCase();
  if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(h))return h;
  return cdqInvEmailV2593_();
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
  return cdqInvEnsureHeadersV2593_(cdqInvSheetV2593_('Articles'),['prixClient','codeBarres','photoFileId']);
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
    if(typeof obtenirListeUtilisateurs==='function'){
      var users=obtenirListeUtilisateurs()||[];
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
        photoFileId:cdqInvCleanV2593_(r[h.map.photoFileId-1]||'',220)
      };
    });
  }
  inv.articles=(inv.articles||[]).map(function(a){var m=meta[String(a.articleId||'')]||{};return Object.assign({},a,m);});
  inv.utilisateur=Object.assign({},inv.utilisateur||{},{email:cdqInvEmailV2593_(),peutModifierPrix:cdqInvCanAdminV2593_()});
  return inv;
}
function cdqInventoryGetV2593(){
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
function cdqInvAppendMovementV2593_(article,qty,originId,originName,destId,destName,type,note,actor){
  var sh=cdqInvSheetV2593_('Mouvements');
  sh.appendRow([
    cdqInvNowV2593_(),article.articleId||'',article.numero||'',article.description||'',
    Number(qty)||0,originId||'',originName||'',destId||'',destName||'',
    cdqInvActorV2593_(actor),type||'',cdqInvCleanV2593_(note||'',240)
  ]);
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
function cdqInventoryMoveV2593(payload){
  payload=payload||{};
  var kind=cdqInvCleanV2593_(payload.kind||'',24).toLowerCase();
  var id=cdqInvCleanV2593_(payload.articleId||'',120),qty=Math.max(1,Math.floor(Number(payload.qty)||1));
  if(!id)throw new Error('Article invalide.');
  if(kind==='transfer'){
    var from=cdqInvCleanV2593_(payload.from||'',220),to=cdqInvCleanV2593_(payload.to||'',220);
    if(!from||!to||from===to)throw new Error('Choisissez deux emplacements différents.');
    var articleT=cdqInvFindArticleV2593_(id).row;
    var lockT=LockService.getScriptLock();lockT.waitLock(30000);
    try{
      var fromStock=cdqInvStockRowV2593_(id,from),toStock=cdqInvStockRowV2593_(id,to);
      var fromBefore=fromStock.row?Number(fromStock.row.quantite||0):0,toBefore=toStock.row?Number(toStock.row.quantite||0):0;
      if(fromBefore<qty)throw new Error('Quantité insuffisante à l’emplacement d’origine.');
      cdqInvSetQtyV2593_(id,from,fromBefore-qty);
      cdqInvSetQtyV2593_(id,to,toBefore+qty);
      cdqInvAppendMovementV2593_(articleT,qty,from,cdqInvLocationNameV2593_(from),to,cdqInvLocationNameV2593_(to),'transfert',payload.note||'Transfert',payload.userEmail);
    }finally{lockT.releaseLock();}
    return cdqInventoryGetV2593();
  }
  if(kind!=='add'&&kind!=='remove')throw new Error('Type de mouvement invalide.');
  var loc=cdqInvCleanV2593_(payload.location||payload.to||payload.from||'',220);
  if(!loc)throw new Error('Choisissez un emplacement.');
  var article=cdqInvFindArticleV2593_(id).row;
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    var stock=cdqInvStockRowV2593_(id,loc),before=stock.row?Number(stock.row.quantite||0):0;
    var after=kind==='add'?before+qty:before-qty;
    if(after<0)throw new Error('Quantité insuffisante à cet emplacement.');
    cdqInvSetQtyV2593_(id,loc,after);
    var locName=cdqInvLocationNameV2593_(loc);
    if(kind==='add')cdqInvAppendMovementV2593_(article,qty,'ENTREE','Entrée',loc,locName,'entree',payload.note||'Ajout de stock',payload.userEmail);
    else cdqInvAppendMovementV2593_(article,qty,loc,locName,'SORTIE','Retrait','sortie',payload.note||'Retrait de stock',payload.userEmail);
  }finally{lock.releaseLock();}
  return cdqInventoryGetV2593();
}
function cdqInventoryCreateV2593(payload){
  payload=payload||{};
  var numero=cdqInvCleanV2593_(payload.numero||'',90),description=cdqInvCleanV2593_(payload.description||'',180);
  if(!numero||!description)throw new Error('Numéro et description requis.');
  var sh=cdqInvSheetV2593_('Articles'),h=cdqInvArticleColumnsV2593_(),data=cdqInvRowsV2593_(sh);
  var code=cdqInvCleanV2593_(payload.codeBarres||'',120);
  if(data.rows.some(function(x){return String(x.numero||'').toLowerCase()===numero.toLowerCase();}))throw new Error('Ce numéro d’article existe déjà.');
  if(code&&data.rows.some(function(x){return cdqInvCleanV2593_(x.codeBarres||'',120)===code;}))throw new Error('Ce code-barres est déjà associé à un article.');
  var id=Utilities.getUuid(),now=cdqInvNowV2593_();
  var row=new Array(Math.max(sh.getLastColumn(),h.values.length)).fill('');
  function set(k,v){if(h.map[k])row[h.map[k]-1]=v;}
  set('articleId',id);set('numero',numero);set('description',description);
  set('categorie',cdqInvCleanV2593_(payload.categorie||'Autres',80)||'Autres');
  set('fabricant',cdqInvCleanV2593_(payload.fabricant||'Divers',100)||'Divers');
  set('modele',cdqInvCleanV2593_(payload.modele||'',100));
  set('minimumCamion',Math.max(0,Math.floor(Number(payload.minimumCamion)||0)));
  set('minimumShop',Math.max(0,Math.floor(Number(payload.minimumShop)||0)));
  set('actif',true);set('majLe',now);set('codeBarres',code);
  if(cdqInvCanAdminV2593_())set('prixClient',Math.max(0,Number(payload.prixClient)||0));
  sh.getRange(sh.getLastRow()+1,1,1,row.length).setValues([row]);
  var qty=Math.max(0,Math.floor(Number(payload.qty)||0)),loc=cdqInvCleanV2593_(payload.location||'SHOP',220)||'SHOP';
  if(qty>0){
    cdqInvSetQtyV2593_(id,loc,qty);
    cdqInvAppendMovementV2593_({articleId:id,numero:numero,description:description},qty,'ENTREE','Entrée',loc,cdqInvLocationNameV2593_(loc),'entree','Création article',payload.userEmail);
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
