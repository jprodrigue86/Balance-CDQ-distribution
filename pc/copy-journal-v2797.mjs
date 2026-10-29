// Persist before sending. An unknown server outcome is never replayed blindly.
export function openCopyJournalV2797(storage,key,{owner,destination,items,uuid=()=>crypto.randomUUID()}){
 if(!owner||!destination||!items.length||items.some(x=>!x.id))throw Error('Contexte de copie incomplet.');
 let job=JSON.parse(storage.getItem(key)||'null');
 const ids=[...new Set(items.map(x=>String(x.id)))].sort();
 if(!job){job={version:1,owner,destination,ids,requests:Object.fromEntries(ids.map(id=>[id,'copy-'+uuid()])),completed:{},pending:null};storage.setItem(key,JSON.stringify(job));}
 if(job.version!==1||job.owner!==owner||job.destination!==destination||JSON.stringify(job.ids)!==JSON.stringify(ids))throw Error('Une copie précédente de cette sélection reste à vérifier dans sa destination.');
 const save=()=>storage.setItem(key,JSON.stringify(job));
 return {
  completed:()=>new Map(Object.entries(job.completed)),
  start(id){id=String(id);if(job.pending)throw Error('Résultat de copie incertain. Vérifiez le dossier de destination avant toute nouvelle copie de cette sélection.');if(job.completed[id])return null;if(!job.requests[id])throw Error('Fichier absent de la demande.');job.pending=id;save();return job.requests[id];},
  confirm(id,result){id=String(id);if(job.pending!==id||result?.ok!==true||!result.id||String(result.destinationId||'')!==destination)throw Error('La copie n’a pas été confirmée dans la destination choisie.');job.completed[id]=result;job.pending=null;save();},
  finish(){if(job.pending||ids.some(id=>!job.completed[id]))throw Error('Copie incomplète.');storage.removeItem(key);},
 };
}
