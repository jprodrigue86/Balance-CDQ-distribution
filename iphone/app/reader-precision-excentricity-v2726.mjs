// Repair only the display of Precision's existing calculated tolerance.
// Never derive a tolerance from readings or replace the PDF's calculation.
export function precisionToleranceDisplayV2726(name,state,isPrecision){
 if(!isPrecision||name!=='tolerance_excentricite')return state;
 const raw=String(state.value??'').trim(),formatted=state.formattedValue;
 if(raw===''&&typeof formatted==='string'&&/^\s*±?\d+(?:[.,]\d+)?e\s*$/.test(formatted))return {...state,formattedValue:''};
 if(formatted!==''||raw==='')return state;
 const numeric=Number(raw.replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));
 if(!Number.isFinite(numeric)||numeric<0)return state;
 return {...state,formattedValue:'±'+Math.abs(Math.round(numeric))+'e'};
}
