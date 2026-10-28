import {cdqPlainProblemLabelV3,cdqProblemCaptionV3} from './reader-choices-v2572.mjs';
import {normalizeMeasurementRulesV2736} from '../../reader-measurements-v2736.mjs';
import {compactApprovedFloorToleranceV2739} from '../../reader-floor-tolerance-v2739.mjs';
import {normalizeReportVisualV2736} from '../../reader-report-visual-v2736.mjs';
import {applyEquipmentHeaderGapV2736} from '../../reader-equipment-gap-v2736.mjs';
import {approvedReportFamilyV2735} from '../../reader-approved-reports-v2735.mjs';
import {normalizeCamionDisplayV2741} from '../../reader-camion-display-v2741.mjs';
import {normalizeTableColumnV2737} from '../../reader-table-column-v2737.mjs';
import {normalizeReportLayoutV2721} from '../../reader-report-layout-v2721.mjs';
import {approvedReportFamilyV2731} from '../../reader-approved-reports-v2731.mjs';
import {normalizeReportMicroV2725} from '../../reader-report-micro-v2725.mjs';
import {normalizeReportCorrectionsV2728} from '../../reader-report-corrections-v2728.mjs';
import {pruneInvisibleReportHeadingV2730} from '../../reader-heading-prune-v2730.mjs';
import {normalizeReportTypographyV2719} from '../../reader-report-typography-v2719.mjs';
import {normalizeReportMicroV2716} from '../../reader-report-micro-v2716.mjs';
import {normalizeReportLayoutV2713} from '../../reader-report-layout-v2713.mjs';
import {normalizeReportPresentationV2695} from '../../reader-report-presentation-v2695.mjs';
import {normalizePrecisionFontsV2700} from '../../reader-precision-fonts-v2700.mjs';
import {normalizeReportLayoutV2704} from '../../reader-report-layout-v2704.mjs';
import {normalizeDecimalPrecisionV2695} from '../../reader-decimals-v2695.mjs';
import {normalizeFloorStatusV2691} from '../../reader-floor-status-v2691.mjs';
import {normalizeCalculationsV2694} from '../../reader-calculations-v2694.mjs';
import {normalizePrecisionEquipmentV2691} from '../../reader-precision-equipment-v2691.mjs';
import {compactReportV2682,compactReportReadyV2682} from '../../pdf-compact-v2682.mjs';
import {normalizeVesselLayoutV2678} from '../../reader-vessel-layout-v2678.mjs';
import {normalizeReportLayoutV2677} from '../../reader-report-layout-v2677.mjs';
import {alignStatusAppearances} from '../../reader-status-v2656.mjs';
import {normalizePrecisionAppearanceV2665} from '../../reader-precision-appearance-v2665.mjs';
import {repairReportFormV2676} from '../../reader-report-repair-v2676.mjs';
// Preserve an editable AcroForm when CDQ saves a client master PDF.
// The client-facing copy may be flattened separately by the send workflow.
import {compactToleranceActions,centerSingleLineAppearances,textInkMetrics} from '../../reader-layout-v2653.mjs';
let library;
async function pdfLibrary(){
  if(globalThis.PDFLib)return globalThis.PDFLib;
  library??=import('../../vendor/pdf-lib-1.17.1.min.js').then(()=>globalThis.PDFLib);
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

// Only the exact approved V27.37 Multi-têtes may retain its own 230 native
// Calculate/Blur actions. The V27.36 normalizer must never rewrite them on
// open or save; other families keep the tested legacy safeguards.
function preserveNativeMultiHeadV2737(pdf,L,approved){
 if(approved!=='multitete')return false;
 const N=L.PDFName.of;
 const revision=pdf.catalog.lookupMaybe(N('CDQNativeMultiHeadV2763'),L.PDFNumber)?.asNumber();
 const numeric=pdf.catalog.lookupMaybe(N('CDQMultiHeadPdfjsNumericV2737'),L.PDFNumber)?.asNumber();
 if(revision!==2763||numeric!==2737||pdf.catalog.lookupMaybe(N('CDQMultiHeadSkipOverloadV2737'),L.PDFNumber)?.asNumber()!==2737||!pdf.catalog.has(N('CDQApprovedReportV2737')))return false;
 if(pdf.catalog.has(N('CDQMeasurementRulesV2736')))
  throw Error('Two Multi-têtes measurement engines detected; refusing to modify approved report');
 return true;
}

export async function normalizeEditableFormOnOpen(bytes,providedLibrary,onPrepared){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  const L=providedLibrary||await pdfLibrary();
  const {PDFDocument,PDFName}=L;
  const pdf=await PDFDocument.load(data,{updateMetadata:false});
  // Observe this exact repaired document before choosing original bytes or
  // serialization. Only a verified palette-restoration marker forces a save.
  const prepared=async changed=>{const observed=typeof onPrepared==='function'?await onPrepared(pdf):null;return changed||observed?.nativeWidgetPaletteRestoredV2755===true?pdf.save({updateFieldAppearances:false,useObjectStreams:true}):data;};
  const correctedFamilyV2736=approvedReportFamilyV2735(pdf,L);
  if(correctedFamilyV2736){
    const nativeMulti=preserveNativeMultiHeadV2737(pdf,L,correctedFamilyV2736);
    const changed=normalizeTableColumnV2737(pdf,L)|(!nativeMulti&&normalizeMeasurementRulesV2736(pdf,L,correctedFamilyV2736))|normalizeReportVisualV2736(pdf,L,correctedFamilyV2736)|applyEquipmentHeaderGapV2736(pdf,L,correctedFamilyV2736)|compactApprovedFloorToleranceV2739(pdf,L,correctedFamilyV2736);
    return prepared(changed);
  }
  if(approvedReportFamilyV2731(pdf,L))return prepared(false);
  const form=pdf.getForm();
  const floorChanged=normalizeFloorStatusV2691(pdf,L),precisionChanged=normalizePrecisionEquipmentV2691(pdf,L);
  const presentationChanged=await normalizeReportPresentationV2695(pdf,L);
  const decimalsChanged=normalizeDecimalPrecisionV2695(pdf,L);
  const calculationsChanged=normalizeCalculationsV2694(pdf,L);
  if(compactReportReadyV2682(pdf,L)){
    const fontsChanged=await normalizePrecisionFontsV2700(pdf,L);
    const layoutChanged=(await normalizeReportLayoutV2704(pdf,L))|(await normalizeReportLayoutV2713(pdf,L))|(await normalizeReportMicroV2716(pdf,L))|(await normalizeReportTypographyV2719(pdf,L))|(await normalizeReportLayoutV2721(pdf,L))|(await normalizeReportMicroV2725(pdf,L))|(await normalizeReportCorrectionsV2728(pdf,L));
    const headingChanged=pruneInvisibleReportHeadingV2730(pdf,L);
    return prepared(floorChanged||precisionChanged||calculationsChanged||decimalsChanged||presentationChanged||fontsChanged||layoutChanged||headingChanged);
  }
  normalizeReportLayoutV2677(pdf,L);
  const changed=normalizePrecisionAppearanceV2665(pdf,L)|repairReportFormV2676(pdf,L)|compactToleranceActions(pdf,L)|centerSingleLineAppearances(pdf,L)|await alignStatusAppearances(pdf,L);
  normalizeReportLayoutV2677(pdf,L);
  const vesselChanged=normalizeVesselLayoutV2678(pdf,L);
  const equipmentChanged=normalizePrecisionEquipmentV2691(pdf,L);
  const finalCalculationsChanged=normalizeCalculationsV2694(pdf,L);
  const finalPresentationChanged=await normalizeReportPresentationV2695(pdf,L);
  const fontsChanged=await normalizePrecisionFontsV2700(pdf,L);
  const layoutChanged=(await normalizeReportLayoutV2704(pdf,L))|(await normalizeReportLayoutV2713(pdf,L))|(await normalizeReportMicroV2716(pdf,L))|(await normalizeReportTypographyV2719(pdf,L))|(await normalizeReportLayoutV2721(pdf,L))|(await normalizeReportMicroV2725(pdf,L))|(await normalizeReportCorrectionsV2728(pdf,L));
  const headingChanged=pruneInvisibleReportHeadingV2730(pdf,L);
  if(!changed&&!vesselChanged&&!floorChanged&&!precisionChanged&&!equipmentChanged&&!calculationsChanged&&!finalCalculationsChanged&&!decimalsChanged&&!presentationChanged&&!finalPresentationChanged&&!fontsChanged&&!layoutChanged&&!headingChanged&&!rawNeedsAppearanceRepair(data))return prepared(false);
  form.acroForm.dict.set(PDFName.of('NeedAppearances'),pdf.context.obj(false));
  compactReportV2682(pdf,L);
  return prepared(true);
}

function nativeTrialChoiceAppearanceV2(pdf,form,L,field,text,problemLabels=null){
  const N=L.PDFName.of,dr=form.acroForm.dict.lookupMaybe(N('DR'),L.PDFDict);
  const fonts=dr?.lookupMaybe(N('Font'),L.PDFDict),fontRef=fonts?.get(N('FRC'));
  const font=fontRef?pdf.context.lookup(fontRef,L.PDFDict):null;
  if(!font||font.lookup(N('Encoding'))?.toString()!=='/WinAnsiEncoding')return false;
  const first=font.lookup(N('FirstChar'),L.PDFNumber).asNumber(),widths=font.lookup(N('Widths'),L.PDFArray);
  const textWidth=(value,size)=>Array.from(value,char=>char.codePointAt(0)).reduce((sum,code)=>sum+widths.lookup(code-first,L.PDFNumber).asNumber(),0)*size/1000;
  const color=(array,stroke=false)=>{
    if(!(array instanceof L.PDFArray)||![1,3,4].includes(array.size()))return '';
    const values=Array.from({length:array.size()},(_,i)=>array.lookup(i,L.PDFNumber).asNumber());
    const op={1:'g',3:'rg',4:'k'}[values.length];return values.join(' ')+' '+(stroke?op.toUpperCase():op);
  };
  for(const widget of field.acroField.getWidgets()){
    const {width:w,height:h}=widget.getRectangle();
    const da=(widget.dict.lookup(N('DA'))||field.acroField.dict.lookup(N('DA')))?.decodeText?.()||'';
    const match=/\/FRC\s+([\d.]+)\s+Tf/.exec(da);let size=Number(match?.[1]),label=text;
    if(!(size>0))return false;
    if(problemLabels){const caption=cdqProblemCaptionV3(problemLabels,w-6,size,textWidth);label=caption.text;size=caption.size;}
    const codes=Array.from(label,char=>char.codePointAt(0));
    if(codes.some(code=>code<32||code>255||(code>=128&&code<160)||code<first||code-first>=widths.size()))return false;
    const length=textWidth(label,size),encoded='<'+codes.map(code=>code.toString(16).padStart(2,'0')).join('')+'>';
    if(length>w-6+.005)return false;
    const align=(widget.dict.lookup(N('Q'))||field.acroField.dict.lookup(N('Q')))?.asNumber?.()??0;
    const x=align===1?(w-length)/2:align===2?w-3-length:3,y=(h-size)/2+size*.22;
    const mk=widget.dict.lookupMaybe(N('MK'),L.PDFDict),bs=widget.dict.lookupMaybe(N('BS'),L.PDFDict);
    const fill=color(mk?.lookup(N('BG'))),stroke=color(mk?.lookup(N('BC')),true);
    const border=bs?.lookup(N('W'))?.asNumber?.()??0;
    const commands=['/Tx BMC q'];
    if(fill)commands.push(fill+` 0 0 ${w} ${h} re f`);
    if(stroke&&border>0)commands.push(stroke+` ${border} w ${border/2} ${border/2} ${w-border} ${h-border} re S`);
    const paintDa=da.replace(match[0],'/FRC '+size.toFixed(3)+' Tf');
    commands.push(`1 1 ${Math.max(0,w-2)} ${Math.max(0,h-2)} re W n`, 'BT',paintDa,`1 0 0 1 ${x.toFixed(3)} ${y.toFixed(3)} Tm ${encoded} Tj`,'ET Q EMC');
    const stream=pdf.context.flateStream(commands.join('\n'),{
      Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:{Font:{FRC:fontRef}}
    });
    widget.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(stream)}));
  }
  return true;
}

