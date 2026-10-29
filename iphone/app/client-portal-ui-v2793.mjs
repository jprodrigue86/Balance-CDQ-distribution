// CDQ 27.93 — client portal: reserved action slot, clear controls and full-size QR.
// No new Drive API behavior; existing portalLink/retry/revoke/renew calls are preserved.
import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const client=()=>{try{return String(compagnieSelectionnee||'')}catch{return ''}};
const identity=()=>calibrationIdentity();
const permitted=()=>['admin','technicien'].includes(identity().role);
const isMobile=()=>document.documentElement.matches('.android,.ios,.mobile-device')||
 (!document.documentElement.classList.contains('cdq-desktop-v2676')&&window.matchMedia?.('(max-width:899px)').matches);
let currentDialog=null,dialogClient='',epoch=0,qualification=0;
function close(){
 epoch++;const dlg=currentDialog;currentDialog=null;dialogClient='';
 if(dlg){try{if(dlg.open)dlg.close()}catch{}dlg.remove()}
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
 close();const stamp=epoch,id=client(),owner=identity().email;
 if(!id||!owner||!permitted())return;
 const valid=()=>stamp===epoch&&id===client()&&owner===identity().email&&window.cdqDriveEntryV2632?.canRead();
 const dlg=document.createElement('dialog');dlg.className='cdq-portal-dialog-v2793';
 currentDialog=dlg;dialogClient=id;
 const head=document.createElement('header');head.className='cdq-portal-head-v2793';
 const title=document.createElement('h2');title.textContent='Page client';
 head.append(title,button('Fermer',close));
 const body=document.createElement('section');body.className='cdq-portal-body-v2793';
 const status=document.createElement('p');status.className='cdq-portal-status-v2793';status.setAttribute('role','status');status.textContent='Préparation du lien privé…';
 const actions=document.createElement('div');actions.className='cdq-portal-actions-v2793';
 body.append(status,actions);dlg.append(head,body);document.body.append(dlg);
 dlg.addEventListener('cancel',event=>{event.preventDefault();close()});dlg.showModal();
 try{
  const response=await calibrationRpc('cdqReportEngineV2754','portalLink',{clientId:id});
  if(!valid())return close();
  const url=safeUrl(response.url);
  status.textContent='Ce lien donne accès aux PDF finaux du client. Transmets-le seulement aux personnes autorisées.';
  const input=document.createElement('input');input.type='text';input.readOnly=true;input.value=url.href;
  input.setAttribute('aria-label','Lien privé de la page client');body.insertBefore(input,actions);
  actions.append(
   button('Copier le lien',async()=>{try{await navigator.clipboard.writeText(url.href);if(valid())status.textContent='Lien copié.'}catch{input.focus();input.select();status.textContent='Sélectionne puis copie le lien affiché.'}},'cdq-portal-primary-v2793'),
   button('Ouvrir',()=>window.open(url.href,'_blank','noopener,noreferrer')),
   button('Code QR',async()=>{
    try{
     const {default:qrcode}=await import('./qrcode-generator-1.4.4.mjs');if(!valid())return;
     const qr=qrcode(0,'M');qr.addData(url.href);qr.make();
     let holder=body.querySelector('[data-cdq-qr-v2793]');
     if(!holder){holder=document.createElement('div');holder.dataset.cdqQrV2793='';holder.className='cdq-portal-qr-v2793';holder.setAttribute('aria-label','Code QR de la page client');body.append(holder)}
     holder.innerHTML=qr.createSvgTag({cellSize:5,margin:18,scalable:true,alt:'Code QR du client'});
     holder.hidden=false;holder.scrollIntoView({block:'nearest',behavior:'auto'});
    }catch(error){if(valid())status.textContent=error.message}
   })
  );
  const retry=button('Reprendre les copies en attente',async()=>{
   retry.disabled=true;status.textContent='Vérification des copies en attente…';
   try{const r=await calibrationRpc('cdqReportEngineV2754','portalRetry',{clientId:id});if(valid())status.textContent=r.resumed+' copie(s) reprises.'}
   catch(error){if(valid())status.textContent=error.message}
   finally{retry.disabled=false}
  },'cdq-portal-utility-v2793');body.append(retry);
  const danger=document.createElement('details');danger.className='cdq-portal-revoke-v2793';
  const summary=document.createElement('summary');summary.textContent='Révoquer le lien';
  const info=document.createElement('p');info.textContent='Le lien cessera de fonctionner. Les PDF resteront conservés.';
  const confirm=button('Confirmer la révocation',async()=>{
   confirm.disabled=true;
   try{await calibrationRpc('cdqReportEngineV2754','portalRevoke',{clientId:id});if(valid()){input.value='';actions.replaceChildren();retry.remove();danger.remove();status.textContent='Lien révoqué.'}}
   catch(error){if(valid())status.textContent=error.message;confirm.disabled=false}
  });
  danger.append(summary,info,confirm);body.append(danger);
 }catch(error){
  if(valid()){status.textContent=error.message;
   if(/PORTAL_REVOKED|PORTAL_KEY_CHANGED/.test(error.message))
    actions.append(button('Créer un nouveau lien',async()=>{
     try{await calibrationRpc('cdqReportEngineV2754','portalRenew',{clientId:id});if(valid())open()}
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
  const art='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="cdqPortalV2793" x2="1" y2="1"><stop stop-color="#d5e2ed"/><stop offset=".6" stop-color="#4b829d"/><stop offset="1" stop-color="#152733"/></linearGradient></defs><path d="M3 57v-9a13 13 0 0 1 13-13h11a13 13 0 0 1 13 13v9" fill="#18425a" stroke="#79c5e2" stroke-width="2.5"/><path d="M31 56v-9a11 11 0 0 1 11-11h7a12 12 0 0 1 12 12v8" fill="#1b3951" stroke="#79c5e2" stroke-width="2"/><path d="M11 16q1-13 15-13 15 0 15 13l-3 11-5 4v5H18v-5l-5-4z" fill="url(#cdqPortalV2793)" stroke="#bad3dc" stroke-width="1.8"/><path d="M39 14q3-8 12-5 7 3 6 13l-3 10-9 2-7-5z" fill="#9babb7" stroke="#b5d7e8" stroke-width="1.5"/><path d="m16 19 8-3 3 7-6 3zm20 0-8-3-3 7 6 3z" fill="#101b29"/><path d="M23 29h7l-4 4z" fill="#142234"/><path d="m42 20 5-2 3 4-5 3z" fill="#13212f"/></svg>';
  if(b.dataset.cdqPortalArtV2793!=='1'){b.replaceChildren();
  const visual=document.createElement('span');visual.className='cdq-action-art-v2655';visual.setAttribute('aria-hidden','true');visual.innerHTML=art||'▤';
  const label=document.createElement('span');label.textContent='Page client';b.append(visual,label);b.dataset.cdqPortalArtV2793='1';}
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
 const capability=await window.cdqReportEngineSelectorV2754?.capabilities?.();
 if(seq!==qualification||id!==client()||owner!==identity().email)return;
 b.disabled=capability?.clientPortalProtocol!==1;b.title=b.disabled?'Portail indisponible':'Ouvrir la page client';
}
function schedule(){place();install().catch(()=>{})}
window.addEventListener('cdq:client-content-ready-v2745',()=>{if(currentDialog&&dialogClient!==client())close();schedule()});
window.addEventListener('cdq:folder-render-v2627',schedule);
window.addEventListener('cdq:access-ready',schedule);
window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')close()});
window.addEventListener('cdq:drive-cleared-v2632',close);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
