import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const client=()=>{try{return String(compagnieSelectionnee||'');}catch{return '';}};
let currentDialog=null,dialogClient='',epoch=0;
const close=()=>{epoch++;currentDialog?.close();currentDialog?.remove();currentDialog=null;};
async function open(){
 close();const stamp=epoch,id=client(),owner=calibrationIdentity().email;
 const valid=()=>stamp===epoch&&id===client()&&owner===calibrationIdentity().email&&window.cdqDriveEntryV2632?.canRead();
 const dialog=document.createElement('dialog');currentDialog=dialog;dialogClient=id;dialog.style.cssText='max-width:640px;width:calc(100% - 48px);border-radius:14px;padding:24px;background:#14232e;color:#fff;border:1px solid #79c8db';
 const title=document.createElement('h2'),status=document.createElement('p'),actions=document.createElement('div');title.textContent='Page client';status.textContent='Préparation du lien…';status.setAttribute('role','status');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='font:inherit;padding:10px;border-radius:7px;cursor:pointer';b.onclick=fn;actions.append(b);return b;};
 button('Fermer',close);dialog.append(title,status,actions);document.body.append(dialog);dialog.addEventListener('cancel',close);dialog.showModal();
 try{
  const result=await calibrationRpc('cdqReportEngineV2754','portalLink',{clientId:id});if(!valid())return close();
  const url=new URL(result.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.workers.dev')||url.pathname!=='/client/'||!/^#[a-f0-9]{32}\.[a-f0-9]{64}$/.test(url.hash))throw Error('Le lien client retourné est invalide.');
  status.textContent='Ce lien et son code QR donnent accès aux PDF finaux de ce client. Toute personne qui les reçoit peut consulter ces documents.';
  const input=document.createElement('input');input.type='text';input.readOnly=true;input.value=url.href;input.setAttribute('aria-label','Lien privé de la page client');input.style.cssText='width:100%;box-sizing:border-box;padding:10px;margin:10px 0';dialog.insertBefore(input,actions);
  button('Copier le lien',async()=>{try{await navigator.clipboard.writeText(url.href);if(valid())status.textContent='Lien copié.';}catch{input.focus();input.select();status.textContent='Sélectionnez puis copiez le lien affiché.';}});
  button('Ouvrir',()=>window.open(url.href,'_blank','noopener,noreferrer'));
  button('Code QR',async()=>{try{const {default:qrcode}=await import('./qrcode-generator-1.4.4.mjs');if(!valid())return;const qr=qrcode(0,'M');qr.addData(url.href);qr.make();let holder=dialog.querySelector('[data-qr]');if(!holder){holder=document.createElement('div');holder.dataset.qr='';holder.style.cssText='background:#fff;color:#000;width:fit-content;margin-top:16px;padding:8px';dialog.append(holder);}holder.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});holder.setAttribute('aria-label','Code QR du lien privé du client');}catch(error){if(valid())status.textContent=error.message;}});
  button('Reprendre les copies en attente',async()=>{status.textContent='Vérification des copies en attente…';try{const r=await calibrationRpc('cdqReportEngineV2754','portalRetry',{clientId:id});if(valid())status.textContent=r.resumed+' envoi(s) repris et copiés.';}catch(error){if(valid())status.textContent=error.message;}});
  button('Révoquer le lien',()=>{status.textContent='Révoquer empêchera toute personne utilisant ce lien d’accéder au portail. Les PDF restent conservés.';const confirm=button('Confirmer la révocation',async()=>{confirm.disabled=true;try{await calibrationRpc('cdqReportEngineV2754','portalRevoke',{clientId:id});if(valid()){input.value='';actions.replaceChildren();button('Fermer',close);status.textContent='Lien révoqué.';}}catch(error){if(valid())status.textContent=error.message;confirm.disabled=false;}});});
 }catch(error){if(valid()){status.textContent=error.message;if(/PORTAL_REVOKED|PORTAL_KEY_CHANGED/.test(error.message))button('Créer un nouveau lien',async()=>{try{await calibrationRpc('cdqReportEngineV2754','portalRenew',{clientId:id});if(valid())open();}catch(e){if(valid())status.textContent=e.message;}});}}
}
async function install(){const id=client(),account=calibrationIdentity().email,host=document.getElementById('cdqClientActionsV2640');if(!host||!id||!['admin','technicien'].includes(calibrationIdentity().role))return;const capable=await window.cdqReportEngineSelectorV2754?.capabilities?.();if(id!==client()||account!==calibrationIdentity().email||capable?.clientPortalProtocol!==1)return;if(!document.getElementById('cdqClientPortalButton20261028')){const b=document.createElement('button');b.id='cdqClientPortalButton20261028';b.type='button';b.textContent='Page client';b.onclick=open;host.append(b);}}
window.addEventListener('cdq:client-content-ready-v2745',()=>{if(currentDialog&&dialogClient!==client())close();install().catch(()=>{});});
window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')close();});
window.addEventListener('cdq:drive-cleared-v2632',close);
install().catch(()=>{});
