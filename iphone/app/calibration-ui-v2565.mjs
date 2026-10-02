import {calibrationIcon} from './calibration-icon-v2566.mjs';
import {calibrationIdentity,calibrationRpc,revisionOf,queueFeedback,flushFeedback,pendingFeedback} from './calibration-feedback-v2566.mjs';
import {devices,forFile,categories,manufacturers,findCalibration} from './calibration-db-v2565.mjs';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dialog=null,state={view:'root',category:'',manufacturer:'',device:null,returnView:null},scheduled=false;

function currentTheme(){
  try{
    const email=String(typeof utilisateurCourantEmail!=='undefined'?utilisateurCourantEmail:'').trim().toLowerCase();
    return JSON.parse(localStorage.getItem('cdqIconThemeV2514:'+email)||'null')?.style||'current';
  }catch(_){return 'current';}
}
function indicatorSvg(size=28){return calibrationIcon(currentTheme(),size);}
function installStyles(){
  if($('#cdqCalibrationStyleV2565'))return;
  const s=document.createElement('style');s.id='cdqCalibrationStyleV2565';
  s.textContent=[
  '.cdq-calibration-nav-item>span{display:inline-flex!important;align-items:center;justify-content:center}',
  'nav[data-cdq-sliding-nav]{overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}nav[data-cdq-sliding-nav]::-webkit-scrollbar{display:none}',
  '.cdq-calibration-indicator{display:block;filter:drop-shadow(0 1px 2px #0009);color:#63e9d6}body .bottom-nav .cdq-calibration-nav-item>span{background:none!important;filter:none!important}body .bottom-nav .cdq-calibration-nav-item>span::after{display:none!important}body .bottom-nav .cdq-calibration-nav-item>span>.cdq-calibration-indicator{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;object-fit:contain}body .bottom-nav .cdq-calibration-nav-item>small{color:#64e8d4!important;text-shadow:0 0 9px #27cdbd99!important}body .bottom-nav .cdq-calibration-nav-item[data-cal-theme="minimal"]>small{color:#b7f6ec!important;text-shadow:none!important}body .bottom-nav .cdq-calibration-nav-item[data-cal-theme="metal-music"]>small{color:#64f3d7!important;text-shadow:0 0 8px #11ac8c!important}.cdq-calibration-indicator[data-theme="metal-music"]{filter:drop-shadow(0 0 2px #75b8ac)}',
  '.cdq-cal-feedback button,.cdq-cal-admin button{padding:11px;border:1px solid #467488;border-radius:10px;background:#173c4a;color:white;font-weight:700;margin:6px 6px 6px 0}.cdq-cal-feedback textarea,.cdq-cal-admin textarea{box-sizing:border-box;display:block;width:100%;min-height:85px;background:#0a1923;border:1px solid #4a7183;border-radius:8px;color:white;padding:10px;font:inherit}.cdq-cal-feedback button:disabled{opacity:.5}.cdq-cal-status{line-height:1.45;color:#bddee9}.cdq-cal-alert-count{background:#a83537;color:#fff;border-radius:12px;padding:2px 6px}.cdq-cal-notice{position:fixed;bottom:110px;left:12px;right:12px;z-index:2147483000;padding:16px;background:#442629;color:white;border:1px solid #ff9292;border-radius:14px;box-shadow:0 4px 30px #000b}.cdq-cal-notice button{padding:8px;margin:7px;border-radius:8px}.cdq-cal-admin article{border-top:1px solid #416372;padding:12px 0}',
  '#cdqCalibrationDialogV2565{inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;border:0;padding:0;background:#08131d;color:#eef7fc;font-family:Arial,Helvetica,sans-serif}#cdqCalibrationDialogV2565::backdrop{background:#000b}',
  '.cdq-cal-shell{min-height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#07131d,#0c2232)}.cdq-cal-head{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;background:#0b1d2aee;border-bottom:1px solid #28485d}.cdq-cal-head h2{margin:0;font-size:20px;flex:1}.cdq-cal-head button{border:1px solid #47687b;background:#173347;color:#fff;border-radius:10px;padding:9px 12px;font-weight:700}',
  '.cdq-cal-body{width:min(900px,100%);margin:0 auto;padding:14px 14px calc(30px + env(safe-area-inset-bottom));box-sizing:border-box}.cdq-cal-search{width:100%;box-sizing:border-box;border:1px solid #496b7d;border-radius:12px;background:#102736;color:#fff;padding:12px 14px;font-size:16px;margin-bottom:14px}.cdq-cal-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:11px}',
  '.cdq-cal-card,.cdq-cal-model{width:100%;text-align:left;border:1px solid #315b74;border-radius:14px;background:#102b3d;color:#fff;padding:14px;min-height:78px}.cdq-cal-card strong,.cdq-cal-model strong{display:block;font-size:17px}.cdq-cal-card small,.cdq-cal-model small{display:block;color:#afd0e2;margin-top:5px}.cdq-cal-model .verified{color:#8ef0b8}.cdq-cal-model .pending{color:#ffd18d}',
  '.cdq-cal-section{margin-top:16px;border:1px solid #284a60;border-radius:15px;background:#0d2332;padding:14px}.cdq-cal-section h3{margin:0 0 10px;font-size:18px}.cdq-cal-intro{line-height:1.45;color:#d9eaf3}.cdq-cal-steps{display:grid;gap:11px}.cdq-cal-step{display:grid;grid-template-columns:38px 1fr;gap:10px;border-top:1px solid #284a60;padding-top:12px}.cdq-cal-step:first-child{border-top:0;padding-top:0}.cdq-cal-num{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#0b7ca9;color:#fff;font-weight:800}.cdq-cal-step h4{margin:0 0 4px;font-size:16px}.cdq-cal-step p{margin:0;line-height:1.45;color:#d8e7ee}',
  '.cdq-cal-visual{margin-top:9px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cdq-cal-display{font:700 16px monospace;letter-spacing:1px;background:#07190f;color:#a5ffd0;border:1px solid #4b9870;border-radius:7px;padding:7px 10px}.cdq-cal-key{font:700 12px Arial;border:1px solid #728997;border-radius:7px;background:#d8e1e6;color:#10212b;padding:6px 8px}',
  '.cdq-cal-param{display:grid;grid-template-columns:minmax(120px,1fr) minmax(120px,1.2fr);gap:5px 10px;padding:10px 0;border-top:1px solid #25475c}.cdq-cal-param:first-of-type{border-top:0}.cdq-cal-param b{color:#fff}.cdq-cal-param code{color:#98e7ff;white-space:normal}.cdq-cal-param small{grid-column:1/-1;color:#bdd3de;line-height:1.35}',
  '.cdq-cal-badge{display:inline-block;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:800;margin:0 5px 8px 0}.cdq-cal-badge.ok{background:#124b34;color:#a8ffd0}.cdq-cal-badge.wait{background:#5c4215;color:#ffe0a3}.cdq-cal-warning{border:1px solid #7e612a;background:#3b2c12;color:#ffe2a9;border-radius:12px;padding:12px;line-height:1.45}.cdq-cal-source{display:inline-block;color:#9fe8ff;margin-top:10px}',
  '.cdq-cal-row-button{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:38px;height:38px;padding:4px;margin-left:5px;border:1px solid #3e687e;border-radius:10px;background:#102b3d;color:#c6eaff;z-index:3}.cdq-cal-row-button .cdq-calibration-indicator{width:25px;height:25px}',
  '@media(max-width:600px){.cdq-cal-body{padding-left:10px;padding-right:10px}.cdq-cal-grid{grid-template-columns:1fr 1fr}.cdq-cal-param{grid-template-columns:1fr}.cdq-cal-param small{grid-column:auto}}'
  ].join('');
  document.head.append(s);
}
const setImportant=(el,key,value)=>{const probe=document.createElement('span').style;probe.setProperty(key,value,'important');const normalized=probe.getPropertyValue(key);if(el.style.getPropertyValue(key)!==normalized||el.style.getPropertyPriority(key)!=='important')el.style.setProperty(key,normalized,'important');};
function ensureNav(){
  const nav=$('.bottom-nav');if(!nav)return;
  const selectedTheme=currentTheme();
  let b=$('.cdq-calibration-nav-item',nav);
  if(!b){
    b=document.createElement('button');b.type='button';b.className='bottom-nav-item cdq-calibration-nav-item';b.setAttribute('aria-label','Calibration');
    b.dataset.calTheme=selectedTheme;
    b.innerHTML='<span>'+indicatorSvg(28)+'</span><small>Calibration</small>';b.onclick=e=>{e.preventDefault();e.stopPropagation();openLibrary();};
    const home=Array.from(nav.querySelectorAll('.bottom-nav-item')).find(x=>$('small',x)?.textContent.trim()==='Accueil');if(home)home.after(b);else nav.append(b);
  }else if(b.dataset.calTheme!==selectedTheme){
    const host=$(':scope > span',b);if(host)host.innerHTML=indicatorSvg(28);
    b.dataset.calTheme=selectedTheme;
  }
  const label=$('small',b),color='var(--cdq-nav-accent)' ;
  if(label){setImportant(label,'color',color);setImportant(label,'-webkit-text-fill-color',color);setImportant(label,'text-shadow',selectedTheme==='minimal'?'none':'0 0 8px #11ac8c');}
  // Keep all destinations available in clients as well as on the home screen.
  b.hidden=false;
  const order=['Accueil','Dossier','Favoris','Rapport','Calibration','Calcul','Inventaire','Factures','Opportunités','Drive général','Corbeille'];
  const items=$$(':scope > .bottom-nav-item',nav);
  const sorted=items.slice().sort((a,b)=>order.indexOf($('small',a)?.textContent.trim())-order.indexOf($('small',b)?.textContent.trim()));
  // Move only newly inserted/out-of-order buttons. Never rebuild the rail or
  // write scrollLeft during layout, company changes, theme refreshes or swipes.
  sorted.forEach((item,index)=>{if(nav.children[index]!==item)nav.insertBefore(item,nav.children[index]||null);});

}
function ensureDialog(){if(dialog?.isConnected)return dialog;dialog=document.createElement('dialog');dialog.id='cdqCalibrationDialogV2565';document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});return dialog;}
function header(title,back){return '<header class="cdq-cal-head">'+(back?'<button type="button" data-cal-back aria-label="Retour">←</button>':'')+indicatorSvg(31)+'<h2>'+esc(title)+'</h2><button type="button" data-cal-close aria-label="Fermer">✕</button></header>';}
function shell(title,body,back){const d=ensureDialog();d.innerHTML='<div class="cdq-cal-shell">'+header(title,back)+'<main class="cdq-cal-body">'+body+'</main></div>'; $('[data-cal-close]',d).onclick=()=>d.close();const b=$('[data-cal-back]',d);if(b)b.onclick=goBack;if(!d.open)d.show();window.cdqWorkspaceV2638?.navigate('calibration',{adopt:true});}
function goBack(){
  if(state.view==='device'){if(state.returnView){const r=state.returnView;state.returnView=null;return setView(r);}if(state.manufacturer)return showManufacturer(state.category,state.manufacturer);if(state.category)return showCategory(state.category);return showRoot();}
  if(state.view==='manufacturer')return showCategory(state.category);if(state.view==='category')return showRoot();showRoot();
}
function setView(r){if(r.view==='alerts')return showAlerts();if(r.view==='manufacturer')return showManufacturer(r.category,r.manufacturer);if(r.view==='category')return showCategory(r.category);return showRoot();}
function rootCards(){return categories().map(c=>'<button class="cdq-cal-card" data-cat="'+esc(c.id)+'"><strong>'+esc(c.label)+'</strong><small>'+c.count+' modèle'+(c.count>1?'s':'')+' inventorié'+(c.count>1?'s':'')+'</small></button>').join('');}
function showRoot(){
  state={view:'root',category:'',manufacturer:'',device:null,returnView:null};shell('Calibration','<input class="cdq-cal-search" type="search" placeholder="Rechercher un fabricant ou un modèle…" aria-label="Rechercher une calibration"><div class="cdq-cal-grid" data-cal-results>'+rootCards()+'</div>',false);
  bindRoot();addAdminButton();$('.cdq-cal-search',dialog).oninput=e=>renderSearch(e.target.value);
}
function bindRoot(){$$('[data-cat]',dialog).forEach(b=>b.onclick=()=>showCategory(b.dataset.cat));}
function renderSearch(value){
  const q=String(value||'').trim().toLocaleLowerCase('fr'),box=$('[data-cal-results]',dialog);
  if(!q){box.innerHTML=rootCards();bindRoot();return;}
  const matches=devices.filter(d=>(d.manufacturer+' '+d.model+' '+(d.aliases||[]).join(' ')).toLocaleLowerCase('fr').includes(q));
  box.innerHTML=matches.length?matches.map(modelButton).join(''):'<p>Aucun modèle trouvé.</p>';
  $$('[data-device-key]',box).forEach(b=>b.onclick=()=>openDevice(devices.find(d=>d.key===b.dataset.deviceKey),{view:'root'}));
}
function showCategory(category){
  state={view:'category',category,manufacturer:'',device:null,returnView:null};const label=categories().find(c=>c.id===category)?.label||'Calibration';
  const cards=manufacturers(category).map(m=>{const count=devices.filter(d=>d.category===category&&d.manufacturer===m).length;return '<button class="cdq-cal-card" data-mfr="'+esc(m)+'"><strong>'+esc(m)+'</strong><small>'+count+' modèle'+(count>1?'s':'')+'</small></button>';}).join('');
  shell(label,'<div class="cdq-cal-grid">'+cards+'</div>',true);$$('[data-mfr]',dialog).forEach(b=>b.onclick=()=>showManufacturer(category,b.dataset.mfr));
}
function modelButton(d){return '<button class="cdq-cal-model" data-device-key="'+esc(d.key)+'"><strong>'+esc(d.model)+'</strong><small>'+esc(d.manufacturer)+'</small><small class="'+(d.verified?'verified':'pending')+'">'+(d.verified?'✓ Vérifiée dans le manuel':(d.review?.label||'Manuel à vérifier'))+'</small></button>';}
function showManufacturer(category,manufacturer){
  state={view:'manufacturer',category,manufacturer,device:null,returnView:null};const list=devices.filter(d=>d.category===category&&d.manufacturer===manufacturer).sort((a,b)=>a.model.localeCompare(b.model,'fr',{numeric:true}));
  shell(manufacturer,'<div class="cdq-cal-grid">'+list.map(modelButton).join('')+'</div>',true);$$('[data-device-key]',dialog).forEach(b=>b.onclick=()=>openDevice(list.find(d=>d.key===b.dataset.deviceKey)));
}
function stepHtml(step,index){
  const visual=(step.display||step.keys?.length)?'<div class="cdq-cal-visual">'+(step.display?'<span class="cdq-cal-display">'+esc(step.display)+'</span>':'')+(step.keys||[]).map(k=>'<span class="cdq-cal-key">'+esc(k)+'</span>').join('')+'</div>':'';
  return '<article class="cdq-cal-step"><span class="cdq-cal-num">'+(index+1)+'</span><div><h4>'+esc(step.title)+'</h4><p>'+esc(step.text)+'</p>'+visual+'</div></article>';
}
function openDevice(device,returnView=null){
  if(!device)return;state={view:'device',category:device.category,manufacturer:device.manufacturer,device,returnView:returnView||null};
  let body='<span class="cdq-cal-badge '+(device.verified?'ok':'wait')+'">'+(device.verified?'Vérifiée dans le manuel':'Modèle inventorié')+'</span><span class="cdq-cal-badge '+(device.category==='indicator'?'ok':'wait')+'">'+(device.category==='indicator'?'Indicateur':'Balance de table')+'</span>';
  if(device.verified&&device.method){
    const m=device.method;body+='<p class="cdq-cal-status">Document vérifié le '+esc(m.checkedAt||'2026-09-27')+' · Fiche '+esc(revisionOf(device))+'</p>';body+='<section class="cdq-cal-section"><h3>Méthode de calibration</h3><p class="cdq-cal-intro">'+esc(m.intro)+'</p><div class="cdq-cal-steps">'+m.steps.map(stepHtml).join('')+'</div></section>';
    if(m.parameters?.length)body+='<section class="cdq-cal-section"><h3>Réglages à connaître</h3>'+m.parameters.map(p=>'<div class="cdq-cal-param"><b>'+esc(p.name)+'</b><code>'+esc(p.menu)+'</code><small>'+esc(p.notes)+'</small></div>').join('')+'</section>';
    if(m.source)body+='<section class="cdq-cal-section"><h3>Source technique</h3><a class="cdq-cal-source" href="'+esc(m.source.url)+'" target="_blank" rel="noopener">'+esc(m.source.label)+'</a></section>';
  }else body+='<section class="cdq-cal-section"><h3>Méthode de calibration</h3><div class="cdq-cal-warning">Ce modèle a été détecté dans les dossiers clients, mais sa procédure détaillée n’est pas encore validée dans la bibliothèque. Consulte le point à préciser ci-dessous avant de choisir une procédure.</div></section>';
  if(device.review)body+='<section class="cdq-cal-section"><h3>'+esc(device.review.label)+'</h3><p>'+esc(device.review.reason)+'</p>'+(device.review.url?'<a class="cdq-cal-source" target="_blank" rel="noopener" href="'+esc(device.review.url)+'">Documentation du fabricant</a>':'')+'</section>';
  body+='<section class="cdq-cal-section cdq-cal-feedback" data-cal-feedback></section>';
  shell(device.manufacturer+' '+device.model,body,true);bindFeedback(device);
}
function decorateRows(){
  for(const row of $$('.file-row[data-file-id],.cdq23-drive-row[data-file-id],tr[data-file-id]')){
    if($('.cdq-cal-row-button',row))continue;const device=forFile(row.dataset.fileId);if(!device)continue;
    const b=document.createElement('button');b.type='button';b.className='cdq-cal-row-button';b.title='Méthode de calibration — '+device.manufacturer+' '+device.model;b.setAttribute('aria-label',b.title);b.innerHTML=indicatorSvg(25);
    b.onclick=e=>{e.preventDefault();e.stopPropagation();openDevice(device,{view:'root'});};row.append(b);
  }
}
let feedbackOwner='',alerts=[],seenAlerts=new Set(),polling=false;
function syncIdentity(){
  const owner=calibrationIdentity().email;if(owner===feedbackOwner)return;
  feedbackOwner=owner;alerts=[];seenAlerts=new Set();$('.cdq-cal-notice')?.remove();
  if(dialog?.open)dialog.close();if(owner)syncFeedback();
}
function bindFeedback(device){
  const box=$('[data-cal-feedback]',dialog),owner=calibrationIdentity().email;
  const editable=['admin','technicien'].includes(calibrationIdentity().role);
  box.innerHTML='<h3>Retour du technicien</h3><p class="cdq-cal-status" data-cal-summary>Vérification des retours…</p>'+
    (editable?'<label>Commentaire <span>(obligatoire pour un problème)</span><textarea maxlength="1600" data-cal-comment placeholder="Étape bloquée, message affiché, version de l’appareil…"></textarea></label><button data-cal-worked '+(!device.method?'disabled':'')+'>✓ Méthode fonctionnelle</button><button data-cal-problem>Signaler un problème</button><button data-cal-retry>Renvoyer les retours en attente</button>':'<p>Connecte-toi avec un compte technicien pour transmettre un retour.</p>')+'<p role="status" aria-live="polite" data-cal-send-status></p>';
  const valid=()=>box.isConnected&&calibrationIdentity().email===owner;
  const summary=()=>calibrationRpc('cdqObtenirRetoursCalibrationV2566',device.key,revisionOf(device)).then(r=>{
    if(!valid())return;if(r?.ok!==true)throw Error('Service à activer');
    $('[data-cal-summary]',box).textContent=(r.openProblems?r.openProblems+' problème(s) à corriger. ':'')+r.confirmations+' technicien(s) ont confirmé cette version sur place.';
    $('[data-cal-summary]',box).classList.toggle('cdq-cal-warning',r.openProblems>0);
  }).catch(()=>{if(valid())$('[data-cal-summary]',box).textContent='Retours partagés indisponibles. Aucune confirmation sur place ne peut être affichée.';});
  const status=$('[data-cal-send-status]',box),waiting=pendingFeedback(owner).filter(x=>x.deviceKey===device.key).length;
  if(waiting)status.textContent=waiting+' retour(s) enregistré(s) sur cet appareil, en attente d’envoi.';
  async function send(kind){
    if(!valid())return;
    const buttons=$$('button',box);buttons.forEach(b=>b.disabled=true);
    try{
      if(kind)queueFeedback(device,kind,$('[data-cal-comment]',box).value);
      status.textContent='Retour conservé sur cet appareil. Envoi en cours…';
      const r=await flushFeedback();if(!valid())return;
      status.textContent=r.pending?'En attente de connexion. L’administrateur n’a pas encore reçu ce retour.':'Retour reçu par le serveur. '+(kind==='problem'?'L’alerte est disponible pour l’administrateur.':'');
      if(!r.pending){$('[data-cal-comment]',box).value='';await summary();syncFeedback();}
    }catch(e){if(valid())status.textContent='Non envoyé. '+(e?.message||String(e));}
    finally{if(valid()){buttons.forEach(b=>b.disabled=false);$('[data-cal-worked]',box).disabled=!device.method;}}
  }
  if(editable){$('[data-cal-worked]',box).onclick=()=>send('worked');$('[data-cal-problem]',box).onclick=()=>send('problem');$('[data-cal-retry]',box).onclick=()=>send();}summary();
}
function addAdminButton(){
  if(calibrationIdentity().role!=='admin'||state.view!=='root')return;
  let b=$('[data-cal-admin]',dialog);if(!b){b=document.createElement('button');b.type='button';b.dataset.calAdmin='';b.className='cdq-cal-card';$('.cdq-cal-body',dialog).prepend(b);b.onclick=showAlerts;}
  b.textContent='Signalements à corriger'+(alerts.length?' ('+alerts.length+')':'');
}
async function showAlerts(){
  if(calibrationIdentity().role!=='admin')return;const owner=calibrationIdentity().email;
  state={view:'alerts'};shell('Signalements de calibration','<section class="cdq-cal-admin"><p role="status">Chargement…</p></section>',true);
  const box=$('.cdq-cal-admin',dialog),valid=()=>box.isConnected&&calibrationIdentity().email===owner&&calibrationIdentity().role==='admin';
  try{
    const r=await calibrationRpc('cdqListerAlertesCalibrationV2566');if(!valid())return;if(r?.ok!==true)throw Error('Le service de retours partagés doit être activé sur le serveur.');alerts=r.alerts;
    box.innerHTML=alerts.length?alerts.map(a=>{const d=devices.find(x=>x.key===a.deviceKey);return '<article data-alert="'+esc(a.id)+'"><h3>'+esc(d?d.manufacturer+' '+d.model:a.deviceKey)+'</h3><p>'+esc(a.comment)+'</p><p>'+esc(a.email)+' · '+esc(a.at)+' · '+esc(a.revision)+'</p><button data-open-method="'+esc(a.deviceKey)+'">Ouvrir la fiche</button><label>Correction ou conclusion<textarea maxlength="1600" placeholder="Précise la correction apportée ou la conclusion de la vérification."></textarea></label><button data-resolve>Marquer traité</button><p role="status"></p></article>';}).join(''):'<p>Aucun signalement à corriger.</p>';
    $$('[data-open-method]',box).forEach(b=>b.onclick=()=>openDevice(devices.find(d=>d.key===b.dataset.openMethod),{view:'alerts'}));
    $$('[data-resolve]',box).forEach(b=>b.onclick=async()=>{const article=b.closest('article'),status=$('[role="status"]',article);b.disabled=true;try{const result=await calibrationRpc('cdqResoudreAlerteCalibrationV2566',article.dataset.alert,$('textarea',article).value);if(!valid())return;if(result?.ok!==true)throw Error('La fermeture n’a pas été confirmée.');await showAlerts();}catch(e){if(valid())status.textContent=e.message;}finally{b.disabled=false;}});
  }catch(e){if(valid())box.textContent=e.message;}
}
async function syncFeedback(){
  if(polling||!calibrationIdentity().email||navigator.onLine===false)return;
  const owner=calibrationIdentity().email;polling=true;
  try{
    await flushFeedback().catch(()=>{});if(calibrationIdentity().email!==owner||calibrationIdentity().role!=='admin')return;
    const r=await calibrationRpc('cdqListerAlertesCalibrationV2566');if(calibrationIdentity().email!==owner||calibrationIdentity().role!=='admin'||r?.ok!==true)return;alerts=r.alerts;addAdminButton();
    const unseen=alerts.filter(a=>!seenAlerts.has(a.id));if(!unseen.length)return;unseen.forEach(a=>seenAlerts.add(a.id));
    $('.cdq-cal-notice')?.remove();const box=document.createElement('aside');box.className='cdq-cal-notice';box.setAttribute('role','alert');
    box.innerHTML='<strong>'+alerts.length+' signalement(s) de calibration à corriger</strong><p>Un technicien a signalé un problème avec une méthode.</p><button data-view>Voir les signalements</button><button data-dismiss>Plus tard</button>';document.body.append(box);
    $('[data-view]',box).onclick=()=>{box.remove();showAlerts();};$('[data-dismiss]',box).onclick=()=>box.remove();
  }catch(_){}finally{polling=false;}
}
function sync(){installStyles();ensureNav();decorateRows();syncIdentity();}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync();});}
function openLibrary(options={}){if(options.device)return openDevice(options.device,{view:'root'});if(options.manufacturer&&options.category)return showManufacturer(options.category,options.manufacturer);if(options.category)return showCategory(options.category);showRoot();}
function openFor(manufacturer,model){const d=findCalibration(manufacturer,model);if(d)openDevice(d,{view:'root'});else openLibrary();return d;}
function start(){
  installStyles();sync();new MutationObserver(r=>{if(r.some(x=>x.addedNodes.length||x.removedNodes.length))schedule();}).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('cdq:icons-changed',schedule);
  window.addEventListener('online',()=>syncFeedback());window.addEventListener('focus',()=>syncFeedback());setInterval(()=>{if(!document.hidden)syncFeedback();},120000);
  window.addEventListener('resize',schedule,{passive:true});window.addEventListener('cdq:access-ready',schedule);document.addEventListener('click',()=>setTimeout(schedule,0),true);
  window.addEventListener('message',event=>{if(event.origin!==location.origin||!event.data||event.data.type!=='CDQ_CALIBRATION_OPEN_V2565')return;openFor(event.data.manufacturer,event.data.model);});
}
window.cdqCalibrationV2565={open:openLibrary,openFor,find:findCalibration,refresh:schedule,indicatorSvg};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
