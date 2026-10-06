/* V26.87: authenticate a registered device in the initial iframe POST.
 * GET remains public and compatible. Tokens never enter a query string.
 * Trace state is scoped to this Apps Script invocation, not an access cache. */
var CDQ_STARTUP_TRACE_V2687_ = null;
var CDQ_BOOTSTRAP_RPC_V2687_ = false;

function cdqTraceStageV2687_(stage) {
  var t=CDQ_STARTUP_TRACE_V2687_;
  if(!t)return;
  var now=Date.now();
  if(t.stage)t.parts.push({stage:t.stage,ms:now-t.mark});
  t.stage=String(stage);t.mark=now;
}
function cdqTraceSafeErrorV2687_(error) {
  return String(error&&error.message||error||'Erreur serveur CDQ.')
    .replace(/https?:\/\/\S+/g,'[lien]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[compte]')
    .replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi,'[jeton]')
    .slice(0,600);
}
function cdqTraceFinishV2687_(error) {
  var t=CDQ_STARTUP_TRACE_V2687_;if(!t)return null;
  cdqTraceStageV2687_('done');
  var result={function:t.name,ms:Date.now()-t.start,parts:t.parts};
  if(error){
    result.failedAt=t.failedAt||t.parts[t.parts.length-1]?.stage||'unknown';
    result.error=cdqTraceSafeErrorV2687_(error);
    console.error('CDQ_RPC_ERROR_V2687 '+JSON.stringify(result));
    // Error-only storage; it never adds a write to successful startup calls.
    try{
      var lock=LockService.getScriptLock();
      if(lock.tryLock(50))try{
        var props=PropertiesService.getScriptProperties(),key='CDQ_RPC_ERRORS_V2687';
        var recent=JSON.parse(props.getProperty(key)||'[]');
        recent.push(Object.assign({at:new Date().toISOString()},result));
        recent=recent.slice(-12);
        var serialized=JSON.stringify(recent);
        // Script properties have a byte limit; retain newest complete records.
        while(recent.length>1&&encodeURIComponent(serialized).replace(/%[A-F0-9]{2}|./g,'x').length>8000){recent.shift();serialized=JSON.stringify(recent);}
        props.setProperty(key,serialized);
      }finally{lock.releaseLock();}
    }catch(_){}
  }else console.log('CDQ_RPC_TIME_V2687 '+JSON.stringify(result));
  return result;
}
function cdqRpc(nomFonction,args,jetonSession) {
  var previous=CDQ_STARTUP_TRACE_V2687_,now=Date.now(),error=null;
  CDQ_STARTUP_TRACE_V2687_={name:String(nomFonction||'').replace(/[^A-Za-z0-9_$]/g,'').slice(0,91),start:now,mark:now,stage:'session',parts:[]};
  try{return cdqRpcLegacyV2687_(nomFonction,args,jetonSession);}
  catch(e){error=e;CDQ_STARTUP_TRACE_V2687_.failedAt=CDQ_STARTUP_TRACE_V2687_.stage;throw e;}
  finally{cdqTraceFinishV2687_(error);CDQ_STARTUP_TRACE_V2687_=previous;}
}
function cdqStartupReadV2687(requests) {
  // Only these existing account-bound reads can share one current permission.
  verifierDroit_('lecture');
  var allowed=['obtenirPreferencesUtilisateurCDQV72','obtenirStyleIconesCDQV2514','obtenirListeTechniciensRapports'];
  if(!Array.isArray(requests)||requests.length>3)throw Error('Lectures de démarrage invalides.');
  requests.forEach(function(request){
    if(!request||allowed.indexOf(request.name)<0||!Array.isArray(request.args)||request.args.length>1)throw Error('Lecture de démarrage non autorisée.');
  });
  var access=null,driveError=null;
  if(requests.some(function(request){return request.name==='obtenirListeTechniciensRapports';}))try{
    cdqTraceStageV2687_('drive');access=cdqVerifierCompteDriveV2620_(verifierAcces_().email);
  }catch(error){driveError=error;}
  cdqTraceStageV2687_('function');
  return requests.map(function(request){
    try{
      if(request.name==='obtenirListeTechniciensRapports'&&(driveError||!access?.ok))throw driveError||Error('Accès Drive requis pour ces données.');
      return {name:request.name,ok:true,value:globalThis[request.name].apply(null,request.args)};
    }
    catch(error){
      var previous=CDQ_STARTUP_TRACE_V2687_,now=Date.now();
      CDQ_STARTUP_TRACE_V2687_={name:request.name,start:now,mark:now,stage:'function',failedAt:'function',parts:[]};
      try{cdqTraceFinishV2687_(error);}finally{CDQ_STARTUP_TRACE_V2687_=previous;}
      return {name:request.name,ok:false,error:cdqTraceSafeErrorV2687_(error)};
    }
  });
}
function cdqDiagnosticStartupDepuisEditeurV2687_() {
  // Read-only diagnostic for the project owner, run from the Google editor.
  if(normaliserEmailCDQ_(Session.getActiveUser().getEmail())!==obtenirAdministrateurPrincipal_())throw Error('Diagnostic réservé au propriétaire.');
  var errors=JSON.parse(PropertiesService.getScriptProperties().getProperty('CDQ_RPC_ERRORS_V2687')||'[]');
  console.log(JSON.stringify({build:CDQ_BACKEND_BUILD_,errors:errors}));
  return {build:CDQ_BACKEND_BUILD_,errors:errors};
}
function doPost(e) {
  var p=e&&e.parameter||{},channel=String(p.channel||'');
  if(p.cdq_boot_v2687!=='1'||!/^[A-Za-z0-9-]{20,100}$/.test(channel)||Number(e&&e.contentLength||0)>3500)throw Error('Connexion CDQ invalide.');
  var device=String(p.cdq_device||''),resume=String(p.cdq_resume||'');
  if(!device||device.length>512||resume.length>512)throw Error('Appareil CDQ invalide.');
  var previous=CDQ_STARTUP_TRACE_V2687_,nativePrevious=CDQ_BOOTSTRAP_RPC_V2687_,now=Date.now(),error=null,state,response;
  CDQ_STARTUP_TRACE_V2687_={name:resume?'bootstrap-resume':'bootstrap-device',start:now,mark:now,stage:'account',parts:[]};
  CDQ_BOOTSTRAP_RPC_V2687_=true;
  try{
    state=resume?reprendreSessionCourteCDQV2524(resume,device):obtenirEtatAcces(device,'');
    response={ok:true,value:state};
  }catch(err){error=err;CDQ_STARTUP_TRACE_V2687_.failedAt=CDQ_STARTUP_TRACE_V2687_.stage;response={ok:false,error:cdqTraceSafeErrorV2687_(err)};}
  finally{
    var timings=cdqTraceFinishV2687_(error);if(state)state.startupTimingsV2687=timings;
    CDQ_STARTUP_TRACE_V2687_=previous;CDQ_BOOTSTRAP_RPC_V2687_=nativePrevious;
  }
  return cdqEmbeddedBridgeV2528_({channel:channel},response);
}
