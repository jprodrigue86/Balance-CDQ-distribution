// Focused integration cases against bytes fetched by the Manager. Synthetic
// equipment metadata only; no account, document, upload or release authority.
const ensure=(ok,message)=>{if(!ok)throw Error(message);};
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const equal=(a,b,message)=>ensure(canonical(a)===canonical(b),message||JSON.stringify({actual:a,expected:b}));
const slice=(s,a,b)=>{const x=s.indexOf(a),y=s.indexOf(b,x);ensure(x>=0&&y>x,'Missing application anchor: '+a);return s.slice(x,y);};
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
// Parse only the grid track forms exercised here. Keep track count, dimensions,
// units and min/max bounds; serialization whitespace and 0px versus 0 are inert.
export function parseGridTracksV59(value){
 const text=String(value??'').trim().toLowerCase();if(text==='none')return [];
 let at=0;const fail=()=>{throw Error('INVALID_GRID_TRACKS: '+text);};
 const whitespace=()=>{const before=at;while(/\s/.test(text[at]||'')&&at<text.length)at++;return at>before;};
 const take=c=>{whitespace();if(text[at]!==c)fail();at++;};
 function breadth(){
  whitespace();const rest=text.slice(at),number=/^(\d+(?:\.\d*)?|\.\d+)(px|fr|%)?/.exec(rest);
  if(number){at+=number[0].length;const n=Number(number[1]),unit=number[2]||(n===0?'px':'');if(!unit||!Number.isFinite(n))fail();return {unit,value:n};}
  const keyword=/^(auto|min-content|max-content)\b/.exec(rest);if(keyword){at+=keyword[0].length;return {keyword:keyword[1]};}
  fail();
 }
 function track(){
  whitespace();
  if(text.slice(at).startsWith('repeat(')){at+=7;whitespace();const count=/^\d+/.exec(text.slice(at));if(!count)fail();at+=count[0].length;const n=Number(count[0]);if(n<1||n>64)fail();take(',');const inside=list(')');take(')');if(!inside.length||n*inside.length>64)fail();return Array.from({length:n},()=>inside).flat();}
  if(text.slice(at).startsWith('minmax(')){at+=7;const min=breadth();if(min.unit==='fr')fail();take(',');const max=breadth();take(')');return [{min,max}];}
  return [breadth()];
 }
 function list(end){const tracks=[];whitespace();while(at<text.length&&text[at]!==end){tracks.push(...track());const spaced=whitespace();if(at<text.length&&text[at]!==end&&!spaced)fail();if(tracks.length>64)fail();}return tracks;}
 const tracks=list();if(!tracks.length||at!==text.length)fail();return tracks;
}
export function sameGridTracksV59(actual,expected){
 try{return canonical(parseGridTracksV59(actual))===canonical(parseGridTracksV59(expected));}catch{return false;}
}
export function selectionGridMatchesV59({navColumns,actionColumns,navWidth,groupWidth,buttonWidths}={}){
 if(!sameGridTracksV59(navColumns,'minmax(0,1fr)')||!Array.isArray(buttonWidths)||buttonWidths.length!==6)return false;
 if(!Number.isFinite(navWidth)||!Number.isFinite(groupWidth)||buttonWidths.some(n=>!Number.isFinite(n)))return false;
 if(navWidth===0&&groupWidth===0&&buttonWidths.every(n=>n===0))return sameGridTracksV59(actionColumns,'repeat(6,minmax(0,1fr))');
 if(navWidth<=0||groupWidth<=0)return false;
 let tracks;try{tracks=parseGridTracksV59(actionColumns);}catch{return false;}
 // Chromium rounds track allocation to 1/64 CSS px. Keep this below one pixel.
 const tolerance=1/64+.001,expected=navWidth/6,near=n=>Math.abs(n-expected)<=tolerance;
 return Math.abs(groupWidth-navWidth)<=tolerance&&tracks.length===6&&tracks.every(t=>t.unit==='px'&&near(t.value))&&buttonWidths.every(near);
}
async function fixture(document,markup,css=''){
 ensure(document?.body,'Browser DOM required');
 const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-10000px;top:0;width:1200px;height:900px;border:0;visibility:hidden';
 const ready=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('Fixture unavailable'));});
 frame.srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39; &#39;unsafe-eval&#39;; style-src &#39;unsafe-inline&#39;; img-src data:"><style>'+css+'</style></head><body>'+markup+'</body></html>';
 document.body.append(frame);await ready;return {w:frame.contentWindow,close:()=>frame.remove()};
}
export const MANAGER_CASES_V59=Object.freeze([
 'Consultation distante en attente : aucun nouveau rang ni avis de sauvegarde',
 'Modification réelle après consultation : valeurs et sauvegarde conservées',
 'Reprise Drive : bouton isolé des clics et gestes de la ligne',
 'PC : cellule de statut réservée et colonnes communes',
 'Mobile : sélection remplace la cellule de navigation héritée',
 'Calibration : médias du modèle exact et source sûre',
 'Calibration : modèle non vérifié sans méthode empruntée',
 'Calibration : détection après sauvegarde, doublons et changement de compte',
 'Calibration : sauvegarde en lecture seule ou contexte périmé ignorée',
 'Rapport supprimé : réponses préservées et reprise automatique arrêtée',
 'Récupération explicite : nouvelle identité sans dupliquer la copie'
]);
export async function runManagerRegressionV59(name,{sources,document,makeFixture,loadModule}={}){
 const get=n=>{const source=sources?.get('pc/'+n);ensure(typeof source==='string','Missing inspected source: '+n);return source;};
 const html=get('Selector.html'),mount=makeFixture||((markup,css)=>fixture(document,markup,css));
 if(name===MANAGER_CASES_V59[0]||name===MANAGER_CASES_V59[1]){
  const {createReportEngineClientV2754:create}=await loadModule('report-engine-client-v2754.mjs');
  const ranks=[],events=[],rows=new Map(),pendingReports=new Set();
  const changed=new Function('owner','canRead','pendingReports','background','instant','publish',slice(html,'  function changed(record){','  async function client(){')+'return changed;')(()=> 'qa@example.invalid',()=>true,pendingReports,{setPending(){}},{confirm:(...a)=>ranks.push(a)},(...a)=>events.push(a));
  const storage={get:async k=>structuredClone(rows.get(k)||null),all:async()=>[...rows.values()].map(r=>structuredClone(r)),commit:async r=>rows.set(r.key,structuredClone(r))};
  const client=create({storage,getAccount:()=> 'qa@example.invalid',isOnline:()=>false,onChange:changed,rpc:()=>{throw Error('Unexpected network call');}});
  const context={engine:2754,reportId:'c730a371-f0e5-444c-b777-2c654f583993',clientId:'client',destinationId:'folder',fileId:'drive-a',family:'plancher',template:{modeleId:'plancher',sha256:'a'.repeat(64),version:2754},baseRevision:2},fields={measurement:{value:'1000.000'}};
  try{
   for(let i=0;i<2;i++){const r=await client.remember({context,fields,name:'Essai.pdf',serverRevision:2,pdf:{status:'pending',fileId:'drive-a',revision:2}});ensure(r.pending&&r.observationOnlyV2784===true&&r.savedAt===null,'A read became a local edit');}
   equal(ranks.length,0,'Read moved the report');equal(events.length,0,'Read announced a save');equal(pendingReports.size,1,'Pending publication disappeared');
   if(name===MANAGER_CASES_V59[1]){await client.save(context,{measurement:{value:'123.000'}},'save-'+crypto.randomUUID(),'Essai.pdf');const r=await client.get(context);equal(r.fields.measurement.value,'123.000');ensure(Number.isFinite(r.savedAt)&&r.observationOnlyV2784!==true,'Real edit lost its save date');equal(ranks.length,1);ensure(events.some(e=>e[0]==='cdq:report-data-saved-v2754'),'Real save not announced');}
  }finally{client.lock();}return;
 }
 if(name===MANAGER_CASES_V59[2]){
  const f=await mount('<div id="filesContainer"><div class="file-row"><input class="file-checkbox" data-file-id="one"><span class="file-name">Essai.pdf</span><span class="file-today-done-badge">✓</span></div></div>'),w=f.w;
  try{
   w.eval("var compagnieSelectionnee='client',cacheContenuCompagnies={client:{fichiers:[{id:'one',nom:'Essai.pdf',_cdqPendingSaveV2660:'real-upload',_cdqDriveUploadErrorV2740:'Absent de Drive'}]}};function trouverFichierDansArbre(tree){return {fichier:tree.fichiers[0]}};function cdqFichierModifieAujourdhui(){return true};");
   w.eval(slice(html,'function cdqFileStateSlotV2782(row){','function creerLigneFichier(fichier){'));
   w.eval("const $=(s,r=document)=>r.querySelector(s),all=(s,r=document)=>[...r.querySelectorAll(s)];"+slice(html,' function rows(scope){',' let navChangedV2724='));
   let retries=0,rowClicks=0,rowPointers=0;w.cdqSyncDetailsV2679={pending:async()=>[{id:'real-upload'}],open:async()=>retries++};w.rows();
   const row=w.document.querySelector('.file-row'),button=row.querySelector('.file-pending-v2708');row.addEventListener('click',()=>rowClicks++);row.addEventListener('pointerdown',()=>rowPointers++);
   ensure(button.tagName==='BUTTON'&&button.type==='button'&&button.querySelector('svg'),'Retry is not a native SVG button');button.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));button.click();await pause();equal([retries,rowClicks,rowPointers],[1,0,0]);ensure(!row.querySelector('input').checked,'Retry selected the report');
   button.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await pause();equal(retries,1,'Custom key handler duplicates native activation');
  }finally{f.close();}return;
 }
 if(name===MANAGER_CASES_V59[3]){
  const css=get('file-state-v2784.css');
  ensure(css.includes('grid-template-columns:28px 34px')&&css.includes('column-gap:8px')&&css.includes('width:70px'),'Loading cell is not reserved');
  ensure(css.includes('#cdqPcFileColumns')&&css.includes('.file-row.file-row{grid-template-columns:28px minmax(0,1fr)'),'Header and row do not share the grid');
  const f=await mount('<div id="filesContainer"><div class="file-row"><div class="cdq-file-state-v2782"><span class="cdq-save-slot-v2782"></span></div></div></div>',css);
  try{const host=f.w.document.querySelector('.cdq-file-state-v2782'),style=f.w.getComputedStyle(host);ensure(sameGridTracksV59(style.width,'70px'),'Status width changed');ensure(sameGridTracksV59(style.gridTemplateColumns,'28px 34px'),'Status tracks changed');}finally{f.close();}return;
 }
 if(name===MANAGER_CASES_V59[4]){
  const f=await mount('<nav class="bottom-nav" style="display:grid;grid-template-columns:none!important;grid-auto-columns:62px!important"><button class="bottom-nav-item">Accueil</button></nav><div id="sendArea"></div>',get('mobile-selection-v2783.css')+'\n'+get('file-state-v2784.css')),w=f.w;
  try{w.eval("var utilisateurCourantEmail='qa@example.invalid',utilisateurCourantRole='technicien',compagnieSelectionnee='client',cacheContenuCompagnies={client:{fichiers:[]}};");w.cdqDriveEntryV2632={canRead:()=>true};w.obtenirFichiersSelectionnes=()=>[];w.obtenirDossiersSelectionnes=()=>[];w.cdqFileActionsV2655={paint(){}};w.eval(get('mobile-selection-v2783.js'));w.document.body.classList.add('selection-active');w.cdqMobileSelectionV2783.refresh();const nav=w.document.querySelector('nav'),actions=nav.querySelector('[class*=cdq-selection-actions]');const navStyle=w.getComputedStyle(nav),inset=['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((n,key)=>n+(parseFloat(navStyle[key])||0),0),layout={navColumns:nav.style.getPropertyValue('grid-template-columns'),actionColumns:w.getComputedStyle(actions).gridTemplateColumns,navWidth:nav.getBoundingClientRect().width-inset,groupWidth:actions.getBoundingClientRect().width,buttonWidths:[...actions.children].map(n=>n.getBoundingClientRect().width)};ensure(selectionGridMatchesV59(layout),'Selection grid changed: '+JSON.stringify(layout));w.document.body.classList.remove('selection-active');w.cdqMobileSelectionV2783.refresh();ensure(sameGridTracksV59(nav.style.getPropertyValue('grid-template-columns'),'none'),'Navigation tracks not restored');}finally{f.close();}return;
 }
 if(name===MANAGER_CASES_V59[5]){
  const media=await loadModule('calibration-media-v2784.mjs'),catalogue=await loadModule('calibration-catalogue-v2784.mjs');
  async function verifyMedia(value){
   if(!value||typeof value!=='object')return;
   if(value.src&&value.verified){const key='pc/'+value.src.replace(/^\.\//,''),bytes=sources.get(key);ensure(bytes!==undefined,'Missing inspected media: '+key);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof bytes==='string'?new TextEncoder().encode(bytes):bytes)),b=>b.toString(16).padStart(2,'0')).join('');equal(hash,value.sha256,'Published media differs from sourced catalogue: '+key);}
   for(const child of Object.values(value))if(child&&typeof child==='object')await verifyMedia(child);
  }
  await verifyMedia(catalogue.catalogueManufacturers);await verifyMedia(catalogue.catalogueDevices);
  const entry=catalogue.catalogueDevices['rice-lake::480-plus'];ensure(entry?.photo?.verified,'Missing sourced exact-model image');
  const identity={manufacturer:entry.manufacturer,model:entry.model,variant:entry.variant};ensure(media.verifiedCalibrationMedia(entry.photo,identity),'Exact model rejected');equal(media.verifiedCalibrationMedia(entry.photo,{...identity,model:'480i'}),null,'Another model borrowed the photo');const plain=catalogue.catalogueDevices['rice-lake::480'];ensure(plain?.photo,'Missing plain 480 provenance');equal(media.verifiedCalibrationMedia(plain.photo,{manufacturer:plain.manufacturer,model:'480+',variant:'480+'}),null,'The plus sign was erased from model identity');ensure(!media.calibrationMediaHtml(entry.photo,{...identity,model:'480i'}).includes('<img'),'Wrong model photo rendered');equal(media.calibrationSourceUrl('javascript:alert(1)'),'');return;
 }
 if(name===MANAGER_CASES_V59[6]){
  const db=await loadModule('calibration-db-v2565.mjs');
  ensure(typeof db.findVerifiedCalibration==='function','Verified-model filter missing');
  equal(db.findVerifiedCalibration('Unlisted maker','Unlisted model'),null,'Unknown model inherited a calibration method');
  ensure(!db.findVerifiedCalibration('Rice Lake','480i unexpected variant'),'Near model inherited a method');
  try{db.addClientDevices([{category:'indicator',manufacturer:'Ohaus',model:'T31P'},{category:'bench',manufacturer:'Ohaus',model:'NVT6201X'},{category:'indicator',manufacturer:'Rice Lake',model:'480+',fileId:'qa-480-plus'}]);const plus=db.forFile('qa-480-plus'),plain=db.findCalibration('Rice Lake','480');ensure(plus?.model==='480+'&&plus.key!==plain?.key,'Detected 480+ collided with the plain 480 identity');ensure(db.findVerifiedCalibration('Rice Lake','480+')?.model!=='480','480+ borrowed the plain 480 method');const exact=db.findVerifiedCalibration('Ohaus','T31P');ensure(exact?.method?.verificationBasis==='manufacturer-document'&&exact.method.fieldVerified===false,'Dynamic exact model missed its documented method');equal(db.findVerifiedCalibration('Ohaus','NVT6201X'),null,'A model suffix borrowed another procedure');}finally{db.resetClientDevices();}return;
 }
 if(name===MANAGER_CASES_V59[7]){
  const {createCalibrationDiscovery}=await loadModule('calibration-discovery-v2784.mjs'),{captureSavedCalibration,retainSavedCalibration}=await loadModule('calibration-save-v2784.mjs');
  let owner='qa@example.invalid';const data=new Map(),discovery=createCalibrationDiscovery({owner:()=>owner,storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}});
  const captured=captureSavedCalibration({owner,fileId:'draft-a',saveId:'save-a',name:'Essai.pdf',items:[{category:'indicator',manufacturer:'Rice Lake',model:'480 Plus'}]});
  equal(discovery.snapshot().items.length,0,'Opening the reader retained a device');ensure(retainSavedCalibration(captured,{currentOwner:owner,retain:d=>discovery.saved(d),result:{id:'drive-a',revision:2}}),'Successful saved equipment lost');retainSavedCalibration(captured,{currentOwner:owner,retain:d=>discovery.saved(d),result:{id:'drive-a',revision:2}});const items=discovery.snapshot().items;equal(items.length,1);equal([items[0].fileId,items[0].model],['drive-a','480 Plus']);owner='other@example.invalid';equal(discovery.snapshot().items.length,0,'Equipment leaked across accounts');return;
 }
 if(name===MANAGER_CASES_V59[8]){
  const {captureSavedCalibration,retainSavedCalibration}=await loadModule('calibration-save-v2784.mjs');let calls=0;
  const input={owner:'qa@example.invalid',fileId:'draft-a',saveId:'save-a',items:[{category:'bench',manufacturer:'AND',model:'FG'}]};equal(captureSavedCalibration({...input,readOnly:true}),null);const snapshot=captureSavedCalibration(input);equal(retainSavedCalibration(snapshot,{currentOwner:'other@example.invalid',retain:()=>calls++}),false);equal(retainSavedCalibration(snapshot,{currentOwner:input.owner,isCurrent:()=>false,retain:()=>calls++}),false);equal(calls,0);return;
 }
 if(name===MANAGER_CASES_V59[9]||name===MANAGER_CASES_V59[10]){
  const {createReportEngineClientV2754:create}=await loadModule('report-engine-client-v2754.mjs'),rows=new Map();let calls=0,online=true;
  const storage={get:async k=>structuredClone(rows.get(k)||null),all:async()=>[...rows.values()].map(r=>structuredClone(r)),commit:async r=>rows.set(r.key,structuredClone(r))};
  const client=create({storage,getAccount:()=> 'qa@example.invalid',isOnline:()=>online,rpc:async()=>{calls++;throw Object.assign(Error('Le rapport a été supprimé.'),{code:'REPORT_DELETED'});}});
  const context={engine:2754,reportId:'c730a371-f0e5-444c-b777-2c654f583993',clientId:'client',destinationId:'folder',fileId:'drive-deleted',family:'plancher',template:{modeleId:'plancher',sha256:'a'.repeat(64),version:2754},baseRevision:2},fields={measurement:{value:'1000.000'},comment:{value:'À conserver'}};
  try{await client.save(context,fields,'save-'+crypto.randomUUID(),'Essai.pdf');let record;for(let n=0;n<100;n++){record=await client.get(context);if(record?.error)break;await pause();}ensure(record?.blocked===true&&record.remoteDeletedV2784===true,'Deleted report remains in automatic retry');equal(record.fields,fields,'Terminal rejection discarded the local answers');equal(record.context.reportId,context.reportId,'Terminal rejection silently changed report identity');equal(client.stats().queuedTimers,0,'Deleted report scheduled another save');await client.resume();await pause();equal(calls,1,'Resume sent a terminal save again');
   if(name===MANAGER_CASES_V59[10]){online=false;const copy=await client.recoverAsNewV2784(context),again=await client.recoverAsNewV2784(context),old=await client.get(context);ensure(copy.context.reportId!==context.reportId,'Recovery reused a deleted identity');equal([copy.context.fileId,copy.context.baseRevision],['',0]);ensure(!copy.context.expectedDriveRevision,'Recovery kept the deleted Drive revision');equal(copy.fields,fields);equal(copy.recoveredFromReportIdV2784,context.reportId);equal(again.context.reportId,copy.context.reportId,'Double recovery duplicated a report');equal(old.payload,record.payload,'Recovery rewrote the original payload');equal(old.fields,fields);ensure(old.blocked&&old.remoteDeletedV2784,'Recovery erased the terminal original');equal(calls,1,'Offline recovery made a network call');}
  }finally{client.lock();}return;
 }
 throw Error('Unknown Manager regression case: '+name);
}
