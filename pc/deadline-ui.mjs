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
let identity='',generation=0,mode='red',companies=[],loading=false,timer,paint;
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
const bands = [
  ['red','Dépassé','Échéances dépassées'],
  ['orange','1 mois ou moins','Échéances d’ici un mois'],
  ['yellow','Plus de 1 à moins de 6 mois','Échéances entre un et six mois'],
  ['green','6 mois et plus','Échéances dans six mois et plus']
];
const shortDate=new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const monthDate=new Intl.DateTimeFormat('fr-CA',{month:'long',year:'numeric',timeZone:'UTC'});
function dueText(due){
 if(!due.date)return 'Date à vérifier';
 return due.partial?monthDate.format(new Date(due.date+'-01T12:00:00Z')):shortDate.format(new Date(due.date+'T12:00:00Z'));
}
function showBand(next){
 if(mode!==next){mode=next;field('rows').replaceChildren();}
 render();
}
function render(){
 if(!available())return;
 const today=localDay();
 const scoped=companies.filter(c=>field('archives').checked||!(c.archived===true||c.archive===true));
 const term=norm(field('search').value),follow=field('follow').value;
 const sorted=scoped.flatMap(c=>records.get(c.id)?.rows||[]).map(r=>({...r,due:describeDue(r.prochaineDate,today),plan:r.plan||{}}))
  .filter(r=>(!follow||(r.plan.state||planStates[0])===follow)&&norm([r.client,r.city,r.region,r.site,r.lot,r.identification].join(' ')).includes(term))
  .sort((a,b)=>(a.due.date||'9999').localeCompare(b.due.date||'9999')||a.client.localeCompare(b.client,'fr')||String(a.identification||'').localeCompare(String(b.identification||''),'fr',{numeric:true}));
 const groups=new Map([...bands.map(([key])=>[key,new Map()]),['verify',new Map()]]);
 for(const row of sorted){
   const group=groups.get(row.due.group);
   if(!group.has(row.clientId))group.set(row.clientId,[]);
   group.get(row.clientId).push(row);
 }
 const toolbar=field('bands');
 if(!toolbar.childElementCount){
  for(const [key,label] of bands){
   const b=command('',()=>showBand(key));b.dataset.band=key;
   const name=text('span',label),count=text('span','');count.className='count-line';
   count.append(text('strong',''),text('small',''));b.append(name,count);toolbar.append(b);
  }
 }
 for(const b of toolbar.children){
   const n=groups.get(b.dataset.band).size;b.setAttribute('aria-pressed',String(b.dataset.band===mode));
   b.querySelector('strong').textContent=String(n);b.querySelector('small').textContent=n>1?'compagnies':'compagnie';
 }
 field('heading').textContent=bands.find(([key])=>key===mode)?.[2]||'Dates à vérifier';
 const unknown=field('unknown');unknown.hidden=!groups.get('verify').size;
 unknown.textContent='Dates à vérifier ('+groups.get('verify').size+')';
 const area=field('rows'),open=new Set([...area.querySelectorAll(':scope > details[open]')].map(el=>el.dataset.client));area.replaceChildren();
 for(const [id,rows] of groups.get(mode)){
   const box=document.createElement('details');box.dataset.client=id;box.open=open.has(id);
   const summary=document.createElement('summary');summary.append(text('strong',rows[0].client),text('span',dueText(rows[0].due)));box.append(summary);
   const items=text('div','');items.className='equipment-list';
   for(const r of rows){
     const clean = value => typeof value === 'string' ? value.trim() : '';
     const fileTitle = [r.name, r.source].map(clean).find(Boolean);
     const identification = clean(r.identification);
     const title = !identification || identification === 'Balance'
       ? fileTitle || clean(r.type) || 'Balance'
       : [identification, clean(r.type)].filter((v, i, all) => v && all.indexOf(v) === i).join(' · ');
     const linkable=/^[\w-]{8,200}$/.test(r.fileId||'');
     const item=linkable?command('',async()=>{
       const stamp=generation,account=identity,current=()=>stamp===generation&&account===identity&&available()&&hasClient(id);
       if(!current()||item.disabled)return;item.disabled=true;
       try{if(await window.cdqDeadlineSource(id,r.fileId,current)&&current())close();}
       catch{if(current())field('notice').textContent='Ouverture du certificat impossible.';}
       finally{item.disabled=false;}
     }):text('div','');
     item.className='equipment-row';item.append(text('span',title),text('time',dueText(r.due)));items.append(item);
     if(field('management').checked)planning(r,items);
   }
   box.append(items);area.append(box);
 }
 if(!area.childElementCount)area.append(text('p',loading?'Lecture des dossiers…':'Aucune compagnie dans cette période.'));
 const represented = scoped.filter(company => records.get(company.id)?.rows.length > 0).length;
 field('coverage').textContent = loading ? 'Actualisation…' :
   represented + ' dossier' + (represented === 1 ? '' : 's') + ' avec documents sur ' + scoped.length;
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
 identity=next;mode='red';field('rows').replaceChildren();fitPage();panel.show();button.setAttribute('aria-expanded','true');field('notice').textContent='';await window.cdqClientsReadyV2658;if(!available())return;refresh();
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
field('unknown').onclick=()=>showBand('verify');
window.addEventListener('pointerdown',e=>{if(panel.open&&e.target.closest?.('.bottom-nav-item')&&!e.target.closest('[data-open-deadlines]'))close();},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.open){e.preventDefault();close();button.focus();}});
button.addEventListener('click',()=>panel.open?close():open());field('close').onclick=close;panel.addEventListener('cancel',close);
field('refresh').onclick=()=>{if(!loading)refresh();};for(const key of ['search','follow','archives','management'])field(key).addEventListener('input',render);
for(const type of ['cdq:pdf-save-retired-v2707','cdq:report-data-saved-v2754','cdq:report-pdf-confirmed-v2754','cdq:report-deleted-v2754','cdq:deleted','cdq:moved','cdq:copied','cdq:renamed']){
 window.addEventListener(type,event=>{if(event.detail?.clientId&&available())refresh();});
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&available()&&!loading)refresh();});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')reset();});

const workspace=window.cdqWorkspaceV2638;
if(workspace){const previous=workspace.back;workspace.back=function(...args){if(panel.open){close();return true;}return previous.apply(this,args);};}
