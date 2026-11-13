/* Inventory keeps its business rules. The book is stored privately in R2 and
 * its revision/history in D1. ScriptLock serializes existing Google callers. */
var CDQ_INVENTORY_CONTEXT_V20261113_=null;
var CDQ_INVENTORY_ID_V20261113_='17PIDHtJ5C2-THFEsf-gdK6V0oRrAoljij0spy0IffwI';
function cdqInventoryCallV20261113_(actor,action,payload){
 var e=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload,scope:{store:'inventory-v1',role:normaliserRoleCDQ_(actor.role)}});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(e),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
 var r;try{r=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('INVENTORY_RESPONSE_INVALID');}
 if(response.getResponseCode()!==200||r.ok!==true||r.kind!=='system-inventory-v1')throw Error(r&&r.code==='INVENTORY_CONFLICT'?'L’inventaire a changé. Actualisez avant de recommencer.':'INVENTORY_UNCONFIRMED_'+String(r&&r.code||response.getResponseCode()));return r.result;
}
function cdqInventoryDecodeV20261113_(r){
 if(r.state!=='ok'||r.id!==CDQ_INVENTORY_ID_V20261113_||!Number.isSafeInteger(r.revision)||r.revision<1)throw Error('INVENTORY_DOCUMENT_INVALID');
 var b=Utilities.base64Decode(r.contentBase64);if(b.length!==r.bytes||cdqCoordMigrationHashV20261113_(b)!==r.sha256)throw Error('INVENTORY_INTEGRITY');
 var d=JSON.parse(Utilities.newBlob(b).getDataAsString('UTF-8'));if(d.schema!==1||d.id!==r.id||d.name!=='_CDQ_Inventaire'||d.seedImported!==true||!Array.isArray(d.tabs))throw Error('INVENTORY_SCHEMA_INVALID');return d;
}
function cdqInventoryActorV20261113_(operation){
 if(operation==='cdqZohoWorkerV2642_'||operation==='cdqZohoUpsertV2642_'||operation==='cdqZohoEnrichV2642_')return cdqZohoActorV2642_();
 if(operation==='verifierAlertesInventairePushPeriodique_'){
  var email=normaliserEmailCDQ_(Session.getEffectiveUser().getEmail());if(email!=='jp.rodrigue86@gmail.com')throw Error('INVENTORY_TRIGGER_OWNER_REQUIRED');
  var u=trouverUtilisateurAutoriseParEmail_(email);if(!u||normaliserRoleCDQ_(u.role)!=='admin')throw Error('INVENTORY_TRIGGER_ADMIN_REQUIRED');return u;
 }
 return verifierDroit_('lecture');
}
function cdqInventoryLockV20261113_(){
 if(CDQ_INVENTORY_CONTEXT_V20261113_)return {hasLock:function(){return true;},waitLock:function(){},tryLock:function(){return true;},releaseLock:function(){}};
 return LockService.getScriptLock();
}
function cdqInventoryFlushV20261113_(){
 var c=CDQ_INVENTORY_CONTEXT_V20261113_;if(!c||c.legacy)return;if(c.failed)throw Error('INVENTORY_TRANSACTION_ABORTED');if(!c.dirty)return;
 try{
  var bytes=Utilities.newBlob(JSON.stringify(c.data)).getBytes(),hash=cdqCoordMigrationHashV20261113_(bytes),p={id:CDQ_INVENTORY_ID_V20261113_,requestId:'inventory-'+Utilities.getUuid(),expectedRevision:c.doc.revision,expectedSha256:c.doc.sha256,contentBase64:Utilities.base64Encode(bytes)};
  c.commitAttempted=true;var r=cdqInventoryCallV20261113_(c.actor,'systemInventoryWriteV1',p);
  if(!['updated','replayed'].includes(r.state)||r.id!==p.id||r.revision!==p.expectedRevision+1||r.sha256!==hash)throw Error('INVENTORY_WRITE_UNCONFIRMED');
  c.doc={id:p.id,revision:r.revision,sha256:hash};c.dirty=false;c.commitAttempted=false;
  var after=c.after.splice(0);c.rollback=[];after.forEach(function(fn){try{fn();}catch(e){console.warn('Inventory cleanup deferred: '+e.message);}});
 }catch(e){c.failed=true;throw e;}
}
function cdqInventoryTxnV20261113_(operation,run){
 if(CDQ_INVENTORY_CONTEXT_V20261113_)return run();
 var active=PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_INVENTORY_V1')==='on';
 if(operation==='cdqZohoWorkerV2642_'&&(!cdqZohoConfigV2642_().ready||PropertiesService.getScriptProperties().getProperty('CDQ_ZOHO_ENABLED')!=='true'))return run();
 var lock=LockService.getScriptLock(),held=lock.hasLock();
 if(!held){if(operation==='cdqZohoWorkerV2642_'){if(!lock.tryLock(1000))return;}else lock.waitLock(30000);}
 var c=null;
 try{
  active=PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_INVENTORY_V1')==='on';
  c=active?{actor:cdqInventoryActorV20261113_(operation),operation:operation,doc:null,data:null,dirty:false,failed:false,after:[],rollback:[]}:{legacy:true};
  CDQ_INVENTORY_CONTEXT_V20261113_=c;var result=run();cdqInventoryFlushV20261113_();return result;
 }catch(e){if(c&&!c.legacy&&!c.commitAttempted)(c.rollback||[]).forEach(function(fn){try{fn();}catch(_){}});throw e;}
 finally{CDQ_INVENTORY_CONTEXT_V20261113_=null;if(!held)lock.releaseLock();}
}
function cdqInventoryTrashAfterCommitV20261113_(id){
 var c=CDQ_INVENTORY_CONTEXT_V20261113_,fn=function(){try{cdqMediaInventoryTrashV20261113_(id);}catch(_){}};
 if(c&&!c.legacy)c.after.push(fn);else fn();
}
function cdqInventoryCreatedFileV20261113_(file){
 var c=CDQ_INVENTORY_CONTEXT_V20261113_;if(c&&!c.legacy)c.rollback.push(function(){file.setTrashed(true);});return file;
}
function cdqInventoryBookCloudV20261113_(){
 var c=CDQ_INVENTORY_CONTEXT_V20261113_;if(!c||c.legacy)throw Error('INVENTORY_TRANSACTION_REQUIRED');
 if(!c.data){c.doc=cdqInventoryCallV20261113_(c.actor,'systemInventoryReadV1',{id:CDQ_INVENTORY_ID_V20261113_});c.data=cdqInventoryDecodeV20261113_(c.doc);}
 function sheet(t){
  var sh={getName:function(){return t.name;},getLastRow:function(){return t.rows.length;},getLastColumn:function(){return t.rows.reduce(function(n,r){return Math.max(n,r.length);},0);},setFrozenRows:function(){return sh;},getRange:function(row,col,nr,nc){
   nr=nr==null?1:nr;nc=nc==null?1:nc;if(![row,col,nr,nc].every(function(n){return Number.isSafeInteger(n)&&n>=1;})||row+nr>100002||col+nc>152)throw Error('INVENTORY_RANGE_INVALID');
   var range={getValues:function(){var a=[];for(var i=0;i<nr;i++){var r=[];for(var j=0;j<nc;j++)r.push(cdqFollowupCellV20261113_((t.rows[row-1+i]||[])[col-1+j],false));a.push(r);}return a;},setValues:function(values){
    if(!Array.isArray(values)||values.length!==nr||values.some(function(r){return !Array.isArray(r)||r.length!==nc;}))throw Error('INVENTORY_RANGE_SHAPE');
    if(/_avant_V2623_/.test(t.name))throw Error('INVENTORY_ARCHIVE_IMMUTABLE');
    values.forEach(function(r,i){while(t.rows.length<row+i)t.rows.push([]);for(var j=0;j<nc;j++){var target=t.rows[row-1+i],v=cdqFollowupCellV20261113_(r[j],true);while(target.length<col+j)target.push('');if(JSON.stringify(target[col-1+j])!==JSON.stringify(v)){target[col-1+j]=v;c.dirty=true;}}});return range;
   },setValue:function(v){if(nr!==1||nc!==1)throw Error('INVENTORY_SCALAR_RANGE');return range.setValues([[v]]);}};return range;
  },appendRow:function(values){sh.getRange(t.rows.length+1,1,1,values.length).setValues([values]);return sh;}};return sh;
 }
 return{getId:function(){return c.data.id;},getName:function(){return c.data.name;},getSheets:function(){return c.data.tabs.map(sheet);},getSheetByName:function(name){var t=c.data.tabs.filter(function(t){return t.name===name;})[0];return t?sheet(t):null;},insertSheet:function(name){
  if(!['PrixHistorique','PushTokens','Unites'].includes(name)||c.data.tabs.some(function(t){return t.name===name;}))throw Error('INVENTORY_NEW_TAB_INVALID');var t={name:name,rows:[]};c.data.tabs.push(t);c.dirty=true;return sheet(t);
 }};
}
function cdqInventorySnapshotV20261113_(){
 var id=CDQ_INVENTORY_ID_V20261113_,p=PropertiesService.getScriptProperties();
 if(p.getProperty(CDQ_INVENTAIRE_PROP_ID_)!==id||CDQ_INV_SHEET_ID_V2593!==id||p.getProperty(CDQ_INV_IMPORT_MARKER_V2623)!=='1')throw Error('INVENTORY_CONFIG_CHANGED');
 var meta=Drive.Files.get(id,{fields:'id,name,mimeType,parents,modifiedTime,trashed',supportsAllDrives:true});if(meta.trashed||meta.name!=='_CDQ_Inventaire'||meta.mimeType!=='application/vnd.google-apps.spreadsheet'||meta.parents.length!==1||meta.parents[0]!==CDQ_WS_SYSTEM_V2638_)throw Error('INVENTORY_DRIVE_IDENTITY');
 var tabs=SpreadsheetApp.openById(id).getSheets().map(function(sh){var range=sh.getDataRange();if(range.getFormulas().some(function(r){return r.some(function(x){return !!x;});}))throw Error('INVENTORY_FORMULA_REQUIRES_MIGRATION');var rows=range.getValues().map(function(r){var a=r.map(function(v){return cdqFollowupCellV20261113_(v,true);});while(a.length&&a[a.length-1]==='')a.pop();return a;});while(rows.length&&!rows[rows.length-1].length)rows.pop();return{name:sh.getName(),rows:rows};});
 if(Drive.Files.get(id,{fields:'modifiedTime',supportsAllDrives:true}).modifiedTime!==meta.modifiedTime)throw Error('INVENTORY_DRIVE_CHANGED');
 var d={schema:1,id:id,name:meta.name,seedImported:true,tabs:tabs},bytes=Utilities.newBlob(JSON.stringify(d)).getBytes();return{data:d,bytes:bytes,sha256:cdqCoordMigrationHashV20261113_(bytes)};
}
function cdqMigrerInventaireV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){var lock=LockService.getScriptLock();lock.waitLock(30000);try{
  var props=PropertiesService.getScriptProperties(),before=cdqInventorySnapshotV20261113_(),existing=cdqInventoryCallV20261113_(actor,'systemInventoryReadV1',{id:CDQ_INVENTORY_ID_V20261113_});
  if(existing.state==='missing'){
   var p={id:CDQ_INVENTORY_ID_V20261113_,requestId:'inventory-import-'+Utilities.getUuid(),sourceSha256:before.sha256,contentBase64:Utilities.base64Encode(before.bytes),validateOnly:true};var valid=cdqInventoryCallV20261113_(actor,'systemInventoryImportV1',p);if(valid.state!=='validated'||valid.sha256!==before.sha256)throw Error('INVENTORY_VALIDATION_UNCONFIRMED');delete p.validateOnly;
   props.setProperty('CDQ_SYSTEM_INVENTORY_V1','on');var imported=cdqInventoryCallV20261113_(actor,'systemInventoryImportV1',p);if(imported.state!=='imported'||imported.sha256!==before.sha256)throw Error('INVENTORY_IMPORT_UNCONFIRMED');
  }else if(props.getProperty('CDQ_SYSTEM_INVENTORY_V1')!=='on')throw Error('INVENTORY_ACTIVE_WITHOUT_ROUTE');
  var read=cdqInventoryCallV20261113_(actor,'systemInventoryReadV1',{id:CDQ_INVENTORY_ID_V20261113_}),data=cdqInventoryDecodeV20261113_(read);if(existing.state==='missing'&&read.sha256!==before.sha256)throw Error('INVENTORY_CUTOVER_HASH');
  var q={id:read.id,requestId:'inventory-qa-'+Utilities.getUuid(),expectedRevision:read.revision,expectedSha256:read.sha256,contentBase64:read.contentBase64},write=cdqInventoryCallV20261113_(actor,'systemInventoryWriteV1',q),replay=cdqInventoryCallV20261113_(actor,'systemInventoryWriteV1',q),after=cdqInventoryCallV20261113_(actor,'systemInventoryReadV1',{id:read.id});
  if(write.revision!==read.revision+1||replay.state!=='replayed'||replay.revision!==write.revision||after.sha256!==read.sha256)throw Error('INVENTORY_ROUNDTRIP_FAILED');cdqInventoryDecodeV20261113_(after);
  var real=cdqInventoryGetV2593();if(!Array.isArray(real.articles)||real.articles.length!==data.tabs.filter(function(t){return t.name==='Articles';})[0].rows.slice(1).filter(function(r){return r[0]&&String(r[7])!=='false';}).length)throw Error('INVENTORY_BUSINESS_READ_FAILED');
  if(cdqInventorySnapshotV20261113_().sha256!==before.sha256)throw Error('INVENTORY_DRIVE_CHANGED');
  var result={ok:true,kind:'inventory-cutover-v1',revision:after.revision,sha256:after.sha256,articles:real.articles.length,stocks:real.stocks.length,tabs:data.tabs.length,driveUnchanged:true,idempotent:true,seedNotReimported:true,at:new Date().toISOString(),originalsDeleted:0};props.setProperty('CDQ_SYSTEM_INVENTORY_RECEIPT_V1',JSON.stringify(result));console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}});
}
