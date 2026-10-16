// The trusted CDQ page obtains this short-lived policy from the authenticated
// server. Google OAuth remains private to the existing Drive client. This is
// an application policy check, not a signed grant for an untrusted client.
export const SCOPED_DRIVE_ROOTS_V2752=Object.freeze(['1cU0ekKqfuf9nOytUsnH1Mbljx8gWWe77','1F7rgU20Hc1PmjxQHY7ALTqkqArN6RSsf']);
const folderMime='application/vnd.google-apps.folder',shortcutMime='application/vnd.google-apps.shortcut';
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{10,200}$/.test(id);
export function scopedDriveErrorV2752(message,code='CDQ_DRIVE_DELETE_REFUSED'){const error=Error(message);error.code=code;return error;}
export function validateScopedDrivePolicyV2752(plan,account,now=Date.now()){
 if(plan?.schema!=='cdq-scoped-drive-action-v2752'||!validId(plan.id)||!['file','folder'].includes(plan.kind)||typeof plan.trash!=='boolean'||typeof plan.allowProtected!=='boolean'||plan.account!==account||!/^delete-[\w-]{8,100}$/.test(plan.requestId||'')||!Number.isFinite(plan.expiresAt)||plan.expiresAt<=now||plan.expiresAt>now+120000)throw scopedDriveErrorV2752('La préparation de cette opération Drive a expiré ou ne correspond plus au compte choisi.','CDQ_DELETE_AUTH_REQUIRED');
 if(!Array.isArray(plan.roots)||plan.roots.length!==2||new Set(plan.roots).size!==2||!SCOPED_DRIVE_ROOTS_V2752.every(id=>plan.roots.includes(id))||typeof plan.clientId!=='string'||plan.clientId&&!validId(plan.clientId)||plan.roots.includes(plan.id)||plan.id===plan.clientId)throw scopedDriveErrorV2752('Le périmètre de cette opération Drive n’est pas autorisé.');
 return plan;
}
export async function applyScopedDriveActionV2752(plan,{account,guard,json,now=Date.now}){
 const valid=()=>{guard();validateScopedDrivePolicyV2752(plan,account,now());};valid();
 const about=await json('about?fields=user(emailAddress)');valid();if(String(about?.user?.emailAddress||'').trim().toLowerCase()!==account)throw scopedDriveErrorV2752('Le compte Google ne correspond pas au compte choisi.','CDQ_DELETE_ACCOUNT_CHANGED');
 const fields='id,name,mimeType,parents,description,trashed,owners(emailAddress),capabilities(canTrash,canUntrash)',cache=new Map();
 async function meta(id,fresh=false){valid();if(!validId(id))throw scopedDriveErrorV2752('Identifiant Drive invalide.');if(!fresh&&cache.has(id))return cache.get(id);const value=await json('files/'+encodeURIComponent(id)+'?supportsAllDrives=true&fields='+encodeURIComponent(fields));valid();if(value?.id!==id||typeof value.trashed!=='boolean'||!Array.isArray(value.parents)&&!plan.roots.includes(id))throw scopedDriveErrorV2752('Drive n’a pas confirmé l’identité et le dossier de cet élément.');cache.set(id,value);return value;}
 const target=await meta(plan.id),path=[],seen=new Set();let current=target;
 for(let reads=0;reads<60;reads++){
  valid();if(seen.has(current.id))throw scopedDriveErrorV2752('Le chemin Drive est ambigu.');seen.add(current.id);path.unshift(current);
  if(current.mimeType===shortcutMime)throw scopedDriveErrorV2752('Ouvrez ce raccourci dans Google Drive.');
  if(current.mimeType===folderMime&&String(current.description||'').includes('[CDQ_PROTECTED]')&&!plan.allowProtected)throw scopedDriveErrorV2752('Ce dossier est protégé. Seul le propriétaire principal peut le modifier.');
  if(plan.roots.includes(current.id))break;
  if(current.parents.length!==1)throw scopedDriveErrorV2752('Le dossier de cet élément est absent ou ambigu.');current=await meta(current.parents[0]);
 }
 const root=path[0];if(!root||!plan.roots.includes(root.id)||root.trashed)throw scopedDriveErrorV2752('Cet élément ne fait pas partie des dossiers CDQ autorisés.');
 if(root.id===SCOPED_DRIVE_ROOTS_V2752[0]&&(!plan.clientId||path.length<3||path[1].id!==plan.clientId)||root.id===SCOPED_DRIVE_ROOTS_V2752[1]&&plan.clientId)throw scopedDriveErrorV2752('Cet élément ne fait pas partie du client demandé.');
 if((target.mimeType===folderMime)!==(plan.kind==='folder'))throw scopedDriveErrorV2752('Le type de cet élément a changé. Actualisez la liste.');
 const before=await meta(plan.id,true);if(JSON.stringify(before.parents)!==JSON.stringify(target.parents)||before.mimeType!==target.mimeType||String(before.description||'')!==String(target.description||''))throw scopedDriveErrorV2752('Cet élément a changé de dossier ou de protection. Recommencez sa préparation.');
 if(before.trashed!==plan.trash){
  const capability=plan.trash?'canTrash':'canUntrash';if(before.capabilities?.[capability]!==true){const owners=(before.owners||[]).map(owner=>String(owner.emailAddress||'')).filter(Boolean).join(', ');throw scopedDriveErrorV2752('Google ne permet pas '+(plan.trash?'la mise à la corbeille':'la restauration')+' avec le compte '+account+'.'+(owners?' Propriétaire : '+owners+'.':'')+' Vérifiez le propriétaire et les autorisations du fichier.','CDQ_DRIVE_PERMISSION');}
  if(!plan.trash&&path.slice(0,-1).some(item=>item.trashed))throw scopedDriveErrorV2752('Restaurez d’abord le dossier parent.');
  valid();try{await json('files/'+encodeURIComponent(plan.id)+'?supportsAllDrives=true&fields=id,trashed',{method:'PATCH',body:JSON.stringify({trashed:plan.trash})});}catch(error){if([400,403,404,409,412,429].includes(error?.status))throw error;throw scopedDriveErrorV2752('La réponse de Drive est incertaine. La demande reste conservée jusqu’à vérification.','CDQ_DELETE_UNCONFIRMED');}
 }
 let receipt;try{receipt=await json('files/'+encodeURIComponent(plan.id)+'?supportsAllDrives=true&fields=id,trashed');}catch{throw scopedDriveErrorV2752('Drive n’a pas pu relire le résultat. La demande reste conservée jusqu’à confirmation.','CDQ_DELETE_UNCONFIRMED');}valid();
 if(receipt?.id!==plan.id||receipt.trashed!==plan.trash)throw scopedDriveErrorV2752('Drive n’a pas confirmé l’identifiant et l’état de cet élément.','CDQ_DELETE_UNCONFIRMED');
 return {ok:true,id:plan.id,trashed:plan.trash,account};
}
