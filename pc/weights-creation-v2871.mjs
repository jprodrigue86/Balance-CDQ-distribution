// New certificates choose their visible rows before their durable identity is created.
// Existing copies retain their own PDF and their saved dates.
import {weightsToday} from './reader-weights-v2871.mjs';

export function weightRowsV2871(value=14){
  const count=Number(value);
  if(!Number.isInteger(count)||count<1||count>14)throw Error('Choisissez entre 1 et 14 poids.');
  return count;
}

export function weightsInitialValuesV2871(values,now=new Date()){
  const allowed=/^(client_(nom|telephone|technicien|adresse|ville|province|code_postal)|date_etalonnage)$/;
  const result={};
  for(const [name,value] of Object.entries(values||{})){
    if(!allowed.test(name)||typeof value!=='string'||value.length>1000)return null;
    if(value.trim())result[name]=value;
  }
  if(!result.date_etalonnage)result.date_etalonnage=weightsToday(now);
  return result;
}

export function renderWeightsCountV2871({body,create}){
  const label=document.createElement('label');
  label.textContent='Nombre de poids à étalonner';
  label.style.cssText='display:block;font-weight:600;margin:12px 0';
  const select=document.createElement('select');
  select.dataset.cdqWeightRowsV2871='';
  select.style.cssText='display:block;width:100%;margin-top:12px;padding:14px;border:1px solid #7896a5;border-radius:9px;background:#193545;color:white;font:inherit';
  for(let count=1;count<=14;count++){
    const option=document.createElement('option');option.value=String(count);
    option.textContent=count+' poids';option.selected=count===14;select.append(option);
  }
  label.append(select);
  const button=document.createElement('button');button.type='button';
  button.className='cdq-report-choice-v2578';button.textContent='Créer le certificat';
  button.addEventListener('click',()=>create(weightRowsV2871(select.value)));
  body.replaceChildren(label,button);select.focus();
}
