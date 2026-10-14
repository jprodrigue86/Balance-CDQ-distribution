import {normalizeResultGeometryV2743} from './reader-result-geometry-v2743.mjs';
import {APPROVED_REPORTS_V2735,approvedReportFamilyV2735,approvedReportMetadataFamilyV2735} from './reader-approved-reports-v2735.mjs';

// Each current master already draws its final cyan result cell at the actual
// widget rectangle. Update the owning appearance, never add a page overlay or
// change geometry. Empty/hidden multi-head indicators retain their flags/state.
const rowResult=/^charge_point_\d+_conforme_(vert|rouge)(?:_2)?$/;
const choiceNames=new Set(['client_technicien','unite_mesure']);
const number=value=>String(+value.toFixed(6));
const decode=(stream,L)=>new TextDecoder().decode(stream instanceof L.PDFRawStream?L.decodePDFRawStream(stream).decode():stream.getUnencodedContents());

// PDF.js does not expose this canonical, non-widget calculation state field in
// getFieldObjects(): it has neither /Subtype /Widget nor /Kids. Presentation
// may recognize the remaining exact 126-field Precision schema. The saved PDF
// still retains all 127 fields and its strict approved-master identity check.
export function reportVisualFamilyV2736(fields){
  const family=approvedReportMetadataFamilyV2735(fields);if(family)return family;
  const names=(fields instanceof Map?[...fields.keys()]:Object.keys(fields||{})).sort();
  const expected=APPROVED_REPORTS_V2735.precision.fields.filter(name=>name!=='_cdq_precision12_last_focus');
  return names.length===expected.length&&names.every((name,index)=>name===expected[index])?'precision':null;
}

export function reportChoiceInkV2736(value,size){
  // The approved native Helvetica/Arial faces share these cap/descender bounds.
  // Include accented capitals conservatively while keeping the full g/y tail.
  return {ascent:size*(/[À-ÖØ-Þ]/.test(String(value))?.93:.718),descent:/[gjpqy]/.test(String(value))?size*.207:0};
}

export function normalizeReportVisualV2736(pdf,L){
  const family=approvedReportFamilyV2735(pdf,L);if(!family)return false;
  const N=L.PDFName.of;let changed=false;
  for(const field of pdf.getForm().getFields()){
    const result=rowResult.exec(field.getName());
    if(!result&&!choiceNames.has(field.getName()))continue;
    const value=field.getSelected?.().map(selected=>{
      const item=field.acroField.getOptions().find(option=>option.value.decodeText()===selected);
      return item?.display?.decodeText()||selected;
    }).join(' + ')||field.getText?.()||'';
    for(const widget of field.acroField.getWidgets()){
      let rect;try{rect=widget.getRectangle();}catch{continue;}
      if(!(rect.width>0&&rect.height>0))continue;
      const ap=widget.dict.lookupMaybe(N('AP'),L.PDFDict);if(!ap)continue;
      const normal=ap.lookup(N('N'));
      if(result){
        // V2743: the centered native appearance below owns the result cell.
        continue;
        // V2763 already has user-approved, centered native Yes/Off appearances.
        // Preserve the 0.6pt inset instead of overwriting it with V27.36 fills.
        if(family==='multitete'&&pdf.catalog.has(N('CDQApprovedReportV2737')))continue;
        if(!(normal instanceof L.PDFDict))continue;
        const reference=normal.get(N('Yes')),old=normal.lookup(N('Yes'));if(!(old instanceof L.PDFRawStream)&&!old?.getUnencodedContents)continue;
        const source=decode(old,L),color=source.match(/([-+]?[\d.]+\s+[-+]?[\d.]+\s+[-+]?[\d.]+)\s+rg\b/)?.[1];if(!color)continue;
        const bounds=old.dict.lookupMaybe(N('BBox'),L.PDFArray)?.asArray().map(item=>item.asNumber());
        if(!bounds||bounds.length!==4||!(bounds[2]>bounds[0]&&bounds[3]>bounds[1]))continue;
        const body=`% CDQ full result cell V2736\nq ${color} rg ${bounds.map((item,index)=>number(index<2?item:item-bounds[index-2])).join(' ')} re f Q\n`;
        if(source===body)continue;
        const next=pdf.context.flateStream(body);
        for(const [key,item]of old.dict.entries())if(!['Length','Filter','DecodeParms'].includes(key.decodeText()))next.dict.set(key,item);
        // Preserve shared authored resources without retaining replaced streams.
        if(reference instanceof L.PDFRef)pdf.context.assign(reference,next);else normal.set(N('Yes'),pdf.context.register(next));changed=true;
      }else if(value&&((normal instanceof L.PDFRawStream)||normal?.getUnencodedContents)){
        const source=decode(normal,L),runs=source.match(/BT[\s\S]*?ET/g);if(runs?.length!==1)continue;
        const run=runs[0],font=/\/(\S+)\s+([-+]?[\d.]+)\s+Tf/.exec(run),positions=[...run.matchAll(/(?:1\s+0\s+0\s+1\s+)?([-+]?[\d.]+)\s+([-+]?[\d.]+)\s+(Tm|Td)\b/g)];
        if(!font||positions.length!==1||!(Number(font[2])>0))continue;
        let size=Number(font[2]),ink=reportChoiceInkV2736(value,size);
        const factor=Math.min(1,Math.max(.1,rect.height-.6)/(ink.ascent+ink.descent));
        size*=factor;ink=reportChoiceInkV2736(value,size);
        const baseline=(rect.height-ink.ascent+ink.descent)/2,position=positions[0];
        const nextRun=run.replace(font[0],`/${font[1]} ${number(size)} Tf`).replace(position[0],position[0].replace(/([-+]?[\d.]+)(\s+(?:Tm|Td))$/,number(baseline)+'$2'));
        if(nextRun===run)continue;
        const next=pdf.context.flateStream(source.replace(run,nextRun));
        for(const [key,item]of normal.dict.entries())if(!['Length','Filter','DecodeParms'].includes(key.decodeText()))next.dict.set(key,item);
        const reference=ap.get(N('N'));
        if(reference instanceof L.PDFRef)pdf.context.assign(reference,next);else ap.set(N('N'),pdf.context.register(next));changed=true;
      }
    }
  }
  changed=normalizeResultGeometryV2743(pdf,L,{family})||changed;
  if(!pdf.catalog.has(N('CDQReportVisualV2736'))){pdf.catalog.set(N('CDQReportVisualV2736'),pdf.context.obj({Revision:2736,Family:L.PDFString.of(family)}));changed=true;}
  return changed;
}

