var CDQ_MEDIA_CONTEXT_V20261113_=false;
function cdqMediaActiveV20261113_(){return PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_MEDIA_V1')==='on';}
function cdqMediaLockV20261113_(){if(CDQ_MEDIA_CONTEXT_V20261113_)return{hasLock:function(){return true;},waitLock:function(){},tryLock:function(){return true;},releaseLock:function(){}};return LockService.getScriptLock();}
function cdqMediaTxnV20261113_(run){if(CDQ_MEDIA_CONTEXT_V20261113_)return run();var lock=LockService.getScriptLock(),held=lock.hasLock();if(!held)lock.waitLock(30000);CDQ_MEDIA_CONTEXT_V20261113_=true;try{return run();}finally{CDQ_MEDIA_CONTEXT_V20261113_=false;if(!held)lock.releaseLock();}}
function cdqMediaHashV20261113_(text){return cdqCoordMigrationHashV20261113_(Utilities.newBlob(String(text)).getBytes());}
function cdqMediaActorV20261113_(write){return CDQ_INVENTORY_CONTEXT_V20261113_&&!CDQ_INVENTORY_CONTEXT_V20261113_.legacy?CDQ_INVENTORY_CONTEXT_V20261113_.actor:verifierDroit_(write?'ecriture':'lecture');}
function cdqMediaCallV20261113_(actor,action,kind,owner,target,payload,intent){
 var scope={store:'media-v1',role:normaliserRoleCDQ_(actor.role),kind:kind,ownerKey:owner,targetKey:target||'',intent:intent||'business'};
 var e=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload||{},scope:scope});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(e),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
 var r;try{r=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('MEDIA_RESPONSE_INVALID');}
 if(response.getResponseCode()!==200||r.ok!==true||r.kind!=='system-media-v1')throw Error('MEDIA_UNCONFIRMED_'+String(r&&r.code||response.getResponseCode()));return r.result;
}
function cdqMediaListV20261113_(actor,kind,owner,target){var r=cdqMediaCallV20261113_(actor,'systemMediaListV1',kind,owner,target,{});if(r.state!=='ok'||!Array.isArray(r.files))throw Error('MEDIA_LIST_INVALID');return r.files;}
function cdqMediaCreateV20261113_(actor,kind,owner,target,request,blob,meta){
 var bytes=blob.getBytes(),sha=cdqCoordMigrationHashV20261113_(bytes),r=cdqMediaCallV20261113_(actor,'systemMediaCreateV1',kind,owner,target,{id:'cdqmedia_'+Utilities.getUuid().replace(/-/g,''),requestKey:cdqMediaHashV20261113_(JSON.stringify([kind,owner,target,request])),name:blob.getName(),mime:blob.getContentType(),contentBase64:Utilities.base64Encode(bytes),meta:meta});
 if(!['created','replayed'].includes(r.state)||!r.file||r.file.sha256!==sha||r.file.bytes!==bytes.length)throw Error('MEDIA_WRITE_UNCONFIRMED');return r.file;
}
function cdqMediaReadV20261113_(actor,kind,owner,target,id,binary){var r=cdqMediaCallV20261113_(actor,'systemMediaReadV1',kind,owner,target,{id:id,binary:!!binary});if(r.state!=='ok'||!r.file||r.file.id!==id)throw Error('MEDIA_READ_UNCONFIRMED');return r;}
function cdqMediaDeleteV20261113_(actor,kind,owner,target,id){var r=cdqMediaReadV20261113_(actor,kind,owner,target,id,false),deleted=cdqMediaCallV20261113_(actor,'systemMediaDeleteV1',kind,owner,target,{id:id,expectedRevision:r.file.revision,expectedSha256:r.file.sha256,requestKey:cdqMediaHashV20261113_('delete:'+id+':'+r.file.revision)});if(deleted.state!=='deleted'||deleted.file.id!==id)throw Error('MEDIA_DELETE_UNCONFIRMED');return deleted.file;}
function cdqMediaBlobV20261113_(actor,kind,owner,target,id){var r=cdqMediaReadV20261113_(actor,kind,owner,target,id,true),bytes=Utilities.base64Decode(r.contentBase64);if(bytes.length!==r.file.bytes||cdqCoordMigrationHashV20261113_(bytes)!==r.file.sha256)throw Error('MEDIA_INTEGRITY');return Utilities.newBlob(bytes,r.file.mime,r.file.name);}
function cdqMediaPhotoResultV20261113_(f){var m=f.meta;return{id:f.id,nom:f.name,date:m.capturedAt||f.createdAt,url:f.url,taille:f.bytes,type:m.type,cibleId:m.cibleId,idCompagnie:m.idCompagnie,datePhoto:m.datePhoto};}
function cdqMediaAttachedListV20261113_(type,id){var actor=verifierDroit_('lecture');type=String(type||'').toLowerCase();id=String(id||'').trim();var client=obtenirClientPhotoCDQ_(type,id);return cdqMediaListV20261113_(actor,'attached',client.getId(),type+':'+id).map(cdqMediaPhotoResultV20261113_).sort(function(a,b){return new Date(b.date)-new Date(a.date);});}
function cdqMediaAttachedSaveV20261113_(type,id,dataUrl,nomFichier,idCompagnie,photoMeta){
 var actor=verifierDroit_('ecriture');type=String(type||'').toLowerCase();id=String(id||'').trim();dataUrl=String(dataUrl||'');if(dataUrl.length>CDQ_PHOTO_MAX_BASE64_)throw Error('La photo est trop volumineuse. Réduisez sa taille.');
 var match=/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);if(!match)throw Error('Format de photo invalide.');
 var client=obtenirClientPhotoCDQ_(type,id),date=datePrisePhotoCDQ_(photoMeta),technicien=cdqTechnicienArchiveV2292_(actor.email),cible=cdqCibleArchiveV2292_(type,id,client),uploadId=String(photoMeta&&photoMeta.uploadId||'').slice(0,160),bytes=Utilities.base64Decode(match[2]);
 var nom=cdqBaseNomArchiveV2292_(date.jour,client,technicien,cible)+cdqExtensionPhotoV2292_(match[1],nomFichier),owner=client.getId(),target=type+':'+id,prior=uploadId?cdqMediaListV20261113_(actor,'attached',owner,target).filter(function(f){return f.meta.uploadId===uploadId;})[0]:null;
 if(prior){if(prior.sha256!==cdqCoordMigrationHashV20261113_(bytes))throw Error('Ce téléchargement a déjà été utilisé pour une autre photo.');return cdqMediaPhotoResultV20261113_(prior);}
 var meta={type:type,cibleId:id,idCompagnie:owner,capturedAt:date.capturedAt,datePhoto:date.jour,uploadId:uploadId,ajoutePar:actor.email,ajouteLe:new Date().toISOString(),technicien:technicien,nomCompagnie:client.getName(),nomCible:cible,rangement:'Photos/Compagnie/Date-Technicien',version:92};
 var f=cdqMediaCreateV20261113_(actor,'attached',owner,target,uploadId||Utilities.getUuid(),Utilities.newBlob(bytes,match[1].toLowerCase(),nom),meta);
 invaliderIndexPhotosCDQ_();invaliderCacheContenuClient_(owner);if(type==='client')invaliderCacheCompagnies_();return cdqMediaPhotoResultV20261113_(f);
}
function cdqMediaAttachedDeleteV20261113_(id){
 var actor=verifierDroit_('ecriture');id=String(id||'').trim();var scope=cdqMediaCallV20261113_(actor,'systemMediaLocateV1','attached','','',{id:id});
 if(scope.state!=='ok'||scope.file.kind!=='attached')throw Error('Photo introuvable.');var m=scope.file.meta,client=obtenirClientPhotoCDQ_(m.type,m.cibleId);if(client.getId()!==m.idCompagnie)throw Error('Photo hors du client autorisé.');
 cdqMediaDeleteV20261113_(actor,'attached',client.getId(),m.type+':'+m.cibleId,id);invaliderIndexPhotosCDQ_();invaliderCacheContenuClient_(client.getId());if(m.type==='client')invaliderCacheCompagnies_();return{ok:true,id:id,type:m.type,cibleId:m.cibleId};
}
function cdqMediaPhotoIndexV20261113_(){var r=cdqMediaCallV20261113_(verifierDroit_('lecture'),'systemMediaIndexV1','attached','','',{}),index={};if(r.state!=='ok'||!Array.isArray(r.targets))throw Error('MEDIA_INDEX_INVALID');r.targets.forEach(function(x){index[x.target_key]=true;});return index;}
function cdqMediaInvoiceOwnerV20261113_(identity){var key=cdqInvoiceNormalizeNameV2635_(identity.nom);if(!key)throw Error('Identité du technicien invalide.');return key;}
function cdqMediaInvoiceResultV20261113_(f){var m=f.meta;return{id:f.id,nom:f.name,url:f.url,categorie:cdqInvoiceCleanV2590_(m.categorie||'',80),montant:Number(m.montant||0),date:cdqInvoiceCleanV2590_(m.date||'',10),commercant:cdqInvoiceCleanV2590_(m.commercant||'',120),description:cdqInvoiceCleanV2590_(m.description||'',240),createdAt:cdqInvoiceCleanV2590_(m.createdAt||'',40),updatedAt:f.updatedAt};}
function cdqMediaInvoiceContextV20261113_(){cdqWsAccessV2638_(false);var identity=cdqInvoiceIdentityV2590_();return{ok:true,technicien:identity.dossier,nomTechnicien:identity.nom,codeTechnicien:cdqInvoiceTechnicianV2635_(identity.nom).code,email:identity.email,categories:CDQ_INVOICE_CATEGORIES_V2590.slice(),chemin:'Facture / '+identity.dossier+' / [AAAA-MM] / [Catégorie]',classement:'mensuel',storageRevision:2879};}
// Independent legacy business files and pending native system spreadsheets stay
// accessible through their original technician-scoped paths until their own cutover.
function cdqMediaLegacyInvoiceFoldersV20261113_(identity){
 if(CDQ_INVOICE_LEGACY_ROOT_ID_V2615===CDQ_INVOICE_ROOT_ID_V2590)throw Error('MEDIA_LEGACY_ROOT_CONFLICT');
 var out=[];[CDQ_INVOICE_LEGACY_ROOT_ID_V2615,CDQ_INVOICE_ROOT_ID_V2590].forEach(function(rootId){
  var root,facture;try{root=DriveApp.getFolderById(rootId);facture=cdqInvoiceFindChildV2590_(root,'Facture');}catch(_){return;}if(!facture)return;
  var locations=cdqInvoiceTechFoldersAtParentV2635_(facture,identity.nom).map(function(tech){return{root:root,facture:facture,tech:tech,rootId:rootId};});
  cdqInvoiceReadableFoldersV2732_(locations).forEach(function(entry){entry.nativeOnly=rootId===CDQ_INVOICE_ROOT_ID_V2590;out.push(entry);});
 });return out;
}
function cdqMediaLegacyInvoiceRowsV20261113_(identity){var rows=[],seen={};cdqMediaLegacyInvoiceFoldersV20261113_(identity).forEach(function(entry){
 var found=[];if(entry.nativeOnly){var it=entry.folder.getFiles();while(it.hasNext()){var file=it.next();if(!file.isTrashed()&&file.getMimeType()==='application/vnd.google-apps.spreadsheet')found.push(cdqInvoiceMetaV2590_(file,entry.category));}}else cdqInvoicePushFilesV2615_(found,entry.folder,entry.category);
 found.forEach(function(r){if(!seen[r.id]){seen[r.id]=true;rows.push(r);}});
 });return rows;}
