(() => {
  'use strict';
  const root=document.documentElement;
  if(!root.classList.contains('cdq-desktop-v2676'))return;
  const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
  const order=['home','dossier','calibration','calcul','inventory','invoices','opportunities','trash'];
  let queued=false,menu=null,menuOwner=null,menuButtons=[];
  function closeMenu(focus=false){if(!menu)return;const owner=menuOwner;for(const [button,parent]of menuButtons){button.removeAttribute('role');if(parent.isConnected)parent.append(button);}menuButtons=[];menu.remove();menu=null;menuOwner=null;if(focus&&owner?.isConnected)owner.focus();}
  function showRowMenu(row,point){
    closeMenu();const entries=[...row.querySelectorAll(':scope > .cdq-swipe-overlay > button')].filter(b=>!b.hidden&&getComputedStyle(b).display!=='none');if(!entries.length)return;
    menu=document.createElement('div');menu.id='cdqPcFileMenu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Actions du fichier');menuOwner=row;
    for(const b of entries){menuButtons.push([b,b.parentElement]);b.setAttribute('role','menuitem');menu.append(b);}document.body.append(menu);
    const r=point||row.getBoundingClientRect(),width=menu.offsetWidth;
    menu.style.left=Math.max(8,Math.min(point?r.x:r.right-width,innerWidth-width-8))+'px';menu.style.top=Math.max(8,Math.min(point?r.y:r.bottom+6,innerHeight-menu.offsetHeight-8))+'px';
    menu.addEventListener('click',()=>{const activeMenu=menu;setTimeout(()=>{if(menu===activeMenu)closeMenu();},0);},true);
    menu.addEventListener('keydown',e=>{const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){e.preventDefault();closeMenu(true);}});
    menu.querySelector('button:not(:disabled)')?.focus();
  }
  const actionRows=new WeakSet();
  function installRowActions(row){
    if(actionRows.has(row))return;
    actionRows.add(row);if(!row.hasAttribute('tabindex'))row.tabIndex=0;
    row.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();showRowMenu(row,{x:e.clientX,y:e.clientY});});
    row.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||e.key==='F10'&&e.shiftKey){e.preventDefault();e.stopPropagation();showRowMenu(row);}});
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
  function layoutCompanyMenu(panel,search,list,exit,drive){
    const anchor=$('.company-button')?.getBoundingClientRect();
    const width=Math.min(520,innerWidth-32),height=Math.min(540,innerHeight-120);
    const left=Math.max(16,Math.min(anchor?.left||232,innerWidth-width-16));
    const top=Math.max(16,Math.min((anchor?.bottom||150)+8,innerHeight-height-16));
    set(panel,{'position':'fixed','left':left+'px','top':top+'px','right':'auto','bottom':'auto','width':width+'px','height':height+'px','max-width':'none','max-height':'none','margin':'0','padding':'0','transform':'none','border-radius':'12px','border':'1px solid var(--cdq-line)','overflow':'hidden','z-index':'100101','box-shadow':'0 18px 64px #0008','box-sizing':'border-box'});
    set(search,{'display':'block','font-size':'14px','width':'calc(100% - 60px)','height':'40px','min-height':'0','margin':'8px','padding':'8px 10px','border-radius':'7px','box-sizing':'border-box'});
    for(const button of [exit])set(button,{'position':'absolute','top':'8px','right':button===exit?'8px':'52px','width':'40px','height':'40px','min-width':'40px','padding':'8px','border-radius':'7px','font-size':'17px','box-sizing':'border-box'});
    set(list,{'height':(height-58)+'px','max-height':'none','overflow-y':'auto','overflow-x':'hidden','padding':'6px','box-sizing':'border-box'});
    for(const row of list?.children||[])set(row,{'font-size':'14px','min-height':'42px','padding':'10px 12px','border-radius':'6px','box-sizing':'border-box'});
  }
  function layout(){
    const narrow=innerWidth<900,compact=innerWidth<1150,sidebar=narrow?58:compact?182:210,bannerHeight=Math.round(innerWidth*132/1536),top=bannerHeight+12,left=sidebar+22;
    const textScale=scale('Text',.85,1.25),iconScale=scale('Icon',.75,1.3),density=scale('General',.9,1.2);
    set(root,{'--cdq-pc-shell-top':top+'px'});
    set(root,{'--cdq-pc-left':left+'px','--cdq-pc-sidebar':sidebar+'px','--cdq-workspace-top':top+'px','--cdq-workspace-bottom':'10px','--cdq-pc-top':top+'px','--cdq-row-text-v2631':'15px','--cdq-row-date-v2631':'12px','--cdq-row-fileIcon-v2631':'28px','--cdq-row-rowMin-v2631':'48px','--cdq-row-rowY-v2631':'7px','--cdq-row-rowLeft-v2631':'12px','--cdq-row-rowRight-v2631':'12px','--cdq-row-rowGap-v2631':'10px','--cdq-pc-text':String(textScale),'--cdq-pc-icon':String(iconScale),'--cdq-pc-row-min':Math.round(48*density)+'px'});
    set($('#appHeader'),{'position':'fixed','top':'0','left':'0','right':'0','width':'100%','height':bannerHeight+'px','min-height':'0','max-height':'none','margin':'0','padding':'0','z-index':'2000','border-radius':'0','border':'0','overflow':'hidden','display':'flex','visibility':'visible','opacity':'1','transform':'none','zoom':'1'});
    const nav=$('.bottom-nav');if(nav&&nav.parentElement!==document.body)document.body.append(nav);
    set(nav,{'position':'fixed','top':top+'px','left':'10px','right':'auto','bottom':'10px','width':sidebar+'px','height':'auto','min-height':'0','max-height':'none','display':'flex','flex-direction':'column','grid-auto-flow':'row','padding':narrow?'4px':'7px','gap':'3px','margin':'0','transform':'none','zoom':'1','overflow-y':'auto','overflow-x':'hidden','border':'1px solid var(--cdq-line)','border-radius':'10px','z-index':'2000','box-sizing':'border-box'});
    for(const b of all('.bottom-nav > .bottom-nav-item')){
      const art=b.firstElementChild,label=b.querySelector('small'),artSize=Math.round(34*iconScale),rowSize=Math.max(Math.round(48*density),artSize+12);
      set(b,{'display':'flex','flex-direction':'row','justify-content':narrow?'center':'flex-start','align-items':'center','width':'100%','min-width':'0','height':rowSize+'px','min-height':rowSize+'px','max-height':'none','padding':narrow?'6px':'6px 9px','gap':'11px','flex-shrink':'0','border-radius':'8px','overflow':'hidden','box-sizing':'border-box'});
      const selected=b.dataset.cdqCurrent==='true';
      set(b,{'background':selected?'var(--cdq-selected)':'transparent','border-color':selected?'var(--cdq-line)':'transparent','box-shadow':selected?'inset 3px 0 var(--cdq-nav-accent)':'none'});
      set(art,{'width':artSize+'px','height':artSize+'px','min-width':artSize+'px','min-height':artSize+'px','max-width':'none','max-height':'none','flex-shrink':'0','display':'inline-flex','align-items':'center','justify-content':'center'});
      set(label,{'font-size':Math.round(14*textScale)+'px','line-height':'1.2','text-align':'left','white-space':'nowrap','margin':'0','padding':'0','font-weight':'600','color':'var(--cdq-ink)','-webkit-text-fill-color':'var(--cdq-ink)','text-shadow':'none'});
      b.title=label?.textContent?.trim()||'';b.setAttribute('aria-label',b.title);b.style.order=String(order.indexOf(b.dataset.workspaceRoute));
    }
    const geometry={'position':'fixed','top':top+'px','left':left+'px','right':'10px','bottom':'10px','width':(innerWidth-left-10)+'px','max-width':'none','height':(innerHeight-top-10)+'px','max-height':(innerHeight-top-10)+'px','min-height':'0','margin':'0','transform':'none','zoom':'1','box-sizing':'border-box'};
    set($('.container'),{...geometry,'padding':'0 16px 16px','overflow-y':'auto','overflow-x':'hidden','border':'1px solid var(--cdq-line)','border-radius':'10px','visibility':'visible','opacity':'1','background':'var(--cdq-surface)','color':'var(--cdq-ink)','z-index':'1000'});
    for(const p of all('#cdqInventoryModernV2592,#cdqInvoicePageV2590,#cdqCalibrationDialogV2565,#cdqReportOverlayV2578,.cdq-workspace-page,#cdqReaderFrame'))set(p,{...geometry,'z-index':p.id==='cdqReaderFrame'?'2800':'2500'});
    // Shared phone rules hide Back and enlarge controls using ID selectors.
    // Desktop keeps visible Back controls for mouse and keyboard navigation.
    for(const b of all('[data-cdq-heading-back-v2671],[data-cdq-heading-close-v2671]'))set(b,{'display':b.hidden?'none':'grid','width':'34px','height':'34px','min-width':'34px','min-height':'34px','max-width':'34px','max-height':'34px','flex':'0 0 34px','padding':'6px'});
    for(const art of all('[data-cdq-heading-icon-v2675]')){
      const back=art.parentElement.querySelector('[data-cdq-heading-back-v2671]');
      set(art,{'display':back&&!back.hidden?'none':'flex','position':'relative','left':'auto','right':'auto','top':'auto','transform':'none','margin':'0','grid-column':'1','grid-row':'1','width':'44px','height':'44px','min-width':'44px','min-height':'44px','overflow':'hidden'});
      set(art.firstElementChild,{'width':'44px','height':'44px','min-width':'44px','min-height':'44px','max-width':'44px','max-height':'44px','margin':'0','object-fit':'contain'});
    }
    for(const h of all('[data-cdq-heading-layout-v2675]'))set(h,{'grid-template-columns':'44px minmax(0,1fr) 44px','padding':'10px 14px','min-height':'64px'});
    for(const h of all('[data-cdq-heading-close-v2671]'))set(h,{'grid-column':'3','grid-row':'1','justify-self':'end'});
    for(const p of all('.modal-overlay:not(#accessOverlay):not(#googleAuthOverlay),#cdqSettingsModalV2294'))if(!/access|auth|bio|music/i.test(p.id))set(p,{...geometry,'z-index':'5000'});
    const company=$('#companyMenu');if(company?.style.display!=='none'&&company?.classList.contains('show'))window.cdqCompanyChooserV2674?.layout();
    return {left,top,bottom:10};
  }
  function home(){
    const container=$('.container'),header=$('#appHeader');if(!container||!header)return;
    if(header.parentElement!==document.body)document.body.prepend(header);
    if(!$('#cdqPcBannerSharpV2708')){const filter=document.createElementNS('http://www.w3.org/2000/svg','svg');filter.id='cdqPcBannerSharpV2708';filter.setAttribute('width','0');filter.setAttribute('height','0');filter.setAttribute('aria-hidden','true');filter.style.position='absolute';filter.innerHTML='<defs><filter id="cdq-pc-banner-sharp-v2708" color-interpolation-filters="sRGB"><feConvolveMatrix order="3" kernelMatrix="0 -.12 0 -.12 1.48 -.12 0 -.12 0" preserveAlpha="true" edgeMode="duplicate"/></filter></defs>';document.body.append(filter);}
    set(header.querySelector('.header-metal-banner'),{'filter':'url(#cdq-pc-banner-sharp-v2708)'});
    let controls=$('#cdqPcHomeControls');
    if(!controls){controls=document.createElement('div');controls.id='cdqPcHomeControls';container.querySelector('.top-bar')?.before(controls);const search=document.createElement('label');search.className='cdq-pc-file-search';search.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg><input id="cdqPcFileSearch" type="search" placeholder="Rechercher dans ce dossier…" aria-label="Rechercher dans ce dossier">';controls.append(search);search.querySelector('input').oninput=filterFiles;}
    const company=container.querySelector('.top-bar');if(company&&company.parentElement!==controls)controls.prepend(company);
    const toolbar=$('#cdqTopActionsV2204');if(toolbar&&toolbar.parentElement!==controls)controls.append(toolbar);
    let heading=$('#cdqPcHomeHeading');
    if(!heading){heading=document.createElement('header');heading.id='cdqPcHomeHeading';heading.innerHTML='<div data-pc-home-art aria-hidden="true"></div><div class="cdq-pc-home-title"><h1>Accueil</h1><p>Dossier client</p></div><button type="button" data-pc-clear-client aria-label="Fermer le dossier client"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';container.prepend(heading);heading.querySelector('button').onclick=()=>window.deselectionnerCompagnie?.();}
    const source=$('.bottom-nav-item[data-workspace-route="home"] > span'),target=$('[data-pc-home-art]');
    if(source&&target&&target.dataset.art!==source.outerHTML){target.replaceChildren(source.cloneNode(true));target.dataset.art=source.outerHTML;}
    const close=$('[data-pc-clear-client]');if(close){let id='';try{id=String(compagnieSelectionnee||'');}catch(_){}close.disabled=!id;}
    const actions=$('#cdqClientActionsV2640');
    if(actions){
      actions.querySelector('[data-pc-client-title]')?.remove();
      const search=$('.cdq-pc-file-search');if(search&&search.parentElement!==actions)actions.append(search);
    }
    $('#cdqPcSettings')?.remove();
    const files=$('#filesContainer');
    if(files&&!$('#cdqPcFileColumns')){const labels=document.createElement('div');labels.id='cdqPcFileColumns';labels.setAttribute('aria-hidden','true');labels.innerHTML='<span>Nom</span><span>Modifié</span><span>Type</span><span></span>';files.before(labels);}
    for(const row of all('#filesContainer .file-row')){
      const type=row.dataset.fileType||'';let tag=row.querySelector('.cdq-pc-file-type');
      if(!tag){tag=document.createElement('span');tag.className='cdq-pc-file-type';row.append(tag);}text(tag,type==='GOOGLE_SHEETS'?'Sheets':type||'Fichier');
      const date=row.querySelector('.file-date');if(date&&row.dataset.fileDate){const d=new Date(row.dataset.fileDate);if(!Number.isNaN(d.getTime())){date.title=d.toLocaleString('fr-CA');text(date,new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',year:'numeric'}).format(d));}}
      const badge=row.querySelector('.file-today-done-badge');if(badge&&badge.parentElement!==row)row.append(badge);
      installRowActions(row);
    }
    for(const row of all('#filesContainer .folder-header'))installRowActions(row);
    if(menuOwner&&!menuOwner.isConnected)closeMenu();
    filterFiles();
    let account=$('#cdqPcAccount');
    if(!account){account=document.createElement('div');account.id='cdqPcAccount';account.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="11" r="6"/><path d="M5 29v-5a11 11 0 0 1 22 0v5"/></svg><div><strong></strong><span data-pc-online></span></div>';const nav=$('.bottom-nav');nav?.append(account);}
    const nav=$('.bottom-nav');if(nav&&account.parentElement!==nav)nav.append(account);
    const user=identity();account.title=(user.name||user.email||'Connexion CDQ')+' · PC '+root.dataset.cdqPcVersion;text(account.querySelector('strong'),user.name||user.email||'Connexion CDQ');text(account.querySelector('[data-pc-online]'),navigator.onLine?'En ligne':'Hors ligne');account.dataset.online=String(navigator.onLine);
    let version=$('#cdqPcVersion');if(!version){version=document.createElement('div');version.id='cdqPcVersion';account.querySelector('div').append(version);}if(version.parentElement!==account.querySelector('div'))account.querySelector('div').append(version);text(version,'PC · '+root.dataset.cdqPcVersion);
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;home();layout();});}
  function start(){home();const company=$('#companyMenu');if(company&&window.cdqInstallCompanyChooserV2674&&!window.cdqCompanyChooserV2674)window.cdqCompanyChooserV2674=window.cdqInstallCompanyChooserV2674(company);layout();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open','data-cdq-current','data-cdq-palette','data-workspace-route']});addEventListener('resize',()=>{closeMenu();schedule();},{passive:true});addEventListener('online',schedule);addEventListener('offline',schedule);document.addEventListener('cdq:icons-changed',schedule);addEventListener('cdq:drive-cleared-v2632',()=>closeMenu());addEventListener('cdq:access-ready',schedule);document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target))closeMenu();},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu)closeMenu(true);});}
  window.cdqDesktopModel2={layout,layoutCompanyMenu,schedule,installRowActions,closeMenu,version:root.dataset.cdqPcVersion,model:3};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();