let canvasContext;
export function refreshReportVisualV2736({surface,fields}){
  if(!surface||!reportVisualFamilyV2736(fields))return;
  for(const input of surface.querySelectorAll('.buttonWidgetAnnotation.checkBox input')){
    if(!rowResult.test(input.name||''))continue;
    const section=input.closest('section'),badge=section?.querySelector('.cdq-result-indicator');if(!section)continue;
    section.dataset.cdqFrameV2736='native';
    if(badge){for(const [key,value]of Object.entries({left:'0%',top:'0%',width:'100%',height:'100%'}))if(badge.style[key]!==value)badge.style[key]=value;badge.dataset.cdqFrameV2736='native';}
  }
  const plans=[];
  for(const field of surface.querySelectorAll('button.cdq-choice-field')){
    if(!choiceNames.has(field.name))continue;
    const label=field.querySelector('.cdq-choice-value');if(!label)continue;
    const style=getComputedStyle(field),size=parseFloat(style.fontSize),rect=field.getBoundingClientRect();if(!(size>0&&rect.width>0&&rect.height>0))continue;
    canvasContext??=document.createElement('canvas').getContext('2d');if(!canvasContext)continue;
    const text=String(label.textContent||'200'),measure=s=>{canvasContext.font=`${style.fontWeight} ${s}px ${style.fontFamily}`;return canvasContext.measureText(text);};
    let metrics=measure(size),factor=Math.min(1,Math.max(1,rect.height-1)/Math.max(1,metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent),Math.max(1,rect.width-2)/Math.max(1,metrics.width));
    const effective=size*factor;if(factor<1)metrics=measure(effective);
    const ascent=metrics.fontBoundingBoxAscent??effective*.92,descent=metrics.fontBoundingBoxDescent??effective*.24;
    plans.push({field,label,size:effective,lineHeight:ascent+descent,shift:(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent-ascent+descent)/2});
  }
  for(const {field,label,size,lineHeight,shift}of plans){
    field.dataset.cdqGlyphsV2736='true';field.style.setProperty('font-size',size+'px','important');field.style.setProperty('overflow','hidden','important');
    label.style.lineHeight=lineHeight+'px';label.style.transform=`translateY(${shift}px)`;label.style.overflow='visible';
  }
}
