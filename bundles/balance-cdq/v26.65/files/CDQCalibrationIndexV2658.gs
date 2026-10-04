// Read-only indexing of the current client's active calibration sheets.
function cdqCalibrationSheetV2658_(rows,meta){
  var norm=function(v){return cdq23Norm_(v).replace(/\s*:\s*$/,'');},headers=[],labels={};
  rows.forEach(function(row,r){row.forEach(function(v,c){var n=norm(v);
    if(/^(indicateur|balance\s*(?:\/|et)?\s*indicateur|balance)$/.test(n))headers.push({r:r,c:c,category:n==='balance'?'bench':'indicator'});
    if(/^(fabricant|manufacturier|marque|modele)$/.test(n))labels[r]={key:n==='modele'?'model':'manufacturer',c:c};
  });});
  var result=[];
  headers.forEach(function(h){var item={fileId:meta.id,source:meta.name,revision:meta.modifiedTime,category:h.category,manufacturer:'',model:''};
    Object.keys(labels).map(Number).filter(function(r){return r>h.r&&r-h.r<=5;}).forEach(function(r){var label=labels[r],value=cdqWsTextV2638_((rows[r]||[])[h.c]);
      if(!value||/^(fabricant|manufacturier|marque|modele)$/.test(norm(value)))return;
      item[label.key]=value;
    });
    if(item.manufacturer&&item.model)result.push(item);
  });
  return result;
}
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
