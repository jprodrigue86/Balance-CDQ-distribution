// Keep the deployed v1 database compatible with already-open windows and rollback.
// Pending lookups hydrate only the outbox; metadata retains one PDF at a time.
const NAME='cdq-report-engine-v2754',VERSION=1;
const contextKeys=['engine','reportId','clientId','destinationId','fileId','family','template','baseRevision','expectedDriveRevision'];
export function reportMetadataV20261028(record){
 const context=Object.fromEntries(contextKeys.filter(k=>record.context?.[k]!==undefined).map(k=>[k,record.context[k]]));
 return {key:record.key,account:record.account,context,
  ...Object.fromEntries(['name','pending','dataSaved','blocked','error','pdf','serverRevision','savedAt','deleted','deleteAck','remoteDeletedV2784','restoredFromReportId','restoredFromRevision'].filter(k=>record[k]!==undefined).map(k=>[k,record[k]])),
  payload:{requestId:record.payload?.requestId},clientKey:[record.account,context.clientId||''],
  fileKeys:[...new Set([context.fileId,record.pdf?.fileId].filter(Boolean))].map(id=>record.account+'|'+id)};
}
export function createReportEngineStorageV20261028({factory=globalThis.indexedDB,ranges=globalThis.IDBKeyRange}={}){
 function open(){return new Promise((resolve,reject)=>{
  let abandoned=false;const request=factory.open(NAME,VERSION);
  request.onupgradeneeded=()=>{
   const db=request.result;
   for(const name of ['reports','outbox'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'key'});
  };
  request.onblocked=()=>{abandoned=true;reject(Object.assign(Error('Une autre fenêtre CDQ utilise encore le stockage. Fermez cette fenêtre après avoir conservé son travail, puis réessayez.'),{code:'LOCAL_UPGRADE_BLOCKED'}));};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();if(abandoned){db.close();return;}resolve(db);};
  request.onerror=()=>reject(request.error||Error('Stockage local indisponible.'));
 });}
 async function transaction(stores,mode,read){
  const db=await open();return new Promise((resolve,reject)=>{
   let result,tx;
   try{tx=db.transaction(stores,mode);read(tx,value=>result=value);}
   catch(error){try{tx?.abort();}catch{}db.close();reject(error);return;}
   tx.oncomplete=()=>{db.close();resolve(result);};
   tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error(mode==='readwrite'?'Enregistrement local impossible. Le rapport reste ouvert.':'Lecture locale impossible.'));};
  });
 }
 const ownerRange=account=>ranges.bound(account+'|',account+'|\uffff');
 return {
  get:key=>transaction(['reports'],'readonly',(tx,done)=>{const request=tx.objectStore('reports').get(key);request.onsuccess=()=>done(request.result||null);}),
  all:account=>transaction(['reports'],'readonly',(tx,done)=>{const request=tx.objectStore('reports').getAll(account?ownerRange(account):undefined);request.onsuccess=()=>done(request.result||[]);}),
  metadata:(account,clientId)=>transaction(['reports'],'readonly',(tx,done)=>{
   const result=[];done(result);const request=tx.objectStore('reports').openCursor(ownerRange(account));
   request.onsuccess=()=>{const row=request.result;if(!row)return;const record=row.value;if(record.account===account&&(!clientId||record.context?.clientId===clientId))result.push(reportMetadataV20261028(record));row.continue();};
  }),
  byFileId:(account,fileId)=>transaction(['reports'],'readonly',(tx,done)=>{
   done(null);const request=tx.objectStore('reports').openCursor(ownerRange(account));
   request.onsuccess=()=>{const row=request.result;if(!row)return;const record=row.value;if(record.account===account&&(record.context?.fileId===fileId||record.pdf?.fileId===fileId)){done(record);return;}row.continue();};
  }),
  pending:(account,reportIds)=>transaction(['outbox','reports'],'readonly',(tx,done)=>{
   const result=[];done(result);const read=keys=>{for(const key of keys){const request=tx.objectStore('reports').get(key);request.onsuccess=()=>{const record=request.result;if(record?.account===account&&record.pending)result.push(record);};}};
   if(Array.isArray(reportIds))read([...new Set(reportIds)].map(id=>account+'|'+id));
   else{const request=tx.objectStore('outbox').getAllKeys(ownerRange(account));request.onsuccess=()=>read(request.result);}
  }),
  commit:(record,pending=true)=>transaction(['reports','outbox'],'readwrite',(tx,done)=>{
   tx.objectStore('reports').put(record);
   if(pending)tx.objectStore('outbox').put({key:record.key,requestId:record.payload.requestId});else tx.objectStore('outbox').delete(record.key);done(record);
  })
 };
}
