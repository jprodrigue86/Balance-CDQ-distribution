export function normalizeTechniciansV2767(raw){
 if(!raw||!Array.isArray(raw.names))return null;
 const clean=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,80):'';
 const names=[...new Set(raw.names.map(clean).filter(Boolean))].slice(0,300);
 const current=clean(raw.current);
 return {names,current:names.includes(current)?current:'',version:String(raw.version||'').slice(0,80)};
}
export function technicianFieldV2767(definition,context,{newReport=false,currentValue}={}){
 const value=String(currentValue??definition.value??definition.defaultValue??'');
 const normalized=normalizeTechniciansV2767(context);if(!normalized)return null;
 const next=value||newReport&&normalized.current||'';
 const names=[...normalized.names];if(next&&!names.includes(next))names.push(next);
 return {value:next,items:[{displayValue:'',exportValue:''},...names.map(name=>({displayValue:name,exportValue:name}))]};
}
