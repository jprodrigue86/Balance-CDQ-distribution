export function identificationReportName(value){
  const base=String(value??'').normalize('NFC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,'_').trim().replace(/\.pdf$/i,'').replace(/[.\s]+$/g,'').slice(0,180).trim();
  return base&&/[\p{L}\p{N}]/u.test(base)?base+'.pdf':'';
}
export async function nameFromReport(blob,fallback){
  const module=await import('./vendor/pdf-lib-1.17.1.min.js');
  const library=globalThis.PDFLib||module.default;
  const pdf=await library.PDFDocument.load(await blob.arrayBuffer(),{updateMetadata:false});
  const field=pdf.getForm().getFieldMaybe('identification_balance');
  return identificationReportName(field?.getText?.())||fallback;
}
