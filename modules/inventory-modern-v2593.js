(function cdqInventoryModernV2593(){
'use strict';
if(window.cdqInventoryModernV2593)return;

var state={
  root:null,route:'home',inventory:null,articles:[],catalog:new Map(),history:[],
  selected:null,search:'',busy:false,scannerMode:'home',scannerRequest:'',
  pendingBarcode:'',initialized:false
};

function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.from((r||document).querySelectorAll(s))}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}
function role(){try{return String(utilisateurCourantRole||'technicien').trim().toLowerCase()}catch(_){return'technicien'}}
function email(){try{return String(utilisateurCourantEmail||'').trim().toLowerCase()}catch(_){return''}}
function deviceToken(){try{return typeof cdqObtenirJetonAppareil==='function'?String(cdqObtenirJetonAppareil()||''):''}catch(_){return''}}
function canWrite(){return role()!=='lecture'}
function isAdmin(){return role()==='admin'}
function rpc(name,args){return new Promise(function(resolve,reject){try{var run=cdqApiRun().withSuccessHandler(resolve).withFailureHandler(reject);if(typeof run[name]!=='function')throw Error('Fonction serveur absente : '+name);run[name].apply(run,args||[])}catch(e){reject(e)}})}
function message(text,ok){try{if(typeof afficherMessage==='function')afficherMessage(text,ok!==false)}catch(_){}}
function showError(err){var msg=err&&err.message?err.message:String(err||'Erreur');status(msg,'error');try{if(typeof afficherErreur==='function')afficherErreur(err)}catch(_){}}
function uid(){try{return crypto.randomUUID()}catch(_){return 'inv-'+Date.now()+'-'+Math.random().toString(36).slice(2)}}
function money(v){var n=Number(v);return Number.isFinite(n)?n.toLocaleString('fr-CA',{style:'currency',currency:'CAD'}):'—'}
function number(v){var n=Number(v);return Number.isFinite(n)?n:0}
function normalize(v){return String(v||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function articleLabel(a){return [a.numero,a.description].filter(Boolean).join(' — ')||'Article'}
function qtyAt(articleId,loc){
  var inv=state.inventory||{},row=(inv.stocks||[]).find(function(x){return String(x.articleId)===String(articleId)&&String(x.emplacementId)===String(loc)});
  return row?number(row.quantite):0;
}
function total(articleId){
  var inv=state.inventory||{};
  if(inv.totaux&&Object.prototype.hasOwnProperty.call(inv.totaux,articleId))return number(inv.totaux[articleId]);
  return (inv.stocks||[]).filter(function(x){return String(x.articleId)===String(articleId)}).reduce(function(s,x){return s+number(x.quantite)},0);
}
function locationName(id){
  var inv=state.inventory||{},r=(inv.emplacements||[]).find(function(x){return String(x.emplacementId)===String(id)});
  return r?r.nom:String(id||'');
}
function myTruck(){return String((state.inventory&&state.inventory.utilisateur&&state.inventory.utilisateur.monCamion)||'SHOP')}
function mergeCatalog(){
  var byId=state.catalog||new Map();
  state.articles=((state.inventory&&state.inventory.articles)||[]).map(function(a){
    var e=byId.get(String(a.articleId))||{};
    return Object.assign({},a,e);
  });
}
function articleById(id){return state.articles.find(function(a){return String(a.articleId)===String(id)})||null}
function articleByBarcode(code){
  var c=String(code||'').trim();
  return state.articles.find(function(a){return String(a.codeBarres||'').trim()===c})||null;
}
function filterArticles(q){
  q=normalize(q||'');
  return state.articles.filter(function(a){
    if(!q)return true;
    return normalize([a.numero,a.description,a.categorie,a.fabricant,a.modele,a.codeBarres].join(' ')).includes(q);
  });
}
function icon(name){
  var p={
    search:'<circle cx="10.8" cy="10.8" r="6.2"/><path d="m15.5 15.5 4.2 4.2"/>',
    box:'<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    transfer:'<path d="M4 8h13m0 0-3-3m3 3-3 3M20 16H7m0 0 3-3m-3 3 3 3"/>',
    price:'<path d="M4 5h10l6 6-9 9-7-7z"/><circle cx="9" cy="9" r="1.2"/>',
    history:'<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
    scan:'<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10M7 9h2M11 9h6M7 15h5M14 15h3"/>',
    back:'<path d="M15 5 8 12l7 7"/>',
    home:'<path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4z"/>',
    edit:'<path d="m4 17-.5 3.5L7 20l11-11-3-3zM13.5 7.5l3 3"/>',
    camera:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13" r="3"/>',
    truck:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    shop:'<path d="M4 10v10h16V10M3 10l2-6h14l2 6M8 20v-6h4v6"/>',
    alert:'<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/>'
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(p[name]||'')+'</svg>';
}
function productGlyph(a){
  var t=normalize([a.categorie,a.description,a.numero].join(' '));
  if(/load.?cell|cellule/.test(t))return 'LC';
  if(/indicateur|indicator/.test(t))return 'IND';
  if(/sommation|summing|carte/.test(t))return 'PCB';
  if(/fil|cable|câble/.test(t))return 'CBL';
  if(/connect/.test(t))return 'CON';
  if(/keyboard|clavier/.test(t))return 'KEY';
  return 'CDQ';
}
function photoHtml(a,cls){
  var url=String(a&&a.imageUrl||'').trim();
  return '<div class="'+(cls||'cdq-inv-photo')+'">'+
    (url?'<img src="'+esc(url)+'" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="cdq-inv-glyph" hidden>'+esc(productGlyph(a))+'</span>':'<span class="cdq-inv-glyph">'+esc(productGlyph(a))+'</span>')+
    '</div>';
}
function status(msg,type){
  var n=state.root&&$('[data-inv-status]',state.root);if(!n)return;
  n.textContent=msg||'';n.className='cdq-im-status '+(type||'');
}
function setBusy(v,msg){
  state.busy=!!v;
  if(state.root)$$('button,input,select,textarea',state.root).forEach(function(el){if(el.dataset.invNav)return;el.disabled=state.busy});
  if(msg)status(msg,'working');
}
function ensureRoot(){
  if(state.root&&state.root.isConnected)return state.root;
  var root=document.createElement('section');
  root.id='cdqInventoryModernV2593';
  root.hidden=true;
  root.innerHTML='<div class="cdq-im-shell">'+
    '<div class="cdq-im-toolbar"><button type="button" data-inv-back aria-label="Retour">'+icon('back')+'</button><div><strong data-inv-title>Inventaire</strong><small data-inv-subtitle>Shop et camions</small></div><button type="button" data-inv-home aria-label="Accueil inventaire">'+icon('home')+'</button></div>'+
    '<div class="cdq-im-content" data-inv-content></div>'+
    '<div class="cdq-im-status" data-inv-status></div>'+
    '</div>';
  document.body.appendChild(root);
  state.root=root;
  $('[data-inv-back]',root).onclick=function(){if(state.route==='home')close();else go('home')};
  $('[data-inv-home]',root).onclick=function(){go('home')};
  position();
  return root;
}
function position(){
  if(!state.root||state.root.hidden)return;
  var h=$('#appHeader'),n=$('.bottom-nav');
  var top=Math.max(0,Math.round(h&&h.getBoundingClientRect().bottom||0));
  var bottom=Math.max(0,Math.round(innerHeight-(n&&n.getBoundingClientRect().top||innerHeight)));
  state.root.style.top=top+'px';state.root.style.bottom=bottom+'px';
}
async function load(force){
  setBusy(true,force?'Actualisation de l’inventaire…':'Chargement de l’inventaire…');
  try{
    var base=await rpc('obtenirInventaire',[{rapide:true}]);
    var extra={articles:[]};
    try{extra=await rpc('cdqInventaireCatalogueV2593',[deviceToken()])||extra}catch(e){}
    state.inventory=base||{articles:[],stocks:[],emplacements:[]};
    state.catalog=new Map((extra.articles||[]).map(function(a){return[String(a.articleId),a]}));
    mergeCatalog();
    state.initialized=true;
    status('');
    return state.inventory;
  }finally{setBusy(false)}
}
function title(t,sub){
  $('[data-inv-title]',ensureRoot()).textContent=t||'Inventaire';
  $('[data-inv-subtitle]',state.root).textContent=sub||'Shop et camions';
}
function go(route,payload){
  state.route=route||'home';
  if(payload&&payload.article)state.selected=payload.article;
  if(payload&&payload.barcode)state.pendingBarcode=payload.barcode;
  render();
}
function open(){
  ensureRoot();
  state.root.hidden=false;
  document.documentElement.classList.add('cdq-im-open');
  position();
  var nav=findNav();if(nav)nav.classList.add('cdq-section-open-v2206');
  if(!state.initialized)load(false).then(render).catch(showError);else render();
}
function close(){
  if(!state.root)return;
  state.root.hidden=true;
  document.documentElement.classList.remove('cdq-im-open');
  var nav=findNav();if(nav)nav.classList.remove('cdq-section-open-v2206');
}
function findNav(){
  var nav=$('.bottom-nav');if(!nav)return null;
  return $$('#'+ 'none',nav) && $$('.bottom-nav-item',nav).find(function(b){return normalize((b.querySelector('small')||{}).textContent)==='inventaire'})||null;
}
function render(){
  if(!state.root||state.root.hidden)return;
  var c=$('[data-inv-content]',state.root);if(!c)return;
  status('');
  if(!state.inventory){c.innerHTML='<div class="cdq-im-loading">Chargement…</div>';return}
  if(state.route==='home')renderHome(c);
  else if(state.route==='inventory')renderInventory(c);
  else if(state.route==='add')renderAdd(c);
  else if(state.route==='remove')renderRemove(c);
  else if(state.route==='transfer')renderTransfer(c);
  else if(state.route==='prices')renderPrices(c);
  else if(state.route==='history')renderHistory(c);
  else if(state.route==='detail')renderDetail(c,state.selected);
  else if(state.route==='new')renderNewArticle(c);
  else renderHome(c);
}
function searchBar(value,placeholder){
  return '<div class="cdq-im-search"><span>'+icon('search')+'</span><input data-inv-search value="'+esc(value||'')+'" placeholder="'+esc(placeholder||"Rechercher dans l’inventaire général…")+'"><button type="button" data-inv-scan>'+icon('scan')+'<em>Scanner</em></button></div>';
}
function renderSearchResults(host,q,limit){
  var box=$('[data-inv-search-results]',host);if(!box)return;
  var rows=filterArticles(q).slice(0,limit||12);
  if(!String(q||'').trim()){box.innerHTML='';return}
  box.innerHTML=rows.length?rows.map(function(a){
    return '<button type="button" class="cdq-im-search-result" data-article="'+esc(a.articleId)+'">'+photoHtml(a,'cdq-im-mini-photo')+
      '<span><strong>'+esc(articleLabel(a))+'</strong><small>'+esc([a.categorie,a.fabricant,a.modele].filter(Boolean).join(' • '))+'</small></span>'+
      '<b>'+total(a.articleId)+'</b></button>';
  }).join(''):'<div class="cdq-im-empty">Aucun article trouvé.</div>';
  $$('[data-article]',box).forEach(function(b){b.onclick=function(){go('detail',{article:articleById(b.dataset.article)})}});
}
function totalAll(){return state.articles.reduce(function(s,a){return s+total(a.articleId)},0)}
function lowCount(){
  return state.articles.filter(function(a){
    var shop=qtyAt(a.articleId,'SHOP'),min=number(a.minimumShop);
    return min>0&&shop<min;
  }).length;
}
function renderHome(c){
  title('Inventaire','Gestion du stock CDQ');
  var truck=myTruck();
  c.innerHTML='<div class="cdq-im-home">'+
    '<h1>Bonjour</h1><p class="cdq-im-lead">Gestion de l’inventaire</p>'+
    searchBar(state.search)+
    '<div data-inv-search-results></div>'+
    '<div class="cdq-im-tiles">'+
      tile('inventory','Inventaire','Tous les articles et emplacements','box','cyan')+
      tile('add','Ajouter','Entrée de matériel à la Shop','plus','blue')+
      tile('remove','Retirer','Sortie ou matériel utilisé','minus','red')+
      tile('transfer','Transférer','Shop ⇄ camions / camion ⇄ camion','transfer','green')+
      tile('prices','Liste de prix','Prix client rapide','price','orange')+
      tile('history','Historique','Qui a déplacé quoi et quand','history','purple')+
    '</div>'+
    '<div class="cdq-im-home-summary"><div><span>Inventaire total</span><strong>'+totalAll()+'</strong></div><div><span>Shop</span><strong>'+state.articles.reduce(function(s,a){return s+qtyAt(a.articleId,'SHOP')},0)+'</strong></div><div><span>Mon camion</span><strong>'+state.articles.reduce(function(s,a){return s+qtyAt(a.articleId,truck)},0)+'</strong></div><div class="'+(lowCount()?'warn':'')+'"><span>Stock faible</span><strong>'+lowCount()+'</strong></div></div>'+
    '<button class="cdq-im-refresh" type="button" data-inv-refresh>↻ Actualiser</button>'+
    '</div>';
  bindSearch(c,'home');
  $$('[data-route]',c).forEach(function(b){b.onclick=function(){go(b.dataset.route)}});
  $('[data-inv-refresh]',c).onclick=function(){load(true).then(render).catch(showError)};
}
function tile(route,label,sub,ico,color){
  return '<button type="button" class="cdq-im-tile '+color+'" data-route="'+route+'"><span class="ico">'+icon(ico)+'</span><strong>'+label+'</strong><small>'+sub+'</small></button>';
}
function bindSearch(host,scanMode){
  var input=$('[data-inv-search]',host),scan=$('[data-inv-scan]',host);
  if(input){input.oninput=function(){state.search=input.value;renderSearchResults(host,input.value,12)};renderSearchResults(host,input.value,12)}
  if(scan)scan.onclick=function(){startScanner(scanMode||state.route)};
}
function renderInventory(c){
  title('Inventaire général','Tous les articles • Shop et camions');
  var cats=Array.from(new Set(state.articles.map(function(a){return a.categorie}).filter(Boolean))).sort();
  var makers=Array.from(new Set(state.articles.map(function(a){return a.fabricant}).filter(Boolean))).sort();
  c.innerHTML=searchBar('','Rechercher article, modèle, fabricant ou code…')+
    '<div class="cdq-im-filters"><select data-cat><option value="">Toutes catégories</option>'+cats.map(function(x){return'<option>'+esc(x)+'</option>'}).join('')+'</select>'+
    '<select data-maker><option value="">Tous fabricants</option>'+makers.map(function(x){return'<option>'+esc(x)+'</option>'}).join('')+'</select>'+
    '<select data-loc><option value="__ALL__">Tous emplacements</option>'+(state.inventory.emplacements||[]).map(function(x){return'<option value="'+esc(x.emplacementId)+'">'+esc(x.nom)+'</option>'}).join('')+'</select></div>'+
    '<div class="cdq-im-list" data-list></div>';
  var input=$('[data-inv-search]',c),cat=$('[data-cat]',c),maker=$('[data-maker]',c),loc=$('[data-loc]',c);
  function paint(){
    var q=input.value,rows=filterArticles(q).filter(function(a){return(!cat.value||a.categorie===cat.value)&&(!maker.value||a.fabricant===maker.value)});
    $('[data-list]',c).innerHTML=rows.length?rows.map(function(a){return articleCard(a,loc.value)}).join(''):'<div class="cdq-im-empty">Aucun article.</div>';
    $$('[data-open-article]',c).forEach(function(b){b.onclick=function(){go('detail',{article:articleById(b.dataset.openArticle)})}});
  }
  input.oninput=paint;cat.onchange=paint;maker.onchange=paint;loc.onchange=paint;$('[data-inv-scan]',c).onclick=function(){startScanner('inventory')};paint();
}
function articleCard(a,loc){
  var right=loc==='__ALL__'?'<span>Total <b>'+total(a.articleId)+'</b></span>':'<span>'+esc(locationName(loc))+' <b>'+qtyAt(a.articleId,loc)+'</b></span>';
  var locations=(state.inventory.emplacements||[]).filter(function(l){return qtyAt(a.articleId,l.emplacementId)>0}).slice(0,4).map(function(l){return'<em>'+esc(l.nom)+': '+qtyAt(a.articleId,l.emplacementId)+'</em>'}).join('');
  return '<button type="button" class="cdq-im-card" data-open-article="'+esc(a.articleId)+'">'+photoHtml(a)+
    '<span class="copy"><strong>'+esc(articleLabel(a))+'</strong><small>'+esc([a.categorie,a.fabricant,a.modele].filter(Boolean).join(' • '))+'</small><i>'+locations+'</i></span><span class="qty">'+right+'</span></button>';
}
function chooseArticleHtml(selected){
  var a=selected;
  return '<div class="cdq-im-picker">'+
    (a?'<div class="cdq-im-selected">'+photoHtml(a,'cdq-im-mini-photo')+'<span><strong>'+esc(articleLabel(a))+'</strong><small>'+esc([a.categorie,a.fabricant,a.modele].filter(Boolean).join(' • '))+'</small></span><button type="button" data-change>Changer</button></div>':
      searchBar('','Rechercher ou scanner un article…')+'<div data-inv-search-results></div>')+
    '</div>';
}
function bindPicker(c,mode,onSelect){
  if(state.selected){
    var ch=$('[data-change]',c);if(ch)ch.onclick=function(){state.selected=null;render()};
    return;
  }
  var input=$('[data-inv-search]',c);if(input){input.oninput=function(){
    var box=$('[data-inv-search-results]',c),rows=filterArticles(input.value).slice(0,10);
    box.innerHTML=String(input.value).trim()?rows.map(function(a){return'<button type="button" data-pick="'+esc(a.articleId)+'">'+esc(articleLabel(a))+'<small>'+esc([a.fabricant,a.modele].filter(Boolean).join(' • '))+'</small></button>'}).join(''):'';
    $$('[data-pick]',box).forEach(function(b){b.onclick=function(){state.selected=articleById(b.dataset.pick);if(onSelect)onSelect(state.selected);render()}});
  }}
  var scan=$('[data-inv-scan]',c);if(scan)scan.onclick=function(){startScanner(mode)};
}
function renderAdd(c){
  title('Ajouter','Entrée de matériel à la Shop');
  var a=state.selected;
  c.innerHTML=chooseArticleHtml(a)+(a?
    '<div class="cdq-im-action-card"><div class="cdq-im-action-icon blue">'+icon('plus')+'</div><h2>Ajouter à la Shop</h2><p>Le stock sera ajouté à l’inventaire de l’usine.</p>'+
    '<label>Quantité<input type="number" inputmode="numeric" min="1" value="1" data-qty></label><label>Note<textarea data-note placeholder="Ex. Réception fournisseur, retour chantier…"></textarea></label>'+
    '<button type="button" class="cdq-im-primary blue" data-confirm>Ajouter à la Shop</button></div>':
    (isAdmin()?'<button type="button" class="cdq-im-new" data-new>+ Ajouter manuellement un nouvel article</button>':'' ));
  bindPicker(c,'add');
  var n=$('[data-new]',c);if(n)n.onclick=function(){go('new')};
  var b=$('[data-confirm]',c);if(b)b.onclick=async function(){
    var q=Math.floor(number($('[data-qty]',c).value));if(q<1)return status('Quantité invalide.','error');
    setBusy(true,'Ajout à la Shop…');
    try{await rpc('cdqInventaireAjouterShopV2593',[a.articleId,q,$('[data-note]',c).value,deviceToken()]);message('Inventaire ajouté à la Shop.',true);state.selected=null;await load(true);go('home')}
    catch(e){showError(e)}finally{setBusy(false)}
  };
}
function renderRemove(c){
  title('Retirer','Sortie de matériel');
  var a=state.selected;
  c.innerHTML=chooseArticleHtml(a)+(a?'<div class="cdq-im-action-card"><div class="cdq-im-action-icon red">'+icon('minus')+'</div><h2>Retirer du stock</h2>'+
    '<label>Emplacement<select data-from>'+(state.inventory.emplacements||[]).filter(function(l){return qtyAt(a.articleId,l.emplacementId)>0}).map(function(l){return'<option value="'+esc(l.emplacementId)+'">'+esc(l.nom)+' — '+qtyAt(a.articleId,l.emplacementId)+'</option>'}).join('')+'</select></label>'+
    '<label>Quantité<input type="number" inputmode="numeric" min="1" value="1" data-qty></label><label>Raison / note<textarea data-note placeholder="Ex. Installé chez client, utilisé en réparation…"></textarea></label>'+
    '<button type="button" class="cdq-im-primary red" data-confirm>Retirer</button></div>':'');
  bindPicker(c,'remove');
  var b=$('[data-confirm]',c);if(b)b.onclick=async function(){
    var from=$('[data-from]',c).value,q=Math.floor(number($('[data-qty]',c).value)),max=qtyAt(a.articleId,from);
    if(q<1||q>max)return status('Quantité invalide ou stock insuffisant.','error');
    setBusy(true,'Retrait du stock…');
    try{await rpc('cdqInventaireRetirerV2593',[a.articleId,from,q,$('[data-note]',c).value,deviceToken()]);message('Matériel retiré de l’inventaire.',true);state.selected=null;await load(true);go('home')}
    catch(e){showError(e)}finally{setBusy(false)}
  };
}
function renderTransfer(c){
  title('Transférer','Shop ⇄ camions • camion ⇄ camion');
  var a=state.selected;
  c.innerHTML=chooseArticleHtml(a)+(a?'<div class="cdq-im-action-card"><div class="cdq-im-action-icon green">'+icon('transfer')+'</div><h2>Transfert de matériel</h2>'+
    '<div class="cdq-im-two"><label>De<select data-from>'+(state.inventory.emplacements||[]).filter(function(l){return qtyAt(a.articleId,l.emplacementId)>0}).map(function(l){return'<option value="'+esc(l.emplacementId)+'">'+esc(l.nom)+' — '+qtyAt(a.articleId,l.emplacementId)+'</option>'}).join('')+'</select></label>'+
    '<label>Vers<select data-to>'+(state.inventory.emplacements||[]).map(function(l){return'<option value="'+esc(l.emplacementId)+'">'+esc(l.nom)+'</option>'}).join('')+'</select></label></div>'+
    '<label>Quantité<input type="number" inputmode="numeric" min="1" value="1" data-qty></label><label>Note<textarea data-note placeholder="Optionnel"></textarea></label>'+
    '<button type="button" class="cdq-im-primary green" data-confirm>Confirmer le transfert</button></div>':'');
  bindPicker(c,'transfer');
  var from=$('[data-from]',c),to=$('[data-to]',c);if(from&&to){
    var defTo=String(from.value)==='SHOP'?myTruck():'SHOP';if(Array.from(to.options).some(function(o){return o.value===defTo}))to.value=defTo;
    from.onchange=function(){if(to.value===from.value){var o=Array.from(to.options).find(function(x){return x.value!==from.value});if(o)to.value=o.value}}
  }
  var b=$('[data-confirm]',c);if(b)b.onclick=async function(){
    var f=from.value,t=to.value,q=Math.floor(number($('[data-qty]',c).value));
    if(f===t)return status('Choisissez deux emplacements différents.','error');
    if(q<1||q>qtyAt(a.articleId,f))return status('Quantité invalide ou stock insuffisant.','error');
    setBusy(true,'Transfert en cours…');
    try{await rpc('transfererInventaire',[a.articleId,f,t,q,$('[data-note]',c).value||('Transfert '+locationName(f)+' → '+locationName(t))]);message('Transfert terminé.',true);state.selected=null;await load(true);go('home')}
    catch(e){showError(e)}finally{setBusy(false)}
  };
}
function renderPrices(c){
  title('Liste de prix','Prix client • consultation rapide');
  var cats=Array.from(new Set(state.articles.map(function(a){return a.categorie}).filter(Boolean))).sort();
  c.innerHTML=searchBar('','Rechercher un prix rapidement…')+
    '<div class="cdq-im-price-filter"><select data-cat><option value="">Toutes catégories</option>'+cats.map(function(x){return'<option>'+esc(x)+'</option>'}).join('')+'</select></div>'+
    '<div class="cdq-im-price-list" data-price-list></div>';
  var input=$('[data-inv-search]',c),cat=$('[data-cat]',c);
  function paint(){
    var rows=filterArticles(input.value).filter(function(a){return!cat.value||a.categorie===cat.value});
    $('[data-price-list]',c).innerHTML=rows.map(function(a){return'<div class="cdq-im-price-row">'+photoHtml(a,'cdq-im-price-photo')+
      '<div><strong>'+esc(articleLabel(a))+'</strong><small>'+esc([a.fabricant,a.modele,a.categorie].filter(Boolean).join(' • '))+'</small></div>'+
      '<b>'+money(a.prixClient)+'</b>'+(isAdmin()?'<button type="button" data-edit-price="'+esc(a.articleId)+'">'+icon('edit')+'</button>':'')+'</div>';
    }).join('');
    $$('[data-edit-price]',c).forEach(function(b){b.onclick=function(){editPrice(articleById(b.dataset.editPrice))}});
  }
  input.oninput=paint;cat.onchange=paint;$('[data-inv-scan]',c).onclick=function(){startScanner('prices')};paint();
}
function editPrice(a){
  if(!isAdmin()||!a)return;
  var current=Number(a.prixClient||0);
  var v=prompt('Nouveau prix client pour '+articleLabel(a),current?String(current):'');
  if(v===null)return;
  var n=Number(String(v).replace(',','.'));if(!Number.isFinite(n)||n<0)return status('Prix invalide.','error');
  setBusy(true,'Mise à jour du prix…');
  rpc('cdqInventaireMajPrixV2593',[a.articleId,n,deviceToken()]).then(function(){
    a.prixClient=n;var e=state.catalog.get(String(a.articleId))||{};e.prixClient=n;state.catalog.set(String(a.articleId),e);message('Prix mis à jour pour tous les techniciens.',true);render();
  }).catch(showError).finally(function(){setBusy(false)});
}
async function ensureHistory(){
  setBusy(true,'Chargement de l’historique…');
  try{state.history=await rpc('obtenirHistoriqueInventaire',[250])||[]}finally{setBusy(false)}
}
function renderHistory(c){
  title('Historique','Mouvements de matériel');
  c.innerHTML='<div class="cdq-im-history-head">'+searchBar('','Rechercher article, technicien ou emplacement…')+'<button type="button" data-refresh>↻ Actualiser</button></div><div data-history></div>';
  function paint(){
    var q=normalize($('[data-inv-search]',c).value),rows=(state.history||[]).filter(function(r){return!q||normalize([r.numero,r.description,r.utilisateur,r.origineNom,r.destinationNom,r.type,r.note].join(' ')).includes(q)});
    $('[data-history]',c).innerHTML=rows.length?rows.map(function(r){
      var sign=/retir/i.test(String(r.type||''))?'−':(/entree|ajout/i.test(String(r.type||''))?'+':'⇄');
      return '<div class="cdq-im-history-row"><span class="move">'+sign+'</span><div><strong>'+esc([r.numero,r.description].filter(Boolean).join(' — '))+'</strong><small>'+esc([r.origineNom,r.destinationNom].filter(Boolean).join(' → '))+' • '+esc(r.utilisateur||'')+'</small><em>'+esc(r.note||'')+'</em></div><b>'+esc(r.quantite||'')+'</b><time>'+esc(r.date||'')+'</time></div>';
    }).join(''):'<div class="cdq-im-empty">Aucun mouvement.</div>';
  }
  bindSearch(c,'history');$('[data-inv-scan]',c).style.display='none';$('[data-inv-search]',c).oninput=paint;$('[data-refresh]',c).onclick=function(){ensureHistory().then(paint).catch(showError)};
  if(!state.history.length)ensureHistory().then(paint).catch(showError);else paint();
}
function renderDetail(c,a){
  if(!a){go('inventory');return}
  title('Détail de l’article',articleLabel(a));
  var stocks=(state.inventory.emplacements||[]).map(function(l){return'<div class="cdq-im-stock-row"><span>'+esc(l.nom)+'</span><strong>'+qtyAt(a.articleId,l.emplacementId)+'</strong></div>'}).join('');
  c.innerHTML='<div class="cdq-im-detail">'+photoHtml(a,'cdq-im-detail-photo')+
    '<div class="cdq-im-detail-head"><h1>'+esc(a.description||a.numero||'Article')+'</h1><p>'+esc([a.fabricant,a.modele,a.numero].filter(Boolean).join(' • '))+'</p></div>'+
    '<div class="cdq-im-detail-grid"><div><span>Catégorie</span><strong>'+esc(a.categorie||'—')+'</strong></div><div><span>Fabricant</span><strong>'+esc(a.fabricant||'—')+'</strong></div><div><span>Modèle</span><strong>'+esc(a.modele||'—')+'</strong></div><div><span>Code-barres</span><strong>'+esc(a.codeBarres||'Non associé')+'</strong></div></div>'+
    '<section><h2>Stock par emplacement <b>Total '+total(a.articleId)+'</b></h2>'+stocks+'</section>'+
    '<div class="cdq-im-detail-actions"><button data-act="add" class="blue">'+icon('plus')+'Ajouter</button><button data-act="remove" class="red">'+icon('minus')+'Retirer</button><button data-act="transfer" class="green">'+icon('transfer')+'Transférer</button></div>'+
    (isAdmin()?'<div class="cdq-im-admin-tools"><button data-link-code>'+icon('scan')+' Associer / modifier le code</button><button data-photo>'+icon('camera')+' Photo de l’article</button><input type="file" accept="image/*" data-photo-file hidden></div>':'')+
    '</div>';
  $$('[data-act]',c).forEach(function(b){b.onclick=function(){state.selected=a;go(b.dataset.act)}});
  var lc=$('[data-link-code]',c);if(lc)lc.onclick=function(){startScanner('link-code')};
  var pb=$('[data-photo]',c),pf=$('[data-photo-file]',c);if(pb&&pf){pb.onclick=function(){pf.click()};pf.onchange=function(e){var f=e.target.files&&e.target.files[0];if(f)uploadPhoto(a,f);e.target.value=''}}
}
function imageData(file){
  return new Promise(function(resolve,reject){var r=new FileReader();r.onerror=function(){reject(Error('Lecture image impossible.'))};r.onload=function(){var im=new Image();im.onerror=function(){reject(Error('Image invalide.'))};im.onload=function(){var m=1200,w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,k=Math.min(1,m/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);var x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.82))};im.src=r.result};r.readAsDataURL(file)})}
async function uploadPhoto(a,file){
  if(!isAdmin())return;
  setBusy(true,'Enregistrement de la photo…');
  try{var d=await imageData(file),r=await rpc('cdqInventairePhotoV2593',[a.articleId,d,deviceToken()]);a.imageUrl=r.imageUrl||'';var e=state.catalog.get(String(a.articleId))||{};e.imageUrl=a.imageUrl;state.catalog.set(String(a.articleId),e);message('Photo enregistrée.',true);render()}
  catch(e){showError(e)}finally{setBusy(false)}
}
function renderNewArticle(c){
  if(!isAdmin()){go('home');return}
  title('Nouvel article','Ajout manuel au catalogue');
  c.innerHTML='<form class="cdq-im-form" data-form>'+
    '<label>Numéro / référence<input name="numero" required placeholder="Ex. 680, JB-4, LC-10T"></label>'+
    '<label>Description<input name="description" required placeholder="Ex. Indicateur, carte de sommation, loadcell…"></label>'+
    '<div class="cdq-im-two"><label>Catégorie<select name="categorie"><option>Indicateurs</option><option>Cartes de sommation</option><option>Loadcells</option><option>Fils / câbles</option><option>Connecteurs</option><option>Cartes mères</option><option>Claviers</option><option>Autres</option></select></label><label>Fabricant<input name="fabricant" placeholder="Rice Lake, Avery, Mettler Toledo…"></label></div>'+
    '<div class="cdq-im-two"><label>Modèle<input name="modele"></label><label>Code-barres<input name="codeBarres" value="'+esc(state.pendingBarcode||'')+'"><button type="button" data-scan-code>Scanner</button></label></div>'+
    '<div class="cdq-im-two"><label>Quantité initiale Shop<input name="quantite" type="number" inputmode="numeric" min="0" value="0"></label><label>Prix client<input name="prixClient" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00"></label></div>'+
    '<label>Photo de l’article<input name="photo" type="file" accept="image/*"></label>'+
    '<button type="submit" class="cdq-im-primary blue">Créer l’article</button></form>';
  state.pendingBarcode='';
  $('[data-scan-code]',c).onclick=function(){startScanner('new-code')};
  $('[data-form]',c).onsubmit=async function(e){
    e.preventDefault();var fd=new FormData(e.currentTarget),obj={numero:fd.get('numero'),description:fd.get('description'),categorie:fd.get('categorie'),fabricant:fd.get('fabricant'),modele:fd.get('modele'),codeBarres:fd.get('codeBarres'),prixClient:Number(fd.get('prixClient')||0),minimumCamion:0,minimumShop:0};
    var q=Math.max(0,Math.floor(number(fd.get('quantite')))),file=e.currentTarget.elements.photo.files[0];
    setBusy(true,'Création de l’article…');
    try{var created=await rpc('cdqInventaireNouvelArticleV2593',[obj,q,deviceToken()]);if(file&&created&&created.articleId){var d=await imageData(file);await rpc('cdqInventairePhotoV2593',[created.articleId,d,deviceToken()])}message('Nouvel article ajouté.',true);await load(true);state.selected=articleById(created.articleId);go('detail')}
    catch(err){showError(err)}finally{setBusy(false)}
  };
}
function startScanner(mode){
  state.scannerMode=mode||state.route;state.scannerRequest=uid();
  var bridge=null;try{bridge=window.BalanceCDQNative||(window.parent&&window.parent.BalanceCDQNative)}catch(_){}
  if(bridge&&typeof bridge.scanInventoryBarcode==='function'){
    status('Ouverture du scanner…','working');
    try{bridge.scanInventoryBarcode(state.scannerRequest);return}catch(e){}
  }
  var code=prompt('Scanner non disponible ici. Entrez le code-barres :','');
  if(code)handleScan(code,'manuel');
}
window.cdqNativeInventoryScanV2593=function(id,ok,value,format,msg){
  if(String(id)!==String(state.scannerRequest||''))return;
  state.scannerRequest='';
  if(!ok){status(String(msg||'Scan annulé.'),'');return}
  handleScan(value,format);
};
function handleScan(value,format){
  var code=String(value||'').trim();if(!code)return;
  status('Code détecté : '+code,'ok');
  var a=articleByBarcode(code),mode=state.scannerMode;
  if(mode==='new-code'){
    var input=state.root&&$('input[name="codeBarres"]',state.root);if(input)input.value=code;return;
  }
  if(mode==='link-code'){
    if(!state.selected||!isAdmin())return;
    setBusy(true,'Association du code…');
    rpc('cdqInventaireAssocierCodeV2593',[state.selected.articleId,code,deviceToken()]).then(function(){state.selected.codeBarres=code;var e=state.catalog.get(String(state.selected.articleId))||{};e.codeBarres=code;state.catalog.set(String(state.selected.articleId),e);message('Code associé à l’article.',true);render()}).catch(showError).finally(function(){setBusy(false)});return;
  }
  if(!a){
    if(isAdmin()&&confirm('Ce code n’est associé à aucun article. Créer un nouvel article ?')){state.pendingBarcode=code;go('new');}
    else status('Code inconnu : '+code,'error');
    return;
  }
  state.selected=a;
  if(mode==='add')go('add');
  else if(mode==='remove')go('remove');
  else if(mode==='transfer')go('transfer');
  else if(mode==='prices')go('prices');
  else go('detail',{article:a});
}
function bindInventoryEntryPoints(){
  document.querySelectorAll('.bottom-nav-item, .desktop-sidebar-action').forEach(function(b){
    var txt=normalize((b.querySelector('small')||{}).textContent||b.textContent||'');
    if(txt.includes('inventaire')){
      b.onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}open()};
    }
  });
}
function start(){
  ensureRoot();
  bindInventoryEntryPoints();
  new MutationObserver(function(){bindInventoryEntryPoints();position()}).observe(document.body,{subtree:true,childList:true});
  addEventListener('resize',position,{passive:true});
  try{visualViewport&&visualViewport.addEventListener('resize',position,{passive:true})}catch(_){}
  document.addEventListener('click',function(e){
    if(!state.root||state.root.hidden)return;
    var b=e.target.closest&&e.target.closest('.bottom-nav-item');
    if(b&&normalize((b.querySelector('small')||{}).textContent)!=='inventaire')close();
  },true);
  window.ouvrirInventaireCDQ=open;
  window.cdqInventoryModernV2593={open:open,close:close,go:go,refresh:function(){return load(true).then(render)}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();