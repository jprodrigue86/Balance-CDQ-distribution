import {divisions,convertMass,percentLoad,expectedSignal,analyzeBridge,bridgePairs} from './weighing-calculations-v2638.mjs';
import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toLocaleString('fr-CA',{maximumFractionDigits:8});
const GENERAL='1F7rgU20Hc1PmjxQHY7ALTqkqArN6RSsf';
const paths={calcul:'<rect x="6" y="3" width="20" height="26" rx="3"/><path d="M10 7h12v5H10zM10 17h2m4 0h2m4 0h0M10 22h2m4 0h2m4 0v3"/>',opportunities:'<path d="M4 26h24M7 23V13h5v10m4 0V9h5v14m4-9V4M19 4h6v6M7 9l7-4 4 2 7-3"/>',drive:'<path d="M3 9V6h10l3 4h13v16H3z"/>',folder:'<path d="M3 9V6h10l3 4h13v16H3z"/>',report:'<path d="M7 3h13l6 6v20H7zM20 3v6h6M11 14h11m-11 5h11m-11 5h7"/>',camera:'<path d="M3 10h6l3-5h8l3 5h6v17H3z"/><circle cx="16" cy="18" r="6"/>',gallery:'<rect x="3" y="4" width="26" height="24" rx="3"/><circle cx="22" cy="10" r="2"/><path d="M4 24l8-10 7 7 4-4 6 7"/>',file:'<path d="M7 3h13l6 6v20H7zM20 3v6h6"/>'};
export function workspaceIcon(key,style='current'){
  if(style==='metal-music'&&['calcul','opportunities','drive'].includes(key))return '<img class="cdq-workspace-art-v2639" src="./assets/navigation-v2639/'+key+'.webp" alt="" aria-hidden="true" draggable="false">';
  const body=paths[key]||paths.file,weight=style==='minimal'?1.6:style==='dark-pro'?2:2.4;
  const frame=style==='metal-music'?'<path d="M3 4l3-3h20l3 3v24l-3 3H6l-3-3z" stroke-opacity=".3"/>':style==='isometric'?'<path d="M2 7l6-4 22 5v21l-6 3L2 26z" stroke-opacity=".3"/>':'';
  return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="'+weight+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+frame+body+'</svg>';
}
const companyId=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
const companyName=()=>{try{return String(nomCompagnieSelectionnee||'');}catch{return '';}};
const canRead=()=>!!window.cdqDriveEntryV2632?.canRead();
const canWrite=()=>canRead()&&['admin','technicien'].includes(calibrationIdentity().role);
const ownerKey=()=>calibrationIdentity().email+'|'+calibrationIdentity().role;
async function rpc(name,...args){const key=ownerKey();if(!canRead())throw Error('Accès Drive requis.');const result=await calibrationRpc(name,...args);if(key!==ownerKey()||!canRead())throw Error('Le compte a changé.');return result;}
let homeAfterReader=false,homeReaderSource=null;
let active='',observedOwner='',queued=false,driveEpoch=0,driveState={mode:'drive',id:GENERAL,items:[],crumbs:[],token:'',query:'',loading:false},opportunities=[],opportunityEpoch=0;
const pageByRoute={dossier:'cdqDrivePageV2638',favorites:'cdqDrivePageV2638',calcul:'cdqCalculPageV2638',opportunities:'cdqOpportunitiesPageV2638',report:'cdqReportOverlayV2578',calibration:'cdqCalibrationDialogV2565',inventory:'cdqInventoryModernV2592',invoices:'cdqInvoicePageV2590'};
const labels={Accueil:'home',Dossier:'dossier',Dossiers:'dossier',Favoris:'favorites',Rapport:'report',Calibration:'calibration',Calcul:'calcul',Inventaire:'inventory',Factures:'invoices',Opportunités:'opportunities',Corbeille:'trash'};
const order=[...new Set(Object.values(labels))],cache=new Map();
const navColors={home:'#45d6ff',dossier:'#ff6285',favorites:'#ffd34d',report:'#458fff',calibration:'#63edcf',calcul:'#ffb64d',inventory:'#d783ff',invoices:'#6be9a9',opportunities:'#65eda4',drive:'#48ceff',trash:'#ddd4c8'};
function page(id,title,subtitle=''){
  let p=$('#'+id);if(p)return p;p=document.createElement('section');p.id=id;p.className='cdq-workspace-page';p.hidden=true;p.setAttribute('aria-label',title);
  p.innerHTML='<header class="cdq-workspace-head"><h2>'+esc(title)+'<small>'+esc(subtitle)+'</small></h2><button type="button" data-workspace-close aria-label="Fermer la page">×</button></header><main class="cdq-workspace-body"></main>';
  document.body.append(p);$('[data-workspace-close]',p).onclick=()=>navigate('');return p;
}
function measure(){
  const root=document.documentElement;if(!root.classList.contains('cdq-mobile-layout'))return;
  const header=$('#appHeader'),nav=$('.bottom-nav'),top=Math.max(0,Math.ceil(header?.getBoundingClientRect().bottom||0));
  const h=window.visualViewport?.height||innerHeight,bottom=Math.max(0,Math.ceil(h-(nav?.getBoundingClientRect().top||h)));
  const set=(key,value)=>{if(root.style.getPropertyValue(key)!==value)root.style.setProperty(key,value);};
  set('--cdq-workspace-top',top+'px');set('--cdq-workspace-bottom',bottom+'px');
  root.dataset.cdqWorkspaceOwner=ownerKey();
  const reader=$('#cdqReaderFrame');if(reader){reader.dataset.workspaceRoute??=active;reader.hidden=reader.dataset.workspaceRoute!==active||!canRead();root.classList.toggle('cdq-workspace-reader-open',!reader.hidden);const readerTop=Math.max(0,Math.ceil(header?.getBoundingClientRect().bottom||0));reader.style.setProperty('height',Math.max(0,h-readerTop-bottom)+'px','important');set('--cdq-workspace-top',readerTop+'px');}
  const payload={type:'CDQ_WORKSPACE_LAYOUT_V2638',top,bottom,route:active,owner:ownerKey(),canRead:canRead()};
  const signature=JSON.stringify(payload);if(measure.last!==signature){measure.last=signature;window.parent.postMessage(payload,location.origin);}
}
function iconTheme(){try{return JSON.parse(localStorage.getItem('cdqIconThemeV2514:'+calibrationIdentity().email)||'null')?.style||'current';}catch{return 'current';}}
function syncNav(){
  const nav=$('.bottom-nav');if(!nav)return;
  document.documentElement.dataset.cdqWorkspaceUnlocked=calibrationIdentity().email?'true':'false';
  for(const [label,key] of [['Calcul','calcul'],['Opportunités','opportunities']]){
    if($('[data-workspace-route="'+key+'"]',nav))continue;
    const b=document.createElement('button');b.type='button';b.className='bottom-nav-item';b.dataset.workspaceRoute=key;b.setAttribute('aria-label',label);b.innerHTML='<span class="cdq-workspace-icon">'+workspaceIcon(key)+'</span><small>'+label+'</small>';nav.append(b);
  }
  for(const b of $$('.bottom-nav-item',nav))if(b.dataset.workspaceRoute==='drive'||['Drive général','Mon Drive'].includes($('small',b)?.textContent.trim()))b.remove();
  syncHome();
  const theme=iconTheme();
  for(const b of $$('.bottom-nav-item',nav)){
    const name=$('small',b)?.textContent.trim(),key=labels[name]||b.dataset.workspaceRoute;if(!key)continue;b.dataset.workspaceRoute=key;
    const current=(active?key===active:key==='home')?'true':'false';if(b.dataset.cdqCurrent!==current)b.dataset.cdqCurrent=current;
    if(b.getAttribute('aria-current')!==(current==='true'?'page':'false'))b.setAttribute('aria-current',current==='true'?'page':'false');
    if(['calcul','opportunities','drive'].includes(key)){
      let host=$(':scope > span',b);if(host&&host.dataset.workspaceTheme!==theme){host.className='cdq-workspace-icon';host.innerHTML=workspaceIcon(key,theme);host.dataset.workspaceTheme=theme;}
    }
    const color=navColors[key]||'#48ceff';if(b.style.getPropertyValue('--cdq-nav-accent')!==color)b.style.setProperty('--cdq-nav-accent',color);
    const label=$('small',b);if(label){for(const prop of ['color','-webkit-text-fill-color'])if(label.style.getPropertyValue(prop)!=='var(--cdq-nav-accent)')label.style.setProperty(prop,'var(--cdq-nav-accent)','important');}
  }
  const sorted=$$('.bottom-nav-item',nav).sort((a,b)=>(order.indexOf(a.dataset.workspaceRoute)+1||99)-(order.indexOf(b.dataset.workspaceRoute)+1||99));
  sorted.forEach((b,i)=>{if(nav.children[i]!==b)nav.insertBefore(b,nav.children[i]||null);});
  measure();
}
function status(p,text,error=false){let el=$('[data-workspace-status]',p);if(!el){el=document.createElement('p');el.dataset.workspaceStatus='';el.className='cdq-workspace-status';el.setAttribute('role','status');$('.cdq-workspace-body',p).append(el);}el.textContent=text;el.classList.toggle('cdq-workspace-error',error);}
function hidePages(){
  const reader=$('#cdqReaderFrame');if(reader)reader.hidden=true;
  window.cdqInventoryModernV2592?.close?.();window.cdqFacturesV2590?.close?.();window.cdqRapportsV2578?.close?.();
  for(const id of new Set(Object.values(pageByRoute))){const p=$('#'+id);if(!p)continue;if(p instanceof HTMLDialogElement){if(p.open)p.close();}else p.hidden=true;}
  for(const p of $$('.modal-overlay')){if(/access|music|auth|biometric/i.test(p.id))continue;if(getComputedStyle(p).display!=='none')p.style.display='none';}
  for(const p of $$('dialog[open]')){if(/access|auth|biometric/i.test(p.id))continue;p.close();}
  document.documentElement.classList.remove('cdq-report-open-v2578','cdq-inventory-modern-open-v2592','cdq-invoice-open-v2590');
}
export function navigate(route,{toggle=false,adopt=false}={}){
  if(route==='drive')route='dossier';if(route==='home')route='';if(toggle&&active===route)route='';
  if(!calibrationIdentity().email)return;
  const target=$('#'+pageByRoute[route]);
  if(!adopt)hidePages();else if(active&&active!==route){for(const [key,id] of Object.entries(pageByRoute)){const p=$('#'+id);if(p&&p!==target){if(p instanceof HTMLDialogElement&&p.open)p.close();else if(!(p instanceof HTMLDialogElement))p.hidden=true;}}}
  active=route;document.documentElement.classList.toggle('cdq-workspace-open',!!route);document.documentElement.dataset.cdqWorkspace=route;
  if(!route){driveEpoch++;opportunityEpoch++;document.getElementById('companyMenu')?.style.setProperty('display','none');measure();syncNav();return;}
  if(!adopt){
    if(route==='dossier'||route==='favorites')openDrive(route==='favorites'?'favorites':'drive');
    else if(route==='calcul')openCalcul();
    else if(route==='opportunities')openOpportunities();
    else if(route==='report')window.cdqRapportsV2578?.open?.();
    else if(route==='calibration')window.cdqCalibrationV2565?.open?.();
    else if(route==='inventory')(window.cdqInventoryModernV2592?.resume||window.cdqInventoryModernV2592?.open)?.();
    else if(route==='invoices')(window.cdqFacturesV2590?.resume||window.cdqFacturesV2590?.open)?.();
    else if(route==='trash'){try{ouvrirCorbeilleDrive();}catch(e){window.afficherErreur?.(e);}}
  }
  measure();syncNav();
  if(route==='report'&&!$('#cdqReportOverlayV2578:not([hidden])')){active='';document.documentElement.classList.remove('cdq-workspace-open');syncNav();}
}
function syncHome(){
  restoreDossierControls();
  const wrapper=$('.company-wrapper');
  if(wrapper&&!$('#cdqCreateClientV2640')){
    const create=document.createElement('button');create.type='button';create.id='cdqCreateClientV2640';create.className='company-reset-button';create.textContent='+';create.title='Créer un nouveau dossier client';create.setAttribute('aria-label','Créer un nouveau dossier client');
    create.onclick=()=>{if(!canWrite()||companyId())return;try{ouvrirCreationDossier();}catch(e){window.afficherErreur?.(e);}};wrapper.append(create);
  }
  const create=$('#cdqCreateClientV2640');if(create){const hidden=!!companyId();if(create.hidden!==hidden)create.hidden=hidden;create.disabled=!canWrite();}
  let actions=$('#cdqClientActionsV2640');const files=$('#filesContainer');
  if(!actions&&files){actions=document.createElement('div');actions.id='cdqClientActionsV2640';actions.className='cdq-workspace-actions';
    actions.innerHTML='<button type="button" data-client-folder>Nouveau dossier</button><button type="button" data-client-list>Liste de balance</button>';files.before(actions);
    $('[data-client-folder]',actions).onclick=()=>{if(!companyId()||!canWrite())return;try{ouvrirCreationDossier();}catch(e){window.afficherErreur?.(e);}};
    $('[data-client-list]',actions).onclick=()=>{if(companyId()&&canRead())window.cdqBalanceListV2638?.refresh?.(true).catch(e=>window.afficherErreur?.(e));};
  }
  if(actions){const hidden=!!active||!companyId()||!canRead();if(actions.hidden!==hidden)actions.hidden=hidden;$('[data-client-folder]',actions).disabled=!canWrite();}
}
function drivePage(){return page(pageByRoute.dossier,driveState.mode==='favorites'?'Favoris':'Dossiers','Dossiers partagés CDQ');}
function driveCacheKey(mode,id){return ownerKey()+'|'+mode+'|'+id;}
function openDrive(mode){
  const p=drivePage();p.hidden=false;if(!canRead()){$('.cdq-workspace-body',p).innerHTML='<section class="cdq-workspace-card"><h3>Lecture seule</h3><p>Les dossiers et favoris restent masqués sans accès Drive.</p></section>';return;}
  const same=mode===driveState.mode;driveState={...driveState,mode,id:mode==='favorites'?'':(same?driveState.id||GENERAL:GENERAL),query:''};loadDrive(false);
}
async function loadDrive(append=false,id=driveState.id){
  const p=drivePage(),mode=driveState.mode,key=driveCacheKey(mode,id),epoch=++driveEpoch,account=ownerKey();driveState.id=id;driveState.loading=true;
  const old=cache.get(key);if(!append){driveState.items=old?.items||[];driveState.crumbs=old?.crumbs||[];driveState.token=old?.token||'';}renderDrive();status(p,old&&!append?'Actualisation…':'Chargement…');
  try{const result=await rpc(mode==='favorites'?'obtenirFavorisGenerauxCDQV2521':'obtenirDossierGeneralCDQV2521',...(mode==='favorites'?[append?driveState.token:'']:[id,append?driveState.token:'']));if(epoch!==driveEpoch||account!==ownerKey()||!['dossier','favorites'].includes(active))return;
    const seen=new Set();driveState.items=(append?[...driveState.items,...(result.items||[])]:result.items||[]).filter(x=>!seen.has(x.id)&&seen.add(x.id));driveState.crumbs=result.crumbs||[];driveState.token=result.nextPageToken||'';driveState.loading=false;
    cache.set(key,{items:driveState.items.map(x=>({...x})),crumbs:driveState.crumbs,token:driveState.token});while(cache.size>12)cache.delete(cache.keys().next().value);renderDrive();status(p,driveState.items.length+' élément(s)'+(driveState.token?' · autres éléments disponibles':''));
  }catch(e){if(epoch===driveEpoch&&account===ownerKey()){driveState.loading=false;renderDrive();status(p,e.message,true);}}
}
function renderDrive(){
  const p=drivePage(),body=$('.cdq-workspace-body',p),mode=driveState.mode;$('.cdq-workspace-head h2',p).innerHTML=(mode==='favorites'?'Favoris':'Dossiers')+'<small>'+esc(mode==='favorites'?'Vos raccourcis personnels':driveState.crumbs.at(-1)?.nom||'Dossiers partagés CDQ')+'</small>';
  body.innerHTML='<input class="cdq-workspace-search" data-drive-search type="search" aria-label="Rechercher dans cette liste" placeholder="Rechercher dans cette liste" value="'+esc(driveState.query)+'"><div class="cdq-workspace-actions"><button data-drive-back>← Retour</button><button data-drive-root>Racine</button><button data-drive-refresh>Actualiser</button></div><nav class="cdq-workspace-crumbs" aria-label="Chemin du dossier"></nav><div class="cdq-workspace-list" data-drive-list></div><div class="cdq-workspace-actions"><button data-drive-more>Charger la suite</button></div><p data-workspace-status role="status" class="cdq-workspace-status"></p>';
  $('[data-drive-search]',p).oninput=e=>{driveState.query=e.target.value;renderDriveRows(p);};
  $('[data-drive-back]',p).disabled=mode==='favorites'||driveState.crumbs.length<2;$('[data-drive-back]',p).onclick=()=>loadDrive(false,driveState.crumbs.at(-2).id);
  $('[data-drive-root]',p).onclick=()=>{driveState.mode='drive';active='dossier';document.documentElement.dataset.cdqWorkspace=active;syncNav();loadDrive(false,GENERAL);};$('[data-drive-refresh]',p).onclick=()=>loadDrive(false);
  for(const crumb of driveState.crumbs){const b=document.createElement('button');b.textContent=crumb.nom;b.onclick=()=>loadDrive(false,crumb.id);$('.cdq-workspace-crumbs',p).append(b);}
  $('[data-drive-more]',p).hidden=!driveState.token;$('[data-drive-more]',p).disabled=driveState.loading;$('[data-drive-more]',p).onclick=()=>loadDrive(true);renderDriveRows(p);
}
function renderDriveRows(p){
  const list=$('[data-drive-list]',p);list.replaceChildren();const q=driveState.query.toLocaleLowerCase('fr'),items=driveState.items.filter(x=>(x.nom+' '+(x.path||'')).toLocaleLowerCase('fr').includes(q));
  for(const item of items){const row=document.createElement('article');row.className='cdq-workspace-row';row.innerHTML='<button type="button" class="open">'+workspaceIcon(item.kind==='folder'?'folder':'file')+'<span><strong>'+esc(item.nom)+'</strong><small>'+esc(item.path||(item.kind==='folder'?'Dossier':/pdf/.test(item.mimeType)?'PDF':'Fichier'))+'</small></span></button><button type="button" class="pin" aria-label="'+esc(item.favori?'Retirer des favoris':'Ajouter aux favoris')+'" aria-pressed="'+!!item.favori+'">'+(item.favori?'★':'☆')+'</button>';
    $('.open',row).onclick=async()=>{if(item.kind==='folder'){driveState.mode='drive';active='dossier';document.documentElement.dataset.cdqWorkspace=active;syncNav();await loadDrive(false,item.id);}else try{if(item.mimeType==='application/pdf')await window.cdqOpenPdfV2520?.(item.id,{nom:item.nom});else if(item.mimeType==='application/vnd.google-apps.spreadsheet')await window.cdqOpenSheetV2526?.(item.id);else window.open('https://drive.google.com/file/d/'+encodeURIComponent(item.id)+'/view','_blank','noopener');}catch(e){status(p,e.message,true);}};
    const pin=$('.pin',row);pin.onclick=async()=>{pin.disabled=true;try{const r=await rpc('definirFavoriGeneralCDQV2521',item.id,!item.favori);item.favori=r.favori;cache.clear();if(driveState.mode==='favorites')driveState.items=driveState.items.filter(x=>x.id!==item.id||item.favori);if(!p.hidden)renderDriveRows(p);}catch(e){status(p,e.message,true);}finally{pin.disabled=false;}};list.append(row);
  }
  if(!items.length)list.innerHTML='<section class="cdq-workspace-card"><h3>'+esc(q?'Aucun résultat':driveState.loading?'Chargement…':driveState.mode==='favorites'?'Aucun favori':'Dossier vide')+'</h3><p>'+esc(driveState.mode==='favorites'?'Touchez l’étoile d’un dossier ou d’un fichier pour le retrouver ici.':'Les dossiers s’ouvrent dans cette page; utilisez le chemin pour remonter.')+'</p></section>';
}
function field(label,name,value='',unit=''){return '<label>'+esc(label)+'<input name="'+name+'" inputmode="decimal" value="'+esc(value)+'" placeholder="'+esc(unit)+'"></label>';}
function units(name){return '<label>Unité<select name="'+name+'">'+['kg','g','mg','lb','oz','t'].map(u=>'<option>'+u+'</option>').join('')+'</select></label>';}
function calculatorCard(title,form){return '<section class="cdq-workspace-card"><h3>'+title+'</h3>'+form+'</section>';}
function openCalcul(){
  const p=page(pageByRoute.calcul,'Calcul','Outils de pesage');p.hidden=false;if($('[data-calcul-form]',p))return;const body=$('.cdq-workspace-body',p);
  body.innerHTML=calculatorCard('Divisions et GRADS','<p class="cdq-workspace-hint">Nombre de divisions = capacité maximale ÷ échelon. Les unités sont converties automatiquement. GRADS correspond au nombre de divisions pour les indicateurs qui emploient ce réglage.</p><form data-calcul-form="divisions"><div class="cdq-workspace-grid">'+field('Capacité maximale','capacity','5000')+units('capacityUnit')+field('Échelon','increment','0,5')+units('incrementUnit')+'</div><div class="cdq-workspace-actions"><button>Calculer</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form>')+
    calculatorCard('Kilogrammes ↔ livres','<form data-calcul-form="convert"><div class="cdq-workspace-grid">'+field('Valeur','value','1')+'<label>Conversion<select name="direction"><option value="kg">kg → lb</option><option value="lb">lb → kg</option></select></label></div><div class="cdq-workspace-actions"><button>Convertir</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form>')+
    calculatorCard('Charge et signal d’une cellule','<form data-calcul-form="signal"><div class="cdq-workspace-grid">'+field('Sensibilité (mV/V)','sensitivity','2')+field('Excitation (V)','excitation','10')+field('Capacité de la cellule','capacity','1000')+field('Charge appliquée, même unité','load','500')+'</div><div class="cdq-workspace-actions"><button>Calculer le signal</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form><p class="cdq-workspace-hint">Signal théorique au-dessus du zéro. Une boîte de jonction ou plusieurs cellules demandent une interprétation adaptée.</p>')+
    calculatorCard('Pont de résistance à quatre fils','<p>Débranchez la cellule de l’indicateur et coupez l’alimentation avant les mesures. N’incluez pas les fils Sense ni le blindage. Nommez les quatre fils A, B, C et D, puis mesurez chaque paire en ohms.</p><svg class="cdq-bridge-schema" viewBox="0 0 320 190" aria-label="Pont de Wheatstone, quatre résistances, quatre points de mesure"><path d="M160 25L80 95l80 70 80-70z"/><path d="M160 5v20m-100 70h20m160 0h20m-100 70v20"/><rect x="109" y="49" width="22" height="12" transform="rotate(-41 120 55)"/><rect x="189" y="49" width="22" height="12" transform="rotate(41 200 55)"/><rect x="109" y="127" width="22" height="12" transform="rotate(41 120 133)"/><rect x="189" y="127" width="22" height="12" transform="rotate(-41 200 133)"/><text x="146" y="18">E+</text><text x="253" y="100">S+</text><text x="146" y="183">E−</text><text x="35" y="100">S−</text></svg><p class="cdq-workspace-hint">Schéma de principe. Les lettres A–D ci-dessous sont vos repères de fils; elles ne désignent pas encore E/S.</p><form data-calcul-form="bridge"><div class="cdq-workspace-grid">'+bridgePairs.map(pair=>field(pair+' (Ω)','r'+pair,'','Mesure ou OL')).join('')+field('Entrée nominale du certificat (Ω), facultatif','nominalInput')+field('Sortie nominale du certificat (Ω), facultatif','nominalOutput')+field('Tolérance de comparaison (%)','tolerance','5')+'</div><div class="cdq-workspace-actions"><button>Analyser les six mesures</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form><p class="cdq-workspace-hint">Les résistances seules ne confirment ni la polarité ni tous les défauts. Les cellules symétriques peuvent avoir une entrée et une sortie indiscernables. Comparez le certificat; confirmez E+/E− et S+/S− avec le fabricant et un essai de signal sous excitation.</p><a href="https://www.ricelake.com/resources/articles/advanced-load-cell-troubleshooting" target="_blank" rel="noopener">Méthode de diagnostic Rice Lake</a>');
  for(const form of $$('[data-calcul-form]',p))form.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form)),out=$('output',form);try{out.classList.remove('cdq-workspace-error');
    if(form.dataset.calculForm==='divisions'){const r=divisions(v.capacity,v.increment,v.capacityUnit,v.incrementUnit);out.textContent=fmt(r.count)+' divisions · GRADS = '+fmt(r.count)+(r.whole?'':' · résultat non entier : vérifiez la capacité et l’échelon.');}
    else if(form.dataset.calculForm==='convert'){const to=v.direction==='kg'?'lb':'kg';out.textContent=fmt(convertMass(v.value,v.direction,to))+' '+to;}
    else if(form.dataset.calculForm==='signal')out.textContent=fmt(expectedSignal(v.sensitivity,v.excitation,v.load,v.capacity))+' mV · '+fmt(percentLoad(v.load,v.capacity))+' % de la capacité';
    else{const r=analyzeBridge(Object.fromEntries(bridgePairs.map(p=>[p,v['r'+p]])),v);out.innerHTML='<strong>'+esc(r.identified?'Entrée probable : '+r.input+' · sortie probable : '+r.output:r.open.length||r.short.length?'Anomalie à vérifier':'Entrée et sortie non confirmées')+'</strong>'+(r.warnings.length?'<ul class="cdq-bridge-warnings">'+r.warnings.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'<p>Les six valeurs sont cohérentes avec un pont habituel. Cela ne garantit pas que la cellule est fonctionnelle.</p>');}
  }catch(e){out.textContent=e.message;out.classList.add('cdq-workspace-error');}};
}
function openOpportunities(){
  const p=page(pageByRoute.opportunities,'Opportunités','Suivi commercial CDQ');p.hidden=false;if(!canRead()){$('.cdq-workspace-body',p).innerHTML='<section class="cdq-workspace-card"><h3>Lecture seule</h3><p>Les opportunités et les modifications restent masquées sans accès Drive.</p></section>';return;}
  if(!$('[data-op-form]',p)){
    $('.cdq-workspace-body',p).innerHTML='<section class="cdq-workspace-card"><h3>Nouvelle opportunité</h3><form data-op-form><div class="cdq-workspace-grid"><label class="wide">Titre<input name="titre" maxlength="180" required placeholder="Projet ou besoin du client"></label><label>Client<input name="clientNom" maxlength="180" value="'+esc(companyName())+'"></label><label>Contact<input name="contact" maxlength="180"></label><label>Étape<select name="etape">'+['À qualifier','Contact établi','Proposition','Négociation','Gagnée','Perdue'].map(t=>'<option>'+t+'</option>').join('')+'</select></label><label>Valeur estimée (CAD)<input name="montant" inputmode="decimal"></label><label>Prochain suivi<input name="suivi" type="date"></label><label>Responsable<input name="responsable" value="'+esc(typeof utilisateurCourantNomRapport!=='undefined'?utilisateurCourantNomRapport:'')+'" maxlength="120"></label><label class="wide">Notes<textarea name="notes" maxlength="2000"></textarea></label></div><div class="cdq-workspace-actions"><button class="primary" data-op-save>Créer l’opportunité</button></div></form></section><input type="search" class="cdq-workspace-search" data-op-search aria-label="Rechercher une opportunité" placeholder="Client, titre ou étape"><div data-op-list class="cdq-workspace-list"></div><p data-workspace-status role="status" class="cdq-workspace-status"></p>';
    $('[data-op-search]',p).oninput=()=>renderOpportunities(p);
    $('[data-op-form]',p).onsubmit=async e=>{e.preventDefault();const form=e.target,b=$('[data-op-save]',p);b.disabled=true;const payload=Object.fromEntries(new FormData(form));payload.clientId=payload.clientNom===companyName()?companyId():'';payload.requestId=form.dataset.requestId||(form.dataset.requestId='op-'+crypto.randomUUID());try{const r=await rpc('cdqEnregistrerOpportuniteV2638',payload);if(!r?.ok)throw Error('Enregistrement non confirmé.');opportunities=[r.item,...opportunities.filter(x=>x.id!==r.item.id)];form.reset();delete form.dataset.requestId;renderOpportunities(p);status(p,'Opportunité enregistrée.');}catch(e){status(p,e.message,true);}finally{b.disabled=!canWrite();}};
  }
  $('[data-op-save]',p).disabled=!canWrite();for(const input of $$('[data-op-form] input,[data-op-form] select,[data-op-form] textarea',p))input.disabled=!canWrite();renderOpportunities(p);
  const epoch=++opportunityEpoch;status(p,'Actualisation…');rpc('cdqListerOpportunitesV2638').then(r=>{if(epoch!==opportunityEpoch)return;opportunities=r.items||[];if(!p.hidden){renderOpportunities(p);status(p,opportunities.length+' opportunité(s)');}}).catch(e=>{if(epoch===opportunityEpoch)status(p,e.message,true);});
}
function renderOpportunities(p){
  const list=$('[data-op-list]',p);if(!list)return;const query=$('[data-op-search]',p).value.toLocaleLowerCase('fr');list.replaceChildren();
  for(const item of opportunities.filter(x=>(x.titre+' '+x.clientNom+' '+x.etape).toLocaleLowerCase('fr').includes(query))){const card=document.createElement('article');card.className='cdq-workspace-card';card.innerHTML='<span class="cdq-opportunity-badge">'+esc(item.etape)+'</span><h3>'+esc(item.titre)+'</h3><p>'+esc(item.clientNom)+(item.contact?' · '+esc(item.contact):'')+'</p><p>'+esc(item.montant?fmt(item.montant)+' CAD':'Valeur à préciser')+(item.suivi?' · suivi : '+esc(item.suivi):'')+'</p><p class="cdq-workspace-hint">'+esc(item.responsable)+'</p><p>'+esc(item.notes)+'</p><label>Étape<select data-op-stage>'+['À qualifier','Contact établi','Proposition','Négociation','Gagnée','Perdue'].map(t=>'<option '+(t===item.etape?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
    const select=$('[data-op-stage]',card);select.disabled=!canWrite();select.onchange=async()=>{select.disabled=true;try{const r=await rpc('cdqEnregistrerOpportuniteV2638',{...item,etape:select.value,expectedRevision:item.revision,requestId:'op-'+crypto.randomUUID()});Object.assign(item,r.item);status(p,'Étape enregistrée.');}catch(e){select.value=item.etape;status(p,e.message,true);}finally{select.disabled=!canWrite();}};list.append(card);
  }
  if(!list.children.length)list.innerHTML='<section class="cdq-workspace-card"><h3>Aucune opportunité</h3><p>Créez un suivi pour un besoin futur, une soumission ou un projet client.</p></section>';
}
function adoptPages(){
  if(!calibrationIdentity().email)return;
  for(const [route,id] of Object.entries(pageByRoute)){
    if(['drive','favorites','dossier','calcul','opportunities'].includes(route))continue;const p=$('#'+id);if(!p)continue;
    const shown=p instanceof HTMLDialogElement?p.open:!p.hidden;
    if(shown&&active!==route){navigate(route,{adopt:true});return;}
  }
  const p=$('#'+pageByRoute[active]);if(p&&(p instanceof HTMLDialogElement?!p.open:p.hidden)){active='';document.documentElement.classList.remove('cdq-workspace-open');syncNav();}
}
function restoreDossierControls(){const host=document.querySelector('.desktop-main')||document.body;for(const name of ['selectionBar','filesContainer','sendArea','message']){const el=document.getElementById(name);if(el&&el.closest('#cdqDossierPageV2638'))host.append(el);}}
function clearPrivate(){homeAfterReader=false;homeReaderSource=null;driveEpoch++;opportunityEpoch++;cache.clear();opportunities=[];driveState={mode:'drive',id:GENERAL,items:[],crumbs:[],token:'',query:'',loading:false};restoreDossierControls();for(const id of ['cdqDossierPageV2638','cdqDrivePageV2638','cdqOpportunitiesPageV2638'])$('#'+id)?.remove();hidePages();active='';document.documentElement.classList.remove('cdq-workspace-open');syncNav();}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(observedOwner!==ownerKey()){observedOwner=ownerKey();clearPrivate();}syncNav();adoptPages();});}
function returnHome(){
  homeAfterReader=false;homeReaderSource=null;navigate('');
  try{deselectionnerCompagnie();if(typeof cdqDossierOuvertId!=='undefined')cdqDossierOuvertId=null;if(typeof cdqDossierOuvertNom!=='undefined')cdqDossierOuvertNom='';}catch{}
  syncNav();window.scrollTo({top:0,left:0,behavior:'auto'});
}
function readerClosed(){if(homeAfterReader)returnHome();}
function readerCancelled(){homeAfterReader=false;homeReaderSource=null;}
function requestHome(){
  const reader=$('#cdqReaderFrame');
  if(document.documentElement.classList.contains('cdq-workspace-reader-open')){
    homeAfterReader=true;
    if(reader&&!reader.hidden){homeReaderSource=reader.contentWindow;homeReaderSource?.postMessage({type:'CDQ_READER_REQUEST_CLOSE'},new URL(reader.src||location.href,location.href).origin);}
    else window.parent.postMessage({type:'CDQ_WORKSPACE_READER_HOME_V2640'},location.origin);
    return;
  }
  returnHome();
}
function start(){
  observedOwner=ownerKey();syncNav();
  // Capture at window before legacy navigation handlers. The same route closes,
  // another route switches; unsaved invoice inputs remain in their existing DOM.
  window.addEventListener('click',e=>{const b=e.target.closest?.('.bottom-nav-item');if(!b)return;const route=b.dataset.workspaceRoute||labels[$('small',b)?.textContent.trim()];if(!route)return;e.preventDefault();e.stopImmediatePropagation();if(route==='home'){requestHome();return;}navigate(route,{toggle:true});},true);
  window.addEventListener('message',e=>{if(!homeReaderSource||e.source!==homeReaderSource)return;if(e.data?.type==='CDQ_READER_CLOSE')readerClosed();if(e.data?.type==='CDQ_READER_CLOSE_CANCELLED_V2640')readerCancelled();});
  const choose=window.choisirCompagnie;if(typeof choose==='function')window.choisirCompagnie=function(...args){const r=choose.apply(this,args);if(canRead()){navigate('');window.cdqFastContextV2642?.warm(companyId());}schedule();return r;};
  if(window.cdqDriveV2521){window.cdqDriveV2521.open=()=>navigate('dossier');window.cdqDriveV2521.openFavorites=()=>navigate('favorites');window.cdqDriveV2521.close=()=>{if(['dossier','favorites'].includes(active))navigate('');};}
  window.addEventListener('resize',measure,{passive:true});window.visualViewport?.addEventListener('resize',measure,{passive:true});
  if(window.ResizeObserver){const ro=new ResizeObserver(measure);for(const el of [$('#appHeader'),$('.bottom-nav')])if(el)ro.observe(el);}
  new MutationObserver(records=>{if(records.some(r=>[...r.removedNodes].some(n=>n.id==='cdqReaderFrame')))document.documentElement.classList.remove('cdq-workspace-reader-open');if(records.some(r=>r.type==='childList'||r.attributeName==='hidden'||r.attributeName==='open'))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open']});
  document.addEventListener('cdq:icons-changed',schedule);window.addEventListener('storage',schedule);window.addEventListener('cdq:access-ready',schedule);window.addEventListener('cdq:drive-cleared-v2632',clearPrivate);window.addEventListener('cdq:access-state-v2527',e=>{if(e.detail!=='ready')clearPrivate();});
  // Existing data modules are bundled and may be warmed only after both checks.
  window.addEventListener('cdq:drive-ready-v2632',()=>{if(!canRead())return;import('./calibration-db-v2565.mjs').catch(()=>{});});
}
window.cdqWorkspaceV2638={navigate,measure,readerClosed,readerCancelled,active:()=>active,version:'26.42'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