function persistTrialProblemReadOnlyV2(form){
  const menu=form.getFieldMaybe('essai_cdq_probleme_constate');
  if(menu?.isMultiselect?.()!==true||typeof menu.getSelected!=='function')return;
  const selected=menu.getSelected().filter(value=>value&&value!=='aucun');
  const invalid=selected.length>0,unresolved=selected.some(value=>!value.endsWith('_corrige'));
  for(const field of form.getFields()){
    const match=/^essai_cdq_(?:charge_point_[1-6]_(avant|apres)_correction|excentricite_(avant|apres)_(?:arriere_gauche|arriere_droit|avant_gauche|avant_droit))$/.exec(field.getName());
    if(!match)continue;
    const blocked=invalid&&((match[1]||match[2])==='avant'||unresolved);
    // PDF.js serializes the values but can omit runtime readonly changes.
    // Persist only this trial schema's measurement policy in native /Ff.
    if(blocked)field.enableReadOnly();else field.disableReadOnly();
  }
}

export async function saveEditableFormAppearance(bytes,providedLibrary,onPrepared){
  const L=providedLibrary||await pdfLibrary();
  const {PDFDocument,PDFName,PDFArray,StandardFonts}=L;
  const pdf=await PDFDocument.load(bytes,{updateMetadata:false});
  const form=pdf.getForm();
  persistTrialProblemReadOnlyV2(form);
  // Extract save metadata from this already-loaded, repaired document. The
  // observer may restore only the authenticated native widget MK palette.
  const persist=async()=>{if(typeof onPrepared==='function')await onPrepared(pdf);return pdf.save({updateFieldAppearances:false,useObjectStreams:true});};
  // PDF.js saves a dynamically added technician as /V, but does not serialize
  // the dropdown's updated items into /Opt. Keep that exact saved value valid
  // for the next editable opening and other PDF viewers, without replacing the
  // existing options, ResetForm default, permissions or field actions.
  const technician=form.getFieldMaybe('client_technicien');
  if(typeof technician?.getSelected==='function'&&typeof technician?.getOptions==='function'&&typeof technician?.addOptions==='function'){
    const options=new Set(technician.acroField.getOptions().map(option=>option.value.decodeText())),missing=[];
    for(const value of technician.getSelected())if(typeof value==='string'&&value.length<=1000&&value.trim()&&!options.has(value)){missing.push(value);options.add(value);}
    if(missing.length)technician.addOptions(missing);
  }
  const correctedFamilyV2736=approvedReportFamilyV2735(pdf,L);
  if(correctedFamilyV2736){
    normalizeTableColumnV2737(pdf,L);
    if(!preserveNativeMultiHeadV2737(pdf,L,correctedFamilyV2736))
      normalizeMeasurementRulesV2736(pdf,L,correctedFamilyV2736);
    applyEquipmentHeaderGapV2736(pdf,L,correctedFamilyV2736);
    compactApprovedFloorToleranceV2739(pdf,L,correctedFamilyV2736);
    // PDF.js already saved this indicator's authored native appearance.
    // Normalize only a changed driver, preserving pristine master paint.
    const display=pdf.getForm().getFieldMaybe('_cdq_camion_indicateur_v2741');
    const driver=pdf.getForm().getFieldMaybe('charge_excentricite');
    if(display?.getText&&driver?.getText&&String(display.getText()||'')!==String(driver.getText()||''))normalizeCamionDisplayV2741(pdf,L);
    normalizeReportVisualV2736(pdf,L,correctedFamilyV2736);
    form.acroForm.dict.set(PDFName.of('NeedAppearances'),pdf.context.obj(false));
    return persist();
  }
  if(approvedReportFamilyV2731(pdf,L)){
    form.acroForm.dict.set(PDFName.of('NeedAppearances'),pdf.context.obj(false));
    return persist();
  }
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
  const trialMenu=form.getFieldMaybe('essai_cdq_probleme_constate');
  const nativeTrial=trialMenu?.isMultiselect?.()===true;
  let font=null;
  for(const field of dropdowns){
    const options=field.acroField.getOptions();
    const selected=field.getSelected();
    // The complete problem list has its own authored text field. Keep the
    // native multi-choice widget's one appearance readable after PDF.js saves.
    const compactProblems=field.getName()==='essai_cdq_probleme_constate'&&field.isMultiselect?.()===true;
    const problemLabels=compactProblems?selected.map(value=>{const option=options.find(o=>o.value.decodeText()===value);return cdqPlainProblemLabelV3(option?.display?.decodeText()||value);}):null;
    const text=compactProblems?problemLabels.join(' ; '):
      selected.map(value=>{const option=options.find(o=>o.value.decodeText()===value);return option?.display?.decodeText()||value;}).join(' + ');
    if(nativeTrial&&(compactProblems||field.getName()==='essai_cdq_frequence_etalonnage')){
      const widgets=field.acroField.getWidgets();
      const nativeFrequency=!compactProblems&&widgets.length>0&&widgets.every(widget=>{
        const normal=widget.dict.lookupMaybe(PDFName.of('AP'),L.PDFDict)?.lookup(PDFName.of('N'));
        return normal instanceof L.PDFRawStream&&normal.contents.length>0;
      });
      // PDF.js already preserves the frequency's native RC/cyan appearance.
      // The selected problem names need a compact, readable appearance.
      if(nativeFrequency||nativeTrialChoiceAppearanceV2(pdf,form,L,field,text,problemLabels))continue;
    }
    font??=await pdf.embedFont(StandardFonts.HelveticaBold);
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
  await normalizeReportTypographyV2719(pdf,L);
  await normalizeReportLayoutV2721(pdf,L);
  await normalizeReportMicroV2725(pdf,L);
  await normalizeReportCorrectionsV2728(pdf,L);
  pruneInvisibleReportHeadingV2730(pdf,L);
  return persist();
}

// Backward-compatible export used by older tests/modules.
export async function saveKitAppearance(bytes,providedLibrary){
  return saveEditableFormAppearance(bytes,providedLibrary);
}

