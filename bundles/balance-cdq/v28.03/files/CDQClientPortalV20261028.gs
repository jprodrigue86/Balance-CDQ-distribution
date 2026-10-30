/* Third copy of the final archived attachments. No email is sent here.
 * A failed copy keeps a small durable retry record referencing existing
 * archive files; no PDF bytes or bearer links enter Script Properties. */
function cdqClientPortalScopeV20261028_(clientId){
 verifierDroit_('envoi');var actor=cdqUploadAccessV2751_(true),scope=cdqReportEngineScopeV2754_({clientId:String(clientId)},false);
 scope.portalAuthorized=true;return {actor:actor,scope:scope};
}
function cdqClientPortalV20261028(action,clientId,documentId){
 var access=cdqClientPortalScopeV20261028_(clientId),mapping={link:'portalLink',revoke:'portalRevoke',renew:'portalRenew',remove:'portalRemove'},method=mapping[String(action||'')];
 if(!method)throw Error('INVALID_PORTAL_ACTION : action inconnue.');
 var client=cdqWsListClientV2646_(clientId),result=cdqReportEngineCallV2754_(access.actor,method,{clientId:access.scope.clientId,clientName:String(client.meta.name||client.meta.nom||'Documents client'),documentId:documentId||''},access.scope);
 if(result.token){result.url=cdqReportEngineConfigV2754_().url+'/client/#'+result.token;delete result.token;}
 return result;
}
function cdqClientPortalArchiveV20261028_(archive,context){
 if(!archive||!Array.isArray(archive.fichiers)||!archive.fichiers.length)return {ok:true,count:0};
 var access=cdqClientPortalScopeV20261028_(archive.clientId),delivery=String(context.sessionId||'');
 if(!/^[-\w]{8,100}$/.test(delivery))throw Error('INVALID_PORTAL_DELIVERY : identité de l’envoi manquante.');
 var ids=archive.fichiers.map(function(file){if(!/^[a-f0-9]{64}$/.test(file.sha256||'')||!Number.isSafeInteger(file.size)||file.size<8)throw Error('INVALID_PORTAL_SOURCE : empreinte finale manquante.');return cdqDriveIdV2521_(file.id);}),properties=PropertiesService.getScriptProperties(),pending={},intents=[];
 ids.forEach(function(id,index){
  var suffix=cdqUploadHashV2751_(Utilities.newBlob(delivery+'|'+id).getBytes()),key='CDQ_PORTAL_PENDING_20261028:'+suffix;
  var origin=archive.fichiers[index],sourceId=String(origin.sourceFileId||'').trim(),stamp=Number(origin.sourceArchivedAtMs||0);
  var stable=/^[A-Za-z0-9_-]{10,200}$/.test(sourceId)&&Number.isSafeInteger(stamp)&&stamp>1790000000000;
  var intent={version:stable?2:1,clientId:archive.clientId,deliveryId:delivery,actor:normaliserEmailCDQ_(access.actor.email),fileIds:[id],sha256:origin.sha256,size:origin.size,createdAt:Date.now()};
  if(stable){intent.sourceFileId=sourceId;intent.sourceArchivedAtMs=stamp;intent.originalName=cdqArchiveSafePdfNameV2622_(origin.originalName);}
  var old=properties.getProperty(key);
  if(old){var prior=JSON.parse(old);if(prior.clientId!==intent.clientId||prior.actor!==intent.actor||JSON.stringify(prior.fileIds)!==JSON.stringify(intent.fileIds)||prior.sha256!==intent.sha256||prior.size!==intent.size||String(prior.sourceFileId||'')!==String(intent.sourceFileId||'')||Number(prior.sourceArchivedAtMs||0)!==Number(intent.sourceArchivedAtMs||0))throw Error('IDEMPOTENCY_CONFLICT : cet envoi possède déjà une autre archive.');intent=prior;}
  pending[key]=JSON.stringify(intent);intents.push({intent:intent,key:key});
 });
 // Each property is small even for a delivery with hundreds of PDFs.
 properties.setProperties(pending,false);
 cdqClientPortalScheduleV20261028_();
 var count=0;intents.forEach(function(item){count+=cdqClientPortalResumeV20261028_(item.intent,item.key,access).count;});
 return {ok:true,count:count};
}
function cdqClientPortalResumeV20261028_(intent,key,access){
 var properties=PropertiesService.getScriptProperties();
 if(intent.actor!==normaliserEmailCDQ_(access.actor.email)||intent.clientId!==access.scope.clientId)throw Error('SCOPE_MISMATCH : la reprise appartient à un autre compte.');
 var client=cdqWsListClientV2646_(intent.clientId);
 if(client.meta.id!==intent.clientId)throw Error('SCOPE_MISMATCH : client déplacé.');
 cdqReportEngineCallV2754_(access.actor,'portalLink',{clientId:intent.clientId,clientName:String(client.meta.name||'Documents client')},access.scope);
 var count=0;
 intent.fileIds.forEach(function(id){
  // Prove current membership and recheck after reading exact final bytes.
  var scope=cdqDriveScopeV2521_(id,{},[CONFIG.MASTER_FOLDER_ID]);
  if(!scope.path||scope.path[1].id!==intent.clientId||scope.meta.mimeType!=='application/pdf'||scope.meta.trashed)throw Error('SCOPE_MISMATCH : archive déplacée ou supprimée.');
  var blob=DriveApp.getFileById(id).getBlob(),bytes=blob.getBytes(),after=Drive.Files.get(id,{fields:'id,modifiedTime,parents,trashed',supportsAllDrives:true});
  if(after.trashed||after.modifiedTime!==scope.meta.modifiedTime||JSON.stringify(after.parents)!==JSON.stringify(scope.meta.parents))throw Error('CONFLICT_PORTAL_SOURCE : archive modifiée pendant sa lecture.');
  var hash=cdqUploadHashV2751_(bytes);
  if(hash!==intent.sha256||bytes.length!==intent.size)throw Error('CONFLICT_PORTAL_SOURCE : les octets finaux archivés ont changé.');
  var sourceId=String(intent.sourceFileId||''),stable=/^[A-Za-z0-9_-]{10,200}$/.test(sourceId)&&Number.isSafeInteger(Number(intent.sourceArchivedAtMs))&&Number(intent.sourceArchivedAtMs)>1790000000000;
 if(stable){
  // Never use a filename or equipment label to identify a report: validate Drive ancestry.
  var original=cdqDriveScopeV2521_(sourceId,{},[CONFIG.MASTER_FOLDER_ID]);
  if(!original.path||original.path[1].id!==intent.clientId||original.meta.mimeType==='application/vnd.google-apps.folder'||original.meta.trashed)throw Error('SCOPE_MISMATCH : la source ne correspond plus à ce client.');
 }
 var documentId=cdqUploadHashV2751_(Utilities.newBlob(stable?'cdq-portal-stable-v1|'+intent.clientId+'|'+sourceId:intent.clientId+'|'+intent.deliveryId+'|'+id).getBytes());
  var payload={clientId:intent.clientId,deliveryId:intent.deliveryId,documentId:documentId,name:cdqArchiveSafePdfNameV2622_(stable?intent.originalName:blob.getName()),size:bytes.length,sha256:hash,base64:Utilities.base64Encode(bytes)};
 if(stable){payload.stableSourceV1=1;payload.sourceFileId=sourceId;payload.sourceArchivedAtMs=Number(intent.sourceArchivedAtMs);}
 var result=cdqReportEngineCallV2754_(access.actor,'portalPublish',payload,access.scope);
  if(!result||result.ok!==true||result.documentId!==documentId)throw Error('INVALID_PORTAL_RECEIPT : identité de copie non confirmée.');
 if(result.superseded===true){if(!stable)throw Error('INVALID_PORTAL_RECEIPT : reprise obsolète non autorisée.');return;}
 if(result.sha256!==hash||result.size!==bytes.length)throw Error('INVALID_PORTAL_RECEIPT : copie non confirmée.');count++;
 });
 properties.deleteProperty(key);return {ok:true,count:count};
}
function cdqClientPortalRetryV20261028(clientId){
 var access=cdqClientPortalScopeV20261028_(clientId),all=PropertiesService.getScriptProperties().getProperties(),results=[];
 Object.keys(all).filter(function(key){return key.indexOf('CDQ_PORTAL_PENDING_20261028:')===0;}).forEach(function(key){var intent=JSON.parse(all[key]);if(intent.clientId===access.scope.clientId&&intent.actor===normaliserEmailCDQ_(access.actor.email))results.push(cdqClientPortalResumeV20261028_(intent,key,access));});
 return {ok:true,resumed:results.length};
}

