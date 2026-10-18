/* V27.52: the advanced Drive service supports shared drives. An item is
 * acknowledged only after an exact ID/trashed read-back, never from a count.
 * Keep the legacy RPC names and response arrays so installed clients benefit.
 */
var CDQ_DELETE_FIELDS_V2752_='id,name,mimeType,parents,description,trashed,driveId,owners(emailAddress),capabilities(canTrash,canUntrash)';
function cdqDeleteMetaV2752_(id,cache){
 id=cdqDriveIdV2521_(id);
 if(!Object.prototype.hasOwnProperty.call(cache,id))cache[id]=Drive.Files.get(id,{fields:CDQ_DELETE_FIELDS_V2752_,supportsAllDrives:true});
 var meta=cache[id];if(!meta||String(meta.id)!==id)throw Error('Drive n’a pas confirmé l’identité de cet élément.');return meta;
}
function cdqDeleteScopeV2752_(id,clientId,cache){
 var roots=cdqTrashRootsV2718_(),target=cdqDeleteMetaV2752_(id,cache),seen={},queue=[{meta:target,path:[]}],reads=0;
 if(roots.indexOf(target.id)>=0||clientId&&target.id===clientId)throw Error('Le dossier principal ou le dossier client ne peut pas être supprimé.');
 while(queue.length&&reads++<60){
  var node=queue.shift(),meta=node.meta;if(seen[meta.id])continue;seen[meta.id]=true;
  var path=[meta].concat(node.path);
  if(roots.indexOf(meta.id)>=0){
   if(meta.trashed===true)throw Error('Le dossier principal CDQ est dans la corbeille.');
   if(clientId&&(meta.id!==String(CONFIG.MASTER_FOLDER_ID)||path.length<3||String(path[1].id)!==clientId))throw Error('Cet élément ne fait pas partie du client demandé.');
   return {meta:target,path:path};
  }
  if(meta.mimeType==='application/vnd.google-apps.shortcut')throw Error('Ouvrez ce raccourci dans Google Drive.');
  (meta.parents||[]).forEach(function(parent){queue.push({meta:cdqDeleteMetaV2752_(parent,cache),path:path});});
 }
 throw Error('Cet élément ne fait pas partie des dossiers CDQ autorisés.');
}
function cdqDeleteProtectionV2752_(scope){
 for(var i=0;i<scope.path.length;i++){
  var item=scope.path[i];
  if(item.mimeType==='application/vnd.google-apps.folder'&&String(item.description||'').indexOf('[CDQ_PROTECTED]')>=0&&!estProprietairePrincipal_())throw Error('Ce dossier est protégé. Seul le propriétaire principal peut le modifier.');
 }
}
function cdqDeleteErrorV2752_(id,kind,error){
 var message=String(error&&error.message||error||'Drive n’a pas confirmé cette opération.').replace(/https?:\/\/\S+/g,'[lien]').slice(0,600);
 return {id:id,kind:kind,code:String(error&&error.code||'CDQ_DRIVE_DELETE_REFUSED'),message:message};
}
function cdqDeletePermissionV2752_(meta,trash){
 var owners=(meta.owners||[]).map(function(owner){return String(owner.emailAddress||'').trim().toLowerCase();}).filter(function(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}),effective=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
 var message='Drive refuse '+(trash?'la mise à la corbeille':'la restauration')+' de « '+String(meta.name||meta.id).slice(0,180)+' ».';
 if(!meta.driveId&&owners.length&&effective&&owners.indexOf(effective)<0)message+=' Propriétaire : '+owners.join(', ')+'. Compte du serveur CDQ : '+effective+'. Cette opération doit être effectuée par le propriétaire du fichier.';
 else message+=' Le compte du serveur CDQ ne dispose pas du droit requis. Vérifiez les autorisations Drive.';
 var error=Error(message);error.code='CDQ_DRIVE_PERMISSION';return error;
}
function cdqDeleteSelectionV2752_(fileIds,folderIds,clientId,trash){
 var user=cdqWsAccessV2638_(true);clientId=String(clientId||'').trim();if(clientId)cdqDriveIdV2521_(clientId);
 var normalize=function(ids){if(!Array.isArray(ids))return [];return ids.map(function(id){return cdqDriveIdV2521_(String(id||'').trim());}).filter(function(id,i,all){return all.indexOf(id)===i;});};
 fileIds=normalize(fileIds);folderIds=normalize(folderIds);
 if(!fileIds.length&&!folderIds.length)throw Error('Aucun élément sélectionné.');
 if(fileIds.length)verifierDroit_(trash?'suppressionFichier':'ecriture');if(folderIds.length)verifierDroit_(trash?'suppressionDossier':'ecriture');
 var lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  cdqWsActorV2638_(user.email);
  var result={ok:true,complete:false,fichiers:[],dossiers:[],ids:[],nombre:0,noms:{},erreurs:[]},cache={},items=[];
  fileIds.forEach(function(id){items.push({id:id,kind:'file'});});folderIds.forEach(function(id){items.push({id:id,kind:'folder'});});
  items.forEach(function(item){try{
   item.scope=cdqDeleteScopeV2752_(item.id,clientId,cache);
   var isFolder=item.scope.meta.mimeType==='application/vnd.google-apps.folder';if(isFolder!==(item.kind==='folder'))throw Error('Le type de cet élément a changé. Actualisez la liste.');
   cdqDeleteProtectionV2752_(item.scope);
  }catch(error){item.error=error;}});
  // Trash children before selected parents; restore parents before children.
  items.sort(function(a,b){return trash?(b.scope?.path.length||0)-(a.scope?.path.length||0):(a.scope?.path.length||0)-(b.scope?.path.length||0);});
  items.forEach(function(item){try{
   if(item.error)throw item.error;
   var meta=cdqDeleteMetaV2752_(item.id,{}),capability=trash?'canTrash':'canUntrash';
   if(meta.trashed!==trash){
    if(!meta.capabilities||meta.capabilities[capability]!==true)throw cdqDeletePermissionV2752_(meta,trash);
    if(!trash&&(meta.parents||[]).some(function(id){return cdqDeleteMetaV2752_(id,{}).trashed===true;}))throw Error('Restaurez d’abord le dossier parent.');
    Drive.Files.update({trashed:trash},item.id,null,{fields:'id,trashed',supportsAllDrives:true});
   }
   var receipt;
   try{receipt=Drive.Files.get(item.id,{fields:'id,trashed',supportsAllDrives:true});}catch(readError){var lost=Error('Drive n’a pas pu relire le résultat de cette opération. La demande doit être conservée jusqu’à confirmation.');lost.code='CDQ_DELETE_UNCONFIRMED';throw lost;}
   if(!receipt||String(receipt.id)!==item.id||receipt.trashed!==trash){var uncertain=Error('Drive n’a pas confirmé '+(trash?'la suppression':'la restauration')+' de cet élément. Actualisez avant de réessayer.');uncertain.code='CDQ_DELETE_UNCONFIRMED';throw uncertain;}
   result[item.kind==='file'?'fichiers':'dossiers'].push(item.id);
   result.noms[item.id]=String(meta.name||'');
  }catch(error){result.erreurs.push(cdqDeleteErrorV2752_(item.id,item.kind,error));}});
  result.ids=result.fichiers.slice();result.nombre=result.fichiers.length+result.dossiers.length;result.complete=result.erreurs.length===0;
  result.message=result.nombre+(result.nombre===1?' élément '+(trash?'envoyé à la corbeille.':'restauré.'):' éléments '+(trash?'envoyés à la corbeille.':'restaurés.'));
  invaliderCacheCompagnies_();if(clientId)invaliderCacheContenuClient_(clientId);
  return result;
 }finally{lock.releaseLock();}
}
function cdqDeleteFolderV2752_(id,clientId,trash){
 var result=cdqDeleteSelectionV2752_([],[id],clientId,trash);
 if(!result.complete){var failure=result.erreurs[0]||{},error=Error((failure.code==='CDQ_DELETE_UNCONFIRMED'?'CDQ_DELETE_UNCONFIRMED : ':'')+(failure.message||'Drive n’a pas confirmé cette opération.'));error.code=failure.code;throw error;}
 result.id=result.dossiers[0];result.nom=result.noms[result.id];return result;
}

