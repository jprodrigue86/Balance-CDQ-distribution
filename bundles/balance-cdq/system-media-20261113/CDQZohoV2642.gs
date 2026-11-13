/* Zoho -> CDQ only. OAuth secrets remain in Script Properties, never the APK.
 * Set CDQ_ZOHO_DC (ca/com/eu/in/com.au), CLIENT_ID, CLIENT_SECRET,
 * REFRESH_TOKEN, ORGANIZATION_ID; optional CDQ_PRODUCT_SEARCH_KEY (Brave).
 * Existing local stock movements and technician quantities are independent.
 */
var CDQ_ZOHO_DCS_V2642_={ca:{auth:'https://accounts.zohocloud.ca',api:'https://www.zohoapis.ca'},com:{auth:'https://accounts.zoho.com',api:'https://www.zohoapis.com'},eu:{auth:'https://accounts.zoho.eu',api:'https://www.zohoapis.eu'},in:{auth:'https://accounts.zoho.in',api:'https://www.zohoapis.in'},'com.au':{auth:'https://accounts.zoho.com.au',api:'https://www.zohoapis.com.au'}};
function cdqZohoConfigV2642_(){
 var p=PropertiesService.getScriptProperties(),dc=String(p.getProperty('CDQ_ZOHO_DC')||'ca'),c={dc:dc,host:CDQ_ZOHO_DCS_V2642_[dc]};
 ['CLIENT_ID','CLIENT_SECRET','REFRESH_TOKEN','ORGANIZATION_ID'].forEach(function(k){c[k]=p.getProperty('CDQ_ZOHO_'+k)||'';});
 c.ready=!!(c.host&&c.CLIENT_ID&&c.CLIENT_SECRET&&c.REFRESH_TOKEN&&/^\d{3,40}$/.test(c.ORGANIZATION_ID));return c;
}
function cdqZohoAdminV2642_(){var u=cdqWsAccessV2638_(true);if(normaliserRoleCDQ_(u.role)!=='admin')throw Error('Réservé à la gestion de l’inventaire.');return u;}
function cdqZohoActorV2642_(){var p=PropertiesService.getScriptProperties(),email=p.getProperty('CDQ_ZOHO_ACTOR')||'',u=cdqWsActorV2638_(email);if(normaliserRoleCDQ_(u.role)!=='admin')throw Error('Gestionnaire Zoho non autorisé.');return u;}
function cdqZohoStatusV2642_(){var p=PropertiesService.getScriptProperties(),c=cdqZohoConfigV2642_();return {ok:true,configured:c.ready,enabled:p.getProperty('CDQ_ZOHO_ENABLED')==='true',dc:c.dc,revision:p.getProperty('CDQ_ZOHO_REVISION')||'',lastSync:Number(p.getProperty('CDQ_ZOHO_LAST_SYNC')||0),error:p.getProperty('CDQ_ZOHO_ERROR')||'',photoSearchConfigured:!!p.getProperty('CDQ_PRODUCT_SEARCH_KEY'),readOnlyZoho:true};}
function cdqZohoEtatV2642(){cdqWsAccessV2638_(false);return cdqZohoStatusV2642_();}
function cdqZohoActiverV2642(){
 var u=cdqZohoAdminV2642_(),c=cdqZohoConfigV2642_();if(!c.ready)throw Error('La connexion OAuth Zoho doit être enregistrée dans les paramètres serveur. Aucun mot de passe ni jeton ne doit être envoyé par message.');
 var test=cdqZohoGetV2642_('/organizations',{}),org=(test.organizations||[]).find(function(o){return String(o.organization_id)===c.ORGANIZATION_ID;});if(!org)throw Error('Organisation Zoho non confirmée.');
 var p=PropertiesService.getScriptProperties();p.setProperty('CDQ_ZOHO_ACTOR',u.email);p.setProperty('CDQ_ZOHO_ENABLED','true');
 if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='cdqZohoWorkerV2642_';}))ScriptApp.newTrigger('cdqZohoWorkerV2642_').timeBased().everyMinutes(5).create();
 return cdqZohoStatusV2642_();
}
function cdqZohoBudgetV2642_(){
 var p=PropertiesService.getScriptProperties(),day=Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd'),saved=JSON.parse(p.getProperty('CDQ_ZOHO_BUDGET')||'{}');
 if(saved.day!==day)saved={day:day,count:0};if(saved.count>=800)throw Error('Synchronisation Zoho en pause jusqu’à demain : budget quotidien CDQ atteint.');saved.count++;p.setProperty('CDQ_ZOHO_BUDGET',JSON.stringify(saved));
}
function cdqZohoTokenV2642_(refresh){
 var c=cdqZohoConfigV2642_();if(!c.ready)throw Error('Connexion Zoho manquante.');var cache=CacheService.getScriptCache(),key='CDQ42_ZOHO_TOKEN_'+empreinteCDQ_(c.dc+':'+c.CLIENT_ID+':'+c.REFRESH_TOKEN),token=refresh?'':cache.get(key);if(token)return token;
 var response=UrlFetchApp.fetch(c.host.auth+'/oauth/v2/token',{method:'post',payload:{grant_type:'refresh_token',client_id:c.CLIENT_ID,client_secret:c.CLIENT_SECRET,refresh_token:c.REFRESH_TOKEN},muteHttpExceptions:true,followRedirects:false}),data=JSON.parse(response.getContentText());
 if(response.getResponseCode()!==200||!data.access_token)throw Error('Autorisation OAuth Zoho à renouveler.');cache.put(key,data.access_token,Math.max(60,Math.min(3300,Number(data.expires_in||3600)-120)));return data.access_token;
}
function cdqZohoGetV2642_(path,query,image){
 if(!/^\/(organizations|items(?:\/\d+(?:\/image)?)?)$/.test(path))throw Error('Lecture Zoho non autorisée.');
 var c=cdqZohoConfigV2642_();query=Object.assign({},query||{},{organization_id:c.ORGANIZATION_ID});var suffix=Object.keys(query).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(query[k]);}).join('&');
 for(var retry=0;retry<2;retry++){
  cdqZohoBudgetV2642_();var response=UrlFetchApp.fetch(c.host.api+'/inventory/v1'+path+'?'+suffix,{method:'get',headers:{Authorization:'Zoho-oauthtoken '+cdqZohoTokenV2642_(retry===1)},muteHttpExceptions:true,followRedirects:false});
  var status=response.getResponseCode();if(status===401&&retry===0)continue;if(status===429)throw Error('Zoho limite les appels : synchronisation reprise au prochain passage.');if(status<200||status>=300)throw Error('Lecture Zoho indisponible ('+status+').');
  if(image)return response.getBlob();var data=JSON.parse(response.getContentText());if(data.code!==0&&data.code!=null)throw Error('Lecture Zoho refusée. Vérifiez les autorisations items.READ et settings.READ.');return data;
 }
 throw Error('Autorisation Zoho expirée.');
}
function cdqZohoMapV2642_(item){
 var clean=cdqInvCleanV2593_,id=String(item.item_id||'');if(!/^\d{3,40}$/.test(id))throw Error('Article Zoho invalide.');
 var fields={};(item.custom_fields||[]).forEach(function(f){fields[f.api_name||'']=f.value;});var name=clean(item.name,180),manufacturer=clean(item.manufacturer||item.brand||fields.cf_fabricant,100),model=clean(fields.cf_modele||item.model||(name.match(/\b(?=[A-Za-z0-9._-]*[A-Za-z])(?=[A-Za-z0-9._-]*\d)[A-Za-z0-9][A-Za-z0-9._-]{2,25}\b/)||[])[0],100);
 if(!name)throw Error('Article Zoho sans nom.');
 var rate=Number(item.rate);if(!Number.isFinite(rate)||rate<0)throw Error('Prix Zoho invalide.');
 return {zohoItemId:id,numero:clean(item.sku||'ZOHO-'+id,90),skuSource:clean(item.sku,120),description:name,descriptionCourte:clean(item.description||[manufacturer,model].filter(Boolean).join(' • ')||name,240),fabricant:manufacturer||'Non classé',modele:model,prixClient:rate,actif:item.status!=='inactive',zohoStock:item.available_stock!=null&&item.available_stock!==''&&Number.isFinite(Number(item.available_stock))?Number(item.available_stock):'',zohoDescription:clean(item.description,700),zohoImage:!!(item.image_name||item.image_document_id),imageSourceUrl:clean(fields.cf_url_fabricant,700)};
}
function cdqZohoUpsertV2642_(items){
 return cdqInventoryTxnV20261113_('cdqZohoUpsertV2642_',function(){
 var sh=cdqInvSheetV2593_('Articles'),h=cdqInvEnsureHeadersV2593_(sh,['zohoItemId','zohoOrganisationId','zohoStock','descriptionCourte','zohoDescription','zohoHash','enrichissement','imageSourceUrl','imageUrl','photoFileId','prixClient','skuSource']),data=cdqInvRowsV2593_(sh),c=cdqZohoConfigV2642_(),changes=0;
 items.forEach(function(raw){
  var item=cdqZohoMapV2642_(raw),hash=empreinteCDQ_(JSON.stringify(item)),exact=data.rows.filter(function(r){return String(r.zohoItemId||'')===item.zohoItemId&&String(r.zohoOrganisationId||'')===c.ORGANIZATION_ID;}),skus=item.skuSource?data.rows.filter(function(r){return !r.zohoItemId&&String(r.numero||'').toLowerCase()===item.skuSource.toLowerCase();}):[];
  if(exact.length>1||skus.length>1)throw Error('Plusieurs articles CDQ utilisent le même numéro Zoho : '+item.numero);var row=exact[0]||skus[0];if(row&&String(row.zohoHash||'')===hash)return;
  // A linked item from a different organization is never silently reused.
  if(!row&&item.skuSource&&data.rows.some(function(r){return String(r.numero||'').toLowerCase()===item.skuSource.toLowerCase()&&r.zohoItemId;}))throw Error('Numéro déjà lié à une autre référence Zoho : '+item.numero);
  var values=row?sh.getRange(row._row,1,1,h.values.length).getValues()[0]:new Array(h.values.length).fill('');
  function set(k,v){if(h.map[k])values[h.map[k]-1]=v;}
  set('articleId',row?row.articleId:Utilities.getUuid());['numero','skuSource','description','prixClient','actif','zohoItemId','zohoStock','zohoDescription'].forEach(function(k){set(k,item[k]);});
  set('fabricant',item.fabricant!=='Non classé'?item.fabricant:(row?.fabricant||item.fabricant));set('modele',item.modele||row?.modele||'');
  if(!row?.descriptionCourte)set('descriptionCourte',item.descriptionCourte);if(!row?.categorie)set('categorie','Autres');if(!row?.imageSourceUrl&&item.imageSourceUrl)set('imageSourceUrl',item.imageSourceUrl);
  set('zohoOrganisationId',c.ORGANIZATION_ID);set('zohoHash',hash);set('majLe',cdqInvNowV2593_());
  if(item.zohoStock!=='')set('disponibleVente',item.zohoStock);
  if(!row?.photoFileId&&!row?.imageUrl)set('enrichissement','pending');
  cdqZohoActorV2642_();var at=row?row._row:sh.getLastRow()+1;sh.getRange(at,1,1,values.length).setValues([values]);
  if(!row){row={_row:at};Object.keys(h.map).forEach(function(k){row[k]=values[h.map[k]-1];});data.rows.push(row);}changes++;
 });return changes;

 });
}
function cdqZohoWorkerV2642_(){
 return cdqInventoryTxnV20261113_('cdqZohoWorkerV2642_',function(){
 var p=PropertiesService.getScriptProperties(),c=cdqZohoConfigV2642_();if(!c.ready||p.getProperty('CDQ_ZOHO_ENABLED')!=='true')return;
 var lock=cdqInventoryLockV20261113_();if(!lock.tryLock(1000))return;
 try{
  cdqZohoActorV2642_();var started=Date.now(),page=Number(p.getProperty('CDQ_ZOHO_PAGE')||1),changes=0;
  // Bounded paging resumes next run. An incomplete API read never deletes items.
  for(var n=0;n<2&&Date.now()-started<180000;n++){
   var data=cdqZohoGetV2642_('/items',{page:page,per_page:200});if(!Array.isArray(data.items))throw Error('Catalogue Zoho incomplet.');changes+=cdqZohoUpsertV2642_(data.items);
   cdqInventoryFlushV20261113_();page=data.page_context?.has_more_page?page+1:1;p.setProperty('CDQ_ZOHO_PAGE',String(page));if(page===1)break;
  }
  if(changes)p.setProperty('CDQ_ZOHO_REVISION',Utilities.getUuid());p.setProperty('CDQ_ZOHO_LAST_SYNC',String(Date.now()));p.deleteProperty('CDQ_ZOHO_ERROR');
  cdqZohoEnrichV2642_(2);
 }catch(e){p.setProperty('CDQ_ZOHO_ERROR',String(e.message||e).slice(0,180));}
 finally{lock.releaseLock();}

 });
}
function cdqZohoActualiserV2642(){
 return cdqInventoryTxnV20261113_('cdqZohoActualiserV2642',function(){cdqZohoAdminV2642_();var p=PropertiesService.getScriptProperties();if(Date.now()-Number(p.getProperty('CDQ_ZOHO_LAST_SYNC')||0)>60000)cdqZohoWorkerV2642_();return cdqZohoStatusV2642_();
 });
}
var CDQ_PRODUCT_DOMAINS_V2642_={'mettler toledo':['mt.com'],'rice lake':['ricelake.com'],'rice lake weighing systems':['ricelake.com'],avery:['averyweigh-tronix.com'],'avery weigh tronix':['averyweigh-tronix.com'],ohaus:['ohaus.com'],adam:['adamequipment.com'],sartorius:['sartorius.com'],aandd:['aandd.jp','andweighing.com'],anyload:['anyload.com'],flintec:['flintec.com'],totalcomp:['totalcomp.com'],utilcell:['utilcell.com'],dini:['diniargeo.com'],diniargeo:['diniargeo.com'],laumas:['laumas.com']};
function cdqProductNormV2642_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function cdqProductUrlV2642_(url,domains){var m=String(url).match(/^https:\/\/([a-z0-9.-]+)(?:\/|$)/i);if(!m||/^[\d.]+$/.test(m[1]))return false;var host=m[1].toLowerCase();return domains.some(function(d){return host===d||host.endsWith('.'+d);});}
function cdqProductPageV2642_(url,domains){
 if(!cdqProductUrlV2642_(url,domains))throw Error('Source fabricant non reconnue.');var r=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:false,headers:{Accept:'text/html'}});if(r.getResponseCode()!==200)throw Error('Fiche fabricant indisponible.');return r.getContentText().slice(0,2000000);
}
function cdqProductSearchV2642_(a){
 var key=PropertiesService.getScriptProperties().getProperty('CDQ_PRODUCT_SEARCH_KEY'),domains=CDQ_PRODUCT_DOMAINS_V2642_[cdqProductNormV2642_(a.fabricant)]||[],model=String(a.modele||'').trim();
 if(!key||!domains.length||model.length<3)return null;
 var q=a.fabricant+' "'+model+'" ('+domains.map(function(d){return 'site:'+d;}).join(' OR ')+')',r=UrlFetchApp.fetch('https://api.search.brave.com/res/v1/web/search?q='+encodeURIComponent(q)+'&count=5',{headers:{'X-Subscription-Token':key,Accept:'application/json'},muteHttpExceptions:true,followRedirects:false});if(r.getResponseCode()!==200)throw Error('Recherche de photo temporairement indisponible.');
 var results=JSON.parse(r.getContentText()).web?.results||[],hits=results.filter(function(x){return cdqProductUrlV2642_(x.url,domains)&&(' '+cdqProductNormV2642_(x.title)+' ').indexOf(' '+cdqProductNormV2642_(model)+' ')>=0;});
 if(hits.length!==1)return null;var html=cdqProductPageV2642_(hits[0].url,domains),image=cdqInvExtractPageImageV2623_(html,hits[0].url);if(!image)return null;
 return {url:image,source:hits[0].url,domains:domains};
}
function cdqZohoEnrichV2642_(limit){
 return cdqInventoryTxnV20261113_('cdqZohoEnrichV2642_',function(){
 var sh=cdqInvSheetV2593_('Articles'),data=cdqInvRowsV2593_(sh),h=data.headers,rows=data.rows.filter(function(r){return r.zohoItemId&&(r.enrichissement==='pending'||(r.enrichissement==='recherche non configurée'&&PropertiesService.getScriptProperties().getProperty('CDQ_PRODUCT_SEARCH_KEY')))&&!r.photoFileId&&!r.imageUrl;}).slice(0,limit),p=PropertiesService.getScriptProperties();
 rows.forEach(function(a){
  try{
   cdqZohoActorV2642_();var item=cdqZohoGetV2642_('/items/'+a.zohoItemId,{}).item;if(!item)throw Error('Détails de l’article incomplets.');var mapped=cdqZohoMapV2642_(item),blob=null,source='',domains=CDQ_PRODUCT_DOMAINS_V2642_[cdqProductNormV2642_(mapped.fabricant)]||[],product=null;
   // Item list responses may omit manufacturer and detailed description.
   // Populate them from the confirmed item, even if it has no usable photo.
   cdqZohoActorV2642_();
   ['fabricant','modele','descriptionCourte','zohoDescription'].forEach(function(k){if(h.map[k]&&mapped[k]&&(k!=='fabricant'||mapped[k]!=='Non classé')&&(k!=='descriptionCourte'||!a.descriptionCourte||a.descriptionCourte===a.description))sh.getRange(a._row,h.map[k]).setValue(mapped[k]);});
   p.setProperty('CDQ_ZOHO_REVISION',Utilities.getUuid());
   if(mapped.zohoImage){blob=cdqZohoGetV2642_('/items/'+a.zohoItemId+'/image',{},true);source='';}
   else{
    var candidate=Object.assign({},a,mapped);if(candidate.imageSourceUrl&&domains.length){var html=cdqProductPageV2642_(candidate.imageSourceUrl,domains),image=cdqInvExtractPageImageV2623_(html,candidate.imageSourceUrl);if(image)product={url:image,source:candidate.imageSourceUrl,domains:domains};}
    if(!product)product=cdqProductSearchV2642_(candidate);
    if(product&&cdqProductUrlV2642_(product.url,product.domains)){var response=UrlFetchApp.fetch(product.url,{muteHttpExceptions:true,followRedirects:false});if(response.getResponseCode()===200){blob=response.getBlob();source=product.source;}}
   }
   if(!blob){sh.getRange(a._row,h.map.enrichissement).setValue(p.getProperty('CDQ_PRODUCT_SEARCH_KEY')?'à vérifier':'recherche non configurée');return;}
   var bytes=blob.getBytes(),type=blob.getContentType();if(bytes.length<30||bytes.length>4*1024*1024||!/^image\/(png|jpeg|webp)$/i.test(type))throw Error('Photo produit invalide ou trop volumineuse.');
   cdqZohoActorV2642_();var fresh=cdqInvFindArticleV2593_(a.articleId);if(fresh.row.photoFileId||fresh.row.imageUrl)return;
   var file=cdqInventoryCreatedFileV20261113_(cdqMediaInventoryFileV20261113_(blob.setName('Zoho-'+a.zohoItemId+'.'+(type==='image/png'?'png':type==='image/webp'?'webp':'jpg')),a.articleId));
   sh.getRange(a._row,h.map.photoFileId).setValue(file.getId());sh.getRange(a._row,h.map.imageSourceUrl).setValue(source);sh.getRange(a._row,h.map.descriptionCourte).setValue(mapped.descriptionCourte);sh.getRange(a._row,h.map.enrichissement).setValue('complété');p.setProperty('CDQ_ZOHO_REVISION',Utilities.getUuid());
  }catch(e){console.warn('Photo Zoho à reprendre : '+String(e.message||e));}
 });

 });
}
function cdqZohoCatalogueV2642(){
 return cdqInventoryTxnV20261113_('cdqZohoCatalogueV2642',function(){
 cdqWsAccessV2638_(false);var rows=cdqInvRowsV2593_(cdqInvSheetV2593_('Articles')).rows;return {ok:true,articles:rows.filter(function(r){return r.zohoItemId;}).map(function(r){return {articleId:String(r.articleId),descriptionCourte:String(r.descriptionCourte||''),zohoStock:r.zohoStock,enrichissement:String(r.enrichissement||'')};})};

 });
}
