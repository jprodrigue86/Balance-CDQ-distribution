(()=>{
 'use strict';
 const changes=new Map();let editing=null;
 const email=()=>String(typeof utilisateurCourantEmail!=='undefined'?utilisateurCourantEmail:'').toLowerCase();
 const allowed=()=>!!window.cdqDriveEntryV2632?.canRead()&&['admin','technicien'].includes(String(typeof utilisateurCourantRole!=='undefined'?utilisateurCourantRole:''));
 const key=(id,owner=email())=>owner+'|'+String(id);
 function apply(id,name){
  for(const comp of typeof toutesLesCompagnies!=='undefined'?toutesLesCompagnies||[]:[])if(String(comp.id)===String(id))comp.nom=name;
  if(String(typeof compagnieSelectionnee!=='undefined'?compagnieSelectionnee:'')===String(id)){
   nomCompagnieSelectionnee=name;const button=document.getElementById('companyButton');if(button)button.textContent=name;
   try{if(cacheContenuCompagnies[id])cacheContenuCompagnies[id].nom=name;}catch{}
  }
  try{sauvegarderCachePersistantCompagnies(toutesLesCompagnies).catch(()=>{});}catch{}
  try{filtrerCompagnies();cdqRefreshFavoriteModalIfOpen();}catch{}
 }
 function open(comp){
  if(!allowed()||!comp?.id)return;
  editing={id:String(comp.id),name:String(comp.nom||''),email:email()};
  renommerDossierDepuisInterface({id:editing.id,nom:editing.name});
  const title=document.querySelector('#renameModalOverlay h2');if(title){title.dataset.originalTitleV2665=title.textContent;title.textContent='Nouveau nom du client :';}
 }
 const cancel=window.fermerRenommage,confirm=window.confirmerRenommage;
 window.fermerRenommage=function(){editing=null;const title=document.querySelector('#renameModalOverlay h2');if(title?.dataset.originalTitleV2665){title.textContent=title.dataset.originalTitleV2665;delete title.dataset.originalTitleV2665;}return cancel.apply(this,arguments);};
 window.confirmerRenommage=function(){
  if(!editing)return confirm.apply(this,arguments);
  const target=editing,name=String(document.getElementById('renameInput')?.value||'').trim();
  if(!allowed()||email()!==target.email){window.fermerRenommage();return;}
  if(!name||name.length>200){afficherErreur(new Error(!name?'Le nom ne peut pas être vide.':'Le nom du client est trop long.'));return;}
  const mutation={name,previous:target.name,pending:true};changes.set(key(target.id),mutation);
  window.fermerRenommage();apply(target.id,name);
  cdqApiRun().withSuccessHandler(result=>{
   if(email()!==target.email||changes.get(key(target.id,target.email))!==mutation)return;
   mutation.name=String(result?.nom||name);mutation.pending=false;mutation.until=Date.now()+30000;apply(target.id,mutation.name);
   window.dispatchEvent(new CustomEvent('cdq:client-renamed',{detail:{clientId:target.id,name:mutation.name}}));
   afficherMessage('Client renommé.',true);
  }).withFailureHandler(error=>{
   if(email()===target.email&&changes.get(key(target.id,target.email))===mutation){changes.delete(key(target.id));apply(target.id,target.name);afficherErreur(error);}
  }).cdqRenommerClientV2665(target.id,name);
 };
 window.cdqClientRenameV2665={open,overlay(comp){const change=changes.get(key(comp.id));if(!change)return comp;if(!change.pending&&Date.now()>change.until){changes.delete(key(comp.id));return comp;}return {...comp,nom:change.name};}};
 window.addEventListener('cdq:drive-cleared-v2632',()=>{editing=null;changes.clear();});
})();
