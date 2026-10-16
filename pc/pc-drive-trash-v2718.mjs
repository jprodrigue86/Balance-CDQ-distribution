// PC Trash uses the chosen Google account. CDQ filters every candidate before
// display; restoration uses the same fresh role/scope policy as selection Undo.
const normalized=v=>String(v||'').trim().toLowerCase();
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{10,200}$/.test(id);
export function createDriveTrashClientV2713({identity,actor=identity,allowed,writable=allowed,rpc,selected,controller}={}){
 let generation=0;
 const account=()=>normalized(identity());
 function capture(){return {owner:account(),actor:normalized(actor()),stamp:generation};}
 function guard(c){if(!c.owner||!c.actor||c.owner!==account()||c.actor!==normalized(actor())||!allowed()||c.stamp!==generation)throw Error('Le compte ou l’accès Drive a changé.');}
 async function resolve(ids,c){
  guard(c);const result=await rpc('cdqResolveSelectedDriveTrashV2752',{ids,googleAccount:c.owner});guard(c);
  if(result?.ok!==true||result.account!==c.owner||normalized(result.actorEmail)!==c.actor||!Array.isArray(result.items))throw Error('Le serveur CDQ n’a pas confirmé le périmètre de la corbeille.');
  const seen=new Set();for(const item of result.items){if(!ids.includes(item.id)||seen.has(item.id)||!['file','folder'].includes(item.kind)||typeof item.clientId!=='string'||item.clientId&&!validId(item.clientId))throw Error('Le serveur CDQ n’a pas confirmé ces éléments.');seen.add(item.id);}return result.items;
 }
 async function list(next=''){
  const c=capture();guard(c);const result=await selected.list(String(next),{explicit:false});guard(c);
  if(!Array.isArray(result.files)||result.files.length>100)throw Error('La liste de la corbeille n’a pas été confirmée.');
  const files=result.files.filter(file=>validId(file.id)),items=await resolve(files.map(file=>file.id),c),byId=new Map(items.map(item=>[item.id,item]));
  return {files:files.filter(file=>byId.get(file.id)?.kind===(file.folder?'folder':'file')).map(file=>({...file,clientId:byId.get(file.id).clientId,canRestore:file.canRestore===true&&byId.get(file.id).canRestore===true})),next:String(result.next||'')};
 }
 async function restore(id){
  const c=capture();guard(c);if(!writable())throw Error('Accès en lecture seule.');if(!validId(id))throw Error('Fichier invalide.');
  const actions=controller?.();if(!actions||actions.account()!==c.owner)throw Error('Le service du compte Google choisi doit être mis à jour.');
  // This call starts GIS synchronously from the actual Restore click.
  await actions.authorize(c.owner,{explicit:true});guard(c);if(!writable())throw Error('Accès en lecture seule.');
  const items=await resolve([id],c),item=items[0];if(items.length!==1||item.id!==id)throw Error('Cet élément ne fait pas partie des dossiers CDQ autorisés.');
  const payload={fileIds:item.kind==='file'?[id]:[],folderIds:item.kind==='folder'?[id]:[],clientId:item.clientId,googleAccount:c.owner,requestId:'delete-trash-'+crypto.randomUUID(),trash:false};
  const policy=await rpc('cdqPrepareSelectedDriveDeletionV2752',payload);guard(c);
  if(policy?.fileIds?.length!==payload.fileIds.length||policy?.folderIds?.length!==payload.folderIds.length||policy?.fileIds?.some((value,i)=>value!==payload.fileIds[i])||policy?.folderIds?.some((value,i)=>value!==payload.folderIds[i])||policy?.googleAccount!==c.owner||policy.clientId!==payload.clientId||policy.requestId!==payload.requestId||policy.trash!==false)throw Error('Le serveur CDQ n’a pas confirmé cette restauration.');
  const receipt=await actions.apply(policy);guard(c);
  if(receipt?.googleAccount!==c.owner||!Array.isArray(receipt.fichiers)||!Array.isArray(receipt.dossiers)||receipt.fichiers.length!==payload.fileIds.length||receipt.dossiers.length!==payload.folderIds.length||receipt.fichiers.some((value,i)=>value!==payload.fileIds[i])||receipt.dossiers.some((value,i)=>value!==payload.folderIds[i])||receipt.erreurs?.length)throw Error(receipt?.erreurs?.map(error=>String(error.message||'')).join(' ')||'Drive n’a pas confirmé cette restauration. Actualisez avant de réessayer.');
  const invalidated=await rpc('cdqInvalidateSelectedDriveDeletionV2752',payload);guard(c);
  if(invalidated?.ok!==true||normalized(invalidated.account)!==c.actor||invalidated.clientId!==payload.clientId||invalidated.requestId!==payload.requestId)throw Error('La restauration doit encore être vérifiée. Actualisez avant de réessayer.');return {id};
 }
 return {list,restore,authorizeScoped:explicit=>selected.authorizeScoped(explicit),scopedTrash:plan=>selected.scopedTrash(plan),authorize:()=>selected.authorize(),reset:()=>{generation++;selected.reset();}};
}
