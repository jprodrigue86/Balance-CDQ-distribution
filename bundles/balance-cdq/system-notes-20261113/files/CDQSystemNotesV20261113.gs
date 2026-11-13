/* Immutable private note archives. Notes displayed on reports stay unchanged. */
function cdqNotesCallV20261113_(actor,action,payload){
 var env=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload,scope:{store:'notes-v1',role:normaliserRoleCDQ_(actor.role),clientId:payload.clientId}});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(env),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
 var r;try{r=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('NOTES_RESPONSE_INVALID');}
 if(response.getResponseCode()!==200||r.ok!==true||r.kind!=='system-notes-v1')throw Error('NOTES_UNCONFIRMED_'+String(r&&r.code||response.getResponseCode()));
 return r.result;
}
function cdqNotesWriteVerifiedV20261113_(actor,p){
 var bytes=Utilities.base64Decode(p.contentBase64),hash=cdqCoordMigrationHashV20261113_(bytes),r=cdqNotesCallV20261113_(actor,'systemNotesWriteV1',p);
 if(!['created','replayed'].includes(r.state)||r.id!==p.id||r.sha256!==hash||r.bytes!==bytes.length)throw Error('NOTES_WRITE_UNCONFIRMED');
 return r;
}
function cdqNotesReadVerifiedV20261113_(actor,p){
 var r=cdqNotesCallV20261113_(actor,'systemNotesReadV1',{id:p.id,clientId:p.clientId});
 if(r.state!=='ok'||r.id!==p.id||r.clientId!==p.clientId||r.sourceName!==p.sourceName||JSON.stringify(r.metadata)!==JSON.stringify(p.metadata)||r.contentBase64!==p.contentBase64||r.sha256!==cdqCoordMigrationHashV20261113_(Utilities.base64Decode(p.contentBase64)))throw Error('NOTES_READ_UNCONFIRMED');
 return r;
}
function cdqCloudArchiveNoteV20261113_(client,name,text,metadata,access){
 var actor=verifierDroit_('ecriture');
 if(normaliserEmailCDQ_(actor.email)!==normaliserEmailCDQ_(access&&access.email)||!verifierDossierClientDirect_(client))throw Error('NOTES_CLIENT_FORBIDDEN');
 var id='note-'+Utilities.getUuid(),p={id:id,requestId:id,clientId:client.getId(),sourceName:name,metadata:metadata,contentBase64:Utilities.base64Encode(Utilities.newBlob(text).getBytes())};
 cdqNotesWriteVerifiedV20261113_(actor,p);
 return {getId:function(){return id;},getName:function(){return name;},getBlob:function(){return Utilities.newBlob(text,MimeType.PLAIN_TEXT,name);},_cdqArchivePayload:p};
}
function cdqMigrerArchivesNotesV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
   var root=DriveApp.getFolderById(CDQ_WS_SYSTEM_V2638_),roots=root.getFoldersByName('Notes'),queue=[],all=[],seen={},count=0;
   while(roots.hasNext())queue.push(roots.next());
   while(queue.length){
    var folder=queue.shift();if(seen[folder.getId()])throw Error('NOTES_FOLDER_DUPLICATE');seen[folder.getId()]=true;if(++count>1000)throw Error('NOTES_FOLDER_LIMIT');
    var sub=folder.getFolders();while(sub.hasNext())queue.push(sub.next());
    var files=folder.getFiles();while(files.hasNext()){
     var f=files.next();if(all.length>=1000)throw Error('NOTES_FILE_LIMIT');
     var id=f.getId(),meta=Drive.Files.get(id,{fields:'id,name,mimeType,description,modifiedTime,parents,trashed',supportsAllDrives:true});
     if(meta.trashed||meta.mimeType!=='text/plain'||meta.parents.length!==1||meta.parents[0]!==folder.getId())throw Error('NOTES_SOURCE_IDENTITY');
     var data=JSON.parse(meta.description||'{}');if(data.cdqNoteArchive!==true||!data.idCompagnie)throw Error('NOTES_SOURCE_METADATA');
     var bytes=f.getBlob().getBytes(),base64=Utilities.base64Encode(bytes),hash=cdqCoordMigrationHashV20261113_(bytes),p={id:'note-legacy-'+id,requestId:'note-legacy-'+id,sourceDriveId:id,clientId:data.idCompagnie,sourceName:meta.name,metadata:data,contentBase64:base64};
     cdqNotesWriteVerifiedV20261113_(actor,p);cdqNotesReadVerifiedV20261113_(actor,p);
     if(Drive.Files.get(id,{fields:'modifiedTime',supportsAllDrives:true}).modifiedTime!==meta.modifiedTime||cdqCoordMigrationHashV20261113_(f.getBlob().getBytes())!==hash)throw Error('NOTES_SOURCE_CHANGED');
     all.push({id:id,sha256:hash,bytes:bytes.length});
    }
   }
   PropertiesService.getScriptProperties().setProperty('CDQ_SYSTEM_NOTES_V1','on');
   var receipt={ok:true,kind:'notes-cutover-v1',count:all.length,items:all,at:new Date().toISOString(),originalsDeleted:0};
   PropertiesService.getScriptProperties().setProperty('CDQ_SYSTEM_NOTES_RECEIPT_V1',JSON.stringify(receipt));console.log(JSON.stringify(receipt));return receipt;
  }finally{lock.releaseLock();}
 });
}
function cdqVerifierArchiveNoteTestV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){
  if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_NOTES_V1')!=='on')throw Error('NOTES_ROUTE_INACTIVE');
  var clientId='1QKv31bNO3bUh3uv11BJJqw9WXVvxR6k0',client=DriveApp.getFolderById(clientId);
  if(client.getName()!=='CDQ TEST V2756 20261021')throw Error('NOTES_TEST_CLIENT_IDENTITY');
  var file=cdqArchiverNoteV2292_('dossier',clientId,'TEST TECHNIQUE — vérification du stockage Cloudflare des archives de notes.',actor),p=file._cdqArchivePayload;
  if(!p||!p.id.startsWith('note-'))throw Error('NOTES_TEST_ROUTE_FAILED');
  var replay=cdqNotesWriteVerifiedV20261113_(actor,p),read=cdqNotesReadVerifiedV20261113_(actor,p);
  if(replay.state!=='replayed')throw Error('NOTES_TEST_REPLAY');
  var result={ok:true,kind:'notes-test-v1',id:read.id,sha256:read.sha256,clientId:clientId,readWrite:true,idempotent:true,at:new Date().toISOString()};console.log(JSON.stringify(result));return result;
 });
}
