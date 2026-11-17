/* CDQ — account-bound mail authorization. Microsoft tokens remain server-side. */
const MICROSOFT_TENANT='09eb5e3b-5335-47db-a93b-2d6db1e84213';
const MICROSOFT_REDIRECT='https://cdq-microsoft-mail.balance-cdq.workers.dev/oauth/callback';
const normalize=value=>String(value||'').trim().toLowerCase();
const error=(code,message)=>Object.assign(new Error(message),{code});
export function providerForActor(actor){
  const email=normalize(actor);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw error('MAIL_ACTOR_INVALID','Votre compte CDQ n’a pas été confirmé.');
  return email.endsWith('@groupecdq.com')?'microsoft':'gmail';
}
export function mailModeForActor(actor){return providerForActor(actor)==='microsoft'?'microsoft-server-oauth-v1':'gmail-server-oauth-v2';}
export function validateMicrosoftAuthorizationUrl(value){
  let url;try{url=new URL(value);}catch(_){throw error('MICROSOFT_AUTH_URL_INVALID','L’adresse de connexion Microsoft est invalide.');}
  const one=key=>url.searchParams.getAll(key).length===1;
  if(typeof value!=='string'||value.length>8192||url.origin!=='https://login.microsoftonline.com'||url.username||url.password||url.hash||
     url.pathname!=='/'+MICROSOFT_TENANT+'/oauth2/v2.0/authorize'||
     !['client_id','redirect_uri','response_type','response_mode','state','code_challenge','code_challenge_method','scope'].every(one)||
     !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(url.searchParams.get('client_id')||'')||
     url.searchParams.get('redirect_uri')!==MICROSOFT_REDIRECT||url.searchParams.get('response_type')!=='code'||
     url.searchParams.get('response_mode')!=='form_post'||url.searchParams.get('code_challenge_method')!=='S256'||
     !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code_challenge')||'')||
     !/^[A-Za-z0-9_-]{16,200}$/.test(url.searchParams.get('state')||''))
    throw error('MICROSOFT_AUTH_URL_INVALID','L’adresse de connexion Microsoft n’a pas été confirmée.');
  return url.href;
}

