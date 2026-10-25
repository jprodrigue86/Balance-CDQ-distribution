import {balanceSourceRowsV2751,balanceDisplayRowsV2751} from './balance-list-index-v2751.mjs';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
const clean=value=>{const text=String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,160);return /^(?:[-–—]+|n\/?a|non renseign[eé]|true|false|vrai|faux)$/i.test(text)?'':text;};
export const EQUIPMENT_FIELDS_V2746=Object.freeze(['base_balance_fabricant','indicateur_fabricant','base_balance_modele','indicateur_modele','capacite_maximale','echelon','unite_mesure','identification_balance','Bouton_Conforme','Bouton_NonConforme','Bouton_ACompleter','Statut_conformite']);
export function equipmentEditSignatureV2746(values){
 if(!values||typeof values!=='object'||!Object.prototype.hasOwnProperty.call(values,'identification_balance'))return null;
 const text=name=>clean(Array.isArray(values[name])?values[name].join(', '):values[name]),checked=name=>values[name]===true||['yes','on','true','1','oui'].includes(norm(values[name]));
 const unit=text('unite_mesure'),cap=text('capacite_maximale'),inc=text('echelon'),status=norm(values.Statut_conformite);
 const bad=checked('Bouton_NonConforme')||status==='non conforme',good=!(checked('Bouton_ACompleter')||status==='a completer')&&(checked('Bouton_Conforme')||status==='conforme');
 return JSON.stringify([text('base_balance_fabricant')||text('indicateur_fabricant'),text('base_balance_modele')||text('indicateur_modele'),cap+(cap&&unit?' '+unit:''),inc+(inc&&unit?' '+unit:''),text('identification_balance'),bad?'nonconforming':good?'conforming':'unknown']);
}
export function equipmentSignatureRowV2746(signature,{id,source='',revision=''}={}){
 let values;try{values=JSON.parse(signature);}catch{return null;}
 if(!id||!Array.isArray(values)||values.length!==6||!values.slice(0,5).every(value=>typeof value==='string'&&value.length<=320)||!['conforming','nonconforming','unknown'].includes(values[5]))return null;
 const[fabricant,modele,capacite,echelon,identification,conformity]=values;return {id:String(id),source:String(source).slice(0,200),revision:String(revision),fabricant,modele,capacite,echelon,identification,conformity};
}

