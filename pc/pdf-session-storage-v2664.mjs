// Private document bytes stay in RAM unless explicitly selected offline or awaiting Drive.
export function completedWorkCopyV2664(c) {
  return !!c && c.kind !== 'prepared' && c.kind !== 'sheet' && !!c.driveId &&
    c.status === 'synced' && !c.error && (c.uploadId || '') === (c.syncedUploadId || '');
}

export function decodePdfRecordV2664(raw){
  if(!raw)return raw;const r={...raw};
  if(raw.pdfBytesV2664 instanceof ArrayBuffer)r.blob=new Blob([raw.pdfBytesV2664],{type:raw.pdfTypeV2664||'application/pdf'});
  if(raw.templateBytesV2664 instanceof ArrayBuffer)r.templateBlob=new Blob([raw.templateBytesV2664],{type:'application/pdf'});
  if(raw.templateSameV2664)r.templateBlob=r.blob;
  delete r.pdfBytesV2664;delete r.pdfTypeV2664;delete r.templateBytesV2664;delete r.templateSameV2664;return r;
}

export async function encodePdfRecordV2664(value){
  const r={...value};
  if(value.blob instanceof Blob){r.pdfBytesV2664=await value.blob.arrayBuffer();r.pdfTypeV2664=value.blob.type;r.blob=null;}
  if(value.templateBlob instanceof Blob){
    if(value.templateBlob===value.blob)r.templateSameV2664=true;
    else r.templateBytesV2664=await value.templateBlob.arrayBuffer();
    r.templateBlob=null;
  }
  return r;
}

export function createPdfSessionStoreV2664({read,write,remove,list,keyOf,sessionOnly,keep=()=>false,limit=96*1024*1024}) {
  const memory=new Map(),jobs=new Map();let bytes=0,generation=0;
  const size=r=>(r?.blob?.size||0)+(r?.templateBlob!==r?.blob?(r?.templateBlob?.size||0):0);
  async function independent(value){
    if(!(value?.blob instanceof Blob)&&!(value?.templateBlob instanceof Blob))return value;
    const r={...value};
    if(value.blob instanceof Blob)r.blob=new Blob([await value.blob.arrayBuffer()],{type:value.blob.type});
    if(value.templateBlob instanceof Blob)r.templateBlob=value.templateBlob===value.blob?r.blob:new Blob([await value.templateBlob.arrayBuffer()],{type:value.templateBlob.type});
    return r;
  }
  function forget(key){const old=memory.get(key);if(old){bytes-=size(old);memory.delete(key);}}
  function remember(key,value){
    forget(key);memory.set(key,value);bytes+=size(value);
    for(const [id] of memory){if(bytes<=limit)break;if(id!==key&&!keep(id))forget(id);}
  }
  function serial(key,fn){
    const p=(jobs.get(key)||Promise.resolve()).catch(()=>{}).then(fn);jobs.set(key,p);
    p.finally(()=>{if(jobs.get(key)===p)jobs.delete(key);}).catch(()=>{});return p;
  }
  async function readCurrent(key){
    if(memory.has(key)){const r=memory.get(key);remember(key,r);return r;}
    const stamp=generation,raw=await read(key);
    if(!raw||raw.cdqSessionOnlyV2664)return null;
    // Detach bytes from IndexedDB before deleting the persistent Blob resource.
    const r=await independent(decodePdfRecordV2664(raw));
    if(sessionOnly(r)){if(stamp===generation)remember(key,r);await remove(key,r);}
    return r;
  }
  async function commit(key,value){
    // Read each Blob once. Decode the encoded bytes into detached RAM Blobs,
    // and reuse those same bytes for durable WebKit-compatible storage.
    const stamp=generation,encoded=await encodePdfRecordV2664(value),record=decodePdfRecordV2664(encoded);
    if(sessionOnly(value)){
      // Confirmed bytes can leave disk only after the full record is available in RAM.
      if(stamp===generation)remember(key,record);await remove(key,record);
    }else{
      // ArrayBuffer storage also works in WebKit environments rejecting IDB Blobs.
      await write(key,encoded);if(stamp===generation)forget(key);
    }
    return record;
  }
  return {
    get:key=>serial(key,()=>readCurrent(key)),
    put:(key,value)=>serial(key,()=>commit(key,value)),
    update:(key,fn)=>serial(key,async()=>{const r=await fn(await readCurrent(key));return r?commit(key,r):null;}),
    remove:key=>serial(key,async()=>{await remove(key);forget(key);}),
    all:async()=>{
      const raw=await list(),keys=new Set([...raw.map(keyOf),...memory.keys()]);
      return (await Promise.all([...keys].map(key=>serial(key,()=>readCurrent(key))))).filter(Boolean);
    },
    clear:()=>{generation++;memory.clear();bytes=0;},
    stats:()=>({entries:memory.size,bytes})
  };
}

export function sessionCopyStorageV2664(storage,keep) {
  const cache=createPdfSessionStoreV2664({
    read:id=>storage.get('copies',id),write:(_,r)=>storage.put('copies',r),
    remove:(id,r)=>storage.remove?storage.remove('copies',id):storage.put('copies',{id,email:r?.email,cdqSessionOnlyV2664:true}),
    list:()=>storage.all('copies'),keyOf:r=>r.id,sessionOnly:completedWorkCopyV2664,keep
  });
  return {
    get:(s,id)=>s==='copies'?cache.get(id):storage.get(s,id),
    put:(s,r)=>s==='copies'?cache.put(r.id,r):storage.put(s,r),
    all:s=>s==='copies'?cache.all():storage.all(s),
    clear:cache.clear
  };
}

