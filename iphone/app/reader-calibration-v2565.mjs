import {findCalibration} from './calibration-db-v2565.mjs';
import {devicesFromPdfFields} from './calibration-scan-v2668.mjs';

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
export function installReaderCalibration({surface,doc,fields,tell}){
  const menu=document.getElementById('more');if(!menu)return {refresh(){},snapshot(){return [];}};
  let button=document.getElementById('calibrationHelp');
  if(!button){
    button=document.createElement('button');button.id='calibrationHelp';button.type='button';button.hidden=true;
    button.setAttribute('aria-label','Ouvrir la méthode de calibration');button.title='Méthode de calibration';button.textContent='Méthode de calibration';button.setAttribute('role','menuitem');
    menu.insertBefore(button,document.getElementById('cancelMenu'));
  }
  let active=null;
  function snapshot(){
    const values={};for(const name of ['indicateur_modele','indicateur_fabricant','indicateur_marque','base_balance_modele','balance_modele','base_balance_fabricant','balance_fabricant'])values[name]=fieldValue(surface,doc,fields,name);
    return devicesFromPdfFields(values,{});
  }
  function context(){
    const item=snapshot()[0];if(!item)return null;
    const device=findCalibration(item.manufacturer,item.model);
    return device?{manufacturer:device.manufacturer,model:device.model,category:device.category}:item;
  }
  function refresh(){
    active=context();button.hidden=!active;
    if(active){button.title='Méthode de calibration — '+active.manufacturer+' '+active.model;button.setAttribute('aria-label',button.title);}
  }
  button.onclick=()=>{refresh();if(!active)return;menu.hidden=true;document.getElementById('menu')?.setAttribute('aria-expanded','false');tell({type:'CDQ_CALIBRATION_OPEN_V2565',manufacturer:active.manufacturer,model:active.model,category:active.category});};
  refresh();
  return {refresh,snapshot};
}
