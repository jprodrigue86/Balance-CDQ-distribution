// Only scan position and device metadata are saved, never document bytes.
export function createCalibrationScan({storage,owner,canRead,rpc,readPdf,retain,notify=()=>{}}){
 let running=false,checkpoint=null,currentOwner='';
 const key=id=>'cdqCalibrationScanV2668:'+id;
 function sync(){const id=owner();if(id!==currentOwner){currentOwner=id;checkpoint=null;try{const saved=JSON.parse(storage.getItem(key(id))||'null');if(saved?.schema===1&&saved.owner===id&&Array.isArray(saved.clients))checkpoint=saved;}catch{}}return checkpoint;}
 function save(){storage.setItem(key(currentOwner),JSON.stringify(checkpoint));notify(snapshot());}
 function snapshot(){sync();return {running,checkpoint:checkpoint?JSON.parse(JSON.stringify(checkpoint)):null};}
 async function run(clients,{restart=false}={}){
  if(running)return;sync();const id=owner();if(!id||!canRead())throw Error('Accès Drive requis.');
  if(restart||!checkpoint||checkpoint.done){const clean=Array.from(new Map((clients||[]).filter(c=>c.id).map(c=>[String(c.id),{id:String(c.id),nom:String(c.nom||'')}])).values());if(!clean.length)throw Error('La liste des clients n’est pas encore chargée.');checkpoint={schema:1,owner:id,clients:clean,index:0,cursor:null,checked:0,warnings:[],done:false,error:'',startedAt:new Date().toISOString()};}
  const work=checkpoint,valid=()=>owner()===id&&canRead()&&checkpoint===work;
  running=true;work.error='';
  try{save();while(work.index<work.clients.length){
   if(!valid())throw Error('Le compte a changé.');
   const client=work.clients[work.index],result=await rpc('cdqScannerCalibrationV2668',client.id,work.cursor);
   if(!valid())throw Error('Le compte a changé.');
   if(result?.ok!==true||!Number.isSafeInteger(result.checkedCount)||result.checkedCount<0||!Array.isArray(result.items)||!Array.isArray(result.pdfs)||!(result.next===null||result.next&&typeof result.next==='object'))throw Error('La réponse du scan est invalide. Mettez le serveur à jour.');
   const items=[...result.items],warnings=[...(result.warnings||[])];
   for(const file of result.pdfs){const parsed=await readPdf(file);if(!valid())throw Error('Le compte a changé.');items.push(...parsed.items);if(parsed.warning)warnings.push({fileId:file.id,name:file.name,message:parsed.warning});}
   // Commit a complete batch only. A failed transfer is retried at this cursor.
   await retain(items);if(!valid())throw Error('Le compte a changé.');
   work.checked+=result.checkedCount;work.warnings.push(...warnings.map(w=>({...w,clientId:client.id})));work.cursor=result.next;
   if(result.next===null){work.index++;work.cursor=null;}save();
  }work.done=true;work.error='';save();}
  catch(e){if(valid()){work.error=String(e.message||e);save();}throw e;}
  finally{running=false;notify(snapshot());}
 }
 return {snapshot,run};
}

