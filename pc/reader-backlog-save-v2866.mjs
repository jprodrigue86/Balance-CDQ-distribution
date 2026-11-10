// Restore one authored empty border array removed by PDF.js serialization.
// Historical documents and nonempty border definitions remain unchanged.
export function restoreBacklogCommentBorderV2866(pdf,L){
 const N=L.PDFName.of;if(pdf.catalog.lookupMaybe(N('CDQBacklog2864'),L.PDFBool)?.asBoolean()!==true)return false;
 const field=pdf.getForm().getFieldMaybe('essai_cdq_commentaire');if(!(field instanceof L.PDFTextField))return false;
 let changed=false;for(const widget of field.acroField.getWidgets()){
  const mk=widget.dict.lookupMaybe(N('MK'),L.PDFDict);
  if(mk&&!mk.has(N('BC'))){mk.set(N('BC'),pdf.context.obj([]));changed=true;}
 }return changed;
}
