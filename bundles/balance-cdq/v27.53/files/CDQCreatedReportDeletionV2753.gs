/* V27.53: an explicitly authenticated author may retire their own CDQ-created
 * PDF through the creator that owns it. This is a distinct, proven creation
 * operation, never a fallback for an ordinary Drive file or another author. */
// Generic, bounded metadata survives the shared client-list cache. Legacy
// mutable markers only locate a candidate ledger; CREATE proof remains required.
// Never publish an actor-specific permission in that cache.
function cdqCreatedReportListingHintV2753_(file){
 var p=file&&file.appProperties||{},marked=Object.prototype.hasOwnProperty.call(p,'cdqCreateUploadV2753')||Object.prototype.hasOwnProperty.call(p,'cdqCreateAuthorV2753');
 var upload=String((marked?p.cdqCreateUploadV2753:p.cdqUploadV2751)||''),author=String((marked?p.cdqCreateAuthorV2753:p.cdqAuthorV2751)||'');
 if(file?.mimeType!=='application/pdf'||!/^[A-Za-z0-9_-]{8,100}$/.test(upload)||!/^[a-f0-9]{64}$/.test(author))return {};
 return {_cdqCreationUploadHintV2753:upload,_cdqCreationAuthorHintV2753:author};
}
var CDQ_CREATED_REPORT_FIELDS_V2753_='id,name,mimeType,parents,description,trashed,driveId,owners(emailAddress),appProperties,capabilities(canTrash,canUntrash)';
function cdqCreatedReportRequestV2753_(payload){
 var p=payload||{},user=cdqWsAccessV2638_(true);cdqWsActorV2638_(user.email);
 var google=normaliserEmailCDQ_(p.googleAccount),clientId=cdqDriveIdV2521_(p.clientId),requestId=String(p.requestId||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(google)||!/^delete-[\w-]{8,100}$/.test(requestId)||typeof p.trash!=='boolean'||!Array.isArray(p.fileIds)||!p.fileIds.length||p.fileIds.length>100||p.folderIds&&(!Array.isArray(p.folderIds)||p.folderIds.length))throw Error('Demande de retrait de rapport CDQ invalide.');
 if(!cdqVerifierCompteDriveV2620_(google).ok)throw Error('Le compte Google choisi n’a plus accès aux dossiers CDQ autorisés.');
 verifierDroit_(p.trash?'suppressionFichier':'ecriture');
 return {actor:normaliserEmailCDQ_(user.email),googleAccount:google,clientId:clientId,requestId:requestId,trash:p.trash,creationUploadIds:p.creationUploadIds&&typeof p.creationUploadIds==='object'&&!Array.isArray(p.creationUploadIds)?p.creationUploadIds:{},fileIds:p.fileIds.map(function(id){return cdqDriveIdV2521_(id);}).filter(function(id,i,all){return all.indexOf(id)===i;})};
}
function cdqCreatedReportProofV2753_(meta,request){
 var actor=request.actor,author=empreinteCDQ_(actor),effective=normaliserEmailCDQ_(Session.getEffectiveUser().getEmail()),properties=meta.appProperties||{},owners=meta.owners||[];
 if(meta.mimeType!=='application/pdf'||meta.driveId||!effective||owners.length!==1||normaliserEmailCDQ_(owners[0].emailAddress)!==effective||!Array.isArray(meta.parents)||meta.parents.length!==1)return false;
 var marker=String(properties.cdqCreateUploadV2753||''),hint=String(request.creationUploadIds[meta.id]||''),uploadId=marker||hint||String(properties.cdqUploadV2751||'');
 if(uploadId){
  if(marker&&properties.cdqCreateAuthorV2753!==author||!marker&&!hint&&properties.cdqAuthorV2751!==author||!/^[A-Za-z0-9_-]{8,100}$/.test(uploadId))return false;
  var entry=cdqUploadLoadV2751_(cdqUploadKeyV2751_(actor,uploadId)),m=entry&&entry.meta,receipt=entry&&entry.receipt;
  // A hint only locates a private ledger. A save ledger, forged hint, other
  // author or different file/client/destination can never grant this route.
  if(entry&&normaliserEmailCDQ_(entry.actor)===actor&&m&&m.operation==='create'&&m.uploadId===uploadId&&m.clientId===request.clientId&&m.destinationId===meta.parents[0]&&receipt&&receipt.ok===true&&receipt.id===meta.id&&receipt.uploadId===uploadId&&receipt.clientId===request.clientId&&receipt.destinationId===meta.parents[0])return true;
  if(marker)return false;
 }
 // Compatibility creations retain their original private, actor-bound history.
 var legacy=String(properties.cdqCreateRequest||'');
 if(properties.cdqCreateAuthor!==author||!/^copy-[a-f0-9]{64}$/.test(legacy))return false;
 var history=JSON.parse(PropertiesService.getScriptProperties().getProperty('CDQ42_REPORT_'+author)||'[]');
 return Array.isArray(history)&&history.some(function(entry){return entry.request===legacy&&entry.id===meta.id&&entry.client===request.clientId&&entry.folder===meta.parents[0];});
}
function cdqCreatedReportInspectV2753_(id,request){
 var scope=cdqDeleteScopeV2752_(id,request.clientId,{}),root=scope.path[0];
 if(!root||root.id!==String(CONFIG.MASTER_FOLDER_ID)||scope.path.length<3||scope.path[1].id!==request.clientId)throw Error('Ce rapport ne fait pas partie du client demandé.');
 cdqDeleteProtectionV2752_(scope);
 var meta=Drive.Files.get(id,{fields:CDQ_CREATED_REPORT_FIELDS_V2753_,supportsAllDrives:true});
 if(!meta||meta.id!==id||JSON.stringify(meta.parents)!==JSON.stringify(scope.meta.parents)||typeof meta.trashed!=='boolean')throw Error('Le rapport a changé de dossier. Recommencez sa préparation.');
 return {meta:meta,path:scope.path,created:cdqCreatedReportProofV2753_(meta,request)};
}
function cdqInspectCreatedReportsV2753(payload){
 var request=cdqCreatedReportRequestV2753_(payload),createdIds=[];
 request.fileIds.forEach(function(id){if(cdqCreatedReportInspectV2753_(id,request).created)createdIds.push(id);});
 cdqWsActorV2638_(request.actor);
 return {ok:true,actorEmail:request.actor,googleAccount:request.googleAccount,clientId:request.clientId,requestId:request.requestId,trash:request.trash,fileIds:request.fileIds,createdIds:createdIds};
}
function cdqApplyCreatedReportDeletionV2753(payload){
 var request=cdqCreatedReportRequestV2753_(payload),lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  cdqWsActorV2638_(request.actor);if(!cdqVerifierCompteDriveV2620_(request.googleAccount).ok)throw Error('Le compte Google choisi n’a plus accès aux dossiers CDQ autorisés.');
  var result={ok:true,actorEmail:request.actor,googleAccount:request.googleAccount,clientId:request.clientId,requestId:request.requestId,transport:'created-report-v2753',fichiers:[],dossiers:[],ids:[],nombre:0,erreurs:[]};
  request.fileIds.forEach(function(id){try{
   // Scope, protection, actual owner, original author and private creation
   // receipt are all read again under the mutation lock, including on retry.
   cdqWsActorV2638_(request.actor);var inspected=cdqCreatedReportInspectV2753_(id,request),meta=inspected.meta;
   if(!inspected.created){var refused=Error('Ce PDF n’est pas confirmé comme un rapport créé par votre compte CDQ. Utilisez les autorisations du propriétaire Drive.');refused.code='CDQ_CREATED_REPORT_PROOF_REQUIRED';throw refused;}
   if(meta.trashed!==request.trash){
    if(meta.capabilities?.[request.trash?'canTrash':'canUntrash']!==true)throw cdqDeletePermissionV2752_(meta,request.trash);
    if(!request.trash&&inspected.path.slice(0,-1).some(function(parent){return parent.trashed===true;}))throw Error('Restaurez d’abord le dossier parent.');
    cdqWsActorV2638_(request.actor);if(!cdqVerifierCompteDriveV2620_(request.googleAccount).ok)throw Error('Le compte Google choisi n’a plus accès aux dossiers CDQ autorisés.');
    Drive.Files.update({trashed:request.trash},id,null,{fields:'id,trashed',supportsAllDrives:true});
   }
   var receipt;try{receipt=Drive.Files.get(id,{fields:'id,trashed',supportsAllDrives:true});}catch(_){var lost=Error('Drive n’a pas pu confirmer le retrait de ce rapport. La demande reste conservée.');lost.code='CDQ_DELETE_UNCONFIRMED';throw lost;}
   if(receipt?.id!==id||receipt.trashed!==request.trash){var uncertain=Error('Drive n’a pas confirmé l’identifiant et l’état de ce rapport.');uncertain.code='CDQ_DELETE_UNCONFIRMED';throw uncertain;}
   result.fichiers.push(id);
  }catch(error){result.erreurs.push(cdqDeleteErrorV2752_(id,'file',error));}});
  result.ids=result.fichiers.slice();result.nombre=result.ids.length;result.message=result.nombre+(result.nombre===1?' rapport confirmé.':' rapports confirmés.');
  if(result.nombre){invaliderCacheContenuClient_(request.clientId);invaliderCacheCompagnies_();}return result;
 }finally{lock.releaseLock();}
}
