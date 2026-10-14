// An optimistic row is never a Drive receipt. Only the exact returned IDs
// become confirmed tombstones; failures restore their original local metadata.
export function createFileDeletionFenceV2746({owner,allowed,scope=()=>'',getTree=()=>null,restore=()=>{},durableBegin=()=>{},document:doc=globalThis.document,storage=globalThis.localStorage,notify=()=>{},now=Date.now}){
 const entries=new Map(),versions=new Map();let epoch=0,loadedOwner='';
 const ttl=24*60*60*1000,key=(client,kind,id)=>JSON.stringify([String(client||''),kind,String(id)]);
 const storeKey=email=>'cdq-confirmed-deletions-v2746:'+email;
 const normalized=selection=>({fileIds:[...new Set((selection.fileIds||[]).map(String).filter(Boolean))],folderIds:[...new Set((selection.folderIds||[]).map(String).filter(Boolean))]});
 function persist(){if(!loadedOwner)return;try{storage?.setItem(storeKey(loadedOwner),JSON.stringify([...entries.values()].filter(e=>e.status==='confirmed').map(({rows,...e})=>e)));}catch{}}
 function load(){
  if(!allowed())return false;const email=owner();if(!email)return false;
  if(email!==loadedOwner){epoch++;entries.clear();versions.clear();loadedOwner=email;try{for(const e of JSON.parse(storage?.getItem(storeKey(email))||'[]'))if(e?.status==='confirmed'&&typeof e.id==='string'&&['file','folder'].includes(e.kind)&&Number(e.at)>now()-ttl)entries.set(key(e.client,e.kind,e.id),{...e,rows:new Map()});}catch{}}
  return true;
 }
 function stateFor(client,id,kind='file'){
  if(!load())return null;
  for(const c of [String(client||''),'']){const e=entries.get(key(c,kind,id));if(e&&e.at>now()-ttl)return e.status;}
  return null;
 }
 function rowTarget(el){
  const file=el.dataset?.fileId||el.querySelector?.('.file-checkbox')?.dataset.fileId;
  const folder=el.dataset?.folderId||el.dataset?.folderSelectId;
  if(file)return {kind:'file',id:String(file),row:el.closest('.file-row,.cdq-drive-row,.cdq-workspace-row')||el};
  if(folder)return {kind:'folder',id:String(folder),row:el.closest('.folder,.cdq-drive-row,.cdq-workspace-row')||el};
 }
 function reveal(row,s){if(row.dataset.cdqPendingDeleteV2746!==s.token)return;delete row.dataset.cdqPendingDeleteV2746;if(s.display)row.style.setProperty('display',s.display,s.priority);else row.style.removeProperty('display');if(s.aria===null)row.removeAttribute('aria-hidden');else row.setAttribute('aria-hidden',s.aria);if(s.box)s.box.checked=s.checked;}
 function scan(){
  if(!load()||!doc)return;const client=String(scope()||'');
  for(const el of doc.querySelectorAll('.file-checkbox,[data-file-id],[data-folder-id],[data-folder-select-id]')){
   const t=rowTarget(el);if(!t)continue;const e=entries.get(key(client,t.kind,t.id))||entries.get(key('',t.kind,t.id));if(!e||e.at<=now()-ttl)continue;
   if(e.status==='confirmed'){t.row.remove();continue;}
   if(!e.rows.has(t.row)){const box=t.row.querySelector('.file-checkbox,.folder-checkbox');e.rows.set(t.row,{display:t.row.style.getPropertyValue('display'),priority:t.row.style.getPropertyPriority('display'),aria:t.row.getAttribute('aria-hidden'),box,checked:box?.checked,token:e.token});}
   t.row.dataset.cdqPendingDeleteV2746=e.token;t.row.style.setProperty('display','none','important');t.row.setAttribute('aria-hidden','true');const box=t.row.querySelector('.file-checkbox,.folder-checkbox');if(box)box.checked=false;
  }
 }
 function filterTree(client,node){
  if(!node||!load())return node;
  return {...node,fichiers:(node.fichiers||[]).filter(f=>!stateFor(client,f.id)),dossiers:(node.dossiers||[]).filter(d=>!stateFor(client,d.id,'folder')).map(d=>filterTree(client,d))};
 }
 function begin(selection,client='',requestId='',metadata={}){
  if(!load())throw Error('Accès Drive requis.');selection=normalized(selection);if(!selection.fileIds.length&&!selection.folderIds.length)throw Error('Aucun élément sélectionné.');
  client=String(client||'');const email=loadedOwner,stamp=epoch,token=/^delete-[\w-]{8,100}$/.test(requestId)?requestId:'delete-'+globalThis.crypto.randomUUID(),snapshot=[],targets=new Map();
  const add=(kind,id,sourceId=null)=>{id=String(id);targets.set(key(client,kind,id),{kind,id,sourceId});};
  selection.fileIds.forEach(id=>add('file',id));selection.folderIds.forEach(id=>add('folder',id));
  function capture(node,parent=null,ancestor=null){if(!node)return;const selected=selection.folderIds.includes(String(node.id)),source=ancestor||(selected?String(node.id):null);if(source){add('folder',node.id,ancestor||null);if(parent)snapshot.push({kind:'folder',parentId:String(parent.id),item:node,index:(parent.dossiers||[]).indexOf(node),sourceId:source});}
   for(const item of node.fichiers||[]){if(source)add('file',item.id,source);if(source||selection.fileIds.includes(String(item.id)))snapshot.push({kind:'file',parentId:String(node.id),item,index:node.fichiers.indexOf(item),sourceId:source});}
   for(const child of node.dossiers||[])capture(child,node,source);
  }
  capture(getTree(client));
  for(const [k]of targets)if(entries.get(k)?.status==='pending')throw Error('La suppression de cet élément est déjà en cours.');
  const current=()=>allowed()&&owner()===email&&epoch===stamp;
  const descendantIds=[...targets.values()].filter(t=>t.kind==='file'&&t.sourceId).map(t=>t.id);
  const detail={owner:email,clientId:client,requestId:token,ids:selection.fileIds,folderIds:selection.folderIds,descendantIds,pending:true};
  // The compact account-bound request must be durable before a row vanishes
  // or any network action starts. Storage failure leaves the original UI intact.
  durableBegin(detail,selection,metadata);
  for(const [k,t]of targets){versions.set(k,(versions.get(k)||0)+1);t.version=versions.get(k);entries.set(k,{...t,client,owner:email,status:'pending',token,at:now(),rows:new Map()});}
  scan();notify('cdq:delete-pending-v2746',detail);notify('cdq:delete-local-v2746',detail);
  let settled=false;
  function finish(confirmed={fileIds:[],folderIds:[]}){
   if(settled)return null;settled=true;if(!current())return null;
   const files=new Set((confirmed.fileIds||[]).map(String).filter(id=>selection.fileIds.includes(id))),folders=new Set((confirmed.folderIds||[]).map(String).filter(id=>selection.folderIds.includes(id))),omitted=[],confirmedDescendants=[];
   for(const [k,t]of targets){if(versions.get(k)!==t.version)continue;const e=entries.get(k);if(e?.token!==token)continue;const yes=t.sourceId?folders.has(t.sourceId):(t.kind==='file'?files:folders).has(t.id);
    if(yes){e.status='confirmed';e.at=now();if(t.sourceId&&t.kind==='file')confirmedDescendants.push(t.id);for(const row of e.rows.keys())row.remove();e.rows.clear();}
    else{entries.delete(k);omitted.push(t);for(const [row,s]of e.rows)reveal(row,s);}
   }
   const missingFiles=selection.fileIds.filter(id=>!files.has(id)),missingFolders=selection.folderIds.filter(id=>!folders.has(id));
   restore(client,snapshot.filter(s=>s.sourceId?!folders.has(s.sourceId):(s.kind==='file'?missingFiles:missingFolders).includes(String(s.item.id))));persist();scan();
   const result={owner:email,clientId:client,requestId:token,ids:[...files],folderIds:[...folders],descendantIds:confirmedDescendants,requestedIds:selection.fileIds,requestedFolderIds:selection.folderIds,ok:!missingFiles.length&&!missingFolders.length,pending:false};
   if(missingFiles.length||missingFolders.length)notify('cdq:delete-rollback-v2746',{...result,ids:missingFiles,folderIds:missingFolders,descendantIds:omitted.filter(t=>t.kind==='file'&&t.sourceId).map(t=>t.id)});
   notify('cdq:delete-settled-v2746',result);return result;
  }
  return {detail,current,finish,finished:()=>settled,rollback:()=>finish(),selection};
 }
 function restored(selection,client=''){
  if(!load())return;selection=normalized(selection);client=String(client||'');
  for(const [k,e]of entries)if((!client||e.client===client)&&(e.kind==='file'&&selection.fileIds.includes(e.id)||e.kind==='folder'&&selection.folderIds.includes(e.id)||e.sourceId&&selection.folderIds.includes(e.sourceId))){versions.set(k,(versions.get(k)||0)+1);entries.delete(k);for(const [row,s]of e.rows)reveal(row,s);}
  persist();scan();
 }
 function reset(){epoch++;for(const e of entries.values())if(e.status==='pending'&&owner()===e.owner)for(const [row,s]of e.rows)reveal(row,s);entries.clear();versions.clear();loadedOwner='';}
 const Observer=doc?.defaultView?.MutationObserver,observer=Observer?new Observer(scan):null;observer?.observe(doc.body,{childList:true,subtree:true});
 return {begin,filterTree,scan,reset,restored,stateFor,isSuppressed:(client,id)=>!!stateFor(client,id),isDestinationSuppressed:(client,id)=>!!stateFor(client,id,'folder'),destroy(){reset();observer?.disconnect();}};
}

