// CDQ 27.93 — client portal: reserved action slot, clear controls and full-size QR.
// No new Drive API behavior; existing portalLink/retry/revoke/renew calls are preserved.
import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const client=()=>{try{return String(compagnieSelectionnee||'')}catch{return ''}};
const identity=()=>calibrationIdentity();
const permitted=()=>['admin','technicien'].includes(identity().role);
const isMobile=()=>document.documentElement.matches('.android,.ios,.mobile-device')||
 (!document.documentElement.classList.contains('cdq-desktop-v2676')&&window.matchMedia?.('(max-width:899px)').matches);
let currentDialog=null,dialogClient='',epoch=0,qualification=0;
let capabilityCache=null,returnFocus=null,dialogOwner='';
function forgetPrivateLink(){} // V28.15: no private-link cache or background issuance.
function portalLinkPromise(id){return calibrationRpc('cdqReportEngineV2754','portalLink',{clientId:id});}
const afterPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
const clientName=()=>{try{return String(nomCompagnieSelectionnee||'Client sélectionné')}catch{return 'Client sélectionné'}};
function portalCapabilities(owner){
 if(capabilityCache?.owner===owner&&Date.now()<capabilityCache.until)return capabilityCache.promise;
 const promise=Promise.resolve().then(()=>window.cdqReportEngineSelectorV2754?.capabilities?.())
 .catch(error=>{if(capabilityCache?.promise===promise)capabilityCache=null;throw error;});
 capabilityCache={owner,promise,until:Date.now()+120000};
 return promise;
}
function close(){
 epoch++;const dlg=currentDialog;currentDialog=null;dialogClient='';dialogOwner='';
 if(dlg){try{if(dlg.open)dlg.close()}catch{}dlg.remove();if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;}
}
function button(label,handler,cssClass=''){
 const b=document.createElement('button');b.type='button';b.textContent=label;
 if(cssClass)b.className=cssClass;b.onclick=handler;return b;
}
function safeUrl(raw){
 const u=new URL(raw);
 if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||u.pathname!=='/client/'||
 !/^#[a-f0-9]{32}\.[a-f0-9]{64}$/.test(u.hash))throw Error('Le lien client retourné est invalide.');
 return u;
}
async function open(){
 const openedAt=performance.now();
 close();const stamp=epoch,id=client(),owner=identity().email;
 if(!id||!owner||!permitted()||!window.cdqDriveEntryV2632?.canRead())return;
 const valid=()=>stamp===epoch&&id===client()&&owner===identity().email&&permitted()&&window.cdqDriveEntryV2632?.canRead();
 const dlg=document.createElement('dialog');dlg.className='cdq-portal-dialog-v2793';
 returnFocus=document.activeElement;currentDialog=dlg;dialogClient=id;dialogOwner=owner;dlg.setAttribute('aria-labelledby','cdqPortalTitleV2815');
 const head=document.createElement('header');head.className='cdq-portal-head-v2793';
 const title=document.createElement('h2');title.id='cdqPortalTitleV2815';title.textContent='Page client';
 head.append(title,button('Fermer',close));
 const body=document.createElement('section');body.className='cdq-portal-body-v2793';
 const context=document.createElement('p');context.className='cdq-portal-context-v2815';context.textContent=clientName();body.append(context);
 const status=document.createElement('p');status.className='cdq-portal-status-v2793';status.setAttribute('role','status');status.textContent='Lecture du lien privé…';
 const actions=document.createElement('div');actions.className='cdq-portal-actions-v2793';
 const linkSection=document.createElement('section');linkSection.className='cdq-portal-group-v2815';
 const linkTitle=document.createElement('h3');linkTitle.textContent='Partager la page';linkSection.append(linkTitle,status,actions);
 body.append(linkSection);dlg.append(head,body);document.body.append(dlg);
 dlg.addEventListener('cancel',event=>{event.preventDefault();close()});dlg.showModal();head.querySelector('button').focus();
 window.dispatchEvent(new CustomEvent('cdq:portal-timing-v2866',{detail:{phase:'menu-visible',ms:performance.now()-openedAt}}));
 dlg.addEventListener('click',event=>{if(event.target===dlg){const r=dlg.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
 // App-only controls appear immediately. The private link can load in parallel.
 const manage=button('Gérer les PDF',async()=>{
  if(!valid())return;
  manage.disabled=true;
  try{
   const {openPortalManagementV2804}=await import('./client-portal-manage-v2804.mjs');
   if(valid())await openPortalManagementV2804({body,clientId:id,valid,rpc:calibrationRpc});
  }catch(error){if(valid())status.textContent=error?.message||'Gestion des PDF indisponible.'}
  finally{if(valid())manage.disabled=false}
 },'cdq-portal-primary-v2793');
 const publish=button('Publier les rapports sélectionnés',()=>{
  if(!valid())return;
  const confirm=window.ouvrirConfirmation;
  if(typeof confirm!=='function'){status.textContent='La confirmation de publication est indisponible. Rechargez l’application.';return;}
  // The existing confirmation validates the selection and resets publish=true/email=false.
  // Closing this dialog returns an empty selection to the client file list.
  close();confirm();
 },'cdq-portal-primary-v2793');
 const publicationHelp=document.createElement('p');publicationHelp.textContent='Sélectionnez les rapports dans le dossier du client, puis confirmez leur publication ici. Les PDF enregistrés dans Drive restent privés tant que vous ne les publiez pas. Aucun courriel n’est envoyé par défaut.';
 const management=document.createElement('section');management.className='cdq-portal-group-v2815';const managementTitle=document.createElement('h3');managementTitle.textContent='Documents du client';const regroup=button('Corriger le classement des visites',async()=>{
 if(!valid()||regroup.disabled)return;regroup.disabled=true;
 try{const {openVisitRegroup}=await import('./portal-visit-regroup-ui.mjs');if(valid())await openVisitRegroup({body,clientId:id,valid,rpc:calibrationRpc});}
 catch(error){if(valid())status.textContent=error.message||'Correction indisponible.';}finally{if(valid())regroup.disabled=false;}
 });management.append(managementTitle,publicationHelp,publish,manage,regroup);body.append(management);
 const retryRead=button('Réessayer la lecture',()=>{if(valid())open()});retryRead.hidden=true;linkSection.append(retryRead);
 try{
  await afterPaint();if(!valid())return;
  if(navigator.onLine===false){status.textContent='Hors ligne. Reconnectez-vous pour consulter le lien actuel.';retryRead.hidden=false;return;}
  const response=await portalLinkPromise(id,owner);
  if(!valid())return;
  const url=safeUrl(response.url);
  window.dispatchEvent(new CustomEvent('cdq:portal-timing-v2866',{detail:{phase:'link-ready',ms:performance.now()-openedAt}}));
  status.textContent='Ce lien donne accès aux PDF finaux du client. Transmets-le seulement aux personnes autorisées.';
  const input=document.createElement('input');input.type='text';input.readOnly=true;input.value=url.href;
  input.setAttribute('aria-label','Lien privé de la page client');linkSection.insertBefore(input,actions);
  actions.append(
   button('Copier le lien',async()=>{if(!valid())return;try{await navigator.clipboard.writeText(url.href);if(valid())status.textContent='Lien copié.'}catch{if(!valid())return;input.focus();input.select();status.textContent='Sélectionne puis copie le lien affiché.'}},'cdq-portal-primary-v2793'),
   button('Ouvrir la page',()=>{if(!valid())return;
     // V28.06 native Android opens this authenticated portal as a Custom Tab.
     // Chrome handles the portal's blob: PDF viewer; CDQ remains intact underneath.
     const native=window.BalanceCDQNative;
     if(navigator.userAgent.includes('BalanceCDQAndroid/') &&
        typeof native?.openClientPortalV2806==='function'){
       native.openClientPortalV2806(url.href);
       return;
     }
     window.open(url.href,'_blank','noopener,noreferrer');
    }),
   button('Code QR',async()=>{if(!valid())return;
    try{
     const {renderBrandedQrV2846}=await import('./qr-brand-v2846.mjs');if(!valid())return;
     let holder=body.querySelector('[data-cdq-qr-v2793]');
     if(!holder){holder=document.createElement('div');holder.dataset.cdqQrV2793='';holder.className='cdq-portal-qr-v2793';holder.setAttribute('aria-label','Code QR de la page client');body.append(holder)}
     await renderBrandedQrV2846(holder,url.href,'Code QR du client');if(!valid())return;
     holder.hidden=false;holder.scrollIntoView({block:'nearest',behavior:'auto'});
    }catch(error){if(valid())status.textContent=error.message}
   })
  );
  const retry=button('Reprendre les copies en attente',async()=>{
   if(!valid()||retry.disabled)return;
   if(!window.confirm('Reprendre les copies en attente de ce client ? Aucun courriel ne sera renvoyé.'))return;
   retry.disabled=true;status.textContent='Vérification des copies en attente…';
   try{const r=await calibrationRpc('cdqReportEngineV2754','portalRetry',{clientId:id});if(!r||r.ok!==true||!Number.isSafeInteger(r.resumed)||r.resumed<0)throw Error('La reprise n’a pas été confirmée.');if(valid())status.textContent=r.resumed+' copie(s) reprises.'}
   catch(error){if(valid())status.textContent=error.message}
   finally{retry.disabled=false}
  },'cdq-portal-utility-v2793');
  const advanced=document.createElement('details');advanced.className='cdq-portal-advanced-v2866';const advancedTitle=document.createElement('summary');advancedTitle.textContent='Options avancées';advanced.append(advancedTitle,retry);body.append(advanced);
  const danger=document.createElement('details');danger.className='cdq-portal-revoke-v2793';
  const summary=document.createElement('summary');summary.textContent='Révoquer le lien';
  const info=document.createElement('p');info.textContent='Le lien cessera de fonctionner. Les PDF resteront conservés.';
  const confirm=button('Confirmer la révocation',async()=>{
   if(!valid())return;confirm.disabled=true;
   try{const receipt=await calibrationRpc('cdqReportEngineV2754','portalRevoke',{clientId:id});if(receipt?.ok!==true)throw Error('La révocation n’a pas été confirmée.');if(valid()){forgetPrivateLink();input.value='';actions.replaceChildren();advanced.remove();body.querySelector('[data-cdq-qr-v2793]')?.remove();status.textContent='Lien révoqué.'}}
   catch(error){if(valid())status.textContent=error.message;confirm.disabled=false}
  });
  danger.append(summary,info,confirm);advanced.append(danger);
 }catch(error){
  if(valid()){status.textContent=error?.message||'Lecture indisponible.';retryRead.hidden=false;
   if(/PORTAL_REVOKED|PORTAL_KEY_CHANGED/.test(error.message))
    actions.append(button('Créer un nouveau lien',async()=>{
     if(!valid())return;try{await calibrationRpc('cdqReportEngineV2754','portalRenew',{clientId:id});forgetPrivateLink();if(valid())open()}
     catch(e){if(valid())status.textContent=e.message}
    }));
  }
 }
}
function place(){
 const id=client(),account=identity().email,allowed=permitted();
 const host=document.getElementById('cdqClientActionsV2640');
 const top=document.getElementById('cdqTopActionsV2204');
 const target=isMobile()&&top?top:host;
 if(!target)return null;
 let b=document.getElementById('cdqClientPortalButton20261028');
 if(!b){b=document.createElement('button');b.id='cdqClientPortalButton20261028';b.type='button';b.onclick=open}
 const mobile=target===top;
 b.classList.toggle('cdq-top-action',mobile);b.classList.toggle('cdq-client-portal-top-v2793',mobile);
 if(mobile){
  const theme=window.cdqIconThemesV2514?.getStyle?.()||'current';
  const art=window.cdqMaterialIconV2799?.('portal',theme)||'<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="cdqPortalV2793" x2="1" y2="1"><stop stop-color="#d5e2ed"/><stop offset=".6" stop-color="#4b829d"/><stop offset="1" stop-color="#152733"/></linearGradient></defs><path d="M3 57v-9a13 13 0 0 1 13-13h11a13 13 0 0 1 13 13v9" fill="#18425a" stroke="#79c5e2" stroke-width="2.5"/><path d="M31 56v-9a11 11 0 0 1 11-11h7a12 12 0 0 1 12 12v8" fill="#1b3951" stroke="#79c5e2" stroke-width="2"/><path d="M11 16q1-13 15-13 15 0 15 13l-3 11-5 4v5H18v-5l-5-4z" fill="url(#cdqPortalV2793)" stroke="#bad3dc" stroke-width="1.8"/><path d="M39 14q3-8 12-5 7 3 6 13l-3 10-9 2-7-5z" fill="#9babb7" stroke="#b5d7e8" stroke-width="1.5"/><path d="m16 19 8-3 3 7-6 3zm20 0-8-3-3 7 6 3z" fill="#101b29"/><path d="M23 29h7l-4 4z" fill="#142234"/><path d="m42 20 5-2 3 4-5 3z" fill="#13212f"/></svg>';
  if(b.dataset.cdqPortalArtV2793!==theme+'|2799'){b.replaceChildren();
  const visual=document.createElement('span');visual.className='cdq-action-art-v2655';visual.setAttribute('aria-hidden','true');visual.innerHTML=art||'▤';
  const label=document.createElement('span');label.textContent='Page client';b.append(visual,label);b.dataset.cdqPortalArtV2793=theme+'|2799';}
 }else if(b.textContent!=='Page client'){b.textContent='Page client';delete b.dataset.cdqPortalArtV2793;}
 b.disabled=!id||!account||!allowed;b.title=b.disabled?'Choisir un client autorisé':'Ouvrir la page client';
 if(mobile){if(b.parentElement!==target)target.append(b);}
 else {
  // Keep Page client immediately after Nouveau rapport and before the PC search.
  const search=target.querySelector('.cdq-pc-file-search');
  if(b.parentElement!==target||b.nextElementSibling!==(search||null))target.insertBefore(b,search||null);
 }
 return b;
}
async function install(){
 const b=place(),id=client(),owner=identity().email,seq=++qualification;
 if(!b||!id||!owner||!permitted())return;
 const capability=await portalCapabilities(owner);
 if(seq!==qualification||id!==client()||owner!==identity().email)return;
 b.disabled=capability?.clientPortalProtocol!==1;b.title=b.disabled?'Portail indisponible':'Ouvrir la page client';
}
function schedule(){if(currentDialog&&(dialogClient!==client()||dialogOwner!==identity().email||!permitted()||!window.cdqDriveEntryV2632?.canRead()))close();place();install().catch(()=>{})}
window.addEventListener('cdq:client-content-ready-v2745',()=>{if(currentDialog&&dialogClient!==client())close();schedule()});
window.addEventListener('cdq:folder-render-v2627',schedule);
window.addEventListener('cdq:client-renamed',event=>{if(String(event.detail?.clientId||'')===client()){forgetPrivateLink();close();schedule()}});
document.addEventListener('cdq:icons-changed',place);
window.addEventListener('cdq:access-ready',schedule);
window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready'){forgetPrivateLink();capabilityCache=null;close()}});
window.addEventListener('cdq:drive-cleared-v2632',()=>{forgetPrivateLink();capabilityCache=null;close()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
