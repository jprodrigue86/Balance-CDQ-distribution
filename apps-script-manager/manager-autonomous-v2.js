/* CDQ Manager V59 addon: one-time Google OAuth offline setup.
 * Existing browser pairing remains unchanged. No Google access or refresh token
 * ever crosses the browser-to-worker message; Google handles OAuth directly.
 */
(() => {
 'use strict';
 const API='https://cdq-manager-autonomous.balance-cdq.workers.dev';
 const STORAGE='cdq_manager_remote_pair_v1';
 const PROJECT='1udMG-jQcBAwBAwk6kSEZ660JWo5n7nVvnq24lp2T4RDV5pfXe8QDlPdf';
 const $=id=>document.getElementById(id);
 const client=()=>{
  try{const p=JSON.parse(localStorage.getItem(STORAGE)||'null');
   if(p&&p.projectId===PROJECT&&/^[A-Za-z0-9_-]{16,96}$/.test(p.clientId)&&/^[a-f0-9]{64}$/.test(p.clientSecret))return p;
  }catch(_){}
  return null;
 };
 function state(text,bad=false){
  const out=$('cdqAutonomousStatus');
  if(out){out.textContent=text;out.style.color=bad?'#efab9c':'#91dfce';}
 }
 async function call(path,method='GET'){
  const c=client();if(!c)throw Error('ASSOCIATION_REQUISE');
  const r=await fetch(API+path,{method,cache:'no-store',redirect:'error',credentials:'omit',
   headers:{authorization:'Bearer '+c.clientSecret,'x-cdq-client-id':c.clientId,'content-type':'application/json'},
   body:method==='POST'?'{}':undefined
  });
  const body=await r.json();
  if(!r.ok){const e=new Error(body?.error||('HTTP_'+r.status));e.data=body;throw e;}
  return body;
 }
 async function refresh(){
  try{
   const s=await call('/v2/status');
   const connect=$('cdqAutonomousConnect'),disconnect=$('cdqAutonomousDisconnect');
   if(connect)connect.disabled=!s.oauthConfigured||s.connected;
   if(disconnect)disconnect.disabled=!s.connected;
   if(s.connected)state('Accès permanent autorisé pour '+s.account+' — le Manager peut être fermé.');
   else if(!s.oauthConfigured)state('Connexion permanente en préparation : configuration Google Cloud requise.',true);
   else state('Prêt pour l’autorisation Google initiale. Tu n’auras pas besoin de garder Chrome ouvert.');
  }catch(e){state('État du service autonome indisponible : '+String(e.message||e),true);}
 }
 async function connect(){
  const c=client();if(!c){state('Associe d’abord le Manager au pont privé.',true);return;}
  try{
   state('Préparation de l’autorisation Google…');
   const v=await call('/v2/oauth/start','POST');
   if(!v.authorizationUrl||!v.authorizationUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'))throw Error('GOOGLE_AUTH_URL_INVALID');
   // Navigate the same tab. OAuth runs at Google; no password or token comes here.
   location.assign(v.authorizationUrl);
  }catch(e){
   state(e.message==='google_oauth_not_configured'
    ?'Google Cloud doit encore autoriser le relais et son secret côté Cloudflare.'
    :'Connexion autonome impossible : '+String(e.message||e),true);
  }
 }
 async function disconnect(){
  if(!client())return;
  if(!confirm('Désactiver la connexion permanente Google du CDQ Manager ?'))return;
  try{await call('/v2/oauth/disconnect','POST');state('Accès Google permanent désactivé.');await refresh();}
  catch(e){state('Désactivation non confirmée : '+String(e.message||e),true);}
 }
 function mount(){
  if($('cdqAutonomousPanel')||!$('quickCard'))return;
  const el=document.createElement('section');el.className='card';el.id='cdqAutonomousPanel';
  el.innerHTML='<div class="section-title"><span>☁</span><h2>Connexion autonome — sans ouvrir Chrome</h2></div>'+
   '<p class="muted">Une autorisation Google initiale permet au serveur privé CDQ de renouveler la connexion et d’exécuter les commandes autorisées, même lorsque ce Manager est fermé. Aucune modification de Balance CDQ n’est effectuée lors de l’association.</p>'+
   '<p id="cdqAutonomousStatus" class="muted" role="status">Vérification de la connexion…</p>'+
   '<div class="actions two"><button type="button" class="primary" id="cdqAutonomousConnect">Activer l’accès permanent Google</button>'+
   '<button type="button" class="secondary" id="cdqAutonomousDisconnect">Désactiver l’accès permanent</button></div>'+
   '<p class="safe-note">La connexion peut être révoquée ici. Les modifications de production restent soumises au périmètre autorisé et aux protections de version et de sauvegarde.</p>';
  const parent=$('cdqRemotePanel')||$('quickCard');
  parent.insertAdjacentElement('afterend',el);
  $('cdqAutonomousConnect').addEventListener('click',()=>void connect());
  $('cdqAutonomousDisconnect').addEventListener('click',()=>void disconnect());
  void refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
