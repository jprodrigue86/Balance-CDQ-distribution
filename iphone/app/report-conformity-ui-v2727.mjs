import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
import {createReportConformityTrackerV2727,reportConformitySourcesV2727} from './report-conformity-cache-v2727.mjs';
import './field-work-v2729.mjs';

const canRead=()=>!!window.cdqDriveEntryV2632?.canRead()&&!!calibrationIdentity().email;
const client=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
const root=id=>{try{return cacheContenuCompagnies[id]||null;}catch{return null;}};
function readerBusy(){try{return !!window.parent.document.getElementById('legacy-pdf-reader')||document.documentElement.classList.contains('cdq-workspace-reader-open');}catch{return document.documentElement.classList.contains('cdq-workspace-reader-open');}}
let timer=0,scan=null,scanTimer=0,scope='',pendingRescan=false,retryTimer=0,retryScope='';
let backgroundTimerV2774=0,backgroundScopeV2774='',backgroundSeenV2774=new Map();
const BACKGROUND_INSPECT_TTL_V2774=12*60*60*1000;
const BACKGROUND_INSPECT_LIMIT_V2774=500;
const BACKGROUND_UNKNOWN_RECHECK_V2774=15*60*1000;
// Android V27.75: probe the compact, authenticated server summary once per session.
let cdqCompactSheetAvailableV2775=true;
const tracker=createReportConformityTrackerV2727({
 identity:()=>canRead()?calibrationIdentity().email:'',
 library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},
 concurrency:1,
 retryMs:3000,
 loadPdf:(id,client,revision)=>window.cdqLoadPdfForCalibrationV2668(id,revision,{background:!displayedFiles().has(String(id))}),
 loadSheet:async(id,clientId,revision)=>{const owner=calibrationIdentity().email;if(!canRead())throw Error('Accès Drive requis.');
  const send=async()=>{
   if(cdqCompactSheetAvailableV2775){
    try{return await calibrationRpc('cdqLireConformiteRapportV2775',id,clientId,revision);}
    catch(error){
     // A server not yet upgraded may still provide the original offline snapshot.
     // Do not hide permission, revision, network, or data-integrity failures.
     const missing=String(error?.message||'');
     if(!/cdqLireConformiteRapportV2775/.test(missing)||!/(?:Fonction serveur introuvable|Script function not found|is not a function)/i.test(missing))throw error;
     cdqCompactSheetAvailableV2775=false;
    }
   }
   return calibrationRpc('obtenirSnapshotGoogleSheetHorsLigne',id,clientId);
  };
  const snapshot=await(window.cdqRpcBudgetV2751?window.cdqRpcBudgetV2751.withPriority(displayedFiles().has(String(id))?'foreground':'background',send):send());
  if(!canRead()||owner!==calibrationIdentity().email)throw Error('Le compte a changé.');
  return snapshot;
 },
 cachedState:(file,id)=>{
  const list=window.cdqBalanceListV2638;
  const signature=list?.confirmedSignature?.(file,id);
  if(signature){try{const status=JSON.parse(signature)[5];if(status==='nonconforming'||status==='conforming')return status;}catch{}}
  return list?.confirmedConformityV2776?.(file,id)||null;
 },
 onChange:()=>paintRows()
});
function paintRows(){
 const id=client(),files=new Map(reportConformitySourcesV2727(root(id)).map(file=>[String(file.id),file]));
 for(const row of document.querySelectorAll('#filesContainer .file-row')){
  const fileId=row.querySelector('.file-checkbox[data-file-id]')?.dataset.fileId||row.querySelector('[data-file-id]')?.dataset.fileId;
  const file=files.get(String(fileId||'')),name=row.querySelector('.file-name'),show=canRead()&&!!file&&tracker.state(file,id)==='nonconforming';
  let dot=row.querySelector('[data-report-nonconforming-v2727]');
  if(!show||!name)dot?.remove();
  else if(!dot){dot=document.createElement('span');dot.dataset.reportNonconformingV2727='';dot.className='cdq-report-nonconforming-v2727';dot.setAttribute('role','img');dot.setAttribute('aria-label','Balance non conforme');dot.title='Balance non conforme';name.prepend(dot);}
  else if(name.firstChild!==dot)name.prepend(dot);
  // An unreadable result is neither compliant nor non-compliant. Make the
  // verification problem visible without adding a false red conformity dot.
  const failure=canRead()&&file&&!show?tracker.failedState(file,id):'';
  let uncertain=row.querySelector('[data-report-read-problem-v2773]');
  if(!failure||!name){uncertain?.remove();continue;}
  if(!uncertain){uncertain=document.createElement('span');uncertain.dataset.reportReadProblemV2773='';uncertain.textContent='?';uncertain.style.cssText='display:inline-block;margin-right:.35em;color:#737b87;font-size:.8em';uncertain.setAttribute('role','img');name.prepend(uncertain);}
  uncertain.setAttribute('aria-label',failure==='retry'?'Vérification à reprendre automatiquement':'Vérification indisponible');
  uncertain.title=failure==='retry'?'Vérification en attente de nouvelle tentative':'Vérification indisponible. Rouvrez le dossier pour réessayer.';
 }
}
// Prefer the rows the user just displayed; do not crawl unloaded folders.
function displayedFiles(){
 const result=new Map();
 for(const row of document.querySelectorAll('#filesContainer .file-row')){
  if(!row.getClientRects().length)continue;
  const id=row.querySelector('.file-checkbox[data-file-id]')?.dataset.fileId||row.querySelector('[data-file-id]')?.dataset.fileId;
  if(!id)continue;const box=row.getBoundingClientRect();result.set(String(id),box.bottom>0&&box.top<innerHeight?0:1);
 }
 return result;
}
function orderedSources(id){
 const visible=displayedFiles();
 // Only inspect rendered file rows, starting in the actual viewport. Avoid
 // bulk background downloads for unopened folders or the rest of a long list.
 return reportConformitySourcesV2727(root(id))
  .filter(file=>visible.has(String(file.id)))
  .map((file,index)=>({file,index,rank:visible.get(String(file.id))}))
  .sort((a,b)=>a.rank-b.rank||a.index-b.index).slice(0,24).map(item=>item.file);
}
function allowedScan(){return canRead()&&!readerBusy()&&!document.hidden&&navigator.onLine!==false&&window.cdqFieldWorkV2729?.available()!==false;}
// Only one low-priority non-visible check at a time. Never ask Drive for a
// report while an editable reader or a foreground operation is active.
// The verified cache persists for 12 h; client changes and file revisions
// automatically isolate pending work.
function scheduleBackgroundV2774(){
 if(backgroundTimerV2774||scan||scanTimer||!allowedScan()||window.cdqDriveWritesPendingV2746?.())return;
 const id=client(),owner=calibrationIdentity().email;
 if(!id||!owner||!root(id))return;
 const ownScope=JSON.stringify([owner,id]);
 if(backgroundScopeV2774!==ownScope){
  backgroundScopeV2774=ownScope;backgroundSeenV2774.clear();
 }
 const visible=displayedFiles(),now=Date.now();
 for(const [key,checkedAt] of backgroundSeenV2774)if(now-checkedAt>=BACKGROUND_INSPECT_TTL_V2774)backgroundSeenV2774.delete(key);
 const candidates=reportConformitySourcesV2727(root(id)).filter(file=>{
  if(file?._cdqPendingSaveV2660||visible.get(String(file.id))===0)return false;
  const key=JSON.stringify([file.id,file.modifiedTime||file.dateModification||file.revision||'',file.version||'',file.md5Checksum||file.sha256Checksum||'']);
  return now-Number(backgroundSeenV2774.get(key)||0)>=BACKGROUND_INSPECT_TTL_V2774;
 });
 if(!candidates.length||backgroundSeenV2774.size>=BACKGROUND_INSPECT_LIMIT_V2774)return;
 const file=candidates[0];
 backgroundTimerV2774=setTimeout(()=>{
  backgroundTimerV2774=0;
  if(ownScope!==backgroundScopeV2774||client()!==id||calibrationIdentity().email!==owner||!allowedScan()||window.cdqDriveWritesPendingV2746?.())return;
  const key=JSON.stringify([file.id,file.modifiedTime||file.dateModification||file.revision||'',file.version||'',file.md5Checksum||file.sha256Checksum||'']);
  backgroundSeenV2774.set(key,Date.now());
  const current=()=>ownScope===backgroundScopeV2774&&client()===id&&calibrationIdentity().email===owner&&allowedScan()&&!window.cdqDriveWritesPendingV2746?.();
  const task=tracker.inspect([file],current,id);scan=task;
  task.catch(()=>{}).finally(()=>{
   if(scan===task)scan=null;
   // A foreground save or account switch invalidates an unfinished probe.
   if(!current())backgroundSeenV2774.delete(key);
   else if(tracker.state(file,id)==='unknown'){
    // Retry unknown classifications after fifteen minutes, never per repaint.
    backgroundSeenV2774.set(key,Date.now()-BACKGROUND_INSPECT_TTL_V2774+BACKGROUND_UNKNOWN_RECHECK_V2774);
   }
   paintRows();if(pendingRescan){pendingRescan=false;schedule();}
   else if(current())setTimeout(scheduleBackgroundV2774,220);
  });
 },400);
}
function armRetry(id,owner,expectedScope){
 if(retryTimer){clearTimeout(retryTimer);retryTimer=0;}
 if(scope!==expectedScope||!allowedScan())return;
 const delay=tracker.nextRetryDelay(orderedSources(id),id);if(delay===null)return;
 retryScope=expectedScope;
 retryTimer=setTimeout(()=>{
  retryTimer=0;
  if(scope===expectedScope&&client()===id&&calibrationIdentity().email===owner&&allowedScan())schedule();
 },Math.max(50,delay));
}
function inspect(){
 paintRows();const id=client(),owner=calibrationIdentity().email,currentScope=JSON.stringify([owner,id,[...displayedFiles()]]);scope=currentScope;
 if(retryTimer&&retryScope!==currentScope){clearTimeout(retryTimer);retryTimer=0;}
 // A folder may finish loading during this scan without adding any red dot.
 // Coalesce every new inspection request and visit its current files once more.
 if(scan){pendingRescan=true;return;}
 if(!id||!root(id)||!allowedScan()||scanTimer)return;
 scanTimer=setTimeout(()=>{scanTimer=0;if(scope!==currentScope||client()!==id||calibrationIdentity().email!==owner||!allowedScan())return;
  pendingRescan=false;
  const task=tracker.inspect(orderedSources(id),()=>scope===currentScope&&client()===id&&calibrationIdentity().email===owner&&allowedScan(),id);scan=task;
  task.catch(()=>{}).finally(()=>{if(scan===task)scan=null;paintRows();const requested=scope!==currentScope||pendingRescan;pendingRescan=false;if(requested)schedule();else {armRetry(id,owner,currentScope);scheduleBackgroundV2774();}});
 },0);
}
function schedule(){if(timer)return;timer=setTimeout(()=>{timer=0;inspect();},20);}
function noteSave(rec,blob,saveId){return tracker.noteSave(rec,blob,saveId);}
function saved(event,local=false){const d=event.detail||{};if(!canRead()||d.owner&&String(d.owner).trim().toLowerCase()!==calibrationIdentity().email)return;if(d.saveId){if(local)tracker.localSaved(d.saveId,d);else tracker.acknowledge(d.saveId,d);}paintRows();schedule();}
window.cdqReportConformityV2727={noteSave,inspect,state:(file,clientId=client())=>tracker.state(file,clientId),tracker,backgroundStatus:()=>({scope:backgroundScopeV2774,seen:backgroundSeenV2774.size,limited:backgroundSeenV2774.size>=BACKGROUND_INSPECT_LIMIT_V2774})};
window.addEventListener('cdq:report-data-saved-v2754',event=>{if(canRead()&&tracker.engineLocal(event.detail))paintRows();});
window.addEventListener('cdq:report-pdf-confirmed-v2754',event=>{if(canRead()&&tracker.engineConfirmed(event.detail))paintRows();});
window.addEventListener('cdq:balance-list-rows-v2730',()=>{paintRows();schedule();});
window.addEventListener('cdq:folder-render-v2627',()=>{paintRows();schedule();});
window.addEventListener('cdq:pdf-local-saved',event=>saved(event,true));
window.addEventListener('cdq:pdf-saved',event=>saved(event));
window.addEventListener('cdq:pdf-save-retired-v2707',event=>{const d=event.detail||{};tracker.retire(d.saveId,d);paintRows();schedule();});
for(const event of ['cdq:access-ready','cdq:access-state-v2527','cdq:drive-ready-v2632','cdq:drive-write-idle-v2746','cdq:drive-cleared-v2632','cdq:copied','cdq:deleted','cdq:moved','cdq:renamed','cdq:reader-closed-v2703','online'])window.addEventListener(event,schedule);
// The top-level Android Selector does not emit the iframe-only idle event.
// Subscribe to the actual work queue so a click cannot permanently suppress inspection.
window.cdqFieldWorkV2729?.subscribe?.(schedule);
window.addEventListener('cdq:field-idle-v2729',schedule);
window.addEventListener('offline',paintRows);
window.addEventListener('scroll',schedule,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
document.addEventListener('click',event=>{
 if(event.target.closest?.('.folder-header,.bottom-nav-item,.company-item')){
  tracker.retryFailed(reportConformitySourcesV2727(root(client())),client());
  schedule();
 }
},true);
// Paint verified badges in the same DOM microtask as the client files render.
const files=document.getElementById('filesContainer');if(files)new MutationObserver(()=>{paintRows();schedule();}).observe(files,{childList:true,subtree:true});
window.addEventListener('cdq:client-content-ready-v2745',()=>{paintRows();schedule();});
schedule();
