/* CDQ Drive Diagnostic V27.64 — observation only; no RPC, Drive write, PDF edit or auth mutation. */
const $ = id => document.getElementById(id);
const frame = $('cdq');
const STORE = 'cdq-drive-diagnostic-v2764-sessions';
const MAX_EVENTS = 700;
const allowedMessageTypes = new Set([
 'CDQ_READER_READY','CDQ_READER_OPENED','CDQ_PDF_OPENED_V2523',
 'CDQ_REPORT_ENGINE_SAVE_V2754','CDQ_REPORT_ENGINE_SAVE_V2754_RESULT',
 'CDQ_REPORT_ENGINE_DATA_SAVED_V2754','CDQ_REPORT_ENGINE_PDF_CONFIRMED_V2754',
 'CDQ_PDF_SAVED','CDQ_PDF_SAVED_V2741','CDQ_FILE_HANDOFF_READY_V2307',
 'CDQ_ACCESS_STATE','CDQ_SELECTOR_READY','CDQ_PDF_OPEN_FAILED_V2757'
]);
const eventNames = [
 'cdq:reader-opening-metric-v2757',
 'cdq:report-data-saved-v2754',
 'cdq:report-pdf-confirmed-v2754',
 'cdq:pdf-saved',
 'cdq:pdf-save-error',
 'cdq:reader-opened'
];
const state = {
 schema:'cdq-drive-diagnostic-v2764-v1',
 version:'2026-10-23-diagnostic-sidecar-v1',
 baselineReportedSeconds:20,
 createdAt:new Date().toISOString(),
 startedAt:null,
 endedAt:null,
 active:false,
 platform:/Android/i.test(navigator.userAgent)?'android-browser':/iPhone|iPad/i.test(navigator.userAgent)?'ios-browser':'desktop-browser',
 runtime:'CDQ web PC, NOT the native Android APK',
 events:[]
};
const attached = new WeakMap();
let redraw=0, firstApp=false, firstSelector=false;
try {
 const old=JSON.parse(localStorage.getItem(STORE)||'null');
 if(old && old.schema===state.schema && Array.isArray(old.events)){
   state.events=old.events.slice(-MAX_EVENTS);
   state.startedAt=old.startedAt||null;
   state.endedAt=old.endedAt||null;
   state.createdAt=old.createdAt||state.createdAt;
 }
}catch(_){}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(_){}}
function safePhase(value){
 const s=String(value||'').slice(0,60);
 return /^[A-Za-z0-9:_-]+$/.test(s)?s:'unknown';
}
function round(value){
 const n=Number(value);
 return Number.isFinite(n)&&n>=0&&n<120000 ? Math.round(n*10)/10:null;
}
function append(kind,detail=null){
 if(!state.active)return;
 const e={at:new Date().toISOString(),kind};
 if(detail&&typeof detail==='object'){
   if(typeof detail.phase==='string')e.phase=safePhase(detail.phase);
   const elapsed=round(detail.elapsedMs);
   if(elapsed!==null)e.elapsedMs=elapsed;
   const duration=round(detail.durationMs);
   if(duration!==null)e.durationMs=duration;
   if(typeof detail.result==='string')e.result=safePhase(detail.result);
 }
 state.events.push(e);
 if(state.events.length>MAX_EVENTS)state.events.splice(0,state.events.length-MAX_EVENTS);
 persist();
 if(!redraw){redraw=requestAnimationFrame(()=>{redraw=0;render()});}
}
function kindForClick(target){
 const el=target&&target.nodeType===1&&typeof target.closest==='function'?target.closest('button,a,[role="button"],[data-file-id],tr,[data-client-report]'):null;
 if(!el)return null;
 const s=String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').toLowerCase().slice(0,250);
 if(/fermer.*enregistr|enregistr.*fermer/.test(s))return 'clic:fermer-et-enregistrer';
 if(/enregistrer|sauvegarder/.test(s))return 'clic:enregistrer';
 if(/fermer|quitter|retour/.test(s))return 'clic:fermer-ou-retour';
 if(/nouveau rapport|créer.*rapport|creation.*rapport/.test(s))return 'clic:creer-rapport';
 if(/\.pdf\b|ouvrir.*pdf|rapport d.etalon|ouvrir.*rapport/.test(s))return 'clic:ouvrir-pdf';
 if(/choisir.*compagnie|choisir.*client/.test(s))return 'clic:choisir-client';
 return null;
}
function resourceType(entry){
 let host='';
 try{host=new URL(entry.name).hostname.toLowerCase();}catch(_){return null;}
 if(host==='script.google.com')return 'ressource:google-apps-script';
 if(host.endsWith('.googleusercontent.com'))return 'ressource:googleusercontent';
 if(host==='drive.google.com'||host==='www.googleapis.com')return 'ressource:google-drive-api';
 if(host.includes('cdq-report-engine')||host.endsWith('.workers.dev'))return 'ressource:cloudflare-worker';
 return null;
}
function attach(win,depth){
 if(!win||depth>5)return;
 let doc,href='';
 try{
   doc=win.document;
   href=win.location.href;
   if(win.location.origin!==location.origin||!doc)return;
 }catch(_){return;}
 if(attached.get(win)===doc)return;
 attached.set(win,doc);
 const role=/Selector\.html/i.test(href)?'selector':/reader-v2525\.html/i.test(href)?'lecteur':depth===0?'app':'frame';
 if(role==='selector')firstSelector=true;
 if(role==='app')firstApp=true;
 win.addEventListener('click',ev=>{
   const kind=kindForClick(ev.target);
   if(kind)append(kind);
 },true);
 win.addEventListener('message',ev=>{
   const obj=ev.data;
   if(!obj||typeof obj!=='object'||!allowedMessageTypes.has(obj.type))return;
   // Only an event name is retained. Never store messages, user IDs, tokens, PDF fields or filenames.
   if(obj.type==='CDQ_ACCESS_STATE')return;
   append('signal:'+obj.type);
 },true);
 for(const name of eventNames){
   win.addEventListener(name,ev=>{
     if(name==='cdq:reader-opening-metric-v2757'){
       const d=ev.detail||{};
       append('ouverture:etape',{phase:d.phase,elapsedMs:d.elapsedMs});
     }else append('signal:'+name);
   },true);
 }
 try {
   for(const m of win.cdqReaderOpeningTimingsV2762||[]){
     if(m&&typeof m==='object')append('ouverture:etape-recuperee',{phase:m.phase,elapsedMs:m.elapsedMs});
   }
 }catch(_){}
 try {
   const obs=new win.PerformanceObserver(list=>{
     for(const entry of list.getEntries()){
       const kind=resourceType(entry);
       if(kind)append(kind,{durationMs:entry.duration});
     }
   });
   obs.observe({type:'resource',buffered:false});
   // Observers live in their own page, and are collected automatically when its frame closes.
 }catch(_){}
}
function scan(){
 try{
   const appVersion=frame.contentWindow?.document?.documentElement?.getAttribute('data-cdq-pc-version')||'';
   if(/^\d{2}\.\d{2}$/.test(appVersion))state.detectedAppVersion=appVersion;
   const seen=new WeakSet();
   function walk(win,depth){
     if(!win||depth>5||seen.has(win))return;
     seen.add(win);
     attach(win,depth);
     let frames=[];
     try{frames=Array.from(win.document.querySelectorAll('iframe'));}catch(_){return;}
     for(const node of frames){try{walk(node.contentWindow,depth+1);}catch(_){}}
   }
   walk(frame.contentWindow,0);
   $('connection').textContent=firstSelector?'CDQ détecté — sonde PDF active':firstApp?'CDQ en chargement — attente du lecteur':'Chargement de CDQ…';
 }catch(_){$('connection').textContent='Impossible de suivre cette page CDQ dans son cadre.';}
}
function counts(){
 const all=state.events;
 const completed=all.filter(x=>x.kind==='ouverture:etape'&&/editable-visible|consultation-visible/i.test(x.phase||''));
 const saves=all.filter(x=>x.kind==='signal:cdq:report-pdf-confirmed-v2754');
 let lastSaveMs=null;
 const confirmation=saves.at(-1);
 if(confirmation){
   const n=all.lastIndexOf(confirmation);
   for(let i=n-1;i>=0;i--){
     if(all[i].kind==='clic:enregistrer'||all[i].kind==='clic:fermer-et-enregistrer'||all[i].kind==='repere-manuel:clic-enregistrer'){
       lastSaveMs=Math.max(0,new Date(confirmation.at)-new Date(all[i].at));
       break;
     }
   }
 }
 return {
   opened:completed.length,
   confirmed:saves.length,
   network:all.filter(x=>x.kind.startsWith('ressource:')).length,
   lastOpenMs:completed.length?completed.at(-1).elapsedMs:null,
   lastSaveMs
 };
}
function render(){
 const c=counts();
 $('state').textContent=state.active?'Enregistrement en cours':'Diagnostic arrêté';
 $('state').dataset.active=String(state.active);
 $('start').textContent=state.active?'Arrêter la mesure':'Démarrer une nouvelle mesure';
 $('summary').textContent=c.opened+' ouverture(s) • dernière ouverture : '+(c.lastOpenMs!=null?(c.lastOpenMs/1000).toFixed(2)+' s':'non mesurée')+' • confirmation Drive après clic : '+(c.lastSaveMs!=null?(c.lastSaveMs/1000).toFixed(2)+' s':'non mesurée')+' • '+state.events.length+' événements';
 const list=$('events');
 const last=state.events.slice(-16).reverse();
 list.replaceChildren();
 for(const e of last){
   const item=document.createElement('div');
   item.className='entry';
   const t=(e.at||'').slice(11,19);
   const duration=e.durationMs!==undefined?' — '+(e.durationMs/1000).toFixed(2)+' s':'';
   const elapsed=e.elapsedMs!==undefined?' — '+(e.elapsedMs/1000).toFixed(2)+' s cumulées':'';
   item.textContent=t+'  '+e.kind+(e.phase?' : '+e.phase:'')+elapsed+duration;
   list.append(item);
 }
 if(!last.length)list.textContent='Aucun événement pour le moment.';
}
function exportData(){
 return JSON.stringify({
   ...state,
   exportedAt:new Date().toISOString(),
   summary:counts(),
   events:state.events.slice()
 },null,2);
}
function makeFile(){
 return new File([exportData()],'CDQ-diagnostic-Drive-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',{type:'application/json'});
}
$('start').addEventListener('click',()=>{
 if(state.active){append('diagnostic:fin');state.active=false;state.endedAt=new Date().toISOString();}
 else{
   state.active=true;
   state.events=[];
   state.createdAt=new Date().toISOString();
   state.startedAt=state.createdAt;
   state.endedAt=null;
   append('diagnostic:debut');
 }
 persist();render();
});
$('mark-open').addEventListener('click',()=>append('repere-manuel:clic-ouvrir-pdf'));
$('mark-save').addEventListener('click',()=>append('repere-manuel:clic-enregistrer'));
$('download').addEventListener('click',()=>{
 const file=makeFile(),url=URL.createObjectURL(file);
 const a=document.createElement('a');
 a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),12000);
});
$('copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(exportData());$('notice').textContent='Journal copié. Colle-le dans la conversation ChatGPT.';}
 catch(_){$('notice').textContent='Copie refusée. Utilise Télécharger JSON.';}
});
$('share').addEventListener('click',async()=>{
 const file=makeFile();
 if(!navigator.share||navigator.canShare&&!navigator.canShare({files:[file]})){
   $('notice').textContent='Partage de fichier indisponible : télécharge le JSON puis ajoute-le dans Drive ou ici.';
   return;
 }
 try{await navigator.share({files:[file],title:'CDQ — diagnostic Drive'});$('notice').textContent='Fichier envoyé à l’application de partage choisie; vérifie la destination Drive.';}
 catch(err){if(err.name!=='AbortError')$('notice').textContent='Partage non terminé; utilise Télécharger JSON.';}
});
$('details').addEventListener('click',()=>{
 const panel=$('logpanel');
 panel.hidden=!panel.hidden;
 $('details').textContent=panel.hidden?'Afficher le journal':'Masquer le journal';
});
frame.addEventListener('load',()=>{firstApp=false;firstSelector=false;setTimeout(scan,60)});
setInterval(scan,450);
render();scan();
window.cdqDriveDiagnosticV2764={snapshot:()=>JSON.parse(exportData()),version:'2026-10-23-v1'};
