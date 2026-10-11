// Read the saved final checkboxes; never infer conformity from a test reading.
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2019']/g,' ').replace(/[_\-\u2010-\u2015]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const heading=value=>normalize(value).replace(/^\d+\s*[.):\u2013-]?\s*/,'').replace(/\s*:\s*$/,'');
const conclusion=value=>/^(?:conclusion|conclusion finale|statut (?:de |de la )?conformite|conformite finale|resultat final|resultat (?:d |de l )examen)$/.test(heading(value));
const finalLabel=value=>{const text=heading(value).replace(/^balance (?:est )?/,'');return text==='conforme'?'conforming':text==='non conforme'||text==='nonconforme'?'nonconforming':null;};
const stop=value=>/^(?:commentaires?(?:\s*\/\s*observations?)?|observations?(?:\s*\/\s*commentaires?)?|resume(?:\s*\/\s*commentaires?)?|notes?|signature(?:s)?|technicien|identification (?:du client|de l equipement)|essai.*)$/.test(heading(value));
const checkbox=value=>value===true||typeof value==='string'&&/^(?:true|vrai)$/i.test(value.trim())?true:value===false||typeof value==='string'&&/^(?:false|faux)$/i.test(value.trim())?false:null;

function sectionStatus(rows,start,end){
 const labels=[],checks=[];
 for(let row=start;row<end;row++)for(let column=0;column<(rows[row]?.length||0);column++){
  const value=rows[row][column],status=finalLabel(value),checked=checkbox(value);
  if(status)labels.push({row,column,status});
  if(checked!==null)checks.push({row,column,checked});
 }
 // A lone phrase or an unrelated checked cell does not identify the final pair.
 if(labels.length===0)return null;
 if(labels.length!==2||new Set(labels.map(item=>item.status)).size!==2)return 'unknown';
 function candidate(label,check){
  const rowDistance=Math.abs(label.row-check.row),columnDistance=Math.abs(label.column-check.column);
  if(!(rowDistance===0&&columnDistance>0&&columnDistance<=16||rowDistance===1&&columnDistance===0))return false;
  if(rowDistance===0){
   const low=Math.min(label.column,check.column),high=Math.max(label.column,check.column);
   // Merged labels leave empty cells. Do not cross other labels or free text.
   for(let column=low+1;column<high;column++)if(normalize(rows[label.row][column])!=='')return false;
  }
  return true;
 }
 const choices=labels.map(label=>checks.map((check,index)=>({check,index,distance:Math.abs(label.column-check.column)+4*Math.abs(label.row-check.row)})).filter(item=>candidate(label,item.check)));
 let distance=Infinity;const results=new Set(),assignments=new Set();
 for(const first of choices[0])for(const second of choices[1]){
  if(first.index===second.index)continue;
  const cost=first.distance+second.distance;if(cost>distance)continue;
  if(cost<distance){distance=cost;results.clear();assignments.clear();}
  const checked=[first.check.checked,second.check.checked];
  assignments.add(first.index+':'+second.index);
  const bad=labels.findIndex(item=>item.status==='nonconforming');
  results.add(checked[bad]?'nonconforming':checked[1-bad]?'conforming':'unknown');
 }
 return assignments.size===1&&results.size===1?[...results][0]:'unknown';
}

export function sheetReportConformityV2727(snapshot){
 const statuses=[];
 for(const tab of Array.isArray(snapshot?.onglets)?snapshot.onglets:[]){
  const rows=Array.isArray(tab?.valeurs)?tab.valeurs.filter(Array.isArray):[];
  for(let row=0;row<rows.length;row++){
   if(!rows[row].some(conclusion))continue;
   // The inspected examination forms have the global result on one row, before
   // many similarly labelled subtests. A complete pair on the heading row owns
   // only that row. Legacy reports also have a Conclusion followed by Résultat
   // final; do not let the empty parent heading mask the actual final pair.
   let end=rows[row].filter(value=>finalLabel(value)).length===2?row+1:Math.min(rows.length,row+24);
   for(let next=row+1;next<end;next++)if(rows[next].some(conclusion)||rows[next].some(stop)){end=next;break;}
   const status=sectionStatus(rows,row,end);if(status!==null)statuses.push(status);
  }
 }
 if(statuses.includes('nonconforming'))return 'nonconforming';
 return statuses.length&&statuses.every(status=>status==='conforming')?'conforming':'unknown';
}
