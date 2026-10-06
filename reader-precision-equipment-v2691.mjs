// Migrate both new masters and previously filled precision PDFs without changing
// their values, field names, calculation scripts or photographs.
export const precisionEquipmentV2691=[
 ['identification_balance','type_balance','type_plateau','etendue_verifiee','legal_pour_commerce'],
 ['capacite_maximale','unite_mesure','echelon','resolution','etalon_utilise']
];
export function normalizePrecisionEquipmentV2691(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0);
 if(!form.getFieldMaybe('type_plateau')||!form.getFieldMaybe('resolution'))return false;
 // Repaint reports saved before the V2693 stacking fix as well as new masters.
 // Their V2691 marker can remain even after a save has erased these cells.
 const marker=N('CDQPrecisionEquipmentV2693');if(page.node.has(marker))return false;
 const labels=[['IDENTIFICATION DE LA BALANCE','TYPE DE BALANCE','TYPE DE PLATEAU','ÉTENDUE VÉRIFIÉE','LÉGAL POUR LE COMMERCE'],['CAPACITÉ MAXIMALE (Max)','UNITÉ DE MESURE','ÉCHELON (e)','RÉSOLUTION (d)','ÉTALON UTILISÉ']];
 const font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold),left=11.5,width=113.8,gap=5;
 // The older mask erased the lower half of the printer category's border.
 for(const[ref,o]of pdf.context.enumerateIndirectObjects())if(o instanceof L.PDFRawStream&&o.dict.get(N('Subtype'))!==N('Image')){
  let source;try{source=new TextDecoder().decode(L.decodePDFRawStream(o).decode());}catch{continue;}
  const next=source.replace(/10\.5\s+467\.5\s+591\s+57\s+re\s+f/g,'10.5 467.5 591 56 re f');
  if(next!==source){const stream=pdf.context.flateStream(next);for(const[k,v]of o.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))stream.dict.set(k,v);pdf.context.assign(ref,stream);}
 }
 let art='% CDQ equal precision equipment V2691\nq 1 1 1 rg 10.5 467.5 591 56 re f Q\n';
 for(let row=0;row<2;row++)for(let col=0;col<5;col++){
  const field=form.getField(precisionEquipmentV2691[row][col]);
  for(const widget of field.acroField.getWidgets()){
   const r=widget.getRectangle(),x=left+col*(width+gap);widget.setRectangle({...r,x,width});
   const text=field.getText?.()||field.getSelected?.().join(' ')||'',size=text?Math.min(10.36,(width-4)/font.widthOfTextAtSize(text,1)):10.36;
   const source='q 0 0 '+width+' '+r.height+' re W n BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ91 '+size+' Tf 0 g '+((width-font.widthOfTextAtSize(text,size))/2)+' '+((r.height-size*.718)/2)+' Td '+font.encodeText(text)+' Tj ET Q';
   widget.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream(source,{Type:'XObject',Subtype:'Form',BBox:[0,0,width,r.height],Resources:{Font:{CDQ91:font.ref}}}))}));
   widget.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));widget.dict.set(N('Border'),pdf.context.obj([0,0,0]));
   const mk=widget.dict.lookupMaybe(N('MK'),L.PDFDict);mk?.delete(N('BG'));mk?.delete(N('BC'));
   art+='q .6 .992156863 .992156863 rg .02 .85 .94 RG 1 w '+[x,r.y,width,r.height].join(' ')+' re B Q\n';
   const label=labels[row][col],ls=Math.min(8.4,(width-2)/font.widthOfTextAtSize(label,1));
   art+='q .114 .059 .871 rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ91 '+ls+' Tf '+(x+(width-font.widthOfTextAtSize(label,ls))/2)+' '+(r.y+r.height+3)+' Td '+font.encodeText(label)+' Tj ET Q\n';
  }
 }
 page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ91'),font.ref);resources.set(N('Font'),fonts);
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);
 return true;
}
