import {describeDue,indexedRows,localDay} from './deadline-model.mjs';
import {calibrationRpc} from './calibration-feedback-v2566.mjs';

const nav=document.querySelector('.bottom-nav');
const button=nav?.querySelector('[data-open-deadlines]');
const panel=document.querySelector('#deadline-panel');
const field=name=>panel.querySelector('[data-field="'+name+'"]');
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
const command=(label,run)=>{const b=text('button',label);b.type='button';b.addEventListener('click',run);return b;};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const owner=()=>window.cdqDeadlineSession?.()?.owner||'';
const records=new Map();
let identity='',generation=0,mode='month',month='',selected='',companies=[],loading=false,timer,paint;
let database,hydrated='',syncToken=0;
function openCache(){
 if(!database)database=new Promise((resolve,reject)=>{
   const request=indexedDB.open('cdq-deadlines-v2',1);
   request.onupgradeneeded=()=>{const store=request.result.createObjectStore('clients',{keyPath:['owner','id']});store.createIndex('owner','owner');};
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 }).catch(error=>{database=null;throw error;});
 return database;
}
async function loadCache(account){
 const db=await openCache();
 return new Promise((resolve,reject)=>{
   const req=db.transaction('clients').objectStore('clients').index('owner').getAll(account);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function saveCache(account,changed,removed){
 if(!changed.length&&!removed.length)return;
 const db=await openCache();
 await new Promise((resolve,reject)=>{
   const tx=db.transaction('clients','readwrite'),store=tx.objectStore('clients');
   for(const entry of changed)store.put({...entry,owner:account});
   for(const id of removed)store.delete([account,id]);
   tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error);
 });
}
const planStates=['À contacter','Contacté / à planifier','Rendez-vous fixé'];
function close(){generation++;syncToken++;loading=false;clearTimeout(timer);cancelAnimationFrame(paint);paint=0;if(panel.open)panel.close();button.setAttribute('aria-expanded','false');}
function reset(){close();records.clear();companies=[];identity='';hydrated='';field('rows').replaceChildren();field('notice').textContent='';}
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
     if(stored)stored.plan=result.plan;
     // Keep the server revision. The next delta retrieves the saved plan for every device.
     field('notice').textContent='Suivi enregistré.';details.open=false;render();
   }catch(error){if(account===identity && stamp===generation){field('notice').textContent=/CONFLICT/.test(String(error.code||error.message))?'Le suivi a changé. Actualisez avant de saisir votre modification.':'Enregistrement non confirmé. Actualisez pour vérifier le suivi.';}}
   finally{save.disabled=false;}
 });
 if(window.cdqDeadlineSession?.()?.canWrite)details.append(save);
 else for(const input of [status,contact,rdv])input.disabled=true;
 parent.append(details);
}
function monthShift(value, delta){
 const [year,mon]=value.split('-').map(Number);
 return new Date(Date.UTC(year,mon-1+delta,1)).toISOString().slice(0,7);
}
const dateLabel=(date,options)=>new Intl.DateTimeFormat('fr-CA',{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
function changeView(view,date=''){
 mode=view;selected=date;render();
}
function drawCalendar(rows,today){
 const first=month+'-01',counts=new Map();
 for(const row of rows)if(row.due.group==='red'&&!row.due.partial)counts.set(row.due.date,(counts.get(row.due.date)||0)+1);
 field('month').textContent=dateLabel(first,{month:'long',year:'numeric'});
 const grid=field('days'),focus=grid.contains(document.activeElement)?document.activeElement.dataset.date:null;
 const length=new Date(Date.parse(monthShift(month,1)+'-01T12:00:00Z')-86400000).getUTCDate();
 const cells=document.createDocumentFragment();
 for(let i=0;i<(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;i++)cells.append(document.createElement('span'));
 for(let day=1;day<=length;day++){
   const date=month+'-'+String(day).padStart(2,'0'),total=counts.get(date)||0;
   const b=command(String(day),()=>{
     changeView('day',date);
     field('heading').scrollIntoView({block:'start'});
   });b.className='deadline-day';b.dataset.date=date;
   b.dataset.urgent=String(total>0);b.setAttribute('aria-pressed',String(mode==='day'&&selected===date));
   if(today===date)b.setAttribute('aria-current','date');
   b.setAttribute('aria-label',dateLabel(date,{day:'numeric',month:'long',year:'numeric'})+(total?' · '+total+' balance'+(total>1?'s':'')+' prioritaire'+(total>1?'s':''):''));
   cells.append(b);
 }
 grid.replaceChildren(cells);
 if(focus)grid.querySelector('[data-date="'+focus+'"]')?.focus({preventScroll:true});
 field('whole').hidden=mode==='month';field('today').hidden=month===today.slice(0,7);
 const late=rows.filter(r=>r.due.overdue).length,unknown=rows.filter(r=>r.due.group==='verify').length;
 field('late').textContent='En retard · '+late;field('unknown').textContent='Dates à vérifier · '+unknown;
 for(const key of ['late','unknown'])field(key).setAttribute('aria-pressed',String(mode===key));
 field('heading').textContent=mode==='day'?dateLabel(selected,{weekday:'long',day:'numeric',month:'long'}):mode==='late'?'Balances en retard':mode==='unknown'?'Dates à vérifier':'Échéances du mois';
}

function render(){
 if(!available())return;
 const today=localDay(),scoped=companies.filter(c=>field('archives').checked||!(c.archived||c.archive===true));
 const term=norm(field('search').value), follow=field('follow').value;
 const visible=scoped.flatMap(c=>(records.get(c.id)?.rows||[])).map(row=>({...row,due:describeDue(row.prochaineDate,today),plan:row.plan||{}}))
 .filter(r=>(!follow||(r.plan.state||planStates[0])===follow)&&norm([r.client,r.city,r.region,r.site,r.lot,r.technicien,r.identification].join(' ')).includes(term))
 .sort((a,b)=>(a.due.date||'9999').localeCompare(b.due.date||'9999')||a.client.localeCompare(b.client,'fr')||a.identification.localeCompare(b.identification,'fr',{numeric:true}));
 drawCalendar(visible,today);
 const consulted=scoped.filter(c=>records.has(c.id)).length,ready=scoped.filter(c=>records.get(c.id)?.complete).length;
 field('coverage').textContent=loading?'Actualisation de l’index partagé…':consulted?'Index partagé · '+consulted+' dossiers · '+ready+' avec liste complète':'Aucun dossier indexé disponible';
 const groups=new Map();
 for(const r of visible){const matches=mode==='late'?r.due.overdue:mode==='unknown'?r.due.group==='verify':mode==='day'?r.due.date===selected:r.due.date?.slice(0,7)===month;if(!matches)continue;if(!groups.has(r.clientId))groups.set(r.clientId,[]);groups.get(r.clientId).push(r);}
 const body=field('rows'),expanded=new Set([...body.querySelectorAll(':scope > details[open]')].map(el=>el.dataset.client));body.replaceChildren();
 for(const [id,rows] of groups){const box=document.createElement('details'),name=rows[0].client;box.dataset.client=id;box.open=!!term||groups.size===1||mode==='day'||expanded.has(id);box.append(text('summary',name+' · '+rows.length+' balance'+(rows.length>1?'s':'')+' · '+rows[0].due.label));
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
async function refresh(){
 const session=window.cdqDeadlineSession?.();if(!session||session.owner!==identity){reset();return;}
 const account=identity,ticket=++syncToken;
 const active=()=>ticket===syncToken&&available()&&identity===account;
 companies=session.clients;loading=true;render();
 try{
   let previous=records;
   if(hydrated!==account){
     let cached=[];try{cached=await loadCache(account);}catch{}
     if(!active())return;
     previous=new Map(cached.filter(c=>Number.isSafeInteger(c.revision)&&Array.isArray(c.rows)).map(c=>[c.id,c]));
   }
   const known=Object.fromEntries([...previous].map(([id,entry])=>[id,entry.revision]));
   const result=await calibrationRpc('cdqLireIndexEcheancesV2',known);
   if(!active())return;
   if(result?.protocol!==2939||!Array.isArray(result.ids)||!Array.isArray(result.changes))throw Error('Index partagé invalide');
   const authorized=new Set(result.ids),directory=new Map(companies.filter(c=>authorized.has(c.id)).map(c=>[c.id,c]));
   const removed=[...previous.keys()].filter(id=>!directory.has(id)),updated=[],seen=new Set();
   const next=new Map([...previous].filter(([id])=>directory.has(id)));
   for(const change of result.changes){
     if(!authorized.has(change.clientId)||seen.has(change.clientId)||!Number.isSafeInteger(change.revision)||change.revision<0)throw Error('Révision invalide');
     seen.add(change.clientId);
     const company=directory.get(change.clientId);if(!company)continue;
     const entry={id:company.id,revision:change.revision,complete:change.baselineComplete===true,rows:indexedRows(company,change)};
     next.set(company.id,entry);updated.push(entry);
   }
   if([...directory.keys()].some(id=>!next.has(id)))throw Error('Index partagé incomplet');
   // Directory labels can change independently of an equipment revision.
   for(const [id,entry] of next){const c=directory.get(id);entry.rows=entry.rows.map(r=>({...r,client:c.nom,city:c.ville||'',region:c.region||''}));}
   companies=[...directory.values()];records.clear();for(const [id,entry] of next)records.set(id,entry);
   hydrated=account;field('notice').textContent='';
   try{await saveCache(account,updated,removed);}catch{/* The shared server snapshot remains available. */}
 }catch(error){
   if(!active())return;
   const msg=String(error.code||'')+' '+String(error.message||'');
   if(/SESSION|FORBIDDEN|DENIED|NOT_AUTHORIZED|SCOPE|CONSENT/.test(msg)){records.clear();hydrated='';}
   field('notice').textContent='Actualisation non confirmée. Réessayez dans les filtres.';
 }finally{if(active()){loading=false;render();}}
}
async function open(){const next=owner();if(next!==identity)reset();if(!next){button.title='Ouvrez une session CDQ pour voir les échéances';return;}
 identity=next;month=localDay().slice(0,7);mode='month';selected='';fitPage();panel.show();button.setAttribute('aria-expanded','true');field('notice').textContent='';await window.cdqClientsReadyV2658;if(!available())return;refresh();
 let day=localDay();function tick(){if(!available())return;const now=localDay();if(now!==day){day=now;render();}timer=setTimeout(tick,60000);}tick();
}
function fitPage(){
 const bar=nav.getBoundingClientRect(),banner=document.querySelector('#appHeader')?.getBoundingClientRect();
 const side=bar.height>bar.width && bar.height>innerHeight/2;
 panel.style.setProperty('--deadline-left',(side?Math.max(0,bar.right):0)+'px');
 if(banner?.height)panel.style.setProperty('--deadline-top',Math.max(0,banner.bottom)+'px');
 panel.style.setProperty('--deadline-bottom',(side?0:Math.max(0,innerHeight-bar.top))+'px');
}
window.addEventListener('resize',()=>{if(panel.open)fitPage();});
for(const [key,delta] of [['prev',-1],['next',1]])field(key).onclick=()=>{month=monthShift(month,delta);changeView('month');};
field('whole').onclick=()=>changeView('month');field('today').onclick=()=>{month=localDay().slice(0,7);changeView('month');};
for(const key of ['late','unknown'])field(key).onclick=()=>changeView(mode===key?'month':key);
window.addEventListener('pointerdown',e=>{if(panel.open&&e.target.closest?.('.bottom-nav-item')&&!e.target.closest('[data-open-deadlines]'))close();},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.open){e.preventDefault();close();button.focus();}});
button.addEventListener('click',()=>panel.open?close():open());field('close').onclick=close;panel.addEventListener('cancel',close);
field('refresh').onclick=()=>{if(!loading)refresh();};for(const key of ['search','follow','archives'])field(key).addEventListener('input',render);
for(const type of ['cdq:pdf-save-retired-v2707','cdq:report-data-saved-v2754','cdq:report-pdf-confirmed-v2754','cdq:report-deleted-v2754','cdq:deleted','cdq:moved','cdq:copied','cdq:renamed']){
 window.addEventListener(type,event=>{if(event.detail?.clientId&&available())refresh();});
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&available()&&!loading)refresh();});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')reset();});

const workspace=window.cdqWorkspaceV2638;
if(workspace){const previous=workspace.back;workspace.back=function(...args){if(panel.open){close();return true;}return previous.apply(this,args);};}