// Unsaved edits are memory-only. Durable saved signatures and deletion fences
// survive restarts, separately from confirmed Drive/list timestamps and rows.
export function createBalanceListProjectionV2746({identity,storage=globalThis.localStorage,now=Date.now,onChange=()=>{}}){
 let owner='',serial=0;const clients=new Map();
 const account=()=>String(identity()?.email??identity()??'').trim().toLowerCase();
 function sync(){const next=account();if(next!==owner){owner=next;clients.clear();serial=0;}return owner;}
 const storageKey=id=>'cdqBalanceListProjectionV2746:'+owner+'|'+id;
 function state(id){sync();id=String(id);if(!clients.has(id)){const result={drafts:new Map(),saved:new Map(),deleted:new Map(),aliases:new Map()};clients.set(id,result);try{const old=JSON.parse(storage?.getItem(storageKey(id))||'null');if(old?.owner===owner&&old.clientId===id){for(const row of old.saved||[])if(row?.sourceId&&row.saveId&&equipmentSignatureRowV2746(row.signature,{id:row.sourceId}))result.saved.set(row.sourceId,row);for(const row of old.deleted||[])if(row?.id&&typeof row.pending==='boolean')result.deleted.set(row.id,row);for(const row of old.aliases||[])if(Array.isArray(row)&&row.length===2&&row.every(value=>typeof value==='string'&&value))result.aliases.set(row[0],row[1]);}}catch{}}return clients.get(id);}
 function valid(detail){sync();return !!owner&&detail?.owner===owner&&typeof detail.clientId==='string'&&!!detail.clientId&&typeof detail.sourceId==='string'&&!!detail.sourceId;}
 function persist(id){const value=state(id);try{storage?.setItem(storageKey(id),JSON.stringify({owner,clientId:String(id),saved:[...value.saved.values()],deleted:[...value.deleted.values()],aliases:[...value.aliases]}));}catch{}}
 function changed(id){onChange(String(id));}
 function target(s,id){let result=String(id);for(let i=0;i<8&&s.aliases.has(result);i++){const next=s.aliases.get(result);if(next===result)break;result=next;}return result;}
 function savedFor(s,sourceId,saveId){const exact=s.saved.get(target(s,sourceId))||s.saved.get(sourceId);if(exact)return exact.saveId===saveId?exact:null;const matches=[...s.saved.values()].filter(row=>row.saveId===saveId);return matches.length===1?matches[0]:null;}
 function moveSaved(s,row,sourceId){const destination=target(s,sourceId);if(row.sourceId!==destination){s.aliases.set(row.sourceId,destination);s.saved.delete(row.sourceId);row.sourceId=destination;s.saved.set(destination,row);}return destination;}
 function edit(detail){if(!valid(detail)||typeof detail.readerSession!=='string'||!detail.readerSession||!Number.isSafeInteger(detail.sequence)||detail.sequence<0)return false;
  const signature=detail.equipmentSignature||equipmentEditSignatureV2746(detail.values);if(!equipmentSignatureRowV2746(signature,{id:detail.sourceId}))return false;
  const s=state(detail.clientId),sourceId=target(s,detail.sourceId),old=s.drafts.get(sourceId)||s.drafts.get(detail.sourceId)||(detail.localId?[...s.drafts.values()].find(row=>row.localId===detail.localId&&row.readerSession===detail.readerSession):null);if(old?.readerSession===detail.readerSession&&old.sequence>=detail.sequence)return false;
  if(s.deleted.has(detail.sourceId)||s.deleted.has(sourceId))return false;
  let savedMoved=false;if(detail.localId){const saved=[...s.saved.values()].filter(row=>row.localId===detail.localId);if(saved.length===1&&saved[0].sourceId!==sourceId){moveSaved(s,saved[0],sourceId);persist(detail.clientId);savedMoved=true;}}
  const moved=!!old&&old.sourceId!==sourceId;if(moved){s.drafts.delete(old.sourceId);s.aliases.set(old.sourceId,sourceId);}
  if(!moved&&!savedMoved&&old?.readerSession===detail.readerSession&&old.signature===signature){old.sequence=detail.sequence;return false;}
  s.drafts.set(sourceId,{sourceId,localId:String(detail.localId||''),readerSession:detail.readerSession,sequence:detail.sequence,signature,name:detail.name||'',at:now(),order:++serial});changed(detail.clientId);return true;
 }
 function saved(detail){if(!valid(detail)||typeof detail.saveId!=='string'||!detail.saveId||!equipmentSignatureRowV2746(detail.equipmentSignature,{id:detail.sourceId}))return false;
  const s=state(detail.clientId),sourceId=target(s,detail.id||detail.fileId||detail.sourceId),old=savedFor(s,detail.sourceId,detail.saveId),moved=!!old&&old.sourceId!==sourceId;
  if(detail.sourceId!==sourceId)s.aliases.set(detail.sourceId,sourceId);
  if(old?.signature===detail.equipmentSignature&&!moved)return false;
  if(moved)moveSaved(s,old,sourceId);
  s.saved.set(sourceId,{...(old?.saveId===detail.saveId?old:{}),sourceId,localId:String(detail.localId||old?.localId||''),saveId:detail.saveId,signature:detail.equipmentSignature,name:detail.name||old?.name||'',at:old?.saveId===detail.saveId?old.at:now(),order:old?.saveId===detail.saveId?old.order:++serial});
  for(const [file,draft]of s.drafts)if(target(s,file)===sourceId&&draft.signature===detail.equipmentSignature)s.drafts.delete(file);persist(detail.clientId);changed(detail.clientId);return true;
 }
 function acknowledge(detail){if(!valid(detail)||!detail.saveId)return false;const s=state(detail.clientId),old=savedFor(s,detail.sourceId,detail.saveId);if(!old)return false;
  const destination=target(s,detail.id||detail.fileId||detail.sourceId),existing=s.saved.get(destination);if(existing&&existing!==old&&existing.saveId!==detail.saveId)return false;
  const moved=old.sourceId!==destination;moveSaved(s,old,destination);if(detail.sourceId!==destination)s.aliases.set(detail.sourceId,destination);
  if(old.acknowledged&&!moved)return false;old.acknowledged=true;old.revision=String(detail.modifiedTime||detail.dateModification||detail.revision||'');persist(detail.clientId);changed(detail.clientId);return true;
 }
 function ended(detail){if(!valid(detail))return false;const s=state(detail.clientId),draft=s.drafts.get(detail.sourceId)||s.drafts.get(target(s,detail.sourceId))||(detail.localId?[...s.drafts.values()].find(row=>row.localId===detail.localId&&row.readerSession===detail.readerSession):null);if(draft?.readerSession!==detail.readerSession)return false;s.drafts.delete(draft.sourceId);changed(detail.clientId);return true;}
 function retire(detail){if(!valid(detail))return false;const s=state(detail.clientId),old=savedFor(s,detail.sourceId,detail.saveId);if(!old)return false;s.saved.delete(old.sourceId);persist(detail.clientId);changed(detail.clientId);return true;}
 function deletion(detail,phase='pending'){sync();if(!owner||detail?.owner!==owner||!detail.clientId)return false;const s=state(detail.clientId),ids=(phase==='settled'?detail.requestedIds:detail.ids)||[],confirmed=new Set(detail.ids||[]);let touched=false;
  for(const id of ids){if(typeof id!=='string'||!id)continue;if(phase==='settled'&&!confirmed.has(id)){touched=s.deleted.delete(id)||touched;continue;}const prior=s.deleted.get(id),pending=phase==='pending';if(!prior||prior.pending!==pending){s.deleted.set(id,{id,pending,at:prior?.at||now()});touched=true;}}
  if(touched){persist(detail.clientId);changed(detail.clientId);}return touched;
 }
 function confirmed(id,rows,index=null){const s=state(id),ids=new Set((rows||[]).map(row=>String(row.id)));let removed=false;for(const[file,row]of s.deleted)if(!row.pending&&!ids.has(file)){s.deleted.delete(file);removed=true;}for(const[file,row]of s.saved)if(row.acknowledged){const source=index?.sources?.find(source=>source.id===file),matched=source?source.revision===row.revision&&source.signature===row.signature:(rows||[]).some(source=>source.id===file&&JSON.stringify([source.fabricant,source.modele,source.capacite,source.echelon,source.identification,source.conformity])===row.signature);if(matched){s.saved.delete(file);removed=true;}}if(removed)persist(id);}
 function project(id,base){const s=state(id),rows=new Map((balanceSourceRowsV2751(base?.sourceIndexV2751)||base?.rows||[]).map(row=>[String(row.id),{...row}]));let at=0;
  for(const [sourceId]of s.aliases)if(target(s,sourceId)!==sourceId)rows.delete(sourceId);
  for(const row of s.deleted.values()){rows.delete(row.id);at=Math.max(at,row.at||0);}
  for(const item of [...s.saved.values(),...s.drafts.values()]){const destination=target(s,item.sourceId);if(destination!==item.sourceId)rows.delete(item.sourceId);if(s.deleted.has(item.sourceId)||s.deleted.has(destination))continue;const prior=rows.get(destination),row=equipmentSignatureRowV2746(item.signature,{id:destination,source:item.name||prior?.source||'',revision:prior?.revision||''});if(row){rows.set(destination,{...row,local:true});at=Math.max(at,item.at||0);}}
  const sorted=balanceDisplayRowsV2751([...rows.values()]);
  const localPending=s.drafts.size>0||s.saved.size>0||s.deleted.size>0;return {...(base||{status:'local',clientId:String(id)}),rows:sorted,count:sorted.length,localPending,localUpdatedAt:at?new Date(at).toISOString():'',unsaved:s.drafts.size>0,durablePending:s.saved.size>0||[...s.deleted.values()].some(row=>row.pending),complete:base?.status==='ready',projectionStamp:JSON.stringify([base?.digest||'',sorted,localPending,at])};
 }
 function sendPending(id,accepted=[]){const s=state(id),tokens=new Set(accepted);return s.drafts.size>0||[...s.saved.values()].some(row=>!tokens.has(row.saveId))||[...s.deleted.values()].some(row=>row.pending);}
 return {edit,saved,acknowledge,ended,retire,deletion,confirmed,project,sendPending,reset(){owner='';clients.clear();serial=0;}};
}
