import {createLocalReaderEditSessionsV2756} from './file-edit-session-v2756.mjs';
import {reportContextV2754,reportFieldsV2754,reportPayloadV2754} from './report-engine-client-v2754.mjs';
import {equipmentValuesV2697} from './equipment-list-v2697.mjs';
import {nameFromReport,nextNumberedReportNameV2731,identificationReportName} from './report-name-v2648.mjs';
import {pdfWorkV2729,validatedPdfSaveInfoV2753} from './pdf-work-v2729.mjs';
import {openSheet} from './sheet-launcher-v2526.mjs';
import {REPORT_NAMES,bundledTemplate,bundledCreationTemplate} from './report-templates-v2636.mjs';
import {fillInFrame} from './pdf-fill-client-v2523.mjs';
import {sessionCopyStorageV2664,confirmedLocalCopyV2755} from './pdf-session-storage-v2664.mjs';
import {localReportVisibleV2714,retiredLocalReportV2714} from './local-report-hygiene-v2714.mjs';
// Only chosen offline PDFs and unconfirmed work persist; confirmed work stays in RAM.
const DB_NAME = 'cdq-offline-templates-v1';
const engineFamilyAliasV2754=Object.freeze({cuve3:'cuve4',tremie3:'tremie4'});
export const MODELS = Object.freeze({...REPORT_NAMES,cuve3:REPORT_NAMES.cuve3||'Balance à cuve 3 points',tremie3:REPORT_NAMES.tremie3||'Balance trémie 3 points'});
const known = key => Object.prototype.hasOwnProperty.call(MODELS,key);
const identifier = value => typeof value==='string' && /^[\w-]{1,150}$/.test(value);
// A new report keeps its identity beside the durable blank PDF until the reader
// or the background filler saves complete PDF bytes. Do not parse and serialize
// the whole report on the user's opening path just to insert company details.
export function identityDraftV2730(values) {
  const entries=Object.entries(values||{});
  if(!entries.length||entries.some(([name,value])=>!/^client_(nom|telephone|technicien|adresse|ville|province|code_postal)$/.test(name)||typeof value!=='string'||value.length>1000))return null;
  return Object.fromEntries(entries.filter(([,value])=>value.trim()!==''));
}
export function validDestination(d) {
  return !!d && identifier(d.clientId) && identifier(d.folderId) && typeof d.name==='string' && d.name.length>0;
}
export function validPdf(blob) {
  return blob instanceof Blob && blob.type==='application/pdf' && blob.size>5 && blob.size<=32*1024*1024;
}
export function localOnlyRetirementV2755(copy,email,now=Date.now()) {
  if(!email || copy?.email !== email || copy.kind === 'sheet' || !confirmedLocalCopyV2755(copy))
    throw Error('Des modifications restent sur cet appareil. Synchronisez-les avant de retirer cette copie.');
  // This is a local storage decision, never a report/Drive deletion request.
  return {...copy,removed:true,status:'retired',retiredAt:now,retirementReason:'offline-local-only',
    blob:null,templateBlob:null,creationTransferV2751:null,reportSnapshotV2754:null,reportPayloadV2754:null,
    offlineSelected:false,offlinePrepared:false,engineDeletionV2754:false,cancelledDriveId:'',error:''};
}
export function validEngineReceiptV2755(copy,data) {
  const revision=data?.reportRevision,pdf=data?.pdf;
  return !!copy?.reportEngineV2754 && data?.requestId===copy.id &&
    (!data.reportId||data.reportId===copy.reportEngineV2754.reportId) &&
    (!data.email||data.email===copy.email) &&
    (!data.clientId||data.clientId===copy.destination?.clientId) &&
    (!data.saveRequestIdV2757||data.uploadId==='fields_'+data.saveRequestIdV2757) &&
    identifier(data.id) && Number.isSafeInteger(revision) && revision>0 &&
    revision>=Number(copy.reportRevisionV2754||0) && pdf?.status==='confirmed' &&
    pdf.fileId===data.id && pdf.revision===revision &&
    (!pdf.driveRevision||!data.revision||pdf.driveRevision===data.revision);
}
export function offlineScopeMatchesV2755(copy,scope,email) {
  if(copy?.email!==email||copy.removed||copy.destination?.clientId!==scope.clientId)return false;
  const files=new Set(scope.fileIds||[]),folders=new Set(scope.folderIds||[]);
  return [copy.id,copy.driveId,copy.filledDriveId].some(id=>files.has(id)) ||
    folders.has(scope.clientId)||folders.has(copy.destination.folderId)||
    (copy.destination.ancestorIds||[]).some(id=>folders.has(id));
}
export function validTemplate(t) {
  return !!t && known(t.modeleId) && validPdf(t.blob) && identifier(t.templateId);
}
export function makeCopy(template,destination,email,requestId,existingNames=[]) {
  if(!validTemplate(template)||!validDestination(destination)||!email||!/^[\w-]{8,100}$/.test(requestId||''))
    throw new Error('Préparez le modèle et choisissez le dossier du client.');
  const name=nextNumberedReportNameV2731(MODELS[template.modeleId],existingNames);
  return {id:requestId,email,modeleId:template.modeleId,blob:template.blob,templateId:template.templateId,
    bundled:!!template.bundled,readerPreparedVersion:template.readerPreparedVersion===2730?2730:undefined,templateBlob:template.bundled?(template.creationBlob||(template.creation?null:template.blob)):null,creationAsset:template.creation||null,sourceId:template.sourceId||'',modifieLe:template.modifieLe,destination:{...destination},name,creationName:name,
    autoReportName:true,createdAt:Date.now(),status:'pending',editVersion:0,uploadId:(template.creationBlob||template.creation)?requestId+'_appearance':'',syncedUploadId:'',driveId:''};
}
export function syncRequest(copy) {
  return {requestId:copy.id,modeleId:copy.modeleId,clientId:copy.destination.clientId,folderId:copy.destination.folderId,
    templateId:copy.templateId,modifieLe:copy.modifieLe,...(copy.bundled?{bundled:true,blob:copy.templateBlob,name:copy.creationName||copy.name}: {})};
}
export function nextSync(copy,protocol=0) {
  if(copy.removed&&copy.engineDeletionV2754&&!copy.engineDeleteConfirmedV2754)return {type:'CDQ_REPORT_ENGINE_DELETE_V2754',requestId:copy.id,uploadId:'delete_'+copy.reportEngineV2754.reportId,context:copy.reportEngineV2754};
  if(copy.removed&&copy.retirementReason==='user'&&copy.cancelledDriveId&&!copy.cancelledDeleteConfirmed)return {type:'CDQ_OFFLINE_CANCELLED_DELETE_V2714',requestId:copy.id,driveId:copy.cancelledDriveId,clientId:copy.destination.clientId};
  if(copy.removed)return null;
  if(copy.reportEngineV2754){
    if(!copy.reportSnapshotV2754||!copy.reportPayloadV2754||copy.uploadId===copy.syncedUploadId)return null;
    const accepted=copy.engineAcceptedV2757;
    const statusOnly=accepted?.uploadId===copy.uploadId&&accepted.requestId===copy.reportPayloadV2754.requestId&&Number.isSafeInteger(accepted.revision)&&accepted.revision>0;
    return {type:'CDQ_REPORT_ENGINE_SAVE_V2754',requestId:copy.id,uploadId:copy.uploadId,payload:copy.reportPayloadV2754,...(statusOnly?{statusOnlyV2757:true,acceptedRevisionV2757:accepted.revision}:{})};
  }
  if(copy.initialValues&&Object.keys(copy.initialValues).length)return null;
  if(copy.kind==='sheet')return null;
  if(copy.kind==='prepared')return !copy.removed&&copy.uploadId&&copy.uploadId!==copy.syncedUploadId&&protocol>=38
    ?{type:'CDQ_OFFLINE_SAVE',requestId:copy.id,clientId:copy.destination.clientId,fileName:copy.name,driveId:copy.driveId,revision:copy.revision,uploadId:copy.uploadId,blob:copy.blob,folderId:copy.destination.folderId===copy.destination.clientId?'':copy.destination.folderId,...(copy.autoReportName?{reportName:copy.name,clientId:copy.destination.clientId}:{})}:null;
  if(!known(copy.modeleId)||!validDestination(copy.destination))return null;
  // Blank-copy requests remain compatible with the parallel multi-model server fixes.
  // Filled-PDF uploads require the explicit protocol-38 acknowledgement.
  if(!copy.driveId){
    if(copy.bundled&&protocol>=38&&copy.creationTransferV2751){const frozen=copy.creationTransferV2751;return {type:'CDQ_OFFLINE_COPY',...syncRequest(copy),blob:frozen.blob||new Blob([frozen.pdfBytesV2664],{type:'application/pdf'}),name:frozen.name,uploadId:frozen.uploadId,transferId:'create_'+copy.id,finalCreationV2751:true};}
    return copy.bundled&&!validPdf(copy.templateBlob)?null:{type:'CDQ_OFFLINE_COPY',...syncRequest(copy)};
  }
  if(copy.uploadId && copy.uploadId!==copy.syncedUploadId && protocol>=38)
    return {type:'CDQ_OFFLINE_SAVE',requestId:copy.id,clientId:copy.destination.clientId,fileName:copy.name,driveId:copy.filledDriveId||copy.driveId,revision:copy.revision||'',uploadId:copy.uploadId,blob:copy.blob,folderId:copy.destination.folderId,...(copy.autoReportName?{reportName:copy.name,clientId:copy.destination.clientId}:{})};
  return null;
}
export function applyResult(copy,data) {
  if(!copy||copy.removed||data.requestId!==copy.id)return copy;
  const c={...copy};
  if(data.type==='CDQ_REPORT_ENGINE_SAVE_V2754_RESULT'){
    if(data.reportId&&data.reportId!==c.reportEngineV2754?.reportId)return copy;
    if(!data.ok){c.error=data.message||'La publication du PDF reste en attente.';return c;}
    if(!validEngineReceiptV2755(copy,data))return copy;
    c.driveId=data.id;c.filledDriveId=data.id;c.revision=data.revision||'';c.reportRevisionV2754=data.reportRevision;
    c.reportEngineV2754={...c.reportEngineV2754,fileId:data.id,baseRevision:data.reportRevision,...(data.revision?{expectedDriveRevision:data.revision}:{})};
    if(c.reportPayloadV2754&&c.uploadId!==data.uploadId)c.reportPayloadV2754={...c.reportPayloadV2754,fileId:data.id,baseRevision:data.reportRevision,...(data.revision?{expectedDriveRevision:data.revision}:{})};
    c.syncedUploadId=data.uploadId;c.status=c.uploadId===data.uploadId?'synced':'pending';c.error='';c.enginePdfV2754=data.pdf;
    c.engineAcceptedV2757={uploadId:data.uploadId,requestId:data.saveRequestIdV2757||String(data.uploadId||'').replace(/^fields_/,''),revision:data.reportRevision};
  } else if(data.type==='CDQ_OFFLINE_COPY_RESULT') {
    if(!data.ok){c.error=data.message||'La copie reste sur cet appareil.';return c;}
    if(!identifier(data.id))return copy;
    c.driveId=data.id;c.revision=data.revision||'';c.error='';c.templateBlob=null;c.creationAsset=null;
    if(data.finalCreationV2751===true){c.syncedUploadId=data.uploadId||'';c.creationTransferV2751=null;}
    if(typeof data.name==='string'&&data.name.length<=200&&/\.pdf$/i.test(data.name)){
      c.creationName=data.name;if(copy.name===(copy.creationName||copy.name))c.name=data.name;
    }
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
export function createOfflineTemplates({send,unlock,openPdf:openPdfUnleased,acquireFileEdit,warmPdf,openSheetFile=openSheet,storage=nativeStorage}) {
  let session=null,appliedSession=null,appliedOnline=null,localEmail='',profile=null,chain=Promise.resolve(),epoch=0,documentReaderWarmed=false;
  let readAccessVersion=0,readAccountVersion=0,pendingAccessTransitions=0;
  const retirementJobs=new Map(),readRetirementVersions=new Map(),confirmedDeletedV2749=new Map();
  const inflight=new Map(),requested=new Set(),copyJobs=new Map();
  // V27.40: retry a lost Drive acknowledgment with the same idempotent
  // requestId. Do not spin forever, silently delete a PDF, or create a new id.
  const retryTimersV2740=new Map(),retryCountsV2740=new Map(),reportedFailuresV2740=new Set(),pausedSyncV2740=new Set(),sentJobsV2740=new Map();
  const reportIdentityV2749=c=>({email:c.email,localId:c.id,uploadId:c.uploadId||'',clientId:c.destination?.clientId,sourceId:c.filledDriveId||c.driveId||('cdq-local-'+c.id)});
  function reportProgressV2749(c,stage,message){if(c&&!c.removed&&session?.email===c.email)send({type:'CDQ_LOCAL_REPORT_PROGRESS_V2749',...reportIdentityV2749(c),stage,message});}
  const announcedDeletionV2749=c=>[c.filledDriveId,c.driveId].some(id=>{const tombstone=confirmedDeletedV2749.get('deleted:'+c.email+':'+id);return tombstone&&Number(c.createdAt||0)<=Number(tombstone.deletedAt);});
  async function confirmedDeletionV2749(c,extraId=''){
    for(const id of new Set([c.filledDriveId,c.driveId,extraId].filter(Boolean))){
      const key='deleted:'+c.email+':'+id,tombstone=confirmedDeletedV2749.get(key)||await get('state',key);
      if(tombstone&&Number(c.createdAt||0)<=Number(tombstone.deletedAt))return true;
    }
    return false;
  }
  async function reportSyncFailureV2740(id,message,uploadId=''){
    const current=session,stamp=epoch,access=readAccessVersion;
    const copy=await get('copies',id);
    if(!copy||copy.removed||copy.email!==current?.email||copy.uploadId&&copy.uploadId===copy.syncedUploadId||uploadId&&uploadId!==copy.uploadId||await confirmedDeletionV2749(copy)||stamp!==epoch||session!==current||access!==readAccessVersion)return;
    // A receipt may have committed while deletion evidence was being read.
    const latest=await get('copies',id);
    if(!latest||latest.removed||announcedDeletionV2749(latest)||latest.email!==current?.email||latest.uploadId!==copy.uploadId||latest.uploadId&&latest.uploadId===latest.syncedUploadId||stamp!==epoch||session!==current||access!==readAccessVersion)return;
    const key=String(id)+':'+copy.uploadId+':'+String(message||'');
    if(reportedFailuresV2740.has(key))return;
    reportedFailuresV2740.add(key);
    reportProgressV2749(copy,'pending','Rapport conservé sur cet appareil.');
    send({type:'CDQ_LOCAL_REPORT_ERROR_V2713',...reportIdentityV2749(copy),
      message:'Rapport conservé sur cet appareil; envoi Drive non confirmé. '+String(message||'Réessayez la synchronisation.')});
  }
  function clearRetryV2740(id){
    clearTimeout(retryTimersV2740.get(id));retryTimersV2740.delete(id);retryCountsV2740.delete(id);
    pausedSyncV2740.delete(id);
    for(const key of reportedFailuresV2740)if(key.startsWith(String(id)+':'))reportedFailuresV2740.delete(key);
  }
  function resetRetriesV2740(){
    for(const timer of retryTimersV2740.values())clearTimeout(timer);
    retryTimersV2740.clear();retryCountsV2740.clear();reportedFailuresV2740.clear();pausedSyncV2740.clear();
  }
  function retrySyncV2740(id,stamp,owner,message,uploadId=''){
    if(retryTimersV2740.has(id))return;
    const count=(retryCountsV2740.get(id)||0)+1;
    retryCountsV2740.set(id,count);
    if(count>2){pausedSyncV2740.add(id);status.textContent=message||'Envoi Drive non confirmé. Le PDF reste conservé dans les rapports locaux. Réessayez la synchronisation.';reportSyncFailureV2740(id,status.textContent,uploadId).catch(()=>{});return;}
    const timer=setTimeout(()=>{
      retryTimersV2740.delete(id);
      if(epoch!==stamp||session?.email!==owner||!session?.canWrite)return;
      sync(false,id).catch(error=>{status.textContent=error?.message||String(error);});
    },count===1?2000:8000);
    retryTimersV2740.set(id,timer);
  }
  const localEditSessionsV2756=createLocalReaderEditSessionsV2756({acquire:acquireFileEdit,open:openPdfUnleased,currentOwner:()=>session?.email||localEmail});
  const openPdf=async data=>{const copy=data.editCopyV2756?await get('copies',data.editCopyV2756.id)||data.editCopyV2756:null;return copy?localEditSessionsV2756.open(copy,data):openPdfUnleased(data);};
  window.addEventListener('online',()=>localEditSessionsV2756.online());
  const readers=new Map(),creationDownloads=new Map(),identityDownloads=new Map();
  const destinationNames=new Map(),destinationJobs=new Map();
  const nameKey=(email,folderId)=>email+':'+folderId;
  function rememberNames(c){
    if(!c||c.removed||!c.email||!c.destination?.folderId)return;
    const key=nameKey(c.email,c.destination.folderId),names=destinationNames.get(key)||new Set();
    if(c.name)names.add(c.name);if(c.creationName)names.add(c.creationName);destinationNames.set(key,names);
  }
  function reserveDestination(email,folderId,fn){
    const key=nameKey(email,folderId),previous=destinationJobs.get(key)||Promise.resolve(),job=previous.catch(()=>{}).then(fn);
    destinationJobs.set(key,job);job.finally(()=>{if(destinationJobs.get(key)===job)destinationJobs.delete(key);}).catch(()=>{});return job;
  }
  const sessionStorage=sessionCopyStorageV2664(storage,id=>readers.has(id));
  const {get,put:storeCopy,all}=sessionStorage,pendingWork=new Map(),copyIdentities=new Map();
  function notePending(c){
    if(c?.email!==session?.email)return;
    copyIdentities.set(c.id,c.driveId||c.filledDriveId||('cdq-local-'+c.id));
    const pending=c.kind!=='sheet'&&(!c.removed&&(!c.driveId||c.uploadId!==c.syncedUploadId)||c.removed&&(c.engineDeletionV2754&&!c.engineDeleteConfirmedV2754||c.cancelledDriveId&&!c.cancelledDeleteConfirmed));
    if(pending)pendingWork.set(c.id,true);else pendingWork.delete(c.id);
    send({type:'CDQ_DRIVE_PENDING_V2746',email:c.email,count:pendingWork.size});
  }
  async function put(store,value){
    const pending=store==='copies'&&value?.email&&value.kind!=='sheet'&&(!value.removed&&(!value.driveId||value.uploadId!==value.syncedUploadId)||value.removed&&(value.engineDeletionV2754&&!value.engineDeleteConfirmedV2754||value.cancelledDriveId&&!value.cancelledDeleteConfirmed));
    if(pending&&typeof window.BalanceCDQBackgroundV2746?.armDurableV2751==='function'&&window.BalanceCDQBackgroundV2746.armDurableV2751(value.email)===false)throw Error('La reprise durable de cette sauvegarde n’a pas pu être préparée. Réessayez.');
    const result=await storeCopy(store,value);if(store==='copies'){notePending(value);localEditSessionsV2756.update(value);}return result;
  }
  function equipmentHooks(c,current,stamp){
    let readerSession='',sequence=-1;
    const sourceId=()=>copyIdentities.get(c.id)||c.driveId||c.filledDriveId||('cdq-local-'+c.id);
    const valid=detail=>stamp===epoch&&session===current&&current.canWrite&&c.email===current.email&&detail?.sourceId===c.id&&typeof detail.readerSession==='string'&&detail.readerSession.length<=120&&Number.isInteger(detail.sequence)&&detail.sequence>=0;
    return {onEquipmentEdit:detail=>{if(!valid(detail)||detail.sequence<=sequence||readerSession&&readerSession!==detail.readerSession)return;readerSession=detail.readerSession;sequence=detail.sequence;send({type:'CDQ_LOCAL_REPORT_EQUIPMENT_EDIT_V2746',email:c.email,localId:c.id,sourceId:sourceId(),clientId:c.destination.clientId,readerSession,sequence,values:detail.values});},
      onEquipmentEditEnded:detail=>{if(!valid(detail)||readerSession!==detail.readerSession||detail.sequence<sequence)return;send({type:'CDQ_LOCAL_REPORT_EQUIPMENT_EDIT_ENDED_V2746',email:c.email,localId:c.id,sourceId:sourceId(),clientId:c.destination.clientId,readerSession,sequence:detail.sequence,reason:detail.reason});}};
  }
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
  const serialCopy=(id,fn,foreground=false)=>{const key=String(id),previous=copyJobs.get(key)||Promise.resolve();const p=(foreground?Promise.resolve():chain).then(()=>previous.catch(()=>{})).then(fn);copyJobs.set(key,p);p.finally(()=>{if(copyJobs.get(key)===p)copyJobs.delete(key);}).catch(()=>{});return p;};
  const validReadStamp=readStamp=>!readStamp||(readStamp.access===readAccessVersion&&readStamp.retirement===(readRetirementVersions.get(readStamp.key)||0));
  const allowed=email=>localEmail===email||session?.email===email;
  const engineDataV2754=c=>c?.reportEngineV2754?{reportEngineV2754:c.reportEngineV2754,reportSnapshotV2754:c.reportSnapshotV2754,enginePdfV2754:c.enginePdfV2754,reportRevisionV2754:c.reportRevisionV2754||0,engineAcceptedV2757:c.engineAcceptedV2757}:{};
  function engineReaderV2754(c,email){return {saveProgressOwnerV2758:email,editCopyV2756:c,...engineDataV2754(c),onSaveSnapshot:c.reportEngineV2754&&(session?.canWrite||profile?.canWrite)?(fields,requestId,name)=>saveSnapshotCopyV2754(c.id,email,fields,requestId,name):null};}
  async function attachEngineV2754(copy,template,current){
    if(current.reportEngineV2754!==true||!template.bundled)return copy;
    const {REPORT_ENGINE_TEMPLATES_V2754}=await import('./report-engine-templates-v2754.mjs'),meta=REPORT_ENGINE_TEMPLATES_V2754[engineFamilyAliasV2754[copy.modeleId]||copy.modeleId];
    if(!meta)throw Error('Le modèle de ce rapport n’est pas disponible dans le nouveau moteur.');
    const context=reportContextV2754({reportId:crypto.randomUUID(),clientId:copy.destination.clientId,destinationId:copy.destination.folderId,family:copy.modeleId,template:{modeleId:meta.modeleId,sha256:meta.sha256,version:2754},baseRevision:0});
    if(!context)throw Error('Le nouveau rapport n’a pas pu être préparé.');
    return {...copy,reportEngineV2754:context,reportSnapshotV2754:null,reportPayloadV2754:null};
  }
  async function saveSnapshotCopyV2754(id,email,fields,readerRequestId,name){
    const stamp=epoch,access=readAccessVersion,snapshot=reportFieldsV2754(fields);
    const canSave=()=>stamp===epoch&&access===readAccessVersion&&!pendingAccessTransitions&&allowed(email)&&profile?.canWrite&&(!session||session.email===email&&session.canWrite);
    return serialCopy(id,async()=>{
      if(!canSave())throw Error('Déverrouillez CDQ pour enregistrer.');const copy=await get('copies',id);
      if(!copy||copy.removed||copy.email!==email||!copy.reportEngineV2754)throw Error('Copie locale retirée ou introuvable.');
      if(copy.readerRequestId!==readerRequestId){
        const reportName=identificationReportName(snapshot.identification_balance?.value)||name||copy.name;
        const payload=reportPayloadV2754(copy.reportEngineV2754,snapshot,readerRequestId,reportName);
        const form={getFields:()=>Object.entries(snapshot).map(([field,state])=>({getName:()=>field,getText:()=>String(state.value??''),getSelected:()=>Array.isArray(state.value)?state.value:[String(state.value??'')],isChecked:()=>state.value===true||state.value==='Yes'}))};
        const updated={...copy,reportSnapshotV2754:snapshot,reportPayloadV2754:payload,initialValues:null,readerRequestId,equipmentSignature:equipmentValuesV2697(form),autoReportName:copy.autoReportName||reportName!==copy.name,name:reportName,editVersion:(copy.editVersion||0)+1,uploadId:'fields_'+payload.requestId,status:'pending',error:''};
        await put('copies',updated);if(!canSave())throw Error('Le compte a changé.');clearRetryV2740(id);rememberNames(updated);reportProgressV2749(updated,'saving-local','Réponses enregistrées sur cet appareil.');notifyDocument(updated);
      }
      sync(false,id).catch(()=>{});return {queued:true,reportEngineV2754:copy.reportEngineV2754};
    },true);
  }
  function notifyLocalReportV2713(c){if(session?.email===c?.email&&c?.kind!=='prepared'&&c?.kind!=='sheet'&&c?.readerRequestId&&!c.removed)send({type:'CDQ_LOCAL_REPORT_UPDATED_V2713',email:c.email,localId:c.id,driveId:c.driveId||'',...engineDataV2754(c),blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,equipmentSignature:c.equipmentSignature,name:c.name,clientId:c.destination.clientId,folderId:c.destination.folderId,ancestorIds:c.destination.ancestorIds||[],uploadId:c.uploadId,editVersion:c.editVersion||0,error:String(c.error||'').slice(0,350),pending:!c.driveId||c.uploadId!==c.syncedUploadId});}
  async function notifySnapshotV2714(){const current=session,stamp=epoch;if(!current)return;const copies=await all('copies');if(stamp!==epoch||session!==current)return;send({type:'CDQ_LOCAL_REPORT_SNAPSHOT_V2714',email:current.email,localIds:copies.filter(c=>c.email===current.email&&localReportVisibleV2714(c)).map(c=>c.id)});}
  async function retireCopyV2714(c,reason){
    const current=session,stamp=epoch;if(!current?.canWrite||c.email!==current.email)throw Error('Retrait non autorisé.');
    const archived={...retiredLocalReportV2714(c,reason),...(c.reportEngineV2754&&['user','deleted'].includes(reason)?{engineDeletionV2754:true,engineDeleteConfirmedV2754:false}:{})};await put('copies',archived);
    if(stamp!==epoch||session!==current)return;
    clearRetryV2740(c.id);
    sentJobsV2740.delete(c.id);
    const job=inflight.get(c.id);if(job){clearTimeout(job.timer);inflight.delete(c.id);}
    notifyRetiredV2749(archived);
    if(archived.engineDeletionV2754)queueMicrotask(()=>sync(false,c.id).catch(()=>{}));
  }
  function notifyRetiredV2749(c){if(session?.email===c.email&&c.removed&&c.retiredAt)send({type:'CDQ_LOCAL_REPORT_RETIRED_V2714',...reportIdentityV2749(c),driveId:c.filledDriveId||c.driveId||'',retirementReason:c.retirementReason});}
  function notifyDocument(c){notifyLocalReportV2713(c);if(session?.email===c?.email&&c?.driveId&&!c.removed)send({type:'CDQ_OFFLINE_DOCUMENT_UPDATED',email:c.email,fileId:c.driveId,localId:c.kind?'':c.id,sourceId:c.kind?c.driveId:'cdq-local-'+c.id,...engineDataV2754(c),blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,equipmentSignature:c.equipmentSignature,revision:c.revision,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,editVersion:c.editVersion||0,uploadId:c.uploadId,folderId:c.destination.folderId,ancestorIds:c.destination.ancestorIds||[],autoReportName:c.autoReportName===true,offlineSelected:c.kind==='prepared',error:String(c.error||'').slice(0,350),pending:c.uploadId!==c.syncedUploadId});}
  function button(parent,label,fn) {
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.style.cssText='padding:12px 16px;margin:6px 8px 6px 0;border:1px solid #7896a5;border-radius:9px;background:#193545;color:white;font:inherit';
    b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){status.textContent=e.message||String(e);}finally{b.disabled=false;}};parent.append(b);return b;
  }
  function text(parent,value){const p=document.createElement('p');p.textContent=value;parent.append(p);}
  async function loadTemplate(email,key) {
    // Blank templates are packaged; account documents still belong to private storage.
    const canonical=Object.prototype.hasOwnProperty.call(REPORT_NAMES,key)?key:engineFamilyAliasV2754[key]||key;
    const template=await bundledTemplate(canonical);return canonical===key?template:{...template,modeleId:key};
  }

  function requestModel(key){
    if(!session||!known(key)||requested.has(session.email+':'+key))return;
    requested.add(session.email+':'+key);send({type:'CDQ_OFFLINE_PREPARE',modeleId:key});
  }
  async function refresh() {
    const stamp=epoch,p=await get('state','profile');if(stamp!==epoch)return;
    profile=p;
    const copiesHere=!session&&navigator.onLine===false&&p?(await all('copies')).some(c=>c.email===p.email&&!c.removed):false;
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
        button(row,'Ouvrir',()=>{if(stamp!==epoch||!allowed(email))throw Error('Déverrouillez CDQ.');return openPdf({...engineReaderV2754(c,c.email),blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,name:c.name,fileId:c.driveId,readOnly:!p.canWrite,onSave:p.canWrite?(blob,id,name,provenance)=>saveCopy(c.id,email,blob,id,provenance):null});});
        button(row,'Retirer du mode hors ligne',()=>serialCopy(c.id,async()=>{
          if(stamp!==epoch||!allowed(email))throw Error('Déverrouillez CDQ.');
          const latest=await get('copies',c.id);if(inflight.has(c.id)||readers.has(c.id))throw Error('Fermez ce document et terminez sa synchronisation avant de le retirer.');
          await put('copies',localOnlyRetirementV2755(latest,email));
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
      button(row,'Consulter le modèle',()=>openPdf({blob:t.blob,readerPreparedVersion:t.readerPreparedVersion,name:name+'.pdf',modeleId:key,readOnly:true}));
      if(p.canWrite&&select)button(row,'Créer une copie',()=>serial(async()=>{
        if(stamp!==epoch||!allowed(email))throw new Error('Déverrouillez CDQ de nouveau.');
        const d=destinations.find(d=>d.folderId===select.value);if(!d)throw new Error('Choisissez d’abord le dossier du client.');
        if(!window.confirm('Copier « '+name+' » dans « '+d.name+' » ?'))return;
        const copy=makeCopy(t,d,email,'local_'+crypto.randomUUID(),copies.filter(c=>c.destination?.folderId===d.folderId).flatMap(c=>[c.name,c.creationName].filter(Boolean)));
        await put('copies',copy);rememberNames(copy);await refresh();await sync();
      }));
    }
    text(content,'Les originaux restent inchangés. Une copie créée ici est conservée sur cet appareil, puis ajoutée au dossier client après reconnexion et déverrouillage.');
    if(session?.canWrite)button(content,'Réessayer la synchronisation',()=>serial(()=>{resetRetriesV2740();return sync();}));
    const archived=(await all('copies')).filter(c=>c.email===email&&c.retiredAt&&c.blob);
    if(archived.length){text(content,'Copies retirées de l’attente');for(const c of archived){const row=document.createElement('div');content.append(row);text(row,c.name);button(row,'Télécharger la copie',()=>{if(!allowed(email))throw Error('Déverrouillez CDQ.');download(c.blob,c.name);});}}
    for(const c of copies.filter(c=>c.kind!=='prepared'&&c.kind!=='sheet')){
      const row=document.createElement('div');row.style.cssText='border-top:1px solid #385360;padding-top:10px;margin-top:18px';content.append(row);
      text(row,c.name);text(row,c.destination.name+' — '+(c.status==='synced'?'Ajouté au dossier client':c.uploadId?'PDF rempli conservé ici — envoi en attente':'Copie conservée ici — envoi en attente'));
      if(c.error)text(row,c.error);
      button(row,'Ouvrir la copie',()=>openPdf({...engineReaderV2754(c,c.email),blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,initialValues:c.initialValues||null,name:c.name,fileId:c.id,modeleId:c.modeleId,autoReportName:c.autoReportName===true,readOnly:!p.canWrite,
        onSave:p.canWrite?(blob,requestId,name,provenance)=>saveCopy(c.id,email,blob,requestId,provenance):null}));
      button(row,'Télécharger la copie',()=>download(c.blob,c.name));
    }
  }
  async function saveCopy(id,email,blob,readerRequestId,provenance={}) {
    const stamp=epoch,accessVersion=readAccessVersion;
    const canSave=()=>stamp===epoch&&accessVersion===readAccessVersion&&!pendingAccessTransitions&&allowed(email)&&profile?.canWrite&&(!session||session.email===email&&session.canWrite);
    await verifyPdf(blob);
    return serialCopy(id,async()=>{
      if(!canSave())throw new Error('Déverrouillez CDQ pour enregistrer.');
      const c=await get('copies',id);if(!c||c.removed||c.email!==email)throw new Error('Copie locale retirée ou introuvable.');
      // Repeated reader requests are idempotent. Resolve only after IndexedDB commits.
      if(c.readerRequestId!==readerRequestId){
        // The reader's repaired bytes already carry their exact name, equipment
        // and conformity. A background list scan must not delay this local ACK.
        const samePass=provenance.pdfSaveInfoV2753?validatedPdfSaveInfoV2753(provenance.pdfSaveInfoV2753):null;
        const worker=samePass?null:pdfWorkV2729(),inspection=samePass||(worker?await worker.inspect(blob):null);
        const reportName=inspection?inspection.name||c.name:await nameFromReport(blob,c.name);
        if(!canSave())throw Error('Le compte a changé.');
        const updated={...c,equipmentSignature:inspection?.equipment,readerPreparedVersion:provenance.readerPreparedVersion===2730?2730:undefined,initialValues:null,autoReportName:c.autoReportName||reportName!==c.name,blob,name:reportName,readerRequestId,editVersion:(c.editVersion||0)+1,uploadId:'pdf_'+crypto.randomUUID(),status:'pending',error:''};
        await put('copies',updated);if(canSave()&&!await confirmedDeletionV2749(updated)){clearRetryV2740(id);rememberNames(updated);reportProgressV2749(updated,'saving-local','Rapport enregistré sur cet appareil.');notifyDocument(updated);}
      }
      sync(false,id).catch(()=>{});refresh().catch(()=>{});return {queued:true};
    },true);
  }
  async function sync(initializingSession=false,targetId='') {
    const current=session,stamp=epoch,accessVersion=readAccessVersion;
    const currentSync=()=>stamp===epoch&&session===current&&accessVersion===readAccessVersion&&(!pendingAccessTransitions||initializingSession&&pendingAccessTransitions===1)&&current?.canWrite;
    if(navigator.onLine===false||!currentSync())return;
    try{if(window.BalanceCDQBackgroundV2746?.isQueueOwner?.(current.email)===false)return;}catch{return;}
    // A complete draft is already durable. Scanning and detaching every other
    // pending PDF must not compete with this reader's first canvas and fields.
    if(!targetId&&[...readers.values()].some(reader=>reader.opening&&reader.epoch===stamp&&reader.email===current.email&&reader.accessVersion===accessVersion))return;
    const copies=targetId?[await get('copies',targetId)].filter(Boolean):await all('copies');if(!currentSync())return;
    if(!targetId){pendingWork.clear();for(const copy of copies)notePending(copy);send({type:'CDQ_DRIVE_PENDING_V2746',email:current.email,count:pendingWork.size});}
    for(let c of copies){
      if(c.removed&&c.engineDeletionV2754&&!c.engineDeleteConfirmedV2754&&c.email===current.email){
        if(inflight.has(c.id)||retryTimersV2740.has(c.id))continue;
        const message=nextSync(c,current.protocol);if(!message)continue;
        const job={type:message.type,uploadId:message.uploadId,epoch:stamp};inflight.set(c.id,job);
        const retry=()=>{if(!currentSync()||inflight.get(c.id)!==job)return;inflight.delete(c.id);sync(false,c.id).catch(()=>{});};
        job.timer=setTimeout(retry,70000);try{send({...message,email:current.email});}catch{clearTimeout(job.timer);inflight.delete(c.id);}
        continue;
      }
      if((c.removed&&!c.cancelledDriveId)||c.email!==current.email||inflight.has(c.id)||retryTimersV2740.has(c.id)||pausedSyncV2740.has(c.id)||readers.get(c.id)?.opening&&readers.get(c.id)?.accessVersion===accessVersion)continue;
      // A newly opened report is durable already. Its first explicit save
      // supplies final bytes; sending a blank copy now would race that save
      // through a second begin/PUT/finalize sequence. This hold lives only in
      // the active reader map: closing or reloading resumes the draft normally.
      const activeDraftReader=readers.get(c.id);
      if(!c.driveId&&!c.readerRequestId&&activeDraftReader?.epoch===stamp&&activeDraftReader.email===current.email&&activeDraftReader.accessVersion===accessVersion)continue;
      if(!c.reportEngineV2754&&c.initialValues&&Object.keys(c.initialValues).length){
        // Materialize only after the unsaved visible reader has closed. An interrupted
        // draft restarts this work from its persisted identity on the next run.
        if(!identityDownloads.has(c.id)){
          const id=c.id,identity=JSON.stringify(c.initialValues),version=c.editVersion||0;
          const job=(async()=>{
            // Only CREATE sidecars reach this guarded canonical-template path.
            // Match original CREATE prefill (including static province Qc).
            const blob=await fillInFrame(c.initialValues,{blob:c.blob,strict:false});
            if(!currentSync())return false;
            return serialCopy(id,async()=>{
              const latest=await get('copies',id);
              if(!currentSync()||!latest||latest.removed||latest.email!==current.email||latest.readerRequestId||(latest.editVersion||0)!==version||JSON.stringify(latest.initialValues)!==identity)return false;
              const updated={...latest,blob,initialValues:null,uploadId:'pdf_'+crypto.randomUUID(),editVersion:version+1,status:'pending',error:''};
              await put('copies',updated);if(currentSync())notifyDocument(updated);return true;
            },true);
          })();
          identityDownloads.set(id,job);
          job.then(()=>{if(identityDownloads.get(id)===job)identityDownloads.delete(id);if(stamp===epoch&&session===current)sync(false,id).catch(()=>{});},error=>{if(identityDownloads.get(id)===job)identityDownloads.delete(id);if(stamp===epoch&&session===current)status.textContent=error.message||String(error);});
        }
        if(c.driveId)continue;
      }
      if(!c.removed&&!c.driveId&&c.bundled&&current.protocol<38&&!validPdf(c.templateBlob)&&c.creationAsset){
        if(!creationDownloads.has(c.id)){
         const id=c.id,job=(async()=>{try{
          const blob=await bundledCreationTemplate(c.creationAsset);
          if(!currentSync())return;
          const updated=await serialCopy(id,async()=>{
            const latest=await get('copies',id);
            if(!currentSync()||!latest||latest.email!==current.email||latest.removed)return null;
            if(latest.driveId||validPdf(latest.templateBlob))return latest;
            const updated={...latest,templateBlob:blob,error:''};await put('copies',updated);return updated;
          },true);
          return !!updated&&currentSync();
        }catch(error){
          if(!currentSync())return;
          await serialCopy(id,async()=>{const latest=await get('copies',id);if(currentSync()&&latest&&latest.email===current.email&&!latest.driveId)await put('copies',{...latest,error:error.message||String(error)});},true);
          refresh().catch(()=>{});return false;
         }})();creationDownloads.set(id,job);
         job.then(ok=>{if(creationDownloads.get(id)===job)creationDownloads.delete(id);if(ok)sync(false,id).catch(()=>{});}).catch(()=>{if(creationDownloads.get(id)===job)creationDownloads.delete(id);});
        }
        continue;
      }
      if(c.uploadId&&c.uploadId!==c.syncedUploadId&&!/^[a-zA-Z0-9_-]{8,100}$/.test(c.uploadId)){c={...c,uploadId:'pdf_'+crypto.randomUUID()};await put('copies',c);if(!currentSync())return;}
      if(inflight.has(c.id)||retryTimersV2740.has(c.id)||pausedSyncV2740.has(c.id)||readers.get(c.id)?.opening&&readers.get(c.id)?.accessVersion===accessVersion)continue;
      c=await get('copies',c.id);if(!currentSync())return;
      if(!c||(c.removed&&!c.cancelledDriveId)||inflight.has(c.id)||retryTimersV2740.has(c.id)||pausedSyncV2740.has(c.id))continue;
      const tombstone=await confirmedDeletionV2749(c);
      if(!currentSync())return;
      if(tombstone&&!c.removed){await retireCopyV2714(c,'deleted');continue;}
      c=await get('copies',c.id);if(!currentSync())return;if(!c||(c.removed&&!c.cancelledDriveId)||inflight.has(c.id)||retryTimersV2740.has(c.id)||pausedSyncV2740.has(c.id))continue;
      if(!c.reportEngineV2754&&!c.removed&&!c.driveId&&c.bundled&&current.protocol>=38&&!c.initialValues&&!c.creationTransferV2751){
        c=await serialCopy(c.id,async()=>{const latest=await get('copies',c.id);if(!currentSync()||!latest||latest.removed||latest.driveId||latest.initialValues)return latest;if(latest.creationTransferV2751)return latest;
          const bytes=await latest.blob.arrayBuffer();if(!currentSync())return latest;const updated={...latest,creationTransferV2751:{pdfBytesV2664:bytes,name:latest.name,uploadId:latest.uploadId||''}};await put('copies',updated);return updated;},true);if(!currentSync()||!c||c.removed)continue;
      }
      // Another targeted resume (for example save followed by close) can win
      // while creation bytes are being frozen through the per-copy queue.
      if(!currentSync()||inflight.has(c.id)||retryTimersV2740.has(c.id)||pausedSyncV2740.has(c.id))continue;
      const message=nextSync(c,current.protocol);if(!message)continue;
      const job={type:message.type,uploadId:message.uploadId||'',driveId:message.driveId||'',clientId:c.destination?.clientId,epoch:stamp};inflight.set(c.id,job);sentJobsV2740.set(c.id,job);
      job.timer=setTimeout(()=>{
        if(inflight.get(c.id)!==job)return;
        const reason='Aucune confirmation Drive reçue. Rapport conservé sur cet appareil.';
        // The timeout joins the same copy queue as reader saves and receipts.
        // It must not write an older snapshot over newer durable PDF answers.
        serialCopy(c.id,async()=>{
          if(epoch!==stamp||session!==current||inflight.get(c.id)!==job)return;
          const latest=await get('copies',c.id);
          if(epoch!==stamp||session!==current||inflight.get(c.id)!==job)return;
          inflight.delete(c.id);
          if(!latest||latest.removed||latest.email!==current.email||job.uploadId&&latest.syncedUploadId===job.uploadId||await confirmedDeletionV2749(latest)||epoch!==stamp||session!==current)return;
          if(job.uploadId&&job.uploadId!==latest.uploadId){clearRetryV2740(c.id);sync(false,c.id).catch(()=>{});return;}
          status.textContent=reason;
          const updated={...latest,status:'pending',error:reason};await put('copies',updated);
          if(epoch!==stamp||session!==current)return;
          notifyDocument(updated);refresh().catch(()=>{});retrySyncV2740(c.id,stamp,current.email,reason,job.uploadId);
        },true).catch(()=>{});
      },70000);
      try{if(c.error)notifyDocument({...c,error:''});if(!(retryCountsV2740.get(c.id)||0))reportProgressV2749(c,'sending','Envoi du rapport vers Drive…');send({...message,email:current.email});}catch(e){
        clearTimeout(job.timer);inflight.delete(c.id);
        const reason=e?.message||String(e);
        status.textContent='Envoi Drive interrompu : '+reason;
        serialCopy(c.id,async()=>{
          const latest=await get('copies',c.id);if(!currentSync()||!latest||latest.removed||latest.email!==current.email||job.uploadId&&latest.syncedUploadId===job.uploadId||await confirmedDeletionV2749(latest)||!currentSync())return;
          if(job.uploadId&&job.uploadId!==latest.uploadId)return;
          const updated={...latest,status:'pending',error:reason};await put('copies',updated);
          if(currentSync()){notifyDocument(updated);retrySyncV2740(c.id,stamp,current.email,reason,job.uploadId);}
        },true).catch(()=>{});
      }
    }
  }
  async function handleNow(data,stamp,readStamp=null) {
    if(stamp!==epoch||!validReadStamp(readStamp))return;
    if(data.type==='CDQ_OFFLINE_SHOW_LOCAL'){panel.hidden=false;await refresh();return;}
    if(data.type==='CDQ_OFFLINE_SESSION'){
      if(typeof data.email!=='string'||!data.email||data.email.length>320)return;
      const canWrite=!!data.canWrite,protocol=Number(data.protocol)||0,online=navigator.onLine;
      const unchanged=session?.email===data.email&&session.canWrite===canWrite&&session.protocol===protocol&&session.reportEngineV2754===(data.reportEngineV2754===true);
      // Creation explicitly repeats this announcement before every new report.
      // Once established, it must not rescan and detach every stored PDF.
      // Ordinary announcements still replay pending rows after Selector reload.
      // Keep the object captured by an in-progress identity/save job unchanged.
      // A real access/protocol/connectivity transition still runs the full path;
      // a failed initialization is retried rather than treated as established.
      if(data.reannounceOnlyV2730===true&&unchanged&&appliedSession===session&&appliedOnline===online)return;
      if(session?.email!==data.email)for(const job of inflight.values())clearTimeout(job.timer);
      if(session?.email!==data.email){resetRetriesV2740();sentJobsV2740.clear();inflight.clear();sessionStorage.clear();destinationNames.clear();pendingWork.clear();copyIdentities.clear();}
      if(!unchanged)session={email:data.email,canWrite,protocol,reportEngineV2754:data.reportEngineV2754===true};localEmail=data.email;
      const announcedSession=session;
      await put('state',{id:'profile',...session});navigator.storage?.persist?.().catch(()=>{});
      if(session.protocol<38)requestModel('camion');
      await refresh();await notifySnapshotV2714();for(const c of await all('copies'))if(stamp===epoch&&session?.email===data.email&&c.email===data.email){notePending(c);rememberNames(c);if(c.removed&&c.retiredAt)notifyRetiredV2749(c);else notifyLocalReportV2713(c);}await sync(true);
      if(stamp===epoch&&session===announcedSession){appliedSession=session;appliedOnline=online;}return;
    }
    const current=session;if(!current||(data.email&&data.email!==current.email))return;
    if(data.type==='CDQ_OFFLINE_RECONCILE_BACKGROUND_V2746'){
      const copies=await all('copies');if(stamp!==epoch||current!==session)return;
      pendingWork.clear();for(const copy of copies)if(copy.email===current.email){notePending(copy);if(copy.removed)notifyRetiredV2749(copy);else notifyDocument(copy);}
      send({type:'CDQ_DRIVE_PENDING_V2746',email:current.email,count:pendingWork.size});
      send({type:'CDQ_LOCAL_REPORT_SNAPSHOT_V2714',email:current.email,localIds:copies.filter(copy=>copy.email===current.email&&localReportVisibleV2714(copy)).map(copy=>copy.id)});
      sync().catch(()=>{});return;
    }
    if(data.type==='CDQ_OFFLINE_SYNC_PENDING_V2746'){
      const job=inflight.get(data.requestId);
      if(job&&job.epoch===stamp&&(!job.uploadId||job.uploadId===data.uploadId)){clearTimeout(job.timer);job.waitingForTransport=true;status.textContent=String(data.message||'Drive traite encore cet envoi.');}
      return;
    }
    if(data.type==='CDQ_REPORT_ENGINE_SEND_STATE_V2754'){
      try{
        if(!current.canWrite||typeof data.clientId!=='string'||!data.clientId||!Array.isArray(data.resumeReportIds)||data.resumeReportIds.length>500||!data.resumeReportIds.every(id=>typeof id==='string'))throw Error('Vérification des copies locales non autorisée.');
        const copies=(await all('copies')).filter(copy=>copy.email===current.email&&copy.reportEngineV2754?.clientId===data.clientId&&copy.reportPayloadV2754?.requestId&&(!copy.removed||copy.engineDeletionV2754&&!copy.engineDeleteConfirmedV2754));
        if(stamp!==epoch||current!==session)return;
        const records=copies.map(copy=>({context:copy.reportEngineV2754,requestId:copy.reportPayloadV2754.requestId,pending:copy.uploadId!==copy.syncedUploadId,deleted:!!copy.removed}));
        send({type:'CDQ_REPORT_ENGINE_SEND_STATE_V2754_RESULT',email:current.email,requestId:data.requestId,clientId:data.clientId,ok:true,records});
        const selected=new Set(data.resumeReportIds);for(const copy of copies)if(selected.has(copy.reportEngineV2754.reportId))sync(false,copy.id).catch(()=>{});
      }catch(error){if(stamp===epoch&&current===session)send({type:'CDQ_REPORT_ENGINE_SEND_STATE_V2754_RESULT',email:current.email,requestId:data.requestId,clientId:data.clientId,ok:false,message:error.message});}return;
    }
    if(data.type==='CDQ_OFFLINE_RETRY_SYNC_V2741'){
      if(!current.canWrite)return;
      resetRetriesV2740();await sync();return;
    }
    if(data.type==='CDQ_OFFLINE_FLUSH_BACKGROUND_V2746'){
      if(current.canWrite)await sync();return;
    }
    if(data.type==='CDQ_OFFLINE_REMOVE_SCOPE_V2755'){
      const reply=payload=>{if(stamp===epoch&&session===current)send({type:'CDQ_OFFLINE_DOCUMENT_RESULT',requestId:data.requestId,...payload});};
      try{
        const fileIds=data.fileIds||[],folderIds=data.folderIds||[];
        if(data.email!==current.email||!identifier(data.clientId)||
          !Array.isArray(fileIds)||!Array.isArray(folderIds)||fileIds.length>500||folderIds.length>500||
          !fileIds.every(identifier)||!folderIds.every(identifier)||!fileIds.length&&!folderIds.length)
          throw Error('Sélection hors ligne invalide.');
        const localCopies=await all('copies'),targets=localCopies.filter(copy=>offlineScopeMatchesV2755(copy,data,current.email));
        // Only this explicit absence result permits retiring an old Selector-
        // only mirror. A blocked or foreign-client canonical copy is not absent.
        const unmatchedFileIds=fileIds.filter(id=>!localCopies.some(copy=>copy.email===current.email&&!copy.removed&&[copy.id,copy.driveId,copy.filledDriveId].includes(id)));
        if(stamp!==epoch||session!==current)return;
        const removed=[],blocked=[];
        for(const target of targets){
          if(stamp!==epoch||session!==current)return;
          await serialCopy(target.id,async()=>{
            const copy=await get('copies',target.id);
            if(stamp!==epoch||session!==current||!copy||!offlineScopeMatchesV2755(copy,data,current.email))return;
            try{
              if(inflight.has(copy.id)||readers.has(copy.id))throw Error('Ce document est ouvert ou sa synchronisation est en cours.');
              const retired=copy.kind==='sheet'?{...copy,removed:true}:localOnlyRetirementV2755(copy,current.email);
              await put('copies',retired);
              if(stamp!==epoch||session!==current)return;
              clearRetryV2740(copy.id);sentJobsV2740.delete(copy.id);
              removed.push({localId:copy.id,fileId:copy.filledDriveId||copy.driveId||'',kind:copy.kind||'report'});
              if(copy.kind!=='sheet')send({type:'CDQ_OFFLINE_DOCUMENT_REMOVED',fileId:copy.filledDriveId||copy.driveId,email:current.email,localId:copy.id});
            }catch(error){blocked.push({localId:copy.id,fileId:copy.driveId||'',name:copy.name||'',message:error.message});}
          },true);
        }
        reply({ok:true,localOnly:true,removed,blocked,unmatchedFileIds});
        await notifySnapshotV2714();refresh().catch(()=>{});
      }catch(error){reply({ok:false,message:error.message});}return;
    }
    if(data.type==='CDQ_OFFLINE_REPORT_RETIRE_TARGET_V2714'){
      try{
        if(!current.canWrite||!identifier(data.localId))throw Error('Retrait non autorisé.');
        for(const c of await all('copies')){if(stamp!==epoch||session!==current)return;if(c.email===current.email&&!c.removed&&c.kind!=='sheet'&&[c.driveId,c.filledDriveId].includes(data.localId))await serialCopy(c.id,async()=>{const latest=await get('copies',c.id);if(stamp===epoch&&session===current&&latest&&!latest.removed&&(!data.expectedUploadId||latest.uploadId===data.expectedUploadId))await retireCopyV2714(latest,'user');});}
        if(stamp===epoch&&session===current)send({type:'CDQ_LOCAL_REPORT_RETIRE_RESULT_V2714',email:current.email,requestId:data.requestId,localId:data.localId,ok:true});
      }catch(e){if(stamp===epoch&&session===current)send({type:'CDQ_LOCAL_REPORT_RETIRE_RESULT_V2714',email:current.email,requestId:data.requestId,localId:data.localId,ok:false,message:e.message});}return;
    }
    if(data.type==='CDQ_OFFLINE_CANCELLED_CREATION_V2714'){
      const c=await get('copies',data.requestId);if(stamp!==epoch||current!==session)return;
      if(!current.canWrite||!c?.removed||c.retirementReason!=='user'||c.email!==current.email||String(c.destination.clientId)!==String(data.clientId)||!identifier(data.driveId))return;
      if(c.cancelledDriveId&&c.cancelledDriveId!==data.driveId)return;
      if(c.cancelledDriveId===data.driveId&&c.cancelledDeleteConfirmed)return;
      await put('copies',{...c,cancelledDriveId:data.driveId,cancelledDeleteConfirmed:false});await sync();return;
    }
    if(data.type==='CDQ_OFFLINE_CANCELLED_DELETE_V2714_RESULT'){
      const job=inflight.get(data.requestId);if(!job||job.epoch!==stamp||job.type+'_RESULT'!==data.type)return;
      const c=await get('copies',data.requestId);if(stamp!==epoch||current!==session)return;
      if(!c?.removed||c.email!==current.email||c.cancelledDriveId!==data.driveId)return;
      clearTimeout(job.timer);inflight.delete(data.requestId);
      if(data.ok)await put('copies',{...c,cancelledDeleteConfirmed:true});return;
    }
    if(data.type==='CDQ_OFFLINE_LOCAL_RETIRE_V2714'){
      try{
        if(!current.canWrite||!/^[\w-]{8,100}$/.test(String(data.localId||'')))throw Error('Retrait non autorisé.');
        const c=await get('copies',data.localId);if(stamp!==epoch||session!==current)return;
        if(c&&c.email!==current.email)throw Error('Cette copie appartient à un autre compte.');
        if(c&&!c.removed){
          if(c.driveId&&c.kind!=='sheet'){
            // A creation receipt can arrive between selecting a local row and
            // confirming its removal. Preserve its bytes/outbox until the
            // caller obtains a confirmed deletion for the actual Drive id.
            send({type:'CDQ_LOCAL_REPORT_RETIRE_RESULT_V2714',email:current.email,requestId:data.requestId,localId:data.localId,ok:false,code:'CDQ_LOCAL_REPORT_REMOTE_V2753',driveId:c.filledDriveId||c.driveId,clientId:c.destination.clientId});return;
          }
          if(c.kind==='prepared'||c.kind==='sheet')throw Error('Ce fichier est déjà dans Drive. Actualisez la liste avant de le supprimer.');await retireCopyV2714(c,'user');
        }
        if(stamp===epoch&&session===current){send({type:'CDQ_LOCAL_REPORT_RETIRE_RESULT_V2714',email:current.email,requestId:data.requestId,localId:data.localId,ok:true});await notifySnapshotV2714();}
      }catch(e){if(stamp===epoch&&session===current)send({type:'CDQ_LOCAL_REPORT_RETIRE_RESULT_V2714',email:current.email,requestId:data.requestId,localId:data.localId,ok:false,message:e.message});}return;
    }
    if(data.type==='CDQ_OFFLINE_REPORT_DELETED_V2714'){
      if(!current.canWrite||!Array.isArray(data.ids)||data.ids.length>500)return;
      const ids=new Set(data.ids.filter(identifier));
      for(const id of ids){if(stamp!==epoch||session!==current)return;await put('state',{id:'deleted:'+current.email+':'+id,email:current.email,deletedAt:Date.now()});}
      for(const c of await all('copies')){if(stamp!==epoch||session!==current)return;if(c.email===current.email&&!c.removed&&[c.driveId,c.filledDriveId].some(id=>ids.has(id)))await serialCopy(c.id,async()=>{const latest=await get('copies',c.id);if(stamp===epoch&&session===current&&latest&&!latest.removed)await retireCopyV2714(latest,'deleted');});}
      await notifySnapshotV2714();return;
    }
    if(data.type==='CDQ_LOCAL_REPORT_OPEN_V2713'){
      try{const c=await get('copies',String(data.localId||''));if(stamp!==epoch||current!==session)return;
       if(!c||c.email!==current.email||c.removed||c.kind==='prepared'||c.kind==='sheet')throw Error('Copie locale indisponible.');
       await openPdf({...engineReaderV2754(c,c.email),blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,initialValues:c.initialValues||null,name:c.name,fileId:c.id,modeleId:c.modeleId,autoReportName:c.autoReportName===true,readOnly:!current.canWrite,...equipmentHooks(c,current,stamp),onSave:current.canWrite?(blob,id,name,provenance)=>saveCopy(c.id,current.email,blob,id,provenance):null});
      }catch(e){if(stamp===epoch&&current===session)send({type:'CDQ_LOCAL_REPORT_ERROR_V2713',email:current.email,message:e.message||String(e)});}return;
    }
    if(['CDQ_OFFLINE_SHEET_LIST','CDQ_OFFLINE_SHEET_STORE','CDQ_OFFLINE_SHEET_REMOVE'].includes(data.type)){
      const reply=payload=>{if(stamp===epoch&&current===session&&validReadStamp(readStamp)){if(readStamp?.collection)readStamp.replied=true;send({type:'CDQ_OFFLINE_DOCUMENT_RESULT',requestId:data.requestId,...payload});}};
      try{
        if(data.type==='CDQ_OFFLINE_SHEET_LIST'){
          const sheets=(await all('copies')).filter(c=>c.email===current.email&&c.kind==='sheet'&&!c.removed).map(c=>({fileId:c.driveId,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,folderId:c.destination.folderId,ancestorIds:c.destination.ancestorIds||[],account:c.account||'',confirmed:c.confirmed===true}));
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
            destination:{clientId:data.clientId,folderId:data.folderId||old?.destination?.folderId||'',ancestorIds:Array.isArray(data.ancestorIds)?data.ancestorIds.filter(identifier).slice(0,100):old?.destination?.ancestorIds||[],name:String(data.clientName||'Compagnie').slice(0,500)},createdAt:old?.createdAt||Date.now(),removed:false});
        }
        reply({ok:true});await refresh();
      }catch(e){reply({ok:false,message:e.message});}
      return;
    }
    if(['CDQ_OFFLINE_DOCUMENT_STORE','CDQ_OFFLINE_DOCUMENT_REMOVE','CDQ_OFFLINE_DOCUMENT_LIST','CDQ_OFFLINE_DOCUMENT_GET','CDQ_OFFLINE_DOCUMENT_EDIT','CDQ_OFFLINE_DOCUMENT_COMMIT_LEGACY'].includes(data.type)){
      const reply=payload=>{if(stamp===epoch&&current===session&&validReadStamp(readStamp)){if(readStamp?.collection)readStamp.replied=true;send({type:'CDQ_OFFLINE_DOCUMENT_RESULT',requestId:data.requestId,...payload});}};
      try{
        if(data.type==='CDQ_OFFLINE_DOCUMENT_LIST'){
          const removed=(await all('copies')).filter(c=>c.email===current.email&&c.kind==='prepared'&&c.removed).map(c=>c.driveId);
          const documents=(await all('copies')).filter(c=>c.email===current.email&&c.kind==='prepared'&&!c.removed).map(c=>({fileId:c.driveId,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,...engineDataV2754(c),revision:c.revision,blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,editVersion:c.editVersion||0,uploadId:c.uploadId,folderId:c.destination.folderId,ancestorIds:c.destination.ancestorIds||[],autoReportName:c.autoReportName===true,offlineSelected:c.kind==='prepared',pending:c.uploadId!==c.syncedUploadId}));
          if(stamp===epoch)reply({ok:true,offlineSelectionVersion:2664,removed,documents});return;
        }
        if(!identifier(data.fileId))throw Error('Identifiant PDF invalide.');
        const id='prepared:'+current.email+':'+data.fileId,c=await get('copies',id);
        if(stamp!==epoch||current!==session||!validReadStamp(readStamp))return;
        if(data.type==='CDQ_OFFLINE_DOCUMENT_GET'){
          if(data.legacyPending&&c&&!c.removed)throw Error('Une ancienne sauvegarde attend sa synchronisation. Reconnectez CDQ avant de modifier ce PDF.');
          reply({ok:true,document:c&&!c.removed?{fileId:c.driveId,name:c.name,clientId:c.destination.clientId,clientName:c.destination.name,...engineDataV2754(c),revision:c.revision,blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,editVersion:c.editVersion||0,uploadId:c.uploadId,folderId:c.destination.folderId,ancestorIds:c.destination.ancestorIds||[],autoReportName:c.autoReportName===true,offlineSelected:c.kind==='prepared',pending:c.uploadId!==c.syncedUploadId}:null});return;
        }
        if(data.type==='CDQ_OFFLINE_DOCUMENT_EDIT'){
          if(!current.canWrite||!c||c.removed)throw Error('PDF hors ligne indisponible.');
          if(c.readerRequestId!==data.saveId){
            if(Number(data.editVersion)!==Number(c.editVersion||0))throw Error('Ce PDF a été modifié dans une autre fenêtre. Fermez puis rouvrez le document avant de continuer.');
            await verifyPdf(data.blob);if(stamp!==epoch||current!==session)return;
            const reportName=(c.autoReportName||data.autoReportName)?await nameFromReport(data.blob,c.name):c.name;
            const updated={...c,readerPreparedVersion:data.readerPreparedVersion===2730?2730:undefined,autoReportName:c.autoReportName||data.autoReportName===true,name:reportName,blob:data.blob,readerRequestId:data.saveId,editVersion:(c.editVersion||0)+1,uploadId:'pdf_'+crypto.randomUUID(),status:'pending',error:''};
            await put('copies',updated);clearRetryV2740(id);notifyDocument(updated);
          }
          const latest=await get('copies',id);reply({ok:true,queued:latest.uploadId!==latest.syncedUploadId,editVersion:latest.editVersion,name:latest.name});sync(false,id).catch(()=>{});refresh().catch(()=>{});return;
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
          const retired=c&&!c.removed?localOnlyRetirementV2755(c,current.email):{...c,id,email:current.email,kind:'prepared',driveId:data.fileId,removed:true,blob:null};
          await put('copies',retired);
        }else{
          await verifyPdf(data.blob);if(stamp!==epoch||current!==session)return;
          if(!identifier(data.clientId)||!data.revision)throw Error('Compagnie ou révision PDF absente.');
          await put('copies',{id,email:current.email,kind:'prepared',driveId:data.fileId,revision:data.revision,blob:data.blob,name:String(data.name||'Rapport.pdf'),
            destination:{clientId:data.clientId,folderId:data.folderId||c?.destination?.folderId||'',ancestorIds:Array.isArray(data.ancestorIds)?data.ancestorIds.filter(identifier).slice(0,100):c?.destination?.ancestorIds||[],name:String(data.clientName||'Compagnie')},createdAt:Date.now(),status:'synced',uploadId:'',syncedUploadId:'',editVersion:c?(c.editVersion||0)+1:0});
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
      const values=Object.fromEntries(Object.entries(data.values||{}).filter(([k,v])=>/^client_(adresse|ville|code_postal|province|telephone)$/.test(k)&&typeof v==='string'&&v.length<=1000));
      // A context lookup can return only the company/technician already in the
      // durable draft. Do not detach its entire PDF while the reader is booting.
      if(!Object.keys(values).length)return;
      const c=await get('copies',String(data.requestId||''));
      if(!current.canWrite||!c||c.removed||c.email!==current.email||stamp!==epoch||current!==session)return;
      const reader=readers.get(c.id);if(reader?.epoch===stamp){const handle=await reader.handle;if(stamp!==epoch||current!==session||!current.canWrite)return;handle?.prefill?.(values);}
      // Preserve the late coordinates on disk too. Saved answers are never replaced.
      if(!c.readerRequestId&&Object.keys(values).length){
        if(c.reportEngineV2754||c.initialValues||!c.driveId&&readers.get(c.id)?.epoch===stamp&&readers.get(c.id)?.accessVersion===readAccessVersion){await put('copies',{...c,initialValues:{...c.initialValues,...values}});sync(false,c.id).catch(()=>{});return;}
        const blob=await fillInFrame(values,{blob:c.blob,strict:false,onlyEmpty:true});
        if(stamp!==epoch||current!==session)return;
        const latest=await get('copies',c.id);if(latest?.readerRequestId)return;
        await put('copies',{...latest,blob,editVersion:(latest.editVersion||0)+1,uploadId:'pdf_'+crypto.randomUUID(),status:'pending'});sync(false,c.id).catch(()=>{});
      }
      return;
    }
    if(data.type==='CDQ_OFFLINE_CREATE_LOCAL'){
      const id=String(data.requestId||''),accessVersion=readStamp?.access??readAccessVersion;
      const currentAccess=()=>stamp===epoch&&session===current&&accessVersion===readAccessVersion&&!pendingAccessTransitions;
      const currentCreation=()=>currentAccess()&&current.canWrite;
      const reply=payload=>{if(currentAccess())send({type:'CDQ_OFFLINE_CREATE_LOCAL_RESULT',email:current.email,requestId:id,...payload});};
      try{
        if(!current.canWrite||!/^[\w-]{8,100}$/.test(id)||!known(data.modeleId))throw new Error('Copie locale non autorisée ou demande invalide.');
        const d={clientId:String(data.clientId||''),folderId:String(data.folderId||''),name:String(data.destinationName||data.name||'Dossier client')};
        if(!validDestination(d))throw new Error('Dossier client invalide.');
        const t=await loadTemplate(current.email,data.modeleId);if(!validTemplate(t))throw new Error('Préparez ce modèle avec Internet avant de le copier hors ligne.');
        let c=await get('copies',id);
        if(c?.removed)throw Error('Cette création a été annulée. Créez un nouveau rapport.');
        if(c&&(c.email!==current.email||c.modeleId!==data.modeleId||c.destination.clientId!==d.clientId||c.destination.folderId!==d.folderId))throw new Error('Identifiant déjà utilisé pour une autre copie.');
        if(!currentCreation())return;
        if(!c)c=await reserveDestination(current.email,d.folderId,async()=>{
          if(!currentCreation())return null;
          const names=destinationNames.get(nameKey(current.email,d.folderId))||new Set();
          if(Array.isArray(data.existingNames))for(const name of data.existingNames)if(typeof name==='string'&&name.length<=220)names.add(name);
          let copy=makeCopy(t,d,current.email,id,[...names]);copy=await attachEngineV2754(copy,t,current);
          if(data.prefill&&Object.keys(data.prefill).length){const identity=identityDraftV2730(data.prefill);if((copy.reportEngineV2754||data.open===true)&&identity)copy.initialValues=identity;else{copy.blob=await fillInFrame(data.prefill,{blob:copy.blob,strict:false});copy.uploadId=id+'_prefill';copy.editVersion=1;}}
          if(!currentCreation())return null;
          await put('copies',copy);if(!currentCreation())return null;
          destinationNames.set(nameKey(current.email,d.folderId),names);rememberNames(copy);return copy;
        });
        if(!c||!currentCreation())return;
        // The copy already contains its complete destination. Updating the
        // remembered destination and the hidden copies panel is secondary.
        const rememberDestination=()=>{if(currentCreation())put('destinations',{id:current.email+':'+d.folderId,email:current.email,...d,savedAt:Date.now()}).then(()=>refresh()).catch(()=>{});};
        if(!currentCreation())return;
        // Confirm the visible reader as well as the durable copy. A hidden old
        // reader must never swallow a new-report request.
        if(data.open===true){
          let opening=readers.get(c.id)?.openedPromise;
          if(!opening){
            const reader={epoch:stamp,accessVersion,email:current.email,handle:null,opening:true,openedPromise:null};readers.set(c.id,reader);
            opening=reader.openedPromise=new Promise((resolve,reject)=>{
              let settled=false;
              const finish=(error=null)=>{
                if(settled)return;settled=true;clearTimeout(timer);reader.opening=false;
                if(error){if(readers.get(c.id)===reader)readers.delete(c.id);reject(error);}else resolve();
                if(currentCreation())sync(false,c.id).then(()=>sync()).catch(()=>{});
              };
              const timer=setTimeout(()=>finish(Error('Le lecteur n’a pas ouvert le PDF. Réessayez la copie conservée.')),30000);
              if(!currentCreation()){finish(Error('Le compte a changé.'));return;}
              try{reader.handle=Promise.resolve(openPdf({...engineReaderV2754(c,c.email),blob:c.blob,readerPreparedVersion:c.readerPreparedVersion,initialValues:c.initialValues||null,name:c.name,fileId:c.id,modeleId:c.modeleId,autoReportName:c.autoReportName===true,readOnly:false,
                ...equipmentHooks(c,current,stamp),onOpened:()=>finish(),onError:error=>finish(error||Error('Ouverture du rapport impossible.')),
                onClose:()=>{if(readers.get(c.id)===reader)readers.delete(c.id);finish(Error('Le lecteur a été fermé avant l’ouverture du rapport.'));if(currentCreation())sync(false,c.id).catch(()=>{});},
                onSave:(blob,requestId,name,provenance)=>saveCopy(c.id,current.email,blob,requestId,provenance)}));
                reader.handle.catch(finish);
              }catch(error){finish(error);}
            });
          }
          opening.then(()=>{rememberDestination();reply({ok:true,modeleId:c.modeleId,name:c.name});})
            .catch(error=>{rememberDestination();reply({ok:false,message:'Copie conservée dans Mes copies locales. '+(error.message||String(error))});});
        }else{rememberDestination();reply({ok:true,modeleId:c.modeleId,name:c.name});sync(false,c.id).catch(()=>{});}
      }catch(e){reply({ok:false,message:e.message||String(e)});}
      return;
    }
    if(data.type==='CDQ_REPORT_ENGINE_DELETE_V2754_RESULT'){
      const job=inflight.get(data.requestId),copy=await get('copies',data.requestId);
      if(!job||job.type!=='CDQ_REPORT_ENGINE_DELETE_V2754'||job.epoch!==stamp||job.uploadId!==data.uploadId||!copy?.removed||!copy.engineDeletionV2754||copy.email!==current.email||stamp!==epoch||session!==current)return;
      clearTimeout(job.timer);inflight.delete(data.requestId);
      const confirmed=data.ok===true&&data.deleted===true&&data.drivePending===false&&data.reportId===copy.reportEngineV2754.reportId;
      await put('copies',{...copy,engineDeleteConfirmedV2754:confirmed,error:confirmed?'':String(data.message||'Suppression Drive en attente.')});
      if(!confirmed&&stamp===epoch&&session===current){const timer=setTimeout(()=>{retryTimersV2740.delete(copy.id);if(stamp===epoch&&session===current)sync(false,copy.id).catch(()=>{});},5000);retryTimersV2740.set(copy.id,timer);}return;
    }
    if(data.type==='CDQ_REPORT_ENGINE_DATA_SAVED_V2754'){
      const job=inflight.get(data.requestId)||sentJobsV2740.get(data.requestId),copy=await get('copies',data.requestId);
      if(!job||job.type!=='CDQ_REPORT_ENGINE_SAVE_V2754'||job.epoch!==stamp||job.uploadId!==data.uploadId||!copy?.reportEngineV2754||copy.removed||copy.email!==current.email||stamp!==epoch||session!==current||!data.ok||!Number.isSafeInteger(data.reportRevision)||data.reportRevision<1||data.reportRevision<Number(copy.reportRevisionV2754||0)||data.reportId&&data.reportId!==copy.reportEngineV2754.reportId||data.clientId&&data.clientId!==copy.destination.clientId||data.saveRequestIdV2757&&data.uploadId!=='fields_'+data.saveRequestIdV2757)return;
      // DATA_SAVED and the final ACK share the same confirmed-receipt path.
      // A delayed final message cannot leave a confirmed creation on disk.
      const receipt={...data,type:'CDQ_REPORT_ENGINE_SAVE_V2754_RESULT',id:data.pdf?.fileId,revision:data.pdf?.driveRevision||''};
      if(validEngineReceiptV2755(copy,receipt))data=receipt;
      else{
        const context={...copy.reportEngineV2754,baseRevision:data.reportRevision,...(data.pdf?.fileId?{fileId:data.pdf.fileId}:{}),...(data.pdf?.driveRevision?{expectedDriveRevision:data.pdf.driveRevision}:{})};
        const updated={...copy,reportEngineV2754:context,reportRevisionV2754:data.reportRevision,enginePdfV2754:data.pdf||{status:'pending'},engineAcceptedV2757:{uploadId:data.uploadId,requestId:data.saveRequestIdV2757||String(data.uploadId||'').replace(/^fields_/,''),revision:data.reportRevision},error:''};
        if(updated.reportPayloadV2754&&copy.uploadId!==data.uploadId)updated.reportPayloadV2754={...updated.reportPayloadV2754,baseRevision:data.reportRevision,fileId:context.fileId,...(context.expectedDriveRevision?{expectedDriveRevision:context.expectedDriveRevision}:{})};
        await put('copies',updated);
        if(stamp===epoch&&session===current){
          reportProgressV2749(updated,'data-saved','Données synchronisées. Mise à jour du PDF dans Drive…');notifyDocument(updated);
          send({type:'CDQ_REPORT_ENGINE_ROW_V2754',email:current.email,clientId:copy.destination.clientId,localId:copy.id,reportId:context.reportId,row:data.row,pdf:data.pdf,reportRevision:data.reportRevision});
        }return;
      }
    }
    if(['CDQ_OFFLINE_COPY_RESULT','CDQ_OFFLINE_SAVE_RESULT','CDQ_REPORT_ENGINE_SAVE_V2754_RESULT'].includes(data.type)){
      const job=inflight.get(data.requestId)||sentJobsV2740.get(data.requestId);
      if(!job||job.epoch!==stamp||job.type+'_RESULT'!==data.type||(job.uploadId&&job.uploadId!==data.uploadId))return;
      const copy=await get('copies',data.requestId);if(!copy||copy.removed||copy.email!==current.email||stamp!==epoch||session!==current||!validReadStamp(readStamp))return;
      if(data.type==='CDQ_REPORT_ENGINE_SAVE_V2754_RESULT'&&data.reportId&&data.reportId!==copy.reportEngineV2754?.reportId)return;
      clearTimeout(job.timer);inflight.delete(data.requestId);
      // A malformed success cannot restart the same request in a tight loop.
      if(data.ok&&(!identifier(data.id)||data.type==='CDQ_REPORT_ENGINE_SAVE_V2754_RESULT'&&!validEngineReceiptV2755(copy,data)))data={...data,ok:false,message:'Confirmation Drive invalide. Vérifiez la synchronisation de ce rapport.'};
      // This exact server response confirms the original creation is no longer
      // at its destination. Network and permission failures remain pending.
      if(!data.ok&&data.type==='CDQ_OFFLINE_COPY_RESULT'&&String(data.message||'').trim()==='Le rapport a été déplacé ou supprimé.'){
        await retireCopyV2714(copy,'remote-deleted-or-moved');return;
      }
      // Only the bridge's exact account/client/target deletion fence is proof.
      // A missing-file message or an unconfirmed delete keeps the PDF pending.
      const confirmedTarget=data.confirmedDeletedV2749===true&&!data.ok&&data.type==='CDQ_OFFLINE_SAVE_RESULT'&&identifier(job.driveId)&&identifier(job.clientId)&&data.driveId===job.driveId&&data.clientId===job.clientId;
      if(confirmedTarget||await confirmedDeletionV2749(copy,data.ok&&identifier(data.id)?data.id:'')){
        if(stamp===epoch&&session===current&&validReadStamp(readStamp)){
          if(confirmedTarget)await put('state',{id:'deleted:'+current.email+':'+job.driveId,email:current.email,deletedAt:Date.now()});
          if(stamp===epoch&&session===current&&validReadStamp(readStamp))await retireCopyV2714(copy,'deleted');
        }return;
      }
      if(!data.ok&&job.uploadId&&copy.syncedUploadId===job.uploadId){clearRetryV2740(data.requestId);sentJobsV2740.delete(data.requestId);return;}
      if(!data.ok&&job.uploadId&&job.uploadId!==copy.uploadId){clearRetryV2740(data.requestId);sync(false,data.requestId).catch(()=>{});return;}
      if(stamp!==epoch||session!==current||!validReadStamp(readStamp))return;
      const updated=applyResult(copy,data);await put('copies',updated);
      if(stamp!==epoch||session!==current||!validReadStamp(readStamp))return;
      if(await confirmedDeletionV2749(updated)){if(stamp===epoch&&session===current)await retireCopyV2714(updated,'deleted');return;}
      if(stamp!==epoch||session!==current)return;
      if(data.ok){
        clearRetryV2740(data.requestId);sentJobsV2740.delete(data.requestId);
        if(stamp===epoch){rememberNames(updated);if(updated.status==='synced'&&(!job.uploadId||updated.uploadId===job.uploadId))reportProgressV2749(updated,'saved','Rapport enregistré dans Drive.');notifyDocument(updated);}
        sync(false,data.requestId).catch(()=>{});
      }else{
        const reason=String(data.message||'La synchronisation reste en attente.');
        if(stamp===epoch){
          status.textContent=reason;notifyDocument(updated);
          // Only transient failures retry automatically. Permission, missing
          // client/folder and invalid PDF errors require user attention.
          if(/répond pas|temporair|réessay|timeout|réseau|connexion interrompue|indisponible|quota|surcharg/i.test(reason))
            retrySyncV2740(data.requestId,stamp,current.email,reason,job.uploadId);
          else{pausedSyncV2740.add(data.requestId);reportSyncFailureV2740(data.requestId,reason,job.uploadId).catch(()=>{});}
        }
      }
      refresh().catch(()=>{});
    }
  }
  launch.onclick=()=>{panel.hidden=false;refresh().catch(e=>{status.textContent=e.message;});};
  const resume=()=>serial(async()=>{await refresh();await sync();}).catch(()=>{});
  window.addEventListener('online',()=>{resetRetriesV2740();return resume();});window.addEventListener('focus',resume);
  document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)resume();});
  window.addEventListener('offline',()=>serial(refresh).catch(()=>{}));
  refresh().catch(()=>{});
  return {handle(data){
      const stamp=epoch,retirement=['CDQ_OFFLINE_REPORT_DELETED_V2714','CDQ_OFFLINE_REPORT_RETIRE_TARGET_V2714'].includes(data.type);
      // Stable creation preambles must not wait for a background refresh.
      if(data.type==='CDQ_OFFLINE_SESSION'&&data.reannounceOnlyV2730===true&&!pendingAccessTransitions&&session&&appliedSession===session&&appliedOnline===navigator.onLine&&session.email===data.email&&session.canWrite===!!data.canWrite&&session.protocol===(Number(data.protocol)||0)&&session.reportEngineV2754===(data.reportEngineV2754===true))return Promise.resolve();
      const accessChange=data.type==='CDQ_OFFLINE_SESSION'&&typeof data.email==='string'&&data.email&&data.email.length<=320&&(pendingAccessTransitions||session?.email!==data.email||session.canWrite!==!!data.canWrite||session.protocol!==(Number(data.protocol)||0)||session.reportEngineV2754!==(data.reportEngineV2754===true));
      if(accessChange){if(session?.email!==data.email)readAccountVersion++;readAccessVersion++;pendingAccessTransitions++;}
      const retirementTargets=retirement&&session?.canWrite&&(!data.email||data.email===session.email)?data.type==='CDQ_OFFLINE_REPORT_DELETED_V2714'?(Array.isArray(data.ids)&&data.ids.length<=500?data.ids.filter(identifier):[]):identifier(data.localId)?[data.localId]:[]:[];
      // Register confirmed deletions before asynchronous storage/receipt work.
      // Pending UI deletions never enter this protocol or this fence.
      if(data.type==='CDQ_OFFLINE_REPORT_DELETED_V2714')for(const id of retirementTargets)confirmedDeletedV2749.set('deleted:'+session.email+':'+id,{deletedAt:Date.now()});
      const retirementKeys=[...new Set(retirementTargets)].map(id=>'prepared:'+session.email+':'+id);
      for(const key of retirementKeys)readRetirementVersions.set(key,(readRetirementVersions.get(key)||0)+1);
      let job;
      if(['CDQ_OFFLINE_RETRY_SYNC_V2741','CDQ_OFFLINE_FLUSH_BACKGROUND_V2746','CDQ_REPORT_ENGINE_SEND_STATE_V2754','CDQ_OFFLINE_REMOVE_SCOPE_V2755'].includes(data.type)){
        job=handleNow(data,stamp);
      }else if(['CDQ_OFFLINE_CREATE_LOCAL','CDQ_OFFLINE_PREFILL_V2642','CDQ_OFFLINE_COPY_RESULT','CDQ_OFFLINE_SAVE_RESULT','CDQ_OFFLINE_SYNC_PENDING_V2746','CDQ_REPORT_ENGINE_SAVE_V2754_RESULT','CDQ_REPORT_ENGINE_DATA_SAVED_V2754'].includes(data.type)){
        const accessVersion=readAccessVersion,foreground=session&&appliedSession===session&&!pendingAccessTransitions;
        const create=()=>{if(stamp!==epoch||accessVersion!==readAccessVersion)return;return serialCopy(String(data.requestId||''),()=>handleNow(data,stamp,{access:accessVersion,key:'creation:'+String(data.requestId||''),retirement:0}),true);};
        job=foreground?create():chain.then(create);
      }else if(['CDQ_OFFLINE_DOCUMENT_LIST','CDQ_OFFLINE_SHEET_LIST'].includes(data.type)){
        const accessVersion=readAccessVersion,foreground=session&&appliedSession===session&&!pendingAccessTransitions;
        const rejectCollections=message=>send({type:'CDQ_OFFLINE_DOCUMENT_RESULT',requestId:data.requestId,ok:false,message});
        const readCollections=(version=accessVersion,retried=false)=>{
          if(stamp!==epoch||version!==readAccessVersion)return;
          // A cloud acknowledgment refreshes these read-only collections. It
          // must not wait behind the unrelated hidden-panel profile refresh.
          // Session initialization and announced access changes retain their
          // ordered path; a transition during storage still fences the reply.
          if(!session){rejectCollections('La session hors ligne n’est pas encore prête. Réessayez.');return;}
          const owner=session.email,accountVersion=readAccountVersion,readStamp={access:version,key:'collections:'+owner,retirement:0,collection:true,replied:false};
          return handleNow(data,stamp,readStamp).then(()=>{
            if(readStamp.replied||stamp!==epoch||accountVersion!==readAccountVersion||session?.email!==owner||version===readAccessVersion)return;
            // The old snapshot was fenced by an access announcement. Read it
            // afresh once, only after the same account's session is applied.
            if(retried){rejectCollections('La session hors ligne a changé pendant la lecture. Réessayez.');return;}
            return chain.then(()=>afterAccessTransitions(true,owner,accountVersion));
          });
        };
        const afterAccessTransitions=(retried=false,owner=null,accountVersion=readAccountVersion)=>{
          if(stamp!==epoch||accountVersion!==readAccountVersion)return;
          // Startup may repeat an announcement while its first application is
          // still queued. Capture the applied version after those transitions;
          // repeating the same session must not discard an unanswered list.
          if(pendingAccessTransitions)return chain.then(()=>afterAccessTransitions(retried,owner,accountVersion));
          if(owner&&session?.email!==owner)return;
          if(owner&&appliedSession!==session){rejectCollections('La session hors ligne n’est pas encore prête. Réessayez.');return;}
          return readCollections(readAccessVersion,retried);
        };
        job=!session&&!pendingAccessTransitions?Promise.resolve(readCollections()):foreground?readCollections():chain.then(afterAccessTransitions);
      }else if(['CDQ_OFFLINE_DOCUMENT_GET','CDQ_OFFLINE_DOCUMENT_EDIT'].includes(data.type)){
        const accessVersion=readAccessVersion;
        const foreground=session&&appliedSession===session&&!pendingAccessTransitions;
        const readForeground=()=>{
          if(stamp!==epoch||accessVersion!==readAccessVersion)return;
          const id='prepared:'+String(session?.email||'')+':'+data.fileId;
          const readStamp={access:accessVersion,key:id,retirement:readRetirementVersions.get(id)||0};
          const readCopy=()=>{
            if(stamp!==epoch||!validReadStamp(readStamp))return;
            return serialCopy(id,()=>handleNow(data,stamp,readStamp),true);
          };
          // Retirements register their per-copy writes after scanning storage.
          // Await this target's fence before joining copyJobs to avoid a cycle.
          const retirements=[...(retirementJobs.get(id)||[])];
          return retirements.length?Promise.all(retirements.map(p=>p.catch(()=>{}))).then(readCopy):readCopy();
        };
        job=foreground?readForeground():chain.then(readForeground);
      }else{
        const id=data.type==='CDQ_OFFLINE_LOCAL_RETIRE_V2714'?data.localId:data.fileId?'prepared:'+String(session?.email||'')+':'+data.fileId:/^CDQ_OFFLINE_(?:CREATE_LOCAL|PREFILL_V2642|COPY_RESULT|SAVE_RESULT|CANCELLED_CREATION_V2714|CANCELLED_DELETE_V2714_RESULT)$/.test(data.type)?data.requestId:'';
        job=retirement?handleNow(data,stamp):id?serialCopy(id,()=>handleNow(data,stamp)):serial(()=>handleNow(data,stamp));
      }
      if(accessChange)job.finally(()=>{pendingAccessTransitions--;}).catch(()=>{});
      for(const key of retirementKeys){
        const jobs=retirementJobs.get(key)||new Set();jobs.add(job);retirementJobs.set(key,jobs);
        job.finally(()=>{jobs.delete(job);if(!jobs.size&&retirementJobs.get(key)===jobs)retirementJobs.delete(key);}).catch(()=>{});
      }
      return job.catch(e=>{status.textContent=e.message||String(e);});
    },
    lock(){localEditSessionsV2756.close();epoch++;confirmedDeletedV2749.clear();session=null;appliedSession=null;appliedOnline=null;localEmail='';for(const job of inflight.values())clearTimeout(job.timer);inflight.clear();resetRetriesV2740();sentJobsV2740.clear();requested.clear();readers.clear();creationDownloads.clear();identityDownloads.clear();destinationNames.clear();pendingWork.clear();copyIdentities.clear();sessionStorage.clear();panel.hidden=true;},refresh};
}

