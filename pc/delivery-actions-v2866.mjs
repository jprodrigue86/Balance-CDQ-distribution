import './delivery-visits-v2866.mjs';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
export function validActions(a){return !!a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===2&&typeof a.publish==='boolean'&&typeof a.email==='boolean'&&(a.publish||a.email);}
export function assertTicket(ticket,selected,visit){
 const actions=ticket?.plan?.actionsV2866;
 if(ticket?.capabilities?.actionsProtocol!==2866||!validActions(actions)||!validActions(selected)||actions.publish!==selected.publish||actions.email!==selected.email)
  throw Object.assign(Error('Les actions choisies ne sont pas confirmées par le serveur. Aucun traitement lancé.'),{code:'DELIVERY_ACTIONS_UNCONFIRMED'});
 if(selected.publish&&(ticket.capabilities.visitProtocol!==2866||!visit||!ticket.plan.visitV2866||Object.keys(ticket.plan.visitV2866).length!==5||!['mode','visitId','date','expectedHeadId','expectedHeadRevision'].every(k=>ticket.plan.visitV2866[k]===visit[k]))||!selected.publish&&Object.prototype.hasOwnProperty.call(ticket.plan,'visitV2866'))throw Object.assign(Error('La visite choisie n’est pas confirmée par le serveur.'),{code:'VISIT_UNCONFIRMED'});
}
export function complete(result){
 if(!result||result.status!=='complete')return false;
 if(!own(result,'actionsV2866'))return result.mailSent===true&&result.portalDone===true;
 const actions=result.actionsV2866;
 return result.actionsProtocol===2866&&validActions(actions)&&result.archiveDone===true&&(!actions.email||result.mailSent===true)&&(!actions.publish||result.portalDone===true&&result.visitDone===true&&typeof result.visitId==='string'&&result.visitId.length>=8);
}
export function installDeliveryActions(doc=document){
 const publish=doc.getElementById('cdqPublishV2866'),email=doc.getElementById('cdqEmailV2866'),modal=doc.getElementById('modalOverlay');
 if(!publish||!email||!modal)throw Error('Les options de livraison ne sont pas disponibles.');
 const button=modal.querySelector('.confirm-button');
 function read(){const a={publish:publish.checked===true,email:email.checked===true};if(!validActions(a))throw Error('Choisissez publier, envoyer par courriel, ou les deux.');return a;}
 function render(){
  const p=publish.checked===true,e=email.checked===true;
  const visits=doc.defaultView?.cdqDeliveryVisitsV2866;visits?.show(p);button.disabled=!p&&!e||p&&!visits?.ready;button.textContent=p?(e?'Convertir, publier et envoyer':'Convertir et publier'):'Convertir et envoyer';
  for(const id of ['emailDestinataire','messageEmail']){const field=doc.getElementById(id);if(field){field.disabled=!e;field.closest('.modal-section').hidden=!e;}}
  for(const id of ['cdqSendSaveRecipientV2553','cdqSendRecipientStatusV2553']){const field=doc.getElementById(id);if(field)field.hidden=!e;}
  const help=doc.getElementById('sendModeHelp');if(help)help.textContent=e?'Les PDF non modifiables sélectionnés seront archivés et joints en ZIP au courriel (24 Mio maximum).'+(p?' Ils seront aussi publiés.':' Aucune publication.'):'Les PDF non modifiables sélectionnés seront archivés et publiés. Aucun courriel.';
  const extra=doc.getElementById('cdqSendPdfHelpV2750');if(extra)extra.textContent='Les sources restent modifiables. Les mêmes copies finales sont utilisées pour les actions choisies.';
  const section=modal.querySelector('.send-mode-section');
  if(section){const label=section.querySelector(':scope > label');if(label)label.textContent='Copies finales';const strong=section.querySelector('strong'),small=section.querySelector('small');if(strong)strong.textContent='PDF non modifiables';if(small)small.textContent='Seulement les documents de votre sélection.';}
 }
 function reset(){publish.checked=true;email.checked=false;render();}
 publish.addEventListener('change',render);email.addEventListener('change',render);
 reset();return {read,render,reset,assertTicket,complete,validActions};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&document.getElementById('cdqPublishV2866'))window.cdqDeliveryActionsV2866=installDeliveryActions();
