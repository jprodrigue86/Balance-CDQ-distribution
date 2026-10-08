import {normalizeReportMicroV2716} from './reader-report-micro-v2716.mjs';
import {normalizeReportLayoutV2713} from './reader-report-layout-v2713.mjs';
import {normalizeReportPresentationV2695} from './reader-report-presentation-v2695.mjs';
import {normalizePrecisionFontsV2700} from './reader-precision-fonts-v2700.mjs';
import {normalizeReportLayoutV2704} from './reader-report-layout-v2704.mjs';
import {normalizeDecimalPrecisionV2695} from './reader-decimals-v2695.mjs';
import {normalizeFloorStatusV2691} from './reader-floor-status-v2691.mjs';
import {normalizeCalculationsV2694} from './reader-calculations-v2694.mjs';
import {normalizePrecisionEquipmentV2691} from './reader-precision-equipment-v2691.mjs';
import {compactReportV2682,compactReportReadyV2682} from './pdf-compact-v2682.mjs';
import {normalizeVesselLayoutV2678} from './reader-vessel-layout-v2678.mjs';
import {normalizeReportLayoutV2677} from './reader-report-layout-v2677.mjs';
import {alignStatusAppearances} from './reader-status-v2656.mjs';
import {normalizePrecisionAppearanceV2665} from './reader-precision-appearance-v2665.mjs';
import {repairReportFormV2676} from './reader-report-repair-v2676.mjs';
// Preserve an editable AcroForm when CDQ saves a client master PDF.
// The client-facing copy may be flattened separately by the send workflow.
import {compactToleranceActions,centerSingleLineAppearances,textInkMetrics} from './reader-layout-v2653.mjs';
let library;
async function pdfLibrary(){
  if(globalThis.PDFLib)return globalThis.PDFLib;
  library??=import('./vendor/pdf-lib-1.17.1.min.js').then(()=>globalThis.PDFLib);
  return library;
}

function rawNeedsAppearanceRepair(bytes){
  // CDQ PDFs keep AcroForm in a normal (non-object-stream) dictionary. Avoid
  // loading pdf-lib at all for clean files so normal opens stay fast.
  const needle='/NeedAppearances true';
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  outer:for(let i=0;i<=data.length-needle.length;i++){
    for(let j=0;j<needle.length;j++)if(data[i+j]!==needle.charCodeAt(j))continue outer;
    return true;
  }
  return false;
}

export async function normalizeEditableFormOnOpen(bytes,providedLibrary){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  const L=providedLibrary||await pdfLibrary();
  const {PDFDocument,PDFName}=L;
  const pdf=await PDFDocument.load(data,{updateMetadata:false});
  const form=pdf.getForm();
  const floorChanged=normalizeFloorStatusV2691(pdf,L),precisionChanged=normalizePrecisionEquipmentV2691(pdf,L);
  const presentationChanged=await normalizeReportPresentationV2695(pdf,L);
  const decimalsChanged=normalizeDecimalPrecisionV2695(pdf,L);
  const calculationsChanged=normalizeCalculationsV2694(pdf,L);
  if(compactReportReadyV2682(pdf,L)){
    const fontsChanged=await normalizePrecisionFontsV2700(pdf,L);
    const layoutChanged=(await normalizeReportLayoutV2704(pdf,L))|(await normalizeReportLayoutV2713(pdf,L))|(await normalizeReportMicroV2716(pdf,L));
    return floorChanged||precisionChanged||calculationsChanged||decimalsChanged||presentationChanged||fontsChanged||layoutChanged?pdf.save({updateFieldAppearances:false,useObjectStreams:true}):data;
  }
  normalizeReportLayoutV2677(pdf,L);
  const changed=normalizePrecisionAppearanceV2665(pdf,L)|repairReportFormV2676(pdf,L)|compactToleranceActions(pdf,L)|centerSingleLineAppearances(pdf,L)|await alignStatusAppearances(pdf,L);
  normalizeReportLayoutV2677(pdf,L);
  const vesselChanged=normalizeVesselLayoutV2678(pdf,L);
  const equipmentChanged=normalizePrecisionEquipmentV2691(pdf,L);
  const finalCalculationsChanged=normalizeCalculationsV2694(pdf,L);
  const finalPresentationChanged=await normalizeReportPresentationV2695(pdf,L);
  const fontsChanged=await normalizePrecisionFontsV2700(pdf,L);
  const layoutChanged=(await normalizeReportLayoutV2704(pdf,L))|(await normalizeReportLayoutV2713(pdf,L))|(await normalizeReportMicroV2716(pdf,L));
  if(!changed&&!vesselChanged&&!floorChanged&&!precisionChanged&&!equipmentChanged&&!calculationsChanged&&!finalCalculationsChanged&&!decimalsChanged&&!presentationChanged&&!finalPresentationChanged&&!fontsChanged&&!layoutChanged&&!rawNeedsAppearanceRepair(data))return data;
  form.acroForm.dict.set(PDFName.of('NeedAppearances'),pdf.context.obj(false));
  compactReportV2682(pdf,L);
  return pdf.save({updateFieldAppearances:false,useObjectStreams:true});
}

