// Keep each selected file bound to one existing, authenticated server request.
export async function moveFileSelectionV2727(items,{rpc,destinationId,requests,completed=new Map(),guard=()=>{},onConfirmed=()=>{},onProgress=()=>{}}){
 const unique=[...new Map(items.map(item=>[String(item.id||''),item])).values()];
 if(!unique.length||unique.some(item=>!item.id)||!destinationId)throw Error('Choisissez les fichiers et le dossier de destination.');
 for(const item of unique){
  guard();if(completed.has(String(item.id)))continue;
  const requestId=requests.get(String(item.id));if(!requestId)throw Error('La demande de déplacement est incomplète.');
  onProgress(completed.size,unique.length,item);
  const result=await rpc('deplacerElementCDQV2677',[String(item.id),destinationId,requestId]);guard();
  if(result?.ok!==true||String(result.id)!==String(item.id)||String(result.destinationId)!==String(destinationId))throw Error('Le déplacement de « '+(item.nom||'ce fichier')+' » n’a pas été confirmé.');
  completed.set(String(item.id),result);onConfirmed(result,item);
 }
 return [...completed.values()];
}

export function confirmedDeletionV2727(result,{fileIds=[],folderIds=[]}={}){
 const files=new Set(fileIds.map(String)),folders=new Set(folderIds.map(String));
 if(!result||result.ok===false) return {fileIds:[],folderIds:[]};
 const confirmedFiles=Array.isArray(result.fichiers)?result.fichiers:Array.isArray(result.ids)?result.ids:[];
 const confirmedFolders=Array.isArray(result.dossiers)?result.dossiers:typeof result.id==='string'?[result.id]:[];
 return {fileIds:[...new Set(confirmedFiles.map(String))].filter(id=>files.has(id)),folderIds:[...new Set(confirmedFolders.map(String))].filter(id=>folders.has(id))};
}

// Hide immediately, including rows recreated by a background refresh. Only an
// explicit server acknowledgement removes a row; omitted IDs regain their state.
export function beginOptimisticDeletionV2727({fileIds=[],folderIds=[],identity=()=>'',scope=()=>'',document:doc=globalThis.document}={}){
 const files=new Set(fileIds.map(String)),folders=new Set(folderIds.map(String)),owner=identity(),place=scope(),saved=new Map(),originals=new Map(),token='delete-'+globalThis.crypto.randomUUID();let ended=false;
 const current=()=>identity()===owner&&scope()===place;
 function target(el){
  const file=el.dataset?.fileId||el.querySelector?.('.file-checkbox')?.dataset.fileId;
  const folder=el.dataset?.folderId||el.dataset?.folderSelectId;
  if(files.has(String(file||'')))return {kind:'file',id:String(file),row:el.closest('.file-row')||el};
  if(folders.has(String(folder||'')))return {kind:'folder',id:String(folder),row:el.closest('.folder')||el.closest('.cdq-drive-row')||el};
 }
 function scan(){if(ended||!current())return;for(const el of doc.querySelectorAll('.file-checkbox,[data-file-id],[data-folder-id],[data-folder-select-id]')){
  const value=target(el);if(!value||saved.has(value.row))continue;const row=value.row,box=row.querySelector('.file-checkbox,.folder-checkbox');
  const key=value.kind+':'+value.id,original=originals.get(key),clonedPending=row.dataset.cdqPendingDeleteV2727===token;
  const state={...value,display:row.style.getPropertyValue('display'),priority:row.style.getPropertyPriority('display'),aria:row.getAttribute('aria-hidden'),checked:original?original.checked:box?.checked,box};
  if(clonedPending&&original)for(const field of ['display','priority','aria'])state[field]=original[field];
  if(!original)originals.set(key,state);saved.set(row,state);
  row.dataset.cdqPendingDeleteV2727=token;row.style.setProperty('display','none','important');row.setAttribute('aria-hidden','true');if(box)box.checked=false;
 }}
 scan();const Observer=doc.defaultView?.MutationObserver;const observer=Observer?new Observer(scan):null;observer?.observe(doc.body,{childList:true,subtree:true});
 function restore(row,value){if(row.dataset.cdqPendingDeleteV2727!==token)return;delete row.dataset.cdqPendingDeleteV2727;if(value.display)row.style.setProperty('display',value.display,value.priority);else row.style.removeProperty('display');if(value.aria===null)row.removeAttribute('aria-hidden');else row.setAttribute('aria-hidden',value.aria);if(current()&&value.box)value.box.checked=value.checked;}
 return {finish(confirmed={fileIds:[],folderIds:[]}){
  if(ended)return;ended=true;observer?.disconnect();const confirmedFiles=new Set(confirmed.fileIds||[]),confirmedFolders=new Set(confirmed.folderIds||[]);
  for(const [row,value]of saved){if(current()&&(value.kind==='file'?confirmedFiles:confirmedFolders).has(value.id))row.remove();else restore(row,value);}
 },rollback(){this.finish();}};
}

