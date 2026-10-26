import {validateReportReadV2729} from './report-conformity-cache-v2727.mjs';
import {sheetBalanceValuesV2703} from './balance-data-v2703.mjs';
import {sheetReportConformityV2727} from './sheet-report-conformity-v2727.mjs';
const METHOD='cdqLireConformiteRapportV2775';
const account=value=>String(value?.email??value??'').trim().toLowerCase();
const statuses=new Set(['conforming','nonconforming','unknown']);

export function balanceSheetSignatureV2788(record,file,options={}){
 validateReportReadV2729(record,file,{...options,sheet:true});
 if(record?.kind==='cdq-conformity-summary-v2775'){
  if(record.balanceSummaryVersion!==2788||String(record.clientId||'')!==String(options.clientId||'')||!options.clientId)throw Error('Résumé de balance incomplet.');
  let values;try{if(typeof record.equipmentSignature!=='string')throw Error();values=JSON.parse(record.equipmentSignature);}catch{throw Error('Résumé de balance invalide.');}
  if(values!==null&&(!Array.isArray(values)||values.length!==6||!values.slice(0,5).every(v=>typeof v==='string'&&v.length<=320)||!statuses.has(values[5])||values[5]!==record.conformity))throw Error('Résumé de balance invalide.');
  return record.equipmentSignature;
 }
 const values=sheetBalanceValuesV2703(record.onglets[0].valeurs);
 return values==='null'?values:JSON.stringify([...JSON.parse(values),sheetReportConformityV2727(record)]);
}

// Only active reads are coalesced. The existing equipment tracker owns durable
// signatures, keyed by authorized file revision, client and signed-in account.
export function createBalanceSheetReaderV2788({rpc,identity}){
 let owner='',generation=0,available=true;const pending=new Map();
 function sync(){const next=account(identity());if(next!==owner){owner=next;generation++;available=true;pending.clear();}return owner;}
 return function load(id,clientId,revision=''){
  const who=sync(),epoch=generation;id=String(id||'');clientId=String(clientId||'');revision=String(revision||'');
  if(!who||!id||!clientId)return Promise.reject(Error('Accès Drive requis.'));
  const key=JSON.stringify([who,clientId,id,revision]),existing=pending.get(key);if(existing)return existing;
  const current=()=>{if(sync()!==who||generation!==epoch)throw Error('Le compte a changé.');};
  const task=(async()=>{
   if(available){
    let record;
    try{record=await rpc(METHOD,id,clientId,revision,true);current();}
    catch(error){current();const message=String(error?.message||'');if(!message.includes(METHOD)||!/(?:Fonction serveur introuvable|Script function not found|is not a function)/i.test(message))throw error;available=false;}
    if(available&&!record)throw Error('Résumé de balance invalide.');
    if(record){
     // Old V27.75 supports the function but not its optional balance summary.
     // Authenticate even that response before the one permitted legacy fallback.
     validateReportReadV2729(record,{id,revision},{clientId,sheet:true});
     if(Object.prototype.hasOwnProperty.call(record,'balanceSummaryVersion')){
      balanceSheetSignatureV2788(record,{id,revision},{clientId});return record;
     }
     if(record.kind!=='cdq-conformity-summary-v2775')throw Error('Résumé de balance invalide.');
     available=false;
    }
   }
   const record=await rpc('obtenirSnapshotGoogleSheetHorsLigne',id,clientId);current();
   balanceSheetSignatureV2788(record,{id,revision},{clientId});return record;
  })();pending.set(key,task);task.finally(()=>{if(pending.get(key)===task)pending.delete(key);}).catch(()=>{});return task;
 };
}
