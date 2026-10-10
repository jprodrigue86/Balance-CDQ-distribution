import {normalizeEditableFormOnOpen,saveEditableFormAppearance} from './reader-choice-appearance-v2572.mjs';
import {equipmentValuesV2697} from './equipment-list-v2697.mjs';
import {pdfReportConformityV2727} from './report-conformity-v2727.mjs';
import {identificationReportName} from './report-name-v2648.mjs';
import {renderBalanceListV2728} from './balance-list-renderer-v2728.mjs';

// The audited repairs are unchanged. Workers can process objects without
// yielding; the fallback keeps yielding so it does not monopolize the screen.
let library;
async function tools(worker){
 library??=import('./vendor/pdf-lib-1.17.1.min.js').then(module=>globalThis.PDFLib||module.default);
 const L=await library,scheduled=Object.create(L);
 scheduled.PDFDocument=new Proxy(L.PDFDocument,{get(target,name){
   if(!['load','create'].includes(name))return Reflect.get(target,name);
   return async(...args)=>{
    if(name==='load')args[1]={...args[1],parseSpeed:worker?Infinity:100};
    const pdf=await target[name](...args),save=pdf.save.bind(pdf);
    pdf.save=options=>save({...options,objectsPerTick:worker?Infinity:50});return pdf;
   };
 }});return scheduled;
}
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export function createPdfWorkEngineV2729({limit=96*1024*1024,worker=false}={}){
 const cache=new Map();let total=0,hits=0,executed=0,epoch=0;
 const copy=value=>({...value,...(value.info?{info:{...value.info}}:{}),...(value.bytes?{bytes:value.bytes.slice()}: {})});
 function put(key,value){const prior=cache.get(key);if(prior)total-=prior.size;cache.delete(key);const size=(value.bytes?.byteLength||0)+512+(key.length+JSON.stringify(value.info||{}).length)*2;if(size>limit)return;cache.set(key,{...value,info:value.info?{...value.info}:undefined,size});total+=size;while(total>limit&&cache.size){const first=cache.keys().next().value;total-=cache.get(first).size;cache.delete(first);}}
 function get(key){const value=cache.get(key);if(!value)return null;cache.delete(key);cache.set(key,value);hits++;return value;}
 async function summary(bytes,L){const pdf=await L.PDFDocument.load(bytes,{updateMetadata:false}),form=pdf.getForm();return {equipment:equipmentValuesV2697(form),conformity:pdfReportConformityV2727(form),name:identificationReportName(form.getFieldMaybe('identification_balance')?.getText?.())};}
 async function run(type,payload){
  const generation=epoch,current=()=>{if(generation!==epoch)throw Error('Le compte a changé.');},L=await tools(worker);current();if(type==='warm')return {ready:true};
  if(type==='list'){
   if(!Array.isArray(payload.rows)||payload.rows.length>500)throw Error('Liste de balances invalide.');
   const bytes=await renderBalanceListV2728(payload.rows,payload.name,payload.author,[],L);
   current();const pdf=await L.PDFDocument.load(bytes,{updateMetadata:false});pdf.catalog.set(L.PDFName.of('CDQBalanceListV2728'),L.PDFString.of(payload.digest));
   const output=await pdf.save({updateFieldAppearances:false});current();return {bytes:output};
  }
  const bytes=new Uint8Array(payload.bytes);
  if(bytes.length<8||bytes.length>32*1024*1024||String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('PDF invalide.');
  const hash=await digest(bytes);current();const key=type+'|'+hash+(type==='prefill'?'|'+JSON.stringify([payload.values,payload.strict,payload.onlyEmpty]):''),found=get(key);if(found)return {...copy(found),cacheHit:true};
  executed++;
  if(type==='inspect'){const info=await summary(bytes,L);current();put(key,{info});return {info};}
  if(!['open','save','prefill'].includes(type))throw Error('Traitement PDF inconnu.');
  let result;
  if(type==='prefill'){
   if(!Object.keys(payload.values||{}).every(name=>/^client_/.test(name)))throw Error('Les mesures utilisent le calculateur PDF approuvé.');
   const {fillPdf}=await import('./pdf-fill-v2523.mjs'),blob=await fillPdf(payload.values,{blob:new Blob([bytes],{type:'application/pdf'}),strict:payload.strict!==false,onlyEmpty:payload.onlyEmpty===true,library:L});result=new Uint8Array(await blob.arrayBuffer());
  }else result=new Uint8Array(await (type==='open'?normalizeEditableFormOnOpen(bytes,L):saveEditableFormAppearance(bytes,L)));
  // One inspection feeds the name, red marker and equipment list. A saved
  // output is not assumed to be stable under the next opening repair.
  current();const info=await summary(result,L),resultHash=await digest(result);current();
  put('inspect|'+resultHash,{info});put(key,{bytes:result,info});return {bytes:result.slice(),info};
 }
 return {run,clear(){epoch++;cache.clear();total=0;},stats:()=>({entries:cache.size,bytes:total,hits,executed})};
}
