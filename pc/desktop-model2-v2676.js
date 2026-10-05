(() => {
  'use strict';
  const root=document.documentElement;
  if(!root.classList.contains('cdq-desktop-v2676'))return;
  const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
  const order=['home','dossier','calibration','calcul','inventory','invoices','opportunities','trash'];
  let queued=false,menu=null,menuOwner=null,menuButtons=[];
  function closeMenu(){if(!menu)return;for(const [button,parent] of menuButtons)parent.append(button);menuButtons=[];menu.remove();menu=null;menuOwner=null;}
  function installRowActions(row){
    if(row.querySelector(':scope > .cdq-pc-menu-button'))return;
    const button=document.createElement('button');button.type='button';button.className='cdq-pc-menu-button';button.textContent='⋮';button.setAttribute('aria-label','Actions de '+(row.dataset.fileName||row.querySelector('.folder-name-text')?.textContent||'cet élément'));button.setAttribute('aria-haspopup','menu');
    button.onclick=e=>{e.preventDefault();e.stopPropagation();if(menuOwner===row){closeMenu();return;}closeMenu();
      const entries=[...row.querySelectorAll(':scope > .cdq-swipe-overlay > button')].filter(b=>getComputedStyle(b).display!=='none');if(!entries.length)return;
      menu=document.createElement('div');menu.id='cdqPcFileMenu';menu.setAttribute('role','menu');menuOwner=row;for(const b of entries){menuButtons.push([b,b.parentElement]);menu.append(b);}document.body.append(menu);
      const r=button.getBoundingClientRect(),left=Math.max(270,Math.min(r.right-270,innerWidth-290)),top=Math.max(12,Math.min(r.bottom+6,innerHeight-menu.offsetHeight-12));menu.style.left=left+'px';menu.style.top=top+'px';menu.addEventListener('click',()=>closeMenu(),true);menu.querySelector('button')?.focus();
    };row.append(button);
  }
  const normalized=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  function filterFiles(){
    const query=normalized($('#cdqPcFileSearch')?.value).trim();
    for(const row of all('#filesContainer .file-row')){const hidden=query&&!normalized(row.dataset.fileName).includes(query);if(row.dataset.pcSearchHidden!==String(!!hidden))row.dataset.pcSearchHidden=String(!!hidden);}
    for(const folder of all('#filesContainer .folder').reverse()){
      const head=folder.querySelector(':scope > .folder-header'),matches=normalized(head?.querySelector('.folder-name-text')?.textContent).includes(query);
      const child=[...folder.querySelectorAll('.file-row,.folder')].some(e=>e.dataset.pcSearchHidden!=='true');
      const hidden=!!query&&!matches&&!child;if(folder.dataset.pcSearchHidden!==String(hidden))folder.dataset.pcSearchHidden=String(hidden);
    }
  }
  function set(el,props){if(!el)return;for(const [key,value] of Object.entries(props))if(el.style.getPropertyValue(key)!==value||el.style.getPropertyPriority(key)!=='important')el.style.setProperty(key,value,'important');}
  function text(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  function identity(){let email='',name='';try{email=String(utilisateurCourantEmail||'');name=String(utilisateurCourantNomRapport||'').replace(/\s*[-–—]\s*\d{4}\s*$/,'');}catch(_){}return {email,name};}
  function scale(axis,low,high){let value=50;try{const stored=localStorage.getItem('cdqUi'+axis+'ScaleV89');if(stored!==null)value=Math.max(0,Math.min(100,Number(stored)||0));}catch(_){}return value<=50?low+(1-low)*value/50:1+(high-1)*(value-50)/50;}
  function layout(){
    const compact=innerWidth<1150,sidebar=compact?208:248,top=compact?126:152;
    const textScale=scale('Text',.85,1.25),iconScale=scale('Icon',.75,1.3),density=scale('General',.9,1.2);
    set(root,{'--cdq-pc-left':(sidebar+22)+'px','--cdq-pc-sidebar':sidebar+'px','--cdq-workspace-top':top+'px','--cdq-workspace-bottom':'0px','--cdq-pc-top':top+'px','--cdq-row-text-v2631':'16px','--cdq-row-date-v2631':'13px','--cdq-row-fileIcon-v2631':'32px','--cdq-row-rowMin-v2631':'58px','--cdq-row-rowY-v2631':'8px','--cdq-row-rowLeft-v2631':'12px','--cdq-row-rowRight-v2631':'10px','--cdq-row-rowGap-v2631':'12px'});
    set(root,{'--cdq-pc-text':String(textScale),'--cdq-pc-icon':String(iconScale),'--cdq-pc-row-min':Math.round(58*density)+'px'});
    const header=$('#appHeader');
    set(header,{'position':'fixed','top':'10px','left':'10px','right':'10px','width':'calc(100% - 20px)','height':(top-22)+'px','min-height':'0','max-height':'none','margin':'0','padding':'0','z-index':'2147483400','border-radius':'14px','overflow':'hidden','display':'block','visibility':'visible','opacity':'1','transform':'none','zoom':'1'});
    const nav=$('.bottom-nav');if(nav&&nav.parentElement!==document.body)document.body.append(nav);
    set(nav,{'position':'fixed','top':top+'px','left':'10px','right':'auto','bottom':'10px','width':sidebar+'px','height':'auto','min-height':'0','max-height':'none','display':'flex','flex-direction':'column','grid-auto-flow':'row','padding':'8px','gap':'4px','margin':'0','transform':'none','zoom':'1','overflow-y':'auto','overflow-x':'hidden','border':'1px solid var(--cdq-line)','border-radius':'13px','z-index':'2147483500'});
    for(const b of all('.bottom-nav > .bottom-nav-item')){
      set(b,{'display':'flex','flex-direction':'row','justify-content':'flex-start','align-items':'center','width':'100%','min-width':'0','height':compact?'65px':'72px','min-height':compact?'65px':'72px','max-height':'none','padding':'6px 10px','gap':'13px','flex-shrink':'0','border-radius':'12px','overflow':'hidden'});
      const art=b.firstElementChild,label=b.querySelector('small');
      set(art,{'width':compact?'49px':'56px','height':compact?'49px':'56px','min-width':compact?'49px':'56px','min-height':compact?'49px':'56px','max-width':'none','max-height':'none','flex-shrink':'0','display':'inline-flex','align-items':'center','justify-content':'center'});
      set(label,{'font-size':compact?'16px':'18px','line-height':'1.2','text-align':'left','white-space':'normal','margin':'0','padding':'0','font-weight':'700','color':'var(--cdq-ink)','-webkit-text-fill-color':'var(--cdq-ink)','text-shadow':'none'});
      set(label,{'font-size':Math.round((compact?16:18)*textScale)+'px'});const artSize=Math.round((compact?49:56)*iconScale);set(art,{'width':artSize+'px','height':artSize+'px','min-width':artSize+'px','min-height':artSize+'px'});set(b,{'height':Math.max(Math.round((compact?65:72)*density),artSize+12)+'px','min-height':Math.max(Math.round((compact?65:72)*density),artSize+12)+'px'});
      b.style.order=String(order.indexOf(b.dataset.workspaceRoute));
    }
    set($('.container'),{'position':'fixed','top':top+'px','left':(sidebar+22)+'px','right':'10px','bottom':'10px','width':'auto','max-width':'none','height':'auto','min-height':'0','margin':'0','padding':'0 18px 18px','zoom':'1','transform':'none','overflow-y':'auto','overflow-x':'hidden','border':'1px solid var(--cdq-line)','border-radius':'13px','visibility':'visible','opacity':'1','background':'var(--cdq-surface)','color':'var(--cdq-ink)'});
    for(const p of all('#cdqInventoryModernV2592,#cdqInvoicePageV2590,#cdqCalibrationDialogV2565,#cdqReportOverlayV2578,.cdq-workspace-page,#cdqReaderFrame'))set(p,{'position':'fixed','top':top+'px','left':(sidebar+22)+'px','right':'10px','bottom':'10px','width':(innerWidth-sidebar-32)+'px','max-width':'none','height':(innerHeight-top-10)+'px','max-height':(innerHeight-top-10)+'px','min-height':'0','margin':'0','transform':'none','zoom':'1'});
    for(const p of all('.modal-overlay:not(#accessOverlay):not(#googleAuthOverlay),#cdqSettingsModalV2294'))if(!/access|auth|bio|music/i.test(p.id))set(p,{'left':(sidebar+22)+'px','right':'10px','top':top+'px','bottom':'10px','width':'auto','height':'auto'});
    return {left:sidebar+22,top,bottom:10};
  }
  function home(){
    const container=$('.container'),header=$('#appHeader');if(!container||!header)return;
    if(header.parentElement!==document.body)document.body.prepend(header);
    let controls=$('#cdqPcHomeControls');
    if(!controls){controls=document.createElement('div');controls.id='cdqPcHomeControls';container.querySelector('.top-bar')?.before(controls);const search=document.createElement('label');search.className='cdq-pc-file-search';search.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg><input id="cdqPcFileSearch" type="search" placeholder="Rechercher dans ce dossier…" aria-label="Rechercher dans ce dossier">';controls.append(search);search.querySelector('input').oninput=filterFiles;}
    const company=container.querySelector('.top-bar');if(company&&company.parentElement!==controls)controls.prepend(company);
    const toolbar=$('#cdqTopActionsV2204');if(toolbar&&toolbar.parentElement!==controls)controls.append(toolbar);
    let heading=$('#cdqPcHomeHeading');
    if(!heading){heading=document.createElement('header');heading.id='cdqPcHomeHeading';heading.innerHTML='<div data-pc-home-art aria-hidden="true"></div><div class="cdq-pc-home-title"><h1>Accueil</h1><p>Dossier client</p></div><button type="button" data-pc-clear-client aria-label="Fermer le dossier client"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';container.prepend(heading);heading.querySelector('button').onclick=()=>window.deselectionnerCompagnie?.();}
    const source=$('.bottom-nav-item[data-workspace-route="home"] > span'),target=$('[data-pc-home-art]');
    if(source&&target&&target.dataset.art!==source.outerHTML){target.replaceChildren(source.cloneNode(true));target.dataset.art=source.outerHTML;}
    const close=$('[data-pc-clear-client]');if(close){let id='';try{id=String(compagnieSelectionnee||'');}catch(_){}close.disabled=!id;}
    const actions=$('#cdqClientActionsV2640');if(actions){let title=actions.querySelector('[data-pc-client-title]');if(!title){title=document.createElement('strong');title.dataset.pcClientTitle='';actions.prepend(title);}let name='';try{name=String(nomCompagnieSelectionnee||'');}catch(_){}text(title,name);}
    const files=$('#filesContainer');
    if(files&&!$('#cdqPcFileColumns')){const labels=document.createElement('div');labels.id='cdqPcFileColumns';labels.setAttribute('aria-hidden','true');labels.innerHTML='<span>Nom</span><span>Type</span><span>Modifié</span><span>Emplacement</span><span></span>';files.before(labels);}
    for(const row of all('#filesContainer .file-row')){
      const type=row.dataset.fileType||'';let tag=row.querySelector('.cdq-pc-file-type');
      if(!tag){tag=document.createElement('span');tag.className='cdq-pc-file-type';row.append(tag);}text(tag,type==='GOOGLE_SHEETS'?'Sheets':type||'Fichier');
      let location=row.querySelector('.cdq-pc-file-location');if(!location){location=document.createElement('span');location.className='cdq-pc-file-location';location.textContent='Drive';row.append(location);}
      const date=row.querySelector('.file-date');if(date&&row.dataset.fileDate){const d=new Date(row.dataset.fileDate);if(!Number.isNaN(d.getTime())){date.title=d.toLocaleString('fr-CA');text(date,new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',year:'numeric'}).format(d));}}
      installRowActions(row);
    }
    for(const row of all('#filesContainer .folder-header'))installRowActions(row);
    if(menuOwner&&!menuOwner.isConnected)closeMenu();
    filterFiles();
    let account=$('#cdqPcAccount');
    if(!account){account=document.createElement('div');account.id='cdqPcAccount';account.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="11" r="6"/><path d="M5 29v-5a11 11 0 0 1 22 0v5"/></svg><div><strong></strong><span data-pc-online></span></div>';header.append(account);}
    const user=identity();text(account.querySelector('strong'),user.name||user.email||'Connexion CDQ');text(account.querySelector('[data-pc-online]'),navigator.onLine?'En ligne':'Hors ligne');account.dataset.online=String(navigator.onLine);
    let version=$('#cdqPcVersion');if(!version){version=document.createElement('div');version.id='cdqPcVersion';$('.bottom-nav')?.append(version);}text(version,'Balance CDQ · PC '+root.dataset.cdqPcVersion);
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;home();layout();});}
  function start(){home();layout();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open','data-cdq-current','data-cdq-palette','data-workspace-route']});addEventListener('resize',schedule,{passive:true});addEventListener('online',schedule);addEventListener('offline',schedule);document.addEventListener('cdq:icons-changed',schedule);addEventListener('cdq:access-ready',schedule);document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&!e.target.closest('.cdq-pc-menu-button'))closeMenu();},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu){const b=menuOwner?.querySelector('.cdq-pc-menu-button');closeMenu();b?.focus();}});}
  window.cdqDesktopModel2={layout,schedule,version:root.dataset.cdqPcVersion,model:2};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
