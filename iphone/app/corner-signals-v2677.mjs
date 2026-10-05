import {numberFR} from './weighing-calculations-v2638.mjs';
export const cornerNames=Object.freeze({frontLeft:'Avant gauche',frontRight:'Avant droit',rearLeft:'Arrière gauche',rearRight:'Arrière droit'});
export const wireColors=Object.freeze({A:'Rouge',B:'Noir',C:'Vert',D:'Blanc',E:'Bleu',F:'Jaune'});
export function wirePairLabel(pair){return String(pair).replace(/[A-F]+/g,group=>[...group].map(c=>wireColors[c]).join(' – '));}
export function compareCornerSignals(raw,reference='mean'){
 const values=Object.fromEntries(Object.keys(cornerNames).map(k=>[k,numberFR(raw[k])]));
 if(reference!=='mean'&&!(reference in cornerNames))throw Error('Choisissez une référence valide.');
 const all=Object.values(values),mean=all.reduce((a,b)=>a+b,0)/4,min=Math.min(...all),max=Math.max(...all),target=reference==='mean'?mean:values[reference];
 return {values,mean,min,max,range:max-min,reference,target,deltas:Object.fromEntries(Object.keys(values).map(k=>[k,values[k]-target]))};
}
