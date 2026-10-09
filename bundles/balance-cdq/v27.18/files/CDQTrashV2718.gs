/* Account-bound CDQ trash. Never expose the deployment account's personal trash.
 * The existing CDQ session, live Drive ACL and role authorize every request.
 */
function cdqTrashRootsV2718_(){
 var roots=[String(CONFIG.MASTER_FOLDER_ID||'')];
 if(typeof CDQ_GENERAL_DRIVE_V2521_!=='undefined')roots.push(String(CDQ_GENERAL_DRIVE_V2521_));
 return roots.filter(function(id){return /^[A-Za-z0-9_-]{10,200}$/.test(id);});
}
function cdqTrashMetaV2718_(id,cache){
 id=cdqDriveIdV2521_(id);
 if(!Object.prototype.hasOwnProperty.call(cache,id))cache[id]=Drive.Files.get(id,{fields:'id,name,mimeType,parents,trashed,explicitlyTrashed,capabilities(canUntrash)',supportsAllDrives:true});
 return cache[id];
}
function cdqTrashScopeV2718_(file,cache){
 var roots=cdqTrashRootsV2718_(),seen={},queue=[file],reads=0;
 if(roots.indexOf(file.id)>=0)return false;
 while(queue.length&&reads++<60){
  var meta=queue.shift();if(seen[meta.id])continue;seen[meta.id]=true;
  if(roots.indexOf(meta.id)>=0)return meta.trashed!==true;
  if(meta.mimeType==='application/vnd.google-apps.shortcut')continue;
  (meta.parents||[]).forEach(function(id){queue.push(cdqTrashMetaV2718_(id,cache));});
 }
 return false;
}
function cdqListerCorbeilleV2718(pageToken){
 var user=cdqWsAccessV2638_(false),cache={},token=cdqDrivePageV2521_(pageToken);
 var options={q:'trashed=true',pageSize:100,orderBy:'modifiedTime desc',fields:'nextPageToken,files(id,name,mimeType,parents,trashed,explicitlyTrashed,capabilities(canUntrash))',supportsAllDrives:true,includeItemsFromAllDrives:true};
 if(token)options.pageToken=token;
 var result=Drive.Files.list(options),write=['admin','technicien'].indexOf(normaliserRoleCDQ_(user.role))>=0;
 var files=(result.files||[]).filter(function(file){cache[file.id]=file;return file.trashed===true&&file.explicitlyTrashed!==false&&cdqTrashScopeV2718_(file,cache);}).map(function(file){
  var parentTrashed=(file.parents||[]).some(function(id){return cdqTrashMetaV2718_(id,cache).trashed===true;});
  return {id:file.id,name:file.name,mimeType:file.mimeType,trashed:true,canRestore:write&&!parentTrashed&&file.capabilities&&file.capabilities.canUntrash===true};
 });
 return {ok:true,account:user.email,files:files,next:String(result.nextPageToken||'')};
}
function cdqRestaurerCorbeilleV2718(id){
 var user=cdqWsAccessV2638_(true),cache={},file=cdqTrashMetaV2718_(id,cache);
 if(!cdqTrashScopeV2718_(file,cache))throw Error('Cet élément ne fait pas partie des dossiers CDQ autorisés.');
 if(!file.trashed)throw Error('Ce fichier n’est plus dans la corbeille. Actualisez la liste.');
 if(!file.capabilities||file.capabilities.canUntrash!==true)throw Error('Drive ne permet pas cette restauration.');
 if((file.parents||[]).some(function(parent){return cdqTrashMetaV2718_(parent,cache).trashed===true;}))throw Error('Restaurez d’abord le dossier parent.');
 if(file.mimeType==='application/vnd.google-apps.folder')DriveApp.getFolderById(file.id).setTrashed(false);
 else DriveApp.getFileById(file.id).setTrashed(false);
 var confirmed=Drive.Files.get(file.id,{fields:'id,trashed',supportsAllDrives:true});
 if(confirmed.id!==file.id||confirmed.trashed!==false)throw Error('La restauration n’a pas été confirmée.');
 invaliderCacheCompagnies_();
 (file.parents||[]).forEach(function(parent){invaliderCacheContenuClient_(parent);});
 return {ok:true,account:user.email,id:file.id,trashed:false};
}
