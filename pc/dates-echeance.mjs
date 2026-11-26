const months = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
const pad = value => String(value).padStart(2, '0');
const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

function civil(year, month, day) {
  if (year < 2000 || year > 2099 || month < 1 || month > 12) return null;
  const prefix = year + '-' + pad(month);
  if (day === undefined) return prefix;
  return day >= 1 && day <= lastDay(year, month) ? prefix + '-' + pad(day) : null;
}

export function reportDate(value, allowMonth = true) {
  const input = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const cleaned = allowMonth ? input.replace(/^\/\s*(?=\d{1,2}\s*\/\s*\d{2,4}$)/, '') : input;
  if (/\/\s*\//.test(cleaned)) return null;
  const tokens = cleaned.split(/[\s/.,;:\-–—]+/);
  if (tokens.length < 2 || tokens.length > 3) return null;
  const named = months.indexOf(tokens.at(-2));
  if (named >= 0) tokens[tokens.length - 2] = String(named + 1);
  if (!tokens.every(t => /^\d+$/.test(t))) return null;
  const yearFirst = tokens[0].length === 4;
  const ordered = yearFirst ? tokens : [...tokens].reverse();
  if (!/^(?:\d{2}|\d{4})$/.test(ordered[0])) return null;
  if (!ordered.slice(1).every(t => /^\d{1,2}$/.test(t))) return null;
  if (!allowMonth && ordered.length === 2) return null;
  return civil(Number(ordered[0]) + (ordered[0].length === 2 ? 2000 : 0),Number(ordered[1]),ordered[2] === undefined ? undefined : Number(ordered[2]));
}

export function deadlineGroup(value, today) {
  const due = reportDate(value);
  if (!due) return {group:'verify'};
  if (reportDate(today,false) !== today) throw new RangeError('Date civile de référence invalide');
  const [year,month,day] = today.split('-').map(Number);
  function boundary(n) {
    const d = new Date(Date.UTC(year, month - 1 + n, 1));
    return d.toISOString().slice(0,7) + '-' + pad(Math.min(day,lastDay(d.getUTCFullYear(), d.getUTCMonth()+1)));
  }
  const partial = due.length === 7;
  const start = partial ? due + '-01' : due;
  const end = partial ? due + '-' + lastDay(...due.split('-').map(Number)) : due;
  const group = start <= boundary(1) ? 'red' : start <= boundary(2) ? 'orange' : start < boundary(6) ? 'yellow' : 'green';
  return {group, date:due, partial, overdue:end < today};
}
