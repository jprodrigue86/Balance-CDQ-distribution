import {createReportEngineStorageV20261028} from './report-engine-storage-20261028.mjs';
import {DELETED_REPORT_MESSAGE_V2784,isDeletedReportV2784,recoveryContextV2784,recoveryNameV2784} from './deleted-report-v2784.mjs';
import {observedReportStateV2784} from './file-observation-v2784.mjs';
import {prepareReportPdfV2759} from './prepared-report-pdf-v2759.mjs';
// V27.54: complete field snapshots are the durable source of a CDQ report.
// This module never serializes a PDF and never reports Drive success before
// the publication receipt confirms the same data revision.
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const safeName=name=>typeof name==='string'&&name.length>0&&name.length<=240&&!['__proto__','prototype','constructor'].includes(name);
function fieldValue(value){
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='string'&&value.length<=20000)return value;
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(Array.isArray(value)&&value.length<=200&&value.every(item=>typeof item==='string'&&item.length<=20000))return [...value];
  throw Error('Valeur de champ invalide. Le rapport reste ouvert.');
}
export function reportFieldsV2754(fields){
  if(!fields||typeof fields!=='object'||Array.isArray(fields))throw Error('Réponses du rapport invalides.');
  const entries=Object.entries(fields);if(!entries.length||entries.length>2000)throw Error('Nombre de champs invalide.');
  const result=Object.create(null);
  for(const [name,state]of entries.sort(([a],[b])=>a.localeCompare(b))){
    if(!safeName(name)||!state||typeof state!=='object'||!own(state,'value'))throw Error('Champ du rapport invalide.');
    const item={value:fieldValue(state.value)};
    if(own(state,'formattedValue')&&state.formattedValue!==undefined&&state.formattedValue!==null){if(typeof state.formattedValue!=='string'||state.formattedValue.length>20000)throw Error('Format de champ invalide.');item.formattedValue=state.formattedValue;}
    // Dynamic choice options are a field's data, never a script or permission.
    if(Array.isArray(state.items)){if(state.items.length>500)throw Error('Liste de choix invalide.');item.items=state.items.map(option=>{if(!option||typeof option.displayValue!=='string'||typeof option.exportValue!=='string'||option.displayValue.length>1000||option.exportValue.length>1000)throw Error('Choix de champ invalide.');return {displayValue:option.displayValue,exportValue:option.exportValue};});}
    if(own(state,'readOnly'))item.readOnly=!!state.readOnly;
    if(Array.isArray(state.widgets)){
      if(state.widgets.length>200)throw Error('Nombre de widgets invalide.');
      item.widgets=state.widgets.map(widget=>{if(!widget||typeof widget.id!=='string'||!widget.id||widget.id.length>100)throw Error('Widget du rapport invalide.');const output={id:widget.id,value:fieldValue(widget.value??state.value)};
        if(typeof widget.formattedValue==='string'&&widget.formattedValue.length<=20000)output.formattedValue=widget.formattedValue;
        for(const flag of ['readOnly','noView','noPrint'])if(own(widget,flag))output[flag]=!!widget[flag];
        if(own(widget,'rotation')){if(!Number.isInteger(widget.rotation)||widget.rotation%90!==0)throw Error('Rotation de widget invalide.');output.rotation=widget.rotation;}
        return output;
      });
    }
    result[name]=item;
  }
  if(new TextEncoder().encode(JSON.stringify(result)).byteLength>256*1024)throw Error('Réponses du rapport trop volumineuses.');
  return result;
}
const buttonDefinitionV2754=definition=>['checkbox','radiobutton'].includes(definition?.type);
const buttonCheckedV2754=(value,definition)=>typeof value==='boolean'?value:value!==null&&value!==undefined&&value!==''&&value!=='Off'&&String(value)===String(definition.exportValues||'Yes');
export function captureReportFieldsV2754(definitions,readState,readWidget=definition=>definition){
  const entries=definitions instanceof Map?[...definitions.entries()]:Object.entries(definitions||{}),states=Object.create(null);
  for(const [name,raw]of entries){
    if(!safeName(name))continue;const defs=(Array.isArray(raw)?raw:[raw]).filter(Boolean);if(!defs.length)continue;
    const state=readState(name)||{},widgets=defs.filter(def=>def.id).map(def=>{
      const widget=readWidget(def)||def,rawValue=widget.value??def.value??state.value??'';
      return {id:def.id,value:buttonDefinitionV2754(def)?buttonCheckedV2754(rawValue,def):rawValue,...(widget.formattedValue!==undefined?{formattedValue:widget.formattedValue}:{}),...Object.fromEntries(['readOnly','noView','noPrint','rotation'].filter(flag=>widget[flag]!==undefined).map(flag=>[flag,widget[flag]]))};
    });
    // The sandbox speaks export names; PDF.js' writer speaks per-widget
    // booleans. Preserve both, especially the string "Off" (which is truthy).
    const selected=defs.find(def=>buttonDefinitionV2754(def)&&widgets.find(widget=>widget.id===def.id)?.value===true);
    const value=defs.some(buttonDefinitionV2754)?selected?.exportValues||'Off':state.value??'';
    states[name]={value,...(state.formattedValue!==undefined?{formattedValue:state.formattedValue}:{}),...(state.readOnly!==undefined?{readOnly:state.readOnly}:{}),...(Array.isArray(state.items)?{items:state.items}:{}),widgets};
  }
  return reportFieldsV2754(states);
}
export function restoreReportFieldsV2754(fields,{objects,storage,onUpdate=()=>{}}={}){
  const snapshot=reportFieldsV2754(fields),updates=[];
  for(const [name,state]of Object.entries(snapshot)){
    const raw=objects instanceof Map?objects.get(name):objects?.[name],defs=raw?Array.isArray(raw)?raw:[raw]:[];
    // Only actual fields in the pinned template can be restored. Permissions,
    // actions, rectangles and formulas always come from that template.
    for(const def of defs){if(!def?.id)continue;const widget=state.widgets?.find(item=>item.id===def.id),{widgets,...canonical}=state,restore={...canonical,...widget};delete restore.id;if(buttonDefinitionV2754(def)){restore.value=buttonCheckedV2754(widget?.value??state.value,def);def.value=state.value===true?def.exportValues||'Yes':state.value===false?'Off':state.value;}else def.value=Array.isArray(restore.value)?[...restore.value]:restore.value;if(state.items)def.items=state.items.map(item=>({...item}));
      storage?.setValue(def.id,restore);const update={id:def.id,name,...restore};updates.push(update);onUpdate(update);
    }
  }
  return updates;
}
export function reportContextV2754(value){
  if(!value||typeof value!=='object'||!uuid(value.reportId)||typeof value.clientId!=='string'||!value.clientId||typeof value.destinationId!=='string'||!value.destinationId||!value.template||!/^[a-f0-9]{64}$/i.test(value.template.sha256||'')||!safeName(value.template.modeleId)||Number(value.template.version||2754)!==2754||!Number.isSafeInteger(value.baseRevision??0)||(value.baseRevision??0)<0)return null;
  return {engine:2754,reportId:value.reportId,clientId:value.clientId,destinationId:value.destinationId,fileId:String(value.fileId||''),family:String(value.family||value.template.modeleId),template:{modeleId:value.template.modeleId,sha256:value.template.sha256,version:Number(value.template.version||2754)},baseRevision:value.baseRevision??0,...(value.expectedDriveRevision?{expectedDriveRevision:String(value.expectedDriveRevision)}:{})};
}
export function reportPayloadV2754(context,fields,requestId,name){
  const meta=reportContextV2754(context),id=String(requestId||'').replace(/^save-/,'');if(!meta||!uuid(id))throw Error('Identité du rapport invalide.');
  if(typeof name!=='string'||!name.trim()||name.length>220||!name.toLowerCase().endsWith('.pdf'))throw Error('Nom du rapport invalide.');
  return {...meta,requestId:id,name,fields:reportFieldsV2754(fields)};
}
export const reportEngineStorageV2754=createReportEngineStorageV20261028;
// Shared by native, web and PC shells. Existing legacy copies remain separate
// until their imported fields and the first server PDF are both confirmed.
export function createReportEngineClientV2754({rpc,storage=reportEngineStorageV2754(),getAccount,canWrite=()=>true,onChange=()=>{},isOnline=()=>globalThis.navigator?.onLine!==false}={}){
  const jobs=new Map(),sends=new Map(),timers=new Map(),syncFlightsV2789=new Map();let generation=0;
  const key=(account,id)=>account+'|'+id;
  const serial=(id,fn)=>{const p=(jobs.get(id)||Promise.resolve()).catch(()=>{}).then(fn);jobs.set(id,p);p.finally(()=>{if(jobs.get(id)===p)jobs.delete(id);}).catch(()=>{});return p;};
  const notify=record=>{if(record.account===getAccount())try{onChange(record);}catch{}};

  // A blocked local tombstone may outlive the confirmed server deletion.
  // Reconcile that exact report with STATUS; never resend DELETE to recover it.
  const deletionReadsV2760=new Map();
  async function reconcileDeletedV2760(record){
    const account=getAccount(),stamp=generation;
    if(!record?.deleted||!record.pending||record.account!==account||!canWrite()||!isOnline())return record;
    const existing=deletionReadsV2760.get(record.key);if(existing)return existing;
    const reportId=record.context.reportId,clientId=record.context.clientId,destinationId=record.context.destinationId,requestId=record.payload.requestId;
    const valid=()=>stamp===generation&&account===getAccount()&&canWrite();
    const flight=(async()=>{
      let result;
      try{result=await rpc('status',{reportId,clientId});}catch{return record;}
      if(!valid())return record;
      // The authenticated status endpoint checks the requested client scope.
      // Tombstone responses omit clientId/fileId; if supplied they must agree.
      const fileId=record.context.fileId||record.pdf?.fileId||'';
      if(result?.ok!==true||result.reportId!==reportId||result.deleted!==true||result.drivePending!==false||
        !Number.isSafeInteger(result.revision)||result.revision<Number(record.context.baseRevision||0)||
        result.clientId!==undefined&&result.clientId!==clientId||result.pdf?.status==='conflict'||
        result.pdf?.fileId&&fileId&&result.pdf.fileId!==fileId||result.fileId&&fileId&&result.fileId!==fileId)return record;
      return serial(record.key,async()=>{
        const current=await storage.get(record.key);
        if(!valid()||!current?.deleted||current.account!==account||current.payload.requestId!==requestId||
          current.context.reportId!==reportId||current.context.clientId!==clientId||current.context.destinationId!==destinationId||
          current.restoredFromRevision!==record.restoredFromRevision||Number(current.context.baseRevision||0)>result.revision)return current||record;
        const updated={...current,context:{...current.context,baseRevision:result.revision},serverRevision:result.revision,
          deleted:true,deleteAck:true,pending:false,blocked:false,error:'',pdf:{...current.pdf,...result.pdf,status:'deleted',fileId:current.context.fileId||current.pdf?.fileId||''}};
        await storage.commit(updated,false);if(valid())notify(updated);return updated;
      });
    })();
    deletionReadsV2760.set(record.key,flight);
    try{return await flight;}finally{if(deletionReadsV2760.get(record.key)===flight)deletionReadsV2760.delete(record.key);}
  }
  function syncRecord(record){
    // Check before deferring: an offline save must not turn into an unrelated
    // automatic upload when the caller reconnects to resume one chosen report.
    if(!record?.pending||record.blocked||record.remoteDeletedV2784||record.account!==getAccount()||!canWrite()||!isOnline())return Promise.resolve();
    const prior=syncFlightsV2789.get(record.key);if(prior)return prior;
    const stamp=generation;
    const flight=Promise.resolve().then(()=>stamp===generation?sendRecordV2789(record):undefined).finally(async()=>{
      if(syncFlightsV2789.get(record.key)===flight)syncFlightsV2789.delete(record.key);
      const latest=await storage.get(record.key).catch(()=>null);
      if(stamp===generation&&record.account===getAccount()&&canWrite()&&latest?.pending&&!latest.blocked&&latest.payload.requestId!==record.payload.requestId)queueMicrotask(()=>syncRecord(latest));
    });
    syncFlightsV2789.set(record.key,flight);return flight;
  }
  async function sendRecordV2789(record){
    const stamp=generation,account=getAccount(),valid=()=>stamp===generation&&getAccount()===account&&canWrite();if(!account||record.account!==account||!valid()||!isOnline()||sends.has(record.key)||!record.pending||record.remoteDeletedV2784)return;
    const attempt=record.payload.requestId;sends.set(record.key,attempt);
    try{
      const deleting=record.deleted===true;
      let result=await rpc(deleting?(record.deleteAck?'status':'delete'):(record.dataSaved?'status':'save'),deleting?{reportId:record.context.reportId,clientId:record.context.clientId,baseRevision:record.context.baseRevision,fileId:record.context.fileId||''}:record.dataSaved?{reportId:record.context.reportId,clientId:record.context.clientId}:record.payload);if(!valid())return;
      if(result?.reportId&&result.reportId!==record.context.reportId||result?.row?.clientId&&result.row.clientId!==record.context.clientId||result?.clientId&&result.clientId!==record.context.clientId)throw Object.assign(Error('La réponse du serveur ne correspond pas à ce rapport.'),{code:'INVALID_REPORT_RECEIPT'});
      if(!deleting&&result?.deleted===true){if(result.reportId!==record.context.reportId)throw Object.assign(Error('Confirmation de suppression invalide.'),{code:'INVALID_REPORT_RECEIPT'});throw Object.assign(Error(DELETED_REPORT_MESSAGE_V2784),{code:'REPORT_DELETED'});}
      if(!result?.ok||deleting&&(result.deleted!==true||result.reportId!==record.context.reportId)||!deleting&&!result.deleted&&!(result.dataSaved||record.dataSaved&&Number.isSafeInteger(result.revision)))throw Object.assign(Error(result?.message||result?.error||'Sauvegarde serveur non confirmée.'),{code:result?.code||result?.error});
      if(!deleting&&!result.deleted&&record.dataSaved&&Number(result?.revision)!==Number(record.serverRevision))throw Object.assign(Error('Une autre révision du rapport a été enregistrée. Rouvrez le rapport avant de continuer.'),{code:'revision_conflict'});
      await serial(record.key,async()=>{const current=await storage.get(record.key);if(!valid()||!current||current.context.clientId!==record.context.clientId||current.context.destinationId!==record.context.destinationId)return;const same=current.payload.requestId===attempt;
        if(current.deleted&&current.deleteAck&&!current.pending)return;
        if(record.deleted&&!current.deleted||Number.isSafeInteger(current.restoredFromRevision)&&Number(result.revision)<=current.restoredFromRevision)return;
        if(current.deleted||result.deleted){
          // A late save receipt may identify the final Drive file, but must
          // never turn a durable deletion intent back into a queued save.
          const acknowledged=result.deleted===true,revision=Number(result.revision)||current.context.baseRevision||0,context={...current.context,baseRevision:revision,fileId:result.pdf?.fileId||current.context.fileId};
          const pending=!acknowledged||result.drivePending!==false||result.pdf?.status==='conflict';
          const updated={...current,context,deleted:true,deleteAck:acknowledged,serverRevision:revision,dataSaved:false,pending,blocked:result.pdf?.status==='conflict',error:result.pdf?.status==='conflict'?'La suppression Drive nécessite une vérification.':'',pdf:result.pdf||{status:'deleting'},payload:current.deleted?{...current.payload,baseRevision:revision,fileId:context.fileId}:{reportId:context.reportId,clientId:context.clientId,baseRevision:revision,fileId:context.fileId,requestId:crypto.randomUUID()}};
          await storage.commit(updated,pending);notify(updated);return;
        }
        const revision=Number(result.revision)||0,confirmed=result.pdf?.status==='confirmed'&&Number(result.pdf.revision)===revision;
        const context={...current.context,baseRevision:revision,fileId:result.pdf?.fileId||current.context.fileId,...(result.pdf?.driveRevision?{expectedDriveRevision:result.pdf.driveRevision}:{})};
        const updated={...current,context,serverRevision:revision,dataSaved:same,pdf:result.pdf,error:'',pending:!same||!confirmed,payload:same?current.payload:{...current.payload,baseRevision:revision,fileId:context.fileId,...(context.expectedDriveRevision?{expectedDriveRevision:context.expectedDriveRevision}:{})}};
        await storage.commit(updated,updated.pending);notify(updated);
      });
      if(['conflict','error'].includes(result.pdf?.status)){await serial(record.key,async()=>{const current=await storage.get(record.key);if(!valid()||!current||current.payload.requestId!==attempt||current.deleted&&current.deleteAck&&!current.pending)return;const updated={...current,error:result.pdf.message||'La publication Drive nécessite une vérification.',blocked:result.pdf.status==='conflict',pending:true};await storage.commit(updated,true);notify(updated);if(!updated.blocked)schedule(record.key,5000);});}
      else if(deleting||result.deleted){if(result.drivePending!==false)schedule(record.key,1500);}
      else if(result.pdf?.status!=='confirmed')schedule(record.key,1500);
    }catch(error){await serial(record.key,async()=>{const current=await storage.get(record.key);if(!valid()||!current||current.payload.requestId!==attempt||current.deleted&&current.deleteAck&&!current.pending)return;const remoteDeleted=isDeletedReportV2784(error),conflict=remoteDeleted||/conflict|revision|forbidden|unauthorized|access|^INVALID_|^SCOPE_MISMATCH$|^IDEMPOTENCY_/i.test(String(error.code||''));const updated={...current,...(remoteDeleted?{remoteDeletedV2784:true}:{}),error:remoteDeleted?DELETED_REPORT_MESSAGE_V2784:error.message,blocked:conflict,pending:true};await storage.commit(updated,true);notify(updated);if(!conflict)schedule(record.key,5000);});}
    finally{sends.delete(record.key);}
  }
  function schedule(id,delay){if(timers.has(id))return;const stamp=generation;timers.set(id,setTimeout(async()=>{timers.delete(id);if(stamp!==generation)return;const record=await storage.get(id).catch(()=>null);if(record?.pending&&!record.blocked)syncRecord(record);},delay));}
  return {async save(context,fields,requestId,name,preparedPdf){const account=getAccount(),meta=reportContextV2754(context);if(!account||!canWrite()||!meta)throw Error('Déverrouillez CDQ pour enregistrer.');const id=key(account,meta.reportId),stamp=generation;const record=await serial(id,async()=>{if(stamp!==generation||account!==getAccount()||!canWrite())throw Error('Le compte ou l’accès Drive a changé.');const old=await storage.get(id);if(old&&old.context.clientId!==meta.clientId)throw Object.assign(Error('Le rapport appartient à un autre client.'),{code:'SCOPE_MISMATCH'});if(old?.remoteDeletedV2784)throw Object.assign(Error(DELETED_REPORT_MESSAGE_V2784),{code:'REPORT_DELETED'});if(old?.deleted)throw Object.assign(Error('Ce rapport a été supprimé. Il ne peut plus être enregistré.'),{code:'REPORT_DELETED'});const payload=reportPayloadV2754(old?.context||meta,fields,requestId,name);if(preparedPdf)payload.preparedPdfV2759=await prepareReportPdfV2759(payload,preparedPdf);if(stamp!==generation||account!==getAccount()||!canWrite())throw Error('Le compte ou l’accès a changé.');if(old?.payload.requestId===payload.requestId){if(JSON.stringify(old.fields)!==JSON.stringify(payload.fields))throw Error('Identifiant de sauvegarde déjà utilisé pour d’autres réponses.');return old;}const updated={key:id,account,context:old?.context||meta,payload,fields:payload.fields,name,pending:true,dataSaved:false,blocked:false,error:'',savedAt:Date.now(),pdf:old?.pdf||{status:'pending'}};await storage.commit(updated,true);notify(updated);return updated;});queueMicrotask(()=>syncRecord(record));return {queued:true,reportEngineV2754:record.context,reportSnapshotV2754:record.fields};},async recoverAsNewV2784(context){
 const account=getAccount(),stamp=generation,id=key(account,context?.reportId),valid=()=>account&&getAccount()===account&&generation===stamp&&canWrite();
 if(!valid())throw Error('Déverrouillez CDQ pour récupérer la copie.');
 const record=await serial(id,async()=>{
  let old=await storage.get(id);if(!valid())throw Error('Le compte ou l’accès a changé.');
  if(!old||old.account!==account||old.context.clientId!==context.clientId||old.context.destinationId!==context.destinationId||!old.remoteDeletedV2784||!old.fields)throw Error('La copie locale de ce rapport supprimé est introuvable.');
  let plan=old.recoveryPlanV2784;
  if(!plan){plan={reportId:crypto.randomUUID(),requestId:crypto.randomUUID(),at:Date.now()};old={...old,recoveryPlanV2784:plan};await storage.commit(old,true);if(!valid())throw Error('Le compte a changé.');}
  const recoveredKey=key(account,plan.reportId),existing=await storage.get(recoveredKey);if(!valid())throw Error('Le compte a changé.');
  if(existing){if(existing.recoveredFromReportIdV2784!==old.context.reportId||existing.account!==account)throw Error('Identité de récupération différente.');return existing;}
  const meta=reportContextV2754(recoveryContextV2784(old.context,plan.reportId));if(!meta)throw Error('Le modèle de la copie ne peut pas être confirmé.');
  const name=recoveryNameV2784(old.name),payload=reportPayloadV2754(meta,old.fields,plan.requestId,name);
  const recovered={key:recoveredKey,account,context:meta,fields:payload.fields,name,payload,pending:true,dataSaved:false,blocked:false,error:'',pdf:{status:'pending'},savedAt:plan.at,recoveredFromReportIdV2784:old.context.reportId};
  // Persist the new copy before any request. The old fields, prepared PDF and
  // deletion marker stay intact even if publication or acknowledgement fails.
  await storage.commit(recovered,true);if(!valid())throw Error('Le compte a changé.');notify(recovered);return recovered;
 });
 if(valid()&&record.pending&&!record.blocked)queueMicrotask(()=>syncRecord(record));return record;
},
async remove(context){
    const account=getAccount(),meta=reportContextV2754(context),stamp=generation;if(!account||!canWrite()||!meta)throw Error('Déverrouillez CDQ pour supprimer ce rapport.');const id=key(account,meta.reportId);
    let previousDeletionV2782=false;const record=await serial(id,async()=>{if(stamp!==generation||account!==getAccount()||!canWrite())throw Error('Le compte ou l’accès Drive a changé.');const old=await storage.get(id);if(old?.deleted){previousDeletionV2782=true;return old;}const normalized=old?.context||meta,payload={reportId:normalized.reportId,clientId:normalized.clientId,baseRevision:normalized.baseRevision,fileId:normalized.fileId||'',requestId:crypto.randomUUID()};
      const updated={...old,...(context.fields?{fields:reportFieldsV2754(context.fields),name:context.name||old?.name}:{}),key:id,account,context:normalized,payload,deleted:true,deleteAck:false,dataSaved:false,pending:true,blocked:false,error:'',savedAt:Date.now(),pdf:{status:'deleting',fileId:normalized.fileId||''}};await storage.commit(updated,true);notify(updated);return updated;});
    if(previousDeletionV2782&&record.deleted&&record.pending){const recovered=await reconcileDeletedV2760(record);if(recovered?.pending&&!recovered.blocked)queueMicrotask(()=>syncRecord(recovered));return recovered;}
    queueMicrotask(()=>syncRecord(record));return record;
  },async restore(context){
    const account=getAccount(),stamp=generation;if(!account||!canWrite()||!uuid(context?.reportId)||!context.clientId||!Number.isSafeInteger(context.baseRevision)||context.baseRevision<0)throw Error('Restauration de rapport non autorisée.');const id=key(account,context.reportId);
    const record=await serial(id,async()=>{
      const valid=()=>stamp===generation&&account===getAccount()&&canWrite();if(!valid())throw Error('Le compte ou l’accès Drive a changé.');const old=await storage.get(id);
      if(old&&!old.deleted&&old.restoredFromRevision===context.baseRevision)return old;
      if(old?.restoredAsReportId){const restored=await storage.get(key(account,old.restoredAsReportId));if(restored)return restored;}
      let baseRevision=Math.max(context.baseRevision,old?.context.baseRevision||0);if(baseRevision===0){const latest=await rpc('status',{reportId:context.reportId,clientId:context.clientId});if(!valid())throw Error('Le compte ou l’accès Drive a changé.');if(latest?.deleted&&Number.isSafeInteger(latest.revision))baseRevision=latest.revision;}const request={reportId:context.reportId,clientId:context.clientId,baseRevision,fileId:context.fileId||old?.context.fileId||'',...(context.restoredFolderId?{restoredFolderId:context.restoredFolderId,destinationId:context.destinationId||old?.context.destinationId}:{})};
      let result;try{result=await rpc('restore',request);}catch(error){if(error.code!=='RESTORE_LOCAL_DRAFT')throw error;result={ok:false,code:error.code};}if(!valid())throw Error('Le compte ou l’accès Drive a changé.');
      if(result?.code==='RESTORE_LOCAL_DRAFT'){
        if(baseRevision!==0||!context.restoredFolderId||!old?.fields)throw Error('Les réponses du brouillon à restaurer sont introuvables.');
        const restoredId=old.restoredAsReportId||crypto.randomUUID(),requestId=old.restoreRequestId||crypto.randomUUID(),meta=reportContextV2754({...old.context,reportId:restoredId,fileId:'',baseRevision:0,expectedDriveRevision:''});if(!meta)throw Error('Le modèle du brouillon ne peut pas être restauré.');
        // Persist the replacement identity first. A failed second commit retries
        // that same new report, while the cancelled identity stays tombstoned.
        await storage.commit({...old,pending:false,deleteAck:true,restoredAsReportId:restoredId,restoreRequestId:requestId},false);if(!valid())throw Error('Le compte a changé.');
        const payload=reportPayloadV2754(meta,old.fields,requestId,old.name),record={key:key(account,restoredId),account,context:meta,fields:payload.fields,name:old.name,payload,pending:true,dataSaved:false,blocked:false,error:'',pdf:{status:'pending'},restoredFromReportId:context.reportId,savedAt:Date.now()};
        await storage.commit(record,true);notify(record);return record;
      }
      if(!result?.ok||!result.restored||result.reportId!==context.reportId||!Number.isSafeInteger(result.revision)||result.revision<=context.baseRevision)throw Object.assign(Error(result?.message||result?.error||'La restauration du rapport n’a pas été confirmée.'),{code:result?.code||'RESTORE_UNCONFIRMED'});
      const source=result.snapshot||{},meta=reportContextV2754({...old?.context,...context,...source,reportId:context.reportId,clientId:context.clientId,baseRevision:result.revision,fileId:result.pdf?.fileId||source.fileId||context.fileId||old?.context.fileId||'',expectedDriveRevision:result.pdf?.driveRevision||old?.context.expectedDriveRevision||''});
      if(!meta)throw Error('La restauration ne confirme pas le modèle du rapport.');const fields=reportFieldsV2754(source.fields||old?.fields),pdf=result.pdf||{status:'pending'},pending=pdf.status!=='confirmed'||Number(pdf.revision)!==result.revision,name=source.name||old?.name;
      const updated={...old,key:id,account,context:meta,name,fields,payload:reportPayloadV2754(meta,fields,crypto.randomUUID(),name),deleted:false,deleteAck:false,remoteDeletedV2784:false,restoredFromRevision:context.baseRevision,serverRevision:result.revision,dataSaved:true,pending,blocked:false,error:'',pdf,savedAt:Date.now()};await storage.commit(updated,pending);notify(updated);return updated;
    });if(record.pending)queueMicrotask(()=>syncRecord(record));return record;
  },async remember({context,fields,name,pdf,serverRevision}){
    const account=getAccount(),meta=reportContextV2754(context),stamp=generation;if(!account||!meta)throw Error('Identité du rapport invalide.');const id=key(account,meta.reportId);
    return serial(id,async()=>{const old=await storage.get(id);if(stamp!==generation||account!==getAccount())throw Error('Le compte a changé.');
      const moved=old&&(old.context.clientId!==meta.clientId||old.context.destinationId!==meta.destinationId),revision=Number(serverRevision??meta.baseRevision)||0;
      // Serial with saves: a location refresh may never consume an outbox item,
      // including one accepted by the server but still awaiting its Drive PDF.
      if(moved&&!old.deleted&&(old.pending||old.blocked||old.dataSaved===false||old.serverRevision>revision))throw Object.assign(Error('Ce rapport a changé de dossier alors que des réponses locales sont en attente. Elles restent conservées; terminez leur vérification avant de rouvrir le fichier.'),{code:'REPORT_LOCATION_CONFLICT'});
      if(old?.remoteDeletedV2784||old?.deleted||old?.pending&&!old.dataSaved)return old;if(old&&old.serverRevision>revision)return old;
      const normalized=reportFieldsV2754(fields),observation=observedReportStateV2784(old,{revision,fields:normalized,name}),publication=pdf||{status:'confirmed',fileId:meta.fileId,revision},pending=publication.status!=='confirmed'||Number(publication.revision)!==revision,record={key:id,account,context:{...meta,baseRevision:revision},fields:normalized,name,serverRevision:revision,dataSaved:true,pending,blocked:!!(observation.requestId&&old.blocked),error:observation.requestId?old.error||'':'',savedAt:observation.savedAt,observationOnlyV2784:observation.observationOnlyV2784,pdf:publication,payload:observation.requestId?old.payload:{...meta,baseRevision:revision,requestId:crypto.randomUUID(),name,fields:normalized}};
      await storage.commit(record,pending);notify(record);if(pending)queueMicrotask(()=>syncRecord(record));return record;
    });
  },async get(context){const account=getAccount();if(!account)return null;if(typeof context==='string')return storage.get(key(account,context));if(context?.reportId)return storage.get(key(account,context.reportId));if(context?.fileId)return storage.byFileId?storage.byFileId(account,context.fileId):(await storage.all(account)).find(record=>record.account===account&&(record.context.fileId===context.fileId||record.pdf?.fileId===context.fileId))||null;return null;},async all(){const account=getAccount();return account?(await storage.all(account)).filter(record=>record.account===account):[];},async metadata({clientId}={}){const account=getAccount();if(!account)return [];return storage.metadata?storage.metadata(account,clientId):(await storage.all(account)).filter(record=>record.account===account&&(!clientId||record.context?.clientId===clientId));},async synchronizeReportV2789(reportId){
    const account=getAccount(),stamp=generation;if(!account)return;
    let record=await storage.get(key(account,reportId));
    if(stamp!==generation||account!==getAccount()||!canWrite()||!record?.pending)return;
    if(record.deleted&&record.blocked)record=await reconcileDeletedV2760(record);
    if(stamp!==generation||account!==getAccount()||!canWrite()||!record?.pending||record.blocked)return;
    await syncRecord(record);
  },async resume({reportIds}={}){const account=getAccount(),selected=Array.isArray(reportIds)?new Set(reportIds):null;if(!account)return;const records=storage.pending?await storage.pending(account,reportIds):await storage.all(account);for(const record of records)if(record.account===account&&record.pending&&(!selected||selected.has(record.context.reportId))){if(record.deleted)reconcileDeletedV2760(record).then(recovered=>{if(recovered?.pending&&!recovered.blocked)syncRecord(recovered);}).catch(()=>{});else if(!record.blocked)syncRecord(record);}},lock(){generation++;for(const timer of timers.values())clearTimeout(timer);timers.clear();},stats:()=>({inflight:sends.size,queuedTimers:timers.size})};
}
