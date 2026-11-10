import {isCorrectionReadingV2736} from './reader-measurements-v2736.mjs';

// PDF.js sends a programmatic Field.value update without formattedValue.
// AnnotationStorage merges it with the preceding numeric display; repairing
// this display pair preserves the PDF's own raw value and problem policy.
export function measurementDisplayV2871(name,state){
  if(!isCorrectionReadingV2736(name))return state;
  const raw=String(state.value??'');
  if(raw==='N/É'&&state.formattedValue!=='N/É')return {...state,formattedValue:'N/É'};
  if(raw!=='N/É'&&state.formattedValue==='N/É')return {...state,formattedValue:null};
  return state;
}

export function problemLocksV2871(values){
  const selected=Array.from(values||[],String).filter(value=>value&&value!=='aucun');
  const blocking=selected.some(value=>value.replace(/_corrige$/,'')!=='niveau');
  return {avant:blocking,apres:blocking&&selected.some(value=>!value.endsWith('_corrige'))};
}
