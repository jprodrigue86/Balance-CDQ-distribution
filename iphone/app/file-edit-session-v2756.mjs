// The server is authoritative. Timing uses elapsed time, never the device clock
// compared with the server clock. A late response cannot revive a closed session.
export function createFileEditSessionV2756({rpc,fileId,clientId,sessionId=crypto.randomUUID(),owner,currentOwner=()=>owner,onState=()=>{},now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
 let closed=false,until=0,flight=null,timer=null,generation=0,last=null;
 const payload={fileId:String(fileId),clientId:String(clientId),sessionId};
 function state(){return {fileId,sessionId,active:!closed&&currentOwner()===owner&&now()<until,remainingMs:Math.max(0,until-now()),holder:last?.holder||''};}
 function notify(){onState(state());}
 function schedule(){clearTimer(timer);if(closed)return;timer=setTimer(()=>{notify();renew().catch(()=>{});},state().active?Math.min(30000,Math.max(10,until-now())):30000);}
 async function request(action){
  if(closed||currentOwner()!==owner)throw Error('Le compte ou le fichier a changé.');
  if(flight)return flight;
  const stamp=++generation,started=now();
  flight=Promise.resolve().then(()=>rpc(action,payload)).then(result=>{
   if(closed||stamp!==generation||currentOwner()!==owner)throw Error('Le compte ou le fichier a changé.');
   last=result;
   if(!result?.ok||result.protocol!==1||!result.acquired){until=0;notify();throw Object.assign(Error(result?.pending?'Une sauvegarde de ce fichier se termine. Réessayez dans un instant.':(result?.holder||'Un autre technicien')+' a ce fichier ouvert. Réessayez après sa fermeture.'),{code:'FILE_EDIT_LOCKED'});}
   const duration=Number(result.expiresAt)-Number(result.serverTime);
   if(!Number.isFinite(duration)||duration<=0||duration>120000)throw Error('La session de modification n’est pas confirmée.');
   // Count the complete round trip against the lease, including queue time.
   until=started+duration-1000;notify();return state();
  }).finally(()=>{flight=null;schedule();});
  return flight;
 }
 const renew=()=>request(state().active?'editRenew':'editAcquire');
 return {acquire:()=>request('editAcquire'),renew,state,
  async ensure(){if(!state().active)await renew();if(!state().active)throw Error('La session de modification a expiré. Vos réponses restent conservées.');},
  async close(){if(closed)return;closed=true;++generation;clearTimer(timer);notify();try{await flight;}catch{}if(currentOwner()===owner)await rpc('editRelease',payload);}
 };
}

export function installReaderEditLeaseV2756({document,viewer,now=()=>performance.now(),status}){
 let enabled=false,until=0,timer;
 const active=()=>!enabled||now()<until;
 function check(){if(active())return true;document.activeElement?.blur?.();status('Modification suspendue : la connexion au fichier doit être rétablie. Vos réponses restent conservées.');return false;}
 const guard=event=>{if(!check()){event.preventDefault();event.stopImmediatePropagation();}};
 for(const type of ['beforeinput','pointerdown','keydown','change'])viewer.addEventListener(type,guard,true);
 return {check,reset(){enabled=false;until=0;clearTimeout(timer);},update(remainingMs){enabled=true;until=now()+Math.max(0,Math.min(120000,Number(remainingMs)||0));clearTimeout(timer);timer=setTimeout(check,Math.max(0,until-now()));}};
}

// Local reports open before Drive has assigned an ID. Adopt the same file
// lease when its durable receipt arrives, and suspend the local reader until
// acquisition succeeds. A refused lease never discards the technician's copy.
export function createLocalReaderEditSessionsV2756({acquire,open,currentOwner,isOnline=()=>navigator.onLine!==false,setTimer=setTimeout,clearTimer=clearTimeout}){
 const readers=new Map();
 const driveId=copy=>String(copy?.driveId||copy?.filledDriveId||copy?.reportEngineV2754?.fileId||'');
 function emit(entry){entry.handle?.editLease?.(entry.lease?.state().active?entry.lease.state().remainingMs:0);}
 function stop(entry){if(entry.closed)return;entry.closed=true;clearTimer(entry.timer);if(readers.get(entry.id)===entry)readers.delete(entry.id);entry.handle?.editLease?.(0);entry.lease?.close().catch(()=>{});}
 async function ensure(entry){
  if(entry.closed||currentOwner()!==entry.owner)throw Error('Le compte ou le fichier a changé.');
  if(!driveId(entry.copy)||!isOnline())return;
  if(entry.flight)return entry.flight;
  entry.flight=(async()=>{
   if(entry.lease){await entry.lease.ensure();emit(entry);return;}
   emit(entry);
   const lease=await acquire(driveId(entry.copy),entry.copy.destination.clientId,entry.sessionId,state=>{
    entry.remaining=state.active?state.remainingMs:0;if(!entry.closed)entry.handle?.editLease?.(entry.remaining);
   });
   if(entry.closed||currentOwner()!==entry.owner){await lease.close();throw Error('Le compte ou le fichier a changé.');}
   entry.lease=lease;entry.remaining=lease.state().active?lease.state().remainingMs:0;emit(entry);
  })().finally(()=>{entry.flight=null;});
  return entry.flight;
 }
 function retry(entry){
  if(entry.closed||!driveId(entry.copy)||!isOnline())return;
  clearTimer(entry.timer);
  ensure(entry).catch(()=>{if(!entry.closed)entry.timer=setTimer(()=>retry(entry),30000);});
 }
 return {
  async open(copy,data){
   if(data.readOnly||!copy?.email)return open(data);
   if(currentOwner()!==copy.email)throw Error('Le compte ou le fichier a changé.');
   const entry={id:copy.id,owner:copy.email,copy,sessionId:crypto.randomUUID(),lease:null,flight:null,handle:null,remaining:undefined,closed:false,timer:null};
   if(readers.has(copy.id))throw Error('Ce rapport est déjà ouvert.');readers.set(copy.id,entry);
   try{
    if(driveId(copy)&&isOnline()){entry.remaining=0;await ensure(entry);}
    const guarded=callback=>typeof callback==='function'?async(...args)=>{await ensure(entry);return callback(...args);}:callback;
    entry.handle=await open({...data,editLeaseMsV2756:entry.remaining,onSave:guarded(data.onSave),onSaveSnapshot:guarded(data.onSaveSnapshot),onClose:()=>{stop(entry);data.onClose?.();}});
    if(entry.closed||currentOwner()!==entry.owner){stop(entry);entry.handle?.editLease?.(0);return entry.handle;}
    // A Drive receipt can arrive while the asynchronous reader is opening.
    if(driveId(entry.copy)&&isOnline()){entry.handle?.editLease?.(entry.lease?.state().active?entry.lease.state().remainingMs:0);retry(entry);}
    return entry.handle;
   }catch(error){stop(entry);throw error;}
  },
  update(copy){const entry=readers.get(copy?.id);if(!entry||copy.email!==entry.owner)return;
   entry.copy=copy;if(copy.removed){stop(entry);entry.handle?.editLease?.(0);return;}
   if(driveId(copy)&&isOnline()){if(!entry.lease)entry.remaining=0;retry(entry);}
  },
  online(){for(const entry of readers.values())retry(entry);},
  close(){for(const entry of readers.values())stop(entry);}
 };
}

// A deadline invalidates publication, not a server write already in progress.
// Late lease receipts are released by the caller instead of reviving an open.
export function createReaderOpeningAttemptV2757({valid=()=>true,deadlineMs=45000,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,onPhase=()=>{}}={}){
 const started=now();let cancelled=null,timer,abort;
 const stopped=new Promise((_,reject)=>{abort=reject;});stopped.catch(()=>{});
 const fail=(message,code='READER_OPEN_CANCELLED')=>Object.assign(Error(message),{code});
 const check=()=>{if(cancelled)throw cancelled;if(!valid())throw fail('Le compte, le client ou le fichier a changé.');};
 const cancel=error=>{if(cancelled)return;cancelled=error||fail('Ouverture annulée.');clearTimer(timer);abort(cancelled);};
 timer=setTimer(()=>cancel(fail('La vérification du fichier prend trop de temps. Fermez puis rouvrez le PDF pour réessayer.','READER_OPEN_TIMEOUT')),deadlineMs);
 return {check,cancel,phase(name){check();try{onPhase({phase:name,elapsedMs:Math.round(now()-started)});}catch{}},finish(){check();clearTimer(timer);},
  async wait(task,late=()=>{}){check();const operation=Promise.resolve().then(()=>{check();return task();});operation.then(value=>{if(cancelled||!valid())Promise.resolve(late(value)).catch(()=>{});},()=>{});const value=await Promise.race([operation,stopped]);check();return value;}
 };
}
