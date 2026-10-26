import {REPORT_TEMPLATES} from './report-templates-v2636.mjs';
import {REPORT_ENGINE_TEMPLATES_V2754,LEGACY_REPORT_ENGINE_TEMPLATES_V2754,CYAN30_REPORT_ENGINE_TEMPLATES_V2754,T05_R1_REPORT_ENGINE_TEMPLATES_V2754,VISUAL2787_REPORT_ENGINE_TEMPLATES_V2754} from './report-engine-templates-v2754.mjs';

// Historical blank masters are public, immutable assets, never customer PDFs.
// Their authority is the packaged server registry, not a path supplied by a caller.
const archiveRoot='https://raw.githubusercontent.com/jprodrigue86/Balance-CDQ-distribution/';
const archives=[
  [VISUAL2787_REPORT_ENGINE_TEMPLATES_V2754,'ade33c154d13d1f1813248d16ce5e1120057a378',meta=>meta.sourcePath],
  [T05_R1_REPORT_ENGINE_TEMPLATES_V2754,'c6155a4287991e270dd2f4811dcb481ae8179fe2',meta=>meta.sourcePath],
  [CYAN30_REPORT_ENGINE_TEMPLATES_V2754,'cf9799f06b1f3761558f8dbce6cc6e3d2b181ed4',meta=>'templates/v2760-cyan30/'+meta.path.split('/').at(-1).replace(/\.pdf$/,'-cyan30.pdf')],
  [LEGACY_REPORT_ENGINE_TEMPLATES_V2754,'525b333bae2d91c9d81d3fab7d2c72544cf4b115',meta=>'pc/'+meta.path],
];
const cache=new Map(),pending=new Map(),cacheLimit=16*1024*1024;
let cachedBytes=0;
const canonicalFamily=family=>family==='cuve3'?'cuve4':family==='tremie3'?'tremie4':family;
const invalid=()=>Error('Le modèle exact de ce rapport n’est pas reconnu. Ses réponses restent conservées.');
export function pinnedReportTemplateV2788(expected,{family=expected?.modeleId}={}){
  const key=expected?.modeleId;
  if(typeof key!=='string'||!Object.hasOwn(REPORT_TEMPLATES,key)||expected?.version!==2754||!/^[a-f0-9]{64}$/.test(expected?.sha256||'')||canonicalFamily(family)!==key)throw invalid();
  const matches=meta=>meta&&meta.modeleId===key&&meta.sha256===expected.sha256&&meta.version===expected.version;
  const current=REPORT_ENGINE_TEMPLATES_V2754[key],local=REPORT_TEMPLATES[key];
  if(matches(current)&&local.sha256===current.sha256&&local.taille===current.taille)return Object.freeze({...current,url:new URL('./'+local.path,import.meta.url).href});
  for(const [catalog,commit,source]of archives){
    const meta=catalog[key];
    if(matches(meta))return Object.freeze({...meta,url:archiveRoot+commit+'/'+source(meta)});
  }
  throw invalid();
}
async function authenticatedBlob(blob,meta,checkCurrent){
  checkCurrent();
  if(!(blob instanceof Blob)||blob.type!=='application/pdf'||blob.size!==meta.taille)return null;
  const bytes=await blob.arrayBuffer();checkCurrent();
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return null;
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');checkCurrent();
  return sha===meta.sha256?blob:null;
}
export async function authenticatePinnedReportBlobV2788(blob,expected,{family=expected?.modeleId,checkCurrent=()=>{}}={}){
  const meta=pinnedReportTemplateV2788(expected,{family});
  return authenticatedBlob(blob,meta,checkCurrent);
}
export async function loadPinnedReportTemplateV2788(expected,{family=expected?.modeleId,checkCurrent=()=>{},fetchPdf=fetch,blob=null}={}){
  checkCurrent();
  const meta=pinnedReportTemplateV2788(expected,{family}),key=meta.modeleId+':'+meta.sha256;
  // A host must authenticate the incoming bytes itself, even when Selector
  // already checked them. An exact Blob avoids a second asset retrieval.
  const supplied=await authenticatedBlob(blob,meta,checkCurrent);checkCurrent();
  if(supplied)return Object.freeze({...meta,blob:supplied});
  if(cache.has(key)){const saved=cache.get(key);cache.delete(key);cache.set(key,saved);return Object.freeze({...meta,blob:saved});}
  if(!pending.has(key))pending.set(key,(async()=>{
    const response=await fetchPdf(meta.url);
    if(!response.ok)throw Error('Le modèle historique exact est indisponible. Réessayez avec une connexion.');
    const bytes=await response.arrayBuffer();
    const downloaded=new Blob([bytes],{type:'application/pdf'});
    if(!await authenticatedBlob(downloaded,meta,()=>{}))throw Error('Le modèle PDF reçu est incomplet ou son empreinte est invalide.');
    cache.set(key,downloaded);cachedBytes+=downloaded.size;
    while(cachedBytes>cacheLimit){const oldest=cache.keys().next().value;cachedBytes-=cache.get(oldest).size;cache.delete(oldest);}
    return downloaded;
  })().finally(()=>pending.delete(key)));
  const loaded=await pending.get(key);checkCurrent();
  return Object.freeze({...meta,blob:loaded});
}
