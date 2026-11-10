import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const fields=[['label','Nom du site',120],['adresse','Numéro et rue',200],['complement','Unité ou complément',120],['ville','Ville',120],['province','Province',80],['codePostal','Code postal',24],['pays','Pays',80],['telephone','Téléphone',60]];
export function renderClientContacts({body,status,clientId,clientName,isCurrent,setBusy}){
 const owner=calibrationIdentity().email;
 const current=()=>isCurrent()&&owner&&calibrationIdentity().email===owner&&window.cdqDriveEntryV2632?.canRead();
 let revision=null,sites=[],selected='',pending=null,saving=false,updatedAt='',updatedBy='';
 const host=document.createElement('form');host.className='cdq-client-contacts-v2866';
 const intro=document.createElement('p');intro.textContent='Les nouveaux rapports utiliseront le site sélectionné. Les rapports existants conservent leurs coordonnées.';
 const label=document.createElement('label');label.textContent='Site';const select=document.createElement('select');select.setAttribute('aria-label','Site');label.append(select);
 const add=document.createElement('button');add.type='button';add.textContent='Ajouter un site';add.disabled=true;
 const grid=document.createElement('div');grid.className='cdq-contact-fields-v2866';const inputs={};
 for(const [key,title,max]of fields){const l=document.createElement('label');l.textContent=title;const i=document.createElement('input');i.name=key;i.maxLength=max;i.type=key==='telephone'?'tel':'text';i.disabled=true;i.autocomplete='off';i.placeholder='À confirmer';l.append(i);grid.append(l);inputs[key]=i;}
 const save=document.createElement('button');save.type='submit';save.textContent='Enregistrer les coordonnées';save.disabled=true;
 const verificationLabel=document.createElement('label');verificationLabel.textContent='État de l’adresse';
 const verification=document.createElement('select');verification.name='verification';
 for(const [value,title]of [['a-confirmer','À confirmer'],['verifiee','Vérifiée'],['non-trouvee','Non trouvée']]){const option=document.createElement('option');option.value=value;option.textContent=title;verification.append(option);}verificationLabel.append(verification);
 const sourceLabel=document.createElement('label');sourceLabel.textContent='Source de l’adresse';const source=document.createElement('input');source.name='source';source.maxLength=500;source.placeholder='Confirmation du client, document ou lien';sourceLabel.append(source);
 const verificationInfo=document.createElement('p');
 const reload=document.createElement('button');reload.type='button';reload.textContent='Recharger la fiche';reload.hidden=true;
 const info=document.createElement('p');info.setAttribute('role','status');
 host.append(intro,label,add,grid,verificationLabel,sourceLabel,verificationInfo,save,reload,info);body.replaceChildren(host);
 const guard=()=>{if(!current()||!host.isConnected)throw Error('Le client ou le compte a changé. Rouvrez la fiche.');};
 const capture=()=>{const site=sites.find(s=>s.id===selected);if(site){for(const[key]of fields)site[key]=inputs[key].value;site.verification=verification.value;site.source=source.value;}};
 const display=()=>{const site=sites.find(s=>s.id===selected);select.replaceChildren();for(const s of sites){const option=document.createElement('option');option.value=s.id;option.textContent=s.label;select.append(option);}select.value=selected;for(const[key]of fields)inputs[key].value=site?.[key]||'';};
 const displayVerification=()=>{const site=sites.find(s=>s.id===selected);verification.value=site?.verification||'a-confirmer';source.value=site?.source||'';verificationInfo.textContent=site?.verifiedAt?'Adresse vérifiée le '+site.verifiedAt+' par '+site.verifiedBy:updatedAt?'Dernière modification : '+updatedAt+' par '+updatedBy:'Adresse à confirmer avant utilisation dans les nouveaux rapports.';};
 const locked=(value,navigation=true)=>{saving=value;if(navigation)setBusy(value);save.disabled=value||revision===null;add.disabled=value||revision===null||sites.length>=20;select.disabled=value||revision===null;verification.disabled=source.disabled=value||revision===null;reload.disabled=value;for(const[key]of fields)inputs[key].disabled=value||revision===null;};
 select.onchange=()=>{if(saving)return;capture();selected=select.value;pending=null;display();displayVerification();};
 host.oninput=()=>{pending=null;info.textContent='Modifications non enregistrées.';};
 add.onclick=()=>{if(saving||sites.length>=20)return;capture();selected='site-'+crypto.randomUUID();const s={id:selected};for(const[key]of fields)s[key]='';s.label='Nouveau site';sites.push(s);pending=null;display();displayVerification();locked(false);inputs.label.focus();};
 host.onsubmit=async event=>{
  event.preventDefault();if(saving||revision===null)return;
  try{guard();capture();if(sites.some(s=>!s.label.trim()))throw Error('Nommez chaque site.');
   const request=pending||(pending={expectedRevision:revision,sites:structuredClone(sites),selectedSiteId:selected,requestId:'contact-'+crypto.randomUUID()});
   locked(true);info.textContent='Enregistrement…';
   const result=await calibrationRpc('cdqEnregistrerCoordonneesClientV2866',clientId,request);guard();
   if(result?.ok!==true){if(result?.code==='CONTACT_CONFLICT'){reload.hidden=false;throw Error(result.message);}throw Error('La sauvegarde n’a pas été confirmée.');}
   if(result.clientId!==clientId||result.requestId!==request.requestId||!Number.isSafeInteger(result.revision))throw Error('Le reçu ne correspond pas à cette fiche.');
   revision=result.revision;sites=structuredClone(result.sites);selected=result.selectedSiteId;updatedAt=result.updatedAt||'';updatedBy=result.updatedBy||'';pending=null;reload.hidden=true;window.dispatchEvent(new CustomEvent('cdq:client-contact-saved-v2866',{detail:{email:owner,clientId,revision}}));display();displayVerification();info.textContent='Coordonnées enregistrées pour '+clientName+'.';
  }catch(error){if(current()&&host.isConnected)info.textContent=error.message||String(error);}
  finally{if(current()&&host.isConnected)locked(false);}
 };
 const load=()=>{locked(true,false);status('Chargement des coordonnées…',false);
 return calibrationRpc('cdqLireCoordonneesClientV2866',clientId).then(result=>{
  guard();if(result?.ok!==true||result.clientId!==clientId||!Number.isSafeInteger(result.revision)||!Array.isArray(result.sites)||!result.sites.length)throw Error('La fiche centrale n’est pas disponible sur ce serveur.');
  revision=result.revision;sites=structuredClone(result.sites);selected=result.selectedSiteId;updatedAt=result.updatedAt||'';updatedBy=result.updatedBy||'';pending=null;reload.hidden=true;display();displayVerification();info.textContent='';status('',false);
 }).catch(error=>{if(current()&&host.isConnected){reload.hidden=false;status(error.message||String(error),true);}}).finally(()=>{if(current()&&host.isConnected)locked(false,false);});};
 reload.onclick=()=>{if(saving)return;guard();if(revision!==null&&!window.confirm('Recharger les coordonnées enregistrées et abandonner les modifications de cette fiche ?'))return;load();};
 load();
}
