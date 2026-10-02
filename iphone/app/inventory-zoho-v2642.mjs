// Observe catalogue revisions only while Inventory is visible. Never redraw a
// movement, creation form, scanner, price edit or focused input in the background.
let owner='',generation=0,pending=false,revision=null,lastCheck=0,lastStatus=null;
const page=()=>document.getElementById('cdqInventoryModernV2592');
const account=()=>{try{return String(utilisateurCourantEmail||'');}catch{return '';}};
const allowed=()=>!!account()&&window.cdqDriveEntryV2632?.canRead();
function reset(){owner=account();generation++;revision=null;lastStatus=null;lastCheck=0;pending=false;document.getElementById('cdqZohoStatusV2642')?.remove();}
const rpc=(name,args=[])=>window.cdqAppelServeur(name,args);
function safeRefresh(){const p=page();return p&&!p.hidden&&!p.querySelector('input:focus,textarea:focus,select:focus')&&!document.querySelector('dialog[open]')&&['Inventaire','Inventaire général','Liste de prix','Détail de l’article'].includes(document.getElementById('cdqImTitle')?.textContent);}
function mount(){
 if(!allowed()||page()?.hidden)return;
 const body=document.getElementById('cdqImBody');if(!body?.querySelector('.cdq-im-tiles'))return;
 let box=document.getElementById('cdqZohoStatusV2642');if(box)return;
 box=document.createElement('section');box.id='cdqZohoStatusV2642';box.className='cdq-im-section';
 const line=document.createElement('p');line.dataset.zohoText='';line.textContent='Zoho Inventory';box.append(line);
 let admin=false;try{admin=utilisateurCourantRole==='admin';}catch{}
 if(admin){const button=document.createElement('button');button.type='button';button.textContent='Connexion et synchronisation Zoho';button.onclick=async()=>{
  button.disabled=true;const token=generation,email=account();
  try{const state=await rpc('cdqZohoEtatV2642');if(token!==generation||email!==account()||!allowed())return;
   if(!state.configured){line.textContent='Zoho n’est pas encore connecté. Il manque l’autorisation OAuth dans les paramètres serveur; aucun mot de passe ou jeton n’est demandé ici.';return;}
   if(!state.enabled)await rpc('cdqZohoActiverV2642');
   await rpc('cdqZohoActualiserV2642');lastCheck=0;await check(true);
  }catch(e){if(token===generation)line.textContent=e.message||String(e);}finally{button.disabled=false;}
 };box.append(button);}
 body.querySelector('.cdq-im-tiles').insertAdjacentElement('afterend',box);paint();
}
function paint(){const text=document.querySelector('[data-zoho-text]');if(!text||!lastStatus)return;text.textContent=!lastStatus.configured?'Zoho Inventory — connexion à activer':!lastStatus.enabled?'Zoho Inventory — synchronisation à activer':lastStatus.error?'Zoho : '+lastStatus.error:'Zoho → CDQ • '+(lastStatus.lastSync?'mis à jour '+new Date(lastStatus.lastSync).toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'}):'première synchronisation en attente');}
async function check(force=false){
 if(!allowed()||!page()||page().hidden||document.hidden||pending||navigator.onLine===false)return;
 if(owner!==account())reset();const interval=lastStatus&&!lastStatus.configured?300000:30000;if(!force&&Date.now()-lastCheck<interval)return;
 const token=generation,email=account();pending=true;lastCheck=Date.now();
 try{
  const result=await rpc('cdqZohoEtatV2642');if(token!==generation||email!==account()||!allowed())return;lastStatus=result;mount();paint();
  if(!result.enabled||!result.revision||revision===result.revision)return;
  if(!safeRefresh())return;
  const safe=()=>token===generation&&email===account()&&allowed()&&safeRefresh();
  if(!await window.cdqInventoryModernV2592?.refreshQuiet?.(safe)||!safe())return;
  const extra=await rpc('cdqZohoCatalogueV2642');if(token!==generation||email!==account()||!allowed())return;
  window.cdqInventoryModernV2592?.applyZohoMeta?.(extra.articles||[],safe);revision=result.revision;mount();paint();
 }catch{}finally{if(token===generation)pending=false;}
}
let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();check();});}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:access-ready',reset);
setInterval(()=>check(),30000);document.addEventListener('visibilitychange',()=>check());
