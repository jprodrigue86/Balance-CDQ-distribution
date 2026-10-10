import {equipmentSnapshotV2697} from './equipment-list-v2697.mjs';
import {sheetBalanceValuesV2703} from './balance-data-v2703.mjs';
import {sheetReportConformityV2727} from './sheet-report-conformity-v2727.mjs';
import {renderBalanceListV2728} from './balance-list-renderer-v2728.mjs';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const revision=m=>String(m?.revision||m?.modifiedTime||m?.dateModification||'');
const marker='CDQBalanceListV2728';
const base64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);};
export async function ensureBalanceListConformityV2728({result,clientId,clientName,files,library,loadPdf,loadSheet,rpc,stillCurrent,cachedSignature,hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('')}){
 if(result.status!=='ready'||!result.fileId)throw Error('Liste non confirmée.');
 // A deployed server with the same audited renderer needs no compatibility write.
 if(result.listRevision==='v2727')return result;
 const guard=()=>{if(!stillCurrent())throw Error('La liste ou le compte a changé pendant la préparation.');};guard();
 if(files.length>500)throw Error('Plus de 500 fiches actives.');
 const L=await library();guard();
 const existing=await loadPdf(result.fileId);guard();
 if(!existing?.blob||!revision(existing)||existing.clientId&&String(existing.clientId)!==String(clientId))throw Error('La révision de la liste n’est pas confirmée.');
 const old=await L.PDFDocument.load(await existing.blob.arrayBuffer(),{updateMetadata:false});guard();
 const records=[],versions=[];
 async function read(file){
  guard();let signature=cachedSignature?.(file),rev=revision(file);
  if(!signature){
   if(['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(file.mimeType||file.type)){
    const before=await rpc('obtenirMetaFichier',file.id);guard();rev=revision(before);
    const snapshot=await loadSheet(file.id,clientId);guard();
    const values=sheetBalanceValuesV2703(snapshot?.onglets?.[0]?.valeurs||[]);
    signature=values==='null'?values:JSON.stringify([...JSON.parse(values),sheetReportConformityV2727(snapshot)]);
   }else{
    const rec=await loadPdf(file.id);guard();rev=revision(rec);
    if(!rec?.blob)throw Error('Rapport PDF absent.');
    signature=await equipmentSnapshotV2697(rec.blob,L);guard();
   }
  }
  if(!rev)throw Error('Révision du rapport absente.');
  versions.push({id:String(file.id),revision:rev});
  const values=JSON.parse(signature);if(values===null)return;
  if(!Array.isArray(values)||values.length!==6)throw Error('Données de balance incomplètes.');
  const [fabricant,modele,capacite,echelon,identification,conformity]=values;
  records.push({id:String(file.id),source:file.nom||file.name||'',revision:rev,fabricant,modele,capacite,echelon,identification,conformity});
 }
 for(let i=0;i<files.length;i+=3){const settled=await Promise.allSettled(files.slice(i,i+3).map(read));for(const item of settled)if(item.status==='rejected')throw item.reason;guard();}
 const seen=new Set(),rows=records.sort((a,b)=>(Date.parse(b.revision)||0)-(Date.parse(a.revision)||0)).filter(r=>{const id=norm(r.identification);if(id&&seen.has(id))return false;if(id)seen.add(id);return true;}).sort((a,b)=>String(a.identification||a.source).localeCompare(String(b.identification||b.source),'fr',{numeric:true}));
 // An unreadable or stale client snapshot must never replace a complete server list.
 if(Number(result.count)!==rows.length)throw Error('Les rapports ont changé. Réessayez l’actualisation.');
 const digest=await hash(JSON.stringify([String(clientId),clientName,rows.map(r=>[r.fabricant,r.modele,r.capacite,r.echelon,r.identification,r.conformity])]));guard();
 const previous=old.catalog.get(L.PDFName.of(marker));
 for(let i=0;i<versions.length;i+=3){const settled=await Promise.allSettled(versions.slice(i,i+3).map(async file=>{const meta=await rpc('obtenirMetaFichier',file.id);guard();if(revision(meta)!==file.revision)throw Error('Un rapport a changé pendant la préparation.');}));for(const item of settled)if(item.status==='rejected')throw item.reason;}
 if(previous?.decodeText?.()===digest)return {...result,listRevision:'v2728-client'};
 guard();const bytes=await renderBalanceListV2728(rows,clientName,old.getAuthor()||'',[],L);
 const pdf=await L.PDFDocument.load(bytes,{updateMetadata:false});pdf.catalog.set(L.PDFName.of(marker),L.PDFString.of(digest));
 const data=base64(await pdf.save({updateFieldAppearances:false}));guard();
 const saveId='list-v2728-'+crypto.randomUUID();
 const ack=await rpc('enregistrerPdfLecteurCDQV2520',result.fileId,data,saveId,revision(existing));guard();
 if(ack?.ok!==true||String(ack.id)!==String(result.fileId)||!revision(ack))throw Error('Enregistrement de la liste non confirmé.');
 return {...result,listRevision:'v2728-client',updatedAt:revision(ack),checkedAt:new Date().toISOString()};
}
if(typeof window!=='undefined')window.cdqEnsureListConformityV2728=ensureBalanceListConformityV2728;