export function installPcFileOperationsV2727({rpc,identity,authorized,openMove}){
 if(!globalThis.document||document.documentElement.dataset.cdqPcFileOperationsV2727==='1')return;
 const pc=()=>!!window.cdqDesktopModel2||document.documentElement.classList.contains('cdq-desktop-v2676');
 if(!pc())return;document.documentElement.dataset.cdqPcFileOperationsV2727='1';let deleting=false;
 const company=()=>String(typeof compagnieSelectionnee==='undefined'?'':compagnieSelectionnee||'');
 const ids=()=>({fileIds:window.obtenirFichiersSelectionnes?.()||[],folderIds:window.obtenirDossiersSelectionnes?.()||[]});
 function selected(){return ids().fileIds.map(id=>{const box=[...document.querySelectorAll('.file-checkbox')].find(el=>String(el.dataset.fileId)===String(id));return {id:String(id),kind:'file',nom:box?.dataset.fileName||box?.closest('.file-row')?.dataset.fileName||'Fichier'};});}
 function refreshButton(){const bar=document.getElementById('selectionBar');if(!bar)return;let button=document.getElementById('moveSelectionButtonV2727');if(!button){button=document.createElement('button');button.id='moveSelectionButtonV2727';button.type='button';button.className='selection-mode-move';button.textContent='Déplacer';button.onclick=()=>{if(authorized())openMove(selected());};bar.insertBefore(button,document.getElementById('deleteButton'));}const selection=ids();button.hidden=!selection.fileIds.length;button.disabled=!authorized()||!!selection.folderIds.length||deleting;button.title=selection.folderIds.length?'Sélectionnez uniquement les fichiers à déplacer.':'Déplacer les fichiers sélectionnés';}
 const previousUpdate=window.mettreAJourInterface;if(typeof previousUpdate==='function')window.mettreAJourInterface=function(...args){const result=previousUpdate.apply(this,args);refreshButton();return result;};
 const pageDocument=document;document.addEventListener('change',refreshButton);document.addEventListener('click',()=>queueMicrotask(()=>{if(globalThis.document===pageDocument)refreshButton();}));refreshButton();
 let undoTimer;
 function undo(confirmed,clientId,owner){
  const toast=document.getElementById('cdqUndoToast'),button=toast?.querySelector('button');if(!button)return;clearTimeout(undoTimer);const count=confirmed.fileIds.length+confirmed.folderIds.length;document.getElementById('cdqUndoText').textContent=count+(count===1?' élément supprimé.':' éléments supprimés.');toast.classList.add('show');
  button.onclick=async()=>{toast.classList.remove('show');clearTimeout(undoTimer);if(identity()!==owner||!authorized())return;try{const restored=await rpc('restaurerSelectionMultiple',[confirmed.fileIds,confirmed.folderIds,clientId]);if(identity()!==owner)return;if(Number(restored?.nombre)!==count)throw Error('La restauration complète n’a pas été confirmée. Actualisez le dossier.');if(clientId)window.actualiserCompagnieEnArrierePlan?.(clientId);window.dispatchEvent(new CustomEvent('cdq:deleted',{detail:{restored:true,clientId}}));window.afficherMessage?.(restored.message||'Restauration terminée.',true);}catch(error){if(identity()===owner)window.afficherErreur?.(error);}};
  undoTimer=setTimeout(()=>toast.classList.remove('show'),9000);undoTimer.unref?.();
 }
 async function remove(selection,close){
  if(deleting||!authorized()||!selection.fileIds.length&&!selection.folderIds.length)return;
  deleting=true;const clientId=company(),owner=identity();close?.();const transaction=beginOptimisticDeletionV2727({...selection,identity,scope:company});window.mettreAJourInterface?.();window.afficherMessage?.('Suppression en cours…',false);
  try{
   const result=await rpc('supprimerSelectionMultiple',[selection.fileIds,selection.folderIds,clientId]);
   if(identity()!==owner)throw Error('Le compte a changé.');
   const confirmed=confirmedDeletionV2727(result,selection);transaction.finish(confirmed);
   if(confirmed.fileIds.length)window.supprimerFichiersDuCache?.(clientId,confirmed.fileIds);
   for(const id of confirmed.folderIds)window.supprimerDossierDuCache?.(clientId,id);
   const count=confirmed.fileIds.length+confirmed.folderIds.length,total=selection.fileIds.length+selection.folderIds.length;
   if(count){window.dispatchEvent(new CustomEvent('cdq:deleted',{detail:{ids:confirmed.fileIds,folderIds:confirmed.folderIds,clientId}}));if(clientId)window.actualiserCompagnieEnArrierePlan?.(clientId);undo(confirmed,clientId,owner);}
   if(count!==total)throw Error(count?'Suppression partielle : '+count+' / '+total+' éléments confirmés. Les autres sont conservés.':'La suppression n’a pas été confirmée. Le fichier reste affiché.');
   if(company()===clientId)window.quitterModeSelection?.();window.afficherMessage?.(result.message||'Sélection supprimée.',true);
  }catch(error){transaction.rollback();if(identity()===owner)window.afficherErreur?.(error);}
  finally{deleting=false;window.mettreAJourInterface?.();refreshButton();}
 }
 window.confirmerSuppression=()=>remove(ids(),()=>window.fermerConfirmationSuppression?.());
 const oldFolder=window.confirmerSuppressionDossier;
 window.confirmerSuppressionDossier=()=>{const folder=typeof dossierEnCoursDeSuppression==='undefined'?null:dossierEnCoursDeSuppression;if(!folder)return oldFolder?.();return remove({fileIds:[],folderIds:[String(folder.id)]},()=>window.fermerConfirmationSuppressionDossier?.());};
 return {selected,remove};
}