function cdqMediaLegacyInvoiceDeleteV20261113_(identity,id){
 if(/^cdqmedia_/.test(id))return null;var allowed={};cdqMediaLegacyInvoiceFoldersV20261113_(identity).forEach(function(entry){allowed[entry.folder.getId()]=entry;});if(!Object.keys(allowed).length)return null;
 var file;try{file=DriveApp.getFileById(id);}catch(_){return null;}var parents=file.getParents(),authorized=false;while(parents.hasNext()){var entry=allowed[parents.next().getId()];if(entry&&(!entry.nativeOnly||file.getMimeType()==='application/vnd.google-apps.spreadsheet'))authorized=true;}if(!authorized)return null;
 file.setTrashed(true);return{ok:true,id:id,nom:file.getName(),technicien:identity.nom};
}
function cdqMediaInvoiceListV20261113_(limit){var actor=verifierDroit_('lecture'),identity=cdqInvoiceIdentityV2590_(),max=Math.max(1,Math.min(250,Number(limit)||100));return cdqMediaListV20261113_(actor,'invoice',cdqMediaInvoiceOwnerV20261113_(identity),'').map(cdqMediaInvoiceResultV20261113_).concat(cdqMediaLegacyInvoiceRowsV20261113_(identity)).sort(function(a,b){return(Date.parse(b.createdAt||b.updatedAt||0)||0)-(Date.parse(a.createdAt||a.updatedAt||0)||0);}).slice(0,max);}
function cdqMediaInvoiceSaveV20261113_(payload){
 var actor=verifierDroit_('ecriture');payload=payload||{};var requestId=cdqInvoiceCleanV2590_(payload.requestId||'',120);if(!/^[A-Za-z0-9._-]{8,120}$/.test(requestId))throw Error('Identifiant de facture invalide.');
 var identity=cdqInvoiceIdentityV2590_(),category=cdqInvoiceCleanV2590_(payload.categorie||'',80);if(CDQ_INVOICE_CATEGORIES_V2590.indexOf(category)<0)throw Error('Choisissez une catégorie de dépense.');
 var amount=cdqInvoiceAmountV2590_(payload.montant),date=cdqInvoiceCleanV2590_(payload.date||'',40),month=cdqInvoiceMonthFolderNameV2615_(date),match=String(payload.dataUrl||'').match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);if(!match)throw Error('La photo de facture est invalide.');
 var bytes=Utilities.base64Decode(match[1].replace(/\s+/g,''));if(!bytes.length||bytes.length>10*1024*1024)throw Error('La photo est vide ou dépasse 10 Mo après optimisation.');
 var owner=cdqMediaInvoiceOwnerV20261113_(identity),target=month+'/'+category,rows=cdqMediaListV20261113_(actor,'invoice',owner,target),prior=rows.filter(function(f){return f.meta.requestId===requestId;})[0],name='',index=0;
 if(prior){if(prior.sha256!==cdqCoordMigrationHashV20261113_(bytes)||Number(prior.meta.montant)!==amount||String(prior.meta.date)!==date)throw Error('Cette demande contient une autre facture.');return{ok:true,id:prior.id,url:prior.url,nom:prior.name,technicien:identity.dossier,categorie:category,duplicate:true,mois:month,storageRevision:2879,chemin:'Facture / '+identity.dossier+' / '+target};}
 while(index<100){name=cdqInvoiceFileNameV2590_(amount,date,index?index+1:0);if(!rows.some(function(f){return f.name===name;}))break;index++;}if(index===100)throw Error('Impossible de générer un nom de facture unique.');
 var meta={schema:4,requestId:requestId,technicien:identity.nom,email:identity.email,categorie:category,mois:month,montant:amount,date:date,commercant:cdqInvoiceCleanV2590_(payload.commercant||'',120),description:cdqInvoiceCleanV2590_(payload.description||'',240),createdAt:new Date().toISOString()},f=cdqMediaCreateV20261113_(actor,'invoice',owner,target,requestId,Utilities.newBlob(bytes,'image/jpeg',name),meta);
 return{ok:true,id:f.id,url:f.url,nom:f.name,technicien:identity.dossier,categorie:category,mois:month,storageRevision:2879,chemin:'Facture / '+identity.dossier+' / '+target};
}
function cdqMediaInvoiceDeleteV20261113_(id){var actor=verifierDroit_('ecriture'),identity=cdqInvoiceIdentityV2590_();id=cdqInvoiceCleanV2590_(id||'',200);if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error('Facture invalide.');var legacy=cdqMediaLegacyInvoiceDeleteV20261113_(identity,id);if(legacy)return legacy;var f=cdqMediaDeleteV20261113_(actor,'invoice',cdqMediaInvoiceOwnerV20261113_(identity),'',id);return{ok:true,id:id,nom:f.name,technicien:identity.nom};}
function cdqMediaInventoryFileV20261113_(blob,articleId){
 if(!cdqMediaActiveV20261113_())return cdqInvPhotoFolderV2593_().createFile(blob);var actor=cdqMediaActorV20261113_(true),f=cdqMediaCreateV20261113_(actor,'inventory','inventory',String(articleId),Utilities.getUuid(),blob,{articleId:String(articleId)});
 return{getId:function(){return f.id;},setTrashed:function(v){if(v!==true)throw Error('MEDIA_RESTORE_UNSUPPORTED');return cdqMediaDeleteV20261113_(actor,'inventory','inventory',String(articleId),f.id);}};
}
function cdqMediaInventoryBlobV20261113_(id,articleId){if(!cdqMediaActiveV20261113_())return DriveApp.getFileById(id).getBlob();return cdqMediaBlobV20261113_(cdqMediaActorV20261113_(false),'inventory','inventory',String(articleId),id);}
function cdqMediaInventoryTrashV20261113_(id){if(!cdqMediaActiveV20261113_())return DriveApp.getFileById(id).setTrashed(true);return cdqMediaDeleteV20261113_(cdqMediaActorV20261113_(true),'inventory','inventory','',id);}
