// Center glyphs optically inside the existing PDF widget; never paint a box.
let context;
export function textInkMetrics(text,size){
  if(typeof document!=='undefined'){
    context??=document.createElement('canvas').getContext('2d');
    if(context){context.font='700 '+size+'px Arial,Helvetica,sans-serif';const m=context.measureText(String(text||'200'));
      if(Number.isFinite(m.actualBoundingBoxAscent))return {ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent};}
  }
  return {ascent:size*.718,descent:/[gjpqy]/.test(String(text))?size*.207:0};
}
export function centerFieldGlyphs(field){
  if(field.tagName==='TEXTAREA'||field.tagName==='SELECT')return;
  context??=document.createElement('canvas').getContext('2d');
  if(!context)return;
  const style=getComputedStyle(field),size=parseFloat(style.fontSize);
  if(!Number.isFinite(size)||size<=0)return;
  context.font=style.fontWeight+' '+size+'px '+style.fontFamily;
  const value=field.tagName==='BUTTON'?field.querySelector('.cdq-choice-value')?.textContent:field.value;
  let m=context.measureText(String(value||'200'));
  if(!Number.isFinite(m.actualBoundingBoxAscent))return;
  // The line box must contain the complete font, including the bottom of g/y.
  // In particular, a choice label with line-height:1 and overflow:hidden used
  // to cut off descenders even when its containing PDF rectangle was tall.
  const height=field.getBoundingClientRect().height;
  const fontHeight=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
  const fit=Math.min(1,Math.max(1,height-1)/fontHeight);
  if(fit<1){field.style.setProperty('font-size',(size*fit)+'px','important');context.font=style.fontWeight+' '+(size*fit)+'px '+style.fontFamily;m=context.measureText(String(value||'200'));}
  const effectiveSize=size*fit,fontAscent=m.fontBoundingBoxAscent??effectiveSize*.92,fontDescent=m.fontBoundingBoxDescent??effectiveSize*.24;
  const shift=(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent-fontAscent+fontDescent)/2;
  field.style.setProperty('text-align','center','important');
  if(field.tagName==='BUTTON'){
    const label=field.querySelector('.cdq-choice-value');
    if(label){label.style.lineHeight=(fontAscent+fontDescent)+'px';label.style.transform='translateY('+shift+'px)';}
  }else{
    field.style.setProperty('box-sizing','border-box','important');
    field.style.setProperty('line-height',(fontAscent+fontDescent)+'px','important');
    field.style.setProperty('padding-top',Math.max(0,2*shift)+'px','important');
    field.style.setProperty('padding-bottom',Math.max(0,-2*shift)+'px','important');
  }
}

export function compactToleranceActions(pdf,L){
  const {PDFName,PDFDict,PDFHexString}=L;
  let changed=false;
  for(const field of pdf.getForm().getFields()){
    if(!/^(?:charge_point_\d+_tolerance|tolerance_excentricite)$/.test(field.getName()))continue;
    const aa=field.acroField.dict.lookupMaybe(PDFName.of('AA'),PDFDict);
    const action=aa?.lookupMaybe(PDFName.of('F'),PDFDict);
    if(!action)continue; // Do not introduce a calculation/format on unrelated PDFs.
    const script=action.lookup(PDFName.of('JS'))?.decodeText?.();
    if(!script||!script.includes('event.value')||!script.includes('±'))continue;
    const compact='if(event.value!==""&&event.value!==null){var t=Number(event.value);if(isFinite(t))event.value="±"+String(t).replace(".",",")+"e";}';
    if(script!==compact){action.set(PDFName.of('JS'),PDFHexString.fromText(compact));changed=true;}
  }
  return changed;
}

export function centerSingleLineAppearances(pdf,L){
  const {PDFName,PDFDict,PDFRawStream,decodePDFRawStream}=L;
  const form=pdf.getForm();
  if(!form.getFieldMaybe('identification_balance')&&!form.getFieldMaybe('charge_point_1_charge_utilisee'))return false;
  let changed=false;
  for(const field of form.getFields()){
    if(!field.getText||field.isMultiline?.()||/^_|statut/i.test(field.getName()))continue;
    for(const widget of field.acroField.getWidgets()){
      let r;try{r=widget.getRectangle();}catch{continue;}
      const ap=widget.dict.lookupMaybe(PDFName.of('AP'),PDFDict),stream=ap?.lookup(PDFName.of('N'));
      if(!stream)continue;
      const raw=stream instanceof PDFRawStream?decodePDFRawStream(stream).decode():stream.getUnencodedContents?.();
      if(!raw)continue;let source='';
      for(let i=0;i<raw.length;i+=8192)source+=String.fromCharCode(...raw.subarray(i,i+8192));
      const text=source.match(/BT[\s\S]*?ET/g);
      if(text?.length!==1)continue;
      const size=Number(/\/\S+\s+([\d.]+)\s+Tf/.exec(text[0])?.[1]);
      const positions=[...text[0].matchAll(/(?:1\s+0\s+0\s+1\s+)?([-\d.]+)\s+([-\d.]+)\s+(Tm|Td)\b/g)];
      if(!(size>0)||positions.length!==1)continue;
      const position=positions[0],ink=textInkMetrics(field.getText(),size),baseline=(r.height-ink.ascent+ink.descent)/2;
      if(Math.abs(Number(position[2])-baseline)<.01)continue;
      const replacement=position[0].replace(/([-\d.]+)(\s+(?:Tm|Td))$/,baseline.toFixed(5)+'$2');
      const centered=source.replace(text[0],text[0].replace(position[0],replacement));
      const bytes=Uint8Array.from(centered,c=>c.charCodeAt(0));
      const result=pdf.context.flateStream(bytes);
      for(const [key,value]of stream.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(key.toString()))result.dict.set(key,value);
      ap.set(PDFName.of('N'),pdf.context.register(result));changed=true;
    }
  }
  return changed;
}
