import {findCalibration} from './calibration-db-v2565.mjs';

function defs(fields,name){
  const raw=fields instanceof Map?fields.get(name):fields?.[name];
  return raw?Array.isArray(raw)?raw:[raw]:[];
}
function storedValue(doc,definition){
  if(!definition)return '';
  try{
    const stored=definition.id?doc.annotationStorage.getValue(definition.id,definition):definition;
    return String(stored?.value??definition.value??definition.defaultValue??'').trim();
  }catch(_){return String(definition.value??definition.defaultValue??'').trim();}
}
function fieldValue(surface,doc,fields,name){
  const live=surface?.querySelector?.('[name="'+CSS.escape(name)+'"]');
  if(live)return String(live.value||'').trim();
  for(const d of defs(fields,name)){const value=storedValue(doc,d);if(value)return value;}
  return '';
}
function icon(){
  return '<svg viewBox="0 0 32 32" width="25" height="25" aria-hidden="true"><rect x="3" y="4" width="26" height="23" rx="3.5" fill="#8aa2af" stroke="#d8edf7"/><rect x="6.5" y="7.5" width="19" height="8" rx="1.3" fill="#06180f" stroke="#76e9ad"/><path d="M9 11.5h4m2 0h3m2 0h3" stroke="#a4ffd0" stroke-width="1.2"/><circle cx="9" cy="21.5" r="2" fill="#e2eaee"/><circle cx="16" cy="21.5" r="2" fill="#e2eaee"/><circle cx="23" cy="21.5" r="2" fill="#e2eaee"/></svg>';
}
export function installReaderCalibration({surface,doc,fields,tell}){
  const header=document.querySelector('header');if(!header)return {refresh(){}};
  let button=document.getElementById('calibrationHelp');
  if(!button){
    button=document.createElement('button');button.id='calibrationHelp';button.type='button';button.hidden=true;
    button.setAttribute('aria-label','Ouvrir la méthode de calibration');button.title='Méthode de calibration';button.innerHTML=icon();
    const menu=document.getElementById('menu');header.insertBefore(button,menu||null);
  }
  let active=null;
  function context(){
    const first=(names)=>names.map(n=>fieldValue(surface,doc,fields,n)).find(v=>v&&!/^(?:-|n\/a|s\/o|aucun)$/i.test(v))||'';
    const indicatorModel=first(['indicateur_modele']);
    const model=indicatorModel||first(['base_balance_modele','balance_modele']);
    const manufacturer=indicatorModel?first(['indicateur_fabricant']):first(['base_balance_fabricant','balance_fabricant']);
    const device=findCalibration(manufacturer,model);
    return device?{manufacturer:device.manufacturer,model:device.model}:null;
  }
  function refresh(){
    active=context();button.hidden=!active;
    if(active){button.title='Méthode de calibration — '+active.manufacturer+' '+active.model;button.setAttribute('aria-label',button.title);}
  }
  button.onclick=()=>{refresh();if(active)tell({type:'CDQ_CALIBRATION_OPEN_V2565',manufacturer:active.manufacturer,model:active.model});};
  refresh();
  return {refresh};
}
