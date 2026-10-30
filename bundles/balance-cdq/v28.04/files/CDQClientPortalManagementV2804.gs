/* CDQ V28.04 — PDF management for authenticated CDQ application sessions only.
 * The public QR portal remains GET-only and has no delete endpoint.
 * Removal is logical (removed_at): historical Drive archives remain untouched.
 */
function cdqClientPortalListV20261030_(clientId,before,after){
 var access=cdqClientPortalScopeV20261028_(clientId);
 var cursorTime=before==null||before===''?'':Number(before),cursorId=String(after||'');
 if(cursorTime!==''&&(!Number.isSafeInteger(cursorTime)||cursorTime<0))throw Error('INVALID_PORTAL_CURSOR : date invalide.');
 if(cursorId&&!/^[a-f0-9]{64}$/.test(cursorId))throw Error('INVALID_PORTAL_CURSOR : pagination invalide.');
 var info=cdqReportEngineCallV2754_(access.actor,'portalLink',
  {clientId:access.scope.clientId,clientName:access.clientName},access.scope);
 var token=String(info&&info.token||'');
 if(!/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token))throw Error('PORTAL_LIST_UNAVAILABLE : lien privé non disponible.');
 var base=String(cdqReportEngineConfigV2754_().url||'').replace(/\/+$/,'');
 if(!/^https:\/\/[a-z0-9-]+\.balance-cdq\.workers\.dev$/.test(base))throw Error('PORTAL_CONFIGURATION : adresse invalide.');
 var q=cursorTime===''?'':'?before='+encodeURIComponent(String(cursorTime))+'&after='+encodeURIComponent(cursorId);
 var response=UrlFetchApp.fetch(base+'/client/api/documents'+q,{
  method:'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true,followRedirects:false
 });
 // Never include the URL fragment/token or the upstream response in logs/errors.
 if(response.getResponseCode()!==200)throw Error('PORTAL_LIST_UNAVAILABLE : liste inaccessible.');
 var data;try{data=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('PORTAL_LIST_UNAVAILABLE : réponse invalide.');}
 if(!data||!Array.isArray(data.documents)||data.documents.length>100)throw Error('PORTAL_LIST_UNAVAILABLE : liste incorrecte.');
 var docs=data.documents.map(function(d){
  if(!d||!/^[a-f0-9]{64}$/.test(String(d.document_id||''))||typeof d.name!=='string'||d.name.length>220||
     !Number.isSafeInteger(d.created_at)||!Number.isSafeInteger(d.byte_size)||d.byte_size<0)
    throw Error('PORTAL_LIST_UNAVAILABLE : document invalide.');
  return {documentId:d.document_id,name:d.name,size:d.byte_size,createdAt:d.created_at};
 });
 var next=null;
 if(data.next){
  var t=Number(data.next.before),a=String(data.next.after||'');
  if(!Number.isSafeInteger(t)||t<0||!/^[a-f0-9]{64}$/.test(a))throw Error('PORTAL_LIST_UNAVAILABLE : pagination invalide.');
  next={before:t,after:a};
 }
 return {ok:true,documents:docs,next:next};
}

function cdqClientPortalRemoveManyV20261030_(clientId,documentIds){
 if(!Array.isArray(documentIds)||documentIds.length<1||documentIds.length>20)
  throw Error('INVALID_PORTAL_DOCUMENT : sélection de 1 à 20 PDF requise.');
 var ids=documentIds.map(function(id){return String(id||'');});
 if(ids.some(function(id){return !/^[a-f0-9]{64}$/.test(id);})||Object.keys(ids.reduce(function(a,id){a[id]=true;return a;},{})).length!==ids.length)
  throw Error('INVALID_PORTAL_DOCUMENT : identifiants invalides ou répétés.');
 var access=cdqClientPortalScopeV20261028_(clientId),results=[];
 for(var i=0;i<ids.length;i++){
  try{
   var r=cdqReportEngineCallV2754_(access.actor,'portalRemove',
    {clientId:access.scope.clientId,documentId:ids[i]},access.scope);
   if(!r||r.ok!==true||r.removed!==true)throw Error('PORTAL_REMOVE_UNCONFIRMED');
   results.push({documentId:ids[i],removed:true});
  }catch(_){
   // Stop on the first failure: do not retry or falsely claim a complete batch.
   results.push({documentId:ids[i],removed:false});
   return {ok:false,removed:results.filter(function(x){return x.removed;}).length,results:results,stopped:true};
  }
 }
 return {ok:true,removed:results.length,results:results};
}

function cdqClientPortalManagementV2804(action,payload){
 var p=payload||{};
 if(action==='list')return cdqClientPortalListV20261030_(p.clientId,p.before,p.after);
 if(action==='removeMany')return cdqClientPortalRemoveManyV20261030_(p.clientId,p.documentIds);
 throw Error('UNKNOWN_PORTAL_ACTION : action de gestion inconnue.');
}
