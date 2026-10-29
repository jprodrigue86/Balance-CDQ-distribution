const catalogueMetalV2725=new URL('./assets/catalogue-v2725/catalogue-metal-platinum.webp',import.meta.url).href;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
export function opportunityTabs(view='create'){return '<nav class="cdq-opportunity-tabs" aria-label="Menu des opportunités"><button type="button" data-opportunity-view="create" data-new-op aria-pressed="'+(view==='create')+'">Créer une opportunité</button><button type="button" data-opportunity-view="manage" aria-pressed="'+(view==='manage')+'">Gestion des opportunités</button></nav>';}
export function commercialIcon(key,theme='current'){
 const material=window.cdqMaterialIconV2799?.(key,theme);if(material)return material;
 if(key==='catalog'&&theme==='metal-music')return '<svg data-commercial-icon="catalog" data-icon-theme="metal-music" data-cdq-catalogue-art-v2725="platinum" viewBox="0 0 32 32" aria-hidden="true"><image href="'+esc(catalogueMetalV2725)+'" width="32" height="32"/></svg>';
 const paths={catalog:'<path d="M5 7l11-3 11 3v21l-11-3-11 3zM16 4v21M8 11l5-1m-5 6 5-1m7-3 4 1m-4 4 4 1"/>',opportunityBoard:'<rect x="3" y="4" width="26" height="24" rx="3"/><path d="M11 8v17M21 8v17M6 10h2v5H6zm8 2h4v5h-4zm10 5h2v6h-2z"/>',root:'<path d="M4 14L16 4l12 10M8 12v16h16V12M13 28v-9h6v9"/>',refresh:'<path d="M27 12A12 12 0 006 7L3 11m0-8v8h8M5 20a12 12 0 0021 5l3-4m0 8v-8h-8"/>'};
 if(!paths[key])return '';
 const metal=theme==='metal-music',isometric=theme==='isometric',minimal=theme==='minimal',dark=theme==='dark-pro';
 const color=key==='catalog'?'#dce2e9':key==='opportunityBoard'?'#21e966':'#4cd9ff';
 const gradient='<defs><linearGradient id="cdq-'+key+'-metal" x2=".2" y2="1"><stop stop-color="#f7fcff"/><stop offset=".32" stop-color="#6a7c92"/><stop offset=".55" stop-color="#18253b"/><stop offset=".8" stop-color="#a3b7ca"/><stop offset="1" stop-color="#273245"/></linearGradient></defs>';
 return '<svg data-icon-theme="'+esc(theme)+'" data-commercial-icon="'+key+'" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="'+(metal?color:'currentColor')+'" stroke-width="'+(minimal?1.7:2)+'" stroke-linejoin="round" stroke-linecap="round">'+(metal?gradient+'<g fill="url(#cdq-'+key+'-metal)">':dark?'<rect x="1" y="1" width="30" height="30" rx="6" fill="#111a24" stroke="#71899f"/><g transform="translate(3 3) scale(.81)" stroke="'+color+'">':isometric?'<g transform="matrix(.83,.1,-.1,.83,4,1)" fill="#203e54" stroke="'+color+'">':'<g>')+paths[key]+'</g></svg>';
}
// Keep navigation artwork and tabs synchronous; catalogue data is loaded only
// when a commercial page or an inventory detail first needs it.
export function createCommercialWorkspace(api,{load=()=>import('./commercial-v2721.mjs')}={}){
 let instance=null,pending=null,epoch=0;
 function ensure(){if(!pending)pending=Promise.resolve().then(load).then(module=>instance=module.createCommercialWorkspace(api)).catch(error=>{pending=null;throw error;});return pending;}
 function invoke(method,args,visible=false){const ticket=epoch,owner=api.owner();return ensure().then(target=>{
  if(ticket!==epoch||owner!==api.owner()||!api.canRead())return;
  if(visible&&globalThis.document?.documentElement?.dataset.cdqWorkspace!==({openCatalog:'catalog',openBoard:'opportunityBoard'}[method]))return;
  return target[method]?.(...args);
 }).catch(error=>{if(ticket!==epoch||owner!==api.owner()||visible&&globalThis.document?.documentElement?.dataset.cdqWorkspace!==({openCatalog:'catalog',openBoard:'opportunityBoard'}[method]))return;const page=api.page(method==='openBoard'?'cdqOpportunityBoardV2721':'cdqCatalogPageV2721',method==='openBoard'?'Opportunités':'Catalogue');if(visible)page.hidden=false;let status=page.querySelector('[data-commercial-lazy-status]');if(!status){status=document.createElement('p');status.dataset.commercialLazyStatus='';status.setAttribute('role','status');page.querySelector('.cdq-workspace-body').append(status);}status.textContent=(error?.message||'Chargement impossible.')+' Touchez à nouveau l’onglet pour réessayer.';});}
 const facade={openCatalog:(...args)=>invoke('openCatalog',args,true),openBoard:(...args)=>invoke('openBoard',args,true),renderBoard:(...args)=>{if(instance)return instance.renderBoard(...args);},renderCatalog:(...args)=>{if(instance)return instance.renderCatalog(...args);},reset:()=>{epoch++;instance?.reset();}};
 if(globalThis.window)window.cdqCatalogV2721={enrichArticle:(article,container)=>{const owner=api.owner(),ticket=epoch;return ensure().then(()=>{if(ticket===epoch&&owner===api.owner()&&api.canRead()&&container.isConnected)window.cdqCatalogV2721?.enrichArticle(article,container);}).catch(()=>{});}};
 return facade;
}
