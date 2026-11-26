// Preserve the explicit uniform authored contract. Historical /FRC fields keep
// their original V34 fitting path; no field value, rectangle or action changes.
const authoredNamesV2935=new Set([
  'essai_cdq_probleme_constate','essai_cdq_commentaire','essai_cdq_precisions',
  'essai_cdq_problemes_detail','essai_cdq_resume_texte_central',
  'essai_cdq_resume_texte_ecc','essai_cdq_resume_texte_state'
]);
const uniformNameV2935=value=>String(value||'').replace(/^\//,'')==='FUniform';
const authoredSizeV2935=value=>Number.isFinite(Number(value))&&Number(value)>=.5&&Number(value)<=64;

export function authoredUniformPdfTextStyleV2935(pdf,form,L,field){
  if(!authoredNamesV2935.has(field.getName()))return null;
  const N=L.PDFName.of;
  if(pdf.catalog.lookupMaybe(N('CDQGeometryV2871'),L.PDFNumber)?.asNumber()!==2871||
     pdf.catalog.lookupMaybe(N('CDQVisualV2872'),L.PDFNumber)?.asNumber()!==2872)return null;
  const fonts=form.acroForm.dict.lookupMaybe(N('DR'),L.PDFDict)?.lookupMaybe(N('Font'),L.PDFDict);
  const fontRef=fonts?.get(N('FUniform')),font=fontRef?pdf.context.lookup(fontRef,L.PDFDict):null;
  if(!font||font.get(N('BaseFont'))?.toString()!=='/RobotoCondensed-Bold'||
     font.get(N('Subtype'))?.toString()!=='/TrueType'||
     font.get(N('Encoding'))?.toString()!=='/WinAnsiEncoding'||
     !font.lookupMaybe(N('Widths'),L.PDFArray)||!font.lookupMaybe(N('FirstChar'),L.PDFNumber))return null;
  let base=null;
  const widgets=field.acroField.getWidgets();
  if(!widgets.length)return null;
  for(const widget of widgets){
    const da=(widget.dict.lookupMaybe(N('DA'),L.PDFString)||field.acroField.dict.lookupMaybe(N('DA'),L.PDFString))?.decodeText()||'';
    const match=/^\s*\/FUniform\s+([\d.]+)\s+Tf\s+0\s+g\s*$/.exec(da);
    if(!match||!authoredSizeV2935(match[1])||(base!==null&&base!==Number(match[1])))return null;
    base=Number(match[1]);
  }
  return {fontName:'FUniform',fontRef,base,authoredUniform:true};
}

export function authoredUniformTrialTextSpecV2935(spec,fontName,fontSize){
  if(!spec||!uniformNameV2935(fontName)||!authoredSizeV2935(fontSize))return spec;
  return {...spec,base:Number(fontSize),authoredUniform:true,
    cssFontFamily:'CDQForm2918, sans-serif',cssFontWeight:'700'};
}