// One-shot continuation exists only while a bounded pending copy remains.
// It uses the same live actor/Drive checks as existing server background jobs.
function cdqClientPortalScheduleV20261028_(){
 var lock=LockService.getScriptLock();if(!lock.tryLock(1000))throw Error('PORTAL_RETRY_BUSY : reprise à programmer.');
 try{if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='cdqClientPortalWorkerV20261028_';}))ScriptApp.newTrigger('cdqClientPortalWorkerV20261028_').timeBased().after(60000).create();}
 finally{lock.releaseLock();}
}
function cdqClientPortalWorkerV20261028_(){
 ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='cdqClientPortalWorkerV20261028_';}).forEach(function(t){ScriptApp.deleteTrigger(t);});
 var props=PropertiesService.getScriptProperties();if(props.getProperty('CDQ_CLIENT_PORTAL_ENABLED_20261028')!=='true')return;
 var all=props.getProperties(),keys=Object.keys(all).filter(function(k){return k.indexOf('CDQ_PORTAL_PENDING_20261028:')===0;}),start=Date.now();
 for(var i=0;i<keys.length&&Date.now()-start<45000;i++){
  var key=keys[i],intent;try{intent=JSON.parse(props.getProperty(key)||'null');}catch(e){continue;}
  if(!intent||intent.blocked||Number(intent.nextAt||0)>Date.now())continue;
  try{
   var actor=cdqWsActorV2638_(intent.actor),client=cdqWsListClientV2646_(intent.clientId);
   if(client.meta.id!==intent.clientId)throw Error('SCOPE_MISMATCH : client déplacé.');
   cdqClientPortalResumeV20261028_(intent,key,{actor:actor,scope:{clientId:intent.clientId,portalAuthorized:true}});
  }catch(error){
   intent.attempts=Number(intent.attempts||0)+1;intent.error=String(error.message||error).slice(0,300);
   intent.blocked=intent.attempts>=8||/^(CONFLICT_|INVALID_|SCOPE_|IDEMPOTENCY_|PORTAL_REVOKED|PORTAL_KEY_CHANGED)|autorisation.*retirée/i.test(intent.error);
   intent.nextAt=Date.now()+Math.min(3600000,60000*Math.pow(2,intent.attempts));
   // A concurrent successful foreground copy has already removed its intent.
   if(props.getProperty(key))props.setProperty(key,JSON.stringify(intent));
  }
 }
 var remaining=props.getProperties();if(Object.keys(remaining).some(function(k){if(k.indexOf('CDQ_PORTAL_PENDING_20261028:')!==0)return false;try{return !JSON.parse(remaining[k]).blocked;}catch(e){return false;}}))cdqClientPortalScheduleV20261028_();
}
