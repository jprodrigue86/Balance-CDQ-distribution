// Existing session, writer role, Drive permission, ancestry and protection apply.
function deplacerElementCDQV2677(id,destinationId,requestId){
 var user=cdqWsAccessV2638_(true);id=cdqDriveIdV2521_(id);destinationId=cdqDriveIdV2521_(destinationId);requestId=String(requestId||'');
 if(!/^move-[A-Za-z0-9-]{20,80}$/.test(requestId))throw Error('Demande de déplacement invalide.');
 var lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  var cache={},source=cdqCopyScopeV2522_(id,cache),dest=cdqDriveScopeV2521_(destinationId,cache,[CONFIG.MASTER_FOLDER_ID]);
  if(source.path.length<2||source.root===CONFIG.MASTER_FOLDER_ID&&source.path.length<3||dest.path.length<2||dest.meta.mimeType!=='application/vnd.google-apps.folder')throw Error('Choisissez un élément et un dossier client valides.');
  if(source.meta.mimeType==='application/vnd.google-apps.shortcut')throw Error('Déplacez la cible du raccourci séparément.');
  if(dest.path.some(function(p){return p.id===id;}))throw Error('Un dossier ne peut pas être déplacé à l’intérieur de lui-même.');
  var props=PropertiesService.getScriptProperties(),key='CDQ_MOVE_V2677_'+empreinteCDQ_(String(user.email).toLowerCase()),history=JSON.parse(props.getProperty(key)||'[]'),old=history.filter(function(x){return x.requestId===requestId;})[0];
  if(old&&(old.source!==id||old.destination!==destinationId))throw Error('La destination de cette demande a changé.');
  var parent=source.path[source.path.length-2].id;
  verifierModificationDossierAutorisee_(DriveApp.getFolderById(destinationId),'y déplacer un élément');
  if(source.meta.mimeType==='application/vnd.google-apps.folder')verifierModificationDossierAutorisee_(DriveApp.getFolderById(id),'le déplacer');
  if(parent!==destinationId)verifierModificationDossierAutorisee_(DriveApp.getFolderById(parent),'en déplacer un élément');
  var entry=old||{requestId:requestId,source:id,destination:destinationId,sourceParentId:parent,sourceClientId:cdqCopyClientV2522_(source),time:Date.now()};
  if(parent===destinationId&&!old)throw Error('L’élément est déjà dans ce dossier.');
  if(old&&old.result)return old.result;
  var recent=history.filter(function(x){return Date.now()-x.time<7*86400000&&x.requestId!==requestId;}).slice(-9);recent.push(entry);
  var save=function(){props.setProperty(key,JSON.stringify(recent));};save();
  if(parent!==destinationId){
   if(parent!==entry.sourceParentId)throw Error('L’élément a changé de dossier. Actualisez avant de le déplacer.');
   var fresh=Drive.Files.get(id,{fields:'id,parents',supportsAllDrives:true});
   if(!fresh.parents||fresh.parents.length!==1||fresh.parents[0]!==parent)throw Error('Le dossier source a changé.');
   Drive.Files.update({},id,null,{addParents:destinationId,removeParents:parent,fields:'id,name,parents',supportsAllDrives:true});
  }
  var confirmed=Drive.Files.get(id,{fields:'id,name,mimeType,parents',supportsAllDrives:true});
  if(!confirmed.parents||confirmed.parents.indexOf(destinationId)<0)throw Error('Le déplacement n’a pas été confirmé. Réessayez la même demande.');
  entry.result={ok:true,id:id,nom:confirmed.name,kind:confirmed.mimeType==='application/vnd.google-apps.folder'?'folder':'file',destinationId:destinationId,sourceParentId:entry.sourceParentId,sourceClientId:entry.sourceClientId,clientId:cdqCopyClientV2522_(dest)};save();
  [entry.result.sourceClientId,entry.result.clientId].filter(Boolean).forEach(function(client){invaliderCacheContenuClient_(client);});
  return entry.result;
 }finally{lock.releaseLock();}
}

