import {isCorrectionReadingV2736} from './reader-measurements-v2736.mjs';
import {cdqPlainProblemLabelV3,cdqFitTrialTextV4,cdqTrialTextSpecV4,cdqWinAnsiCodeV4} from './reader-choices-v2572.mjs';
function nativeTrialChoiceAppearanceV2(pdf,form,L,field,text){
  const N=L.PDFName.of,dr=form.acroForm.dict.lookupMaybe(N('DR'),L.PDFDict);
  const fonts=dr?.lookupMaybe(N('Font'),L.PDFDict),fontRef=fonts?.get(N('FRC'));
  const font=fontRef?pdf.context.lookup(fontRef,L.PDFDict):null;
  if(!font||font.lookup(N('Encoding'))?.toString()!=='/WinAnsiEncoding')return false;
  const first=font.lookup(N('FirstChar'),L.PDFNumber).asNumber(),widths=font.lookup(N('Widths'),L.PDFArray);
  const codes=value=>Array.from(value,cdqWinAnsiCodeV4);
  const valid=value=>codes(value).every(code=>code!==null&&code>=first&&code-first<widths.size());
  const textWidth=(value,size)=>codes(value).reduce((sum,code)=>sum+(code===null?500:widths.lookup(code-first,L.PDFNumber).asNumber()),0)*size/1000;
  if(!valid(String(text).replace(/[\r\n\t]/g,' ')))return false;
  const color=(array,stroke=false)=>{
    if(!(array instanceof L.PDFArray)||![1,3,4].includes(array.size()))return '';
    const values=Array.from({length:array.size()},(_,i)=>array.lookup(i,L.PDFNumber).asNumber());
    const op={1:'g',3:'rg',4:'k'}[values.length];return values.join(' ')+' '+(stroke?op.toUpperCase():op);
  };
  const spec=cdqTrialTextSpecV4(field.getName());
  for(const widget of field.acroField.getWidgets()){
    const {width:w,height:h}=widget.getRectangle();
    const da=(widget.dict.lookup(N('DA'))||field.acroField.dict.lookup(N('DA')))?.decodeText?.()||'';
    const nativeSize=(widget.dict.lookupMaybe(N('CDQAutoFitBaseSize'),L.PDFNumber)||field.acroField.dict.lookupMaybe(N('CDQAutoFitBaseSize'),L.PDFNumber))?.asNumber();
    const base=nativeSize||spec?.base||Number(/\/FRC\s+([\d.]+)\s+Tf/.exec(da)?.[1]);
    if(!(base>0))return false;
    const fit=cdqFitTrialTextV4(text,w,h,base,!!spec?.multiline,textWidth),size=fit.size;
    const align=(widget.dict.lookup(N('Q'))||field.acroField.dict.lookup(N('Q')))?.asNumber?.()??0;
    const mk=widget.dict.lookupMaybe(N('MK'),L.PDFDict),bs=widget.dict.lookupMaybe(N('BS'),L.PDFDict);
    const fill=color(mk?.lookup(N('BG'))),stroke=color(mk?.lookup(N('BC')),true),border=bs?.lookup(N('W'))?.asNumber?.()??0;
    const commands=['/Tx BMC q'];
    if(fill)commands.push(fill+` 0 0 ${w} ${h} re f`);
    if(stroke&&border>0)commands.push(stroke+` ${border} w ${border/2} ${border/2} ${w-border} ${h-border} re S`);
    commands.push(`1 1 ${Math.max(0,w-2)} ${Math.max(0,h-2)} re W n`);
    const firstY=spec?.multiline?h-3-size*.83:(h-size)/2+size*.22;
    fit.lines.forEach((line,index)=>{
      const length=textWidth(line,size),x=align===1?(w-length)/2:align===2?w-3-length:3,y=firstY-index*size*1.19;
      const encoded='<'+codes(line).map(code=>code.toString(16).padStart(2,'0')).join('')+'>';
      commands.push('BT',`/FRC ${size.toFixed(3)} Tf 0 g`,`1 0 0 1 ${x.toFixed(3)} ${y.toFixed(3)} Tm ${encoded} Tj`,'ET');
    });
    commands.push('Q EMC');
    const stream=pdf.context.flateStream(commands.join('\n'),{
      Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:{Font:{FRC:fontRef}}
    });
    widget.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(stream)}));
    // Keep the authoring size independent of each currently fitted appearance.
    if(spec)widget.dict.set(N('DA'),L.PDFString.of(`/FRC ${base.toFixed(3)} Tf 0 g`));
  }
  return true;
}
function fitTrialTextAppearancesV4(pdf,form,L){
  const menu=form.getFieldMaybe('essai_cdq_probleme_constate');
  if(menu?.isMultiselect?.()!==true)return;
  for(const field of form.getFields()){
    if(!cdqTrialTextSpecV4(field.getName()))continue;
    let text;
    if(field.getName()==='essai_cdq_probleme_constate'){
      const options=field.acroField.getOptions();
      text=field.getSelected().map(value=>{const option=options.find(item=>item.value.decodeText()===value);return cdqPlainProblemLabelV3(option?.display?.decodeText()||value);}).join(' ; ')||'Aucun problème constaté';
    }else if(typeof field.getText==='function')text=field.getText()||'';
    else continue;
    nativeTrialChoiceAppearanceV2(pdf,form,L,field,text);
  }
}

