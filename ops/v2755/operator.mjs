/* Independent operator UI. No credentials, client IDs or deployment IDs are bundled. */
export const PUBLIC_ORIGIN = 'https://jprodrigue86.github.io';
export const GOOGLE_BUILD = '2026.10.18-v27.54-data-engine';
export const CAPABILITIES = Object.freeze({ok:true,ready:true,engine:2754,schema:1,durableData:true,transactionalIndex:true,serverPdf:true,version:'27.54',listRepairProtocol:1,listConflictConsultation:true,googleListRepairProtocol:1,googleDriveLockWaitMs:6000});
const ID = /^[A-Za-z0-9_-]{8,100}$/;
const HASH = /^[a-f0-9]{64}$/;
const CHANNEL = /^[A-Za-z0-9-]{20,100}$/;
const validId = value => typeof value==='string' && ID.test(value);
const validRevision = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const clone = value => JSON.parse(JSON.stringify(value));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function closed(value, keys, label) {
  check(object(value) && Object.keys(value).length === keys.length && keys.every(key => own(value,key)), label + ' : champs inattendus ou manquants.');
}
function optionalKeys(value, required, optional, label) {
  check(object(value) && required.every(key=>own(value,key)) && Object.keys(value).every(key=>required.includes(key)||optional.includes(key)), label + ' : champs inattendus ou manquants.');
}
export function validateEndpoint(value) {
  check(typeof value === 'string' && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value), 'URL Google /exec exacte requise, sans paramètres supplémentaires.');
  return value;
}
export function isGoogleFrameOrigin(value) {
  try { const url = new URL(value); return url.origin === value && url.protocol === 'https:' && !url.port && (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com' || /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname)); }
  catch { return false; }
}
export function belongsToFrame(source, frameWindow) {
  try { for (let i=0; source && i<10; i++) { if(source===frameWindow)return true;const parent=source.parent;if(parent===source)break;source=parent; } }
  catch { return false; }
  return false;
}
export function validateCapabilities(value) {
  closed(value,Object.keys(CAPABILITIES),'Capacités');
  check(Object.keys(CAPABILITIES).every(key=>value[key]===CAPABILITIES[key]), 'Les capacités réelles ne satisfont pas le protocole attendu.');
  return clone(value);
}
export function validateGoogleDiagnostic(value,principal) {
  check(object(value)&&value.serveur==='Apps Script'&&value.versionBackend===GOOGLE_BUILD&&value.utilisateur===principal&&value.role==='admin'&&value.drive==='OK'&&typeof value.horodatage==='string'&&Number.isFinite(Date.parse(value.horodatage)),'Le diagnostic Google ne confirme pas le compte, le build et la santé Drive attendus.');
  const selected=Object.fromEntries(['serveur','versionBackend','horodatage','utilisateur','role','drive'].map(key=>[key,value[key]]));
  return {responseRepresentation:'selected-safe-fields-from-obtenirDiagnosticApplication-v1',response:selected,body:{authenticatedGooglePrincipal:value.utilisateur,servedBuild:value.versionBackend,serverHealthVerified:true}};
}
export function validateRepairPayload(value) {
  closed(value,['clientId','repair','reconcileExternal','externalRevision'],'Réparation');
  check(validId(value.clientId) && value.repair===true && value.reconcileExternal===true,'Réparation externe explicite et client précis requis.');
  const source=value.externalRevision;
  closed(source,['fileId','driveRevision','sha256','size'],'Révision externe');
  check(validId(source.fileId) && validRevision(source.driveRevision) && typeof source.sha256==='string' && HASH.test(source.sha256) && Number.isSafeInteger(source.size) && source.size>=8 && source.size<=16*1024*1024,'Identité, révision, SHA256 et taille exacts du PDF requis.');
  return clone(value);
}
export function parsePreparation(text) {
  check(typeof text==='string' && text.length<=1024*1024,'Fichier de préparation trop volumineux.');
  const data=JSON.parse(text);
  const operation=object(data)&&own(data,'preparedOperation')?data.preparedOperation:data;
  closed(operation,['function','action','payload'],'Opération préparée');
  check(operation.function==='cdqReportEngineV2754' && operation.action==='list','Seule la réparation de liste par le RPC qualifié est disponible.');
  return {function:operation.function,action:operation.action,payload:validateRepairPayload(operation.payload)};
}
export function validateListState(value, payload) {
  optionalKeys(value,['ok','engine','found','kind','baselineComplete','reportId','clientId','destinationId','revision','pdf'],['readOnly','reconciliationRequired','repairQueued','observedPdf','repaired','replayed','repair'],'État de liste');
  check(value.ok===true&&value.engine===2754&&value.found===true&&value.kind==='list'&&value.baselineComplete===true&&value.clientId===payload.clientId&&validId(value.reportId)&&validId(value.destinationId)&&Number.isSafeInteger(value.revision)&&value.revision>=0,'État de liste absent ou identité différente.');
  closed(value.pdf,['status','fileId','revision','driveRevision','errorCode'],'État PDF');
  check(value.pdf.fileId===payload.externalRevision.fileId&&['pending','running','confirmed','conflict','failed'].includes(value.pdf.status)&&Number.isSafeInteger(value.pdf.revision)&&value.pdf.revision>=0&&(value.pdf.driveRevision===''||validRevision(value.pdf.driveRevision))&&typeof value.pdf.errorCode==='string'&&/^[A-Z0-9_]{0,100}$/.test(value.pdf.errorCode),'État PDF invalide ou autre fichier.');
  for(const key of ['readOnly','reconciliationRequired','repairQueued','repaired','replayed'])if(own(value,key))check(typeof value[key]==='boolean','Indicateur de liste invalide.');
  if(own(value,'observedPdf')){closed(value.observedPdf,['fileId','driveRevision'],'PDF observé');check(value.observedPdf.fileId===payload.externalRevision.fileId&&validRevision(value.observedPdf.driveRevision),'Autre PDF observé.');}
  if(own(value,'repair')){closed(value.repair,['key','backupFileId','revision'],'Reçu de réparation');check(typeof value.repair.key==='string'&&HASH.test(value.repair.key)&&validId(value.repair.backupFileId)&&value.repair.backupFileId!==payload.externalRevision.fileId&&Number.isSafeInteger(value.repair.revision)&&value.repair.revision>0,'Reçu de sauvegarde invalide.');}
  return clone(value);
}
export function validateInspection(value, payload) {
  const state=validateListState(value,payload);
  check(state.readOnly===true&&state.reconciliationRequired===true&&state.pdf.status==='conflict'&&state.pdf.errorCode==='CONFLICT_EXTERNAL_DRIVE'&&state.observedPdf?.fileId===payload.externalRevision.fileId&&state.observedPdf.driveRevision===payload.externalRevision.driveRevision&&state.pdf.driveRevision!==payload.externalRevision.driveRevision,'L’état divergent ou sa révision ne correspond pas à la préparation ; relisez Drive avant de réparer.');
  return state;
}
export function publicationConfirmed(state, repair) {
  return !!(repair?.repaired===true&&repair.repair&&state.pdf?.status==='confirmed'&&state.pdf.revision>=repair.repair.revision&&state.revision>=repair.repair.revision&&state.repairQueued!==true&&state.reconciliationRequired!==true);
}
export function safeError(error) {
  return String(error?.message||error||'Opération interrompue.').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[identifiant masqué]').replace(/(?:[a-f0-9]{8}-[a-f0-9-]{27,}){2,}/gi,'[identifiant masqué]').slice(0,700);
}
function requireCurrentAuthentication(isCurrent) {
  if(typeof isCurrent!=='function'||!isCurrent())throw Object.assign(new Error('Cette connexion Google a été remplacée. Reprenez la connexion courante.'),{code:'CDQ_AUTH_STALE'});
}
export async function openCreatorGoogleSession({call,credential,challenge,isCurrent,now=Date.now}) {
  let ticket='';
  const current=()=>requireCurrentAuthentication(isCurrent);
  async function exchange(name,args,failure) {
    current();
    let value;
    try{value=await call(name,args);}
    catch{current();throw new Error(failure+' Préparez une nouvelle connexion Google.');}
    current();
    return value;
  }
  try{
    current();
    check(object(challenge)&&typeof challenge.challengeId==='string'&&challenge.challengeId.length>0&&challenge.challengeId.length<=200&&Number.isFinite(challenge.expiresAt)&&challenge.expiresAt>now(),'Connexion Google expirée. Préparez un nouveau challenge.');
    check(typeof credential==='string'&&credential.length>0&&credential.length<=6000,'Preuve Google absente ou invalide. Préparez une nouvelle connexion Google.');
    const proof=await exchange('verifierJetonGoogleCDQ',[credential,challenge.challengeId],'La preuve Google a été refusée ou sa réponse est inconnue.');
    current();credential='';
    check(proof?.ok===true&&typeof proof.ticket==='string'&&proof.ticket.length>0&&proof.ticket.length<=300&&typeof proof.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proof.email)&&proof.role==='admin','Le serveur n’a pas confirmé le compte administrateur Google.');
    ticket=proof.ticket;
    const email=proof.email;
    const creator=await exchange('connecterAvecCodeAcces',[email,'',ticket,'',{creatorRecovery:true,action:'state'}],'La vérification du créateur a été refusée ou sa réponse est inconnue.');
    current();
    check(creator?.creatorRecovery===true&&creator.email===email,'Le serveur n’a pas confirmé ce compte comme créateur.');
    // The legacy hasPin field does not participate in Google direct sign-in.
    const direct=await exchange('obtenirEtatAcces',['',ticket],'La connexion Google directe a été refusée ou sa réponse est inconnue.');
    current();
    check(direct?.autorise===true&&direct.email===email&&direct.role==='admin'&&direct.ouvertureDirecte===true&&typeof direct.jetonSession==='string'&&direct.jetonSession.length>0&&direct.jetonSession.length<=512,'Ce déploiement n’a pas confirmé une session créateur Google directe. Préparez une nouvelle connexion Google.');
    return {email,session:direct.jetonSession};
  }finally{credential='';ticket='';}
}
export function validateCall(name,args) {
  check(Array.isArray(args),'Arguments RPC invalides.');
  if(name==='creerDefiConnexionGoogleCDQ'){check(args.length===0,'Le challenge ne prend aucun argument.');return;}
  if(name==='verifierJetonGoogleCDQ'){check(args.length===2&&typeof args[0]==='string'&&args[0].length>0&&args[0].length<=6000&&typeof args[1]==='string'&&args[1].length>0&&args[1].length<=200,'Preuve Google invalide.');return;}
  if(name==='connecterAvecCodeAcces'){
    check(args.length===5&&typeof args[0]==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args[0])&&args[1]===''&&typeof args[2]==='string'&&args[2].length>0&&args[2].length<=300&&args[3]==='','Vérification du créateur invalide.');
    closed(args[4],['creatorRecovery','action'],'Récupération');
    check(args[4].creatorRecovery===true&&args[4].action==='state','Seule la vérification du créateur est autorisée.');return;
  }
  if(name==='obtenirEtatAcces'){check(args.length===2&&args[0]===''&&typeof args[1]==='string'&&args[1].length>0&&args[1].length<=300,'La connexion Google directe exige uniquement un ticket Google et aucun identifiant d’appareil.');return;}
  check(name==='cdqRpc'&&args.length===3&&Array.isArray(args[1])&&typeof args[2]==='string'&&args[2].length>0&&args[2].length<=512,'Appel opérateur non autorisé.');
  if(args[0]==='obtenirDiagnosticApplication'){check(args[1].length===0,'Le diagnostic ne prend aucun argument.');return;}
  check(args[0]==='cdqReportEngineV2754'&&args[1].length===2,'Appel opérateur non autorisé.');
  const [action,payload]=args[1];
  if(action==='capabilities'){closed(payload,[],'Lecture des capacités');return;}
  if(action==='read'){closed(payload,['clientId','fileId'],'Lecture de liste');check(validId(payload.clientId)&&validId(payload.fileId),'Identité de lecture invalide.');return;}
  check(action==='list','Action opérateur non autorisée.');validateRepairPayload(payload);
}
export function createBridge({hostWindow,iframe,endpoint,channel,setTimer=setTimeout,clearTimer=clearTimeout,readyTimeout=20000,callTimeout=60000}) {
  check(hostWindow.location.origin===PUBLIC_ORIGIN,'Cette page doit être servie depuis l’origine GitHub CDQ autorisée.');
  validateEndpoint(endpoint);check(CHANNEL.test(channel),'Canal de connexion invalide.');
  let peer=null,peerOrigin='',sequence=0,closedBridge=false,readyResolve,readyReject;
  const pending=new Map();
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const timer=setTimer(()=>{closedBridge=true;readyReject(new Error('Le bridge Google ne répond pas après 20 secondes. Relancez la connexion.'));},readyTimeout);
  function onMessage(event){
    const data=event.data;
    if(closedBridge||!object(data)||data.protocol!==1||data.channel!==channel||!isGoogleFrameOrigin(event.origin))return;
    if(data.type==='CDQ_EMBEDDED_READY'){
      if(peer||!belongsToFrame(event.source,iframe.contentWindow))return;
      peer=event.source;peerOrigin=event.origin;clearTimer(timer);readyResolve();return;
    }
    if(data.type!=='CDQ_EMBEDDED_RESULT'||event.source!==peer||event.origin!==peerOrigin||typeof data.id!=='string'||typeof data.ok!=='boolean')return;
    const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimer(request.timer);
    if(data.ok)request.resolve(data.value);else request.reject(new Error(safeError(data.error||'Le serveur CDQ a refusé la demande.')));
  }
  hostWindow.addEventListener('message',onMessage);
  const url=new URL(endpoint);url.searchParams.set('cdq_native_bridge','1');url.searchParams.set('channel',channel);iframe.src=url.href;
  return {
    ready,
    async call(name,args){
      validateCall(name,args);await ready;check(!closedBridge&&peer,'La connexion Google est fermée.');
      const id=String(++sequence);
      return new Promise((resolve,reject)=>{
        const timeout=setTimer(()=>{pending.delete(id);reject(new Error('Délai serveur dépassé. Le résultat est inconnu : relisez l’état avant toute nouvelle réparation.'));},callTimeout);
        pending.set(id,{resolve,reject,timer:timeout});
        try{peer.postMessage({type:'CDQ_EMBEDDED_CALL',protocol:1,channel,id,name,args},peerOrigin);}
        catch{pending.delete(id);clearTimer(timeout);reject(new Error('Envoi au bridge Google impossible.'));}
      });
    },
    dispose(){closedBridge=true;clearTimer(timer);hostWindow.removeEventListener('message',onMessage);readyReject(new Error('Connexion remplacée.'));for(const request of pending.values()){clearTimer(request.timer);request.reject(new Error('Connexion fermée ; résultat à vérifier.'));}pending.clear();}
  };
}
async function sha256(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),byte=>byte.toString(16).padStart(2,'0')).join('');}
async function loadGoogleIdentity(){
  if(globalThis.google?.accounts?.id)return;
  await new Promise((resolve,reject)=>{const script=document.createElement('script');const timer=setTimeout(()=>reject(new Error('Google Identity ne répond pas après 20 secondes. Réessayez la connexion.')),20000);script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(new Error('Impossible de charger la connexion Google.'));};document.head.append(script);});
  check(globalThis.google?.accounts?.id,'Connexion Google indisponible.');
}
export function mountOperator(doc=document,win=window){
  const $=id=>doc.getElementById(id);
  let bridge=null,session='',email='',challenge=null,preparation=null,inspected=null,capabilities=null,repairResult=null,busy=false,generation=0;
  const observations={schema:'cdq-independent-operator-observations-v2755-v1',startedAt:new Date().toISOString(),target:null,authenticatedPrincipal:null,googleHealth:null,capabilities:null,preparation:null,inspections:[],repair:null,enginePublicationConfirmed:false,googleVersionVerification:'independent-manager-readback-required'};
  const message=(text,error=false)=>{$('status').textContent=text;$('status').className=error?'error':'';};
  const show=(id,value)=>{$(id).textContent=JSON.stringify(value,null,2);};
  const exportable=()=>{show('evidence-output',observations);$('download').disabled=!observations.capabilities;};
  function refresh(){
    $('prepare-google').disabled=busy;
    $('endpoint').disabled=busy||!!session;
    $('capabilities').disabled=busy||!session;
    $('preparation-file').disabled=busy||!session;
    $('inspect').disabled=busy||!session||!preparation||!capabilities;
    $('reviewed').disabled=busy||!inspected;
    $('repair').disabled=busy||!session||!capabilities||!inspected||!$('reviewed').checked;
    $('readback').disabled=busy||!session||!preparation||!observations.repair;
  }
  async function run(action){if(busy)return;busy=true;refresh();try{await action();}catch(error){if(error?.code!=='CDQ_AUTH_STALE')message(safeError(error),true);}finally{busy=false;refresh();exportable();}}
  async function rpc(action,payload){check(session,'Ouvrez une session CDQ.');return bridge.call('cdqRpc',['cdqReportEngineV2754',[action,payload],session]);}
  function clearRepair(){inspected=null;$('reviewed').checked=false;repairResult=null;observations.repair=null;observations.enginePublicationConfirmed=false;$('completion').textContent='';}
  $('prepare-google').addEventListener('click',()=>run(async()=>{
    const target=validateEndpoint($('endpoint').value.trim());
    generation++;const current=generation;const isCurrent=()=>current===generation;session='';email='';challenge=null;capabilities=null;preparation=null;clearRepair();
    $('identity').textContent='';$('google-button').replaceChildren();
    if(bridge)bridge.dispose();$('bridge-host').replaceChildren();
    const iframe=doc.createElement('iframe');iframe.title='Connexion CDQ autorisée';$('bridge-host').append(iframe);
    bridge=createBridge({hostWindow:win,iframe,endpoint:target,channel:crypto.randomUUID()+'-'+crypto.randomUUID()});
    const authBridge=bridge;
    observations.target={endpoint:target};observations.authenticatedPrincipal=null;delete observations.authenticatedAt;observations.googleHealth=null;observations.capabilities=null;observations.preparation=null;observations.inspections=[];
    for(const id of ['google-health-output','capabilities-output','preparation-output','inspection-output','repair-output'])$(id).textContent='Aucune observation.';
    message('Connexion au bridge Google existant…');await authBridge.ready;requireCurrentAuthentication(isCurrent);
    const nextChallenge=await authBridge.call('creerDefiConnexionGoogleCDQ',[]);requireCurrentAuthentication(isCurrent);challenge=nextChallenge;
    closed(challenge,['challengeId','nonce','clientId','expiresAt'],'Challenge Google');
    check(typeof challenge.challengeId==='string'&&challenge.challengeId.length>0&&challenge.challengeId.length<=200&&typeof challenge.nonce==='string'&&challenge.nonce.length>0&&typeof challenge.clientId==='string'&&/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(challenge.clientId)&&Number.isFinite(challenge.expiresAt)&&challenge.expiresAt>Date.now(),'Challenge Google invalide ou expiré.');
    await loadGoogleIdentity();requireCurrentAuthentication(isCurrent);
    globalThis.google.accounts.id.initialize({client_id:challenge.clientId,nonce:challenge.nonce,auto_select:false,ux_mode:'popup',context:'signin',callback:response=>{if(current!==generation)return;void run(async()=>{
      requireCurrentAuthentication(isCurrent);
      const credential=response?.credential;const attemptChallenge=challenge;response=null;challenge=null;$('google-button').replaceChildren();
      message('Vérification du compte Google et du créateur par CDQ…');
      const granted=await openCreatorGoogleSession({call:(name,args)=>authBridge.call(name,args),credential,challenge:attemptChallenge,isCurrent});
      requireCurrentAuthentication(isCurrent);
      session=granted.session;email=granted.email;observations.authenticatedPrincipal=email;observations.authenticatedAt=new Date().toISOString();$('identity').textContent='Compte créateur connecté : '+email;message('Session CDQ ouverte avec Google. Vous pouvez lire les capacités du moteur.');
    });}});
    globalThis.google.accounts.id.renderButton($('google-button'),{type:'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular'});
    message('Choisissez votre compte Google créateur avec le bouton de connexion.');
  }));
  $('capabilities').addEventListener('click',()=>run(async()=>{
    capabilities=null;inspected=null;$('reviewed').checked=false;observations.capabilities=null;observations.googleHealth=null;
    message('Lecture du diagnostic Google authentifié…');const healthStartedAt=new Date().toISOString();
    const diagnostic=validateGoogleDiagnostic(await bridge.call('cdqRpc',['obtenirDiagnosticApplication',[],session]),email);
    observations.googleHealth={startedAt:healthStartedAt,observedAt:new Date().toISOString(),...diagnostic};show('google-health-output',observations.googleHealth);
    message('Lecture authentifiée des capacités…');const startedAt=new Date().toISOString();const value=validateCapabilities(await rpc('capabilities',{}));
    capabilities=value;observations.capabilities={startedAt,observedAt:new Date().toISOString(),body:value};show('capabilities-output',value);message('Les douze capacités attendues sont confirmées par la réponse réelle.');
  }));
  $('preparation-file').addEventListener('change',()=>run(async()=>{
    clearRepair();preparation=null;observations.preparation=null;const file=$('preparation-file').files?.[0];check(file&&file.size<=1024*1024,'Choisissez un fichier JSON privé de moins de 1 Mo.');
    const text=await file.text();const operation=parsePreparation(text);preparation=operation;
    observations.preparation={importedAt:new Date().toISOString(),sha256:await sha256(text),operation};show('preparation-output',operation);$('preparation-summary').textContent='Préparation importée · SHA256 '+observations.preparation.sha256;message('Préparation chargée. Inspectez maintenant l’état réel de la liste.');
  }));
  async function readState(requireConflict){
    check(preparation&&capabilities,'Lisez les capacités et importez une préparation.');
    const payload=preparation.payload;const startedAt=new Date().toISOString();
    const state=validateListState(await rpc('read',{clientId:payload.clientId,fileId:payload.externalRevision.fileId}),payload);
    observations.inspections.push({startedAt,observedAt:new Date().toISOString(),body:state});show('inspection-output',state);
    if(requireConflict){inspected=null;$('reviewed').checked=false;inspected=validateInspection(state,payload);message('Identité et révision divergente confirmées. Relisez les valeurs du PDF avant de lancer la réparation.');}
    else{observations.enginePublicationConfirmed=publicationConfirmed(state,repairResult);$('completion').textContent=observations.enginePublicationConfirmed?'Le moteur confirme la publication de la génération réparée. Les contrôles de la sauvegarde et du PDF Drive restent à consigner séparément.':'La publication finale n’est pas encore confirmée par le moteur. Relisez l’état dans un instant.';message('État réel relu.');}
  }
  $('inspect').addEventListener('click',()=>run(async()=>{inspected=null;$('reviewed').checked=false;message('Inspection en lecture seule…');await readState(true);}));
  $('reviewed').addEventListener('change',refresh);
  $('repair').addEventListener('click',()=>run(async()=>{
    check(inspected&&capabilities&&preparation&&$('reviewed').checked,'L’inspection et la relecture des valeurs sont requises.');
    const payload=validateRepairPayload(preparation.payload);validateInspection(inspected,payload);inspected=null;$('reviewed').checked=false;
    const startedAt=new Date().toISOString();observations.repair={startedAt,request:clone(payload),status:'requested-result-unknown'};exportable();message('Réparation explicite en cours : sauvegarde exacte, puis demande au moteur…');
    const value=validateListState(await rpc('list',payload),payload);check(value.repaired===true&&value.repair,'Le serveur n’a pas confirmé le reçu de réparation.');
    repairResult=value;observations.repair={...observations.repair,observedAt:new Date().toISOString(),status:'acknowledged',body:value};show('repair-output',value);message('Réparation acquittée. Relisez l’état pour confirmer la publication de la génération.');
  }));
  $('readback').addEventListener('click',()=>run(async()=>{message('Relecture de l’état après réparation…');await readState(false);}));
  $('download').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(observations,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=doc.createElement('a');anchor.href=url;anchor.download='cdq-operator-observations-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  if(win.location.origin!==PUBLIC_ORIGIN){message('Servez cet outil sur l’origine GitHub CDQ autorisée avant toute connexion.',true);$('prepare-google').disabled=true;}
  else refresh();
  return {dispose(){generation++;bridge?.dispose();session='';email='';challenge=null;}};
}
if(typeof document!=='undefined'&&document.getElementById('operator-app'))mountOperator();
