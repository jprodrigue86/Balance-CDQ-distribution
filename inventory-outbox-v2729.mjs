// The inventory endpoint has no request ID. A sent transfer must never be
// replayed merely because its response or the local acknowledgement was lost.
export function createInventoryOutboxV2729({mutateQueue,rpc,owner,guard,now=Date.now}){
 const message='Inventaire à vérifier : ce transfert a peut-être déjà été appliqué. Vérifiez les stocks avant toute nouvelle opération. Cet envoi reste conservé et ne sera pas relancé automatiquement.';
 const unresolved=cause=>{const error=new Error(message+(cause?.message?' '+cause.message:''));error.code='CDQ_INVENTORY_CONFIRMATION_REQUIRED_V2729';return error;};
 const args=a=>[a.articleId,a.from,a.to,a.qty,a.note||''];
 const same=(mark,email,parameters)=>mark?.owner===email&&mark.parameters===parameters;
 return async function processInventoryTransferV2729(action){
  if(action.kind!=='inventory-transfer'||!action.id)throw Error('Transfert d’inventaire invalide.');
  const email=owner();guard(email);let sent,confirmed=false,unconfirmedLegacy=false;
  await mutateQueue(queue=>{
   guard(email);const current=queue.find(a=>a.id===action.id&&a.kind==='inventory-transfer');
   if(!current)throw Error('Transfert d’inventaire absent de la file.');
   if(current.owner&&current.owner!==email)throw Error('Le compte a changé.');
   const parameters=JSON.stringify(args(current)),mark=current.inventoryDispatchV2729;
   if(mark){
    if(same(mark,email,parameters)&&mark.status==='confirmed'){confirmed=true;return queue;}
    throw unresolved();
   }
   // An older failed attempt may already have changed the server stocks.
   // Introducing a marker cannot make that earlier attempt safe to replay.
   unconfirmedLegacy=current.inventoryProtocolV2729!==true||Number(current.tries||0)>0||!!current.lastError;
   sent={...current,inventoryDispatchV2729:{owner:email,parameters,status:'uncertain',startedAt:now()},lastError:message};
   return queue.map(a=>a.id===action.id?sent:a);
  });
  guard(email);if(confirmed)return {confirmed:true,replayedV2729:true};if(unconfirmedLegacy)throw unresolved();
  let result;
  try{
   result=await rpc('transfererInventaire',args(sent));guard(email);
   if(!Array.isArray(result?.articles)||!Array.isArray(result?.stocks))throw Error('La confirmation du transfert n’a pas été reçue.');
   await mutateQueue(queue=>{
    guard(email);const current=queue.find(a=>a.id===action.id&&a.kind==='inventory-transfer');
    if(!current||!same(current.inventoryDispatchV2729,email,JSON.stringify(args(sent)))||JSON.stringify(args(current))!==JSON.stringify(args(sent)))throw unresolved();
    return queue.map(a=>a.id===action.id?{...a,inventoryDispatchV2729:{...a.inventoryDispatchV2729,status:'confirmed',confirmedAt:now()},lastError:''}:a);
   });
   guard(email);
  }catch(error){throw unresolved(error);}
  return result;
 };
}
