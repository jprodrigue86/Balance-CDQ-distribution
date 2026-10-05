
(function(){
'use strict';
let dialog,sequence=0,owner='',source=null,context=null,destination='',destinationName='',client='',crumbs=[],choices=[],busy=false,requestId='',mode='same',operation='copy';
const account=()=>String(typeof utilisateurCourantEmail==='undefined'?'':utilisateurCourantEmail).toLowerCase();
function authorized(){return account()&&['admin','technicien'].includes(typeof utilisateurCourantRole==='undefined'?'':utilisateurCourantRole)}
function rpc(name,args){const email=account();return new Promise((resolve,reject)=>{cdqApiRun().withSuccessHandler(value=>{if(email!==account())reject(Error('Le compte a changé.'));else resolve(value)}).withFailureHandler(reject)[name](...args)});}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function button(text,fn,cls=''){const b=node('button',cls,text);b.type='button';b.onclick=fn;return b;}
function status(text,error=false){const s=dialog.querySelector('.copy-status');s.textContent=text;s.classList.toggle('error',error);}
function valid(token){return token===sequence&&dialog.open&&owner===account();}
function render(){
 const list=dialog.querySelector('.copy-list'),search=dialog.querySelector('input'),q=search.value.trim().toLocaleLowerCase('fr');list.replaceChildren();
 dialog.querySelector('.copy-destination').textContent=destination?'Destination : '+destinationName:mode==='clients'?'Choisis un client.':'Choisis un dossier.';
 for(const item of choices.filter(x=>String(x.nom).toLocaleLowerCase('fr').includes(q))){list.append(button('📁 '+item.nom,()=>browse(item.id,item.clientId||item.id,item.nom)));}
 for(const b of dialog.querySelectorAll('button'))b.disabled=busy;
 for(const b of dialog.querySelectorAll('.copy-options button'))b.disabled=busy||!context||(operation==='move'&&b.dataset.same==='1');
 dialog.querySelector('.copy-confirm').disabled=busy||!destination||!context||(operation==='move'&&destination===context.parentId);
 dialog.querySelector('[data-up]').hidden=mode!=='folders';
 search.hidden=mode==='same';list.hidden=mode==='same';
}
async function same(){mode='same';choices=[];destination=context.parentId;destinationName=context.parentName;client=context.clientId||'';render();}
async function clients(){
 const token=++sequence;mode='clients';busy=true;destination='';choices=[];render();status('Chargement des clients…');
 try{const result=await rpc('obtenirDossiersClientsPCLeger',[]);if(!valid(token))return;choices=result;status('Choisis le client, puis le dossier de destination.');}
 catch(e){if(valid(token))status(e.message||String(e),true)}finally{if(valid(token)){busy=false;render()}}
}
async function browse(id,clientId,name){
 const token=++sequence;mode='folders';busy=true;destination='';choices=[];render();status('Chargement du dossier…');
 try{const result=await rpc('obtenirDossiersCopieCDQV2522',[id,source.id]);if(!valid(token))return;client=clientId;destination=id;crumbs=result.crumbs||[];destinationName=crumbs.map(x=>x.nom).join(' / ')||name;choices=(result.items||[]).map(x=>({...x,clientId}));status(operation==='move'?'L’élément sera déplacé dans ce dossier.':'La copie sera créée dans ce dossier.');}
 catch(e){if(valid(token))status(e.message||String(e),true)}finally{if(valid(token)){busy=false;render()}}
}

function forgetMoved(result){
 const id=String(result.id||''),clients=[...new Set([result.sourceClientId,result.clientId].filter(Boolean))];
 function remove(tree){if(!tree)return;tree.fichiers=(tree.fichiers||[]).filter(f=>String(f.id)!==id);tree.dossiers=(tree.dossiers||[]).filter(f=>String(f.id)!==id);for(const child of tree.dossiers)remove(child);}
 for(const clientId of clients){try{const tree=cacheContenuCompagnies[clientId];if(tree){remove(tree);cacheDerniereVerificationCompagnies[clientId]=0;sauvegarderCachePersistantClient(clientId,tree,0);}}catch{}}
 for(const el of document.querySelectorAll('.file-checkbox,.folder[data-folder-id]'))if(String(el.dataset.fileId||el.dataset.folderId||'')===id)(el.closest('.file-row')||el.closest('.folder'))?.remove();
}

async function copy(){
 if(busy||!authorized()||!destination)return;
 const token=++sequence;busy=true;render();status(operation==='move'?'Déplacement…':source.kind==='folder'?'Copie du dossier et de son contenu…':'Copie du fichier…');
 try{
  const result=await rpc(operation==='move'?'deplacerElementCDQV2677':'copierElementCDQV2522',[source.id,destination,requestId]);if(!valid(token))return;
  if(!result?.ok)throw Error('L’opération n’a pas été confirmée.');
  if(operation==='move')forgetMoved(result);
  window.dispatchEvent(new CustomEvent(operation==='move'?'cdq:moved':'cdq:copied',{detail:result}));
  if(operation==='copy'&&result.clientId)window.cdqInstantFiles2530.confirm(result,result.clientId,result.destinationId||destination,source);
  busy=false;dialog.close();if(operation==='move'){window.cdqFastFolderLoadV2602?.invalidate?.();const current=typeof compagnieSelectionnee==='undefined'?'':compagnieSelectionnee;if([result.sourceClientId,result.clientId].includes(current))window.cdqClientSpeedV2544?.requestServer(current);}window.afficherMessage?.((operation==='move'?'Élément déplacé : ':'Copie créée : ')+result.nom,true);
 }catch(e){if(valid(token)){status(e.message||String(e),true);busy=false;render();}}
}
async function open(item,action='copy'){
 if(!authorized()){window.afficherErreur?.(Error('Accès en lecture seule.'));return;}
 if(dialog?.open)return;
 operation=action==='move'?'move':'copy';dialog?.remove();dialog=node('dialog');dialog.id='cdqCopyV2522';dialog.setAttribute('aria-labelledby','cdqCopyTitleV2522');
 const title=node('h2','',operation==='move'?'Déplacer':'Créer une copie');title.id='cdqCopyTitleV2522';
 const name=node('p','',item.nom||'Élément'),options=node('div','copy-options');
 const sameOption=button('Dans ce dossier',()=>same());sameOption.dataset.same='1';options.append(sameOption,button('Autre dossier client',()=>clients()));
 const path=node('p','copy-destination'),search=node('input');search.type='search';search.placeholder='Rechercher un client ou un dossier…';search.setAttribute('aria-label',search.placeholder);search.oninput=render;
 const list=node('div','copy-list'),message=node('p','copy-status');message.setAttribute('role','status');
 const up=button('↑ Retour',()=>{search.value='';if(crumbs.length>2){const p=crumbs.at(-2);browse(p.id,client,p.nom)}else clients()});up.dataset.up='';
 const footer=node('footer');footer.append(button('Annuler',()=>{if(!busy)dialog.close()},'copy-cancel'),button(operation==='move'?'Déplacer ici':'Créer la copie',copy,'copy-confirm'));
 dialog.append(title,name,options,path,up,search,list,message,footer);document.body.append(dialog);
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});dialog.addEventListener('close',()=>{sequence++;source=null;context=null;});
 source={...item};owner=account();context=null;destination='';choices=[];mode='same';busy=true;requestId=operation+'-'+crypto.randomUUID();const token=++sequence;dialog.showModal();render();status('Préparation…');
 try{context=await rpc('obtenirContexteCopieCDQV2522',[source.id]);if(!valid(token))return;busy=false;await same();status(operation==='move'?'Choisissez un autre dossier de destination.':'L’original sera conservé.');}
 catch(e){if(valid(token)){busy=false;status(e.message||String(e),true);render()}}
}
function swipeButton(item,action='copy'){const move=action==='move';const b=button(move?'Déplacer':'Copier',e=>{e.stopPropagation();window.cdqCloseSwipes?.();document.querySelectorAll('.cdq-swiped-right,.cdq-swiped-left').forEach(r=>r.classList.remove('cdq-swiped-right','cdq-swiped-left'));open(item,action)},'cdq-swipe-action '+(move?'move':'copy'));const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');path.setAttribute('d','M8 8h13v13H8ZM16 8V3H3v13h5');svg.append(path);b.prepend(svg);b.setAttribute('aria-label',(move?'Déplacer ':'Créer une copie de ')+(item.nom||'cet élément'));window.cdqFileActionsV2655.paint(b,move?'move':'copy');return b;}
window.cdqCopyV2522={open,swipeButton,authorized};
window.addEventListener('cdq:drive-cleared-v2632',()=>{if(dialog?.open)dialog.close()});
window.addEventListener('cdq:access-ready',()=>{if(dialog?.open&&owner!==account())dialog.close()});
})();

