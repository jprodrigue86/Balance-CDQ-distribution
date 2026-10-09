import {sharedNavigationIconV2685} from './navigation-art-v2685.mjs';
import {createCommercialWorkspace,commercialIcon,opportunityTabs} from './commercial-v2721.mjs';
import {driveFileIconV2710} from './drive-file-icons-v2710.mjs';
import {navigationStyleV2708} from './navigation-style-v2708.mjs';
import {compareCornerSignals,cornerNames,wirePairLabel} from './corner-signals-v2677.mjs';
import {divisions,convertMass,analyzeBridge,bridgePairs} from './weighing-calculations-v2638.mjs';
import {analyzeSixWireBridge,sixWirePairs} from './bridge-six-v2658.mjs';
import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
import {createDriveCache} from './drive-cache-v2677.mjs';
import {saleTypesV2699,pipelinesV2699,stagesV2699,encodeOpportunityV2699,decodeOpportunityV2699,driveFileKindV2699} from './opportunity-fields-v2699.mjs';
import {installDriveActionsV2699} from './drive-actions-v2699.mjs';
import {createDriveTrashClientV2713} from './pc-drive-trash-v2718.mjs';
import {createDriveTrashClientV2713 as legacyTrashV2717} from './pc-drive-trash-v2717.mjs';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toLocaleString('fr-CA',{maximumFractionDigits:8});
const GENERAL='1F7rgU20Hc1PmjxQHY7ALTqkqArN6RSsf';
const paths={calcul:'<rect x="6" y="3" width="20" height="26" rx="3"/><path d="M10 7h12v5H10zM10 17h2m4 0h2m4 0h0M10 22h2m4 0h2m4 0v3"/>',opportunities:'<path d="M4 26h24M7 23V13h5v10m4 0V9h5v14m4-9V4M19 4h6v6M7 9l7-4 4 2 7-3"/>',drive:'<path d="M3 9V6h10l3 4h13v16H3z"/>',folder:'<path d="M3 9V6h10l3 4h13v16H3z"/>',report:'<path d="M7 3h13l6 6v20H7zM20 3v6h6M11 14h11m-11 5h11m-11 5h7"/>',camera:'<path d="M3 10h6l3-5h8l3 5h6v17H3z"/><circle cx="16" cy="18" r="6"/>',gallery:'<rect x="3" y="4" width="26" height="24" rx="3"/><circle cx="22" cy="10" r="2"/><path d="M4 24l8-10 7 7 4-4 6 7"/>',file:'<path d="M7 3h13l6 6v20H7zM20 3v6h6"/>'};
export function workspaceIcon(key,style='current'){
  const businessIcon=commercialIcon(key,style);if(businessIcon)return businessIcon;
  const matching=navigationStyleV2708(key,style);if(matching)return matching;
  const special=globalThis.window?.cdqSpecialIconsV2658?.svg(key,style);if(special)return special;
  if(!['current','minimal','dark-pro','metal-music','isometric'].includes(style))style='current';
  if(style==='metal-music'&&['calcul','opportunities','drive'].includes(key))return sharedNavigationIconV2685(key,'cdq-workspace-art-v2639','data-icon-theme');
  const badge={pdf:'PDF',sheet:'XLS',doc:'DOC',slides:'PPT'}[key];
  const body=paths[key]||(badge?paths.file+'<text x="16.5" y="22" text-anchor="middle" fill="currentColor" stroke="none" font-size="7" font-family="Arial,sans-serif" font-weight="700">'+badge+'</text>':paths.file);
  const drawing=style==='dark-pro'
    ?'<rect x="1" y="1" width="30" height="30" rx="7" fill="#111a24" stroke="#71899f"/><g transform="translate(3 3) scale(.81)" stroke="#c5e5f5" stroke-width="2">'+body+'</g>'
    :style==='isometric'
    ?'<path d="m2 8 7-5 21 5v19l-7 5-21-5z" fill="#18394b" stroke="#84c5df"/><path d="m2 8 21 5 7-5M23 13v19" stroke="#9ee1f3"/><g transform="matrix(.68,.16,0,.67,2,6)" stroke="#e0fbff" stroke-width="2.4">'+body+'</g>'
    :'<g stroke-width="'+(style==='minimal'?1.6:2.4)+'">'+body+'</g>';
  return '<svg data-icon-theme="'+style+'" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+drawing+'</svg>';
}
const companyId=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
const companyName=()=>{try{return String(nomCompagnieSelectionnee||'');}catch{return '';}};
const canRead=()=>!!window.cdqDriveEntryV2632?.canRead();
const canWrite=()=>canRead()&&['admin','technicien'].includes(calibrationIdentity().role);
const ownerKey=()=>calibrationIdentity().email+'|'+calibrationIdentity().role;
async function rpc(name,...args){const key=ownerKey();if(!canRead())throw Error('Accès Drive requis.');const result=await calibrationRpc(name,...args);if(key!==ownerKey()||!canRead())throw Error('Le compte a changé.');return result;}
const driveCache=createDriveCache({owner:ownerKey,allowed:canRead,fetchFolder:(id,mode)=>rpc(mode==='favorites'?'obtenirFavorisGenerauxCDQV2521':'obtenirDossierGeneralCDQV2521',...(mode==='favorites'?['']:[id,'']))});
let homeAfterReader=false,homeReaderSource=null,pendingNavigation=null;
let active='',observedOwner='',queued=false,driveEpoch=0,driveState={mode:'drive',id:GENERAL,lastDriveId:GENERAL,items:[],crumbs:[],token:'',query:'',loading:false},opportunities=[],opportunityEpoch=0;
const pageByRoute={dossier:'cdqDrivePageV2638',favorites:'cdqDrivePageV2638',calcul:'cdqCalculPageV2638',opportunities:'cdqOpportunitiesPageV2638',report:'cdqReportOverlayV2578',calibration:'cdqCalibrationDialogV2565',inventory:'cdqInventoryModernV2592',catalog:'cdqCatalogPageV2721',opportunityBoard:'cdqOpportunityBoardV2721',invoices:'cdqInvoicePageV2590',trash:'cdqTrashPageV2713'};
const labels={Accueil:'home',Dossier:'dossier',Dossiers:'dossier',Favoris:'favorites',Rapport:'report',Calibration:'calibration',Calcul:'calcul',Inventaire:'inventory',Catalogue:'catalog',Factures:'invoices',Opportunités:'opportunities','Gestion des opportunités':'opportunityBoard',Corbeille:'trash'};
const order=[...new Set(Object.values(labels))];
const navColors={home:'#2466ff',dossier:'#ff49b6',favorites:'#ffd34d',report:'#458fff',calibration:'#00deee',calcul:'#ff8b19',inventory:'#aa4dff',catalog:'#c77dff',opportunityBoard:'#21e966',invoices:'#ffd839',opportunities:'#21e966',drive:'#48ceff',trash:'#ff3544'};
function page(id,title,subtitle=''){
  let p=$('#'+id);if(p)return p;p=document.createElement('section');p.id=id;p.className='cdq-workspace-page';p.hidden=true;p.setAttribute('aria-label',title);
  p.innerHTML='<header class="cdq-workspace-head"><h2>'+esc(title)+'<small>'+esc(subtitle)+'</small></h2><button type="button" data-workspace-close aria-label="Fermer la page">×</button></header><main class="cdq-workspace-body"></main>';
  document.body.append(p);$('[data-workspace-close]',p).onclick=()=>navigate('');return p;
}
const commercial=createCommercialWorkspace({owner:ownerKey,canRead,canWrite,rpc,page,navigate,theme:iconTheme,getOpportunities:()=>opportunities,opportunityEpoch:()=>opportunityEpoch,setOpportunities:items=>{opportunityEpoch++;opportunities=items;},updateOpportunity:item=>{opportunityEpoch++;const old=opportunities.find(x=>x.id===item.id);if(old)Object.assign(old,item);else opportunities.unshift(item);const p=document.getElementById(pageByRoute.opportunities);if(p&&!p.hidden)renderOpportunities(p);}});
function measure(){
  const root=document.documentElement;if(!root.classList.contains('cdq-mobile-layout'))return;
  const header=$('#appHeader'),nav=$('.bottom-nav'),top=root.classList.contains('cdq-desktop-v2676')?(parseFloat(getComputedStyle(root).getPropertyValue('--cdq-pc-top'))||152):Math.max(0,Math.ceil(header?.getBoundingClientRect().bottom||0));
  const h=window.visualViewport?.height||innerHeight,bottom=root.classList.contains('cdq-desktop-v2676')?10:Math.max(0,Math.ceil(h-(nav?.getBoundingClientRect().top||h)));
  const set=(key,value)=>{if(root.style.getPropertyValue(key)!==value)root.style.setProperty(key,value);};
  set('--cdq-workspace-top',top+'px');set('--cdq-workspace-bottom',bottom+'px');
  root.dataset.cdqWorkspaceOwner=ownerKey();
  const accessState=typeof cdqAccessState==='undefined'?'ready':cdqAccessState,account=typeof utilisateurCourantEmail==='undefined'?'':String(utilisateurCourantEmail||'');
  const reader=$('#cdqReaderFrame');if(reader){reader.dataset.workspaceRoute??=active;reader.hidden=!canRead()&&!['pending','checking'].includes(accessState);root.classList.toggle('cdq-workspace-reader-open',!reader.hidden);const readerTop=root.classList.contains('cdq-desktop-v2676')?top:Math.max(0,Math.ceil(header?.getBoundingClientRect().bottom||0));reader.style.setProperty('height',Math.max(0,h-readerTop-bottom)+'px','important');set('--cdq-workspace-top',readerTop+'px');}
  const payload={type:'CDQ_WORKSPACE_LAYOUT_V2638',top,bottom,route:active,owner:ownerKey(),account,accessState,canRead:canRead()};
  const signature=JSON.stringify(payload);if(measure.last!==signature){measure.last=signature;window.parent.postMessage(payload,location.origin);}
}
function iconTheme(){if(window.cdqIconThemesV2514?.getStyle)return window.cdqIconThemesV2514.getStyle();try{return JSON.parse(localStorage.getItem('cdqIconThemeV2514:'+calibrationIdentity().email)||'null')?.style||'current';}catch{return 'current';}}
function syncHeadings(){
  const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="'+path+'"/></svg>';
  for(const [head,title,subtitle] of [
    ['.cdq-im-top','.cdq-im-title strong','.cdq-im-title small'],
    ['.cdq-workspace-head','h2','h2 small'],
    ['.cdq-invoice-title','h2','p'],
    ['#cdqReportOverlayV2578 header','h2','[data-report-context]'],
    ['.cdq-cal-head','h2','h2 small']
  ])for(const h of $$(head)){
    h.setAttribute('data-cdq-heading-v2671','');
    $(title,h)?.setAttribute('data-cdq-heading-title-v2671','');
    $(subtitle,h)?.setAttribute('data-cdq-heading-subtitle-v2671','');
    const layout=$('.cdq-im-head',h)||h;
    layout.setAttribute('data-cdq-heading-layout-v2675','');
    const key=h.closest('#cdqCatalogPageV2721')?'catalog':h.closest('#cdqOpportunityBoardV2721')?'opportunities':h.closest('#cdqTrashPageV2713')?'trash':h.closest('#cdqCalibrationDialogV2565')?'calibration':h.closest('#cdqInventoryModernV2592')?'inventory':h.closest('#cdqInvoicePageV2590')?'invoices':h.closest('#cdqReportOverlayV2578')?'report':h.closest('#cdqCalculPageV2638')?'calcul':h.closest('#cdqOpportunitiesPageV2638')?'opportunities':'dossier';
    let visual=$(':scope > [data-cdq-heading-icon-v2675]',layout);
    if(!visual){visual=document.createElement('span');visual.dataset.cdqHeadingIconV2675='';visual.setAttribute('aria-hidden','true');layout.prepend(visual);}
    const theme=iconTheme();const source=$('.bottom-nav-item[data-workspace-route="'+key+'"] > :is(span,svg,img,div,i)'),art=source?.outerHTML||(key==='report'?window.cdqActionArtworkV2657?.('copy',theme,document.documentElement.dataset.cdqPalette||'dark'):null)||workspaceIcon(key,theme);if(visual.dataset.theme!==theme||visual.dataset.art!==art){visual.innerHTML=art;visual.dataset.theme=theme;visual.dataset.art=art;}
    // Sprite artwork is painted by a navigation-only pseudo-element. Carry its
    // actual image and tile coordinates into the heading's independent square.
    if(source?.classList.contains('cdq-icon-host-v2514')){
      const sprite=visual.firstElementChild,paint=getComputedStyle(source,'::after');
      const styles={'background-image':paint.backgroundImage,'background-size':paint.backgroundSize,'background-position':paint.backgroundPosition,'background-repeat':'no-repeat','clip-path':paint.clipPath,filter:paint.filter,'visibility':'visible',width:'56px',height:'56px','min-width':'56px','max-width':'56px','min-height':'56px','max-height':'56px'};
      for(const [property,value]of Object.entries(styles))if(sprite.style.getPropertyValue(property)!==value)sprite.style.setProperty(property,value,'important');
    }
    const original=$(':scope > .cdq-calibration-indicator',layout);if(original)original.hidden=true;
    if(h.matches('.cdq-invoice-title')){
      let center=$('[data-cdq-heading-center-v2675]',h);if(!center){center=$('h2',h)?.parentElement;center?.setAttribute('data-cdq-heading-center-v2675','');}
    }else{const title=$('h2',layout),center=$('.cdq-im-title',layout)||(title?.parentElement!==layout?title?.parentElement:title);center?.setAttribute('data-cdq-heading-center-v2675','');}

    for(const b of $$('[data-workspace-close],[data-inv-close],[data-report-close],[data-cal-close],#cdqImClose',h)){
      if(b.hasAttribute('data-cdq-heading-close-v2671'))continue;
      b.setAttribute('data-cdq-heading-close-v2671','');b.innerHTML=icon('M6 6l12 12 M18 6L6 18');
    }
    for(const b of $$('[data-report-back],[data-cal-back],#cdqImBack',h)){
      if(b.hasAttribute('data-cdq-heading-back-v2671'))continue;
      b.setAttribute('data-cdq-heading-back-v2671','');b.innerHTML=icon('M19 12H5 M11 6l-6 6 6 6');
    }
  }
}
function syncNav(){
  syncHeadings();
  const nav=$('.bottom-nav');if(!nav)return;
  document.documentElement.dataset.cdqWorkspaceUnlocked=calibrationIdentity().email?'true':'false';
  for(const [label,key] of [['Calcul','calcul'],['Catalogue','catalog'],['Opportunités','opportunities']]){
    if($('[data-workspace-route="'+key+'"]',nav))continue;
    const b=document.createElement('button');b.type='button';b.className='bottom-nav-item';b.dataset.workspaceRoute=key;b.setAttribute('aria-label',label);b.innerHTML='<span class="cdq-workspace-icon">'+workspaceIcon(key)+'</span><small>'+label+'</small>';nav.append(b);
  }
  for(const b of $$('.bottom-nav-item',nav))if(['drive','favorites','report','opportunityBoard'].includes(b.dataset.workspaceRoute)||['Drive général','Mon Drive','Favoris','Rapport','Gestion des opportunités'].includes($('small',b)?.textContent.trim()))b.remove();
  syncHome();
  const theme=iconTheme();document.documentElement.dataset.cdqIconStyle=theme;for(const [selector,key]of [['[data-drive-root] .cdq-drive-action-icon','root'],['[data-drive-refresh] .cdq-drive-action-icon','refresh']])for(const host of $$(selector))if(host.dataset.theme!==theme){host.dataset.theme=theme;host.innerHTML=workspaceIcon(key,theme);}
  for(const b of $$('.bottom-nav-item',nav)){
    const name=$('small',b)?.textContent.trim(),key=labels[name]||b.dataset.workspaceRoute;if(!key)continue;b.dataset.workspaceRoute=key;
    const current=(active&&active!=='report'?key===(active==='opportunityBoard'?'opportunities':active):key==='home')?'true':'false';if(b.dataset.cdqCurrent!==current)b.dataset.cdqCurrent=current;
    if(b.getAttribute('aria-current')!==(current==='true'?'page':'false'))b.setAttribute('aria-current',current==='true'?'page':'false');
    if(['calcul','opportunities','drive','catalog','opportunityBoard'].includes(key)){
      let host=$(':scope > span',b);const business=['catalog','opportunityBoard'].includes(key),drawing=host?.querySelector('svg[data-commercial-icon]');if(host&&(host.dataset.workspaceTheme!==theme||(business&&(!drawing||drawing.dataset.commercialIcon!==key||drawing.dataset.iconTheme!==theme)))){host.className='cdq-workspace-icon';host.innerHTML=workspaceIcon(key,theme);host.dataset.workspaceTheme=theme;}
    }
    const color=navColors[key]||'#48ceff';if(b.style.getPropertyValue('--cdq-nav-accent')!==color)b.style.setProperty('--cdq-nav-accent',color);
    const label=$('small',b);if(label){for(const prop of ['color','-webkit-text-fill-color'])if(label.style.getPropertyValue(prop)!=='var(--cdq-ink)')label.style.setProperty(prop,'var(--cdq-ink)','important');}
  }
  for(const svg of $$('svg[data-commercial-icon]'))if(svg.dataset.iconTheme!==theme){const markup=commercialIcon(svg.dataset.commercialIcon,theme);if(markup)svg.outerHTML=markup;}
  const sorted=$$('.bottom-nav-item',nav).sort((a,b)=>(order.indexOf(a.dataset.workspaceRoute)+1||99)-(order.indexOf(b.dataset.workspaceRoute)+1||99));
  sorted.forEach((b,i)=>{if(nav.children[i]!==b)nav.insertBefore(b,nav.children[i]||null);});
  window.cdqInterfaceV2708?.applyOrder();
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
export function navigate(route,{toggle=false,adopt=false,userInitiated=false}={}){
  if(!adopt&&document.documentElement.classList.contains('cdq-workspace-reader-open')){
    if(userInitiated){pendingNavigation={route,toggle};window.parent.postMessage({type:'CDQ_WORKSPACE_READER_NAV_V2677',userInitiated:true,readerSession:document.documentElement.dataset.cdqReaderSessionV2679},location.origin);}
    return;
  }
  const favorites=route==='favorites';
  if(route==='drive'||favorites)route='dossier';if(route==='home')route='';if(toggle&&active===route)route='';
  if(!calibrationIdentity().email)return;
  const target=$('#'+pageByRoute[route]);
  if(!adopt)hidePages();else if(active&&active!==route){for(const [key,id] of Object.entries(pageByRoute)){const p=$('#'+id);if(p&&p!==target){if(p instanceof HTMLDialogElement&&p.open)p.close();else if(!(p instanceof HTMLDialogElement))p.hidden=true;}}}
  active=route;document.documentElement.classList.toggle('cdq-workspace-open',!!route);document.documentElement.dataset.cdqWorkspace=route;
  if(!route){driveEpoch++;opportunityEpoch++;document.getElementById('companyMenu')?.style.setProperty('display','none');measure();syncNav();return;}
  if(!adopt){
    if(route==='dossier')openDrive(favorites?'favorites':'drive');
    else if(route==='calcul')openCalcul();
    else if(route==='opportunities')openOpportunities();
    else if(route==='catalog')commercial.openCatalog();
    else if(route==='opportunityBoard')commercial.openBoard();
    else if(route==='report')window.cdqRapportsV2578?.open?.();
    else if(route==='calibration')window.cdqCalibrationV2565?.open?.();
    else if(route==='inventory')(window.cdqInventoryModernV2592?.resume||window.cdqInventoryModernV2592?.open)?.();
    else if(route==='invoices')(window.cdqFacturesV2590?.resume||window.cdqFacturesV2590?.open)?.();
    else if(route==='trash')openTrash();
  }
  measure();syncNav();
  if(route==='report'&&!$('#cdqReportOverlayV2578:not([hidden])')){active='';document.documentElement.classList.remove('cdq-workspace-open');syncNav();}
}
function syncHome(){
  restoreDossierControls();
  document.querySelectorAll('#companyMenu .cdq-company-drive').forEach(button=>button.remove());
  const wrapper=$('.company-wrapper');
  if(wrapper&&!$('#cdqCreateClientV2640')){
    const create=document.createElement('button');create.type='button';create.id='cdqCreateClientV2640';create.className='company-reset-button';create.textContent='+';create.title='Créer un nouveau dossier client';create.setAttribute('aria-label','Créer un nouveau dossier client');
    create.onclick=()=>{if(!canWrite())return;try{if(companyId())window.cdqClientRenameV2665?.open({id:companyId(),nom:companyName()});else ouvrirCreationDossier();}catch(e){window.afficherErreur?.(e);}};wrapper.append(create);
  }
  const create=$('#cdqCreateClientV2640');if(create){
    const editing=!!companyId(),mode=editing?'rename':'create';create.hidden=false;create.disabled=!canWrite();
    if(create.dataset.companyAction!==mode){create.dataset.companyAction=mode;
      create.innerHTML=editing?'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5M3 21l5-1L21 7a2 2 0 0 0-4-4L4 16z"/></svg>':'+';
      create.title=editing?'Modifier le nom de la compagnie':'Créer une nouvelle compagnie';create.setAttribute('aria-label',create.title);
    }
  }
  let actions=$('#cdqClientActionsV2640');const files=$('#filesContainer');
  if(!actions&&files){actions=document.createElement('div');actions.id='cdqClientActionsV2640';actions.className='cdq-workspace-actions';
    actions.innerHTML='<button type="button" data-client-folder>Nouveau dossier</button><button type="button" data-client-list>Liste de balance</button><button type="button" data-client-report>Nouveau rapport</button>';files.before(actions);
    $('[data-client-folder]',actions).onclick=()=>{if(!companyId()||!canWrite())return;try{ouvrirCreationDossier();}catch(e){window.afficherErreur?.(e);}};
    $('[data-client-report]',actions).onclick=()=>{if(companyId()&&canWrite())window.cdqRapportsV2578?.menu();};
    $('[data-client-list]',actions).onclick=()=>{if(companyId()&&canRead())window.cdqBalanceListV2638?.menu?.();};
  }
  if(actions){const hidden=!!active||!companyId()||!canRead();if(actions.hidden!==hidden)actions.hidden=hidden;$('[data-client-folder]',actions).disabled=!canWrite();$('[data-client-report]',actions).disabled=!canWrite();}
}
function drivePage(){return page(pageByRoute.dossier,driveState.mode==='favorites'?'Favoris':'Dossiers','Dossiers partagés CDQ');}
const trashAccount=()=>String(calibrationIdentity().email||'').trim().toLowerCase();
const trashClient=createDriveTrashClientV2713({identity:trashAccount,allowed:canRead,writable:canWrite,rpc,legacy:legacyTrashV2717({identity:trashAccount,allowed:canRead,writable:canWrite,native:()=>null,oauth:()=>window.google?.accounts?.oauth2||window.parent.google?.accounts?.oauth2,clientId:()=>window.CDQ_GOOGLE_AUTH_CONFIG?.clientId||window.parent.CDQ_GOOGLE_AUTH_CONFIG?.clientId})});
let trashEpoch=0,trashState={owner:'',items:[],next:'',query:'',loading:false,loaded:false};
function openTrash(){
 const p=page(pageByRoute.trash,'Corbeille',trashAccount());p.hidden=false;
 if(!canRead()){status(p,'Accès Drive requis.',true);return;}
 if(trashState.owner!==trashAccount()){trashClient.reset();trashState={owner:trashAccount(),items:[],next:'',query:'',loading:false,loaded:false};}
 if(!$('[data-trash-list]',p)){
  $('.cdq-workspace-body',p).innerHTML='<input class="cdq-workspace-search" data-trash-search type="search" placeholder="Rechercher dans la corbeille" aria-label="Rechercher dans la corbeille"><div class="cdq-workspace-actions"><button type="button" data-trash-refresh>Actualiser</button></div><div class="cdq-workspace-list" data-trash-list></div><div class="cdq-workspace-actions"><button type="button" data-trash-more>Charger la suite</button></div><p data-workspace-status role="status" class="cdq-workspace-status"></p>';
  $('[data-trash-search]',p).oninput=e=>{trashState.query=e.target.value;renderTrash();};
  $('[data-trash-refresh]',p).onclick=async()=>{try{await trashClient.authorize();await loadTrash();}catch(e){status(p,e.message,true);}};$('[data-trash-more]',p).onclick=()=>loadTrash(true);
 }
 $('.cdq-workspace-head h2 small',p).textContent=trashAccount();renderTrash();if(!trashState.loaded)loadTrash();
}
async function loadTrash(append=false){
 if(trashState.loading)return;const epoch=++trashEpoch,owner=ownerKey(),google=trashAccount(),p=$('#'+pageByRoute.trash);trashState.loading=true;renderTrash();status(p,'Chargement…');
 try{const r=await trashClient.list(append?trashState.next:'');if(epoch!==trashEpoch||owner!==ownerKey()||google!==trashAccount()||!canRead())return;
  const seen=new Set();trashState.items=(append?[...trashState.items,...r.files]:r.files).filter(x=>!seen.has(x.id)&&seen.add(x.id));trashState.next=r.next;trashState.loaded=true;status(p,trashState.items.length+' élément(s)'+(r.next?' · autres éléments disponibles':''));
 }catch(e){if(epoch===trashEpoch&&owner===ownerKey()&&google===trashAccount())status(p,e.message,true);}
 finally{if(epoch===trashEpoch){trashState.loading=false;renderTrash();}}
}
function renderTrash(){
 const p=$('#'+pageByRoute.trash),list=$('[data-trash-list]',p);if(!list)return;list.replaceChildren();
 $('[data-trash-refresh]',p).disabled=trashState.loading;$('[data-trash-more]',p).disabled=trashState.loading;$('[data-trash-more]',p).hidden=!trashState.next;
 const items=trashState.items.filter(x=>x.name.toLocaleLowerCase('fr').includes(trashState.query.toLocaleLowerCase('fr')));
 for(const item of items){const row=document.createElement('article');row.className='cdq-workspace-row cdq-trash-row-v2713';const kind=driveFileKindV2699({kind:item.folder?'folder':'file',mimeType:item.mimeType,nom:item.name});row.innerHTML='<div class="open">'+driveFileIconV2710(kind.key,kind.label)+'<span><strong>'+esc(item.name)+'</strong><small>'+esc(kind.label)+'</small></span></div><button type="button" data-trash-restore>Restaurer</button>';
  const b=$('[data-trash-restore]',row);b.disabled=!canWrite()||!item.canRestore;b.onclick=async()=>{if(!canWrite())return;const epoch=trashEpoch,owner=ownerKey(),google=trashAccount();b.disabled=true;status(p,'Restauration…');try{await trashClient.restore(item.id);if(epoch!==trashEpoch||owner!==ownerKey()||google!==trashAccount()||!canRead())return;trashState.items=trashState.items.filter(x=>x.id!==item.id);driveCache.invalidate();renderTrash();status(p,'Élément restauré.');}catch(e){if(epoch===trashEpoch&&owner===ownerKey()&&google===trashAccount()){status(p,e.message,true);b.disabled=!canWrite()||!item.canRestore;}}};list.append(row);
 }
 if(!items.length)list.innerHTML='<section class="cdq-workspace-card"><h3>'+esc(trashState.loading?'Chargement…':trashState.query?'Aucun résultat':trashState.loaded?'Corbeille vide':'Corbeille')+'</h3></section>';
}
function driveCacheKey(mode,id){return ownerKey()+'|'+mode+'|'+id;}
function openDrive(mode){
  const p=drivePage();p.hidden=false;if(!canRead()){$('.cdq-workspace-body',p).innerHTML='<section class="cdq-workspace-card"><h3>Lecture seule</h3><p>Les dossiers et favoris restent masqués sans accès Drive.</p></section>';return;}
  if(mode==='favorites'&&driveState.mode==='drive')driveState.lastDriveId=driveState.id||GENERAL;
  const id=mode==='favorites'?'':driveState.mode==='drive'?driveState.id||GENERAL:driveState.lastDriveId||GENERAL;
  driveState={...driveState,mode,id,query:''};loadDrive(false);
}
async function loadDrive(append=false,id=driveState.id,force=false){
  const p=drivePage(),mode=driveState.mode,key=driveCacheKey(mode,id),epoch=++driveEpoch,account=ownerKey();driveState.id=id;if(mode==='drive')driveState.lastDriveId=id;driveState.loading=true;
  const old=driveCache.peek(id,mode);if(!append){driveState.items=old?.items||[];driveState.crumbs=old?.crumbs||[];driveState.token=old?.nextPageToken||'';}driveState.loading=!old||append;renderDrive();status(p,old&&!append?driveState.items.length+' élément(s)':'Chargement…');
  try{const result=append?await rpc(mode==='favorites'?'obtenirFavorisGenerauxCDQV2521':'obtenirDossierGeneralCDQV2521',...(mode==='favorites'?[driveState.token]:[id,driveState.token])):await driveCache.request(id,mode,{force});if(epoch!==driveEpoch||account!==ownerKey()||!['dossier','favorites'].includes(active))return;
    const seen=new Set();driveState.items=(append?[...driveState.items,...(result.items||[])]:result.items||[]).filter(x=>!seen.has(x.id)&&seen.add(x.id));driveState.crumbs=result.crumbs||[];driveState.token=result.nextPageToken||'';driveState.loading=false;
    if(mode==='drive')driveCache.prefetch(driveState.items);renderDrive();status(p,driveState.items.length+' élément(s)'+(driveState.token?' · autres éléments disponibles':''));
  }catch(e){if(epoch===driveEpoch&&account===ownerKey()){driveState.loading=false;renderDrive();status(p,e.message,true);}}
}
function renderDrive(){
  const p=drivePage(),body=$('.cdq-workspace-body',p),mode=driveState.mode;$('.cdq-workspace-head h2',p).innerHTML=(mode==='favorites'?'Favoris':'Dossiers')+'<small data-cdq-heading-subtitle-v2671>'+esc(mode==='favorites'?'Vos raccourcis personnels':driveState.crumbs.at(-1)?.nom||'Dossiers partagés CDQ')+'</small>';
  body.innerHTML='<input class="cdq-workspace-search" data-drive-search type="search" aria-label="Rechercher dans cette liste" placeholder="Rechercher dans cette liste" value="'+esc(driveState.query)+'"><div class="cdq-workspace-actions cdq-drive-toolbar"><button type="button" data-drive-back>← Retour</button><button type="button" data-drive-root><span class="cdq-drive-action-icon">'+workspaceIcon('root',iconTheme())+'</span>Racine</button><button type="button" data-drive-favorites aria-pressed="'+(mode==='favorites')+'">★ Favoris</button><button type="button" data-drive-refresh><span class="cdq-drive-action-icon">'+workspaceIcon('refresh',iconTheme())+'</span>Actualiser</button></div><nav class="cdq-workspace-crumbs" aria-label="Chemin du dossier"></nav><div class="cdq-workspace-list" data-drive-list></div><div class="cdq-workspace-actions"><button data-drive-more>Charger la suite</button></div><p data-workspace-status role="status" class="cdq-workspace-status"></p>';
  $('[data-drive-search]',p).oninput=e=>{driveState.query=e.target.value;renderDriveRows(p);};
  $('[data-drive-back]',p).disabled=mode!=='favorites'&&driveState.crumbs.length<2;$('[data-drive-back]',p).onclick=()=>mode==='favorites'?openDrive('drive'):loadDrive(false,driveState.crumbs.at(-2).id);
  $('[data-drive-favorites]',p).onclick=()=>openDrive('favorites');
  $('[data-drive-root]',p).onclick=()=>{driveState.mode='drive';active='dossier';document.documentElement.dataset.cdqWorkspace=active;syncNav();loadDrive(false,GENERAL);};$('[data-drive-refresh]',p).onclick=()=>loadDrive(false,driveState.id,true);
  for(const crumb of mode==='favorites'?[]:driveState.crumbs){const b=document.createElement('button');b.textContent=crumb.nom;b.onclick=()=>loadDrive(false,crumb.id);$('.cdq-workspace-crumbs',p).append(b);}
  $('[data-drive-more]',p).hidden=!driveState.token;$('[data-drive-more]',p).disabled=driveState.loading;$('[data-drive-more]',p).onclick=()=>loadDrive(true);renderDriveRows(p);
}
function renderDriveRows(p){
  const list=$('[data-drive-list]',p);list.replaceChildren();const q=driveState.query.toLocaleLowerCase('fr'),items=driveState.items.filter(x=>(x.nom+' '+(x.path||'')).toLocaleLowerCase('fr').includes(q));
  for(const item of items){const row=document.createElement('article');row.className='cdq-workspace-row';const kind=driveFileKindV2699(item);row.dataset.driveKind=kind.key;row.innerHTML='<button type="button" class="open">'+driveFileIconV2710(kind.key,kind.label)+'<span><strong>'+esc(item.nom)+'</strong><small>'+esc(item.path||kind.label)+'</small></span></button><button type="button" class="pin" aria-label="'+esc(item.favori?'Retirer des favoris':'Ajouter aux favoris')+'" aria-pressed="'+!!item.favori+'">'+(item.favori?'★':'☆')+'</button>';
    if(item.kind==='folder')$('.open',row).onpointerenter=()=>driveCache.request(item.id).catch(()=>{});
    $('.open',row).onclick=async()=>{if(item.kind==='folder'){driveState.mode='drive';active='dossier';document.documentElement.dataset.cdqWorkspace=active;syncNav();await loadDrive(false,item.id);}else try{if(item.mimeType==='application/pdf')await window.cdqOpenPdfV2520?.(item.id,{nom:item.nom});else if(item.mimeType==='application/vnd.google-apps.spreadsheet')await window.cdqOpenSheetV2526?.(item.id);else window.open('https://drive.google.com/file/d/'+encodeURIComponent(item.id)+'/view','_blank','noopener');}catch(e){status(p,e.message,true);}};
    const pin=$('.pin',row);pin.onclick=async()=>{pin.disabled=true;try{const r=await rpc('definirFavoriGeneralCDQV2521',item.id,!item.favori);item.favori=r.favori;driveCache.invalidate();if(driveState.mode==='favorites')driveState.items=driveState.items.filter(x=>x.id!==item.id||item.favori);if(!p.hidden)renderDriveRows(p);}catch(e){status(p,e.message,true);}finally{pin.disabled=false;}};
    row.dataset.fileName=item.nom;installDriveActionsV2699(row,item,{favorite:()=>pin.click(),rpc,canWrite});list.append(row);
  }
  if(!items.length)list.innerHTML='<section class="cdq-workspace-card"><h3>'+esc(q?'Aucun résultat':driveState.loading?'Chargement…':driveState.mode==='favorites'?'Aucun favori':'Dossier vide')+'</h3><p>'+esc(driveState.mode==='favorites'?'Touchez l’étoile d’un dossier ou d’un fichier pour le retrouver ici.':'Les dossiers s’ouvrent dans cette page; utilisez le chemin pour remonter.')+'</p></section>';
}
function field(label,name,value='',unit=''){return '<label>'+esc(label)+'<input name="'+name+'" inputmode="decimal" value="'+esc(value)+'" placeholder="'+esc(unit)+'"></label>';}
function units(name){return '<label>Unité<select name="'+name+'">'+['kg','g','mg','lb','oz','t'].map(u=>'<option>'+u+'</option>').join('')+'</select></label>';}
function calculatorCard(title,form){return '<section class="cdq-workspace-card"><h3>'+title+'</h3>'+form+'</section>';}
function openCalcul(){
  const p=page(pageByRoute.calcul,'Calcul','Outils de pesage');p.hidden=false;if($('[data-calcul-form]',p))return;const body=$('.cdq-workspace-body',p);
  body.innerHTML=calculatorCard('Divisions et GRADS','<p class="cdq-workspace-hint">Nombre de divisions = capacité maximale ÷ échelon. Les unités sont converties automatiquement. GRADS correspond au nombre de divisions pour les indicateurs qui emploient ce réglage.</p><form data-calcul-form="divisions"><div class="cdq-workspace-grid">'+field('Capacité maximale','capacity','5000')+units('capacityUnit')+field('Échelon','increment','0,5')+units('incrementUnit')+'</div><div class="cdq-workspace-actions"><button>Calculer</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form>')+
    calculatorCard('Kilogrammes ↔ livres','<p class="cdq-workspace-hint">Facteur utilisé : 1 kg = 2,20462 lb.</p><form data-calcul-form="convert"><div class="cdq-workspace-grid">'+field('Valeur','value','1')+'<label>Conversion<select name="direction"><option value="kg">kg → lb</option><option value="lb">lb → kg</option></select></label></div><div class="cdq-workspace-actions"><button>Convertir</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form>')+
    calculatorCard('Signaux des quatre coins','<p class="cdq-workspace-hint">Relevez les signaux en mV avec la même charge de test, placée successivement sur chaque coin. Comparez les écarts pour régler l’excentricité.</p><form data-calcul-form="signal"><div class="cdq-corners-v2677">'+Object.entries(cornerNames).map(([key,label])=>'<label class="cdq-corner-v2677" data-corner="'+key+'"><strong>'+label+'</strong><span>Signal relevé (mV)</span><input name="'+key+'" inputmode="decimal" placeholder="Ex. 2,035" required><small data-corner-delta></small></label>').join('')+'</div><label>Référence<select name="reference"><option value="mean">Moyenne des quatre coins</option>'+Object.entries(cornerNames).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></label><div class="cdq-workspace-actions"><button>Comparer les quatre coins</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form>')+
    calculatorCard('Pont de résistance','<p>Débranchez la cellule de l’indicateur et coupez l’alimentation avant les mesures. Mesurez toutes les paires entre les fils rouge, noir, vert et blanc. Pour six fils, ajoutez bleu et jaune. Ne mesurez pas le blindage.</p><form data-calcul-form="bridge"><div class="cdq-workspace-grid">'+bridgePairs.map(pair=>field(wirePairLabel(pair)+' (Ω)','r'+pair,'','Mesure ou OL')).join('')+field('Entrée nominale du certificat (Ω), facultatif','nominalInput')+field('Sortie nominale du certificat (Ω), facultatif','nominalOutput')+field('Tolérance de comparaison (%)','tolerance','5')+'</div><div class="cdq-workspace-actions"><button>Analyser les six mesures</button></div><output class="cdq-workspace-result" aria-live="polite"></output></form><p class="cdq-workspace-hint">Les résistances seules ne confirment ni la polarité ni tous les défauts. Les cellules symétriques peuvent avoir une entrée et une sortie indiscernables. Comparez le certificat; confirmez E+/E− et S+/S− avec le fabricant et un essai de signal sous excitation.</p><a href="https://www.ricelake.com/resources/articles/advanced-load-cell-troubleshooting" target="_blank" rel="noopener">Méthode de diagnostic Rice Lake</a>');
  const tabs=document.createElement('nav');tabs.className='cdq-calcul-tabs-v2668';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Choisir un calcul');
  const labels=['Divisions et GRADS','Conversion','Signaux des quatre coins','Pont de résistance'];
  const panels=Array.from(body.children);panels.forEach((panel,i)=>{const key=$('[data-calcul-form]',panel).dataset.calculForm;
    panel.id='cdqCalculPanel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','cdqCalculTab-'+key);
    const tab=document.createElement('button');tab.type='button';tab.id='cdqCalculTab-'+key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);tab.dataset.calculTab=key;tab.textContent=labels[i];
    tab.onclick=()=>{for(const [j,other] of panels.entries()){other.hidden=j!==i;tabs.children[j].setAttribute('aria-selected',String(j===i));tabs.children[j].tabIndex=j===i?0:-1;}};tabs.append(tab);
  });body.prepend(tabs);tabs.firstElementChild.click();
  tabs.onkeydown=e=>{const i=Array.from(tabs.children).indexOf(document.activeElement);if(i<0)return;let next;if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(i+1)%panels.length;else if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(i+panels.length-1)%panels.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=panels.length-1;else return;e.preventDefault();tabs.children[next].click();tabs.children[next].focus();};
  const bridgeForm=$('[data-calcul-form=bridge]',p),mode=document.createElement('label');mode.innerHTML='Cellule<select name="wires"><option value="4">4 fils</option><option value="6">6 fils avec Sense</option></select>';bridgeForm.prepend(mode);
  const six=document.createElement('div');six.hidden=true;six.innerHTML='<p>Mesurez les quinze paires rouge, noir, vert, blanc, bleu et jaune, cellule débranchée. Le seuil sert à rechercher les liaisons Sense; il doit être adapté à la résistance du câble.</p><div class="cdq-workspace-grid">'+sixWirePairs.map(pair=>field(wirePairLabel(pair)+' (Ω)','s'+pair,'','Mesure ou OL')).join('')+field('Seuil de recherche excitation/Sense (Ω)','senseLimit','5')+'</div><a href="https://www.hbm.com/fileadmin/mediapool/hbmdoc/technical/A02427.pdf" target="_blank" rel="noopener">Raccordement 4 et 6 fils — HBK</a>';bridgeForm.insertBefore(six,$('.cdq-workspace-actions',bridgeForm));
  mode.querySelector('select').onchange=e=>{const useSix=e.target.value==='6';six.hidden=!useSix;for(const input of six.querySelectorAll('input'))input.disabled=!useSix;for(const input of bridgeForm.querySelectorAll('input[name^=r]')){input.disabled=useSix;input.closest('label').hidden=useSix;}bridgeForm.querySelector('button').textContent=useSix?'Analyser les quinze mesures':'Analyser les six mesures';};mode.querySelector('select').dispatchEvent(new Event('change'));
  for(const form of $$('[data-calcul-form]',p))form.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form)),out=$('output',form);try{out.classList.remove('cdq-workspace-error');
    if(form.dataset.calculForm==='divisions'){const r=divisions(v.capacity,v.increment,v.capacityUnit,v.incrementUnit);out.textContent=fmt(r.count)+' divisions · GRADS = '+fmt(r.count)+(r.whole?'':' · résultat non entier : vérifiez la capacité et l’échelon.');}
    else if(form.dataset.calculForm==='convert'){const to=v.direction==='kg'?'lb':'kg';out.textContent=convertMass(v.value,v.direction,to).toLocaleString('fr-CA',{maximumFractionDigits:5})+' '+to;}
    else if(form.dataset.calculForm==='signal'){const r=compareCornerSignals(v,v.reference);out.textContent='Écart maximal : '+fmt(r.range)+' mV · moyenne : '+fmt(r.mean)+' mV';for(const [key,delta] of Object.entries(r.deltas)){const box=form.querySelector('[data-corner="'+key+'"]');box.querySelector('[data-corner-delta]').textContent='Écart à la référence : '+(delta>0?'+':'')+fmt(delta)+' mV';}}
    else{const r=v.wires==='6'?analyzeSixWireBridge(Object.fromEntries(sixWirePairs.map(p=>[p,v['s'+p]])),v):analyzeBridge(Object.fromEntries(bridgePairs.map(p=>[p,v['r'+p]])),v);out.innerHTML=(r.sensePairs?.length?'<p>Liaisons excitation/Sense probables : '+r.sensePairs.map(p=>esc(wirePairLabel(p.wires))+' ('+fmt(p.ohms)+' Ω)').join(' · ')+'</p>':'')+'<strong>'+esc(r.identified?'Excitation probable : '+wirePairLabel(r.input)+' · signal probable : '+wirePairLabel(r.output):r.open.length||r.short.length?'Anomalie à vérifier':'Entrée et sortie non confirmées')+'</strong>'+'<p>Mesures, de la plus élevée à la plus faible :</p><ol>'+Object.entries(r.values).sort((a,b)=>b[1]-a[1]).map(([pair,value])=>'<li>'+esc(wirePairLabel(pair))+' : '+(Number.isFinite(value)?fmt(value)+' Ω':'OL')+'</li>').join('')+'</ol>'+(r.warnings.length?'<ul class="cdq-bridge-warnings">'+r.warnings.map(t=>'<li>'+esc(t.replace(/\b[A-F]{2}\b/g,wirePairLabel))+'</li>').join('')+'</ul>':'<p>Les mesures sont cohérentes avec un pont habituel. Cela ne garantit pas que la cellule est fonctionnelle.</p>');}
  }catch(e){out.textContent=e.message;out.classList.add('cdq-workspace-error');}};
}
function openOpportunities(){
  const p=page(pageByRoute.opportunities,'Opportunités','Suivi commercial CDQ');p.hidden=false;if(!canRead()){$('.cdq-workspace-body',p).innerHTML='<section class="cdq-workspace-card"><h3>Lecture seule</h3><p>Les opportunités et les modifications restent masquées sans accès Drive.</p></section>';return;}
  if(!$('[data-op-form]',p)){
    $('.cdq-workspace-body',p).innerHTML=opportunityTabs('create')+'<section class="cdq-workspace-card"><h3>Nouvelle opportunité</h3><form data-op-form><div class="cdq-workspace-grid"><label class="wide cdq-op-required">Nom de l’opportunité<input name="titre" maxlength="180" required placeholder="Projet ou besoin du client"></label><label class="cdq-op-required">Nom du compte<input name="clientNom" maxlength="180" required value="'+esc(companyName())+'"></label><label>Contact<input name="contact" maxlength="180"></label><label class="cdq-op-required">Type de vente<select name="typeVente" required><option value="">Aucune</option>'+saleTypesV2699.map(t=>'<option>'+esc(t)+'</option>').join('')+'</select></label><label class="cdq-op-required">Date de réception<input name="dateReception" type="date" required></label><label class="cdq-op-required">Pipeline<select name="pipeline" required>'+pipelinesV2699.map(t=>'<option '+(t===pipelinesV2699[1]?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label><label class="cdq-op-required">Étape<select name="etape" required>'+stagesV2699.map(t=>'<option>'+esc(t)+'</option>').join('')+'</select></label><label>Date de clôture<input name="dateCloture" type="date"></label><label>Valeur estimée (CAD)<input name="montant" inputmode="decimal"></label><label>Prochain suivi<input name="suivi" type="date"></label><label>Responsable<input name="responsable" value="'+esc(typeof utilisateurCourantNomRapport!=='undefined'?utilisateurCourantNomRapport:'')+'" maxlength="120"></label><label class="wide">Notes<textarea name="notes" maxlength="1450"></textarea></label></div><div class="cdq-workspace-actions"><button class="primary" data-op-save>Créer l’opportunité</button></div></form></section><input type="search" class="cdq-workspace-search" data-op-search aria-label="Rechercher une opportunité" placeholder="Client, titre ou étape"><div data-op-list class="cdq-workspace-list"></div><p data-workspace-status role="status" class="cdq-workspace-status"></p>';
    $('[data-opportunity-view=manage]',p).onclick=()=>navigate('opportunityBoard');
    $('[data-opportunity-view=create]',p).onclick=()=>{};
    $('[data-op-search]',p).oninput=()=>renderOpportunities(p);
    $('[data-op-form]',p).onsubmit=async e=>{e.preventDefault();const form=e.target,b=$('[data-op-save]',p);b.disabled=true;const payload=Object.fromEntries(new FormData(form));payload.clientId=payload.clientNom===companyName()?companyId():'';payload.requestId=form.dataset.requestId||(form.dataset.requestId='op-'+crypto.randomUUID());try{const r=await rpc('cdqEnregistrerOpportuniteV2638',encodeOpportunityV2699(payload));if(!r?.ok||!r.item)throw Error('Enregistrement non confirmé.');opportunityEpoch++;opportunities=[decodeOpportunityV2699(r.item),...opportunities.filter(x=>x.id!==r.item.id)];form.reset();delete form.dataset.requestId;renderOpportunities(p);status(p,'Opportunité enregistrée.');}catch(e){status(p,e.message,true);}finally{b.disabled=!canWrite();}};
  }
  $('[data-op-save]',p).disabled=!canWrite();for(const input of $$('[data-op-form] input,[data-op-form] select,[data-op-form] textarea',p))input.disabled=!canWrite();renderOpportunities(p);
  const epoch=++opportunityEpoch;status(p,'Actualisation…');rpc('cdqListerOpportunitesV2638').then(r=>{if(epoch!==opportunityEpoch)return;opportunities=(r.items||[]).map(decodeOpportunityV2699);if(!p.hidden){renderOpportunities(p);status(p,opportunities.length+' opportunité(s)');}}).catch(e=>{if(epoch===opportunityEpoch)status(p,e.message,true);});
}
function renderOpportunities(p){
  commercial.renderBoard();
  const list=$('[data-op-list]',p);if(!list)return;const query=$('[data-op-search]',p).value.toLocaleLowerCase('fr');list.replaceChildren();
  for(const item of opportunities.filter(x=>(x.titre+' '+x.clientNom+' '+x.etape).toLocaleLowerCase('fr').includes(query))){const card=document.createElement('article');card.className='cdq-workspace-card';card.innerHTML='<span class="cdq-opportunity-badge">'+esc(item.etape)+'</span><h3>'+esc(item.titre)+'</h3><p>'+esc(item.clientNom)+(item.contact?' · '+esc(item.contact):'')+'</p><p>'+esc(item.montant?fmt(item.montant)+' CAD':'Valeur à préciser')+(item.suivi?' · suivi : '+esc(item.suivi):'')+'</p><p class="cdq-workspace-hint">'+esc(item.responsable)+'</p><p class="cdq-workspace-hint">'+esc([item.typeVente,item.pipeline,item.dateReception?'Réception : '+item.dateReception:'',item.dateCloture?'Clôture : '+item.dateCloture:''].filter(Boolean).join(' · '))+'</p><p>'+esc(item.notes)+'</p><label>Étape<select data-op-stage>'+stagesV2699.map(t=>'<option '+(t===item.etape?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
    const select=$('[data-op-stage]',card);select.disabled=!canWrite();select.onchange=async()=>{select.disabled=true;try{const r=await rpc('cdqEnregistrerOpportuniteV2638',encodeOpportunityV2699({...item,etape:select.value,expectedRevision:item.revision,requestId:'op-'+crypto.randomUUID()},{existing:true}));if(!r?.ok||!r.item)throw Error('Enregistrement non confirmé.');opportunityEpoch++;Object.assign(item,decodeOpportunityV2699(r.item));commercial.renderBoard();$('.cdq-opportunity-badge',card).textContent=item.etape;status(p,'Étape enregistrée.');}catch(e){select.value=item.etape;status(p,e.message,true);}finally{select.disabled=!canWrite();}};list.append(card);
  }
  if(!list.children.length)list.innerHTML='<section class="cdq-workspace-card"><h3>Aucune opportunité</h3><p>Créez un suivi pour un besoin futur, une soumission ou un projet client.</p></section>';
}
function adoptPages(){
  if(!calibrationIdentity().email)return;
  for(const [route,id] of Object.entries(pageByRoute)){
    if(['drive','favorites','dossier','calcul','opportunities','catalog','opportunityBoard'].includes(route))continue;const p=$('#'+id);if(!p)continue;
    const shown=p instanceof HTMLDialogElement?p.open:!p.hidden;
    if(shown&&active!==route){navigate(route,{adopt:true});return;}
  }
  const p=$('#'+pageByRoute[active]);if(p&&(p instanceof HTMLDialogElement?!p.open:p.hidden)){active='';document.documentElement.classList.remove('cdq-workspace-open');syncNav();}
}
function restoreDossierControls(){const host=document.querySelector('.desktop-main')||document.body;for(const name of ['selectionBar','filesContainer','sendArea','message']){const el=document.getElementById(name);if(el&&el.closest('#cdqDossierPageV2638'))host.append(el);}}
function clearPrivate(){commercial.reset();trashEpoch++;trashClient.reset();trashState={owner:'',items:[],next:'',query:'',loading:false,loaded:false};document.getElementById(pageByRoute.trash)?.remove();pendingNavigation=null;homeAfterReader=false;homeReaderSource=null;driveEpoch++;opportunityEpoch++;driveCache.clear();opportunities=[];driveState={mode:'drive',id:GENERAL,lastDriveId:GENERAL,items:[],crumbs:[],token:'',query:'',loading:false};restoreDossierControls();for(const id of ['cdqDossierPageV2638','cdqDrivePageV2638','cdqOpportunitiesPageV2638'])$('#'+id)?.remove();hidePages();active='';document.documentElement.classList.remove('cdq-workspace-open');syncNav();}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(observedOwner!==ownerKey()){observedOwner=ownerKey();clearPrivate();}syncNav();adoptPages();});}
function returnHome(){
  homeAfterReader=false;homeReaderSource=null;navigate('');
  try{deselectionnerCompagnie();if(typeof cdqDossierOuvertId!=='undefined')cdqDossierOuvertId=null;if(typeof cdqDossierOuvertNom!=='undefined')cdqDossierOuvertNom='';}catch{}
  syncNav();window.scrollTo({top:0,left:0,behavior:'auto'});
}
function readerClosed(){if(homeAfterReader)returnHome();else if(pendingNavigation){const target=pendingNavigation;pendingNavigation=null;navigate(target.route,{toggle:target.toggle});}}
function readerCancelled(){homeAfterReader=false;homeReaderSource=null;pendingNavigation=null;}
function requestHome(){
  const reader=$('#cdqReaderFrame');
  if(document.documentElement.classList.contains('cdq-workspace-reader-open')){
    homeAfterReader=true;
    if(reader&&!reader.hidden){homeReaderSource=reader.contentWindow;homeReaderSource?.postMessage({type:'CDQ_READER_REQUEST_CLOSE'},new URL(reader.src||location.href,location.href).origin);}
    else window.parent.postMessage({type:'CDQ_WORKSPACE_READER_HOME_V2640',userInitiated:true,readerSession:document.documentElement.dataset.cdqReaderSessionV2679},location.origin);
    return;
  }
  returnHome();
}
function back(){
 const overlay=document.querySelector('dialog[open]:not(#cdqCalibrationDialogV2565)');
 if(overlay){if(overlay.querySelector('.copy-cancel,button[data-cancel]'))overlay.querySelector('.copy-cancel,button[data-cancel]').click();else overlay.dispatchEvent(new Event('cancel',{cancelable:true}));return true;}
 const calibration=document.querySelector('#cdqCalibrationDialogV2565');
 if(active==='calibration'&&calibration?.open){const b=calibration.querySelector('[data-cal-back]');if(b)b.click();else{calibration.close();navigate('');}return true;}
 if(active==='dossier'){if(driveState.mode==='favorites')openDrive('drive');else if(driveState.crumbs.length>1)loadDrive(false,driveState.crumbs.at(-2).id);else navigate('');return true;}
 if(['calcul','opportunities','trash','catalog','opportunityBoard'].includes(active)){navigate('');return true;}
 return false;
}
function start(){
  observedOwner=ownerKey();syncNav();window.ouvrirCorbeilleDrive=()=>navigate('trash',{userInitiated:true});
  // Capture at window before legacy navigation handlers. The same route closes,
  // another route switches; unsaved invoice inputs remain in their existing DOM.
  window.addEventListener('click',e=>{const b=e.target.closest?.('.bottom-nav-item');if(!b)return;const route=b.dataset.workspaceRoute||labels[$('small',b)?.textContent.trim()];if(!route)return;e.preventDefault();e.stopImmediatePropagation();if(route==='home'){requestHome();return;}if(document.documentElement.classList.contains('cdq-desktop-v2676')&&active===route)return;navigate(route,{toggle:true,userInitiated:true});},true);
  window.addEventListener('message',e=>{if(!homeReaderSource||e.source!==homeReaderSource)return;if(e.data?.type==='CDQ_READER_CLOSE')readerClosed();if(e.data?.type==='CDQ_READER_CLOSE_CANCELLED_V2640')readerCancelled();});
  const choose=window.choisirCompagnie;if(typeof choose==='function')window.choisirCompagnie=function(...args){const r=choose.apply(this,args);if(canRead()){navigate('');window.cdqFastContextV2642?.warm(companyId());}schedule();return r;};
  if(window.cdqDriveV2521){window.cdqDriveV2521.open=()=>navigate('dossier');window.cdqDriveV2521.openFavorites=()=>navigate('favorites');window.cdqDriveV2521.close=()=>{if(['dossier','favorites'].includes(active))navigate('');};}
  window.addEventListener('resize',measure,{passive:true});window.visualViewport?.addEventListener('resize',measure,{passive:true});
  if(window.ResizeObserver){const ro=new ResizeObserver(measure);for(const el of [$('#appHeader'),$('.bottom-nav')])if(el)ro.observe(el);}
  new MutationObserver(records=>{if(records.some(r=>[...r.removedNodes].some(n=>n.id==='cdqReaderFrame')))document.documentElement.classList.remove('cdq-workspace-reader-open');if(records.some(r=>r.type==='childList'||r.attributeName==='hidden'||r.attributeName==='open'))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open']});
  document.addEventListener('cdq:icons-changed',schedule);window.addEventListener('storage',schedule);window.addEventListener('cdq:access-ready',schedule);window.addEventListener('cdq:drive-cleared-v2632',clearPrivate);window.addEventListener('cdq:access-state-v2527',e=>{if(e.detail!=='ready')clearPrivate();});
  // Existing data modules are bundled and may be warmed only after both checks.
  window.addEventListener('cdq:drive-ready-v2632',()=>{if(!canRead())return;setTimeout(()=>{if(canRead())driveCache.request(GENERAL).then(r=>driveCache.prefetch(r.items)).catch(()=>{});},250);});
  for(const event of ['cdq:copied','cdq:moved','cdq:renamed','cdq:deleted'])window.addEventListener(event,()=>{driveCache.invalidate();if(active==='dossier'&&canRead())loadDrive(false,driveState.id,true);});
}
window.cdqWorkspaceV2638={prepareNavigation:syncNav,navigate,back,driveCache,measure,readerClosed,readerCancelled,active:()=>active,version:'26.77'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

