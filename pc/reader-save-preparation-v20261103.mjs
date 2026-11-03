// A single immutable preparation for one exact live document revision.
// No write, validation, WillSave action or durable acknowledgement happens here.
const stale=()=>Object.assign(Error('Les réponses ont changé pendant la préparation du PDF.'),{code:'STALE_SAVE_PREPARATION'});
const same=(left,right)=>!!left&&!!right&&left.reusable!==false&&right.reusable!==false&&left.owner===right.owner&&left.key===right.key;
// PDF.js 6.3.289 exposes the complete values sent to its writer here. Include
// appearance-only sandbox changes too; a field-value counter is insufficient.
// Unsupported annotation editors/bitmaps keep the ordinary foreground path.
export function annotationStateKeyV20261103(storage){
  try{
    const serialized=storage?.serializable;
    if(!serialized||serialized.transfer?.length)return null;
    if(serialized.map===null)return '[]';
    if(!(serialized.map instanceof Map))return null;
    const seen=new Set();
    function plain(value){
      if(value===undefined)return ['undefined'];
      if(value===null||typeof value==='string'||typeof value==='boolean')return value;
      if(typeof value==='number'&&Number.isFinite(value))return value;
      if(!value||typeof value!=='object'||seen.has(value))throw Error('Unsupported annotation value');
      seen.add(value);let out;
      if(Array.isArray(value))out=value.map(plain);
      else if(ArrayBuffer.isView(value))out=['bytes',value.constructor.name,...new Uint8Array(value.buffer,value.byteOffset,value.byteLength)];
      else{
        const prototype=Object.getPrototypeOf(value);
        if(prototype!==Object.prototype&&prototype!==null)throw Error('Unsupported annotation object');
        out=Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,plain(item)]);
      }
      seen.delete(value);return out;
    }
    const key=JSON.stringify([...serialized.map].sort(([a],[b])=>String(a).localeCompare(String(b))).map(([id,value])=>[id,plain(value)]));
    return key.length<=1024*1024?key:null;
  }catch{return null;}
}
export function createReaderSavePreparationV20261103({isCurrent,prepare}={}){
  if(typeof isCurrent!=='function'||typeof prepare!=='function')throw TypeError('Préparation PDF incomplète.');
  let active=null,ready=null,generation=0;
  const stats={prepared:0,reused:0,joined:0,discarded:0};
  const current=(identity,stamp)=>stamp===generation&&isCurrent(identity);
  async function get(identity){
    const stamp=generation;
    if(!current(identity,stamp))throw stale();
    if(same(ready?.identity,identity)){stats.reused++;return ready.value;}
    ready=null; // Do not retain a previous PDF while preparing its replacement.
    if(active){
      if(active.stamp===stamp&&same(active.identity,identity)){stats.joined++;return active.promise;}
      // PDF.js serializes a document and resets its modification notification.
      // Never overlap two serializations, even when a stale job is being drained.
      await active.promise.catch(()=>{});
      if(!current(identity,stamp))throw stale();
      return get(identity);
    }
    const check=()=>{if(!current(identity,stamp))throw stale();};
    const job={identity,stamp,promise:null};
    active=job;
    job.promise=Promise.resolve().then(async()=>{
      check();const value=await prepare(identity,check);check();
      if(identity.reusable!==false)ready={identity,value};stats.prepared++;return value;
    }).catch(error=>{if(error?.code==='STALE_SAVE_PREPARATION')stats.discarded++;throw error;}).finally(()=>{if(active===job)active=null;});
    return job.promise;
  }
  return {
    get,
    clear(){generation++;ready=null;},
    stats:()=>({...stats,pending:!!active,ready:!!ready})
  };
}
