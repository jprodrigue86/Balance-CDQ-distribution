// Pure calculations: no account, network or customer data is needed.
export const KG_PER_LB=0.45359237;
export const massUnits=Object.freeze({kg:1,g:0.001,mg:0.000001,lb:KG_PER_LB,oz:KG_PER_LB/16,t:1000});
export function numberFR(value){
  const s=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))throw Error('Entrez une valeur numérique.');
  const n=Number(s);if(!Number.isFinite(n))throw Error('La valeur doit être finie.');return n;
}
export function convertMass(value,from,to){if(!(from in massUnits)||!(to in massUnits))throw Error('Unité inconnue.');return numberFR(value)*massUnits[from]/massUnits[to];}
export function divisions(capacity,increment,capacityUnit='kg',incrementUnit=capacityUnit){
  const c=convertMass(capacity,capacityUnit,'kg'),d=convertMass(increment,incrementUnit,'kg');
  if(c<=0||d<=0)throw Error('La capacité et l’échelon doivent être supérieurs à zéro.');
  const count=c/d,whole=Math.abs(count-Math.round(count))<Math.max(1,count)*1e-10;
  return {count:whole?Math.round(count):count,whole};
}
export function percentLoad(load,capacity){const c=numberFR(capacity);if(c<=0)throw Error('La capacité doit être supérieure à zéro.');return numberFR(load)/c*100;}
export function expectedSignal(sensitivity,excitation,load,capacity){const s=numberFR(sensitivity),v=numberFR(excitation);if(s<=0||v<=0)throw Error('La sensibilité et l’excitation doivent être supérieures à zéro.');return s*v*percentLoad(load,capacity)/100;}
export const bridgePairs=Object.freeze(['AB','AC','AD','BC','BD','CD']);
const complements={AB:'CD',AC:'BD',AD:'BC',BC:'AD',BD:'AC',CD:'AB'};
export function analyzeBridge(raw,{nominalInput='',nominalOutput='',tolerance=5}={}){
  const values={};for(const pair of bridgePairs){const s=String(raw[pair]??'').trim();if(!s)throw Error('Entrez les six mesures, ou OL pour un circuit ouvert.');values[pair]=/^(OL|INF|∞|OUVERT)$/i.test(s)?Infinity:numberFR(s);if(values[pair]<0)throw Error('Une résistance ne peut pas être négative.');}
  const open=bridgePairs.filter(p=>!Number.isFinite(values[p])),short=bridgePairs.filter(p=>values[p]<=1),warnings=[];
  if(open.length)warnings.push('Circuit ouvert ou contact absent : '+open.join(', ')+'. Vérifiez les fils et les connexions.');
  if(short.length)warnings.push('Résistance presque nulle : '+short.join(', ')+'. Vérifiez un court-circuit et la compensation des cordons.');
  if(open.length||short.length)return {values,open,short,warnings,identified:false,input:null,output:null,cross:[]};
  const ranked=bridgePairs.slice().sort((a,b)=>values[b]-values[a]),first=ranked[0],second=ranked[1];
  const cross=ranked.slice(2),average=cross.reduce((n,p)=>n+values[p],0)/4,spread=(Math.max(...cross.map(p=>values[p]))-Math.min(...cross.map(p=>values[p])))/average*100;
  const opposite=complements[first]===second,ratio=average/((values[first]+values[second])/2),distinct=(values[first]-values[second])/values[first]>0.02;
  const plausible=opposite&&ratio>=0.65&&ratio<=0.85&&spread<=10;
  if(!opposite)warnings.push('Les deux plus grandes mesures ne forment pas deux paires séparées : vérifiez le câblage et le certificat de la cellule.');
  if(spread>10)warnings.push('Les quatre mesures croisées sont déséquilibrées. Un défaut est possible; comparez avec les valeurs du fabricant.');
  if(ratio<0.65||ratio>0.85)warnings.push('Les mesures croisées ne correspondent pas au profil habituel d’un pont à quatre fils.');
  if(!distinct)warnings.push('Les résistances des deux paires sont trop proches pour distinguer l’excitation du signal.');
  const limits=numberFR(tolerance);if(limits<0||limits>100)throw Error('La tolérance doit être comprise entre 0 et 100 %.');
  const compare=(pair,nominal,label)=>{if(String(nominal).trim()==='')return;const n=numberFR(nominal);if(n<=0)throw Error('La résistance nominale doit être positive.');const delta=(values[pair]-n)/n*100;if(Math.abs(delta)>limits)warnings.push(label+' : écart de '+delta.toFixed(2)+' % par rapport au certificat.');};
  if(plausible&&distinct){compare(first,nominalInput,'Entrée probable');compare(second,nominalOutput,'Sortie probable');}
  return {values,open,short,warnings,identified:plausible&&distinct,input:plausible&&distinct?first:null,output:plausible&&distinct?second:null,possiblePairs:opposite?[first,second]:[],cross,spread,ratio};
}
