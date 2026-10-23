/* CDQ V27.54: the authenticated application transports field snapshots only.
 * The dedicated engine owns durable revisions, index rows and publication jobs.
 * Every Drive publication comes back through the original Google creator and
 * rechecks live CDQ/Drive permissions. No Google OAuth token leaves this script. */
function cdqReportEngineConfigV2754_(){
 var p=PropertiesService.getScriptProperties(),url=String(p.getProperty('CDQ_REPORT_ENGINE_URL_V2754')||''),secret=String(p.getProperty('CDQ_REPORT_ENGINE_SECRET_V2754')||'');
 if(!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url)||secret.length<40)throw Error('ENGINE_CONFIGURATION : le moteur de rapports n’est pas configuré.');
 return {url:url,secret:secret};
}
function cdqReportEngineHexV2754_(bytes){return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function cdqReportEngineEnvelopeV2754_(purpose,value){
 var body=JSON.stringify(Object.assign({purpose:purpose,version:1,timestamp:Date.now(),nonce:Utilities.getUuid()},value||{}));
 return {body:body,signature:cdqReportEngineHexV2754_(Utilities.computeHmacSha256Signature(body,cdqReportEngineConfigV2754_().secret,Utilities.Charset.UTF_8))};
}
function cdqReportEngineVerifyV2754_(envelope,purpose){
 if(!envelope||typeof envelope.body!=='string'||envelope.body.length>24*1024*1024||!/^[a-f0-9]{64}$/.test(String(envelope.signature||'')))throw Error('BRIDGE_AUTH : signature serveur requise.');
 var expected=cdqReportEngineHexV2754_(Utilities.computeHmacSha256Signature(envelope.body,cdqReportEngineConfigV2754_().secret,Utilities.Charset.UTF_8)),different=0;
 for(var i=0;i<expected.length;i++)different|=expected.charCodeAt(i)^envelope.signature.charCodeAt(i);
 if(different)throw Error('BRIDGE_AUTH : signature serveur invalide.');
 var value=JSON.parse(envelope.body);
 if(value.purpose!==purpose||value.version!==1||!Number.isSafeInteger(value.timestamp)||Math.abs(Date.now()-value.timestamp)>90000||!/^[a-f0-9-]{36}$/i.test(value.nonce||''))throw Error('BRIDGE_EXPIRED : message serveur expiré.');
 return value;
}
function cdqReportEngineCallV2754_(actor,action,payload,scope){
 var config=cdqReportEngineConfigV2754_(),envelope=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload||{},scope:scope||{}});
 cdqTraceStageV2687_('engine-fetch');
 var response=UrlFetchApp.fetch(config.url+'/v1/rpc',{method:'post',contentType:'application/json',payload:JSON.stringify(envelope),muteHttpExceptions:true,followRedirects:false});
 cdqTraceStageV2687_('engine-returned');
 var value;try{value=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('ENGINE_UNAVAILABLE : réponse du moteur invalide.');}
 if(response.getResponseCode()!==200||!value||!value.ok)throw Error(String(value&&value.code||'ENGINE_UNAVAILABLE')+' : '+String(value&&value.error||'Moteur momentanément indisponible.'));
 return value;
}
function cdqReportEngineScopeV2754_(p,write,readPhaseCache){
 var clientId=cdqDriveIdV2521_(p.clientId),client=readPhaseCache?cdqDriveScopeV2521_(clientId,readPhaseCache,[CONFIG.MASTER_FOLDER_ID]):cdqWsListClientV2646_(clientId);
 if(client.meta.id!==clientId||readPhaseCache&&(client.meta.mimeType!=='application/vnd.google-apps.folder'||!client.path||client.path.length!==2||client.path[1].id!==clientId))throw Error('SCOPE_MISMATCH : choisissez la racine du client.');
 var scope={clientId:clientId};
 if(write){
  var destinationId=cdqDriveIdV2521_(p.destinationId),meta={operation:p.fileId?'save':'create',fileId:String(p.fileId||''),clientId:clientId,destinationId:destinationId,expectedRevision:String(p.expectedDriveRevision||''),name:String(p.name||''),family:String(p.family||'')};
  var current=cdqUploadDestinationV2751_(meta,true);
  scope.destinationId=destinationId;scope.fileId=meta.fileId;
  cdqReportEngineObservedDriveV2754_(scope,current);
 }
 return scope;
}
// Current metadata is authorization evidence, never part of the idempotency body.
function cdqReportEngineObservedDriveV2754_(scope,current){
 var properties=current&&current.appProperties||{};
 scope.observedFileId=current&&current.id||'';scope.driveRevision=current&&current.modifiedTime||'';
 scope.engineReportId=properties.cdqEngineReportV2754||'';scope.engineRevision=Number(properties.cdqEngineRevisionV2754||0);
 scope.engineJobId=properties.cdqEngineJobV2754||'';scope.engineHash=properties.cdqEngineHashV2754||'';
 scope.driveName=current&&current.name||'';scope.driveSize=Number(current&&current.size||0);
 delete scope.engineContentHash;
}
// The Worker has durably retained the exact PDF and leased this one job. The
// existing commit/trash functions still recheck live permission and lease under
// ScriptLock. Only this server-created plan can enter the immediate path.
function cdqReportEngineDirectV2759_(actor,result,p,scope){
 var plan=result&&result.directCommitV2759;if(!plan)return result;
 delete result.directCommitV2759;
 var receipt;
 try{
  if(plan.kind==='report'){
   var artifact=p.preparedPdfV2759;
   if(!artifact||artifact.reportId!==plan.reportId||artifact.requestId!==p.requestId||artifact.sha256!==plan.sha256||artifact.size!==plan.size)throw Error('INVALID_PREPARED_PDF : contenu de publication différent.');
   receipt=cdqReportEngineCommitV2754_(Object.assign({},plan,{base64:artifact.base64}),actor);
  }else if(plan.kind==='delete')receipt=cdqReportEngineTrashV2754_(plan,actor);
  else throw Error('INVALID_PUBLICATION : plan de publication inconnu.');
 }catch(error){
  // Failed or ambiguous writes retain their original job and bytes. A timeout
  // never invents success; recovery proves the existing Drive content first.
  var code=String(error&&error.message||error).match(/^([A-Z][A-Z0-9_]+)\s*:/),errorCode=code?code[1]:'DRIVE_SERVICE_UNAVAILABLE';
  try{return cdqReportEngineCallV2754_(actor,'finishDirectV2759',{clientId:scope.clientId,plan:plan,errorCode:errorCode},scope);}catch(_){return result;}
 }
 // If this last acknowledgement is lost, the durable lease/queue recovers the
 // very same job. Never issue a second Drive write in this invocation.
 try{return cdqReportEngineCallV2754_(actor,'finishDirectV2759',{clientId:scope.clientId,plan:plan,receipt:receipt},scope);}catch(error){if(/^CONFLICT_REPORT_STATE\s*:/.test(String(error&&error.message||error)))throw error;return result;}
}
function cdqReportEngineSaveV2754_(actor,p,scope){
 // The ordinary save needs metadata only. An exceptional lost publication
 // receipt may request one bounded content proof; no PDF leaves Google.
 for(var attempt=0;attempt<3;attempt++){
  var result=cdqReportEngineCallV2754_(actor,'save',p,scope);
  if(!result.driveVerificationRequired)return cdqReportEngineDirectV2759_(actor,result,p,scope);
  if(attempt===2||result.reportId!==p.reportId||result.destinationId!==p.destinationId)throw Error('CONFLICT_DRIVE_REVISION : vérification Drive non confirmée.');
  var fileId=cdqDriveIdV2521_(result.fileId),current=cdqUploadDestinationV2751_({operation:'save',fileId:fileId,clientId:scope.clientId,destinationId:p.destinationId,expectedRevision:'',name:p.name,family:p.family},true);
  cdqReportEngineObservedDriveV2754_(scope,current);
  if(result.verifyContent===true){
   if(!current||Number(current.size)<8||Number(current.size)>16*1024*1024)throw Error('CONFLICT_DRIVE_REVISION : taille PDF non confirmée.');
   var bytes=DriveApp.getFileById(fileId).getBlob().getBytes(),hash=cdqUploadHashV2751_(bytes),after=Drive.Files.get(fileId,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});
   if(after.trashed||after.modifiedTime!==current.modifiedTime||after.name!==current.name||String(after.size)!==String(current.size)||JSON.stringify(after.parents)!==JSON.stringify(current.parents)||!cdqReportEngineSameAppPropertiesV2754_(after.appProperties,current.appProperties))throw Error('CONFLICT_DRIVE_REVISION : le PDF a changé pendant sa vérification.');
   scope.engineContentHash=hash;
  }
  actor=cdqUploadAccessV2751_(true);
 }
 throw Error('CONFLICT_DRIVE_REVISION : vérification Drive non confirmée.');
}
function cdqReportEngineV2754(action,payload){
 action=String(action||'');if(['capabilities','save','delete','restore','read','status','export','list','importIndex','archiveStatus','editAcquire','editRenew','editRelease'].indexOf(action)<0)throw Error('UNKNOWN_ACTION : action du moteur inconnue.');
 var p=payload||{},write=action.indexOf('edit')===0||action==='save'||action==='delete'||action==='restore'||action==='importIndex'||action==='list'&&p.repair===true||action==='status'&&p.kind==='list'&&p.restore===true,actor=cdqUploadAccessV2751_(write);
 if(action.indexOf('edit')===0)return cdqFileEditLeaseV2756_(actor,action,p);
 if(action==='capabilities')return Object.assign({},cdqReportEngineCallV2754_(actor,action,{},{}),{googleListRepairProtocol:1,googleDriveLockWaitMs:6000});
 // Reuse only ancestry read in this initial synchronous read/status phase.
 // Typed-list status calls the engine before walking the file, so it must not
 // share this cache. Writes and post-wait/content proofs keep fresh snapshots.
 var readPhaseCache=action==='read'||action==='status'&&p.kind!=='list'?{}:null;
 cdqTraceStageV2687_('drive-scope');
 var scope=cdqReportEngineScopeV2754_(p,action==='save',readPhaseCache);
 if(action==='save'||action==='delete')scope.directCommitV2759=true;
 if(action==='archiveStatus')return cdqReportEngineArchiveStatusV2754_(actor,p,scope);
 if(action==='list'&&p.repair===true)return cdqReportEngineReconcileListV2754_(actor,p,scope,'repair');
 if(p.kind==='list'&&(action==='restore'||action==='status'&&p.restore===true))return cdqReportEngineReconcileListV2754_(actor,p,scope,action==='restore'?'restore':'preflight');
 var typedListState=null;if(p.kind==='list'&&(action==='status'||action==='export')){typedListState=cdqReportEngineCallV2754_(actor,'status',p,scope);if(typedListState.kind!=='list'||p.reportId!==typedListState.reportId||p.fileId!==typedListState.pdf.fileId)throw Error('CONFLICT_LIST_FILE : cette liste a été remplacée.');}
 if(p.fileId&&action!=='save'&&action!=='restore'){
  var file;
  try{file=cdqDriveScopeV2521_(cdqDriveIdV2521_(p.fileId),readPhaseCache||{},[CONFIG.MASTER_FOLDER_ID]);}
  catch(scopeError){
   // A lost deletion acknowledgement can be retried after the file or its
   // parent has entered the trash. Only the matching authoritative tombstone
   // may answer that lookup; no trashed PDF bytes or arbitrary file are read.
   if(['read','status','delete'].indexOf(action)>=0){var deletedState=cdqReportEngineCallV2754_(actor,'status',{fileId:String(p.fileId),clientId:scope.clientId},scope);if(deletedState.deleted===true&&(!p.reportId||deletedState.reportId===p.reportId))return deletedState;}
   throw scopeError;
  }
  if(file.meta.trashed||!file.path||file.path.length<3||file.path[1].id!==scope.clientId)throw Error('SCOPE_MISMATCH : fichier d’un autre client.');
   var currentFile=Drive.Files.get(p.fileId,{fields:'id,name,mimeType,parents,trashed,modifiedTime,appProperties,size'+(action==='delete'?',capabilities(canTrash)':''),supportsAllDrives:true});
   if(currentFile.id!==String(p.fileId)||currentFile.trashed||!currentFile.mimeType||!currentFile.parents||currentFile.parents.length!==1||currentFile.parents[0]!==file.path[file.path.length-2].id)throw Error('SCOPE_MISMATCH : le fichier ou son dossier client a changé.');
   // Selection lookup also classifies Sheets and other historical files. Only
   // the signed server MIME may reach that read-only path; PDF actions stay strict.
   if(action!=='read'&&currentFile.mimeType!=='application/pdf')throw Error('SCOPE_MISMATCH : un PDF est requis.');
   scope.fileParentId=currentFile.parents[0];scope.fileName=currentFile.name||'';
   if(currentFile.name==='Liste de balance.pdf'&&currentFile.mimeType==='application/pdf'){var candidate=Drive.Files.get(currentFile.parents[0],{fields:'id,name,mimeType,parents,trashed',supportsAllDrives:true});if(!candidate.trashed&&candidate.mimeType==='application/vnd.google-apps.folder'&&candidate.parents&&candidate.parents.length===1&&candidate.parents[0]===scope.clientId&&String(candidate.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='liste de balance'){scope.listCandidate=true;scope.listCandidateDestinationId=candidate.id;}}
   cdqReportEngineObservedDriveV2754_(scope,currentFile);scope.fileMimeType=currentFile.mimeType;scope.trashed=!!currentFile.trashed;
   if(action==='delete'){
    var trashMeta=currentFile;scope.canTrash=!!(trashMeta.capabilities&&trashMeta.capabilities.canTrash);
    if(!scope.canTrash&&(!trashMeta.appProperties||trashMeta.appProperties.cdqEngineReportV2754!==p.reportId||trashMeta.appProperties.cdqEngineCreatorV2754!==empreinteCDQ_(actor.email)))throw Error('DELETE_NOT_AUTHORIZED : suppression Drive non autorisée.');
   }
 }
 if(action==='importIndex'){
  if(!Array.isArray(p.rows)||p.rows.length>500||!Array.isArray(p.sources))throw Error('INVALID_INDEX : index complet requis.');
  var sources=cdqUploadListSourcesV2751_(scope.clientId).map(function(s){return {id:String(s.id),revision:String(s.modifiedTime||'')};}).sort(function(a,b){return a.id.localeCompare(b.id);});
  var provided=p.sources.map(function(s){return {id:String(s.id),revision:String(s.revision||'')};}).sort(function(a,b){return a.id.localeCompare(b.id);});
  if(JSON.stringify(sources)!==JSON.stringify(provided))throw Error('SOURCE_MANIFEST_CONFLICT : les sources de l’index ont changé.');
  scope.authoritativeSources=true;
  var known={};sources.forEach(function(s){known[s.id]=s.revision;});
  p.rows.forEach(function(row){if(!row||!known[row.id]||String(row.revision)!==known[row.id])throw Error('INVALID_INDEX : ligne sans révision source confirmée.');});
  if(p.listFileId){var listMeta=Drive.Files.get(cdqDriveIdV2521_(p.listFileId),{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});if(listMeta.trashed||listMeta.mimeType!=='application/pdf'||listMeta.name!=='Liste de balance.pdf'||!listMeta.parents||listMeta.parents.length!==1||p.listDestinationId&&p.listDestinationId!==listMeta.parents[0])throw Error('INVALID_INDEX : liste Drive introuvable.');p.listDestinationId=listMeta.parents[0];p.listRevision=listMeta.modifiedTime;}
  var destination=cdqWsFolderV2638_(cdqDriveIdV2521_(p.listDestinationId)),folderName=String(destination.meta.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(folderName!=='liste de balance'||!destination.path||destination.path.length!==3||destination.path[1].id!==scope.clientId)throw Error('SCOPE_MISMATCH : dossier Liste de Balance requis.');
  scope.listDestinationId=p.listDestinationId;
  return cdqReportEngineReconcileListV2754_(actor,p,scope,'import');
 }
 if(action==='save')return cdqReportEngineSaveV2754_(actor,p,scope);
 if(action==='restore')return cdqReportEngineRestoreV2754_(actor,p,scope);
 if(action==='export')return cdqReportEngineExportV2754_(actor,p,scope,typedListState);
 if(action==='status'&&typedListState)return typedListState;
 var result=cdqReportEngineCallV2754_(actor,action,p,scope);
 // Verify an exact current PDF before reconciling its Drive modifiedTime/name
 // with the durable report engine. This branch runs only for a proven mismatch.
 if(action==='read'&&result&&result.metadataProofRequiredV2763===true){
  if(result.fileId!==String(p.fileId)||!scope.engineReportId||result.reportId!==scope.engineReportId||
     !currentFile||currentFile.mimeType!=='application/pdf'||currentFile.trashed||
     !Number.isSafeInteger(scope.driveSize)||scope.driveSize<8||scope.driveSize>16*1024*1024)
   throw Error('CONFLICT_EXTERNAL_DRIVE : la preuve du rapport est invalide.');
  var writer=cdqUploadAccessV2751_(true);
  if(normaliserEmailCDQ_(writer.email)!==normaliserEmailCDQ_(actor.email))
   throw Error('SCOPE_MISMATCH : le compte CDQ a changé.');
  var exactBytes=DriveApp.getFileById(p.fileId).getBlob().getBytes();
  var second=Drive.Files.get(p.fileId,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});
  if(exactBytes.length!==scope.driveSize||second.id!==currentFile.id||second.trashed||
     second.mimeType!=='application/pdf'||second.modifiedTime!==currentFile.modifiedTime||
     second.name!==currentFile.name||String(second.size)!==String(currentFile.size)||
     JSON.stringify(second.parents)!==JSON.stringify(currentFile.parents)||
     !cdqReportEngineSameAppPropertiesV2754_(second.appProperties,currentFile.appProperties))
   throw Error('CONFLICT_EXTERNAL_DRIVE : le PDF a changé pendant sa vérification.');
  scope.engineContentHash=cdqUploadHashV2751_(exactBytes);
  scope.metadataRepairAuthorizedV2763=true;
  result=cdqReportEngineCallV2754_(writer,action,p,scope);
  if(result&&result.metadataProofRequiredV2763===true)
   throw Error('CONFLICT_EXTERNAL_DRIVE : réconciliation du PDF non confirmée.');
 }
 if(action==='delete')result=cdqReportEngineDirectV2759_(actor,result,p,scope);
 if(action==='read'&&scope.fileMimeType==='application/pdf'&&result.found===false&&file&&file.path&&file.path.length>=3)result.legacyScope={clientId:scope.clientId,destinationId:file.path[file.path.length-2].id,fileId:String(p.fileId),expectedDriveRevision:String(file.meta.modifiedTime||'')};
 return result;
}
// Called only by the authenticated legacy writer after validating its client
// and canonical destination under ScriptLock. listPlan is read-only and does
// not schedule a render; an unavailable authority must never enable a fallback
// writer. No cache/local import flag is sufficient to prove legacy ownership.
function cdqReportEngineLegacyListGuardV2755_(actor,clientId){
 var id=cdqDriveIdV2521_(clientId),state=cdqReportEngineCallV2754_(actor,'listPlan',{clientId:id},{clientId:id});
 if(!state||state.ok!==true||state.engine!==2754||typeof state.found!=='boolean')throw Error('ENGINE_UNAVAILABLE : le responsable de la liste n’est pas confirmé.');
 if(state.found){
  if(state.kind!=='list'||state.clientId!==id||!state.reportId)throw Error('CONFLICT_LIST_SCOPE : la liste retournée ne correspond pas au client.');
  throw Error('ENGINE_LIST_MANAGED : cette liste est gérée par le moteur. Actualisez-la depuis ses données.');
 }
 if(state.baselineComplete!==false)throw Error('ENGINE_UNAVAILABLE : l’absence de liste moteur n’est pas confirmée.');
 return true;
}
// Archive readiness is a read-only, fail-closed gate. Drive ancestry is
// refreshed once per distinct destination, including local drafts with no ID.
function cdqReportEngineArchiveStatusV2754_(actor,p,scope){
 verifierDroit_('envoi');actor=cdqUploadAccessV2751_(false);
 var folders=p.folderIds,candidates=p.candidateDestinations||[];
 if(!Array.isArray(folders)||folders.length>80||!Array.isArray(candidates)||candidates.length>500)throw Error('INVALID_ARCHIVE_SCOPE : sélection de dossiers invalide.');
 folders=Array.from(new Set(folders.map(cdqDriveIdV2521_))).sort();candidates=Array.from(new Set(candidates.map(cdqDriveIdV2521_))).sort();
 var cache={},paths={};
 function metadata(id){if(!cache[id])cache[id]=Drive.Files.get(id,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});return cache[id];}
 function ancestry(id){
  if(paths[id])return paths[id];var path=[],seen={},current=id;
  for(var depth=0;depth<30;depth++){
   if(seen[current])throw Error('SCOPE_MISMATCH : ascendance Drive cyclique.');seen[current]=true;
   var m=metadata(current);if(m.id!==current||m.mimeType!=='application/vnd.google-apps.folder')throw Error('SCOPE_MISMATCH : dossier Drive non confirmé.');
   path.unshift({id:m.id,parentId:m.parents&&m.parents[0]||'',revision:String(m.modifiedTime||''),trashed:!!m.trashed});
   if(current===CONFIG.MASTER_FOLDER_ID){paths[id]=path;return path;}
   if(!m.parents||m.parents.length!==1)throw Error('SCOPE_MISMATCH : ascendance Drive ambiguë.');current=m.parents[0];
  }
  throw Error('SCOPE_MISMATCH : dossier hors de la racine Drive.');
 }
 function liveClientPath(id){var path=ancestry(id);if(path.length<2||path[1].id!==scope.clientId||path.some(function(n){return n.trashed;}))throw Error('SCOPE_MISMATCH : dossier supprimé ou extérieur au client.');return path;}
 var selected=folders.map(function(id){return {id:id,path:liveClientPath(id)};});
 function selectedDestination(id,strict){var path=ancestry(id);if(path.length<2||path[1].id!==scope.clientId){if(strict)throw Error('SCOPE_MISMATCH : destination locale extérieure au client.');return false;}if(strict&&path.some(function(n){return n.trashed;}))return false;return path.some(function(n){return folders.indexOf(n.id)>=0;});}
 function removedProof(target){if(!target.pdf.fileId)return {fileId:'',unpublished:true};var fileId=cdqDriveIdV2521_(target.pdf.fileId),m;try{m=metadata(fileId);}catch(e){if(Number(e&&e.code)===404||Number(e&&e.details&&e.details.code)===404)return {fileId:fileId,missing:true};throw e;}if(!m.trashed||!m.parents||m.parents.length!==1||m.parents[0]!==target.destinationId)throw Error('CONFLICT_ARCHIVE_DELETED : un PDF supprimé est encore vivant ou a changé de dossier.');return {fileId:fileId,trashed:true,revision:String(m.modifiedTime||'')};}
 var destinations=candidates.filter(function(id){return selectedDestination(id,true);});
 if(!folders.length)return {ok:true,engine:2754,kind:'archive',clientId:scope.clientId,ready:true,stamp:cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify({clientId:scope.clientId,selected:[]})).getBytes()),destinations:[],targets:[],pending:[]};
 var state=cdqReportEngineCallV2754_(actor,'archiveState',{clientId:scope.clientId},scope);
 if(!state||state.engine!==2754||state.clientId!==scope.clientId||!Array.isArray(state.targets))throw Error('ENGINE_UNAVAILABLE : état de publication des dossiers invalide.');
 var targets=[],pending=[],membership=[];
 state.targets.forEach(function(target){
  if(!target||target.clientId!==scope.clientId||['report','list'].indexOf(target.kind)<0||!target.reportId||!target.destinationId||!target.pdf||!Number.isSafeInteger(target.revision))throw Error('ENGINE_UNAVAILABLE : identité de publication invalide.');
  var id=cdqDriveIdV2521_(target.destinationId),path;
  try{path=ancestry(id);}catch(e){if(target.deleted&&!target.drivePending&&(Number(e&&e.code)===404||Number(e&&e.details&&e.details.code)===404)){membership.push({id:id,missing:true,removed:removedProof(target)});return;}throw e;}
  if(!selectedDestination(id,false))return;
  if(path.some(function(n){return n.trashed;})&&(target.kind==='list'||target.deleted&&!target.drivePending)){membership.push({id:id,path:path,removed:removedProof(target)});return;}
  destinations.push(id);membership.push({id:id,path:path});
  var normalized={kind:target.kind,reportId:target.reportId,clientId:scope.clientId,destinationId:id,revision:target.revision,deleted:!!target.deleted,drivePending:!!target.drivePending,pdf:target.pdf};targets.push(normalized);
  var code=target.deleted?(target.drivePending?'PDF_PENDING':''):target.pdf.status!=='confirmed'||target.pdf.revision!==target.revision||!target.pdf.fileId?'PDF_PENDING':'';
  if(path.some(function(n){return n.trashed;})&&(!target.deleted||target.drivePending))code='PDF_PENDING';
  if(code){pending.push({kind:target.kind,reportId:target.reportId,code:code});return;}
  if(target.deleted){normalized.removed=removedProof(target);return;}
  if(!/^[a-f0-9]{64}$/.test(String(target.pdf.sha256||''))||!Number.isSafeInteger(target.pdf.size)||target.pdf.size<8||target.pdf.size>16*1024*1024)throw Error('INVALID_ARCHIVE_RECEIPT : reçu PDF sans empreinte ou taille confirmée.');
  var file=metadata(cdqDriveIdV2521_(target.pdf.fileId)),properties=file.appProperties||{};
  if(file.trashed||file.mimeType!=='application/pdf'||!file.parents||file.parents.length!==1||file.parents[0]!==id||file.modifiedTime!==target.pdf.driveRevision||Number(file.size)!==target.pdf.size||properties.cdqEngineHashV2754!==target.pdf.sha256||properties.cdqEngineReportV2754!==target.reportId||Number(properties.cdqEngineRevisionV2754)!==target.revision||target.kind==='list'&&file.name!=='Liste de balance.pdf')throw Error('CONFLICT_ARCHIVE_REVISION : un PDF du dossier a changé depuis sa confirmation.');
  normalized.observed={fileId:file.id,revision:file.modifiedTime,name:file.name,size:Number(file.size||0),parentId:file.parents[0],engineReportId:properties.cdqEngineReportV2754,engineRevision:Number(properties.cdqEngineRevisionV2754),hash:String(properties.cdqEngineHashV2754||'')};
  if(target.kind==='list'){
   var listed=Drive.Files.list({q:"'"+cdq23Quote_(id)+"' in parents and trashed=false and name = 'Liste de balance.pdf'",pageSize:2,fields:'nextPageToken,incompleteSearch,files(id)',supportsAllDrives:true,includeItemsFromAllDrives:true});
   if(!listed||!Array.isArray(listed.files)||listed.incompleteSearch||listed.nextPageToken||listed.files.length!==1||listed.files[0].id!==file.id)throw Error('CONFLICT_LIST_FILE : une ancienne copie de la liste est encore active.');
  }
 });
 targets.sort(function(a,b){return (a.kind+':'+a.reportId).localeCompare(b.kind+':'+b.reportId);});membership.sort(function(a,b){return a.id.localeCompare(b.id);});
 destinations=Array.from(new Set(destinations)).sort();
 var stamp=cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify({clientId:scope.clientId,selected:selected,membership:membership,targets:targets})).getBytes());
 verifierDroit_('envoi');cdqUploadAccessV2751_(false);
 return {ok:true,engine:2754,kind:'archive',clientId:scope.clientId,ready:pending.length===0,stamp:stamp,folderIds:folders,destinations:destinations,targets:targets,pending:pending};
}
function cdqReportEngineArchiveGuardV2754_(folderIds,clientId,previous){
 if(!Array.isArray(folderIds)||!folderIds.length)return null;
 if(previous)cdqReportEngineArchiveCollectedV2754_(previous);
 var actor=cdqUploadAccessV2751_(false),p={clientId:String(clientId||''),folderIds:folderIds},scope=cdqReportEngineScopeV2754_(p,false),plan=cdqReportEngineArchiveStatusV2754_(actor,p,scope);
 if(!plan.ready||previous&&previous.stamp!==plan.stamp)throw Error('PDF_PENDING : les dernières réponses du dossier doivent être confirmées dans Drive avant son envoi.');
 return plan;
}
// Validate the very blob already loaded by the historical archive provider.
// The plan comes only from the server gate, never from a caller's PDF flags.
function cdqReportEngineArchiveBlobV2754_(file,blob,plan,folderId){
 if(!plan||!Array.isArray(plan.targets))throw Error('INVALID_ARCHIVE_SCOPE : contrôle de l’archive manquant.');
 var mime=String(file.getMimeType()||'');
 var id=String(file.getId()),target=plan.targets.filter(function(t){return t.pdf&&t.pdf.fileId===id;})[0],meta=null;
 if(!target){meta=Drive.Files.get(cdqDriveIdV2521_(id),{fields:'id,mimeType,parents,trashed,appProperties',supportsAllDrives:true});if(meta.id!==id||meta.trashed||meta.mimeType!==mime||!meta.parents||meta.parents.length!==1||meta.parents[0]!==folderId)throw Error('CONFLICT_ARCHIVE_SCOPE : le PDF collecté a changé de dossier.');}
 else if(folderId&&target.destinationId!==folderId)throw Error('CONFLICT_ARCHIVE_SCOPE : le PDF collecté a changé de dossier.');
 plan.collectedFiles=plan.collectedFiles||[];if(!plan.collectedFiles.some(function(f){return f.fileId===id;})){if(plan.collectedFiles.length>=500)throw Error('INVALID_ARCHIVE_SCOPE : trop de PDF dans l’archive.');plan.collectedFiles.push({fileId:id,engineReportId:target?target.reportId:meta.appProperties&&meta.appProperties.cdqEngineReportV2754||''});}
 if(!target)return blob;
 if(target.deleted||target.drivePending||target.pdf.status!=='confirmed'||target.pdf.revision!==target.revision)throw Error('PDF_PENDING : le PDF du dossier n’est pas confirmé.');
 if(file.getMimeType()!=='application/pdf')throw Error('CONFLICT_ARCHIVE_CONTENT : le type du PDF a changé.');
 var bytes=blob.getBytes();
 if(bytes.length!==target.pdf.size||cdqUploadHashV2751_(bytes)!==target.pdf.sha256)throw Error('CONFLICT_ARCHIVE_CONTENT : les octets du PDF du dossier ne correspondent plus à son reçu.');
 return blob;
}
// One batch classifies the actual collected PDFs, including moved files
// whose engine properties were removed. Unmanaged temporary copies remain
// ordinary historical files; no caller-provided exemption is trusted.
function cdqReportEngineArchiveCollectedV2754_(plan){
 if(!plan.collectedFiles||!plan.collectedFiles.length)return;
 verifierDroit_('envoi');var actor=cdqUploadAccessV2751_(false),result=cdqReportEngineCallV2754_(actor,'archiveLookup',{clientId:plan.clientId,files:plan.collectedFiles},{clientId:plan.clientId});
 if(!result||result.engine!==2754||!Array.isArray(result.files)||result.files.length!==plan.collectedFiles.length)throw Error('ENGINE_UNAVAILABLE : classification de l’archive incomplète.');
 result.files.forEach(function(file,index){
  if(file.fileId!==plan.collectedFiles[index].fileId||typeof file.managed!=='boolean')throw Error('ENGINE_UNAVAILABLE : identité PDF de l’archive invalide.');
  if(!file.managed)return;
  var target=plan.targets.filter(function(t){return t.kind===file.kind&&t.reportId===file.reportId&&t.pdf.fileId===file.fileId;})[0];
  if(!target||file.clientId!==plan.clientId||file.destinationId!==target.destinationId||file.currentFileId!==file.fileId||file.deleted)throw Error('CONFLICT_ARCHIVE_SCOPE : un PDF géré a été déplacé ou supprimé dans l’archive.');
  if(file.revision!==target.revision||file.pdfRevision!==target.revision||file.status!=='confirmed')throw Error('PDF_PENDING : un PDF de l’archive n’est plus à jour.');
 });
}
// A list remains a derived document owned by one durable D1 generation. All
// mutations below run under the same lock as the final Drive publication.
function cdqReportEngineListFolderV2754_(id,clientId,allowTrashed){
 var m=Drive.Files.get(cdqDriveIdV2521_(id),{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});
 if(m.id!==id||m.mimeType!=='application/vnd.google-apps.folder'||!m.parents||m.parents.length!==1||m.parents[0]!==clientId||String(m.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()!=='liste de balance'||m.trashed&&!allowTrashed||m.capabilities&&m.capabilities.canEdit===false)throw Error('SCOPE_MISMATCH : le dossier Liste de Balance connu a changé ou est supprimé.');
 var folder={meta:m,path:[{id:CONFIG.MASTER_FOLDER_ID},{id:clientId},{id:id}]};cdqUploadFolderWriteV2751_(folder);return folder;
}
function cdqReportEngineListFileV2754_(id,destinationId,allowMissing){
 var m;
 try{m=Drive.Files.get(cdqDriveIdV2521_(id),{fields:CDQ_UPLOAD_FIELDS_V2751_.replace('capabilities(canEdit)','capabilities(canEdit,canTrash)'),supportsAllDrives:true});}
 catch(e){if(allowMissing&&(Number(e&&e.code)===404||Number(e&&e.details&&e.details.code)===404))return null;throw e;}
 if(m.id!==id||m.name!=='Liste de balance.pdf'||m.mimeType!=='application/pdf'||!m.parents||m.parents.length!==1||m.parents[0]!==destinationId||m.capabilities&&m.capabilities.canEdit===false)throw Error('CONFLICT_LIST_FILE : l’identité ou le dossier de la liste a changé.');
 return m;
}
// This exceptional path recovers a Drive write whose acknowledgement was
// lost. Publication properties alone never prove that its bytes survived.
function cdqReportEngineRecoverListReceiptV2754_(actor,state,scope,old){
 if(!state.artifact)return state;
 if(!old&&!state.pdf.fileId){
  var found=Drive.Files.list({q:"'"+cdq23Quote_(state.destinationId)+"' in parents and trashed=false and name = 'Liste de balance.pdf'",pageSize:2,fields:'nextPageToken,incompleteSearch,files('+CDQ_UPLOAD_FIELDS_V2751_+')',supportsAllDrives:true,includeItemsFromAllDrives:true});
  if(!found||!Array.isArray(found.files)||found.incompleteSearch||found.nextPageToken||found.files.length>1)throw Error('CONFLICT_LIST_FILE : résultat de liste ambigu.');
  if(found.files.length)old=cdqReportEngineListFileV2754_(found.files[0].id,state.destinationId,false);
 }
 if(!old||old.trashed||old.modifiedTime===state.pdf.driveRevision)return state;
 var props=old.appProperties||{},artifact=state.artifact;
 if(props.cdqEngineReportV2754!==state.reportId||props.cdqEngineJobV2754!==state.reportId||Number(props.cdqEngineRevisionV2754)!==artifact.revision||props.cdqEngineHashV2754!==artifact.sha256||Number(old.size)!==artifact.size)return state;
 if(artifact.size<8||artifact.size>16*1024*1024)throw Error('CONFLICT_LIST_RECEIPT : taille de publication invalide.');
 var bytes=DriveApp.getFileById(old.id).getBlob().getBytes(),hash=cdqUploadHashV2751_(bytes),after=cdqReportEngineListFileV2754_(old.id,state.destinationId,false);
 if(hash!==artifact.sha256||bytes.length!==artifact.size||after.trashed||after.modifiedTime!==old.modifiedTime||after.name!==old.name||String(after.size)!==String(old.size)||JSON.stringify(after.parents)!==JSON.stringify(old.parents)||!cdqReportEngineSameAppPropertiesV2754_(after.appProperties,old.appProperties))throw Error('CONFLICT_EXTERNAL_DRIVE : le PDF de liste publié a changé avant son reçu.');
 var recoveryScope={clientId:scope.clientId,listDestinationId:state.destinationId,listPublicationReceipt:{previous:state.plan,fileId:old.id,driveRevision:old.modifiedTime,revision:artifact.revision,sha256:hash,size:bytes.length}};
 actor=cdqUploadAccessV2751_(true);cdqReportEngineCallV2754_(actor,'recoverListReceipt',{clientId:scope.clientId},recoveryScope);
 return cdqReportEngineCallV2754_(actor,'listPlan',{clientId:scope.clientId},scope);
}
function cdqReportEngineSameAppPropertiesV2754_(a,b){
 a=a||{};b=b||{};var keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(function(key){return Object.prototype.hasOwnProperty.call(b,key)&&a[key]===b[key];});
}
function cdqReportEngineAcquireLockV2755_(){
 // Return contention before the 12-second engine callback deadline. The
 // durable outbox retries it; no Drive write starts without the lock.
 var lock=LockService.getScriptLock();
 try{lock.waitLock(6000);}catch(_){throw Error('DRIVE_LOCK_BUSY : une autre opération Drive se termine; la reprise est conservée.');}
 return lock;
}
function cdqReportEngineRecoverListRevisionV2755_(actor,state,scope,old){
 var receipt=state.confirmedReceipt;
 if(!receipt||!old||old.trashed||old.modifiedTime===state.pdf.driveRevision)return state;
 var props=old.appProperties||{};
 if(old.id!==state.pdf.fileId||receipt.fileId!==old.id||receipt.driveRevision!==state.pdf.driveRevision||receipt.revision!==state.pdf.revision||!/^[a-f0-9]{64}$/.test(String(receipt.sha256||''))||!Number.isSafeInteger(receipt.size)||receipt.size<8||receipt.size>16*1024*1024||Number(old.size)!==receipt.size)return state;
 if(props.cdqEngineReportV2754&&props.cdqEngineReportV2754!==state.reportId)throw Error('CONFLICT_LIST_FILE : la liste appartient à un autre moteur.');
 if(props.cdqEngineRevisionV2754&&Number(props.cdqEngineRevisionV2754)!==receipt.revision||props.cdqEngineHashV2754&&props.cdqEngineHashV2754!==receipt.sha256)return state;
 var bytes=DriveApp.getFileById(old.id).getBlob().getBytes(),hash=cdqUploadHashV2751_(bytes),after=cdqReportEngineListFileV2754_(old.id,state.destinationId,false);
 if(hash!==receipt.sha256||bytes.length!==receipt.size||after.trashed||after.modifiedTime!==old.modifiedTime||after.name!==old.name||String(after.size)!==String(old.size)||JSON.stringify(after.parents)!==JSON.stringify(old.parents)||!cdqReportEngineSameAppPropertiesV2754_(after.appProperties,old.appProperties))throw Error('CONFLICT_EXTERNAL_DRIVE : la copie Drive de la liste doit être vérifiée avant sa mise à jour.');
 var recoveryScope={clientId:scope.clientId,listDestinationId:state.destinationId,listRevisionReceipt:{previous:state.plan,fileId:old.id,driveRevision:old.modifiedTime,revision:receipt.revision,sha256:hash,size:bytes.length}};
 actor=cdqUploadAccessV2751_(true);cdqReportEngineCallV2754_(actor,'recoverListRevision',{clientId:scope.clientId},recoveryScope);
 return cdqReportEngineCallV2754_(actor,'listPlan',{clientId:scope.clientId},scope);
}
function cdqReportEngineRepairActorV2755_(email,clientId,destinationId){
 var actor=cdqUploadAccessV2751_(true),client=cdqWsListClientV2646_(clientId);
 if(String(actor.email||'').trim().toLowerCase()!==email)throw Error('ROLE_CHANGED : le compte a changé pendant la réparation de la liste.');
 if(client.meta.id!==clientId)throw Error('SCOPE_MISMATCH : le client de la liste a changé.');
 cdqReportEngineListFolderV2754_(destinationId,clientId,false);return actor;
}
function cdqReportEngineSameListMetadataV2755_(a,b){
 return a.id===b.id&&!a.trashed&&!b.trashed&&a.name===b.name&&a.mimeType===b.mimeType&&a.modifiedTime===b.modifiedTime&&String(a.size)===String(b.size)&&JSON.stringify(a.parents)===JSON.stringify(b.parents)&&cdqReportEngineSameAppPropertiesV2754_(a.appProperties,b.appProperties);
}
function cdqReportEngineRepairSourceBytesV2755_(source,state,expected){
 if(!source||source.trashed||source.id!==expected.fileId||source.id!==state.pdf.fileId||source.modifiedTime!==expected.driveRevision||Number(source.size)!==expected.size||source.appProperties&&source.appProperties.cdqEngineReportV2754&&source.appProperties.cdqEngineReportV2754!==state.reportId)throw Error('CONFLICT_LIST_REPAIR : la copie à conserver a changé.');
 var bytes=DriveApp.getFileById(source.id).getBlob().getBytes(),after=cdqReportEngineListFileV2754_(source.id,state.destinationId,false);
 if(bytes.length!==expected.size||cdqUploadHashV2751_(bytes)!==expected.sha256||!cdqReportEngineSameListMetadataV2755_(source,after))throw Error('CONFLICT_EXTERNAL_DRIVE : le contenu de la liste a changé pendant sa conservation.');
 cdqUploadPdfV2751_(bytes,{size:expected.size,sha256:expected.sha256});return bytes;
}
function cdqReportEngineRepairBackupMetadataV2755_(id,state,expected,name,properties){
 var m=Drive.Files.get(cdqDriveIdV2521_(id),{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true}),props=m.appProperties||{};
 if(m.id!==id||m.id===expected.fileId||m.trashed||m.mimeType!=='application/pdf'||m.name!==name||!m.parents||m.parents.length!==1||m.parents[0]!==state.destinationId||Number(m.size)!==expected.size||m.capabilities&&m.capabilities.canEdit===false||props.cdqEngineReportV2754||!Object.keys(properties).every(function(key){return props[key]===properties[key];}))throw Error('CONFLICT_LIST_REPAIR : identité de la sauvegarde de liste non confirmée.');
 return m;
}
// Explicit repair only: keep the divergent bytes under a separate name and
// dedicated identity before requesting a new derived generation. A lost ACK
// reuses the verified backup and the durable transaction receipt.
function cdqReportEngineRepairExternalListV2755_(actor,p,scope,state,old){
 var expected=p.externalRevision||{},email=String(actor.email||'').trim().toLowerCase();
 if(!old||old.trashed||expected.fileId!==state.pdf.fileId||typeof expected.driveRevision!=='string'||!expected.driveRevision||expected.driveRevision.length>100||!/^[a-f0-9]{64}$/.test(String(expected.sha256||''))||!Number.isSafeInteger(expected.size)||expected.size<8||expected.size>16*1024*1024)throw Error('CONFLICT_LIST_REPAIR : identité et révision explicites de la copie requises.');
 actor=cdqReportEngineRepairActorV2755_(email,scope.clientId,state.destinationId);
 var repairKey=cdqUploadHashV2751_(Utilities.newBlob(JSON.stringify([scope.clientId,state.reportId,expected.fileId,expected.driveRevision,expected.sha256])).getBytes()),signed={clientId:scope.clientId,listDestinationId:state.destinationId,listExternalRepair:{repairKey:repairKey,source:{fileId:expected.fileId,driveRevision:expected.driveRevision,sha256:expected.sha256,size:expected.size}}};
 var prior=cdqReportEngineCallV2754_(actor,'listRepairStatus',{clientId:scope.clientId},signed);if(prior.replayed===true)return prior;
 var bytes=cdqReportEngineRepairSourceBytesV2755_(old,state,expected),name='Liste de balance - copie avant réparation '+repairKey.slice(0,16)+'.pdf',properties={cdqListRepairV2755:repairKey,cdqListRepairReportV2755:state.reportId,cdqListRepairSourceV2755:expected.fileId,cdqListRepairRevisionV2755:expected.driveRevision,cdqListRepairHashV2755:expected.sha256};
 var found=Drive.Files.list({q:"'"+cdq23Quote_(state.destinationId)+"' in parents and trashed=false and appProperties has { key='cdqListRepairV2755' and value='"+cdq23Quote_(repairKey)+"' }",pageSize:2,fields:'nextPageToken,incompleteSearch,files('+CDQ_UPLOAD_FIELDS_V2751_+')',supportsAllDrives:true,includeItemsFromAllDrives:true});
 if(!found||!Array.isArray(found.files)||found.incompleteSearch||found.nextPageToken||found.files.length>1)throw Error('CONFLICT_LIST_REPAIR : sauvegarde de liste ambiguë.');
 var copy=found.files[0];
 if(!copy){
  actor=cdqReportEngineRepairActorV2755_(email,scope.clientId,state.destinationId);
  var sourceBefore=cdqReportEngineListFileV2754_(expected.fileId,state.destinationId,false);if(!cdqReportEngineSameListMetadataV2755_(old,sourceBefore))throw Error('CONFLICT_LIST_REPAIR : la copie à conserver a changé avant sa sauvegarde.');
  copy=Drive.Files.create({name:name,mimeType:'application/pdf',parents:[state.destinationId],appProperties:properties},Utilities.newBlob(bytes,'application/pdf',name),{fields:'id,name,modifiedTime',supportsAllDrives:true});
  if(!copy||!copy.id)throw Error('CONFLICT_LIST_REPAIR : sauvegarde de liste non confirmée.');
 }
 var backup=cdqReportEngineRepairBackupMetadataV2755_(copy.id,state,expected,name,properties),backupBytes=DriveApp.getFileById(backup.id).getBlob().getBytes(),backupAfter=cdqReportEngineRepairBackupMetadataV2755_(backup.id,state,expected,name,properties);
 if(backupBytes.length!==expected.size||cdqUploadHashV2751_(backupBytes)!==expected.sha256||!cdqReportEngineSameListMetadataV2755_(backup,backupAfter))throw Error('CONFLICT_LIST_REPAIR : les octets de la sauvegarde ne sont pas confirmés.');
 actor=cdqReportEngineRepairActorV2755_(email,scope.clientId,state.destinationId);
 var sourceAfter=cdqReportEngineListFileV2754_(expected.fileId,state.destinationId,false);if(!cdqReportEngineSameListMetadataV2755_(old,sourceAfter))throw Error('CONFLICT_EXTERNAL_DRIVE : la liste a changé après sa sauvegarde.');
 cdqReportEngineRepairSourceBytesV2755_(sourceAfter,state,expected);
 actor=cdqReportEngineRepairActorV2755_(email,scope.clientId,state.destinationId);
 signed.listExternalRepair.previous=state.plan;signed.listExternalRepair.backup={fileId:backup.id,driveRevision:backup.modifiedTime,sha256:expected.sha256,size:expected.size};
 var result=cdqReportEngineCallV2754_(actor,'repairExternalList',{clientId:scope.clientId},signed);invaliderCacheContenuClient_(scope.clientId);return result;
}
function cdqReportEngineReconcileListV2754_(actor,p,scope,mode){
 var lock=cdqReportEngineAcquireLockV2755_();
 try{
  actor=cdqUploadAccessV2751_(true);var client=cdqWsListClientV2646_(scope.clientId);if(client.meta.id!==scope.clientId)throw Error('SCOPE_MISMATCH : client de la liste non confirmé.');var state=cdqReportEngineCallV2754_(actor,'listPlan',{clientId:scope.clientId},scope);
  if(!state.found){if(mode==='repair')return cdqReportEngineCallV2754_(actor,'list',{clientId:scope.clientId},scope);if(mode==='import')return cdqReportEngineCallV2754_(actor,'importIndex',p,scope);throw Error('REPORT_NOT_FOUND : liste du client introuvable.');}
  if(p.reportId&&p.reportId!==state.reportId||p.fileId&&p.fileId!==state.pdf.fileId||mode==='import'&&scope.listDestinationId!==state.destinationId)throw Error('CONFLICT_LIST_FILE : cette copie de la liste est obsolète. Actualisez la liste du client.');
  cdqReportEngineListFolderV2754_(state.destinationId,scope.clientId,mode==='preflight');
  var old=state.pdf.fileId?cdqReportEngineListFileV2754_(state.pdf.fileId,state.destinationId,true):null;
  if(mode==='repair'&&p.reconcileExternal===true)return cdqReportEngineRepairExternalListV2755_(actor,p,scope,state,old);
  if(mode==='repair'||mode==='import'){state=cdqReportEngineRecoverListReceiptV2754_(actor,state,scope,old);old=state.pdf.fileId?cdqReportEngineListFileV2754_(state.pdf.fileId,state.destinationId,true):null;state=cdqReportEngineRecoverListRevisionV2755_(actor,state,scope,old);}
  var oldState=!state.pdf.fileId?'empty':!old?'missing':old.trashed?'trashed':'live';
  if(old&&old.appProperties&&old.appProperties.cdqEngineReportV2754&&old.appProperties.cdqEngineReportV2754!==state.reportId)throw Error('CONFLICT_LIST_FILE : la liste appartient à un autre moteur.');
  if(mode==='preflight'){
   if(!old||!p.fileId||p.fileId!==state.pdf.fileId)throw Error('CONFLICT_LIST_FILE : la liste à restaurer n’est plus disponible.');
   var preflight=Object.assign({},state,{restoreAllowed:true});delete preflight.plan;delete preflight.artifact;return preflight;
  }
  var targetId=state.pdf.fileId||'',targetRevision=state.pdf.driveRevision||'';
  if(mode==='repair'){
   if(oldState==='trashed'||oldState==='missing'){targetId='';targetRevision='';}
   else if(old&&old.modifiedTime!==targetRevision)throw Error('CONFLICT_EXTERNAL_DRIVE : la liste a changé directement dans Drive.');
  }else if(mode==='import'){
   targetId=p.listFileId||state.pdf.fileId||'';targetRevision=p.listRevision||state.pdf.driveRevision||'';
   if(targetId!==state.pdf.fileId&&oldState==='live')throw Error('CONFLICT_LIST_FILE : l’ancienne liste est encore active.');
   if(targetId){var target=cdqReportEngineListFileV2754_(targetId,state.destinationId,false);if(target.trashed||target.appProperties&&target.appProperties.cdqEngineReportV2754&&target.appProperties.cdqEngineReportV2754!==state.reportId)throw Error('CONFLICT_LIST_FILE : la nouvelle liste est supprimée ou appartient à un autre moteur.');targetRevision=target.modifiedTime;p.listRevision=targetRevision;}
   if(targetId===state.pdf.fileId&&oldState==='live'&&targetRevision!==state.pdf.driveRevision)throw Error('CONFLICT_EXTERNAL_DRIVE : la liste a changé directement dans Drive.');
  }else{
   if(!p.fileId||p.fileId!==state.pdf.fileId||!old)throw Error('CONFLICT_LIST_FILE : la liste a été remplacée.');
   var props=old.appProperties||{};
   if(!(old.capabilities&&old.capabilities.canTrash)&&props.cdqEngineCreatorV2754!==empreinteCDQ_(actor.email))throw Error('RESTORE_NOT_AUTHORIZED : restauration Drive non autorisée.');
   if(props.cdqEngineHashV2754){var hash=cdqUploadHashV2751_(DriveApp.getFileById(old.id).getBlob().getBytes());if(hash!==props.cdqEngineHashV2754)throw Error('CONFLICT_RESTORE_CONTENT : le contenu de la liste a changé.');}
   if(old.trashed){var receipt=Drive.Files.update({trashed:false},old.id,null,{fields:'id,trashed',supportsAllDrives:true});if(!receipt||receipt.trashed!==false)throw Error('RESTORE_NOT_CONFIRMED : la restauration de la liste n’est pas confirmée.');}
   var confirmed=cdqReportEngineListFileV2754_(old.id,state.destinationId,false);if(confirmed.trashed)throw Error('RESTORE_NOT_CONFIRMED : la liste est encore supprimée.');
   if(!cdqReportEngineSameAppPropertiesV2754_(confirmed.appProperties,old.appProperties)||String(confirmed.size)!==String(old.size))throw Error('CONFLICT_RESTORE_CONTENT : la liste a changé pendant sa restauration.');
   targetId=confirmed.id;targetRevision=confirmed.modifiedTime;
  }
  scope.listDestinationId=state.destinationId;scope.listReconciliation={mode:mode,previous:state.plan,oldState:oldState,targetFileId:targetId,targetDriveRevision:targetRevision};
  actor=cdqUploadAccessV2751_(true);var result=cdqReportEngineCallV2754_(actor,mode==='import'?'importIndex':mode==='restore'?'restore':'list',p,scope);
  invaliderCacheContenuClient_(scope.clientId);return result;
 }finally{lock.releaseLock();}
}
function cdqReportEngineRestoreV2754_(actor,p,scope){
 var lock=cdqReportEngineAcquireLockV2755_();
 try{
  actor=cdqUploadAccessV2751_(true);var plan=cdqReportEngineCallV2754_(actor,'restorePlan',p,scope);if(plan.restored)return plan;
  if(plan.localDraft){
   var localDestination=cdqWsFolderV2638_(cdqDriveIdV2521_(p.destinationId)),localFolderId=cdqDriveIdV2521_(p.restoredFolderId),localFolder=cdqWsFolderV2638_(localFolderId);
   if(localDestination.meta.trashed||localFolder.meta.trashed||!localDestination.path||localDestination.path.length<2||localDestination.path[1].id!==scope.clientId||!localFolder.path||localFolder.path[1].id!==scope.clientId||!localDestination.path.some(function(part){return part.id===localFolderId;}))throw Error('RESTORE_NOT_CONFIRMED : le dossier réel doit être restauré avant son brouillon local.');
   cdqUploadFolderWriteV2751_(localDestination);throw Error('RESTORE_LOCAL_DRAFT : restaurez les réponses locales sous un nouvel identifiant dans le dossier confirmé.');
  }
  var destination=cdqWsFolderV2638_(cdqDriveIdV2521_(plan.destinationId));
  if(destination.meta.trashed||!destination.path||destination.path.length<2||destination.path[1].id!==scope.clientId)throw Error('SCOPE_MISMATCH : dossier du rapport à restaurer indisponible.');
  cdqUploadFolderWriteV2751_(destination);
  var id=String(plan.fileId||p.fileId||''),file=null;
  if(plan.fileId&&p.fileId&&plan.fileId!==p.fileId)throw Error('CONFLICT_RESTORE_FILE : le PDF à restaurer a changé.');
  if(id)file=Drive.Files.get(cdqDriveIdV2521_(id),{fields:CDQ_UPLOAD_FIELDS_V2751_.replace('capabilities(canEdit)','capabilities(canEdit,canTrash)'),supportsAllDrives:true});
  else{
   var found=Drive.Files.list({q:"'"+cdq23Quote_(plan.destinationId)+"' in parents and appProperties has { key='cdqEngineReportV2754' and value='"+cdq23Quote_(plan.reportId)+"' }",pageSize:2,fields:'nextPageToken,incompleteSearch,files('+CDQ_UPLOAD_FIELDS_V2751_.replace('capabilities(canEdit)','capabilities(canEdit,canTrash)')+')',supportsAllDrives:true,includeItemsFromAllDrives:true});
   if(!found||!Array.isArray(found.files)||found.incompleteSearch||found.nextPageToken||found.files.length>1)throw Error('CONFLICT_RESTORE_FILE : résultat Drive ambigu.');file=found.files[0]||null;id=file&&file.id||'';
  }
  var restoreScope={clientId:scope.clientId,destinationId:plan.destinationId,restorationValidated:true,fileId:id};
  if(file){
   var properties=file.appProperties||{};
   if(file.mimeType!=='application/pdf'||!file.parents||file.parents.length!==1||file.parents[0]!==plan.destinationId||properties.cdqEngineReportV2754&&properties.cdqEngineReportV2754!==plan.reportId||!properties.cdqEngineReportV2754&&plan.fileId!==file.id)throw Error('SCOPE_MISMATCH : identité du PDF à restaurer non confirmée.');
   if(!(file.capabilities&&file.capabilities.canTrash)&&properties.cdqEngineCreatorV2754!==empreinteCDQ_(actor.email))throw Error('RESTORE_NOT_AUTHORIZED : restauration Drive non autorisée.');
   if(properties.cdqEngineHashV2754&&cdqUploadHashV2751_(DriveApp.getFileById(id).getBlob().getBytes())!==properties.cdqEngineHashV2754)throw Error('CONFLICT_RESTORE_CONTENT : le contenu du PDF a changé.');
   if(file.trashed){var restored=Drive.Files.update({trashed:false},id,null,{fields:'id,trashed',supportsAllDrives:true});if(!restored||restored.trashed!==false)throw Error('RESTORE_NOT_CONFIRMED : restauration Drive non confirmée.');}
   var confirmed=Drive.Files.get(id,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});
   if(confirmed.trashed||!confirmed.parents||confirmed.parents.length!==1||confirmed.parents[0]!==plan.destinationId)throw Error('RESTORE_NOT_CONFIRMED : le PDF restauré n’est pas disponible dans son dossier.');
   restoreScope.driveRevision=confirmed.modifiedTime;restoreScope.engineReportId=confirmed.appProperties&&confirmed.appProperties.cdqEngineReportV2754||'';
  }else{
   var folderId=cdqDriveIdV2521_(p.restoredFolderId),folder=cdqWsFolderV2638_(folderId);
   if(folder.meta.trashed||!folder.path||folder.path[1].id!==scope.clientId||!destination.path.some(function(part){return part.id===folderId;}))throw Error('RESTORE_NOT_CONFIRMED : le dossier réel doit être restauré avant ses rapports en attente.');
   restoreScope.restoredFolderId=folderId;restoreScope.driveRevision='folder:'+String(destination.meta.modifiedTime||Date.now());
  }
  actor=cdqUploadAccessV2751_(true);var result=cdqReportEngineCallV2754_(actor,'restore',p,restoreScope);invaliderCacheContenuClient_(scope.clientId);return result;
 }finally{lock.releaseLock();}
}
function cdqReportEngineExportV2754_(actor,p,scope,state){
 state=state||cdqReportEngineCallV2754_(actor,'status',p,scope);
 if(state.deleted)throw Error('REPORT_DELETED : ce rapport est supprimé.');
 if(!state.found||!state.pdf||state.pdf.status!=='confirmed'||state.pdf.revision!==state.revision)throw Error('PDF_PENDING : la dernière révision du PDF est encore en cours de publication.');
 if(p.kind==='list'&&(state.kind!=='list'||p.fileId!==state.pdf.fileId||p.reportId!==state.reportId))throw Error('CONFLICT_LIST_FILE : cette liste a été remplacée.');
 var id=cdqDriveIdV2521_(state.pdf.fileId),m=Drive.Files.get(id,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true}),properties=m.appProperties||{},fileScope=cdqDriveScopeV2521_(id,{},[CONFIG.MASTER_FOLDER_ID]);
 if(m.trashed||m.mimeType!=='application/pdf'||!fileScope.path||fileScope.path.length<3||fileScope.path[1].id!==scope.clientId||m.modifiedTime!==state.pdf.driveRevision||properties.cdqEngineReportV2754!==state.reportId||Number(properties.cdqEngineRevisionV2754)!==state.revision)throw Error('CONFLICT_EXPORT_REVISION : le PDF Drive a changé.');
 if(state.kind==='list'&&(m.name!=='Liste de balance.pdf'||!m.parents||m.parents.length!==1||m.parents[0]!==state.destinationId))throw Error('CONFLICT_LIST_FILE : destination de liste incorrecte.');
 var bytes=DriveApp.getFileById(id).getBlob().getBytes(),hash=cdqUploadHashV2751_(bytes);if(hash!==properties.cdqEngineHashV2754||String(bytes.length)!==String(m.size))throw Error('CONFLICT_EXPORT_CONTENT : le contenu Drive a changé.');
 cdqUploadAccessV2751_(false);var after=Drive.Files.get(id,{fields:'id,modifiedTime,trashed',supportsAllDrives:true});if(after.trashed||after.modifiedTime!==m.modifiedTime)throw Error('CONFLICT_EXPORT_REVISION : le PDF a changé pendant son chargement.');
 return {ok:true,engine:2754,kind:state.kind||'report',clientId:scope.clientId,mimeType:'application/pdf',fileId:id,reportId:state.reportId,revision:state.revision,driveRevision:m.modifiedTime,name:m.name,size:bytes.length,sha256:hash,base64:Utilities.base64Encode(bytes)};
}
function cdqReportEngineIsServiceV2754_(e){
 if(Number(e&&e.contentLength||0)>24*1024*1024)return false;
 var contents=String(e&&e.postData&&e.postData.contents||'');
 return /^\s*\{\s*"cdqReportEngineServiceV2754"\s*:/.test(contents);
}
function cdqReportEngineServiceV2754_(e){
 var value;
 try{
  var input=JSON.parse(String(e&&e.postData&&e.postData.contents||'')),message=cdqReportEngineVerifyV2754_(input.cdqReportEngineServiceV2754,'engine-to-gas'),p=message.payload||{};
  if(['authorizePublication','commitPublication','trashReport'].indexOf(message.action)<0)throw Error('UNKNOWN_ACTION : action serveur inconnue.');
  var actor=cdqWsActorV2638_(normaliserEmailCDQ_(p.actor)),previous=CDQ_ACCES_RPC_COURANT_;
  CDQ_ACCES_RPC_COURANT_={email:actor.email,role:actor.role,verifiedUserV2686:actor};
  try{value=message.action==='commitPublication'?cdqReportEngineCommitV2754_(p,actor):message.action==='trashReport'?cdqReportEngineTrashV2754_(p,actor):cdqReportEngineAuthorizeV2754_(p,actor);}finally{CDQ_ACCES_RPC_COURANT_=previous;}
 }catch(error){var text=String(error&&error.message||error),match=text.match(/^([A-Z][A-Z0-9_]+)\s*:/);value={ok:false,code:match?match[1]:'DRIVE_PUBLICATION_FAILED',error:text.slice(0,500)};}
 return ContentService.createTextOutput(JSON.stringify(cdqReportEngineEnvelopeV2754_('gas-to-engine-response',{value:value}))).setMimeType(ContentService.MimeType.JSON);
}
// Exact V27.54 templates from the qualified application catalogue.
var CDQ_REPORT_ENGINE_TEMPLATE_SHA256_V2754_=Object.freeze({
 "plancher": "775ec19b78a14e5851ad620b1ef99e82a12306d76e0fd531e46f57f97e3b3364",
 "trackscale": "00cbe6cb741c2e28c7c342d17c695c593f780145e129873c68b442e84881b309",
 "precision": "caf5b445d66f6fa5fb5e9bbd6fc50349bb98f78ab6ffdf7ac5f6e3fd321a6326",
 "table": "3dabe416501c57698c891dc628b6153b34669d603f81d88d4219aa6b1364b1f9",
 "camion": "ff40bd121e4e53ac75dac859a86e803a2d3c34f89c2c306b6b206e330a0e5b5e",
 "train": "44ebcd98aad4522d172e402a1f52dba729e7af0eb39b01fb84f0fc2e35ce7a36",
 "chariot": "cfc6b918db86543b1a53056b3e023880c1da4ed934c092419cf0694bf91d3ffc",
 "convoyeur": "726b71534e89dc69f6bb43aa1b60507e77a76619c644e3ae3b7b5f1a50b945f2",
 "cuve4": "527fa14460532a028ea5b68d694d05ea7c57975c87f6362aa4b85609bd3adafd",
 "tremie4": "f95adfb77ab93b230ce67ab879654e11874bc9f0afda45edc8038f275903b7ee",
 "multitete": "606cbdf75a89b2bab30ccad78bbbce015256a666ac7c664e32e9469e4a70ba8c",
 "suspendue": "5502adbf2abf8ff9d0058fef81fb23db0f898e215c756d787c04cde6ec71e342"
});
// Exact V27.60 cyan30 revisions; historical hashes above remain approved.
// Approved manifest SHA256: d2e3ebabf6efe5364f4534f7b125b655f8f7582859669aebb32ddc510d880c33
var CDQ_REPORT_ENGINE_TEMPLATE_SHA256_V2760_=Object.freeze({
 "plancher": "d4def5fb2753272b9769e9fcc73b8b9da46173ba6aea185b9791f96917b5acfb",
 "trackscale": "9e654e760469ebef519c56b4d0359fb1ee24799d0bda5e2455a39594aa028185",
 "precision": "98c8d8f73f7755c058562260bdc132246bd083d1ea35024fb800c0bf3264bc69",
 "table": "c54ff5f28a0be5f332236d90d84bcdf6273bd4136d7872bd13934d72131646b6",
 "camion": "e2c0bd73429bf9d8e7701b87eaf2fcadb79c04d0986acac955f3aad9336c4635",
 "train": "d549ea7a06e59692514a3feba96fa80fed3edb2094dee603b0b293c95413f478",
 "chariot": "f9c9725309144446ebe2d82b3db0f90c4d161946e73fad8ce069d64a36253c3f",
 "convoyeur": "a43ff404d42b846c105770c3fe74bfb15ec646c1d658bf999fc5447ea3ed0d90",
 "cuve4": "f6853e2903719b571704bee43f3c68452d5caeb5b5aca63402f4488d40a93bb7",
 "tremie4": "9ecc1deb02e26c4ad44163a6f4ec61013e32ae66812912f24330da16f9b4e3e4",
 "multitete": "b0e5b6bb4cb0106fdf97bc01cae0704cd1483d0c0114d080147cc26f7e789e47",
 "suspendue": "2a619465ea7eb052a7f55cee151481d46206ce356ce242b2d3b7a29f27870d34"
});
function cdqReportEnginePublicationMetaV2754_(p){
 if(!/^[a-f0-9-]{36}$/i.test(String(p.reportId||''))||!/^[a-f0-9-]{36}$/i.test(String(p.jobId||''))||!Number.isSafeInteger(p.revision)||p.revision<1)throw Error('INVALID_PUBLICATION : identité de publication invalide.');
 var name=String(p.name||'');if(!/^.+\.pdf$/i.test(name)||name.length>200||/[\u0000-\u001f\u007f/\\]/.test(name))throw Error('INVALID_PUBLICATION : nom PDF invalide.');
 var m={operation:p.fileId?'save':'create',fileId:String(p.fileId||''),clientId:cdqDriveIdV2521_(p.clientId),destinationId:cdqDriveIdV2521_(p.destinationId),expectedRevision:String(p.expectedDriveRevision||''),family:String(p.family||''),name:name};
 if(p.kind==='list'){
  var destination=cdqWsFolderV2638_(m.destinationId),folderName=String(destination.meta.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(name!=='Liste de balance.pdf'||folderName!=='liste de balance'||!destination.path||destination.path.length!==3||destination.path[1].id!==m.clientId)throw Error('SCOPE_MISMATCH : destination liste non autorisée.');
  m.internalListV2751=true;
 }else{
 var family=String(p.family),canonical={cuve3:'cuve4',tremie3:'tremie4'}[family]||family,template=p.template||{};
 var expectedTemplateHash=Object.prototype.hasOwnProperty.call(CDQ_REPORT_ENGINE_TEMPLATE_SHA256_V2754_,canonical)?CDQ_REPORT_ENGINE_TEMPLATE_SHA256_V2754_[canonical]:'';
 var approvedTemplateHash=Object.prototype.hasOwnProperty.call(CDQ_REPORT_ENGINE_TEMPLATE_SHA256_V2760_,canonical)?CDQ_REPORT_ENGINE_TEMPLATE_SHA256_V2760_[canonical]:'';
 if(template.modeleId!==canonical)throw Error('TEMPLATE_UNAPPROVED : famille et modèle différents.');
  if(!expectedTemplateHash||(template.sha256!==expectedTemplateHash&&template.sha256!==approvedTemplateHash)||template.version!==2754)throw Error('TEMPLATE_UNAPPROVED : modèle non approuvé.');
 }
 return m;
}
function cdqReportEngineAuthorizeV2754_(p,actor){
 var m=cdqReportEnginePublicationMetaV2754_(p);cdqWsActorV2638_(actor.email);cdqUploadDestinationV2751_(m,true);
 return {ok:true,reportId:p.reportId,reportRevision:p.revision};
}
function cdqReportEngineCommitV2754_(p,actor){
 var m=cdqReportEnginePublicationMetaV2754_(p),size=Number(p.size),hash=String(p.sha256||'');
 if(!Number.isSafeInteger(size)||size<8||size>16*1024*1024||!/^[a-f0-9]{64}$/.test(hash)||typeof p.base64!=='string'||p.base64.length!==Math.ceil(size/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64))throw Error('INVALID_PUBLICATION : contenu PDF invalide.');
 var bytes=Utilities.base64Decode(p.base64);cdqUploadPdfV2751_(bytes,{size:size,sha256:hash});
 var lock=cdqReportEngineAcquireLockV2755_();
 try{
  cdqWsActorV2638_(actor.email);cdqReportEngineCallV2754_(actor,'authorizeCommit',{reportId:p.reportId,jobId:p.jobId,revision:p.revision,leaseToken:p.leaseToken,kind:p.kind||'report',clientId:m.clientId},{clientId:m.clientId});var before=cdqUploadDestinationV2751_(m,true),existing=before;
  if(!existing){
   var found=Drive.Files.list({q:"'"+cdq23Quote_(m.destinationId)+"' in parents and trashed=false and "+(p.kind==='list'?"name = 'Liste de balance.pdf'":"appProperties has { key='cdqEngineReportV2754' and value='"+cdq23Quote_(p.reportId)+"' }"),pageSize:2,fields:'nextPageToken,incompleteSearch,files('+CDQ_UPLOAD_FIELDS_V2751_+')',supportsAllDrives:true,includeItemsFromAllDrives:true});
   if(!found||!Array.isArray(found.files)||found.incompleteSearch||found.nextPageToken||found.files.length>1)throw Error('CONFLICT_PUBLICATION : résultat Drive ambigu.');
   existing=found.files[0]||null;
   if(p.kind==='list'&&existing&&(existing.mimeType!=='application/pdf'||!existing.parents||existing.parents.length!==1||existing.parents[0]!==m.destinationId||!existing.appProperties||existing.appProperties.cdqEngineReportV2754!==p.reportId||Number(existing.appProperties.cdqEngineRevisionV2754)!==p.revision))throw Error('CONFLICT_LIST_FILE : une ancienne copie active de la liste empêche sa création.');
  }
  var properties=existing&&existing.appProperties||{};
  if(existing&&properties.cdqEngineReportV2754===p.reportId&&Number(properties.cdqEngineRevisionV2754)===p.revision){
   if(properties.cdqEngineJobV2754!==p.jobId||properties.cdqEngineHashV2754!==hash||existing.name!==m.name||String(existing.size)!==String(size))throw Error('CONFLICT_PUBLICATION : reçu d’une autre publication.');
   // Only a lost Drive ACK takes this path. Retained appProperties do not
   // prove that another editor has preserved the actual PDF bytes.
   var receiptHash=cdqUploadHashV2751_(DriveApp.getFileById(existing.id).getBlob().getBytes()),receiptAfter=Drive.Files.get(existing.id,{fields:CDQ_UPLOAD_FIELDS_V2751_,supportsAllDrives:true});
   // Drive may return the same property map in a different JSON key order
   // between Files.list and Files.get. Compare every key/value, not that order.
   if(receiptHash!==hash||receiptAfter.trashed||receiptAfter.modifiedTime!==existing.modifiedTime||receiptAfter.name!==existing.name||String(receiptAfter.size)!==String(existing.size)||JSON.stringify(receiptAfter.parents)!==JSON.stringify(existing.parents)||!cdqReportEngineSameAppPropertiesV2754_(receiptAfter.appProperties,existing.appProperties))throw Error('CONFLICT_PUBLICATION_CONTENT : le PDF publié a changé avant son reçu.');
   return {ok:true,id:existing.id,fileId:existing.id,driveRevision:existing.modifiedTime,reportId:p.reportId,reportRevision:p.revision,sha256:hash,size:size};
  }
  if(existing){
   if(properties.cdqEngineReportV2754&&properties.cdqEngineReportV2754!==p.reportId)throw Error('CONFLICT_REPORT_SCOPE : le PDF appartient à un autre rapport.');
   if(Number(properties.cdqEngineRevisionV2754||0)>=p.revision)throw Error('CONFLICT_REVISION : une révision plus récente est publiée.');
   if(String(existing.modifiedTime)!==m.expectedRevision)throw Error('CONFLICT_DRIVE_REVISION : le PDF Drive a été modifié.');
  }
  var metadata={name:m.name,mimeType:'application/pdf',appProperties:Object.assign({},properties,{cdqEngineReportV2754:p.reportId,cdqEngineRevisionV2754:String(p.revision),cdqEngineJobV2754:p.jobId,cdqEngineHashV2754:hash,cdqEngineActorV2754:empreinteCDQ_(actor.email),cdqEngineCreatorV2754:properties.cdqEngineCreatorV2754||empreinteCDQ_(actor.email)})},blob=Utilities.newBlob(bytes,'application/pdf',m.name),result;
  if(existing)result=Drive.Files.update(metadata,existing.id,blob,{fields:'id,name,modifiedTime',supportsAllDrives:true});
  else{metadata.parents=[m.destinationId];result=Drive.Files.create(metadata,blob,{fields:'id,name,modifiedTime',supportsAllDrives:true});}
  if(!result||!result.id||!result.modifiedTime)throw Error('DRIVE_UNCONFIRMED : reçu Drive manquant.');
  invaliderCacheContenuClient_(m.clientId);
  return {ok:true,id:result.id,fileId:result.id,driveRevision:result.modifiedTime,reportId:p.reportId,reportRevision:p.revision,sha256:hash,size:size};
 }finally{lock.releaseLock();}
}
function cdqReportEngineTrashV2754_(p,actor){
 var m=cdqReportEnginePublicationMetaV2754_(p),lock=cdqReportEngineAcquireLockV2755_();
 try{
  cdqWsActorV2638_(actor.email);cdqReportEngineCallV2754_(actor,'authorizeCommit',{kind:'delete',reportId:p.reportId,jobId:p.jobId,revision:p.revision,leaseToken:p.leaseToken,clientId:m.clientId},{clientId:m.clientId});
  var scope=cdqWsFolderV2638_(m.destinationId);if(!scope.path||scope.path.length<2||scope.path[1].id!==m.clientId)throw Error('SCOPE_MISMATCH : dossier du rapport non autorisé.');cdqUploadFolderWriteV2751_(scope);
  var existing=null;
  if(m.fileId)existing=Drive.Files.get(m.fileId,{fields:CDQ_UPLOAD_FIELDS_V2751_.replace('capabilities(canEdit)','capabilities(canEdit,canTrash)'),supportsAllDrives:true});
  else{
   var found=Drive.Files.list({q:"'"+cdq23Quote_(m.destinationId)+"' in parents and appProperties has { key='cdqEngineReportV2754' and value='"+cdq23Quote_(p.reportId)+"' }",pageSize:2,fields:'nextPageToken,incompleteSearch,files('+CDQ_UPLOAD_FIELDS_V2751_.replace('capabilities(canEdit)','capabilities(canEdit,canTrash)')+')',supportsAllDrives:true,includeItemsFromAllDrives:true});
   if(!found||!Array.isArray(found.files)||found.incompleteSearch||found.nextPageToken||found.files.length>1)throw Error('CONFLICT_DELETE : résultat Drive ambigu.');existing=found.files[0]||null;
  }
  if(!existing)return {ok:true,deleted:true,reportId:p.reportId};
  var properties=existing.appProperties||{};
  if(existing.mimeType!=='application/pdf'||!existing.parents||existing.parents.length!==1||existing.parents[0]!==m.destinationId||properties.cdqEngineReportV2754&&properties.cdqEngineReportV2754!==p.reportId||!properties.cdqEngineReportV2754&&!(m.fileId===existing.id&&existing.capabilities&&existing.capabilities.canTrash&&existing.modifiedTime===m.expectedRevision))throw Error('SCOPE_MISMATCH : identité du PDF à supprimer non confirmée.');
  if(!existing.trashed){
   if(!(existing.capabilities&&existing.capabilities.canTrash)&&properties.cdqEngineCreatorV2754!==empreinteCDQ_(actor.email))throw Error('DELETE_NOT_AUTHORIZED : suppression du PDF non autorisée.');
   if(String(existing.modifiedTime)!==m.expectedRevision&&!(properties.cdqEngineRevisionV2754&&Number(properties.cdqEngineRevisionV2754)<=p.revision))throw Error('CONFLICT_DRIVE_REVISION : le PDF a changé avant sa suppression.');
   var result=Drive.Files.update({trashed:true},existing.id,null,{fields:'id,trashed',supportsAllDrives:true});if(!result||result.trashed!==true)throw Error('DELETE_UNCONFIRMED : suppression Drive non confirmée.');
  }
  invaliderCacheContenuClient_(m.clientId);return {ok:true,deleted:true,reportId:p.reportId,fileId:existing.id};
 }finally{lock.releaseLock();}
}

// Editor-only readiness check. The private suffix excludes google.script.run;
// both Google principals must be the original owner before properties are read.
function cdqReportEngineDiagnosticV2754_(){
 var owner='jp.rodrigue86@gmail.com',active=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase(),effective=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
 if(active!==owner||effective!==owner)throw Error('DIAGNOSTIC_NOT_AUTHORIZED : diagnostic réservé au propriétaire Google original.');
 var config=cdqReportEngineConfigV2754_(),result=cdqReportEngineCallV2754_({email:owner},'capabilities',{},{});
 if(!result||result.ok!==true||result.ready!==true||result.engine!==2754||result.schema!==1||result.durableData!==true||result.transactionalIndex!==true||result.serverPdf!==true||result.version!=='27.54')throw Error('ENGINE_HEALTH : les capacités du moteur ne sont pas confirmées.');
 // Copy only the validated public capabilities. Never log the raw bridge
 // result, private configuration, authentication values or a secret digest.
 var capabilities={ok:result.ok,ready:result.ready,engine:result.engine,schema:result.schema,durableData:result.durableData,transactionalIndex:result.transactionalIndex,serverPdf:result.serverPdf,version:result.version};
 var output={capabilities:capabilities,engineUrl:config.url,secretConfigured:true};
 Logger.log(JSON.stringify(output));return output;
}


// Scope and display name are supplied by Google, never trusted from the client.
function cdqFileEditLeaseV2756_(actor,action,p){
 var fileId=cdqDriveIdV2521_(p.fileId),clientId=cdqDriveIdV2521_(p.clientId),file=cdqDriveScopeV2521_(fileId,{},[CONFIG.MASTER_FOLDER_ID]);
 if(!file.path||file.path.length<3||file.path[1].id!==clientId||file.meta.trashed||['application/pdf','application/vnd.google-apps.spreadsheet'].indexOf(file.meta.mimeType)<0)throw Error('SCOPE_MISMATCH : fichier du client requis.');
 var current=Drive.Files.get(fileId,{fields:'id,trashed,mimeType,capabilities(canEdit)',supportsAllDrives:true});
 if(current.trashed||!current.capabilities||!current.capabilities.canEdit)throw Error('EDIT_NOT_AUTHORIZED : modification Drive non autorisée.');
 var profile=cdqLireProfilsTechniciens_()[normaliserEmailCDQ_(actor.email)]||{},scope={clientId:clientId,fileId:fileId,displayName:String(profile.nomRapport||actor.nom||actor.email).slice(0,160)};
 // Shared editing still verifies the actor, client scope and Drive canEdit.
 // The worker answers the historical protocol without reserving this file.
 return cdqReportEngineCallV2754_(actor,action,{clientId:clientId,fileId:fileId,sessionId:String(p.sessionId||'')},scope);
}
function cdqAssertFileEditorV2756_(actor,m){
 if(m.operation==='save'&&m.fileId)cdqReportEngineCallV2754_(actor,'editAssert',{clientId:m.clientId},{clientId:m.clientId,fileId:m.fileId});
}
