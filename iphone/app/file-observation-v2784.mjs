// A remote read is an observation, never a new local save. Keep an outstanding
// local request and its original timestamp when the server echoes that save.
export function observedReportStateV2784(old,{revision,fields,name}){
 const same=old&&!old.deleted&&Number(old.serverRevision)===Number(revision)&&
  old.name===name&&JSON.stringify(old.fields)===JSON.stringify(fields);
 if(same&&old.pending&&old.observationOnlyV2784!==true&&old.payload?.requestId)
  return {savedAt:old.savedAt,observationOnlyV2784:false,requestId:old.payload.requestId};
 return {savedAt:same&&Number.isFinite(old.savedAt)?old.savedAt:null,observationOnlyV2784:true,requestId:null};
}
export function restoredReaderNeedsSaveV2784(saved){
 return !!(saved?.dirty&&!saved.conflict&&saved.fields&&typeof saved.fields==='object'&&!Array.isArray(saved.fields)&&Object.keys(saved.fields).length);
}
