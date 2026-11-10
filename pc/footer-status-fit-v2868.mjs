// The two 28.67 footer captions had fixed origins that clipped COMPLÉTER.
// Reposition only their exact authored streams, retaining font, shield, values
// and all calculation actions. Historical templates have no backlog marker.
export function fitBacklogStatusCaptionsV2868(pdf,L){
 const N=L.PDFName.of;
 if(pdf.catalog.lookupMaybe(N('CDQBacklog2864'),L.PDFBool)?.asBoolean()!==true)return false;
 let changed=false;
 for(const [state,word,x] of [['blue','52454d504c4952','76.985182'],['pending','434f4d504cc9544552','66.240469']]){
  const field=pdf.getForm().getFieldMaybe('essai_cdq_conclusion_'+state);
  if(!field)continue;
  for(const widget of field.acroField.getWidgets()){
   const normal=widget.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookupMaybe(N('N'),L.PDFDict);
   const appearance=normal?.lookupMaybe(N('Yes'),L.PDFRawStream);
   if(!appearance)continue;
   const box=appearance.dict.lookupMaybe(N('BBox'),L.PDFArray)?.asArray().map(n=>n.asNumber());
   if(JSON.stringify(box)!=='[0,0,158.82653,56.07843]')continue;
   const raw=new TextDecoder().decode(L.decodePDFRawStream(appearance).decode());
   if(!raw.includes('/FRCB 15.52941 Tf')||!raw.includes('<'+word.toLowerCase()+'> Tj'))continue;
   const upper='1 0 0 1 107 30.52392 Tm',lower='1 0 0 1 82 14.21804 Tm';
   if(raw.split(upper).length!==2||raw.split(lower).length!==2)continue;
   const fixed=raw.replace(upper,'1 0 0 1 100.863167 30.52392 Tm').replace(lower,`1 0 0 1 ${x} 14.21804 Tm`);
   const stream=pdf.context.flateStream(new TextEncoder().encode(fixed));
   for(const [key,value] of appearance.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(key.toString()))stream.dict.set(key,value);
   // Replace only this widget's Yes state; its original Off state is untouched.
   normal.set(N('Yes'),pdf.context.register(stream));changed=true;
  }
 }
 return changed;
}
