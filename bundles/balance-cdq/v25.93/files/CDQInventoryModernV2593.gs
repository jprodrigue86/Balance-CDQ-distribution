var CDQ_INV_SHEET_ID_V2593='17PIDHtJ5C2-THFEsf-gdK6V0oRrAoljij0spy0IffwI';
var CDQ_INV_ROOT_ID_V2593='1baB1UcQYcZ3szDlJp3y1geGbRuHWs335';

function cdqInvNowV2593_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Toronto','yyyy-MM-dd HH:mm:ss');}
function cdqInvCleanV2593_(v,max){return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max||180);}
function cdqInvAuthV2593_(deviceToken,admin){
  if(typeof obtenirEtatAcces!=='function')throw new Error("Service d'accès CDQ indisponible.");
  var etat=obtenirEtatAcces(String(deviceToken||''),'')||{};
  if(!etat.autorise)throw new Error("Accès CDQ non autorisé.");
  var role=String(etat.role||'technicien').toLowerCase();
  if(role==='lecture')throw new Error('Le compte Lecture seule ne peut pas modifier l’inventaire.');
  if(admin&&role!=='admin')throw new Error('Cette action est réservée aux administrateurs.');
  return {email:cdqInvCleanV2593_(etat.email||'',180).toLowerCase(),role:role,nom:cdqInvCleanV2593_(etat.nomRapport||etat.nom||etat.email||'',120)};
}
function cdqInvBookV2593_(){return SpreadsheetApp.openById(CDQ_INV_SHEET_ID_V2593);}
function cdqInvSheetV2593_(name){var s=cdqInvBookV2593_().getSheetByName(name);if(!s)throw new Error('Onglet inventaire introuvable : '+name);return s;}
function cdqInvEnsureHeadersV2593_(sheet,required){
  var last=Math.max(1,sheet.getLastColumn()),headers=sheet.getRange(1,1,1,last).getDisplayValues()[0].map(function(x){return String(x||'').trim();});
  required.forEach(function(h){if(headers.indexOf(h)<0){headers.push(h);sheet.getRange(1,headers.length).setValue(h);}});
  var map={};headers.forEach(function(h,i){if(h)map[h]=i;});return {headers:headers,map:map};
}
function cdqInvRowsV2593_(sheet,headers){
  var last=sheet.getLastRow();if(last<2)return[];
  return sheet.getRange(2,1,last-1,headers.length).getValues();
}
function cdqInvArticleSchemaV2593_(){
  var sh=cdqInvSheetV2593_('Articles');
  var h=cdqInvEnsureHeadersV2593_(sh,['articleId','numero','description','categorie','fabricant','minimumCamion','minimumShop','actif','majLe','modele','codeBarres','prixClient','imageFileId','imageUrl','prixMajLe','prixMajPar']);
  return {sheet:sh,headers:h.headers,map:h.map,rows:cdqInvRowsV2593_(sh,h.headers)};
}
function cdqInvArticleByIdV2593_(id,schema){
  schema=schema||cdqInvArticleSchemaV2593_();var m=schema.map;
  for(var i=0;i<schema.rows.length;i++){if(String(schema.rows[i][m.articleId])===String(id))return {row:i+2,values:schema.rows[i]};}
  throw new Error('Article introuvable.');
}
function cdqInvArticleObjectV2593_(row,m){
  return {
    articleId:String(row[m.articleId]||''),numero:String(row[m.numero]||''),description:String(row[m.description]||''),
    categorie:String(row[m.categorie]||''),fabricant:String(row[m.fabricant]||''),modele:String(row[m.modele]||''),
    codeBarres:String(row[m.codeBarres]||''),prixClient:Number(row[m.prixClient]||0),
    imageFileId:String(row[m.imageFileId]||''),imageUrl:String(row[m.imageUrl]||''),
    minimumCamion:Number(row[m.minimumCamion]||0),minimumShop:Number(row[m.minimumShop]||0),
    actif:String(row[m.actif]).toUpperCase()!=='FALSE'
  };
}
function cdqInvLocationNameV2593_(id){
  if(String(id)==='SHOP')return'Shop';
  try{
    var sh=cdqInvSheetV2593_('Stock'),h=cdqInvEnsureHeadersV2593_(sh,['emplacementId','emplacementNom','articleId','quantite','majLe']),rows=cdqInvRowsV2593_(sh,h.headers),m=h.map;
    for(var i=0;i<rows.length;i++)if(String(rows[i][m.emplacementId])===String(id)&&rows[i][m.emplacementNom])return String(rows[i][m.emplacementNom]);
  }catch(e){}
  return String(id||'');
}
function cdqInvStockChangeV2593_(articleId,locationId,delta,auth,type,note,originId,destId){
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    var sh=cdqInvSheetV2593_('Stock'),h=cdqInvEnsureHeadersV2593_(sh,['emplacementId','emplacementNom','articleId','quantite','majLe']),rows=cdqInvRowsV2593_(sh,h.headers),m=h.map,rowNum=0,current=0;
    for(var i=0;i<rows.length;i++){if(String(rows[i][m.emplacementId])===String(locationId)&&String(rows[i][m.articleId])===String(articleId)){rowNum=i+2;current=Number(rows[i][m.quantite]||0);break;}}
    var next=current+Number(delta||0);if(!isFinite(next)||next<0)throw new Error('Stock insuffisant.');
    var now=cdqInvNowV2593_();
    if(rowNum){sh.getRange(rowNum,m.quantite+1).setValue(next);sh.getRange(rowNum,m.majLe+1).setValue(now);}
    else{
      var line=new Array(h.headers.length).fill('');line[m.emplacementId]=locationId;line[m.emplacementNom]=cdqInvLocationNameV2593_(locationId);line[m.articleId]=articleId;line[m.quantite]=next;line[m.majLe]=now;sh.appendRow(line);
    }
    var as=cdqInvArticleSchemaV2593_(),a=cdqInvArticleObjectV2593_(cdqInvArticleByIdV2593_(articleId,as).values,as.map);
    var mv=cdqInvSheetV2593_('Mouvements'),mh=cdqInvEnsureHeadersV2593_(mv,['date','articleId','numero','description','quantite','origineId','origineNom','destinationId','destinationNom','utilisateur','type','note']),mm=mh.map;
    var mline=new Array(mh.headers.length).fill('');
    mline[mm.date]=now;mline[mm.articleId]=articleId;mline[mm.numero]=a.numero;mline[mm.description]=a.description;mline[mm.quantite]=Math.abs(Number(delta||0));
    mline[mm.origineId]=originId||'';mline[mm.origineNom]=originId?cdqInvLocationNameV2593_(originId):'';
    mline[mm.destinationId]=destId||'';mline[mm.destinationNom]=destId?(String(destId)==='SORTIE'?'Retiré':cdqInvLocationNameV2593_(destId)):'';
    mline[mm.utilisateur]=auth.email;mline[mm.type]=type||'';mline[mm.note]=cdqInvCleanV2593_(note||'',240);mv.appendRow(mline);
    return next;
  }finally{lock.releaseLock();}
}
function cdqInventaireCatalogueV2593(deviceToken){
  var auth=cdqInvAuthV2593_(deviceToken,false),s=cdqInvArticleSchemaV2593_(),m=s.map;
  return {ok:true,admin:auth.role==='admin',articles:s.rows.map(function(r){return cdqInvArticleObjectV2593_(r,m);}).filter(function(a){return a.actif;})};
}
function cdqInventaireMajPrixV2593(articleId,prix,deviceToken){
  var auth=cdqInvAuthV2593_(deviceToken,true),n=Number(prix);if(!isFinite(n)||n<0||n>1000000)throw new Error('Prix invalide.');
  n=Math.round(n*100)/100;
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    var s=cdqInvArticleSchemaV2593_(),found=cdqInvArticleByIdV2593_(articleId,s),m=s.map,old=Number(found.values[m.prixClient]||0),now=cdqInvNowV2593_();
    s.sheet.getRange(found.row,m.prixClient+1).setValue(n);s.sheet.getRange(found.row,m.prixMajLe+1).setValue(now);s.sheet.getRange(found.row,m.prixMajPar+1).setValue(auth.email);
    var book=cdqInvBookV2593_(),hist=book.getSheetByName('PrixHistorique')||book.insertSheet('PrixHistorique'),h=cdqInvEnsureHeadersV2593_(hist,['date','articleId','numero','description','ancienPrix','nouveauPrix','utilisateur']),line=new Array(h.headers.length).fill(''),mm=h.map,a=cdqInvArticleObjectV2593_(found.values,m);
    line[mm.date]=now;line[mm.articleId]=articleId;line[mm.numero]=a.numero;line[mm.description]=a.description;line[mm.ancienPrix]=old;line[mm.nouveauPrix]=n;line[mm.utilisateur]=auth.email;hist.appendRow(line);
    return {ok:true,articleId:String(articleId),prixClient:n};
  }finally{lock.releaseLock();}
}
function cdqInventaireAssocierCodeV2593(articleId,code,deviceToken){
  cdqInvAuthV2593_(deviceToken,true);code=cdqInvCleanV2593_(code,160);if(!code)throw new Error('Code-barres invalide.');
  var s=cdqInvArticleSchemaV2593_(),m=s.map;
  for(var i=0;i<s.rows.length;i++){if(String(s.rows[i][m.articleId])!==String(articleId)&&String(s.rows[i][m.codeBarres]||'').trim()===code)throw new Error('Ce code est déjà associé à un autre article.');}
  var f=cdqInvArticleByIdV2593_(articleId,s);s.sheet.getRange(f.row,m.codeBarres+1).setValue(code);s.sheet.getRange(f.row,m.majLe+1).setValue(cdqInvNowV2593_());
  return {ok:true,articleId:String(articleId),codeBarres:code};
}
function cdqInventaireAjouterShopV2593(articleId,qty,note,deviceToken){
  var auth=cdqInvAuthV2593_(deviceToken,false),q=Math.floor(Number(qty));if(!q||q<1||q>100000)throw new Error('Quantité invalide.');
  var next=cdqInvStockChangeV2593_(articleId,'SHOP',q,auth,'entree-shop',note||'Ajout à la Shop','ENTREE','SHOP');
  return {ok:true,articleId:String(articleId),quantite:next};
}
function cdqInventaireRetirerV2593(articleId,locationId,qty,note,deviceToken){
  var auth=cdqInvAuthV2593_(deviceToken,false),q=Math.floor(Number(qty));if(!q||q<1||q>100000)throw new Error('Quantité invalide.');
  var next=cdqInvStockChangeV2593_(articleId,locationId,-q,auth,'retrait',note||'Retrait inventaire',locationId,'SORTIE');
  return {ok:true,articleId:String(articleId),quantite:next};
}
function cdqInventaireNouvelArticleV2593(article,initialQty,deviceToken){
  var auth=cdqInvAuthV2593_(deviceToken,true);article=article||{};
  var numero=cdqInvCleanV2593_(article.numero,120),desc=cdqInvCleanV2593_(article.description,180);if(!numero&&!desc)throw new Error('Numéro ou description requis.');
  var s=cdqInvArticleSchemaV2593_(),m=s.map,barcode=cdqInvCleanV2593_(article.codeBarres,160);
  if(barcode){for(var i=0;i<s.rows.length;i++)if(String(s.rows[i][m.codeBarres]||'').trim()===barcode)throw new Error('Ce code-barres existe déjà.');}
  var id=Utilities.getUuid(),line=new Array(s.headers.length).fill(''),now=cdqInvNowV2593_();
  line[m.articleId]=id;line[m.numero]=numero;line[m.description]=desc;line[m.categorie]=cdqInvCleanV2593_(article.categorie||'Autres',100);line[m.fabricant]=cdqInvCleanV2593_(article.fabricant||'',120);
  line[m.minimumCamion]=Number(article.minimumCamion||0);line[m.minimumShop]=Number(article.minimumShop||0);line[m.actif]=true;line[m.majLe]=now;line[m.modele]=cdqInvCleanV2593_(article.modele||'',120);line[m.codeBarres]=barcode;
  var p=Number(article.prixClient||0);line[m.prixClient]=isFinite(p)&&p>=0?Math.round(p*100)/100:0;line[m.prixMajLe]=now;line[m.prixMajPar]=auth.email;s.sheet.appendRow(line);
  var q=Math.max(0,Math.floor(Number(initialQty)||0));if(q>0)cdqInvStockChangeV2593_(id,'SHOP',q,auth,'entree-shop','Création article','ENTREE','SHOP');
  return {ok:true,articleId:id};
}
function cdqInventairePhotoV2593(articleId,dataUrl,deviceToken){
  cdqInvAuthV2593_(deviceToken,true);var m=String(dataUrl||'').match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);if(!m)throw new Error('Image invalide.');
  var bytes=Utilities.base64Decode(m[1].replace(/\s+/g,''));if(!bytes.length||bytes.length>5*1024*1024)throw new Error('Image trop volumineuse.');
  var root=DriveApp.getFolderById(CDQ_INV_ROOT_ID_V2593),it=root.getFoldersByName('InventairePhotos'),folder=it.hasNext()?it.next():root.createFolder('InventairePhotos');
  var name='article-'+String(articleId)+'.jpg',existing=folder.getFilesByName(name);while(existing.hasNext()){try{existing.next().setTrashed(true);}catch(e){}}
  var file=folder.createFile(Utilities.newBlob(bytes,'image/jpeg',name)),url='https://drive.google.com/thumbnail?id='+encodeURIComponent(file.getId())+'&sz=w1000';
  var s=cdqInvArticleSchemaV2593_(),f=cdqInvArticleByIdV2593_(articleId,s),map=s.map;s.sheet.getRange(f.row,map.imageFileId+1).setValue(file.getId());s.sheet.getRange(f.row,map.imageUrl+1).setValue(url);s.sheet.getRange(f.row,map.majLe+1).setValue(cdqInvNowV2593_());
  return {ok:true,articleId:String(articleId),imageFileId:file.getId(),imageUrl:url};
}
