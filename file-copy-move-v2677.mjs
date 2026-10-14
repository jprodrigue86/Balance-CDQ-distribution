
import {moveFileSelectionV2727,installPcFileOperationsV2727} from './file-operations-v2727.mjs';
(function(){
'use strict';
let dialog,sequence=0,owner='',source=null,context=null,destination='',destinationName='',client='',crumbs=[],choices=[],busy=false,requestId='',mode='same',operation='copy';
let sources=[],contexts=[],requests=new Map(),completed=new Map(),pcOperations;
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
 for(const b of dialog.querySelectorAll('.copy-options button'))b.disabled=busy||!context||completed.size>0||(operation==='move'&&b.dataset.same==='1');
 dialog.querySelector('.copy-confirm').disabled=busy||!destination||!context||(operation==='move'&&contexts.some(value=>destination===value.parentId));
 if(completed.size){for(const b of dialog.querySelectorAll('.copy-list button,[data-up]'))b.disabled=true;}
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
  let results;
  if(operation==='move')results=await moveFileSelectionV2727(sources,{rpc,destinationId:destination,requests,completed,guard:()=>{if(!valid(token)||!authorized())throw Error('Le compte ou le dossier a changé.');},onProgress:(done,total,item)=>status('Déplacement '+(done+1)+' / '+total+' : '+item.nom+'…'),onConfirmed:result=>{forgetMoved(result);window.dispatchEvent(new CustomEvent('cdq:moved',{detail:result}));}});
  else{const result=await rpc('copierElementCDQV2522',[source.id,destination,requestId]);if(!valid(token))return;if(!result?.ok)throw Error('L’opération n’a pas été confirmée.');results=[result];window.dispatchEvent(new CustomEvent('cdq:copied',{detail:result}));if(result.clientId)window.cdqInstantFiles2530.confirm(result,result.clientId,result.destinationId||destination,source);}
  const multiple=sources.length>1;busy=false;dialog.close();if(operation==='move'){window.cdqFastFolderLoadV2602?.invalidate?.();const current=typeof compagnieSelectionnee==='undefined'?'':compagnieSelectionnee;if(results.some(result=>[result.sourceClientId,result.clientId].includes(current)))window.cdqClientSpeedV2544?.requestServer(current);window.quitterModeSelection?.();}window.afficherMessage?.(operation==='move'?(multiple?results.length+' fichiers déplacés.':'Élément déplacé : '+results[0].nom):'Copie créée : '+results[0].nom,true);
 }catch(e){if(valid(token)){status((completed.size?completed.size+' / '+sources.length+' fichiers déplacés. Réessayez pour terminer. ':'')+(e.message||String(e)),true);busy=false;render();}}
}
async function open(item,action='copy'){
 if(!authorized()){window.afficherErreur?.(Error('Accès en lecture seule.'));return;}
 if(dialog?.open)return;
 operation=action==='move'?'move':'copy';sources=Array.isArray(item)?[...new Map(item.map(value=>[String(value.id),{...value,id:String(value.id)}])).values()]:[{...item,id:String(item.id||'')}];if(!sources.length||sources.some(value=>!value.id)||operation==='copy'&&sources.length>1)return;
 dialog?.remove();dialog=node('dialog');dialog.id='cdqCopyV2522';dialog.setAttribute('aria-labelledby','cdqCopyTitleV2522');
 const title=node('h2','',operation==='move'?'Déplacer':'Créer une copie');title.id='cdqCopyTitleV2522';
 const name=node('p','',sources.length>1?sources.length+' fichiers sélectionnés':sources[0].nom||'Élément'),options=node('div','copy-options');
 const sameOption=button('Dans ce dossier',()=>same());sameOption.dataset.same='1';options.append(sameOption,button('Autre dossier client',()=>clients()));
 const path=node('p','copy-destination'),search=node('input');search.type='search';search.placeholder='Rechercher un client ou un dossier…';search.setAttribute('aria-label',search.placeholder);search.oninput=render;
 const list=node('div','copy-list'),message=node('p','copy-status');message.setAttribute('role','status');
 const up=button('↑ Retour',()=>{search.value='';if(crumbs.length>2){const p=crumbs.at(-2);browse(p.id,client,p.nom)}else clients()});up.dataset.up='';
 const footer=node('footer');footer.append(button('Annuler',()=>{if(!busy)dialog.close()},'copy-cancel'),button(operation==='move'?'Déplacer ici':'Créer la copie',copy,'copy-confirm'));
 dialog.append(title,name,options,path,up,search,list,message,footer);document.body.append(dialog);
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});dialog.addEventListener('close',()=>{sequence++;source=null;context=null;});
 source={...sources[0]};owner=account();context=null;contexts=[];requests=new Map(sources.map(value=>[value.id,operation+'-'+crypto.randomUUID()]));completed=new Map();destination='';choices=[];mode='same';busy=true;requestId=requests.get(source.id);const token=++sequence;dialog.showModal();render();status('Préparation…');
 try{for(const value of sources){const result=await rpc('obtenirContexteCopieCDQV2522',[value.id]);if(!valid(token))return;contexts.push(result);}context=contexts[0];busy=false;await same();status(operation==='move'?'Choisissez un autre dossier de destination.':'L’original sera conservé.');}
 catch(e){if(valid(token)){busy=false;status(e.message||String(e),true);render()}}
}
function swipeButton(item,action='copy'){const move=action==='move';const b=button(move?'Déplacer':'Copier',e=>{e.stopPropagation();window.cdqCloseSwipes?.();document.querySelectorAll('.cdq-swiped-right,.cdq-swiped-left').forEach(r=>r.classList.remove('cdq-swiped-right','cdq-swiped-left'));const selected=move?pcOperations?.selected():null;open(selected?.length>1&&selected.some(value=>value.id===String(item.id))?selected:item,action)},'cdq-swipe-action '+(move?'move':'copy'));const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');path.setAttribute('d','M8 8h13v13H8ZM16 8V3H3v13h5');svg.append(path);b.prepend(svg);b.setAttribute('aria-label',(move?'Déplacer ':'Créer une copie de ')+(item.nom||'cet élément'));window.cdqFileActionsV2655.paint(b,move?'move':'copy');return b;}
window.cdqCopyV2522={open,swipeButton,authorized};
function install(){pcOperations=installPcFileOperationsV2727({rpc,identity:account,authorized,openMove:items=>open(items,'move')});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('cdq:drive-cleared-v2632',()=>{if(dialog?.open)dialog.close()});
window.addEventListener('cdq:access-ready',()=>{if(dialog?.open&&owner!==account())dialog.close()});
})();

