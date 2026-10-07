import {sheetBalanceValuesV2703} from './balance-data-v2703.mjs';
const clean=v=>{const t=String(v??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,160);return /^(?:[-–—]+|n\/?a|non renseign[eé]|true|false|vrai|faux)$/i.test(t)?'':t;};
export function equipmentValuesV2697(form){
 const fields=new Map(form.getFields().map(f=>[f.getName(),f]));
 if(!fields.has('identification_balance')&&!(fields.has('capacite_maximale')&&(fields.has('base_balance_fabricant')||fields.has('indicateur_fabricant'))))return 'null';
 const value=n=>{const f=fields.get(n);return clean(f?.getText?.()??f?.getSelected?.().join(', ')??'');},unit=value('unite_mesure'),cap=value('capacite_maximale'),inc=value('echelon');
 // Match the five populated columns of the server's generated list exactly.
 return JSON.stringify([value('base_balance_fabricant')||value('indicateur_fabricant'),value('base_balance_modele')||value('indicateur_modele'),cap+(cap&&unit?' '+unit:''),inc+(inc&&unit?' '+unit:''),value('identification_balance')]);
}
export async function equipmentSnapshotV2697(blob,L){
 if(!(blob instanceof Blob))throw Error('PDF absent');const pdf=await L.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});return equipmentValuesV2697(pdf.getForm());
}
export function createEquipmentTrackerV2697({identity,library,loadPdf,loadSheet,storage=localStorage}){
 let owner='',data={reports:{},saves:{}},scan=null;
 const storageKey=()=> 'cdqEquipmentListV2703:'+owner;
 function sync(){const email=identity();if(owner===email)return;owner=email;try{data=JSON.parse(storage.getItem(storageKey())||'null')||{reports:{},saves:{}};}catch{data={reports:{},saves:{}}}data.reports??={};data.saves??={};scan=null;}
 function persist(){try{storage.setItem(storageKey(),JSON.stringify(data));}catch{}}
 const stamp=f=>JSON.stringify([f.modifiedTime||f.dateModification||f.revision||'',String(f.version||''),f.md5Checksum||f.sha256Checksum||'']);
 async function snapshot(blob){return equipmentSnapshotV2697(blob,await library());}
 async function noteSave(rec,blob,saveId){
  sync();const email=owner,before=await snapshot(rec.blob),after=await snapshot(blob);if(email!==identity())throw Error('Le compte a changé.');
  const prior=data.reports[rec.id],previous=data.saves[saveId],changed=!!(previous?.changed||before!==after||Object.values(data.saves).some(s=>s.fileId===String(rec.id)&&s.changed&&!s.acknowledged));data.reports[rec.id]={...prior,signature:after,local:true,saveId,confirmedRevision:''};data.saves[saveId]={...previous,changed,fileId:String(rec.id),at:Date.now()};
  const entries=Object.entries(data.saves).sort(([,a],[,b])=>b.at-a.at);data.saves=Object.fromEntries(entries.slice(0,1000));persist();return changed;
 }
 function decision(saveId){sync();const save=data.saves[saveId];return save?.acknowledged?false:save?.changed;}
 function acknowledge(saveId,meta={}){sync();const save=data.saves[saveId];if(save){save.acknowledged=true;const report=data.reports[save.fileId];if(report?.saveId===saveId){report.confirmedRevision=String(meta.modifiedTime||meta.dateModification||meta.revision||'');if(report.confirmedRevision){report.stamp=stamp(meta);report.local=false;}}persist();}}
 function signature(id){sync();return data.reports[id]?.signature||'';}
 async function inspect(files,stillCurrent=()=>true){
  sync();if(scan)return scan;const email=owner;
  const task=(async()=>{let changed=false;for(const file of files){
   if(email!==identity()||!stillCurrent())break;const old=data.reports[file.id],version=stamp(file);
   // A local save already compared the exact equipment fields. Acknowledge
   // the new Drive stamp without interpreting its readings as a new balance.
   if(old?.local&&!old.confirmedRevision)continue;
   // A stale folder response must not reread a version older than our upload.
   const listed=Date.parse(file.modifiedTime||file.dateModification||file.revision||''),confirmed=Date.parse(old?.confirmedRevision||'');
   if(confirmed&&listed&&listed<confirmed)continue;
   if(old?.stamp===version)continue;
   try{let next;if(['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(file.mimeType||file.type)){const sheet=await loadSheet(file.id);if(email!==identity()||!stillCurrent())break;next=sheetBalanceValuesV2703(sheet?.onglets?.[0]?.valeurs||[]);}else{const rec=await loadPdf(file.id);if(email!==identity()||!stillCurrent())break;next=await snapshot(rec.blob);}if(email!==identity()||!stillCurrent())break;
    if(data.reports[file.id]!==old)continue; // A newer local edit wins a delayed Drive read.
    if(old&&old.signature!==next)changed=true;data.reports[file.id]={signature:next,stamp:version};persist();
   }catch{ /* Leave the previous fingerprint intact; the next Drive event can retry. */ }
  }return changed;})();scan=task;try{return await task;}finally{if(scan===task)scan=null;}
 }
 return {noteSave,decision,acknowledge,signature,inspect};
}
