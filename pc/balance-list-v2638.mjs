import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
import {createEquipmentTrackerV2697} from './equipment-list-v2697.mjs';
import './balance-list-conformity-v2728.mjs';
import {updateBalanceListFastV2729} from './balance-list-fast-v2729.mjs';
import {ensureBalanceListFolderV2731,balanceListLocationV2731,balanceListNeedsPlacementV2731} from './balance-list-folder-v2731.mjs';
import './field-work-v2729.mjs';
const equipment=createEquipmentTrackerV2697({identity:()=>calibrationIdentity().email,library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},loadPdf:(id,revision)=>window.cdqLoadPdfForCalibrationV2668(id,revision),loadSheet:(id,revision,clientId)=>call('obtenirSnapshotGoogleSheetHorsLigne',id,clientId||client())});
window.cdqEquipmentListV2697=equipment;
const canRead=()=>!!window.cdqDriveEntryV2632?.canRead()&&!!calibrationIdentity().email;
const canWrite=()=>canRead()&&['admin','technicien'].includes(calibrationIdentity().role);
// A list belongs to the client, never the archive or child folder currently expanded.
const client=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const excluded=v=>/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/.test(norm(v));
let epoch=0,owner='',visibleClient='',timer=0,scanTimer=0,pcScan=null;
function readerBusy(){try{return !!window.parent.document.getElementById('legacy-pdf-reader')||document.documentElement.classList.contains('cdq-workspace-reader-open');}catch{return document.documentElement.classList.contains('cdq-workspace-reader-open');}}
const jobs=new Map(),receipts=new Map(),states=new Map(),failed=new Map();
// Saves belong to their client, independently of the visible page or selection.
const saveWaits=new Map(),changes=new Map(),satisfied=new Map(),clientTimers=new Map();
const hydrated=new Set(),reviews=new Map(),reviewReceipts=new Map(),pausedClients=new Set();
const key=id=>calibrationIdentity().email+'|'+id;
const journalKey=id=>'cdqBalanceListJournalV2730:'+key(id);
function restoreClient(id){
 const k=key(id);if(!id||hydrated.has(k)||!canRead())return;hydrated.add(k);
 try{const value=JSON.parse(localStorage.getItem(journalKey(id))||'null');if(value?.owner!==calibrationIdentity().email||value.clientId!==String(id)||value.version!==1)return;
  if(Number.isSafeInteger(value.changes)&&value.changes>=0)changes.set(k,value.changes);
  if(Number.isSafeInteger(value.satisfied)&&value.satisfied>=0)satisfied.set(k,Math.min(value.satisfied,changes.get(k)||0));
  if(Array.isArray(value.pending))saveWaits.set(k,new Map(value.pending.filter(row=>Array.isArray(row)&&row.length===2&&row.every(v=>typeof v==='string'))));
  if(Array.isArray(value.reviews))reviews.set(k,new Set(value.reviews.filter(token=>typeof token==='string')));
  if(Array.isArray(value.acknowledgements)){const acks=new Map(value.acknowledgements.filter(row=>Array.isArray(row)&&typeof row[0]==='string'&&row[1]?.clientId===String(id)));reviewReceipts.set(k,acks);for(const [token,detail] of acks)if(reviews.get(k)?.has(token))equipment.acknowledge(token,detail);}
  if(value.ready?.status==='ready'&&value.ready.clientId===String(id)&&typeof value.ready.fileId==='string')states.set(k,value.ready);
 }catch{}
}
function persistClient(id){
 if(!id||!canRead())return;const k=key(id),r=states.get(k),ready=r?.status==='ready'?Object.fromEntries(['status','fileId','clientId','folderId','count','listRevision','listStamp','checkedAt','updatedAt','digest','rows'].filter(name=>r[name]!==undefined).map(name=>[name,r[name]])):null;
 try{localStorage.setItem(journalKey(id),JSON.stringify({version:1,owner:calibrationIdentity().email,clientId:String(id),changes:changes.get(k)||0,satisfied:satisfied.get(k)||0,pending:[...(saveWaits.get(k)||[])],reviews:[...(reviews.get(k)||[])],acknowledgements:[...(reviewReceipts.get(k)||[])].filter(([token])=>reviews.get(k)?.has(token)),ready}));}catch{}
}
const waiting=id=>{restoreClient(id);return (saveWaits.get(key(id))?.size||0)>0;};
const needsUpdate=k=>(changes.get(k)||0)>(satisfied.get(k)||0)||(reviews.get(k)?.size||0)>0;
function paintRows(){
 restoreClient(client());
 for(const row of document.querySelectorAll('.file-row')){row.querySelector('[data-balance-list-working]')?.remove();row.dataset.balanceListBusy='false';}
}
function scheduleClient(id,delay=150){
  restoreClient(id);
  const k=key(id);if(clientTimers.has(k))return;
  const failure=failed.get(k),stamp=clientFingerprint(id)+'|saved:'+(changes.get(k)||0);
  if(failure?.stamp===stamp){if(!failure.retryAt)return;delay=Math.max(delay,failure.retryAt-Date.now());}
  // A saved report's list can update while its PDF stays open. Foreground
  // field work has priority; the viewer itself is never a reason to lose work.
  const version=epoch;clientTimers.set(k,setTimeout(()=>{clientTimers.delete(k);if(version!==epoch||waiting(id))return;if(window.cdqFieldWorkV2729?.available()===false){pausedClients.add(k);return;}pausedClients.delete(k);refresh(false,true,id).catch(()=>{});},delay));
}
function temporaryFailure(error){
 const message=norm(error?.message||error);
 if(/compte|permission|autorise|interdit|acces|conflict|revision|a change|ont change|incomplet|non confirme|non confirmee/.test(message))return false;
 return /network|failed to fetch|fetch failed|err_(?:network|connection)|timeout|timed? out|delai.*(?:depasse|expire)|temporair|indisponib|unavailable|reessayez plus tard|try again later|too many requests|\b(?:502|503|504|429)\b/.test(message)||['NetworkError','TimeoutError'].includes(error?.name);
}
function fail(id,stamp,error){
 const k=key(id),prior=failed.get(k),attempts=prior?.stamp===stamp?prior.attempts+1:1,transient=temporaryFailure(error);
 const retryAt=transient&&attempts<3?Date.now()+(attempts===1?2000:8000):0;
 failed.set(k,{stamp,attempts,transient,retryAt});if(retryAt)scheduleClient(id,retryAt-Date.now());
}
function clearFailure(k){failed.delete(k);if(clientTimers.has(k)){clearTimeout(clientTimers.get(k));clientTimers.delete(k);}}
function updateConfirmedRows(id,detail,sourceId){
 const k=key(id),state=states.get(k),revision=String(detail.modifiedTime||detail.dateModification||detail.revision||'');if(!Array.isArray(state?.rows)||!revision)return;
 const signature=detail.equipmentSignature||equipment.signature?.(sourceId,id);let values;try{values=JSON.parse(signature);}catch{return;}
 if(!Array.isArray(values)||values.length!==6||!values.slice(0,5).every(v=>typeof v==='string')||!['conforming','nonconforming','unknown'].includes(values[5]))return;
 const fileId=String(detail.id||detail.fileId||sourceId),[fabricant,modele,capacite,echelon,identification,conformity]=values,prior=state.rows.find(row=>row.id===sourceId||row.id===fileId),row={id:fileId,source:detail.name||detail.nom||prior?.source||'',revision,fabricant,modele,capacite,echelon,identification,conformity};
 const rows=state.rows.filter(old=>old.id!==fileId&&old.id!==sourceId&&(!identification||norm(old.identification)!==norm(identification)));rows.push(row);rows.sort((a,b)=>String(a.identification||a.source).localeCompare(String(b.identification||b.source),'fr',{numeric:true}));states.set(k,{...state,rows,count:rows.length});
 // These exact values came from the acknowledged saved bytes, never from a
 // pending upload. The PDF's old digest remains until its own write is acked.
 equipment.rememberRead?.({...detail,id:fileId},signature,id);
 window.dispatchEvent(new CustomEvent('cdq:balance-list-rows-v2730',{detail:{clientId:String(id)}}));
}
async function saved(event,local=false){
  if(owner!==calibrationIdentity().email)reset();
  const d=event.detail||{},id=String(d.clientId||'');if(!id){schedule();return;}
  if(!canWrite()||excluded(d.name||d.nom))return;
  if(d.owner&&String(d.owner.email||d.owner).trim().toLowerCase()!==String(calibrationIdentity().email).trim().toLowerCase())return;
  restoreClient(id);const k=key(id),file=String(d.sourceId||d.id||d.fileId||''),token=String(d.saveId||'');
  const pending=saveWaits.get(k);
  const matched=pending?.has(file)?file:token?[...(pending||[])].find(([,value])=>value===token)?.[0]:undefined;
  if(!local||d.pending===false){
    // An earlier acknowledgement cannot release a newer edit of this file.
    if(matched!==undefined&&token&&pending.get(matched)!==token){equipment.acknowledge(token,d);return;}
    if(matched!==undefined)pending.delete(matched);
    if(token){let review=reviews.get(k);if(!review)reviews.set(k,review=new Set());review.add(token);let acks=reviewReceipts.get(k);if(!acks)reviewReceipts.set(k,acks=new Map());acks.set(token,Object.fromEntries(['id','fileId','sourceId','clientId','owner','revision','modifiedTime','dateModification','version','md5Checksum','sha256Checksum'].filter(name=>d[name]!==undefined).map(name=>[name,d[name]])));}
    // Persist the acknowledged work before any PDF analysis promise. Closing
    // the app here must not forget an update whose Drive upload already ended.
    persistClient(id);
  }
  const savedOwner=owner,savedEpoch=epoch,review=!local||d.pending===false?equipment.awaitDecision(token):equipment.decision(token);const decision=review&&typeof review.then==='function'?(await review,equipment.decision(token)):review;if(savedOwner!==owner||savedEpoch!==epoch||!canWrite())return;
  if(decision===false){reviews.get(k)?.delete(token);if(!local||d.pending===false)equipment.acknowledge(token,d);persistClient(id);if(!waiting(id)&&(failed.has(k)||needsUpdate(k)))scheduleClient(id);paintRows();return;}
  if(local&&d.pending!==false){let pending=saveWaits.get(k);if(!pending)saveWaits.set(k,pending=new Map());pending.set(file,token);persistClient(id);paintRows();return;}
  if(!local||d.pending===false)equipment.acknowledge(token,d);
  updateConfirmedRows(id,d,file);
  reviews.get(k)?.delete(token);changes.set(k,(changes.get(k)||0)+1);persistClient(id);const job=jobs.get(k);if(job)job.dirty=true;
  paintRows();scheduleClient(id);
}
function root(id){try{return cacheContenuCompagnies[id]||null;}catch{return null;}}
function listFile(id){const tree=root(id);return typeof balanceListLocationV2731==='function'?balanceListLocationV2731(tree,states.get(key(id))?.fileId).file:(tree?.fichiers||[]).find(f=>norm(f.nom||f.name)==='liste de balance.pdf');}
function listFolder(id){return typeof balanceListLocationV2731==='function'?balanceListLocationV2731(root(id),states.get(key(id))?.fileId).folder:null;}
function needsPlacement(id){return typeof balanceListNeedsPlacementV2731==='function'&&balanceListNeedsPlacementV2731(root(id));}
function rehydratingListId(tree,confirmed){
 if(!tree||confirmed?.status!=='ready'||String(confirmed.clientId)!==String(tree.id)||!confirmed.fileId||!confirmed.folderId||String(confirmed.folderId)===String(tree.id))return '';
 const folders=(tree.dossiers||[]).filter(folder=>String(folder.id)===String(confirmed.folderId)&&norm(folder.nom||folder.name)==='liste de balance');
 // Root metadata can replace an expired child cache while it reloads. Only
 // the already verified client/folder binding survives that incomplete view.
 return folders.length===1&&(folders[0].charge===false||!Array.isArray(folders[0].fichiers))?String(confirmed.fileId):'';
}
const clientFingerprint=id=>sourceFingerprint(root(id),states.get(key(id)));
async function placeList(id,version,create=true){
 if(typeof ensureBalanceListFolderV2731!=='function')return null;
 return ensureBalanceListFolderV2731({clientId:id,owner:calibrationIdentity().email,preferredFileId:states.get(key(id))?.fileId||listFile(id)?.id||'',create,rpc:(name,...args)=>call(name,...args),stillCurrent:()=>version===epoch&&canWrite(),onLocated:located=>{
  const old=root(id)||{dossiers:[]};
  const listIds=located.root.dossiers.filter(d=>norm(d.nom||d.name)==='liste de balance').flatMap(d=>(d.fichiers||[]).filter(f=>norm(f.nom||f.name)==='liste de balance.pdf').map(f=>String(f.id)));
  window.cdqInstantFiles2530?.forget?.(id,listIds);
  const next={...old,...located.root,dossiers:located.root.dossiers.map(d=>norm(d.nom||d.name)==='liste de balance'?d:old.dossiers?.find(prior=>String(prior.id)===String(d.id))||d)};
  try{cacheContenuCompagnies[id]=window.cdqInstantFiles2530?.overlay?.(id,next)||next;}catch{}
  for(const d of located.root.dossiers)if(norm(d.nom||d.name)==='liste de balance')for(const f of d.fichiers||[])if(norm(f.nom||f.name)==='liste de balance.pdf')window.cdqInstantFiles2530?.keep?.(id,f,d.id);
  try{window.sauvegarderCachePersistantClient?.(id,root(id),Date.now());}catch{}
  if(id===client()&&!readerBusy())window.afficherContenu?.(root(id));
 }});
}
export function sourceFingerprint(tree,confirmed=null){
  if(!tree)return '';
  const known=typeof balanceListLocationV2731==='function'?balanceListLocationV2731(tree).file:(tree.fichiers||[]).find(f=>norm(f.nom||f.name)==='liste de balance.pdf');
  const seen=new Set(),rows=[['schema','v2745-equipment-conformity'],['client',String(tree.id||''),tree.nom||tree.name||''],['list',String(known?.id||rehydratingListId(tree,confirmed))]],take=(node,pdf)=>{for(const f of node.fichiers||[]){if(excluded(f.nom||f.name))continue;const type=f.mimeType||f.type,id=String(f.id||'');if(id&&!seen.has(id)&&(type==='application/vnd.google-apps.spreadsheet'||type==='GOOGLE_SHEETS'||pdf&&(type==='application/pdf'||type==='PDF'))){seen.add(id);rows.push([id,type==='application/pdf'?'PDF':type==='application/vnd.google-apps.spreadsheet'?'GOOGLE_SHEETS':type,String(f.modifiedTime||f.dateModification||f.revision||''),String(f.version||''),String(f.md5Checksum||f.sha256Checksum||'')]);}}};
  take(tree,true);
  for(const d of tree.dossiers||[])if(/^rapports? (?:d ?)?etalonnages?$/.test(norm(d.nom||d.name))){rows.push(['folder',String(d.id)]);take(d,true);}
  return JSON.stringify(rows.sort((a,b)=>a[0].localeCompare(b[0])));
}
const receiptPrefix=()=> 'cdqBalanceListV2703:';
function remembered(id){const k=key(id);if(receipts.has(k))return receipts.get(k);try{const r=JSON.parse(localStorage.getItem(receiptPrefix()+k)||'null');if(r){receipts.set(k,r);return r;}}catch{}return null;}
function remember(id,fingerprint){const r={fingerprint,requestedAt:Date.now()};receipts.set(key(id),r);try{localStorage.setItem(receiptPrefix()+key(id),JSON.stringify(r));}catch{}}
function paint(id,text,error=false){if(id!==client())return;const p=document.getElementById('cdqClientActionsV2640');if(!p||p.hidden)return;let el=p.querySelector('[data-balance-list-status]');if(!el){el=document.createElement('p');el.dataset.balanceListStatus='';el.className='cdq-workspace-status';el.setAttribute('role','status');p.append(el);}if(el.textContent!==text)el.textContent=text;el.classList.toggle('cdq-workspace-error',error);}
function ready(id,r,notify=false){const folderId=listFolder(id)?.id||r.listFolderId||r.folderId||id;states.set(key(id),{...r,clientId:String(id),folderId});persistClient(id);if(r.fileId&&r.updatedAt)window.cdqInstantFiles2530?.confirm?.({id:r.fileId,nom:'Liste de balance.pdf',type:'PDF',dateModification:r.updatedAt},id,folderId);if(notify)paint(id,'Liste à jour · '+(r.count||0)+' balance(s)'+(r.warnings?.length?' · '+r.warnings.length+' fichier(s) à vérifier':''));}
async function call(name,id,...args){const account=calibrationIdentity().email,version=epoch;if(!canRead())throw Error('Accès Drive requis.');const r=await calibrationRpc(name,id,...args);if(version!==epoch||account!==calibrationIdentity().email||!canRead())throw Error('Le compte a changé.');return r;}
async function open(){
  const id=client();if(!id||!canRead())return;restoreClient(id);
  const tree=root(id),file=listFile(id),known=states.get(key(id)),fileId=file?.id||(!tree||tree.charge===false||listFolder(id)?.charge===false?known?.fileId:'');
  // Existing PDF is immediately readable, including during an update.
  if(fileId)return window.cdqOpenPdfV2520?.(fileId,{nom:'Liste de balance.pdf'});
  if(navigator.onLine===false){paint(id,'Aucune liste disponible hors ligne.',true);return;}
  const r=await call('cdqEtatListeBalanceV2638',id);if(id!==client())return;states.set(key(id),r);
  if(r.fileId)return window.cdqOpenPdfV2520?.(r.fileId,{nom:'Liste de balance.pdf',forceRefresh:r.status==='ready'});
  paint(id,r.status==='pending'||r.status==='working'?'Première liste en préparation. Les autres fichiers restent accessibles.':'Aucune liste disponible. Choisissez « Actualiser la liste ».');
}
async function refresh(force=false,verify=false,id=client()){
  if(!id||!canWrite()||navigator.onLine===false)return {status:'unavailable'};
  if(owner!==calibrationIdentity().email)reset();
  restoreClient(id);
  const k=key(id),active=jobs.get(k);let fingerprint=clientFingerprint(id);
  let stamp=fingerprint+'|saved:'+(changes.get(k)||0);
  const failure=failed.get(k);
  if(force)failed.delete(k);
  else if(failure?.stamp===stamp){if(!failure.retryAt)return {status:'retry-manually'};if(failure.retryAt>Date.now()){scheduleClient(id,failure.retryAt-Date.now());return {status:'retry-wait'};}}
  if(active){
    if(fingerprint&&fingerprint!==active.fingerprint)active.dirty=true;
    if(!force)return active.promise;
    // All callers joining an active refresh share one subsequent forced check,
    // and their await includes that check. Account resets cancel it entirely.
    active.followup??=active.promise.then(()=>active.version===epoch&&k===key(id)&&canWrite()?refresh(true,false,id):{status:'unavailable'});
    return active.followup;
  }
  if(waiting(id)&&!force){paintRows();return {status:'waiting-save'};}
  if(!force&&!verify&&remembered(id)?.fingerprint===fingerprint&&!needsUpdate(k)&&!needsPlacement(id))return {status:'cached'};
  // Automatic checks are silent; only an explicit refresh reports progress.
  const progress=(text,error=false)=>{if(force)paint(id,text,error);};
  const version=epoch,change=changes.get(k)||0,pendingReviews=[...(reviews.get(k)||[])],job={fingerprint,version,dirty:false,promise:null};jobs.set(k,job);paintRows();
  const satisfiedNow=()=>{if(!waiting(id)&&change===(changes.get(k)||0)){remember(id,fingerprint);satisfied.set(k,change);for(const token of pendingReviews)reviews.get(k)?.delete(token);}};
  const updateConfirmedList=async fileId=>{
    const result=await updateBalanceListFastV2729({clientId:id,fileId:String(fileId),rpc:(name,...args)=>call(name,...args),loadPdf:(file,revision)=>window.cdqLoadPdfForCalibrationV2668(file,revision),loadSheet:file=>call('obtenirSnapshotGoogleSheetHorsLigne',file,id),library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},cachedSignature:file=>equipment.confirmedSignature(file,id,true),onSourceRead:(file,signature)=>equipment.rememberRead?.(file,signature,id,false),previousState:states.get(k),stillCurrent:()=>version===epoch&&canWrite()&&!waiting(id)&&change===(changes.get(k)||0)&&fingerprint===clientFingerprint(id),onSaved:record=>window.cdqStoreBalanceListV2729(record)});
    equipment.flushReads?.();clearFailure(k);satisfiedNow();ready(id,result,force);return result;
  };
  job.promise=(async()=>{try{
    if(needsPlacement(id)||!listFile(id)&&!listFolder(id)){await placeList(id,version,!!listFile(id));if(version!==epoch||!canWrite())throw Error('Le compte a changé.');fingerprint=clientFingerprint(id);job.fingerprint=fingerprint;stamp=fingerprint+'|saved:'+change;}
    const tree=root(id),existingId=listFile(id)?.id||rehydratingListId(tree,states.get(k))||(!tree||tree.charge===false?states.get(k)?.fileId:'');
    if(existingId&&typeof updateBalanceListFastV2729==='function'){
      return await updateConfirmedList(existingId);
    }
    let result=await call('cdqActualiserListeBalanceV2665',id,force,stamp);states.set(k,result);
    progress('Actualisation de la liste…');
    const deadline=Date.now()+180000;
    while(version===epoch&&canRead()&&Date.now()<deadline){
      if(result.status==='ready'){
        const placed=await placeList(id,version);if(placed?.file){result={...result,fileId:String(placed.file.id),folderId:String(placed.folder.id)};fingerprint=clientFingerprint(id);job.fingerprint=fingerprint;stamp=fingerprint+'|saved:'+change;}
        // Older servers omit PDFs inside Rapports d’étalonnage. Reuse their
        // idempotently created list ID, then verify all authoritative sources.
        if(typeof updateBalanceListFastV2729==='function'){
          if(!result.fileId)throw Error('Identifiant de liste non confirmé.');
          return await updateConfirmedList(result.fileId);
        }
        if(window.cdqEnsureListConformityV2728)result=await window.cdqEnsureListConformityV2728({result,clientId:id,clientName:root(id)?.nom||root(id)?.name||'',files:sources(root(id)||{}),library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},loadPdf:file=>window.cdqLoadPdfForCalibrationV2668(file),loadSheet:file=>call('obtenirSnapshotGoogleSheetHorsLigne',file,id),rpc:(name,...args)=>call(name,...args),cachedSignature:file=>equipment.confirmedSignature?.(file),stillCurrent:()=>version===epoch&&canWrite()&&!waiting(id)&&change===(changes.get(k)||0)&&fingerprint===clientFingerprint(id)});
        clearFailure(k);satisfiedNow();ready(id,result,force);return result;
      }
      if(result.status==='error')throw Error(result.message||'Actualisation impossible.');
      if(!['busy','pending','working'].includes(result.status))throw Error('Réponse d’actualisation non confirmée.');
      await new Promise(resolve=>setTimeout(resolve,1000));
      if(version!==epoch||!canRead())break;
      result=result.status==='busy'?await call('cdqActualiserListeBalanceV2665',id,false,stamp):await call('cdqEtatListeBalanceV2638',id);
      if(result.status==='pending')result=await call('cdqActualiserListeBalanceV2665',id,false,stamp);states.set(k,result);
    }
    if(version===epoch){fail(id,stamp,Error('Actualisation toujours en cours sur le serveur.'));progress('Actualisation en cours sur le serveur. La liste existante reste accessible.');}
    return {status:'pending'};
  }catch(e){if(version===epoch){equipment.flushReads?.();fail(id,stamp,e);progress('Actualisation interrompue. La liste existante reste accessible.',true);}return {status:'error',message:e.message};}
  finally{if(jobs.get(k)===job)jobs.delete(k);if(version===epoch){if(!job.followup&&job.dirty&&!waiting(id))scheduleClient(id);paintRows();}}})();
  return job.promise;
}
function closeMenu(){document.querySelector('[data-balance-list-menu]')?.remove();document.querySelector('[data-client-list]')?.setAttribute('aria-expanded','false');}
function menu(){
  if(!client()||!canRead())return;
  if(document.querySelector('[data-balance-list-menu]')){closeMenu();return;}
  const actions=document.getElementById('cdqClientActionsV2640');if(!actions)return;
  const id=client(),p=document.createElement('div');p.dataset.balanceListMenu='';p.setAttribute('aria-label','Liste de balance');
  for(const [label,action,write] of [['Ouvrir la liste',open,false],['Actualiser la liste',()=>refresh(true),true]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=write&&!canWrite();b.onclick=()=>{closeMenu();if(id===client())Promise.resolve(action()).catch(e=>paint(id,e.message,true));};p.append(b);}
  actions.append(p);actions.querySelector('[data-client-list]')?.setAttribute('aria-expanded','true');
}
function reset(){epoch++;owner=calibrationIdentity().email;visibleClient='';receipts.clear();states.clear();jobs.clear();failed.clear();saveWaits.clear();changes.clear();satisfied.clear();hydrated.clear();reviews.clear();reviewReceipts.clear();pausedClients.clear();pcScan=null;for(const t of clientTimers.values())clearTimeout(t);clientTimers.clear();clearTimeout(timer);clearTimeout(scanTimer);timer=scanTimer=0;closeMenu();document.querySelector('[data-balance-list-status]')?.remove();paintRows();}
function sources(tree){const files=[],seen=new Set(),take=(node,pdf)=>{for(const f of node.fichiers||[]){const id=String(f.id||'');if(id&&!seen.has(id)&&!excluded(f.nom||f.name)&&!f._cdqPendingSaveV2660&&(['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(f.mimeType||f.type)||pdf&&['PDF','application/pdf'].includes(f.mimeType||f.type))){seen.add(id);files.push(f);}}};take(tree,true);for(const d of tree.dossiers||[])if(/^rapports? (?:d ?)?etalonnages?$/.test(norm(d.nom||d.name)))take(d,true);return files;}
function scheduleScan(id){
 if(scanTimer||pcScan||readerBusy()||navigator.onLine===false||window.cdqFieldWorkV2729?.available()===false)return;
 const version=epoch;scanTimer=setTimeout(()=>{scanTimer=0;if(version!==epoch||client()!==id||readerBusy()||document.hidden||!canWrite())return;
  const task=equipment.inspect(sources(root(id)||{}),()=>client()===id&&epoch===version&&canWrite()&&!readerBusy()&&!document.hidden,id);pcScan=task;
  task.then(changed=>{if(changed&&epoch===version&&canWrite()){const k=key(id);changes.set(k,(changes.get(k)||0)+1);persistClient(id);paintRows();scheduleClient(id);}}).catch(()=>{}).finally(()=>{if(pcScan===task){pcScan=null;if(client()!==id)schedule();}});
 },1200);
}
function inspect(){
  if(owner!==calibrationIdentity().email)reset();
  const id=client();if(id!==visibleClient){visibleClient=id;closeMenu();document.querySelector('[data-balance-list-status]')?.remove();}
  paintRows();if(!canWrite()||document.hidden)return;
  const tree=root(id);if(!id||!tree)return;
  const fingerprint=clientFingerprint(id),job=jobs.get(key(id));
  if(job){if(fingerprint!==job.fingerprint)job.dirty=true;return;}
  const receipt=remembered(id);
  // Verify an existing list once before remembering this schema. Identical
  // contents produce no write; subsequent openings reuse the confirmed receipt.
  if(needsPlacement(id))scheduleClient(id);
  else if(!receipt&&listFile(id)){if(typeof updateBalanceListFastV2729==='function')scheduleClient(id);else remember(id,fingerprint);}
  else if(receipt?.fingerprint!==fingerprint)scheduleClient(id);
  if(needsUpdate(key(id))&&!waiting(id))scheduleClient(id);
  scheduleScan(id);
}
// Coalesce notifications without postponing the first check when rows repaint.
function schedule(){if(timer)return;timer=setTimeout(()=>{timer=0;inspect();},150);}
// The structured last-confirmed list is available synchronously on a cold app
// start. Consumers can show these rows while a separate cloud update resumes.
function snapshot(id=client()){if(!id||!canRead())return null;restoreClient(id);const k=key(id),ready=states.get(k),tree=root(id);return ready?.status==='ready'?{...ready,rows:(ready.rows||[]).map(row=>({...row})),pending:waiting(id)||needsUpdate(k)||jobs.has(k)||!!tree&&remembered(id)?.fingerprint!==clientFingerprint(id)}:null;}
window.cdqBalanceListV2638={refresh,open,menu,inspect,snapshot};
window.addEventListener('cdq:access-ready',()=>{if(owner!==calibrationIdentity().email)reset();schedule();});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:drive-ready-v2632',schedule);
function resumePaused(){for(const k of [...pausedClients,...changes.keys(),...reviews.keys()])if(k.startsWith(owner+'|')&&(pausedClients.has(k)||needsUpdate(k)))scheduleClient(k.slice(owner.length+1));schedule();}
window.addEventListener('cdq:field-idle-v2729',resumePaused);
window.cdqFieldWorkV2729?.subscribe?.(resumePaused);
for(const event of ['cdq:copied','cdq:pdf-saved'])window.addEventListener(event,e=>saved(e));
window.addEventListener('cdq:pdf-save-retired-v2707',e=>{
 if(owner!==calibrationIdentity().email)reset();
 const d=e.detail||{},k=key(String(d.clientId||'')),pending=saveWaits.get(k),file=String(d.sourceId||''),token=String(d.saveId||'');
 if(!canRead()||d.owner&&d.owner!==calibrationIdentity().email)return;
 if(pending?.get(file)===token)pending.delete(file);
 reviews.get(k)?.delete(token);
 equipment.retire(token);
 persistClient(String(d.clientId||''));
 paintRows();
});
window.addEventListener('cdq:pdf-local-saved',e=>saved(e,true));window.addEventListener('cdq:client-renamed',e=>saved(e));
for(const event of ['cdq:deleted','cdq:moved','cdq:renamed'])window.addEventListener(event,schedule);
window.addEventListener('cdq:reader-closed-v2703',resumePaused);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
window.addEventListener('online',()=>{for(const [k,failure] of failed)if(k.startsWith(owner+'|')&&failure.transient){clearFailure(k);scheduleClient(k.slice(owner.length+1));}for(const k of changes.keys())if(k.startsWith(owner+'|')&&(changes.get(k)||0)>(satisfied.get(k)||0))scheduleClient(k.slice(owner.length+1));paintRows();schedule();});window.addEventListener('offline',paintRows);
document.addEventListener('click',e=>{if(e.target.closest?.('.folder-header,.bottom-nav-item,.company-item')){closeMenu();schedule();}},true);
const files=document.getElementById('filesContainer');if(files)new MutationObserver(schedule).observe(files,{childList:true,subtree:true});
reset();schedule();

