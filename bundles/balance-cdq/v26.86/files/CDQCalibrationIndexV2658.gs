// Read-only traversal, paged through active client folders and versioned sheets.
function cdqCalibrationSheetV2658_(rows,meta){
 var norm=function(v){return cdq23Norm_(v).replace(/\s*:\s*$/,'');},heads=[],labels=[],result=[];
 var clean=function(v){return cdqWsBalanceDataV2646_(v);};
 rows.forEach(function(row,r){row.forEach(function(v,c){var n=norm(v);
  if(/^(indicateur|balance\s*(?:\/|et)?\s*indicateur|balance|base)$/.test(n))heads.push({r:r,c:c,category:(n==='balance'||n==='base')?'bench':'indicator'});
  if(/^(fabricant|manufacturier|marque|modele)$/.test(n))labels.push({r:r,c:c,key:n==='modele'?'model':'manufacturer'});
 });});
 heads.forEach(function(h){var item={fileId:meta.id,source:meta.name,revision:meta.modifiedTime,category:h.category,manufacturer:'',model:''};
  labels.filter(function(l){return l.r>h.r&&l.r-h.r<=5;}).forEach(function(l){var value=clean((rows[l.r]||[])[h.c]);if(value&&!/^(fabricant|manufacturier|marque|modele)$/.test(norm(value)))item[l.key]=value;});
  if(!item.manufacturer||!item.model)labels.filter(function(l){return l.r<h.r&&h.r-l.r<=2;}).forEach(function(l){var value=clean((rows[h.r]||[])[l.c]);if(value&&!/^(fabricant|manufacturier|marque|modele)$/.test(norm(value)))item[l.key]=value;});
  if(item.manufacturer&&item.model)result.push(item);
 });
 return result;
}
function cdqScannerCalibrationV2668(clientId,cursor){
 cdqWsAccessV2638_(false);var scope=cdqWsListClientV2646_(String(clientId||'')),id=scope.meta.id;
 var c=cursor||{queue:[id],folder:'',token:''};
 if(!Array.isArray(c.queue)||c.queue.length>2000||typeof c.token!=='string'||c.token.length>10000)throw Error('Position du scan invalide.');
 c={queue:c.queue.slice(),folder:String(c.folder||''),token:c.token};if(!c.folder)c.folder=String(c.queue.shift()||'');
 if(!c.folder)return {ok:true,items:[],pdfs:[],checkedCount:0,next:null,warnings:[]};
 // Every resumed folder remains inside the selected client, even with an edited cursor.
 var folder=cdqDriveScopeV2521_(c.folder,{},[id]);if(folder.meta.mimeType!=='application/vnd.google-apps.folder')throw Error('Dossier de scan invalide.');
 var page=Drive.Files.list({q:"'"+c.folder+"' in parents and trashed=false and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/pdf' or mimeType='application/vnd.google-apps.folder')",pageSize:4,pageToken:c.token||undefined,fields:'nextPageToken,files(id,name,mimeType,modifiedTime,version,md5Checksum)',supportsAllDrives:true,includeItemsFromAllDrives:true}),cache=CacheService.getScriptCache(),items=[],pdfs=[],checked=0,warnings=[];
 (page.files||[]).forEach(function(f){var name=cdq23Norm_(f.name);
  if(/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?|certificats? (?:de )?poids|_cdq)(?:\b|[._ -])/i.test(name))return;
  if(f.mimeType==='application/vnd.google-apps.folder'){if(c.queue.indexOf(f.id)<0)c.queue.push(f.id);return;}
  checked++;
  if(f.mimeType==='application/pdf'){pdfs.push(f);return;}
  var key='CDQ68_CAL_'+empreinteCDQ_(JSON.stringify([f.id,f.modifiedTime,String(f.version||'')])),old=cache.get(key),value;
  // A failed sheet read fails the complete batch, preserving the confirmed cursor.
  if(old)value=JSON.parse(old);else{value=[];SpreadsheetApp.openById(f.id).getSheets().filter(function(s){return !s.isSheetHidden();}).forEach(function(s){value=value.concat(cdqCalibrationSheetV2658_(s.getRange(1,1,Math.max(1,Math.min(65,s.getLastRow())),Math.max(1,Math.min(120,s.getLastColumn()))).getDisplayValues(),f));});cache.put(key,JSON.stringify(value),21600);}
  items=items.concat(value);
 });
 c.token=page.nextPageToken||'';if(!c.token){c.folder='';if(!c.queue.length)c=null;}
 return {ok:true,items:items,pdfs:pdfs,checkedCount:checked,next:c,warnings:warnings};
}
// Existing installations can keep their original sheet-only endpoint until updated.
function cdqScannerCalibrationV2658(clientId,offset){
  cdqWsAccessV2638_(false);var scope=cdqWsFolderV2638_(String(clientId||'')),sources=cdqWsListSourcesV2638_(scope.meta.id).filter(function(f){return f.mimeType==='application/vnd.google-apps.spreadsheet';});
  offset=Number(offset)||0;if(!Number.isSafeInteger(offset)||offset<0||offset>sources.length)throw Error('Position de lecture invalide.');
  var cache=CacheService.getScriptCache(),items=[],warnings=[],end=Math.min(sources.length,offset+12);
  for(var i=offset;i<end;i++){var f=sources[i],key='CDQ58_CAL_'+empreinteCDQ_(f.id+':'+f.modifiedTime),value;
    try{var old=cache.get(key);if(old)value=JSON.parse(old);else{
      var sheets=SpreadsheetApp.openById(f.id).getSheets();value=[];
      sheets.filter(function(s){return !s.isSheetHidden();}).forEach(function(s){
        var rows=s.getRange(1,1,Math.max(1,Math.min(45,s.getLastRow())),Math.max(1,Math.min(100,s.getLastColumn()))).getDisplayValues();
        value=value.concat(cdqCalibrationSheetV2658_(rows,f));
      });cache.put(key,JSON.stringify(value),21600);
    }items=items.concat(value);}catch(e){warnings.push({fileId:f.id,name:f.name,message:String(e.message||e).slice(0,160)});}
  }
  return {ok:true,items:items,checked:end,total:sources.length,next:end<sources.length?end:null,warnings:warnings};
}

