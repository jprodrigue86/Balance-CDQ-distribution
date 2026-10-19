import {BUNDLED_OPENING_MANIFEST_V2753} from './reader-bundled-opening-manifest-v2753.mjs';
import {REPORT_TEMPLATES} from './report-templates-v2636.mjs';

const sha=/^[a-f0-9]{64}$/;
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
const encoded=value=>new TextEncoder().encode(JSON.stringify(value));
const pdf=bytes=>bytes instanceof Uint8Array&&bytes.length>=8&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const snapshot=value=>{try{return JSON.parse(JSON.stringify(value));}catch{return null;}};
const asset=value=>record(value)&&Number.isSafeInteger(value.bytes)&&value.bytes>=8&&value.bytes<=32*1024*1024&&sha.test(value.sha256)&&typeof value.path==='string';

async function loadAsset(path,expectedBytes,{signal}={}){
 const response=await fetch(new URL(path,import.meta.url),{cache:'force-cache',credentials:'same-origin',redirect:'error',signal});
 if(!response.ok)throw Error('Bundled opening asset unavailable');
 const length=response.headers?.get('content-length'),encoding=response.headers?.get('content-encoding');if(length&&(!encoding||encoding==='identity')&&Number(length)!==expectedBytes)throw Error('Bundled opening asset size changed');
 if(!response.body?.getReader)return new Uint8Array(await response.arrayBuffer());
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>expectedBytes)throw Error('Bundled opening asset is too large');chunks.push(value);}}
 catch(error){try{await reader.cancel();}catch{}throw error;}
 finally{reader.releaseLock();}
 if(total!==expectedBytes)throw Error('Bundled opening asset is incomplete');
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}

// The generated host pin and manifest share the verified package's trust
// boundary. Qualification authenticates the complete emitted OPEN module graph;
// report opening performs no network checks of executable module sources.
export function createBundledOpeningV2753({pin,manifest=BUNDLED_OPENING_MANIFEST_V2753,catalog=REPORT_TEMPLATES,hashBytes=digest,loadBytes=loadAsset,cacheLimit=16*1024*1024,fetchBudgetMs=200}={}){
 // No exported nested manifest/catalog object is retained across an await.
 pin=snapshot(pin);manifest=snapshot(manifest);catalog=snapshot(catalog);
 const limit=Math.min(16*1024*1024,Math.max(0,Number(cacheLimit)||0)),cache=new Map(),pending=new Map();let size=0,verified=null;
 async function verify(){
  if(!record(pin)||!record(manifest)||manifest.version!==2753||typeof pin.build!=='string'||pin.build!==manifest.build||!sha.test(pin.manifestSha256)||!sha.test(pin.normalizerSha256)||pin.normalizerSha256!==manifest.normalizer?.sha256||!record(catalog)||!record(manifest.families)||Object.keys(catalog).length!==12||Object.keys(manifest.families).sort().join()!==Object.keys(catalog).sort().join())return null;
  if(await hashBytes(encoded(manifest))!==pin.manifestSha256||await hashBytes(encoded(catalog))!==manifest.catalogSha256)return null;
  for(const [family,value]of Object.entries(manifest.families)){
   const meta=catalog[family];if(!/^[a-z][a-z0-9_-]{0,39}$/.test(family)||!record(value)||value.fixedPoint!==true||!asset(value.source)||!asset(value.normalized)||value.source.path!==meta.path||value.source.bytes!==meta.taille||value.source.sha256!==meta.sha256||!new RegExp('^assets/reader-opening-v2753/'+family+'-'+value.normalized.sha256+'\\.pdf$').test(value.normalized.path))return null;
  }
  return manifest;
 }
 const trusted=()=>verified??=(verify().catch(()=>null));
 async function derivative(meta,budgetMs=fetchBudgetMs){
  const key=meta.sha256,hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit.blob;}
  if(pending.has(key))return pending.get(key);
  // A missing service-worker asset must never turn a local report opening
  // into an unbounded download. Fall back to the existing worker repair.
  const controller=new AbortController();let timer;
  const job=Promise.resolve().then(async()=>{try{
   const received=await Promise.race([Promise.resolve().then(()=>loadBytes(meta.path,meta.bytes,{signal:controller.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Bundled opening asset timed out'));},Math.min(1000,Math.max(1,Number(budgetMs)||200)));})]),bytes=received instanceof Uint8Array?received.slice():null;if(!pdf(bytes)||bytes.length!==meta.bytes||await hashBytes(bytes)!==meta.sha256)return null;
   const blob=new Blob([bytes],{type:'application/pdf'});
   if(blob.size<=limit){cache.set(key,{blob,bytes:blob.size});size+=blob.size;while(size>limit&&cache.size){const oldest=cache.keys().next().value;size-=cache.get(oldest).bytes;cache.delete(oldest);}}
   return blob;
  }catch{controller.abort();return null;}finally{clearTimeout(timer);pending.delete(key);}});pending.set(key,job);return job;
 }
 return {async prepare(blob,{epoch,getEpoch,checkCurrent=()=>{},fetchBudgetMs:requestBudgetMs}={}){
  if(!Number.isInteger(epoch)||epoch<0||typeof getEpoch!=='function')return null;
  const guard=()=>{if(getEpoch()!==epoch)throw Error('Le compte ou l’accès Drive a changé.');checkCurrent();};guard();
  if(!(blob instanceof Blob)||blob.size<8||blob.size>32*1024*1024)return null;
  const index=await trusted();guard();if(!index)return null;
  const candidates=Object.values(index.families).filter(value=>value.source.bytes===blob.size);if(!candidates.length)return null;
  let bytes;try{bytes=new Uint8Array(await blob.arrayBuffer());}catch{guard();return null;}guard();
  if(!pdf(bytes)||bytes.length!==blob.size)return null;
  let sourceSha;try{sourceSha=await hashBytes(bytes);}catch{guard();return null;}guard();
  const match=candidates.find(value=>value.source.sha256===sourceSha);if(!match)return null;
  const normalized=await derivative(match.normalized,requestBudgetMs);guard();
  return normalized?{blob:normalized,normalized:true,preparedEpoch:epoch,sourceSha256:sourceSha,normalizedSha256:match.normalized.sha256}:null;
 }};
}
