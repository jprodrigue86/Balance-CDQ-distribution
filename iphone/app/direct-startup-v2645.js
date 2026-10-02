/* Begin the current server authorization while the installed interface parses. */
(() => {
  'use strict';
  const read=key=>{try{return localStorage.getItem(key)||'';}catch(_){return '';}};
  const token=read('cdq_auth_device_token_v2');
  const email=read('cdqLastUnlockEmailV2511').trim().toLowerCase();
  if(window.top!==window||!token||!email||navigator.onLine===false)return;
  let session=null,taken=false;
  const current=()=>read('cdq_auth_device_token_v2')===token&&read('cdqLastUnlockEmailV2511').trim().toLowerCase()===email;
  function prepare(){
    if(session||!current()||!window.cdqEmbeddedRpcV2529)return;
    session=window.cdqEmbeddedRpcV2529.prepareSession(token);session.catch(()=>{});
  }
  window.cdqDirectStartupV2645={take(value){
    if(taken||!current()||String(value)!==token)return null;
    prepare();if(!session)return null;taken=true;
    return session.then(state=>{
      if(!current())throw Error('Le compte CDQ a changé. Réessayez la connexion.');
      if(state?.autorise===true&&String(state.email||'').trim().toLowerCase()!==email)throw Error('Le serveur a retourné un autre compte CDQ.');
      return state;
    });
  }};
  window.addEventListener('cdq:rpc-ready-v2529',prepare);prepare();
})();
