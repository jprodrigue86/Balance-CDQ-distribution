import {pdfWorkV2729} from './pdf-work-v2729.mjs';
// Read the saved CDQ conclusion only. Opening a folder must not run the
// report's JavaScript, recalculate readings or modify the source PDF.
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-_\s]+/g,' ').trim();
const checked=field=>typeof field?.isChecked==='function'&&field.isChecked()===true;

export function pdfReportConformityV2727(form){
 if(typeof form?.getFields!=='function')return 'unknown';
 const fields=new Map(form.getFields().map(field=>[field.getName(),field]));
 if(!['identification_balance','capacite_maximale','echelon'].every(name=>fields.has(name)))return 'unknown';
 const status=normalize(fields.get('Statut_conformite')?.getText?.());
 // The final red icon is authoritative, including legacy reports whose
// hidden status text or green icon was left inconsistent by another viewer.
 if(checked(fields.get('Bouton_NonConforme'))||status==='non conforme')return 'nonconforming';
 if(checked(fields.get('Bouton_ACompleter'))||status==='a completer')return 'unknown';
 if(checked(fields.get('Bouton_Conforme'))||status==='conforme')return 'conforming';
 return 'unknown';
}

export async function pdfReportConformitySnapshotV2727(blob,L){
 if(!(blob instanceof Blob))throw Error('PDF absent');
 const worker=pdfWorkV2729();if(worker)return (await worker.inspect(blob)).conformity;
 const pdf=await L.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});
 return pdfReportConformityV2727(pdf.getForm());
}
