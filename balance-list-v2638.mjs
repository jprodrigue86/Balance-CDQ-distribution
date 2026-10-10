import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
import {createEquipmentTrackerV2697} from './equipment-list-v2697.mjs';
import './balance-list-conformity-v2728.mjs';
import {updateBalanceListFastV2729} from './balance-list-fast-v2729.mjs';
import './field-work-v2729.mjs';
const equipment=createEquipmentTrackerV2697({identity:()=>calibrationIdentity().email,library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},loadPdf:(id,revision)=>window.cdqLoadPdfForCalibrationV2668(id,revision),loadSheet:id=>call('obtenirSnapshotGoogleSheetHorsLigne',id,client())});
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
const key=id=>calibrationIdentity().email+'|'+id;
const waiting=id=>(saveWaits.get(key(id))?.size||0)>0;
function paintRows(){
  const id=client(),k=key(id),running=jobs.has(k)||waiting(id)||failed.has(k)||(changes.get(k)||0)>(satisfied.get(k)||0);
  for(const row of document.querySelectorAll('.file-row')){
    const checkbox=row.querySelector('.file-checkbox[data-file-id]'),known=states.get(k)?.fileId||listFile(id)?.id;
    const isList=!!known&&checkbox?.dataset.fileId===String(known);
    let indicator=row.querySelector('[data-balance-list-working]');
    if(!isList||!canRead()){indicator?.remove();row.dataset.balanceListBusy='false';continue;}
    if(!indicator){indicator=document.createElement('span');indicator.dataset.balanceListWorking='';indicator.className='cdq-balance-list-working';indicator.setAttribute('role','status');const badge=row.querySelector(':scope > .file-today-done-badge');row.insertBefore(indicator,badge||null);}
    const title=row.querySelector('.file-name');if(document.documentElement.classList.contains('cdq-desktop-v2676')&&title&&indicator.parentElement!==title)title.append(indicator);
    indicator.hidden=!running;const active=jobs.has(k)&&navigator.onLine!==false;
    const text=navigator.onLine===false?'Liste de balances : actualisation en attente de connexion':active?'Liste de balances : actualisation en cours':waiting(id)?'Liste de balances : sauvegarde du rapport en attente':failed.get(k)?.retryAt?'Liste de balances : nouvelle tentative prévue après une interruption temporaire':failed.has(k)?'Liste de balances : actualisation interrompue; réessayez depuis le menu':'Liste de balances : actualisation prévue après le rapport';
    if(indicator.getAttribute('aria-label')!==text){indicator.setAttribute('aria-label',text);indicator.title=running?text:'';}
    indicator.classList.toggle('cdq-balance-list-paused',!active);
    const label='';
    if(indicator.textContent!==label)indicator.textContent=label;
    row.dataset.balanceListBusy=active?'true':'false';
  }
}
function scheduleClient(id,delay=150){
  const k=key(id);if(clientTimers.has(k))return;
  const failure=failed.get(k),stamp=sourceFingerprint(root(id))+'|saved:'+(changes.get(k)||0);
  if(failure?.stamp===stamp){if(!failure.retryAt)return;delay=Math.max(delay,failure.retryAt-Date.now());}
  const version=epoch;clientTimers.set(k,setTimeout(()=>{clientTimers.delete(k);if(version===epoch&&!waiting(id)&&!readerBusy()&&window.cdqFieldWorkV2729?.available()!==false)refresh(false,true,id).catch(()=>{});},delay));
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
async function saved(event,local=false){
  if(owner!==calibrationIdentity().email)reset();
  const d=event.detail||{},id=String(d.clientId||'');if(!id){schedule();return;}
  if(!canWrite()||excluded(d.name||d.nom))return;
  const k=key(id),file=String(d.sourceId||d.id||d.fileId||''),token=String(d.saveId||'');
  const pending=saveWaits.get(k);
  const matched=pending?.has(file)?file:token?[...(pending||[])].find(([,value])=>value===token)?.[0]:undefined;
  if(!local||d.pending===false){
    // An earlier acknowledgement cannot release a newer edit of this file.
    if(matched!==undefined&&token&&pending.get(matched)!==token){equipment.acknowledge(token,d);return;}
    if(matched!==undefined)pending.delete(matched);
  }
  const savedOwner=owner,savedEpoch=epoch,review=!local||d.pending===false?equipment.awaitDecision(token):equipment.decision(token);const decision=review&&typeof review.then==='function'?(await review,equipment.decision(token)):review;if(savedOwner!==owner||savedEpoch!==epoch||!canWrite())return;
  if(decision===false){if(!local||d.pending===false)equipment.acknowledge(token,d);if(!waiting(id)&&(failed.has(k)||(changes.get(k)||0)>(satisfied.get(k)||0)))scheduleClient(id);paintRows();return;}
  if(local&&d.pending!==false){let pending=saveWaits.get(k);if(!pending)saveWaits.set(k,pending=new Map());pending.set(file,token);paintRows();return;}
  if(!local||d.pending===false)equipment.acknowledge(token,d);
  changes.set(k,(changes.get(k)||0)+1);const job=jobs.get(k);if(job)job.dirty=true;
  paintRows();scheduleClient(id);
}
function root(id){try{return cacheContenuCompagnies[id]||null;}catch{return null;}}
function listFile(id){return (root(id)?.fichiers||[]).find(f=>norm(f.nom||f.name)==='liste de balance.pdf');}
export function sourceFingerprint(tree){
  if(!tree)return '';
  const rows=[['schema','v2729-equipment-conformity'],['client',String(tree.id||''),tree.nom||tree.name||'']],take=(node,pdf)=>{for(const f of node.fichiers||[]){if(excluded(f.nom||f.name))continue;const type=f.mimeType||f.type;if(type==='application/vnd.google-apps.spreadsheet'||type==='GOOGLE_SHEETS'||pdf&&(type==='application/pdf'||type==='PDF'))rows.push([String(f.id),type==='application/pdf'?'PDF':type==='application/vnd.google-apps.spreadsheet'?'GOOGLE_SHEETS':type]);}};
  take(tree,true);
  for(const d of tree.dossiers||[])if(/^rapports? (?:d ?)?etalonnages?$/.test(norm(d.nom||d.name))){rows.push(['folder',String(d.id)]);take(d,false);}
  return JSON.stringify(rows.sort((a,b)=>a[0].localeCompare(b[0])));
}
const receiptPrefix=()=> 'cdqBalanceListV2703:';
function remembered(id){const k=key(id);if(receipts.has(k))return receipts.get(k);try{const r=JSON.parse(localStorage.getItem(receiptPrefix()+k)||'null');if(r){receipts.set(k,r);return r;}}catch{}return null;}
function remember(id,fingerprint){const r={fingerprint,requestedAt:Date.now()};receipts.set(key(id),r);try{localStorage.setItem(receiptPrefix()+key(id),JSON.stringify(r));}catch{}}
function paint(id,text,error=false){if(id!==client())return;const p=document.getElementById('cdqClientActionsV2640');if(!p||p.hidden)return;let el=p.querySelector('[data-balance-list-status]');if(!el){el=document.createElement('p');el.dataset.balanceListStatus='';el.className='cdq-workspace-status';el.setAttribute('role','status');p.append(el);}if(el.textContent!==text)el.textContent=text;el.classList.toggle('cdq-workspace-error',error);}
function ready(id,r,notify=false){states.set(key(id),r);if(r.fileId&&r.updatedAt)window.cdqInstantFiles2530?.confirm?.({id:r.fileId,nom:'Liste de balance.pdf',type:'PDF',dateModification:r.updatedAt},id,id);if(notify)paint(id,'Liste à jour · '+(r.count||0)+' balance(s)'+(r.warnings?.length?' · '+r.warnings.length+' fichier(s) à vérifier':''));}
async function call(name,id,...args){const account=calibrationIdentity().email,version=epoch;if(!canRead())throw Error('Accès Drive requis.');const r=await calibrationRpc(name,id,...args);if(version!==epoch||account!==calibrationIdentity().email||!canRead())throw Error('Le compte a changé.');return r;}
async function open(){
  const id=client();if(!id||!canRead())return;
  const file=listFile(id),known=states.get(key(id)),fileId=known?.fileId||file?.id;
  // Existing PDF is immediately readable, including during an update.
  if(fileId)return window.cdqOpenPdfV2520?.(fileId,{nom:'Liste de balance.pdf'});
  if(navigator.onLine===false){paint(id,'Aucune liste disponible hors ligne.',true);return;}
  const r=await call('cdqEtatListeBalanceV2638',id);if(id!==client())return;states.set(key(id),r);
  if(r.fileId)return window.cdqOpenPdfV2520?.(r.fileId,{nom:'Liste de balance.pdf',forceRefresh:r.status==='ready'});
  paint(id,r.status==='pending'||r.status==='working'?'Première liste en préparation. Les autres fichiers restent accessibles.':'Aucune liste disponible. Choisissez « Actualiser la liste ».');
}
async function refresh(force=false,verify=false,id=client()){
  if(!id||!canWrite()||navigator.onLine===false)return {status:'unavailable'};
  const k=key(id),fingerprint=sourceFingerprint(root(id)),active=jobs.get(k);
  const stamp=fingerprint+'|saved:'+(changes.get(k)||0);
  const failure=failed.get(k);
  if(force)failed.delete(k);
  else if(failure?.stamp===stamp){if(!failure.retryAt)return {status:'retry-manually'};if(failure.retryAt>Date.now()){scheduleClient(id,failure.retryAt-Date.now());return {status:'retry-wait'};}}
  if(active){if(fingerprint&&fingerprint!==active.fingerprint)active.dirty=true;if(force)active.forceNext=true;return active.promise;}
  if(waiting(id)&&!force){paintRows();return {status:'waiting-save'};}
  if(!force&&!verify&&remembered(id)?.fingerprint===fingerprint&&(changes.get(k)||0)===(satisfied.get(k)||0))return {status:'cached'};
  // Automatic checks are silent; only an explicit refresh reports progress.
  const progress=(text,error=false)=>{if(force)paint(id,text,error);};
  const version=epoch,change=changes.get(k)||0,job={fingerprint,dirty:false,promise:null};jobs.set(k,job);paintRows();
  job.promise=(async()=>{try{
    const existingId=listFile(id)?.id||states.get(k)?.fileId;
    if(existingId&&typeof updateBalanceListFastV2729==='function'){
      const result=await updateBalanceListFastV2729({clientId:id,fileId:String(existingId),rpc:(name,...args)=>call(name,...args),loadPdf:(file,revision)=>window.cdqLoadPdfForCalibrationV2668(file,revision),loadSheet:file=>call('obtenirSnapshotGoogleSheetHorsLigne',file,id),library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},cachedSignature:file=>equipment.confirmedSignature(file),stillCurrent:()=>version===epoch&&canWrite()&&!waiting(id)&&change===(changes.get(k)||0)&&fingerprint===sourceFingerprint(root(id)),onSaved:record=>window.cdqStoreBalanceListV2729(record)});
      clearFailure(k);if(!waiting(id)&&change===(changes.get(k)||0)){remember(id,fingerprint);satisfied.set(k,change);}ready(id,result,force);return result;
    }
    let result=await call('cdqActualiserListeBalanceV2665',id,force,stamp);states.set(k,result);
    progress('Actualisation de la liste…');
    const deadline=Date.now()+180000;
    while(version===epoch&&canRead()&&Date.now()<deadline){
      if(result.status==='ready'){
        if(window.cdqEnsureListConformityV2728)result=await window.cdqEnsureListConformityV2728({result,clientId:id,clientName:root(id)?.nom||root(id)?.name||'',files:sources(root(id)||{}),library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},loadPdf:file=>window.cdqLoadPdfForCalibrationV2668(file),loadSheet:file=>call('obtenirSnapshotGoogleSheetHorsLigne',file,id),rpc:(name,...args)=>call(name,...args),cachedSignature:file=>equipment.confirmedSignature?.(file),stillCurrent:()=>version===epoch&&canWrite()&&!waiting(id)&&change===(changes.get(k)||0)&&fingerprint===sourceFingerprint(root(id))});
        clearFailure(k);if(!waiting(id)&&change===(changes.get(k)||0)){remember(id,fingerprint);satisfied.set(k,change);}ready(id,result,force);return result;
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
  }catch(e){if(version===epoch){fail(id,stamp,e);progress('Actualisation interrompue. La liste existante reste accessible.',true);}return {status:'error',message:e.message};}
  finally{if(jobs.get(k)===job)jobs.delete(k);if(version===epoch){if(job.forceNext)queueMicrotask(()=>refresh(true,false,id));else if(job.dirty&&!waiting(id))scheduleClient(id);paintRows();}}})();
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
function reset(){epoch++;owner=calibrationIdentity().email;visibleClient='';receipts.clear();states.clear();jobs.clear();failed.clear();saveWaits.clear();changes.clear();satisfied.clear();pcScan=null;for(const t of clientTimers.values())clearTimeout(t);clientTimers.clear();clearTimeout(timer);clearTimeout(scanTimer);timer=scanTimer=0;closeMenu();document.querySelector('[data-balance-list-status]')?.remove();paintRows();}
function sources(tree){const files=[],take=(node,pdf)=>{for(const f of node.fichiers||[]){if(!excluded(f.nom||f.name)&&!f._cdqPendingSaveV2660&&(['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(f.mimeType||f.type)||pdf&&['PDF','application/pdf'].includes(f.mimeType||f.type)))files.push(f);}};take(tree,true);for(const d of tree.dossiers||[])if(/^rapports? (?:d ?)?etalonnages?$/.test(norm(d.nom||d.name)))take(d,false);return files;}
function scheduleScan(id){
 if(scanTimer||pcScan||readerBusy()||navigator.onLine===false||window.cdqFieldWorkV2729?.available()===false)return;
 const version=epoch;scanTimer=setTimeout(()=>{scanTimer=0;if(version!==epoch||client()!==id||readerBusy()||document.hidden||!canWrite())return;
  const task=equipment.inspect(sources(root(id)||{}),()=>client()===id&&epoch===version&&canWrite()&&!readerBusy()&&!document.hidden);pcScan=task;
  task.then(changed=>{if(changed&&epoch===version&&canWrite()){const k=key(id);changes.set(k,(changes.get(k)||0)+1);paintRows();scheduleClient(id);}}).catch(()=>{}).finally(()=>{if(pcScan===task){pcScan=null;if(client()!==id)schedule();}});
 },1200);
}
function inspect(){
  if(owner!==calibrationIdentity().email)reset();
  const id=client();if(id!==visibleClient){visibleClient=id;closeMenu();document.querySelector('[data-balance-list-status]')?.remove();}
  paintRows();if(!canWrite()||document.hidden)return;
  const tree=root(id);if(!id||!tree)return;
  const fingerprint=sourceFingerprint(tree),job=jobs.get(key(id));
  if(job){if(fingerprint!==job.fingerprint)job.dirty=true;return;}
  const receipt=remembered(id);
  // Verify an existing list once before remembering this schema. Identical
  // contents produce no write; subsequent openings reuse the confirmed receipt.
  if(!receipt&&listFile(id)){if(typeof updateBalanceListFastV2729==='function')scheduleClient(id);else remember(id,fingerprint);}
  else if(receipt?.fingerprint!==fingerprint)scheduleClient(id);
  if((changes.get(key(id))||0)>(satisfied.get(key(id))||0)&&!waiting(id))scheduleClient(id);
  scheduleScan(id);
}
// Coalesce notifications without postponing the first check when rows repaint.
function schedule(){if(timer)return;timer=setTimeout(()=>{timer=0;inspect();},150);}
window.cdqBalanceListV2638={refresh,open,menu,inspect};
window.addEventListener('cdq:access-ready',()=>{if(owner!==calibrationIdentity().email)reset();schedule();});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:drive-ready-v2632',schedule);
window.addEventListener('cdq:field-idle-v2729',schedule);
for(const event of ['cdq:copied','cdq:pdf-saved'])window.addEventListener(event,e=>saved(e));
window.addEventListener('cdq:pdf-save-retired-v2707',e=>{
 if(owner!==calibrationIdentity().email)reset();
 const d=e.detail||{},k=key(String(d.clientId||'')),pending=saveWaits.get(k),file=String(d.sourceId||''),token=String(d.saveId||'');
 if(!canRead()||d.owner&&d.owner!==calibrationIdentity().email)return;
 if(pending?.get(file)===token)pending.delete(file);
 equipment.retire(token);
 paintRows();
});
window.addEventListener('cdq:pdf-local-saved',e=>saved(e,true));window.addEventListener('cdq:client-renamed',e=>saved(e));
for(const event of ['cdq:deleted','cdq:moved','cdq:renamed'])window.addEventListener(event,schedule);
window.addEventListener('cdq:reader-closed-v2703',()=>{for(const k of changes.keys())if(k.startsWith(owner+'|')&&(changes.get(k)||0)>(satisfied.get(k)||0))scheduleClient(k.slice(owner.length+1));schedule();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
window.addEventListener('online',()=>{for(const [k,failure] of failed)if(k.startsWith(owner+'|')&&failure.transient){clearFailure(k);scheduleClient(k.slice(owner.length+1));}for(const k of changes.keys())if(k.startsWith(owner+'|')&&(changes.get(k)||0)>(satisfied.get(k)||0))scheduleClient(k.slice(owner.length+1));paintRows();schedule();});window.addEventListener('offline',paintRows);
document.addEventListener('click',e=>{if(e.target.closest?.('.folder-header,.bottom-nav-item,.company-item')){closeMenu();schedule();}},true);
const files=document.getElementById('filesContainer');if(files)new MutationObserver(schedule).observe(files,{childList:true,subtree:true});
reset();schedule();
