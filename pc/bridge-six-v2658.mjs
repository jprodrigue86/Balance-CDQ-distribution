import {numberFR,analyzeBridge,bridgePairs} from './weighing-calculations-v2638.mjs';
export const sixWirePairs=Object.freeze(['AB','AC','AD','AE','AF','BC','BD','BE','BF','CD','CE','CF','DE','DF','EF']);
export function analyzeSixWireBridge(raw,{senseLimit=5,...options}={}){
 const values={};for(const p of sixWirePairs){const v=String(raw[p]??'').trim();if(!v)throw Error('Entrez les quinze mesures, ou OL pour un circuit ouvert.');values[p]=/^(OL|INF|∞|OUVERT)$/i.test(v)?Infinity:numberFR(v);if(values[p]<0)throw Error('Une résistance ne peut pas être négative.');}
 const threshold=numberFR(senseLimit);if(threshold<=0||threshold>100)throw Error('Le seuil de recherche Sense doit être entre 0 et 100 Ω.');
 const open=sixWirePairs.filter(p=>!Number.isFinite(values[p])),low=sixWirePairs.filter(p=>values[p]<=threshold),warnings=[];
 if(open.length)warnings.push('Mesure ouverte : '+open.join(', ')+'. Vérifiez les fils et les contacts.');
 if(low.length!==2||[...new Set(low.join(''))].length!==4)return {values,open,short:[],identified:false,sensePairs:[],warnings:[...warnings,'Deux paires indépendantes de faible résistance sont nécessaires pour repérer les liaisons excitation/Sense. Vérifiez le seuil, le câble et la fiche fabricant.']};
 const groups=[low[0],low[1],...'ABCDEF'.split('').filter(c=>!low.join('').includes(c))],collapsed={};
 const pair=(a,b)=>[a,b].sort().join('');
 for(const p of bridgePairs){const left=groups[p.charCodeAt(0)-65],right=groups[p.charCodeAt(1)-65],measures=[...left].flatMap(a=>[...right].map(b=>values[pair(a,b)]));
  collapsed[p]=measures.every(Number.isFinite)?measures.reduce((a,b)=>a+b,0)/measures.length:'OL';
  if(measures.every(Number.isFinite)){const average=Number(collapsed[p]);if(average>0&&(Math.max(...measures)-Math.min(...measures))/average*100>numberFR(options.tolerance??5))warnings.push('Mesures incohérentes entre '+left+' et '+right+' : vérifiez les contacts et les fils Sense.');}
 }
 const bridge=analyzeBridge(collapsed,{...options,nominalInput:'',nominalOutput:''});
 warnings.push(...bridge.warnings.filter(w=>!w.includes('trop proches pour distinguer')));
 for(const [pair,nominal,label] of [['AB',options.nominalInput,'Entrée'],['CD',options.nominalOutput,'Sortie']]){
  if(nominal==null||String(nominal).trim()==='')continue;const expected=numberFR(nominal);if(expected<=0)throw Error('La résistance nominale doit être positive.');
  const delta=(Number(collapsed[pair])-expected)/expected*100;if(Math.abs(delta)>numberFR(options.tolerance??5))warnings.push(label+' : écart de '+delta.toFixed(2)+' % par rapport au certificat.');
 }
 const coherent=!open.length&&!bridge.short.length&&bridge.possiblePairs?.includes('AB')&&bridge.ratio>=.65&&bridge.ratio<=.85&&bridge.spread<=10&&warnings.length===0;
 warnings.push('Dans chaque paire de faible résistance, la résistance seule ne distingue pas excitation et Sense, ni la polarité. Un court-circuit peut imiter cette liaison; confirmez le brochage avec la fiche fabricant.');
 const sensePairs=low.map(p=>({wires:p,ohms:values[p]}));
 return {...bridge,values,open:[...new Set([...open,...bridge.open])],sensePairs,groups,collapsed,warnings,identified:coherent,input:groups[0]+' / '+groups[1],output:groups[2]+' / '+groups[3]};
}
