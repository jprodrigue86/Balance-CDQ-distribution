// Trash shares the authenticated CDQ RPC, its account and its current Drive ACL.
const normalized=v=>String(v||'').trim().toLowerCase();
const validId=id=>/^[A-Za-z0-9_-]{10,200}$/.test(String(id));
export function createDriveTrashClientV2713({identity,allowed,writable=allowed,rpc,legacy}={}){
 let generation=0,serverMissing=false;
 const account=()=>normalized(identity());
 function guard(owner,stamp){if(!owner||owner!==account()||!allowed()||stamp!==generation)throw Error('Le compte ou l’accès Drive a changé.');}
 async function call(name,...args){
  const owner=account(),stamp=generation;guard(owner,stamp);
  let result;
  try{result=await rpc(name,...args);}catch(e){guard(owner,stamp);if(/Fonction serveur introuvable/.test(String(e?.message||e))){serverMissing=true;throw Error('Le service de corbeille CDQ doit être mis à jour avec Script Manager (V27.18).');}throw e;}
  guard(owner,stamp);
  if(result?.ok!==true||normalized(result.account)!==owner)throw Error('La corbeille n’a pas confirmé le compte CDQ connecté.');
  return result;
 }
 async function list(next=''){
  if(serverMissing&&legacy)return legacy.list(next);
  let result;try{result=await call('cdqListerCorbeilleV2718',String(next));}catch(e){if(serverMissing&&legacy)return legacy.list(next);throw e;}
  if(!Array.isArray(result.files))throw Error('La liste de la corbeille n’a pas été confirmée.');
  return {files:result.files.filter(f=>validId(f.id)&&f.trashed===true).map(f=>({id:String(f.id),name:String(f.name||'Sans nom'),mimeType:String(f.mimeType||''),folder:f.mimeType==='application/vnd.google-apps.folder',canRestore:f.canRestore===true})),next:String(result.next||'')};
 }
 async function restore(id){
  if(!writable())throw Error('Accès en lecture seule.');
  if(!validId(id))throw Error('Fichier invalide.');
  if(serverMissing&&legacy)return legacy.restore(id);
  const result=await call('cdqRestaurerCorbeilleV2718',String(id));
  if(result.id!==id||result.trashed!==false||!writable())throw Error('La restauration n’a pas été confirmée.');
  return {id};
 }
 // An old server retains the existing explicit-refresh path until deployment.
 // A CDQ, ACL, network or account error never triggers this fallback.
 return {list,restore,authorize:()=>serverMissing&&legacy?legacy.authorize():Promise.resolve(),reset:()=>{generation++;serverMissing=false;legacy?.reset();}};
}
