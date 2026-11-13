/* Candidate only: shared client register, outside client PDF folders.
 * Caller identity, Drive access and client scope remain authoritative.
 * Reading never creates a file. Writing requires the read revision and an
 * explicit request id. No PDF, email, portal or migration side effect.
 */
function cdqContactScopeV2866_(clientId,write){
  var actor=cdqWsAccessV2638_(write),scope=cdqWsFolderV2638_(String(clientId||''));
  if(scope.path.length!==2||scope.meta.id!==String(clientId))throw Error('Choisissez un client.');
  return {actor:actor,clientId:scope.meta.id,clientName:scope.meta.name};
}
function cdqContactFileV2866_(clientId){
  var cloud=cdqCoordinatesFileV2874_(clientId);if(cloud)return cloud;
  var result=Drive.Files.list({q:"'"+cdq23Quote_(CDQ_WS_SYSTEM_V2638_)+"' in parents and trashed=false and appProperties has { key='cdqContactClientV2866' and value='"+cdq23Quote_(clientId)+"' }",pageSize:2,fields:'files(id,mimeType),nextPageToken',supportsAllDrives:true,includeItemsFromAllDrives:true}),files=result.files||[];
  if(files.length>1||result.nextPageToken)throw Error('Plusieurs fiches existent pour ce client. Vérification nécessaire.');
  if(files[0]&&files[0].mimeType!=='application/json')throw Error('Format du registre client inattendu.');
  return files[0]||null;
}
function cdqContactDataV2866_(scope,file){
  if(!file)return {schema:1,clientId:scope.clientId,revision:0,selectedSiteId:'principal',sites:[{id:'principal',label:'Site principal',adresse:'',complement:'',ville:'',province:'',codePostal:'',pays:'',telephone:''}]};
  var data=file.cdqCloudV2874?file.data:JSON.parse(DriveApp.getFileById(file.id).getBlob().getDataAsString('UTF-8'));
  if(data.schema!==1||data.clientId!==scope.clientId||!Number.isSafeInteger(data.revision)||data.revision<1||!Array.isArray(data.sites)||!data.sites.length)throw Error('La fiche client doit être vérifiée.');
  return data;
}
function cdqContactReplyV2866_(scope,data){
  return {ok:true,clientId:scope.clientId,clientName:scope.clientName,revision:data.revision,selectedSiteId:data.selectedSiteId,sites:data.sites,updatedAt:data.updatedAt||'',updatedBy:data.updatedBy||'',requestId:data.requestId||''};
}
function cdqLireCoordonneesClientV2866(clientId){
  var scope=cdqContactScopeV2866_(clientId,false);
  return cdqContactReplyV2866_(scope,cdqContactDataV2866_(scope,cdqContactFileV2866_(scope.clientId)));
}
function cdqContactCleanV2866_(payload){
  if(!payload||!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision<0||!/^contact-[a-zA-Z0-9-]{8,100}$/.test(String(payload.requestId||'')))throw Error('Révision ou demande de sauvegarde invalide.');
  if(!Array.isArray(payload.sites)||!payload.sites.length||payload.sites.length>20)throw Error('La fiche accepte de 1 à 20 sites.');
  var keys={label:120,adresse:200,complement:120,ville:120,province:80,codePostal:24,pays:80,telephone:60},ids=Object.create(null);
  var sites=payload.sites.map(function(source){
    var id=String(source.id||'');if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)||ids[id])throw Error('Identifiant de site invalide ou en double.');ids[id]=true;
    var site={id:id};Object.keys(keys).forEach(function(k){
      if(typeof source[k]!=='string'||source[k].length>keys[k]||/[\u0000-\u001f\u007f]/.test(source[k]))throw Error('Coordonnée invalide : '+k);
      site[k]=source[k].trim();
    });
    if(!site.label)throw Error('Nommez chaque site.');
    site.verification=source.verification||'a-confirmer';
    if(['a-confirmer','verifiee','non-trouvee'].indexOf(site.verification)<0)throw Error('État de vérification invalide.');
    site.source=String(source.source||'').trim();
    if(site.source.length>500||/[\u0000-\u001f\u007f]/.test(site.source))throw Error('Source invalide.');
    if(site.verification==='verifiee'&&(!site.adresse||!site.ville||!site.source))throw Error('Une adresse vérifiée doit avoir une rue, une ville et une source.');
    return site;
  });
  if(!ids[String(payload.selectedSiteId||'')])throw Error('Choisissez un site existant.');
  return {sites:sites,selectedSiteId:String(payload.selectedSiteId),requestId:payload.requestId};
}
function cdqEnregistrerCoordonneesClientV2866(clientId,payload){
  var scope=cdqContactScopeV2866_(clientId,true),clean=cdqContactCleanV2866_(payload),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw Error('Une sauvegarde est en cours. Réessayez.');
  try{
    var file=cdqContactFileV2866_(scope.clientId),data=cdqContactDataV2866_(scope,file);
    if(data.requestId===clean.requestId){
      var previousClean=cdqContactCleanV2866_({expectedRevision:data.revision,requestId:data.requestId,sites:data.sites,selectedSiteId:data.selectedSiteId});
      if(JSON.stringify(previousClean.sites)!==JSON.stringify(clean.sites)||data.selectedSiteId!==clean.selectedSiteId||data.updatedBy!==scope.actor.email)throw Error('Identifiant déjà utilisé pour une autre sauvegarde.');
      return cdqContactReplyV2866_(scope,data);
    }
    if(data.revision!==payload.expectedRevision)return {ok:false,code:'CONTACT_CONFLICT',clientId:scope.clientId,message:'Les coordonnées ont changé sur un autre appareil. Votre saisie est conservée; relisez la fiche avant de remplacer une valeur.'};
    var next={schema:1,clientId:scope.clientId,revision:data.revision+1,sites:clean.sites,selectedSiteId:clean.selectedSiteId,requestId:clean.requestId,updatedBy:scope.actor.email,updatedAt:new Date().toISOString()};
    next.sites.forEach(function(site){
      var old=data.sites.filter(function(s){return s.id===site.id;})[0];
      var unchanged=old&&['adresse','complement','ville','province','codePostal','pays','source','verification'].every(function(k){return String(old[k]||'')===String(site[k]||'');});
      site.verifiedAt=site.verification==='verifiee'?(unchanged&&old.verifiedAt||next.updatedAt):'';
      site.verifiedBy=site.verification==='verifiee'?(unchanged&&old.verifiedBy||scope.actor.email):'';
    });
    if(data.history!==undefined&&!Array.isArray(data.history))throw Error('Historique des coordonnées invalide.');
    next.history=(data.history||[]).concat([{revision:next.revision,at:next.updatedAt,actor:next.updatedBy,requestId:next.requestId,before:{sites:data.sites,selectedSiteId:data.selectedSiteId},after:{sites:next.sites,selectedSiteId:next.selectedSiteId}}]);
    var blob=Utilities.newBlob(JSON.stringify(next),'application/json','Coordonnees-'+scope.clientId+'.json');
    if(file&&file.cdqCloudV2874){
      try{cdqCoordinatesSaveV2874_(scope,file,next);}
      catch(error){if(String(error.message)==='COORDINATES_CONFLICT')return {ok:false,code:'CONTACT_CONFLICT',clientId:scope.clientId,message:'Les coordonnées ont changé sur un autre appareil. Votre saisie est conservée; relisez la fiche avant de remplacer une valeur.'};throw error;}
    }
    else if(file)Drive.Files.update({},file.id,blob,{supportsAllDrives:true,fields:'id'});
    else Drive.Files.create({name:blob.getName(),mimeType:'application/json',parents:[CDQ_WS_SYSTEM_V2638_],appProperties:{cdqContactClientV2866:scope.clientId}},blob,{supportsAllDrives:true,fields:'id'});
    CacheService.getScriptCache().remove('CDQ38_LOCATION_'+scope.clientId);
    return cdqContactReplyV2866_(scope,next);
  }finally{lock.releaseLock();}
}
function cdqContactPrefillV2866_(clientId){
  var reply=cdqLireCoordonneesClientV2866(clientId);if(!reply.revision)return null;
  var site=reply.sites.filter(function(v){return v.id===reply.selectedSiteId;})[0];if(!site)throw Error('Le site sélectionné est introuvable.');
  if(site.verification!=='verifiee')return {client_nom:reply.clientName,cdqContactRevisionV2866:reply.revision,cdqContactSiteV2866:site.id,cdqContactNeedsReviewV2866:true};
  return {client_nom:reply.clientName,client_adresse:[site.adresse,site.complement].filter(Boolean).join(', '),client_ville:site.ville,client_province:site.province,client_code_postal:site.codePostal,client_telephone:site.telephone,client_pays:site.pays,cdqContactRevisionV2866:reply.revision,cdqContactSiteV2866:site.id};
}
