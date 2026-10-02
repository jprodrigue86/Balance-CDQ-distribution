// Zoho remains prepared in the background without a status panel or connection button.
// Observe catalogue revisions only while Inventory is visible. Never redraw a
// movement, creation form, scanner, price edit or focused input in the background.
let owner='',generation=0,pending=false,revision=null,lastCheck=0,lastStatus=null;
const page=()=>document.getElementById('cdqInventoryModernV2592');
const account=()=>{try{return String(utilisateurCourantEmail||'');}catch{return '';}};
const allowed=()=>!!account()&&window.cdqDriveEntryV2632?.canRead();
function reset(){owner=account();generation++;revision=null;lastStatus=null;lastCheck=0;pending=false;document.getElementById('cdqZohoStatusV2642')?.remove();}
const rpc=(name,args=[])=>window.cdqAppelServeur(name,args);
function safeRefresh(){const p=page();return p&&!p.hidden&&!p.querySelector('input:focus,textarea:focus,select:focus')&&!document.querySelector('dialog[open]')&&['Inventaire','Inventaire général','Liste de prix','Détail de l’article'].includes(document.getElementById('cdqImTitle')?.textContent);}
async function check(force=false){
 if(!allowed()||!page()||page().hidden||document.hidden||pending||navigator.onLine===false)return;
 if(owner!==account())reset();const interval=lastStatus&&!lastStatus.configured?300000:30000;if(!force&&Date.now()-lastCheck<interval)return;
 const token=generation,email=account();pending=true;lastCheck=Date.now();
 try{
  const result=await rpc('cdqZohoEtatV2642');if(token!==generation||email!==account()||!allowed())return;lastStatus=result;
  if(!result.enabled||!result.revision||revision===result.revision)return;
  if(!safeRefresh())return;
  const safe=()=>token===generation&&email===account()&&allowed()&&safeRefresh();
  if(!await window.cdqInventoryModernV2592?.refreshQuiet?.(safe)||!safe())return;
  const extra=await rpc('cdqZohoCatalogueV2642');if(token!==generation||email!==account()||!allowed())return;
  window.cdqInventoryModernV2592?.applyZohoMeta?.(extra.articles||[],safe);revision=result.revision;
 }catch{}finally{if(token===generation)pending=false;}
}
reset();
let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;check();});}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('cdq:drive-cleared-v2632',reset);window.addEventListener('cdq:access-ready',reset);
setInterval(()=>check(),30000);document.addEventListener('visibilitychange',()=>check());
