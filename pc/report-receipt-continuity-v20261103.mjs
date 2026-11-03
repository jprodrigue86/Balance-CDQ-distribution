import {canonicalV2816,sameIntentV2816} from './report-edit-guard-v2816.mjs';

// A server acknowledgement may advance an editor's basis, never its answers.
// These proofs are local lineage evidence; the server still checks permissions,
// its exact idempotency request, revision, lease and Drive receipt.
const same=(a,b)=>canonicalV2816(a)===canonicalV2816(b);
const scope=c=>c&&({reportId:c.reportId,clientId:c.clientId,destinationId:c.destinationId,family:c.family,template:c.template});
const live=r=>!!r?.payload?.requestId&&!r.deleted&&!r.remoteDeletedV2784;
const sameOwner=(a,b)=>!!a?.account&&a.account===b?.account&&a.key===b.key&&same(scope(a.context),scope(b.context));

export function ownReceiptAdvanceV20261103(expected,current){
  if(!live(expected)||!live(current)||!sameOwner(expected,current)||
    expected.payload.requestId!==current.payload.requestId||expected.name!==current.name||
    !same(expected.fields,current.fields)||!sameIntentV2816(expected.payload,current.payload)||
    expected.restoredFromRevision!==current.restoredFromRevision||
    expected.context.fileId&&expected.context.fileId!==current.context.fileId)return false;
  const receipt=current.confirmedRequestIdV2816===expected.payload.requestId?current.confirmedRequestIdV2816:(current.lineageReceiptV2816||current.confirmedRequestIdV2816);
  const revision=current.context.baseRevision,prior=expected.context.baseRevision;
  if(!Number.isSafeInteger(revision)||current.serverRevision!==revision||revision<prior||revision>prior+1)return false;
  if(receipt===expected.payload.requestId)
    return revision===expected.payload.baseRevision+1&&current.dataSaved===true;
  return !!receipt&&current.lineageReceiptV2816===receipt&&
    expected.parentRequestsV2816?.includes(receipt)&&
    current.sendStartedRequestIdV2816!==current.payload.requestId&&
    revision===prior+1&&current.payload.baseRevision===revision;
}

export function captureUnresolvedAncestorV20261103(record){
  if(!live(record))return null;
  if(record.unresolvedAncestorV20261103)return structuredClone(record.unresolvedAncestorV20261103);
  if(!record.pending||record.dataSaved===true||record.sendStartedRequestIdV2816!==record.payload.requestId)return null;
  // Keep the immutable wire payload durable across a crash. It is released as
  // soon as that ancestor's exact receipt rebases the unsent descendant.
  return structuredClone({key:record.key,account:record.account,context:record.context,
    payload:record.payload,draftKeyV2816:record.draftKeyV2816});
}

export function validUnresolvedAncestorV20261103(record,ancestor=record?.unresolvedAncestorV20261103){
  return live(record)&&!!ancestor?.payload?.requestId&&sameOwner(record,ancestor)&&
    ancestor.payload.requestId!==record.payload.requestId&&
    record.parentRequestsV2816?.includes(ancestor.payload.requestId)&&
    record.sendStartedRequestIdV2816!==record.payload.requestId&&
    record.payload.baseRevision===ancestor.payload.baseRevision&&
    record.context.baseRevision===ancestor.payload.baseRevision&&
    same(scope(ancestor.context),scope(ancestor.payload))&&
    (!ancestor.context.fileId||ancestor.context.fileId===record.context.fileId);
}

export function copyReceiptRecordV20261103(copy){
  if(!copy?.reportEngineV2754)return null;
  const payload=copy.reportPayloadV2754,accepted=copy.engineAcceptedV2757;
  return {key:copy.email+'|'+copy.reportEngineV2754.reportId,account:copy.email,
    context:copy.reportEngineV2754,payload,fields:copy.reportSnapshotV2754,name:copy.name,
    deleted:!!copy.removed,remoteDeletedV2784:!!copy.remoteDeletedV2784,
    pending:copy.uploadId!==copy.syncedUploadId,
    dataSaved:!!payload&&accepted?.requestId===payload.requestId,
    serverRevision:copy.reportRevisionV2754,
    confirmedRequestIdV2816:accepted?.requestId,
    lineageReceiptV2816:copy.lineageReceiptV2816,
    parentRequestsV2816:copy.parentRequestsV2816,
    sendStartedRequestIdV2816:copy.sendStartedRequestIdV2816,
    draftKeyV2816:copy.draftKeyV2816,
    unresolvedAncestorV20261103:copy.unresolvedAncestorV20261103};
}
