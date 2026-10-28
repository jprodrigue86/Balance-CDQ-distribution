import {balanceSheetSignatureV2788} from './balance-sheet-summary-v2788.mjs';
import {balanceDisplayRowsV2751,validBalanceSourceIndexV2751} from './balance-list-index-v2751.mjs';
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
const snapshotKey=s=>JSON.stringify([s.name,s.files.map(fileKey),s.folders,s.listFolderId,fileKey(s.list)]);
export function balanceSnapshotChangesV2792(before,after){
 const changes=[],fields=['id','name','type','revision','version','checksum'];
 const compare=(kind,a,b)=>{const left=fileKey(a),right=fileKey(b),changed=fields.filter((_,i)=>left[i]!==right[i]);if(changed.length)changes.push({kind,id:String(b?.id||a?.id||''),name:String(b?.nom||b?.name||a?.nom||a?.name||''),fields:changed});};
 if(before.name!==after.name)changes.push({kind:'client',fields:['name']});
 if(JSON.stringify(before.folders)!==JSON.stringify(after.folders))changes.push({kind:'folders',fields:['membership']});
 if(before.listFolderId!==after.listFolderId)changes.push({kind:'list',id:String(after.list?.id||before.list?.id||''),fields:['destination']});
 compare('list',before.list,after.list);
 const left=new Map(before.files.map(f=>[String(f.id),f])),right=new Map(after.files.map(f=>[String(f.id),f]));
 for(const [id,file]of left)if(!right.has(id))changes.push({kind:'report',id,name:String(file.nom||file.name||''),fields:['removed']});else compare('report',file,right.get(id));
 for(const [id,file]of right)if(!left.has(id))changes.push({kind:'report',id,name:String(file.nom||file.name||''),fields:['added']});
 return changes;
}
function snapshotChangedV2792(before,after){
 const changes=balanceSnapshotChangesV2792(before,after),first=changes[0],labels={id:'identifiant',name:'nom',type:'type',revision:'révision',version:'version',checksum:'empreinte',destination:'dossier de destination',membership:'dossiers',added:'ajout',removed:'retrait'};
 const subject=first?.kind==='list'?'La liste de balance':first?.kind==='report'?'Le rapport « '+(first.name||first.id)+' »':first?.kind==='client'?'Le nom du client':'Les dossiers de rapports';
 const error=Error('Les rapports ou la liste ont changé pendant la préparation. '+subject+' : '+(first?.fields||[]).map(field=>labels[field]||field).join(', ')+'.');
 error.code='LIST_SNAPSHOT_CHANGED';error.changes=changes.slice(0,20);error.changedCount=changes.length;return error;
}
// A rejected lane must release the caller even if another read never answers.
// RPCs already sent cannot be cancelled: fence every late callback instead.
export async function readBalanceListGroupV20261028(items,read,{stillCurrent=()=>true,onProgress=()=>{},timeoutMs=180000,pulseMs=1000}={}){
 const out=new Array(items.length),active=new Map(),controller=new AbortController();let next=0,done=0,stopped=null;
 const check=()=>{if(stopped)throw stopped;if(!stillCurrent())throw Error('Le client, le compte ou une sauvegarde a changé.');};
 const announce=()=>{if(stopped)return;try{onProgress({phase:'analyse',done,total:items.length,active:[...active.values()].map(({file,started})=>({id:String(file.id),name:String(file.nom||file.name||file.id),elapsedMs:Date.now()-started}))});}catch{}};
 const stop=error=>{if(!stopped){stopped=error;controller.abort();}return stopped;};
 const pulse=setInterval(()=>{try{check();announce();}catch(error){stop(error);}},pulseMs);
 announce();
 try{
  await Promise.all(Array.from({length:Math.min(3,items.length)},async()=>{
   while(!stopped){check();const i=next++;if(i>=items.length)return;const file=items[i];active.set(i,{file,started:Date.now()});announce();
    let timer,onAbort;
    try{
     out[i]=await Promise.race([
      Promise.resolve().then(()=>{check();return read(file,check);}),
      new Promise((_,reject)=>{
       onAbort=()=>reject(stopped||Error('Lecture interrompue.'));controller.signal.addEventListener('abort',onAbort,{once:true});
       timer=setTimeout(()=>{const error=Error('Délai de lecture dépassé.');error.code='LIST_SOURCE_TIMEOUT';reject(error);},timeoutMs);
      })]);
     check();done++;
    }catch(cause){
     if(stopped)throw stopped;
     const error=Error('Lecture interrompue : « '+String(file.nom||file.name||file.id)+' » ('+done+' / '+items.length+' analysés). '+String(cause?.message||cause));
     error.code=cause?.code||'LIST_SOURCE_READ_FAILED';error.sourceId=String(file.id);error.completed=done;error.total=items.length;
     throw stop(error);
    }finally{clearTimeout(timer);controller.signal.removeEventListener('abort',onAbort);active.delete(i);announce();}
   }
  }));check();return out;
 }finally{clearInterval(pulse);stop(stopped||Error('Analyse terminée.'));}
}
const groups=readBalanceListGroupV20261028;
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
export async function updateBalanceListFastV2729(options){
 for(let attempt=0;attempt<2;attempt++){
  try{return await prepareBalanceListFastV2792(options);}
  catch(error){
   if(error?.code!=='LIST_SNAPSHOT_CHANGED')throw error;
   error.stabilizationAttempts=attempt;
   if(attempt||!options.stillCurrent())throw error;
   options.onProgress?.({phase:'stabilizing',done:0,total:0,changes:error.changes});
   await new Promise(resolve=>setTimeout(resolve,350));
   if(!options.stillCurrent())throw Error('Le client, le compte ou une sauvegarde a changé.');
  }
 }
}
async function prepareBalanceListFastV2792({clientId,fileId,rpc,loadPdf,loadSheet,library,cachedSignature,stillCurrent,onSaved=()=>{},onSourceRead=()=>{},previousState=null,hashText=hash,render=null,sourceIndex=null,guardedSave=false,indexOnly=false,listDestinationId='',onProgress=()=>{}}){
 // V27.77: an initial engine import has no list PDF to reopen or render.
 // It must still inspect and recheck a COMPLETE authorised Drive snapshot.
 const bootstrap=indexOnly===true&&!fileId;
 if(!fileId&&!bootstrap)return null;const guard=()=>{if(!stillCurrent())throw Error('Le client, le compte ou une sauvegarde a changé.');};guard();
 async function snapshot(){
  const response=await rpc('obtenirContenuDossierParesseux',clientId,clientId);guard();const root=folderContent(response,clientId);
  const lists=root.fichiers.filter(f=>norm(f.nom||f.name)==='liste de balance.pdf'&&pdf(f)).map(file=>({file,folderId:String(clientId)}));
  const listFolders=root.dossiers.filter(f=>norm(f.nom||f.name)==='liste de balance').sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(listFolders.some(f=>!f.id)||new Set(listFolders.map(f=>String(f.id))).size!==listFolders.length)throw Error('Dossier de liste incomplet.');
  const folders=root.dossiers.filter(f=>/^rapports? (?:d ?)?etalonnages?$/.test(norm(f.nom||f.name))).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(folders.some(f=>!f.id)||new Set(folders.map(f=>String(f.id))).size!==folders.length)throw Error('Dossier de rapports incomplet.');
  // Fetch independent list/report folders in one bounded batch. Both full
  // snapshots still authenticate membership before any import or write.
  const folderRows=await groups([...listFolders,...folders],async folder=>{const r=await rpc('obtenirContenuDossierParesseux',folder.id,clientId);guard();return folderContent(r,folder.id);});
  for(let i=0;i<listFolders.length;i++)for(const file of folderRows[i].fichiers)if(norm(file.nom||file.name)==='liste de balance.pdf'&&pdf(file))lists.push({file,folderId:String(listFolders[i].id)});
  const children=folderRows.slice(listFolders.length);
  const selected=lists.filter(row=>String(row.file.id)===String(fileId));
  if(bootstrap){
   // Even a list that another technician created in the meantime prohibits
   // this path; never publish a second canonical list.
   if(!listDestinationId||listFolders.length!==1||String(listFolders[0].id)!==String(listDestinationId)||lists.length)throw Error('CONFLICT_LIST_FILE : la première liste ne peut pas être créée sans destination unique et vide.');
  }else if(selected.length!==1)throw Error('La liste a été déplacée, remplacée ou supprimée.');
  const files=new Map(),take=f=>{if(!f.id)throw Error('Identifiant du rapport absent.');const id=String(f.id),prior=files.get(id);if(prior&&JSON.stringify(fileKey(prior))!==JSON.stringify(fileKey(f)))throw Error('Révisions des rapports non confirmées.');files.set(id,{...f});};
  for(const f of root.fichiers)if(!excluded(f)&&(sheet(f)||pdf(f)))take(f);for(const child of children)for(const f of child.fichiers)if(!excluded(f)&&(sheet(f)||pdf(f)))take(f);
  const sorted=[...files.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(sorted.length>500||sorted.some(f=>!sourceRev(f)||f._cdqPendingSaveV2660||String(f.id).startsWith('cdq-local-')))throw Error('Révisions des rapports non confirmées.');
  return {name:root.nom||root.name||'',files:sorted,folders:folders.map(f=>String(f.id)),
   listFolderId:bootstrap?String(listDestinationId):selected[0].folderId,
   list:bootstrap?{id:'',name:'',mimeType:'',modifiedTime:'',revision:''}:{...selected[0].file}};
 }
 const indexed=guardedSave===true&&validBalanceSourceIndexV2751(sourceIndex,clientId,fileId);
 const before=indexed?{name:sourceIndex.name||'',files:sourceIndex.sources.map(source=>({...source.file,id:source.id,revision:source.revision,modifiedTime:source.revision,dateModification:source.revision})),folders:sourceIndex.folders,listFolderId:sourceIndex.listFolderId,list:{...sourceIndex.list,revision:sourceIndex.listRevision,modifiedTime:sourceIndex.listRevision,dateModification:sourceIndex.listRevision}}:await snapshot(),beforeKey=snapshotKey(before),records=[],signatures=new Map();let L,existing,old,libraryPromise;
 const pdfLibrary=async()=>{libraryPromise??=Promise.resolve().then(library);L=await libraryPromise;guard();return L;};
 await groups(before.files,async(file,guard)=>{
  guard();let signature=indexed?sourceIndex.sources.find(source=>source.id===String(file.id))?.signature:cachedSignature?.(file),parsed=signatureValues(signature);
  if(!parsed){if(sheet(file)){const returned=await loadSheet(file.id,clientId,sourceRev(file));guard();signature=balanceSheetSignatureV2788(returned,file,{clientId});}
   else{const record=await loadPdf(file.id,sourceRev(file));guard();if(!record?.blob||record.id&&String(record.id)!==String(file.id)||rev(record)!==sourceRev(file)||record.clientId&&String(record.clientId)!==String(clientId))throw Error('Un rapport a changé pendant la préparation.');signature=await equipmentSnapshotV2697(record.blob,await pdfLibrary());}
   guard();onSourceRead(file,signature);}
  guard();parsed=signatureValues(signature);if(!parsed)throw Error('Données de balance incomplètes.');const {values}=parsed;signatures.set(String(file.id),signature);if(values===null)return;
  const [fabricant,modele,capacite,echelon,identification,conformity]=values;records.push({id:String(file.id),source:file.nom||file.name||'',revision:sourceRev(file),fabricant,modele,capacite,echelon,identification,conformity});
 },{stillCurrent,onProgress});
 const rows=balanceDisplayRowsV2751(records);
 const digest=await hashText(JSON.stringify([String(clientId),before.name,rows.map(r=>[r.fabricant,r.modele,r.capacite,r.echelon,r.identification,r.conformity])]));guard();
 // A confirmed revision/digest receipt survives an app restart. Rechecking an
 // unchanged list needs only its two fresh folder snapshots, without fetching
 // or parsing the same list PDF again. A remote list edit invalidates receipt.
 let unchanged=previousState?.fileId===String(fileId)&&String(previousState.clientId||'')===String(clientId)&&previousState.updatedAt===sourceRev(before.list)&&previousState.listStamp===JSON.stringify(fileKey(before.list))&&previousState.digest===digest;
 if(!indexOnly&&indexed){
  // A value-identical update still needs fresh membership verification.
  if(previousState?.digest===digest)return prepareBalanceListFastV2792({...arguments[0],sourceIndex:null});
  existing={id:String(fileId),clientId:String(clientId),revision:sourceIndex.listRevision};old={getAuthor:()=>sourceIndex.author||''};
 }else if(!indexOnly&&!unchanged){
  existing=await loadPdf(fileId,sourceRev(before.list));guard();
  if(!existing?.blob||!rev(existing)||existing.id&&String(existing.id)!==String(fileId)||existing.clientId&&String(existing.clientId)!==String(clientId)||sourceRev(before.list)!==rev(existing))throw Error('La révision de la liste a changé.');
  await pdfLibrary();old=await L.PDFDocument.load(await existing.blob.arrayBuffer(),{updateMetadata:false});guard();
  unchanged=old.catalog.get(L.PDFName.of('CDQBalanceListV2728'))?.decodeText?.()===digest;
 }
 let bytes;
 if(!indexOnly&&!unchanged){
  if(render)bytes=await render(rows,before.name,old.getAuthor()||'',digest);
  else if(pdfWorkV2729())bytes=(await pdfWorkV2729().request('list',{rows,name:before.name,author:old.getAuthor()||'',digest})).bytes;
  else{await pdfLibrary();bytes=await renderBalanceListV2728(rows,before.name,old.getAuthor()||'',[],L);const doc=await L.PDFDocument.load(bytes,{updateMetadata:false});doc.catalog.set(L.PDFName.of('CDQBalanceListV2728'),L.PDFString.of(digest));bytes=await doc.save({updateFieldAppearances:false});}
 }
 // Validate membership and every source revision after rendering, immediately
 // before saving, even when the existing list needs no PDF write.
 const after=indexed?before:await snapshot();guard();if(beforeKey!==snapshotKey(after))throw snapshotChangedV2792(before,after);
 const exhaustiveIndex={version:1,exhaustive:true,clientId:String(clientId),fileId:String(fileId),listRevision:sourceRev(before.list),list:{...before.list},name:before.name,author:old?.getAuthor?.()||sourceIndex?.author||previousState?.sourceIndexV2751?.author||'',authorKnown:!!old||sourceIndex?.authorKnown===true||previousState?.sourceIndexV2751?.authorKnown===true,folders:before.folders,listFolderId:before.listFolderId,sources:before.files.map(file=>({id:String(file.id),revision:sourceRev(file),name:file.nom||file.name||'',file:{...file},signature:signatures.get(String(file.id))}))};
 const result={sourceIndexV2751:exhaustiveIndex,status:'ready',fileId:String(fileId),clientId:String(clientId),folderId:after.listFolderId,count:rows.length,listRevision:'v2728-client',listStamp:JSON.stringify(fileKey(after.list)),digest,rows,checkedAt:new Date().toISOString(),updatedAt:sourceRev(before.list),clientSnapshot:after};
 if(indexOnly)return {...result,indexOnly:true};
 if(unchanged)return {...result,unchanged:true,fastV2729:true};
 guard();const saveId='list-v2751-'+crypto.randomUUID(),ack=guardedSave===true?await rpc('cdqSaveBalanceListV2751',clientId,fileId,base64(bytes),{saveId,listRevision:rev(existing)||sourceRev(before.list),sources:exhaustiveIndex.sources.map(({id,revision})=>({id,revision})),name:'Liste de balance.pdf',sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''),size:bytes.length}):await rpc('enregistrerPdfLecteurCDQV2520',fileId,base64(bytes),saveId,rev(existing));guard();
 if(guardedSave===true&&(ack?.saveId!==saveId||ack?.sourceManifestValidated!==true))throw Error('Le manifeste exhaustif des rapports n’a pas été confirmé.');
 if(ack?.ok!==true||String(ack.id)!==String(fileId)||!rev(ack))throw Error('Enregistrement de la liste non confirmé.');
 // A confirmed write may be cached immediately without another Drive download.
 try{await onSaved({...existing,...ack,revision:rev(ack),modifiedTime:rev(ack),dateModification:rev(ack),blob:new Blob([bytes],{type:'application/pdf'}),clientId,nom:'Liste de balance.pdf'});}catch{ /* A failed local cache cannot undo an acknowledged Drive upload. */ }
 guard();
 exhaustiveIndex.listRevision=rev(ack);exhaustiveIndex.list={...after.list,...ack,revision:rev(ack),modifiedTime:rev(ack),dateModification:rev(ack)};
 return {...result,guardedSaveV2751:guardedSave===true,sourceManifestValidated:ack.sourceManifestValidated===true,updatedAt:rev(ack),listStamp:JSON.stringify(fileKey({...after.list,...ack,revision:rev(ack),modifiedTime:rev(ack),dateModification:rev(ack)})),fastV2729:true};
}