// The server authorizes CDQ policy; it does not lend its Gmail Drive identity.
// The trusted application then uses the explicitly selected Google principal,
// whose own current canTrash/canUntrash is still mandatory before a mutation.
function cdqPrepareSelectedDriveDeletionV2752(payload){
 var p=payload||{},user=cdqWsAccessV2638_(true);cdqWsActorV2638_(user.email);
 var google=normaliserEmailCDQ_(p.googleAccount),clientId=String(p.clientId||''),requestId=String(p.requestId||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(google)||!/^delete-[\w-]{8,100}$/.test(requestId)||typeof p.trash!=='boolean')throw Error('Compte Google ou demande de suppression invalide.');
 if(!cdqVerifierCompteDriveV2620_(google).ok)throw Error('Le compte Google choisi n’a plus accès aux dossiers CDQ autorisés.');
 if(clientId)cdqDriveIdV2521_(clientId);
 var clean=function(ids){if(!Array.isArray(ids)||ids.length>200)throw Error('Sélection Drive invalide.');return ids.map(function(id){return cdqDriveIdV2521_(id);}).filter(function(id,i,all){return all.indexOf(id)===i;});},files=clean(p.fileIds),folders=clean(p.folderIds);
 if(!files.length&&!folders.length)throw Error('Aucun élément sélectionné.');
 if(files.length)verifierDroit_(p.trash?'suppressionFichier':'ecriture');if(folders.length)verifierDroit_(p.trash?'suppressionDossier':'ecriture');
 var result={ok:true,schema:'cdq-selected-drive-policy-v2752',actorEmail:normaliserEmailCDQ_(user.email),googleAccount:google,clientId:clientId,requestId:requestId,trash:p.trash,expiresAt:Date.now()+90000,roots:cdqTrashRootsV2718_(),allowProtected:!!estProprietairePrincipal_(),fileIds:files,folderIds:folders,targets:[],erreurs:[]},cache={};
 function inspect(id,kind){try{
  var scope=cdqDeleteScopeV2752_(id,clientId,cache),folder=scope.meta.mimeType==='application/vnd.google-apps.folder';
  if(folder!==(kind==='folder'))throw Error('Le type de cet élément a changé. Actualisez la liste.');
  var root=scope.path[0];if(root.id===String(CONFIG.MASTER_FOLDER_ID)&&(!clientId||scope.path.length<3||scope.path[1].id!==clientId)||root.id!==String(CONFIG.MASTER_FOLDER_ID)&&clientId)throw Error('Cet élément ne fait pas partie du client demandé.');
  cdqDeleteProtectionV2752_(scope);result.targets.push({id:id,kind:kind,depth:scope.path.length});
 }catch(error){result.erreurs.push(cdqDeleteErrorV2752_(id,kind,error));}}
 files.forEach(function(id){inspect(id,'file');});folders.forEach(function(id){inspect(id,'folder');});return result;
}
function cdqInvalidateSelectedDriveDeletionV2752(payload){
 var p=payload||{},user=cdqWsAccessV2638_(true);cdqWsActorV2638_(user.email);
 var clientId=String(p.clientId||''),google=normaliserEmailCDQ_(p.googleAccount),requestId=String(p.requestId||'');
 if(!/^delete-[\w-]{8,100}$/.test(requestId)||!cdqVerifierCompteDriveV2620_(google).ok)throw Error('Le compte ou l’accès Drive a changé.');
 if(clientId){cdqDriveIdV2521_(clientId);var scope=cdqWsFolderV2638_(clientId);if(scope.path.length!==2||scope.path[0].id!==String(CONFIG.MASTER_FOLDER_ID))throw Error('Dossier client non autorisé.');}
 invaliderCacheCompagnies_();if(clientId)invaliderCacheContenuClient_(clientId);
 return {ok:true,account:normaliserEmailCDQ_(user.email),clientId:clientId,requestId:requestId};
}


