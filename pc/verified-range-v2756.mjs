// Use integer tenths so eligibility never depends on floating point rounding.
export function verifiedRangePointsV2756(value, names, {family='',unit=''}={}) {
  const fields = new Set(names);
  if (family==='precision'||fields.has('type_plateau')||fields.has('_cdq_precision12_last_focus')||[...fields].filter(n=>/^charge_point_\d+_charge_utilisee(?:_2)?$/.test(n)).length!==6 ||
      !Array.from({length:6},(_,i)=>`charge_point_${i+1}_charge_utilisee`).every(n=>fields.has(n))) return null;
  const raw = String(value ?? '').trim().replace(/[\u00a0\u202f]/g,' ');
  const match = raw.match(/^((?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d+)?)\s*(kg|kgs?|kilogrammes?|kilos?|g|gr|grammes?|lb|lbs|livres?|oz|onces?|mg|t|tonnes?)?$/i);
  if (!match) return null;
  const number = match[1].replace(/ /g,'').replace(',','.');
  const [integer, fraction=''] = number.split('.');
  // Extra trailing zeroes are harmless; meaningful hundredths are manual.
  if (fraction.slice(1).replace(/0/g,'')) return null;
  const tenths = Number(integer)*10 + Number((fraction+'0')[0]);
  if (!Number.isSafeInteger(tenths) || tenths<=0) return null;
  if(tenths%6!==0){
    const kg=v=>/^(?:kg|kgs|kilogrammes?|kilos?)$/i.test(String(v||'').trim());
    const explicit=match[2];
    return tenths===2000&&(explicit?kg(explicit)&&(!unit||kg(unit)):kg(unit))?['20','40','80','120','160','200']:null;
  }
  const step=tenths/6;
  return Array.from({length:6},(_,i)=>String(step*(i+1)/10));
}

export function installVerifiedRangeV2756({surface,names,enabled,read,write,changed,family=()=>'',isNew=()=>false}){
 const manual=new Set();let documentNames=null;
 const apply=event=>{
  if(!enabled())return;
  const currentNames=names();
  // A reader iframe can serve successive reports; the owner supplies identity.
  const identity=currentNames.identity||currentNames;
  if(identity!==documentNames){manual.clear();documentNames=identity;}
  const name=event.target?.name||'';
  if(/^charge_point_\d+_charge_utilisee(?:_2)?$/.test(name)){manual.add(name);return;}
  if(name!=='etendue_verifiee'||!isNew())return;
  const points=verifiedRangePointsV2756(event.target.value,currentNames,{family:family(),unit:read('unite_mesure')});
  if(!points)return;
  // Do not replace even one manually entered load or a previous report's data.
  const targets=points.map((_,i)=>`charge_point_${i+1}_charge_utilisee`);
  if(targets.some(name=>manual.has(name)||String(read(name)??'').trim()))return;
  targets.forEach((name,i)=>write(name,points[i]));changed();
 };
 surface.addEventListener('change',apply);
 return ()=>surface.removeEventListener('change',apply);
}
