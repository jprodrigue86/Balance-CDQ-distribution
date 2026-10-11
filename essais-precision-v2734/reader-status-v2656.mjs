// Update the existing status appearance; no new widgets, text or rectangles.
export async function alignStatusAppearances(pdf,L){
  const {PDFName,PDFDict,PDFRawStream,decodePDFRawStream,StandardFonts}=L;
  const name=PDFName.of,fields=pdf.getForm().getFields().filter(f=>/^(?:bloc3|excentricite)_statut_(?:non_)?conforme$/.test(f.getName()));
  if(!fields.length)return false;
  let font,changed=false;
  for(const field of fields)for(const widget of field.acroField.getWidgets()){
    const ap=widget.dict.lookupMaybe(name('AP'),PDFDict),normal=ap?.lookupMaybe(name('N'),PDFDict),old=normal?.lookup(name('Yes'));
    if(!old)continue;
    const raw=old instanceof PDFRawStream?decodePDFRawStream(old).decode():old.getUnencodedContents?.();
    if(raw&&new TextDecoder().decode(raw).includes('% CDQ aligned right V2656'))continue;
    font??=await pdf.embedFont(StandardFonts.HelveticaBold);
    const {width:w,height:h}=widget.getRectangle(),bad=field.getName().includes('non_conforme'),label=bad?'NON CONFORME':'CONFORME',size=8.8,icon=h*.8,gap=h*.45;
    const x=w-h*.55-icon,left=x-gap-font.widthOfTextAtSize(label,size),baseline=(h-size*.718)/2;
    if(left<0)continue;
    let source='% CDQ aligned right V2656\nq 1 1 1 rg BT /CDQResult '+size+' Tf 0 Tc 0 Tw 100 Tz '+left+' '+baseline+' Td ('+label+') Tj ET '+(bad?'1 .082353 .082353':'.070588 .894118 .188235')+' RG '+(h*.135)+' w 1 J 1 j ';
    source+=bad?(x+icon*.15)+' '+(h*.25)+' m '+(x+icon*.85)+' '+(h*.75)+' l S '+(x+icon*.85)+' '+(h*.25)+' m '+(x+icon*.15)+' '+(h*.75)+' l S Q':x+' '+(h*.5)+' m '+(x+icon*.32)+' '+(h*.22)+' l '+(x+icon*.95)+' '+(h*.78)+' l S Q';
    normal.set(name('Yes'),pdf.context.register(pdf.context.flateStream(source,{Type:'XObject',Subtype:'Form',FormType:1,BBox:[0,0,w,h],Resources:{Font:{CDQResult:font.ref}}})));
    changed=true;
  }
  return changed;
}
