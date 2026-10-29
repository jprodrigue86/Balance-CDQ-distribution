// CDQ 27.93 — background choices and existing navigation integration.
// No remote requests, Drive operations, PDF changes, timers or publication actions.
export const CDQ_BACKGROUND_CHOICES_V2793=Object.freeze([
 ['current','Actuel'],['brushed','Métal brossé noir'],['smoke','Smoke'],
 ['lava','Lava'],['leather','Leather'],['rock','Rock']
]);
export const CDQ_BACKGROUND_IDS_V2793=Object.freeze(CDQ_BACKGROUND_CHOICES_V2793.map(x=>x[0]));
export function cdqBackgroundChoiceV2793(value){
 if(value==='letter')value='leather';
 return CDQ_BACKGROUND_IDS_V2793.includes(value)?value:'current';
}
export function cdqEffectiveBackgroundV2793(choice,palette){
 const normalized=cdqBackgroundChoiceV2793(choice);
 return palette==='metal'&&normalized==='current'?'brushed':normalized;
}
export function cdqNavOrderWithSettingsV2793(order){
 const original=Array.isArray(order)?[...new Set(order)]:[];
 if(original.includes('settings'))return original; // preserve user drag order
 const without=original.filter(x=>x!=='settings');
 const i=without.indexOf('trash');
 without.splice(i<0?without.length:i,0,'settings');
 return without;
}
const storageKey='cdqBackgroundV2793';
const settingsId='cdqSettingsNavButtonV2793';
const d=typeof document==='undefined'?null:document;
const w=typeof window==='undefined'?null:window;
function owner(){
 try{return String(typeof utilisateurCourantEmail==='undefined'?'':utilisateurCourantEmail||'').trim().toLowerCase()}catch{return ''}
}
function read(key,fallback=''){
 try{return w?.localStorage?.getItem(key)??fallback}catch{return fallback}
}
function write(key,value){try{w?.localStorage?.setItem(key,value)}catch{}}
function selected(){
 const palette=d?.documentElement?.dataset?.cdqPalette||read('cdqTheme','dark');
 const fallback=palette==='metal'?'brushed':'current';
 const name=owner();
 let saved=read(name?storageKey+':'+name:storageKey+':device',read(storageKey+':device',fallback));
 if(saved==='letter'){saved='leather';write(name?storageKey+':'+name:storageKey+':device',saved);}
 return cdqEffectiveBackgroundV2793(saved,palette);
}
function reflect(value){
 if(!d)return;
 d.documentElement.setAttribute('data-cdq-background-v2793',cdqBackgroundChoiceV2793(value));
 for(const b of d.querySelectorAll('[data-cdq-background-option-v2793]'))b.setAttribute('aria-pressed',String(b.dataset.cdqBackgroundOptionV2793===value));
}
function select(value,save=true){
 value=cdqEffectiveBackgroundV2793(value,d?.documentElement?.dataset?.cdqPalette||read('cdqTheme','dark'));
 if(save){write(storageKey+':device',value);const name=owner();if(name)write(storageKey+':'+name,value)}
 reflect(value);return value;
}
function css(){
 if(!d||d.getElementById('cdqBackgroundStylesV2793'))return;
 const link=d.createElement('link');link.id='cdqBackgroundStylesV2793';link.rel='stylesheet';
 link.href=new URL('./background-v2793.css',d.location.href).href;d.head.appendChild(link);
}
function settingsNav(){
 if(!d||d.documentElement.classList.contains('cdq-desktop-v2676'))return;
 const nav=d.querySelector('.bottom-nav[data-cdq-sliding-nav="true"]');
 if(!nav)return;
 let b=d.getElementById(settingsId)||d.getElementById('displayModeButton');
 if(!b){
  b=d.createElement('button');b.type='button';b.id=settingsId;b.className='bottom-nav-item';
  b.dataset.workspaceRoute='settings';b.setAttribute('aria-label','Réglages');b.title='Réglages';
  const host=d.createElement('span');host.className='cdq-workspace-icon cdq-settings-icon-v2793';
  // Dedicated skull-and-metal gear: never substitute an unrelated Copy icon.
  host.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="cdqGearV2793" x2="1" y2="1"><stop stop-color="#e6d5fc"/><stop offset=".52" stop-color="#9a68c9"/><stop offset="1" stop-color="#493060"/></linearGradient></defs><path d="M27 4h10l3 8 7 3 8-4 6 9-6 7v10l6 7-6 9-8-4-7 3-3 8H27l-3-8-8-3-8 4-6-9 6-7V27l-6-7 6-9 8 4 8-3z" stroke="#c3a0ea" fill="url(#cdqGearV2793)" stroke-width="2.4"/><circle cx="32" cy="32" r="18" fill="#14121b" stroke="#8766ad" stroke-width="3"/><path d="M18 27c0-15 28-15 28 0l-3 11-5 3v8H26v-8l-5-3z" fill="#c8c2d4" stroke="#685c7c" stroke-width="2"/><path d="M23 29q4-5 8 1-3 5-8-1zm18 0q-4-5-8 1 3 5 8-1z" fill="#15121e"/><path d="M29 38h6l-3 4z" fill="#241b35"/></svg>';
  const label=d.createElement('small');label.textContent='Réglages';b.append(host,label);
  b.addEventListener('click',e=>{e.preventDefault();if(typeof w?.cdqOpenSettingsV2294==='function')w.cdqOpenSettingsV2294();});
 }
 if(b.dataset.workspaceRoute!=='settings')b.dataset.workspaceRoute='settings';
 if(b.id!==settingsId)b.classList.add('cdq-settings-nav-v2793');
 const trash=[...nav.children].find(n=>n.dataset.workspaceRoute==='trash'||n.querySelector('small')?.textContent.trim()==='Corbeille');
 if(b.parentNode!==nav)nav.insertBefore(b,trash||null);
 b.style.setProperty('--cdq-nav-accent','#c9d0d7');
}
function picker(){
 if(!d)return;
 const panel=d.getElementById('cdq-settings-panel-appearance');
 if(!panel)return;
 let group=panel.querySelector('.cdq-background-picker-v2793');
 if(!group){
  group=d.createElement('section');group.className='cdq-background-picker-v2793';
  const title=d.createElement('h3');title.textContent='Fond de l’application';
  const help=d.createElement('p');help.textContent='Choisir un fond pour Accueil, Dossier, Calibration, Calcul, Inventaire, Catalogue et les autres onglets. Les icônes et les dimensions restent inchangées.';
  const grid=d.createElement('div');grid.className='cdq-background-grid-v2793';
  for(const [id,label] of CDQ_BACKGROUND_CHOICES_V2793){
   const button=d.createElement('button');button.type='button';button.dataset.cdqBackgroundOptionV2793=id;
   button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Fond '+label);
   const preview=d.createElement('span');preview.className='cdq-bg-thumb-v2793';preview.setAttribute('aria-hidden','true');
   const name=d.createElement('span');name.textContent=label;button.append(preview,name);
   button.addEventListener('click',()=>select(id));grid.append(button);
  }
  group.append(title,help,grid);panel.append(group);
 }
 reflect(d.documentElement.getAttribute('data-cdq-background-v2793')||selected());
}
function sync(){css();settingsNav();select(selected(),false);picker();}
function defer(){if(!w)return;w.requestAnimationFrame?.(sync)}
if(d&&w){
 css();select(selected(),false);
 d.addEventListener('DOMContentLoaded',sync,{once:true});
 w.addEventListener('cdq:access-ready',sync);
 w.addEventListener('cdq:settings-opened',sync);
 // Palette transitions change the automatic backdrop without overriding preferences.
 new MutationObserver(records=>{if(records.some(r=>r.attributeName==='data-cdq-palette'))select(selected(),false)})
  .observe(d.documentElement,{attributes:true,attributeFilter:['data-cdq-palette']});
 d.addEventListener('click',event=>{
  if(event.target.closest?.('#cdqSettingsNavButtonV2793,#cdqTopDisplayButtonV2204,#cdqOpenDisplayV2294,#cdq-settings-tab-appearance')){
   defer();
  }
 },true);
 if(d.readyState!=='loading')sync();
 w.cdqBackgroundV2793=Object.freeze({choices:CDQ_BACKGROUND_CHOICES_V2793,get:selected,set:select,refresh:sync});
}
