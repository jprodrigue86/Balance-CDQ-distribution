import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
import {createEquipmentTrackerV2697} from './equipment-list-v2697.mjs';
const smartPc=()=>document.documentElement.classList.contains('cdq-desktop-v2676');
const equipment=smartPc()?createEquipmentTrackerV2697({identity:()=>calibrationIdentity().email,library:async()=>{await window.cdqPreparePdfLibV2684();return window.PDFLib;},loadPdf:id=>window.cdqLoadPdfForCalibrationV2668(id)}):null;
window.cdqEquipmentListV2697=equipment;
const canRead=()=>!!window.cdqDriveEntryV2632?.canRead()&&!!calibrationIdentity().email;
const canWrite=()=>canRead()&&['admin','technicien'].includes(calibrationIdentity().role);
// A list belongs to the client, never the archive or child folder currently expanded.
const client=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const excluded=v=>/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/.test(norm(v));
let epoch=0,owner='',visibleClient='',timer=0,pcScan=null;
const jobs=new Map(),receipts=new Map(),states=new Map();
// Saves belong to their client, independently of the visible page or selection.
const saveWaits=new Map(),changes=new Map(),satisfied=new Map(),clientTimers=new Map();
const key=id=>calibrationIdentity().email+'|'+id;
const waiting=id=>(saveWaits.get(key(id))?.size||0)>0;
function paintRows(){
  const id=client(),k=key(id),running=jobs.has(k)||waiting(id)||(changes.get(k)||0)>(satisfied.get(k)||0);
  for(const row of document.querySelectorAll('.file-row')){
    const checkbox=row.querySelector('.file-checkbox[data-file-id]'),known=states.get(k)?.fileId||listFile(id)?.id;
    const isList=!!known&&checkbox?.dataset.fileId===String(known);
    let indicator=row.querySelector('[data-balance-list-working]');
    if(!isList||!running||!canRead()){indicator?.remove();row.removeAttribute('data-balance-list-busy');continue;}
    if(!indicator){indicator=document.createElement('span');indicator.dataset.balanceListWorking='';indicator.className='cdq-balance-list-working';indicator.setAttribute('role','status');const badge=row.querySelector('.file-today-done-badge');row.insertBefore(indicator,badge||null);}
    const text=navigator.onLine===false?'Liste de balances : actualisation en attente de connexion':waiting(id)?'Liste de balances : synchronisation du rapport en cours':'Liste de balances : actualisation en cours';
    if(indicator.getAttribute('aria-label')!==text){indicator.setAttribute('aria-label',text);indicator.title=text;}
    indicator.classList.toggle('cdq-balance-list-paused',navigator.onLine===false);row.dataset.balanceListBusy='true';
  }
}
function scheduleClient(id){
  const k=key(id);if(clientTimers.has(k))return;
  const version=epoch;clientTimers.set(k,setTimeout(()=>{clientTimers.delete(k);if(version===epoch&&!waiting(id))refresh(false,true,id).catch(()=>{});},150));
}
function saved(event,local=false){
  if(owner!==calibrationIdentity().email)reset();
  const d=event.detail||{},id=String(d.clientId||'');if(!id){schedule();return;}
  if(!canWrite()||excluded(d.name||d.nom))return;
  const k=key(id),file=String(d.id||d.fileId||''),token=String(d.saveId||'');
  if(smartPc()&&equipment.decision(token)===false&&!saveWaits.get(k)?.has(file))return;
  if(local&&d.pending!==false){let pending=saveWaits.get(k);if(!pending)saveWaits.set(k,pending=new Map());pending.set(file,token);paintRows();return;}
  const pending=saveWaits.get(k);if(pending?.has(file)&&(!token||pending.get(file)===token))pending.delete(file);
  if(smartPc()&&(!local||d.pending===false))equipment.acknowledge(token);
  changes.set(k,(changes.get(k)||0)+1);const job=jobs.get(k);if(job)job.dirty=true;
  paintRows();scheduleClient(id);
}
function root(id){try{return cacheContenuCompagnies[id]||null;}catch{return null;}}
function listFile(id){return (root(id)?.fichiers||[]).find(f=>norm(f.nom||f.name)==='liste de balance.pdf');}
export function sourceFingerprint(tree){
  if(!tree)return '';
  const rows=[['client',String(tree.id||''),tree.nom||tree.name||'']],take=(node,pdf)=>{for(const f of node.fichiers||[]){if(excluded(f.nom||f.name))continue;const type=f.mimeType||f.type;if(smartPc()&&pdf&&(type==='application/pdf'||type==='PDF')){rows.push([String(f.id),type]);continue;}if(type==='application/vnd.google-apps.spreadsheet'||type==='GOOGLE_SHEETS'||pdf&&(type==='application/pdf'||type==='PDF'))rows.push([String(f.id),f.nom||f.name,type,f.modifiedTime||f.dateModification||'',String(f.version||f.revision||''),f.md5Checksum||f.sha256Checksum||'',f._cdqPendingSaveV2660||'',f._cdqConfirmedAt2530||'']);}};
  take(tree,true);
  for(const d of tree.dossiers||[])if(/^rapports? (?:d ?)?etalonnages?$/.test(norm(d.nom||d.name))){rows.push(['folder',String(d.id)]);take(d,false);}
  return JSON.stringify(rows.sort((a,b)=>a[0].localeCompare(b[0])));
}
const receiptPrefix=()=>smartPc()?'cdqBalanceListV2697:':'cdqBalanceListV2660:';
function remembered(id){const k=key(id);if(receipts.has(k))return receipts.get(k);try{const r=JSON.parse(localStorage.getItem(receiptPrefix()+k)||'null');if(r){receipts.set(k,r);return r;}}catch{}return null;}
function remember(id,fingerprint){const r={fingerprint,requestedAt:Date.now()};receipts.set(key(id),r);try{localStorage.setItem(receiptPrefix()+key(id),JSON.stringify(r));}catch{}}
function paint(id,text,error=false){if(id!==client())return;const p=document.getElementById('cdqClientActionsV2640');if(!p||p.hidden)return;let el=p.querySelector('[data-balance-list-status]');if(!el){el=document.createElement('p');el.dataset.balanceListStatus='';el.className='cdq-workspace-status';el.setAttribute('role','status');p.append(el);}if(el.textContent!==text)el.textContent=text;el.classList.toggle('cdq-workspace-error',error);}
function ready(id,r,notify=false){states.set(key(id),r);if(r.fileId&&r.updatedAt)window.cdqInstantFiles2530?.confirm?.({id:r.fileId,nom:'Liste de balance.pdf',type:'PDF',dateModification:r.updatedAt},id,id);if(notify)paint(id,'Liste à jour · '+(r.count||0)+' balance(s)'+(r.warnings?.length?' · '+r.warnings.length+' fichier(s) à vérifier':''));}
async function call(name,id,...args){const account=calibrationIdentity().email,version=epoch;if(!canRead())throw Error('Accès Drive requis.');const r=await calibrationRpc(name,id,...args);if(version!==epoch||account!==calibrationIdentity().email||!canRead())throw Error('Le compte a changé.');return r;}
async function open(){
  const id=client();if(!id||!canRead())return;
  const file=listFile(id),known=states.get(key(id)),fileId=known?.fileId||file?.id;
  // Existing PDF is immediately readable, including during an update.
  if(fileId)return window.cdqOpenPdfV2520?.(fileId,{nom:'Liste de balance.pdf',forceRefresh:!!known?.checkedAt});
  if(navigator.onLine===false){paint(id,'Aucune liste disponible hors ligne.',true);return;}
  const r=await call('cdqEtatListeBalanceV2638',id);if(id!==client())return;states.set(key(id),r);
  if(r.fileId)return window.cdqOpenPdfV2520?.(r.fileId,{nom:'Liste de balance.pdf',forceRefresh:r.status==='ready'});
  paint(id,r.status==='pending'||r.status==='working'?'Première liste en préparation. Les autres fichiers restent accessibles.':'Aucune liste disponible. Choisissez « Actualiser la liste ».');
}
async function refresh(force=false,verify=false,id=client()){
  if(!id||!canWrite()||navigator.onLine===false)return {status:'unavailable'};
  const k=key(id),fingerprint=sourceFingerprint(root(id)),active=jobs.get(k);
  if(active){if(fingerprint&&fingerprint!==active.fingerprint)active.dirty=true;if(force)active.forceNext=true;return active.promise;}
  if(waiting(id)&&!force){paintRows();return {status:'waiting-save'};}
  if(!force&&!verify&&remembered(id)?.fingerprint===fingerprint&&(changes.get(k)||0)===(satisfied.get(k)||0))return {status:'cached'};
  // Automatic checks are silent; only an explicit refresh reports progress.
  const progress=(text,error=false)=>{if(force)paint(id,text,error);};
  const version=epoch,change=changes.get(k)||0,stamp=fingerprint+'|saved:'+change,job={fingerprint,dirty:false,promise:null};jobs.set(k,job);paintRows();
  job.promise=(async()=>{try{
    let result=await call('cdqActualiserListeBalanceV2665',id,force,stamp);states.set(k,result);
    progress('Actualisation de la liste…');
    const deadline=Date.now()+180000;
    while(version===epoch&&canRead()&&Date.now()<deadline){
      if(result.status==='ready'){if(!waiting(id)&&change===(changes.get(k)||0)){remember(id,fingerprint);satisfied.set(k,change);}ready(id,result,force);return result;}
      if(result.status==='error')throw Error(result.message||'Actualisation impossible.');
      if(!['busy','pending','working'].includes(result.status))throw Error('Réponse d’actualisation non confirmée.');
      await new Promise(resolve=>setTimeout(resolve,1000));
      if(version!==epoch||!canRead())break;
      result=result.status==='busy'?await call('cdqActualiserListeBalanceV2665',id,false,stamp):await call('cdqEtatListeBalanceV2638',id);
      if(result.status==='pending')result=await call('cdqActualiserListeBalanceV2665',id,false,stamp);states.set(k,result);
    }
    if(version===epoch)progress('Actualisation en cours sur le serveur. La liste existante reste accessible.');
    return {status:'pending'};
  }catch(e){if(version===epoch){satisfied.set(k,changes.get(k)||0);progress('Actualisation interrompue. La liste existante reste accessible.',true);}return {status:'error',message:e.message};}
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
function reset(){epoch++;owner=calibrationIdentity().email;visibleClient='';receipts.clear();states.clear();jobs.clear();saveWaits.clear();changes.clear();satisfied.clear();for(const t of clientTimers.values())clearTimeout(t);clientTimers.clear();clearTimeout(timer);timer=0;closeMenu();document.querySelector('[data-balance-list-status]')?.remove();paintRows();}
function inspect(){
  if(owner!==calibrationIdentity().email)reset();
  const id=client();if(id!==visibleClient){visibleClient=id;closeMenu();document.querySelector('[data-balance-list-status]')?.remove();}
  paintRows();if(!canWrite()||document.hidden)return;
  const tree=root(id);if(!id||!tree)return;
  const fingerprint=sourceFingerprint(tree),job=jobs.get(key(id));
  if(job){if(fingerprint!==job.fingerprint)job.dirty=true;return;}
  const receipt=remembered(id);
  if(smartPc()){
   // An existing list is readable as-is. First-time field snapshots establish
   // a baseline without regenerating it merely because a folder was opened.
   if(!receipt&&listFile(id))remember(id,fingerprint);
   else if(receipt?.fingerprint!==fingerprint)refresh(false,true).catch(()=>{});
   const version=epoch,k=key(id),files=(tree.fichiers||[]).filter(f=>!excluded(f.nom||f.name)&&['PDF','application/pdf'].includes(f.mimeType||f.type)&&!f._cdqPendingSaveV2660);
   if(!pcScan){const task=equipment.inspect(files,()=>client()===id&&epoch===version);pcScan=task;task.then(changed=>{if(changed&&epoch===version&&canWrite()){changes.set(k,(changes.get(k)||0)+1);scheduleClient(id);}}).catch(()=>{}).finally(()=>{if(pcScan===task){pcScan=null;if(client()!==id)schedule();}});}
   return;
  }
  if(receipt?.fingerprint!==fingerprint||Date.now()-Number(receipt?.requestedAt||0)>60000)refresh(false,true).catch(()=>{});
}
// Coalesce notifications without postponing the first check when rows repaint.
function schedule(){if(timer)return;timer=setTimeout(()=>{timer=0;inspect();},150);}
window.cdqBalanceListV2638={refresh,open,menu,inspect};
window.addEventListener('cdq:access-ready',()=>{if(owner!==calibrationIdentity().email)reset();schedule();});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:drive-ready-v2632',schedule);
for(const event of ['cdq:copied','cdq:pdf-saved'])window.addEventListener(event,e=>saved(e));
window.addEventListener('cdq:pdf-local-saved',e=>saved(e,true));window.addEventListener('cdq:client-renamed',e=>saved(e));
window.addEventListener('online',()=>{for(const k of changes.keys())if(k.startsWith(owner+'|')&&(changes.get(k)||0)>(satisfied.get(k)||0))scheduleClient(k.slice(owner.length+1));paintRows();schedule();});window.addEventListener('offline',paintRows);
document.addEventListener('click',e=>{if(e.target.closest?.('.folder-header,.bottom-nav-item,.company-item')){closeMenu();schedule();}},true);
const files=document.getElementById('filesContainer');if(files)new MutationObserver(schedule).observe(files,{childList:true,subtree:true});
if(!smartPc())setInterval(()=>{if(!document.hidden)inspect();},30000);reset();schedule();
