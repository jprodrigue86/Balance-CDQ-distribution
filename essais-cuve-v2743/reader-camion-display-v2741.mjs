import {centerFieldsGlyphs} from './reader-layout-v2653.mjs';

// One read-only indicator, driven only by the existing eccentricity load.
// Its internal name is intentionally outside the legacy display-mirror prefix.
export const camionDisplayV2741=Object.freeze({marker:'CDQCamionDisplayV2741',field:'_cdq_camion_indicateur_v2741',source:'charge_excentricite'});
const asText=value=>value===null||value===undefined?'':String(value);
const number=value=>String(+value.toFixed(6));
const definitions=(fields,name)=>{const value=fields?.get?.(name)||fields?.[name];return value?Array.isArray(value)?value:[value]:[];};

// Reuse the native font and appearance object. No page drawing, background,
// border, duplicate widget, source action or calculation is changed here.
export function normalizeCamionDisplayV2741(pdf,L){
  const N=L.PDFName.of,{marker,field:name,source}=camionDisplayV2741;
  if(pdf.catalog.lookupMaybe(N(marker),L.PDFBool)?.asBoolean()!==true)return false;
  const form=pdf.getForm(),display=form.getFieldMaybe(name),driver=form.getFieldMaybe(source);
  if(!display?.getText||!driver?.getText||!display.isReadOnly()||display.acroField.dict.lookup(N('TU'))?.decodeText?.()!==marker)return false;
  const widgets=display.acroField.getWidgets();if(widgets.length!==1)throw Error('Unexpected Camion indicator widget count');
  const widget=widgets[0],r=widget.getRectangle(),dict=display.acroField.dict;
  const da=(widget.dict.lookup(N('DA'))||dict.lookup(N('DA')))?.decodeText?.()||'';
  const selection=da.match(/\/(\S+)\s+([-+]?(?:\d+\.?\d*|\.\d+))\s+Tf\b/),color=da.match(/([-+]?[\d.]+)\s+([-+]?[\d.]+)\s+([-+]?[\d.]+)\s+rg\b/);
  const fonts=form.acroForm.dict.lookup(N('DR'),L.PDFDict).lookup(N('Font'),L.PDFDict),alias=selection?.[1],fontRef=alias?fonts.get(N(alias)):null,font=fontRef?pdf.context.lookup(fontRef):null;
  const widths=font?.lookupMaybe(N('Widths'),L.PDFArray),first=font?.lookupMaybe(N('FirstChar'),L.PDFNumber)?.asNumber()||0,nominal=Number(selection?.[2]);
  if(!widths||!color||!(nominal>0)||!(r.width>0&&r.height>0))throw Error('Invalid native Camion indicator style');
  const value=asText(driver.getText());
  // The driver is a numeric input. Keep its value exact; equivalent nonbreaking
  // separators use the existing WinAnsi space in the printed appearance.
  const chars=Array.from(value,c=>/[\u2007\u202f]/.test(c)?160:c.charCodeAt(0)).map(c=>c>=32&&c<=255?c:63);
  const advance=chars.reduce((sum,c)=>sum+(widths.lookup(c-first,L.PDFNumber)?.asNumber()||0),0)/1000;
  const size=advance?Math.min(nominal,Math.max(.1,r.width-.4)/advance):nominal;
  const x=(r.width-advance*size)/2,y=(r.height-size*.718)/2,hex=chars.map(c=>c.toString(16).padStart(2,'0')).join('');
  const commands=`q 0 0 ${number(r.width)} ${number(r.height)} re W n BT 0 Tc 0 Tw 100 Tz 0 Tr /${alias} ${number(size)} Tf ${color[1]} ${color[2]} ${color[3]} rg 1 0 0 1 ${number(x)} ${number(y)} Tm <${hex}> Tj ET Q`;
  let changed=false;
  if(asText(display.getText())!==value){dict.set(N('V'),L.PDFHexString.fromText(value));changed=true;}
  const ap=widget.dict.lookupMaybe(N('AP'),L.PDFDict),oldRef=ap?.get(N('N')),old=oldRef?pdf.context.lookup(oldRef):null;
  const oldSource=old instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(old).decode()):old?.getUnencodedContents?.();
  const previous=typeof oldSource==='string'?oldSource:oldSource?new TextDecoder().decode(oldSource):'';
  if(previous!==commands){
    const next=pdf.context.flateStream(commands,{Type:'XObject',Subtype:'Form',FormType:1,BBox:[0,0,r.width,r.height],Resources:{Font:{[alias]:fontRef}}});
    if(oldRef instanceof L.PDFRef)pdf.context.assign(oldRef,next);
    else widget.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(next)}));
    changed=true;
  }
  form.markFieldAsClean(display.ref);
  return changed;
}

// PDF.js gives read-only fields their own AP canvas. Expose the same existing
// input for immediate updates and hide only that input's AP canvas, so there
// is exactly one visible number. The document's print/save AP stays native.
export function refreshReaderCamionDisplayV2741({surface,document:pdfDocument,fields,typography}){
  const {marker,field:name,source}=camionDisplayV2741,defs=definitions(fields,name);
  if(!pdfDocument||!defs.length||defs.some(d=>d.editable!==false))return false;
  const inputs=Array.from(surface.querySelectorAll(`input[name="${name}"]`)).filter(input=>input.closest('.textWidgetAnnotation')?.title===marker);
  if(!inputs.length)return false;
  const driver=surface.querySelector(`[name="${source}"]`),sourceDef=definitions(fields,source)[0];if(!sourceDef)return false;
  const storage=pdfDocument.annotationStorage,sourceState=sourceDef.id?storage.getValue(sourceDef.id,sourceDef):sourceDef;
  const value=asText(driver?driver.value:sourceState?.value??sourceDef.value??sourceDef.defaultValue);
  for(const def of defs)if(def.id){
    const old=storage.getValue(def.id,def);
    if(asText(old?.value)!==value||old?.formattedValue!==undefined&&old.formattedValue!==value)storage.setValue(def.id,{value,formattedValue:value});
  }
  for(const input of inputs){
    if(input.value!==value)input.value=value;
    const section=input.closest('.textWidgetAnnotation');
    const style=input.style,red=style.getPropertyValue('color')||'rgb(255, 0, 0)';
    for(const [key,v]of Object.entries({display:'block',color:red,'-webkit-text-fill-color':red,'pointer-events':'none','text-align':'center','caret-color':'transparent'}))style.setProperty(key,v,'important');
    section.style.setProperty('pointer-events','none','important');
    for(const canvas of section.querySelectorAll('canvas.annotationContent'))canvas.style.setProperty('display','none','important');
    // NimbusSans/Arial digits have equal widths. Preserve the authored size,
    // fitting only unusually long numeric values within this indicator.
    const base=typography?.get(name),rect=defs[0].rect;
    if(base>0&&Array.isArray(rect)){
      const units=Array.from(value,c=>/[\s.,]/.test(c) ? .278 : /[+-]/.test(c) ? .584 : .556).reduce((sum,w)=>sum+w,0);
      const size=units?Math.min(base,Math.max(.1,Math.abs(rect[2]-rect[0])-.4)/units):base;
      style.setProperty('font-size',`calc(${number(size)}px * var(--total-scale-factor))`,'important');
    }
  }
  centerFieldsGlyphs(inputs);
  return true;
}