export function installFileDeletionV2746(){
 if(window.cdqFileDeletionV2746)return window.cdqFileDeletionV2746;
 const owner=()=>String(typeof utilisateurCourantEmail==='undefined'?'':utilisateurCourantEmail||'').trim().toLowerCase(),company=()=>String(typeof compagnieSelectionnee==='undefined'?'':compagnieSelectionnee||'');
 const authorized=()=>cdqAccessState==='ready'&&!!owner()&&['admin','technicien'].includes(utilisateurCourantRole);
 const tree=client=>typeof cacheContenuCompagnies==='undefined'?null:cacheContenuCompagnies[client];
 const find=(node,id)=>!node?null:String(node.id)===String(id)?node:(node.dossiers||[]).map(child=>find(child,id)).find(Boolean);
 const restore=(client,rows)=>{const root=tree(client);if(!root)return;let changed=false;for(const r of rows){const parent=find(root,r.parentId);if(!parent)continue;const list=parent[r.kind==='file'?'fichiers':'dossiers']||=[];if(!list.some(item=>String(item.id)===String(r.item.id))){list.splice(Math.max(0,r.index),0,r.item);changed=true;}}if(changed&&company()===client)window.afficherContenu?.(root);};
 const notify=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
 const readable=()=>cdqAccessState==='ready'&&!!owner();
 const fence=createFileDeletionFenceV2746({owner,allowed:readable,scope:company,getTree:tree,restore,notify,durableBegin:(detail,selection,metadata)=>{const saved=queued(detail.owner);if(!saved.some(j=>j.requestId===detail.requestId))saved.push({owner:detail.owner,requestId:detail.requestId,clientId:detail.clientId,selection,method:metadata.method||'supprimerSelectionMultiple',createdAt:Date.now()});commitQueue(detail.owner,saved);}});
 window.cdqFileDeletionV2746=fence;
 const render=window.afficherContenu;if(typeof render==='function')window.afficherContenu=function(root,...args){const result=render.call(this,fence.filterTree(company(),root),...args);fence.scan();return result;};
 const rpc=(method,args)=>typeof window.cdqAppelServeur==='function'?window.cdqAppelServeur(method,args):new Promise((resolve,reject)=>{const run=cdqApiRun().withSuccessHandler(resolve).withFailureHandler(reject);run[method](...args);});
 function confirmed(result,selection){if(!result||result.ok===false)return {fileIds:[],folderIds:[]};const files=Array.isArray(result.fichiers)?result.fichiers:Array.isArray(result.ids)?result.ids:[],folders=Array.isArray(result.dossiers)?result.dossiers:typeof result.id==='string'?[result.id]:[];return {fileIds:files.filter(id=>selection.fileIds.includes(String(id))),folderIds:folders.filter(id=>selection.folderIds.includes(String(id)))};}
 async function locked(email,ids,task){const ordered=[...new Set(ids)].sort();const next=i=>i===ordered.length?task():typeof cdqRunDocumentV2660==='function'?cdqRunDocumentV2660(email,ordered[i],()=>next(i+1)):next(i+1);return next(0);}
 let undoTimer;
 function undo(receipt){const toast=document.getElementById('cdqUndoToast'),button=toast?.querySelector('button');if(!button)return;clearTimeout(undoTimer);const total=receipt.ids.length+receipt.folderIds.length;document.getElementById('cdqUndoText').textContent=total+(total===1?' élément envoyé à la corbeille.':' éléments envoyés à la corbeille.');toast.classList.add('show');button.onclick=async()=>{toast.classList.remove('show');clearTimeout(undoTimer);if(owner()!==receipt.owner||!authorized())return;try{const result=await rpc('restaurerSelectionMultiple',[receipt.ids,receipt.folderIds,receipt.clientId]);if(owner()!==receipt.owner||!authorized())return;if(Number(result?.nombre)!==total)throw Error('La restauration complète n’a pas été confirmée.');fence.restored({fileIds:receipt.ids,folderIds:receipt.folderIds},receipt.clientId);notify('cdq:deleted',{...receipt,restored:true});window.actualiserCompagnieEnArrierePlan?.(receipt.clientId);window.afficherMessage?.(result.message||'Restauration terminée.',true);}catch(error){if(owner()===receipt.owner)window.afficherErreur?.(error);}};undoTimer=setTimeout(()=>toast.classList.remove('show'),9000);}
 const activeDeletes=new Map(),pendingTransactions=new Map(),queueKey=email=>'cdq-delete-outbox-v2746:'+email;
 function queued(email){try{return JSON.parse(localStorage.getItem(queueKey(email))||'[]').filter(j=>j?.owner===email&&/^delete-[\w-]{8,100}$/.test(j.requestId)&&typeof j.clientId==='string'&&['supprimerSelectionMultiple','supprimerDossier','supprimerFichiers'].includes(j.method)&&Array.isArray(j.selection?.fileIds)&&Array.isArray(j.selection?.folderIds)&&j.selection.fileIds.length+j.selection.folderIds.length>0&&[...j.selection.fileIds,...j.selection.folderIds].every(id=>typeof id==='string'&&/^[\w-]{1,200}$/.test(id)));}catch{return [];}}
 function backgroundPending(email,count){try{window.cdqDriveBackgroundV2746?.setPending('deletion',count,email);}catch(error){console.warn('CDQ suivi suppression différé',error);}}
 function commitQueue(email,jobs){localStorage.setItem(queueKey(email),JSON.stringify(jobs));backgroundPending(email,jobs.length);}
 function finishQueue(email,requestId){commitQueue(email,queued(email).filter(j=>j.requestId!==requestId));pendingTransactions.delete(requestId);}
 async function remove(selection,{clientId=company(),close,method='supprimerSelectionMultiple',requestId=''}={}){
  if(!authorized())return;selection={fileIds:[...new Set((selection.fileIds||[]).map(String))],folderIds:[...new Set((selection.folderIds||[]).map(String))]};if(!selection.fileIds.length&&!selection.folderIds.length){close?.();return;}
  if(requestId&&activeDeletes.get(requestId)?.transaction.current())return activeDeletes.get(requestId).promise;
  let transaction;try{transaction=pendingTransactions.get(requestId);if(!transaction?.current())transaction=fence.begin(selection,clientId,requestId,{method});pendingTransactions.set(transaction.detail.requestId,transaction);}catch(error){transaction?.rollback();window.afficherErreur?.(error);return;}close?.();window.mettreAJourInterface?.();window.afficherMessage?.('Suppression en cours…',false);
  const id=transaction.detail.requestId;
  async function settle(result){
   if(!transaction.current())return;const receipt=transaction.finish(confirmed(result,selection));if(!receipt)return;finishQueue(receipt.owner,id);
   if(receipt.ids.length)window.supprimerFichiersDuCache?.(clientId,receipt.ids);for(const folderId of receipt.folderIds)window.supprimerDossierDuCache?.(clientId,folderId);
   const effective=[...new Set([...receipt.ids,...receipt.descendantIds])];if(effective.length){try{cdqPostToPwa({type:'CDQ_OFFLINE_REPORT_DELETED_V2714',email:receipt.owner,ids:effective});}catch{}try{Promise.resolve(window.cdqSaveRetirementV2707?.deleted(effective)).catch(error=>window.afficherErreur?.(error));}catch(error){window.afficherErreur?.(error);}}
   if(receipt.ids.length||receipt.folderIds.length){notify('cdq:deleted',receipt);undo(receipt);window.actualiserCompagnieEnArrierePlan?.(clientId);}
   if(!receipt.ok){const error=Error('Suppression partielle ou non confirmée. Les éléments non confirmés sont conservés.');error.code='CDQ_DELETE_PARTIAL';throw error;}if(company()===String(clientId))window.quitterModeSelection?.();window.afficherMessage?.(result.message||'Éléments envoyés à la corbeille.',true);
  }
  const fail=error=>{if(!transaction.current()||transaction.finished()&&error?.code!=='CDQ_DELETE_PARTIAL')return;const uncertain=error?.code==='CDQ_DELETE_UNCONFIRMED'||/timeout|répond pas|d[eé]lai|r[eé]seau|network|connexion|interromp|fetch|unreachable|unavailable/i.test(String(error?.message||error));if(uncertain){notify('cdq:delete-error-v2746',{...transaction.detail,pending:true,message:error.message});}else if(error?.code!=='CDQ_DELETE_PARTIAL'){transaction.rollback();finishQueue(transaction.detail.owner,id);}window.afficherErreur?.(error);};
  const execution=(async()=>{
  try{
   let done=()=>{};try{done=window.cdqDriveBackgroundV2746?.begin('deletion:'+transaction.detail.requestId,transaction.detail.owner)||done;}catch(error){console.warn('CDQ suivi suppression différé',error);}
   const result=await locked(transaction.detail.owner,[...selection.fileIds,...transaction.detail.descendantIds],async()=>{
    if(!transaction.current()||!authorized())throw Error('Le compte a changé.');let timeout;
    const request=Promise.resolve().then(()=>rpc(method,method==='supprimerDossier'?[selection.folderIds[0],clientId]:method==='supprimerFichiers'?[selection.fileIds,clientId]:[selection.fileIds,selection.folderIds,clientId]));
    timeout=setTimeout(()=>{if(!transaction.current()||transaction.finished())return;const error=Error('Suppression Drive non confirmée. La demande reste conservée; la réponse actuelle est toujours attendue.');error.code='CDQ_DELETE_UNCONFIRMED';fail(error);},55000);
    // A pending notice does not end the real transport flight or its file lock.
    // Online/retry requests reuse activeDeletes until the actual reply arrives.
    return request.finally(()=>clearTimeout(timeout));
   }).finally(()=>{try{done();}catch(error){console.warn('CDQ suivi suppression différé',error);}});await settle(result);
  }catch(error){fail(error);}finally{if(activeDeletes.get(id)?.transaction===transaction)activeDeletes.delete(id);if(transaction.current())window.mettreAJourInterface?.();}
  })();activeDeletes.set(id,{promise:execution,transaction});return execution;
 }
 async function resume(){if(!authorized())return;const email=owner(),jobs=queued(email);backgroundPending(email,jobs.length);await Promise.all(jobs.map(j=>remove(j.selection,{clientId:j.clientId,method:j.method,requestId:j.requestId})));}
 fence.remove=remove;fence.retryPending=resume;
 window.confirmerSuppression=()=>remove({fileIds:window.obtenirFichiersSelectionnes?.()||[],folderIds:window.obtenirDossiersSelectionnes?.()||[]},{close:()=>window.fermerConfirmationSuppression?.()});
 window.confirmerSuppressionDossier=()=>{const folder=typeof dossierEnCoursDeSuppression==='undefined'?null:dossierEnCoursDeSuppression;if(folder)return remove({fileIds:[],folderIds:[String(folder.id)]},{close:()=>window.fermerConfirmationSuppressionDossier?.(),method:'supprimerDossier'});};
 window.addEventListener('cdq:drive-cleared-v2632',()=>{fence.reset();pendingTransactions.clear();});window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready'){fence.reset();pendingTransactions.clear();}else resume().catch(error=>window.afficherErreur?.(error));});window.addEventListener('online',()=>resume().catch(error=>window.afficherErreur?.(error)));
 window.addEventListener('cdq:file-restored-v2746',event=>{if(event.detail?.owner===owner())fence.restored({fileIds:[event.detail.id],folderIds:[event.detail.id]});});
 if(authorized())queueMicrotask(()=>resume().catch(error=>window.afficherErreur?.(error)));return fence;
}
