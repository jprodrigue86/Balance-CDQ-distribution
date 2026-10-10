import {equipmentSnapshotV2697} from './equipment-list-v2697.mjs';
import {sheetBalanceValuesV2703} from './balance-data-v2703.mjs';
import {sheetReportConformityV2727} from './sheet-report-conformity-v2727.mjs';
import {renderBalanceListV2728} from './balance-list-renderer-v2728.mjs';
import {pdfWorkV2729} from './pdf-work-v2729.mjs';
import {validateReportReadV2729} from './report-conformity-cache-v2727.mjs';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const rev=f=>String(f?.revision||f?.modifiedTime||f?.dateModification||'');
const sourceRev=f=>String(f?.modifiedTime||f?.dateModification||f?.revision||'');
const excluded=f=>/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/.test(norm(f.nom||f.name));
const sheet=f=>['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(f.mimeType||f.type);
const pdf=f=>['PDF','application/pdf'].includes(f.mimeType||f.type);
const base64=bytes=>{let bin='';for(let i=0;i<bytes.length;i+=16384)bin+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(bin);};
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const fileKey=f=>[String(f.id),f.nom||f.name||'',f.mimeType||f.type||'',sourceRev(f),String(f.version||''),f.md5Checksum||f.sha256Checksum||''];
const snapshotKey=s=>JSON.stringify([s.name,s.files.map(fileKey),s.folders,fileKey(s.list)]);
async function groups(items,read){
 const out=new Array(items.length);let next=0,failed=false,error;
 await Promise.all(Array.from({length:Math.min(3,items.length)},async()=>{while(!failed){const i=next++;if(i>=items.length)return;try{out[i]=await read(items[i]);}catch(e){if(!failed){failed=true;error=e;}}}}));
 if(failed)throw error;return out;
}
const incomplete=value=>value?.charge===false||value?.complete===false||value?.incomplete===true||value?.tronque===true||value?.truncated===true||value?.partial===true||!!value?.nextPageToken;
function folderContent(response,id){
 const folder=response?.contenu;
 if(String(folder?.id)!==String(id)||!Array.isArray(folder?.fichiers)||!Array.isArray(folder?.dossiers)||incomplete(response)||incomplete(folder)||response?.source&&norm(response.source)!=='drive')throw Error('Dossier client incomplet ou non confirmé.');
 return folder;
}
function signatureValues(signature){
 if(typeof signature!=='string'||!signature)return null;
 try{const values=JSON.parse(signature);return values===null||Array.isArray(values)&&values.length===6&&values.slice(0,5).every(v=>typeof v==='string')&&['conforming','nonconforming','unknown'].includes(values[5])?{values}:null;}catch{return null;}
}
function completeSheet(snapshot,file,clientId){
 try{validateReportReadV2729(snapshot,file,{clientId,sheet:true});}catch(error){throw Error('Le rapport Sheets a changé ou sa lecture est incomplète. '+error.message);}
 return snapshot;
}

// Two authorised folder snapshots replace N individual metadata requests and
// the server's re-download/rebuild. Missing or changed sources abort the write.
export async function updateBalanceListFastV2729({clientId,fileId,rpc,loadPdf,loadSheet,library,cachedSignature,stillCurrent,onSaved=()=>{},hashText=hash,render=null}){
 if(!fileId)return null;const guard=()=>{if(!stillCurrent())throw Error('Le client, le compte ou une sauvegarde a changé.');};guard();
 async function snapshot(){
  const response=await rpc('obtenirContenuDossierParesseux',clientId,clientId);guard();const root=folderContent(response,clientId);
  const lists=root.fichiers.filter(f=>norm(f.nom||f.name)==='liste de balance.pdf'&&pdf(f));
  if(lists.length!==1||String(lists[0].id)!==String(fileId))throw Error('La liste a été déplacée, remplacée ou supprimée.');
  const folders=root.dossiers.filter(f=>/^rapports? (?:d ?)?etalonnages?$/.test(norm(f.nom||f.name))).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(folders.some(f=>!f.id)||new Set(folders.map(f=>String(f.id))).size!==folders.length)throw Error('Dossier de rapports incomplet.');
  const children=await groups(folders,async folder=>{const r=await rpc('obtenirContenuDossierParesseux',folder.id,clientId);guard();return folderContent(r,folder.id);});
  const files=new Map(),take=f=>{if(!f.id)throw Error('Identifiant du rapport absent.');const id=String(f.id),prior=files.get(id);if(prior&&JSON.stringify(fileKey(prior))!==JSON.stringify(fileKey(f)))throw Error('Révisions des rapports non confirmées.');files.set(id,{...f});};
  for(const f of root.fichiers)if(!excluded(f)&&(sheet(f)||pdf(f)))take(f);for(const child of children)for(const f of child.fichiers)if(!excluded(f)&&sheet(f))take(f);
  const sorted=[...files.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(sorted.length>500||sorted.some(f=>!sourceRev(f)||f._cdqPendingSaveV2660||String(f.id).startsWith('cdq-local-')))throw Error('Révisions des rapports non confirmées.');
  return {name:root.nom||root.name||'',files:sorted,folders:folders.map(f=>String(f.id)),list:{...lists[0]}};
 }
 const before=await snapshot(),beforeKey=snapshotKey(before),L=await library();guard();
 const existing=await loadPdf(fileId,sourceRev(before.list));guard();
 if(!existing?.blob||!rev(existing)||existing.id&&String(existing.id)!==String(fileId)||existing.clientId&&String(existing.clientId)!==String(clientId)||sourceRev(before.list)!==rev(existing))throw Error('La révision de la liste a changé.');
 const old=await L.PDFDocument.load(await existing.blob.arrayBuffer(),{updateMetadata:false}),records=[];
 await groups(before.files,async file=>{
  guard();let signature=cachedSignature?.(file),parsed=signatureValues(signature);
  if(!parsed){if(sheet(file)){const returned=await loadSheet(file.id,clientId,sourceRev(file));guard();const snapshot=completeSheet(returned,file,clientId),values=sheetBalanceValuesV2703(snapshot.onglets[0].valeurs);signature=values==='null'?values:JSON.stringify([...JSON.parse(values),sheetReportConformityV2727(snapshot)]);}
   else{const record=await loadPdf(file.id,sourceRev(file));guard();if(!record?.blob||record.id&&String(record.id)!==String(file.id)||rev(record)!==sourceRev(file)||record.clientId&&String(record.clientId)!==String(clientId))throw Error('Un rapport a changé pendant la préparation.');signature=await equipmentSnapshotV2697(record.blob,L);}}
  guard();parsed=signatureValues(signature);if(!parsed)throw Error('Données de balance incomplètes.');const {values}=parsed;if(values===null)return;
  const [fabricant,modele,capacite,echelon,identification,conformity]=values;records.push({id:String(file.id),source:file.nom||file.name||'',revision:sourceRev(file),fabricant,modele,capacite,echelon,identification,conformity});
 });
 const seen=new Set(),rows=records.sort((a,b)=>(Date.parse(b.revision)||0)-(Date.parse(a.revision)||0)||a.id.localeCompare(b.id)).filter(r=>{const id=norm(r.identification);if(id&&seen.has(id))return false;if(id)seen.add(id);return true;}).sort((a,b)=>String(a.identification||a.source).localeCompare(String(b.identification||b.source),'fr',{numeric:true}));
 const digest=await hashText(JSON.stringify([String(clientId),before.name,rows.map(r=>[r.fabricant,r.modele,r.capacite,r.echelon,r.identification,r.conformity])]));guard();
 const previous=old.catalog.get(L.PDFName.of('CDQBalanceListV2728'));
 const unchanged=previous?.decodeText?.()===digest;let bytes;
 if(!unchanged){
  if(render)bytes=await render(rows,before.name,old.getAuthor()||'',digest);
  else if(pdfWorkV2729())bytes=(await pdfWorkV2729().request('list',{rows,name:before.name,author:old.getAuthor()||'',digest})).bytes;
  else{bytes=await renderBalanceListV2728(rows,before.name,old.getAuthor()||'',[],L);const doc=await L.PDFDocument.load(bytes,{updateMetadata:false});doc.catalog.set(L.PDFName.of('CDQBalanceListV2728'),L.PDFString.of(digest));bytes=await doc.save({updateFieldAppearances:false});}
 }
 // Validate membership and every source revision after rendering, immediately
 // before saving, even when the existing list needs no PDF write.
 const after=await snapshot();guard();if(beforeKey!==snapshotKey(after))throw Error('Les rapports ou la liste ont changé pendant la préparation.');
 const result={status:'ready',fileId,count:rows.length,listRevision:'v2728-client',checkedAt:new Date().toISOString(),updatedAt:rev(existing),clientSnapshot:after};
 if(unchanged)return {...result,unchanged:true,fastV2729:true};
 guard();const saveId='list-v2729-'+crypto.randomUUID(),ack=await rpc('enregistrerPdfLecteurCDQV2520',fileId,base64(bytes),saveId,rev(existing));guard();
 if(ack?.ok!==true||String(ack.id)!==String(fileId)||!rev(ack))throw Error('Enregistrement de la liste non confirmé.');
 // A confirmed write may be cached immediately without another Drive download.
 try{await onSaved({...existing,...ack,revision:rev(ack),modifiedTime:rev(ack),dateModification:rev(ack),blob:new Blob([bytes],{type:'application/pdf'}),clientId,nom:'Liste de balance.pdf'});}catch{ /* A failed local cache cannot undo an acknowledged Drive upload. */ }
 guard();
 return {...result,updatedAt:rev(ack),fastV2729:true};
}
