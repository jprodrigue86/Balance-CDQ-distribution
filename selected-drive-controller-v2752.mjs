import {scopedDriveErrorV2752,validateScopedDrivePolicyV2752} from './scoped-drive-actions-v2752.mjs';
const normalized=value=>String(value||'').trim().toLowerCase();
const pendingCodes=new Set(['CDQ_DELETE_UNCONFIRMED','CDQ_DELETE_AUTH_REQUIRED','CDQ_DELETE_ACCOUNT_CHANGED','CDQ_DELETE_NATIVE_UPDATE_REQUIRED']);
export function createSelectedDriveControllerV2752({client,account,actor,allowed,context=()=>0,refresh,now=Date.now}){
 function current(expected,stamp,owner){if(!allowed()||actor()!==owner||context()!==stamp)throw scopedDriveErrorV2752('Le compte CDQ ou son accès a changé.','CDQ_DELETE_ACCOUNT_CHANGED');if(normalized(account())!==expected)throw scopedDriveErrorV2752('Cette demande reste liée au compte Google '+expected+'. Sélectionnez ce compte pour la reprendre.','CDQ_DELETE_ACCOUNT_CHANGED');}
 async function authorize(expected,{explicit=false}={}){expected=normalized(expected);const owner=actor(),stamp=context();current(expected,stamp,owner);await client.authorizeScoped(explicit);current(expected,stamp,owner);}
 async function apply(initial){
  const expected=normalized(initial?.googleAccount),owner=actor(),stamp=context(),guard=()=>current(expected,stamp,owner);guard();
  const selectedOf=policy=>new Map([...(policy.fileIds||[]).map(id=>[id,'file']),...(policy.folderIds||[]).map(id=>[id,'folder'])]);
  function checked(policy,selected){
   if(policy?.ok!==true||policy.schema!=='cdq-selected-drive-policy-v2752'||normalized(policy.actorEmail)!==normalized(owner)||policy.googleAccount!==expected||policy.clientId!==initial.clientId||policy.requestId!==initial.requestId||policy.trash!==initial.trash||!Array.isArray(policy.fileIds)||!Array.isArray(policy.folderIds)||!Array.isArray(policy.targets)||!Array.isArray(policy.erreurs))throw scopedDriveErrorV2752('Le serveur CDQ n’a pas confirmé le périmètre de cette demande.');
   const returned=selectedOf(policy),covered=new Set();if(returned.size!==selected.size||[...selected].some(([id,kind])=>returned.get(id)!==kind))throw scopedDriveErrorV2752('Le serveur CDQ n’a pas confirmé les identifiants sélectionnés.');
   for(const item of [...policy.targets,...policy.erreurs]){if(selected.get(item.id)!==item.kind||covered.has(item.id))throw scopedDriveErrorV2752('Le serveur CDQ n’a pas confirmé les identifiants sélectionnés.');covered.add(item.id);}if(covered.size!==selected.size)throw scopedDriveErrorV2752('Le serveur CDQ n’a pas confirmé toute la sélection.');return policy;
  }
  let policy=checked(initial,selectedOf(initial));
  const result={ok:true,googleAccount:expected,fichiers:[],dossiers:[],ids:[],nombre:0,erreurs:policy.erreurs.map(error=>({...error}))};
  const sort=targets=>[...targets].sort((a,b)=>initial.trash?b.depth-a.depth:a.depth-b.depth);
  let remaining=sort(policy.targets);
  while(remaining.length){
   guard();
   // Keep exact earlier acknowledgements. A fresh CDQ policy covers only the
   // unprocessed suffix, so a slow large selection does not replay its prefix.
   if(policy.expiresAt-now()<=30000){
    if(typeof refresh!=='function')throw scopedDriveErrorV2752('La préparation de cette demande a expiré. Reprenez la suppression.','CDQ_DELETE_AUTH_REQUIRED');
    const pending=new Map(remaining.map(item=>[item.id,item.kind]));
    try{
     const fresh=await refresh({fileIds:remaining.filter(item=>item.kind==='file').map(item=>item.id),folderIds:remaining.filter(item=>item.kind==='folder').map(item=>item.id),clientId:initial.clientId,googleAccount:expected,requestId:initial.requestId,trash:initial.trash});guard();policy=checked(fresh,pending);
     if(!Number.isFinite(policy.expiresAt)||policy.expiresAt-now()<=30000||policy.expiresAt-now()>120000)throw scopedDriveErrorV2752('La nouvelle préparation CDQ n’est pas confirmée.','CDQ_DELETE_UNCONFIRMED');
     result.erreurs.push(...policy.erreurs.map(error=>({...error})));remaining=sort(policy.targets);if(!remaining.length)break;
    }catch(error){guard();const code=error?.code||(/permission|autorisation.*retir|non autoris|protégé/i.test(String(error?.message||error))?'CDQ_DRIVE_DELETE_REFUSED':'CDQ_DELETE_UNCONFIRMED');for(const item of remaining)result.erreurs.push({id:item.id,kind:item.kind,code,message:String(error?.message||error).slice(0,600)});break;}
   }
   const item=remaining.shift(),plan={schema:'cdq-scoped-drive-action-v2752',id:item.id,kind:item.kind,clientId:policy.clientId,roots:policy.roots,allowProtected:policy.allowProtected,trash:policy.trash,account:expected,requestId:policy.requestId,expiresAt:policy.expiresAt};validateScopedDrivePolicyV2752(plan,expected,now());
   try{const receipt=await client.scopedTrash(plan);guard();if(receipt?.id!==item.id||receipt.trashed!==policy.trash||normalized(receipt.account)!==expected)throw scopedDriveErrorV2752('Drive n’a pas confirmé cet élément.','CDQ_DELETE_UNCONFIRMED');result[item.kind==='folder'?'dossiers':'fichiers'].push(item.id);}
   catch(error){guard();result.erreurs.push({id:item.id,kind:item.kind,code:String(error?.code||'CDQ_DRIVE_DELETE_REFUSED'),message:String(error?.message||error).slice(0,600)});if(pendingCodes.has(error?.code))break;}
  }
  result.ids=[...result.fichiers];result.nombre=result.ids.length+result.dossiers.length;result.message=result.nombre+(result.nombre===1?' élément confirmé.':' éléments confirmés.');return result;
 }
 return {account:()=>normalized(account()),authorize,apply};
}
