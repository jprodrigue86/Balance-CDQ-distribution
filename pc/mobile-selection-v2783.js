(() => {
 'use strict';
 const mobile=()=>!document.documentElement.classList.contains('cdq-desktop-v2676');
 const owner=()=>String(typeof utilisateurCourantEmail==='undefined'?'':utilisateurCourantEmail).toLowerCase();
 const client=()=>String(typeof compagnieSelectionnee==='undefined'?'':compagnieSelectionnee);
 const writable=()=>!!owner()&&['admin','technicien'].includes(typeof utilisateurCourantRole==='undefined'?'':utilisateurCourantRole)&&(!window.cdqDriveEntryV2632||window.cdqDriveEntryV2632.canRead());
 function selected(){
  const files=new Set((window.obtenirFichiersSelectionnes?.()||[]).map(String)),folders=new Set((window.obtenirDossiersSelectionnes?.()||[]).map(String)),out=[];
  const visit=node=>{if(!node)return;for(const file of node.fichiers||[])if(files.has(String(file.id)))out.push({...file,kind:'file'});for(const folder of node.dossiers||[]){if(folders.has(String(folder.id)))out.push({id:folder.id,nom:folder.nom,kind:'folder'});else visit(folder);}};
  try{visit(cacheContenuCompagnies[client()]);}catch{}
  return out;
 }
 const rpc=(name,args)=>new Promise((resolve,reject)=>cdqApiRun().withSuccessHandler(resolve).withFailureHandler(reject)[name](...args));
 let dialog=null;
 function rename(items){
  if(!items.length||!writable()||dialog?.open)return;
  const email=owner(),place=client(),guard=()=>{if(owner()!==email||client()!==place||!writable())throw Error('Le compte ou le dossier a changé.');};
  dialog=document.createElement('dialog');dialog.id='cdqRenameSelectionV2783';dialog.setAttribute('aria-label','Renommer la sélection');
  const title=document.createElement('h2');title.textContent='Renommer '+items.length+(items.length>1?' éléments':' élément');dialog.append(title);
  const entries=items.map(item=>{const label=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('input'),state=document.createElement('small');caption.textContent=item.nom;input.value=item.nom;input.maxLength=240;state.setAttribute('role','status');label.append(caption,input,state);dialog.append(label);return {item,input,state,done:false};});
  const footer=document.createElement('footer'),cancel=document.createElement('button'),save=document.createElement('button');cancel.textContent='Annuler';save.textContent='Enregistrer';cancel.type=save.type='button';footer.append(cancel,save);dialog.append(footer);let busy=false;
  cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>{dialog.remove();dialog=null;};
  save.onclick=async()=>{
   if(busy)return;
   try{guard();}catch(e){window.afficherErreur?.(e);return;}
   if(entries.some(e=>!e.done&&!e.input.value.trim())){entries.find(e=>!e.done&&!e.input.value.trim()).input.focus();return;}
   busy=true;save.disabled=cancel.disabled=true;entries.forEach(e=>e.input.disabled=true);
   for(const entry of entries){
    if(entry.done)continue;const name=entry.input.value.trim();if(name===entry.item.nom){entry.done=true;continue;}
    try{guard();entry.state.textContent='Enregistrement…';const result=await rpc(entry.item.kind==='folder'?'renommerDossier':'renommerFichier',[String(entry.item.id),name,place]);guard();if(!result||result.ok===false||result.id&&String(result.id)!==String(entry.item.id))throw Error(result?.message||'Renommage non confirmé.');entry.done=true;entry.state.textContent='Enregistré';entry.item.nom=result?.nom||name;if(entry.item.kind==='file'&&result?.id)window.mettreAJourFichierDansCache?.(place,result);}
    catch(e){entry.state.textContent=e.message||String(e);if(owner()!==email||client()!==place)break;}
   }
   busy=false;save.disabled=cancel.disabled=false;entries.forEach(e=>e.input.disabled=e.done);save.textContent='Réessayer les éléments restants';
   if(owner()===email&&client()===place){window.actualiserCompagnieEnArrierePlan?.(place);if(entries.every(e=>e.done)){dialog.close();window.quitterModeSelection?.();window.afficherMessage?.('Noms enregistrés.',true);}}
  };
  document.body.append(dialog);dialog.showModal();entries[0].input.focus();
 }
 function invoke(action){
  if(action==='cancel'){window.quitterModeSelection?.();return;}
  const items=selected();if(!items.length||!writable())return;
  if(action==='delete'){window.ouvrirConfirmationSuppression?.();return;}
  if(items.some(item=>item._cdqPendingSaveV2660||String(item.id).startsWith('cdq-local-'))){window.afficherMessage?.('Terminez la synchronisation des fichiers sélectionnés avant cette action.',false);return;}
  if(action==='rename')rename(items);
  else if(action==='duplicate')window.actionDossierOuDupliquer?.();
  else window.cdqCopyV2522?.open(items,action);
 }
 let navActions;
 const selectionGridV2784=new WeakMap();
 function refresh(){
  if(!mobile())return;
  const nav=document.querySelector('.bottom-nav');if(!nav)return;
  const selecting=document.body.classList.contains('selection-active');
  if(selecting){
   if(!selectionGridV2784.has(nav))selectionGridV2784.set(nav,['grid-template-columns','grid-auto-columns'].map(name=>[name,nav.style.getPropertyValue(name),nav.style.getPropertyPriority(name)]));
   nav.style.setProperty('grid-template-columns','minmax(0,1fr)','important');nav.style.setProperty('grid-auto-columns','auto','important');nav.scrollLeft=0;
  }else if(selectionGridV2784.has(nav)){
   for(const [name,value,priority] of selectionGridV2784.get(nav)){if(value)nav.style.setProperty(name,value,priority);else nav.style.removeProperty(name);}
   selectionGridV2784.delete(nav);
  }
  if(!navActions||navActions.parentElement!==nav){
   navActions=document.createElement('div');navActions.className='cdq-selection-actions-v2783';navActions.setAttribute('role','group');navActions.setAttribute('aria-label','Actions de la sélection');
   for(const [action,label]of [['copy','Copier'],['duplicate','Dupliquer'],['move','Déplacer'],['rename','Renommer'],['delete','Supprimer'],['cancel','Annuler']]){
    const b=document.createElement('button');b.type='button';b.dataset.selectionAction=action;b.className='cdq-selection-action-v2783';b.title=label;b.setAttribute('aria-label',label);
    window.cdqFileActionsV2655?.paint(b,action==='cancel'?'finish':action);const labelNode=document.createElement('small');labelNode.textContent=label;b.append(labelNode);b.onclick=e=>{e.preventDefault();e.stopPropagation();invoke(action);};navActions.append(b);
   }
   nav.append(navActions);
  }
  const items=selected(),write=writable();
  for(const b of navActions.children)b.disabled=b.dataset.selectionAction!=='cancel'&&(!write||!items.length||b.dataset.selectionAction==='duplicate'&&items.some(i=>i.kind==='folder'));
 }
 window.cdqMobileSelectionV2783={refresh,selected,rename};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
 document.addEventListener('cdq:icons-changed',()=>{navActions?.remove();navActions=null;refresh();});
})();
