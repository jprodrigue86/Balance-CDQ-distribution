import {normalizePrecisionLayoutV2675} from './reader-precision-layout-v2675.mjs';
// Precision uses the same single page-owned fill/border as the floor report.
// Keep every answer, calculation, widget rectangle and plateau illustration.
export function normalizePrecisionAppearanceV2665(pdf,L){
 const {PDFName,PDFDict,PDFArray,PDFRawStream,PDFHexString,decodePDFRawStream}=L,N=PDFName.of;
 const form=pdf.getForm();
 if(!form.getFieldMaybe('type_plateau')||!form.getFieldMaybe('resolution')||!form.getFieldMaybe('charge_point_7_charge_utilisee')||form.getFieldMaybe('charge_point_8_charge_utilisee'))return false;
 let changed=normalizePrecisionLayoutV2675(pdf,L);
 const pages=pdf.getPages(),boxes=new Map(pages.map(page=>[page,[]])),corners=[];
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
   if(/^excentricite_(avant|apres)_arriere_droit$/.test(name))corners.push({phase:name.split('_')[1],widget,page,r});
   else boxes.get(page).push(r);
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
 const rects=[...boxes.values()].flat().concat(corners.map(c=>c.r)),matches=values=>rects.some(r=>Math.abs(r.x-values[0])<2&&Math.abs(r.y-values[1])<2&&Math.abs(r.width-values[2])<3&&Math.abs(r.height-values[3])<3);
 // Historical read-only screen tints are Watermark annotations, rather than
 // form widgets. Remove only these CDQ tints over this report's data cells.
 for(const page of pages){const annots=page.node.Annots();if(!annots)continue;
  for(let i=annots.size()-1;i>=0;i--){const d=pdf.context.lookup(annots.get(i));
   if(!(d instanceof PDFDict)||d.get(N('Subtype'))!==N('Watermark'))continue;
   const r=d.lookupMaybe(N('Rect'),PDFArray)?.asArray().map(v=>v.asNumber()),s=d.lookupMaybe(N('AP'),PDFDict)?.lookup(N('N'));
   if(r&&s instanceof PDFRawStream&&matches([r[0],r[1],r[2]-r[0],r[3]-r[1]])&&sourceOf(s).includes('/CDQScreen gs')){annots.remove(i);changed=true;}
  }
 }
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
  const source='% CDQ precision single cells V2673\nq 0.6 0.992156863 0.992156863 rg 0.02 0.85 0.94 RG 1 w\n'+unique.map(r=>[r.x,r.y,r.width,r.height].join(' ')+' re B').join('\n')+'\nQ\n';
  const marker=N('CDQPrecisionBackgroundV2670'),ref=page.node.get(marker),old=ref&&pdf.context.lookup(ref);
  if(old instanceof PDFRawStream&&sourceOf(old)===source)continue;
  if(old instanceof PDFRawStream)replace(ref,old,source);
  else{const stream=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0))),added=pdf.context.register(stream);page.node.addContentStream(added);page.node.set(marker,added);changed=true;}
 }
 // The two upper-right cells must follow the same visibility as their inputs.
 // A read-only checkbox owns their paint; its Off appearance is empty for
 // Triangle, and Yes paints the same cyan border for square/round plateaus.
 const plateau=(form.getField('type_plateau').getSelected()||[]).join(' '),triangular=/triangle/i.test(plateau),shape=triangular?'triangle':/rond/i.test(plateau)?'round':'square';
 // PDF.js displays push-button illustrations dynamically, but does not
 // always serialize their visibility. Save the selected shape's flags too.
 for(const field of form.getFields()){
  const image=/^plateau_image_(avant|apres)_(square|round|triangle)$/.exec(field.getName()),fourth=/^excentricite_(avant|apres)_arriere_droit$/.test(field.getName());
  if(!image&&!fourth)continue;const hidden=image?image[2]!==shape:triangular;
  for(const widget of field.acroField.getWidgets()){const flags=widget.getFlags(),next=hidden?flags|2|32:flags&~(2|32);if(next!==flags){widget.setFlags(next);changed=true;}}
  if(fourth&&field.isReadOnly()!==triangular){triangular?field.enableReadOnly():field.disableReadOnly();changed=true;}
 }
 for(const {phase,widget,page,r}of corners){const name='_cdq_precision_corner_'+phase;let box=form.getFieldMaybe(name);
  if(!box){box=form.createCheckBox(name);box.addToPage(page,{...r,borderWidth:0});box.enableReadOnly();
   // Include the outer half of the border in the appearance bounds. The
   // retained writing rectangle stays untouched and the stroke is not clipped.
   const w=box.acroField.getWidgets()[0];w.setRectangle({x:r.x-.5,y:r.y-.5,width:r.width+1,height:r.height+1});w.dict.set(N('MK'),pdf.context.obj({}));
   const attrs={Type:'XObject',Subtype:'Form',BBox:[0,0,r.width+1,r.height+1],Resources:{}};
   const yes=pdf.context.register(pdf.context.flateStream('q 0.6 0.992156863 0.992156863 rg 0.02 0.85 0.94 RG 1 w .5 .5 '+r.width+' '+r.height+' re B Q',attrs));
   const off=pdf.context.register(pdf.context.flateStream('',attrs));w.dict.set(N('AP'),pdf.context.obj({N:{Yes:yes,Off:off}}));
   // In external readers, paint the cell before its retained text annotation.
   const annots=page.node.Annots(),newRef=annots.get(annots.size()-1);annots.remove(annots.size()-1);
   const index=annots.asArray().findIndex(ref=>pdf.context.lookup(ref)===widget.dict);annots.insert(index<0?annots.size():index,newRef);changed=true;
  }
  if(box.isChecked()===triangular){triangular?box.uncheck():box.check();changed=true;}
 }
 // Restore the original two-state conclusion, matching the floor reference.
 // Visit nested/direct action dictionaries too: legacy masters duplicate C
 // actions between their canonical fields and page widget dictionaries.
 const visited=new Set(),actions=object=>{
  if(!object||visited.has(object))return;visited.add(object);
  if(object instanceof PDFDict){
   if(object.get(N('S'))===N('JavaScript')){const js=object.lookup(N('JS'));let old=js instanceof PDFRawStream?sourceOf(js):js?.decodeText?.()||'',source=old;
    if(source.includes('function cdqResults(')){
     source=source.replace(/var complete=anyGood[\s\S]*?check\("Bouton_ACompleter",[\s\S]*?\);/g,'check("Bouton_Conforme", !(anyBad || r4));')
      .replace('out.Statut_conformite = anyBad || r4 ? "Non conforme" : complete ? "Conforme" : "À compléter";','out.Statut_conformite = anyBad || r4 ? "Non conforme" : "Conforme";');
     if(!source.includes('check("_cdq_precision_corner_avant"'))source=source.replace('check("excentricite_statut_non_conforme", r4);','check("excentricite_statut_non_conforme", r4);\n  check("_cdq_precision_corner_avant", !triangular);\n  check("_cdq_precision_corner_apres", !triangular);');
    }
    if(source.includes('var tri')&&source.includes('phases[i]')&&source.includes('plateau_image_')&&!source.includes('// CDQ precision dynamic corner V2673')){
     source=source.replace(/var f\s*=\s*d\.getField\("excentricite_"/, '// CDQ precision dynamic corner V2673\n    var cell=d.getField("_cdq_precision_corner_"+phases[i]);if(cell)cell.value=tri?"Off":"Yes";\n    var f=d.getField("excentricite_"');
    }
    if(source!==old){object.set(N('JS'),PDFHexString.fromText(source));changed=true;}
   }
   for(const [,value]of object.entries())actions(pdf.context.lookup(value));
  }else if(object instanceof PDFArray)for(const value of object.asArray())actions(pdf.context.lookup(value));
 };
 actions(pdf.catalog);
 const pending=form.getFieldMaybe('Bouton_ACompleter');
 if(pending){
  const refs=new Set([String(pending.ref),...pending.acroField.getWidgets().map(w=>String(pdf.context.getObjectRef(w.dict)))]);
  const order=form.acroForm.dict.lookupMaybe(N('CO'),PDFArray);if(order)for(let i=order.size()-1;i>=0;i--)if(String(order.get(i))===String(pending.ref))order.remove(i);
  form.removeField(pending);
  // pdf-lib's removeField can leave a separate Kid widget in Page/Annots.
  // Retire that reference as well, so externally opened saves stay valid.
  for(const page of pages){const annots=page.node.Annots();if(annots)for(let i=annots.size()-1;i>=0;i--)if(refs.has(String(annots.get(i))))annots.remove(i);}
  changed=true;
 }
 const bad=form.getCheckBox('Bouton_NonConforme').isChecked(),good=form.getCheckBox('Bouton_Conforme'),status=form.getTextField('Statut_conformite'),label=bad?'Non conforme':'Conforme';
 if(good.isChecked()===bad){bad?good.uncheck():good.check();changed=true;}
 if(status.getText()!==label){status.setText(label);changed=true;}
 return changed;
}
