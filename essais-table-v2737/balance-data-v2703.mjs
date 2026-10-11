// The existing server parser determines which legacy Sheets cells populate the list.
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const text=(v,max)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max||200);
function cdqWsBalanceDataV2646_(v){
  var t=text(v,160);
  return /^(?:[-–—]+|n\/?a|non renseign[eé]|true|false|vrai|faux)$/i.test(t)?'':t;
}
function cdqWsSheetBalanceV2638_(rows,meta){
  // Use the inspected legacy layout when its structural anchors agree.
  // Column headings in merged Sheets do not necessarily align with data cells.
  var floorBase=null,weightAnchor=false;
  rows.forEach(function(row,r){row.forEach(function(v,c){if(/^type\s*:$/.test(norm(v))){for(var k=c+1;k<Math.min(row.length,c+12);k++){if(text(row[k])){if(norm(row[k])==='balance de plancher')floorBase=r-22;break;}}}if(c===5&&norm(v)==='poids'&&norm(row[43])==='avant correction'&&norm(row[81])==='apres correction')weightAnchor=true;});});
  if(floorBase!==null&&floorBase>=0&&weightAnchor){var a=function(r,c){return cdqWsBalanceDataV2646_((rows[r]||[])[c]);},capacity=a(floorBase+28,46).match(/^\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*[x×]\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*$/i),units=[[14,'lb'],[18,'kg'],[23,'g'],[27,'oz']].filter(function(p){return /^(true|vrai)$/i.test(String((rows[floorBase+34]||[])[p[0]]||''));});var unit=units.length===1?units[0][1]:'';
    return {id:meta.id,source:meta.name,revision:meta.modifiedTime,fabricant:a(floorBase+25,40)||a(floorBase+25,10),modele:a(floorBase+26,40)||a(floorBase+26,10),identification:a(floorBase+28,10),capacite:capacity?capacity[1].trim()+' '+(capacity[2]||unit):'',echelon:capacity?capacity[3].trim()+' '+(capacity[4]||unit):''};
  }
  var values={},headers=[],baseHeaders=[],equipmentType=false,equipmentLabel=false;
  function label(v){return norm(v).replace(/\s*:\s*$/,'');}
  function field(n){
    if(/^(fabricant|manufacturier|marque)$/.test(n))return 'fabricant';
    if(n==='modele')return 'modele';
    if(/^identification(?: de la balance| balance)?$/.test(n)||/^(?:#|n[°º]|no|numero)\s*(?:de?\s*)?(?:l\s*)?equipement$/.test(n))return 'identification';
    if(/^(capacite(?: maximale)?|max)$/.test(n))return 'capacite';
    if(/^(echelon|increment|division|graduation)$/.test(n))return 'echelon';
    return '';
  }
  function data(v){return field(label(v))?'':cdqWsBalanceDataV2646_(v);}
  function at(r,c){return data((rows[r]||[])[c]);}
  function next(row,c){for(var j=c+1;j<Math.min(row.length,c+20);j++){if(field(label(row[j])))break;var t=data(row[j]);if(t)return t;}return '';}
  rows.forEach(function(row,r){row.forEach(function(v,c){var n=label(v);
    if(/^(indicateur|balance\s*\/\s*indicateur|balance)$/.test(n))headers.push({r:r,c:c});
    if(/^(base|base\s*[/ -]\s*balance|base de la balance)$/.test(n))baseHeaders.push({r:r,c:c});
    if(n==='type'&&/balance|bascule|batcher|cuve|tremie|convoyeur|camion|train/.test(norm(next(row,c))))equipmentType=true;
  });});
  function recent(items,r){return items.filter(function(h){return h.r<r&&r-h.r<=8;}).slice(-1)[0];}
  rows.forEach(function(row,r){row.forEach(function(v,c){var n=label(v),key=field(n);if(!key)return;
    if(key==='identification')equipmentLabel=true;
    if(key==='fabricant'||key==='modele'){
      var h=recent(headers,r),base=recent(baseHeaders,r);
      values[key]=(base?at(r,base.c):'')||(h?at(r,h.c):'')||next(row,c);
    }else values[key]=next(row,c);
  });});
  rows.forEach(function(row){row.forEach(function(v){var cap=String(v||'').match(/^\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*[x×]\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*$/i);
    if(cap){values.capacite=cap[1].trim()+(cap[2]?' '+cap[2]:'');values.echelon=cap[3].trim()+(cap[4]?' '+cap[4]:'');}
  });});
  var units=[];rows.forEach(function(row){row.forEach(function(v,c){if(/^(true|vrai)$/i.test(String(v||''))&&/^(mg|kg|g|lb|lbs|oz|t)$/.test(label(row[c+1])))units.push(label(row[c+1]).replace('lbs','lb'));});});
  units=units.filter(function(v,i){return units.indexOf(v)===i;});
  if(units.length===1)['capacite','echelon'].forEach(function(k){if(values[k]&&/^[\d\s.,]+$/.test(values[k]))values[k]+=' '+units[0];});
  if(!equipmentType&&!headers.length&&!(equipmentLabel&&(values.fabricant||values.modele||values.capacite)))return null;
  if(!values.fabricant&&!values.modele&&!values.identification&&!values.capacite)return null;
  return Object.assign({id:meta.id,source:meta.name,revision:meta.modifiedTime},values);
}
export function sheetBalanceValuesV2703(rows){const r=cdqWsSheetBalanceV2638_(rows.slice(0,60).map(row=>row.slice(0,100)),{});return r?JSON.stringify(['fabricant','modele','capacite','echelon','identification'].map(k=>r[k]||'')):'null';}
