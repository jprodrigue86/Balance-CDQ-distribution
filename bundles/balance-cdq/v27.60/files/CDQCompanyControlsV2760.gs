/* Company creation receipts are bound to the authenticated actor and operation,
 * never to a company name. Only confirmed Drive IDs can leave the company list.
 * This code never permanently deletes a Drive item. */
function cdqCompanyOwnerV2760_(action,expected){
 // The generic role check may reuse the RPC's initial verified user. Reuse
 // the guarded transport check to reread the live session, role and Drive
 // authorization, especially after waiting for ScriptLock.
 var access=cdqUploadAccessV2751_(true),owner=normaliserEmailCDQ_(access.email);
 if(action==='suppressionDossier'&&normaliserRoleCDQ_(access.role)!=='admin')throw Error('ACTION NON AUTORISÉE : la corbeille des compagnies est réservée aux administrateurs.');
 if(!owner||expected&&owner!==normaliserEmailCDQ_(expected))throw Error('Le compte CDQ a changé.');
 return owner;
}
function cdqCompanyMetadataV2760_(id){
 return Drive.Files.get(cdqDriveIdV2521_(id),{fields:'id,name,mimeType,parents,trashed,description,owners(emailAddress),driveId,capabilities(canTrash,canUntrash,canAddChildren),appProperties',supportsAllDrives:true});
}
function cdqCompanyScopeV2760_(meta,root){
 if(!meta||String(meta.id)===String(root.id)||meta.mimeType!=='application/vnd.google-apps.folder'||!Array.isArray(meta.parents)||meta.parents.length!==1||String(meta.parents[0])!==String(root.id))throw Error('Cette sélection ne correspond pas à une compagnie directement dans le dossier CDQ.');
 if(root.trashed===true)throw Error('Le dossier principal CDQ est dans la corbeille.');
 cdqDeleteProtectionV2752_({meta:meta,path:[root,meta]});return meta;
}
function cdqCompanyUnconfirmedV2760_(){
 var error=Error('La création n’a pas encore été confirmée. La demande est conservée; réessayez pour retrouver la compagnie sans la créer une seconde fois.');
 error.code='CDQ_COMPANY_CREATE_UNCONFIRMED';return error;
}
function cdqCreateCompanyOnceV2760_(name,requestId){
 var owner=cdqCompanyOwnerV2760_('ecriture'),rootId=cdqDriveIdV2521_(String(CONFIG.MASTER_FOLDER_ID)),name=String(name||'').trim();
 if(!name||name.length>200)throw Error(!name?'Le nom du dossier ne peut pas être vide.':'Le nom du dossier est trop long.');
 // Existing clients have no request ID. Their supported call remains valid;
 // V27.60 persists and supplies the same ID when its response is uncertain.
 requestId=String(requestId||'company-'+Utilities.getUuid());
 if(!/^company-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(requestId))throw Error('Identifiant de création invalide.');
 var token=empreinteCDQ_(owner+'|'+requestId),fingerprint=empreinteCDQ_(JSON.stringify([owner,rootId,name])),key='CDQ_COMPANY_CREATE_V2760_'+token;
 var props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  cdqCompanyOwnerV2760_('ecriture',owner);
  var root=cdqCompanyMetadataV2760_(rootId);
  if(root.mimeType!=='application/vnd.google-apps.folder'||root.trashed===true)throw Error('Le dossier principal CDQ est indisponible.');
  var text=props.getProperty(key),record=text?JSON.parse(text):null,reused=!!record,meta=null;
  if(record&&record.fingerprint!==fingerprint)throw Error('Cette demande de création a déjà été utilisée avec un autre nom.');
  if(record&&record.id){meta=cdqCompanyMetadataV2760_(record.id);}
  else if(record){
   // The operation tag is committed atomically with the Drive folder. A lost
   // reply cannot cause a second create, even if the receipt was not completed.
   var found=Drive.Files.list({q:"'"+rootId+"' in parents and mimeType='application/vnd.google-apps.folder' and appProperties has { key='cdqCompanyCreateV2760' and value='"+token+"' }",fields:'files(id),nextPageToken',pageSize:2,supportsAllDrives:true,includeItemsFromAllDrives:true});
   if(found.nextPageToken||(found.files||[]).length>1)throw Error('La demande de création est ambiguë. Aucune autre compagnie ne sera créée.');
   if(!(found.files||[]).length)throw cdqCompanyUnconfirmedV2760_();
   meta=cdqCompanyMetadataV2760_(found.files[0].id);
  }else{
   if(root.capabilities?.canAddChildren===false)throw Error('Drive ne permet pas de créer une compagnie dans ce dossier.');
   record={fingerprint:fingerprint,phase:'creating',startedAt:Date.now()};
   // Persist uncertainty before the only create call. A retry is read-only
   // until the existing operation is found or its saved ID is available.
   props.setProperty(key,JSON.stringify(record));
   meta=Drive.Files.create({name:name,mimeType:'application/vnd.google-apps.folder',parents:[rootId],appProperties:{cdqCompanyCreateV2760:token,cdqCompanyPayloadV2760:fingerprint}},null,{fields:'id,name,mimeType,parents,trashed,appProperties',supportsAllDrives:true});
  }
  cdqCompanyScopeV2760_(meta,root);
  if(meta.appProperties?.cdqCompanyCreateV2760!==token||meta.appProperties?.cdqCompanyPayloadV2760!==fingerprint)throw Error('Le reçu de création ne correspond pas à cette compagnie.');
  record.id=String(meta.id);record.phase='created';props.setProperty(key,JSON.stringify(record));
  // An already trashed receipt never resurrects a company during a retry.
  if(meta.trashed!==true)assurerStructureClientAIOuverture_(record.id);
  record.phase='confirmed';props.setProperty(key,JSON.stringify(record));
  invaliderCacheCompagnies_();
  return {id:record.id,nom:String(meta.name||name),owner:owner,requestId:requestId,reused:reused,trashed:meta.trashed===true};
 }finally{lock.releaseLock();}
}

