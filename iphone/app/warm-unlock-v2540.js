/* V26.34 — a biometric grant unlocks the device credential. Only the current
 * server authorization may open the application, including warm reopens. */
(() => {
  'use strict';
  const tokenKey='cdq_auth_device_token_v2';
  const emailKey='cdqLastUnlockEmailV2511';
  const read=key=>{try{return localStorage.getItem(key)||'';}catch(_){return '';}};
  let cycle=null,preparing=null;
  const emit=name=>{try{window.dispatchEvent(new Event(name));}catch(_){}};
  const current=c=>cycle===c&&read(tokenKey)===c.token&&read(emailKey).trim().toLowerCase()===c.email;
  function cancel(requestId){
    if(requestId&&cycle?.requestId!==requestId&&preparing?.requestId!==requestId)return;
    if(!cycle&&!preparing)return;
    cycle=null;preparing=null;
    emit('cdq:warm-revoked-v2540');
  }
  function observe(requestId,success,message,grant){
    const prepared=preparing;
    if(cycle)cancel();
    preparing=null;
    if(success!==true){emit('cdq:warm-revoked-v2540');return false;}
    const token=read(tokenKey),email=read(emailKey).trim().toLowerCase(),g=String(grant||'');
    if(!token||!email||g.length<20||!window.BalanceCDQNative?.localStartupTicket){emit('cdq:warm-revoked-v2540');return false;}
    try{
      const local=JSON.parse(String(BalanceCDQNative.localStartupTicket(String(requestId||''),g,email,token)||'null'));
      if(local?.ok!==true||String(local.email||'').trim().toLowerCase()!==email||Number(local.expiresAt)<=Date.now()){emit('cdq:warm-revoked-v2540');return false;}
      const session=prepared&&prepared.requestId===String(requestId||'')&&prepared.token===token&&prepared.email===email&&Date.now()-prepared.at<65000?prepared.session:null;
      cycle={requestId:String(requestId||''),token,email,grant:g,taken:false,session};
      return true;
    }catch(_){emit('cdq:warm-revoked-v2540');return false;}
  }
  function takeSession(value,success,failure,userObject,serverFactory){
    const c=cycle;
    if(!c||!current(c)||c.taken||String(value||'')!==c.token||typeof serverFactory!=='function')return false;
    c.taken=true;
    const fail=error=>{
      if(!current(c))return;
      cycle=null;
      emit('cdq:warm-offline-v2540');
      emit('cdq:warm-revoked-v2540');
      failure?.(error,userObject);
    };
    let session;
    try{session=c.session||serverFactory(c.token);}catch(error){fail(error);return true;}
    Promise.resolve(session).then(state=>{
      if(!current(c))return;
      if(state?.autorise===true&&String(state.email||'').trim().toLowerCase()===c.email&&String(state.jetonSession||'').trim()&&!state.cdqReadOnlyStartupV2539&&!state.cdqWarmReadOnlyV2540){
        try{BalanceCDQNative.confirmStartupTicket?.(c.requestId,c.grant,c.email,c.token);}catch(_){}
        cycle=null;
        emit('cdq:warm-confirmed-v2540');
        success?.(state,userObject);
        return;
      }
      try{BalanceCDQNative.clearStartupTicket?.(c.requestId,c.grant);}catch(_){}
      cycle=null;
      emit('cdq:warm-revoked-v2540');
      success?.({autorise:false,message:String(state?.message||'Ce compte n’a pas l’autorisation d’utiliser l’application.')},userObject);
    },fail);
    return true;
  }
  function prepare(account,requestId){
    cancel();const token=read(tokenKey),email=read(emailKey).trim().toLowerCase();
    if(!token||!email||email!==String(account||'').trim().toLowerCase()||navigator.onLine===false||!window.cdqEmbeddedRpcV2529)return;
    const session=Promise.resolve(window.cdqEmbeddedRpcV2529.prepareSession(token));session.catch(()=>{});
    preparing={requestId:String(requestId||''),token,email,session,at:Date.now()};
  }
  window.cdqWarmUnlockV2540={prepare,observe,takeSession,cancel,isProvisional:()=>!!preparing||!!cycle&&cycle.taken};
  window.addEventListener('pagehide',()=>cancel());
  window.addEventListener('storage',()=>{if(cycle&&!current(cycle))cancel();});
})();
