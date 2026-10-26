// Exact rational arithmetic: the increment is a constraint, never a rounding hint.
const gcd=(a,b)=>b?gcd(b,a%b):a;
const ratio=(n,d=1n)=>{const g=gcd(n,d);return {n:n/g,d:d/g};};
const mul=(a,b)=>ratio(a.n*b.n,a.d*b.d);
const div=(a,b)=>ratio(a.n*b.d,a.d*b.n);
const less=(a,b)=>a.n*b.d<b.n*a.d;
const aligned=(a,e)=>!e||(a.n*e.d)%(a.d*e.n)===0n;
function decimal(value){
  const s=String(value??'').trim().replace(/[\u00a0\u202f]/g,' ');
  if(!/^(?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d{1,12})?$/.test(s))return null;
  const [i,f='']=s.replace(/ /g,'').replace(',','.').split('.');
  if(i.length>15)return null;
  const r=ratio(BigInt(i+f),10n**BigInt(f.length));return r.n>0n?r:null;
}
function textNumber(r){
  let rem=r.n%r.d,s=String(r.n/r.d);if(!rem)return s;
  s+='.';for(let i=0;rem&&i<12;i++){rem*=10n;s+=String(rem/r.d);rem%=r.d;}
  return rem?null:s;
}
function massUnit(value){
  const s=String(value||'').trim().toLowerCase();
  if(/^(kg|kgs|kilogrammes?|kilos?)$/.test(s))return ratio(1000n);
  if(/^(g|gr|grammes?)$/.test(s))return ratio(1n);
  if(s==='mg')return ratio(1n,1000n);
  if(/^(t|tonnes?)$/.test(s))return ratio(1000000n);
  if(/^(lb|lbs|livres?)$/.test(s))return ratio(45359237n,100000n);
  if(/^(oz|onces?)$/.test(s))return ratio(45359237n,1600000n);
  return null;
}
export function verifiedRangePointsV2756(value,names,{family='',unit='',echelon=''}={}){
  const fields=new Set(names),loads=[...fields].filter(n=>/^charge_point_\d+_charge_utilisee(?:_2)?$/.test(n));
  const precision=family==='precision'||fields.has('type_plateau')||fields.has('_cdq_precision12_last_focus');
  const count=precision?7:6;
  if(loads.length!==count||!Array.from({length:count},(_,i)=>`charge_point_${i+1}_charge_utilisee`).every(n=>fields.has(n)))return null;
  const match=String(value??'').trim().match(/^([\d\s\u00a0\u202f.,]+?)\s*([a-zé]+)?$/i);
  if(!match)return null;
  let range=decimal(match[1]);if(!range)return null;
  const targetUnit=massUnit(unit),sourceUnit=match[2]?massUnit(match[2]):targetUnit;
  if(match[2]&&!sourceUnit||String(unit).trim()&&!targetUnit)return null;
  if(match[2]&&targetUnit)range=mul(range,div(sourceUnit,targetUnit));
  const reportUnit=targetUnit||sourceUnit;
  const e=String(echelon??'').trim()?decimal(echelon):null;
  if(String(echelon??'').trim()&&!e)return null;
  let points;
  if(precision){
    if(!reportUnit)return null;
    const quarter=div(range,ratio(4n));if(!aligned(quarter,e))return null;
    // Prefer 1 g, 10 g, 100 g. Shift decades only when range/increment requires it.
    const candidates=[];
    for(let exponent=-9;exponent<=12;exponent++){
      const grams=exponent<0?ratio(1n,10n**BigInt(-exponent)):ratio(10n**BigInt(exponent));
      const p=div(grams,reportUnit);
      if(less(p,quarter)&&aligned(p,e)&&textNumber(p)!==null)candidates.push({p,exponent});
    }
    if(candidates.length<3)return null;
    let start=candidates.findIndex(c=>c.exponent>=0);if(start<0)start=candidates.length-3;
    start=Math.min(start,candidates.length-3);
    points=[...candidates.slice(start,start+3).map(c=>c.p),...Array.from({length:4},(_,i)=>mul(quarter,ratio(BigInt(i+1))))];
  }else{
    const step=div(range,ratio(6n));
    if((step.n*10n)%step.d===0n)points=Array.from({length:6},(_,i)=>mul(step,ratio(BigInt(i+1))));
    else if(reportUnit?.n===1000n&&reportUnit.d===1n&&range.n===200n&&range.d===1n)points=[20n,40n,80n,120n,160n,200n].map(n=>ratio(n));
    else return null;
  }
  if(points.some(p=>!aligned(p,e)))return null;
  const values=points.map(textNumber);return values.includes(null)?null:values;
}

