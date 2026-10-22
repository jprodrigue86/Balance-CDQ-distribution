// Company identities are Drive IDs. Equal names never identify one company.
export function installCompanyControlsV2760({window,document,getOwner,canCreate,canTrash,
  getCompanies,readCreation,rpc,onCreated,onTrashed,onRestored,onError,onMessage,
  storage,holdMs=550}={}){
  const owner=()=>String(getOwner()||'').trim().toLowerCase();
  const cleanId=id=>/^[A-Za-z0-9_-]{10,200}$/.test(String(id||''));
  const selected=new Set(),key='cdq-company-requests-v2760';
  let creation=null,mutation=null,gesture=null,swallow=null,lastTrash=null,generation=0;
  const menu=document.getElementById('companyMenu'),list=document.getElementById('companyList');
  if(!menu||!list)throw Error('La liste des compagnies est introuvable.');
  const store=()=>storage||window.localStorage;
  function readRequests(){
    const raw=store().getItem(key);if(!raw)return [];
    let records;try{records=JSON.parse(raw);}catch{throw Error('Le suivi de création doit être récupéré avant une nouvelle demande.');}
    if(!Array.isArray(records)||records.length>100||records.some(r=>!r||typeof r.owner!=='string'||typeof r.name!=='string'||!/^company-[a-f0-9-]{36}$/.test(r.requestId||'')))throw Error('Le suivi de création est invalide.');
    return records;
  }
  function rememberRequest(account,name){
    const records=readRequests(),previous=records.find(r=>r.owner===account&&r.name===name);
    if(previous)return {...previous,retry:true};
    if(records.length>=100)throw Error('Terminez les créations en attente avant de créer une autre compagnie.');
    const record={owner:account,name,requestId:'company-'+window.crypto.randomUUID()};
    store().setItem(key,JSON.stringify([...records,record]));return record;
  }
  function forgetRequest(record){
    const records=readRequests().filter(r=>r.owner!==record.owner||r.requestId!==record.requestId);
    if(records.length)store().setItem(key,JSON.stringify(records));else store().removeItem(key);
  }
  function creationBusy(busy){
    const input=document.getElementById('createFolderInput'),confirm=document.getElementById('createFolderConfirmButton'),cancel=document.getElementById('createFolderCancelButton');
    if(input)input.disabled=busy;if(confirm){confirm.disabled=busy;confirm.textContent=busy?'Création…':'Créer';}if(cancel)cancel.disabled=busy;
  }
  function createCompany(){
    if(creation)return creation.promise;
    const account=owner(),entry=readCreation(),name=String(entry?.name||'').trim();
    if(!entry?.visible||entry.parentId||entry.bulk)return Promise.resolve(null);
    if(!account||!canCreate()){onError(Error('Accès en écriture requis.'));return Promise.resolve(null);}
    if(!name||name.length>200){onError(Error(!name?'Le nom du dossier ne peut pas être vide.':'Le nom du dossier est trop long.'));return Promise.resolve(null);}
    let request;try{request=rememberRequest(account,name);}catch(error){onError(error);return Promise.resolve(null);}
    const flight={account,generation,request,promise:null};creation=flight;creationBusy(true);
    flight.promise=(async()=>{
      try{
        const result=await rpc('creerDossierClient',[name,request.requestId]);
        if(owner()!==account||generation!==flight.generation||!canCreate())return null;
        if(!result||!cleanId(result.id)||result.requestId!==request.requestId||result.owner!==account||result.trashed===true)throw Error(result?.trashed?'Cette compagnie est dans la corbeille. Restaurez-la au besoin.':'Le serveur n’a pas confirmé cette création. Réessayez la même demande.');
        onCreated(result);forgetRequest(request);
        onMessage(result.reused||request.retry?'Compagnie retrouvée et ajoutée à la liste.':'Compagnie créée avec succès.',true);
        return result;
      }catch(error){if(owner()===account&&generation===flight.generation)onError(error);return null;}
      finally{if(creation===flight){creation=null;creationBusy(false);}}
    })();return flight.promise;
  }
  const style=document.createElement('style');style.id='cdq-company-controls-v2760-style';
  style.textContent='#companyList.cdq-company-selecting-v2760{box-sizing:border-box!important;padding-bottom:78px!important}#companyList .cdq-company-selected-v2760{background:rgba(68,158,222,.24)!important;outline:2px solid #61b9ef;outline-offset:-2px}.cdq-company-check-v2760{display:none;flex:0 0 25px;font:700 21px/1 sans-serif;color:#74c9ff}.cdq-company-selecting-v2760 .cdq-company-check-v2760{display:inline-block}#cdqCompanySelectionV2760{position:absolute;left:0;right:0;bottom:0;z-index:4;display:flex;align-items:center;gap:10px;min-height:58px;padding:8px 12px;background:#142536;color:#eff7ff;border-top:1px solid #55758e;box-sizing:border-box}#cdqCompanySelectionV2760[hidden]{display:none!important}#cdqCompanySelectionV2760 span{flex:1}#cdqCompanySelectionV2760 button{min-width:44px;min-height:44px;border:1px solid #71899d;border-radius:8px;background:#243f55;color:inherit;font:inherit;touch-action:manipulation}#cdqCompanyTrashV2760{color:#ff97a6!important}#cdqCompanyTrashV2760 svg{width:25px;height:25px;vertical-align:middle}#cdqCompanyRestoreV2760{margin:8px 12px;min-height:44px}';
  document.head.append(style);
  const bar=document.createElement('div');bar.id='cdqCompanySelectionV2760';bar.hidden=true;bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Compagnies sélectionnées');
  const count=document.createElement('span');count.setAttribute('role','status');count.setAttribute('aria-live','polite');
  const trash=document.createElement('button');trash.id='cdqCompanyTrashV2760';trash.type='button';trash.title='Envoyer les compagnies sélectionnées à la corbeille';trash.setAttribute('aria-label',trash.title);
  trash.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 3h8l1 3h4v2H3V6h4l1-3Zm-3 7h14l-1 11H6L5 10Zm4 1v8h2v-8H9Zm4 0v8h2v-8h-2Z"/></svg>';
  const finish=document.createElement('button');finish.type='button';finish.textContent='Terminer';
  bar.append(count,trash,finish);menu.append(bar);
  const restore=document.createElement('button');restore.id='cdqCompanyRestoreV2760';restore.type='button';restore.textContent='Restaurer';restore.title='Restaurer les compagnies envoyées à la corbeille';restore.hidden=true;bar.insertBefore(restore,finish);
  function rows(){return [...list.querySelectorAll('.cdq-company-row[data-company-id]')];}
  function paint(){
    const active=selected.size>0&&canTrash(),undo=lastTrash?.owner===owner()&&canTrash();list.classList.toggle('cdq-company-selecting-v2760',active||undo);bar.hidden=!active&&!undo;
    count.textContent=active?selected.size+(selected.size===1?' compagnie sélectionnée':' compagnies sélectionnées'):(lastTrash?.ids.length||0)+' compagnie(s) à la corbeille';
    trash.disabled=finish.disabled=!!mutation;trash.hidden=!active;restore.disabled=!!mutation;restore.hidden=active||!undo;finish.textContent=active?'Terminer':'Fermer';
    for(const row of rows()){
      const id=String(row.dataset.companyId||''),checked=selected.has(id);row.tabIndex=0;row.setAttribute('role','option');row.setAttribute('aria-selected',String(checked));row.classList.toggle('cdq-company-selected-v2760',checked);
      let icon=row.querySelector('.cdq-company-check-v2760');if(!icon){icon=document.createElement('span');icon.className='cdq-company-check-v2760';icon.setAttribute('aria-hidden','true');row.prepend(icon);}icon.textContent=checked?'☑':'☐';
    }
  }
  function clear(){selected.clear();paint();}
  function toggle(id){if(mutation||!canTrash()||!cleanId(id)||!(getCompanies()||[]).some(c=>String(c.id)===id))return;selected.has(id)?selected.delete(id):selected.add(id);paint();}
  const rowFrom=target=>target?.closest?.('.cdq-company-row[data-company-id]');
  function cancelGesture(){if(gesture?.timer)window.clearTimeout(gesture.timer);gesture=null;}
  menu.addEventListener('pointerdown',event=>{
    cancelGesture();const row=rowFrom(event.target);if(!row||event.target.closest('button')||!canTrash()||mutation||event.button>0)return;
    const current={id:String(row.dataset.companyId),pointer:event.pointerId,x:event.clientX,y:event.clientY,row,timer:null};gesture=current;
    current.timer=window.setTimeout(()=>{if(gesture!==current||!row.isConnected)return;selected.add(current.id);swallow={id:current.id,until:Date.now()+1200};paint();},holdMs);
  },true);
  menu.addEventListener('pointermove',event=>{if(gesture&&event.pointerId===gesture.pointer&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>12)cancelGesture();},true);
  for(const name of ['pointerup','pointercancel','scroll'])menu.addEventListener(name,cancelGesture,true);
  menu.addEventListener('contextmenu',event=>{const row=rowFrom(event.target);if(!row||!canTrash()||mutation)return;event.preventDefault();event.stopImmediatePropagation();selected.add(String(row.dataset.companyId));paint();},true);
  menu.addEventListener('click',event=>{
    const row=rowFrom(event.target);if(!row||event.target.closest('button'))return;const id=String(row.dataset.companyId);
    if(swallow?.id===id&&Date.now()<swallow.until){swallow=null;event.preventDefault();event.stopImmediatePropagation();return;}
    if(selected.size&&canTrash()){event.preventDefault();event.stopImmediatePropagation();toggle(id);}
  },true);
  menu.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&selected.size){event.preventDefault();event.stopImmediatePropagation();clear();return;}
    const row=rowFrom(event.target);if(!row||event.target.closest('button'))return;
    if(event.key===' '||event.key==='Enter'&&selected.size){event.preventDefault();event.stopImmediatePropagation();toggle(String(row.dataset.companyId));}
    else if(event.key==='Enter'){event.preventDefault();row.click();}
  },true);
  async function mutate(trashing,ids){
    if(mutation||!canTrash()||!ids.length)return null;
    const account=owner(),stamp=generation;
    const names=ids.map(id=>(getCompanies()||[]).find(c=>String(c.id)===id)?.nom||lastTrash?.names?.[id]||'Compagnie');
    const question=trashing?'Envoyer '+ids.length+(ids.length===1?' compagnie et son contenu':' compagnies et leur contenu')+' à la corbeille ?\n\n'+names.slice(0,8).join('\n')+(names.length>8?'\n…':'')+'\n\nLa restauration restera possible.':'Restaurer '+ids.length+(ids.length===1?' compagnie':' compagnies')+' depuis la corbeille ?';
    if(!window.confirm(question))return null;
    if(owner()!==account||generation!==stamp||!canTrash())return null;
    const flight={account,stamp};mutation=flight;paint();
    try{
      const result=await rpc(trashing?'supprimerCompagniesV2760':'restaurerCompagniesV2760',[{ids,owner:account}]);
      if(owner()!==account||generation!==stamp||!canTrash())return null;
      if(result?.owner!==account||result?.trash!==trashing||!Array.isArray(result?.dossiers)||result.dossiers.some(id=>!ids.includes(id))||new Set(result.dossiers).size!==result.dossiers.length)throw Error('La corbeille n’a pas confirmé ces compagnies.');
      const confirmed=result.dossiers;
      if(confirmed.length){
        if(trashing){lastTrash={owner:account,ids:confirmed.slice(),names:Object.fromEntries(ids.map((id,i)=>[id,names[i]]))};onTrashed(confirmed);}
        else{onRestored(confirmed);if(lastTrash)lastTrash.ids=lastTrash.ids.filter(id=>!confirmed.includes(id));if(!lastTrash?.ids.length)lastTrash=null;}
        for(const id of confirmed)selected.delete(id);
      }
      if(confirmed.length!==ids.length||result.complete!==true){const error=Error((result.erreurs||[]).map(e=>e.message).filter(Boolean).join('\n')||'Certaines compagnies restent à vérifier.');onError(error);}
      else onMessage(confirmed.length+(confirmed.length===1?' compagnie ':' compagnies ')+(trashing?'envoyée'+(confirmed.length===1?'':'s')+' à la corbeille.':'restaurée'+(confirmed.length===1?'':'s')+'.'),true);
      return result;
    }catch(error){if(owner()===account&&generation===stamp)onError(error);return null;}
    finally{if(mutation===flight){mutation=null;paint();}}
  }
  trash.onclick=()=>mutate(true,[...selected]);finish.onclick=()=>{if(!selected.size)lastTrash=null;clear();};restore.onclick=()=>mutate(false,lastTrash?.ids?.slice()||[]);
  const observer=new window.MutationObserver(paint);observer.observe(list,{childList:true});
  function reset(){generation++;creation=null;mutation=null;lastTrash=null;swallow=null;cancelGesture();clear();creationBusy(false);}
  window.addEventListener('cdq:drive-cleared-v2632',reset);
  window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')reset();else paint();});
  paint();return {createCompany,busy:()=>!!creation,selected:()=>[...selected],clear,reset,refresh:paint};
}
