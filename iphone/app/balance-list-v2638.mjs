import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const canRead=()=>!!window.cdqDriveEntryV2632?.canRead()&&!!calibrationIdentity().email;
const canWrite=()=>canRead()&&['admin','technicien'].includes(calibrationIdentity().role);
// A list belongs to the client, never the archive or child folder currently expanded.
const client=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const excluded=v=>/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/.test(norm(v));
let epoch=0,owner='',visibleClient='',timer=0;
const jobs=new Map(),receipts=new Map(),states=new Map();
const key=id=>calibrationIdentity().email+'|'+id;
function root(id){try{return cacheContenuCompagnies[id]||null;}catch{return null;}}
function listFile(id){return (root(id)?.fichiers||[]).find(f=>norm(f.nom||f.name)==='liste de balance.pdf');}
export function sourceFingerprint(tree){
  if(!tree)return '';
  const rows=[],take=(node,pdf)=>{for(const f of node.fichiers||[]){if(excluded(f.nom||f.name))continue;const type=f.mimeType||f.type;if(type==='application/vnd.google-apps.spreadsheet'||type==='GOOGLE_SHEETS'||pdf&&(type==='application/pdf'||type==='PDF'))rows.push([String(f.id),f.nom||f.name,type,f.modifiedTime||f.dateModification||'',String(f.version||f.revision||''),f.md5Checksum||f.sha256Checksum||'',f._cdqPendingSaveV2660||'',f._cdqConfirmedAt2530||'']);}};
  take(tree,true);
  for(const d of tree.dossiers||[])if(/^rapports? (?:d ?)?etalonnages?$/.test(norm(d.nom||d.name))){rows.push(['folder',String(d.id)]);take(d,false);}
  return JSON.stringify(rows.sort((a,b)=>a[0].localeCompare(b[0])));
}
function remembered(id){const k=key(id);if(receipts.has(k))return receipts.get(k);try{const r=JSON.parse(localStorage.getItem('cdqBalanceListV2660:'+k)||'null');if(r){receipts.set(k,r);return r;}}catch{}return null;}
function remember(id,fingerprint){const r={fingerprint,requestedAt:Date.now()};receipts.set(key(id),r);try{localStorage.setItem('cdqBalanceListV2660:'+key(id),JSON.stringify(r));}catch{}}
function paint(id,text,error=false){if(id!==client())return;const p=document.getElementById('cdqClientActionsV2640');if(!p||p.hidden)return;let el=p.querySelector('[data-balance-list-status]');if(!el){el=document.createElement('p');el.dataset.balanceListStatus='';el.className='cdq-workspace-status';el.setAttribute('role','status');p.append(el);}if(el.textContent!==text)el.textContent=text;el.classList.toggle('cdq-workspace-error',error);}
function ready(id,r,notify=false){states.set(key(id),r);if(notify)paint(id,'Liste à jour · '+(r.count||0)+' balance(s)'+(r.warnings?.length?' · '+r.warnings.length+' fichier(s) à vérifier':''));}
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
async function refresh(force=false,verify=false){
  const id=client();if(!id||!canWrite()||navigator.onLine===false)return {status:'unavailable'};
  const k=key(id),fingerprint=sourceFingerprint(root(id)),active=jobs.get(k);
  if(active){if(fingerprint&&fingerprint!==active.fingerprint)active.dirty=true;if(force)active.forceNext=true;return active.promise;}
  if(!force&&!verify&&remembered(id)?.fingerprint===fingerprint)return {status:'cached'};
  // Automatic checks are silent; only an explicit refresh reports progress.
  const progress=(text,error=false)=>{if(force)paint(id,text,error);};
  const version=epoch,job={fingerprint,dirty:false,promise:null};jobs.set(k,job);
  job.promise=(async()=>{try{
    const r=await call('cdqDemanderListeBalanceV2638',id,force,fingerprint);states.set(k,r);
    if(r.status==='busy'){progress('Vérification reportée. La liste existante reste accessible.');return r;}
    if(r.status==='ready'){remember(id,fingerprint);ready(id,r,force);return r;}
    if(r.status==='error')throw Error(r.message||'Actualisation impossible.');
    progress('Actualisation de la liste…');
    const deadline=Date.now()+180000;
    while(version===epoch&&canRead()&&Date.now()<deadline){
      await new Promise(resolve=>setTimeout(resolve,3000));
      if(version!==epoch||!canRead())break;
      if(document.hidden)continue;
      const result=await call('cdqEtatListeBalanceV2638',id);states.set(k,result);
      if(result.status==='ready'){remember(id,fingerprint);ready(id,result,force);return result;}
      if(result.status==='error')throw Error(result.message||'Actualisation impossible.');
    }
    if(version===epoch)progress('Actualisation en cours sur le serveur. La liste existante reste accessible.');
    return {status:'pending'};
  }catch(e){if(version===epoch)progress('Actualisation interrompue. La liste existante reste accessible.',true);return {status:'error',message:e.message};}
  finally{if(jobs.get(k)===job)jobs.delete(k);if(version===epoch&&id===client()){if(job.forceNext)queueMicrotask(()=>refresh(true));else if(job.dirty)schedule();}}})();
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
function reset(){epoch++;owner=calibrationIdentity().email;visibleClient='';receipts.clear();states.clear();jobs.clear();clearTimeout(timer);closeMenu();document.querySelector('[data-balance-list-status]')?.remove();}
function inspect(){
  if(owner!==calibrationIdentity().email)reset();
  const id=client();if(id!==visibleClient){visibleClient=id;closeMenu();document.querySelector('[data-balance-list-status]')?.remove();}
  if(!canWrite()||document.hidden||window.cdqWorkspaceV2638?.active()!=='')return;
  const tree=root(id);if(!id||!tree)return;
  const fingerprint=sourceFingerprint(tree),job=jobs.get(key(id));
  if(job){if(fingerprint!==job.fingerprint)job.dirty=true;return;}
  const receipt=remembered(id);if(receipt?.fingerprint!==fingerprint||Date.now()-Number(receipt?.requestedAt||0)>60000)refresh(false,true).catch(()=>{});
}
function schedule(){clearTimeout(timer);timer=setTimeout(inspect,500);}
window.cdqBalanceListV2638={refresh,open,menu,inspect};
window.addEventListener('cdq:access-ready',()=>{if(owner!==calibrationIdentity().email)reset();schedule();});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:drive-ready-v2632',schedule);
for(const event of ['cdq:copied','cdq:pdf-saved','cdq:pdf-local-saved'])window.addEventListener(event,schedule);
document.addEventListener('click',e=>{if(e.target.closest?.('.folder-header,.bottom-nav-item,.company-item')){closeMenu();schedule();}},true);
const files=document.getElementById('filesContainer');if(files)new MutationObserver(schedule).observe(files,{childList:true,subtree:true});
setInterval(()=>{if(!document.hidden)inspect();},30000);reset();schedule();
