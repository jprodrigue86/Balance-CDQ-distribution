import {reportFieldNameV2819,reportFieldV2819,reportFieldValueV2819,isV34ReportFieldsV2819} from './report-field-aliases-v2819.mjs';
import {pdfWorkV2729} from './pdf-work-v2729.mjs';
// Read the saved CDQ conclusion only. Opening a folder must not run the
// report's JavaScript, recalculate readings or modify the source PDF.
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-_\s]+/g,' ').trim();
const checked=field=>typeof field?.isChecked==='function'&&field.isChecked()===true;

export function pdfReportConformityV2727(form){
 if(typeof form?.getFields!=='function')return 'unknown';
 const actual=new Map(form.getFields().map(field=>[field.getName(),field]));
 const fields={has:name=>reportFieldV2819(actual,reportFieldNameV2819(actual,name))!==undefined,get:name=>reportFieldV2819(actual,reportFieldNameV2819(actual,name))};
 if(!['identification_balance','capacite_maximale','echelon'].every(name=>fields.has(name)))return 'unknown';
 const status=normalize(fields.get('Statut_conformite')?.getText?.());
 // V34 colored artwork uses three checked widgets, with visibility selecting
 // the one to paint. A hidden red/green artwork widget is not a verdict.
 if(actual.has('essai_cdq_statut_global')){
   if(status==='non conforme')return 'nonconforming';
   if(status==='conforme')return 'conforming';
   return 'unknown';
 }
 // The final red icon is authoritative, including legacy reports whose
// hidden status text or green icon was left inconsistent by another viewer.
 if(checked(fields.get('Bouton_NonConforme'))||status==='non conforme')return 'nonconforming';
 if(checked(fields.get('Bouton_ACompleter'))||['a completer','incomplet','essais a completer'].includes(status))return 'unknown';
 if(checked(fields.get('Bouton_Conforme'))||status==='conforme')return 'conforming';
 return 'unknown';
}

// Same conclusion rules for the engine's authenticated response snapshot.
export function reportConformityFieldsV2770(values){
 if(!values||typeof values!=='object')return 'unknown';
 const truth=value=>value===true||['yes','on','true','1','oui'].includes(normalize(value));
 return pdfReportConformityV2727({getFields:()=>Object.entries(values).map(([name,state])=>({getName:()=>name,getText:()=>state?.value,isChecked:()=>truth(state?.value)}))});
}

export async function pdfReportConformitySnapshotV2727(blob,L){
 if(!(blob instanceof Blob))throw Error('PDF absent');
 const worker=pdfWorkV2729();if(worker)return (await worker.inspect(blob)).conformity;
 const pdf=await L.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});
 return pdfReportConformityV2727(pdf.getForm());
}