// Read-only filtering of a chosen-account trash page. No out-of-CDQ candidate
// reaches the PC list; a restore still requires a separate fresh write policy.
function cdqResolveSelectedDriveTrashV2752(payload){
 var p=payload||{},user=cdqWsAccessV2638_(false),live=trouverUtilisateurAutoriseParEmail_(user.email);
 if(!live||['admin','technicien','lecture'].indexOf(normaliserRoleCDQ_(live.role))<0||!cdqVerifierCompteDriveV2620_(user.email).ok)throw Error('L’autorisation du compte CDQ a été retirée.');
 var write=['admin','technicien'].indexOf(normaliserRoleCDQ_(live.role))>=0;
 var google=normaliserEmailCDQ_(p.googleAccount);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(google)||!cdqVerifierCompteDriveV2620_(google).ok)throw Error('Le compte Google choisi n’a plus accès aux dossiers CDQ autorisés.');
 if(!Array.isArray(p.ids)||p.ids.length>100)throw Error('Liste de corbeille invalide.');
 var ids=p.ids.map(function(id){return cdqDriveIdV2521_(id);}).filter(function(id,i,all){return all.indexOf(id)===i;}),cache={},items=[];
 ids.forEach(function(id){try{
  var scope=cdqDeleteScopeV2752_(id,'',cache),root=scope.path[0],clientId='';
  if(root.id===String(CONFIG.MASTER_FOLDER_ID)){if(scope.path.length<3)throw Error('Le dossier client ne peut pas être restauré ici.');clientId=String(scope.path[1].id);}
  cdqDeleteProtectionV2752_(scope);items.push({id:id,kind:scope.meta.mimeType==='application/vnd.google-apps.folder'?'folder':'file',clientId:clientId,canRestore:write});
 }catch(error){/* A foreign, protected or inaccessible candidate remains hidden. */}});
 return {ok:true,account:google,actorEmail:normaliserEmailCDQ_(user.email),items:items};
}