export function installVerifiedRangeV2756({surface,names,enabled,read,write,changed,family=()=>''}){
  let identity=null,eligible=false,writing=false;const owned=new Map(),manual=new Set();
  const loadName=/^charge_point_\d+_charge_utilisee(?:_2)?$/;
  const readingName=/^charge_point_\d+_(?:avant|apres)_correction(?:_2)?$/;
  const nonempty=v=>String(v??'').trim()!=='';
  function initialize(){
    const all=names(),next=all.identity||all;
    if(next!==identity){
      identity=next;owned.clear();manual.clear();
      // A saved/populated report never gains automatic ownership on reopening.
      eligible=!all.some(n=>(loadName.test(n)||readingName.test(n))&&nonempty(read(n)));
    }
    return all;
  }
  const focus=()=>{if(enabled())initialize();};
  const edit=event=>{
    if(writing||!enabled())return;
    initialize();const name=event.target?.name||'';
    if(loadName.test(name)){manual.add(name);owned.delete(name);}
  };
  const apply=event=>{
    if(writing||!enabled())return;
    const all=initialize(),name=event.target?.name||'';
    if(loadName.test(name)){edit(event);return;}
    if(!eligible||!['etendue_verifiee','echelon','unite_mesure','capacite_maximale'].includes(name))return;
    const current=n=>n===name?event.target.value:read(n);
    let points=verifiedRangePointsV2756(current('etendue_verifiee'),all,{family:family(),unit:current('unite_mesure'),echelon:current('echelon')});
    // Precision's existing PDF validation requires capacity before accepting rows
    // 1–4. Wait for it rather than bypassing that validation or losing ownership
    // when the sandbox rejects a premature proposal.
    if(points?.length===7){
      const capacity=decimal(current('capacite_maximale'));
      if(!capacity||less(capacity,decimal(points[6])))points=null;
    }
    let mutated=false;writing=true;
    try{for(const field of all.filter(n=>loadName.test(n))){
      if(manual.has(field))continue;
      const previous=String(read(field)??'');
      if(owned.has(field)&&previous!==owned.get(field)){manual.add(field);owned.delete(field);continue;}
      if(!owned.has(field)&&nonempty(previous))continue;
      const stem=field.replace('charge_utilisee','');
      if(['avant_correction','apres_correction'].some(s=>nonempty(read(stem+s)))){owned.delete(field);manual.add(field);continue;}
      const value=points?.[Number(field.match(/^charge_point_(\d+)/)[1])-1]??'';
      if(!points&&!owned.has(field))continue;
      owned.set(field,value);
      if(previous!==value){write(field,value);mutated=true;}
    }}finally{writing=false;}
    if(mutated)changed();
  };
  // PDF.js can acknowledge a live numeric commit before blur, suppressing the
  // browser's change event. Focusout also covers that committed-field path.
  const blur=event=>{if(['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)&&!loadName.test(event.target?.name||''))apply(event);};
  surface.addEventListener('focusin',focus);surface.addEventListener('input',edit);surface.addEventListener('change',apply);surface.addEventListener('focusout',blur);
  return ()=>{surface.removeEventListener('focusin',focus);surface.removeEventListener('input',edit);surface.removeEventListener('change',apply);surface.removeEventListener('focusout',blur);};
}
