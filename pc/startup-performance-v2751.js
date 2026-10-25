(function(){
'use strict';
// One request budget shared by foreground actions and speculative reads.
function createRpcBudgetV2751({limit=3,backgroundLimit=1,context=()=>'',defer=queueMicrotask,trace=()=>{}}={}){
  const queue=[];let running=0,normalRunning=0,backgroundRunning=0,sequence=0,priority='foreground',scheduled=false;
  function pump(){scheduled=false;queue.sort((a,b)=>a.rank-b.rank||a.sequence-b.sequence);
    while(running<limit){const index=queue.findIndex(job=>(job.interactive||normalRunning<Math.max(1,limit-1))&&(job.priority!=='background'||backgroundRunning<backgroundLimit));if(index<0)break;
      const job=queue.splice(index,1)[0];if(job.owner!==context()||!job.valid()){trace(job.sequence,'settled',job.label);job.reject(Error('Le compte ou l’accès a changé.'));continue;}
      running++;if(!job.interactive)normalRunning++;if(job.priority==='background')backgroundRunning++;trace(job.sequence,'dispatch',job.label);
      Promise.resolve().then(()=>{if(job.owner!==context())throw Error('Le compte ou l’accès a changé.');return job.send();}).then(job.resolve,job.reject).finally(()=>{running--;if(!job.interactive)normalRunning--;if(job.priority==='background')backgroundRunning--;trace(job.sequence,'settled',job.label);schedule();});
    }
  }
  function schedule(){if(!scheduled){scheduled=true;defer(pump);}}
  function run(send,{kind=priority,write=false,interactive=false,label='rpc',traceId,valid=()=>true}={}){if(write)kind='foreground';interactive=interactive&&kind!=='background'&&!write;return new Promise((resolve,reject)=>{const id=traceId??sequence++;trace(id,'queued',label);queue.push({send,resolve,reject,owner:context(),priority:kind,interactive,label,valid,rank:interactive?-1:write?0:kind==='background'?2:1,sequence:id});schedule();});}
  function withPriority(kind,fn){const prior=priority;priority=kind;try{return fn();}finally{priority=prior;}}
  return {run,withPriority,state:()=>({running,normalRunning,backgroundRunning,queued:queue.length})};
}

// The permission event can precede creation of the clients promise. Recheck
// both owner and promise, rather than awaiting undefined or a prior account.
async function waitForHomeClientsV2751({allowed,owner,promise,loadedOwner,delay=()=>new Promise(resolve=>setTimeout(resolve,20))}){
  while(allowed()){
    const email=owner(),ready=promise();
    if(!email)return;
    if(!ready){await delay();continue;}
    const result=await Promise.race([Promise.resolve(ready).then(value=>({value}),error=>({error})),delay().then(()=>null)]);
    if(!allowed())return;
    if(email!==owner()||ready!==promise())continue;
    if(result?.error)throw result.error;
    if(result?.value?.ok===false)throw Error('Impossible de charger les compagnies. Réessayez.');
    if(result?.value?.ok&&String(result.value.email||'').trim().toLowerCase()===email&&loadedOwner()===email)return result.value;
    await delay();
  }
}

function createLazyPageV2751({load,current,owner=()=>'',report=()=>{}}){
  let loading=null,epoch=0;
  function ensure(){if(!loading){loading=Promise.resolve().then(load).then(()=>{const target=current();if(!target)throw Error('Section indisponible. Réessayez.');return target;}).catch(error=>{loading=null;throw error;});}return loading;}
  function call(method,args=[],{visible=false}={}){const token=visible?++epoch:epoch,account=owner();return ensure().then(target=>{if(account!==owner()||token!==epoch)return;return target[method]?.(...args);});}
  const visible=method=>(...args)=>{const account=owner();return call(method,args,{visible:true}).catch(error=>{if(account===owner())report(error);});};
  return {cdqLazyV2751:true,ensure,open:visible('open'),resume:visible('resume'),toggle:visible('toggle'),openArticle:visible('openArticle'),close:()=>{epoch++;current()?.close?.();},snapshot:()=>current()?.snapshot?.()||null,
    cachedRead:(...args)=>call('cachedRead',args),refresh:(...args)=>call('refresh',args),refreshQuiet:(...args)=>call('refreshQuiet',args),applyZohoMeta:(...args)=>call('applyZohoMeta',args)};
}

// Preserve the callback runner protocol; defer only its final dispatch. The
// original runner still owns session routing and all access checks.
function wrapRpcRunnerV2751(original,budget,{report=()=>{}}={}){
  let transportSequence=0;
  function wrapped(){let success,failure,userObject,started,hasUser=false,proxy;
    proxy=new Proxy({}, {get(_,name){
      if(name==='withStartHandler')return fn=>(started=fn,proxy);
      if(name==='withSuccessHandler')return fn=>(success=fn,proxy);
      if(name==='withFailureHandler')return fn=>(failure=fn,proxy);
      if(name==='withUserObject')return value=>(userObject=value,hasUser=true,proxy);
      if(typeof name!=='string'||name==='then')return undefined;
      return(...args)=>{const ok=success,fail=failure,value=userObject,hasValue=hasUser,onStart=started,traceId=++transportSequence;
        const label=name==='cdqReportEngineV2754'?name+':'+String(args[0]||'').replace(/[^a-zA-Z]/g,'').slice(0,20):name;
        const send=()=>new Promise((resolve,reject)=>{try{onStart?.();let runner=original().withSuccessHandler((...values)=>resolve(values)).withFailureHandler((...values)=>reject({rpcValues:values}));if(hasValue)runner=runner.withUserObject(value);const previous=window.cdqRpcDispatchTraceV2765;window.cdqRpcDispatchTraceV2765={schema:'cdq-rpc-timing-v2765',id:traceId};try{runner[name](...args);}finally{window.cdqRpcDispatchTraceV2765=previous;}}catch(error){reject(error);}});
        const options={write:/^(?:enregistrer|sauvegarder|creer|supprimer|renommer|deplacer|dupliquer|envoyer|restaurer|retirer|ajouter|modifier|definir|cdq(?:Enregistrer|Creer|Supprimer|Restaurer|Renommer|Deplacer|Dupliquer|Envoyer|Retirer|Ajouter|Modifier|Inventory(?:Create|Move|Save|Set|Delete)))/i.test(name)};
        // The engine multiplexes reads and writes through one RPC name.
        // Treat an actual save/delete as a write, and receipt polling as
        // background work, so polling cannot occupy every foreground slot.
        if(name==='cdqReportEngineV2754'){
          const action=String(args[0]||''),payload=args[1]||{};
          options.write=['save','delete','restore','importIndex','editAcquire','editRenew','editRelease'].includes(action)||action==='list'&&payload.repair===true||action==='status'&&payload.restore===true;
          if(action==='status'&&!options.write)options.kind='background';
        }
        if(/^(?:actualiserContenuClient|cdqStartupMaintenanceV2686)$/.test(name))options.kind='background';
        options.traceId=traceId;options.label=label;
        options.interactive=/^(?:obtenirContenuClientOptimise|obtenirContenuDossierParesseux|obtenirDiagnosticApplication|obtenirDestinataireClientV2553|verifierEnvoiSelectionRecentV2553)$/.test(name)||name==='cdqReportEngineV2754'&&String(args[0])==='read';
        const clientBound=/^(?:obtenirContenuClientOptimise|obtenirContenuDossierParesseux|obtenirChunkDocumentPdfCDQ|obtenirPdfLecteurCDQV2520|obtenirDestinataireClientV2553|verifierEnvoiSelectionRecentV2553)$/.test(name)||name==='cdqReportEngineV2754'&&String(args[0])==='read';
        if(clientBound){const selected=typeof compagnieSelectionnee==='undefined'?'':String(compagnieSelectionnee);options.valid=()=>selected===(typeof compagnieSelectionnee==='undefined'?'':String(compagnieSelectionnee));}
        budget.run(send,options).then(values=>{if(typeof ok==='function')ok(...values);},error=>{
          const values=error?.rpcValues||(hasValue?[error,value]:[error]);
          if(typeof fail==='function')fail(...values);else report(values[0]);
        }).catch(report);
      };
    }});return proxy;
  }
  Object.assign(wrapped,original);wrapped.cdqBudgetV2751=true;return wrapped;
}

function installStartupPerformanceV2751(window,document){
  if(window.cdqStartupPerformanceV2751)return;
  let accessEpoch=0;
  const owner=()=>String(typeof utilisateurCourantEmail!=='undefined'?utilisateurCourantEmail:'').trim().toLowerCase()+'|'+String(typeof utilisateurCourantRole!=='undefined'?utilisateurCourantRole:'')+'|'+accessEpoch;
  const traceRows=[],traceStarts=new Map(),clock=()=>performance.now();
  const trace=(id,phase,method)=>{if(phase==='queued')traceStarts.set(id,clock());traceRows.push({id,phase,method,elapsedMs:Math.round(clock()-(traceStarts.get(id)??clock()))});if(traceRows.length>90)traceRows.shift();if(phase==='settled')traceStarts.delete(id);};
  window.cdqRpcQueueTimingV2765={snapshot:()=>({schema:'cdq-rpc-queue-v2765',events:traceRows.slice(),pending:traceStarts.size})};
  const budget=createRpcBudgetV2751({context:owner,trace});window.cdqRpcBudgetV2751=budget;
  const report=error=>{if(typeof window.afficherErreur==='function')window.afficherErreur(error);};
  function lazy(key,url,aliases){let facade;
    const current=()=>window[key]!==facade?window[key]:null;
    const route=key==='cdqInventoryModernV2592'?'inventory':'invoices';
    const failed=error=>{if(document.documentElement.dataset.cdqWorkspace===route)window.cdqWorkspaceV2638?.navigate?.('');report(error);};
    facade=createLazyPageV2751({owner,current,report:failed,load:()=>new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=url;
      // Existing scripts install their guarded API synchronously after DOM ready.
      script.onload=()=>{if(!current()){window[key]=facade;script.remove();reject(Error('Section indisponible. Réessayez.'));return;}resolve();};
      script.onerror=()=>{window[key]=facade;script.remove();reject(Error('Impossible de charger cette section. Réessayez.'));};
      document.head.appendChild(script);
    })});
    window[key]=facade;for(const [alias,method]of Object.entries(aliases))window[alias]=(...args)=>facade[method](...args);
  }
  lazy('cdqInventoryModernV2592','./inventory-modern-v2592.js',{ouvrirInventaireCDQ:'open'});
  lazy('cdqFacturesV2590','./invoice-ui-v2590.js',{ouvrirFacturesCDQ:'open',fermerFacturesCDQ:'close'});
  function installRpc(){const original=window.cdqApiRun;if(typeof original!=='function'||original.cdqBudgetV2751)return;
    window.cdqApiRun=wrapRpcRunnerV2751(original,budget,{report});
  }
  // All inline guards install before this deferred module. Keep their checks
  // inside the dispatch operation, including while a request was queued.
  installRpc();
  const clearClients=()=>{accessEpoch++;window.cdqClientsReadyV2658=null;delete document.documentElement.dataset.cdqClientsOwnerV2658;};
  window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')clearClients();});
  window.addEventListener('cdq:drive-cleared-v2632',clearClients);
  window.cdqStartupPerformanceV2751={budget,waitForHomeClients:()=>waitForHomeClientsV2751({allowed:()=>window.cdqDriveEntryV2632?.canRead()===true,
    owner:()=>owner().split('|')[0],promise:()=>window.cdqClientsReadyV2658,loadedOwner:()=>String(document.documentElement.dataset.cdqClientsOwnerV2658||'').trim().toLowerCase()})};
}

installStartupPerformanceV2751(window,document);
})();
