// CDQ V22 isolated mobile entry for the scale division (echelon).
// No change to the PDF's tolerance formulas or to other field types.
export const ECHELON_FIELD_V22='essai_cdq_echelon';
export function isEchelonDraftV22(name,value){
 if(name!==ECHELON_FIELD_V22)return false;
 const raw=String(value??'').replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
 // While typing 0.5, "0", "0." and "0.0" are not valid
 // completed divisions. Do not dispatch a premature PDF.js calculation.
 return raw==='.'||raw==='+'||raw==='-'||/^\+?0+(?:\.0*)?$/.test(raw)||/^\+?\.0*$/.test(raw);
}
export function echelonErrorV22(name,value){
 if(name!==ECHELON_FIELD_V22)return '';
 const raw=String(value??'').replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
 if(raw==='')return ''; // as in the V21 native form
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)||!Number.isFinite(Number(raw))||Number(raw)<=0)
  return 'L’échelon doit être supérieur à zéro. Exemples : 0,5 ou 0.5.';
 return '';
}
