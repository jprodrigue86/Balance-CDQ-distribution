/* iPhone connection compatibility: 2026.09.24-iphone-rpc-r1 */
/* Local UI; only authenticated data calls cross the Apps Script iframe. */
(() => {
  'use strict';
  const endpoint='https://script.google.com/macros/s/AKfycbx8NuvklaL-azJBIVyCMKjPk_Hd9z62Q_2-NPl3vqw2kJRpI5wy63J8xkBN5toOFxEw/exec';
  // The installed shell owns one connection, opened before Selector parses.
  // Reuse it only through a direct, same-origin parent; web/legacy frames keep
  // their own checked connection and cannot borrow an unrelated parent's RPC.
  try{
    if(window.parent!==window && window.parent.location.origin===location.origin && window.parent.cdqEmbeddedRpcV2529?.endpoint===endpoint){
      window.google={script:{run:window.parent.cdqEmbeddedRpcV2529.run}};
      window.cdqReadHistoricalUploadReceiptV2752=input=>{
        const read=window.parent.cdqEmbeddedRpcV2529.readHistoricalUploadReceipt;
        if(typeof read!=='function')return Promise.reject(Error('La connexion au reçu historique n’est pas prête. Le PDF local reste en attente.'));
        return read(input);
      };
      return;
    }
  }catch(_){}
  // Fixed historical read origin. Publication may replace the main endpoint;
  // this connection can only ask the old creator for an existing exact receipt.
  const historicalEndpointV2752='https://script.google.com/macros/s/AKfycbx8NuvklaL-azJBIVyCMKjPk_Hd9z62Q_2-NPl3vqw2kJRpI5wy63J8xkBN5toOFxEw/exec';
  const historicalReadsV2752=new Set();
  const allowed=new Set(['cdqRpc','reprendreActivationCDQ','creerDefiConnexionGoogleCDQ','verifierJetonGoogleCDQ','obtenirEtatAcces','connecterAvecCodeAcces','restaurerSessionApresBiometrie','reprendreSessionCourteCDQV2524']);
  const channel=crypto.randomUUID(), pending=new Map();
  let frame, peer, peerRelay=null, peerOrigin='', serial=0, failed='', sessionToken='',authEpoch=0;
  let bootstrapV2687=null,bootstrapFallbackV2687;
  let batchTimerV2687;
  const batchedReadsV2687=new Set(['obtenirPreferencesUtilisateurCDQV72','obtenirStyleIconesCDQV2514','obtenirListeTechniciensRapports']);
  // Authentication may take longer than the shell launch. The short read
  // window starts only after this epoch has a server-confirmed session.
  let batchUntilV2687=0;
  const unavailable='La connexion CDQ ne répond pas. Vérifiez Internet et réessayez. Si CDQ est déjà installé, actualisez l’application PC.';
  function settle(id,ok,value){
    const job=pending.get(id);if(!job)return;
    pending.delete(id);if(job.timer)clearTimeout(job.timer);
    const handler=ok?job.success:job.failure;
    if(typeof handler==='function')handler(ok?value:Error(String(value||unavailable)),job.userObject);
  }
  function fail(message){
    failed=message;
    for(const id of [...pending.keys()])settle(id,false,message);
  }
  function wire(job){
    if(allowed.has(job.name)){
      job.wireName=job.name;
      job.wireArgs=job.args;
      return true;
    }
    if(sessionToken){
      job.wireName='cdqRpc';
      job.wireArgs=[job.name,job.args,sessionToken];
      return true;
    }
    return false;
  }
  function send(job){
    if(consumeBootstrapV2687(job))return;
    if(!peer||job.sent||!wire(job))return;
    if(sessionToken&&Date.now()<batchUntilV2687&&batchedReadsV2687.has(job.name)){
      if(!batchTimerV2687)batchTimerV2687=setTimeout(flushStartupReadsV2687,120);
      return;
    }
    job.sent=true;
    if(!job.timer)job.timer=setTimeout(
      ()=>settle(job.id,false,job.name==='obtenirEtatAcces'?'La vérification de connexion a expiré. Appuyez sur Réessayer la connexion.':'La demande a expiré. Vérifiez son résultat avant de relancer une écriture.'),
      90000
    );
    peer.postMessage({
      type:'CDQ_EMBEDDED_CALL',protocol:1,channel,id:job.id,
      name:job.wireName,args:job.wireArgs
    },peerOrigin);
  }
  function flushStartupReadsV2687(){
    batchTimerV2687=null;
    const jobs=[...pending.values()].filter(job=>!job.sent&&job.authEpoch===authEpoch&&batchedReadsV2687.has(job.name)).slice(0,3);
    if(!jobs.length||!peer||!sessionToken)return;
    for(const job of jobs)job.sent=true;
    runner(results=>{
      const valid=Array.isArray(results)&&results.length===jobs.length&&results.every((result,i)=>result?.name===jobs[i].name&&typeof result.ok==='boolean');
      if(!valid){fallback();return;}
      jobs.forEach((job,i)=>settle(job.id,results[i].ok,results[i].ok?results[i].value:results[i].error));
    },fallback).cdqStartupReadV2687(jobs.map(job=>({name:job.name,args:job.args})));
    function fallback(){
      // Only idempotent account reads are retried, including on old servers.
      for(const job of jobs)if(pending.has(job.id)&&job.authEpoch===authEpoch){job.sent=false;wire(job);sendIndividualV2687(job);}
    }
    if([...pending.values()].some(job=>!job.sent&&batchedReadsV2687.has(job.name)))batchTimerV2687=setTimeout(flushStartupReadsV2687,120);
  }
  function sendIndividualV2687(job){
    // Disable batching for this read only, without changing other requests.
    const name=job.name;batchedReadsV2687.delete(name);try{send(job);}finally{batchedReadsV2687.add(name);}
  }
  function runner(success,failure,userObject,bypassStartup=false){
    return new Proxy(Object.create(null),{get(_target,name){
      if(name==='withSuccessHandler')return fn=>runner(fn,failure,userObject,bypassStartup);
      if(name==='withFailureHandler')return fn=>runner(success,fn,userObject,bypassStartup);
      if(name==='withUserObject')return obj=>runner(success,failure,obj,bypassStartup);
      if(typeof name!=='string'||name==='then')return undefined;
      return (...args)=>{
        const id=String(++serial),job={id,name,args,success,failure,userObject,sent:false,timer:null,authEpoch};
        pending.set(id,job);
        if(!allowed.has(name)&&!sessionToken){
          settle(id,false,'Appel serveur non autorisé.');
          return;
        }
        if(navigator.onLine===false){settle(id,false,'Connexion Internet indisponible. Utilisez les copies hors ligne.');return;}
        if(failed){settle(id,false,failed);return;}
        send(job);
      };
    }});
  }
  function trusted(event,targetFrame=frame){
    if(!targetFrame||!event.source)return false;
    let origin;try{origin=new URL(event.origin);}catch(_){return false;}
    const host=origin.hostname;
    if(origin.protocol!=='https:'||origin.port||!(host==='script.google.com'||host==='script.googleusercontent.com'||host.endsWith('-script.googleusercontent.com')))return false;
    let source=event.source;
    for(let i=0;source&&i<8;i++){
      if(source===targetFrame.contentWindow)return true;
      try{const parent=source.parent;if(parent===source)break;source=parent;}catch(_){break;}
    }
    return false;
  }
  function readHistoricalUploadReceiptV2752(input){
    return new Promise((resolve,reject)=>{
      const epoch=authEpoch,token=sessionToken,readChannel=crypto.randomUUID();
      let target,remote,relay,origin='',sent=false,done=false,timer,cancel;
      const finish=(ok,value)=>{
        if(done)return;done=true;clearTimeout(timer);
        window.removeEventListener('message',receive);window.removeEventListener('offline',offline);
        historicalReadsV2752.delete(cancel);target?.remove();
        if(ok)resolve(value);else reject(Error(String(value||'Le reçu historique reste à confirmer.')));
      };
      const current=()=>{
        if(epoch!==authEpoch||!token||token!==sessionToken){finish(false,'Le compte CDQ a changé. Le PDF local reste en attente.');return false;}
        return true;
      };
      function offline(){finish(false,'Connexion interrompue. Le PDF local reste en attente.');}
      function receive(event){
        const data=event.data;
        if(done||!data||data.protocol!==1||data.channel!==readChannel||!trusted(event,target)||!current())return;
        if(data.type==='CDQ_EMBEDDED_READY'){
          if(remote&&remote!==event.source)return;
          if(!remote){try{const parent=event.source.parent;relay=parent!==target.contentWindow?parent:null;}catch(_){}}
          remote=event.source;origin=event.origin;if(sent)return;sent=true;
          try{remote.postMessage({type:'CDQ_EMBEDDED_CALL',protocol:1,channel:readChannel,id:'1',name:'cdqRpc',args:['cdqHistoricalUploadReceiptV2752',[request],token]},origin);}catch(error){finish(false,error.message);}
        }else if(data.type==='CDQ_EMBEDDED_RESULT'&&sent&&(event.source===remote||event.source===relay)&&event.origin===origin&&String(data.id)==='1'&&typeof data.ok==='boolean')finish(data.ok,data.ok?data.value:data.error);
      }
      let request;try{request=JSON.parse(JSON.stringify(input));}catch(_){finish(false,'Métadonnée de reçu historique invalide.');return;}
      if(!current())return;
      if(navigator.onLine===false){offline();return;}
      if(historicalReadsV2752.size>=4){finish(false,'La lecture des reçus historiques est déjà en cours.');return;}
      cancel=()=>finish(false,'Compte CDQ déconnecté. Le PDF local reste en attente.');historicalReadsV2752.add(cancel);
      try{
        target=document.createElement('iframe');target.hidden=true;target.tabIndex=-1;target.title='Vérification du reçu CDQ historique';target.setAttribute('aria-hidden','true');
        target.src=historicalEndpointV2752+'?cdq_native_bridge=1&channel='+encodeURIComponent(readChannel);
        window.addEventListener('message',receive);window.addEventListener('offline',offline);
        timer=setTimeout(()=>finish(false,'La lecture du reçu historique a expiré. Le PDF local reste en attente.'),55000);
        (document.body||document.documentElement).append(target);
      }catch(error){finish(false,error.message);}
    });
  }
  const bootTimer=setTimeout(()=>{if(!peer)fail(unavailable);},30000);
  window.addEventListener('message',event=>{
    const data=event.data;
    if(!data||data.protocol!==1||data.channel!==channel||!trusted(event))return;
    if(data.type==='CDQ_EMBEDDED_READY'){
      if(peer&&peer!==event.source)return;
      // WebKit reports the HtmlService relay as the source of asynchronous
      // replies; READY still comes from its inner user-code frame. Pin only
      // that exact parent during the validated handshake, never any sibling.
      if(!peer){
        try{const relay=event.source.parent;peerRelay=relay!==frame.contentWindow?relay:null;}catch(_){}
      }
      peer=event.source;peerOrigin=event.origin;failed='';clearTimeout(bootTimer);
      clearTimeout(bootstrapFallbackV2687);
      if(bootstrapV2687&&bootstrapV2687.epoch===authEpoch&&data.bootstrapV2687&&typeof data.bootstrapV2687.ok==='boolean'){
        bootstrapV2687.response=data.bootstrapV2687;bootstrapV2687.receivedAt=Date.now();
      }
      for(const job of pending.values())send(job);
    }else if(data.type==='CDQ_EMBEDDED_RESULT'&&peer&&
      (event.source===peer||event.source===peerRelay)&&event.origin===peerOrigin&&
      pending.get(String(data.id))?.sent===true&&typeof data.ok==='boolean'){
      const id=String(data.id),job=pending.get(id);
      if(data.ok===true&&data.value&&typeof data.value==='object'){
        const token=String(data.value.jetonSession||'').trim();
        if(data.value.autorise===true&&token&&job?.authEpoch===authEpoch){sessionToken=token;batchUntilV2687=Date.now()+15000;}
        else if(data.value.autorise===false&&job&&(
          job.name==='restaurerSessionApresBiometrie'||
          job.name==='reprendreSessionCourteCDQV2524'||
          job.name==='obtenirEtatAcces'
        )){sessionToken='';batchUntilV2687=0;clearTimeout(batchTimerV2687);batchTimerV2687=null;}
      }
      settle(id,data.ok===true,data.ok?data.value:data.error);
    }
  });
  window.addEventListener('offline',()=>{
    // Do not replay a write whose response may have been lost. Held requests
    // have not crossed the network and remain blocked locally.
    for(const [id,job] of [...pending.entries()])
      if(job.sent)settle(id,false,'Connexion interrompue. Vérifiez le résultat avant de relancer une écriture.');
  });
  window.google={script:{run:runner()}};
  window.cdqReadHistoricalUploadReceiptV2752=readHistoricalUploadReceiptV2752;
  window.cdqEmbeddedRpcV2529={run:window.google.script.run,readHistoricalUploadReceipt:readHistoricalUploadReceiptV2752,
    resetSession(){
      ++authEpoch;sessionToken='';batchUntilV2687=0;
      for(const cancel of [...historicalReadsV2752])cancel();
      clearTimeout(batchTimerV2687);batchTimerV2687=null;
      bootstrapV2687=null;
      for(const [id,job] of [...pending.entries()]){
        if(job.name==='cdqRpc'&&job.args[0]==='deconnecterAppareil')continue;
        settle(id,false,'Compte CDQ déconnecté.');
      }
    },
    prepareSession:token=>new Promise((resolve,reject)=>runner(resolve,reject,undefined,true).obtenirEtatAcces(token,''))};
  Object.defineProperties(window.cdqEmbeddedRpcV2529,{endpoint:{value:endpoint,enumerable:true},historicalEndpointV2752:{value:historicalEndpointV2752,enumerable:true}});
  window.dispatchEvent?.(new Event('cdq:rpc-ready-v2529'));
  function consumeBootstrapV2687(job){
    const boot=bootstrapV2687;
    if(!boot?.response||boot.consumed||boot.epoch!==authEpoch||job.authEpoch!==authEpoch||Date.now()-boot.receivedAt>30000)return false;
    const matches=boot.resume?
      job.name==='reprendreSessionCourteCDQV2524'&&job.args[0]===boot.resume&&job.args[1]===boot.token:
      job.name==='obtenirEtatAcces'&&job.args[0]===boot.token&&!job.args[1];
    if(!matches)return false;
    boot.consumed=true;job.sent=true;
    const response=boot.response,state=response.value;
    if(response.ok===true&&state?.autorise===true&&String(state.email||'').toLowerCase()===boot.email&&state.jetonSession){sessionToken=String(state.jetonSession);batchUntilV2687=Date.now()+15000;}
    const wrongAccount=response.ok===true&&state?.autorise===true&&String(state.email||'').toLowerCase()!==boot.email;
    setTimeout(()=>settle(job.id,!wrongAccount&&response.ok===true,wrongAccount?'Le serveur a retourné un autre compte CDQ.':response.ok?state:response.error),0);
    return true;
  }
  function boot(){
    frame=document.createElement('iframe');frame.id='cdq-data-connection';frame.title='Connexion sécurisée CDQ';
    frame.hidden=true;frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
    const legacy=()=>{bootstrapV2687=null;frame.src=endpoint+'?cdq_native_bridge=1&channel='+encodeURIComponent(channel);};
    try{
      const token=localStorage.getItem('cdq_auth_device_token_v2')||'';
      const email=String(localStorage.getItem('cdqLastUnlockEmailV2511')||'').trim().toLowerCase();
      if(token&&email&&navigator.onLine!==false){
        const resumeJob=[...pending.values()].find(job=>job.name==='reprendreSessionCourteCDQV2524'&&job.args[1]===token);
        bootstrapV2687={token,email,resume:resumeJob?String(resumeJob.args[0]||''):'',epoch:authEpoch,consumed:false};
        // A hidden POST keeps device/session tokens out of URL history and logs.
        frame.name='cdq-boot-'+channel;
        (document.body||document.documentElement).append(frame);
        const form=document.createElement('form');form.hidden=true;form.method='POST';form.action=endpoint;form.target=frame.name;
        for(const [name,value] of Object.entries({cdq_boot_v2687:'1',channel,cdq_device:token,cdq_resume:bootstrapV2687.resume})){
          const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);
        }
        (document.body||document.documentElement).append(form);form.submit();form.remove();
        bootstrapFallbackV2687=setTimeout(()=>{if(!peer)legacy();},12000);
        return;
      }
    }catch(_){bootstrapV2687=null;}
    legacy();
    (document.body||document.documentElement).append(frame);
  }
  boot();
})();
