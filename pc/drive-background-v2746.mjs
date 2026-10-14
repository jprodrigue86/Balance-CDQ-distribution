// Aggregate current-account work without scanning IndexedDB in read warmers.
export function createDriveBackgroundV2746({owner,authorized,native=null,onIdle=()=>{},onNativeStatus=()=>{},flush=()=>{}}){
 const pending=new Map(),running=new Map();let account='',wasBusy=false,serial=0,nativeStamp='';
 const current=()=>String(owner()||'').trim().toLowerCase();
 function queueOwner(email=current()){
  try{return !native?.isQueueOwner||native.isQueueOwner(email)!==false;}catch{return false;}
 }
 function status(){
  const email=current(),allowed=!!email&&authorized();
  if(email!==account||!allowed){account=email;pending.clear();running.clear();}
  const count=value=>Math.max(0,Math.min(100000,Math.floor(Number(value)||0)));
  let nativeQueuedCount=0,nativeActiveCount=0,nativeError='',nativeBlockedCount=0;
  try{if(allowed){
   const raw=native?.nativeQueueStatus?.(email),state=raw?(typeof raw==='string'?JSON.parse(raw):raw):null;
   nativeActiveCount=count(state?.active??native?.nativeActiveCount?.(email)??native?.nativePendingCount?.(email));
   nativeQueuedCount=count(state?.queued??native?.nativeQueuedCount?.(email)??nativeActiveCount);
   nativeBlockedCount=Math.min(nativeQueuedCount,count(state?.blocked));
   if(['authorization','conflict','denied','network','interrupted','local_read'].includes(state?.error))nativeError=state.error;
  }}catch{nativeError=allowed?'local_read':'';}
  return {owner:allowed?email:'',authorized:allowed,pendingCount:[...pending.values()].reduce((a,b)=>a+b,0),nativePendingCount:nativeQueuedCount,nativeQueuedCount,nativeActiveCount,nativeError,nativeBlockedCount,running:running.size>0,activeCount:running.size,queueOwner:allowed&&queueOwner(email)};
 }
 function publish(){
  const state=status(),busy=state.pendingCount>0||state.nativeActiveCount>0||state.running;
  try{native?.updateState?.(state.owner,state.pendingCount,state.running,state.authorized);}catch{}
  const stamp=JSON.stringify([state.owner,state.nativeQueuedCount,state.nativeActiveCount,state.nativeError,state.nativeBlockedCount]);
  if(stamp!==nativeStamp){nativeStamp=stamp;try{onNativeStatus(state);}catch{}}
  if(wasBusy&&!busy)onIdle();wasBusy=busy;return state;
 }
 function setPending(scope,count,email=current()){
  status();if(String(email).trim().toLowerCase()!==account||!authorized())return false;
  count=Math.max(0,Math.min(100000,Number(count)||0));if(count)pending.set(String(scope),count);else pending.delete(String(scope));publish();return true;
 }
 function begin(scope,email=current()){
  status();if(String(email).trim().toLowerCase()!==account||!authorized()||!queueOwner(email))return ()=>{};
  const key=String(scope)+':'+(++serial),stamp=account;running.set(key,true);publish();let done=false;
  return ()=>{if(done)return;done=true;if(account===stamp){running.delete(key);publish();}};
 }
 return {status,setPending,begin,publish,isQueueOwner:queueOwner,pendingFor:scope=>{status();return pending.get(String(scope))||0;},busy:()=>{const s=status();return s.pendingCount>0||s.nativeActiveCount>0||s.running;},reset:()=>{pending.clear();running.clear();publish();},async flush(){const s=publish();if(s.authorized&&s.queueOwner)await flush();return publish();}};
}

