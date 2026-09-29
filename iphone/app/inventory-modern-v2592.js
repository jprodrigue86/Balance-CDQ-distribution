(function inventoryModernV2592(){
'use strict';
if(window.cdqInventoryModernV2592)return;
var page=null,body=null,titleEl=null,subEl=null,backBtn=null,statusEl=null,scheduled=false;
var state={inv:null,view:'home',article:null,query:'',category:'Tous',locationFilter:'',lowOnly:false,pendingMoveKind:'',history:[],scanDataUrl:'',scanCode:'',scanArticle:null,scanBusy:false,moveKind:'',preferredLocation:''};
var photoCache=new Map(),photoObserver=null;
var $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
function role(){try{return String(utilisateurCourantRole||'technicien').toLowerCase()}catch(_){return'technicien'}}
function email(){try{return String(utilisateurCourantEmail||'').trim().toLowerCase()}catch(_){return''}}
function canWrite(){return role()!=='lecture'}
function isAdmin(){return role()==='admin'}
function rpc(name,args){return new Promise(function(resolve,reject){try{var r=cdqApiRun().withSuccessHandler(resolve).withFailureHandler(reject);var fn=r[name];if(typeof fn!=='function')throw Error('Fonction serveur absente : '+name);fn.apply(r,args||[])}catch(e){reject(e)}})}
async function rpcTry(primary,args,fallback,fargs){try{return await rpc(primary,args)}catch(e){if(!fallback)throw e;return rpc(fallback,fargs==null?args:fargs)}}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function money(v){var n=Number(v)||0;return n.toLocaleString('fr-CA',{minimumFractionDigits:2,maximumFractionDigits:2})+' $'}
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function articleLabel(a){return clean((a&&a.numero)||'')||clean((a&&a.description)||'')||'Article'}
function articleDesc(a){var n=clean(a&&a.numero),d=clean(a&&a.description);if(n&&d&&n.toLowerCase()!==d.toLowerCase())return n+' — '+d;return n||d||'Article'}
function cat(a){return clean(a&&a.categorie)||'Autres'}
function maker(a){return clean(a&&a.fabricant)||'Divers'}
function articleSearchText(a){return [a.numero,a.description,a.categorie,a.fabricant,a.modele,a.codeBarres].map(clean).join(' ').toLocaleLowerCase('fr')}
function qty(articleId,loc){var s=((state.inv&&state.inv.stocks)||[]).find(x=>String(x.articleId)===String(articleId)&&String(x.emplacementId)===String(loc));return s?Number(s.quantite||0):0}
function totalQty(articleId){return ((state.inv&&state.inv.stocks)||[]).filter(x=>String(x.articleId)===String(articleId)).reduce((n,x)=>n+Number(x.quantite||0),0)}
function locations(){
  var inv=state.inv||{},map={};
  (inv.emplacements||[]).forEach(x=>{var id=String(x.emplacementId||x.id||'');if(id)map[id]={emplacementId:id,emplacementNom:clean(x.emplacementNom||x.nom||id)}});
  (inv.stocks||[]).forEach(x=>{var id=String(x.emplacementId||'');if(id&&!map[id])map[id]={emplacementId:id,emplacementNom:clean(x.emplacementNom||id)}});
  if(!map.SHOP)map.SHOP={emplacementId:'SHOP',emplacementNom:'Shop (Atelier)'};
  return Object.values(map).sort((a,b)=>a.emplacementId==='SHOP'?-1:b.emplacementId==='SHOP'?1:a.emplacementNom.localeCompare(b.emplacementNom,'fr'));
}
function locName(id){var l=locations().find(x=>String(x.emplacementId)===String(id));return l?l.emplacementNom:String(id||'')}
function locIcon(id){return String(id)==='SHOP'?'⌂':'▣'}
function catIcon(a){var c=cat(a).toLowerCase();if(/indicat/.test(c))return'▤';if(/cell|load/.test(c))return'◈';if(/câble|cable|fil/.test(c))return'◌';if(/connect/.test(c))return'⬡';if(/carte/.test(c))return'▦';if(/clavier|keyboard/.test(c))return'⌨';return'◇'}
function setStatus(msg,type){if(!statusEl)return;statusEl.textContent=msg||'';statusEl.className='cdq-im-status'+(type?' '+type:'')}
function header(title,sub,back){titleEl.textContent=title;subEl.textContent=sub||'';backBtn.hidden=!back}
function currentArticles(){
  var q=state.query.toLocaleLowerCase('fr').trim(),c=state.category;
  return ((state.inv&&state.inv.articles)||[]).filter(a=>String(a.actif).toUpperCase()!=='FALSE').filter(a=>(!q||articleSearchText(a).includes(q))&&(c==='Tous'||cat(a)===c)&&(!state.locationFilter||qty(a.articleId,state.locationFilter)>0)&&(!state.lowOnly||isLow(a)));
}
function lowAt(a,loc){var q=qty(a.articleId,loc),min=loc==='SHOP'?Number(a.minimumShop||0):Number(a.minimumCamion||0);return min>0&&q<min}
function isLow(a){return locations().some(l=>lowAt(a,String(l.emplacementId)))}
function locationTotal(loc){return ((state.inv&&state.inv.stocks)||[]).filter(x=>String(x.emplacementId)===String(loc)).reduce((n,x)=>n+Number(x.quantite||0),0)}
function thumbHTML(a,cls){return '<div class="'+(cls||'cdq-im-thumb')+'" data-photo="'+esc(a&&a.articleId||'')+'"><span>'+esc(catIcon(a))+'</span></div>'}
function loadPhoto(a,box){if(!a||!a.photoFileId||!box||box.dataset.loaded==='1')return;box.dataset.loaded='1';var key=String(a.articleId||'');if(photoCache.has(key)){var cached=document.createElement('img');cached.alt=articleLabel(a);cached.src=photoCache.get(key);box.replaceChildren(cached);return}rpc('cdqInventoryGetPhotoV2593',[a.articleId]).then(r=>{if(r&&r.dataUrl){photoCache.set(key,r.dataUrl);var im=document.createElement('img');im.alt=articleLabel(a);im.src=r.dataUrl;box.replaceChildren(im)}}).catch(()=>{})}
function hydratePhotos(root,articles){if(!root)return;var map={};(articles||[]).forEach(a=>map[String(a.articleId)]=a);var boxes=Array.from(root.querySelectorAll('[data-photo]'));if(!('IntersectionObserver' in window)){boxes.forEach(box=>loadPhoto(map[box.dataset.photo],box));return}if(photoObserver)try{photoObserver.disconnect()}catch(_){}photoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;photoObserver.unobserve(entry.target);loadPhoto(map[entry.target.dataset.photo],entry.target)}),{root:body,rootMargin:'180px 0px'});boxes.forEach(box=>photoObserver.observe(box))}
function setView(name,data){state.view=name;if(data&&data.article)state.article=data.article;if(data&&data.query!=null)state.query=data.query;if(data&&data.kind)state.moveKind=data.kind;if(data&&data.location)state.preferredLocation=data.location;render();if(body)body.scrollTop=0}
function back(){if(state.view==='home')return close();if(state.view==='move'&&state.pendingMoveKind){state.moveKind='';return setView('list')}if(['detail','price','history','scanner','create','move'].includes(state.view)){state.pendingMoveKind='';return setView('home')}if(state.view==='list'){state.pendingMoveKind='';return setView('home')}state.pendingMoveKind='';setView('home')}
function searchHome(value){state.query=clean(value);state.category='Tous';state.locationFilter='';state.lowOnly=false;setView('list')}
async function load(force){
  if(!force&&state.inv)return state.inv;
  setStatus('Chargement de l’inventaire…');
  try{
    var inv=await rpcTry('cdqInventoryGetV2593',[],'obtenirInventaire',[]);
    if(inv&&inv.inventory)inv=inv.inventory;
    state.inv=inv||{articles:[],stocks:[],emplacements:[]};
    setStatus('');
    return state.inv;
  }catch(e){setStatus(e.message||String(e),'error');throw e}
}
function homeAlertRows(){
  var rows=currentArticles().filter(isLow).slice(0,4);
  if(!rows.length)return '<div class="cdq-im-empty">Aucune alerte de stock faible.</div>';
  return rows.map(a=>{var lows=locations().filter(l=>lowAt(a,String(l.emplacementId)));var q=lows.length?qty(a.articleId,String(lows[0].emplacementId)):totalQty(a.articleId);return '<button class="cdq-im-alert" data-detail="'+esc(a.articleId)+'">'+thumbHTML(a,'cdq-im-alert-thumb')+'<div><strong>'+esc(articleLabel(a))+'</strong><small># '+esc(a.numero||a.modele||'')+'</small></div><div class="qty">Qté : '+q+'</div><div>›</div></button>'}).join('')
}
function renderHome(){
  state.query='';state.category='Tous';state.locationFilter='';state.lowOnly=false;state.pendingMoveKind='';
  header('Inventaire','Accueil rapide',false);
  var locs=locations();
  body.innerHTML='<div class="cdq-im-searchrow"><input class="cdq-im-search" id="cdqImHomeSearch" placeholder="Rechercher dans l’inventaire général…"><button class="cdq-im-scanmini" data-view="scanner">▥</button></div>'+
  '<div class="cdq-im-tiles">'+
    '<button class="cdq-im-tile inventory" data-view="list"><span class="ico">◇</span><span><strong>Inventaire général</strong><small>Voir tous les articles</small></span></button>'+
    '<button class="cdq-im-tile price" data-view="price"><span class="ico">$</span><span><strong>Liste de prix</strong><small>Prix clients</small></span></button>'+
    '<button class="cdq-im-tile scan" data-view="scanner"><span class="ico">▥</span><span><strong>Scanner</strong><small>Code-barres / QR</small></span></button>'+
    '<button class="cdq-im-tile add" data-move="add"><span class="ico">＋</span><span><strong>Ajouter</strong><small>Entrée de stock</small></span></button>'+
    '<button class="cdq-im-tile remove" data-move="remove"><span class="ico">−</span><span><strong>Retirer</strong><small>Sortie de stock</small></span></button>'+
    '<button class="cdq-im-tile history" data-view="history"><span class="ico">◷</span><span><strong>Historique</strong><small>Mouvements récents</small></span></button>'+
  '</div>'+
  '<section class="cdq-im-section"><div class="cdq-im-sectionhead"><h3>⌂ Stock par emplacement</h3><button data-view="list">Voir tout</button></div><div class="cdq-im-card">'+
  locs.map(l=>'<button class="cdq-im-location" data-location="'+esc(l.emplacementId)+'"><span class="icon">'+locIcon(l.emplacementId)+'</span><span><strong>'+esc(l.emplacementNom)+'</strong><small>'+((l.emplacementId==='SHOP')?'Stock principal':'Technicien')+'</small></span><span class="count">'+locationTotal(l.emplacementId)+'</span><span class="go">›</span></button>').join('')+
  '</div></section>'+
  '<section class="cdq-im-section"><div class="cdq-im-sectionhead"><h3>⚠ Alertes stock faible</h3><button data-view="list" data-low="1">Voir tout</button></div><div class="cdq-im-card">'+homeAlertRows()+'</div></section>';
  var hs=$('#cdqImHomeSearch',body);hs.onkeydown=e=>{if(e.key==='Enter')searchHome(hs.value)};
  hs.oninput=()=>{state.query=hs.value};
  bindCommon();
  hydratePhotos(body,(state.inv&&state.inv.articles)||[]);
}
function categoryList(){var set=new Set(['Tous']);((state.inv&&state.inv.articles)||[]).forEach(a=>set.add(cat(a)));return Array.from(set)}
function articleRow(a,showPrice){
  var total=state.locationFilter?qty(a.articleId,state.locationFilter):totalQty(a.articleId),low=state.locationFilter?lowAt(a,state.locationFilter):isLow(a);
  if(showPrice)return '<div class="cdq-im-price-row" data-detail="'+esc(a.articleId)+'">'+thumbHTML(a)+'<span><strong>'+esc(articleLabel(a))+'</strong><small>'+esc(maker(a))+' · # '+esc(a.numero||a.modele||'')+'</small></span><span class="cdq-im-price-actions"><span class="cdq-im-price">'+money(a.prixClient)+'</span>'+(isAdmin()?'<button class="cdq-im-editprice" data-price="'+esc(a.articleId)+'" type="button">✎</button>':'')+'</span></div>';
  return '<button class="cdq-im-row" data-detail="'+esc(a.articleId)+'">'+thumbHTML(a)+'<span><strong>'+esc(articleLabel(a))+'</strong><small>'+esc(maker(a))+' · # '+esc(a.numero||a.modele||'')+'</small></span><span class="stock'+(low?' low':'')+'">'+total+'<small>'+(low?'stock faible':'en stock')+'</small></span><span class="chev">›</span></button>';
}
function renderList(priceOnly){
  header(priceOnly?'Liste de prix':(state.pendingMoveKind==='add'?'Ajouter du stock':state.pendingMoveKind==='remove'?'Retirer du stock':state.lowOnly?'Stock faible':state.locationFilter?'Inventaire — '+locName(state.locationFilter):'Inventaire général'),priceOnly?'Prix rapides pour vos clients':(state.pendingMoveKind?'Choisissez un article':state.lowOnly?'Articles sous leur minimum':state.locationFilter?'Stock disponible à cet emplacement':'Recherche et catégories'),true);
  var cats=categoryList();
  if(!cats.includes(state.category))state.category='Tous';
  body.innerHTML='<div class="cdq-im-searchrow"><input class="cdq-im-search" id="cdqImListSearch" placeholder="'+(priceOnly?'Rechercher un article, marque ou modèle…':'Rechercher un article, un # ou une marque…')+'" value="'+esc(state.query)+'"><button class="cdq-im-scanmini" data-view="scanner">▥</button></div>'+
   '<div class="cdq-im-tabs">'+cats.map(c=>'<button data-cat="'+esc(c)+'" class="'+(c===state.category?'active':'')+'">'+esc(c)+'</button>').join('')+'</div>'+
   (priceOnly&&isAdmin()?'<div class="cdq-im-adminnote">Mode administrateur : les prix modifiés ici s’appliquent à tous les techniciens.</div>':'')+
   '<div class="cdq-im-list" id="cdqImRows">'+(currentArticles().length?currentArticles().map(a=>articleRow(a,priceOnly)).join(''):'<div class="cdq-im-empty">Aucun article trouvé.</div>')+'</div>'+
   (!priceOnly&&canWrite()?'<button class="cdq-im-primary" data-view="create">＋ Ajouter un nouvel article</button>':'');
  var q=$('#cdqImListSearch',body);
  function refreshRows(){
    state.query=q.value;
    var rows=$('#cdqImRows',body),arts=currentArticles();
    rows.innerHTML=arts.length?arts.map(a=>articleRow(a,priceOnly)).join(''):'<div class="cdq-im-empty">Aucun article trouvé.</div>';
    $$('[data-detail]',rows).forEach(b=>b.onclick=()=>{var a=findArticle(b.dataset.detail);if(!a)return;if(state.pendingMoveKind&&!priceOnly){state.article=a;setView('move',{kind:state.pendingMoveKind,article:a});return}setView('detail',{article:a})});
    $('[data-price]',rows).forEach(b=>b.onclick=e=>{e.stopPropagation();editPrice(b.dataset.price)});
    hydratePhotos(rows,arts);
  }
  q.oninput=refreshRows;
  $('[data-cat]',body).forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;renderList(priceOnly)});
  bindCommon();
  $('[data-price]',body).forEach(b=>b.onclick=e=>{e.stopPropagation();editPrice(b.dataset.price)});
  hydratePhotos(body,currentArticles());
}
function findArticle(id){return ((state.inv&&state.inv.articles)||[]).find(a=>String(a.articleId)===String(id))}
function renderDetail(){
  var a=state.article;if(!a)return setView('list');
  header('Détail de l’article','Toutes les informations sur l’article',true);
  var locs=locations();
  body.innerHTML='<div class="cdq-im-detailtop"><div class="cdq-im-photo" data-photo="'+esc(a.articleId)+'"><span>'+esc(catIcon(a))+'</span></div><div class="cdq-im-meta"><h2>'+esc(articleLabel(a))+'</h2><div class="maker">'+esc(maker(a))+'</div><div class="cdq-im-chiprow"><span class="cdq-im-chip">'+esc(a.numero||'Sans #')+'</span><span class="cdq-im-chip">'+esc(cat(a))+'</span>'+(String(a.actif).toUpperCase()==='FALSE'?'':'<span class="cdq-im-chip green">Actif</span>')+'</div><dl><div><dt>Fabricant</dt><dd>'+esc(maker(a))+'</dd></div><div><dt>Modèle</dt><dd>'+esc(a.modele||'—')+'</dd></div><div><dt>Code-barres</dt><dd>'+esc(a.codeBarres||'Non associé')+'</dd></div></dl></div></div>'+
   '<div class="cdq-im-desc"><strong>Description</strong><br>'+esc(a.description||'Aucune description')+'</div>'+
   '<section class="cdq-im-section"><div class="cdq-im-sectionhead"><h3>Stock par emplacement</h3><button data-view="price" data-pricequery="'+esc(a.numero||a.modele||'')+'">Voir dans liste de prix</button></div><div class="cdq-im-card">'+locs.map(l=>'<button class="cdq-im-location" data-transferloc="'+esc(l.emplacementId)+'"><span class="icon">'+locIcon(l.emplacementId)+'</span><span><strong>'+esc(l.emplacementNom)+'</strong><small>'+((lowAt(a,String(l.emplacementId)))?'Stock faible':'Disponible')+'</small></span><span class="count">'+qty(a.articleId,l.emplacementId)+'</span><span class="go">›</span></button>').join('')+'</div></section>'+
   (canWrite()?'<div class="cdq-im-detailactions"><button class="cdq-im-action add" data-detailmove="add">＋ Ajouter</button><button class="cdq-im-action transfer" data-detailmove="transfer">⇄ Transférer</button><button class="cdq-im-action remove" data-detailmove="remove">− Retirer</button></div>':'');
  bindCommon();loadPhoto(a,$('[data-photo]',body));
  $('[data-detailmove]',body).forEach(b=>b.onclick=()=>{state.article=a;state.preferredLocation='';setView('move',{kind:b.dataset.detailmove,article:a})});
  $('[data-transferloc]',body).forEach(b=>b.onclick=()=>{state.article=a;setView('move',{kind:'transfer',article:a,location:b.dataset.transferloc})});
  var pq=$('[data-pricequery]',body);if(pq)pq.onclick=()=>{state.query=pq.dataset.pricequery||'';state.category='Tous';state.locationFilter='';setView('price')};
}
async function editPrice(id){
  if(!isAdmin())return;
  var a=findArticle(id);if(!a)return;
  var raw=prompt('Nouveau prix client pour '+articleLabel(a),Number(a.prixClient||0).toFixed(2).replace('.',','));
  if(raw===null)return;var n=Number(String(raw).replace(/\s/g,'').replace(',','.'));
  if(!Number.isFinite(n)||n<0)return alert('Prix invalide.');
  setStatus('Mise à jour du prix…');
  try{await rpc('cdqInventorySetPriceV2593',[id,n]);a.prixClient=n;setStatus('Prix mis à jour pour tous les techniciens.','ok');renderList(true)}
  catch(e){setStatus(e.message||String(e),'error')}
}
function articlePicker(selectedId){
  var arts=((state.inv&&state.inv.articles)||[]).filter(a=>String(a.actif).toUpperCase()!=='FALSE');
  return '<select id="cdqImMoveArticle">'+arts.map(a=>'<option value="'+esc(a.articleId)+'" '+(String(a.articleId)===String(selectedId||'')?'selected':'')+'>'+esc(articleLabel(a))+' — '+esc(a.numero||a.modele||'')+'</option>').join('')+'</select>';
}
function locationOptions(selected){return locations().map(l=>'<option value="'+esc(l.emplacementId)+'" '+(String(l.emplacementId)===String(selected||'')?'selected':'')+'>'+esc(l.emplacementNom)+'</option>').join('')}
function defaultOwnLocation(){
  var inv=state.inv||{},own=String((inv.utilisateur&&inv.utilisateur.monCamion)||'');
  return locations().some(x=>String(x.emplacementId)===own)?own:'SHOP';
}
function renderMove(){
  var kind=state.moveKind||'add',a=state.article||((state.inv&&state.inv.articles)||[])[0];
  if(!a)return setView('create');
  var own=defaultOwnLocation(),loc=state.preferredLocation||((kind==='add')?'SHOP':own);
  var from=kind==='transfer'?loc:loc,to=kind==='transfer'?(from==='SHOP'?own:'SHOP'):loc;
  if(to===from){var alt=locations().find(x=>String(x.emplacementId)!==String(from));to=alt?alt.emplacementId:''}
  header(kind==='add'?'Ajouter du stock':kind==='remove'?'Retirer du stock':'Transférer du matériel',kind==='transfer'?'Entre la shop et les camions':'Mouvement d’inventaire',true);
  body.innerHTML='<div class="cdq-im-form"><div class="cdq-im-field"><label>Article</label>'+articlePicker(a.articleId)+'</div>'+
   (kind==='transfer'?'<div class="cdq-im-grid2"><div class="cdq-im-field"><label>De (origine)</label><select id="cdqImFrom">'+locationOptions(from)+'</select></div><div class="cdq-im-field"><label>Vers (destination)</label><select id="cdqImTo">'+locationOptions(to)+'</select></div></div>':'<div class="cdq-im-field"><label>Emplacement</label><select id="cdqImLoc">'+locationOptions(loc)+'</select></div>')+
   '<div class="cdq-im-field"><label>Quantité</label><div class="cdq-im-qty"><button id="cdqImMinus" type="button">−</button><input id="cdqImQty" type="number" inputmode="numeric" min="1" value="1"><button id="cdqImPlus" type="button">＋</button></div><small id="cdqImAvailable"></small></div>'+
   '<div class="cdq-im-field"><label>Notes (optionnelles)</label><input id="cdqImNote" maxlength="180" placeholder="Ex. : retour de chantier, installation…"></div>'+
   '<button class="cdq-im-primary '+(kind==='add'?'green':kind==='remove'?'red':'')+'" id="cdqImConfirm">'+(kind==='add'?'＋ Ajouter au stock':kind==='remove'?'− Retirer du stock':'⇄ Transférer maintenant')+'</button></div>';
  var artSel=$('#cdqImMoveArticle',body),q=$('#cdqImQty',body),fromEl=$('#cdqImFrom',body),toEl=$('#cdqImTo',body),locEl=$('#cdqImLoc',body),avail=$('#cdqImAvailable',body);
  function sync(){a=findArticle(artSel.value)||a;state.article=a;var origin=kind==='transfer'?fromEl.value:locEl.value;var available=qty(a.articleId,origin);avail.textContent=(kind==='add'?'Stock actuel : ':'Disponible : ')+available;if(kind!=='add')q.max=available||1}
  artSel.onchange=sync;if(fromEl)fromEl.onchange=sync;if(locEl)locEl.onchange=sync;
  $('#cdqImMinus',body).onclick=()=>q.value=Math.max(1,Number(q.value||1)-1);$('#cdqImPlus',body).onclick=()=>q.value=Math.max(1,Number(q.value||1)+1);sync();
  $('#cdqImConfirm',body).onclick=async()=>{var n=Math.max(1,Math.floor(Number(q.value)||1)),note=clean($('#cdqImNote',body).value),payload={kind:kind,articleId:a.articleId,qty:n,note:note,userEmail:email()};if(kind==='transfer'){payload.from=fromEl.value;payload.to=toEl.value;if(payload.from===payload.to)return setStatus('Choisissez deux emplacements différents.','error')}else payload.location=locEl.value;setStatus('Enregistrement du mouvement…');$('#cdqImConfirm',body).disabled=true;try{state.inv=await rpc('cdqInventoryMoveV2593',[payload]);setStatus('Inventaire mis à jour.','ok');state.article=findArticle(a.articleId);setTimeout(()=>setView('detail',{article:state.article}),450)}catch(e){setStatus(e.message||String(e),'error');$('#cdqImConfirm',body).disabled=false}};
}
async function loadHistory(force){
  if(state.history.length&&!force)return state.history;
  try{state.history=await rpcTry('cdqInventoryHistoryV2593',[160],'obtenirHistoriqueInventaire',[160]);if(!Array.isArray(state.history))state.history=[]}catch(e){state.history=[];setStatus(e.message||String(e),'error')}
  return state.history;
}
function moveKind(r){var t=String(r.type||'').toLowerCase();if(/trans/.test(t))return'transfer';if(/sortie|retrait|retir/.test(t))return'remove';return'add'}
function renderHistoryRows(){
  if(!state.history.length)return '<div class="cdq-im-empty">Aucun mouvement enregistré.</div>';
  return state.history.map(r=>{var k=moveKind(r),ico=k==='transfer'?'⇄':k==='remove'?'−':'＋',dir=k==='transfer'?(clean(r.origineNom)+' → '+clean(r.destinationNom)):k==='remove'?clean(r.origineNom):clean(r.destinationNom);return '<div class="cdq-im-move '+k+'"><span class="micon">'+ico+'</span><span><strong>'+esc(r.numero||r.description||'Article')+' · '+Math.abs(Number(r.quantite||0))+'</strong><small>'+esc(dir)+'<br>'+esc(r.utilisateur||'')+'</small></span><span class="time">'+esc(r.date||'')+'</span></div>'}).join('')
}
async function renderHistory(){
  header('Historique','Tous les mouvements d’inventaire',true);
  body.innerHTML='<div class="cdq-im-loader">Chargement de l’historique…</div>';
  await loadHistory(true);
  if(state.view!=='history')return;
  body.innerHTML='<div class="cdq-im-history">'+renderHistoryRows()+'</div>';
}
function compressImage(file,max,quality){return new Promise((resolve,reject)=>{var r=new FileReader();r.onerror=()=>reject(Error('Lecture de l’image impossible.'));r.onload=()=>{var im=new Image();im.onerror=()=>reject(Error('Image invalide.'));im.onload=()=>{var w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,k=Math.min(1,max/Math.max(w,h));w=Math.max(1,Math.round(w*k));h=Math.max(1,Math.round(h*k));var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);resolve(c.toDataURL('image/jpeg',quality||.9))};im.src=r.result};r.readAsDataURL(file)})}
function renderScanner(){
  header('Scanner','Ajouter, transférer ou retirer rapidement',true);
  state.scanArticle=null;state.scanCode='';state.scanDataUrl='';
  body.innerHTML='<div class="cdq-im-scannerbox"><div class="cdq-im-scanpreview" id="cdqImScanPreview"><div class="cdq-im-scanplaceholder"><b>Scanner un code</b>Photographiez le code-barres ou le code QR.</div></div><input type="file" id="cdqImScanFile" accept="image/*" capture="environment" hidden><input type="file" id="cdqImScanGallery" accept="image/*" hidden><div class="cdq-im-scanbuttons"><button id="cdqImScanTake">📷 Scanner avec caméra</button><button id="cdqImScanGalleryBtn">▧ Galerie</button></div><div id="cdqImScanResult"></div></div>';
  $('#cdqImScanTake',body).onclick=()=>$('#cdqImScanFile',body).click();$('#cdqImScanGalleryBtn',body).onclick=()=>$('#cdqImScanGallery',body).click();
  function bindFile(el){el.onchange=async e=>{var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;try{state.scanDataUrl=await compressImage(f,2200,.94);var im=document.createElement('img');im.src=state.scanDataUrl;$('#cdqImScanPreview',body).replaceChildren(im);scanBarcode()}catch(er){setStatus(er.message||String(er),'error')}}}
  bindFile($('#cdqImScanFile',body));bindFile($('#cdqImScanGallery',body));
}
function renderScanFound(){
  var box=$('#cdqImScanResult',body);if(!box)return;
  var a=state.scanArticle;
  if(!a){box.innerHTML='<div class="cdq-im-found"><strong>Code détecté : '+esc(state.scanCode)+'</strong><small>Aucun article associé à ce code.</small></div>'+(canWrite()?'<button class="cdq-im-primary" id="cdqImCreateFromScan">＋ Créer un nouvel article</button>':'');var c=$('#cdqImCreateFromScan',body);if(c)c.onclick=()=>setView('create');return}
  box.innerHTML='<div class="cdq-im-found"><strong>✓ '+esc(articleLabel(a))+'</strong><small>'+esc(maker(a))+' · # '+esc(a.numero||a.modele||'')+' · Stock total '+totalQty(a.articleId)+'</small></div>'+(canWrite()?'<div class="cdq-im-detailactions"><button class="cdq-im-action add" data-scanmove="add">＋ Ajouter</button><button class="cdq-im-action transfer" data-scanmove="transfer">⇄ Transférer</button><button class="cdq-im-action remove" data-scanmove="remove">− Retirer</button></div>':'');
  $('[data-scanmove]',body).forEach(b=>b.onclick=()=>{state.article=a;setView('move',{kind:b.dataset.scanmove,article:a})});
}
function scanBarcode(){
  var bridge;try{bridge=window.BalanceCDQNative||(window.parent&&window.parent.BalanceCDQNative)}catch(_){bridge=window.BalanceCDQNative}
  if(!bridge||typeof bridge.recognizeInventoryBarcode!=='function'){setStatus('Le scanner natif est disponible à partir de Balance CDQ Android 25.94.','error');return}
  var id='invscan-'+Date.now()+'-'+Math.random().toString(36).slice(2);window.__cdqInvBarcodeReqV2592=id;state.scanBusy=true;setStatus('Lecture du code…');
  try{bridge.recognizeInventoryBarcode(id,state.scanDataUrl)}catch(e){state.scanBusy=false;setStatus(e.message||String(e),'error')}
}
window.cdqNativeInventoryBarcodeV2592=function(id,ok,value,message){
  if(String(id)!==String(window.__cdqInvBarcodeReqV2592||''))return;window.__cdqInvBarcodeReqV2592='';state.scanBusy=false;
  if(!ok||!value){setStatus(message||'Aucun code lisible détecté.','error');return}
  state.scanCode=clean(value);var code=state.scanCode.toLowerCase();state.scanArticle=((state.inv&&state.inv.articles)||[]).find(a=>[a.codeBarres,a.numero,a.modele].some(v=>clean(v).toLowerCase()===code))||null;
  setStatus('Code détecté : '+state.scanCode,'ok');renderScanFound();
};
function renderCreate(){
  header('Nouvel article','Création manuelle ou depuis un scan',true);
  var c=state.scanCode||'',loc=defaultOwnLocation();
  body.innerHTML='<div class="cdq-im-form"><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Numéro / référence</label><input id="cdqImNewNum" placeholder="Ex. IND-680"></div><div class="cdq-im-field"><label>Code-barres</label><input id="cdqImNewCode" value="'+esc(c)+'" placeholder="Optionnel"></div></div><div class="cdq-im-field"><label>Description</label><input id="cdqImNewDesc" placeholder="Ex. Indicateur Rice Lake 680"></div><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Catégorie</label><select id="cdqImNewCat"><option>Indicateurs</option><option>Cartes de sommation</option><option>Loadcells</option><option>Câbles</option><option>Connecteurs</option><option>Cartes mères</option><option>Keyboards</option><option>Accessoires</option><option selected>Autres</option></select></div><div class="cdq-im-field"><label>Fabricant</label><input id="cdqImNewMaker" placeholder="Rice Lake, Mettler Toledo…"></div></div><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Modèle</label><input id="cdqImNewModel" placeholder="680, IND570…"></div><div class="cdq-im-field"><label>Photo</label><input id="cdqImNewPhoto" type="file" accept="image/*"></div></div><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Emplacement initial</label><select id="cdqImNewLoc">'+locationOptions(loc)+'</select></div><div class="cdq-im-field"><label>Quantité initiale</label><input id="cdqImNewQty" type="number" inputmode="numeric" min="0" value="0"></div></div><button class="cdq-im-primary green" id="cdqImCreate">＋ Créer l’article</button></div>';
  $('#cdqImCreate',body).onclick=async()=>{var payload={numero:clean($('#cdqImNewNum',body).value),description:clean($('#cdqImNewDesc',body).value),categorie:$('#cdqImNewCat',body).value,fabricant:clean($('#cdqImNewMaker',body).value)||'Divers',modele:clean($('#cdqImNewModel',body).value),codeBarres:clean($('#cdqImNewCode',body).value),location:$('#cdqImNewLoc',body).value,qty:Math.max(0,Math.floor(Number($('#cdqImNewQty',body).value)||0)),userEmail:email()};if(!payload.numero||!payload.description)return setStatus('Numéro et description requis.','error');$('#cdqImCreate',body).disabled=true;setStatus('Création de l’article…');try{var r=await rpc('cdqInventoryCreateV2593',[payload]);state.inv=r.inventory||await load(true);var a=findArticle(r.articleId);var f=$('#cdqImNewPhoto',body).files&&$('#cdqImNewPhoto',body).files[0];if(f&&a){setStatus('Enregistrement de la photo…');var data=await compressImage(f,1200,.86);await rpc('cdqInventorySavePhotoV2593',[a.articleId,data]);state.inv=await rpc('cdqInventoryGetV2593',[]);a=findArticle(r.articleId)}setStatus('Article créé.','ok');state.scanCode='';setTimeout(()=>setView('detail',{article:a}),400)}catch(e){setStatus(e.message||String(e),'error');$('#cdqImCreate',body).disabled=false}};
}
function render(){
  ensurePage();
  if(!state.inv){body.innerHTML='<div class="cdq-im-loader">Chargement de l’inventaire…</div>';load().then(render).catch(()=>{});return}
  setStatus('');
  if(state.view==='home')return renderHome();
  if(state.view==='list')return renderList(false);
  if(state.view==='price')return renderList(true);
  if(state.view==='detail')return renderDetail();
  if(state.view==='move')return renderMove();
  if(state.view==='history')return void renderHistory();
  if(state.view==='scanner')return renderScanner();
  if(state.view==='create')return renderCreate();
  renderHome();
}
function bindCommon(){
  $$('[data-view]',body).forEach(b=>b.onclick=()=>{if(state.view==='home'&&(b.dataset.view==='list'||b.dataset.view==='price')){state.query='';state.category='Tous'}if(b.dataset.view==='list'){state.pendingMoveKind='';state.locationFilter='';state.lowOnly=b.dataset.low==='1';if(state.lowOnly){state.query='';state.category='Tous'}}else if(b.dataset.view==='price'){state.locationFilter='';state.lowOnly=false}else if(b.dataset.view!=='list'){state.lowOnly=false}setView(b.dataset.view)});
  $$('[data-move]',body).forEach(b=>b.onclick=()=>{state.pendingMoveKind=b.dataset.move;state.article=null;state.query='';state.category='Tous';state.locationFilter='';state.lowOnly=false;setView('list')});
  $$('[data-detail]',body).forEach(b=>b.onclick=()=>{var a=findArticle(b.dataset.detail);if(!a)return;if(state.pendingMoveKind&&state.view==='list'){state.article=a;setView('move',{kind:state.pendingMoveKind,article:a});return}setView('detail',{article:a})});
  $$('[data-location]',body).forEach(b=>b.onclick=()=>{state.query='';state.category='Tous';state.lowOnly=false;state.locationFilter=b.dataset.location;state.preferredLocation=b.dataset.location;setView('list')});
}
function ensurePage(){
  if(page&&page.isConnected)return page;
  page=document.createElement('section');page.id='cdqInventoryModernV2592';page.hidden=true;
  page.innerHTML='<div class="cdq-im-shell"><header class="cdq-im-top"><div class="cdq-im-head"><button class="cdq-im-back" id="cdqImBack">←</button><div class="cdq-im-title"><strong id="cdqImTitle">Inventaire</strong><small id="cdqImSub">Accueil rapide</small></div><button class="cdq-im-close" id="cdqImClose">✕</button></div></header><main class="cdq-im-body" id="cdqImBody"></main><div class="cdq-im-status" id="cdqImStatus"></div></div>';
  document.body.append(page);body=$('#cdqImBody',page);titleEl=$('#cdqImTitle',page);subEl=$('#cdqImSub',page);backBtn=$('#cdqImBack',page);statusEl=$('#cdqImStatus',page);backBtn.onclick=back;$('#cdqImClose',page).onclick=close;position();return page
}
function position(){if(!page||page.hidden)return;var h=$('#appHeader'),n=$('.bottom-nav'),top=Math.max(0,Math.round(h?.getBoundingClientRect().bottom||0)),bottom=Math.max(0,Math.round(innerHeight-(n?.getBoundingClientRect().top||innerHeight)));page.style.top=top+'px';page.style.bottom=bottom+'px'}
function open(){photoCache.clear();if(typeof cdqAccessState!=='undefined'&&cdqAccessState!=='ready'){if(typeof afficherMessage==='function')afficherMessage('Connectez-vous avant d’ouvrir Inventaire.',false);return}ensurePage();state.view='home';state.query='';state.category='Tous';state.locationFilter='';page.hidden=false;document.documentElement.classList.add('cdq-inventory-modern-open-v2592');position();load(true).then(render).catch(()=>render())}
function close(){if(!page||page.hidden)return;page.hidden=true;document.documentElement.classList.remove('cdq-inventory-modern-open-v2592')}
function inventoryButton(){var nav=$('.bottom-nav');if(!nav)return null;return $$(':scope > .bottom-nav-item',nav).find(b=>String($('small',b)?.textContent||'').trim()==='Inventaire')||null}
function install(){
  window.cdqInventoryModernV2592={open,close,refresh:()=>load(true).then(render)};
  window.ouvrirInventaireCDQ=open;
  document.addEventListener('click',function(e){var nav=$('.bottom-nav');if(!nav)return;var b=e.target.closest('.bottom-nav-item');if(!b)return;var label=String($('small',b)?.textContent||'').trim();if(label==='Inventaire'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(page&&!page.hidden)close();else open();return}if(page&&!page.hidden)close()},true);
  addEventListener('resize',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;position()})}},{passive:true});
  try{visualViewport?.addEventListener('resize',position,{passive:true})}catch(_){}
  window.addEventListener('cdq:access-ready',()=>{state.inv=null});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
