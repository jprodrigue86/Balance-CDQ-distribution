// Retiring an upload never means confirming a Drive save. Keep its exact bytes
// in account-scoped storage before removing it from the outbox.
export function createPdfSaveRetirementV2707({owner,guard,get,put,queue,mutateQueue,busy,clearSource=async()=>{},onRetired=()=>{},now=Date.now}){
 let serial=Promise.resolve();
 const run=fn=>{const email=owner();const job=serial.catch(()=>{}).then(async()=>{guard(email);return fn(email)});serial=job;return job};
 const write=async(type,id,value,email)=>{guard(email);const result=await put(type,id,value);guard(email);if(result===false)throw Error('La copie locale n’a pas pu être conservée. L’envoi reste en attente.')};
 async function retireIds(ids,email){
  guard(email);if(busy())throw Error('Un envoi est en cours. Attendez sa fin avant de le retirer.');
  const selected=new Set(ids.map(String)),current=await queue();guard(email);
  const items=current.filter(a=>a.kind==='pdf-save-v2520'&&selected.has(String(a.id)));
  if(items.some(a=>a.owner!==email))throw Error('Cette sauvegarde appartient à un autre compte.');
  if(!items.length)return [];
  const copies=[];
  for(const a of items){
   if(!a.data)throw Error('Les réponses locales ne sont pas disponibles. L’envoi reste en attente.');
   const record=await get('document-pdf',a.targetId);guard(email);
   const copy={...a,owner:email,clientId:a.clientId||record?.clientId||'',clientName:a.clientName||record?.clientName||'',fileName:a.fileName||record?.nom||'Rapport.pdf',retiredAt:now()};
   await write('pdf-save-backup-v2707',a.id,copy,email);copies.push(copy);
  }
  const index=await get('pdf-save-backup-index-v2707','copies');guard(email);
  await write('pdf-save-backup-index-v2707','copies',{ids:[...new Set([...(index?.ids||[]),...copies.map(a=>a.id)])]},email);
  // Queue changes are serialized with saves. A later edit is never removed by
  // a decision made for an earlier snapshot of this report.
  await mutateQueue(q=>{
   guard(email);if(busy())throw Error('Un envoi est en cours. Attendez sa fin avant de le retirer.');
   const expected=new Map(items.map(a=>[a.id,a]));
   for(const a of q){const old=expected.get(a.id);if(old&&(a.owner!==old.owner||a.targetId!==old.targetId||a.data!==old.data))throw Error('La sauvegarde a changé. Rouvrez son détail.');}
   return q.filter(a=>!expected.has(a.id));
  });guard(email);
  for(const a of copies){
   await onRetired({sourceId:a.targetId,saveId:a.id,clientId:a.clientId,nom:a.fileName,owner:email});guard(email);
   // Secondary row/cache cleanup cannot undo the durable retirement.
   try{await clearSource(a.targetId,a.id,a.clientId);guard(email)}catch(e){guard(email)}
  }
  return copies;
 }
 async function flush(email){
  if(busy())return [];
  const request=await get('pdf-save-deleted-v2707','actions');guard(email);
  return retireIds(request?.ids||[],email);
 }
 return {
  retire:targetId=>run(async email=>{const q=await queue();guard(email);return retireIds(q.filter(a=>a.kind==='pdf-save-v2520'&&String(a.targetId)===String(targetId)).map(a=>a.id),email)}),
  deleted:targets=>run(async email=>{
   const ids=new Set(targets.map(String)),q=await queue();guard(email);
   const selected=q.filter(a=>a.kind==='pdf-save-v2520'&&ids.has(String(a.targetId))).map(a=>a.id);
   if(!selected.length)return [];
   const previous=await get('pdf-save-deleted-v2707','actions');guard(email);
   await write('pdf-save-deleted-v2707','actions',{ids:[...new Set([...(previous?.ids||[]),...selected])]},email);
   return flush(email);
  }),
  flushDeleted:()=>run(flush),
  copies:()=>run(async email=>{const index=await get('pdf-save-backup-index-v2707','copies');guard(email);const copies=[];for(const id of index?.ids||[]){const a=await get('pdf-save-backup-v2707',id);guard(email);if(a?.owner===email&&a.data)copies.push(a)}return copies.sort((a,b)=>b.retiredAt-a.retiredAt)})
 };
}
