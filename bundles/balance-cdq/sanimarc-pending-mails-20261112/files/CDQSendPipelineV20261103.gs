/* CDQ send protocol 20261103. New jobs only; legacy queues are never migrated.
 * Canonical source editions, immutable Drive artifacts, private portal staging,
 * atomic portal activation, then one guarded Gmail action. */
var CDQ_SP_VERSION_ = 20261103;
var CDQ_SP_JOB_ = 'CDQ_SP_JOB_20261103:';
var CDQ_SP_ACTIVE_ = 'CDQ_SP_ACTIVE_20261103:';
var CDQ_SP_HEALTH_ = 'CDQ_SP_HEALTH_20261103';
var CDQ_SP_FIELDS_ = 'id,name,mimeType,size,modifiedTime,md5Checksum,parents,trashed,appProperties';
function cdqSpError_(code,message){return new Error(code+' : '+message);}
function cdqSpAssert_(value,code,message){if(!value)throw cdqSpError_(code,message||'Contrôle non confirmé.');}
function cdqSpHash_(value){return cdqUploadHashV2751_(typeof value==='string'?Utilities.newBlob(value).getBytes():value);}
function cdqSpJson_(value){return JSON.stringify(value);}
function cdqSpProps_(){return PropertiesService.getScriptProperties();}
function cdqSpGet_(key){var raw=cdqSpProps_().getProperty(key);if(!raw)return null;try{return JSON.parse(raw);}catch(_){throw cdqSpError_('INVALID_SEND_CHECKPOINT','État de reprise illisible.');}}
function cdqSpPut_(key,value){var text=cdqSpJson_(value);cdqSpAssert_(Utilities.newBlob(text).getBytes().length<7800,'SEND_QUEUE_CAPACITY','La file doit être vérifiée avant un nouveau lot.');cdqSpProps_().setProperty(key,text);}
function cdqSpLock_(fn){var lock=LockService.getScriptLock();lock.waitLock(10000);try{return fn();}finally{lock.releaseLock();}}
function cdqSpSign_(value){return cdqReportEngineHexV2754_(Utilities.computeHmacSha256Signature(cdqSpJson_(value),cdqReportEngineConfigV2754_().secret,Utilities.Charset.UTF_8));}
function cdqSpEqual_(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;var d=0;for(var i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function cdqSpActor_(){return verifierDroit_('envoi');}
function cdqSpEmail_(value){return cdqEmailV2553_(value);}
function cdqSpId_(id){cdqSpAssert_(/^[A-Za-z0-9_-]{10,200}$/.test(String(id||'')),'INVALID_SEND_SOURCE','Identifiant de document invalide.');return String(id);}
function cdqSpIds_(ids){cdqSpAssert_(Array.isArray(ids),'INVALID_SEND_SELECTION','Sélection invalide.');var used={};return ids.map(cdqSpId_).filter(function(id){if(used[id])return false;used[id]=true;return true;}).sort();}
function cdqSpScope_(id,clientId,cache){var scope=cdqDriveScopeV2521_(id,cache||{},[CONFIG.MASTER_FOLDER_ID]);cdqSpAssert_(scope&&scope.meta&&!scope.meta.trashed&&scope.path&&scope.path.length>=2&&scope.path[1].id===clientId,'SCOPE_MISMATCH','Document déplacé hors du client.');return scope;}
function cdqSpMeta_(id){return Drive.Files.get(id,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});}
function cdqSpList_(folderId){var out=[],next;do{var p={q:"'"+cdqSpId_(folderId)+"' in parents and trashed=false",fields:'nextPageToken,files('+CDQ_SP_FIELDS_+')',pageSize:1000,supportsAllDrives:true,includeItemsFromAllDrives:true};if(next)p.pageToken=next;var page=Drive.Files.list(p);out=out.concat(page.files||[]);next=page.nextPageToken;}while(next);return out;}
function cdqSpEngine_(actor,action,payload,clientId){var access=cdqClientPortalScopeV20261028_(clientId);cdqSpAssert_(normaliserEmailCDQ_(access.actor.email)===normaliserEmailCDQ_(actor.email),'SCOPE_MISMATCH','Compte différent.');return cdqReportEngineCallV2754_(actor,action,payload,access.scope);}
function cdqSpPortalLink_(actor,clientId,clientName){
 var result=cdqSpEngine_(actor,'portalBatchLinkV2835',{clientId:clientId,clientName:String(clientName||'')},clientId);
 cdqSpAssert_(result&&result.ok===true&&result.clientId===clientId&&/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(result.token||''),'PORTAL_LINK_UNAVAILABLE','Le lien client n’est pas confirmé.');
 return {ok:true,clientId:clientId,url:String(cdqReportEngineConfigV2754_().url||'').replace(/\/+$/,'')+'/client/#'+result.token};
}
function cdqSpCapabilities_(actor,clientId,actions){
 var health=cdqSpGet_(CDQ_SP_HEALTH_);
 cdqSpAssert_(health&&health.version===CDQ_SP_VERSION_&&health.executor==='isolated-send-queue'&&Date.now()-Number(health.startedAt)>=0&&Date.now()-Number(health.startedAt)<300000&&health.state!=='failed','CDQ_SEND_EXECUTOR_UNAVAILABLE','Le traitement autonome des nouveaux envois n’est pas confirmé.');
 if(actions!==undefined&&!cdqSpActionsV2866_({actionsV2866:actions}).publish)return {protocol:CDQ_SP_VERSION_,portalBatchProtocol:0,actionsProtocol:2866};
 var result=cdqSpEngine_(actor,'portalBatchCapabilitiesV2835',{clientId:clientId,...(actions!==undefined?{visitProtocol:2866}:{})},clientId);
 cdqSpAssert_(result&&result.ok===true&&result.portalBatchProtocol===2835,'SEND_PROTOCOL_UNAVAILABLE','La publication complète du lot n’est pas disponible.');
 return {protocol:CDQ_SP_VERSION_,portalBatchProtocol:2835,...(actions!==undefined?{actionsProtocol:2866,visitProtocol:result.visitProtocol}:{})};
}
function cdqSpCollect_(files,folders,clientId){
 var cache={},byId={},seenFolders={},pending=cdqSpIds_(folders),direct=cdqSpIds_(files);
 // Reuse the same fresh full metadata for both path authorization and the send plan.
 direct.forEach(function(id){var meta=cdqSpMeta_(id);cache[id]=meta;cdqSpScope_(id,clientId,cache);byId[id]=meta;});
 while(pending.length){var folder=pending.shift();if(seenFolders[folder])continue;seenFolders[folder]=true;cdqSpScope_(folder,clientId,cache);var folderMeta=cdqSpMeta_(folder);cdqSpAssert_(folderMeta.mimeType==='application/vnd.google-apps.folder','SCOPE_MISMATCH','Un dossier sélectionné a changé.');
  cdqSpList_(folder).forEach(function(meta){cache[meta.id]=meta;if(meta.mimeType==='application/vnd.google-apps.folder')pending.push(meta.id);else byId[meta.id]=meta;});
  cdqSpAssert_(Object.keys(byId).length<=1000&&Object.keys(seenFolders).length<=1000,'INVALID_SEND_SELECTION','La sélection dépasse la capacité de 1000 documents.');
 }
 var ids=Object.keys(byId).sort();cdqSpAssert_(ids.length>0&&ids.length<=1000,'INVALID_SEND_SELECTION','Sélection vide ou trop volumineuse.');
 var sources=ids.map(function(id){var m=byId[id];cdqSpScope_(id,clientId,cache);cdqSpAssert_(!m.trashed&&m.modifiedTime&&m.name,'INVALID_SEND_SOURCE','Source indisponible.');var kind=m.mimeType==='application/vnd.google-apps.spreadsheet'?'sheet':m.mimeType==='application/pdf'||/\.pdf$/i.test(m.name)?'pdf':/\.xlsx?$/i.test(m.name)?'excel':'';cdqSpAssert_(kind,'INVALID_SEND_SOURCE','Un document ne peut pas être converti en PDF.');return {fileId:id,kind:kind,name:m.name,mimeType:m.mimeType,driveRevision:m.modifiedTime,sourceSize:Number(m.size)||0,sourceMd5:m.md5Checksum||'',engineReportId:(m.appProperties||{}).cdqEngineReportV2754||'',engineRevision:Number((m.appProperties||{}).cdqEngineRevisionV2754)||0,engineHash:(m.appProperties||{}).cdqEngineHashV2754||'',destinationId:(m.parents||[])[0]||''};});
 return {sources:sources,scopeFolders:Object.keys(seenFolders).sort()};
}
function cdqSpIsListSource_(source){return source.managedKind==='list'||[source.name,source.outputName,source.conversionName].some(function(name){return /^liste (?:de|des) balances?$/i.test(String(name||'').normalize('NFC').trim().replace(/\.pdf$/i,'').replace(/\s+/g,' ').trim());});}
function cdqSpBindEngine_(sources,state,clientId){
 cdqSpAssert_(state&&state.ok===true&&Array.isArray(state.targets),'INVALID_SEND_ENGINE_STATE','État des rapports non confirmé.');
 var byFile={};state.targets.forEach(function(t){var id=t.pdf&&t.pdf.fileId;if(id){cdqSpAssert_(!byFile[id],'INVALID_SEND_ENGINE_STATE','Identité de rapport ambiguë.');byFile[id]=t;}});
 return sources.map(function(s){var target=byFile[s.fileId];if(s.engineReportId||target){
  cdqSpAssert_(target&&target.clientId===clientId&&target.destinationId===s.destinationId&&!target.deleted&&!target.drivePending&&target.pdf&&target.pdf.status==='confirmed'&&target.pdf.revision===target.revision&&target.pdf.driveRevision===s.driveRevision&&(!s.engineReportId||target.reportId===s.engineReportId)&&(!s.engineRevision||target.revision===s.engineRevision),'PDF_PENDING','Les dernières réponses ne sont pas toutes confirmées dans Drive.');
  cdqSpAssert_(/^[a-f0-9]{64}$/i.test(target.pdf.sha256||'')&&Number.isSafeInteger(target.pdf.size)&&target.pdf.size>0,'INVALID_SEND_ENGINE_STATE','Empreinte de l’édition absente.');
  s.reportId=target.reportId;s.reportRevision=target.revision;s.sourceSha256=target.pdf.sha256;s.sourceSize=target.pdf.size;s.managedKind=target.kind||'report';
 }else cdqSpAssert_(!cdqSpIsListSource_(s),'LIST_STATE_UNCONFIRMED','La liste doit être confirmée par le moteur avant l’envoi.');return s;});
}
function cdqSpPlan_(files,folders,email,clientId,actor,actions){
 var capabilities=cdqSpCapabilities_(actor,clientId,actions),collected=cdqSpCollect_(files,folders,clientId),sources=collected.sources;
 var state=cdqReportEngineCallV2754_(actor,'archiveState',{clientId:clientId},{clientId:clientId});sources=cdqSpBindEngine_(sources,state,clientId);
 var used={};sources.forEach(function(s){s.conversionName=s.kind==='pdf'?s.name:s.name.replace(/\.xlsx?$/i,'')+'.pdf';s.outputName=cdqSendPdfNameV2823_(s.conversionName,used);s.sourceKey=cdqSpHash_(cdqSpJson_([s.fileId,s.driveRevision,s.name,s.mimeType,s.reportId||'',s.reportRevision||0,s.sourceSha256||'']));});
 var plan={protocol:CDQ_SP_VERSION_,actor:normaliserEmailCDQ_(actor.email),clientId:clientId,email:cdqSpRecipientV2866_(email,actions===undefined?{}:{actionsV2866:actions}),files:cdqSpIds_(files),folders:cdqSpIds_(folders),scopeFolders:collected.scopeFolders,sources:sources,createdAt:Date.now()};
 if(actions!==undefined)plan.actionsV2866=cdqSpActionsV2866_({actionsV2866:actions});
 return {capabilities:capabilities,plan:plan,signature:cdqSpSignPlanV20261104_(plan)};
}
function cdqSpSelectionKey_(files,folders,email,clientId,actor,actions){var record=actions===undefined?{}:{actionsV2866:actions},key=[normaliserEmailCDQ_(actor.email),clientId,cdqSpRecipientV2866_(email,record),cdqSpIds_(files),cdqSpIds_(folders)];if(actions!==undefined)key.push(cdqSpActionsV2866_(record));return 'CDQ_SP_SELECTION_20261103:'+cdqSpHash_(cdqSpJson_(key));}
function cdqSpLegacyUncertain_(clientId,email){
 // Old folder ZIP entries may contain paths, so their final send key can differ
 // from this protocol's flat names. Preserve their known ambiguous mail barrier.
 var all=cdqSpProps_().getProperties(),recipient=cdqSpEmail_(email),deliveries={};
 function parse(key){try{return JSON.parse(all[key]||'null');}catch(_){return null;}}
 Object.keys(all).forEach(function(key){if(key.indexOf(CDQ_DELIVERY_PREFIX_V2825_)!==0)return;var delivery=parse(key);if(!delivery)return;deliveries[delivery.id||key.slice(CDQ_DELIVERY_PREFIX_V2825_.length)]=delivery;if(delivery.clientId!==clientId||normaliserEmailCDQ_(delivery.email)!==recipient)return;var receipt=delivery.sendKey&&parse(delivery.sendKey);var oldJob=parse(CDQ_SEND_QUEUE_V2826_+(delivery.id||key.slice(CDQ_DELIVERY_PREFIX_V2825_.length)));if(oldJob&&typeof cdqSendReviewClosedV20261112_==='function'&&cdqSendReviewClosedV20261112_(oldJob,delivery,receipt))return;cdqSpAssert_(!receipt||receipt.phase!=='sending','CDQ_ENVOI_A_VERIFIER','Un ancien envoi au même client et destinataire reste incertain. Aucun renvoi automatique.');});
 Object.keys(all).forEach(function(key){if(key.indexOf(CDQ_SEND_QUEUE_V2826_)!==0)return;var old=parse(key);if(!old||old.clientId!==clientId||!old.mailAttempted)return;var delivery=deliveries[old.id],receipt=delivery&&delivery.sendKey&&parse(delivery.sendKey);if(receipt&&receipt.phase==='sent'&&receipt.jobId===old.id)return;if(typeof cdqSendReviewClosedV20261112_==='function'&&cdqSendReviewClosedV20261112_(old,delivery,receipt))return;var oldEmail=delivery&&delivery.email;if(!oldEmail&&old.requestId){try{cdqSpScope_(old.requestId,clientId,{});var text=DriveApp.getFileById(old.requestId).getBlob().getDataAsString();if(text.length<=250000)oldEmail=JSON.parse(text).email;}catch(_){}}
  cdqSpAssert_(oldEmail&&normaliserEmailCDQ_(oldEmail)!==recipient,'CDQ_ENVOI_A_VERIFIER','Un ancien courriel du client n’a pas de reçu confirmé. Vérifiez son résultat avant un nouvel envoi.');
 });
}
// 2026-11-04: reuse the already verified Drive metadata instead of doing
// a second DriveApp.getFileById + scope walk for every selected Google Sheet.
// The same v28.33 receipt key and all ambiguous-mail barriers are retained.
function cdqSpPreviousSheetsVerifiedV20261104_(sources,email,clientId){
 if(!Array.isArray(sources)||!sources.length||sources.length>250)return {doublon:false};
 var identities=[];
 for(var i=0;i<sources.length;i++){
  var source=sources[i];
  if(source.kind!=='sheet')return {doublon:false};
  var updated=Date.parse(String(source.driveRevision||''));
  cdqSpAssert_(source.fileId&&typeof source.name==='string'&&Number.isSafeInteger(updated)&&updated>0,'INVALID_SEND_SOURCE','Révision Google Sheets non confirmée.');
  var pdfName=source.name.replace(/\.xlsx?$/i,'')+'.pdf';
  identities.push(source.fileId+':modified:'+updated+':'+pdfName);
 }
 var canonical=cdqSpJson_([String(clientId),String(email||'').trim().toLowerCase(),identities.sort()]);
 var key='CDQ_SEND_ZIP_V2823_'+cdqSpHash_(canonical);
 var stored=cdqSpProps_().getProperty(key),previous=null;
 try{previous=JSON.parse(stored||'null');}catch(_){}
 if(!previous)return {doublon:false};
 var age=Date.now()-Number(previous.at||0);
 if(previous.phase==='sending'&&!(typeof cdqSendReviewAllowsSendKeyV20261112_==='function'&&cdqSendReviewAllowsSendKeyV20261112_(key)))return {incertain:true};
 if(previous.phase==='sent'&&age>=0&&age<86400000)return {doublon:true,timestamp:Number(previous.at)||0};
 return {doublon:false};
}
// Faithful v28.33 legacy duplicate check; source identities come from
// cdqSpPlan_'s freshly permission-checked Drive.Files metadata.
function cdqSpLegacyVerifiedV20261104_(files,folders,email,clientId,hours,actor,sources){
 if(!Array.isArray(folders)||!folders.length){
  var recent=cdqSendRecentQueueV2832_(files,email,clientId,actor,hours);
  if(recent.incertain)throw Error('CDQ_ENVOI_A_VERIFIER : envoi identique incertain. Vérifiez les courriels envoyés; aucun renvoi automatique.');
  if(recent.doublon)return recent;
  var oldSheets=cdqSpPreviousSheetsVerifiedV20261104_(sources,email,clientId);
  if(oldSheets.incertain)throw Error('CDQ_ENVOI_A_VERIFIER : ancien envoi ZIP incertain. Vérifiez les courriels avant toute nouvelle préparation.');
  if(oldSheets.doublon)return oldSheets;
 }
 if(typeof verifierEnvoiSelectionRecent==='function'){
  try{var legacy=verifierEnvoiSelectionRecent(files,folders,'convertir',email,clientId,hours);if(legacy&&legacy.doublon)return legacy;}catch(_){}
 }
 var key=cdqRecentKeyV2553_(files,folders,'convertir',email,clientId);
 var timestamp=Number(PropertiesService.getUserProperties().getProperty(key)||0);
 var age=Math.max(1,Number(hours)||24)*3600000;
 return timestamp&&Date.now()-timestamp<age?{doublon:true,timestamp:timestamp}:{doublon:false,timestamp:0};
}
function cdqSpPreflight_(files,folders,email,clientId,hours,actions){
 var selected=cdqSpActionsV2866_(actions===undefined?{}:{actionsV2866:actions});
 var actor=cdqSpActor_();cdqClientPortalScopeV20261028_(clientId);
 if(selected.email)cdqSpLegacyUncertain_(clientId,email);
 // First collect one fresh, permission-checked source plan; reuse it for
 // legacy Sheets deduplication instead of re-reading each Sheet from Drive.
 var ticket=cdqSpPlan_(files,folders,email,clientId,actor,actions);
 var previous=selected.email?cdqSpLegacyVerifiedV20261104_(files,folders,email,clientId,hours,actor,ticket.plan.sources):{doublon:false};
 cdqSpAssert_(!previous.incertain,'CDQ_ENVOI_A_VERIFIER','Un résultat d’envoi doit être vérifié.');
 var recent=cdqSpGet_(cdqSpSelectionKey_(files,folders,email,clientId,actor,actions)),recentJob=recent&&cdqSpGet_(CDQ_SP_JOB_+recent.id);
 if(recentJob){cdqSpAssert_(!recentJob.mailAttempted||recentJob.mailSent||(typeof cdqSendReviewClosedV20261112_==='function'&&cdqSendReviewClosedV20261112_(recentJob,null,recentJob.sendKey?cdqSpGet_(recentJob.sendKey):null)),'CDQ_ENVOI_A_VERIFIER','Un résultat de courriel doit être vérifié.');cdqSpAssert_(recentJob.phase==='complete'||recentJob.blocked,'CDQ_ENVOI_EN_COURS','Cette sélection possède déjà un lot actif.');if(recentJob.mailSent&&Date.now()-recentJob.mailConfirmedAt<86400000)previous={doublon:true,timestamp:recentJob.mailConfirmedAt};}
 return {doublon:!!previous.doublon,timestamp:previous.timestamp||0,sendV20261103:ticket};
}
// Stable signature of the ephemeral send preflight ticket only. The global
// signature for archived receipts and immutable artifacts is NOT modified.
// google.script.run can rehydrate object keys in a different insertion order.
function cdqSpCanonicalPlanV20261104_(value){
 if(Array.isArray(value))return value.map(cdqSpCanonicalPlanV20261104_);
 if(value!==null&&typeof value==='object'){
  var sorted=Object.create(null);
  Object.keys(value).sort().forEach(function(key){
   if(typeof value[key]!=='undefined')sorted[key]=cdqSpCanonicalPlanV20261104_(value[key]);
  });
  return sorted;
 }
 return value;
}
function cdqSpSignPlanV20261104_(plan){
 return cdqSpSign_(cdqSpCanonicalPlanV20261104_(plan));
}
function cdqSpValidateTicket_(ticket,actor,files,folders,email,clientId){
 var plan=ticket&&ticket.plan;cdqSpAssert_(plan&&plan.protocol===CDQ_SP_VERSION_&&Array.isArray(plan.sources)&&plan.sources.length>0&&plan.sources.length<=1000&&cdqSpEqual_(ticket.signature,cdqSpSignPlanV20261104_(plan)),'INVALID_SEND_PLAN','La sélection ne correspond plus à sa vérification.');
 cdqSpAssert_(plan.actor===normaliserEmailCDQ_(actor.email)&&plan.clientId===clientId&&plan.email===cdqSpRecipientV2866_(email,plan)&&cdqSpJson_(plan.files)===cdqSpJson_(cdqSpIds_(files))&&cdqSpJson_(plan.folders)===cdqSpJson_(cdqSpIds_(folders)),'SCOPE_MISMATCH','La sélection, le compte ou le destinataire a changé.');
 cdqSpAssert_(Date.now()-plan.createdAt>=0&&Date.now()-plan.createdAt<300000,'SEND_PLAN_EXPIRED','Actualisez la sélection avant de démarrer.');if(Object.prototype.hasOwnProperty.call(plan,'actionsV2866')){if(cdqSpActionsV2866_(plan).publish)cdqSpVisitChoiceV2866_(plan.visitV2866);else cdqSpAssert_(!Object.prototype.hasOwnProperty.call(plan,'visitV2866'),'INVALID_VISIT_CHOICE','Un courriel seul ne modifie aucune visite.');}return plan;
}
function cdqSpActiveKey_(id){return CDQ_SP_ACTIVE_+id.slice(0,1);}
function cdqSpActive_(job,remove){var key=cdqSpActiveKey_(job.id),index=cdqSpGet_(key)||{};if(remove)delete index[job.id];else index[job.id]={at:job.at,nextAt:job.nextAt||0,blocked:!!job.blocked};cdqSpPut_(key,index);}
function cdqSpSave_(job){cdqSpPut_(CDQ_SP_JOB_+job.id,job);}
function cdqSpGeneratedIds_(count){var ids=[];while(ids.length<count){var page=Drive.Files.generateIds({count:Math.min(1000,count-ids.length),space:'drive',type:'files'});cdqSpAssert_(page&&Array.isArray(page.ids)&&page.ids.length,'DRIVE_IDS_UNAVAILABLE','Identifiants Drive non confirmés.');ids=ids.concat(page.ids);}return ids;}
function cdqSpProof_(job,entry,name,hash,size,state,sourceHash){return cdqSpSign_([CDQ_SP_VERSION_,job.id,job.clientId,job.actor,entry.sourceKey||'',entry.fileId||'',entry.driveRevision||'',name,hash,size,state,sourceHash||'']);}
function cdqSpArtifactProps_(job,entry,name,hash,size,state,sourceHash){sourceHash=sourceHash||entry.sourceSha256||'';return {cdqSp:String(CDQ_SP_VERSION_),cdqSj:job.id,cdqSk:entry.sourceKey||'',cdqSi:entry.fileId?cdqSpHash_(entry.fileId):'',cdqSr:entry.driveRevision?cdqSpHash_(entry.driveRevision):'',cdqSh:hash,cdqSz:String(size),cdqSt:state,cdqSo:sourceHash,cdqSig:cdqSpProof_(job,entry,name,hash,size,state,sourceHash)};}

function cdqSpStorageParentV2866_(job,state){
 if(!job.technicalFolderId)return job.folderId;
 cdqSpAssert_(['archived','staged','zip','manifest'].indexOf(state)>=0,'INVALID_SEND_ARTIFACT','Type de copie inconnu.');
 return state==='zip'||state==='manifest'?job.technicalFolderId:job.folderId;
}
function cdqSpTechnicalScopeV2866_(job){
 var meta=cdqSpMeta_(cdqSpId_(job.technicalFolderId)),props=meta.appProperties||{};
 cdqSpAssert_(!meta.trashed&&meta.mimeType==='application/vnd.google-apps.folder'&&meta.parents&&meta.parents.length===1&&meta.parents[0]===CDQ_WS_SYSTEM_V2638_&&props.cdqSj===job.id&&props.cdqClient===job.clientId,'CONFLICT_SEND_TECHNICAL_FOLDER','Le dossier technique du lot a changé.');
 return meta;
}
function cdqSpEnsureTechnicalV2866_(job){
 if(!job.technicalFolderId)return;
 try{Drive.Files.create({id:job.technicalFolderId,name:'Envoi technique '+job.id,mimeType:'application/vnd.google-apps.folder',parents:[CDQ_WS_SYSTEM_V2638_],appProperties:{cdqSp:String(CDQ_SP_VERSION_),cdqSj:job.id,cdqClient:job.clientId}},null,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});}
 catch(error){try{cdqSpTechnicalScopeV2866_(job);}catch(_){throw error;}}
 cdqSpTechnicalScopeV2866_(job);
}
function cdqSpCheckRequestLocationV2866_(job){
 cdqSpScope_(job.folderId,job.clientId,{});
 if(!job.technicalFolderId){cdqSpScope_(job.requestId,job.clientId,{});return;}
 cdqSpTechnicalScopeV2866_(job);
 cdqSpCheckArtifact_(job,{},cdqSpMeta_(job.requestId),'selection.json');
}

