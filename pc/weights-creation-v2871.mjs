// New certificates choose their visible rows before their durable identity is created.
// Existing copies retain their own PDF and their saved dates.
import {weightsToday} from './reader-weights-v2871.mjs';
import {weightSelectionPrefillV2872} from './weights-catalog-v2872.mjs';
export {renderWeightsCountV2871} from './weights-creation-ui-v2872.mjs';

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

export function weightCreationValuesV2872(values,options={},now=new Date()){
  const identity=weightsInitialValuesV2871(values,now);
  if(!identity)throw Error('Les coordonnées du nouveau certificat sont invalides.');
  const count=weightRowsV2871(options.weightRowsV2871);
  return {...identity,...weightSelectionPrefillV2872(options.weightSelectionV2872,count)};
}
