/* Begin the current server authorization while the installed interface parses. */
(() => {
  'use strict';
  const read=key=>{try{return localStorage.getItem(key)||'';}catch(_){return '';}};
  const token=read('cdq_auth_device_token_v2');
  const email=read('cdqLastUnlockEmailV2511').trim().toLowerCase();
  if(window.top!==window||!token||!email||navigator.onLine===false)return;
  let session=null,taken=false,access=null,accessSession=null,accessStarted=0;
  const current=()=>read('cdq_auth_device_token_v2')===token&&read('cdqLastUnlockEmailV2511').trim().toLowerCase()===email;
  function prepare(){
    if(session||!current()||!window.cdqEmbeddedRpcV2529)return;
    let saved=null,restored=false;
    try{
      restored=window.BalanceCDQNative?.isTaskRestoredV2686?.()===true;
      saved=JSON.parse(read('cdqResumeSessionV2524')||'null');
    }catch(_){}
    const sameTask=restored&&window.cdqAppSessionV2661?.id&&
      saved?.sessionId===window.cdqAppSessionV2661.id&&
      String(saved.email||'').trim().toLowerCase()===email&&saved.token&&
      Number(saved.until)>Date.now()&&Number(saved.serverExpiresAtV2686)>Date.now();
    const fresh=()=>window.cdqEmbeddedRpcV2529.prepareSession(token);
    session=sameTask?new Promise((resolve,reject)=>{
      window.cdqEmbeddedRpcV2529.run.withSuccessHandler(resolve).withFailureHandler(reject)
        .reprendreSessionCourteCDQV2524(saved.token,token);
    }).then(state=>state?.autorise===true?state:fresh(),()=>fresh()):fresh();
    session.then(state=>{
      if(!current()||state?.autorise!==true||String(state.email||'').trim().toLowerCase()!==email||!state.jetonSession)return;
      accessSession=state.jetonSession;
      accessStarted=Date.now();
      access=new Promise((resolve,reject)=>{
        window.cdqEmbeddedRpcV2529.run.withSuccessHandler(resolve).withFailureHandler(reject)
          .cdqRpc('verifierAccesDriveEmailCDQV2620',[email],accessSession);
      });
      access.catch(()=>{});
    }).catch(()=>{});
    session.catch(()=>{});
  }
  window.cdqDirectStartupV2645={take(value){
    if(taken||!current()||String(value)!==token)return null;
    prepare();if(!session)return null;taken=true;
    return session.then(state=>{
      if(!current())throw Error('Le compte CDQ a changé. Réessayez la connexion.');
      if(state?.autorise===true&&String(state.email||'').trim().toLowerCase()!==email)throw Error('Le serveur a retourné un autre compte CDQ.');
      return state;
    });
  },takeAccess(value,account,sessionToken){
    if(!access||!current()||String(value)!==token||String(account||'').trim().toLowerCase()!==email||
       sessionToken!==accessSession||Date.now()-accessStarted>=15000)return null;
    const prepared=access;access=null;
    return prepared;
  }};
  window.addEventListener('cdq:rpc-ready-v2529',prepare);prepare();
})();
