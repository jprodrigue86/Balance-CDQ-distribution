export function installLocalReportListV2713({host=window,fromPwa,owner,allowed,confirm,remove,post,reportError,reconcile=()=>{},now=Date.now}){
 const seen=new Map(),requests=new Map();
 host.addEventListener('message',e=>{
  if(!fromPwa(e)||!allowed())return;const d=e.data||{},email=owner();if(d.email!==email)return;
  if(d.type==='CDQ_LOCAL_REPORT_ERROR_V2713'){reportError(d.message);return;}
  if(d.type==='CDQ_LOCAL_REPORT_SNAPSHOT_V2714'&&Array.isArray(d.localIds)&&d.localIds.every(id=>/^[\w-]{8,100}$/.test(id))){reconcile(new Set(d.localIds));return;}
  if(d.type==='CDQ_LOCAL_REPORT_RETIRED_V2714'&&/^[\w-]{8,100}$/.test(d.localId)){seen.set(email+'|'+d.localId,{retired:true});remove(d.clientId,'cdq-local-'+d.localId);return;}
  if(d.type==='CDQ_LOCAL_REPORT_RETIRE_RESULT_V2714'){
   const request=requests.get(d.requestId);if(!request||request.email!==email||request.id!==d.localId)return;
   clearTimeout(request.timer);requests.delete(d.requestId);
   if(d.ok){if(request.local){seen.set(email+'|'+d.localId,{retired:true});remove(request.client,'cdq-local-'+d.localId);}request.resolve(true);}else request.reject(Error(d.message||'La copie reste conservée dans la liste.'));return;
  }
  if(d.type!=='CDQ_LOCAL_REPORT_UPDATED_V2713'||!/^[\w-]{8,100}$/.test(d.localId)||!d.clientId||!(d.blob instanceof Blob))return;
  const localId='cdq-local-'+d.localId,key=email+'|'+d.localId,old=seen.get(key);if(old&&Number(old.version)>Number(d.editVersion||0))return;
  if(old?.retired)return;
  if(d.driveId){remove(d.clientId,localId);seen.set(key,{version:Number(d.editVersion||0),driveId:d.driveId});return;}
  if(old?.driveId||old?.retired)return;seen.set(key,{version:Number(d.editVersion||0),driveId:''});
  confirm({id:localId,nom:String(d.name||'Rapport.pdf'),type:'PDF',_cdqLocalReportV2713:d.localId,_cdqPendingSaveV2660:String(d.uploadId||d.localId)},String(d.clientId),String(d.folderId||d.clientId));
 });
 return {open(id){if(!String(id).startsWith('cdq-local-'))return false;if(!allowed())throw Error('Accès Drive requis.');post({type:'CDQ_LOCAL_REPORT_OPEN_V2713',email:owner(),localId:String(id).slice(10)});return true;},
  retire(id,client){if(!allowed())return Promise.reject(Error('Accès Drive requis.'));const local=String(id).startsWith('cdq-local-');id=String(id).replace(/^cdq-local-/,'');if(!/^[\w-]{8,150}$/.test(id))return Promise.reject(Error('Copie locale invalide.'));
   const email=owner(),requestId='retire_'+now()+'_'+Math.random().toString(36).slice(2);
   const promise=new Promise((resolve,reject)=>{const request={id,client,email,local,resolve,reject,timer:setTimeout(()=>{requests.delete(requestId);reject(Error('Le retrait n’a pas été confirmé. La copie reste conservée.'))},15000)};requests.set(requestId,request);post({type:local?'CDQ_OFFLINE_LOCAL_RETIRE_V2714':'CDQ_OFFLINE_REPORT_RETIRE_TARGET_V2714',email,localId:id,requestId});});
   if(local)seen.set(email+'|'+id,{...seen.get(email+'|'+id),retiring:promise});return promise;
  },async canPublish(id){const key=owner()+'|'+id;try{await seen.get(key)?.retiring;}catch{}return !seen.get(key)?.retired;},
  reset(){for(const r of requests.values()){clearTimeout(r.timer);r.reject(Error('Le compte a changé.'));}requests.clear();seen.clear();}};
}
