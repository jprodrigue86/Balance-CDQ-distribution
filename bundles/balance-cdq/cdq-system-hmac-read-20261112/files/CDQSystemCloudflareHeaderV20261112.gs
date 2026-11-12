/**
 * Preparation only. Use the existing report-engine HMAC secret and /v1/rpc.
 * New opt-in header dispatches to the isolated system-digest wrapper; no public
 * RPC for the CDQ app, no OAuth/token is returned, Drive remains primary.
 * Inactive unless a server-only Script Property is explicitly enabled.
 */
function cdqSystemCFScopedDigestV20261112_(clientId,sourceDriveId){
  if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_DIGEST_TEST_V1')!=='on')
    throw Error('CDQ_SYSTEM_DIGEST_DISABLED');
  var client=String(clientId||'').trim(),id=String(sourceDriveId||'').trim();
  if(!/^[A-Za-z0-9_-]{12,100}$/.test(client)||!/^[A-Za-z0-9_-]{12,130}$/.test(id))
    throw Error('CDQ_SYSTEM_DIGEST_INVALID_SCOPE');
  var scope=cdqReportEngineScopeV2754_({clientId:client},false);
  if(!scope||scope.clientId!==client)throw Error('CDQ_SYSTEM_DIGEST_INVALID_SCOPE');
  var actor=cdqWsAccessV2638_(false),category='coordonnees';
  var envelope=cdqReportEngineEnvelopeV2754_('gas-to-engine',{
    actor:normaliserEmailCDQ_(actor.email),action:'systemStagedDigestV1',
    payload:{clientId:client,sourceDriveId:id,category:category},scope:scope
  });
  var config=cdqReportEngineConfigV2754_();
  var response=UrlFetchApp.fetch(config.url+'/v1/rpc',{
    method:'post',contentType:'application/json',headers:{'x-cdq-system-digest':'v1'},
    payload:JSON.stringify(envelope),muteHttpExceptions:true,followRedirects:false,
    validateHttpsCertificates:true
  });
  var result;try{result=JSON.parse(response.getContentText('UTF-8'));}
  catch(_){throw Error('CDQ_SYSTEM_DIGEST_UNAVAILABLE');}
  if(response.getResponseCode()!==200||!result||result.ok!==true||
     result.kind!=='system-staged-digest-v1'||result.category!==category||
     result.sourceId!==id||result.driveAuthoritative!==true||result.noWrites!==true||
     result.cloudActive!==false||!/^[a-f0-9]{64}$/.test(result.sha256||'')||
     !Number.isSafeInteger(result.revision)||result.revision<1||
     !Number.isSafeInteger(result.bytes)||result.bytes<1||result.bytes>262144)
    throw Error('CDQ_SYSTEM_DIGEST_UNVERIFIED');
  return {ok:true,sourceId:id,category:category,sha256:result.sha256,
    bytes:result.bytes,revision:result.revision,driveAuthoritative:true,noWrites:true};
}
