// Read-only ranking. A suggestion never opens or creates a client.
export const normalizeCompany = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
export function editDistance(a,b,limit=2) {
  if(Math.abs(a.length-b.length)>limit)return limit+1;
  let prev2=null,prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const row=[i];
    for(let j=1;j<=b.length;j++){
      row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      if(prev2&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],prev2[j-2]+1);
    }
    prev2=prev;prev=row;
  }
  return prev[b.length];
}
export function rankCompanies(companies,query) {
  const q=normalizeCompany(query),unique=[...new Map((companies||[]).filter(c=>c&&c.id).map(c=>[String(c.id),c])).values()];
  if(!q)return unique;
  const limit=q.length>=6?2:q.length>=3?1:0;
  return unique.map(company=>{
    const name=normalizeCompany(company.nom),words=name.split(' ');
    if(name===q)return {company,score:0};
    if(name.startsWith(q))return {company,score:1};
    if(name.includes(q))return {company,score:2};
    if(!limit)return {company,score:Infinity};
    const candidates=[name,...words];
    const count=q.split(' ').length;
    if(count>1)for(let i=0;i+count<=words.length;i++)candidates.push(words.slice(i,i+count).join(' '));
    const distance=Math.min(...candidates.filter(n=>Math.abs(n.length-q.length)<=limit).map(n=>editDistance(q,n,limit)),limit+1);
    return {company,score:distance<=limit?3+distance:Infinity};
  }).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score||String(a.company.nom).localeCompare(String(b.company.nom),'fr',{sensitivity:'base'})).slice(0,50).map(x=>x.company);
}
if(typeof window!=='undefined')window.cdqCompanySearchV2797={rankCompanies};