export function createMailAuthorization({host,context,rpc,gmail,now=()=>Date.now(),pollMs=3000,timeoutMs=300000}){
  let pending=null;
  function guard(ctx){
    const fresh=context(ctx.clientId);
    if(!fresh||fresh.owner!==ctx.owner||fresh.role!==ctx.role||fresh.token!==ctx.token||fresh.clientId!==ctx.clientId||fresh.role==='lecture')
      throw error('MAIL_CONTEXT_CHANGED','Le compte CDQ a changé. Rouvrez l’envoi.');
  }
  async function call(ctx,action,input={}){
    guard(ctx);
    const result=await rpc('cdqMicrosoftAuthorizationV20261117',[ctx.clientId,action,input]);
    guard(ctx);
    if(result?.ok!==true||result.provider!=='microsoft'||result.actor!==ctx.owner)
      throw error('MICROSOFT_INVALID_RESPONSE','Le serveur n’a pas confirmé votre compte Microsoft.');
    return result;
  }
  async function connect(ctx){
    const android=/BalanceCDQAndroid\//i.test(String(host.navigator?.userAgent||''));
    if(android&&typeof host.BalanceCDQNative?.openMicrosoftMailAuthorizationV20261117!=='function')
      throw error('MICROSOFT_ANDROID_UPDATE_REQUIRED','Installez la mise à jour CDQ pour connecter votre courrier Microsoft.');
    const challenge=await call(ctx,'prepare',{channel:android?'android':'web',origin:android?'':host.location.origin});
    const authorizationUrl=validateMicrosoftAuthorizationUrl(challenge.authorizationUrl);
    if(!/^[A-Za-z0-9_-]{16,160}$/.test(challenge.flowId||'')||!Number.isSafeInteger(challenge.expiresAt)||challenge.expiresAt<=now())
      throw error('MICROSOFT_FLOW_INVALID','La connexion Microsoft a expiré. Rouvrez l’envoi.');
    guard(ctx);
    const document=host.document,modal=host.cdqV19CreateModal('cdqMicrosoftConsentV20261117','Connecter votre courrier Microsoft');
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Connecter votre courrier Microsoft');modal.style.zIndex='2147483647';
    const body=modal.querySelector('.cdq-v19-body');body.replaceChildren();
    const text=document.createElement('p');text.textContent='Connectez '+ctx.owner+' pour envoyer les rapports confirmés depuis votre boîte Microsoft. Une copie sera conservée dans vos éléments envoyés Outlook.';
    const note=document.createElement('p');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
    const approve=document.createElement('button'),cancel=document.createElement('button');approve.type=cancel.type='button';
    approve.textContent='Continuer avec Microsoft';cancel.textContent='Annuler';approve.className='modal-button confirm-button';cancel.className='modal-button cancel-button';
    body.append(text,note);modal.querySelector('.modal-buttons').replaceChildren(approve,cancel);modal.style.display='flex';approve.focus();
    return new Promise((resolve,reject)=>{
      let settled=false,started=false,pollTimer=null,inFlight=false;
      const finish=err=>{
        if(settled)return;settled=true;host.clearTimeout(timer);host.clearTimeout(pollTimer);
        modal.removeEventListener('click',outside,true);document.removeEventListener('keydown',escape,true);
        document.removeEventListener('visibilitychange',onVisible);host.removeEventListener('focus',onFocus);
        modal.style.display='none';err?reject(err):resolve();
      };
      const cancelled=()=>finish(error('MICROSOFT_AUTH_CANCELLED','Connexion Microsoft annulée. Aucun envoi créé.'));
      const outside=event=>{if(event.target===modal){event.preventDefault();event.stopImmediatePropagation();cancelled();}};
      const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancelled();}};
      const timer=host.setTimeout(()=>finish(error('MICROSOFT_AUTH_EXPIRED','La connexion Microsoft a expiré. Rouvrez l’envoi.')),Math.min(timeoutMs,challenge.expiresAt-now()));
      const schedule=()=>{host.clearTimeout(pollTimer);if(!settled&&started)pollTimer=host.setTimeout(check,pollMs);};
      async function check(){
        if(settled||!started||inFlight)return;
        if(document.hidden){schedule();return;}
        inFlight=true;
        try{
          guard(ctx);const state=await call(ctx,'status',{flowId:challenge.flowId});if(settled)return;
          if(state.flowStatus==='connected'&&state.connected===true){guard(ctx);finish();return;}
          if(['denied','expired','error'].includes(state.flowStatus)){
            const detail=state.flowStatus==='denied'?'L’autorisation Microsoft a été refusée.':state.flowStatus==='expired'?'La connexion Microsoft a expiré.':'Microsoft n’a pas confirmé la connexion de ce compte.';
            finish(error(state.code||'MICROSOFT_AUTH_UNCONFIRMED',detail+' Aucun envoi créé.'));return;
          }
          note.textContent='Terminez la connexion Microsoft, puis revenez dans CDQ. Aucun courriel n’est envoyé pendant cette connexion.';
        }catch(err){finish(err);return;}finally{inFlight=false;}
        schedule();
      }
      const onVisible=()=>{if(!document.hidden){host.clearTimeout(pollTimer);void check();}};
      const onFocus=()=>{host.clearTimeout(pollTimer);void check();};
      modal.addEventListener('click',outside,true);document.addEventListener('keydown',escape,true);
      document.addEventListener('visibilitychange',onVisible);host.addEventListener('focus',onFocus);
      cancel.onclick=cancelled;
      approve.onclick=()=>{
        if(settled||started)return;
        try{
          guard(ctx);
          if(android){
            if(host.BalanceCDQNative.openMicrosoftMailAuthorizationV20261117(authorizationUrl)!==true)
              throw error('MICROSOFT_BROWSER_UNAVAILABLE','Impossible d’ouvrir la connexion Microsoft.');
          }else{
            const popup=host.open(authorizationUrl,'_blank');
            if(!popup)throw error('MICROSOFT_POPUP_BLOCKED','Autorisez l’ouverture de la fenêtre Microsoft dans ce navigateur.');
            try{popup.opener=null;}catch(_){}
          }
          started=true;approve.disabled=true;note.textContent='Connexion Microsoft ouverte. Revenez dans CDQ une fois terminé.';
          void check();
        }catch(err){finish(err);}
      };
    });
  }
  async function ensure(ctx){
    guard(ctx);const provider=providerForActor(ctx.owner);
    if(provider==='gmail'){await gmail().ensure(ctx);guard(ctx);return 'gmail-server-oauth-v2';}
    if(pending)throw error('MICROSOFT_AUTH_IN_PROGRESS','Une connexion Microsoft est déjà en cours.');
    pending=ctx;
    try{
      const state=await call(ctx,'status');
      if(state.configured!==true)throw error('MICROSOFT_NOT_CONFIGURED','Le service Microsoft de CDQ doit être configuré avant le premier envoi professionnel.');
      if(state.connected!==true)await connect(ctx);
      guard(ctx);return 'microsoft-server-oauth-v1';
    }finally{pending=null;}
  }
  return Object.freeze({ensure,providerForActor,mailModeForActor});
}
if(typeof window!=='undefined')window.cdqMailTechnicienV20261117=createMailAuthorization({host:window,
  context:clientId=>cdqSendContextV2750(clientId),rpc:(name,args)=>cdqRpcV2553(name,args),gmail:()=>window.cdqGmailTechnicienV20261112});
