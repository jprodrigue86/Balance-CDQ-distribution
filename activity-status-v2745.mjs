// One truthful action status. The blue bar is indeterminate, never a percentage.
export function activityMessageV2745(text,success=false){
 const value=String(text||'').trim(),fold=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!value)return {text:'',kind:'idle'};
 if(/erreur|non confirm|impossible|echec|refuse|invalide|interromp|ne repond pas/.test(fold))return {text:value,kind:'error'};
 if(/en attente|conserve sur cet appareil|conserve.*local|hors ligne/.test(fold))return {text:value,kind:'pending'};
 if(success)return {text:value,kind:'success'};
 if(/^(?:chargement|ouverture|preparation|creation|copie|duplication|synchronisation|telechargement|import|envoi|conversion|transfert|enregistrement|actualisation|verification|lecture|suppression|restauration|ajustement|ajout|retrait)\b/.test(fold)&&!/(?:termine[es]*|cree[es]*|enregistre[es]*|supprime[es]*|renomme[es]*|pret[es]*|avec succes)\b/.test(fold))return {text:value,kind:'working'};
 return {text:value,kind:'notice'};
}

export function installActivityStatusV2745({host=window,doc=document,clock=host,confirmationAfter=45000,noticeAfter=8000}={}){
 const P={seq:0,active:false,value:0,label:'',failed:false,kind:'idle',waiting:false,scope:null,visible:false};let hide=null,watch=null;
 function box(){let node=doc.getElementById('cdqGlobalProgressV2293');if(!node){node=doc.createElement('div');node.id='cdqGlobalProgressV2293';const files=doc.getElementById('filesContainer');if(files?.parentNode)files.parentNode.insertBefore(node,files);else doc.body.append(node);}node.setAttribute('role','status');node.setAttribute('aria-live','polite');if(!node.querySelector('.cdq-progress-label'))node.innerHTML='<span class="cdq-progress-label"></span>';if(!node.querySelector('.cdq-progress-track')){const track=doc.createElement('span');track.className='cdq-progress-track';track.setAttribute('aria-hidden','true');track.innerHTML='<span class="cdq-progress-fill"></span>';node.append(track);}return node;}
 function paint(){const node=box();node.querySelector('.cdq-progress-label').textContent=P.label;node.classList.toggle('show',P.visible&&!!P.label);node.classList.toggle('failed',P.failed);node.dataset.activityKind=P.kind;node.setAttribute('aria-busy',String(P.active));}
 function clearHide(){if(hide!==null)clock.clearTimeout(hide);hide=null;if(watch!==null)clock.clearTimeout(watch);watch=null;}
 const scoped=scope=>scope!==undefined&&scope!==null&&scope!=='';
 const matches=scope=>scoped(scope)&&scope===P.scope;
 const current=reference=>!scoped(reference)||(typeof reference==='number'?reference===P.seq:matches(reference));
 function hideMessage(retain){const seq=P.seq;hide=clock.setTimeout(()=>{hide=null;if(seq!==P.seq)return;P.visible=false;if(!retain){P.label='';P.kind='idle';}paint();},retain?noticeAfter:2500);}
 function message(text,kind){clearHide();P.label=String(text||'');P.kind=kind;P.active=kind==='working';P.waiting=kind==='pending';P.failed=kind==='error';P.visible=!!P.label;paint();if(['success','notice'].includes(kind))hideMessage(false);if(['error','pending'].includes(kind))hideMessage(true);if(P.active){const seq=P.seq;watch=clock.setTimeout(()=>{watch=null;if(seq!==P.seq||!P.active)return;message(P.label+' — confirmation en attente.','pending');},confirmationAfter);}}
 function start(label,scope){P.seq++;P.scope=scoped(scope)?scope:null;message(label||'Chargement…','working');return P.seq;}
 function set(_value,label,reference){if(!current(reference))return false;if(label)message(label,P.active?'working':P.kind);return P.seq;}
 function done(label,reference,{confirmed=false}={}){if(!current(reference)||!confirmed&&(P.failed||!P.active&&!P.waiting))return false;message(label||'Terminé','success');return true;}
 function fail(label,reference){if(!current(reference))return false;message(label||'Erreur','error');return true;}
 function announce(text,success=false,scope){if(scoped(scope)&&!matches(scope))return false;const entry=activityMessageV2745(text,success);if(!scoped(scope)){if(entry.kind==='working')return start(entry.text);P.seq++;P.scope=null;}message(entry.text,entry.kind);return P.seq;}
 function completeScope(scope,label){if(!matches(scope))return false;return done(label,P.seq,{confirmed:true});}
 function reset(){clearHide();P.seq++;P.scope=null;P.label='';P.kind='idle';P.active=P.failed=P.waiting=P.visible=false;paint();}
 Object.assign(host,{cdqProgressStartV2293:start,cdqProgressSetV2293:set,cdqProgressDoneV2293:done,cdqProgressFailV2293:fail,cdqProgressStateV2293:P});
 const api={start,set,done,fail,announce,matches,completeScope,reset,state:P};host.cdqActivityStatusV2745=api;return api;
}
