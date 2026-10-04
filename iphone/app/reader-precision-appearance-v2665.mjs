// Repair only the backgrounds of known precision forms. Values, calculation
// actions, widget geometry and the three plateau illustrations are untouched.
export function normalizePrecisionAppearanceV2665(pdf,L){
 const {PDFName,PDFDict,PDFArray,PDFRawStream,decodePDFRawStream}=L,N=PDFName.of;
 const form=pdf.getForm();
 if(!form.getFieldMaybe('type_plateau')||!form.getFieldMaybe('resolution')||!form.getFieldMaybe('charge_point_7_charge_utilisee'))return false;
 const tint=[.6,.992157,.992157],rects=[];let changed=false;
 const pages=pdf.getPages(),backings=new Map(pages.map(page=>[page,[]]));
 const widgetPage=widget=>pages.find(page=>page.node.Annots()?.asArray().some(ref=>pdf.context.lookup(ref)===widget.dict));
 // Promote old inline drawing streams to valid PDF references. Print viewers
 // tolerated these masters; PDF.js skipped their equipment/header drawings.
 const seen=new Set();
 const drawings=resources=>{
  if(!resources||seen.has(resources))return;seen.add(resources);
  const objects=resources.lookupMaybe(N('XObject'),PDFDict);if(!objects)return;
  for(const [name,value]of objects.entries()){
   const stream=pdf.context.lookup(value);if(!(stream instanceof PDFRawStream))continue;
   if(value instanceof PDFRawStream){objects.set(name,pdf.context.register(stream));changed=true;}
   if(stream.dict.get(N('Subtype'))===N('Form'))drawings(stream.dict.lookupMaybe(N('Resources'),PDFDict));
  }
 };
 for(const page of pdf.getPages()){page.node.normalize();drawings(page.node.Resources());}
 for(const field of [...form.getFields()])if(/^_cdq_(affichage_|v5_teinte)/.test(field.getName())){
  const order=form.acroForm.dict.lookupMaybe(N('CO'),PDFArray);
  if(order)for(let i=order.size()-1;i>=0;i--)if(String(order.get(i))===String(field.ref))order.remove(i);
  form.removeField(field);changed=true;
 }
 const matches=r=>rects.some(q=>Math.abs(q.x-r[0])<2&&Math.abs(q.y-r[1])<2&&Math.abs(q.width-r[2])<3&&Math.abs(q.height-r[3])<3);
 for(const field of form.getFields()){
  if(!('getText' in field)&&!('getSelected' in field)||/^Statut_|^Bouton_|^_/.test(field.getName()))continue;
  for(const widget of field.acroField.getWidgets()){
   const r=widget.getRectangle();if(r.width<3||r.height<3)continue;rects.push(r);
   const page=widgetPage(widget);if(page&&!/(?:^|_)statut_/i.test(field.getName()))backings.get(page).push(r);
   let mk=widget.dict.lookupMaybe(N('MK'),PDFDict);const bg=mk?.lookupMaybe(N('BG'),PDFArray);
   if(!bg||bg.size()!==3||tint.some((v,i)=>Math.abs(Number(bg.get(i)?.numberValue)-v)>.00001)){
    mk??=pdf.context.obj({});mk.set(N('BG'),pdf.context.obj(tint));widget.dict.set(N('MK'),mk);changed=true;
   }
   // Preserve the saved text AP exactly; add its background inside that AP.
   const ap=widget.dict.lookupMaybe(N('AP'),PDFDict),ref=ap?.get(N('N')),stream=ref&&pdf.context.lookup(ref);
   if(!(stream instanceof PDFRawStream))continue;
   const source=Array.from(decodePDFRawStream(stream).decode(),b=>String.fromCharCode(b)).join('');
   const prefix='q 0.6 0.992157 0.992157 rg 0 0 '+r.width+' '+r.height+' re f Q\n';
   if(source.startsWith(prefix))continue;
   const clean=source.replace(/(?:1(?:\.0+)?\s+1(?:\.0+)?\s+1(?:\.0+)?|0\.6\s+0\.992157\s+0\.992157)\s+rg(?=\s+[^B]*?\bre\s+[Bf])/g,'0.6 0.992157 0.992157 rg');
   const raw=Uint8Array.from(prefix+clean,c=>c.charCodeAt(0)),replacement=pdf.context.flateStream(raw);
   for(const [name,value]of stream.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(name)))replacement.dict.set(name,value);
   const replacementRef=pdf.context.register(replacement);ap.set(N('N'),replacementRef);changed=true;
  }
 }
 // Editable widgets are not always painted on the PDF.js page canvas. Their
 // transparent focus/choice controls exposed the white page below, even with
 // correct MK/BG and AP colours. Give the PDF itself a cyan backing inside
 // each existing data rectangle. Keep its border, text, widgets and scripts.
 // The seven result cells have no editable text widget; their checked green
 // and red appearances still paint above this neutral cyan background.
 for(const field of form.getFields())if(/^charge_point_\d+_conforme_vert$/.test(field.getName()))for(const widget of field.acroField.getWidgets()){
  const page=widgetPage(widget),r=widget.getRectangle();if(page&&r.width>3&&r.height>3)backings.get(page).push(r);
 }
 for(const [page,boxes]of backings){
  const unique=[...new Map(boxes.map(r=>[[r.x,r.y,r.width,r.height].join(','),r])).values()];
  const source='% CDQ precision cyan backing V2670\nq 0.6 0.992157 0.992157 rg\n'+unique.map(r=>[r.x+.65,r.y+.65,r.width-1.3,r.height-1.3].join(' ')+' re f').join('\n')+'\nQ\n';
  const marker=N('CDQPrecisionBackgroundV2670'),ref=page.node.get(marker),old=ref&&pdf.context.lookup(ref);
  if(old instanceof PDFRawStream&&Array.from(decodePDFRawStream(old).decode(),b=>String.fromCharCode(b)).join('')===source)continue;
  const stream=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0)));
  if(ref)pdf.context.assign(ref,stream);else{const added=pdf.context.register(stream);page.node.addContentStream(added);page.node.set(marker,added);}
  changed=true;
 }
 // Some old forms paint white cells in the page before drawing the widgets.
 const pageStreams=new Map();
 for(const page of pdf.getPages()){
  const contents=page.node.Contents(),refs=contents instanceof PDFArray?contents.asArray():[contents];
  for(const ref of refs.filter(Boolean))pageStreams.set(String(ref),[ref,pdf.context.lookup(ref)]);
 }
 for(const [ref,stream]of pdf.context.enumerateIndirectObjects())if(stream instanceof PDFRawStream&&stream.dict.get(N('Subtype'))===N('Form'))pageStreams.set(String(ref),[ref,stream]);
 for(const [ref,stream]of pageStreams.values()){
  if(!(stream instanceof PDFRawStream))continue;
  const raw=decodePDFRawStream(stream).decode(),source=Array.from(raw,b=>String.fromCharCode(b)).join('');
  const clean=source.replace(/q\s+1(?:\.0+)?\s+1(?:\.0+)?\s+1(?:\.0+)?\s+rg([\s\S]*?)\bQ/g,(block,body)=>{
   if(/\bBT\b/.test(body))return block;
   const m=body.match(/(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s+re\s+[Bf]/);
   return m&&matches(m.slice(1).map(Number))?block.replace(/1(?:\.0+)?\s+1(?:\.0+)?\s+1(?:\.0+)?\s+rg/,'0.6 0.992157 0.992157 rg'):block;
  });
  if(clean===source)continue;
  const replacement=pdf.context.flateStream(Uint8Array.from(clean,c=>c.charCodeAt(0)));
  for(const [name,value]of stream.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(name)))replacement.dict.set(name,value);
  pdf.context.assign(ref,replacement);changed=true;
 }
 return changed;
}
