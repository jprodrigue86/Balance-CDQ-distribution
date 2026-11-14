/** Server-side Gmail authorization. No access/refresh token leaves this module.
 * Refresh credentials are private ScriptProperties, never Drive/public assets/logs.
 * OAuth client secret remains in Manager, behind the authenticated bridge.
 * Installing this module does not send mail:
 * Each account's Google consent is required. Existing CDQ activations are untouched.
 */
var CDQ_GMAIL_CLIENT_V2874_='764508884818-u4qnjmflg2bbht0e8ja22m8blrbm8nmk.apps.googleusercontent.com';
var CDQ_GMAIL_GRANT_V2874_='CDQ_GMAIL_PRIVATE_GRANT_V2874:';
function cdqGmailBrokerV2874_(email,payload){
 var envelope=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:email,action:'gmailOAuthV2874',payload:payload,
  scope:{store:'gmail-oauth-v2874',role:'internal-oauth',intent:'personal-gmail'}}),response,result;
 try{response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{
  method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},
  payload:JSON.stringify(envelope),followRedirects:false,validateHttpsCertificates:true,muteHttpExceptions:true
 });result=JSON.parse(response.getContentText());}catch(_){throw Error('GMAIL_AUTHORIZATION_UNAVAILABLE');}
 if(response.getResponseCode()!==200||result.ok!==true||result.kind!=='gmail-oauth-v2874'||!result.result||result.result.ok!==true)
  throw Error(/^GMAIL_[A-Z_]+$/.test(result&&result.code||'')?result.code:'GMAIL_AUTHORIZATION_UNAVAILABLE');
 return result.result;
}
function cdqGmailConfigV2874_(email){
 var config=cdqGmailBrokerV2874_(email,{operation:'status'});
 if(config.configured!==true||config.clientId!==CDQ_GMAIL_CLIENT_V2874_)throw Error('GMAIL_SERVER_NOT_CONFIGURED');
 return {client_id:CDQ_GMAIL_CLIENT_V2874_};
}
function cdqGmailGrantKeyV2874_(email){return CDQ_GMAIL_GRANT_V2874_+cdqSpHash_(cdqGmailTechEmailV20261112_(email));}
function cdqGmailGrantV2874_(email){
 var value=cdqSpGet_(cdqGmailGrantKeyV2874_(email));
 if(!value||value.actor!==email||value.clientId!==CDQ_GMAIL_CLIENT_V2874_||
    value.requiresConsent||!value.refreshToken||!Array.isArray(value.scopes)||
    value.scopes.indexOf(CDQ_GMAIL_TECH_SCOPE_V20261112_)<0)return null;
 return value;
}
function cdqGmailOAuthPostV2874_(payload,email){
 var result=cdqGmailBrokerV2874_(email,payload);
 if(result.actor!==email||!result.access_token||String(result.access_token).length>8192||
    !Number.isFinite(Number(result.expires_in))||Number(result.expires_in)<60||
    String(result.token_type||'').toLowerCase()!=='bearer')throw Error('GMAIL_INVALID_AUTHORIZATION');
 return result;
}
function cdqGmailAccessV2874_(email){
 email=cdqGmailTechEmailV20261112_(email);
 var grant=cdqGmailGrantV2874_(email);if(!grant)throw Error('GMAIL_CONSENT_REQUIRED');
 var reply;
 try{reply=cdqGmailOAuthPostV2874_({operation:'refresh',refreshToken:grant.refreshToken},email);}
 catch(error){
  if(error.message==='GMAIL_CONSENT_REQUIRED')cdqSpLock_(function(){
   var key=cdqGmailGrantKeyV2874_(email),current=cdqSpGet_(key);
   if(current&&current.refreshToken===grant.refreshToken&&current.updatedAt===grant.updatedAt){
    current.requiresConsent=true;cdqSpPut_(key,current);
   }
  });
  throw error;
 }
 if(reply.scope&&String(reply.scope).split(/\s+/).indexOf(CDQ_GMAIL_TECH_SCOPE_V20261112_)<0)
  throw Error('GMAIL_CONSENT_REQUIRED');
 cdqGmailTechAccountV20261112_(reply.access_token,email);
 return String(reply.access_token);
}
function cdqGmailAuthorizationV2874(clientId,action,input){
 var actor=verifierDroit_('envoi'),email=cdqGmailTechEmailV20261112_(actor&&actor.email),
  client=String(clientId||''),scope=cdqClientPortalScopeV20261028_(client);
 if(!scope||normaliserEmailCDQ_(scope.actor&&scope.actor.email||'')!==email)throw Error('SCOPE_MISMATCH');
 var config=cdqGmailConfigV2874_(email);
 if(action==='status')return {ok:true,actor:email,connected:!!cdqGmailGrantV2874_(email),protocol:2874};
 if(action==='prepare'){
  var channel=String(input&&input.channel||''),origin=String(input&&input.origin||'');
  if(!(channel==='android'&&origin==='')&&!(channel==='web'&&origin==='https://jprodrigue86.github.io'))
   throw Error('INVALID_GMAIL_ORIGIN');
  var state={actor:email,clientId:client,channel:channel,origin:origin,at:Date.now(),nonce:Utilities.getUuid()};
  return {ok:true,actor:email,clientId:config.client_id,state:state,signature:cdqSpSignPlanV20261104_(state)};
 }
 if(action!=='complete'||!input||!input.state)throw Error('INVALID_GMAIL_ACTION');
 var state=input.state;
 if(state.actor!==email||state.clientId!==client||Date.now()-state.at<0||Date.now()-state.at>300000||
    !cdqSpEqual_(input.signature,cdqSpSignPlanV20261104_(state))||
    !/^[a-f0-9-]{36}$/i.test(String(state.nonce||'')))throw Error('INVALID_GMAIL_CHALLENGE');
 if(!(state.channel==='android'&&state.origin==='')&&
    !(state.channel==='web'&&state.origin==='https://jprodrigue86.github.io'))throw Error('INVALID_GMAIL_ORIGIN');
 var code=String(input.code||'');if(!code||code.length>4096||/[\r\n]/.test(code))throw Error('INVALID_GMAIL_CODE');
 cdqSpLock_(function(){var cache=CacheService.getScriptCache(),key='CDQ_GMAIL_AUTH_USED_V2874:'+state.nonce;
  if(cache.get(key))throw Error('GMAIL_CHALLENGE_ALREADY_USED');cache.put(key,'1',360);
 });
 var reply=cdqGmailOAuthPostV2874_({operation:'exchange',code:code,redirectUri:state.origin},email);
 cdqGmailTechAccountV20261112_(reply.access_token,email);
 var scopes=String(reply.scope||'').split(/\s+/);
 if(scopes.indexOf(CDQ_GMAIL_TECH_SCOPE_V20261112_)<0)throw Error('GMAIL_CONSENT_REQUIRED');
 cdqSpLock_(function(){
  var key=cdqGmailGrantKeyV2874_(email),old=cdqGmailGrantV2874_(email),refresh=String(reply.refresh_token||old&&old.refreshToken||'');
  if(!refresh||refresh.length>4096||/\s/.test(refresh))throw Error('GMAIL_OFFLINE_CONSENT_REQUIRED');
  cdqSpPut_(key,{actor:email,clientId:config.client_id,refreshToken:refresh,scopes:scopes,
   createdAt:old&&old.createdAt||Date.now(),updatedAt:Date.now(),requiresConsent:false});
 });
 return {ok:true,actor:email,connected:true,protocol:2874};
}
