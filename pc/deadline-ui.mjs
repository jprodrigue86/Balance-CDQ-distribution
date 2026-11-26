import {categories,describeDue,indexedRows,localDay} from './deadline-model.mjs';
import {calibrationRpc} from './calibration-feedback-v2566.mjs';

const nav=document.querySelector('.bottom-nav');
const button=nav?.querySelector('[data-open-deadlines]');
const panel=document.querySelector('#deadline-panel');
const field=name=>panel.querySelector('[data-field="'+name+'"]');
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
const command=(label,run)=>{const b=text('button',label);b.type='button';b.addEventListener('click',run);return b;};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const owner=()=>window.cdqDeadlineSession?.()?.owner||'';
const records=new Map(), states=new Map();
let identity='',generation=0,filter='all',companies=[],loading=false,timer,paint;
const cacheKey=(account,id)=>'cdq.echeance.index.v1.'+account+'.'+id;
function cached(account,id){
  try{const entry=JSON.parse(sessionStorage.getItem(cacheKey(account,id)));
    return entry && Array.isArray(entry.rows) && entry.rows.every(r=>r.clientId===id) && Date.now()-entry.readAt<12*3600000 ? entry : null;
  }catch{return null;}
}
const planStates=['À contacter','Contacté / à planifier','Rendez-vous fixé'];
function close(){generation++;loading=false;clearTimeout(timer);cancelAnimationFrame(paint);paint=0;if(panel.open)panel.close();}
function reset(){close();records.clear();states.clear();companies=[];identity='';field('rows').replaceChildren();field('notice').textContent='';}
function available(){return !!identity && owner()===identity && panel.open;}
function hasClient(id){return window.cdqDeadlineSession?.()?.clients.some(c=>String(c.id)===id);}
function planning(row,parent){
 const details=text('details','');details.append(text('summary','Suivi du rendez-vous'));
 const status=document.createElement('select'),contact=document.createElement('input'),rdv=document.createElement('input');
 const plan=row.plan||{};details.dataset.plan='true';for(const state of planStates)status.add(new Option(state,state));status.value=plan.state||planStates[0];
 for(const [label,input,value] of [['État',status],['Dernier contact',contact,plan.contact],['Rendez-vous',rdv,plan.rdv]]){
   const wrapper=text('label',label);if(input!==status){input.type='date';input.value=value||'';}wrapper.append(input);details.append(wrapper);
 }
 const save=command('Enregistrer le suivi',async()=>{
   if(!available()||!hasClient(row.clientId))return;
   if(status.value===planStates[2]&&!rdv.value){rdv.focus();rdv.setCustomValidity('Choisissez la date du rendez-vous.');rdv.reportValidity();rdv.setCustomValidity('');return;}
   const account=identity,stamp=generation;
   const request={clientId:row.clientId,identity:row.identity,revision:plan.revision||0,requestId:crypto.randomUUID(),state:status.value,contact:contact.value,rdv:rdv.value};
   save.disabled=true;
   try{
     const result=await calibrationRpc('cdqEnregistrerSuiviEcheanceV1',row.clientId,request);
     if(!available()||account!==identity||stamp!==generation)return;
     if(!result?.ok||result.clientId!==request.clientId||result.identity!==request.identity||result.plan?.requestId!==request.requestId||result.plan?.revision!==request.revision+1)throw Error('Reçu invalide');
     const record=records.get(row.clientId),stored=record?.rows.find(r=>r.identity===row.identity);
     if(stored){stored.plan=result.plan;try{sessionStorage.setItem(cacheKey(account,row.clientId),JSON.stringify(record));}catch{}}
     field('notice').textContent='Suivi enregistré.';details.open=false;render();
   }catch(error){if(account===identity && stamp===generation){field('notice').textContent=/CONFLICT/.test(String(error.code||error.message))?'Le suivi a changé. Actualisez avant de saisir votre modification.':'Enregistrement non confirmé. Actualisez pour vérifier le suivi.';}}
   finally{save.disabled=false;}
 });
 if(window.cdqDeadlineSession?.()?.canWrite)details.append(save);
 else for(const input of [status,contact,rdv])input.disabled=true;
 parent.append(details);
}
function render(){
 if(!available())return;
 const today=localDay(),scoped=companies.filter(c=>field('archives').checked||!(c.archived||c.archive===true));
 const term=norm(field('search').value), follow=field('follow').value;
 const visible=scoped.flatMap(c=>(records.get(c.id)?.rows||[])).map(row=>({...row,due:describeDue(row.prochaineDate,today),plan:row.plan||{}}))
 .filter(r=>(!follow||(r.plan.state||planStates[0])===follow)&&norm([r.client,r.city,r.region,r.site,r.lot,r.technicien,r.identification].join(' ')).includes(term))
 .sort((a,b)=>(a.due.date||'9999').localeCompare(b.due.date||'9999')||a.client.localeCompare(b.client,'fr')||a.identification.localeCompare(b.identification,'fr',{numeric:true}));
 const buttons=field('filters');buttons.replaceChildren();
 for(const [key,title] of Object.entries({all:'Tous',...categories,soon:'Prochains 2 mois'})){
   const selected=visible.filter(r=>key==='all'||r.due.group===key||(key==='soon'&&['red','orange'].includes(r.due.group)));
   const b=command(title+' · '+new Set(selected.map(r=>r.clientId)).size+' clients · '+selected.length+' balances',()=>{filter=key;render();});b.dataset.group=key;b.setAttribute('aria-pressed',String(key===filter));buttons.append(b);
 }
 const ready=scoped.filter(c=>records.get(c.id)?.complete && states.get(c.id)!=='error').length,failed=scoped.filter(c=>states.get(c.id)==='error').length;
 field('coverage').textContent=(ready===scoped.length&&ready?'Dossiers indexés':'Couverture partielle')+' · '+ready+' / '+scoped.length+' dossiers complets'+(loading?' · Lecture en cours…':'')+(failed?' · '+failed+' à réessayer':'');
 const groups=new Map();
 for(const r of visible){if(filter!=='all'&&filter!==r.due.group&&!(filter==='soon'&&['red','orange'].includes(r.due.group)))continue;if(!groups.has(r.clientId))groups.set(r.clientId,[]);groups.get(r.clientId).push(r);}
 const body=field('rows');body.replaceChildren();
 for(const [id,rows] of groups){const box=document.createElement('details'),name=rows[0].client;box.open=!!term||groups.size===1;box.append(text('summary',name+' · '+rows.length+' balance'+(rows.length>1?'s':'')+' · '+rows[0].due.label));
   box.append(command('Ouvrir le dossier',()=>{if(available()&&hasClient(id)){close();window.cdqDeadlineOpen(id);}}));
   const phones=text('div','');box.append(command('Coordonnées',async()=>{if(!available()||!hasClient(id))return;const stamp=generation;phones.textContent='Chargement…';try{const result=await calibrationRpc('cdqLireCoordonneesClientV2866',id);
     if(stamp!==generation||!available()||!hasClient(id))return;if(result?.clientId!==id||!Array.isArray(result.sites))throw Error();
     phones.textContent=result.sites.map(s=>[s.label,s.adresse,s.ville,s.telephone].filter(Boolean).join(' · ')).filter(Boolean).join(' / ')||'Aucune coordonnée renseignée.';
   }catch{if(stamp===generation)phones.textContent='Coordonnées indisponibles.';}}),phones);
   for(const r of rows){const item=text('article','');item.dataset.group=r.due.group;item.append(text('strong',[r.site,r.lot,r.identification].filter(Boolean).join(' · ')),text('p',r.due.label));
     if(r.plan.rdv){const after=r.due.date&&(r.due.partial?r.plan.rdv.slice(0,7)>r.due.date:r.plan.rdv>r.due.date);item.append(text('p','Rendez-vous le '+r.plan.rdv+(after?' · Après l’échéance':'')));}
     if(r.updatedAt)item.append(text('small','Donnée mise à jour le '+new Date(r.updatedAt).toLocaleDateString('fr-CA')));
     if(/^[\w-]{8,200}$/.test(r.fileId||'')){const a=text('a','Rapport source');a.href='https://drive.google.com/open?id='+encodeURIComponent(r.fileId);a.target='_blank';a.rel='noopener noreferrer';item.append(a);}
     planning(r,item);box.append(item);
   }body.append(box);
 }
 if(!groups.size)body.append(text('p',loading?'Lecture des dossiers…':'Aucune balance dans les données disponibles pour cette sélection.'));
}
function scheduleRender(){if(panel.querySelector('details[data-plan][open]'))return;if(!paint)paint=requestAnimationFrame(()=>{paint=0;render();});}
async function refresh(force){
 const session=window.cdqDeadlineSession?.();if(!session||session.owner!==identity){reset();return;}
 companies=session.clients;
 for(const c of companies){if(!records.has(c.id)){const prior=cached(identity,c.id);if(prior)records.set(c.id,prior);}}
 const stamp=++generation;
 const queue=companies.filter(c=>force||states.has(c.id)||!records.has(c.id)||Date.now()-records.get(c.id).readAt>12*3600000);
 loading=queue.length>0;render();let cursor=0;
 async function read(){while(stamp===generation&&available()&&cursor<queue.length){
   const c=queue[cursor++];if(!hasClient(c.id))continue;
   try{const result=await window.cdqReportEngineSelectorV2754.call('list',{clientId:c.id,deadlineIndex:1});
     if(stamp!==generation||!available())return;
     const entry={rows:indexedRows(c,result),complete:result.baselineComplete===true,readAt:Date.now()};
     records.set(c.id,entry);states.delete(c.id);
     try{sessionStorage.setItem(cacheKey(identity,c.id),JSON.stringify(entry));}catch{/* The in-memory index remains available. */}
   }catch(error){
     if(stamp!==generation)return;
     if(/SESSION|FORBIDDEN|DENIED|NOT_AUTHORIZED|SCOPE/.test(String(error.code||error.message))){
       records.delete(c.id);try{sessionStorage.removeItem(cacheKey(identity,c.id));}catch{}
     }
     states.set(c.id,'error');
   }scheduleRender();
 }}
 await Promise.all([read(),read()]);if(stamp===generation){loading=false;if(!panel.querySelector('details[data-plan][open]'))render();}
}
async function open(){const next=owner();if(next!==identity)reset();if(!next){button.title='Ouvrez une session CDQ pour voir les échéances';return;}
 identity=next;panel.showModal();field('notice').textContent='';await window.cdqClientsReadyV2658;if(!available())return;refresh(false);
 let day=localDay();function tick(){if(!available())return;const now=localDay();if(now!==day){day=now;render();}timer=setTimeout(tick,60000);}tick();
}
button.addEventListener('click',open);field('close').onclick=close;panel.addEventListener('cancel',close);
field('refresh').onclick=()=>{if(!loading)refresh(true);};for(const key of ['search','follow','archives'])field(key).addEventListener('input',render);
for(const type of ['cdq:pdf-save-retired-v2707','cdq:report-data-saved-v2754','cdq:deleted','cdq:moved','cdq:copied','cdq:renamed']){
 window.addEventListener(type,event=>{const id=String(event.detail?.clientId||'');if(!id)return;records.delete(id);try{sessionStorage.removeItem(cacheKey(owner(),id));}catch{}if(available())refresh(false);});
}
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')reset();});

const workspace=window.cdqWorkspaceV2638;
if(workspace){const previous=workspace.back;workspace.back=function(...args){if(panel.open){close();return true;}return previous.apply(this,args);};}
