// Readiness only: drafts are never replaced silently by older Drive bytes.
const fail = (code, message) => { throw Object.assign(Error(message), {code}); };
const fileId = r => String(r?.context?.fileId || r?.pdf?.fileId || r?.fileId || r?.id || '');
const reportId = r => r?.context?.reportId || r?.reportId;
const folderId = r => r?.context?.destinationId || r?.folderId || r?.destinationId;
const clientId = r => r?.context?.clientId || r?.clientId;
const listName = value => String(value || '').normalize('NFC').trim().replace(/\.pdf$/i, '').replace(/\s+/g, ' ').trim();
export const isBalanceListSourceV20261103 = source => source.managedKind === 'list' || [source.name,source.outputName,source.conversionName].some(name=>/^liste (?:de|des) balances?$/i.test(listName(name)));
const listSelected = plan => plan.sources.some(isBalanceListSourceV20261103);
function selection(plan) {
  const files = new Set(plan.sources.map(s=>s.fileId));
  const reports = new Map(plan.sources.filter(s=>s.reportId).map(s=>[s.reportId,s]));
  const folders = new Set(plan.scopeFolders || []);
  const selected = r => files.has(fileId(r)) || reports.has(reportId(r)) || folders.has(folderId(r));
  return {files, reports, folders, selected};
}
export function validateTicketV20261103(ticket, context, now=Date.now()) {
  const plan=ticket?.plan;
  if(ticket?.capabilities?.protocol!==20261103 || ticket.capabilities.portalBatchProtocol!==2835 || plan?.protocol!==20261103 || !Array.isArray(plan.sources) || !plan.sources.length || plan.sources.length>1000 || typeof ticket.signature!=='string' || !/^[a-f0-9]{64}$/.test(ticket.signature)) fail('SEND_PROTOCOL_UNAVAILABLE','La préparation fiable de cet envoi n’est pas disponible.');
  if(plan.actor!==String(context.owner||'').trim().toLowerCase() || plan.clientId!==context.clientId) fail('SCOPE_MISMATCH','Le compte ou le client de la sélection a changé.');
  if(!Number.isSafeInteger(plan.createdAt) || now-plan.createdAt<0 || now-plan.createdAt>=300000) fail('SEND_PLAN_EXPIRED','Actualisez la sélection avant de démarrer.');
  const ids=new Set();
  for(const s of plan.sources){
    if(!s.fileId || ids.has(s.fileId) || !s.driveRevision || !s.sourceKey || !s.outputName) fail('INVALID_SEND_PLAN','Une édition de la sélection est invalide.');
    ids.add(s.fileId);
  }
  return plan;
}
export function assertSendReadyV20261103(plan, {records=[],legacy=[],queue=[],native=[],list=null}={}) {
  const {files,reports,folders,selected}=selection(plan),includesList=listSelected(plan);
  for(const action of queue) {
    if(action.kind==='pdf-save-v2520' && (files.has(String(action.targetId)) || folders.has(folderId(action)) || includesList && (!clientId(action) || clientId(action)===plan.clientId))) fail('PDF_PENDING','Une modification locale doit être confirmée dans Drive avant l’envoi.');
  }
  for(const record of legacy) {
    if(!record || !selected(record) && !(includesList&&clientId(record)===plan.clientId))continue;
    if(record.clientId && record.clientId!==plan.clientId)fail('SCOPE_MISMATCH','Une copie locale appartient à un autre client.');
    if(record.pending || record.pendingSaveId || record.blocked || record.deleted || record.remoteDeletedV2784 || record.uploadId && record.uploadId!==record.syncedUploadId && record.pending!==false)fail('PDF_PENDING','Une copie locale n’est pas encore confirmée dans Drive.');
  }
  for(const record of [...records,...native]) {
    if(includesList && clientId(record)===plan.clientId && record.pending && !record.dataSaved)fail('LIST_PENDING','Les réponses locales de tous les rapports du client doivent être confirmées avant l’envoi de sa liste.');
    if(!selected(record))continue;
    if(clientId(record)!==plan.clientId)fail('SCOPE_MISMATCH','Une copie locale appartient à un autre client.');
    if(record.deleted || record.blocked || record.pending && !record.dataSaved)fail('PDF_PENDING','Les dernières réponses locales doivent être confirmées avant l’envoi.');
    const expected=reports.get(reportId(record));
    if(expected && (Number(record.serverRevision||record.context?.baseRevision||0)>expected.reportRevision || record.pending && Number(record.serverRevision||0)!==expected.reportRevision))fail('CONFLICT_SOURCE_CHANGED','Une édition locale plus récente attend sa confirmation.');
  }
  if(listSelected(plan) && (list?.ready!==true || typeof list.stamp!=='string' || !list.stamp))fail('LIST_PENDING','La liste de balance doit être confirmée avant l’envoi.');
}
export function localReadinessStampV20261103(state,plan) {
  const {files,folders,selected}=selection(plan),includesList=listSelected(plan);
  const reduce=r=>[r?.id||reportId(r)||r?.targetId||'',fileId(r),clientId(r)||'',folderId(r)||'',r?.pending,r?.dataSaved,r?.blocked,r?.deleted,r?.remoteDeletedV2784,r?.pendingSaveId||'',r?.uploadId||'',r?.syncedUploadId||'',r?.editVersion||r?.localEditVersionV2660||0,r?.serverRevision||r?.context?.baseRevision||0,r?.payload?.requestId||r?.requestId||''];
  return JSON.stringify([
    ...['records','legacy','native'].map(key=>(state[key]||[]).filter(r=>selected(r)||includesList&&clientId(r)===plan.clientId).map(reduce).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))),
    (state.queue||[]).filter(r=>r.kind==='pdf-save-v2520' && (files.has(String(r.targetId)) || folders.has(folderId(r)) || includesList&&(!clientId(r)||clientId(r)===plan.clientId))).map(reduce).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
    listSelected(plan)?state.list:null,
  ]);
}
export async function prepareSendIntentV20261103({ticket,context,guard,readState,intentId,now=()=>Date.now()}) {
  guard();const plan=validateTicketV20261103(ticket,context,now());
  const before=await readState(plan);guard();assertSendReadyV20261103(plan,before);
  const after=await readState(plan);guard();assertSendReadyV20261103(plan,after);
  if(localReadinessStampV20261103(before,plan)!==localReadinessStampV20261103(after,plan))fail('CONFLICT_LOCAL_SEND_STATE','Une modification locale a commencé pendant la préparation. Réessayez après sa sauvegarde.');
  validateTicketV20261103(ticket,context,now());
  if(!/^[a-f0-9-]{36}$/i.test(intentId||''))fail('INVALID_SEND_INTENT','Identité de demande absente.');
  return {protocol:20261103,intentId,ticket};
}
