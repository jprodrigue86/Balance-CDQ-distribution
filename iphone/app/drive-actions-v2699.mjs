// General Drive actions use an empty client context and the same authenticated
// server functions as the client file menu. Drive access and roles remain checked.
export function installDriveActionsV2699(row,item,{favorite,rpc,canWrite}){
 const desktop=window.cdqDesktopModel2;if(!desktop)return;
 const actions=document.createElement('div');actions.className='cdq-swipe-overlay';actions.hidden=true;
 function add(key,label,handler,write=false){const b=document.createElement('button');b.type='button';b.className='cdq-swipe-action '+key;b.disabled=write&&!canWrite();window.cdqFileActionsV2655.paint(b,key,label);b.onclick=e=>{e.preventDefault();e.stopPropagation();if(write&&!canWrite())return;Promise.resolve().then(handler).catch(error=>window.afficherErreur?.(error));};actions.append(b);return b;}
 const folder=item.kind==='folder';
 add('note','Note',()=>folder?window.ouvrirNoteDossier?.(item):window.ouvrirNoteFichier?.(item));
 add('photo','Photo',()=>window.ouvrirPhotosCible?.(folder?'dossier':'fichier',item.id,item.nom));
 add('rename','Renommer',()=>edit('rename'),true);
 add('delete','Supprimer',()=>edit('delete'),true);
 if(window.cdqCopyV2522?.authorized()){actions.append(window.cdqCopyV2522.swipeButton({...item,kind:folder?'folder':'file'}),window.cdqCopyV2522.swipeButton({...item,kind:folder?'folder':'file'},'move'));}
 add('favorite',item.favori?'Retirer des favoris':'Favori',favorite);
 if(!folder)add('send','Envoyer un lien',()=>{const url='https://drive.google.com/file/d/'+encodeURIComponent(item.id)+'/view';window.open('mailto:?subject='+encodeURIComponent(item.nom)+'&body='+encodeURIComponent(url),'_blank','noopener');});
 row.append(actions);desktop.installRowActions(row);
 function edit(mode){
  if(!canWrite())return;const dialog=document.createElement('dialog');dialog.className='cdq-drive-edit-v2699';dialog.setAttribute('aria-label',mode==='rename'?'Renommer':'Supprimer');
  const title=document.createElement('h2');title.textContent=mode==='rename'?'Renommer':'Supprimer';const name=document.createElement('p');name.textContent=item.nom;
  const input=document.createElement('input');input.value=item.nom;input.maxLength=240;input.required=true;input.setAttribute('aria-label','Nouveau nom');
  const form=document.createElement('form');form.append(title,name);if(mode==='rename')form.append(input);else{const info=document.createElement('p');info.textContent='Déplacer cet élément dans la corbeille ?';form.append(info);}
  const status=document.createElement('p');status.setAttribute('role','status');form.append(status);const footer=document.createElement('footer'),cancel=document.createElement('button'),confirm=document.createElement('button');
  cancel.type='button';cancel.textContent='Annuler';cancel.onclick=()=>dialog.close();confirm.type='submit';confirm.textContent=mode==='rename'?'Enregistrer':'Supprimer';footer.append(cancel,confirm);form.append(footer);dialog.append(form);document.body.append(dialog);
  let busy=false;dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
  form.onsubmit=async e=>{e.preventDefault();if(busy||!canWrite())return;if(mode==='rename'&&!input.value.trim()){input.reportValidity();return;}busy=true;confirm.disabled=cancel.disabled=true;status.textContent='Enregistrement…';
   try{await rpc(mode==='rename'?(folder?'renommerDossier':'renommerFichier'):(folder?'supprimerDossier':'supprimerFichiers'),...(mode==='rename'?[item.id,input.value.trim(),'']:folder?[item.id,'']:[[item.id],'']));dialog.close();window.dispatchEvent(new CustomEvent(mode==='rename'?'cdq:renamed':'cdq:deleted',{detail:{id:item.id}}));}
   catch(error){status.textContent=error.message||String(error);}finally{busy=false;confirm.disabled=cancel.disabled=false;}
  };dialog.showModal();if(mode==='rename'){input.focus();input.select();}else cancel.focus();
 }
}
