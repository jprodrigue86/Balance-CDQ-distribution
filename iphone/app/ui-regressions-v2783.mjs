// Manager fixtures execute inspected application sources with synthetic data only.
// No login, Drive call, native device or release is certified by these checks.
const ensure=(ok,message)=>{if(!ok)throw Error(message);};
const slice=(s,a,b)=>{const x=s.indexOf(a),y=s.indexOf(b,x);ensure(x>=0&&y>x,'Missing application anchor: '+a);return s.slice(x,y);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(document,markup,css=''){
 ensure(document?.body,'Browser DOM required — this is not a Node-only qualification');
 const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-10000px;top:0;width:1200px;height:900px;border:0;visibility:hidden';
 const loaded=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(Error('Fixture unavailable'));});
 frame.srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39; &#39;unsafe-eval&#39;; style-src &#39;unsafe-inline&#39;; img-src data:"><style>'+css+'</style></head><body>'+markup+'</body></html>';
 document.body.append(frame);await loaded;const w=frame.contentWindow;
 Object.defineProperty(w,'localStorage',{value:{getItem:()=>null,setItem(){},removeItem(){}}});
 return {w,close:()=>frame.remove()};
}
export const UI_CASES_V2783=['PC : indicateur unique et DOM stable','Mobile : actions groupées sans navigation','Renommage : reprise des seuls échecs','Factures : total imprimé uniquement','Factures : catégories fondées sur les achats','Photo : zoom sans modifier la source','Cache : ressources neuves et données protégées','Lecture : calcul automatique sans sauvegarde','Drive : erreur effacée seulement après confirmation'];
export async function runUiRegressionV2783(name,{sources,document,makeFixture}={}){
 const get=n=>{const s=sources?.get('pc/'+n);ensure(typeof s==='string','Missing inspected source: '+n);return s;};
 const html=get('Selector.html'),mount=makeFixture||((markup,css)=>fixture(document,markup,css));
 if(name===UI_CASES_V2783[0]){
  const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(x=>x[1]).join('</style><style>')+'</style><style>'+get('desktop-shell-v2688.css')+'</style><style>'+get('desktop-workspace-v2688.css');
  const f=await mount('<div id="filesContainer" style="width:950px"><div class="file-row" data-file-type="PDF" data-file-name="Essai.pdf" data-file-date="2026-10-25"><input class="file-checkbox" data-file-id="one"><div class="file-info"><div class="file-name"><span class="file-name-text">Essai.pdf</span></div><span class="file-date">Hier</span></div><span class="file-today-done-badge">✓</span></div></div>',styles),w=f.w;
  try{
   w.document.documentElement.className='cdq-desktop-v2676 cdq-mobile-layout';
   w.eval("var compagnieSelectionnee='client',cacheContenuCompagnies={client:{fichiers:[{id:'one',nom:'Essai.pdf',dateModification:'2026-10-25'}]}};function trouverFichierDansArbre(t,id){return {fichier:t.fichiers.find(f=>f.id===id)}};function cdqFichierModifieAujourdhui(){return true};");
   w.eval(slice(html,'function cdqFileStateSlotV2782(row){','function creerLigneFichier(fichier){'));
   w.eval("(()=>{const root=document.documentElement,$=(s,r=document)=>r.querySelector(s),all=(s,r=document)=>[...r.querySelectorAll(s)];let applyQueued=false;function applyOrder(){}function motion(){}function finish(){};"+slice(html,' function rows(scope){',' window.cdqInterfaceV2708=')+'window.testRows=rows;})()');
   w.eval(get('desktop-model2-v2676.js'));w.testRows();await pause(160);
   let mutations=0;const observer=new w.MutationObserver(rows=>mutations+=rows.length);observer.observe(w.document.body,{subtree:true,childList:true});await pause(120);observer.disconnect();ensure(mutations===0,'Idle desktop still mutates: '+mutations);
   const row=w.document.querySelector('.file-row'),slot=row.querySelector('.cdq-save-slot-v2782'),green=row.querySelector('.file-today-done-badge');ensure(row.querySelectorAll('.file-today-done-badge').length===1&&green.parentElement===slot,'Duplicate or displaced green status');
   const host=slot.parentElement;ensure((w.getComputedStyle(host).gridRowStart||w.getComputedStyle(host).gridRow).split('/')[0].trim()==='1','Status creates a second desktop row');ensure((w.getComputedStyle(host).gridColumnStart||w.getComputedStyle(host).gridColumn).split('/')[0].trim()==='6','Status is not right-aligned');
   w.cacheContenuCompagnies.client.fichiers[0]._cdqPendingSaveV2660='pending';w.testRows();await pause(60);ensure(green.hidden,'Green claims an unconfirmed save');ensure(!row.querySelector('.file-pending-v2708').hidden,'Missing pending status');
  }finally{f.close();}return;
 }
 if(name===UI_CASES_V2783[1]||name===UI_CASES_V2783[2]){
  const f=await mount('<nav class="bottom-nav"><button class="bottom-nav-item">Accueil</button></nav><div id="sendArea">Convertir et envoyer</div>',get('mobile-selection-v2783.css')),w=f.w;
  try{
   const requests=[];w.eval("var utilisateurCourantEmail='test@example.invalid',utilisateurCourantRole='technicien',compagnieSelectionnee='client',cacheContenuCompagnies={client:{fichiers:[{id:'a',nom:'Cuve.pdf'},{id:'b',nom:'Plancher.pdf'}]}};");
   w.cdqDriveEntryV2632={canRead:()=>true};w.obtenirFichiersSelectionnes=()=>['a','b'];w.obtenirDossiersSelectionnes=()=>[];w.cdqFileActionsV2655={paint:(b)=>{const x=w.document.createElement('span');x.className='cdq-action-art-v2655';b.append(x);}};
   let cancelled=0,fail=true;w.quitterModeSelection=()=>cancelled++;w.actualiserCompagnieEnArrierePlan=()=>{};w.afficherMessage=()=>{};
   w.cdqApiRun=()=>{let yes,no;const api={withSuccessHandler(fn){yes=fn;return api;},withFailureHandler(fn){no=fn;return api;},renommerFichier(id,value){requests.push([id,value]);queueMicrotask(()=>id==='b'&&fail?no(Error('Échec simulé')):yes({id,nom:value}));}};return api;};
   w.eval(get('mobile-selection-v2783.js'));w.cdqMobileSelectionV2783.refresh();
   if(name===UI_CASES_V2783[1]){ensure(w.document.querySelectorAll('[data-selection-action]').length===6,'Missing contextual actions');w.document.body.classList.add('selection-active');ensure(w.getComputedStyle(w.document.querySelector('.bottom-nav-item')).display==='none','Old navigation remains visible');ensure(w.getComputedStyle(w.document.getElementById('sendArea')).display!=='none','Send action disappeared');w.document.querySelector('[data-selection-action=cancel]').click();ensure(cancelled===1,'Cancel did not exit selection');w.document.documentElement.classList.add('cdq-desktop-v2676');ensure(w.getComputedStyle(w.document.querySelector('.bottom-nav-item')).display!=='none','Desktop navigation changed');}
   else{w.cdqMobileSelectionV2783.rename(w.cdqMobileSelectionV2783.selected());const inputs=[...w.document.querySelectorAll('dialog input')];ensure(inputs.length===2,'Batch rename opened separate prompts');inputs[0].value='Cuve 1.pdf';inputs[1].value='Plancher 1.pdf';w.document.querySelector('dialog footer button:last-child').click();await pause(40);ensure(requests.length===2&&inputs[0].disabled&&!inputs[1].disabled,'Partial rename state lost');fail=false;w.document.querySelector('dialog footer button:last-child').click();await pause(40);ensure(requests.length===3&&requests[2][0]==='b','Confirmed rename was replayed');}
  }finally{f.close();}return;
 }
 if(name===UI_CASES_V2783[3]||name===UI_CASES_V2783[4]){
  const s=get('invoice-ui-v2590.js'),parser=new Function(slice(s,'function numberMoney(','function displayMoney(')+slice(s,'function textLines(','function renderSaved(')+'return {parseAmount,infer};')();
  if(name===UI_CASES_V2783[3]){for(const [text,want]of [['Sous-total 10.00\nTPS 0.50\nTVQ 1.00\nTOTAL 11.50',11.5],['TOTAL 19.90',19.9],['TOTAL 10.00\nTOTAL 19.00',NaN],['Sous-total 10.00\nTPS 0.50',NaN],['TOTAL 1O.90',NaN],['TOTAL 10.90\nArgent remis 20.00\nMonnaie 9.10',10.9]]){const got=parser.parseAmount(text);ensure(Number.isNaN(want)?Number.isNaN(got):got===want,'Wrong printed total: '+text+' => '+got);}}
  else{for(const [text,want]of [['Œufs bacon 12.50\nTOTAL 14.37','Restaurant'],['Club sandwich 17.00\nTOTAL 19.55','Restaurant'],['Crêpes 14.00\nTOTAL 16.10','Restaurant'],['Gazole 65.00\nTOTAL 65.00','Essence'],['REGULIER\n35.0 L\n1.599 $/L\nTOTAL 55.97','Essence'],['Marteau 19.00\nTOTAL 21.85','Outils'],['Essence de vanille 9.00\nTOTAL 10.35',''],['Pompe 3\nSandwich 8.00\nTOTAL 9.20','Restaurant']])ensure(parser.infer(text)===want,'Wrong category: '+text+' => '+parser.infer(text));}return;
 }
 if(name===UI_CASES_V2783[5]){
  const f=await mount('<div id="photo" style="width:400px;height:300px"></div>'),w=f.w;
  try{const box=w.document.getElementById('photo'),im=w.document.createElement('img');im.src='data:image/png;base64,AA==';Object.defineProperty(im,'naturalWidth',{value:1200});Object.defineProperty(im,'naturalHeight',{value:2400});w.eval(get('invoice-preview-v2783.mjs').replace('export function','function'));const before=im.src,api=w.installInvoicePreviewV2783(box,im);api.zoom(4);ensure(api.state().scale===4,'Zoom did not enlarge image');ensure(im.src===before,'Preview altered OCR source');api.reset();ensure(api.state().scale===1,'Fit did not reset');api.destroy();}finally{f.close();}return;
 }
 if(name===UI_CASES_V2783[6]){
  const sw=get('sw.js');ensure(!sw.includes('previousAsset('),'Update reused old resource cache');ensure(sw.includes("cache:'reload'")&&sw.includes('await assetDigest(response)!==ASSETS[name]'),'Missing resource integrity check');ensure(!/indexedDB\.deleteDatabase|localStorage\.clear|deleteAllData/.test(sw),'Unsafe document storage reset');return;
 }
 if(name===UI_CASES_V2783[7]){
  const s=get('reader-v2525.mjs'),body=slice(s,'function hasChangesV2782(){','function modified(){');const check=new Function('mustSaveV2782','userEditedV2783','cleanSignatureV2782','dirty','reportValueSignatureV2782','capturePreparedReaderFieldsV2759','staticDocumentV2788','readOnly',body+'return hasChangesV2782();');
  ensure(!check(false,false,'old',true,()=> 'auto-calculated',()=>({}),false,false),'Consultation triggers save');ensure(check(false,true,'old',true,()=> 'edited',()=>({}),false,false),'Real edit discarded');ensure(check(true,false,'old',true,()=> 'old',()=>({}),false,false),'Restored draft discarded');ensure(!check(true,true,'old',true,()=> 'edited',()=>({}),true,false),'Static document triggers report save');ensure(!check(true,true,'old',true,()=> 'edited',()=>({}),false,true),'Read-only consultation triggers report save');ensure(s.includes('dirty:meaningfulDirtyV2783'),'Journal preserves false automatic dirty state');return;
 }
 if(name===UI_CASES_V2783[8]){
  let captured;const root={id:'client',fichiers:[]},old={id:'one',nom:'Essai.pdf',_cdqPendingSaveV2660:'upload-current',_cdqDriveUploadErrorV2740:'Erreur précédente'};
  root.fichiers.push(old);
  const confirm=new Function('window','allowed','cacheContenuCompagnies','trouverFichierDansArbre','folder','file','keep','overlay','render','navigator',slice(html,'  function confirm(result,client,parentId,fallback={}){','  window.cdqInstantFiles2530=')+'return confirm;')({},()=>true,{client:root},()=>({fichier:old,noeud:root,index:0}),()=>root,()=>old,(client,meta)=>{captured=meta},()=>{},()=>{},{onLine:false});
  ensure(confirm({id:'one',nom:old.nom,_cdqCommittedUploadV2660:'other-upload'},'client','client')===false,'Stale acknowledgement accepted');ensure(!captured,'Stale receipt cleared error');
  confirm({id:'one',nom:old.nom},'client','client');ensure(captured._cdqDriveUploadErrorV2740==='Erreur précédente','Simple read cleared real error');
  confirm({id:'one',nom:old.nom,_cdqCommittedUploadV2660:'upload-current'},'client','client');ensure(!captured._cdqDriveUploadErrorV2740&&!captured._cdqPendingSaveV2660,'Confirmed upload kept stale warning');return;
 }
 throw Error('Unknown regression case');
}
