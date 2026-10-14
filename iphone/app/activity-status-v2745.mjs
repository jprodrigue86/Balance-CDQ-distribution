// One truthful action status. No guessed percentages or perpetual animation.
export function activityMessageV2745(text,success=false){
 const value=String(text||'').trim(),fold=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!value)return {text:'',kind:'idle'};
 if(/erreur|non confirm|impossible|echec|refuse|invalide|interromp|ne repond pas/.test(fold))return {text:value,kind:'error'};
 if(/en attente|conserve sur cet appareil|conserve.*local|hors ligne/.test(fold))return {text:value,kind:'pending'};
 if(success)return {text:value,kind:'success'};
 if(/^(?:chargement|ouverture|preparation|creation|copie|duplication|synchronisation|telechargement|import|envoi|conversion|transfert|enregistrement|actualisation|verification|lecture|suppression|restauration|ajustement|ajout|retrait)\b/.test(fold)&&!/(?:termine[es]*|cree[es]*|enregistre[es]*|supprime[es]*|renomme[es]*|pret[es]*|avec succes)\b/.test(fold))return {text:value,kind:'working'};
 return {text:value,kind:'notice'};
}

export function installActivityStatusV2745({host=window,doc=document,clock=host,confirmationAfter=45000}={}){
 const P={seq:0,active:false,value:0,label:'',failed:false,kind:'idle',waiting:false};let hide=null,watch=null;
 function box(){let node=doc.getElementById('cdqGlobalProgressV2293');if(!node){node=doc.createElement('div');node.id='cdqGlobalProgressV2293';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.innerHTML='<span class="cdq-progress-label"></span>';const files=doc.getElementById('filesContainer');if(files?.parentNode)files.parentNode.insertBefore(node,files);else doc.body.append(node);}return node;}
 function paint(){const node=box();node.querySelector('.cdq-progress-label').textContent=P.label;node.classList.toggle('show',!!P.label);node.classList.toggle('failed',P.failed);node.dataset.activityKind=P.kind;node.setAttribute('aria-busy',String(P.active));}
 function clearHide(){if(hide!==null)clock.clearTimeout(hide);hide=null;if(watch!==null)clock.clearTimeout(watch);watch=null;}
 function message(text,kind){clearHide();P.label=String(text||'');P.kind=kind;P.active=kind==='working';P.waiting=false;P.failed=kind==='error';paint();if(['success','notice'].includes(kind))hide=clock.setTimeout(()=>{hide=null;P.label='';P.kind='idle';paint();},2500);if(P.active){const seq=P.seq;watch=clock.setTimeout(()=>{watch=null;if(seq!==P.seq||!P.active)return;P.active=false;P.waiting=true;P.kind='pending';P.label+=' — confirmation en attente.';paint();},confirmationAfter);}}
 function start(label){P.seq++;message(label||'Chargement…','working');return P.seq;}
 function set(_value,label){if(label)message(label,P.active?'working':P.kind);return P.seq;}
 function done(label,seq){if(seq&&seq!==P.seq||P.failed||!P.active&&!P.waiting)return;message(label||'Terminé','success');}
 function fail(label,seq){if(seq&&seq!==P.seq)return;message(label||'Erreur','error');}
 function announce(text,success){const entry=activityMessageV2745(text,success);if(entry.kind==='working')start(entry.text);else{P.seq++;message(entry.text,entry.kind);}}
 function reset(){clearHide();P.seq++;P.label='';P.kind='idle';P.active=P.failed=P.waiting=false;paint();}
 Object.assign(host,{cdqProgressStartV2293:start,cdqProgressSetV2293:set,cdqProgressDoneV2293:done,cdqProgressFailV2293:fail,cdqProgressStateV2293:P});
 const api={start,set,done,fail,announce,reset,state:P};host.cdqActivityStatusV2745=api;return api;
}