function cdqSpCheckArtifact_(job,entry,meta,expectedName){
 var p=meta&&meta.appProperties||{},size=Number(meta&&meta.size);
 cdqSpAssert_(meta&&!meta.trashed&&meta.name===expectedName&&Array.isArray(meta.parents)&&meta.parents.indexOf(cdqSpStorageParentV2866_(job,p.cdqSt))>=0&&p.cdqSp===String(CDQ_SP_VERSION_)&&p.cdqSj===job.id&&p.cdqSk===(entry.sourceKey||'')&&p.cdqSi===(entry.fileId?cdqSpHash_(entry.fileId):'')&&p.cdqSr===(entry.driveRevision?cdqSpHash_(entry.driveRevision):'')&&(!entry.sourceSha256||p.cdqSo===entry.sourceSha256)&&/^[a-f0-9]{64}$/.test(p.cdqSh||'')&&size===Number(p.cdqSz)&&['archived','staged','zip','manifest'].indexOf(p.cdqSt)>=0&&cdqSpEqual_(p.cdqSig,cdqSpProof_(job,entry,expectedName,p.cdqSh,size,p.cdqSt,p.cdqSo)),'CONFLICT_SEND_ARTIFACT','Une copie du lot a été déplacée ou modifiée.');
 return {fileId:meta.id,name:expectedName,sha256:p.cdqSh,size:size,state:p.cdqSt,sourceSha256:p.cdqSo||'',meta:meta};
}
function cdqSpBlob_(artifact){var blob=DriveApp.getFileById(artifact.fileId).getBlob(),bytes=blob.getBytes();cdqSpAssert_(bytes.length===artifact.size&&cdqSpHash_(bytes)===artifact.sha256,'CONFLICT_SEND_ARTIFACT','Les octets archivés ont changé.');return blob.setName(artifact.name);}
function cdqSpCreate_(job,entry,id,name,blob,state,sourceHash){if(job.technicalFolderId){cdqSpTechnicalScopeV2866_(job);cdqSpAssert_((state==='manifest'&&blob.getContentType()==='application/json')||(state==='zip'&&blob.getContentType()==='application/zip')||(['archived','staged'].indexOf(state)>=0&&blob.getContentType()==='application/pdf'),'INVALID_SEND_ARTIFACT','Le type de fichier ne correspond pas à sa destination.');}var bytes=blob.getBytes(),hash=cdqSpHash_(bytes),props=cdqSpArtifactProps_(job,entry,name,hash,bytes.length,state,sourceHash),metadata={id:id,name:name,mimeType:blob.getContentType(),parents:[cdqSpStorageParentV2866_(job,state)],appProperties:props};
 var result;try{result=Drive.Files.create(metadata,blob,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});}catch(error){try{result=cdqSpMeta_(id);}catch(_){throw error;}}
 var artifact=cdqSpCheckArtifact_(job,entry,result,name);cdqSpAssert_(artifact.sha256===hash&&artifact.size===bytes.length,'CONFLICT_SEND_ARTIFACT','Identifiant déjà utilisé pour une autre édition.');return artifact;
}
function cdqSpIndex_(job,request){var all=cdqSpList_(job.folderId);if(job.technicalFolderId){cdqSpTechnicalScopeV2866_(job);all=all.concat(cdqSpList_(job.technicalFolderId));}var byId={},artifacts={};all.forEach(function(m){byId[m.id]=m;});request.sources.forEach(function(s){if(byId[s.artifactId])artifacts[s.fileId]=cdqSpCheckArtifact_(job,s,byId[s.artifactId],s.outputName);});return {byId:byId,artifacts:artifacts};}
function cdqSpEnsureFolder_(job){
 var client=DriveApp.getFolderById(job.clientId);cdqSpAssert_(cdqArchiveClientInOriginalMasterV2622_(client),'SCOPE_MISMATCH','Client déplacé.');
 var reports=cdqArchiveEnsureFolderV2622_(client,CDQ_SENT_ARCHIVE_REPORT_ALIASES_V2622,CDQ_SENT_ARCHIVE_REPORT_CANONICAL_V2622),archives=cdqArchiveEnsureFolderV2622_(reports,CDQ_SENT_ARCHIVE_ARCHIVE_ALIASES_V2622,CDQ_SENT_ARCHIVE_ARCHIVE_CANONICAL_V2622),dated=cdqArchiveEnsureFolderV2622_(archives,[job.date],job.date);
 var meta;try{meta=Drive.Files.create({id:job.folderId,name:'Envoi '+job.id,mimeType:'application/vnd.google-apps.folder',parents:[dated.getId()],appProperties:{cdqSp:String(CDQ_SP_VERSION_),cdqSj:job.id}},null,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});}catch(error){try{meta=cdqSpMeta_(job.folderId);}catch(_){throw error;}}
 cdqSpAssert_(!meta.trashed&&meta.mimeType==='application/vnd.google-apps.folder'&&(meta.appProperties||{}).cdqSj===job.id&&meta.parents.indexOf(dated.getId())>=0,'CONFLICT_SEND_FOLDER','Dossier de reprise différent.');
}
function cdqSpStart_(files,folders,email,message,company,clientId,session,force,options){
 var actor=cdqSpActor_(),plan=cdqSpValidateTicket_(options.ticket,actor,files,folders,email,clientId);cdqSpCapabilities_(actor,clientId,plan.actionsV2866);
 if(cdqSpActionsV2866_(plan).email)cdqSpLegacyUncertain_(clientId,email);
 var intent=String(options.intentId||'');cdqSpAssert_(/^[a-f0-9-]{36}$/i.test(intent),'INVALID_SEND_INTENT','Identité de demande absente.');
 var id=cdqSpHash_([plan.actor,clientId,intent].join('|')).slice(0,32),body={protocol:CDQ_SP_VERSION_,actor:plan.actor,clientId:clientId,email:plan.email,message:String(message||''),companyName:String(company||''),force:!!force,sources:plan.sources},bodyHash=cdqSpHash_(cdqSpJson_(cdqSpCopyActionsV2866_(body,plan))),ids=cdqSpGeneratedIds_(5);
 var selectionKey=cdqSpSelectionKey_(files,folders,email,clientId,actor,plan.actionsV2866),lease=Utilities.getUuid(),job=cdqSpLock_(function(){var prior=cdqSpGet_(CDQ_SP_JOB_+id);if(prior){cdqSpAssert_(prior.bodyHash===bodyHash,'IDEMPOTENCY_CONFLICT','Cette demande correspond à un autre contenu.');return prior;}var selection=cdqSpGet_(selectionKey),other=selection&&cdqSpGet_(CDQ_SP_JOB_+selection.id);if(other){cdqSpAssert_(!other.mailAttempted||other.mailSent||(typeof cdqSendReviewClosedV20261112_==='function'&&cdqSendReviewClosedV20261112_(other,null,other.sendKey?cdqSpGet_(other.sendKey):null)),'CDQ_ENVOI_A_VERIFIER','Un résultat de courriel doit être vérifié.');cdqSpAssert_(other.phase==='complete'||other.blocked,'CDQ_ENVOI_EN_COURS','Une demande identique est déjà active.');cdqSpAssert_(!other.mailSent||Date.now()-other.mailConfirmedAt>=86400000||force,'CDQ_DOUBLE_ENVOI','Cette sélection a déjà été envoyée.');}var j={protocol:CDQ_SP_VERSION_,id:id,actor:plan.actor,clientId:clientId,session:session,sessionKeyV2751:CDQ_ACCES_RPC_COURANT_&&CDQ_ACCES_RPC_COURANT_.sessionKeyV2751,bodyHash:bodyHash,at:Date.now(),date:Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Toronto','yyyy-MM-dd'),phase:'initializing',count:plan.sources.length,folderId:ids[0],requestId:ids[1],zipId:ids[2],manifestId:ids[3],technicalFolderId:ids[4],lease:lease,leaseUntil:Date.now()+420000};cdqSpCopyActionsV2866_(j,plan);cdqSpSave_(j);cdqSpActive_(j,false);cdqSpPut_(selectionKey,{id:j.id,at:j.at});return j;});
 if(job.phase!=='initializing'||job.lease!==lease)return cdqSpStatus_(job);
 try{
  if(cdqSpActionsV2866_(job).publish)cdqSpPortalLink_(actor,clientId,body.companyName);cdqSpEnsureFolder_(job);cdqSpEnsureTechnicalV2866_(job);var generated=cdqSpGeneratedIds_(body.sources.length);body.sources=body.sources.map(function(s,i){var copy={};Object.keys(s).forEach(function(k){copy[k]=s[k];});copy.artifactId=generated[i];return copy;});
  var text=cdqSpJson_(body),request=cdqSpCreate_(job,{},job.requestId,'selection.json',Utilities.newBlob(text,'application/json','selection.json'),'manifest');job.requestHash=request.sha256;job.phase='prepare';job.lease='';job.leaseUntil=0;cdqSpLock_(function(){cdqSpSave_(job);cdqSpActive_(job,false);});
  // Wake is optional only as an optimization: readiness already proved a durable executor.
  try{cdqSpEngine_(actor,'sendWakeV20261103',{clientId:clientId,jobId:job.id},clientId);}catch(_){console.warn('CDQ_SEND_WAKE_PENDING_20261103');}
  return cdqSpStatus_(job);
 }catch(error){job.blocked=true;job.error=String(error.message||error).slice(0,350);job.lease='';job.leaseUntil=0;cdqSpLock_(function(){cdqSpSave_(job);cdqSpActive_(job,false);});throw error;}
}
function cdqSpReadRequest_(job){cdqSpCheckRequestLocationV2866_(job);var blob=DriveApp.getFileById(job.requestId).getBlob();cdqSpAssert_(cdqSpHash_(blob.getBytes())===job.requestHash,'CONFLICT_SEND_REQUEST','Le manifeste de sélection a changé.');var request=JSON.parse(blob.getDataAsString());cdqSpAssert_(request.protocol===CDQ_SP_VERSION_&&request.clientId===job.clientId&&request.actor===job.actor&&request.sources.length===job.count,'CONFLICT_SEND_REQUEST','Le lot ne correspond plus à sa sélection.');cdqSpAssert_(cdqSpSameActionsV2866_(job,request),'CONFLICT_DELIVERY_ACTIONS','Les destinations du lot ont changé.');return request;}
function cdqSpValidateSource_(source,job,cache){cdqSpScope_(source.fileId,job.clientId,cache);var meta=cdqSpMeta_(source.fileId);cdqSpAssert_(!meta.trashed&&meta.name===source.name&&meta.mimeType===source.mimeType&&meta.modifiedTime===source.driveRevision&&(!source.sourceMd5||meta.md5Checksum===source.sourceMd5),'CONFLICT_SOURCE_CHANGED','La source a changé depuis la sélection.');return meta;}
function cdqSpExports_(sources,job,cache){
 sources.forEach(function(s){cdqSpValidateSource_(s,job,cache);});
 if(sources[0].kind!=='sheet')return sources.map(function(s){try{return {source:s,blob:convertirFichierEnPdf(s.fileId)};}catch(error){return {source:s,error:error};}});
 var token=ScriptApp.getOAuthToken(),requests=sources.map(function(s){return {url:'https://docs.google.com/spreadsheets/d/'+encodeURIComponent(s.fileId)+'/export?format=pdf&size='+encodeURIComponent(CONFIG.FORMAT_PAPIER)+'&portrait='+(CONFIG.PORTRAIT?'true':'false')+'&fitw=true&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true};});
 var responses=UrlFetchApp.fetchAll(requests);return sources.map(function(s,i){var response=responses&&responses[i],status=response&&response.getResponseCode();return status===200?{source:s,blob:response.getBlob()}:{source:s,error:cdqSpError_('SHEET_EXPORT_HTTP_'+String(status||'MISSING'),'Export temporairement indisponible.')};});
}
function cdqSpDocumentId_(job,source){return cdqSpHash_('cdq-portal-logical-v2825|'+job.clientId+'|'+cdqDeliveryReportKeyV2825_(source.outputName));}
function cdqSpStage_(job,source,artifact,actor,blob){
 cdqSpAssert_(cdqSpActionsV2866_(job).publish,'INVALID_DELIVERY_ACTIONS','Aucune publication demandée.');
 if(artifact.state==='staged')return artifact;
 blob=blob||cdqSpBlob_(artifact);var bytes=blob.getBytes();
 var result=cdqSpEngine_(actor,'portalBatchStageV2835',{clientId:job.clientId,batchId:job.id,jobId:job.id,deliveryId:job.id,expectedCount:job.count,sourceArchivedAtMs:job.at,logicalReportV2825:1,stableSourceV1:1,sourceFileId:source.fileId,documentId:cdqSpDocumentId_(job,source),name:artifact.name,sha256:artifact.sha256,size:artifact.size,base64:Utilities.base64Encode(bytes)},job.clientId);
 cdqSpAssert_(result&&result.ok===true&&result.staged===true&&result.batchId===job.id&&result.documentId===cdqSpDocumentId_(job,source)&&result.sha256===artifact.sha256&&result.size===artifact.size,'INVALID_PORTAL_STAGE_RECEIPT','Copie de préparation non confirmée.');
 var props=cdqSpArtifactProps_(job,source,artifact.name,artifact.sha256,artifact.size,'staged',artifact.sourceSha256),meta=Drive.Files.update({appProperties:props},artifact.fileId,null,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});return cdqSpCheckArtifact_(job,source,meta,artifact.name);
}
function cdqSpPrepare_(job,request,index,actor,deadline){
 var attempted={},cache={},failures=[],progress=0;
 while(Date.now()+16000<deadline){
  var unstaged=cdqSpActionsV2866_(job).publish&&request.sources.find(function(s){var a=index.artifacts[s.fileId];return a&&a.state!=='staged'&&!attempted[s.fileId];});
  if(unstaged){attempted[unstaged.fileId]=true;try{index.artifacts[unstaged.fileId]=cdqSpStage_(job,unstaged,index.artifacts[unstaged.fileId],actor);progress++;}catch(e){failures.push(e);}continue;}
  var missing=request.sources.filter(function(s){return !index.artifacts[s.fileId]&&!attempted[s.fileId];});if(!missing.length)break;
  var first=missing[0],group=first.kind==='sheet'?missing.filter(function(s){return s.kind==='sheet';}).slice(0,4):[first];group.forEach(function(s){attempted[s.fileId]=true;});
  var results;try{results=cdqSpExports_(group,job,cache);}catch(e){failures.push(e);continue;}
  results.forEach(function(result){var source=result.source;if(result.error){failures.push(result.error);return;}try{
   cdqSpValidateSource_(source,job,{});var input=result.blob.getBytes();
   if(source.sourceSha256)cdqSpAssert_(cdqSpHash_(input)===source.sourceSha256&&input.length===source.sourceSize,'CONFLICT_SOURCE_CHANGED','Le contenu ne correspond plus à l’édition choisie.');
   var pdf=source.kind==='sheet'?result.blob:cdqSendFlattenPdfV2823_(result.blob,actor,job.clientId),bytes=pdf.getBytes();
   cdqSpAssert_(bytes.length>=8&&bytes.length<=CDQ_SEND_PORTAL_PDF_MAX_BYTES_V2823_&&bytes.slice(0,5).map(function(b){return String.fromCharCode((b+256)%256);}).join('')==='%PDF-','INVALID_DELIVERY_PDF','Copie PDF invalide ou trop volumineuse.');
   var artifact=cdqSpCreate_(job,source,source.artifactId,source.outputName,pdf.setName(source.outputName).setContentType('application/pdf'),'archived',cdqSpHash_(input));index.artifacts[source.fileId]=artifact;progress++;
   // Keep the valid export before a stage failure; a retry never reconverts it.
   if(cdqSpActionsV2866_(job).publish&&Date.now()+5000<deadline)index.artifacts[source.fileId]=cdqSpStage_(job,source,artifact,actor,pdf);
  }catch(e){failures.push(e);}});
 }
 job.prepared=request.sources.filter(function(s){return !!index.artifacts[s.fileId];}).length;job.staged=request.sources.filter(function(s){return index.artifacts[s.fileId]&&index.artifacts[s.fileId].state==='staged';}).length;
 if((cdqSpActionsV2866_(job).publish?job.staged:job.prepared)===job.count){job.phase='package';job.error='';job.attempts=0;}
 else if(failures.length){var fatal=failures.find(function(e){return /^(SCOPE_|CONFLICT_|INVALID_|PORTAL_REVOKED|PORTAL_DOCUMENT_REMOVED)/.test(String(e.message||e));});if(fatal)throw fatal;job.attempts=progress?1:Number(job.attempts||0)+1;job.error=String(failures[0].message||failures[0]).slice(0,350);job.blocked=job.attempts>=4;job.nextAt=Date.now()+Math.min(300000,(/429|503/.test(job.error)?60000:5000)*Math.pow(2,job.attempts-1));}
 return progress;
}
function cdqSpPackage_(job,request,index){
 if(Object.prototype.hasOwnProperty.call(job,'actionsV2866'))return cdqSpPackageV2866_(job,request,index);
 var entries=request.sources.map(function(s){var a=index.artifacts[s.fileId];cdqSpAssert_(a&&a.state==='staged','INVALID_DELIVERY_MANIFEST','Une copie de préparation est absente.');return {sourceId:s.fileId,sourceRevision:s.driveRevision,sourceKey:s.sourceKey,sourceSha256:a.sourceSha256,fileId:a.fileId,name:a.name,sha256:a.sha256,size:a.size,documentId:cdqSpDocumentId_(job,s)};});
 var name=cdqSendPdfNameV2823_('Rapports - '+(request.companyName||'Client')+' - '+job.date,{}).replace(/\.pdf$/,'.zip'),zip;
 if(index.byId[job.zipId])zip=cdqSpCheckArtifact_(job,{},index.byId[job.zipId],name);
 else{var blobs=entries.map(function(e){return cdqSpBlob_({fileId:e.fileId,name:e.name,sha256:e.sha256,size:e.size});}),blob=Utilities.zip(blobs,name);cdqSpAssert_(blob.getBytes().length<=CDQ_SEND_ZIP_MAX_BYTES_V2823_,'INVALID_ZIP_SIZE','Le ZIP dépasse 24 Mio; aucun courriel envoyé.');zip=cdqSpCreate_(job,{},job.zipId,name,blob,'zip');index.byId[job.zipId]=zip.meta;}
 var manifest={protocol:CDQ_SP_VERSION_,batchId:job.id,clientId:job.clientId,zip:{fileId:zip.fileId,name:zip.name,sha256:zip.sha256,size:zip.size},entries:entries},text=cdqSpJson_(manifest),saved;
 if(index.byId[job.manifestId]){saved=cdqSpCheckArtifact_(job,{},index.byId[job.manifestId],'publication.json');cdqSpAssert_(saved.sha256===cdqSpHash_(text),'CONFLICT_DELIVERY_MANIFEST','Manifeste de publication différent.');}
 else saved=cdqSpCreate_(job,{},job.manifestId,'publication.json',Utilities.newBlob(text,'application/json','publication.json'),'manifest');
 job.zipHash=zip.sha256;job.zipSize=zip.size;job.zipName=zip.name;job.manifestHash=saved.sha256;job.phase='activate';return manifest;
}
function cdqSpPublication_(job){if(job.technicalFolderId){cdqSpTechnicalScopeV2866_(job);cdqSpCheckArtifact_(job,{},cdqSpMeta_(job.manifestId),'publication.json');}var blob=DriveApp.getFileById(job.manifestId).getBlob();cdqSpAssert_(cdqSpHash_(blob.getBytes())===job.manifestHash,'CONFLICT_DELIVERY_MANIFEST','Manifeste de publication modifié.');var result=JSON.parse(blob.getDataAsString());cdqSpAssert_(result.protocol===CDQ_SP_VERSION_&&result.batchId===job.id&&result.clientId===job.clientId&&result.entries.length===job.count,'INVALID_DELIVERY_MANIFEST','Manifeste de publication incohérent.');return cdqSpCheckActionsManifestV2866_(job,result);}
function cdqSpActivate_(job,manifest,actor){
 cdqSpAssert_(cdqSpActionsV2866_(job).publish,'INVALID_DELIVERY_ACTIONS','Aucune publication demandée.');cdqSpCheckActionsManifestV2866_(job,manifest);
 var documents=manifest.entries.map(function(e){return {documentId:e.documentId,sha256:e.sha256,size:e.size};}).sort(function(a,b){return a.documentId<b.documentId?-1:a.documentId>b.documentId?1:0;});
 var result=cdqSpEngine_(actor,'portalBatchCommitV2835',cdqSpVisitPayloadV2866_(job,{clientId:job.clientId,batchId:job.id,documents:documents}),job.clientId);
 cdqSpAssert_(result&&result.ok===true&&result.committed===true&&result.batchId===job.id&&result.count===job.count&&result.manifestSha256===cdqSpHash_(cdqSpJson_(documents)),'INVALID_PORTAL_BATCH_RECEIPT','La page client complète n’est pas confirmée.');
 cdqSpConfirmVisitV2866_(job,result);
 job.portalConfirmed=true;job.portalManifestHash=result.manifestSha256;job.portalConfirmedAt=Date.now();job.phase=cdqSpActionsV2866_(job).email?'mail':'complete';
}
function cdqSpRecipients_(value){return String(value||'').split(',').map(function(v){var match=/<([^<>]+)>/.exec(v);return (match?match[1]:v).trim().toLowerCase();});}
function cdqSpSentEvidence_(job,request){
 var marker='Référence d’envoi CDQ : '+job.id,threads=GmailApp.search('in:sent after:'+Math.floor((job.at-1000)/1000)+' "'+job.id+'"',0,20),found=null;
 threads.some(function(thread){return thread.getMessages().some(function(m){if(m.getDate().getTime()<job.at-1000||cdqSpRecipients_(m.getTo()).indexOf(request.email)<0||String(m.getPlainBody()).indexOf(marker)<0)return false;var match=m.getAttachments({includeInlineImages:false,includeAttachments:true}).some(function(b){return b.getName()===job.zipName&&cdqSpHash_(b.getBytes())===job.zipHash;});if(match)found={messageId:m.getId(),at:m.getDate().getTime()};return match;});});return found;
}
function cdqSpMail_(job,request,manifest){
 cdqSpAssert_(cdqSpActionsV2866_(job).email&&(!cdqSpActionsV2866_(job).publish||job.portalConfirmed===true)&&job.phase==='mail','INVALID_SEND_ORDER','La page client doit être confirmée avant le courriel.');
 if(job.mailAttempted){var evidence=cdqSpSentEvidence_(job,request);cdqSpAssert_(evidence,'CDQ_ENVOI_A_VERIFIER','Résultat du courriel incertain. Aucun renvoi automatique.');cdqSpLock_(function(){var receipt=cdqSpGet_(job.sendKey);cdqSpAssert_(receipt&&receipt.jobId===job.id&&receipt.protocol===CDQ_SP_VERSION_&&['sending','sent'].indexOf(receipt.phase)>=0,'CONFLICT_SEND_RECEIPT','Le reçu du courriel appartient à une autre demande.');cdqSpPut_(job.sendKey,{phase:'sent',at:evidence.at,jobId:job.id,protocol:CDQ_SP_VERSION_,messageId:evidence.messageId});});job.mailSent=true;job.messageId=evidence.messageId;job.mailConfirmedAt=evidence.at;job.phase='complete';return;}
 var zip=cdqSpBlob_({fileId:job.zipId,name:job.zipName,size:job.zipSize,sha256:job.zipHash});
 var body=request.message.trim()?request.message:'Bonjour,\n\nVeuillez trouver ci-joint les éléments d’étalonnage de '+(request.companyName||'votre entreprise')+'.\n\nMerci.';
 var prepared;
 if(cdqSpActionsV2866_(job).publish){
 var info=cdqSpPortalLink_({email:job.actor},job.clientId,request.companyName);prepared=cdqEmailPortalPrepareV20261030_(body,job.clientId,'convertir',info);cdqSpAssert_(prepared&&prepared.linkIncluded===true&&['INCLUDED','LINK_ONLY'].indexOf(prepared.status)>=0,'PORTAL_LINK_UNAVAILABLE','Le lien client n’est pas confirmé. Aucun courriel envoyé.');
 }else prepared=cdqSpMailTextV2866_(body);
 // Reuse the legacy send key for Sheets; a legacy uncertain identical send remains protected.
 var identities=request.sources.map(function(s,i){return s.fileId+':'+(s.kind==='sheet'?'modified:'+new Date(s.driveRevision).getTime():(s.sourceSha256||manifest.entries[i].sourceSha256))+':'+s.conversionName;}).sort();
 var key='CDQ_SEND_ZIP_V2823_'+cdqSpHash_(cdqSpJson_([job.clientId,request.email,identities]));
 if(cdqSpActionsV2866_(job).publish){
 var active=cdqSpEngine_({email:job.actor},'portalBatchVerifyV2835',cdqSpVisitPayloadV2866_(job,{clientId:job.clientId,batchId:job.id,manifestSha256:job.portalManifestHash}),job.clientId);
 cdqSpAssert_(active&&active.ok===true&&active.active===true&&active.committed===true&&active.batchId===job.id&&active.count===job.count&&active.manifestSha256===job.portalManifestHash,'INVALID_PORTAL_ACTIVE_RECEIPT','Un document publié a changé ou a été retiré. Aucun courriel envoyé.');
 cdqSpConfirmVisitV2866_(job,active);
 }
 cdqSpLegacyUncertain_(job.clientId,request.email);
 cdqSpLock_(function(){var receipt=cdqSpGet_(key);cdqSpAssert_(!receipt||receipt.phase!=='sending'||(typeof cdqSendReviewAllowsSendKeyV20261112_==='function'&&cdqSendReviewAllowsSendKeyV20261112_(key)),'CDQ_ENVOI_A_VERIFIER','Un résultat de courriel identique est incertain.');cdqSpAssert_(!receipt||receipt.phase!=='sent'||Date.now()-receipt.at>=86400000||request.force,'CDQ_DOUBLE_ENVOI','Cet envoi est déjà confirmé.');job.mailAttempted=true;job.sendKey=key;cdqSpSave_(job);cdqSpPut_(key,{phase:'sending',at:Date.now(),jobId:job.id,protocol:CDQ_SP_VERSION_});});
 var marker='Référence d’envoi CDQ : '+job.id,subject='Rapports d’étalonnages - '+(request.companyName||'Client')+' - '+job.date,options={attachments:[zip],name:CONFIG.NOM_EXPEDITEUR,htmlBody:prepared.htmlBody+'<p>'+marker+'</p>'};if(prepared.inlineImages)options.inlineImages=prepared.inlineImages;
 GmailApp.sendEmail(request.email,subject,prepared.text+'\n\n'+marker,options);
 cdqSpPut_(key,{phase:'sent',at:Date.now(),jobId:job.id,protocol:CDQ_SP_VERSION_});job.mailSent=true;job.mailConfirmedAt=Date.now();job.phase='complete';
}
function cdqSpStatus_(job){if(Object.prototype.hasOwnProperty.call(job,'actionsV2866'))return cdqSpStatusV2866_(job);var complete=job.phase==='complete'&&job.mailSent===true&&job.portalConfirmed===true;return {ok:true,queued:true,envoyes:complete?job.count:0,echecs:[],trackingVersion:2828,sendProtocol:CDQ_SP_VERSION_,jobId:job.id,sessionId:job.session||'',clientId:job.clientId,createdAt:job.at,total:job.count,termine:complete?job.count:job.staged||job.prepared||0,phase:complete?'termine':job.mailAttempted&&!job.mailSent?'verification':job.phase==='mail'?'envoi':job.phase==='activate'?'publication':job.phase==='package'?'assemblage':'preparation',status:complete?'complete':job.blocked?'blocked':'pending',mailSent:!!job.mailSent,portalDone:!!job.portalConfirmed,...(job.nextAt?{retryAt:job.nextAt}:{}),...(job.error?{error:job.mailAttempted&&!job.mailSent?'MAIL_UNCONFIRMED':'PREPARATION_PENDING'}:{}),message:complete?'Courriel envoyé et page client actualisée : '+job.count+' PDF.':job.mailAttempted&&!job.mailSent?'Résultat du courriel à vérifier. Aucun renvoi automatique.':job.blocked?'Préparation arrêtée avant le courriel. Aucun courriel envoyé. Rouvrez la confirmation avec votre sélection actuelle.':job.portalConfirmed?'Page client prête. Courriel en attente de confirmation.':'Préparation et conservation des PDF : '+(job.staged||0)+' sur '+job.count+'.'};}
function cdqSpReadTracking_(query){
 query=query||{};var actor=verifierDroit_('envoi'),clientId=String(query.clientId||'').trim();cdqSpId_(clientId);cdqClientPortalScopeV20261028_(clientId);var jobs=[];
 if(query.jobId){var one=cdqSpGet_(CDQ_SP_JOB_+query.jobId);if(one)jobs=[one];}
 else{for(var h=0;h<16;h++){var index=cdqSpGet_(CDQ_SP_ACTIVE_+h.toString(16))||{};Object.keys(index).forEach(function(id){var j=cdqSpGet_(CDQ_SP_JOB_+id);if(j)jobs.push(j);});}var last=cdqSpGet_('CDQ_SP_LAST_20261103:'+cdqSpHash_([normaliserEmailCDQ_(actor.email),clientId].join('|')));if(last){var j=cdqSpGet_(CDQ_SP_JOB_+last.id);if(j)jobs.push(j);}}
 jobs=jobs.filter(function(j){return j.actor===normaliserEmailCDQ_(actor.email)&&j.clientId===clientId&&(!query.sessionId||j.session===query.sessionId);});jobs.sort(function(a,b){return b.at-a.at;});return jobs.length?cdqSpStatus_(jobs[0]):null;
}
function cdqSpDrain_(deadline){
 var queue=[];for(var h=0;h<16;h++){var ix=cdqSpGet_(CDQ_SP_ACTIVE_+h.toString(16))||{};Object.keys(ix).forEach(function(id){if(!ix[id].blocked)queue.push({id:id,at:ix[id].at,nextAt:ix[id].nextAt||0});});}queue.sort(function(a,b){return a.nextAt-b.nextAt||a.at-b.at;});
 for(var qi=0;qi<queue.length&&Date.now()+16000<deadline;qi++){
  var lease=Utilities.getUuid(),job=cdqSpLock_(function(){var j=cdqSpGet_(CDQ_SP_JOB_+queue[qi].id);if(j&&j.phase==='initializing'&&j.leaseUntil<=Date.now()){j.blocked=true;j.error='INITIALIZATION_INTERRUPTED : préparation interrompue avant tout envoi.';cdqSpSave_(j);cdqSpActive_(j,false);return null;}if(!j||j.protocol!==CDQ_SP_VERSION_||j.blocked||j.phase==='complete'||j.phase==='initializing'||j.nextAt>Date.now()||j.leaseUntil>Date.now())return null;j.lease=lease;j.leaseUntil=Date.now()+420000;cdqSpSave_(j);return j;});if(!job)continue;
  var old=CDQ_ACCES_RPC_COURANT_,oldDrive=CDQ_WS_RPC_PERMISSION_V2638_;
  try{
   var actor=cdqWsActorV2638_(job.actor);CDQ_ACCES_RPC_COURANT_={email:actor.email,role:actor.role,verifiedUserV2686:actor,sessionKeyV2751:job.sessionKeyV2751};CDQ_WS_RPC_PERMISSION_V2638_=cdqWsRpcPermissionV2638_('envoyerSelectionSuivi',actor.email);
   cdqClientPortalScopeV20261028_(job.clientId);var request=cdqSpReadRequest_(job),index=null,manifest=null;job.nextAt=0;
   while(Date.now()+5000<deadline&&!job.blocked&&job.phase!=='complete'){
    var before=job.phase;if(before==='prepare'){index=index||cdqSpIndex_(job,request);cdqSpPrepare_(job,request,index,actor,deadline);}
    else if(before==='package'){if(Date.now()+25000>=deadline)break;index=index||cdqSpIndex_(job,request);manifest=cdqSpPackage_(job,request,index);}
    else if(before==='activate'){manifest=manifest||cdqSpPublication_(job);cdqSpActivate_(job,manifest,actor);}
    else if(before==='mail'){if(Date.now()+25000>=deadline)break;manifest=manifest||cdqSpPublication_(job);cdqSpMail_(job,request,manifest);}
    else throw cdqSpError_('INVALID_SEND_PHASE','Étape inconnue.');
    cdqSpSave_(job);if(job.phase===before||job.nextAt>Date.now())break;
   }
   if(job.phase==='complete'){job.completedAt=Date.now();job.nextAt=0;job.error='';}
  }catch(error){job.error=String(error.message||error).slice(0,350);job.attempts=Number(job.attempts||0)+1;job.blocked=!!job.mailAttempted||job.attempts>=4||/^(SCOPE_|CONFLICT_|INVALID_|CDQ_DOUBLE_ENVOI|CDQ_ENVOI_A_VERIFIER|PORTAL_REVOKED|PORTAL_DOCUMENT_REMOVED)/.test(job.error);job.nextAt=job.blocked?0:Date.now()+Math.min(300000,5000*Math.pow(2,job.attempts-1));}
  finally{CDQ_ACCES_RPC_COURANT_=old;CDQ_WS_RPC_PERMISSION_V2638_=oldDrive;cdqSpLock_(function(){var current=cdqSpGet_(CDQ_SP_JOB_+job.id);cdqSpAssert_(current&&current.lease===lease,'CONFLICT_SEND_LEASE','L’exécution a changé.');job.lease='';job.leaseUntil=0;cdqSpSave_(job);cdqSpActive_(job,job.phase==='complete');cdqSpPut_('CDQ_SP_LAST_20261103:'+cdqSpHash_([job.actor,job.clientId].join('|')),{id:job.id,at:job.at});});}
 }
 var due=[];for(var k=0;k<16;k++){var active=cdqSpGet_(CDQ_SP_ACTIVE_+k.toString(16))||{};Object.keys(active).forEach(function(id){if(!active[id].blocked)due.push(Number(active[id].nextAt)||Date.now());});}return {workRemaining:due.length>0,nextAt:due.length?Math.max(Date.now(),Math.min.apply(null,due)):null};
}
function cdqSendServiceTickV20261103_(message){
 cdqSpAssert_(message&&message.purpose==='engine-to-gas'&&message.action==='sendQueueTickV20261103'&&message.payload&&message.payload.protocol===CDQ_SP_VERSION_&&Number.isSafeInteger(message.timestamp)&&Math.abs(Date.now()-message.timestamp)<=90000&&/^[a-f0-9-]{36}$/i.test(message.nonce||''),'INVALID_SEND_TICK','Appel signé invalide.');
 var nonce=message.nonce,leaseKey='CDQ_SP_EXECUTOR_20261103',busy=cdqSpLock_(function(){var cache=CacheService.getScriptCache(),key='CDQ_SP_NONCE_20261103:'+nonce;cdqSpAssert_(!cache.get(key),'BRIDGE_REPLAY','Appel déjà reçu.');cache.put(key,'1',180);var current=cdqSpGet_(leaseKey);if(current&&current.until>Date.now())return true;cdqSpPut_(leaseKey,{nonce:nonce,until:Date.now()+420000});return false;});
 if(busy)return {ok:true,version:CDQ_SP_VERSION_,state:'busy',workRemaining:true,nextAt:Date.now()+5000};
 var health={version:CDQ_SP_VERSION_,executor:'isolated-send-queue',startedAt:Date.now(),state:'running'},result;cdqSpPut_(CDQ_SP_HEALTH_,health);
 try{result=cdqSpDrain_(Date.now()+60000);health.state='idle';}
 catch(error){health.state='failed';throw error;}
 finally{health.completedAt=Date.now();cdqSpPut_(CDQ_SP_HEALTH_,health);cdqSpLock_(function(){var current=cdqSpGet_(leaseKey);if(current&&current.nonce===nonce)cdqSpProps_().deleteProperty(leaseKey);});}
 return {ok:true,version:CDQ_SP_VERSION_,state:'idle',workRemaining:result.workRemaining,nextAt:result.nextAt};
}
// Explicit destinations for NEW intents only. Missing field means legacy both.
function cdqSpActionsV2866_(record){
 if(!Object.prototype.hasOwnProperty.call(record||{},'actionsV2866'))return {publish:true,email:true};
 var a=record.actionsV2866;
 cdqSpAssert_(a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===2&&typeof a.publish==='boolean'&&typeof a.email==='boolean'&&(a.publish||a.email),'INVALID_DELIVERY_ACTIONS','Choisissez publier, envoyer par courriel, ou les deux.');
 return {publish:a.publish,email:a.email};
}
function cdqSpCopyActionsV2866_(target,source){
 if(Object.prototype.hasOwnProperty.call(source||{},'actionsV2866'))target.actionsV2866=cdqSpActionsV2866_(source);
 if(Object.prototype.hasOwnProperty.call(source||{},'visitV2866'))target.visitV2866=cdqSpVisitChoiceV2866_(source.visitV2866);
 return target;
}
function cdqSpSameActionsV2866_(left,right){
 var a=Object.prototype.hasOwnProperty.call(left,'actionsV2866'),b=Object.prototype.hasOwnProperty.call(right,'actionsV2866');
 return cdqSpSameVisitV2866_(left,right)&&a===b&&(!a||cdqSpJson_(cdqSpActionsV2866_(left))===cdqSpJson_(cdqSpActionsV2866_(right)));
}
function cdqSpRecipientV2866_(email,record){return cdqSpActionsV2866_(record).email?cdqSpEmail_(email):'';}
function cdqPreparerLivraisonV2866(files,folders,email,clientId,hours,actions,visit){
 var safe=cdqSpActionsV2866_({actionsV2866:actions});
 return cdqSpBindVisitV2866_(cdqSpPreflight_(files,folders,email,clientId,hours,safe),visit);
}
function cdqSpPackageV2866_(job,request,index){
 var actions=cdqSpActionsV2866_(job),entries=request.sources.map(function(s){
  var a=index.artifacts[s.fileId];
  cdqSpAssert_(a&&(actions.publish?a.state==='staged':a.state==='archived'),'INVALID_DELIVERY_MANIFEST','Une copie archivée ou publiée en préparation est absente.');
  return {sourceId:s.fileId,sourceRevision:s.driveRevision,sourceKey:s.sourceKey,sourceSha256:a.sourceSha256,fileId:a.fileId,name:a.name,sha256:a.sha256,size:a.size,documentId:cdqSpDocumentId_(job,s)};
 });
 var zip=null;
 if(actions.email){
  var name=cdqSendPdfNameV2823_('Rapports - '+(request.companyName||'Client')+' - '+job.date,{}).replace(/\.pdf$/,'.zip');
  if(index.byId[job.zipId])zip=cdqSpCheckArtifact_(job,{},index.byId[job.zipId],name);
  else{
   var blobs=entries.map(function(e){return cdqSpBlob_({fileId:e.fileId,name:e.name,sha256:e.sha256,size:e.size});}),blob=Utilities.zip(blobs,name);
   cdqSpAssert_(blob.getBytes().length<=CDQ_SEND_ZIP_MAX_BYTES_V2823_,'INVALID_ZIP_SIZE','Le ZIP dépasse 24 Mio; aucun courriel envoyé.');
   zip=cdqSpCreate_(job,{},job.zipId,name,blob,'zip');index.byId[job.zipId]=zip.meta;
  }
 }
 var manifest={protocol:CDQ_SP_VERSION_,batchId:job.id,clientId:job.clientId,actionsV2866:actions,...(actions.publish?{visitV2866:cdqSpVisitChoiceV2866_(job.visitV2866)}:{}),zip:zip?{fileId:zip.fileId,name:zip.name,sha256:zip.sha256,size:zip.size}:null,entries:entries},text=cdqSpJson_(manifest),saved;
 if(index.byId[job.manifestId]){
  saved=cdqSpCheckArtifact_(job,{},index.byId[job.manifestId],'publication.json');
  cdqSpAssert_(saved.sha256===cdqSpHash_(text),'CONFLICT_DELIVERY_MANIFEST','Manifeste de livraison différent.');
 }else saved=cdqSpCreate_(job,{},job.manifestId,'publication.json',Utilities.newBlob(text,'application/json','publication.json'),'manifest');
 if(zip){job.zipHash=zip.sha256;job.zipSize=zip.size;job.zipName=zip.name;}
 job.manifestHash=saved.sha256;job.archiveConfirmed=true;
 job.phase=actions.publish?'activate':'mail';return manifest;
}
function cdqSpCheckActionsManifestV2866_(job,manifest){
 cdqSpAssert_(cdqSpSameActionsV2866_(job,manifest),'CONFLICT_DELIVERY_ACTIONS','Les destinations du lot ont changé.');
 return manifest;
}
function cdqSpMailTextV2866_(body){
 // Email-only never creates/renews a portal link or renders a QR.
 var escape=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');};
 return {text:body,htmlBody:'<p>'+escape(body).replace(/\r?\n/g,'<br>')+'</p>',linkIncluded:false,status:'EMAIL_ONLY'};
}
function cdqSpStatusV2866_(job){
 var actions=cdqSpActionsV2866_(job),complete=job.phase==='complete'&&job.archiveConfirmed===true&&(!actions.email||job.mailSent===true)&&(!actions.publish||job.portalConfirmed===true&&job.visitConfirmed===true);
 var uncertain=actions.email&&job.mailAttempted&&!job.mailSent;
 var message=complete?(actions.publish?(actions.email?'PDF archivés et publiés; courriel envoyé.':'PDF archivés et publiés. Aucun courriel demandé.'):'PDF archivés; courriel envoyé. Aucune publication demandée.'):
  uncertain?(job.portalConfirmed?'PDF publiés et archivés; résultat du courriel à vérifier. Aucun renvoi automatique.':'PDF archivés; résultat du courriel à vérifier. Aucun renvoi automatique.'):
  job.blocked?(job.portalConfirmed?'PDF publiés et archivés; courriel non envoyé.':'Traitement arrêté; les copies et résultats déjà confirmés sont conservés.'):
  job.portalConfirmed?'PDF publiés et archivés; courriel en attente.':'Préparation des PDF : '+(job.prepared||0)+' sur '+job.count+'.';
 return {ok:true,queued:true,envoyes:actions.email&&job.mailSent?job.count:0,publies:actions.publish&&job.portalConfirmed?job.count:0,echecs:[],trackingVersion:2828,sendProtocol:CDQ_SP_VERSION_,actionsProtocol:2866,actionsV2866:actions,...(actions.publish?{visitId:job.visitV2866.visitId,visitDone:!!job.visitConfirmed}:{}),archiveDone:!!job.archiveConfirmed,jobId:job.id,sessionId:job.session||'',clientId:job.clientId,createdAt:job.at,total:job.count,termine:complete?job.count:job.prepared||0,phase:complete?'termine':uncertain?'verification':job.phase==='mail'?'envoi':job.phase==='activate'?'publication':job.phase==='package'?'assemblage':'preparation',status:complete?'complete':job.blocked?'blocked':'pending',mailSent:!!job.mailSent,portalDone:!!job.portalConfirmed,...(job.nextAt?{retryAt:job.nextAt}:{}),...(job.error?{error:uncertain?'MAIL_UNCONFIRMED':'PREPARATION_PENDING'}:{}),message:message};
}

function cdqSpVisitChoiceV2866_(v){
 cdqSpAssert_(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===5&&['new','continue'].indexOf(v.mode)>=0&&/^[A-Za-z0-9_-]{8,100}$/.test(v.visitId||'')&&typeof v.expectedHeadId==='string'&&(v.expectedHeadId===''||/^[A-Za-z0-9_-]{8,100}$/.test(v.expectedHeadId))&&Number.isSafeInteger(v.expectedHeadRevision)&&v.expectedHeadRevision>=0&&(v.expectedHeadId===''?v.expectedHeadRevision===0:v.expectedHeadRevision>0)&&/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v.date||''),'INVALID_VISIT_CHOICE','Choisissez une visite et sa date.');
 var date=new Date(v.date+'T00:00:00.000Z');cdqSpAssert_(isFinite(date.getTime())&&date.toISOString().slice(0,10)===v.date&&(v.mode!=='continue'||v.visitId===v.expectedHeadId),'INVALID_VISIT_CHOICE','Date ou visite invalide.');
 return {mode:v.mode,visitId:v.visitId,date:v.date,expectedHeadId:v.expectedHeadId,expectedHeadRevision:v.expectedHeadRevision};
}
function cdqSpSameVisitV2866_(a,b){
 var left=Object.prototype.hasOwnProperty.call(a,'visitV2866'),right=Object.prototype.hasOwnProperty.call(b,'visitV2866');
 return left===right&&(!left||cdqSpJson_(cdqSpVisitChoiceV2866_(a.visitV2866))===cdqSpJson_(cdqSpVisitChoiceV2866_(b.visitV2866)));
}
function cdqSpBindVisitV2866_(result,visit){
 var ticket=result.sendV20261103,plan=ticket.plan,actions=cdqSpActionsV2866_(plan);
 if(!actions.publish){cdqSpAssert_(visit===undefined||visit===null,'INVALID_VISIT_CHOICE','Un courriel seul ne modifie aucune visite.');return result;}
 cdqSpAssert_(ticket.capabilities.visitProtocol===2866,'PORTAL_VISITS_UNAVAILABLE','Le serveur des visites doit être actualisé.');
 var v=cdqSpVisitChoiceV2866_(visit),state=cdqLireVisitesClientV2866(plan.clientId),head=state.head;
 cdqSpAssert_(v.expectedHeadId===(head?head.visitId:'')&&v.expectedHeadRevision===(head?head.revision:0)&&(v.mode!=='continue'||v.date===head.date),'CONFLICT_VISIT_CHANGED','La visite a changé. Rouvrez la confirmation.');
 plan.visitV2866=v;ticket.signature=cdqSpSignPlanV20261104_(plan);return result;
}
function cdqLireVisitesClientV2866(clientId){
 var actor=cdqSpActor_(),result=cdqSpEngine_(actor,'portalVisitStateV2866',{clientId:clientId},clientId);
 cdqSpAssert_(result&&result.ok===true&&result.clientId===clientId&&result.visitProtocol===2866&&(result.head===null||(result.head&&/^[A-Za-z0-9_-]{8,100}$/.test(result.head.visitId||'')&&Number.isSafeInteger(result.head.revision)&&result.head.revision>0&&typeof result.head.date==='string')),'INVALID_VISIT_STATE','La dernière visite n’est pas confirmée.');return result;
}
function cdqSpVisitPayloadV2866_(job,payload){
 if(Object.prototype.hasOwnProperty.call(job,'visitV2866'))payload.visitV2866=cdqSpVisitChoiceV2866_(job.visitV2866);return payload;
}
function cdqSpConfirmVisitV2866_(job,result){
 if(!Object.prototype.hasOwnProperty.call(job,'actionsV2866'))return;
 var v=cdqSpVisitChoiceV2866_(job.visitV2866);
 cdqSpAssert_(result.visitProtocol===2866&&result.visitId===v.visitId&&result.visitRevision===v.expectedHeadRevision+1,'INVALID_VISIT_RECEIPT','La visite publiée n’est pas confirmée.');
 job.visitConfirmed=true;job.visitConfirmedRevision=result.visitRevision;
}

function cdqPrevisualiserRegroupementVisitesV2866(clientId,sourceVisitId){
 var actor=cdqSpActor_();return cdqSpEngine_(actor,'portalVisitRegroupPreviewV2866',{clientId:clientId,...(sourceVisitId?{sourceVisitId:sourceVisitId}:{})},clientId);
}
function cdqCorrigerRegroupementVisitesV2866(clientId,request){
 cdqSpAssert_(request&&request.clientId===clientId,'SCOPE_MISMATCH','Client de la correction différent.');
 var actor=cdqSpActor_();return cdqSpEngine_(actor,'portalVisitRegroupV2866',request,clientId);
}
