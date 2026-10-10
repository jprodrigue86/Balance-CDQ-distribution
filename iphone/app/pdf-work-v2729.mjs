// One worker per installed shell, reused by the reader, names and list scans.
const hashPdfWorkBytesV2729=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export function createPdfWorkV2729({workerFactory=()=>new Worker(new URL('./pdf-work-worker-v2729.mjs',import.meta.url),{type:'module'}),fallback=null,timeoutMs=60000,openCacheLimit=16*1024*1024,hashBytes=hashPdfWorkBytesV2729}={}){
 const jobs=new Map(),openCache=new Map(),openInflight=new Map(),cacheLimit=Math.min(16*1024*1024,Math.max(0,Number(openCacheLimit)||0));let worker=null,serial=0,epoch=0,unavailable=false,lastStats=null,fallbackEngine=null,fallbackQueue=[],fallbackPump=null,preparedBytes=0,preparedHits=0;
 const priority=job=>job.payload?.prime?3:['open','save','prefill'].includes(job.type)?0:job.type==='list'?1:2;
 const copyResult=result=>({...result,...(result.bytes instanceof Uint8Array?{bytes:result.bytes.slice()}:{}),...(result.info?{info:{...result.info}}:{}),...(result.stats?{stats:{...result.stats}}:{})});
 function current(job){if(job.generation!==epoch||jobs.get(job.id)!==job)throw Error('Le compte a changé.');if(!job.valid())throw Error('Le contexte a changé.');}
 function cachedOpen(key){const entry=openCache.get(key);if(!entry)return null;openCache.delete(key);openCache.set(key,entry);preparedHits++;return {...entry.result,...(lastStats?{stats:{...lastStats}}:{}),cacheHit:true,serviceCacheHit:true};}
 function cacheOpen(key,result){
  if(!(result.bytes instanceof Uint8Array))return;
  const prior=openCache.get(key);if(prior){openCache.delete(key);openCache.set(key,prior);return;}
  const size=result.bytes.byteLength+512+(key.length+JSON.stringify({...result,bytes:undefined}).length)*2;
  if(size>cacheLimit)return;
  openCache.set(key,{result:copyResult(result),size});preparedBytes+=size;
  while(preparedBytes>cacheLimit){const first=openCache.keys().next().value;preparedBytes-=openCache.get(first).size;openCache.delete(first);}
 }
 function terminate(){const old=worker;worker=null;try{old?.terminate();}catch{}}
 function stop(message){terminate();epoch++;unavailable=false;fallbackQueue=[];fallbackPump=null;for(const job of jobs.values()){clearTimeout(job.timer);job.reject(Error(message));}jobs.clear();openCache.clear();openInflight.clear();preparedBytes=0;fallbackEngine?.clear();fallbackEngine=null;lastStats=null;}
 function finish(job,result,error){
  if(jobs.get(job.id)!==job||job.generation!==epoch)return;
  const group=job.group,followers=group?.leader===job?[...group.followers]:[];group?.followers.delete(job);if(group?.leader===job&&openInflight.get(job.openKey)===group)openInflight.delete(job.openKey);
  let failure=error;if(!failure){try{current(job);if(!result||typeof result!=='object')throw Error('Réponse PDF invalide.');if(job.openKey&&!job.cached)cacheOpen(job.openKey,result);}catch(problem){failure=problem;}}
  jobs.delete(job.id);clearTimeout(job.timer);if(failure)job.reject(failure);else{if(!job.cached)lastStats=result.stats||lastStats;job.resolve(job.type==='open'?copyResult(result):result);}
  // Resolve every subscriber with its own bytes before any caller can mutate
  // a shared promise's result. Each subscriber retains its own context check.
  for(const follower of followers)finish(follower,result,error);
 }
 function deadline(job){return setTimeout(()=>{if(jobs.get(job.id)!==job)return;const message='Le traitement du PDF n’a pas terminé. Vos réponses restent dans le lecteur.';
  if(job.started){stop(message);return;}
  // An old secondary scan waiting behind foreground work may expire without
  // destroying the worker or cancelling the user's current save.
  finish(job,null,Error(message));fallbackQueue=fallbackQueue.filter(waiting=>waiting!==job);queueMicrotask(()=>void pumpFallback());if(job.mode==='worker')try{worker?.postMessage({id:job.id,type:'cancel'});}catch{failed(worker);}
 },timeoutMs);}
 function started(job){job.started=true;clearTimeout(job.timer);job.timer=deadline(job);}
 async function runFallback(job){
  if(fallback)return fallback(job.type,job.payload);
  const {createPdfWorkEngineV2729}=await import('./pdf-work-engine-v2729.mjs');
  if(job.generation!==epoch)throw Error('Le compte a changé.');
  // A failed worker must not turn several simultaneous inspections into
  // unlimited, non-yielding PDF parses on the screen's own thread.
  const engine=fallbackEngine??=createPdfWorkEngineV2729({worker:false,limit:80*1024*1024}),result=await engine.run(job.type,job.payload);
  return {...result,stats:engine.stats()};
 }
 async function pumpFallback(){
  if(fallbackPump)return;const token={generation:epoch};fallbackPump=token;
  try{while(token.generation===epoch&&fallbackQueue.length){fallbackQueue.sort((a,b)=>priority(a)-priority(b)||a.order-b.order);if([...jobs.values()].some(job=>job.mode==='hash'&&priority(job)<priority(fallbackQueue[0])))break;const job=fallbackQueue.shift();if(jobs.get(job.id)!==job)continue;
   started(job);try{finish(job,await runFallback(job));}catch(error){finish(job,null,error);}
  }}finally{if(fallbackPump===token)fallbackPump=null;}
 }
 function enqueueFallback(job){fallbackQueue.push(job);queueMicrotask(()=>void pumpFallback());}
 function failed(instance){if(instance&&worker!==instance)return;terminate();unavailable=true;for(const job of jobs.values())if(job.mode==='worker'){job.mode='fallback';job.started=false;clearTimeout(job.timer);job.timer=deadline(job);enqueueFallback(job);}}
 function start(){if(worker||unavailable)return;let instance;try{instance=workerFactory();worker=instance;instance.onmessage=event=>{if(worker!==instance)return;const {id,ok,result,error}=event.data||{},job=jobs.get(id);if(!job)return;if(event.data.started===true){started(job);return;}finish(job,result,ok?null:Error(error||'Traitement PDF impossible.'));};instance.onerror=event=>{event.preventDefault?.();failed(instance);};instance.onmessageerror=()=>failed(instance);}catch{failed(instance);}}
 function dispatch(job){job.mode=unavailable?'fallback':'worker';if(unavailable)enqueueFallback(job);else try{worker.postMessage({id:job.id,type:job.type,payload:job.payload});}catch{failed(worker);}}
 async function prepareOpen(job){
  try{
   current(job);
   // Capture before hashing, and send that exact snapshot. The caller may
   // reuse or change its buffer while the asynchronous digest is pending.
   const source=job.payload.bytes,bytes=(ArrayBuffer.isView(source)?new Uint8Array(source.buffer,source.byteOffset,source.byteLength):new Uint8Array(source)).slice(),key='open|'+await hashBytes(bytes);current(job);job.openKey=key;job.payload={...job.payload,bytes};
   const cached=cachedOpen(key);if(cached){job.cached=true;finish(job,cached);return;}
   const prior=openInflight.get(key);if(prior&&jobs.get(prior.leader.id)===prior.leader){job.mode='shared';job.group=prior;prior.followers.add(job);
    if(priority(job)<priority(prior.leader)){const leader=prior.leader;leader.payload={...leader.payload,prime:false};if(!leader.started){clearTimeout(leader.timer);leader.timer=deadline(leader);if(leader.mode==='worker')try{worker.postMessage({id:leader.id,type:'promote',priority:0});}catch{failed(worker);}}}
    return;
   }
   const group={leader:job,followers:new Set()};job.group=group;openInflight.set(key,group);dispatch(job);
  }catch(error){finish(job,null,error);}finally{queueMicrotask(()=>void pumpFallback());}
 }
 function request(type,payload={},options={}){
  const generation=options.epoch??epoch,valid=options.valid||(()=>true);
  try{if(generation!==epoch)throw Error('Le compte a changé.');if(!valid())throw Error('Le contexte a changé.');}catch(error){return Promise.reject(error);}
  start();
  return new Promise((resolve,reject)=>{const id=String(++serial),job={id,order:serial,generation,type,payload,resolve,reject,valid,started:false,mode:type==='open'?'hash':unavailable?'fallback':'worker'};jobs.set(id,job);job.timer=deadline(job);if(type==='open')void prepareOpen(job);else dispatch(job);});
 }
 async function requestBlob(type,blob,payload={},options={}){
  const generation=options.epoch??epoch,valid=options.valid||(()=>true);
  if(generation!==epoch)throw Error('Le compte a changé.');if(!valid())throw Error('Le contexte a changé.');
  const bytes=await blob.arrayBuffer();return request(type,{...payload,bytes},{epoch:generation,valid});
 }
 async function inspect(blob){return (await requestBlob('inspect',blob)).info;}
 return {request,requestBlob,warm:()=>request('warm'),inspect,clear:()=>stop('Le compte ou l’accès Drive a changé.'),stats:()=>({...lastStats,worker:!!worker,pending:jobs.size,epoch,preparedEntries:openCache.size,preparedBytes,preparedHits,totalCacheBytes:(lastStats?.bytes||0)+preparedBytes})};
}
let local;
export function pdfWorkV2729(){
 if(typeof window==='undefined')return null;
 try{if(window.parent!==window&&window.parent.location.origin===location.origin&&window.parent.cdqPdfWorkV2729)return window.parent.cdqPdfWorkV2729;}catch{}
 if(!local){local=createPdfWorkV2729();window.cdqPdfWorkV2729=local;window.addEventListener('pagehide',()=>local.clear());}
 return local;
}
export async function inspectPdfV2729(blob,L){const worker=pdfWorkV2729();if(worker)return worker.inspect(blob);const pdf=await L.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});return {pdf};}
