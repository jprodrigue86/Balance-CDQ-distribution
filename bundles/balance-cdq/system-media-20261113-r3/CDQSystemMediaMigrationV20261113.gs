// Owner-only staging. All legacy business entry points share ScriptLock before
// choosing Drive/Cloudflare. Binary objects remain private during staging.
function cdqMediaDriveChildrenV20261113_(ids){
 if(!ids.length)return[];var out=[],seen={};for(var offset=0;offset<ids.length;offset+=40){var page='',pages={},rounds=0,parents=ids.slice(offset,offset+40);do{if(++rounds>20||pages[page])throw Error('MEDIA_SCAN_PAGINATION');pages[page]=true;
  var r=Drive.Files.list({q:'('+parents.map(function(id){if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error('MEDIA_PARENT_INVALID');return "'"+id+"' in parents";}).join(' or ')+') and trashed=false',fields:'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,description,parents)',pageSize:1000,pageToken:page||undefined,supportsAllDrives:true,includeItemsFromAllDrives:true});
  (r.files||[]).forEach(function(f){if(!seen[f.id]){seen[f.id]=true;out.push(f);}});page=r.nextPageToken||'';if(out.length>10000)throw Error('MEDIA_SCAN_TOO_LARGE');
 }while(page);}return out;
}
function cdqMediaDriveMetaV20261113_(f){try{var m=JSON.parse(f.description||'{}');if(!m||typeof m!=='object'||Array.isArray(m))throw Error();return m;}catch(_){return {};}}
function cdqMediaSnapshotV20261113_(){
 var root=CDQ_WS_SYSTEM_V2638_,folders='application/vnd.google-apps.folder',rootChildren=cdqMediaDriveChildrenV20261113_([root]),items=[],seen={},deferred=[];
 function add(f,kind,owner,target,meta){
  if(seen[f.id])return;if(f.mimeType===folders)return;if(!/^image\//.test(f.mimeType)||!Number.isSafeInteger(Number(f.size))||Number(f.size)<1||Number(f.size)>10*1024*1024)throw Error('MEDIA_SOURCE_UNSUPPORTED_'+f.id);seen[f.id]=true;
  var source={id:f.id,kind:kind,ownerKey:owner,targetKey:target,name:f.name,mime:f.mimeType,bytes:Number(f.size),created:f.createdTime,modified:f.modifiedTime,descriptionSha256:cdqMediaHashV20261113_(f.description||''),description:f.description||'',parentId:(f.parents||[]).slice().sort().join(',')};
  items.push({source:source,meta:meta});
 }
 // Invoice paths match the existing reader: technician/category and
 // technician/month[/category], only inside the system root. Documents in
 // the independent legacy business root remain at their original location.
 var invoiceRoots=rootChildren.filter(function(f){return f.mimeType===folders&&f.name==='Facture';});
 var techs=cdqMediaDriveChildrenV20261113_(invoiceRoots.map(function(f){return f.id;})).filter(function(f){return f.mimeType===folders;}),techMap={};
 techs.forEach(function(t){var identity=cdqInvoiceTechnicianV2635_(t.name);techMap[t.id]={owner:cdqInvoiceNormalizeNameV2635_(identity.nom),name:identity.nom};if(!techMap[t.id].owner)throw Error('MEDIA_TECHNICIAN_INVALID');});
 var level1=cdqMediaDriveChildrenV20261113_(techs.map(function(f){return f.id;})),readable={},months=[];
 level1.forEach(function(f){if(f.mimeType!==folders)return;var t=techMap[(f.parents||[]).filter(function(p){return techMap[p];})[0]];if(!t)return;
  if(CDQ_INVOICE_CATEGORIES_V2590.indexOf(f.name)>=0)readable[f.id]={tech:t,category:f.name,month:''};else if(cdqInvoiceIsMonthFolderV2615_(f.name)){readable[f.id]={tech:t,category:'',month:f.name.slice(0,7)};months.push(f.id);}
 });
 var level2=cdqMediaDriveChildrenV20261113_(months);level2.forEach(function(f){if(f.mimeType!==folders||CDQ_INVOICE_CATEGORIES_V2590.indexOf(f.name)<0)return;var parent=readable[(f.parents||[]).filter(function(p){return readable[p];})[0]];if(parent)readable[f.id]={tech:parent.tech,category:f.name,month:parent.month};});
 var invoiceFiles=level2.filter(function(f){return f.mimeType!==folders;}).concat(cdqMediaDriveChildrenV20261113_(Object.keys(readable).filter(function(id){return months.indexOf(id)<0;})));
 invoiceFiles.forEach(function(f){if(f.mimeType===folders)return;var scope=readable[(f.parents||[]).filter(function(p){return readable[p];})[0]];if(!scope)return;if(f.mimeType==='application/vnd.google-apps.spreadsheet'){deferred.push({id:f.id,mime:f.mimeType,parentId:(f.parents||[]).slice().sort().join(','),modified:f.modifiedTime});return;}var m=cdqMediaDriveMetaV20261113_(f);if(!m.categorie)m.categorie=scope.category||'';var month=scope.month||String(m.mois||m.date||'').slice(0,7);add(f,'invoice',scope.tech.owner,month+'/'+String(m.categorie||''),m);});
 // Current attached-photo hierarchy, plus both read-only legacy layouts.
 var photoRoots=rootChildren.filter(function(f){return f.mimeType===folders&&f.name==='Photos';}),photoChildren=cdqMediaDriveChildrenV20261113_(photoRoots.map(function(f){return f.id;})),clients=[],clientMap={},inventoryDirs=[];
 rootChildren.concat(photoChildren).forEach(function(f){if(f.mimeType!==folders)return;var m=cdqMediaDriveMetaV20261113_(f);if(m.cdqPhotoClientId){clients.push(f);clientMap[f.id]=String(m.cdqPhotoClientId);}if(photoChildren.some(function(x){return x.id===f.id;})&&f.name==='Inventaire')inventoryDirs.push(f.id);});
 var days=cdqMediaDriveChildrenV20261113_(clients.map(function(f){return f.id;})).filter(function(f){return f.mimeType===folders&&/^\d{4}-\d{2}-\d{2}(?:\s+-\s+.+)?$/.test(f.name);}),dayMap={};days.forEach(function(f){var parent=(f.parents||[]).filter(function(id){return clientMap[id];})[0];dayMap[f.id]=clientMap[parent];});
 cdqMediaDriveChildrenV20261113_(days.map(function(f){return f.id;})).forEach(function(f){if(f.mimeType===folders)return;var m=cdqMediaDriveMetaV20261113_(f),client=dayMap[(f.parents||[]).filter(function(id){return dayMap[id];})[0]];if(!m.type||!m.cibleId||String(m.idCompagnie||client)!==client)throw Error('MEDIA_PHOTO_SCOPE_INVALID_'+f.id);m.idCompagnie=client;add(f,'attached',client,String(m.type)+':'+String(m.cibleId),m);});
 var legacyRoots=rootChildren.filter(function(f){return f.mimeType===folders&&f.name===CDQ_PHOTOS_FOLDER_NAME_;}),legacyTargets=cdqMediaDriveChildrenV20261113_(legacyRoots.map(function(f){return f.id;})).filter(function(f){return f.mimeType===folders;}),legacyMap={};
 legacyTargets.forEach(function(f){var m=cdqMediaDriveMetaV20261113_(f);if(!m.type||!m.id)throw Error('MEDIA_LEGACY_SCOPE_INVALID');legacyMap[f.id]={type:String(m.type).toLowerCase(),id:String(m.id)};});
 cdqMediaDriveChildrenV20261113_(legacyTargets.map(function(f){return f.id;})).forEach(function(f){if(f.mimeType===folders)return;var target=legacyMap[(f.parents||[]).filter(function(id){return legacyMap[id];})[0]],m=cdqMediaDriveMetaV20261113_(f),client=obtenirClientPhotoCDQ_(target.type,target.id);m.type=m.type||target.type;m.cibleId=m.cibleId||target.id;m.idCompagnie=m.idCompagnie||client.getId();add(f,'attached',client.getId(),target.type+':'+target.id,m);});
 var inv=cdqInventoryTxnV20261113_('media-snapshot',function(){var ss=cdqInventoryBookCloudV20261113_(),sh=ss.getSheetByName('Articles'),rows=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues(),h=rows.shift(),map={};rows.forEach(function(r){if(r[h.indexOf('photoFileId')])map[String(r[h.indexOf('photoFileId')])]=String(r[h.indexOf('articleId')]);});return map;});
 cdqMediaDriveChildrenV20261113_(inventoryDirs).forEach(function(f){if(f.mimeType!==folders)add(f,'inventory','inventory',inv[f.id]||'retained:'+f.id,{articleId:inv[f.id]||'',retainedUnreferenced:!inv[f.id]});});
 Object.keys(inv).forEach(function(id){if(!seen[id])throw Error('MEDIA_INVENTORY_PHOTO_OUTSIDE_SCOPE_'+id);});
 items.sort(function(a,b){return a.source.id<b.source.id?-1:a.source.id>b.source.id?1:0;});var manifest=items.map(function(x){return x.source;});return{items:items,manifest:manifest,sha256:cdqMediaHashV20261113_(JSON.stringify(manifest)),count:items.length,deferred:deferred};
}
function cdqMediaOwnerStateV20261113_(actor){return cdqMediaCallV20261113_(actor,'systemMediaStageStateV1','attached','','',{},'migration');}
function cdqCopierMediasV20261113(){return cdqCoordMigrationOwnerV20261113_(function(actor){var lock=LockService.getScriptLock();lock.waitLock(30000);try{
 var staged=cdqMediaOwnerStateV20261113_(actor);if(staged.state==='active'){console.log(JSON.stringify(staged));return staged;}if(cdqMediaActiveV20261113_())throw Error('MEDIA_ROUTE_ON_ACTIVATION_REQUIRED');
 var snapshot=cdqMediaSnapshotV20261113_(),prior={},ids=snapshot.items.map(function(x){return x.source.id;});if(staged.manifest.some(function(x){return ids.indexOf(x.id)<0;})){cdqMediaCallV20261113_(actor,'systemMediaPruneStageV1','attached','','',{expectedManifestSha256:staged.sha256,keepIds:ids},'migration');staged=cdqMediaOwnerStateV20261113_(actor);}
 staged.manifest.forEach(function(s){prior[s.id]=JSON.stringify(s);});var pending=snapshot.items.filter(function(x){return prior[x.source.id]!==JSON.stringify(x.source);}),done=0,totalBytes=0;
 for(var i=0;i<pending.length&&done<8;i++){var item=pending[i],s=item.source;if(done&&totalBytes+s.bytes>20*1024*1024)break;
  var blob=DriveApp.getFileById(s.id).getBlob(),bytes=blob.getBytes(),fresh=Drive.Files.get(s.id,{fields:'id,name,mimeType,size,modifiedTime,description,parents,trashed',supportsAllDrives:true});
  if(fresh.trashed||bytes.length!==s.bytes||Number(fresh.size)!==s.bytes||fresh.modifiedTime!==s.modified||fresh.name!==s.name||fresh.mimeType!==s.mime||cdqMediaHashV20261113_(fresh.description||'')!==s.descriptionSha256||(fresh.parents||[]).slice().sort().join(',')!==s.parentId)throw Error('MEDIA_SOURCE_CHANGED_'+s.id);
  var p={id:s.id,requestKey:cdqMediaHashV20261113_('media-import:'+s.id),import:true,source:s,sourceSha256:cdqCoordMigrationHashV20261113_(bytes),name:s.name,mime:s.mime,contentBase64:Utilities.base64Encode(bytes),meta:item.meta,createdAt:s.created,updatedAt:s.modified};
  var result=cdqMediaCallV20261113_(actor,'systemMediaCreateV1',s.kind,s.ownerKey,s.targetKey,p,'migration');if(!['created','replayed'].includes(result.state)||result.file.id!==s.id||result.file.sha256!==p.sourceSha256||result.file.bytes!==s.bytes)throw Error('MEDIA_IMPORT_UNCONFIRMED');done++;totalBytes+=s.bytes;
 }
 var receipt={ok:true,kind:'media-stage-batch-v1',total:snapshot.count,deferredSystemSpreadsheets:snapshot.deferred,copiedThisBatch:done,bytesThisBatch:totalBytes,remaining:pending.length-done,active:false,originalsDeleted:0,at:new Date().toISOString()};console.log(JSON.stringify(receipt));return receipt;
 }finally{lock.releaseLock();}});}
function cdqActiverMediasV20261113(){return cdqCoordMigrationOwnerV20261113_(function(actor){var lock=LockService.getScriptLock();lock.waitLock(30000);try{
 var staged=cdqMediaOwnerStateV20261113_(actor),props=PropertiesService.getScriptProperties();if(staged.state==='active'){if(!cdqMediaActiveV20261113_())throw Error('MEDIA_ACTIVE_WITHOUT_ROUTE');console.log(JSON.stringify({ok:true,alreadyActive:true,count:staged.count,sha256:staged.sha256}));return staged;}
 var before=cdqMediaSnapshotV20261113_();if(staged.count!==before.count||staged.sha256!==before.sha256)throw Error('MEDIA_STAGE_NOT_CURRENT');
 props.setProperty('CDQ_SYSTEM_MEDIA_V1','on');var activated=cdqMediaCallV20261113_(actor,'systemMediaActivateV1','attached','','',{count:before.count,manifestSha256:before.sha256},'migration');if(activated.state!=='active'||activated.sha256!==before.sha256)throw Error('MEDIA_ACTIVATION_UNCONFIRMED');
 var total=0,checked={};before.items.forEach(function(x){var s=x.source,k=s.kind+'|'+s.ownerKey;if(checked[k])return;checked[k]=true;var files=cdqMediaListV20261113_(actor,s.kind,s.ownerKey,'');total+=files.length;});if(total!==before.count)throw Error('MEDIA_ACTIVE_LIST_MISMATCH');
 if(cdqMediaSnapshotV20261113_().sha256!==before.sha256)throw Error('MEDIA_DRIVE_CHANGED');invaliderIndexPhotosCDQ_();
 var result={ok:true,kind:'media-cutover-v1',files:total,deferredSystemSpreadsheets:before.deferred,manifestSha256:before.sha256,driveUnchanged:true,originalsDeleted:0,at:new Date().toISOString()};props.setProperty('CDQ_SYSTEM_MEDIA_RECEIPT_V1',JSON.stringify(result));console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}});}
