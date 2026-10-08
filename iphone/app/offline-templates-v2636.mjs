import {nameFromReport} from './report-name-v2648.mjs';
import {openSheet} from './sheet-launcher-v2526.mjs';
import {REPORT_NAMES,bundledTemplate,bundledCreationTemplate} from './report-templates-v2636.mjs';
import {fillInFrame} from './pdf-fill-client-v2523.mjs';
import {sessionCopyStorageV2664} from './pdf-session-storage-v2664.mjs';
// Only chosen offline PDFs and unconfirmed work persist; confirmed work stays in RAM.
const DB_NAME = 'cdq-offline-templates-v1';
export const MODELS = REPORT_NAMES;
const known = key => Object.prototype.hasOwnProperty.call(MODELS,key);
const identifier = value => typeof value==='string' && /^[\w-]{1,150}$/.test(value);
export function validDestination(d) {
  return !!d && identifier(d.clientId) && identifier(d.folderId) && typeof d.name==='string' && d.name.length>0;
}
export function validPdf(blob) {
  return blob instanceof Blob && blob.type==='application/pdf' && blob.size>5 && blob.size<=32*1024*1024;
}
export function validTemplate(t) {
  return !!t && known(t.modeleId) && validPdf(t.blob) && identifier(t.templateId);
}
export function makeCopy(template,destination,email,requestId) {
  if(!validTemplate(template)||!validDestination(destination)||!email||!/^[\w-]{8,100}$/.test(requestId||''))
    throw new Error('Préparez le modèle et choisissez le dossier du client.');
  const name=MODELS[template.modeleId]+' — '+new Date().toISOString().replace(/[:.]/g,'-')+'.pdf';
  return {id:requestId,email,modeleId:template.modeleId,blob:template.blob,templateId:template.templateId,
    bundled:!!template.bundled,templateBlob:template.bundled?(template.creationBlob||(template.creation?null:template.blob)):null,creationAsset:template.creation||null,sourceId:template.sourceId||'',modifieLe:template.modifieLe,destination:{...destination},name,creationName:name,
    autoReportName:true,createdAt:Date.now(),status:'pending',editVersion:0,uploadId:(template.creationBlob||template.creation)?requestId+'_appearance':'',syncedUploadId:'',driveId:''};
}
export function syncRequest(copy) {
  return {requestId:copy.id,modeleId:copy.modeleId,clientId:copy.destination.clientId,folderId:copy.destination.folderId,
    templateId:copy.templateId,modifieLe:copy.modifieLe,...(copy.bundled?{bundled:true,blob:copy.templateBlob,name:copy.creationName||copy.name}: {})};
}
export function nextSync(copy,protocol=0) {
  if(copy.kind==='sheet')return null;
  if(copy.kind==='prepared')return !copy.removed&&copy.uploadId&&copy.uploadId!==copy.syncedUploadId&&protocol>=38
    ?{type:'CDQ_OFFLINE_SAVE',requestId:copy.id,driveId:copy.driveId,revision:copy.revision,uploadId:copy.uploadId,blob:copy.blob,...(copy.autoReportName?{reportName:copy.name,clientId:copy.destination.clientId}:{})}:null;
  if(!known(copy.modeleId)||!validDestination(copy.destination))return null;
  // Blank-copy requests remain compatible with the parallel multi-model server fixes.
  // Filled-PDF uploads require the explicit protocol-38 acknowledgement.
  if(!copy.driveId)return copy.bundled&&!validPdf(copy.templateBlob)?null:{type:'CDQ_OFFLINE_COPY',...syncRequest(copy)};
  if(copy.uploadId && copy.uploadId!==copy.syncedUploadId && protocol>=38)
    return {type:'CDQ_OFFLINE_SAVE',requestId:copy.id,driveId:copy.filledDriveId||copy.driveId,revision:copy.revision||'',uploadId:copy.uploadId,blob:copy.blob,...(copy.autoReportName?{reportName:copy.name,clientId:copy.destination.clientId}:{})};
  return null;
}
export function applyResult(copy,data) {
  if(!copy||data.requestId!==copy.id)return copy;
  const c={...copy};
  if(data.type==='CDQ_OFFLINE_COPY_RESULT') {
    if(!data.ok){c.error=data.message||'La copie reste sur cet appareil.';return c;}
    if(!identifier(data.id))return copy;
    c.driveId=data.id;c.revision=data.revision||'';c.error='';c.templateBlob=null;c.creationAsset=null;
    c.status=c.uploadId && c.uploadId!==c.syncedUploadId?'pending':'synced';
  } else if(data.type==='CDQ_OFFLINE_SAVE_RESULT') {
    if(!data.ok){c.error=data.message||'Le PDF rempli reste sur cet appareil.';return c;}
    if(!identifier(data.id))return copy;
    if(c.uploadId===data.uploadId&&data.reportName)c.name=data.reportName;
    c.syncedUploadId=data.uploadId;c.filledDriveId=data.id;c.revision=data.revision||'';c.status=c.uploadId===data.uploadId?'synced':'pending';c.error='';
  }
  return c;
}
async function verifyPdf(blob,sha256) {
  if(!validPdf(blob)||await blob.slice(0,5).text()!=='%PDF-')throw new Error('Le fichier reçu n’est pas un PDF valide.');
  if(sha256){
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==sha256)throw new Error('Le modèle reçu est incomplet. Réessayez sa préparation.');
  }
}
function database() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{for(const n of ['state','destinations','copies'])if(!req.result.objectStoreNames.contains(n))req.result.createObjectStore(n,{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function storeAction(name,mode,fn) {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(name,mode);let result;
    const req=fn(tx.objectStore(name));req.onsuccess=()=>{result=req.result;};
    tx.oncomplete=()=>{db.close();resolve(result);};
    tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('Espace local indisponible. Le PDF n’a pas été enregistré.'));};
  });
}
const nativeStorage={get:(s,id)=>storeAction(s,'readonly',o=>o.get(id)),put:(s,v)=>storeAction(s,'readwrite',o=>o.put(v)),all:s=>storeAction(s,'readonly',o=>o.getAll()),remove:(s,id)=>storeAction(s,'readwrite',o=>o.delete(id))};
function download(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function createOfflineTemplates({send,unlock,openPdf,warmPdf,openSheetFile=openSheet,storage=nativeStorage}) {
  let session=null,localEmail='',profile=null,chain=Promise.resolve(),epoch=0,documentReaderWarmed=false;
  const inflight=new Map(),requested=new Set(),copyJobs=new Map();
  const readers=new Map(),creationDownloads=new Map();
  const sessionStorage=sessionCopyStorageV2664(storage,id=>readers.has(id));
  const {get,put,all}=sessionStorage;
  // Le moteur hors ligne reste actif, mais aucun bouton séparé n'est montré.
  // Les modèles locaux sont utilisés depuis les boutons principaux du Selector.
  const launch=document.createElement('button');launch.type='button';launch.id='cdq-offline-launch';launch.textContent='Modèles hors ligne';launch.hidden=true;
  launch.style.cssText='position:fixed;right:14px;bottom:110px;z-index:10001;padding:12px 18px;border:1px solid #739aab;border-radius:12px;background:#132832;color:white;font:600 15px system-ui';
  const panel=document.createElement('section');panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Modèles hors ligne');
  panel.style.cssText='position:fixed;inset:0;z-index:10002;overflow:auto;background:#101820;color:#eef4f7;padding:24px;box-sizing:border-box;font:16px system-ui';
  const header=document.createElement('h2');header.textContent='Documents hors ligne';panel.append(header);
  const close=document.createElement('button');close.textContent='Retour';close.onclick=()=>{panel.hidden=true;};panel.append(close);
  const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
  const content=document.createElement('div');panel.append(content);document.body.append(launch,panel);
  const serial=fn=>{const p=chain.then(fn);chain=p.catch(()=>{});return p;};
  const serialCopy=(id,fn)=>{const key=String(id),previous=copyJobs.get(key)||Promise.resolve();const p=chain.then(()=>previous.catch(()=>{})).then(fn);copyJobs.set(key,p);p.finally(()=>{if(copyJobs.get(key)===p)copyJobs.delete(key);}).catch(()=>{});return p;};
  const allowed=email=>localEmail===email||session?.email===email;
  function notifyLocalReportV2713(c){if(session?.email===c?.email&&c?.kind!=='prepared'&&c?.kind!=='sheet'&&c?.readerRequestId&&!c.removed)send({type:'CDQ_LOCAL_REPORT_UPDATED_V2713',email:c.email,localId:c.id,driveId:c.driveId||'',blob:c.blob,name:c.name,clientId:c.destination.clientId,folderId:c.destination.folderId,uploadId:c.uploadId,editVersion:c.editVersion||0,pending:!c.driveId||c.uploadId!==c.syncedUploadId});}
  function notifyDocument(c){notifyLocalReportV2713(c);if(session?.email===c?.email&&c?.driveId&&!c.removed)send({type:'CDQ_OFFLINE_DOCUMENT_UPDATED',email:c.email,fileId:c.driveId,blob:c.blob,revision:c.revision,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,editVersion:c.editVersion||0,uploadId:c.uploadId,folderId:c.destination.folderId,autoReportName:c.autoReportName===true,offlineSelected:c.kind==='prepared',pending:c.uploadId!==c.syncedUploadId});}
  function button(parent,label,fn) {
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.style.cssText='padding:12px 16px;margin:6px 8px 6px 0;border:1px solid #7896a5;border-radius:9px;background:#193545;color:white;font:inherit';
    b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){status.textContent=e.message||String(e);}finally{b.disabled=false;}};parent.append(b);return b;
  }
  function text(parent,value){const p=document.createElement('p');p.textContent=value;parent.append(p);}
  async function loadTemplate(email,key) {
    // Blank templates are packaged; account documents still belong to private storage.
    return bundledTemplate(key);
  }

  function requestModel(key){
    if(!session||!known(key)||requested.has(session.email+':'+key))return;
    requested.add(session.email+':'+key);send({type:'CDQ_OFFLINE_PREPARE',modeleId:key});
  }
  async function refresh() {
    const stamp=epoch,p=await get('state','profile');if(stamp!==epoch)return;
    profile=p;
    const copiesHere=p?(await all('copies')).some(c=>c.email===p.email&&!c.removed):false;
    if(stamp!==epoch)return;
    launch.hidden=true;
    if(!session&&copiesHere&&navigator.onLine===false)panel.hidden=false;
    close.hidden=!session&&navigator.onLine===false;
    launch.style.display=launch.hidden?'none':'block';launch.textContent='Documents hors ligne';
    if(panel.hidden)return;
    content.replaceChildren();
    if(!p){status.textContent='Ouvrez CDQ avec Internet pour préparer vos modèles.';return;}
    if(!allowed(p.email)){
      status.textContent='Déverrouillez les fichiers préparés sur cet appareil.';
      button(content,'Déverrouiller avec la sécurité de l’appareil',async()=>{
        await unlock(p.email);if(stamp!==epoch)throw new Error('Demande annulée.');localEmail=p.email;await refresh();
      });return;
    }
    const email=p.email,templates=await Promise.all(Object.keys(MODELS).map(k=>loadTemplate(email,k)));
    const destinations=(await all('destinations')).filter(d=>d.email===email).sort((a,b)=>b.savedAt-a.savedAt);
    const copies=(await all('copies')).filter(c=>c.email===email&&!c.removed).sort((a,b)=>b.createdAt-a.createdAt);
    if(stamp!==epoch||!allowed(email))return;
    const count=templates.filter(validTemplate).length;
    status.textContent=count+' / '+Object.keys(MODELS).length+' modèles prêts sur cet appareil.';
    const sheets=copies.filter(c=>c.kind==='sheet').sort((a,b)=>a.destination.name.localeCompare(b.destination.name,'fr'));
    if(sheets.length){
      text(content,'Google Sheets sélectionnés');
      text(content,'Activez ⋮ → Disponible hors connexion dans Google Sheets pour chaque feuille. Les modifications et leur synchronisation sont gérées par Google Sheets. CDQ ne peut pas vérifier cet état.');
      let company='';for(const c of sheets){
        if(company!==c.destination.name){company=c.destination.name;const h=document.createElement('h3');h.textContent=company;content.append(h);}
        const row=document.createElement('div');content.append(row);
        text(row,c.name+' — '+(c.confirmed?'Hors connexion confirmé par vous':'À activer dans Google Sheets'));
        button(row,'Ouvrir dans Google Sheets',()=>{if(stamp!==epoch||!allowed(email))throw Error('Déverrouillez CDQ.');return openSheetFile({id:c.driveId,email:c.account||'',readOnly:!p.canWrite});});
        if(!c.confirmed)button(row,'J’ai activé le hors connexion',()=>serial(async()=>{
          if(stamp!==epoch||!allowed(email))throw Error('Déverrouillez CDQ.');
          await put('copies',{...c,confirmed:true});await refresh();
        }));
        button(row,'Retirer de cette liste',()=>serial(async()=>{
          if(stamp!==epoch||!allowed(email))throw Error('Déverrouillez CDQ.');
          if(!window.confirm('Retirer le raccourci de CDQ ? La copie et les modifications restent dans Google Sheets. Pour y désactiver le hors connexion, vérifiez d’abord que la synchronisation Google est terminée.'))return;
          await put('copies',{...c,removed:true});await refresh();
        }));
      }
    }
    const prepared=copies.filter(c=>c.kind==='prepared').sort((a,b)=>a.destination.name.localeCompare(b.destination.name,'fr'));
    if(prepared.length){
      text(content,prepared.length+' PDF disponibles hors ligne');let company='';
      for(const c of prepared){
        if(company!==c.destination.name){company=c.destination.name;const h=document.createElement('h3');h.textContent=company;content.append(h);}
        const row=document.createElement('div');content.append(row);text(row,'● '+c.name+(c.uploadId!==c.syncedUploadId?' — modifications en attente':''));
        if(c.error)text(row,c.error);
        button(row,'Ouvrir',()=>{if(stamp!==epoch||!allowed(email))throw Error('Déverrouillez CDQ.');return openPdf({blob:c.blob,name:c.name,fileId:c.driveId,readOnly:!p.canWrite,onSave:p.canWrite?(blob,id)=>saveCopy(c.id,email,blob,id):null});});
        button(row,'Retirer du mode hors ligne',()=>serial(async()=>{
          if(stamp!==epoch||!allowed(email))throw Error('Déverrouillez CDQ.');
          const latest=await get('copies',c.id);if(latest.uploadId!==latest.syncedUploadId||inflight.has(c.id))throw Error('Synchronisez les modifications avant de retirer ce PDF.');
          await put('copies',{...latest,removed:true,blob:null});
          if(session?.email===email)send({type:'CDQ_OFFLINE_DOCUMENT_REMOVED',fileId:c.driveId,email});await refresh();
        }));
      }
    }
    if(session && session.protocol<38)text(content,'La synchronisation des PDF remplis exige le serveur avec protocole 38. En attendant, vos réponses restent conservées sur cet appareil.');
    let select;
    if(p.canWrite&&destinations.length){
      const label=document.createElement('label');label.textContent='Dossier du client';label.htmlFor='cdq-local-destination';content.append(label);
      select=document.createElement('select');select.id='cdq-local-destination';select.style.cssText='display:block;width:100%;max-width:650px;padding:12px;margin:10px 0;font:inherit';
      const first=document.createElement('option');first.value='';first.textContent='Choisir le dossier du client';select.append(first);
      for(const d of destinations){const o=document.createElement('option');o.value=d.folderId;o.textContent=d.name;select.append(o);}content.append(select);
    }else if(p.canWrite)text(content,'Avec Internet, ouvrez le dossier du client et le menu de copie pour préparer cette destination.');
    for(const [key,name] of Object.entries(MODELS)){
      const row=document.createElement('div');row.style.cssText='border-top:1px solid #385360;padding-top:10px;margin-top:16px';content.append(row);
      const t=templates.find(t=>t?.modeleId===key);text(row,name+(validTemplate(t)?' — prêt':' — non préparé'));
      if(!validTemplate(t)){
        if(session&&navigator.onLine!==false)button(row,'Préparer maintenant',()=>{requested.delete(session.email+':'+key);requestModel(key);status.textContent='Préparation de '+name+' demandée…';});
        continue;
      }
      button(row,'Consulter le modèle',()=>openPdf({blob:t.blob,name:name+'.pdf',modeleId:key,readOnly:true}));
      if(p.canWrite&&select)button(row,'Créer une copie',()=>serial(async()=>{
        if(stamp!==epoch||!allowed(email))throw new Error('Déverrouillez CDQ de nouveau.');
        const d=destinations.find(d=>d.folderId===select.value);if(!d)throw new Error('Choisissez d’abord le dossier du client.');
        if(!window.confirm('Copier « '+name+' » dans « '+d.name+' » ?'))return;
        await put('copies',makeCopy(t,d,email,'local_'+crypto.randomUUID()));await refresh();await sync();
      }));
    }
    text(content,'Les originaux restent inchangés. Une copie créée ici est conservée sur cet appareil, puis ajoutée au dossier client après reconnexion et déverrouillage.');
    if(session?.canWrite)button(content,'Réessayer la synchronisation',()=>serial(sync));
    for(const c of copies.filter(c=>c.kind!=='prepared'&&c.kind!=='sheet')){
      const row=document.createElement('div');row.style.cssText='border-top:1px solid #385360;padding-top:10px;margin-top:18px';content.append(row);
      text(row,c.name);text(row,c.destination.name+' — '+(c.status==='synced'?'Ajouté au dossier client':c.uploadId?'PDF rempli conservé ici — envoi en attente':'Copie conservée ici — envoi en attente'));
      if(c.error)text(row,c.error);
      button(row,'Ouvrir la copie',()=>openPdf({blob:c.blob,name:c.name,fileId:c.id,modeleId:c.modeleId,autoReportName:c.autoReportName===true,readOnly:!p.canWrite,
        onSave:p.canWrite?(blob,requestId)=>saveCopy(c.id,email,blob,requestId):null}));
      button(row,'Télécharger la copie',()=>download(c.blob,c.name));
    }
  }
  async function saveCopy(id,email,blob,readerRequestId) {
    const stamp=epoch;
    await verifyPdf(blob);
    return serialCopy(id,async()=>{
      if(stamp!==epoch||!allowed(email)||!profile?.canWrite)throw new Error('Déverrouillez CDQ pour enregistrer.');
      const c=await get('copies',id);if(!c||c.email!==email)throw new Error('Copie locale introuvable.');
      // Repeated reader requests are idempotent. Resolve only after IndexedDB commits.
      if(c.readerRequestId!==readerRequestId){
        const reportName=await nameFromReport(blob,c.name);
        if(stamp!==epoch||!allowed(email)||!profile?.canWrite)throw Error('Le compte a changé.');
        const updated={...c,autoReportName:c.autoReportName||reportName!==c.name,blob,name:reportName,readerRequestId,editVersion:(c.editVersion||0)+1,uploadId:'pdf_'+crypto.randomUUID(),status:'pending',error:''};
        await put('copies',updated);if(stamp===epoch)notifyDocument(updated);
      }
      refresh().catch(()=>{});sync().catch(()=>{});return {queued:true};
    });
  }
  async function sync() {
    const current=session,stamp=epoch;if(navigator.onLine===false||!current?.canWrite)return;
    const copies=await all('copies');if(stamp!==epoch||session!==current)return;
    for(let c of copies){
      if(c.email!==current.email||inflight.has(c.id)||readers.get(c.id)?.opening)continue;
      if(!c.driveId&&c.bundled&&!validPdf(c.templateBlob)&&c.creationAsset){
        if(!creationDownloads.has(c.id)){
         const id=c.id,job=(async()=>{try{
          const blob=await bundledCreationTemplate(c.creationAsset);
          if(stamp!==epoch||session?.email!==current.email)return;
          const updated=await serialCopy(id,async()=>{
            const latest=await get('copies',id);
            if(stamp!==epoch||session?.email!==current.email||!latest||latest.email!==current.email||latest.removed)return null;
            if(latest.driveId||validPdf(latest.templateBlob))return latest;
            const updated={...latest,templateBlob:blob,error:''};await put('copies',updated);return updated;
          });
          return !!updated&&stamp===epoch&&session?.email===current.email;
        }catch(error){
          if(stamp!==epoch||session?.email!==current.email)return;
          await serialCopy(id,async()=>{const latest=await get('copies',id);if(latest&&latest.email===current.email&&!latest.driveId)await put('copies',{...latest,error:error.message||String(error)});});
          refresh().catch(()=>{});return false;
         }})();creationDownloads.set(id,job);
         job.then(ok=>{if(creationDownloads.get(id)===job)creationDownloads.delete(id);if(ok)sync().catch(()=>{});}).catch(()=>{if(creationDownloads.get(id)===job)creationDownloads.delete(id);});
        }
        continue;
      }
      if(c.uploadId&&c.uploadId!==c.syncedUploadId&&!/^[a-zA-Z0-9_-]{8,100}$/.test(c.uploadId)){c={...c,uploadId:'pdf_'+crypto.randomUUID()};await put('copies',c);if(stamp!==epoch||session!==current)return;}
      if(inflight.has(c.id)||readers.get(c.id)?.opening)continue;
      const message=nextSync(c,current.protocol);if(!message)continue;
      const job={type:message.type,uploadId:message.uploadId||'',epoch:stamp};inflight.set(c.id,job);
      job.timer=setTimeout(()=>{if(inflight.get(c.id)===job){inflight.delete(c.id);status.textContent='Réponse non reçue. La copie reste conservée ici. Utilisez « Réessayer la synchronisation ».';}},90000);
      try{send(message);}catch(e){clearTimeout(job.timer);inflight.delete(c.id);throw e;}
    }
  }
  async function handleNow(data,stamp) {
    if(stamp!==epoch)return;
    if(data.type==='CDQ_OFFLINE_SHOW_LOCAL'){panel.hidden=false;await refresh();return;}
    if(data.type==='CDQ_OFFLINE_SESSION'){
      if(typeof data.email!=='string'||!data.email||data.email.length>320)return;
      if(session?.email!==data.email)for(const job of inflight.values())clearTimeout(job.timer);
      if(session?.email!==data.email){inflight.clear();sessionStorage.clear();}
      session={email:data.email,canWrite:!!data.canWrite,protocol:Number(data.protocol)||0};localEmail=data.email;
      await put('state',{id:'profile',...session});navigator.storage?.persist?.().catch(()=>{});
      if(session.protocol<38)requestModel('camion');
      await refresh();for(const c of await all('copies'))if(stamp===epoch&&session?.email===data.email&&c.email===data.email)notifyLocalReportV2713(c);await sync();return;
    }
    const current=session;if(!current||(data.email&&data.email!==current.email))return;
    if(data.type==='CDQ_LOCAL_REPORT_OPEN_V2713'){
      try{const c=await get('copies',String(data.localId||''));if(stamp!==epoch||current!==session)return;
       if(!c||c.email!==current.email||c.removed||c.kind==='prepared'||c.kind==='sheet')throw Error('Copie locale indisponible.');
       await openPdf({blob:c.blob,name:c.name,fileId:c.id,modeleId:c.modeleId,autoReportName:c.autoReportName===true,readOnly:!current.canWrite,onSave:current.canWrite?(blob,id)=>saveCopy(c.id,current.email,blob,id):null});
      }catch(e){if(stamp===epoch&&current===session)send({type:'CDQ_LOCAL_REPORT_ERROR_V2713',email:current.email,message:e.message||String(e)});}return;
    }
    if(['CDQ_OFFLINE_SHEET_LIST','CDQ_OFFLINE_SHEET_STORE','CDQ_OFFLINE_SHEET_REMOVE'].includes(data.type)){
      const reply=payload=>{if(stamp===epoch&&current===session)send({type:'CDQ_OFFLINE_DOCUMENT_RESULT',requestId:data.requestId,...payload});};
      try{
        if(data.type==='CDQ_OFFLINE_SHEET_LIST'){
          const sheets=(await all('copies')).filter(c=>c.email===current.email&&c.kind==='sheet'&&!c.removed).map(c=>({fileId:c.driveId,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,account:c.account||'',confirmed:c.confirmed===true}));
          reply({ok:true,sheets});return;
        }
        if(!identifier(data.fileId))throw Error('Identifiant Google Sheets invalide.');
        const id='sheet:'+current.email+':'+data.fileId,old=await get('copies',id);
        if(stamp!==epoch||current!==session)return;
        if(data.type==='CDQ_OFFLINE_SHEET_REMOVE'){
          if(old)await put('copies',{...old,removed:true});
        }else{
          if(!identifier(data.clientId))throw Error('Compagnie absente.');
          await put('copies',{id,email:current.email,kind:'sheet',driveId:data.fileId,name:String(data.name||'Google Sheets').slice(0,500),account:String(data.account||'').slice(0,320),confirmed:data.confirmed===true,
            destination:{clientId:data.clientId,folderId:data.clientId,name:String(data.clientName||'Compagnie').slice(0,500)},createdAt:old?.createdAt||Date.now(),removed:false});
        }
        reply({ok:true});await refresh();
      }catch(e){reply({ok:false,message:e.message});}
      return;
    }
    if(['CDQ_OFFLINE_DOCUMENT_STORE','CDQ_OFFLINE_DOCUMENT_REMOVE','CDQ_OFFLINE_DOCUMENT_LIST','CDQ_OFFLINE_DOCUMENT_GET','CDQ_OFFLINE_DOCUMENT_EDIT','CDQ_OFFLINE_DOCUMENT_COMMIT_LEGACY'].includes(data.type)){
      const reply=payload=>send({type:'CDQ_OFFLINE_DOCUMENT_RESULT',requestId:data.requestId,...payload});
      try{
        if(data.type==='CDQ_OFFLINE_DOCUMENT_LIST'){
          const removed=(await all('copies')).filter(c=>c.email===current.email&&c.kind==='prepared'&&c.removed).map(c=>c.driveId);
          const documents=(await all('copies')).filter(c=>c.email===current.email&&c.kind==='prepared'&&!c.removed).map(c=>({fileId:c.driveId,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,revision:c.revision,blob:c.blob,editVersion:c.editVersion||0,uploadId:c.uploadId,folderId:c.destination.folderId,autoReportName:c.autoReportName===true,offlineSelected:c.kind==='prepared',pending:c.uploadId!==c.syncedUploadId}));
          if(stamp===epoch)reply({ok:true,offlineSelectionVersion:2664,removed,documents});return;
        }
        if(!identifier(data.fileId))throw Error('Identifiant PDF invalide.');
        const id='prepared:'+current.email+':'+data.fileId,c=await get('copies',id);
        if(stamp!==epoch||current!==session)return;
        if(data.type==='CDQ_OFFLINE_DOCUMENT_GET'){
          if(data.legacyPending&&c&&!c.removed)throw Error('Une ancienne sauvegarde attend sa synchronisation. Reconnectez CDQ avant de modifier ce PDF.');
          reply({ok:true,document:c&&!c.removed?{fileId:c.driveId,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,revision:c.revision,blob:c.blob,editVersion:c.editVersion||0,uploadId:c.uploadId,folderId:c.destination.folderId,autoReportName:c.autoReportName===true,offlineSelected:c.kind==='prepared',pending:c.uploadId!==c.syncedUploadId}:null});return;
        }
        if(data.type==='CDQ_OFFLINE_DOCUMENT_EDIT'){
          if(!current.canWrite||!c||c.removed)throw Error('PDF hors ligne indisponible.');
          if(c.readerRequestId!==data.saveId){
            if(Number(data.editVersion)!==Number(c.editVersion||0))throw Error('Ce PDF a été modifié dans une autre fenêtre. Fermez puis rouvrez le document avant de continuer.');
            await verifyPdf(data.blob);if(stamp!==epoch||current!==session)return;
            const reportName=(c.autoReportName||data.autoReportName)?await nameFromReport(data.blob,c.name):c.name;
            const updated={...c,autoReportName:c.autoReportName||data.autoReportName===true,name:reportName,blob:data.blob,readerRequestId:data.saveId,editVersion:(c.editVersion||0)+1,uploadId:'pdf_'+crypto.randomUUID(),status:'pending',error:''};
            await put('copies',updated);notifyDocument(updated);
          }
          const latest=await get('copies',id);reply({ok:true,queued:latest.uploadId!==latest.syncedUploadId,editVersion:latest.editVersion,name:latest.name});refresh().catch(()=>{});sync().catch(()=>{});return;
        }
        if(data.type==='CDQ_OFFLINE_DOCUMENT_COMMIT_LEGACY'){
          if(!c||c.removed){reply({ok:true});return;}
          if(c.uploadId!==c.syncedUploadId||inflight.has(id))throw Error('Une autre copie locale contient des modifications. Elles sont conservées; vérifiez la synchronisation de ce PDF.');
          if(c.revision!==data.expectedRevision&&c.revision!==data.revision)throw Error('La révision locale a changé. Préparez de nouveau ce PDF après sa synchronisation.');
          await verifyPdf(data.blob);if(stamp!==epoch||current!==session)return;
          const updated={...c,blob:data.blob,revision:data.revision,editVersion:(c.editVersion||0)+1};await put('copies',updated);notifyDocument(updated);reply({ok:true});await refresh();return;
        }
        if(c&&(c.uploadId!==c.syncedUploadId||inflight.has(id)))throw Error('Des modifications de ce PDF attendent leur synchronisation dans les documents de l’application.');
        if(data.type==='CDQ_OFFLINE_DOCUMENT_REMOVE'){
          await put('copies',{...c,id,email:current.email,kind:'prepared',driveId:data.fileId,removed:true,blob:null});
        }else{
          await verifyPdf(data.blob);if(stamp!==epoch||current!==session)return;
          if(!identifier(data.clientId)||!data.revision)throw Error('Compagnie ou révision PDF absente.');
          await put('copies',{id,email:current.email,kind:'prepared',driveId:data.fileId,revision:data.revision,blob:data.blob,name:String(data.name||'Rapport.pdf'),
            destination:{clientId:data.clientId,folderId:data.clientId,name:String(data.clientName||'Compagnie')},createdAt:Date.now(),status:'synced',uploadId:'',syncedUploadId:'',editVersion:c?(c.editVersion||0)+1:0});
          if(warmPdf&&!documentReaderWarmed){documentReaderWarmed=true;warmPdf(data);}
        }
        if(stamp===epoch){reply({ok:true});await refresh();}
      }catch(e){if(stamp===epoch)reply({ok:false,message:e.message});}
      return;
    }
    // Old Drive preparation messages cannot replace approved packaged templates.
    if(data.type==='CDQ_OFFLINE_TEMPLATE')return;
    if(data.type==='CDQ_OFFLINE_DESTINATION'&&validDestination(data)){
      await put('destinations',{id:current.email+':'+data.folderId,email:current.email,clientId:data.clientId,folderId:data.folderId,name:data.name,savedAt:Date.now()});await refresh();
    }
    if(data.type==='CDQ_OFFLINE_PREFILL_V2642'){
      const c=await get('copies',String(data.requestId||''));
      if(!current.canWrite||!c||c.email!==current.email||stamp!==epoch||current!==session)return;
      const values=Object.fromEntries(Object.entries(data.values||{}).filter(([k,v])=>/^client_(adresse|ville|code_postal|province|telephone)$/.test(k)&&typeof v==='string'&&v.length<=1000));
      const reader=readers.get(c.id);if(reader?.epoch===stamp){const handle=await reader.handle;if(stamp!==epoch||current!==session||!current.canWrite)return;handle?.prefill?.(values);}
      // Preserve the late coordinates on disk too. Saved answers are never replaced.
      if(!c.readerRequestId&&Object.keys(values).length){
        const blob=await fillInFrame(values,{blob:c.blob,strict:false,onlyEmpty:true});
        if(stamp!==epoch||current!==session)return;
        const latest=await get('copies',c.id);if(latest?.readerRequestId)return;
        await put('copies',{...latest,blob,editVersion:(latest.editVersion||0)+1,uploadId:'pdf_'+crypto.randomUUID(),status:'pending'});await sync();
      }
      return;
    }
    if(data.type==='CDQ_OFFLINE_CREATE_LOCAL'){
      const id=String(data.requestId||'');
      try{
        if(!current.canWrite||!/^[\w-]{8,100}$/.test(id)||!known(data.modeleId))throw new Error('Copie locale non autorisée ou demande invalide.');
        const d={clientId:String(data.clientId||''),folderId:String(data.folderId||''),name:String(data.destinationName||data.name||'Dossier client')};
        if(!validDestination(d))throw new Error('Dossier client invalide.');
        const t=await loadTemplate(current.email,data.modeleId);if(!validTemplate(t))throw new Error('Préparez ce modèle avec Internet avant de le copier hors ligne.');
        let c=await get('copies',id);
        if(c&&(c.email!==current.email||c.modeleId!==data.modeleId||c.destination.clientId!==d.clientId||c.destination.folderId!==d.folderId))throw new Error('Identifiant déjà utilisé pour une autre copie.');
        if(stamp!==epoch)return;
        if(!c){c=makeCopy(t,d,current.email,id);if(data.prefill&&Object.keys(data.prefill).length){c.blob=await fillInFrame(data.prefill,{blob:c.blob,strict:false});c.uploadId=id+'_prefill';c.editVersion=1;}if(stamp!==epoch||session!==current)return;await put('copies',c);}
        await put('destinations',{id:current.email+':'+d.folderId,email:current.email,...d,savedAt:Date.now()});
        await refresh();
        if(stamp!==epoch||session!==current)return;
        // Confirm the visible reader as well as the durable copy. A hidden old
        // reader must never swallow a new-report request.
        if(data.open===true){
          Promise.resolve().then(()=>new Promise((resolve,reject)=>{
            if(stamp!==epoch||session!==current)return reject(Error('Le compte a changé.'));
            const reader={epoch:stamp,handle:null,opening:true};readers.set(c.id,reader);
            const finish=callback=>value=>{reader.opening=false;callback(value);if(stamp===epoch&&session?.email===current.email)sync().catch(()=>{});};
            try{reader.handle=Promise.resolve(openPdf({blob:c.blob,name:c.name,fileId:c.id,modeleId:c.modeleId,autoReportName:c.autoReportName===true,readOnly:false,
              onOpened:finish(resolve),onError:finish(reject),onClose:()=>{if(readers.get(c.id)===reader)readers.delete(c.id);},onSave:(blob,requestId)=>saveCopy(c.id,current.email,blob,requestId)}));
            reader.handle.catch(finish(reject));}catch(error){finish(reject)(error);}
          })).then(()=>{if(stamp===epoch&&session?.email===current.email)send({type:'CDQ_OFFLINE_CREATE_LOCAL_RESULT',requestId:id,ok:true,modeleId:c.modeleId,name:c.name});})
          .catch(e=>{if(stamp===epoch&&session?.email===current.email)send({type:'CDQ_OFFLINE_CREATE_LOCAL_RESULT',requestId:id,ok:false,message:'Copie conservée dans Mes copies locales. '+(e.message||String(e))});});
        }else send({type:'CDQ_OFFLINE_CREATE_LOCAL_RESULT',requestId:id,ok:true,modeleId:c.modeleId,name:c.name});
        await sync();
      }catch(e){send({type:'CDQ_OFFLINE_CREATE_LOCAL_RESULT',requestId:id,ok:false,message:e.message||String(e)});}
      return;
    }
    if(['CDQ_OFFLINE_COPY_RESULT','CDQ_OFFLINE_SAVE_RESULT'].includes(data.type)){
      const job=inflight.get(data.requestId);
      if(!job||job.epoch!==stamp||job.type+'_RESULT'!==data.type||(job.uploadId&&job.uploadId!==data.uploadId))return;
      clearTimeout(job.timer);inflight.delete(data.requestId);
      const copy=await get('copies',data.requestId);if(!copy||copy.email!==current.email||stamp!==epoch)return;
      const updated=applyResult(copy,data);await put('copies',updated);if(stamp===epoch&&data.ok)notifyDocument(updated);await refresh();if(data.ok)await sync();
    }
  }
  launch.onclick=()=>{panel.hidden=false;refresh().catch(e=>{status.textContent=e.message;});};
  const resume=()=>serial(async()=>{await refresh();await sync();}).catch(()=>{});
  window.addEventListener('online',resume);window.addEventListener('focus',resume);
  document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)resume();});
  window.addEventListener('offline',()=>serial(refresh).catch(()=>{}));
  refresh().catch(()=>{});
  return {handle(data){const stamp=epoch;const id=data.fileId?'prepared:'+String(session?.email||'')+':'+data.fileId:/^CDQ_OFFLINE_(?:CREATE_LOCAL|PREFILL_V2642|COPY_RESULT|SAVE_RESULT)$/.test(data.type)?data.requestId:'';return (id?serialCopy(id,()=>handleNow(data,stamp)):serial(()=>handleNow(data,stamp))).catch(e=>{status.textContent=e.message||String(e);});},
    lock(){epoch++;session=null;localEmail='';for(const job of inflight.values())clearTimeout(job.timer);inflight.clear();requested.clear();readers.clear();creationDownloads.clear();sessionStorage.clear();panel.hidden=true;},refresh};
}
