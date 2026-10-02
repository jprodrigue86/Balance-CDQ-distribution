import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const allowed=()=>window.cdqDriveEntryV2632?.canRead()&&['admin','technicien'].includes(calibrationIdentity().role);
const folder=()=>{try{if(!compagnieSelectionnee)return '';return String((typeof cdqDossierOuvertId!=='undefined'&&cdqDossierOuvertId)||compagnieSelectionnee);}catch{return '';}};
let epoch=0,owner='',observed='',timer=0,pending=null;
const attempts=new Map();
function paint(text,error=false){const p=document.getElementById('cdqClientActionsV2640');if(!p||p.hidden)return;let el=p.querySelector('[data-balance-list-status]');if(!el){el=document.createElement('p');el.dataset.balanceListStatus='';el.className='cdq-workspace-status';el.setAttribute('role','status');p.append(el);}el.textContent=text;el.classList.toggle('cdq-workspace-error',error);}
async function call(name,id,...args){const key=calibrationIdentity().email,version=epoch;if(!allowed())throw Error('Un compte technicien autorisé au Drive est nécessaire.');const r=await calibrationRpc(name,id,...args);if(version!==epoch||key!==calibrationIdentity().email||!allowed())throw Error('Le compte a changé.');return r;}
async function poll(id,open,version){
  const start=Date.now();while(version===epoch&&allowed()&&Date.now()-start<180000){
    const r=await call('cdqEtatListeBalanceV2638',id);if(r.status==='ready'){if(id===folder())paint('Liste de balance actualisée · '+r.count+' balance(s)'+(r.warnings?.length?' · '+r.warnings.length+' fichier(s) à vérifier':''));if(open&&r.fileId&&id===folder())await window.cdqOpenPdfV2520?.(r.fileId,{nom:'Liste de balance.pdf'});return r;}
    if(r.status==='error')throw Error(r.message||'La liste de balance doit être vérifiée.');
    if(id===folder())paint('Liste de balance en préparation. Vous pouvez continuer à naviguer.');
    await new Promise(resolve=>setTimeout(resolve,4000));
  }
  if(version===epoch&&id===folder())paint('La liste sera actualisée par le serveur. Rouvrez « Liste de balance » pour la consulter.');return {status:'pending'};
}
async function refresh(open=false){
  if(!allowed()||!folder()||navigator.onLine===false)return {status:'unavailable'};
  const id=folder(),key=calibrationIdentity().email+'|'+id;
  if(pending?.key===key){if(open)pending.open=true;return pending.promise;}
  if(!open&&Date.now()-(attempts.get(key)||0)<60000)return {status:'cached'};
  attempts.set(key,Date.now());const version=epoch,job={key,open,promise:null};
  job.promise=(async()=>{try{let result=await call('cdqDemanderListeBalanceV2638',id,open);if(result.status==='ready'){if(id===folder())paint('Liste de balance actualisée · '+result.count+' balance(s)');if(job.open&&result.fileId&&id===folder())await window.cdqOpenPdfV2520?.(result.fileId,{nom:'Liste de balance.pdf'});return result;}
    result=await poll(id,false,version);if(job.open&&result.status==='ready'&&result.fileId&&id===folder())await window.cdqOpenPdfV2520?.(result.fileId,{nom:'Liste de balance.pdf'});return result;
  }catch(e){if(version===epoch&&id===folder())paint(e.message,true);if(open)throw e;return {status:'error',message:e.message};}finally{if(pending===job)pending=null;}})();pending=job;return job.promise;
}
function reset(){epoch++;owner=calibrationIdentity().email;observed='';attempts.clear();pending=null;clearTimeout(timer);document.querySelector('[data-balance-list-status]')?.remove();}
function inspect(){if(owner!==calibrationIdentity().email)reset();if(!allowed()||window.cdqWorkspaceV2638?.active()!=='')return;const id=folder();if(id!==observed){observed=id;refresh(false).catch(()=>{});}}
window.cdqBalanceListV2638={refresh};
window.addEventListener('cdq:access-ready',reset);window.addEventListener('cdq:drive-cleared-v2632',reset);
for(const event of ['cdq:copied','cdq:pdf-saved'])window.addEventListener(event,()=>{const key=calibrationIdentity().email+'|'+folder();attempts.delete(key);refresh(false).catch(()=>{});});
document.addEventListener('click',e=>{if(e.target.closest('.folder-header,.bottom-nav-item,.company-item')){clearTimeout(timer);timer=setTimeout(inspect,200);}},true);
setInterval(()=>{if(!document.hidden)inspect();},30000);reset();
