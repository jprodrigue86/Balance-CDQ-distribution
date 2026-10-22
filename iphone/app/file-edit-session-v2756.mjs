// The historical API name remains compatible with the reader adapters.
// Opening checks Drive access once; it never reserves a file for one technician.
export function createFileEditSessionV2756({rpc,fileId,clientId,sessionId=crypto.randomUUID(),owner,currentOwner=()=>owner,onState=()=>{}}){
 let closed=false,authorized=false,flight=null,generation=0;
 const payload={fileId:String(fileId),clientId:String(clientId),sessionId};
 const current=()=>{try{return !closed&&!!owner&&currentOwner()===owner;}catch{return false;}};
 const check=()=>{if(!current()){authorized=false;onState(state());throw Object.assign(Error('Le compte ou le fichier a changé.'),{code:'EDIT_ACCOUNT_CHANGED'});}};
 function state(){const active=authorized&&current();return {fileId,sessionId,active,remainingMs:active?Infinity:0,holder:'',exclusive:false};}
 const notify=()=>onState(state());
 async function acquire(){
  check();if(authorized)return state();if(flight)return flight;
  const stamp=++generation;
  flight=Promise.resolve().then(()=>{check();return rpc('editAcquire',payload);}).then(result=>{
   check();if(stamp!==generation)throw Error('Le compte ou le fichier a changé.');
   if(result?.ok!==true||result.protocol!==1||result.acquired!==true)throw Object.assign(Error('La modification de ce fichier n’a pas été autorisée. Vérifiez votre accès Drive.'),{code:'EDIT_NOT_AUTHORIZED'});
   if(result.exclusive!==false)throw Object.assign(Error('Le serveur utilise encore une ancienne version des droits de modification. Réessayez après la mise à jour CDQ.'),{code:'EDIT_PROTOCOL_MISMATCH'});
   authorized=true;notify();return state();
  }).finally(()=>{flight=null;});
  return flight;
 }
 return {acquire,renew:acquire,state,async ensure(){await acquire();check();},async close(){if(closed)return;closed=true;authorized=false;generation++;notify();}};
}

// The reader retains an explicit access-revocation gate. An authorized reader
// has no lease deadline; a closed or locked account still sends zero to stop it.
export function installReaderEditLeaseV2756({document,viewer,status}){
 let enabled=false,allowed=true;
 function check(){if(!enabled||allowed)return true;document.activeElement?.blur?.();status('Modification suspendue : déverrouillez votre compte CDQ. Vos réponses restent conservées.');return false;}
 const guard=event=>{if(!check()){event.preventDefault();event.stopImmediatePropagation();}};
 for(const type of ['beforeinput','pointerdown','keydown','change'])viewer.addEventListener(type,guard,true);
 return {check,reset(){enabled=false;allowed=true;},update(remainingMs){enabled=true;allowed=typeof remainingMs==='number'&&remainingMs>0;}};
}

// Local copies keep account and lifecycle checks when Drive assigns an ID.
// The access check is shared and never claims exclusive use of that file.
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
