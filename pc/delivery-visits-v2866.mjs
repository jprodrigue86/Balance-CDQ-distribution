import {calibrationRpc} from './calibration-feedback-v2566.mjs';
export function installDeliveryVisits(doc=document,{readState=id=>calibrationRpc('cdqLireVisitesClientV2866',id),uuid=()=>crypto.randomUUID(),today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}}={}){
 const host=doc.getElementById('cdqVisitChoiceV2866'),select=doc.getElementById('cdqVisitModeV2866'),date=doc.getElementById('cdqVisitDateV2866'),info=doc.getElementById('cdqVisitInfoV2866');
 let generation=0,head=null,client='',newId='',ready=false,isCurrent=()=>false;
 const notify=()=>{doc.defaultView?.cdqDeliveryActionsV2866?.render();};
 function render(){
  if(select.value==='continue'&&head){date.value=head.date;date.disabled=true;info.textContent='Ajouter les rapports sélectionnés à la visite du '+head.date+' ('+head.count+' déjà publiés).';}
  else{date.disabled=!ready;if(ready)info.textContent='Créer une nouvelle visite avec les seuls rapports sélectionnés. Les visites précédentes seront conservées.';}
  select.disabled=!ready;notify();
 }
 select.addEventListener('change',()=>{if(select.value==='new')date.value=today();render();});
 async function open(clientId,guard=()=>true){
  const token=++generation;client=clientId;isCurrent=guard;head=null;newId=uuid();ready=false;info.textContent='Lecture de la dernière visite…';select.replaceChildren();date.value=today();render();
  try{
   const result=await readState(clientId);if(token!==generation||!guard())return;
   if(result?.ok!==true||result.clientId!==clientId||result.visitProtocol!==2866||result.head!==null&&(!result.head||typeof result.head.visitId!=='string'||!Number.isSafeInteger(result.head.revision)||result.head.revision<1||!/^20\d\d-\d\d-\d\d$/.test(result.head.date)))throw Error('La dernière visite n’est pas confirmée.');
   head=result.head;
   for(const [value,label] of [...(head?[['continue','Continuer la visite du '+head.date]]:[]),['new','Nouvelle visite']]){const o=doc.createElement('option');o.value=value;o.textContent=label;select.append(o);}
   // A suggestion only. Publishing still requires explicit confirmation.
   const last=head?new Date(head.updatedAt):null,next=last?new Date(last):null;
   if(next){const day=next.getUTCDate();next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+1);const lastDay=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();next.setUTCDate(Math.min(day,lastDay));}
   select.value=head&&next&&Number.isFinite(next.getTime())&&today()<next.toISOString().slice(0,10)?'continue':'new';ready=true;render();
  }catch(error){if(token!==generation||!guard())return;ready=false;info.textContent=error.message||'Lecture de visite impossible. Le courriel seul reste disponible.';render();}
 }
 function read(){
  if(!ready||!isCurrent())throw Error('La visite n’est pas confirmée. Rouvrez la confirmation ou choisissez le courriel seul.');
  const value=date.value,parsed=new Date(value+'T00:00:00.000Z');
  if(!/^20\d\d-\d\d-\d\d$/.test(value)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)throw Error('Choisissez une date de visite valide.');
  return {mode:select.value,visitId:select.value==='continue'?head.visitId:newId,date:value,expectedHeadId:head?.visitId||'',expectedHeadRevision:head?.revision||0};
 }
 return {open,read,get ready(){return ready&&isCurrent();},show:publish=>{host.hidden=!publish;}};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&document.getElementById('cdqVisitChoiceV2866'))window.cdqDeliveryVisitsV2866=installDeliveryVisits();
