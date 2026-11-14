// Serial numbers are identifiers: retain case and leading zeroes. Never infer
// them from a filename, equipment ID, approval number or printer serial.
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[_\s]+/g,' ').trim();
const value=v=>v&&typeof v==='object'&&Object.hasOwn(v,'value')?v.value:v;
export function cleanSerialV2876(v){
 if(typeof v!=='string'&&typeof v!=='number')return '';
 const s=String(v).replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim();
 return s.length>240||/^(?:[-–—]+|n\/?a|non renseign[eé]|true|false|vrai|faux)$/i.test(s)?'':s;
}
function agreed(values){const entries=values.map(cleanSerialV2876).filter(Boolean);return entries.length&&entries.every(v=>v===entries[0])?entries[0]:'';}
export function pdfSerialV2876(fields){
 const read=names=>names.filter(n=>Object.hasOwn(fields||{},n)).map(n=>value(fields[n]));
 const base=read(['base_balance_numero_serie','essai_cdq_base_balance_numero_serie']);
 if(base.some(v=>cleanSerialV2876(v)))return agreed(base);
 return agreed(read(['indicateur_numero_serie','essai_cdq_indicateur_numero_serie']));
}
export function sheetSerialV2876(snapshot){
 const tabs=(snapshot?.onglets||[]).filter(t=>!t.hidden&&!t.masque&&!t.isSheetHidden);
 const results=[];
 for(const tab of tabs){
  const rows=(tab.valeurs||[]).slice(0,60).map(row=>Array.isArray(row)?row.slice(0,100):[]);
  const label=v=>norm(v).replace(/\s*:\s*$/,'');
  const serial=v=>/^(?:n[°ºo]?|no|numero|num[eé]ro|#)\s*(?:de\s*)?serie$/.test(label(v));
  const bases=[],indicators=[];
  rows.forEach((row,r)=>row.forEach((v,c)=>{const n=label(v);if(/^(base|base\s*[/ -]\s*balance|base de la balance)$/.test(n))bases.push({r,c});if(/^(indicateur|balance\s*\/\s*indicateur|balance)$/.test(n))indicators.push({r,c});}));
  rows.forEach((row,r)=>row.forEach((v,c)=>{
   if(!serial(v))return;
   const nearest=items=>items.filter(h=>h.r<r&&r-h.r<=8).slice(-1)[0];
   const base=nearest(bases),indicator=nearest(indicators);
   const at=h=>h&&!serial(row[h.c])?cleanSerialV2876(row[h.c]):'';
   // Only a labelled equipment column is authoritative in matrix layouts.
   if(base||indicator){const s=at(base)||at(indicator);if(s)results.push(s);return;}
   // A simple label/value form is accepted only without competing equipment.
   if(rows.some(a=>a.some(x=>/^(imprimante|cellule(?: de charge)?)$/.test(label(x)))))return;
   for(let n=c+1;n<Math.min(row.length,c+20);n++){
    if(row[n]==null||String(row[n]).trim()==='')continue;
    if(/[:：]\s*$/.test(String(row[n]))||serial(row[n])||/^(modele|fabricant|capacite(?: maximale)?|echelon|unite|identification(?: balance)?|date(?: d etalonnage)?|approbation|indicateur|base(?: de la balance)?|balance)$/.test(label(row[n])))break;
    const s=cleanSerialV2876(row[n]);if(s)results.push(s);break;
   }
  }));
 }
 return agreed(results);
}
