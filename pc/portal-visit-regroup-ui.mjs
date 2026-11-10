export async function openVisitRegroup({body,clientId,valid,rpc,uuid=()=>crypto.randomUUID()}){
 const doc=body.ownerDocument,host=doc.createElement('section');host.dataset.visitRegroup='';host.className='cdq-portal-group-v2815';body.querySelector('[data-visit-regroup]')?.remove();body.append(host);
 let generation=0,state=null,sourceState=null,pending=null,attempted=false;
 const current=()=>valid()&&host.isConnected;
 function element(tag,text){const e=doc.createElement(tag);if(text)e.textContent=text;return e;}
 function button(text,action){const b=element('button',text);b.type='button';b.onclick=action;return b;}
 const title=element('h3','Corriger le classement des visites'),status=element('p','Lecture des visites…');status.setAttribute('role','status');
 const form=element('div'),source=element('select'),target=element('select'),date=element('input'),latest=element('input'),choices=element('div'),review=element('section');
 source.setAttribute('aria-label','Visite de départ');target.setAttribute('aria-label','Visite de destination');date.type='date';date.setAttribute('aria-label','Date de la nouvelle visite');latest.type='checkbox';latest.checked=false;date.hidden=true;
 function labelled(text,input){const label=element('label');label.style.display='block';label.style.margin='12px 0';label.append(element('span',text+' '),input);return label;}
 form.append(labelled('Visite de départ',source),labelled('Visite de destination',target),labelled('Date de la nouvelle visite',date),labelled('Définir la destination comme dernière visite',latest),choices);
 const close=button('Fermer la correction',()=>{generation++;host.remove();});host.append(title,element('p','Choisis les rapports déjà publiés à déplacer. Les PDF et les courriels ne sont pas renvoyés. Une balance déjà présente dans la destination bloque le déplacement.'),status,form,review,close);
 function checkedState(result){if(result?.ok!==true||result.regroupProtocol!==2866||result.clientId!==clientId||!Array.isArray(result.visits)||!Array.isArray(result.documents)||result.visits.length&&!result.head)throw Error('Lecture des visites non confirmée.');return result;}
 function addOption(select,value,text){const o=element('option',text);o.value=value;select.append(o);}
 function destinations(){target.replaceChildren();for(const v of state.visits)if(v.visitId!==source.value)addOption(target,v.visitId,v.date+' — '+v.count+' rapport(s)');addOption(target,'new','Créer une visite distincte');target.value=target.options[0]?.value||'new';date.hidden=target.value!=='new';}
 function freeze(value){for(const input of form.querySelectorAll('input,select,button'))input.disabled=value;}
 async function loadSource(){
  const seq=++generation;sourceState=null;choices.replaceChildren();review.replaceChildren();pending=null;attempted=false;status.textContent='Lecture des rapports de la visite…';freeze(true);
  try{const result=checkedState(await rpc('cdqPrevisualiserRegroupementVisitesV2866',clientId,source.value));if(!current()||seq!==generation)return;if(result.sourceVisitId!==source.value)throw Error('Visite différente.');state=result;sourceState=result;
   for(const d of result.documents){const input=element('input');input.type='checkbox';input.dataset.sourceId=d.sourceId;choices.append(labelled(d.name,input));}
   status.textContent=result.documents.length+' rapport(s). Sélectionne ceux à déplacer.';freeze(false);
  }catch(error){if(current()&&seq===generation){status.textContent=error.message||'Lecture impossible.';source.disabled=false;}}
 }
 source.onchange=()=>{destinations();void loadSource();};target.onchange=()=>{date.hidden=target.value!=='new';};
 const prepare=button('Vérifier la sélection',()=>{
  if(!current()||!sourceState||pending)return;
  const from=sourceState.visits.find(v=>v.visitId===source.value),to=state.visits.find(v=>v.visitId===target.value),isNew=target.value==='new';
  const selected=new Set([...choices.querySelectorAll('input')].filter(i=>i.checked).map(i=>i.dataset.sourceId)),documents=sourceState.documents.filter(d=>selected.has(d.sourceId));
  if(!from||!documents.length||!isNew&&!to){status.textContent='Choisis une visite et au moins un rapport.';return;}
  const value=isNew?date.value:to.date,dt=new Date(value+'T00:00:00Z');if(!/^20\d\d-\d\d-\d\d$/.test(value)||!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==value){status.textContent='Choisis une date valide.';return;}
  pending={requestId:uuid(),clientId,sourceVisitId:from.visitId,sourceRevision:from.revision,targetMode:isNew?'new':'existing',targetVisitId:isNew?uuid():to.visitId,targetRevision:isNew?0:to.revision,targetDate:value,expectedHeadId:sourceState.head.visitId,expectedHeadRevision:sourceState.head.revision,makeLatest:latest.checked,documents:documents.map(d=>({sourceId:d.sourceId,sha256:d.sha256}))};
  freeze(true);review.replaceChildren(element('p',documents.length+' rapport(s) : visite du '+from.date+' → '+(isNew?'nouvelle visite du ':'visite du ')+value+(pending.makeLatest?' — définie comme dernière visite.':'.')));
  const list=element('ul');for(const d of documents)list.append(element('li',d.name));review.append(list);
  const back=button('Modifier la sélection',()=>{if(attempted)return;pending=null;review.replaceChildren();freeze(false);});
  const confirm=button('Confirmer le déplacement',async()=>{
   if(!current()||!pending||confirm.disabled)return;attempted=true;back.disabled=true;confirm.disabled=true;status.textContent='Enregistrement de la correction…';
   try{const receipt=await rpc('cdqCorrigerRegroupementVisitesV2866',clientId,pending);if(!current())return;
    if(receipt?.ok!==true||receipt.regroupProtocol!==2866||receipt.requestId!==pending.requestId||receipt.clientId!==clientId||receipt.sourceVisitId!==pending.sourceVisitId||receipt.targetVisitId!==pending.targetVisitId||receipt.moved!==pending.documents.length||receipt.headRevision!==pending.expectedHeadRevision+1||receipt.headId!==(pending.makeLatest?pending.targetVisitId:pending.expectedHeadId))throw Error('La correction n’est pas encore confirmée.');
    status.textContent=receipt.moved+' rapport(s) déplacé(s). Correction enregistrée.';review.replaceChildren();form.hidden=true;
   }catch(error){if(current()){status.textContent=(error.message||'Réponse interrompue.')+' Vérifie cette même correction ou ferme puis rouvre les visites.';confirm.textContent='Vérifier cette correction';confirm.disabled=false;}}
  });review.append(confirm,back);
 });form.append(prepare);freeze(true);
 try{state=checkedState(await rpc('cdqPrevisualiserRegroupementVisitesV2866',clientId));if(!current())return;
  if(!state.visits.length){status.textContent='Aucune visite publiée.';return;}
  for(const v of state.visits)addOption(source,v.visitId,v.date+' — '+v.count+' rapport(s)');source.value=state.visits[0].visitId;destinations();
  if(state.olderVisitsOmitted)host.append(element('p','Les 100 visites les plus récentes sont proposées.'));
  await loadSource();
 }catch(error){if(current())status.textContent=error.message||'Correction des visites indisponible.';}
 return {host};
}
