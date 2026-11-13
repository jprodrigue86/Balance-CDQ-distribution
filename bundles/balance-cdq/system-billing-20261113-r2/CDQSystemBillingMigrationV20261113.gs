function cdqBillingSnapshotV20261113_(){
 var props=PropertiesService.getScriptProperties(),id=String(props.getProperty(CDQ_FACTURES_PROP_ID_)||'').trim(),tabs=[],meta=null;
 if(id){
  meta=Drive.Files.get(id,{fields:'id,name,mimeType,parents,modifiedTime,trashed',supportsAllDrives:true});
  if(meta.trashed||meta.name!=='_CDQ_Factures'||meta.mimeType!=='application/vnd.google-apps.spreadsheet')throw Error('BILLING_SOURCE_IDENTITY');
  var ss=SpreadsheetApp.openById(id);tabs=ss.getSheets().map(function(sh){
   var range=sh.getDataRange();if(range.getFormulas().some(function(r){return r.some(function(v){return !!v;});}))throw Error('BILLING_FORMULAS_REQUIRE_REVIEW');
   var rows=range.getValues().map(function(r){var a=r.map(function(v){return cdqBillingCellV20261113_(v,true);});while(a.length&&a[a.length-1]==='')a.pop();return a;});while(rows.length&&!rows[rows.length-1].length)rows.pop();return{name:sh.getName(),rows:rows};
  });
  if(Drive.Files.get(id,{fields:'modifiedTime',supportsAllDrives:true}).modifiedTime!==meta.modifiedTime)throw Error('BILLING_SOURCE_CHANGED');
 }else{
  // An unconfigured legacy book must not be silently ignored or created.
  var existing=Drive.Files.list({q:"name = '_CDQ_Factures' and trashed = false",fields:'nextPageToken,files(id)',pageSize:100,supportsAllDrives:true,includeItemsFromAllDrives:true});
  if(existing.nextPageToken||(existing.files||[]).length)throw Error('BILLING_UNCONFIGURED_SOURCE');
  tabs=[{name:'Factures',rows:[CDQ_FACTURES_HEADERS_.slice()]}];
 }
 var t=tabs.filter(function(x){return x.name==='Factures';})[0];if(!t||JSON.stringify(t.rows[0])!==JSON.stringify(CDQ_FACTURES_HEADERS_))throw Error('BILLING_HEADERS_CHANGED');
 if(String(props.getProperty(CDQ_FACTURES_PROP_ID_)||'').trim()!==id)throw Error('BILLING_PROPERTY_CHANGED');
 var data={schema:1,id:CDQ_BILLING_ID_V20261113_,name:'_CDQ_Factures',sourceDriveId:id,tabs:tabs},bytes=Utilities.newBlob(JSON.stringify(data)).getBytes();
 return{data:data,bytes:bytes,sha256:cdqCoordMigrationHashV20261113_(bytes),sourceId:id,modifiedTime:meta?meta.modifiedTime:null,rows:t.rows.length-1};
}
function cdqAuditerFacturationV20261113(){return cdqCoordMigrationOwnerV20261113_(function(){var s=cdqBillingSnapshotV20261113_(),r={ok:true,kind:'billing-inventory-v1',sourceId:s.sourceId,rows:s.rows,tabs:s.data.tabs.length,bytes:s.bytes.length,sha256:s.sha256};console.log(JSON.stringify(r));return r;});}
function cdqMigrerFacturationV20261113(){return cdqCoordMigrationOwnerV20261113_(function(actor){
 var lock=LockService.getScriptLock();lock.waitLock(30000);try{
  var props=PropertiesService.getScriptProperties(),before=cdqBillingSnapshotV20261113_(),prior=cdqBillingCallV20261113_(actor,'systemBillingReadV1',{id:CDQ_BILLING_ID_V20261113_});
  if(prior.state==='missing'){
   var p={id:CDQ_BILLING_ID_V20261113_,requestId:'billing-import-'+Utilities.getUuid(),contentBase64:Utilities.base64Encode(before.bytes),sourceSha256:before.sha256,validateOnly:true};
   var checked=cdqBillingCallV20261113_(actor,'systemBillingImportV1',p);if(checked.state!=='validated'||checked.sha256!==before.sha256)throw Error('BILLING_VALIDATION_UNCONFIRMED');
   delete p.validateOnly;props.setProperty('CDQ_SYSTEM_BILLING_V1','on');
   var imported=cdqBillingCallV20261113_(actor,'systemBillingImportV1',p);if(imported.state!=='imported'||imported.sha256!==before.sha256)throw Error('BILLING_IMPORT_UNCONFIRMED');
  }else if(props.getProperty('CDQ_SYSTEM_BILLING_V1')!=='on')throw Error('BILLING_ACTIVE_WITHOUT_ROUTE');
  var read=cdqBillingCallV20261113_(actor,'systemBillingReadV1',{id:CDQ_BILLING_ID_V20261113_});cdqBillingDecodeV20261113_(read);
  if(prior.state==='missing'&&read.sha256!==before.sha256)throw Error('BILLING_CUTOVER_HASH');
  var qa={id:read.id,requestId:'billing-qa-'+Utilities.getUuid(),expectedRevision:read.revision,expectedSha256:read.sha256,contentBase64:read.contentBase64},write=cdqBillingCallV20261113_(actor,'systemBillingWriteV1',qa),replay=cdqBillingCallV20261113_(actor,'systemBillingWriteV1',qa),after=cdqBillingCallV20261113_(actor,'systemBillingReadV1',{id:read.id});
  if(write.revision!==read.revision+1||replay.state!=='replayed'||replay.revision!==write.revision||after.sha256!==read.sha256)throw Error('BILLING_ROUNDTRIP_FAILED');
  if(cdqBillingSnapshotV20261113_().sha256!==before.sha256)throw Error('BILLING_SOURCE_CHANGED');
  var count=cdqBillingTxnV20261113_('migration-read',function(){return lignesFacturesCDQ_().length;});
  var result={ok:true,kind:'billing-cutover-v1',sourceId:before.sourceId,rows:count,revision:after.revision,sha256:after.sha256,driveUnchanged:true,originalsDeleted:0,idempotent:true,at:new Date().toISOString()};props.setProperty('CDQ_SYSTEM_BILLING_RECEIPT_V1',JSON.stringify(result));console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}
});}
