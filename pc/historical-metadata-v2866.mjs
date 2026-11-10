// Permanent inventory reads the existing incrementally maintained report index.
// Only confirmed report revisions are exposed; no PDF or image is opened here.
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
const clean=v=>typeof v==='string'&&v.length<=240?v.replace(/[\x00-\x1f\x7f]/g,' ').trim()||null:null;
const value=f=>f&&typeof f==='object'&&Object.hasOwn(f,'value')?f.value:f;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-_\s]+/g,' ').trim();
const checked=v=>v===true||['yes','on','true','1','oui'].includes(norm(v));
export function date(value,month=false){
 let s=String(value??'').trim(),parts;
 if(month&&/^(0?[1-9]|1[0-2])[/.-]20\d\d$/.test(s)){parts=s.split(/[/.-]/);s=parts[1]+'-'+parts[0].padStart(2,'0');}
 if(/^\d{1,2}[/.-]\d{1,2}[/.-]20\d\d$/.test(s)){parts=s.split(/[/.-]/);s=parts[2]+'-'+parts[1].padStart(2,'0')+'-'+parts[0].padStart(2,'0');}
 if(month&&/^20\d\d-(0[1-9]|1[0-2])$/.test(s))return s;
 if(!/^20\d\d-\d\d-\d\d$/.test(s))return null;
 const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?(month?s.slice(0,7):s):null;
}
const fieldNames=[
 'identification_balance','identification','essai_cdq_identification_balance','type_balance','essai_cdq_type_balance',
 'Statut_conformite','essai_cdq_statut_global','Bouton_Conforme','Bouton_NonConforme','Bouton_ACompleter',
 'essai_cdq_conclusion_green','essai_cdq_conclusion_red','essai_cdq_conclusion_gray','essai_cdq_conclusion_blue','essai_cdq_conclusion_pending',
 'essai_cdq_probleme_constate','essai_cdq__recalcul',
 'date_etalonnage','essai_cdq_date_etalonnage','date_etalonnage_1','date_etalonnage_2','date_etalonnage_3',
 'essai_cdq_date_jour','essai_cdq_date_mois','essai_cdq_date_annee',
 'prochain_etalonnage','essai_cdq_prochain_etalonnage','prochain_etalonnage_1','prochain_etalonnage_2','prochain_etalonnage_3',
 'essai_cdq_prochain_jour','essai_cdq_prochain_mois','essai_cdq_prochain_annee'
];
function dates(f,due){
 const get=n=>value(f[n]),candidates=[];
 const add=v=>{if(v!==null&&v!==undefined&&String(v).trim())candidates.push(date(v,due));};
 for(const n of due?['prochain_etalonnage','essai_cdq_prochain_etalonnage']:['date_etalonnage','essai_cdq_date_etalonnage'])add(get(n));
 for(const names of due?[['prochain_etalonnage_1','prochain_etalonnage_2','prochain_etalonnage_3'],['essai_cdq_prochain_jour','essai_cdq_prochain_mois','essai_cdq_prochain_annee']]:[['date_etalonnage_1','date_etalonnage_2','date_etalonnage_3'],['essai_cdq_date_jour','essai_cdq_date_mois','essai_cdq_date_annee']]){
  const [d,m,y]=names.map(n=>String(get(n)??'').trim());if(!d&&!m&&!y)continue;
  if(!/^20\d\d$/.test(y)||!/^\d{1,2}$/.test(m)||(!due&&!/^\d{1,2}$/.test(d))||due&&d&&!/^\d{1,2}$/.test(d)){candidates.push(null);continue;}
  add(y+'-'+m.padStart(2,'0')+(d?'-'+d.padStart(2,'0'):''));
 }
 return candidates.length&&candidates.every(v=>v!==null&&v===candidates[0])?candidates[0]:null;
}
export function nativeMetadata(fields){
 const f=fields||{},get=n=>value(f[n]);
 const modern=f.essai_cdq_probleme_constate!=null&&f.essai_cdq__recalcul!=null&&f.essai_cdq_statut_global!=null;
 const status=norm(get(modern?'essai_cdq_statut_global':'Statut_conformite'));
 const choices=modern?['essai_cdq_conclusion_green','essai_cdq_conclusion_red','essai_cdq_conclusion_gray','essai_cdq_conclusion_blue','essai_cdq_conclusion_pending']:['Bouton_Conforme','Bouton_NonConforme','Bouton_ACompleter'];
 const visibleSelected=field=>{
  if(!field||field.hidden===true||field.noView===true||[1,3].includes(field.display))return false;
  if(Array.isArray(field.widgets))return field.widgets.some(w=>w.noView===false&&checked(w.value??value(field)));
  return (field.noView===false||field.hidden===false||[0,2].includes(field.display))&&checked(value(field));
 };
 // V34 artwork has every checkbox checked. Visibility, when explicitly captured,
 // selects its actual painted conclusion. Missing visibility is not a selection.
 const selected=choices.map(n=>modern?visibleSelected(f[n]):checked(get(n))&&f[n]?.hidden!==true&&f[n]?.noView!==true&&!([1,3].includes(f[n]?.display))),labels=['conforming','nonconforming','unknown','unknown','unknown'];
 const parsed=status==='conforme'?'conforming':status==='non conforme'?'nonconforming':'unknown';
 // Only actual final choices count. Fill colors and point indicators are ignored.
 const active=selected.flatMap((yes,i)=>yes?[labels[i]]:[]);
 const conformity=active.length>1||active.length===1&&status&&active[0]!==parsed?'unknown':active.length===1?active[0]:parsed;
 return {identification:clean(get('identification_balance'))||clean(get('essai_cdq_identification_balance'))||clean(get('identification')),
  type:clean(get('type_balance'))||clean(get('essai_cdq_type_balance')),conformity,reportDate:dates(f,false),nextDate:dates(f,true)};
}
export function legacyMetadata(row){
 const a=['conforming','nonconforming','unknown'].includes(row?.conformity)?row.conformity:null;
 const raw=norm(row?.conformite),b=raw==='conforme'?'conforming':raw==='non conforme'?'nonconforming':raw?'unknown':null;
 return {identification:clean(row?.identification),type:clean(row?.type),conformity:a&&b&&a!==b?'unknown':a||b||'unknown',reportDate:date(row?.dateEtalonnage),nextDate:date(row?.prochaineDate,true)};
}