// Persisted native work can be paused while other actions and cache reads run.
// This notice is separate from short action messages and never claims an ACK.
export function renderNativeDrivePendingV2746(state,{doc=document}={}){
 let node=doc.getElementById('cdqNativeDrivePendingV2746');
 if(!state.authorized||!state.nativeQueuedCount&&!state.nativeError){if(node)node.hidden=true;return;}
 if(!node){
  node=doc.createElement('div');node.id='cdqNativeDrivePendingV2746';node.setAttribute('role','status');node.setAttribute('aria-live','polite');
  node.style.cssText='padding:8px 5px;white-space:normal;overflow-wrap:anywhere;font:14px/1.4 Arial,sans-serif';
  const files=doc.getElementById('filesContainer');if(files?.parentNode)files.parentNode.insertBefore(node,files);else doc.body.append(node);
 }
 const errors={authorization:'Connexion Drive à reprendre.',conflict:'La version Drive a changé; une vérification est nécessaire.',denied:'Drive a refusé cet envoi.',network:'Drive est momentanément indisponible.',interrupted:'L’envoi reprendra à la prochaine ouverture.',local_read:'La file locale doit être vérifiée.'};
 node.hidden=false;node.dataset.activityKind=state.nativeBlockedCount||state.nativeError?'pending':state.nativeActiveCount?'working':'pending';
 node.setAttribute('aria-busy',String(state.nativeActiveCount>0));
 node.textContent=(state.nativeQueuedCount?state.nativeQueuedCount+' sauvegarde'+(state.nativeQueuedCount>1?'s':'')+' PDF en attente sur cet appareil. ':'État des sauvegardes PDF à vérifier sur cet appareil. ')+(errors[state.nativeError]|| (state.nativeActiveCount?'Envoi Drive en cours.':'Envoi Drive non confirmé.'));
}

// A soft deadline reports uncertainty; it never drops a real late write ACK.
// Replays in the same owner share the original flight until the transport ends.
export function createDriveWriteFlightsV2746({clock=globalThis,onSlow=()=>{},begin=()=>()=>{}}={}){
 const flights=new Map();
 function run(owner,id,execute,valid=()=>true,timeoutMs=55000){
  const key=JSON.stringify([owner,id]),old=flights.get(key);if(old)return old.promise;
  const finish=begin('write:'+id,owner),flight={promise:null,timer:null};
  flight.timer=clock.setTimeout(()=>{if(flights.get(key)===flight&&valid())onSlow({owner,id});},timeoutMs);
  flight.promise=Promise.resolve().then(()=>{if(!valid())throw Error('Le compte ou l’accès a changé.');return execute();}).then(result=>{if(!valid())throw Error('Le compte ou l’accès a changé.');return result;}).finally(()=>{clock.clearTimeout(flight.timer);if(flights.get(key)===flight)flights.delete(key);finish();});
  flights.set(key,flight);return flight.promise;
 }
 return {run,pending:()=>flights.size};
}

// One readwrite transaction also serializes mutations from two WebViews sharing
// the same owner store (retained background worker and a reopened visible UI).
export async function mutateDurableOutboxV2746({open,key,storeName,modifier,valid=()=>true,now=Date.now}){
 if(!valid())throw Error('Le compte ou l’accès a changé.');
 const db=await open();if(!valid()){db.close();throw Error('Le compte ou l’accès a changé.');}
 return new Promise((resolve,reject)=>{
  let next,problem,settled=false;const tx=db.transaction(storeName,'readwrite'),store=tx.objectStore(storeName),request=store.get(key);
  const finish=(error=null)=>{if(settled)return;settled=true;db.close();error?reject(error):resolve(next);};
  request.onsuccess=()=>{try{
    if(!valid())throw Error('Le compte ou l’accès a changé.');
    next=modifier(Array.isArray(request.result?.actions)?request.result.actions:[]);
    if(!Array.isArray(next))throw Error('La file de sauvegarde doit rester une liste.');
    if(!valid())throw Error('Le compte ou l’accès a changé.');
    store.put({...request.result,key,actions:next,updatedAt:now()});
  }catch(error){problem=error;tx.abort();}};
  tx.oncomplete=()=>finish(valid()?null:Error('Le compte ou l’accès a changé.'));
  tx.onerror=tx.onabort=()=>finish(problem||tx.error||Error('Le stockage de la sauvegarde a été interrompu.'));
 });
}

export function failedOutboxActionV2746(action,error,now=Date.now){
 const message=String(error?.message||error||'Envoi non confirmé.'),tries=Number(action.tries||0)+1;
 const transient=/répond pas|temporair|réessay|timeout|réseau|connexion interrompue|indisponible|quota|surcharg|demande a expiré|failed to fetch|network|connection|too many|service unavailable|continue en arrière-plan/i.test(message);
 return {...action,tries,lastError:message,pausedV2746:!transient,nextRetryAtV2746:transient?now()+Math.min(120000,2000*2**Math.min(6,Math.max(0,tries-1))):0};
}

export function runnableOutboxV2746(queue,now=Date.now){
 const head=new Map(),target=action=>String(action.targetId||action.articleId||action.id);
 for(const action of queue)if(!head.has(target(action)))head.set(target(action),action);
 const blocked=new Set([...head].filter(([,action])=>action.pausedV2746||Number(action.nextRetryAtV2746||0)>now()).map(([id])=>id));
 return queue.filter(action=>!blocked.has(target(action)));
}
