// V27.39 — Compact only the seven native tolerance Format scripts in the
// approved Plancher report. No changes to fields, calculation, appearance,
// tolerances, decimal rules, graphic content, or the other 11 approved models.
const SOURCE='event.value="± "+String(t).replace(".",",")+" e";';
const TARGET='event.value="±"+String(t).replace(".",",")+"e";';
const FIELD=/^(?:charge_point_[1-6]_tolerance|tolerance_excentricite)$/;

export function compactApprovedFloorToleranceV2739(pdf,L,family){
 if(family!=='plancher')return false;
 const N=L.PDFName.of,form=pdf.getForm();
 const fields=form.getFields().filter(field=>FIELD.test(field.getName()));
 if(fields.length!==7)throw Error('Plancher tolerance schema changed: '+fields.length);
 let changed=0;
 for(const field of fields){
  const format=field.acroField.dict.lookupMaybe(N('AA'),L.PDFDict)?.lookupMaybe(N('F'),L.PDFDict);
  const obj=format?.lookup?.(N('JS'));
  const script=obj instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(obj).decode()):obj?.decodeText?.()||'';
  if(script.includes(TARGET)||/event\.value\s*=\s*["']±["']\s*\+/.test(script)&&/\+\s*["']e["']/.test(script))continue;
  if(!format||!script.includes(SOURCE))throw Error('Unrecognized Plancher format action: '+field.getName());
  format.set(N('JS'),L.PDFHexString.fromText(script.replace(SOURCE,TARGET)));
  changed++;
 }
 return changed>0;
}
