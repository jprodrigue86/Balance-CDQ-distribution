/* V27.51: binary upload is confined to an owner-only staging folder. The
 * resumable URL cannot mutate a client PDF. Only the authenticated RPC below
 * commits bytes and metadata together, after current authorization and revision
 * checks under ScriptLock. This serializes these guarded RPCs; legacy writers,
 * background workers and external Drive apps are not universal compare-and-swap. */
var CDQ_UPLOAD_PREFIX_V2751_='CDQ51_UPLOAD_';
var CDQ_UPLOAD_MAX_V2751_=32*1024*1024;
var CDQ_UPLOAD_TTL_V2751_=60*60*1000;
var CDQ_UPLOAD_FIELDS_V2751_='id,name,mimeType,parents,trashed,modifiedTime,size,appProperties,capabilities(canEdit)';
function cdqUploadHashV2751_(bytes){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function cdqUploadIdV2751_(id){id=String(id||'');if(!/^[A-Za-z0-9_-]{8,100}$/.test(id))throw Error('Identifiant d’envoi invalide.');return id;}
function cdqUploadAccessV2751_(write){
 var context=typeof CDQ_ACCES_RPC_COURANT_!=='undefined'&&CDQ_ACCES_RPC_COURANT_,key=context&&context.sessionKeyV2751;
 var session=key&&JSON.parse(PropertiesService.getScriptProperties().getProperty(key)||'null');
 if(!context||!session||Number(session.expiresAt||0)<=Date.now()||normaliserEmailCDQ_(session.email)!==normaliserEmailCDQ_(context.email))throw Error('SESSION EXPIRÉE : reconnectez votre compte CDQ autorisé.');
 var u=cdqWsAccessV2638_(!!write),current=trouverUtilisateurAutoriseParEmail_(u.email);
 if(!current||write&&['admin','technicien'].indexOf(normaliserRoleCDQ_(current.role))<0||!cdqVerifierCompteDriveV2620_(u.email).ok)throw Error('L’autorisation CDQ ou Drive a été retirée.');
 return current;
}
function cdqTransportCapabilitiesV2751(){cdqUploadAccessV2751_(false);return {ok:true,version:'27.51',binaryStaging:true,guardedSaveV2751:true,sourceManifestValidation:true,sha256Encoding:'hex-bytes-v1',maxBytes:CDQ_UPLOAD_MAX_V2751_,commitIsolation:'guarded-rpc-script-lock',externalDriveCAS:false,legacyWriterCAS:false};}
function cdqUploadKeyV2751_(actor,id){return CDQ_UPLOAD_PREFIX_V2751_+empreinteCDQ_(normaliserEmailCDQ_(actor)+'|'+id);}
// One private JSON ledger per upload avoids the 500 KB aggregate Script
// Properties limit. Receipts remain recoverable for durable outbox retries.
// A deployment executing as another creator must never reuse or share the
// previous creator's private folder. Keep the legacy pointer untouched so
// already queued work pinned to the old deployment can still read its receipts.
// A caller may share this snapshot only inside one synchronous RPC phase. It is
// local (never Script/Cache properties) and discarded before waiting for a lock
// or reading PDF bytes. Current owner and ACL are checked afresh in each phase.
function cdqUploadStagingPointerV2752_(create,phase){
 if(phase&&phase.folderId)return phase.folderId;
 var email=normaliserEmailCDQ_(Session.getEffectiveUser().getEmail());if(!email)throw Error('Compte effectif du dépôt temporaire non vérifiable.');
 var props=PropertiesService.getScriptProperties(),key='CDQ52_STAGING_'+empreinteCDQ_(email),id=props.getProperty(key),meta,fields='id,owners(emailAddress),mimeType,trashed,parents';
 if(!id){
  var legacy=props.getProperty('CDQ51_STAGING_FOLDER');
  if(legacy){try{meta=Drive.Files.get(legacy,{fields:fields,supportsAllDrives:true});}catch(_){meta=null;}
   if(meta&&Array.isArray(meta.owners)&&meta.owners.length===1&&normaliserEmailCDQ_(meta.owners[0].emailAddress)===email)id=legacy;
   else meta=null;
  }
  if(!id&&create)id=DriveApp.createFolder('_CDQ_Uploads_V2751').getId();
  if(id)props.setProperty(key,id);
 }
 if(!id)return '';
 meta=meta||Drive.Files.get(id,{fields:fields,supportsAllDrives:true});
 if(!meta||!Array.isArray(meta.owners)||meta.owners.length!==1||normaliserEmailCDQ_(meta.owners[0].emailAddress)!==email)throw Error('Le dépôt temporaire appartient à un autre compte effectif.');
 cdqUploadPrivateV2751_(id);
 if(phase){phase.folderId=id;phase.meta=meta;}
 return id;
}
function cdqUploadLoadV2751_(key,phase){
 var folder=cdqUploadStagingPointerV2752_(false,phase);if(!folder)return null;
 var result=Drive.Files.list({q:"'"+cdq23Quote_(folder)+"' in parents and trashed=false and name='"+cdq23Quote_(key+'.json')+"' and mimeType='application/json'",fields:'files(id)',pageSize:2,supportsAllDrives:true,includeItemsFromAllDrives:true}).files||[];
 if(result.length>1)throw Error('Journal d’envoi ambigu.');if(!result.length)return null;
 var entry=JSON.parse(DriveApp.getFileById(result[0].id).getBlob().getDataAsString('UTF-8'));entry.ledgerId=result[0].id;return entry;
}
function cdqUploadStoreV2751_(key,entry){
 var blob=Utilities.newBlob(JSON.stringify(entry),'application/json',key+'.json');
 if(entry.ledgerId)Drive.Files.update({},entry.ledgerId,blob,{fields:'id',supportsAllDrives:true});
 else{var result=Drive.Files.create({name:key+'.json',mimeType:'application/json',parents:[entry.stagingFolderId]},blob,{fields:'id',supportsAllDrives:true});entry.ledgerId=result.id;}
}
function cdqUploadMetaV2751_(input,internalList){
 var p=input||{},m={uploadId:cdqUploadIdV2751_(p.uploadId),operation:String(p.operation||''),fileId:String(p.fileId||''),clientId:cdqDriveIdV2521_(p.clientId),destinationId:p.destinationId?cdqDriveIdV2521_(p.destinationId):'',expectedRevision:String(p.expectedRevision||''),name:String(p.name||''),sha256:String(p.sha256||'').toLowerCase(),size:Number(p.size),sourceId:String(p.sourceId||''),family:String(p.family||''),sha256Encoding:String(p.sha256Encoding||'')};
 if(['save','create'].indexOf(m.operation)<0||!Number.isInteger(m.size)||m.size<8||m.size>CDQ_UPLOAD_MAX_V2751_||!/^([a-f0-9]{64})$/.test(m.sha256)||m.sha256Encoding!=='hex-bytes-v1')throw Error('Contenu ou empreinte PDF invalide.');
 if(!m.name||m.name.length>200||/[\u0000-\u001f\u007f/\\]/.test(m.name)||!/^.+\.pdf$/i.test(m.name))throw Error('Nom PDF invalide.');
 if(m.operation==='save'){cdqDriveIdV2521_(m.fileId);if(!m.expectedRevision||!isFinite(Date.parse(m.expectedRevision)))throw Error('Révision PDF requise.');if(!m.destinationId){var saved=Drive.Files.get(m.fileId,{fields:'id,parents',supportsAllDrives:true});if(!saved.parents||saved.parents.length!==1)throw Error('Dossier du PDF introuvable.');m.destinationId=cdqDriveIdV2521_(saved.parents[0]);}}
 else{if(!m.destinationId)throw Error('Dossier destination requis.');if(!m.sourceId&&!m.family&&!internalList)throw Error('Source ou famille du rapport requise.');}
 if(internalList)m.internalListV2751=true;
 return m;
}
function cdqUploadFolderWriteV2751_(scope){
 (scope.path||[]).forEach(function(item){verifierModificationDossierAutorisee_(DriveApp.getFolderById(item.id),'enregistrer ce PDF');});
}
function cdqUploadDestinationV2751_(m,skipRevision){
 // The scope walker already accepts an invocation-local metadata cache. Seed
 // it with the complete fresh destination/file snapshots so their common
 // ancestors and the targets are not fetched twice in this same check.
 var cache={},destination=Drive.Files.get(m.destinationId,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});cache[m.destinationId]=destination;
 var scope=cdqDriveScopeV2521_(m.destinationId,cache,[CONFIG.MASTER_FOLDER_ID]);
 if(scope.meta.mimeType!=='application/vnd.google-apps.folder')throw Error('Choisissez un dossier client.');
 if(!scope.path||scope.path.length<2||String(scope.path[1].id)!==m.clientId)throw Error('Le dossier ne fait pas partie du client demandé.');
 cdqUploadFolderWriteV2751_(scope);
 if(destination.trashed||destination.capabilities&&destination.capabilities.canEdit===false)throw Error('Dossier destination non modifiable.');
 if(m.operation==='create'){
  if(!m.internalListV2751&&m.family&&!(typeof CDQ_REPORTS_V2642_!=='undefined'&&CDQ_REPORTS_V2642_[m.family]))throw Error('Famille de rapport inconnue.');
  if(m.sourceId){var source=cdqDriveScopeV2521_(cdqDriveIdV2521_(m.sourceId),cache,[CONFIG.MASTER_FOLDER_ID]);if(source.meta.mimeType!=='application/pdf'||!source.path||source.path.length<2||source.path[1].id!==m.clientId)throw Error('Source PDF du client non autorisée.');}
  return null;
 }
 var before=Drive.Files.get(m.fileId,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});cache[m.fileId]=before;
 var fileScope=cdqDriveScopeV2521_(m.fileId,cache,[CONFIG.MASTER_FOLDER_ID]);
 if(before.trashed||before.mimeType!=='application/pdf'||!before.parents||before.parents.length!==1||before.parents[0]!==m.destinationId||!fileScope.path||fileScope.path.length<3||fileScope.path[1].id!==m.clientId||before.capabilities&&before.capabilities.canEdit===false)throw Error('Le PDF ou son dossier client a changé.');
 if(!skipRevision&&String(before.modifiedTime)!==m.expectedRevision)throw Error('CONFLICT_REVISION : le PDF a changé depuis son ouverture.');
 return before;
}
function cdqUploadPrivateV2751_(id){
 var token='';do{var opts={fields:'nextPageToken,permissions(type,role,deleted)',pageSize:100,supportsAllDrives:true};if(token)opts.pageToken=token;var page=Drive.Permissions.list(id,opts);if(!page||!Array.isArray(page.permissions))throw Error('Confidentialité du dépôt temporaire non vérifiable.');
  if(page.permissions.some(function(p){return !p.deleted&&p.role!=='owner';}))throw Error('Le dépôt temporaire doit rester privé au propriétaire.');token=page.nextPageToken||'';
 }while(token);
}
function cdqUploadStagingFolderV2751_(phase){
 phase=phase||{};
 var id=cdqUploadStagingPointerV2752_(true,phase),meta=phase.meta;
 if(meta.trashed||meta.mimeType!=='application/vnd.google-apps.folder')throw Error('Dépôt temporaire indisponible.');
 // Reuse the folder metadata just checked for ownership. Each distinct
 // ancestor is still read and checked before a resumable URL is issued.
 var queue=[id],seen={};while(queue.length){var next=queue.shift();if(seen[next])continue;seen[next]=true;if(Object.keys(seen).length>60)throw Error('Dépôt temporaire invalide.');if(next===CONFIG.MASTER_FOLDER_ID||typeof CDQ_GENERAL_DRIVE_V2521_!=='undefined'&&next===CDQ_GENERAL_DRIVE_V2521_)throw Error('Le dépôt temporaire ne peut pas être un dossier client.');var ancestor=next===id?meta:Drive.Files.get(next,{fields:'id,parents,trashed',supportsAllDrives:true});if(ancestor.trashed)throw Error('Dépôt temporaire supprimé.');(ancestor.parents||[]).forEach(function(parent){queue.push(parent);});}
 return id;
}
function cdqBeginUploadV2751(input){
 var actor=cdqUploadAccessV2751_(true),m=cdqUploadMetaV2751_(input),key=cdqUploadKeyV2751_(actor.email,m.uploadId),fingerprint=cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify(m)).getBytes()),lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  actor=cdqUploadAccessV2751_(true);var phase={},old=cdqUploadLoadV2751_(key,phase);
  if(old&&old.fingerprint!==fingerprint)throw Error('Cet identifiant d’envoi concerne un autre contenu, nom ou dossier.');
  if(old&&old.receipt)return Object.assign({committed:true},cdqUploadReplayV2751_(old));
  cdqUploadDestinationV2751_(m,false);
  // A missing ledger after a creator change does not prove an earlier create
  // failed. Never duplicate its final file or invent an exact revision receipt.
  if(!old&&m.operation==='create'){
   var token='',pages={},count=0;do{
    if(count++>=100||pages[token])throw Error('Recherche des résultats précédents non confirmée.');pages[token]=true;
    var opts={q:"'"+cdq23Quote_(m.destinationId)+"' in parents and trashed=false and appProperties has { key='cdqUploadV2751' and value='"+cdq23Quote_(m.uploadId)+"' }",fields:'nextPageToken,incompleteSearch,files(id,appProperties)',pageSize:100,supportsAllDrives:true,includeItemsFromAllDrives:true};if(token)opts.pageToken=token;
    var previous=Drive.Files.list(opts);if(!previous||!Array.isArray(previous.files)||previous.incompleteSearch===true)throw Error('Recherche des résultats précédents non confirmée.');
    if(previous.files.some(function(file){return file.appProperties&&file.appProperties.cdqAuthorV2751===empreinteCDQ_(actor.email);}))throw Error('UPLOAD_RECEIPT_LEGACY : résultat déjà créé ; le reçu exact doit être confirmé par le déploiement du compte créateur précédent. Le PDF local reste en attente.');
    token=String(previous.nextPageToken||'');
   }while(token);
  }
  if(old&&old.expiresAt>Date.now())return {ok:true,uploadId:m.uploadId,uploadUrl:old.uploadUrl,expiresAt:old.expiresAt,sha256Encoding:'hex-bytes-v1'};
  if(old&&old.stagingId)try{Drive.Files.update({trashed:true},old.stagingId,null,{supportsAllDrives:true});}catch(_){}
  var folderId=cdqUploadStagingFolderV2751_(phase),ids=Drive.Files.generateIds({count:1,space:'drive',type:'files'}),stagingId=ids&&ids.ids&&ids.ids[0];if(!stagingId)throw Error('Identifiant temporaire indisponible.');
  var response=UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',{method:'post',contentType:'application/json; charset=UTF-8',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'X-Upload-Content-Type':'application/pdf','X-Upload-Content-Length':String(m.size)},payload:JSON.stringify({id:stagingId,name:m.uploadId+'.pdf',mimeType:'application/pdf',parents:[folderId],appProperties:{cdqStagingV2751:'1',cdqUpload:m.uploadId,cdqAuthor:empreinteCDQ_(actor.email)}}),muteHttpExceptions:true,followRedirects:false});
  var headers=response.getAllHeaders(),url=String(headers.Location||headers.location||'');if(response.getResponseCode()!==200||!/^https:\/\/(?:www|content)\.googleapis\.com\/upload\/drive\/v3\/files\?/.test(url))throw Error('Préparation du transfert binaire impossible.');
  var entry={actor:actor.email,meta:m,fingerprint:fingerprint,stagingId:stagingId,stagingFolderId:folderId,ledgerId:old&&old.ledgerId||'',uploadUrl:url,expiresAt:Date.now()+CDQ_UPLOAD_TTL_V2751_};cdqUploadStoreV2751_(key,entry);
  return {ok:true,uploadId:m.uploadId,uploadUrl:url,expiresAt:entry.expiresAt,sha256Encoding:'hex-bytes-v1'};
 }finally{lock.releaseLock();}
}
function cdqUploadPdfV2751_(bytes,m){
 if(bytes.length!==m.size||bytes.length<8||bytes.length>CDQ_UPLOAD_MAX_V2751_||bytes.slice(0,5).map(function(b){return String.fromCharCode(b&255);}).join('')!=='%PDF-'||cdqUploadHashV2751_(bytes)!==m.sha256)throw Error('Taille, signature PDF ou empreinte des octets incorrecte.');
 // Check a bounded trailer as well as the header. Filled reports intentionally
 // have their own bytes; an approved immutable template digest is not required.
 if(!/%%EOF[\x00\x09\x0a\x0c\x0d\x20]*$/.test(bytes.slice(-2048).map(function(b){return String.fromCharCode(b&255);}).join('')))throw Error('PDF incomplet.');
 return bytes;
}
function cdqUploadReceiptV2751_(result,m){return {ok:true,id:result.id,fileId:result.id,nom:result.name,name:result.name,revision:result.modifiedTime,clientId:m.clientId,destinationId:m.destinationId,sha256:m.sha256,size:m.size,sha256Encoding:'hex-bytes-v1',uploadId:m.uploadId,operationV2753:m.operation};}
function cdqUploadReplayV2751_(entry){
 var receipt=entry.receipt,m=Object.assign({},entry.meta,{operation:'save',fileId:receipt.id,expectedRevision:receipt.revision}),current=cdqUploadDestinationV2751_(m,false),p=current.appProperties||{};
 if(current.name!==receipt.name||String(current.size)!==String(receipt.size)||p.cdqUploadV2751!==m.uploadId||p.cdqHashV2751!==m.sha256||p.cdqAuthorV2751!==empreinteCDQ_(entry.actor))throw Error('CONFLICT_REVISION : le résultat de cet envoi a changé.');
 return receipt;
}
// Read-only reconciliation through the deployment that still executes as the
// historical creator. Never create a staging folder, resume an upload, repair a
// missing receipt or commit a file while answering this lookup.
function cdqHistoricalUploadReceiptV2752(input){
 var actor=cdqUploadAccessV2751_(true);if(normaliserEmailCDQ_(input&&input.owner)!==normaliserEmailCDQ_(actor.email))throw Error('Le reçu appartient à un autre compte CDQ.');
 var m=cdqUploadMetaV2751_(input),key=cdqUploadKeyV2751_(actor.email,m.uploadId),fingerprint=cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify(m)).getBytes()),lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  actor=cdqUploadAccessV2751_(true);
  var folder=PropertiesService.getScriptProperties().getProperty('CDQ51_STAGING_FOLDER');if(!folder)return {ok:true,committed:false,status:'missing'};
  var effective=normaliserEmailCDQ_(Session.getEffectiveUser().getEmail()),meta=Drive.Files.get(folder,{fields:'id,owners(emailAddress),trashed,mimeType',supportsAllDrives:true});
  if(!effective||!meta||meta.trashed||meta.mimeType!=='application/vnd.google-apps.folder'||!Array.isArray(meta.owners)||meta.owners.length!==1||normaliserEmailCDQ_(meta.owners[0].emailAddress)!==effective)throw Error('Le dépôt des reçus historiques ne correspond pas au compte effectif.');
  cdqUploadPrivateV2751_(folder);
  var found=Drive.Files.list({q:"'"+cdq23Quote_(folder)+"' in parents and trashed=false and name='"+cdq23Quote_(key+'.json')+"' and mimeType='application/json'",fields:'nextPageToken,incompleteSearch,files(id)',pageSize:2,supportsAllDrives:true,includeItemsFromAllDrives:true});
  if(!found||!Array.isArray(found.files)||found.incompleteSearch===true||found.nextPageToken||found.files.length>1)throw Error('Journal historique non confirmé.');
  if(!found.files.length)return {ok:true,committed:false,status:'missing'};
  var ledger=Drive.Files.get(found.files[0].id,{fields:'id,owners(emailAddress),parents,trashed,mimeType',supportsAllDrives:true});
  if(!ledger||ledger.trashed||ledger.mimeType!=='application/json'||!Array.isArray(ledger.parents)||ledger.parents.length!==1||ledger.parents[0]!==folder||!Array.isArray(ledger.owners)||ledger.owners.length!==1||normaliserEmailCDQ_(ledger.owners[0].emailAddress)!==effective)throw Error('Le journal historique ne correspond pas au dépôt privé.');
  cdqUploadPrivateV2751_(ledger.id);
  var entry=JSON.parse(DriveApp.getFileById(ledger.id).getBlob().getDataAsString('UTF-8'));
  if(!entry||entry.actor!==actor.email||entry.fingerprint!==fingerprint||cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify(entry.meta)).getBytes())!==fingerprint)throw Error('Le reçu historique concerne un autre compte, contenu, nom ou dossier.');
  if(!entry.receipt)return {ok:true,committed:false,status:'pending'};
  var receipt=entry.receipt;
  if(!receipt.ok||receipt.uploadId!==m.uploadId||receipt.sha256!==m.sha256||Number(receipt.size)!==m.size||receipt.sha256Encoding!=='hex-bytes-v1'||receipt.clientId!==m.clientId||receipt.destinationId!==m.destinationId||receipt.name!==m.name||m.operation==='save'&&receipt.id!==m.fileId)throw Error('Le reçu historique ne confirme pas cet envoi exact.');
  cdqUploadReplayV2751_(entry);
  cdqUploadPdfV2751_(DriveApp.getFileById(receipt.id).getBlob().getBytes(),m);
  actor=cdqUploadAccessV2751_(true);if(entry.actor!==actor.email)throw Error('Le compte CDQ a changé.');
  cdqUploadReplayV2751_(entry); // Reject a revision changed during byte loading.
  return {ok:true,committed:true,actor:actor.email,receipt:Object.assign({},receipt)};
 }finally{lock.releaseLock();}
}
function cdqUploadCommitV2751_(entry,bytes,actor,extra){
 var m=entry.meta,before=cdqUploadDestinationV2751_(m,true),author=empreinteCDQ_(actor.email),existing=before;
 if(m.operation==='create'){
  var matches=Drive.Files.list({q:"'"+cdq23Quote_(m.destinationId)+"' in parents and trashed=false and appProperties has { key='cdqUploadV2751' and value='"+cdq23Quote_(m.uploadId)+"' }",fields:'files('+CDQ_UPLOAD_FIELDS_V2751_+')',pageSize:100,supportsAllDrives:true,includeItemsFromAllDrives:true}).files||[];
  var own=matches.filter(function(f){return f.appProperties&&f.appProperties.cdqAuthorV2751===author;});if(own.length>1)throw Error('Cet envoi possède plusieurs résultats à vérifier.');existing=own[0]||null;
 }
 if(existing&&existing.appProperties&&existing.appProperties.cdqUploadV2751===m.uploadId&&existing.appProperties.cdqAuthorV2751===author){
  var p=existing.appProperties;if(p.cdqHashV2751!==m.sha256||p.cdqSizeV2751!==String(m.size)||p.cdqNameV2751!==m.name||existing.name!==m.name||String(existing.size)!==String(m.size)||extra&&extra.appProperties&&extra.appProperties.cdqListManifestV2751!==p.cdqListManifestV2751)throw Error('Cet envoi existe déjà avec un contenu, nom ou manifeste différent.');
  cdqUploadPdfV2751_(DriveApp.getFileById(existing.id).getBlob().getBytes(),m);return cdqUploadReceiptV2751_(existing,m);
 }
 if(m.operation==='save'&&before.modifiedTime!==m.expectedRevision)throw Error('CONFLICT_REVISION : le PDF a changé depuis son ouverture.');
 var properties=Object.assign({},before&&before.appProperties||{},{cdqUploadV2751:m.uploadId,cdqAuthorV2751:author,cdqHashV2751:m.sha256,cdqSizeV2751:String(m.size),cdqNameV2751:m.name,cdqHashEncodingV2751:'hex-bytes-v1'},extra&&extra.appProperties||{}),metadata={name:m.name,mimeType:'application/pdf',appProperties:properties};
 if(extra&&extra.description)metadata.description=extra.description;
 var blob=Utilities.newBlob(bytes,'application/pdf',m.name),result;
 if(m.operation==='create'){metadata.appProperties.cdqCreateUploadV2753=m.uploadId;metadata.appProperties.cdqCreateAuthorV2753=author;metadata.parents=[m.destinationId];result=Drive.Files.create(metadata,blob,{fields:'id,name,modifiedTime',supportsAllDrives:true});}
 else result=Drive.Files.update(metadata,m.fileId,blob,{fields:'id,name,modifiedTime',supportsAllDrives:true});
 if(!result||!result.id||!result.modifiedTime)throw Error('Confirmation Drive manquante.');
 return cdqUploadReceiptV2751_(result,m);
}
function cdqFinalizeUploadV2751(uploadId){
 var actor=cdqUploadAccessV2751_(true),key=cdqUploadKeyV2751_(actor.email,cdqUploadIdV2751_(uploadId)),phase={},entry=cdqUploadLoadV2751_(key,phase);
 if(!entry)throw Error('UPLOAD_EXPIRED CDQ_UPLOAD_ACCOUNT_MIGRATION_V2752 : journal temporaire indisponible pour ce compte créateur. Recommencez sa préparation sans supprimer le PDF local.');
 if(entry.actor!==actor.email)throw Error('Envoi temporaire d’un autre compte.');
 if(entry.receipt)return cdqUploadReplayV2751_(entry);
 if(entry.expiresAt<=Date.now())throw Error('UPLOAD_EXPIRED : le transfert temporaire a expiré. Recommencez sa préparation.');
 if(cdqUploadStagingFolderV2751_(phase)!==entry.stagingFolderId)throw Error('Le dépôt temporaire a changé.');var staged;try{staged=Drive.Files.get(entry.stagingId,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});}catch(_){throw Error('UPLOAD_INCOMPLETE : le transfert binaire reste à terminer.');}
 if(staged.trashed||!staged.parents||staged.parents.length!==1||staged.parents[0]!==entry.stagingFolderId||!staged.appProperties||staged.appProperties.cdqStagingV2751!=='1'||staged.appProperties.cdqUpload!==uploadId||staged.appProperties.cdqAuthor!==empreinteCDQ_(actor.email))throw Error('Fichier temporaire non confirmé.');
 if(staged.mimeType!=='application/pdf'||!Number(staged.size)||Number(staged.size)<entry.meta.size)throw Error('UPLOAD_INCOMPLETE : le transfert binaire reste à terminer.');
 if(String(staged.size)!==String(entry.meta.size))throw Error('Taille temporaire incorrecte.');
 cdqUploadPrivateV2751_(entry.stagingId);var bytes=cdqUploadPdfV2751_(DriveApp.getFileById(entry.stagingId).getBlob().getBytes(),entry.meta),lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  actor=cdqUploadAccessV2751_(true);var commitPhase={},current=cdqUploadLoadV2751_(key,commitPhase);if(!current||current.fingerprint!==entry.fingerprint)throw Error('L’envoi temporaire a changé.');if(current.receipt)return cdqUploadReplayV2751_(current);
  if(cdqUploadStagingFolderV2751_(commitPhase)!==entry.stagingFolderId)throw Error('Le dépôt temporaire a changé.');
  var receipt=cdqUploadCommitV2751_(entry,bytes,actor);entry.receipt=receipt;delete entry.uploadUrl;cdqUploadStoreV2751_(key,entry);
  try{Drive.Files.update({trashed:true},entry.stagingId,null,{supportsAllDrives:true});}catch(_){}
  invaliderCacheContenuClient_(entry.meta.clientId);invaliderCacheCompagnies_();return receipt;
 }finally{lock.releaseLock();}
}
// Match the client's exhaustive index, including PDF reports inside the
// immediate calibration-report folders. The legacy timer's Sheets-only child
// selection remains unchanged in its original module.
function cdqUploadListSourcesV2751_(clientId){
 var files=[],seen={},folders=[];
 function read(folderId,root){var token='',pages={},count=0;
  do{
   if(count++>=100||pages[token])throw Error('Lecture exhaustive des sources impossible.');pages[token]=true;
   var options={q:"'"+cdq23Quote_(folderId)+"' in parents and trashed=false",pageSize:100,fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime,parents)',supportsAllDrives:true,includeItemsFromAllDrives:true};if(token)options.pageToken=token;
   var result=Drive.Files.list(options);if(!result||!Array.isArray(result.files)||result.incompleteSearch===true)throw Error('Lecture des sources incomplète.');
   result.files.forEach(function(file){
    if(!file||!file.id||!file.mimeType)throw Error('Métadonnées des sources incomplètes.');
    if(file.mimeType==='application/vnd.google-apps.folder'){if(root&&/^rapports? (?:d ?)?etalonnages?$/.test(cdq23Norm_(file.name)))folders.push(file.id);return;}
    if(['application/pdf','application/vnd.google-apps.spreadsheet'].indexOf(file.mimeType)<0||/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/i.test(cdq23Norm_(file.name)))return;
    if(!file.modifiedTime||!isFinite(Date.parse(file.modifiedTime)))throw Error('Révision des sources absente.');
    if(seen[file.id]){if(seen[file.id]!==file.modifiedTime)throw Error('Révisions des sources non confirmées.');return;}seen[file.id]=file.modifiedTime;files.push(file);
    if(files.length>500)throw Error('Plus de 500 fiches actives : manifeste non confirmé.');
   });token=String(result.nextPageToken||'');
  }while(token);
 }
 read(clientId,true);folders.sort().forEach(function(id){read(id,false);});return files.sort(function(a,b){return a.id.localeCompare(b.id);});
}
function cdqSaveBalanceListV2751(clientId,fileId,base64,payload){
 var actor=cdqUploadAccessV2751_(true),p=payload||{},m=cdqUploadMetaV2751_({uploadId:p.saveId,operation:fileId?'save':'create',fileId:fileId,clientId:clientId,destinationId:p.destinationId||clientId,expectedRevision:p.listRevision,name:p.name,sha256:p.sha256,size:p.size,sha256Encoding:'hex-bytes-v1'},true);
 if(!Array.isArray(p.sources)||p.sources.length>500)throw Error('Manifeste exhaustif des sources requis.');
 var seen={},sources=p.sources.map(function(s){var id=cdqDriveIdV2521_(s&&s.id),revision=String(s&&s.revision||'');if(seen[id]||!revision||!isFinite(Date.parse(revision)))throw Error('Source ou révision invalide.');seen[id]=true;return {id:id,revision:revision};}).sort(function(a,b){return a.id.localeCompare(b.id);});
 if(typeof base64!=='string'||base64.length!==Math.ceil(m.size/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Error('PDF de liste invalide.');var bytes=cdqUploadPdfV2751_(Utilities.base64Decode(base64),m),lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  actor=cdqUploadAccessV2751_(true);var scope=cdqWsListClientV2646_(m.clientId);if(scope.meta.id!==m.clientId)throw Error('Choisissez le dossier client.');
  // Use the existing canonical destination already ensured by the client.
  // Creating/moving folders here would recursively acquire ScriptLock.
  if(m.fileId){var list=Drive.Files.get(m.fileId,{fields:'id,name,parents,trashed',supportsAllDrives:true});if(list.trashed||!list.parents||list.parents.length!==1)throw Error('Liste introuvable.');m.destinationId=list.parents[0];}
  else if(!p.destinationId)throw Error('Dossier Liste de Balance requis avant création.');
  var destination=cdqWsFolderV2638_(m.destinationId),folderName=String(destination.meta.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(folderName!=='liste de balance'||!destination.path||destination.path.length!==3||destination.path[1].id!==m.clientId||m.name!=='Liste de balance.pdf')throw Error('Destination de liste non autorisée.');
  var actual=cdqUploadListSourcesV2751_(m.clientId).map(function(s){return {id:String(s.id),revision:String(s.modifiedTime||'')};}).sort(function(a,b){return a.id.localeCompare(b.id);});
  if(JSON.stringify(actual)!==JSON.stringify(sources))throw Error('SOURCE_MANIFEST_CONFLICT : les sources du client ont changé.');
  actor=cdqUploadAccessV2751_(true);var manifestHash=cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify(sources)).getBytes()),key=cdqUploadKeyV2751_(actor.email,'list-'+m.uploadId),fingerprint=cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify([m,sources])).getBytes()),phase={},old=cdqUploadLoadV2751_(key,phase);
  if(old&&old.fingerprint!==fingerprint)throw Error('Cet identifiant de liste concerne un autre contenu, nom, dossier ou manifeste.');
  if(old&&old.receipt)return cdqUploadReplayV2751_(old);
  var receipt=cdqUploadCommitV2751_({meta:m},bytes,actor,{appProperties:{cdqListManifestV2751:manifestHash},description:JSON.stringify({cdqListeBalanceV2638:true,folderId:m.clientId,sourceManifestSha256:manifestHash,checkedAt:new Date().toISOString()})});
  receipt.saveId=m.uploadId;receipt.sourceManifestValidated=true;receipt.sourceManifestSha256=manifestHash;
  cdqUploadStoreV2751_(key,{actor:actor.email,meta:m,fingerprint:fingerprint,receipt:receipt,stagingFolderId:cdqUploadStagingFolderV2751_(phase),ledgerId:old&&old.ledgerId||''});
  invaliderCacheContenuClient_(m.clientId);invaliderCacheCompagnies_();return receipt;
 }finally{lock.releaseLock();}
}
