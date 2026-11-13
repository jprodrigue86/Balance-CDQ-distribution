/* Shared opportunities: same business validation and Google permissions.
 * Only storage changes. A cloud failure never falls back to stale Drive.
 */
function cdqSharedCallV20261113_(actor,action,payload){
 var envelope=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload||{},scope:{store:'opportunities-v1',role:normaliserRoleCDQ_(actor.role)}});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(envelope),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
 var result;try{result=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('SHARED_RESPONSE_INVALID');}
 if(response.getResponseCode()!==200||result.ok!==true||result.kind!=='system-shared-v1')throw Error(result&&result.code==='SHARED_CONFLICT'?'Les opportunités ont changé. Actualisez avant de recommencer.':'SHARED_UNCONFIRMED_'+String(result&&result.code||response.getResponseCode()));
 return result.result;
}
function cdqSharedVerifyV20261113_(d){
 if(d.state!=='ok'||d.id!=='1kwnDlzcPSlhtiCZR_AlbDNEeoOJrFMHM'||d.category!=='opportunites'||d.sourceName!=='Opportunités.json'||d.cloudActive!==true||!Number.isSafeInteger(d.revision)||d.revision<1)throw Error('SHARED_DOCUMENT_INVALID');
 var bytes=Utilities.base64Decode(d.contentBase64);
 if(bytes.length!==d.bytes||cdqCoordMigrationHashV20261113_(bytes)!==d.sha256)throw Error('SHARED_INTEGRITY');
 var text=Utilities.newBlob(bytes).getDataAsString('UTF-8'),data=JSON.parse(text);
 if(data.schema!==1||!Array.isArray(data.items))throw Error('SHARED_SCHEMA_INVALID');
 return text;
}
function cdqSharedOpportunityFileV20261113_(){
 if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_OPPORTUNITIES_V1')!=='on')return null;
 var actor=cdqWsAccessV2638_(false),doc=cdqSharedCallV20261113_(actor,'systemSharedReadV1',{}),text=cdqSharedVerifyV20261113_(doc);
 var file={getId:function(){return doc.id;},getName:function(){return 'Opportunités.json';},getBlob:function(){return Utilities.newBlob(text,'application/json','Opportunités.json');},setContent:function(next){
  var writer=cdqWsAccessV2638_(true),bytes=Utilities.newBlob(String(next)).getBytes(),hash=cdqCoordMigrationHashV20261113_(bytes);
  var request='shared-'+cdqCoordMigrationHashV20261113_(Utilities.newBlob(writer.email+'|'+doc.id+'|'+doc.revision+'|'+hash).getBytes());
  var receipt=cdqSharedCallV20261113_(writer,'systemSharedWriteV1',{id:doc.id,requestId:request,expectedRevision:doc.revision,expectedSha256:doc.sha256,contentBase64:Utilities.base64Encode(bytes)});
  if(!['updated','replayed'].includes(receipt.state)||receipt.id!==doc.id||receipt.sha256!==hash||receipt.revision!==doc.revision+1)throw Error('SHARED_WRITE_UNCONFIRMED');
  doc.revision=receipt.revision;doc.sha256=hash;text=String(next);return file;
 }};return file;
}
function cdqMigrerOpportunitesV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){
  var id='1kwnDlzcPSlhtiCZR_AlbDNEeoOJrFMHM',parent='1HMt5ZmfcGYxnoEpMaUcIJPRfPLX_MRgP',props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
   var meta=Drive.Files.get(id,{fields:'id,name,mimeType,parents,modifiedTime,trashed',supportsAllDrives:true});
   if(meta.trashed||meta.name!=='Opportunités.json'||meta.mimeType!=='application/json'||meta.parents.length!==1||meta.parents[0]!==parent)throw Error('SHARED_DRIVE_IDENTITY');
   var folder=Drive.Files.get(parent,{fields:'id,name,parents,trashed',supportsAllDrives:true});
   if(folder.trashed||folder.name!=='Opportunités'||folder.parents.length!==1||folder.parents[0]!==CDQ_WS_SYSTEM_V2638_)throw Error('SHARED_DRIVE_PARENT');
   var bytes=DriveApp.getFileById(id).getBlob().getBytes(),hash=cdqCoordMigrationHashV20261113_(bytes),check=Drive.Files.get(id,{fields:'modifiedTime',supportsAllDrives:true});
   if(check.modifiedTime!==meta.modifiedTime)throw Error('SHARED_DRIVE_CHANGED');
   var stage=cdqSharedCallV20261113_(actor,'systemSharedStageV1',{id:id,category:'opportunites',sourceName:meta.name,sourceParentId:parent,driveModifiedAt:meta.modifiedTime,driveSha256:hash,contentBase64:Utilities.base64Encode(bytes)});
   if(stage.state==='active'){
    if(props.getProperty('CDQ_SYSTEM_OPPORTUNITIES_V1')!=='on')throw Error('SHARED_ACTIVE_WITHOUT_ROUTE');
   }else{
    if(stage.id!==id||stage.sha256!==hash)throw Error('SHARED_STAGE_CHANGED');
    props.setProperty('CDQ_SYSTEM_OPPORTUNITIES_V1','on');
    var activated=cdqSharedCallV20261113_(actor,'systemSharedActivateV1',{id:id,requestId:'shared-activate-'+Utilities.getUuid(),expectedRevision:stage.revision,expectedSha256:hash,sourceModifiedAt:meta.modifiedTime});
    if(activated.id!==id||activated.sha256!==hash||activated.revision!==stage.revision+1)throw Error('SHARED_ACTIVATION_UNCONFIRMED');
   }
   var doc=cdqSharedCallV20261113_(actor,'systemSharedReadV1',{}),text=cdqSharedVerifyV20261113_(doc);
   if(stage.state!=='active'&&doc.sha256!==hash)throw Error('SHARED_CUTOVER_HASH');
   // Verify actual write/replay without changing any opportunity's business data.
   var payload={id:id,requestId:'shared-qa-'+Utilities.getUuid(),expectedRevision:doc.revision,expectedSha256:doc.sha256,contentBase64:doc.contentBase64};
   var write=cdqSharedCallV20261113_(actor,'systemSharedWriteV1',payload),replay=cdqSharedCallV20261113_(actor,'systemSharedWriteV1',payload),read=cdqSharedCallV20261113_(actor,'systemSharedReadV1',{});
   if(write.revision!==doc.revision+1||replay.revision!==write.revision||cdqSharedVerifyV20261113_(read)!==text||read.sha256!==doc.sha256)throw Error('SHARED_ROUNDTRIP_FAILED');
   if(cdqCoordMigrationHashV20261113_(DriveApp.getFileById(id).getBlob().getBytes())!==hash)throw Error('SHARED_STILL_WRITES_DRIVE');
   var actual=cdqListerOpportunitesV2638(),expected=JSON.parse(text).items;
   if(actual.ok!==true||JSON.stringify(actual.items)!==JSON.stringify(expected))throw Error('SHARED_BUSINESS_READ_FAILED');
   var receipt={ok:true,kind:'opportunities-cutover-v1',sourceId:id,revision:read.revision,sha256:read.sha256,itemCount:expected.length,businessDataUnchanged:true,driveUnchanged:true,idempotent:true,at:new Date().toISOString(),originalsDeleted:0};
   props.setProperty('CDQ_SYSTEM_OPPORTUNITIES_RECEIPT_V1',JSON.stringify(receipt));console.log(JSON.stringify(receipt));return receipt;
  }finally{lock.releaseLock();}
 });
}