const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const useful=v=>!!String(v||'').trim()&&!/^(?:[-–—]+|n\/?a|true|false|vrai|faux)$/i.test(String(v).trim());
export function devicesFromPdfFields(fields,meta){
 const read=names=>names.map(n=>fields[n]).find(useful)||'';
 return [
  {category:'indicator',manufacturer:read(['indicateur_fabricant','indicateur_marque']),model:read(['indicateur_modele'])},
  {category:'bench',manufacturer:read(['base_balance_fabricant','balance_fabricant']),model:read(['base_balance_modele','balance_modele'])}
 ].filter(i=>i.manufacturer&&i.model).map(i=>({...i,fileId:meta.id,source:meta.name,revision:meta.modifiedTime}));
}
// Position-based reading of CDQ legacy label/value rows and newer equipment tables.
export function devicesFromPdfText(words,meta){
 const normalized=words.filter(w=>w.str?.trim()).map(w=>({...w,n:norm(w.str)})),found=[];
 const category=w=>/^(indicateur|balance\s*\/\s*indicateur)$/.test(w.n)?'indicator':/^balance$/.test(w.n)?'bench':'';
 const label=w=>/^(marque|fabricant|manufacturier)$/.test(w.n)?'manufacturer':/^modele$/.test(w.n)?'model':'';
 function valueAt(y,x,right,exclude){
  const row=normalized.filter(w=>Math.abs(w.y-y)<8&&w.x>=x-45&&w.x<right&&!exclude(w)&&useful(w.str)).sort((a,b)=>a.x-b.x);
  const first=row.filter(w=>Math.abs(w.x-x)<45).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];if(!first)return '';
  const run=[first];let edge=first.x+first.width;
  for(const w of row.filter(w=>w.x>first.x)){if(w.x-edge>15)break;run.push(w);edge=Math.max(edge,w.x+w.width);}
  return run.map(w=>w.str.trim()).join(' ');
 }
 for(const head of normalized.filter(category)){
  const labels=normalized.filter(w=>label(w)&&w.y<head.y&&head.y-w.y<85);
  const result={category:category(head),manufacturer:'',model:'',fileId:meta.id,source:meta.name,revision:meta.modifiedTime};
  const nextColumn=normalized.filter(w=>Math.abs(w.y-head.y)<8&&w.x>head.x+45).sort((a,b)=>a.x-b.x)[0];
  for(const l of labels){const value=valueAt(l.y,head.x,Math.min(head.x+180,nextColumn?((head.x+nextColumn.x)/2):Infinity),w=>label(w)||category(w)||w.x<=l.x+l.width);if(value)result[label(l)]=value;}
  if(!result.manufacturer||!result.model){const tableLabels=normalized.filter(w=>label(w)&&w.y>=head.y&&w.y-head.y<35);for(const l of tableLabels){const next=tableLabels.filter(w=>w.x>l.x).sort((a,b)=>a.x-b.x)[0];const value=valueAt(head.y,l.x,next?next.x-5:l.x+180,w=>category(w)||label(w));if(value)result[label(l)]=value;}}
  if(result.manufacturer&&result.model)found.push(result);
 }
 return [...new Map(found.map(i=>[i.category+'|'+norm(i.manufacturer)+'|'+norm(i.model),i])).values()];
}
let pdfApi;
export async function scanCalibrationPdf(file){
 if(typeof window.cdqLoadPdfForCalibrationV2668!=='function')throw Error('Lecteur PDF CDQ indisponible.');
 const record=await window.cdqLoadPdfForCalibrationV2668(file.id); // Existing permission checks and RAM cache.
 pdfApi??=import('./vendor/pdfjs-6.3.289/build/pdf.mjs');const api=await pdfApi;api.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs-6.3.289/build/pdf.worker.mjs',import.meta.url).href;
 const task=api.getDocument({data:new Uint8Array(await record.blob.arrayBuffer()),isEvalSupported:false}),doc=await task.promise;
 try{let items=[],fields={};for(let n=1;n<=Math.min(doc.numPages,3);n++){const page=await doc.getPage(n);for(const a of await page.getAnnotations())if(a.fieldName)fields[a.fieldName]=a.fieldValue;
  const text=await page.getTextContent();items.push(...devicesFromPdfText(text.items.map(w=>({str:w.str,x:w.transform[4],y:w.transform[5],width:w.width})),file));page.cleanup();}
  items.push(...devicesFromPdfFields(fields,file));items=[...new Map(items.map(i=>[i.category+'|'+norm(i.manufacturer)+'|'+norm(i.model),i])).values()];
  return {items,warning:items.length?'':'Aucun appareil lisible dans ce PDF (image ou champs absents).'};
 }finally{await task.destroy();}
}
