import {sheetBalanceValuesV2703} from './balance-data-v2703.mjs';
import {pdfReportConformityV2727} from './report-conformity-v2727.mjs';
import {sheetReportConformityV2727} from './sheet-report-conformity-v2727.mjs';
import {pdfWorkV2729} from './pdf-work-v2729.mjs';
import {validateReportReadV2729} from './report-conformity-cache-v2727.mjs';
const clean=v=>{const t=String(v??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,160);return /^(?:[-–—]+|n\/?a|non renseign[eé]|true|false|vrai|faux)$/i.test(t)?'':t;};
export function equipmentValuesV2697(form){
 const fields=new Map(form.getFields().map(f=>[f.getName(),f]));
 if(!fields.has('identification_balance')&&!(fields.has('capacite_maximale')&&(fields.has('base_balance_fabricant')||fields.has('indicateur_fabricant'))))return 'null';
 const value=n=>{const f=fields.get(n);return clean(f?.getText?.()??f?.getSelected?.().join(', ')??'');},unit=value('unite_mesure'),cap=value('capacite_maximale'),inc=value('echelon');
 // Match the populated columns, including the saved final conclusion. Reading
 // changes alone still do not rebuild the list when its final status is stable.
 return JSON.stringify([value('base_balance_fabricant')||value('indicateur_fabricant'),value('base_balance_modele')||value('indicateur_modele'),cap+(cap&&unit?' '+unit:''),inc+(inc&&unit?' '+unit:''),value('identification_balance'),pdfReportConformityV2727(form)]);
}
export async function equipmentSnapshotV2697(blob,L){
 if(!(blob instanceof Blob))throw Error('PDF absent');const worker=pdfWorkV2729();if(worker)return (await worker.inspect(blob)).equipment;
 const pdf=await L.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});return equipmentValuesV2697(pdf.getForm());
}
export function createEquipmentTrackerV2697({identity,library,loadPdf,loadSheet,storage=localStorage}){
 let owner='',epoch=0,data={reports:{},saves:{},sequence:0},scan=null;const analyses=new Map();
 const account=()=>{const value=identity();return String(value?.email??value??'').trim().toLowerCase();};
 const storageKey=()=> 'cdqEquipmentListV2703:'+owner;
 function sync(){const email=account();if(owner===email)return;owner=email;epoch++;try{data=owner&&JSON.parse(storage.getItem(storageKey())||'null')||{reports:{},saves:{},sequence:0};}catch{data={reports:{},saves:{},sequence:0}}data.reports??={};data.saves??={};if(!Number.isSafeInteger(data.sequence))data.sequence=0;scan=null;}
 function valid(email,generation){sync();return !!email&&owner===email&&epoch===generation;}
 function persist(){if(!owner||owner!==account())return;try{storage.setItem(storageKey(),JSON.stringify(data));}catch{}}
 const stamp=f=>JSON.stringify([f.modifiedTime||f.dateModification||f.revision||'',String(f.version||''),f.md5Checksum||f.sha256Checksum||'']);
 const completeSignature=s=>{try{const value=JSON.parse(s);return value===null||Array.isArray(value)&&value.length===6&&value.slice(0,5).every(v=>typeof v==='string')&&['conforming','nonconforming','unknown'].includes(value[5]);}catch{return false;}};
 async function snapshot(blob){return equipmentSnapshotV2697(blob,await library());}
 function noteSave(rec,blob,saveId){
  sync();const email=owner,generation=epoch,id=String(rec?.id||''),token=String(saveId||'');if(!email||!id||!token||rec?.owner&&String(rec.owner?.email??rec.owner).trim().toLowerCase()!==email)return Promise.reject(Error('Le compte du rapport a changé.'));
  const previous=data.saves[token],prior=data.reports[id],sequence=++data.sequence,waiting=[...analyses.values()].filter(a=>a.owner===email&&a.fileId===id).map(a=>a.job.catch(()=>{}));
  const save={...previous,fileId:id,at:Date.now(),sequence,previous:prior,ready:false};data.saves[token]=save;
  data.reports[id]={...prior,local:true,saveId:token,confirmedRevision:''};persist();
  const job=(async()=>{const [before,after]=await Promise.all([snapshot(rec.blob),snapshot(blob)]);await Promise.all(waiting);if(!valid(email,generation))throw Error('Le compte a changé.');if(data.saves[token]!==save||save.retired)return false;
   save.ready=true;save.changed=!!(previous?.changed||before!==after||Object.values(data.saves).some(s=>s!==save&&s.fileId===id&&s.changed&&!s.acknowledged&&!s.retired));
   if(data.reports[id]?.saveId===token)data.reports[id]={...data.reports[id],signature:after,verifiedReadV2729:!!(save.acknowledged&&data.reports[id].confirmedRevision)};
   data.saves=Object.fromEntries(Object.entries(data.saves).sort(([,a],[,b])=>b.at-a.at||b.sequence-a.sequence).slice(0,1000));persist();return save.changed;
  })();analyses.set(token,{owner:email,fileId:id,job});job.finally(()=>{if(analyses.get(token)?.job===job)analyses.delete(token);}).catch(()=>{});return job;
 }
 function awaitDecision(saveId){sync();const analysis=analyses.get(saveId),job=analysis?.owner===owner?analysis.job:null;return job?job.catch(()=>{}).then(()=>decision(saveId)):decision(saveId);}
 function decision(saveId){sync();const save=data.saves[saveId];return save?.acknowledged||save?.retired?false:save?.changed;}
 function retire(saveId){sync();const save=data.saves[saveId];if(save&&!save.acknowledged){save.retired=true;if(data.reports[save.fileId]?.saveId===saveId){let prior=save.previous,depth=0;while(prior?.local&&data.saves[prior.saveId]?.retired&&depth++<1000)prior=data.saves[prior.saveId].previous;if(prior)data.reports[save.fileId]=prior;else delete data.reports[save.fileId];}persist()}}
 function acknowledge(saveId,meta={}){sync();if(meta.owner&&String(meta.owner?.email??meta.owner).trim().toLowerCase()!==owner)return;const save=data.saves[saveId];if(save&&!save.retired){save.acknowledged=true;const report=data.reports[save.fileId];if(report?.saveId===saveId){report.confirmedRevision=String(meta.modifiedTime||meta.dateModification||meta.revision||'');if(report.confirmedRevision){report.stamp=stamp(meta);report.local=false;report.verifiedReadV2729=!!save.ready;}}persist();}}
 function signature(id){sync();return data.reports[id]?.signature||'';}
 async function inspect(files,stillCurrent=()=>true){
  sync();if(scan)return scan;const email=owner,generation=epoch;if(!email)return false;
  const task=(async()=>{let changed=false;for(const file of files){
   if(!valid(email,generation)||!stillCurrent())break;const old=data.reports[file.id],version=stamp(file),expected=String(file.modifiedTime||file.dateModification||file.revision||'');
   // A local save already compared the exact equipment fields. Acknowledge
   // the new Drive stamp without interpreting its readings as a new balance.
   if(old?.local&&!old.confirmedRevision)continue;
   // A stale folder response must not reread a version older than our upload.
   const listed=Date.parse(file.modifiedTime||file.dateModification||file.revision||''),confirmed=Date.parse(old?.confirmedRevision||'');
   if(confirmed&&listed&&listed<confirmed)continue;
   if(old?.verifiedReadV2729&&old.stamp===version&&completeSignature(old.signature))continue;
   try{let next;if(['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(file.mimeType||file.type)){const sheet=await loadSheet(file.id,expected);if(!valid(email,generation)||!stillCurrent())break;validateReportReadV2729(sheet,file,{owner:email,sheet:true});const values=sheetBalanceValuesV2703(sheet.onglets[0].valeurs);next=values==='null'?values:JSON.stringify([...JSON.parse(values),sheetReportConformityV2727(sheet)]);}else{const rec=await loadPdf(file.id,expected);if(!valid(email,generation)||!stillCurrent())break;validateReportReadV2729(rec,file,{owner:email});next=await snapshot(rec.blob);}if(!valid(email,generation)||!stillCurrent())break;
    if(stamp(file)!==version||data.reports[file.id]!==old)continue; // A changed folder or newer local edit wins a delayed read.
    if(old&&old.signature!==next)changed=true;data.reports[file.id]={signature:next,stamp:version,verifiedReadV2729:true};persist();
   }catch{ /* Leave the previous fingerprint intact; the next Drive event can retry. */ }
  }return changed;})();scan=task;try{return await task;}finally{if(scan===task)scan=null;}
 }
 function confirmedSignature(file){sync();const report=data.reports[file.id];return report?.verifiedReadV2729&&!report.local&&report.stamp===stamp(file)&&completeSignature(report.signature)?report.signature:null;}
 return {noteSave,decision,awaitDecision,acknowledge,retire,signature,confirmedSignature,inspect};
}
