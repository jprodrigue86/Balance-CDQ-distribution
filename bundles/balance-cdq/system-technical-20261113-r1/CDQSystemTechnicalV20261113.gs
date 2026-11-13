var CDQ_TECHNICAL_IDS_V20261113_=null;
// Owner-executed storage adapter only. Existing application ACL, job signatures,
// idempotency and delivery state checks remain at all business call sites.
function cdqTechnicalActiveV20261113_(){return PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_TECHNICAL_V1')==='on';}
function cdqTechnicalTxnV20261113_(run){var lock=LockService.getScriptLock(),held=lock.hasLock();if(!held)lock.waitLock(30000);try{return run();}finally{if(!held)lock.releaseLock();}}
function cdqTechnicalCallV20261113_(op,payload){
 var p=payload||{};p.op=op;var e=cdqReportEngineEnvelopeV2754_('gas-to-engine',{actor:'jp.rodrigue86@gmail.com',action:'systemTechnicalV1',payload:p,scope:{store:'technical-v1',role:'internal-storage',intent:'internal-storage'}});
 var response=UrlFetchApp.fetch(cdqReportEngineConfigV2754_().url+'/v1/rpc',{method:'post',contentType:'application/json',headers:{'x-cdq-system-coordinates':'v1'},payload:JSON.stringify(e),muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true}),r;
 try{r=JSON.parse(response.getContentText('UTF-8'));}catch(_){throw Error('TECHNICAL_RESPONSE_INVALID');}if(response.getResponseCode()!==200||r.ok!==true||r.kind!=='system-technical-v1')throw Error('TECHNICAL_UNCONFIRMED_'+String(r&&r.code||response.getResponseCode()));return r.result;
}
function cdqTechnicalIdsV20261113_(){if(CDQ_TECHNICAL_IDS_V20261113_===null){var r=cdqTechnicalCallV20261113_('index',{});if(r.state!=='ok'||!Array.isArray(r.ids))throw Error('TECHNICAL_INDEX_INVALID');CDQ_TECHNICAL_IDS_V20261113_={};r.ids.forEach(function(id){CDQ_TECHNICAL_IDS_V20261113_[id]=true;});}return CDQ_TECHNICAL_IDS_V20261113_;}
function cdqTechnicalFindV20261113_(id){if(!cdqTechnicalActiveV20261113_()||!cdqTechnicalIdsV20261113_()[String(id)])return null;var r=cdqTechnicalCallV20261113_('get',{id:String(id)});if(r.state==='not_found')throw Error('TECHNICAL_MISSING_REFERENCED_ID');if(r.state!=='ok'||!r.meta||r.meta.id!==String(id))throw Error('TECHNICAL_READ_UNCONFIRMED');return r;}
function cdqTechnicalMetaV20261113_(id){var r=cdqTechnicalFindV20261113_(id);return r?r.meta:Drive.Files.get(id,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});}
function cdqTechnicalListV20261113_(id){var r=cdqTechnicalFindV20261113_(id);if(!r)return null;if(r.meta.mimeType!=='application/vnd.google-apps.folder')throw Error('TECHNICAL_FOLDER_INVALID');var list=cdqTechnicalCallV20261113_('list',{id:id});if(list.state!=='ok'||!Array.isArray(list.files))throw Error('TECHNICAL_LIST_UNCONFIRMED');return list.files;}
function cdqTechnicalBlobV20261113_(id){
 var r=cdqTechnicalFindV20261113_(id);if(!r)return DriveApp.getFileById(id).getBlob();if(!Array.isArray(r.chunks)||!r.sha256)throw Error('TECHNICAL_CONTENT_INVALID');var bytes=[];
 r.chunks.forEach(function(part,index){var c=cdqTechnicalCallV20261113_('chunkGet',{id:String(id),index:index}),b=Utilities.base64Decode(c.base64);if(c.state!=='ok'||b.length!==part.bytes||c.sha256!==part.sha256||cdqCoordMigrationHashV20261113_(b)!==part.sha256)throw Error('TECHNICAL_INTEGRITY');bytes=bytes.concat(b);});
 if(bytes.length!==Number(r.meta.size)||cdqCoordMigrationHashV20261113_(bytes)!==r.sha256)throw Error('TECHNICAL_INTEGRITY');return Utilities.newBlob(bytes,r.meta.mimeType,r.meta.name);
}
function cdqTechnicalPutBlobV20261113_(meta,blob,importing){
 var bytes=blob.getBytes(),parts=[],size=bytes.length;if(size<1||size>24*1024*1024)throw Error('TECHNICAL_SIZE_INVALID');
 for(var i=0;i<size;i+=4*1024*1024){var b=bytes.slice(i,i+4*1024*1024),sha=cdqCoordMigrationHashV20261113_(b),c=cdqTechnicalCallV20261113_('chunkPut',{import:!!importing,base64:Utilities.base64Encode(b),sha256:sha});if(c.state!=='stored'||c.sha256!==sha||c.bytes!==b.length)throw Error('TECHNICAL_CHUNK_UNCONFIRMED');parts.push({sha256:sha,bytes:b.length});}
 meta.size=String(size);var full=cdqCoordMigrationHashV20261113_(bytes),r=cdqTechnicalCallV20261113_('filePut',{import:!!importing,meta:meta,sha256:full,chunks:parts});if(!['created','replayed'].includes(r.state)||r.meta.id!==meta.id||r.sha256!==full)throw Error('TECHNICAL_WRITE_UNCONFIRMED');if(CDQ_TECHNICAL_IDS_V20261113_)CDQ_TECHNICAL_IDS_V20261113_[meta.id]=true;return r.meta;
}
function cdqTechnicalCreateV20261113_(metadata,blob){return cdqTechnicalTxnV20261113_(function(){
 if(!cdqTechnicalActiveV20261113_())return Drive.Files.create(metadata,blob,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});
 var folder=metadata.mimeType==='application/vnd.google-apps.folder',parent=(metadata.parents||[])[0];
 // The client archive and all PDF documents remain in their original Drive path.
 if(folder?parent!==CDQ_WS_SYSTEM_V2638_:!cdqTechnicalFindV20261113_(parent))return Drive.Files.create(metadata,blob,{fields:CDQ_SP_FIELDS_,supportsAllDrives:true});
 var m=JSON.parse(JSON.stringify(metadata));if(!m.id)m.id=cdqSpGeneratedIds_(1)[0];
 if(folder){var prior=cdqTechnicalFindV20261113_(m.id);if(prior)return prior.meta;var r=cdqTechnicalCallV20261113_('folderPut',{meta:m});if(!['created','replayed'].includes(r.state)||r.meta.id!==m.id)throw Error('TECHNICAL_FOLDER_UNCONFIRMED');cdqTechnicalIdsV20261113_()[m.id]=true;return r.meta;}
 return cdqTechnicalPutBlobV20261113_(m,blob,false);
});}
function cdqTechnicalFileFacadeV20261113_(m){return{getId:function(){return m.id;},getName:function(){return m.name;},getBlob:function(){return cdqTechnicalBlobV20261113_(m.id);}};}
function cdqTechnicalFolderFacadeV20261113_(id){
 return{getId:function(){return id;},getFilesByName:function(name){var cloud=cdqTechnicalListV20261113_(id);if(cloud===null)return DriveApp.getFolderById(id).getFilesByName(name);var files=cloud.filter(function(f){return f.name===name;}),i=0;return{hasNext:function(){return i<files.length;},next:function(){if(i>=files.length)throw Error('TECHNICAL_ITERATOR_END');return cdqTechnicalFileFacadeV20261113_(files[i++]);}};},createFile:function(a,b,c){var blob=typeof a==='string'?Utilities.newBlob(b,c,a):a;var m=cdqTechnicalCreateV20261113_({name:blob.getName(),mimeType:blob.getContentType(),parents:[id]},blob);return cdqTechnicalFileFacadeV20261113_(m);}};
}
