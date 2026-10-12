import {pdfWorkV2729} from './pdf-work-v2729.mjs';
export function identificationReportName(value){
  const base=String(value??'').normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,'_').trim().replace(/\.pdf$/i,'').replace(/[.\s]+$/g,'').slice(0,180).trim();
  return base&&/[\p{L}\p{N}]/u.test(base)?base+'.pdf':'';
}
export function nextNumberedReportNameV2731(type,existing=[]){
  const base=identificationReportName(type).replace(/\.pdf$/i,'');
  if(!base)throw Error('Type de rapport invalide.');
  const names=new Set(existing.filter(value=>typeof value==='string').map(value=>value.normalize('NFC').trim().toLocaleLowerCase('fr')));
  for(let number=1;number<=names.size+1;number++){
    const name=base+' '+number+'.pdf';if(!names.has(name.toLocaleLowerCase('fr')))return name;
  }
  throw Error('Le nom du rapport n’a pas pu être réservé.');
}
export async function nameFromReport(blob,fallback){
  const worker=pdfWorkV2729();if(worker)return (await worker.inspect(blob)).name||fallback;
  const module=await import('./vendor/pdf-lib-1.17.1.min.js');
  const library=globalThis.PDFLib||module.default;
  const pdf=await library.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});
  const field=pdf.getForm().getFieldMaybe('identification_balance');
  return identificationReportName(field?.getText?.())||fallback;
}
