/* Owner-only read-only retirement audit. No deletion, move or permission change. */
function cdqSystemRetiredV20261114_(){return PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_RETIRED_V1')==='on';}
function cdqSystemAuditTreeV20261114_(root){
 var queue=[root],seen={},all=[],deadline=Date.now()+170000;
 while(queue.length){if(Date.now()>deadline||all.length>5000)throw Error('RETIRE_AUDIT_LIMIT');var id=queue.shift();if(seen[id])throw Error('RETIRE_DUPLICATE_FOLDER');seen[id]=true;
  cdqTechnicalDriveChildrenV20261113_(id).forEach(function(m){all.push(cdqTechnicalCanonicalMetaV20261113_(m));if(m.mimeType==='application/vnd.google-apps.folder')queue.push(m.id);});
 }return all.sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0;});
}
function cdqAuditerRetraitSystemeV20261114(){return cdqCoordMigrationOwnerV20261113_(function(){return cdqTechnicalTxnV20261113_(function(){
 var props=PropertiesService.getScriptProperties(),flags={},roots=['1baB1UcQYcZ3szDlJp3y1geGbRuHWs335','1HCjws2mraGJr3UpUBMNeeyc2uioug0Q5'];
 ['COORDINATES','OPPORTUNITIES','NOTES','FOLLOWUP','INVENTORY','MEDIA','TECHNICAL','BILLING','LEGACY'].forEach(function(n){var k='CDQ_SYSTEM_'+n+'_V1';flags[k]=props.getProperty(k);if(flags[k]!=='on')throw Error('RETIRE_ROUTE_INACTIVE_'+n);});
 var records=[],rootMetadata=roots.map(function(id){return Drive.Files.get(id,{fields:'id,name,mimeType,parents,trashed,capabilities(canEdit,canTrash,canMoveItemWithinDrive)',supportsAllDrives:true});});
 rootMetadata.forEach(function(m){if(m.trashed||m.mimeType!=='application/vnd.google-apps.folder')throw Error('RETIRE_ROOT_INVALID');records=records.concat(cdqSystemAuditTreeV20261114_(m.id));});
 records.sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0;});var hash=cdqMediaHashV20261113_(JSON.stringify(records));
 var native=cdqLegacyIndexV20261114_().filter(function(r){return r.kind==='native-accounting';}).map(function(r){var permissions=Drive.Permissions.list(r.id,{fields:'nextPageToken,permissions(id,type,role,emailAddress,domain,allowFileDiscovery,deleted,permissionDetails)',supportsAllDrives:true});if(permissions.nextPageToken)throw Error('RETIRE_PERMISSIONS_PAGINATION');return{id:r.id,permissions:permissions.permissions||[]};});
 var summary={ok:true,kind:'system-retirement-audit-v1',at:new Date().toISOString(),roots:rootMetadata,flags:flags,relocationComplete:props.getProperty('CDQ_LEGACY_RELOCATION_ALL_DONE_V2869'),files:records.filter(function(r){return r.mimeType!=='application/vnd.google-apps.folder';}).length,folders:records.filter(function(r){return r.mimeType==='application/vnd.google-apps.folder';}).length,sha256:hash,driveUnchanged:true};
 console.log('CDQ_AUDIT_SUMMARY '+JSON.stringify(summary));for(var i=0;i<records.length;i+=10)console.log('CDQ_AUDIT_RECORDS '+JSON.stringify(records.slice(i,i+10)));console.log('CDQ_AUDIT_NATIVE_PERMISSIONS '+JSON.stringify(native));return summary;
});});}
