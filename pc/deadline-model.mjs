import {deadlineGroup} from './dates-echeance.mjs';
export const categories = {red:'En retard ou d’ici 1 mois',orange:'Dans 1 à 2 mois',yellow:'Dans 2 à moins de 6 mois',green:'Dans 6 mois et plus',verify:'Dates à vérifier'};
export const localDay = (at=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
const french = (value,partial) => new Intl.DateTimeFormat('fr-CA',{timeZone:'UTC',year:'numeric',month:'long',...(partial?{}:{day:'numeric'})}).format(new Date(value+(partial?'-01':'')+'T12:00:00Z'));
export function describeDue(due,today) {
  const info=deadlineGroup(due,today);
  if (!info.date) return {...info,label:'Date à vérifier'};
  if (info.partial) {
    const text=info.date===today.slice(0,7)?'Échéance ce mois-ci':info.overdue?'En retard':'Priorité provisoire';
    return {...info,label:french(info.date,true)+' · '+text+' · Jour non précisé'};
  }
  const days=Math.round((Date.parse(info.date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
  return {...info,label:french(info.date,false)+' · '+(days<0?'En retard de '+(-days)+' j':days===0?'Aujourd’hui':'Dans '+days+' j')};
}
export function indexedRows(company,result) {
  if(result?.clientId!==company.id || result.deadlineIndex!==1 || !Array.isArray(result.items)) throw Error('Index d’échéances indisponible');
  const seen=new Set();
  return result.items.map(row=>{
    if(!/^(native|legacy):[\w-]+$/.test(row.identity) || seen.has(row.identity)) throw Error('Identité de balance incohérente');
    seen.add(row.identity);
    return {...row,clientId:company.id,client:company.nom,city:company.ville||'',region:company.region||'',
      archived:company.archived===true || company.archive===true};
  });
}