function persistTrialProblemReadOnlyV2(form){
  const menu=form.getFieldMaybe('essai_cdq_probleme_constate');
  if(menu?.isMultiselect?.()!==true||typeof menu.getSelected!=='function')return;
  const selected=menu.getSelected().filter(value=>value&&value!=='aucun');
  const invalid=selected.length>0,unresolved=selected.some(value=>!value.endsWith('_corrige'));
  for(const field of form.getFields()){
    const name=field.getName();
    if(!isCorrectionReadingV2736(name))continue;
    const before=/_avant_correction(?:_2)?$|(?:^|_)excentricite_avant_|_AvantCorrection$/.test(name);
    const nativeHiddenLock=!name.startsWith('essai_cdq_')&&field.isReadOnly()&&field.acroField.getWidgets().every(widget=>(widget.getFlags()&(2|32))!==0);
    const blocked=nativeHiddenLock||invalid&&(before||unresolved);
    // PDF.js serializes the values but can omit runtime readonly changes.
    // Persist only this trial schema's measurement policy in native /Ff.
    if(blocked)field.enableReadOnly();else field.disableReadOnly();
  }
}


// Acrobat stores multiple choice values in /V and their corresponding
// ordered /Opt indices in /I. PDF.js retains /V but may leave a stale /I
// containing only the first item; its next render then shows one selected kit.
// Repair only this authored V34 multiselect, without changing any /V value.
function repairV34KitIndices(pdf,form,L){
  const kit=form.getFieldMaybe('essai_cdq_etalon_utilise');
  if(!kit?.isMultiselect?.()||typeof kit.getSelected!=='function')return;
  const selected=kit.getSelected();
  const options=kit.acroField.getOptions();
  const indices=selected.map(value=>options.findIndex(option=>option.value.decodeText()===value));
  if(indices.some(index=>index<0)||new Set(indices).size!==indices.length)throw Error('V34 kit choices do not match approved PDF options.');
  const ordered=[...indices].sort((a,b)=>a-b);
  kit.acroField.dict.set(L.PDFName.of('I'),pdf.context.obj(ordered));
}

export function nativeV34Form(form){return form.getFieldMaybe('essai_cdq_probleme_constate')?.isMultiselect?.()===true&&!!form.getFieldMaybe('essai_cdq__recalcul')&&!!form.getFieldMaybe('essai_cdq_client_nom');}
export function prepareV34Save(pdf,L){const form=pdf.getForm();if(form.getFieldMaybe('essai_cdq_probleme_constate')?.isMultiselect?.()!==true||!form.getFieldMaybe('essai_cdq__recalcul'))return false;persistTrialProblemReadOnlyV2(form);repairV34KitIndices(pdf,form,L);fitTrialTextAppearancesV4(pdf,form,L);form.acroForm.dict.set(L.PDFName.of('NeedAppearances'),pdf.context.obj(false));return nativeV34Form(form);}