function sheetDate(value,due){
 const raw=String(value??'').trim(),fold=norm(raw).replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
 const months=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
 const match=fold.match(/^(?:(\d{1,2})\s+)?([a-z]+)\s+(20\d\d)$/);
 if(match&&months.includes(match[2])){const y=match[3],m=String(months.indexOf(match[2])+1).padStart(2,'0');return date(y+'-'+m+(match[1]?'-'+match[1].padStart(2,'0'):''),due);}
 return date(raw,due);
}
function sheetDates(snapshot){
 const found={reportDate:[],nextDate:[]};
 const heading=value=>norm(value).replace(/[’']/g,' ').replace(/\s*:\s*$/,'').replace(/\s+/g,' ').trim();
 const key=value=>/^(date d etalonnage|date etalonnage|date de l etalonnage)$/.test(heading(value))?'reportDate':/^(date due|prochain etalonnage|date du prochain etalonnage|prochaine date d etalonnage|date d echeance)$/.test(heading(value))?'nextDate':null;
 for(const tab of Array.isArray(snapshot?.onglets)?snapshot.onglets:[]){
  const rows=Array.isArray(tab.valeurs)?tab.valeurs:[];
  for(let r=0;r<rows.length;r++)for(let c=0;c<(rows[r]?.length||0);c++){
   const label=String(rows[r][c]??''),inline=label.match(/^(.+?)\s*:\s*(\S.+)$/),k=key(label)||(inline?key(inline[1]):null);if(!k)continue;
   let raw=inline&&key(inline[1])?inline[2]:null;
   if(raw===null){
    for(let n=c+1;n<Math.min(rows[r].length,c+20);n++){const v=rows[r][n];if(v===null||v===undefined||String(v).trim()==='')continue;if(key(v)||/[:：]\s*$/.test(String(v)))break;raw=v;break;}
    if(raw===null){const below=rows[r+1]?.[c];if(below!==undefined&&String(below).trim()&&!key(below))raw=below;}
   }
   if(raw!==null&&String(raw).trim())found[k].push(sheetDate(raw,k==='nextDate'));
  }
 }
 const unique=values=>values.length&&values.every(v=>v!==null&&v===values[0])?values[0]:null;
 return {reportDate:unique(found.reportDate),nextDate:unique(found.nextDate)};
}
function pdfMetadata(form){
 if(typeof form?.getFields!=='function')return nativeMetadata({});
 const fields={};
 for(const f of form.getFields()){
  const name=f.getName();if(!fieldNames.includes(name))continue;
  const state={value:typeof f.getText==='function'?f.getText():typeof f.isChecked==='function'?f.isChecked():''};
  if(typeof f.acroField?.getWidgets==='function')state.widgets=f.acroField.getWidgets().map(w=>({value:state.value,noView:!!(w.getFlags()&(1|2|32))}));
  fields[name]=state;
 }
 return nativeMetadata(fields);
}

export {sheetDates,pdfMetadata};
import {equipmentValuesV2697} from './equipment-list-v2697.mjs';
import {pdfWorkV2729} from './pdf-work-v2729.mjs';
import {sheetReportConformityV2727} from './sheet-report-conformity-v2727.mjs';
export function validHistoricalMetadata(m){return !!m&&['conforming','nonconforming','unknown'].includes(m.conformity)&&(m.type===null||typeof m.type==='string'&&m.type.length<=240)&&(m.reportDate===null||date(m.reportDate)===m.reportDate)&&(m.nextDate===null||date(m.nextDate,true)===m.nextDate);}
export async function readHistoricalPdf(blob,L){
 if(!(blob instanceof Blob))throw Error('PDF absent');
 const worker=pdfWorkV2729();if(worker){const info=await worker.inspect(blob);if(info.metadataVersion===2866&&validHistoricalMetadata(info.metadata))return info;}
 const pdf=await L.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false}),form=pdf.getForm();
 return {equipment:equipmentValuesV2697(form),metadataVersion:2866,metadata:pdfMetadata(form)};
}
export function readHistoricalSheet(record){
 if(record.kind==='cdq-conformity-summary-v2775'){
  if(record.complete!==true||record.metadataVersion!==2866||!validHistoricalMetadata(record.metadata)||record.conformity!==record.metadata.conformity)throw Error('Métadonnées Sheets non confirmées.');
  return {...record.metadata};
 }
 const visible={onglets:(record.onglets||[]).filter(tab=>!tab.hidden&&!tab.masque&&!tab.isSheetHidden)};
 return {type:null,...sheetDates(visible),conformity:sheetReportConformityV2727(visible)};
}
