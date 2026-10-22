// Local readers track only their account and lifetime. Opening or receiving a
// Drive ID never requests a reservation, permission lease or availability RPC.
export function createLocalReaderSessionsV2761({open,currentOwner}){
 const readers=new Map();
 const current=entry=>{try{return !entry.closed&&!entry.copy.removed&&!!entry.owner&&currentOwner()===entry.owner;}catch{return false;}};
 const check=entry=>{if(!current(entry))throw Object.assign(Error('Le compte ou le fichier a changé.'),{code:'READER_ACCOUNT_CHANGED'});};
 function stop(entry){if(entry.closed)return;entry.closed=true;if(readers.get(entry.id)===entry)readers.delete(entry.id);}
 return {
  async open(copy,data){
   if(!copy?.email)return open(data);
   const entry={id:copy.id,owner:copy.email,copy,closed:false};check(entry);
   if(readers.has(copy.id))throw Error('Ce rapport est déjà ouvert sur cet appareil.');
   readers.set(copy.id,entry);
   const guarded=callback=>typeof callback==='function'?async(...args)=>{check(entry);return callback(...args);}:callback;
   try{
    const handle=await open({...data,isCurrentOpeningV2757:()=>current(entry)&&data.isCurrentOpeningV2757?.()!==false,
      onSave:guarded(data.onSave),onSaveSnapshot:guarded(data.onSaveSnapshot),onClose:()=>{stop(entry);data.onClose?.();}});
    check(entry);return handle;
   }catch(error){stop(entry);throw error;}
  },
  update(copy){const entry=readers.get(copy?.id);if(!entry||copy.email!==entry.owner)return;entry.copy=copy;if(copy.removed)stop(entry);},
  close(){for(const entry of readers.values())stop(entry);}
 };
}

// Cancellation and deadlines apply only to loading the requested document.
export function createReaderOpeningAttemptV2757({valid=()=>true,deadlineMs=45000,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,onPhase=()=>{}}={}){
 const started=now();let cancelled=null,timer,abort;
 const stopped=new Promise((_,reject)=>{abort=reject;});stopped.catch(()=>{});
 const fail=(message,code='READER_OPEN_CANCELLED')=>Object.assign(Error(message),{code});
 const check=()=>{if(cancelled)throw cancelled;if(!valid())throw fail('Le compte, le client ou le fichier a changé.');};
 const cancel=error=>{if(cancelled)return;cancelled=error||fail('Ouverture annulée.');clearTimer(timer);abort(cancelled);};
 timer=setTimer(()=>cancel(fail('Le chargement du PDF prend trop de temps. Fermez puis rouvrez le PDF pour réessayer.','READER_OPEN_TIMEOUT')),deadlineMs);
 return {check,cancel,phase(name){check();try{onPhase({phase:name,elapsedMs:Math.round(now()-started)});}catch{}},finish(){check();clearTimer(timer);},
  async wait(task,late=()=>{}){check();const operation=Promise.resolve().then(()=>{check();return task();});operation.then(value=>{if(cancelled||!valid())Promise.resolve(late(value)).catch(()=>{});},()=>{});const value=await Promise.race([operation,stopped]);check();return value;}
 };
}
