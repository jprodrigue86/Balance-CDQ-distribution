const relevant=n=>/(?:fabricant|manufacturer|marque|modele|model|capacite|capacity|echelon|identification_balance|cellule|load_cell)/i.test(n)&&!/client_|technicien|_cdq_affichage/.test(n);
export function equipmentValuesV2697(form){
 return JSON.stringify(form.getFields().filter(f=>relevant(f.getName())).map(f=>[f.getName(),String(f.getText?.()??f.getSelected?.().join(' ')??'').normalize('NFC').replace(/\s+/g,' ').trim()]).sort(([a],[b])=>a.localeCompare(b)));
}
export async function equipmentSnapshotV2697(blob,L){
 if(!(blob instanceof Blob))throw Error('PDF absent');const pdf=await L.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});return equipmentValuesV2697(pdf.getForm());
}
export function createEquipmentTrackerV2697({identity,library,loadPdf,storage=localStorage}){
 let owner='',data={reports:{},saves:{}},scan=null;
 const storageKey=()=> 'cdqEquipmentListV2697:'+owner;
 function sync(){const email=identity();if(owner===email)return;owner=email;try{data=JSON.parse(storage.getItem(storageKey())||'null')||{reports:{},saves:{}};}catch{data={reports:{},saves:{}}}data.reports??={};data.saves??={};scan=null;}
 function persist(){try{storage.setItem(storageKey(),JSON.stringify(data));}catch{}}
 const stamp=f=>JSON.stringify([f.modifiedTime||f.dateModification||'',String(f.version||f.revision||''),f.md5Checksum||f.sha256Checksum||'']);
 async function snapshot(blob){return equipmentSnapshotV2697(blob,await library());}
 async function noteSave(rec,blob,saveId){
  sync();const email=owner,before=await snapshot(rec.blob),after=await snapshot(blob);if(email!==identity())throw Error('Le compte a changé.');
  const prior=data.reports[rec.id],previous=data.saves[saveId],changed=previous?.changed||before!==after;data.reports[rec.id]={...prior,signature:after,local:true};data.saves[saveId]={...previous,changed,fileId:String(rec.id),at:Date.now()};
  const entries=Object.entries(data.saves).sort(([,a],[,b])=>b.at-a.at);data.saves=Object.fromEntries(entries.slice(0,1000));persist();return changed;
 }
 function decision(saveId){sync();const save=data.saves[saveId];return save?.acknowledged?false:save?.changed;}
 function acknowledge(saveId){sync();if(data.saves[saveId]){data.saves[saveId].acknowledged=true;persist();}}
 function signature(id){sync();return data.reports[id]?.signature||'';}
 async function inspect(files,stillCurrent=()=>true){
  sync();if(scan)return scan;const email=owner;
  const task=(async()=>{let changed=false;for(const file of files){
   if(email!==identity()||!stillCurrent())break;const old=data.reports[file.id],version=stamp(file);
   // A local save already compared the exact equipment fields. Acknowledge
   // the new Drive stamp without interpreting its readings as a new balance.
   if(old?.local){data.reports[file.id]={...old,stamp:version,local:false};persist();continue;}
   if(old?.stamp===version)continue;
   try{const rec=await loadPdf(file.id);if(email!==identity())break;const next=await snapshot(rec.blob);if(email!==identity())break;
    if(data.reports[file.id]!==old)continue; // A newer local edit wins a delayed Drive read.
    if(old&&old.signature!==next)changed=true;data.reports[file.id]={signature:next,stamp:version};persist();
   }catch{ /* Leave the previous fingerprint intact; the next Drive event can retry. */ }
  }return changed;})();scan=task;try{return await task;}finally{if(scan===task)scan=null;}
 }
 return {noteSave,decision,acknowledge,signature,inspect};
}