function cdqCompanyTrashV2760_(payload,trash){
 var p=payload||{},owner=cdqCompanyOwnerV2760_('suppressionDossier',p.owner);
 if(!p.owner||!Array.isArray(p.ids)||p.ids.length<1||p.ids.length>50)throw Error('Sélectionnez de 1 à 50 compagnies.');
 var ids=p.ids.map(function(id){return cdqDriveIdV2521_(String(id||''));});
 if(ids.some(function(id,i){return ids.indexOf(id)!==i;}))throw Error('Une compagnie est présente plusieurs fois dans la sélection.');
 var lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  cdqCompanyOwnerV2760_('suppressionDossier',owner);
  var root=cdqCompanyMetadataV2760_(String(CONFIG.MASTER_FOLDER_ID));
  // Check the entire selection before the first write. No name lookup, child
  // traversal, unrelated root, model folder or file is an eligible company.
  ids.forEach(function(id){cdqCompanyScopeV2760_(cdqCompanyMetadataV2760_(id),root);});
  var result={owner:owner,trash:trash,complete:false,dossiers:[],noms:{},erreurs:[]};
  ids.forEach(function(id){
   try{
    cdqCompanyOwnerV2760_('suppressionDossier',owner);
    var meta=cdqCompanyScopeV2760_(cdqCompanyMetadataV2760_(id),root),capability=trash?'canTrash':'canUntrash';
    if(meta.trashed!==trash){
     if(meta.capabilities?.[capability]!==true)throw cdqDeletePermissionV2752_(meta,trash);
     Drive.Files.update({trashed:trash},id,null,{fields:'id,trashed',supportsAllDrives:true});
    }
    var receipt=cdqCompanyMetadataV2760_(id);cdqCompanyScopeV2760_(receipt,root);
    if(String(receipt.id)!==id||receipt.trashed!==trash){var uncertain=Error('Drive n’a pas confirmé la mise à jour de cette compagnie. Elle reste à vérifier.');uncertain.code='CDQ_DELETE_UNCONFIRMED';throw uncertain;}
    result.dossiers.push(id);result.noms[id]=String(receipt.name||'Compagnie');
   }catch(error){result.erreurs.push(cdqDeleteErrorV2752_(id,'folder',error));}
  });
  result.complete=result.dossiers.length===ids.length&&result.erreurs.length===0;
  invaliderCacheCompagnies_();return result;
 }finally{lock.releaseLock();}
}
function supprimerCompagniesV2760(payload){return cdqCompanyTrashV2760_(payload,true);}
function restaurerCompagniesV2760(payload){return cdqCompanyTrashV2760_(payload,false);}
