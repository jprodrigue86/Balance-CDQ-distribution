function cdqLegacySourceMetaV20261114_(id){var m=Drive.Files.get(id,{fields:'id,name,mimeType,parents,appProperties,properties,description,size,createdTime,modifiedTime,md5Checksum,trashed',supportsAllDrives:true});var out={id:m.id,name:m.name,mimeType:m.mimeType,parents:(m.parents||[]).slice().sort(),size:String(m.size||'0'),createdTime:m.createdTime||'',modifiedTime:m.modifiedTime||'',md5Checksum:m.md5Checksum||'',description:m.description||'',appProperties:{},properties:{},trashed:!!m.trashed};['appProperties','properties'].forEach(function(field){Object.keys(m[field]||{}).sort().forEach(function(k){out[field][k]=m[field][k];});});return out;}
function cdqLegacySnapshotV20261114_(plan){return plan.map(function(rule){var m=cdqLegacySourceMetaV20261114_(rule.id);if(m.trashed||m.mimeType!==rule.mime||m.parents.length!==1||m.parents[0]!==rule.parent)throw Error('LEGACY_SOURCE_SCOPE_'+rule.id);return m;}).sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0;});}
function cdqMigrerDerniersSupportsV20261114(){return cdqCoordMigrationOwnerV20261113_(function(){return cdqTechnicalTxnV20261113_(function(){
 var props=PropertiesService.getScriptProperties(),planResult=cdqLegacyCallV20261114_('plan',{});if(planResult.state!=='ok'||!Array.isArray(planResult.plan))throw Error('LEGACY_PLAN_INVALID');var plan=planResult.plan,prior=cdqLegacyCallV20261114_('index',{});
 if(prior.state==='active'){if(!cdqLegacyActiveV20261114_())throw Error('LEGACY_ACTIVE_WITHOUT_ROUTE');console.log(JSON.stringify({ok:true,state:'already-active',records:prior.records.length}));return prior;}
 var sources=cdqLegacySnapshotV20261114_(plan),sourceHash=cdqMediaHashV20261113_(JSON.stringify(sources)),nativeBefore={};
 plan.filter(function(r){return r.kind==='native-accounting';}).forEach(function(r){nativeBefore[r.technician]=cdqMediaLegacyInvoiceRowsV20261113_({nom:r.technician}).sort(function(a,b){return a.id.localeCompare(b.id);});});
 var binaryCount=0,totalBytes=0;
 sources.forEach(function(m){var rule=plan.filter(function(r){return r.id===m.id;})[0],payload={id:m.id,meta:m};
  if(rule.kind!=='native-accounting'){
   var bytes=DriveApp.getFileById(m.id).getBlob().getBytes(),md5=Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,bytes).map(function(b){return('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
   if(bytes.length!==Number(m.size)||md5!==m.md5Checksum||JSON.stringify(cdqLegacySourceMetaV20261114_(m.id))!==JSON.stringify(m))throw Error('LEGACY_SOURCE_CHANGED_'+m.id);
   payload.base64=Utilities.base64Encode(bytes);payload.sha256=cdqCoordMigrationHashV20261113_(bytes);binaryCount++;totalBytes+=bytes.length;
  }
  var saved=cdqLegacyCallV20261114_('import',payload);if(!['stored','replayed'].includes(saved.state)||saved.id!==m.id||saved.fingerprint!==cdqMediaHashV20261113_(JSON.stringify(m))||(payload.sha256&&saved.sha256!==payload.sha256))throw Error('LEGACY_IMPORT_UNCONFIRMED');
 });
 if(cdqMediaHashV20261113_(JSON.stringify(cdqLegacySnapshotV20261114_(plan)))!==sourceHash)throw Error('LEGACY_SNAPSHOT_CHANGED');
 props.setProperty('CDQ_SYSTEM_LEGACY_V1','on');var active=cdqLegacyCallV20261114_('activate',{sha256:sourceHash});if(active.state!=='active'||active.sha256!==sourceHash)throw Error('LEGACY_ACTIVATION_UNCONFIRMED');
 Object.keys(nativeBefore).forEach(function(name){var after=cdqMediaLegacyInvoiceRowsV20261113_({nom:name}).sort(function(a,b){return a.id.localeCompare(b.id);});if(JSON.stringify(after)!==JSON.stringify(nativeBefore[name]))throw Error('LEGACY_NATIVE_LIST_CHANGED');});
 var receipt={ok:true,kind:'legacy-system-cutover-v1',binaryFiles:binaryCount,bytes:totalBytes,nativeSheets:plan.length-binaryCount,nativeSheetsEditable:true,nativeListUnchanged:true,manifestSha256:sourceHash,driveUnchanged:true,originalsDeleted:0,at:new Date().toISOString()};props.setProperty('CDQ_SYSTEM_LEGACY_RECEIPT_V1',JSON.stringify(receipt));console.log(JSON.stringify(receipt));return receipt;
});});}
