// Keep every report revision, including non-equipment reports and duplicate
// identifications. Presentation is the only place that selects one winner.
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
// Reuse only raw legacy rows whose revision was accepted by the server.
// This is a read cache, never proof of present folder membership: the caller
// still obtains and compares two complete, authorised Drive snapshots.
export function balanceEngineReadCacheV2791(result,clientId){
 if(result?.ok!==true||result.baselineComplete!==true||String(result.clientId)!==String(clientId)||!Array.isArray(result.sources)||!Array.isArray(result.items)||result.sources.length>500)return null;
 const sources=new Map(),rows=new Map();
 for(const source of result.sources){if(!source?.id||!source.revision||sources.has(String(source.id)))return null;sources.set(String(source.id),String(source.revision));}
 for(const row of result.items){const id=String(row.fileId||row.id||'');if(!id)continue;rows.set(id,rows.has(id)?null:row);}
 const entries=[];
 for(const [id,revision] of sources){
  const row=rows.get(id);if(!row||row.local||row.reportId||row.pdf?.status!=='legacy'||row.pdf.driveRevision!==revision)continue;
  const values=[row.fabricant,row.modele,row.capacite,row.echelon,row.identification,row.conformity];
  const signature=JSON.stringify(values);if(!balanceSignatureValuesV2751(signature))continue;
  entries.push({id,revision,signature});
 }
 return {clientId:String(clientId),entries};
}
export function balanceEngineSignatureV2791(cache,file,clientId){
 if(!cache||cache.clientId!==String(clientId)||!file?.id||file._cdqPendingSaveV2660||String(file.id).startsWith('cdq-local-')||!Array.isArray(cache.entries))return null;
 const revision=String(file.modifiedTime||file.dateModification||file.revision||'');
 if(!revision)return null;
 const rows=cache.entries.filter(row=>row.id===String(file.id));
 const row=rows.length===1?rows[0]:null;
 return row?.revision===revision&&balanceSignatureValuesV2751(row.signature)?.values?row.signature:null;
}
export function balanceSignatureValuesV2751(signature){
 if(typeof signature!=='string'||!signature)return null;
 try{const value=JSON.parse(signature);return value===null||Array.isArray(value)&&value.length===6&&value.slice(0,5).every(v=>typeof v==='string')&&['conforming','nonconforming','unknown'].includes(value[5])?{values:value}:null;}catch{return null;}
}
export function balanceSourceRowsV2751(index){
 if(!index?.exhaustive||!Array.isArray(index.sources))return null;
 const rows=[];for(const source of index.sources){const parsed=balanceSignatureValuesV2751(source.signature);if(!parsed)return null;if(parsed.values===null)continue;const[fabricant,modele,capacite,echelon,identification,conformity]=parsed.values;rows.push({id:String(source.id),source:source.name||'',revision:source.revision,fabricant,modele,capacite,echelon,identification,conformity});}return rows;
}
export function balanceDisplayRowsV2751(records){
 const seen=new Set();return records.slice().sort((a,b)=>Number(!!b.local)-Number(!!a.local)||(Date.parse(b.revision)||0)-(Date.parse(a.revision)||0)||String(a.id).localeCompare(String(b.id))).filter(row=>{const id=norm(row.identification);if(id&&seen.has(id))return false;if(id)seen.add(id);return true;}).sort((a,b)=>String(a.identification||a.source).localeCompare(String(b.identification||b.source),'fr',{numeric:true}));
}
export function validBalanceSourceIndexV2751(index,clientId,fileId){
 if(index?.version!==1||!index.exhaustive||index.invalidated||index.authorKnown===false||String(index.clientId)!==String(clientId)||String(index.fileId)!==String(fileId)||!index.listRevision||!index.list?.id||!Array.isArray(index.sources)||index.sources.length>500||!Array.isArray(index.folders))return false;
 const ids=new Set();return index.sources.every(source=>source?.id&&source.revision&&!ids.has(String(source.id))&&(ids.add(String(source.id)),!!balanceSignatureValuesV2751(source.signature)));
}
export function replaceBalanceSourceV2751(index,{id,sourceId=id,revision,signature,name}){
 if(!index?.exhaustive||!revision||!balanceSignatureValuesV2751(signature))return null;
 const prior=index.sources?.find(source=>String(source.id)===String(sourceId)||String(source.id)===String(id));if(!prior)return null;
 const next={...prior,id:String(id),revision:String(revision),signature,name:name||prior.name||'',file:{...prior.file,id:String(id),revision:String(revision),modifiedTime:String(revision),dateModification:String(revision)}};
 return {...index,sources:index.sources.filter(source=>source!==prior&&String(source.id)!==String(id)).concat(next).sort((a,b)=>a.id.localeCompare(b.id))};
}
