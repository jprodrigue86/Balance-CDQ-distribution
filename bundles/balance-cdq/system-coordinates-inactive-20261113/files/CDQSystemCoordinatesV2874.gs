/** Server-only adapter for an explicitly migrated cohort of existing records.
 * No activation property is created by this module. Unmapped clients use Drive.
 * A mapped client never falls back to a stale Drive copy after a cloud failure.
 */
function cdqCoordinatesRouteV2874_(clientId){
  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('CDQ_SYSTEM_COORDINATES_V1')!=='on')return null;
  var raw=props.getProperty('CDQ_SYSTEM_COORDINATES_MAP_V1'),map;
  try{map=JSON.parse(raw||'{}');}catch(_){throw Error('Configuration des coordonnées invalide.');}
  if(!map||typeof map!=='object'||Array.isArray(map))throw Error('Configuration des coordonnées invalide.');
  if(!Object.prototype.hasOwnProperty.call(map,clientId))return null;
  var id=map[clientId];
  if(!/^[A-Za-z0-9_-]{12,130}$/.test(String(clientId))||typeof id!=='string'||!/^[A-Za-z0-9_-]{12,130}$/.test(id))throw Error('Correspondance des coordonnées invalide.');
  return id;
}
function cdqCoordinatesCallV2874_(scope,id,write,extra){
  var payload={clientId:scope.clientId,sourceDriveId:id};
  Object.keys(extra||{}).forEach(function(k){payload[k]=extra[k];});
  var envelope=cdqReportEngineEnvelopeV2754_('gas-to-engine',{
    actor:normaliserEmailCDQ_(scope.actor.email),action:write?'systemCoordinatesWriteV1':'systemCoordinatesReadV1',
    payload:payload,scope:{clientId:scope.clientId}
  });
  var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{
    method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},
    payload:JSON.stringify(envelope),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true
  });
  var result;try{result=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('La fiche centrale est temporairement indisponible. Réessayez.');}
  if(response.getResponseCode()===409&&result.code==='COORDINATES_CONFLICT')throw Error('COORDINATES_CONFLICT');
  if(response.getResponseCode()!==200||result?.ok!==true||result.sourceId!==id||result.cloudActive!==true||!Number.isSafeInteger(result.revision)||result.revision<1||!/^[a-f0-9]{64}$/.test(result.sha256||'')||result.kind!==(write?'system-coordinates-write-v1':'system-coordinates-v1'))throw Error('La fiche centrale est temporairement indisponible. Réessayez.');
  return result;
}
function cdqCoordinatesFileV2874_(clientId){
  var id=cdqCoordinatesRouteV2874_(clientId);if(!id)return null;
  var scope=cdqContactScopeV2866_(clientId,false),result=cdqCoordinatesCallV2874_(scope,id,false,{}),bytes,data;
  try{
    if(typeof result.contentBase64!=='string'||result.contentBase64.length>349528)throw Error();
    bytes=Utilities.base64Decode(result.contentBase64);if(!bytes.length||bytes.length>262144)throw Error();
    var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(n){return ('0'+((n+256)%256).toString(16)).slice(-2);}).join('');
    if(digest!==result.sha256)throw Error();
    data=JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8'));
    if(data.schema!==1||data.clientId!==scope.clientId||!Number.isSafeInteger(data.revision)||data.revision<1||!Array.isArray(data.sites)||!data.sites.length)throw Error();
  }catch(_){throw Error('La fiche centrale doit être vérifiée.');}
  return {id:id,mimeType:'application/json',cdqCloudV2874:true,cloudRevision:result.revision,cloudSha256:result.sha256,data:data};
}
function cdqCoordinatesSaveV2874_(scope,file,next){
  if(cdqCoordinatesRouteV2874_(scope.clientId)!==file.id)throw Error('La destination de la fiche a changé. Rouvrez les coordonnées.');
  var current=cdqContactScopeV2866_(scope.clientId,true);
  if(normaliserEmailCDQ_(current.actor.email)!==normaliserEmailCDQ_(scope.actor.email))throw Error('Le compte a changé.');
  var bytes=Utilities.newBlob(JSON.stringify(next),'application/json').getBytes();
  if(bytes.length>262144)throw Error('La fiche dépasse la taille autorisée.');
  var hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(n){return ('0'+((n+256)%256).toString(16)).slice(-2);}).join('');
  var result=cdqCoordinatesCallV2874_(current,file.id,true,{requestId:next.requestId,expectedRevision:file.cloudRevision,expectedSha256:file.cloudSha256,contentBase64:Utilities.base64Encode(bytes)});
  if(result.requestId!==next.requestId||result.sha256!==hash||result.revision!==file.cloudRevision+1)throw Error('La sauvegarde centrale n’a pas été confirmée. Réessayez sans modifier votre saisie.');
}
