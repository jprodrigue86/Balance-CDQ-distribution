/* Owner-editor maintenance only. No web RPC registration, no client email.
 * ScriptLock serializes cutover with the existing coordinate writer.
 * A mapped client fails closed until activation; a failed cutover is resumable.
 */
function cdqCoordMigrationOwnerV20261113_(operation){
 if(typeof CDQ_ACCES_RPC_COURANT_!=='undefined'&&CDQ_ACCES_RPC_COURANT_)throw Error('OWNER_EDITOR_ONLY');
 var owner=normaliserEmailCDQ_(obtenirAdministrateurPrincipal_());
 if(!owner||normaliserEmailCDQ_(Session.getActiveUser().getEmail())!==owner||normaliserEmailCDQ_(Session.getEffectiveUser().getEmail())!==owner)throw Error('OWNER_EDITOR_ONLY');
 var actor=cdqWsActorV2638_(owner);
 if(normaliserEmailCDQ_(actor.email)!==owner||normaliserRoleCDQ_(actor.role)!=='admin')throw Error('OWNER_IDENTITY_CHANGED');
 var prior=CDQ_ACCES_RPC_COURANT_,permission=CDQ_WS_RPC_PERMISSION_V2638_;
 try{
  CDQ_ACCES_RPC_COURANT_={email:actor.email,role:actor.role,verifiedUserV2686:actor};
  CDQ_WS_RPC_PERMISSION_V2638_=cdqWsRpcPermissionV2638_('cdqEnregistrerCoordonneesClientV2866',actor.email);
  verifierDroit_('administration');return operation(actor);
 }finally{CDQ_ACCES_RPC_COURANT_=prior;CDQ_WS_RPC_PERMISSION_V2638_=permission;}
}
function cdqCoordMigrationCallV20261113_(actor,action,payload){
 var envelope=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload||{},scope:{migrationId:'coordinates-v1'}});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(envelope),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
 var result;try{result=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('MIGRATION_RESPONSE_INVALID');}
 if(response.getResponseCode()!==200||result.ok!==true)throw Error('MIGRATION_UNCONFIRMED_'+String(result.code||response.getResponseCode()));
 return result;
}
function cdqCoordMigrationHashV20261113_(bytes){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(n){return ('0'+((n+256)%256).toString(16)).slice(-2);}).join('');}
function cdqCoordMigrateFilesV20261113_(actor,files,activateAll){
 var props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  // Discover under the same lock as writers, so no new Drive file is missed.
  files=files||cdqCoordFilesV20261113_();
  var map=JSON.parse(props.getProperty('CDQ_SYSTEM_COORDINATES_MAP_V1')||'{}');
  if(!map||typeof map!=='object'||Array.isArray(map))throw Error('MIGRATION_MAP_INVALID');
  var cloud=cdqCoordMigrationCallV20261113_(actor,'systemCoordinatesListV1',{}).documents,index={},items=[];
  cloud.forEach(function(d){index[d.id]=d;});
  files.forEach(function(file){
   var m=/^Coordonnees-([A-Za-z0-9_-]{12,130})\.json$/.exec(file.name||'');
   if(!m||file.mimeType!=='application/json'||file.trashed||file.parents?.length!==1||file.parents[0]!==CDQ_WS_SYSTEM_V2638_||file.appProperties?.cdqContactClientV2866!==m[1])throw Error('MIGRATION_FILE_IDENTITY');
   var client=m[1];cdqContactScopeV2866_(client,true);
   if(map[client]&&map[client]!==file.id)throw Error('MIGRATION_DUPLICATE_CLIENT');
   var existing=index[file.id];
   if(existing&&Number(existing.cloudActive)===1){
    if(map[client]!==file.id)throw Error('MIGRATION_ACTIVE_WITHOUT_ROUTE');
    var read=cdqLireCoordonneesClientV2866(client);if(read.ok!==true||read.revision<1)throw Error('MIGRATION_ACTIVE_READ_FAILED');
    items.push({id:file.id,state:'already_active'});return;
   }
   var bytes=DriveApp.getFileById(file.id).getBlob().getBytes();if(!bytes.length||bytes.length>262144)throw Error('MIGRATION_FILE_SIZE');
   var data=JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8'));
   if(data.schema!==1||data.clientId!==client||!Number.isSafeInteger(data.revision)||data.revision<1)throw Error('MIGRATION_FILE_CONTENT');
   var check=Drive.Files.get(file.id,{fields:'id,name,mimeType,parents,modifiedTime,trashed,appProperties',supportsAllDrives:true});
   if(check.modifiedTime!==file.modifiedTime||check.name!==file.name||check.trashed)throw Error('MIGRATION_DRIVE_CHANGED');
   var hash=cdqCoordMigrationHashV20261113_(bytes);
   var staged=cdqCoordMigrationCallV20261113_(actor,'systemCoordinatesImportV1',{id:file.id,clientId:client,sourceName:file.name,sourceParentId:CDQ_WS_SYSTEM_V2638_,driveModifiedAt:file.modifiedTime,driveSha256:hash,contentBase64:Utilities.base64Encode(bytes)});
   if(staged.sha256!==hash||staged.id!==file.id||staged.state==='active')throw Error('MIGRATION_STAGE_CHANGED');
   // Route before activation while writers are locked. A failed response leaves
   // this client paused on the authoritative cloud route, never stale fallback.
   map[client]=file.id;props.setProperties({CDQ_SYSTEM_COORDINATES_MAP_V1:JSON.stringify(map),CDQ_SYSTEM_COORDINATES_V1:props.getProperty('CDQ_SYSTEM_COORDINATES_V1')==='all'?'all':'on'},false);
   var receipt=cdqCoordMigrationCallV20261113_(actor,'systemCoordinatesActivateV1',{id:file.id,requestId:'activate-'+Utilities.getUuid(),expectedRevision:staged.revision,expectedSha256:hash,sourceModifiedAt:file.modifiedTime});
   if(receipt.id!==file.id||receipt.sha256!==hash||receipt.revision!==staged.revision+1)throw Error('MIGRATION_ACTIVATION_CHANGED');
   var confirmed=cdqCoordinatesFileV2874_(client);
   if(!confirmed.cdqCloudV2874||confirmed.cloudSha256!==hash||confirmed.data.revision!==data.revision)throw Error('MIGRATION_READBACK_FAILED');
   items.push({id:file.id,state:'activated',revision:receipt.revision,sha256:hash});
  });
  if(activateAll)props.setProperty('CDQ_SYSTEM_COORDINATES_V1','all');
  var result={ok:true,kind:'coordinates-cutover-v1',allClients:!!activateAll,items:items,finishedAt:new Date().toISOString(),originalsDeleted:0};
  props.setProperty('CDQ_SYSTEM_COORDINATES_LAST_MIGRATION_V1',JSON.stringify(result));console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}
}
function cdqCoordFilesV20261113_(client){
 var q="'"+cdq23Quote_(CDQ_WS_SYSTEM_V2638_)+"' in parents and trashed=false and mimeType='application/json' and "+(client?"name='Coordonnees-"+cdq23Quote_(client)+".json'":"name contains 'Coordonnees-'");
 var out=[],token;
 do{var r=Drive.Files.list({q:q,pageSize:1000,pageToken:token,fields:'files(id,name,mimeType,parents,modifiedTime,trashed,appProperties),nextPageToken',supportsAllDrives:true,includeItemsFromAllDrives:true});out=out.concat(r.files||[]);token=r.nextPageToken;}while(token);
 return out;
}
function cdqVerifierMigrationCoordonneesV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){
  var client='1QKv31bNO3bUh3uv11BJJqw9WXVvxR6k0',scope=cdqContactScopeV2866_(client,true);
  if(scope.clientName!=='CDQ TEST V2756 20261021')throw Error('TEST_CLIENT_CHANGED');
  var before=cdqLireCoordonneesClientV2866(client);
  if(before.revision===0){
   var site={id:'principal',label:'Site fictif migration',adresse:'1 rue Fictive',complement:'',ville:'Ville Test',province:'QC',codePostal:'',pays:'Canada',telephone:'',verification:'a-confirmer',source:''};
   var created=cdqEnregistrerCoordonneesClientV2866(client,{expectedRevision:0,requestId:'contact-qa-create-'+Utilities.getUuid(),sites:[site],selectedSiteId:'principal'});
   if(created.ok!==true)throw Error('TEST_CREATE_UNCONFIRMED');
  }
  var files=cdqCoordFilesV20261113_(client);if(files.length!==1)throw Error('TEST_FILE_AMBIGUOUS');
  cdqCoordMigrateFilesV20261113_(actor,files,false);
  var originalHash=cdqCoordMigrationHashV20261113_(DriveApp.getFileById(files[0].id).getBlob().getBytes());
  var current=cdqLireCoordonneesClientV2866(client),sites=current.sites.map(function(s){var v={};Object.keys(s).forEach(function(k){v[k]=s[k];});return v;});
  sites[0].telephone='1115556080';
  var payload={expectedRevision:current.revision,requestId:'contact-qa-cloud-'+Utilities.getUuid(),sites:sites,selectedSiteId:current.selectedSiteId};
  var saved=cdqEnregistrerCoordonneesClientV2866(client,payload),replay=cdqEnregistrerCoordonneesClientV2866(client,payload),readback=cdqLireCoordonneesClientV2866(client);
  if(saved.ok!==true||saved.revision!==current.revision+1||replay.revision!==saved.revision||readback.requestId!==payload.requestId||readback.sites[0].telephone!=='1115556080')throw Error('TEST_CLOUD_ROUNDTRIP_FAILED');
  if(cdqCoordMigrationHashV20261113_(DriveApp.getFileById(files[0].id).getBlob().getBytes())!==originalHash)throw Error('TEST_STILL_WRITES_DRIVE');
  var result={ok:true,kind:'coordinates-gas-cloud-roundtrip-v1',clientId:client,sourceId:files[0].id,revision:saved.revision,requestId:payload.requestId,driveUnchanged:true,idempotent:true,at:new Date().toISOString()};
  PropertiesService.getScriptProperties().setProperty('CDQ_SYSTEM_COORDINATES_QA_V1',JSON.stringify(result));console.log(JSON.stringify(result));return result;
 });
}
function cdqMigrerCoordonneesV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){
  var qa=JSON.parse(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_COORDINATES_QA_V1')||'{}');
  if(qa.ok!==true||qa.kind!=='coordinates-gas-cloud-roundtrip-v1'||qa.driveUnchanged!==true||Date.now()-Date.parse(qa.at)>86400000)throw Error('REAL_TEST_REQUIRED');
  return cdqCoordMigrateFilesV20261113_(actor,null,true);
 });
}
