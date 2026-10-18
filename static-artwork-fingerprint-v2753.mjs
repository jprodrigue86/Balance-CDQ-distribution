// This fingerprints the static drawing graph of an already loaded PDF. It does
// not authorize reuse by family, mutate the PDF, read pixels, or parse bytes.
// A caller must catch unsupported/malformed graphs and use its normal renderer.
export const STATIC_ARTWORK_ALGORITHM_V2753='cdq-static-artwork-graph-sha256-v1';
const DEFAULT_LIMITS=Object.freeze({maxNodes:100000,maxDepth:128,maxStreamBytes:64*1024*1024,maxCanonicalBytes:16*1024*1024});
const DYNAMIC_FIELD_KEYS=new Set(['V','DV','AP','AS','I','TI','RV','Opt']);
const INHERITED_PAGE_KEYS=['Resources','MediaBox','CropBox','Rotate'];
const INHERITED_FIELD_KEYS=['FT','Ff','DA','Q','DR','MaxLen'];
const NONVISUAL_PAGE_KEYS=new Set(['Parent','Annots','LastModified','Metadata','PieceInfo','StructParents','ID','AF']);
const NONVISUAL_CATALOG_KEYS=new Set(['Pages','AcroForm','Metadata','PieceInfo','StructTreeRoot','MarkInfo','Dests','Outlines','PageLabels','SpiderInfo','Legal','Collection','AF','Perms','URI']);
const hex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
async function defaultDigest(bytes){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));}
export async function staticArtworkFingerprintV2753(pdf,L,{pageIndex=0,digest=defaultDigest,...options}={}){
 const fail=message=>{throw Error('STATIC_ARTWORK_UNSUPPORTED_V2753: '+message);};
 if(!pdf?.context||!pdf.catalog||!L?.PDFDict||!L?.PDFRef||typeof digest!=='function')fail('Loaded PDF and its exact library are required.');
 const limits={...DEFAULT_LIMITS,...options};
 for(const key of Object.keys(DEFAULT_LIMITS))if(!Number.isSafeInteger(limits[key])||limits[key]<=0||limits[key]>DEFAULT_LIMITS[key])fail('Invalid bounded graph limit.');
 const context=pdf.context,N=L.PDFName.of,resolve=value=>{
  const refs=new Set();while(value instanceof L.PDFRef){if(refs.has(value))fail('Reference-only cycle.');if(refs.size>=limits.maxDepth||refs.size>=limits.maxNodes)fail('Reference chain limit exceeded.');refs.add(value);value=context.lookup(value);if(value===undefined)fail('Unresolved reference.');}return value;
 },get=(dict,key)=>resolve(dict.get(N(key))),name=value=>value instanceof L.PDFName?value.decodeText():'';
 const pages=pdf.getPages();if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=pages.length)fail('Page index is unavailable.');
 const page=pages[pageIndex].node,fieldNodes=new WeakSet(),fieldsVisited=new WeakSet();let fieldCount=0;
 const acroForm=get(pdf.catalog,'AcroForm');if(acroForm!==undefined&&acroForm!==L.PDFNull&&!(acroForm instanceof L.PDFDict))fail('Malformed AcroForm.');
 if(acroForm instanceof L.PDFDict&&acroForm.has(N('XFA')))fail('XFA may render outside ordinary widgets.');
 function collectFields(value,depth=0){
  value=resolve(value);if(!(value instanceof L.PDFDict)||depth>limits.maxDepth)fail('Malformed field tree.');if(fieldsVisited.has(value))return;
  fieldsVisited.add(value);fieldNodes.add(value);if(++fieldCount>limits.maxNodes)fail('Field tree exceeds the graph limit.');
  const kids=get(value,'Kids');if(kids!==undefined&&kids!==L.PDFNull){if(!(kids instanceof L.PDFArray))fail('Malformed field children.');for(let i=0;i<kids.size();i++)collectFields(kids.get(i),depth+1);}
 }
 const roots=acroForm instanceof L.PDFDict?get(acroForm,'Fields'):undefined;
 if(roots!==undefined&&roots!==L.PDFNull){if(!(roots instanceof L.PDFArray))fail('Malformed form fields.');for(let i=0;i<roots.size();i++)collectFields(roots.get(i));}
 function inherited(dict,key){
  const seen=new Set();for(let i=0;dict;i++){
   if(!(dict instanceof L.PDFDict)||seen.has(dict)||i>limits.maxDepth)fail('Malformed inheritance chain.');seen.add(dict);
   if(dict.has(N(key)))return resolve(dict.get(N(key)));dict=get(dict,'Parent');if(dict===L.PDFNull)dict=undefined;
  }
 }
 const entries=dict=>dict.entries().map(([key,value])=>[key.decodeText(),value]).sort(([a],[b])=>a<b?-1:a>b?1:0);
 function fieldEntries(dict){
  // PDF.js timestamps saved Widgets with /M. That annotation date has no
  // effect on static drawing; every other field/annotation key stays audited.
  const widget=name(get(dict,'Subtype'))==='Widget';
  const effective=new Map(entries(dict).filter(([key])=>key!=='Kids'&&key!=='Parent'&&key!=='P'&&!DYNAMIC_FIELD_KEYS.has(key)&&!(widget&&key==='M')));
  for(const key of INHERITED_FIELD_KEYS){const value=inherited(dict,key);if(value!==undefined)effective.set(key,value);}
  const type=name(resolve(effective.get('FT')));if(!['Tx','Ch','Btn'].includes(type))fail('Unknown or signature widget field classification.');
  // Field flags and annotation geometry remain part of the key. Only values,
  // selection state/options and per-widget appearances are reconstructed fresh.
  return [...effective].sort(([a],[b])=>a<b?-1:a>b?1:0);
 }
 function pageEntries(dict){
  const effective=new Map(entries(dict).filter(([key])=>!NONVISUAL_PAGE_KEYS.has(key)&&!INHERITED_PAGE_KEYS.includes(key)&&!key.startsWith('CDQ')));
  for(const key of INHERITED_PAGE_KEYS){const value=inherited(dict,key);if(value!==undefined)effective.set(key,value);}
  if(!effective.has('MediaBox'))fail('Page geometry is missing.');
  const annotations=get(dict,'Annots');if(annotations!==undefined&&annotations!==L.PDFNull){if(!(annotations instanceof L.PDFArray))fail('Malformed annotation list.');effective.set('Annots',annotations);}
  return [...effective].sort(([a],[b])=>a<b?-1:a>b?1:0);
 }
 const seen=new WeakMap(),counts={nodes:0,values:0,streams:0,streamBytes:0,scalarBytes:0,widgets:0,nonWidgetAnnotations:0,fields:fieldCount};
 const annotationList=get(page,'Annots');if(annotationList instanceof L.PDFArray)for(let i=0;i<annotationList.size();i++){
  const annotation=resolve(annotationList.get(i));if(!(annotation instanceof L.PDFDict))fail('Malformed annotation.');
  if(name(get(annotation,'Subtype'))==='Widget')counts.widgets++;else counts.nonWidgetAnnotations++;
 }
 async function hash(bytes){const value=await digest(bytes);if(typeof value!=='string'||!/^[a-f0-9]{64}$/i.test(value))fail('Digest did not return a SHA-256 hex string.');return value.toLowerCase();}
 async function encode(value,depth=0){
  if(++counts.values>limits.maxNodes)fail('Encoded value limit exceeded.');
  value=resolve(value);if(depth>limits.maxDepth)fail('Graph depth exceeded.');
  if(value===undefined)return ['absent'];if(value===L.PDFNull)return ['null'];
  if(value instanceof L.PDFBool)return ['boolean',value.asBoolean()];
  if(value instanceof L.PDFNumber){const number=value.asNumber();if(!Number.isFinite(number))fail('Invalid numeric object.');return ['number',number];}
  if(value instanceof L.PDFName||value instanceof L.PDFString||value instanceof L.PDFHexString){const bytes=value.asBytes();counts.scalarBytes+=bytes.byteLength;if(counts.scalarBytes*2>limits.maxCanonicalBytes)fail('Scalar byte limit exceeded.');return [value instanceof L.PDFName?'name':'string',hex(bytes)];}
  if(typeof value!=='object'||value===null)fail('Unsupported PDF object.');
  if(seen.has(value))return ['reference',seen.get(value)];
  const id=counts.nodes++;if(counts.nodes>limits.maxNodes)fail('Graph node limit exceeded.');seen.set(value,id);
  if(value instanceof L.PDFArray){const items=[];for(let i=0;i<value.size();i++)items.push(await encode(value.get(i),depth+1));return ['array',id,items];}
  if(value instanceof L.PDFStream){
   const bytes=value.getContents();if(!(bytes instanceof Uint8Array))fail('Unknown stream byte representation.');counts.streams++;counts.streamBytes+=bytes.byteLength;if(counts.streamBytes>limits.maxStreamBytes)fail('Stream byte limit exceeded.');
   const dict=[];for(const [key,entry]of entries(value.dict))if(key!=='Length')dict.push([key,await encode(entry,depth+1)]);
   return ['stream',id,dict,bytes.byteLength,await hash(bytes)];
  }
  if(!(value instanceof L.PDFDict))fail('Unsupported PDF object class.');
  const type=name(get(value,'Type')),subtype=name(get(value,'Subtype'));let list;
  if(type==='Page')list=pageEntries(value);
  else if(type==='Catalog')list=entries(value).filter(([key])=>!NONVISUAL_CATALOG_KEYS.has(key)&&!key.startsWith('CDQ'));
  else if(subtype==='Widget'||fieldNodes.has(value))list=fieldEntries(value);
  else if(type==='Pages')fail('A rendered dependency enters the page tree.');
  else list=entries(value);
  const dict=[];for(const [key,entry]of list)dict.push([key,await encode(entry,depth+1)]);return ['dictionary',id,dict];
 }
 const formPolicy=acroForm instanceof L.PDFDict?['form-policy',await encode(get(acroForm,'NeedAppearances')??L.PDFBool.False),await encode(get(acroForm,'DA')),await encode(get(acroForm,'Q')),await encode(get(acroForm,'DR'))]:['no-form'];
 const graph=[STATIC_ARTWORK_ALGORITHM_V2753,pageIndex,pages.length,await encode(page),await encode(pdf.catalog),formPolicy];
 const canonical=new TextEncoder().encode(JSON.stringify(graph));if(canonical.byteLength>limits.maxCanonicalBytes)fail('Canonical graph limit exceeded.');
 return {algorithmVersion:STATIC_ARTWORK_ALGORITHM_V2753,fingerprint:await hash(canonical),pageIndex,pageCount:pages.length,counts:{...counts,canonicalBytes:canonical.byteLength}};
}
