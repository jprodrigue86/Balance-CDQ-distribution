import {canonicalV2816,conflictV2816} from './report-edit-guard-v2816.mjs';
export const COPY_BASE_V2816=Symbol('cdq-copy-base-v2816');
// Answer snapshots and prepared artifacts are compared in full. Support-PDF
// bytes are represented by editVersion/uploadId; they are not the answers.
export function copyTokenV2816(record){
 if(!record)return 'null';
 const {blob,templateBlob,pdfBytesV2664,pdfTypeV2664,templateBytesV2664,templateSameV2664,...data}=record;
 return canonicalV2816(data);
}
export const tagCopyV2816=record=>{if(record)record[COPY_BASE_V2816]=copyTokenV2816(record);return record;};
export function copyEditBasisV2816(copy){return canonicalV2816(copy?{context:copy.reportEngineV2754,fields:copy.reportSnapshotV2754,name:copy.name,requestId:copy.reportPayloadV2754?.requestId,removed:!!copy.removed,remoteDeleted:!!copy.remoteDeletedV2784,initialValues:copy.initialValues}:null);}
export async function writeCopyV2816(database,value,remove=false){
 let expected=value?.[COPY_BASE_V2816]??'null';if(expected!=='null'&&JSON.parse(expected).id!==value.id)expected='null';const db=await database();
 return new Promise((resolve,reject)=>{let changed=false;const tx=db.transaction('copies','readwrite'),store=tx.objectStore('copies'),read=store.get(value.id);
  read.onsuccess=()=>{if(copyTokenV2816(read.result)!==expected){changed=true;return;}if(remove)store.delete(value.id);else store.put(value);};
  tx.oncomplete=()=>{db.close();if(changed)reject(conflictV2816());else {value[COPY_BASE_V2816]=remove?'null':copyTokenV2816(value);resolve(value);}};
  tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('La copie ne peut pas être conservée. Le rapport reste ouvert.'));};
 });
}
