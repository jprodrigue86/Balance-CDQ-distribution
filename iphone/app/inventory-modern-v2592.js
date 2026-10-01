(function inventoryModernV2592(){
'use strict';
function normalize(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
if(window.cdqInventoryModernV2592)return;
var page=null,body=null,titleEl=null,subEl=null,backBtn=null,statusEl=null,scheduled=false;
var state={inv:null,view:'home',article:null,query:'',category:'Tous',locationFilter:'',lowOnly:false,pendingMoveKind:'',history:[],scanDataUrl:'',scanCode:'',scanArticle:null,scanUnit:null,scanBusy:false,moveKind:'',preferredLocation:'',labelDataUrl:'',labelText:'',labelBarcode:'',labelInfo:null,labelArticleId:'',labelPendingKind:'',labelRequest:'',labelBusy:false,preserveLabelScanner:false,serialServerReady:null,scanConfirmed:false,labelQuality:null};
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
function saleQtyLabelV2624(a){var v=a&&a.disponibleVente;return v==null||v===''||!Number.isFinite(Number(v))?'—':String(Number(v))}
function articleLabel(a){return clean((a&&a.description)||'')||clean((a&&a.numero)||'')||'Article'}
function articleDesc(a){var n=clean(a&&a.numero),d=clean(a&&a.description);if(n&&d&&n.toLowerCase()!==d.toLowerCase())return n+' — '+d;return n||d||'Article'}
function cat(a){return clean(a&&a.categorie)||'Autres'}
function maker(a){return clean(a&&a.fabricant)||'Divers'}
function articleSearchText(a){var unitText=unitsFor(a&&a.articleId).map(function(u){return [u.numeroSerie,u.codeBarres].filter(Boolean).join(' ')}).join(' ');return [a.numero,a.skuSource,a.description,a.categorie,a.fabricant,a.modele,a.codeBarres,unitText].map(clean).join(' ').toLocaleLowerCase('fr')}
function qty(articleId,loc){var s=((state.inv&&state.inv.stocks)||[]).find(x=>String(x.articleId)===String(articleId)&&String(x.emplacementId)===String(loc));return s?Number(s.quantite||0):0}
function totalQty(articleId){return ((state.inv&&state.inv.stocks)||[]).filter(x=>String(x.articleId)===String(articleId)).reduce((n,x)=>n+Number(x.quantite||0),0)}
function serialKey(v){return normalize(clean(v)).replace(/[^a-z0-9]/g,'')}
function unitActive(u){return normalize(u&&u.statut||'stock')!=='sortie'}
function unitsFor(articleId,loc){return ((state.inv&&state.inv.unites)||[]).filter(function(u){return String(u.articleId)===String(articleId)&&unitActive(u)&&(!loc||String(u.emplacementId)===String(loc))})}
function unitBySerial(articleId,serial){var key=serialKey(serial);if(!key)return null;return ((state.inv&&state.inv.unites)||[]).find(function(u){return String(u.articleId)===String(articleId)&&unitActive(u)&&serialKey(u.numeroSerie)===key})||null}
function unitByBarcode(code){var c=clean(code).toLowerCase();if(!c)return null;return ((state.inv&&state.inv.unites)||[]).find(function(u){return unitActive(u)&&clean(u.codeBarres).toLowerCase()===c})||null}
function unitByAnySerial(serial){var key=serialKey(serial);if(!key)return null;return ((state.inv&&state.inv.unites)||[]).find(function(u){return unitActive(u)&&serialKey(u.numeroSerie)===key})||null}
function clearInventoryLabelContext(){state.labelDataUrl='';state.labelText='';state.labelBarcode='';state.labelInfo=null;state.labelArticleId='';state.labelPendingKind='';state.labelRequest='';state.labelBusy=false;state.labelQuality=null;state.preserveLabelScanner=false}
function labelCaptureCard(kind,compact){var action=kind==='remove'?'retirer':kind==='add'?'ajouter':'identifier';return '<section class="cdq-im-label-card'+(compact?' compact':'')+'" data-label-card><div class="cdq-im-label-head"><span>▣</span><div><strong>Photo d’étiquette</strong><small>Photographiez l’étiquette pour '+action+' la bonne unité.</small></div></div><input type="file" accept="image/*" capture="environment" data-label-camera hidden><input type="file" accept="image/*" data-label-import hidden><div class="cdq-im-label-actions"><button type="button" data-label-take>📷 Prendre une photo</button><button type="button" data-label-import-btn>▧ Importer</button></div><div data-label-inline></div></section>'}
function installLabelCapture(host,kind,compact){if(!host||host.querySelector('[data-label-card]'))return;var wrap=document.createElement('div');wrap.innerHTML=labelCaptureCard(kind,compact);var card=wrap.firstElementChild;host.insertBefore(card,host.firstChild);var camera=$('[data-label-camera]',card),gallery=$('[data-label-import]',card);$('[data-label-take]',card).onclick=function(){camera.click()};$('[data-label-import-btn]',card).onclick=function(){gallery.click()};camera.onchange=function(e){var file=e.target.files&&e.target.files[0];e.target.value='';if(file)analyzeInventoryLabelFile(file,kind)};gallery.onchange=function(e){var file=e.target.files&&e.target.files[0];e.target.value='';if(file)analyzeInventoryLabelFile(file,kind)};if(state.labelInfo){var hit=state.labelArticleId?findArticle(state.labelArticleId):null,inline=$('[data-label-inline]',card);if(inline)inline.innerHTML=labelSummaryHtml(state.labelInfo,hit)}}
function firstLabelCapture(text,patterns){for(var i=0;i<patterns.length;i++){var m=String(text||'').match(patterns[i]);if(m&&m[1])return clean(m[1]).replace(/^[#:\- ]+|[;, ]+$/g,'')}return''}
function inferLabelCategory(text){var t=normalize(text);if(/load\s*cell|loadcell|cellule/.test(t))return'Loadcells';if(/indicator|indicateur/.test(t))return'Indicateurs';if(/scale|balance/.test(t))return'Balances';if(/summing|sommation/.test(t))return'Cartes de sommation';if(/cable|wire|fil/.test(t))return'Câbles';if(/connector|connecteur/.test(t))return'Connecteurs';return'Autres'}
function parseInventoryLabel(text,barcode){var raw=String(text||''),lines=raw.split(/\r?\n/).map(clean).filter(Boolean),serial=firstLabelCapture(raw,[/(?:^|\b)(?:S\/?N|SERIAL(?:\s*(?:NO|NUMBER|#))?|NO\.?\s*SERIAL|NUM[ÉE]RO\s+DE\s+S[ÉE]RIE|N[°O]\s*DE\s*S[ÉE]RIE)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,})/im,/(?:^|\b)(?:SERIE|S[ÉE]RIE)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,})/im]),model=firstLabelCapture(raw,[/(?:^|\b)(?:MODEL|MOD[ÈE]LE|MODEL\s*NO|MOD\.?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{1,})/im,/(?:^|\b)(?:P\/N|PART\s*(?:NO|NUMBER|#)|PART\s*NO\.?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{1,})/im]),part=firstLabelCapture(raw,[/(?:^|\b)(?:P\/N|PART\s*(?:NO|NUMBER|#)|PART\s*NO\.?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{1,})/im]),makers=Array.from(new Set(((state.inv&&state.inv.articles)||[]).map(function(a){return clean(a.fabricant)}).filter(Boolean))).sort(function(a,b){return b.length-a.length}),nraw=normalize(raw),fabricant=makers.find(function(x){return nraw.includes(normalize(x))})||'',bad=/\b(?:serial|s\/?n|model|mod[èe]le|part|p\/n|volt|hz|amp|made in|www\.|tel\.?|warning|attention)\b/i,title=lines.find(function(l){return l.length>=3&&l.length<=90&&/[A-Za-zÀ-ÿ]/.test(l)&&!bad.test(l)})||'';return{text:raw,barcode:clean(barcode),serial:serial,model:model,partNumber:part,title:title,fabricant:fabricant,categorie:inferLabelCategory(raw)}}
function matchInventoryLabel(info){
  if(!info)return null;
  var serial=serialKey(info.serial);
  if(serial){
    var unit=unitByAnySerial(info.serial);
    if(unit){
      var ua=findArticle(unit.articleId),validation=ua?inventoryLabelValidation(info,ua,unit):null;
      if(ua)return{article:ua,unit:unit,score:300,validation:validation};
    }
  }
  var text=normalize(info.text),best=null,bestScore=0;
  ((state.inv&&state.inv.articles)||[]).forEach(function(a){
    var score=0,bc=clean(a.codeBarres),num=clean(a.numero),mod=clean(a.modele),mk=clean(a.fabricant),im=normalize(info.model),ip=normalize(info.partNumber);
    if(info.barcode&&bc&&info.barcode===bc)score+=240;
    if(im&&(normalize(mod)===im||normalize(num)===im))score+=120;
    if(ip&&(normalize(num)===ip||normalize(mod)===ip))score+=110;
    if(num.length>=3&&text.includes(normalize(num)))score+=48;
    if(mod.length>=3&&text.includes(normalize(mod)))score+=52;
    if(mk.length>=3&&text.includes(normalize(mk)))score+=18;
    var words=normalize(a.description).split(/\s+/).filter(function(w){return w.length>=5}).slice(0,5),hits=words.filter(function(w){return text.includes(w)}).length;
    score+=Math.min(20,hits*5);
    if(score>bestScore){bestScore=score;best=a}
  });
  return bestScore>=50?{article:best,unit:null,score:bestScore,validation:null}:null;
}
function labelSummaryHtml(info,a){if(!info)return'';var rows=[];if(info.model)rows.push('<span><b>Modèle</b>'+esc(info.model)+'</span>');if(info.serial)rows.push('<span><b>Série</b>'+esc(info.serial)+'</span>');if(info.barcode)rows.push('<span><b>Code</b>'+esc(info.barcode)+'</span>');if(info.fabricant)rows.push('<span><b>Fabricant</b>'+esc(info.fabricant)+'</span>');var match=a?'<div class="cdq-im-label-match"><strong>✓ '+esc(articleLabel(a))+'</strong><small>'+esc([cat(a),maker(a),a.modele].filter(Boolean).join(' • '))+' · Prix '+money(a.prixClient)+'</small></div>':'<div class="cdq-im-label-match warn"><strong>Article non reconnu automatiquement</strong><small>Vérifiez les informations avant de créer ou retirer du stock.</small></div>';return'<div class="cdq-im-label-result">'+rows.join('')+match+'</div>'}
function nativeInventoryLabelBridge(){try{return window.BalanceCDQNative||(window.parent&&window.parent.BalanceCDQNative)||null}catch(_){return window.BalanceCDQNative||null}}
async function requireSerialServer(){if(state.serialServerReady===true)return true;try{var c=await rpc('cdqInventoryCapabilitiesV2616',[]);state.serialServerReady=!!(c&&c.ok&&c.serialTracking)}catch(_){state.serialServerReady=false}if(!state.serialServerReady)setStatus('Le service Inventaire V26.16 doit être déployé avant d’enregistrer un numéro de série.','error');return state.serialServerReady}
function inventoryLabelValidation(info,a,unit){
  var good=[],bad=[],model=normalize(info&&info.model),part=normalize(info&&info.partNumber),makerInfo=normalize(info&&info.fabricant),barcode=clean(info&&info.barcode).toLowerCase();
  var models=[normalize(a&&a.modele),normalize(a&&a.numero)].filter(Boolean),makerArticle=normalize(a&&a.fabricant);
  function modelMatches(v){return !!v&&models.some(function(x){return x===v||x.includes(v)||v.includes(x)})}
  if(model){if(modelMatches(model))good.push('modèle');else if(models.length)bad.push('modèle')}
  if(part){if(modelMatches(part))good.push('référence');else if(models.length)bad.push('référence')}
  if(makerInfo){if(makerArticle&&(makerArticle===makerInfo||makerArticle.includes(makerInfo)||makerInfo.includes(makerArticle)))good.push('fabricant');else if(makerArticle)bad.push('fabricant')}
  if(barcode){
    var codes=[clean(unit&&unit.codeBarres).toLowerCase(),clean(a&&a.codeBarres).toLowerCase()].filter(Boolean);
    if(codes.includes(barcode))good.push('code-barres');else if(codes.length)bad.push('code-barres');
  }
  var serialExact=!!(unit&&serialKey(unit.numeroSerie)===serialKey(info&&info.serial));
  return {serialExact:serialExact,good:good,bad:bad,conflict:bad.length>0,strong:serialExact&&bad.length===0&&good.length>0,partial:serialExact&&bad.length===0&&good.length===0};
}
function closeInventoryLabelConfirm(clear){
  var o=page&&page.querySelector('[data-label-confirm-overlay]');if(o)o.remove();
  if(clear)clearInventoryLabelContext();
}
function showInventoryLabelConfirm(a,unit,info,requestedKind,validation){
  if(!page||!a)return;
  closeInventoryLabelConfirm(false);
  var location=unit?(unit.emplacementNom||locName(unit.emplacementId)):'—',serial=clean(info&&info.serial)||clean(unit&&unit.numeroSerie),confidence=validation&&validation.strong?'Numéro de série + '+validation.good.join(' + '):'Numéro de série exact';
  var overlay=document.createElement('div');overlay.className='cdq-im-label-confirm-overlay';overlay.dataset.labelConfirmOverlay='1';
  overlay.innerHTML='<div class="cdq-im-label-confirm"><div class="cdq-im-label-confirm-icon">✓</div><h3>Cet objet existe déjà dans l’inventaire</h3><div class="cdq-im-label-confirm-product"><strong>'+esc(articleLabel(a))+'</strong><small>'+esc([maker(a),a.modele,a.categorie].filter(Boolean).join(' • '))+'</small></div><div class="cdq-im-label-confirm-grid"><span><b>Numéro de série</b>'+esc(serial||'—')+'</span><span><b>Emplacement</b>'+esc(location)+'</span><span><b>Prix</b>'+esc(money(a.prixClient))+'</span><span><b>Validation</b>'+esc(confidence)+'</span></div><p>La fiche a été retrouvée par le numéro de série et vérifiée avec les informations lisibles de l’étiquette.</p><div class="cdq-im-label-confirm-actions"><button type="button" data-label-cancel>Annuler</button><button type="button" data-label-view>Voir la fiche</button>'+(canWrite()?'<button type="button" class="danger" data-label-remove>Retirer cet objet</button>':'')+'</div></div>';
  page.append(overlay);
  $('[data-label-cancel]',overlay).onclick=function(){closeInventoryLabelConfirm(true);setStatus('Lecture annulée.','')};
  $('[data-label-view]',overlay).onclick=function(){closeInventoryLabelConfirm(false);state.article=a;setView('detail',{article:a})};
  var remove=$('[data-label-remove]',overlay);if(remove)remove.onclick=function(){closeInventoryLabelConfirm(false);state.labelPendingKind='remove';state.article=a;state.preferredLocation=unit&&unit.emplacementId||state.preferredLocation;setView('move',{kind:'remove',article:a,location:state.preferredLocation})};
}
function imageQualityFromFile(file){
  return new Promise(function(resolve,reject){
    var r=new FileReader();r.onerror=function(){reject(Error('Lecture de la photo impossible.'))};r.onload=function(){var im=new Image();im.onerror=function(){reject(Error('Photo invalide.'))};im.onload=function(){
      var ow=im.naturalWidth||im.width,oh=im.naturalHeight||im.height,maxSide=Math.max(ow,oh),minSide=Math.min(ow,oh);
      if(maxSide<900||minSide<350){resolve({ok:false,reason:'Photo trop petite. Rapprochez-vous et assurez-vous que toute l’étiquette reste dans l’image.',width:ow,height:oh});return}
      var scale=Math.min(1,420/maxSide),w=Math.max(32,Math.round(ow*scale)),h=Math.max(32,Math.round(oh*scale)),c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d',{alpha:false,willReadFrequently:true});x.drawImage(im,0,0,w,h);var d=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h),sum=0,sum2=0,n=w*h;
      for(var i=0,p=0;i<d.length;i+=4,p++){var y=.299*d[i]+.587*d[i+1]+.114*d[i+2];g[p]=y;sum+=y;sum2+=y*y}
      var mean=sum/n,contrast=Math.sqrt(Math.max(0,sum2/n-mean*mean)),edge=0,count=0;
      for(var yy=1;yy<h-1;yy+=2)for(var xx=1;xx<w-1;xx+=2){var p=yy*w+xx,gx=Math.abs(g[p+1]-g[p-1]),gy=Math.abs(g[p+w]-g[p-w]);edge+=gx+gy;count++}
      var sharp=count?edge/count:0,reason='';
      if(mean<32)reason='Photo trop sombre. Ajoutez de la lumière et reprenez la photo.';
      else if(mean>242&&contrast<22)reason='Photo surexposée. Évitez le reflet et reprenez la photo.';
      else if(contrast<15)reason='L’étiquette manque de contraste. Rapprochez-vous et évitez les reflets.';
      else if(sharp<5.8)reason='Photo trop floue. Immobilisez le téléphone et attendez la mise au point avant de prendre la photo.';
      resolve({ok:!reason,reason:reason,width:ow,height:oh,brightness:mean,contrast:contrast,sharpness:sharp});
    };im.src=r.result};r.readAsDataURL(file)
  });
}
function applyInventoryLabelResult(text,barcode,kind){
  state.labelText=String(text||'');state.labelBarcode=clean(barcode);state.labelInfo=parseInventoryLabel(state.labelText,state.labelBarcode);state.labelPendingKind=kind||state.labelPendingKind||'detail';
  var hit=matchInventoryLabel(state.labelInfo),article=hit&&hit.article,unit=hit&&hit.unit,validation=hit&&hit.validation;
  state.labelArticleId=article?String(article.articleId):'';
  if(unit&&article){
    if(validation&&validation.conflict){
      render();setStatus('Numéro de série trouvé, mais '+validation.bad.join(', ')+' ne correspond pas à la fiche. Reprenez une photo nette de toute l’étiquette.','error');return;
    }
    showInventoryLabelConfirm(article,unit,state.labelInfo,state.labelPendingKind,validation||{partial:true,good:[]});return;
  }
  if(article&&state.labelInfo.serial&&unitsFor(article.articleId).length){
    render();setStatus('Article reconnu, mais le numéro de série ne correspond à aucune unité suivie. Reprenez la photo ou vérifiez le numéro.','error');return;
  }
  if((state.labelPendingKind==='add'||state.labelPendingKind==='remove')&&article){
    state.article=article;state.pendingMoveKind='';setView('move',{kind:state.labelPendingKind,article:article});return;
  }
  if(state.labelPendingKind==='add'&&!article&&canWrite()){state.scanCode='';state.preserveLabelScanner=true;setView('create');return}
  if(state.labelPendingKind==='detail'&&article){state.article=article;setView('detail',{article:article});return}
  render();setStatus(article?'Étiquette reconnue : '+articleLabel(article):'Étiquette lue, mais aucun article fiable n’a été trouvé.','ok');
}
async function analyzeInventoryLabelFile(file,kind){
  if(!file||state.labelBusy)return;
  state.labelBusy=true;state.labelPendingKind=kind||'detail';setStatus('Vérification de la netteté…');
  try{
    var quality=await imageQualityFromFile(file);state.labelQuality=quality;
    if(!quality.ok){state.labelBusy=false;setStatus(quality.reason,'error');return}
    setStatus('Photo nette — lecture de l’étiquette…');
    state.labelDataUrl=await compressImage(file,2400,.94);
    var bridge=nativeInventoryLabelBridge();
    if(bridge&&typeof bridge.recognizeInventoryLabel==='function'){
      var id='invlabel-'+Date.now()+'-'+Math.random().toString(36).slice(2);state.labelRequest=id;window.__cdqInvLabelReqV2616=id;bridge.recognizeInventoryLabel(id,state.labelDataUrl);return;
    }
    var ocr=await rpc('cdqLireFactureOcrV2599',[state.labelDataUrl]),text=ocr&&ocr.text||'',barcode='';
    if(bridge&&typeof bridge.recognizeInventoryBarcode==='function'){
      var bid='invlabelbar-'+Date.now()+'-'+Math.random().toString(36).slice(2);window.__cdqInvLabelBarcodeReqV2616=bid;window.__cdqInvLabelBarcodeTextV2616=text;try{bridge.recognizeInventoryBarcode(bid,state.labelDataUrl);return}catch(_){}
    }
    applyInventoryLabelResult(text,barcode,kind);
  }catch(e){setStatus(e.message||String(e),'error')}
  finally{if(!state.labelRequest&&!window.__cdqInvLabelBarcodeReqV2616)state.labelBusy=false}
}
window.cdqNativeInventoryLabelV2616=function(id,ok,text,barcode,message){if(String(id)!==String(window.__cdqInvLabelReqV2616||''))return;window.__cdqInvLabelReqV2616='';state.labelRequest='';state.labelBusy=false;if(!ok)return setStatus(message||'Étiquette non lisible.','error');applyInventoryLabelResult(text,barcode,state.labelPendingKind)}

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
var inventoryPhotosV2630={"ca902904-e614-5126-8813-49d803fe0681":"./assets/inventory-v2630/anyload-amf-3-4.jpg"};
function thumbHTML(a,cls){var remote=clean(a&&a.imageUrl)||inventoryPhotosV2630[String(a&&a.articleId||'')]||'',fallback='<span>'+esc(catIcon(a))+'</span>';var visual=remote?'<img src="'+esc(remote)+'" alt="'+esc(articleLabel(a))+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'inline\'"><span style="display:none">'+esc(catIcon(a))+'</span>':fallback;return '<div class="'+(cls||'cdq-im-thumb')+'" data-photo="'+esc(a&&a.articleId||'')+'">'+visual+'</div>'}
function loadPhoto(a,box){if(!a||!box||box.dataset.loaded==='1')return;box.dataset.loaded='1';var key=String(a.articleId||'');function show(src){if(!src)return;photoCache.set(key,src);var im=document.createElement('img');im.alt=articleLabel(a);im.src=src;box.replaceChildren(im)}if(photoCache.has(key)){show(photoCache.get(key));return}if(a.photoFileId){rpc('cdqInventoryGetPhotoV2593',[a.articleId]).then(r=>{if(r&&r.dataUrl)show(r.dataUrl)}).catch(()=>{});return}if(a.imageUrl){show(a.imageUrl);return}if(a.imageSourceUrl){rpc('cdqInventoryResolveOfficialImageV2623',[a.articleId]).then(r=>{if(r&&r.imageUrl){a.imageUrl=r.imageUrl;show(r.imageUrl)}}).catch(()=>{})}}
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
  installLabelCapture(body,'detail',false);var hs=$('#cdqImHomeSearch',body);hs.onkeydown=e=>{if(e.key==='Enter')searchHome(hs.value)};
  hs.oninput=()=>{state.query=hs.value};
  bindCommon();
  hydratePhotos(body,(state.inv&&state.inv.articles)||[]);
}
function categoryList(){var set=new Set(['Tous']);((state.inv&&state.inv.articles)||[]).forEach(a=>set.add(cat(a)));return Array.from(set)}
function articleRow(a,showPrice){
  var total=state.locationFilter?qty(a.articleId,state.locationFilter):totalQty(a.articleId),low=state.locationFilter?lowAt(a,state.locationFilter):isLow(a);
  if(showPrice)return '<div class="cdq-im-price-row" data-detail="'+esc(a.articleId)+'">'+thumbHTML(a)+'<span><strong>'+esc(articleLabel(a))+'</strong><small>'+esc(maker(a))+' · # '+esc(a.numero||a.modele||'')+' · Disponible vente : '+saleQtyLabelV2624(a)+'</small></span><span class="cdq-im-price-actions"><span class="cdq-im-price">'+money(a.prixClient)+'</span>'+(isAdmin()?'<button class="cdq-im-editprice" data-price="'+esc(a.articleId)+'" type="button">✎</button>':'')+'</span></div>';
  return '<button class="cdq-im-row" data-detail="'+esc(a.articleId)+'">'+thumbHTML(a)+'<span><strong>'+esc(articleLabel(a))+'</strong><small>'+esc(maker(a))+' · # '+esc(a.numero||a.modele||'')+' · Vente : '+saleQtyLabelV2624(a)+'</small></span><span class="stock'+(low?' low':'')+'">'+total+'<small>'+(low?'stock faible':'physique')+'</small></span><span class="chev">›</span></button>';
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
  if(state.pendingMoveKind==='add'||state.pendingMoveKind==='remove')installLabelCapture(body,state.pendingMoveKind,false);
  var q=$('#cdqImListSearch',body);
  function refreshRows(){
    state.query=q.value;
    var rows=$('#cdqImRows',body),arts=currentArticles();
    rows.innerHTML=arts.length?arts.map(a=>articleRow(a,priceOnly)).join(''):'<div class="cdq-im-empty">Aucun article trouvé.</div>';
    $$('[data-detail]',rows).forEach(b=>b.onclick=()=>{var a=findArticle(b.dataset.detail);if(!a)return;if(state.pendingMoveKind&&!priceOnly){state.article=a;setView('move',{kind:state.pendingMoveKind,article:a});return}setView('detail',{article:a})});
    $$('[data-price]',rows).forEach(b=>b.onclick=e=>{e.stopPropagation();editPrice(b.dataset.price)});
    hydratePhotos(rows,arts);
  }
  q.oninput=refreshRows;
  $$('[data-cat]',body).forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;renderList(priceOnly)});
  bindCommon();
  $$('[data-price]',body).forEach(b=>b.onclick=e=>{e.stopPropagation();editPrice(b.dataset.price)});
  hydratePhotos(body,currentArticles());
}
function findArticle(id){return ((state.inv&&state.inv.articles)||[]).find(a=>String(a.articleId)===String(id))}
function renderDetail(){
  var a=state.article;if(!a)return setView('list');
  header('Détail de l’article','Toutes les informations sur l’article',true);
  var locs=locations();
  body.innerHTML='<div class="cdq-im-detailtop">'+thumbHTML(a,'cdq-im-photo')+'<div class="cdq-im-meta"><h2>'+esc(articleLabel(a))+'</h2><div class="maker">'+esc(maker(a))+'</div><div class="cdq-im-chiprow"><span class="cdq-im-chip">'+esc(a.numero||'Sans #')+'</span><span class="cdq-im-chip">'+esc(cat(a))+'</span>'+(String(a.actif).toUpperCase()==='FALSE'?'':'<span class="cdq-im-chip green">Actif</span>')+'</div><dl><div><dt>Fabricant</dt><dd>'+esc(maker(a))+'</dd></div><div><dt>Modèle</dt><dd>'+esc(a.modele||'—')+'</dd></div><div><dt>Code-barres</dt><dd>'+esc(a.codeBarres||'Non associé')+'</dd></div><div><dt>Disponible vente</dt><dd>'+saleQtyLabelV2624(a)+'</dd></div></dl></div></div>'+
   '<div class="cdq-im-desc"><strong>Description</strong><br>'+esc(a.description||'Aucune description')+'</div>'+
   '<section class="cdq-im-section"><div class="cdq-im-sectionhead"><h3>Stock par emplacement</h3><button data-view="price" data-pricequery="'+esc(a.numero||a.modele||'')+'">Voir dans liste de prix</button></div><div class="cdq-im-card">'+locs.map(l=>'<button class="cdq-im-location" data-transferloc="'+esc(l.emplacementId)+'"><span class="icon">'+locIcon(l.emplacementId)+'</span><span><strong>'+esc(l.emplacementNom)+'</strong><small>'+((lowAt(a,String(l.emplacementId)))?'Stock faible':'Disponible')+'</small></span><span class="count">'+qty(a.articleId,l.emplacementId)+'</span><span class="go">›</span></button>').join('')+'</div></section>'+
   (((state.inv&&state.inv.unites)||[]).filter(function(u){return String(u.articleId)===String(a.articleId)&&unitActive(u)}).length?'<section class="cdq-im-section"><div class="cdq-im-sectionhead"><h3>Unités suivies par numéro de série</h3></div><div class="cdq-im-serial-list">'+unitsFor(a.articleId).map(function(u){return'<div class="cdq-im-serial-row"><span><strong>'+esc(u.numeroSerie||'—')+'</strong><small>'+esc(u.codeBarres?('Code '+u.codeBarres):'Unité sérialisée')+'</small></span><b>'+esc(u.emplacementNom||locName(u.emplacementId))+'</b></div>'}).join('')+'</div></section>':'')+
   (canWrite()?'<div class="cdq-im-detailactions"><button class="cdq-im-action add" data-detailmove="add">＋ Ajouter</button><button class="cdq-im-action transfer" data-detailmove="transfer">⇄ Transférer</button><button class="cdq-im-action remove" data-detailmove="remove">− Retirer</button></div>':'');
  bindCommon();loadPhoto(a,$('[data-photo]',body));
  $$('[data-detailmove]',body).forEach(b=>b.onclick=()=>{if(state.labelInfo&&String(state.labelArticleId||'')===String(a.articleId))state.labelPendingKind=b.dataset.detailmove;else clearInventoryLabelContext();state.article=a;state.preferredLocation='';setView('move',{kind:b.dataset.detailmove,article:a})});
  $$('[data-transferloc]',body).forEach(b=>b.onclick=()=>{state.article=a;setView('move',{kind:'transfer',article:a,location:b.dataset.transferloc})});
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
  var own=defaultOwnLocation(),labelForArticle=!!state.labelInfo&&(!state.labelPendingKind||state.labelPendingKind===kind),labelSerial=labelForArticle?clean(state.labelInfo.serial):'',matchedUnit=labelSerial?unitBySerial(a.articleId,labelSerial):null;
  var loc=state.preferredLocation||(matchedUnit&&matchedUnit.emplacementId)||((kind==='add')?'SHOP':own),from=kind==='transfer'?loc:loc,to=kind==='transfer'?(from==='SHOP'?own:'SHOP'):loc;
  if(to===from){var alt=locations().find(x=>String(x.emplacementId)!==String(from));to=alt?alt.emplacementId:''}
  header(kind==='add'?'Ajouter du stock':kind==='remove'?'Retirer du stock':'Transférer du matériel',kind==='transfer'?'Entre la shop et les camions':'Mouvement d’inventaire',true);
  body.innerHTML='<div class="cdq-im-form"><div class="cdq-im-field"><label>Article</label>'+articlePicker(a.articleId)+'</div>'+
   (kind==='transfer'?'<div class="cdq-im-grid2"><div class="cdq-im-field"><label>De (origine)</label><select id="cdqImFrom">'+locationOptions(from)+'</select></div><div class="cdq-im-field"><label>Vers (destination)</label><select id="cdqImTo">'+locationOptions(to)+'</select></div></div>':'<div class="cdq-im-field"><label>Emplacement</label><select id="cdqImLoc">'+locationOptions(loc)+'</select></div>')+
   '<div class="cdq-im-field"><label>Numéro de série <small>(optionnel pour l’ancien stock)</small></label><input id="cdqImSerial" list="cdqImSerialList" value="'+esc(labelSerial)+'" placeholder="Ex. SN123456"><datalist id="cdqImSerialList"></datalist><small id="cdqImSerialHelp"></small></div>'+
   '<div class="cdq-im-field"><label>Quantité</label><div class="cdq-im-qty"><button id="cdqImMinus" type="button">−</button><input id="cdqImQty" type="number" inputmode="numeric" min="1" value="1"><button id="cdqImPlus" type="button">＋</button></div><small id="cdqImAvailable"></small></div>'+
   (kind==='remove'?'<div class="cdq-im-grid2"><div class="cdq-im-field"><label>Motif</label><select id="cdqImReason"><option>Installé chez client</option><option>Vendu</option><option>Utilisé en réparation</option><option>Défectueux / retour</option><option>Autre</option></select></div><div class="cdq-im-field"><label>Destination / client / travail</label><input id="cdqImDestination" maxlength="140" placeholder="Ex. Kerry — projet 123"></div></div>':'')+
   '<div class="cdq-im-field"><label>Notes (optionnelles)</label><input id="cdqImNote" maxlength="180" placeholder="Ex. : retour de chantier, installation…"></div>'+
   '<button class="cdq-im-primary '+(kind==='add'?'green':kind==='remove'?'red':'')+'" id="cdqImConfirm">'+(kind==='add'?'＋ Ajouter au stock':kind==='remove'?'− Retirer du stock':'⇄ Transférer maintenant')+'</button></div>';
  if(kind==='add'||kind==='remove')installLabelCapture(body,kind,true);
  var artSel=$('#cdqImMoveArticle',body),q=$('#cdqImQty',body),fromEl=$('#cdqImFrom',body),toEl=$('#cdqImTo',body),locEl=$('#cdqImLoc',body),avail=$('#cdqImAvailable',body),serialEl=$('#cdqImSerial',body),serialList=$('#cdqImSerialList',body),serialHelp=$('#cdqImSerialHelp',body),minus=$('#cdqImMinus',body),plus=$('#cdqImPlus',body);
  function origin(){return kind==='transfer'?fromEl.value:locEl.value}
  function syncSerial(){var serial=clean(serialEl.value),u=serial?unitBySerial(a.articleId,serial):null,rows=unitsFor(a.articleId,origin());serialList.innerHTML=rows.map(function(x){return'<option value="'+esc(x.numeroSerie)+'">'+esc(x.emplacementNom||locName(x.emplacementId))+'</option>'}).join('');if(serial){q.value='1';q.disabled=true;minus.disabled=true;plus.disabled=true}else{q.disabled=false;minus.disabled=false;plus.disabled=false}if(kind==='add'&&serial)serialHelp.textContent=u?'Cette série est déjà en stock et ne pourra pas être ajoutée deux fois.':'Nouvelle unité : le prix et la catégorie restent ceux de '+articleLabel(a)+'.';else if(kind!=='add'&&serial)serialHelp.textContent=u?('Unité trouvée à '+(u.emplacementNom||locName(u.emplacementId))+'.'):'Série non encore suivie dans le registre. Le retrait pourra l’ajouter à l’historique.';else serialHelp.textContent=rows.length?(rows.length+' unité(s) sérialisée(s) disponible(s) à cet emplacement.'):'Ancien stock sans numéro de série : le mouvement par quantité reste disponible.'}
  function sync(){a=findArticle(artSel.value)||a;state.article=a;var available=qty(a.articleId,origin());avail.textContent=(kind==='add'?'Stock actuel : ':'Disponible : ')+available;if(kind!=='add')q.max=available||1;syncSerial()}
  artSel.onchange=function(){state.labelArticleId='';serialEl.value='';sync()};if(fromEl)fromEl.onchange=sync;if(locEl)locEl.onchange=sync;serialEl.oninput=syncSerial;serialEl.onchange=function(){var u=unitBySerial(a.articleId,serialEl.value);if(u&&kind!=='add'){var target=kind==='transfer'?fromEl:locEl;if(target&&Array.from(target.options).some(function(o){return String(o.value)===String(u.emplacementId)}))target.value=u.emplacementId}sync()};
  minus.onclick=function(){q.value=Math.max(1,Number(q.value||1)-1)};plus.onclick=function(){q.value=Math.max(1,Number(q.value||1)+1)};sync();
  $('#cdqImConfirm',body).onclick=async function(){var serial=clean(serialEl.value),n=serial?1:Math.max(1,Math.floor(Number(q.value)||1)),note=clean($('#cdqImNote',body).value),payload={kind:kind,articleId:a.articleId,qty:n,note:note,userEmail:email(),serial:serial,unitBarcode:(labelForArticle?clean(state.labelBarcode):'')};if(kind==='transfer'){payload.from=fromEl.value;payload.to=toEl.value;if(payload.from===payload.to)return setStatus('Choisissez deux emplacements différents.','error')}else payload.location=locEl.value;if(kind==='remove'){payload.reason=clean($('#cdqImReason',body).value);payload.destinationDetail=clean($('#cdqImDestination',body).value);var exact=serial?unitBySerial(a.articleId,serial):null;if(serial&&!exact){if(!confirm('Le numéro de série '+serial+' n’était pas encore suivi individuellement. Retirer cette unité de l’ancien stock et conserver ce numéro de série dans l’historique ?'))return;payload.allowLegacySerial=true}if((payload.reason==='Installé chez client'||payload.reason==='Vendu')&&!payload.destinationDetail)return setStatus('Indiquez le client ou la destination avant de retirer cette unité.','error')}if(serial&&!(await requireSerialServer()))return;if(kind!=='add'&&n>qty(a.articleId,kind==='transfer'?payload.from:payload.location))return setStatus('Quantité invalide ou stock insuffisant.','error');setStatus('Enregistrement du mouvement…');$('#cdqImConfirm',body).disabled=true;try{state.inv=await rpc('cdqInventoryMoveV2593',[payload]);setStatus('Inventaire mis à jour.','ok');var id=a.articleId;clearInventoryLabelContext();state.article=findArticle(id);setTimeout(function(){setView('detail',{article:state.article})},350)}catch(e){setStatus(e.message||String(e),'error');$('#cdqImConfirm',body).disabled=false}};
}
async function loadHistory(force){
  if(state.history.length&&!force)return state.history;
  try{state.history=await rpcTry('cdqInventoryHistoryV2593',[160],'obtenirHistoriqueInventaire',[160]);if(!Array.isArray(state.history))state.history=[]}catch(e){state.history=[];setStatus(e.message||String(e),'error')}
  return state.history;
}
function moveKind(r){var t=String(r.type||'').toLowerCase();if(/trans/.test(t))return'transfer';if(/sortie|retrait|retir/.test(t))return'remove';return'add'}
function renderHistoryRows(){
  if(!state.history.length)return '<div class="cdq-im-empty">Aucun mouvement enregistré.</div>';
  return state.history.map(r=>{var k=moveKind(r),ico=k==='transfer'?'⇄':k==='remove'?'−':'＋',dir=k==='transfer'?(clean(r.origineNom)+' → '+clean(r.destinationNom)):k==='remove'?clean(r.origineNom):clean(r.destinationNom),serial=clean(r.numeroSerie),extra=[serial?('Série '+serial):'',r.motif||'',r.destinationDetail||''].filter(Boolean).join(' • ');return '<div class="cdq-im-move '+k+'"><span class="micon">'+ico+'</span><span><strong>'+esc(r.numero||r.description||'Article')+' · '+Math.abs(Number(r.quantite||0))+'</strong><small>'+esc(dir)+'<br>'+esc(r.utilisateur||'')+(extra?'<br>'+esc(extra):'')+'</small></span><span class="time">'+esc(r.date||'')+'</span></div>'}).join('')
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
  header('Scanner','Lecture sécurisée de l’inventaire',true);
  state.scanArticle=null;state.scanUnit=null;state.scanCode='';state.scanDataUrl='';state.scanConfirmed=false;
  body.innerHTML='<div class="cdq-im-scannerbox"><div class="cdq-im-scanpreview" id="cdqImScanPreview"><div class="cdq-im-scanplaceholder"><b>Scanner ou photographier</b>Le scanner rapide lit un code et vous le fait confirmer. Pour identifier une unité par numéro de série, utilisez la photo d’étiquette.</div></div><input type="file" id="cdqImScanGallery" accept="image/*" capture="environment" hidden><div class="cdq-im-scanbuttons"><button id="cdqImScanTake">▥ Scanner un code</button><button id="cdqImScanGalleryBtn">📷 Photo d’étiquette</button></div><div id="cdqImScanResult"></div></div>';
  $('#cdqImScanTake',body).onclick=startLiveBarcodeScanner;
  $('#cdqImScanGalleryBtn',body).onclick=function(){$('#cdqImScanGallery',body).click()};
  $('#cdqImScanGallery',body).onchange=async function(e){
    var file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;
    try{state.scanDataUrl=await compressImage(file,2200,.94);var im=document.createElement('img');im.src=state.scanDataUrl;$('#cdqImScanPreview',body).replaceChildren(im);await analyzeInventoryLabelFile(file,'detail')}
    catch(er){setStatus(er.message||String(er),'error')}
  };
}
function renderScanFound(){
  var box=$('#cdqImScanResult',body);if(!box)return;
  var a=state.scanArticle,unit=state.scanUnit;
  if(!state.scanConfirmed){
    box.innerHTML='<div class="cdq-im-found review"><strong>Code détecté : '+esc(state.scanCode)+'</strong><small>'+esc(a?([articleLabel(a),maker(a),a.modele].filter(Boolean).join(' • ')):'Aucun article associé')+'</small></div><div class="cdq-im-scan-confirm"><button type="button" id="cdqImScanRetry">Reprendre</button><button type="button" id="cdqImScanConfirm">Confirmer ce code</button></div>';
    $('#cdqImScanRetry',box).onclick=function(){state.scanConfirmed=false;state.scanCode='';state.scanArticle=null;state.scanUnit=null;$('#cdqImScanResult',body).innerHTML='';startLiveBarcodeScanner()};
    $('#cdqImScanConfirm',box).onclick=function(){state.scanConfirmed=true;renderScanFound()};
    return;
  }
  if(!a){
    box.innerHTML='<div class="cdq-im-found"><strong>Code confirmé : '+esc(state.scanCode)+'</strong><small>Aucun article associé à ce code.</small></div>'+(canWrite()?'<button class="cdq-im-primary" id="cdqImCreateFromScan">＋ Créer un nouvel article</button>':'');
    var c=$('#cdqImCreateFromScan',body);if(c)c.onclick=function(){setView('create')};return;
  }
  var unitText=unit&&unit.numeroSerie?(' · Série '+unit.numeroSerie):'';
  box.innerHTML='<div class="cdq-im-found"><strong>✓ '+esc(articleLabel(a))+'</strong><small>'+esc(maker(a))+' · # '+esc(a.numero||a.modele||'')+esc(unitText)+' · Stock total '+totalQty(a.articleId)+'</small></div>'+(canWrite()?'<div class="cdq-im-detailactions"><button class="cdq-im-action add" data-scanmove="add">＋ Ajouter</button><button class="cdq-im-action transfer" data-scanmove="transfer">⇄ Transférer</button><button class="cdq-im-action remove" data-scanmove="remove">− Retirer</button></div>':'');
  $$('[data-scanmove]',body).forEach(function(b){b.onclick=function(){
    state.article=a;
    if(b.dataset.scanmove==='remove'&&unit){
      clearInventoryLabelContext();state.labelPendingKind='remove';state.preferredLocation=unit.emplacementId||'';state.labelInfo={text:'',barcode:state.scanCode,serial:unit.numeroSerie||'',model:a.modele||'',partNumber:a.numero||'',title:a.description||'',fabricant:a.fabricant||'',categorie:a.categorie||''};state.labelBarcode=state.scanCode;state.labelArticleId=String(a.articleId);
      setStatus('Pour sécuriser le retrait, prenez une photo nette de l’étiquette afin de confirmer la série et le modèle.','error');
      installLabelCapture(body,'remove',true);setTimeout(function(){var take=$('[data-label-take]',body);if(take)take.click()},80);return;
    }
    if(unit){state.labelInfo={text:'',barcode:state.scanCode,serial:unit.numeroSerie||'',model:a.modele||'',partNumber:a.numero||'',title:a.description||'',fabricant:a.fabricant||'',categorie:a.categorie||''};state.labelBarcode=state.scanCode;state.labelArticleId=String(a.articleId);state.labelPendingKind=b.dataset.scanmove}else clearInventoryLabelContext();
    setView('move',{kind:b.dataset.scanmove,article:a});
  }});
}
function nativeBarcodeBridge(){
  try{return window.BalanceCDQNative||(window.parent&&window.parent.BalanceCDQNative)||null}catch(_){return window.BalanceCDQNative||null}
}
function beginBarcodeRequest(label){
  var id='invscan-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  window.__cdqInvBarcodeReqV2592=id;state.scanBusy=true;setStatus(label||'Lecture du code…');
  return id;
}
function startLiveBarcodeScanner(){
  if(state.scanBusy)return;
  var bridge=nativeBarcodeBridge();
  if(!bridge||typeof bridge.scanInventoryBarcode!=='function'){
    setStatus('Le scanner en direct nécessite la version Android 26.06. Vous pouvez encore lire une photo.','error');
    return;
  }
  var id=beginBarcodeRequest('Scanner actif — placez le code dans le cadre…');
  try{bridge.scanInventoryBarcode(id)}catch(e){state.scanBusy=false;window.__cdqInvBarcodeReqV2592='';setStatus(e.message||String(e),'error')}
}
function scanBarcodePhoto(){
  if(state.scanBusy)return;
  var bridge=nativeBarcodeBridge();
  if(!bridge||typeof bridge.recognizeInventoryBarcode!=='function'){setStatus('Lecture de photo indisponible sur cet appareil.','error');return}
  var id=beginBarcodeRequest('Lecture de la photo…');
  try{bridge.recognizeInventoryBarcode(id,state.scanDataUrl)}catch(e){state.scanBusy=false;window.__cdqInvBarcodeReqV2592='';setStatus(e.message||String(e),'error')}
}
window.cdqNativeInventoryBarcodeV2592=function(id,ok,value,message){
  if(String(id)===String(window.__cdqInvLabelBarcodeReqV2616||'')){
    window.__cdqInvLabelBarcodeReqV2616='';var txt=String(window.__cdqInvLabelBarcodeTextV2616||'');window.__cdqInvLabelBarcodeTextV2616='';state.labelBusy=false;applyInventoryLabelResult(txt,ok&&value?value:'',state.labelPendingKind);return;
  }
  if(String(id)!==String(window.__cdqInvBarcodeReqV2592||''))return;
  window.__cdqInvBarcodeReqV2592='';state.scanBusy=false;
  if(!ok||!value){
    var detail=String(message||'');if(/annul/i.test(detail)){setStatus('Scan annulé.','');return}
    setStatus(detail||'Aucun code lisible détecté.','error');return;
  }
  state.scanConfirmed=false;state.scanCode=clean(value);var code=state.scanCode.toLowerCase();
  state.scanUnit=unitByBarcode(state.scanCode);
  state.scanArticle=state.scanUnit?findArticle(state.scanUnit.articleId):(((state.inv&&state.inv.articles)||[]).find(function(a){return[a.codeBarres,a.numero,a.modele].some(function(v){return clean(v).toLowerCase()===code})})||null);
  setStatus('Code détecté : '+state.scanCode+(state.scanUnit&&state.scanUnit.numeroSerie?' · série '+state.scanUnit.numeroSerie:''),'ok');renderScanFound();
};
function renderCreate(){
  header('Nouvel article','Création manuelle ou depuis un scan / une photo',true);
  var info=state.labelInfo||{},c=state.scanCode||(!info.serial?info.barcode:'')||'',loc=defaultOwnLocation(),suggestModel=info.model||info.partNumber||'',suggestNum=info.partNumber||info.model||'',suggestDesc=info.title||'',suggestMaker=info.fabricant||'';
  body.innerHTML='<div class="cdq-im-form">'+(state.labelInfo?labelSummaryHtml(state.labelInfo,null):'')+'<div class="cdq-im-grid2"><div class="cdq-im-field"><label>Numéro / référence</label><input id="cdqImNewNum" value="'+esc(suggestNum)+'" placeholder="Ex. IND-680"></div><div class="cdq-im-field"><label>Code-barres</label><input id="cdqImNewCode" value="'+esc(c)+'" placeholder="Optionnel"></div></div><div class="cdq-im-field"><label>Description</label><input id="cdqImNewDesc" value="'+esc(suggestDesc)+'" placeholder="Ex. Indicateur Rice Lake 680"></div><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Catégorie</label><select id="cdqImNewCat"><option>Indicateurs</option><option>Balances</option><option>Cartes de sommation</option><option>Loadcells</option><option>Câbles</option><option>Connecteurs</option><option>Cartes mères</option><option>Keyboards</option><option>Accessoires</option><option>Autres</option></select></div><div class="cdq-im-field"><label>Fabricant</label><input id="cdqImNewMaker" value="'+esc(suggestMaker)+'" placeholder="Rice Lake, Mettler Toledo…"></div></div><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Modèle</label><input id="cdqImNewModel" value="'+esc(suggestModel)+'" placeholder="680, IND570…"></div><div class="cdq-im-field"><label>Numéro de série</label><input id="cdqImNewSerial" value="'+esc(info.serial||'')+'" placeholder="Optionnel"></div></div><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Photo</label><input id="cdqImNewPhoto" type="file" accept="image/*"></div><div class="cdq-im-field"><label>Prix client</label><input id="cdqImNewPrice" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00"></div></div><div class="cdq-im-grid2"><div class="cdq-im-field"><label>Emplacement initial</label><select id="cdqImNewLoc">'+locationOptions(loc)+'</select></div><div class="cdq-im-field"><label>Quantité initiale</label><input id="cdqImNewQty" type="number" inputmode="numeric" min="0" value="'+(info.serial?'1':'0')+'"></div></div><button class="cdq-im-primary green" id="cdqImCreate">＋ Créer l’article</button></div>';if(state.labelInfo){var catEl=$('#cdqImNewCat',body);if(Array.from(catEl.options).some(function(o){return o.value===info.categorie}))catEl.value=info.categorie}
  $('#cdqImCreate',body).onclick=async()=>{var serial=clean($('#cdqImNewSerial',body).value),payload={numero:clean($('#cdqImNewNum',body).value),description:clean($('#cdqImNewDesc',body).value),categorie:$('#cdqImNewCat',body).value,fabricant:clean($('#cdqImNewMaker',body).value)||'Divers',modele:clean($('#cdqImNewModel',body).value),codeBarres:clean($('#cdqImNewCode',body).value),prixClient:Number($('#cdqImNewPrice',body).value||0),location:$('#cdqImNewLoc',body).value,qty:Math.max(0,Math.floor(Number($('#cdqImNewQty',body).value)||0)),serial:serial,unitBarcode:clean(state.labelBarcode),userEmail:email()};if(serial)payload.qty=1;if(!payload.numero||!payload.description)return setStatus('Numéro et description requis.','error');if(serial&&!(await requireSerialServer()))return;$('#cdqImCreate',body).disabled=true;setStatus('Création de l’article…');try{var r=await rpc('cdqInventoryCreateV2593',[payload]);state.inv=r.inventory||await load(true);var a=findArticle(r.articleId);var f=$('#cdqImNewPhoto',body).files&&$('#cdqImNewPhoto',body).files[0];if(f&&a){setStatus('Enregistrement de la photo…');var data=await compressImage(f,1200,.86);await rpc('cdqInventorySavePhotoV2593',[a.articleId,data]);state.inv=await rpc('cdqInventoryGetV2593',[]);a=findArticle(r.articleId)}setStatus('Article créé.','ok');state.scanCode='';clearInventoryLabelContext();setTimeout(()=>setView('detail',{article:a}),400)}catch(e){setStatus(e.message||String(e),'error');$('#cdqImCreate',body).disabled=false}};
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
  page.innerHTML='<div class="cdq-im-shell"><header class="cdq-im-top"><div class="cdq-im-head"><button class="cdq-im-back" id="cdqImBack" type="button" aria-label="Retour"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5 M11 6l-6 6 6 6"/></svg></button><div class="cdq-im-title"><strong id="cdqImTitle">Inventaire</strong><small id="cdqImSub">Accueil rapide</small></div><button class="cdq-im-close" id="cdqImClose" type="button" aria-label="Fermer l’inventaire"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12 M18 6L6 18"/></svg></button></div></header><main class="cdq-im-body" id="cdqImBody"></main><div class="cdq-im-status" id="cdqImStatus"></div></div>';
  document.body.append(page);body=$('#cdqImBody',page);titleEl=$('#cdqImTitle',page);subEl=$('#cdqImSub',page);backBtn=$('#cdqImBack',page);statusEl=$('#cdqImStatus',page);backBtn.onclick=back;$('#cdqImClose',page).onclick=close;position();return page
}
function position(){if(!page||page.hidden)return;var h=$('#appHeader'),n=$('.bottom-nav'),top=Math.max(0,Math.round(h?.getBoundingClientRect().bottom||0),Math.round(document.documentElement.matches('.android,.ios,.mobile-device')?($('.company-wrapper')?.getBoundingClientRect().bottom||0)+8:0)),bottom=Math.max(0,Math.round(innerHeight-(n?.getBoundingClientRect().top||innerHeight)));page.style.top=top+'px';page.style.bottom=bottom+'px'}
function open(){photoCache.clear();clearInventoryLabelContext();state.serialServerReady=null;if(typeof cdqAccessState!=='undefined'&&cdqAccessState!=='ready'){if(typeof afficherMessage==='function')afficherMessage('Connectez-vous avant d’ouvrir Inventaire.',false);return}ensurePage();state.view='home';state.query='';state.category='Tous';state.locationFilter='';page.hidden=false;document.documentElement.classList.add('cdq-inventory-modern-open-v2592');position();load(true).then(render).catch(()=>render())}
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
