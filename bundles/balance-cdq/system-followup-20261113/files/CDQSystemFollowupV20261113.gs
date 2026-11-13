/* Each follow-up business operation commits once, with compare-and-swap.
 * This context is per Google Apps Script execution, not a shared Worker global.
 */
var CDQ_FOLLOWUP_CONTEXT_V20261113_=null;
var CDQ_FOLLOWUP_ID_V20261113_='1X3bg-1fheA4DRogGfzXI8scLCg5-w2T5wyqpJio5F-Y';
function cdqFollowupCallV20261113_(actor,action,payload,intent){
 var e=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload,scope:{store:'followup-v1',role:normaliserRoleCDQ_(actor.role),intent:intent||'business'}});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(e),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
 var r;try{r=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('FOLLOWUP_RESPONSE_INVALID');}
 if(response.getResponseCode()!==200||r.ok!==true||r.kind!=='system-followup-v1')throw Error(r&&r.code==='FOLLOWUP_CONFLICT'?'Le suivi a changé. Actualisez avant de recommencer.':'FOLLOWUP_UNCONFIRMED_'+String(r&&r.code||response.getResponseCode()));
 return r.result;
}
function cdqFollowupDecodeV20261113_(r){
 if(r.state!=='ok'||r.id!==CDQ_FOLLOWUP_ID_V20261113_||!Number.isSafeInteger(r.revision)||r.revision<1)throw Error('FOLLOWUP_DOCUMENT_INVALID');
 var b=Utilities.base64Decode(r.contentBase64);if(b.length!==r.bytes||cdqCoordMigrationHashV20261113_(b)!==r.sha256)throw Error('FOLLOWUP_INTEGRITY');
 var d=JSON.parse(Utilities.newBlob(b).getDataAsString('UTF-8'));if(d.schema!==1||d.id!==r.id||d.name!=='_CDQ_Suivi_Technique'||!Array.isArray(d.tabs))throw Error('FOLLOWUP_SCHEMA_INVALID');return d;
}
function cdqFollowupTxnV20261113_(operation,run){
 if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_FOLLOWUP_V1')!=='on'){var legacyLock=LockService.getScriptLock(),held=legacyLock.hasLock();if(!held)legacyLock.waitLock(30000);try{if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_FOLLOWUP_V1')==='on')return cdqFollowupTxnV20261113_(operation,run);return run();}finally{if(!held)legacyLock.releaseLock();}}
 if(CDQ_FOLLOWUP_CONTEXT_V20261113_){try{return run();}catch(e){CDQ_FOLLOWUP_CONTEXT_V20261113_.failed=true;throw e;}}
 var c={actor:verifierDroit_('lecture'),operation:operation,doc:null,data:null,dirty:false,failed:false};CDQ_FOLLOWUP_CONTEXT_V20261113_=c;
 try{
  var result=run();if(c.failed)throw Error('FOLLOWUP_TRANSACTION_ABORTED');
  if(c.dirty){
   var b=Utilities.newBlob(JSON.stringify(c.data)).getBytes(),hash=cdqCoordMigrationHashV20261113_(b),p={id:CDQ_FOLLOWUP_ID_V20261113_,requestId:'followup-'+Utilities.getUuid(),expectedRevision:c.doc.revision,expectedSha256:c.doc.sha256,contentBase64:Utilities.base64Encode(b)};
   var intent=['cdqV72SyncCurrentNc_','obtenirResumeSuiviTechniqueCDQV72','obtenirNonConformitesGroupeesCDQV72'].indexOf(operation)>=0?'derived-sync':'business';
   var receipt=cdqFollowupCallV20261113_(c.actor,'systemFollowupWriteV1',p,intent);
   if(!['updated','replayed'].includes(receipt.state)||receipt.id!==p.id||receipt.revision!==p.expectedRevision+1||receipt.sha256!==hash)throw Error('FOLLOWUP_WRITE_UNCONFIRMED');
  }
  return result;
 }finally{CDQ_FOLLOWUP_CONTEXT_V20261113_=null;}
}
function cdqFollowupCellV20261113_(v,encode){
 if(encode){if(v instanceof Date)return{__cdqDate:v.toISOString()};if(v==null)return '';if(['string','number','boolean'].indexOf(typeof v)<0||typeof v==='number'&&!isFinite(v))throw Error('FOLLOWUP_CELL_INVALID');return v;}
 return v&&typeof v==='object'&&v.__cdqDate?new Date(v.__cdqDate):(v==null?'':v);
}
function cdqSuiviBookCloudV20261113_(){
 var c=CDQ_FOLLOWUP_CONTEXT_V20261113_;if(!c)throw Error('FOLLOWUP_TRANSACTION_REQUIRED');
 if(!c.data){c.doc=cdqFollowupCallV20261113_(c.actor,'systemFollowupReadV1',{id:CDQ_FOLLOWUP_ID_V20261113_});c.data=cdqFollowupDecodeV20261113_(c.doc);}
 function sheet(name){
  var t=c.data.tabs.filter(function(x){return x.name===name;})[0];if(!t)throw Error('FOLLOWUP_TAB_MISSING');
  var sh={getLastRow:function(){return t.rows.length;},getLastColumn:function(){return t.rows.reduce(function(n,r){return Math.max(n,r.length);},0);},getName:function(){return name;},getRange:function(row,col,numRows,numCols){
   numRows=numRows==null?1:numRows;numCols=numCols==null?1:numCols;
   if(![row,col,numRows,numCols].every(function(n){return Number.isSafeInteger(n)&&n>=1;})||row+numRows>10002||col+numCols>102)throw Error('FOLLOWUP_RANGE_INVALID');
   var range={getValues:function(){var a=[];for(var i=0;i<numRows;i++){var r=[];for(var j=0;j<numCols;j++)r.push(cdqFollowupCellV20261113_((t.rows[row-1+i]||[])[col-1+j],false));a.push(r);}return a;},setValues:function(values){
    if(!Array.isArray(values)||values.length!==numRows||values.some(function(r){return !Array.isArray(r)||r.length!==numCols;}))throw Error('FOLLOWUP_RANGE_SHAPE');
    if(row===1)throw Error('FOLLOWUP_HEADERS_IMMUTABLE');
    values.forEach(function(r,i){while(t.rows.length<row+i)t.rows.push([]);for(var j=0;j<numCols;j++){var target=t.rows[row-1+i];while(target.length<col+j)target.push('');target[col-1+j]=cdqFollowupCellV20261113_(r[j],true);}});c.dirty=true;return range;
   },setValue:function(value){if(numRows!==1||numCols!==1)throw Error('FOLLOWUP_SCALAR_RANGE');return range.setValues([[value]]);}};return range;
  },appendRow:function(values){sh.getRange(t.rows.length+1,1,1,values.length).setValues([values]);return sh;}};return sh;
 }
 return{ss:{getId:function(){return c.data.id;}},nc:sheet('NonConformites'),w:sheet('Surveillances'),notes:sheet('Notes')};
}
function cdqFollowupSnapshotV20261113_(){
 var id=CDQ_FOLLOWUP_ID_V20261113_,meta=Drive.Files.get(id,{fields:'id,name,mimeType,parents,modifiedTime,trashed',supportsAllDrives:true});
 if(meta.trashed||meta.name!=='_CDQ_Suivi_Technique'||meta.mimeType!=='application/vnd.google-apps.spreadsheet'||meta.parents.length!==1||meta.parents[0]!==CDQ_WS_SYSTEM_V2638_)throw Error('FOLLOWUP_DRIVE_IDENTITY');
 var ss=SpreadsheetApp.openById(id),tabs=ss.getSheets().map(function(sh){
  var r=sh.getDataRange(),formulas=r.getFormulas();if(formulas.some(function(row){return row.some(function(v){return !!v;});}))throw Error('FOLLOWUP_FORMULA_REQUIRES_MIGRATION');
  var rows=r.getValues().map(function(row){var a=row.map(function(v){return cdqFollowupCellV20261113_(v,true);});while(a.length&&a[a.length-1]==='')a.pop();return a;});while(rows.length&&!rows[rows.length-1].length)rows.pop();return {name:sh.getName(),rows:rows};
 });
 if(Drive.Files.get(id,{fields:'modifiedTime',supportsAllDrives:true}).modifiedTime!==meta.modifiedTime)throw Error('FOLLOWUP_DRIVE_CHANGED');
 var d={schema:1,id:id,name:meta.name,tabs:tabs},bytes=Utilities.newBlob(JSON.stringify(d)).getBytes();
 return{data:d,bytes:bytes,sha256:cdqCoordMigrationHashV20261113_(bytes),modifiedTime:meta.modifiedTime};
}
function cdqMigrerSuiviTechniqueV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
   var props=PropertiesService.getScriptProperties();if(props.getProperty(CDQ_V72_SUIVI_FILE_PROP_)!==CDQ_FOLLOWUP_ID_V20261113_)throw Error('FOLLOWUP_CONFIG_CHANGED');
   var before=cdqFollowupSnapshotV20261113_(),existing=cdqFollowupCallV20261113_(actor,'systemFollowupReadV1',{id:CDQ_FOLLOWUP_ID_V20261113_});
   if(existing.state==='missing'){
    var payload={id:CDQ_FOLLOWUP_ID_V20261113_,requestId:'followup-import-'+Utilities.getUuid(),sourceSha256:before.sha256,contentBase64:Utilities.base64Encode(before.bytes),validateOnly:true};
    var valid=cdqFollowupCallV20261113_(actor,'systemFollowupImportV1',payload);if(valid.state!=='validated'||valid.sha256!==before.sha256)throw Error('FOLLOWUP_VALIDATION_UNCONFIRMED');
    delete payload.validateOnly;props.setProperty('CDQ_SYSTEM_FOLLOWUP_V1','on');
    var imported=cdqFollowupCallV20261113_(actor,'systemFollowupImportV1',payload);
    if(imported.state!=='imported'||imported.sha256!==before.sha256)throw Error('FOLLOWUP_IMPORT_UNCONFIRMED');
   }else if(props.getProperty('CDQ_SYSTEM_FOLLOWUP_V1')!=='on')throw Error('FOLLOWUP_ACTIVE_WITHOUT_ROUTE');
   var read=cdqFollowupCallV20261113_(actor,'systemFollowupReadV1',{id:CDQ_FOLLOWUP_ID_V20261113_}),data=cdqFollowupDecodeV20261113_(read);
   if(existing.state==='missing'&&read.sha256!==before.sha256)throw Error('FOLLOWUP_CUTOVER_HASH');
   var p={id:read.id,requestId:'followup-qa-'+Utilities.getUuid(),expectedRevision:read.revision,expectedSha256:read.sha256,contentBase64:read.contentBase64};
   var write=cdqFollowupCallV20261113_(actor,'systemFollowupWriteV1',p),replay=cdqFollowupCallV20261113_(actor,'systemFollowupWriteV1',p),after=cdqFollowupCallV20261113_(actor,'systemFollowupReadV1',{id:read.id});
   if(write.revision!==read.revision+1||replay.state!=='replayed'||replay.revision!==write.revision||replay.sha256!==read.sha256||after.sha256!==read.sha256)throw Error('FOLLOWUP_ROUNDTRIP_FAILED');
   cdqFollowupDecodeV20261113_(after);
   if(cdqFollowupSnapshotV20261113_().sha256!==before.sha256)throw Error('FOLLOWUP_DRIVE_CHANGED');
   var check=cdqFollowupTxnV20261113_('migration-read',function(){var b=cdqV72SuiviBook_();return{nc:cdqV72Rows_(b.nc,CDQ_V72_NC_HEADERS_).length,w:cdqV72Rows_(b.w,CDQ_V72_W_HEADERS_).length,notes:cdqV72Rows_(b.notes,CDQ_V72_NOTE_HEADERS_).length};});
   var result={ok:true,kind:'followup-cutover-v1',revision:after.revision,sha256:after.sha256,rows:check,tabs:data.tabs.length,driveUnchanged:true,idempotent:true,at:new Date().toISOString(),originalsDeleted:0};props.setProperty('CDQ_SYSTEM_FOLLOWUP_RECEIPT_V1',JSON.stringify(result));console.log(JSON.stringify(result));return result;
  }finally{lock.releaseLock();}
 });
}
function cdqVerifierSuiviTechniqueTestV20261113(){
 return cdqCoordMigrationOwnerV20261113_(function(actor){
  if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_FOLLOWUP_V1')!=='on')throw Error('FOLLOWUP_ROUTE_INACTIVE');
  var id='1QKv31bNO3bUh3uv11BJJqw9WXVvxR6k0',client=DriveApp.getFolderById(id);if(client.getName()!=='CDQ TEST V2756 20261021')throw Error('FOLLOWUP_TEST_CLIENT_CHANGED');
  var before=cdqFollowupSnapshotV20261113_().sha256;
  var created=ajouterSurveillanceV72(id,'TEST TECHNIQUE — stockage Cloudflare','Essai de migration, sans intervention client.','','');
  ajouterNoteSuiviV72('watch',created.watchId,id,'TEST — ajout de note dans Cloudflare.');
  cloturerSurveillanceCDQV72(created.watchId,'TEST terminé — création, annotation et clôture vérifiées.');
  var found=obtenirSurveillancesGroupeesCDQV72().filter(function(x){return x.watchId===created.watchId;})[0];
  if(!found||found.etat!=='REGLEE'||found.notes.length!==2||!/^20\d\d-/.test(found.dateCreation)||!/^20\d\d-/.test(found.dateFermeture))throw Error('FOLLOWUP_TEST_FAILED');
  if(cdqFollowupSnapshotV20261113_().sha256!==before)throw Error('FOLLOWUP_TEST_STILL_WRITES_DRIVE');
  var result={ok:true,kind:'followup-business-test-v1',clientId:id,watchId:created.watchId,state:found.etat,notes:found.notes.length,datesPreserved:true,driveUnchanged:true,at:new Date().toISOString()};console.log(JSON.stringify(result));return result;
 });
}
