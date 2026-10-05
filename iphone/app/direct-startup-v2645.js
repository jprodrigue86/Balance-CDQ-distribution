/* Begin the current server authorization while the installed interface parses. */
(() => {
  'use strict';
  const read=key=>{try{return localStorage.getItem(key)||'';}catch(_){return '';}};
  const token=read('cdq_auth_device_token_v2');
  const email=read('cdqLastUnlockEmailV2511').trim().toLowerCase();
  if(window.top!==window||!token||!email||navigator.onLine===false)return;
  let session=null,taken=false,clients=null,clientsTaken=false;
  const current=()=>read('cdq_auth_device_token_v2')===token&&read('cdqLastUnlockEmailV2511').trim().toLowerCase()===email;
  function prepare(){
    if(session||!current()||!window.cdqEmbeddedRpcV2529)return;
    session=window.cdqEmbeddedRpcV2529.prepareSession(token);
    session.then(state=>{
      const access=state?.cdqDriveAccessV2638,age=Date.now()-Number(access?.checkedAt||0);
      if(!current()||state?.autorise!==true||String(state.email||'').trim().toLowerCase()!==email||!state.jetonSession||access?.ok!==true||access.email!==email||age < -5000||age>=30000)return;
      clients=Array.isArray(state.compagniesInitiales)?Promise.resolve(state.compagniesInitiales):new Promise((resolve,reject)=>{
        window.cdqEmbeddedRpcV2529.run.withSuccessHandler(resolve).withFailureHandler(reject)
          .cdqRpc('obtenirDossiersClients',[false],state.jetonSession);
      });
      clients.catch(()=>{});
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
  },takeClients(value,account){
    if(clientsTaken||!current()||String(value)!==token||String(account||'').trim().toLowerCase()!==email||!clients)return null;
    clientsTaken=true;
    return clients.then(rows=>{
      if(!current())throw Error('Le compte CDQ a changé.');
      if(!Array.isArray(rows))throw Error('La liste des compagnies n’a pas été confirmée.');
      return rows;
    });
  }};
  window.addEventListener('cdq:rpc-ready-v2529',prepare);prepare();
})();
