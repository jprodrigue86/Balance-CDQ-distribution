import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
import {createReportConformityTrackerV2727,reportConformitySourcesV2727} from './report-conformity-cache-v2727.mjs';
import './field-work-v2729.mjs';

const canRead=()=>!!window.cdqDriveEntryV2632?.canRead()&&!!calibrationIdentity().email;
const client=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
const root=id=>{try{return cacheContenuCompagnies[id]||null;}catch{return null;}};
function readerBusy(){try{return !!window.parent.document.getElementById('legacy-pdf-reader')||document.documentElement.classList.contains('cdq-workspace-reader-open');}catch{return document.documentElement.classList.contains('cdq-workspace-reader-open');}}
let timer=0,scan=null,scanTimer=0,scope='',pendingRescan=false;
const tracker=createReportConformityTrackerV2727({
 identity:()=>canRead()?calibrationIdentity().email:'',
 library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},
 loadPdf:(id,client,revision)=>window.cdqLoadPdfForCalibrationV2668(id,revision),
 loadSheet:async(id,clientId)=>{const owner=calibrationIdentity().email;if(!canRead())throw Error('Accès Drive requis.');const snapshot=await calibrationRpc('obtenirSnapshotGoogleSheetHorsLigne',id,clientId);if(!canRead()||owner!==calibrationIdentity().email)throw Error('Le compte a changé.');return snapshot;},
 onChange:()=>paintRows()
});
function paintRows(){
 const id=client(),files=new Map(reportConformitySourcesV2727(root(id)).map(file=>[String(file.id),file]));
 for(const row of document.querySelectorAll('#filesContainer .file-row')){
  const fileId=row.querySelector('.file-checkbox[data-file-id]')?.dataset.fileId||row.querySelector('[data-file-id]')?.dataset.fileId;
  const file=files.get(String(fileId||'')),name=row.querySelector('.file-name'),show=canRead()&&!!file&&tracker.state(file,id)==='nonconforming';
  let dot=row.querySelector('[data-report-nonconforming-v2727]');
  if(!show||!name){dot?.remove();continue;}
  if(!dot){dot=document.createElement('span');dot.dataset.reportNonconformingV2727='';dot.className='cdq-report-nonconforming-v2727';dot.setAttribute('role','img');dot.setAttribute('aria-label','Balance non conforme');dot.title='Balance non conforme';name.prepend(dot);}
  else if(name.firstChild!==dot)name.prepend(dot);
 }
}
function allowedScan(){return canRead()&&!readerBusy()&&!document.hidden&&navigator.onLine!==false&&window.cdqFieldWorkV2729?.available()!==false;}
function inspect(){
 paintRows();const id=client(),owner=calibrationIdentity().email,currentScope=owner+'|'+id;scope=currentScope;
 // A folder may finish loading during this scan without adding any red dot.
 // Coalesce every new inspection request and visit its current files once more.
 if(scan){pendingRescan=true;return;}
 if(!id||!root(id)||!allowedScan()||scanTimer)return;
 scanTimer=setTimeout(()=>{scanTimer=0;if(scope!==currentScope||client()!==id||calibrationIdentity().email!==owner||!allowedScan())return;
  pendingRescan=false;
  const task=tracker.inspect(reportConformitySourcesV2727(root(id)),()=>scope===currentScope&&client()===id&&calibrationIdentity().email===owner&&allowedScan(),id);scan=task;
  task.catch(()=>{}).finally(()=>{if(scan===task)scan=null;paintRows();const requested=scope!==currentScope||pendingRescan;pendingRescan=false;if(requested)schedule();});
 },350);
}
function schedule(){if(timer)return;timer=setTimeout(()=>{timer=0;inspect();},50);}
function noteSave(rec,blob,saveId){return tracker.noteSave(rec,blob,saveId);}
function saved(event,local=false){const d=event.detail||{};if(!canRead()||d.owner&&String(d.owner).trim().toLowerCase()!==calibrationIdentity().email)return;if(d.saveId){if(local)tracker.localSaved(d.saveId,d);else tracker.acknowledge(d.saveId,d);}paintRows();schedule();}
window.cdqReportConformityV2727={noteSave,inspect,state:(file,clientId=client())=>tracker.state(file,clientId),tracker};
window.addEventListener('cdq:pdf-local-saved',event=>saved(event,true));
window.addEventListener('cdq:pdf-saved',event=>saved(event));
window.addEventListener('cdq:pdf-save-retired-v2707',event=>{const d=event.detail||{};tracker.retire(d.saveId,d);paintRows();schedule();});
for(const event of ['cdq:access-ready','cdq:access-state-v2527','cdq:drive-ready-v2632','cdq:drive-cleared-v2632','cdq:copied','cdq:deleted','cdq:moved','cdq:renamed','cdq:reader-closed-v2703','online'])window.addEventListener(event,schedule);
window.addEventListener('cdq:field-idle-v2729',schedule);
window.addEventListener('offline',paintRows);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
document.addEventListener('click',event=>{if(event.target.closest?.('.folder-header,.bottom-nav-item,.company-item'))schedule();},true);
const files=document.getElementById('filesContainer');if(files)new MutationObserver(schedule).observe(files,{childList:true,subtree:true});
schedule();
