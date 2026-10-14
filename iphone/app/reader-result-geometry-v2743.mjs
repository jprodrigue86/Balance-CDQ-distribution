import {approvedReportFamilyV2735} from './reader-approved-reports-v2735.mjs';
import {restoreBlankConclusionV2738} from './reader-results-v2648.mjs';

// Trial V27.43. The cyan cell and the native checkbox own the result artwork.
// Its existing rectangle, value, flags and calculation actions are untouched.
const RESULT=/^charge_point_\d+_conforme_(vert|rouge)(?:_2)?$/;
const TOLERANCE=/^(?:charge_point_\d+_tolerance(?:_2)?|tolerance_excentricite)$/;
const FAMILIES=new Set(['plancher','precision','table','chariot','convoyeur','cuve4','tremie4','suspendue','trackscale','camion','train','multitete']);
const number=value=>String(+value.toFixed(7));
const decode=(stream,L)=>Array.from(stream instanceof L.PDFRawStream?L.decodePDFRawStream(stream).decode():stream.getUnencodedContents(),c=>String.fromCharCode(c)).join('');
const read=(object,L)=>object instanceof L.PDFRawStream?decode(object,L):object?.decodeText?.()||'';
function replacement(pdf,L,old,source){
 const next=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0)));
 for(const [key,value] of old.dict.entries())if(!['Length','Filter','DecodeParms'].includes(key.decodeText()))next.dict.set(key,value);
 return next;
}

// The revised Multi-têtes still contained one obsolete static blue conclusion
// frame and two pending labels behind its native red/green checkbox. Remove
// the original owning paint operations; no white cover or new page layer.
export function removeMultiHeadConclusionUnderlayV2743(pdf,L){
 const N=L.PDFName.of;
 const pattern=/(?:\.94|0\.94)\s+(?:\.985|0\.985)\s+1\s+rg\s+(?:\.04|0\.04)\s+(?:\.35|0\.35)\s+(?:\.73|0\.73)\s+RG\s+1\.2\s+w\s+n\s+431\.8913\s+18\.79999\s+m[\s\S]*?\bh\s+B\*\s+q\s+1 0 0 1 513\.0574 53\.79999 cm[\s\S]*?\bET\s+Q\s+q\s+1 0 0 1 513\.0574 39\.79999 cm[\s\S]*?\bET\s+Q/g;
 let removed=0;
 for(const [reference,object] of pdf.context.enumerateIndirectObjects()){
  if(!(object instanceof L.PDFRawStream)||object.dict.get(N('Subtype'))!==N('Form'))continue;
  const source=decode(object,L),matches=[...source.matchAll(pattern)];
  if(!matches.length)continue;
  if(matches.length!==1||removed)throw Error('Multiple obsolete Multi-têtes conclusion owners');
  const matched=matches[0][0];
  if(!matched.includes('603.2235 76.79999 l')||!matched.includes('(14 t'))throw Error('Unknown obsolete Multi-têtes conclusion artwork');
  pdf.context.assign(reference,replacement(pdf,L,object,source.replace(pattern,'')));removed++;
 }
 return removed;
}

