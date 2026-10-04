// Precision uses the same single page-owned fill/border as the floor report.
// Keep every answer, calculation, widget rectangle and plateau illustration.
export function normalizePrecisionAppearanceV2665(pdf,L){
 const {PDFName,PDFDict,PDFArray,PDFRawStream,decodePDFRawStream}=L,N=PDFName.of;
 const form=pdf.getForm();
 if(!form.getFieldMaybe('type_plateau')||!form.getFieldMaybe('resolution')||!form.getFieldMaybe('charge_point_7_charge_utilisee')||form.getFieldMaybe('charge_point_8_charge_utilisee'))return false;
 let changed=false;
 const pages=pdf.getPages(),boxes=new Map(pages.map(page=>[page,[]]));
 const sourceOf=stream=>Array.from(stream instanceof PDFRawStream?decodePDFRawStream(stream).decode():stream.getUnencodedContents(),b=>String.fromCharCode(b)).join('');
 const replace=(ref,old,source)=>{
  const stream=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0)));
  for(const [key,value]of old.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(key)))stream.dict.set(key,value);
  pdf.context.assign(ref,stream);changed=true;
 };
 const widgetPage=widget=>pages.find(page=>page.node.Annots()?.asArray().some(ref=>pdf.context.lookup(ref)===widget.dict));
 const dr=form.acroForm.dict.lookupMaybe(N('DR'),PDFDict)||pdf.context.obj({});
 const inputFonts=dr.lookupMaybe(N('Font'),PDFDict)||pdf.context.obj({});
 // pdf-lib uses Helvetica-Bold in widget DA, while historical masters called
 // the same registered font CDQ58. PDF.js needs that DA alias in AcroForm/DR
 // when it serializes an edited appearance for an external PDF reader.
 const fallback=inputFonts.get(N('CDQ58'))||inputFonts.get(N('CDQFinalInput'));
 if(fallback&&!inputFonts.has(N('Helvetica-Bold'))){inputFonts.set(N('Helvetica-Bold'),fallback);changed=true;}
 dr.set(N('Font'),inputFonts);form.acroForm.dict.set(N('DR'),dr);

 for(const field of [...form.getFields()])if(/^_cdq_(affichage_|v5_teinte)/.test(field.getName())){
  const order=form.acroForm.dict.lookupMaybe(N('CO'),PDFArray);
  if(order)for(let i=order.size()-1;i>=0;i--)if(String(order.get(i))===String(field.ref))order.remove(i);
  form.removeField(field);changed=true;
 }
 for(const field of form.getFields()){
  const name=field.getName();
  if(!('getText' in field)&&!('getSelected' in field)||/^Statut_|^Bouton_|^_|statut_/i.test(name))continue;
  for(const widget of field.acroField.getWidgets()){
   const r=widget.getRectangle(),page=widgetPage(widget);if(!page||r.width<3||r.height<3)continue;
   boxes.get(page).push(r);
   // PDF.js insets controls according to BS/W. Removing widget paint and its
   // border prevents the shifted inner cyan rectangle seen during editing.
   const bs=widget.dict.lookupMaybe(N('BS'),PDFDict)||pdf.context.obj({});
   if(Number(bs.get(N('W'))?.numberValue)!==0){bs.set(N('W'),pdf.context.obj(0));bs.set(N('S'),N('S'));widget.dict.set(N('BS'),bs);changed=true;}
   if(String(widget.dict.get(N('Border')))!=='[ 0 0 0 ]'){widget.dict.set(N('Border'),pdf.context.obj([0,0,0]));changed=true;}
   const mk=widget.dict.lookupMaybe(N('MK'),PDFDict);
   for(const key of ['BG','BC'])if(mk?.has(N(key))){mk.delete(N(key));changed=true;}
   // Text is still an editable annotation. Its appearance must paint text
   // only; the page underneath owns the cyan and the one cyan border.
   const ap=widget.dict.lookupMaybe(N('AP'),PDFDict),ref=ap?.get(N('N')),stream=ref&&pdf.context.lookup(ref);
   if(!(stream instanceof PDFRawStream)&&!stream?.getUnencodedContents)continue;
   const old=sourceOf(stream);
   const resources=stream.dict.lookupMaybe(N('Resources'),PDFDict)||pdf.context.obj({}),fonts=resources.lookupMaybe(N('Font'),PDFDict)||pdf.context.obj({});
   const aliases=[...old.matchAll(/\/([^\s]+)\s+[\d.]+\s+Tf\b/g)].map(m=>m[1]);
   for(const alias of aliases)if(!fonts.has(N(alias))){
    const font=inputFonts.get(N(alias))||(alias==='Helvetica-Bold'?fallback:undefined);
    if(font){fonts.set(N(alias),font);resources.set(N('Font'),fonts);stream.dict.set(N('Resources'),resources);changed=true;}
   }
   if(old.startsWith('% CDQ precision text only V2672\n'))continue;const text=old.match(/BT[\s\S]*?ET/g)||[];
   const source='% CDQ precision text only V2672\nq 0 0 '+r.width+' '+r.height+' re W n\n'+text.map(s=>s.replace(/^BT/, 'BT 0 Tc 0 Tw 100 Tz 0 Tr')).join('\n')+'\nQ\n';
   if(old!==source)replace(ref,stream,source);
  }
 }
 for(const field of form.getFields())if(/^charge_point_\d+_conforme_vert$/.test(field.getName()))for(const widget of field.acroField.getWidgets()){
  const page=widgetPage(widget),r=widget.getRectangle();if(page&&r.width>3&&r.height>3)boxes.get(page).push(r);
 }
 const rects=[...boxes.values()].flat(),matches=values=>rects.some(r=>Math.abs(r.x-values[0])<2&&Math.abs(r.y-values[1])<2&&Math.abs(r.width-values[2])<3&&Math.abs(r.height-values[3])<3);
 // Remove only the old cell rectangles from page artwork. Text, arrows,
 // calendar buttons, section frames and images are retained verbatim.
 const streams=new Map(),seen=new Set();
 const drawings=resources=>{
  if(!resources||seen.has(resources))return;seen.add(resources);
  const objects=resources.lookupMaybe(N('XObject'),PDFDict);if(!objects)return;
  for(const [name,value]of objects.entries()){
   const stream=pdf.context.lookup(value);if(!(stream instanceof PDFRawStream))continue;
   let ref=value;if(value instanceof PDFRawStream){ref=pdf.context.register(stream);objects.set(name,ref);changed=true;}
   if(stream.dict.get(N('Subtype'))===N('Form')){streams.set(String(ref),[ref,stream]);drawings(stream.dict.lookupMaybe(N('Resources'),PDFDict));}
  }
 };
 for(const page of pages){
  page.node.normalize();drawings(page.node.Resources());
  const backing=String(page.node.get(N('CDQPrecisionBackgroundV2670')));
  for(const ref of page.node.Contents().asArray())if(String(ref)!==backing)streams.set(String(ref),[ref,pdf.context.lookup(ref)]);
 }
 for(const [ref,stream]of streams.values()){
  if(!(stream instanceof PDFRawStream))continue;
  const old=sourceOf(stream),source=old.replace(/(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s+re\s+([BfS])(?![A-Za-z*])/g,(operation,...args)=>matches(args.slice(0,4).map(Number))?'n':operation);
  if(old!==source)replace(ref,stream,source);
 }
 for(const [page,rectangles]of boxes){
  const unique=[...new Map(rectangles.map(r=>[[r.x,r.y,r.width,r.height].join(','),r])).values()];
  const source='% CDQ precision single cells V2672\nq 0.6 0.992157 0.992157 rg 0.02 0.85 0.94 RG 1 w\n'+unique.map(r=>[r.x,r.y,r.width,r.height].join(' ')+' re B').join('\n')+'\nQ\n';
  const marker=N('CDQPrecisionBackgroundV2670'),ref=page.node.get(marker),old=ref&&pdf.context.lookup(ref);
  if(old instanceof PDFRawStream&&sourceOf(old)===source)continue;
  if(old instanceof PDFRawStream)replace(ref,old,source);
  else{const stream=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0))),added=pdf.context.register(stream);page.node.addContentStream(added);page.node.set(marker,added);changed=true;}
 }
 // The pending conclusion shares the floor report's framed shield button.
 // Its checkbox and calculation actions remain the existing result controls.
 const pending=form.getFieldMaybe('Bouton_ACompleter'),good=form.getFieldMaybe('Bouton_Conforme');
 if(pending&&good){
  const target=pending.acroField.getWidgets()[0].dict.lookupMaybe(N('AP'),PDFDict)?.lookupMaybe(N('N'),PDFDict);
  const exemplar=good.acroField.getWidgets()[0].dict.lookupMaybe(N('AP'),PDFDict)?.lookupMaybe(N('N'),PDFDict)?.lookup(N('Yes'));
  const old=target?.lookup(N('Yes'));
  if(target&&exemplar instanceof PDFRawStream&&old instanceof PDFRawStream&&!sourceOf(old).includes('% CDQ precision pending shield V2672')){
   const source='% CDQ precision pending shield V2672\n'+sourceOf(exemplar)
    .replace('0.055 0.665 0.13 rg 0.025 0.34 0.075 RG','0 .32 .78 rg 0 .18 .48 RG')
    .replace(/q 1 1 1 RG 2\.8 w[\s\S]*?Q/, 'q 1 1 1 rg BT /Bold 20 Tf 0 Tc 0 Tw 100 Tz 1 0 0 1 31 23 Tm (?) Tj ET Q')
    .replace(/q 1 1 1 rg BT \/Bold 13\.5 Tf[\s\S]*?ET Q/, 'q 1 1 1 rg BT /Bold 11.5 Tf 0 Tc 0 Tw 100 Tz 1 0 0 1 65 24.8715 Tm <C020434F4D504CC9544552> Tj ET Q');
   const stream=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0)));
   for(const [key,value]of exemplar.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(key)))stream.dict.set(key,value);
   target.set(N('Yes'),pdf.context.register(stream));changed=true;
  }
 }
 return changed;
}
