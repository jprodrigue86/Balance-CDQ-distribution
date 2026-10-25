// Small shared policies used by the application and Manager's local checks.
export function fileSortTimeV2782(file){
 if((file?.type==='GOOGLE_SHEETS'||file?.mimeType==='application/vnd.google-apps.spreadsheet'))return Date.parse(file.dateModification||'')||0;
 if(file?._cdqPendingSaveV2660&&Number.isFinite(Number(file._cdqLocalSavedAtV2772)))return Number(file._cdqLocalSavedAtV2772);
 return Date.parse(file?.dateModification||'')||0;
}
export function reportValueSignatureV2782(fields){
 const value=v=>v===undefined?null:Array.isArray(v)?v.map(value):v;
 return JSON.stringify(Object.keys(fields||{}).sort().map(name=>[name,value(fields[name]?.value),
  (fields[name]?.widgets||[]).map(w=>[String(w.id||''),value(w.value)]).sort((a,b)=>a[0].localeCompare(b[0]))]));
}
export function balanceListMessagesV2782(view){
 const warnings=(Array.isArray(view?.warnings)?view.warnings:[]).map(w=>typeof w==='string'?w:
  [w.name||w.nom||w.source||w.fileId||w.id||'Fichier',w.message||w.reason||w.error||'Lecture non confirmée'].join(' : '));
 const notes=[];
 if(view?.unsaved)notes.push('Cet aperçu contient des modifications non enregistrées dans un rapport.');
 else if(view?.localPending)notes.push('Mise à jour du PDF de cette liste en attente sur Drive. Ce statut ne décrit pas la sauvegarde de chaque rapport.');
 return {warnings,notes};
}
export function deletionSelectionKeyV2782(owner,client,selection){
 return JSON.stringify([String(owner),String(client),[...new Set(selection.fileIds||[])].sort(),[...new Set(selection.folderIds||[])].sort()]);
}
