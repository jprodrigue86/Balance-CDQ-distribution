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
 // Use rendered rows, never the cached directory tree: closed folders stay excluded.
 function selectableVisibleFiles(){
  return [...document.querySelectorAll('#filesContainer .file-row')].filter(row=>{
   if(!row.getClientRects().length)return false;
   for(let node=row;node;node=node.parentElement){
    const style=getComputedStyle(node);
    if(node.hidden||style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;
   }
   const type=String(row.dataset.fileType||'').trim(),name=String(row.dataset.fileName||'');
   return /^(?:application\/vnd\.google-apps\.spreadsheet|sheets?|google[ _-]sheets?|spreadsheet|feuille|application\/pdf|pdf)$/i.test(type)||/\.pdf$/i.test(name);
  }).map(row=>row.querySelector('.file-checkbox[data-file-id]')).filter(Boolean);
 }
 function selectAll(){
  if(!writable()||!document.body.classList.contains('selection-active'))return;
  for(const box of selectableVisibleFiles())box.checked=true;
  window.mettreAJourInterface?.();
 }
 function invoke(action){
  if(action==='select-all'){selectAll();return;}
  if(action==='cancel'){window.quitterModeSelection?.();return;}
  const items=selected();if(!items.length||!writable())return;
  if(action==='delete'){window.ouvrirConfirmationSuppression?.();return;}
  if(items.some(item=>item._cdqPendingSaveV2660||String(item.id).startsWith('cdq-local-'))){window.afficherMessage?.('Terminez la synchronisation des fichiers sélectionnés avant cette action.',false);return;}
  if(action==='rename')rename(items);
  else if(action==='duplicate')window.actionDossierOuDupliquer?.();
  else window.cdqCopyV2522?.open(items,action);
 }
 // V28.57: one touch/mouse owner for the selection strip. Normal nav is untouched.
 // pan is handled manually to coexist with hold-to-reorder on Android WebView.
 const selectionActionsV2857=['select-all','copy','duplicate','move','rename','delete','cancel'];
 const selectionOrderKeyV2857=()=> 'cdqSelectionOrderV2857:'+owner();
 function savedSelectionOrderV2857(){
  let keys;try{keys=JSON.parse(localStorage.getItem(selectionOrderKeyV2857())||'[]');}catch{}
  if(!Array.isArray(keys))keys=[];
  return [...new Set([...keys.filter(k=>selectionActionsV2857.includes(k)),...selectionActionsV2857])];
 }
 function applySelectionOrderV2857(strip){
  if(!strip)return;
  const byKey=new Map([...strip.children].map(b=>[b.dataset.selectionAction,b]));
  for(const [i,key] of savedSelectionOrderV2857().entries()){
   const button=byKey.get(key),at=strip.children[i];
   if(button&&button!==at)strip.insertBefore(button,at||null);
  }
 }
 let selectionGestureV2857=null;
 function installSelectionGesturesV2857(strip){
  const abort=new AbortController(),opts={signal:abort.signal},threshold=9;
  let gesture=null,frame=0,ignoreClicksUntil=0;
  const buttons=()=>[...strip.querySelectorAll(':scope > button[data-selection-action]')];
  const clear=()=>{if(gesture?.timer)clearTimeout(gesture.timer);if(frame)cancelAnimationFrame(frame);frame=0;};
  const mark=on=>strip.classList.toggle('cdq-selection-dragging-v2857',on);
  function restore(order){const byKey=new Map(buttons().map(b=>[b.dataset.selectionAction,b]));for(const key of order)if(byKey.has(key))strip.append(byKey.get(key));}
  function stop(cancel){
   if(!gesture)return;
   const g=gesture;clear();gesture=null;
   if(g.mode==='drag'){
    mark(false);g.button.classList.remove('cdq-selection-held-v2857');g.button.setAttribute('aria-grabbed','false');
    if(cancel)restore(g.original);
    else try{localStorage.setItem(g.key,JSON.stringify(buttons().map(b=>b.dataset.selectionAction)));}catch{}
    ignoreClicksUntil=Date.now()+750;
   }else if(g.mode==='scroll')ignoreClicksUntil=Date.now()+500;
   try{if(strip.hasPointerCapture(g.id))strip.releasePointerCapture(g.id);}catch{}
  }
  function reorder(x){
   const g=gesture;if(!g||g.mode!=='drag')return;
   const ordered=buttons(),nearest=ordered.reduce((best,b)=>{
    const r=b.getBoundingClientRect(),c=r.left+r.width/2;
    return Math.abs(c-x)<Math.abs((best.getBoundingClientRect().left+best.getBoundingClientRect().width/2)-x)?b:best;
   });
   if(nearest===g.button)return;
   const src=ordered.indexOf(g.button),dest=ordered.indexOf(nearest);
   strip.insertBefore(g.button,src<dest?nearest.nextSibling:nearest);
  }
  function edgeScroll(){
   frame=0;const g=gesture;if(!g||g.mode!=='drag')return;
   const r=strip.getBoundingClientRect();
   if(g.lastX<r.left+29)strip.scrollLeft-=9;
   else if(g.lastX>r.right-29)strip.scrollLeft+=9;
   reorder(g.lastX);frame=requestAnimationFrame(edgeScroll);
  }
  strip.addEventListener('pointerdown',e=>{
   if(!gesture)ignoreClicksUntil=0; // a new tap after a swipe must work immediately
   if(!document.body.classList.contains('selection-active')||gesture||e.isPrimary===false||e.button!==0)return;
   const el=e.target.closest?.('button[data-selection-action]')||document.elementFromPoint(e.clientX,e.clientY)?.closest?.('button[data-selection-action]');
   if(!el||el.parentElement!==strip)return;
   const g={id:e.pointerId,button:el,x:e.clientX,y:e.clientY,lastX:e.clientX,scroll:strip.scrollLeft,
     mode:'pending',original:buttons().map(b=>b.dataset.selectionAction),key:selectionOrderKeyV2857(),timer:0};
   gesture=g;
   let ms=700;try{ms=Number(localStorage.getItem('cdqNavHoldMsV2708')||700);}catch{}
   g.timer=setTimeout(()=>{
    if(gesture!==g||g.mode!=='pending')return;
    g.mode='drag';mark(true);el.classList.add('cdq-selection-held-v2857');el.setAttribute('aria-grabbed','true');
    try{strip.setPointerCapture(g.id);}catch{};
    try{navigator.vibrate?.(30);}catch{};
    frame=requestAnimationFrame(edgeScroll);
   },[500,700,1000].includes(ms)?ms:700);
  },opts);
  document.addEventListener('pointermove',e=>{
   const g=gesture;if(!g||e.pointerId!==g.id)return;
   g.lastX=e.clientX;
   const dx=e.clientX-g.x,dy=e.clientY-g.y;
   if(g.mode==='pending'&&Math.hypot(dx,dy)>threshold){
    clearTimeout(g.timer);g.timer=0;
    if(Math.abs(dx)<Math.abs(dy)*1.15){stop(true);return;}
    g.mode='scroll';try{strip.setPointerCapture(g.id);}catch{};
   }
   if(g.mode==='scroll'){
    if(e.cancelable)e.preventDefault();
    strip.scrollLeft=g.scroll-dx;
   }else if(g.mode==='drag'){
    if(e.cancelable)e.preventDefault();
    reorder(e.clientX);
   }
  },{...opts,capture:true,passive:false});
  document.addEventListener('pointerup',e=>{
   if(gesture?.id!==e.pointerId)return;
   if(gesture.mode==='scroll'||gesture.mode==='drag'){if(e.cancelable)e.preventDefault();ignoreClicksUntil=Date.now()+750;}
   stop(false);
  },{...opts,capture:true});
  document.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId)stop(true);},{...opts,capture:true});
  strip.addEventListener('click',e=>{
   if(Date.now()<ignoreClicksUntil){e.preventDefault();e.stopImmediatePropagation();}
  },{...opts,capture:true});
  strip.addEventListener('contextmenu',e=>{if(gesture){e.preventDefault();}},{...opts,capture:true});
  return {active:()=>!!gesture,cancel:()=>stop(true),destroy:()=>{stop(true);abort.abort();}};
 }
 let navActions;
 const selectionGridV2784=new WeakMap();
 function refresh(){
  if(!mobile())return;
  const nav=document.querySelector('.bottom-nav');if(!nav)return;
  const selecting=document.body.classList.contains('selection-active');
  if(selecting){
   if(!selectionGridV2784.has(nav)){
    selectionGridV2784.set(nav,['grid-template-columns','grid-auto-columns','min-height','height'].map(name=>[name,nav.style.getPropertyValue(name),nav.style.getPropertyPriority(name)]));
    nav.scrollLeft=0;
   }
   // Never let an old 49px inline min-height clip enlarged selection icons.
   // Restore it on exit from selection via the existing captured style tuples.
   nav.style.removeProperty('min-height');
   nav.style.removeProperty('height');
   nav.style.setProperty('grid-template-columns','minmax(0,1fr)','important');nav.style.setProperty('grid-auto-columns','auto','important');
  }else if(selectionGridV2784.has(nav)){
   for(const [name,value,priority] of selectionGridV2784.get(nav)){if(value)nav.style.setProperty(name,value,priority);else nav.style.removeProperty(name);}
   selectionGridV2784.delete(nav);
  }
  if(!navActions||navActions.parentElement!==nav){
   selectionGestureV2857?.destroy();
   navActions=document.createElement('div');navActions.className='cdq-selection-actions-v2783';navActions.setAttribute('role','group');navActions.setAttribute('aria-label','Actions de la sélection');
   for(const [action,label]of [['select-all','Tout sélectionner'],['copy','Copier'],['duplicate','Dupliquer'],['move','Déplacer'],['rename','Renommer'],['delete','Supprimer'],['cancel','Annuler']]){
    const b=document.createElement('button');b.type='button';b.dataset.selectionAction=action;b.className='cdq-selection-action-v2783';b.title=label;b.setAttribute('aria-label',label);
    window.cdqFileActionsV2655?.paint(b,action==='cancel'?'finish':action==='select-all'?'copy':action);
    if(action==='select-all'){
     const badge=document.createElement('span');badge.className='cdq-select-all-badge-v2827';badge.setAttribute('aria-hidden','true');badge.textContent='✓';
     b.querySelector('.cdq-action-art-v2655')?.append(badge);
    }
    b.title=label;b.setAttribute('aria-label',label);
    const labelNode=document.createElement('small');labelNode.textContent=label;b.append(labelNode);b.onclick=e=>{e.preventDefault();e.stopPropagation();invoke(action);};navActions.append(b);
   }
   nav.append(navActions);
   selectionGestureV2857=installSelectionGesturesV2857(navActions);
  }
  if(!selectionGestureV2857?.active())applySelectionOrderV2857(navActions);
  if(!selecting)selectionGestureV2857?.cancel();
  const items=selected(),write=writable();
  const visibleFiles=selectableVisibleFiles();
  for(const b of navActions.children)b.disabled=b.dataset.selectionAction==='select-all'?(!write||!visibleFiles.length):b.dataset.selectionAction!=='cancel'&&(!write||!items.length||b.dataset.selectionAction==='duplicate'&&items.some(i=>i.kind==='folder'));
 }
 window.cdqMobileSelectionV2783={refresh,selected,rename};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
 // The icon-theme painter also emits cdq:icons-changed for DOM changes.
 // Recreating this strip on every event causes an unbounded feedback loop:
 // repaint -> event -> remove/append strip -> repaint (60+ times/second),
 // detaching pointer listeners and resetting the horizontal position.
 // Change ONLY the existing icon drawings when the selected theme truly changes.
 let selectionIconThemeV2858=window.cdqIconThemesV2514?.getStyle?.() || 'current';
 document.addEventListener('cdq:icons-changed',event=>{
  const style=window.cdqIconThemesV2514?.getStyle?.() || event.detail?.style || 'current';
  if(style===selectionIconThemeV2858)return;
  selectionIconThemeV2858=style;
  if(!navActions?.isConnected)return;
  for(const button of navActions.querySelectorAll(':scope > button[data-selection-action]')){
   const action=button.dataset.selectionAction;
   const artwork=button.querySelector(':scope > .cdq-action-art-v2655');
   if(!artwork)continue;
   const key=action==='cancel'?'finish':action==='select-all'?'copy':action;
   const drawing=window.cdqActionArtworkV2657?.(key,style,document.documentElement.dataset.cdqPalette||'dark');
   if(typeof drawing==='string' && artwork.innerHTML!==drawing){
    artwork.innerHTML=drawing;
    button.dataset.actionStyle=style;
   }
  }
 });
})();

