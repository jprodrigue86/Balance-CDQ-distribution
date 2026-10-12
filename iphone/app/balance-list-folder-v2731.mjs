// Older deployed servers already expose these authenticated folder/move RPCs.
// Move the same Drive IDs; do not copy or remove an existing client's list.
export const BALANCE_LIST_FOLDER_V2731='Liste de Balance';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
const list=f=>norm(f?.nom||f?.name)==='liste de balance.pdf'&&['PDF','application/pdf'].includes(f?.mimeType||f?.type);
const folder=f=>norm(f?.nom||f?.name)==='liste de balance';
const pending=new Map(),requests=new Map();
const atomicMethod='cdqAssurerDossierListeBalanceV2731';
const unsupportedAtomic=error=>{
 const message=String(error?.message||error||'').trim();
 if(['METHOD_NOT_FOUND','FUNCTION_NOT_FOUND',-32601].includes(error?.code))return true;
 return message.includes(atomicMethod)&&/^(?:Error:\s*)?(?:(?:Script\s+)?function\s+not\s+found|Unknown\s+(?:function|method)|(?:Fonction|Méthode)\s+(?:serveur\s+)?(?:introuvable|inconnue))\s*:\s*cdqAssurerDossierListeBalanceV2731[.!]?$/i.test(message)||/^(?:ReferenceError:\s*)?cdqAssurerDossierListeBalanceV2731 is not defined[.!]?$/.test(message);
};
const complete=(reply,id)=>{
 const node=reply?.contenu;
 if(String(node?.id)!==String(id)||!Array.isArray(node?.fichiers)||!Array.isArray(node?.dossiers)||node.charge===false||node.complete===false||node.incomplete||node.tronque||node.truncated||node.partial||node.nextPageToken||reply?.nextPageToken||reply?.incomplete||reply?.partial||reply?.complete===false||reply?.source&&norm(reply.source)!=='drive')throw Error('Dossier de liste incomplet ou non confirmé.');
 return node;
};
export function balanceListLocationV2731(root,preferredId=''){
 const folders=(root?.dossiers||[]).filter(folder),files=folders.flatMap(d=>(d.fichiers||[]).filter(list).map(f=>({file:f,folder:d})));
 const preferred=files.find(row=>String(row.file.id)===String(preferredId)),nested=preferred||files.sort((a,b)=>String(a.folder.id).localeCompare(String(b.folder.id))||String(a.file.id).localeCompare(String(b.file.id)))[0];
 if(nested)return nested;
 const direct=(root?.fichiers||[]).filter(list),file=direct.find(f=>String(f.id)===String(preferredId))||direct[0];
 return {folder:folders[0]||null,file:file||null};
}
export function balanceListNeedsPlacementV2731(root){return (root?.fichiers||[]).some(list)||(root?.dossiers||[]).filter(folder).some(d=>d.charge===false||!Array.isArray(d.fichiers));}
export async function ensureBalanceListFolderV2731({clientId,owner='',rpc,stillCurrent=()=>true,preferredFileId='',create=true,onLocated=()=>{},storage=globalThis.localStorage}){
 const key=String(owner)+'|'+String(clientId),guard=()=>{if(!stillCurrent())throw Error('Le compte ou l’accès Drive a changé.');};guard();
 if(pending.has(key)){const result=await pending.get(key);guard();return result;}
 const work=async()=>{
  const read=async id=>{guard();const r=await rpc('obtenirContenuDossierParesseux',id,clientId);guard();return complete(r,id);};
  let root=await read(clientId),candidates=root.dossiers.filter(folder).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(candidates.some(d=>!d.id)||new Set(candidates.map(d=>String(d.id))).size!==candidates.length)throw Error('Dossier de liste incomplet.');
  const directBefore=root.fichiers.filter(list);
  // Mutations use the server reservation across different devices. A confirmed
  // nested-only list needs no reservation or additional mutation round trip.
  if(directBefore.length&&candidates.length||!candidates.length&&create){
   let supported=true,ack;
   try{guard();ack=await rpc(atomicMethod,String(clientId),String(preferredFileId));guard();}
   catch(error){guard();if(!unsupportedAtomic(error))throw error;supported=false;}
   if(supported){
    if(ack?.ok!==true||String(ack.clientId)!==String(clientId)||typeof ack.folderId!=='string'||!ack.folderId||ack.folderId===String(clientId)||typeof ack.fileId!=='string'||!Number.isSafeInteger(ack.moved)||ack.moved<0)throw Error('Réservation du dossier de liste non confirmée.');
    root=await read(clientId);candidates=root.dossiers.filter(folder).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    if(candidates.some(d=>!d.id)||new Set(candidates.map(d=>String(d.id))).size!==candidates.length||!candidates.some(d=>String(d.id)===ack.folderId))throw Error('Le dossier réservé ne fait pas partie du client.');
    const children=await Promise.all(candidates.map(d=>read(d.id))),target=children.find(d=>String(d.id)===ack.folderId),files=target.fichiers.filter(list),selected=files.find(f=>String(f.id)===ack.fileId)||null;
    if(root.fichiers.some(list)||directBefore.some(old=>!files.some(f=>String(f.id)===String(old.id)))||ack.fileId&&!selected||!ack.fileId&&files.length)throw Error('Le dossier final de la liste n’a pas été confirmé.');
    root={...root,dossiers:root.dossiers.map(d=>children.find(child=>String(child.id)===String(d.id))||d)};
    const result={clientId:String(clientId),root,folder:target,file:selected,moved:ack.moved>0};guard();onLocated(result);return result;
   }
  }
  if(!candidates.length&&create){
   guard();const made=await rpc('creerDossierDansCompagnie',clientId,BALANCE_LIST_FOLDER_V2731);guard();
   if(!made?.id||String(made.nom||made.name)!==BALANCE_LIST_FOLDER_V2731)throw Error('Création du dossier de liste non confirmée.');
   root=await read(clientId);candidates=root.dossiers.filter(folder).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
   if(!candidates.some(d=>String(d.id)===String(made.id)))throw Error('Le nouveau dossier ne fait pas partie du client.');
  }
  if(!candidates.length){const result={clientId:String(clientId),root,folder:null,file:null};onLocated(result);return result;}
  const children=await Promise.all(candidates.map(d=>read(d.id))),preferred=children.find(d=>d.fichiers.some(f=>list(f)&&String(f.id)===String(preferredFileId))),target=preferred||children[0],direct=root.fichiers.filter(list);let moved=false;
  for(const file of direct){
   if(!file.id)throw Error('Identifiant de liste absent.');guard();
   const requestKey='cdqBalanceListMoveV2731:'+key+'|'+file.id+'|'+target.id;let request=requests.get(requestKey);try{request||=storage?.getItem(requestKey);}catch{}
   if(!/^move-[A-Za-z0-9-]{20,80}$/.test(request||'')){request='move-'+crypto.randomUUID();requests.set(requestKey,request);try{storage?.setItem(requestKey,request);}catch{}}
   const ack=await rpc('deplacerElementCDQV2677',String(file.id),String(target.id),request);guard();
   if(ack?.ok!==true||String(ack.id)!==String(file.id)||String(ack.destinationId)!==String(target.id)||ack.clientId&&String(ack.clientId)!==String(clientId)||ack.sourceClientId&&String(ack.sourceClientId)!==String(clientId))throw Error('Déplacement de la liste non confirmé.');
   moved=true;
  }
  if(moved){root=await read(clientId);const fresh=await read(target.id);children[children.findIndex(d=>String(d.id)===String(target.id))]=fresh;
   if(root.fichiers.some(f=>list(f)&&direct.some(old=>String(old.id)===String(f.id)))||direct.some(old=>!fresh.fichiers.some(f=>list(f)&&String(f.id)===String(old.id))))throw Error('Le dossier final de la liste n’a pas été confirmé.');
  }
  root={...root,dossiers:root.dossiers.map(d=>children.find(child=>String(child.id)===String(d.id))||d)};
  const location=balanceListLocationV2731(root,preferredFileId),result={clientId:String(clientId),root,folder:location.folder||target,file:location.file,moved};guard();onLocated(result);return result;
 };
 // Web Locks prevent duplicate creation between windows on the same origin;
 // the supported server reservation covers mutations from different devices.
 const locks=globalThis.navigator?.locks,task=locks?locks.request('cdqBalanceListFolderV2731:'+key,work):work();pending.set(key,task);
 try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
}
