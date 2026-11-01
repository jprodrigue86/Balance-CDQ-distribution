// Local concurrency is independent of the server's revision and Drive checks.
// A rejected intent is kept separately; it must never enter the upload queue.
export function canonicalV2816(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(value instanceof ArrayBuffer){const bytes=new Uint8Array(value);let text='';for(let at=0;at<bytes.length;at+=16384)text+=String.fromCharCode(...bytes.subarray(at,at+16384));return JSON.stringify({bytes:btoa(text)});}
 if(ArrayBuffer.isView(value))return canonicalV2816(value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength));
 if(value instanceof Blob)throw conflictV2816('La copie locale doit être relue avant de continuer.');
 if(Array.isArray(value))return '['+value.map(canonicalV2816).join(',')+']';
 return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonicalV2816(value[k])).join(',')+'}';
}
export const recordTokenV2816=record=>canonicalV2816(record||null);
export const conflictV2816=(message='Ce rapport a été modifié dans une autre fenêtre. Vos réponses restent conservées dans Documents hors ligne → Modifications à vérifier.')=>Object.assign(Error(message),{code:'LOCAL_EDIT_CONFLICT'});
export function editBasisV2816(record){
 // Fresh read-only observations may mint a local bookkeeping ID. That ID is
 // not an edit; require identity only while actual work remains outstanding.
 // Full record CAS at commit still detects races after this semantic check.
 return canonicalV2816(record?{context:record.context,fields:record.fields,name:record.name,requestId:record.pending||record.blocked||record.dataSaved===false?record.payload?.requestId:null,deleted:!!record.deleted,remoteDeleted:!!record.remoteDeletedV2784,restoredFromRevision:record.restoredFromRevision}:null);
}
export function createEditJournalV2816({factory=globalThis.indexedDB,name='cdq-report-edits-v2816',now=Date.now}={}){
 const open=()=>new Promise((resolve,reject)=>{const req=factory.open(name,1);let abandoned=false;req.onupgradeneeded=()=>{for(const key of ['drafts','requests','leases'])if(!req.result.objectStoreNames.contains(key))req.result.createObjectStore(key,{keyPath:'key'});};req.onblocked=()=>{abandoned=true;reject(Error('Le stockage des modifications est occupé. Le rapport reste ouvert.'));};req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>db.close();if(abandoned)db.close();else resolve(db);};});
 async function tx(stores,mode,run){const db=await open();return new Promise((resolve,reject)=>{let value,t;try{t=db.transaction(stores,mode);run(t,result=>value=result);}catch(error){try{t?.abort();}catch{}db.close();reject(error);return;}t.oncomplete=()=>{db.close();resolve(value);};t.onerror=t.onabort=()=>{db.close();reject(t.error||Error('Conservation locale impossible. Le rapport reste ouvert.'));};});}
 async function preserve(record,editorId){
  if(!record?.account||record.key!==record.account+'|'+record.context?.reportId||!record.payload?.requestId||record.name!==record.payload.name||canonicalV2816(record.fields)!==canonicalV2816(record.payload.fields))throw Error('Copie de récupération invalide.');
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalV2816(record.payload))))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const requestKey=record.key+'|'+record.payload.requestId,key=requestKey+'|'+digest;
  return tx(['drafts','requests'],'readwrite',(t,done)=>{const requests=t.objectStore('requests'),drafts=t.objectStore('drafts'),read=requests.get(requestKey);read.onsuccess=()=>{const reused=read.result?.digest&&read.result.digest!==digest,prior=drafts.get(key);prior.onsuccess=()=>{if(!prior.result)drafts.put({key,requestKey,account:record.account,reportId:record.context.reportId,requestId:record.payload.requestId,editorId,digest,record:structuredClone(record),at:now(),state:'unconfirmed',message:reused?'Identifiant de sauvegarde déjà utilisé pour une autre modification.':''});if(!read.result?.digest)requests.put({...read.result,key:requestKey,digest,draftKey:key});done({key,reused:!!reused});};};});
 }
 async function mark(key,state,message=''){
  if(!key)return;
  return tx(['drafts'],'readwrite',(t,done)=>{const store=t.objectStore('drafts'),r=store.get(key);r.onsuccess=()=>{if(!r.result)return;const next={...r.result,state,message};
   // Only an exact confirmed receipt permits removing the duplicate artifact.
   // Unconfirmed and conflicting answers/PDFs remain complete and recoverable.
   if(state==='confirmed'){delete next.record;}
   store.put(next);done(next);};});
 }
 const list=account=>tx(['drafts'],'readonly',(t,done)=>{const r=t.objectStore('drafts').getAll();r.onsuccess=()=>done(r.result.filter(row=>row.account===account&&row.state!=='confirmed').sort((a,b)=>b.at-a.at));});
 async function claim(reportKey,requestId,owner,ttl=90000){return tx(['leases'],'readwrite',(t,done)=>{const store=t.objectStore('leases'),r=store.get(reportKey);r.onsuccess=()=>{if(r.result&&r.result.until>now()&&r.result.owner!==owner){done(false);return;}store.put({key:reportKey,requestId,owner,until:now()+ttl});done(true);};});}
 async function release(reportKey,owner){return tx(['leases'],'readwrite',(t,done)=>{const store=t.objectStore('leases'),r=store.get(reportKey);r.onsuccess=()=>{if(r.result?.owner===owner)store.delete(reportKey);done(true);};});}
 async function bindWire(record){
  const key=record.key+'|'+record.payload.requestId,digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalV2816(record.payload))))].map(n=>n.toString(16).padStart(2,'0')).join('');
  return tx(['requests'],'readwrite',(t,done)=>{const store=t.objectStore('requests'),r=store.get(key);r.onsuccess=()=>{if(r.result?.wireDigest&&r.result.wireDigest!==digest){done(false);return;}store.put({...r.result,key,wireDigest:digest});done(true);};});
 }
 async function markRequest(reportKey,requestId,state,message=''){const key=await tx(['requests'],'readonly',(t,done)=>{const r=t.objectStore('requests').get(reportKey+'|'+requestId);r.onsuccess=()=>done(r.result?.draftKey);});return mark(key,state,message);}
 const get=(key,account)=>tx(['drafts'],'readonly',(t,done)=>{const r=t.objectStore('drafts').get(key);r.onsuccess=()=>done(r.result?.account===account?r.result:null);});
 return {preserve,mark,markRequest,list,get,claim,release,bindWire};
}

// Rebase only a captured ancestor which has not yet been sent. Once a request
// has a wire binding its payload is immutable, including the base revision.
export function descendantV2816(current,ancestor,revision){
 return current?.parentRequestsV2816?.includes(ancestor.payload.requestId)&&current.sendStartedRequestIdV2816!==current.payload.requestId&&current.payload.baseRevision===ancestor.payload.baseRevision&&revision===ancestor.payload.baseRevision+1;
}
export function sameIntentV2816(left,right){const omit=value=>{const {baseRevision,fileId,expectedDriveRevision,...rest}=value;return rest;};return canonicalV2816(omit(left))===canonicalV2816(omit(right));}
