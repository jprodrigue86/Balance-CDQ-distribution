/* Each follow-up business operation commits once, with compare-and-swap.
 * This context is per Google Apps Script execution, not a shared Worker global.
 */
var CDQ_BILLING_CONTEXT_V20261113_=null;
var CDQ_BILLING_ID_V20261113_='cdq-billing-v1';
function cdqBillingCallV20261113_(actor,action,payload,intent){
 var e=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:normaliserEmailCDQ_(actor.email),action:action,payload:payload,scope:{store:'billing-v1',role:normaliserRoleCDQ_(actor.role),intent:intent||'business'}});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(e),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
 var r;try{r=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('BILLING_RESPONSE_INVALID');}
 if(response.getResponseCode()!==200||r.ok!==true||r.kind!=='system-billing-v1')throw Error(r&&r.code==='BILLING_CONFLICT'?'Le suivi a changé. Actualisez avant de recommencer.':'BILLING_UNCONFIRMED_'+String(r&&r.code||response.getResponseCode()));
 return r.result;
}
function cdqBillingDecodeV20261113_(r){
 if(r.state!=='ok'||r.id!==CDQ_BILLING_ID_V20261113_||!Number.isSafeInteger(r.revision)||r.revision<1)throw Error('BILLING_DOCUMENT_INVALID');
 var b=Utilities.base64Decode(r.contentBase64);if(b.length!==r.bytes||cdqCoordMigrationHashV20261113_(b)!==r.sha256)throw Error('BILLING_INTEGRITY');
 var d=JSON.parse(Utilities.newBlob(b).getDataAsString('UTF-8'));if(d.schema!==1||d.id!==r.id||d.name!=='_CDQ_Factures'||!Array.isArray(d.tabs))throw Error('BILLING_SCHEMA_INVALID');return d;
}
function cdqBillingTxnV20261113_(operation,run){
 if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_BILLING_V1')!=='on'){var legacyLock=LockService.getScriptLock(),held=legacyLock.hasLock();if(!held)legacyLock.waitLock(30000);try{if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_BILLING_V1')==='on')return cdqBillingTxnV20261113_(operation,run);return run();}finally{if(!held)legacyLock.releaseLock();}}
 if(CDQ_BILLING_CONTEXT_V20261113_){try{return run();}catch(e){CDQ_BILLING_CONTEXT_V20261113_.failed=true;throw e;}}
 var c={actor:verifierDroit_('lecture'),operation:operation,doc:null,data:null,dirty:false,failed:false};CDQ_BILLING_CONTEXT_V20261113_=c;
 try{
  var result=run();if(c.failed)throw Error('BILLING_TRANSACTION_ABORTED');
  if(c.dirty){
   var b=Utilities.newBlob(JSON.stringify(c.data)).getBytes(),hash=cdqCoordMigrationHashV20261113_(b),p={id:CDQ_BILLING_ID_V20261113_,requestId:'billing-'+Utilities.getUuid(),expectedRevision:c.doc.revision,expectedSha256:c.doc.sha256,contentBase64:Utilities.base64Encode(b)};
   var intent='business';
   var receipt=cdqBillingCallV20261113_(c.actor,'systemBillingWriteV1',p,intent);
   if(!['updated','replayed'].includes(receipt.state)||receipt.id!==p.id||receipt.revision!==p.expectedRevision+1||receipt.sha256!==hash)throw Error('BILLING_WRITE_UNCONFIRMED');
  }
  return result;
 }finally{CDQ_BILLING_CONTEXT_V20261113_=null;}
}
function cdqBillingCellV20261113_(v,encode){
 if(encode){if(v instanceof Date)return{__cdqDate:v.toISOString()};if(v==null)return '';if(['string','number','boolean'].indexOf(typeof v)<0||typeof v==='number'&&!isFinite(v))throw Error('BILLING_CELL_INVALID');return v;}
 return v&&typeof v==='object'&&v.__cdqDate?new Date(v.__cdqDate):(v==null?'':v);
}
function cdqBillingBookCloudV20261113_(){
 var c=CDQ_BILLING_CONTEXT_V20261113_;if(!c)throw Error('BILLING_TRANSACTION_REQUIRED');
 if(!c.data){c.doc=cdqBillingCallV20261113_(c.actor,'systemBillingReadV1',{id:CDQ_BILLING_ID_V20261113_});c.data=cdqBillingDecodeV20261113_(c.doc);}
 function sheet(name){
  var t=c.data.tabs.filter(function(x){return x.name===name;})[0];if(!t)throw Error('BILLING_TAB_MISSING');
  var sh={getLastRow:function(){return t.rows.length;},getLastColumn:function(){return t.rows.reduce(function(n,r){return Math.max(n,r.length);},0);},getName:function(){return name;},getRange:function(row,col,numRows,numCols){
   numRows=numRows==null?1:numRows;numCols=numCols==null?1:numCols;
   if(![row,col,numRows,numCols].every(function(n){return Number.isSafeInteger(n)&&n>=1;})||row+numRows>10002||col+numCols>102)throw Error('BILLING_RANGE_INVALID');
   var range={getValues:function(){var a=[];for(var i=0;i<numRows;i++){var r=[];for(var j=0;j<numCols;j++)r.push(cdqBillingCellV20261113_((t.rows[row-1+i]||[])[col-1+j],false));a.push(r);}return a;},setValues:function(values){
    if(!Array.isArray(values)||values.length!==numRows||values.some(function(r){return !Array.isArray(r)||r.length!==numCols;}))throw Error('BILLING_RANGE_SHAPE');
    if(row===1)throw Error('BILLING_HEADERS_IMMUTABLE');
    values.forEach(function(r,i){while(t.rows.length<row+i)t.rows.push([]);for(var j=0;j<numCols;j++){var target=t.rows[row-1+i];while(target.length<col+j)target.push('');target[col-1+j]=cdqBillingCellV20261113_(r[j],true);}});c.dirty=true;return range;
   },setValue:function(value){if(numRows!==1||numCols!==1)throw Error('BILLING_SCALAR_RANGE');return range.setValues([[value]]);}};return range;
  },appendRow:function(values){sh.getRange(t.rows.length+1,1,1,values.length).setValues([values]);return sh;}};return sh;
 }
 return{ss:{getId:function(){return c.data.id;}},sh:sheet('Factures')};
}
