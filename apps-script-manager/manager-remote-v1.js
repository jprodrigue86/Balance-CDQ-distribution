/* CDQ Manager — contrôle distant privé v1.
   Browser keeps Google OAuth; only approved commands, hashes and statuses cross the bridge.
   The user must pair once and explicitly enable writes for one hour.
   Never embed Google tokens, cookies or other session credentials in responses.
*/
(() => {
 'use strict';
 const BASE='https://cdq-manager-remote.balance-cdq.workers.dev';
 const PROJECT='1udMG-jQcBAwBAwk6kSEZ660JWo5n7nVvnq24lp2T4RDV5pfXe8QDlPdf';
 const DEPLOYMENT='AKfycbx8NuvklaL-azJBIVyCMKjPk_Hd9z62Q_2-NPl3vqw2kJRpI5wy63J8xkBN5toOFxEw';
 const STORAGE='cdq_manager_remote_pair_v1';
 const HEX=/^[a-f0-9]{64}$/;
 const idRegex=/^[A-Za-z0-9_-]{16,96}$/;
 const $=id=>document.getElementById(id);
 let pair=null,busy=false,polled=false;
 const raw=new URL(location.href).searchParams.get('cdq_remote_pair')||'';
 const pairingToken=HEX.test(raw)?raw:'';
 function secret(){const u=new Uint8Array(32);crypto.getRandomValues(u);return Array.from(u,x=>x.toString(16).padStart(2,'0')).join('');}
 function id(){const u=new Uint8Array(20);crypto.getRandomValues(u);return 'cdq_'+Array.from(u,x=>x.toString(16).padStart(2,'0')).join('');}
 function status(msg,bad=false){const el=$('cdqRemoteStatus');if(el){el.textContent=msg;el.style.color=bad?'#e99d8a':'#9ce0d9';}}
 function render(){
  const c=$('cdqRemoteConnected'),button=$('cdqRemotePair'),allow=$('cdqRemoteWrite'),revoke=$('cdqRemoteRevoke');
  if(c)c.textContent=pair?'Association active — Google reste dans ce navigateur':'Association inactive';
  if(button)button.hidden=!pairingToken||!!pair;
  if(allow)allow.disabled=!pair;
  if(revoke)revoke.disabled=!pair;
 }
 try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x&&idRegex.test(x.clientId)&&HEX.test(x.clientSecret)&&x.projectId===PROJECT)pair=x;}catch(_){}
 function mount(){
  if(!$('quickCard')||$('cdqRemotePanel'))return;
  const el=document.createElement('section');el.className='card';el.id='cdqRemotePanel';
  el.innerHTML='<div class="section-title"><span>🔐</span><h2>Accès distant CDQ Manager</h2></div>'+
    '<p class="muted">ChatGPT peut lire l’état du projet et, après autorisation, utiliser les fonctions existantes Écrire + Déployer. Le compte Google et son jeton restent ici. Le Manager doit rester ouvert.</p>'+
    '<div id="cdqRemoteConnected" role="status"></div>'+
    '<p id="cdqRemoteStatus" class="muted" role="status">Association en attente.</p>'+
    '<div class="actions three">'+
    '<button id="cdqRemotePair" type="button" class="primary">Associer ce Manager</button>'+
    '<button id="cdqRemoteWrite" type="button" class="secondary">Autoriser les écritures (1 h)</button>'+
    '<button id="cdqRemoteRevoke" type="button" class="secondary">Révoquer l’accès distant</button></div>'+
    '<p class="safe-note">L’accès n’effectue aucune action sans demande autorisée. Les tâches expirées ne sont pas rejouées; une publication incertaine exige une relecture.</p>';
  $('quickCard').insertAdjacentElement('afterend',el);
  $('cdqRemotePair').addEventListener('click',()=>void doPair());
  $('cdqRemoteWrite').addEventListener('click',()=>void doConsent());
  $('cdqRemoteRevoke').addEventListener('click',()=>void doRevoke());
  render();
  if(pair)void check();
  else if(pairingToken)status('Lien d’association reçu. Appuie sur « Associer ce Manager ».');
 }
 async function call(route,method='GET',data=null,authenticated=true){
  const headers={'content-type':'application/json'};
  if(authenticated){
   if(!pair)throw Error('ASSOCIATION_ABSENTE');
   headers.authorization='Bearer '+pair.clientSecret;
   headers['x-cdq-client-id']=pair.clientId;
  }
  const r=await fetch(BASE+route,{method,headers,cache:'no-store',credentials:'omit',redirect:'error',body:data===null?undefined:JSON.stringify(data)});
  let body;try{body=await r.json();}catch(_){throw Error('RÉPONSE_INVALIDE');}
  if(!r.ok)throw Error(String(body.error||'HTTP_'+r.status));
  return body;
 }
 async function doPair(){
  if(!pairingToken){status('Lien de jumelage manquant ou expiré.',true);return;}
  if(pair)return;
  const clientId=id(),clientSecret=secret();
  try{
   const result=await call('/v1/pair','POST',{pairToken:pairingToken,clientSecret,clientId,projectId:PROJECT},false);
   if(!result.ok||result.clientId!==clientId)throw Error('RÉPONSE_ASSOCIATION_INVALIDE');
   pair={clientId,clientSecret,projectId:PROJECT};
   localStorage.setItem(STORAGE,JSON.stringify(pair));
   const clean=new URL(location.href);clean.searchParams.delete('cdq_remote_pair');
   history.replaceState({},'',clean.pathname+clean.search+clean.hash);
   status('Associé au service privé. Aucun accès Google transmis.');
   render();await check();startPolling();
  }catch(e){status('Association refusée : '+String(e.message||e),true);}
 }
 async function check(){
  if(!pair)return;
  try{
   const r=await call('/v1/me');const consent=Math.max(0,(Number(r.writeUntil)||0)*1000-Date.now());
   status(consent>0?'Connexion active • écritures autorisées temporairement':'Connexion active • lecture seulement');
  }catch(e){status('Connexion distante indisponible : '+String(e.message||e),true);}
 }
 async function doConsent(){
  if(!pair)return;
  if(!hasLiveToken()||S.id!==PROJECT){status('Connecte Google et charge le projet CDQ avant d’autoriser les écritures.',true);return;}
  if(!confirm('Autoriser le service distant CDQ à exécuter une écriture/déploiement explicitement demandés dans la conversation pendant une heure ?'))return;
  try{const x=await call('/v1/consent','POST',{allowWrite:true});status('Écritures distantes autorisées jusqu’à '+new Date(x.writeUntil*1000).toLocaleTimeString('fr-CA'));}
  catch(e){status('Autorisation impossible : '+String(e.message||e),true);}
 }
 async function doRevoke(){
  if(!pair)return;
  if(!confirm('Révoquer définitivement ce jumelage avec le service distant CDQ ?'))return;
  try{await call('/v1/revoke','POST',{});pair=null;localStorage.removeItem(STORAGE);status('Accès distant révoqué.');render();}
  catch(e){status('Révocation non confirmée : '+String(e.message||e),true);}
 }
 const safeError=e=>String(e?.message||e).replace(/Bearer\s+[a-f0-9]{64}/gi,'Bearer [hidden]').slice(0,220);
 async function snapshot(){
  return {googleConnected:hasLiveToken(),projectLoaded:S.id===PROJECT,
    pendingLocalEdits:typeof pendingChangeCount==='function'?pendingChangeCount():null,
    deployBusy:!!S.deployBusy,readOnly:true};
 }
 async function readProject(p){
  if(!hasLiveToken()||S.id!==PROJECT)throw Error('GOOGLE_LOGIN_OR_PROJECT_REQUIRED');
  const wanted=Array.isArray(p?.moduleNames)?p.moduleNames.slice(0,15).filter(x=>/^[A-Za-z][A-Za-z0-9_]{1,90}$/.test(x)):[];
  const files=(await getProjectContent(PROJECT,cid())).files||[];
  const deployments=await listDeployments(PROJECT,cid());
  const current=deployments.find(d=>d.deploymentId===DEPLOYMENT);
  const selected=wanted.length?files.filter(x=>wanted.includes(x.name)):files.filter(x=>['Code','CDQWorkspaceV2638','CDQInventoryV2593','CDQSendPipelineV20261103'].includes(x.name));
  const hashes=[];
  for(const f of selected){hashes.push({name:f.name,type:f.type,bytes:new TextEncoder().encode(f.source||'').length,sha256:await sha256HexV24(f.source||'')});}
  return {ok:true,fileCount:files.length,modules:hashes,productionVersion:current?.deploymentConfig?.versionNumber||null,projectId:PROJECT};
 }
 async function writeDeploy(p){
  if(!hasLiveToken()||S.id!==PROJECT)throw Error('GOOGLE_LOGIN_OR_PROJECT_REQUIRED');
  if(S.deployBusy||S.draft.size||S.pkg.size||S.bundleUrl)throw Error('MODIFICATIONS_LOCALES_EN_COURS');
  if(!p||typeof p!=='object'||!HEX.test(p.manifestSha256||'')||!Array.isArray(p.approvedFiles)||!p.approvedFiles.length)throw Error('CONTRAT_PUBLICATION_INVALIDE');
  const url=String(p.manifestUrl||'');
  if(!/^https:\/\/jprodrigue86\.github\.io\/Balance-CDQ-distribution\/bundles\/balance-cdq\/[a-zA-Z0-9._-]+\/manifest\.json$/.test(url))throw Error('PACKAGE_NON_AUTORISÉ');
  if(Number(p.expectedProductionVersion)<=0||!Number.isSafeInteger(Number(p.expectedProductionVersion)))throw Error('VERSION_ATTENDUE_INVALIDE');
  const fresh=await getProjectContent(PROJECT,cid());
  const current=(await listDeployments(PROJECT,cid())).find(d=>d.deploymentId===DEPLOYMENT);
  if(!current||Number(current.deploymentConfig?.versionNumber)!==Number(p.expectedProductionVersion))throw Error('CONFLIT_VERSION_PRODUCTION');
  const expected=p.expectedHashes&&typeof p.expectedHashes==='object'?p.expectedHashes:{};
  const names=Object.keys(expected);
  if(!names.length||names.length>20)throw Error('PRECONDITIONS_ABSENTES');
  for(const name of names){
   const file=fresh.files.find(x=>x.name===name);
   if(!file||!HEX.test(expected[name])||await sha256HexV24(file.source||'')!==expected[name])throw Error('CONFLIT_FICHIER_'+name);
  }
  const text=await fetchBundleTextV24(url);
  if(await sha256HexV24(text)!==p.manifestSha256)throw Error('MANIFESTE_MODIFIÉ');
  const manifest=JSON.parse(text);
  if(manifest.projectScriptId!==PROJECT)throw Error('PROJET_NON_CONFORME');
  await importBundleManifestV24(url,manifest);
  const changed=Array.from(changes().values()).filter(e=>{const f=S.files.find(x=>key(x)===key(e));return !f||(f.source||'')!==e.source}).map(e=>e.displayName||displayNameForFile(e));
  const expectedNames=p.approvedFiles.slice().sort();
  if(changed.slice().sort().join('|')!==expectedNames.join('|')){
   S.pkg.clear();renderDiff();throw Error('DIFF_NON_AUTORISÉ');
  }
  if(!beginQuickDeployProgress('Publication distante CDQ autorisée…'))throw Error('AUTRE_DÉPLOIEMENT_ACTIF');
  let began=false;
  try{
   began=true;
   const r=await writePendingAndDeploy();
   const verified=!r?.verificationPending;
   endQuickDeployProgress(true,verified?'100 % — production vérifiée.':'Google déployé — production à recontrôler.',verified);
   return {ok:true,version:r?.version,deploymentId:r?.deploymentId,verified,approvedFiles:expectedNames};
  }catch(e){
   endQuickDeployProgress(false,'Publication à vérifier dans Google : '+safeError(e));
   const error=new Error('PUBLICATION_ÉTAT_INCERTAIN : '+safeError(e));error.uncertain=began;throw error;
  }
 }
 async function execute(job){
  if(job.projectId!==PROJECT||!idRegex.test(job.id))throw Error('COMMANDE_NON_AUTORISÉE');
  if(job.kind==='status')return snapshot();
  if(job.kind==='read_project')return readProject(job.payload);
  if(job.kind==='write_deploy')return writeDeploy(job.payload);
  throw Error('COMMANDE_INCONNUE');
 }
 async function poll(){
  if(!pair||busy||document.hidden)return;
  busy=true;
  try{
   const result=await call('/v1/poll');
   if(result.needsWriteConsent){status('Écriture distante en attente de ton autorisation locale.');return;}
   const job=result.job;if(!job)return;
   status('Commande distante '+job.kind+' en cours…');
   let outcome={jobId:job.id,status:'completed',summary:{}};
   try{outcome.summary=await execute(job);}
   catch(e){outcome.status=e?.uncertain?'uncertain':'failed';outcome.summary={error:safeError(e)};}
   try{await call('/v1/result','POST',outcome);
    status('Commande '+job.kind+' : '+outcome.status+(outcome.summary.version?' (v'+outcome.summary.version+')':''));
   }catch(e){status('Résultat de commande non confirmé — aucune relance automatique : '+safeError(e),true);}
  }catch(e){status('Pont distant en attente : '+safeError(e),true);}
  finally{busy=false;}
 }
 function startPolling(){
  if(pair&&!polled){polled=true;setInterval(()=>void poll(),12000);window.addEventListener('focus',()=>void poll());void poll();}
 }
 function start(){
  mount();startPolling();
 }
 // Manager's existing bootstrap is asynchronous; no Google login is forced.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
