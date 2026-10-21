// Use integer tenths so eligibility never depends on floating point rounding.
export function verifiedRangePointsV2756(value, names) {
  const fields = new Set(names);
  if (fields.has('charge_point_7_charge_utilisee') ||
      !Array.from({length:6},(_,i)=>`charge_point_${i+1}_charge_utilisee`).every(n=>fields.has(n))) return null;
  const raw = String(value ?? '').trim().replace(/[\u00a0\u202f]/g,' ');
  const match = raw.match(/^((?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d+)?)\s*(kg|kgs?|kilogrammes?|kilos?|g|gr|grammes?|lb|lbs|livres?|oz|onces?|mg|t|tonnes?)?$/i);
  if (!match) return null;
  const number = match[1].replace(/ /g,'').replace(',','.');
  const [integer, fraction=''] = number.split('.');
  // Extra trailing zeroes are harmless; meaningful hundredths are manual.
  if (fraction.slice(1).replace(/0/g,'')) return null;
  const tenths = Number(integer)*10 + Number((fraction+'0')[0]);
  if (!Number.isSafeInteger(tenths) || tenths<=0 || tenths%6!==0) return null;
  const step=tenths/6;
  return Array.from({length:6},(_,i)=>String(step*(i+1)/10));
}

export function installVerifiedRangeV2756({surface,names,enabled,write,changed}) {
  const apply = event => {
    if (!enabled() || event.target?.name!=='etendue_verifiee') return;
    const points=verifiedRangePointsV2756(event.target.value,names());
    if (!points) return;
    points.forEach((value,i)=>write(`charge_point_${i+1}_charge_utilisee`,value));
    changed();
  };
  // Commit only; typing "75" must not first replace points for the prefix "7".
  surface.addEventListener('change',apply);
  return ()=>surface.removeEventListener('change',apply);
}
