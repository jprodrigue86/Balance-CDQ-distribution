// CDQ V28.04. Authenticated app controls only: this module is NOT imported by the public QR portal.
// Removing a PDF hides a document from the client portal; historical Drive archives are unchanged.
const DOC=/^[a-f0-9]{64}$/;
export function normalizePortalPageV2804(response){
 if(!response||response.ok!==true||!Array.isArray(response.documents)||response.documents.length>100)throw Error('Réponse de la page client invalide.');
 const documents=response.documents.map(d=>{
  if(!d||!DOC.test(String(d.documentId||''))||typeof d.name!=='string'||d.name.length>220||!Number.isSafeInteger(d.size)||d.size<0||!Number.isSafeInteger(d.createdAt))throw Error('Document client invalide.');
  return {documentId:d.documentId,name:d.name,size:d.size,createdAt:d.createdAt};
 });
 const next=response.next;
 if(next!=null&&(!Number.isSafeInteger(next.before)||next.before<0||!DOC.test(String(next.after||''))))throw Error('Pagination invalide.');
 return {documents,next:next||null};
}
export function selectedBatchV2804(selected,documents){
 const valid=new Set(documents.map(d=>d.documentId)),array=[...selected];
 if(!array.length||array.length>20||array.some(x=>!DOC.test(x)||!valid.has(x)))throw Error('Sélection invalide ou trop grande.');
 return array;
}
function button(text,click,className=''){
 const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=click;
 b.className='cdq-portal-manage-button-v2815';
 if(className)b.className=className;
 return b;
}
export async function openPortalManagementV2804({body,clientId,valid,rpc}){
 if(!valid()||typeof rpc!=='function')return;
 let panel=body.querySelector('[data-cdq-portal-manage-v2804]');
 if(panel){panel.hidden=!panel.hidden;return;}
 panel=document.createElement('section');panel.dataset.cdqPortalManageV2804='1';panel.className='cdq-portal-group-v2815';
 const title=document.createElement('h3');title.textContent='Rapports publiés';title.style.cssText='font-size:17px;margin:0 0 8px';
 const note=document.createElement('p');note.textContent='Sélectionne les rapports à retirer de la page client. Les archives Drive et les pièces jointes déjà envoyées restent conservées.';
 note.style.cssText='font-size:13px;color:var(--cdq-muted,#b6c0c9);line-height:1.4';
 const status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='font-size:13px';status.textContent='Chargement des rapports…';
 const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;gap:5px;flex-wrap:wrap;align-items:center';
 const list=document.createElement('div');list.setAttribute('role','group');list.setAttribute('aria-label','Rapports publiés pour ce client');list.style.cssText='max-height:330px;overflow:auto;margin:9px 0';
 const confirm=document.createElement('div');confirm.hidden=true;confirm.style.cssText='padding:12px;border:1px solid #c77b6f;border-radius:8px;background:#48252a;margin:10px 0';
 const selected=new Set();let docs=[],next=null,busy=false,removing=false;
 const selectAll=button('Sélectionner jusqu’à 20',()=>{for(const d of docs){if(selected.size>=20)break;selected.add(d.documentId);}render()});
 const deselect=button('Annuler la sélection',()=>{selected.clear();render()});
 const remove=button('Retirer la sélection (0)',()=>askConfirm());
 const refresh=button('Actualiser la liste',()=>load(true));
 const more=button('Afficher la suite',()=>load(false));more.hidden=true;
 toolbar.append(selectAll,deselect,remove,refresh);
 panel.append(title,note,status,toolbar,list,more,confirm);
 body.append(panel);panel.setAttribute('aria-label','Gestion des rapports publiés');
 function controls(){
  remove.textContent='Retirer la sélection ('+selected.size+')';
  remove.disabled=!selected.size||removing||busy;
  selectAll.disabled=removing||busy||selected.size>=20;
  deselect.disabled=!selected.size||removing;
  refresh.disabled=removing||busy;
  more.disabled=removing||busy;
 }
 function render(){
  if(!valid())return;
  list.replaceChildren();
  for(const d of docs){
   const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;padding:9px 4px;border-bottom:1px solid var(--cdq-line,#647079)';
   const label=document.createElement('label');label.style.cssText='display:flex;gap:10px;align-items:center;flex:1;min-width:0;cursor:pointer';
   const box=document.createElement('input');box.type='checkbox';box.checked=selected.has(d.documentId);box.disabled=removing;
   box.style.cssText='width:22px;padding:0;min-width:22px;min-height:22px;accent-color:var(--cdq-accent,#c2cbd1)';
   box.setAttribute('aria-label','Sélectionner '+d.name);
   box.onchange=()=>{if(box.checked){if(selected.size>=20){box.checked=false;status.textContent='20 rapports maximum par suppression.';return;}selected.add(d.documentId)}else selected.delete(d.documentId);confirm.hidden=true;controls()};
   const details=document.createElement('span');details.style.cssText='display:flex;flex-direction:column;min-width:0;overflow-wrap:anywhere';
   const name=document.createElement('strong');name.textContent=d.name;
   const meta=document.createElement('small');meta.style.cssText='color:var(--cdq-muted,#b6c0c9)';meta.textContent=new Date(d.createdAt).toLocaleDateString('fr-CA')+' · '+Math.ceil(d.size/1024)+' Ko';
   details.append(name,meta);label.append(box,details);
   const trash=button('Retirer',()=>{selected.clear();selected.add(d.documentId);render();askConfirm()});
   trash.title='Retirer '+d.name+' de la page client';trash.setAttribute('aria-label','Retirer '+d.name);
   trash.disabled=removing;row.append(label,trash);list.append(row);
  }
  more.hidden=!next;
  status.textContent=docs.length?docs.length+' rapport(s) affiché(s).':'Aucun PDF publié pour le moment.';
  controls();
 }
 async function load(reset){
  if(busy||removing||!valid())return;
  busy=true;refresh.textContent='Actualiser la liste';list.setAttribute('aria-busy','true');controls();status.textContent='Lecture des rapports…';
  try{
   const result=await rpc('cdqClientPortalManagementV2804','list',{clientId,...(!reset&&next?next:{})});
   if(!valid())return;
   const page=normalizePortalPageV2804(result);
   if(reset){docs=[];selected.clear();}
   const already=new Set(docs.map(d=>d.documentId));
   docs.push(...page.documents.filter(d=>!already.has(d.documentId)));next=page.next;
   render();
  }catch(e){if(valid()){status.textContent=e?.message||'Lecture indisponible. Aucun rapport modifié.';refresh.textContent='Réessayer la lecture';}}
  finally{busy=false;if(valid()){list.setAttribute('aria-busy','false');controls();}}
 }
 function askConfirm(){
  if(removing||busy||!valid())return;
  let ids;try{ids=selectedBatchV2804(selected,docs);}catch(e){status.textContent=e.message;return;}
  confirm.replaceChildren();
  const ask=document.createElement('p');ask.textContent='Retirer '+ids.length+' rapport(s) de la page client ? Cette action n’efface pas les archives Drive.';
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  const yes=button('Confirmer le retrait',async()=>{
   if(removing||!valid())return;
   removing=true;controls();yes.disabled=true;no.disabled=true;
   try{
    const r=await rpc('cdqClientPortalManagementV2804','removeMany',{clientId,documentIds:ids});
    if(!valid())return;
    confirm.hidden=true;
    const complete=!!r&&r.ok===true&&r.removed===ids.length;
    selected.clear();removing=false;
    await load(true);
    if(valid())status.textContent=complete?ids.length+' rapport(s) retiré(s) du portail.':'Suppression partielle ou non confirmée. Liste relue.';
   }catch(e){if(valid())status.textContent='Suppression non confirmée. '+(e?.message||'Aucune confirmation reçue.');}
   finally{removing=false;if(valid())controls();}
  });
  const no=button('Annuler',()=>{confirm.hidden=true});
  actions.append(yes,no);confirm.append(ask,actions);confirm.hidden=false;
  confirm.scrollIntoView({block:'nearest',behavior:'auto'});
 }
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));if(valid())await load(true);
}
