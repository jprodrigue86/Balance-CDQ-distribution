// PC actions retain native permissions, RPC contracts and confirmation dialogs.
import {openCopyJournalV2797} from './copy-journal-v2797.mjs';
const root=document.documentElement,pc=()=>root.classList.contains('cdq-desktop-v2676');
let menu=null,busy=false,lastDone={key:'',at:0};
const account=()=>String(typeof utilisateurCourantEmail==='undefined'?'':utilisateurCourantEmail||'').trim().toLowerCase();
const allowed=()=>window.cdqCopyV2522?.authorized()===true;
const selected=()=>[...document.querySelectorAll('.file-checkbox:checked')].map(box=>({id:String(box.dataset.fileId),nom:box.dataset.fileName||box.closest('.file-row')?.dataset.fileName||'Fichier',kind:'file'}));
const itemOf=row=>{const box=row.querySelector('.file-checkbox');return {id:String(box?.dataset.fileId||row.dataset.folderSelectId||row.closest('.folder')?.dataset.folderId||''),nom:row.dataset.fileName||row.querySelector('.file-name,.folder-name-text')?.textContent||'Élément',kind:box?'file':'folder'};};
const targets=row=>{const item=itemOf(row),group=selected();return item.kind==='file'&&group.some(x=>x.id===item.id)?group:[item];};
function close(focus=false){const owner=menu?.owner;menu?.remove();menu=null;if(focus)owner?.focus();}
function rpc(name,args,owner){return new Promise((resolve,reject)=>{cdqApiRun().withSuccessHandler(result=>account()===owner?resolve(result):reject(Error('Le compte a changé.'))).withFailureHandler(reject)[name](...args);});}
async function duplicate(items){
 if(busy||!allowed()||items.some(x=>x.kind!=='file'||!x.id))return;
 const owner=account(),destination=String(typeof cdqDestinationCreationId==='function'?cdqDestinationCreationId():typeof compagnieSelectionnee==='undefined'?'':compagnieSelectionnee||'');
 if(!destination)return;
 const key='cdqDuplicateV2797:'+owner+':'+destination+':'+items.map(x=>x.id).sort().join(',');
 if(lastDone.key===key&&Date.now()-lastDone.at<1000)return;
 let job;
 try{job=openCopyJournalV2797(sessionStorage,key,{owner,destination,items});}
 catch(error){window.afficherErreur?.(error);return;}
 busy=true;
 try{
  for(const item of items){
   if(job.completed().has(item.id))continue;
   if(!allowed()||account()!==owner)throw Error('Le compte a changé.');
   window.afficherMessage?.('Duplication '+(job.completed().size+1)+' / '+items.length+'…',false);
   const request=job.start(item.id);
   const result=await rpc('copierElementCDQV2522',[item.id,destination,request],owner);
   job.confirm(item.id,result);
   if(result.clientId)window.cdqInstantFiles2530?.confirm(result,result.clientId,destination,item);
   window.dispatchEvent(new CustomEvent('cdq:copied',{detail:result}));
  }
  job.finish();lastDone={key,at:Date.now()};window.afficherMessage?.(items.length+' fichier(s) dupliqué(s).',true);
 }catch(error){window.afficherErreur?.(error);}finally{busy=false;}
}
function open(row,point){
 if(!pc())return;close();
 const group=targets(row),folderGroup=window.obtenirDossiersSelectionnes?.()||[];
 const originals=[...row.querySelectorAll(':scope > .cdq-swipe-overlay > button')].filter(b=>!b.hidden);
 menu=document.createElement('div');menu.id='cdqPcFileMenu';menu.owner=row;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Actions du fichier');
 function add(label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.setAttribute('role','menuitem');b.onclick=e=>{e.preventDefault();e.stopPropagation();close();fn();};menu.append(b);}
 const files=group.length&&group.every(x=>x.kind==='file');
 if(allowed()){
  add('Dupliquer',()=>duplicate(group),!files||busy||folderGroup.length>0);
  add('Copier',()=>window.cdqCopyV2522.open(group,'copy'),busy||folderGroup.length>0);
  add('Déplacer',()=>window.cdqCopyV2522.open(group,'move'),busy||folderGroup.length>0);
 }
 for(const original of originals){
  if(original.classList.contains('copy')||original.classList.contains('move'))continue;
  const label=original.classList.contains('delete')?'Corbeille':original.querySelector('.cdq-action-label-v2655')?.textContent||original.textContent||original.getAttribute('aria-label');
  add(label,()=>original.click(),original.disabled);
 }
 if(!menu.children.length){close();return;}
 document.body.append(menu);const r=point||row.getBoundingClientRect();
 menu.style.left=Math.max(8,Math.min(point?r.x:r.right-menu.offsetWidth,innerWidth-menu.offsetWidth-8))+'px';
 menu.style.top=Math.max(8,Math.min(point?r.y:r.bottom+6,innerHeight-menu.offsetHeight-8))+'px';
 menu.onkeydown=e=>{const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){e.preventDefault();close(true);}};
 menu.querySelector('button:not(:disabled)')?.focus();
}
function refresh(){
 if(!pc())return;
 const actions=document.getElementById('cdqClientActionsV2640'),report=actions?.querySelector('[data-client-report]');
 let cancel=document.getElementById('cdqPcCancelV2797');
 if(report&&!cancel){cancel=document.createElement('button');cancel.type='button';cancel.id='cdqPcCancelV2797';cancel.textContent='Annuler';cancel.onclick=()=>window.quitterModeSelection?.();report.after(cancel);}
 if(cancel)cancel.hidden=!(typeof modeSelectionFichiers!=='undefined'&&modeSelectionFichiers);
 const area=document.getElementById('sendArea'),container=document.querySelector('body > .container,.container');
 if(area&&container){const visible=getComputedStyle(area).display!=='none';container.style.setProperty('--cdq-send-space-v2797',visible?'78px':'0px');}
}
if(pc()){
 window.cdqDesktopActionsV2797={open,close,refresh,duplicate};
 let pending=false;const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});};
 const update=window.mettreAJourInterface;if(typeof update==='function')window.mettreAJourInterface=function(...args){const r=update.apply(this,args);refresh();return r;};
 document.addEventListener('change',schedule);document.addEventListener('click',schedule);
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('#cdqClientActionsV2640,[data-client-report]')||n.querySelector?.('#cdqClientActionsV2640,[data-client-report]')))))schedule();}).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target))close();},true);
 window.addEventListener('resize',()=>{close();schedule();});
 window.addEventListener('cdq:drive-cleared-v2632',()=>close());window.addEventListener('cdq:access-ready',()=>{close();schedule();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
}