export function normalizeResultGeometryV2743(pdf,L,{family=approvedReportFamilyV2735(pdf,L)}={}){
 if(!FAMILIES.has(family))return false;
 const N=L.PDFName.of,form=pdf.getForm();let changed=false;
 if(family==='multitete')changed=!!removeMultiHeadConclusionUnderlayV2743(pdf,L);
 for(const field of form.getFields()){
  const result=RESULT.exec(field.getName());
  if(result)for(const widget of field.acroField.getWidgets()){
   // Revised Multi-têtes keeps four retired legacy indicators hidden as part
   // of its canonical schema. They do not own any visible cyan cell.
   if(widget.dict.lookupMaybe(N('F'),L.PDFNumber)?.asNumber()&2)continue;
   const normal=widget.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookupMaybe(N('N'),L.PDFDict);
   const old=normal?.lookup(N('Yes'));
   if(!(old instanceof L.PDFRawStream)&&!old?.getUnencodedContents)throw Error('Missing native result appearance: '+field.getName());
   const source=decode(old,L),color=source.match(/([-+]?[\d.]+\s+[-+]?[\d.]+\s+[-+]?[\d.]+)\s+rg\b/)?.[1];
   const bounds=old.dict.lookupMaybe(N('BBox'),L.PDFArray)?.asArray().map(x=>x.asNumber());
   if(!color||!bounds||bounds.length!==4)throw Error('Unrecognized result appearance: '+field.getName());
   const {width,height}=widget.getRectangle();
   if(!(width>1.2&&height>1.2&&bounds[2]>bounds[0]&&bounds[3]>bounds[1]))throw Error('Invalid native result bounds: '+field.getName());
   // Multi-têtes rows 8..14 retained the older 46×17.4 appearance bounds
   // inside the revised 21.5×14.6 cell. PDF viewers scaled its border inset.
   // The real widget cell, rather than those retired AP bounds, is canonical.
   const targetBounds=[0,0,width,height],sameBounds=bounds.every((value,index)=>Math.abs(value-targetBounds[index])<.0001);
   const inset=.6,body=`% CDQ centered native result V2743\nq ${color} rg .6 .6 ${number(width-2*inset)} ${number(height-2*inset)} re f Q\n`;
   const existing=source.match(/rg\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+re f/);
   const centered=existing&&existing.slice(1).map(Number).every((value,index)=>Math.abs(value-[.6,.6,width-1.2,height-1.2][index])<.0001);
   if(source.startsWith('% CDQ centered native result V2743')&&centered&&sameBounds)continue;
   const next=replacement(pdf,L,old,body),reference=normal.get(N('Yes'));
   next.dict.set(N('BBox'),pdf.context.obj(targetBounds));
   // Replace the actual owning stream. Keep Off and every field property.
   if(reference instanceof L.PDFRef)pdf.context.assign(reference,next);else normal.set(N('Yes'),pdf.context.register(next));
   const off=normal.lookup(N('Off'));
   if((off instanceof L.PDFRawStream||off?.getUnencodedContents)&&!sameBounds){
    const offSource=decode(off,L);if(offSource.trim()&&offSource.trim().split(/\s+/).some(token=>!['q','Q','cm'].includes(token)&&!/^[-+]?[\d.]+(?:e[-+]?\d+)?$/i.test(token)))throw Error('Nonempty native result Off appearance: '+family+'/'+field.getName());
    const nextOff=replacement(pdf,L,off,offSource);nextOff.dict.set(N('BBox'),pdf.context.obj(targetBounds));
    const offRef=normal.get(N('Off'));if(offRef instanceof L.PDFRef)pdf.context.assign(offRef,nextOff);else normal.set(N('Off'),pdf.context.register(nextOff));
   }
   changed=true;
  }
  if(family!=='multitete'&&TOLERANCE.test(field.getName())){
   const action=field.acroField.dict.lookupMaybe(N('AA'),L.PDFDict)?.lookupMaybe(N('F'),L.PDFDict),js=action?.lookup(N('JS'));
   if(!action||!js)continue;
   const before=read(js,L),after=before.replace(/(["'])±\s+\1/g,'$1±$1').replace(/(["'])\s+e\1/g,'$1e$1');
   if(after!==before){action.set(N('JS'),js instanceof L.PDFString?L.PDFString.of(after):L.PDFHexString.fromText(after));changed=true;}
  }
 }
 const marker=pdf.catalog.lookupMaybe(N('CDQResultGeometryV2743'),L.PDFDict);
 if(marker?.lookupMaybe(N('Revision'),L.PDFNumber)?.asNumber()!==2743){
  pdf.catalog.set(N('CDQResultGeometryV2743'),pdf.context.obj({Revision:2743,Family:L.PDFString.of(family),Inset:.6}));changed=true;
 }
 return changed;
}

// PDF.js already maintains checked/unchecked native appearance canvases for
// each widget, including the additional Multi-têtes header widgets. Remove
// the legacy DOM fill so the same centered native artwork owns every render.
// A Multi-têtes checkbox now has a header and a conclusion widget. PDF.js may
// insert the header first in the DOM; recover only the actual bottom artwork.
export function restoreBlankResultConclusionV2743(surface){
 if(!surface)return false;
 const inputs=[...surface.querySelectorAll('.buttonWidgetAnnotation.checkBox input')];
 const greens=inputs.filter(input=>input.name==='Bouton_Conforme');
 if(greens.length<=1)return restoreBlankConclusionV2738(surface);
 const position=input=>{
  const section=input.closest('section');
  const authored=parseFloat(section?.style.top);
  if(Number.isFinite(authored))return authored;
  const rect=section?.getBoundingClientRect();return rect?rect.top+rect.height/2:-Infinity;
 };
 const bottom=name=>inputs.filter(input=>input.name===name).reduce((best,input)=>!best||position(input)>position(best)?input:best,null);
 const green=bottom('Bouton_Conforme'),red=bottom('Bouton_NonConforme');
 if(!green||!red||green.checked||red.checked)return false;
 const hasReading=[...surface.querySelectorAll('input,textarea')].some(input=>
  /^(?:charge_point_\d+_(?:avant|apres)_correction(?:_2)?|excentricite_(?:avant|apres)_.+|B4_.+_(?:Avant|Apres)Correction)$/.test(input.name||'')&&
  !!String(input.value??'').replace(/[\s\u00a0\u202f]/g,''));
 if(hasReading)return false;
 green.checked=true;return true;
}

export function refreshResultGeometryV2743(surface){
 if(!surface)return;
 for(const input of surface.querySelectorAll('.buttonWidgetAnnotation.checkBox input')){
  if(!RESULT.test(input.name||''))continue;
  const section=input.closest('section');if(!section)continue;
  section.classList.remove('cdq-result-widget');
  section.querySelector('.cdq-result-indicator')?.remove();
  delete section.dataset.cdqFrameV2736;
  section.dataset.cdqNativeResultV2743='true';
 }
 // Red takes visual precedence if a viewer briefly dispatches the two native
 // checkbox updates separately. No values or annotation storage are changed.
 const conclusions=[...surface.querySelectorAll('.buttonWidgetAnnotation.checkBox input')].filter(x=>/^Bouton_(Conforme|NonConforme)$/.test(x.name||''));
 const bad=conclusions.filter(x=>x.name==='Bouton_NonConforme');
 for(const input of conclusions){
  const section=input.closest('section');if(!section)continue;
  const rect=section.getBoundingClientRect();
  const red=bad.some(x=>{const other=x.closest('section')?.getBoundingClientRect();return x.checked&&other&&Math.abs(other.left-rect.left)<.5&&Math.abs(other.top-rect.top)<.5&&Math.abs(other.width-rect.width)<.5&&Math.abs(other.height-rect.height)<.5;});
  section.dataset.cdqConclusionSuppressedV2743=String(input.name==='Bouton_Conforme'&&red);
 }
}