export async function saveEditableFormAppearance(bytes,providedLibrary){
  const L=providedLibrary||await pdfLibrary();
  const {PDFDocument,PDFName,PDFArray,StandardFonts}=L;
  const pdf=await PDFDocument.load(bytes,{updateMetadata:false});
  const form=pdf.getForm();
  normalizeFloorStatusV2691(pdf,L);
  normalizeReportLayoutV2677(pdf,L);
  compactToleranceActions(pdf,L);
  normalizePrecisionAppearanceV2665(pdf,L);
  await alignStatusAppearances(pdf,L);

  // Older CDQ saves could leave NeedAppearances=true. Some viewers then paint
  // the saved appearance briefly and subsequently cover it with an empty form
  // control. Keep the actual field values and their saved AP streams authoritative.
  form.acroForm.dict.set(PDFName.of('NeedAppearances'),pdf.context.obj(false));

  // Older editable reports can still contain these display-only duplicate
  // widgets. Remove only the mirrors/tints; retain every actual data field.
  for(const field of [...form.getFields()])if(/^_cdq_(affichage_|v5_teinte)/.test(field.getName())){
    const order=form.acroForm.dict.lookupMaybe(PDFName.of('CO'),PDFArray);
    if(order)for(let i=order.size()-1;i>=0;i--)if(order.get(i).toString()===field.ref.toString())order.remove(i);
    form.removeField(field);
  }

  // A dropdown owns one text appearance. Earlier masters also contained
  // display-only mirror widgets, which produced two displaced copies on save.
  const dropdowns=form.getFields().filter(field=>typeof field.getSelected==='function');
  const font=dropdowns.length?await pdf.embedFont(StandardFonts.HelveticaBold):null;
  for(const field of dropdowns){
    const options=field.acroField.getOptions();
    const text=field.getSelected().map(value=>{const option=options.find(o=>o.value.decodeText()===value);return option?.display?.decodeText()||value;}).join(' + ');
    for(const widget of field.acroField.getWidgets()){
      let rect;try{rect=widget.getRectangle();}catch{continue;}
      const {width:w,height:h}=rect,available=w-2;
      const appearance=widget.dict.lookup(PDFName.of('DA'))||field.acroField.dict.lookup(PDFName.of('DA'));
      let size=Number(/\/\S+\s+([\d.]+)\s+Tf/.exec(appearance?.decodeText?.()||'')?.[1])||11.25,lines=[];
      function wrap(s){
        const result=[];let line='';
        for(const word of text.split(' ')){
          const candidate=line?line+' '+word:word;
          if(line&&font.widthOfTextAtSize(candidate,s)>available){result.push(line);line=word;}
          else line=candidate;
        }
        if(line)result.push(line);
        return result;
      }
      for(;size>3.5;size-=.25){lines=wrap(size);if(lines.length*size*1.15<=h-1&&lines.every(line=>font.widthOfTextAtSize(line,size)<=available))break;}
      lines=wrap(size);
      const commands=[`q 0 0 ${w} ${h} re W n BT /CDQChoice ${size} Tf 0 g`];
      const lineHeight=size*1.15,first=textInkMetrics(lines[0],size),last=textInkMetrics(lines.at(-1),size);
      const top=(h-first.ascent+last.descent-(lines.length-1)*lineHeight)/2+(lines.length-1)*lineHeight;
      lines.forEach((line,i)=>{
        const x=(w-font.widthOfTextAtSize(line,size))/2;
        commands.push(`1 0 0 1 ${Math.max(1,x)} ${top-i*lineHeight} Tm ${font.encodeText(line)} Tj`);
      });
      commands.push('ET Q');
      const stream=pdf.context.flateStream(commands.join('\n'),{
        Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:{Font:{CDQChoice:font.ref}}
      });
      widget.dict.set(PDFName.of('AP'),pdf.context.obj({N:pdf.context.register(stream)}));
    }
  }

  // Never flatten the client master. PDF.js has already serialized values and
  // appearances for edited fields; preserve those streams and every widget.
  centerSingleLineAppearances(pdf,L);
  repairReportFormV2676(pdf,L);
  normalizeReportLayoutV2677(pdf,L);
  normalizeVesselLayoutV2678(pdf,L);
  normalizePrecisionEquipmentV2691(pdf,L);
  normalizeCalculationsV2694(pdf,L);
  normalizeDecimalPrecisionV2695(pdf,L);
  await normalizeReportPresentationV2695(pdf,L);
  compactReportV2682(pdf,L);
  await normalizePrecisionFontsV2700(pdf,L);
  await normalizeReportLayoutV2704(pdf,L);
  await normalizeReportLayoutV2713(pdf,L);
  await normalizeReportMicroV2716(pdf,L);
  return pdf.save({updateFieldAppearances:false,useObjectStreams:true});
}

// Backward-compatible export used by older tests/modules.
export async function saveKitAppearance(bytes,providedLibrary){
  return saveEditableFormAppearance(bytes,providedLibrary);
}
