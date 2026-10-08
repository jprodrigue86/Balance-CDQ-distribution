/* PC automatic updates: activate only after verified download and a quiet, idle workspace. Never installs APKs, touches account permissions or clears user data. */
(() => {
  'use strict';
  const base=new URL('./',document.currentScript.src), canonicalBase=new URL('https://jprodrigue86.github.io/Balance-CDQ-distribution/pc/'), origin=location.origin;
  const legacyPath=base.pathname!==canonicalBase.pathname;
  const current=document.documentElement.dataset.cdqPcRelease;
  const version=document.documentElement.dataset.cdqPcVersion;
  const inside=window.parent!==window;
  let state={available:false,checking:false,message:'Version PC '+version},scheduled=false;
  function text(node,value){if(node&&node.textContent!==value)node.textContent=value;}
  function render(){
    scheduled=false;
    const center=document.querySelector('.cdq-update-center');
    if(center){
      text(center.querySelector('.cdq-update-help'),'Application PC : les mises à jour se téléchargent automatiquement et s’installent après la fermeture de vos documents, pendant une période d’inactivité.');
      const status=center.querySelector('#cdqUpdateStatus');text(status,state.message);
      const install=center.querySelector('#cdqInstallUpdateButton');
      if(install){install.disabled=!state.available||state.checking;text(install,state.available?'Mettre à jour et relancer':'Mise à jour PC');install.title='Mise à jour PC';}
      const check=center.querySelector('#cdqCheckUpdateButton');if(check){check.disabled=state.checking;text(check,'Vérifier la mise à jour PC');}
    }
    const banner=document.getElementById('cdqUpdateBanner');
    if(banner){banner.classList.toggle('show',!!state.available);text(banner.querySelector('span'),'Une mise à jour PC est prête.');}
    document.querySelectorAll('#cdqAndroidUpdaterBoxV2313,#cdqAndroidUpdaterButtonV2316').forEach(n=>{n.hidden=true;});
  }
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(render,60);}
  function parentRequest(type){window.parent.postMessage({type},origin);}
  function mountFrame(){
    const style=document.createElement('style');style.textContent='#cdqAndroidUpdaterBoxV2313,#cdqAndroidUpdaterButtonV2316{display:none!important}';document.head.append(style);
    new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
    schedule();parentRequest('CDQ_PC_CHECK');
    window.cdqMajApkV2502=()=>parentRequest('CDQ_PC_CHECK');
    window.cdqReinstallerApkV2502=()=>window.open(new URL('installer.html',base).href,'_blank','noopener');
  }
  if(inside){
    window.cdqPcUpdateSafetyV2695=async()=>{
      try{if(typeof cdqV19SyncRunning!=='undefined'&&cdqV19SyncRunning||window.cdqDriveMain23?.active())return false;const pending=await window.cdqSyncDetailsV2679?.pending?.();return !pending?.length;}catch{return false;}
    };
    window.addEventListener('message',e=>{
      if(e.source!==parent||e.origin!==origin||e.data?.type!=='CDQ_PC_STATUS')return;
      state=e.data.state;schedule();
    });
    document.addEventListener('click',e=>{
      const button=e.target.closest?.('button');if(!button)return;
      if(['cdqCheckUpdateButton','cdqAndroidUpdaterButtonV2313','cdqAndroidUpdaterButtonV2316'].includes(button.id)){
        e.preventDefault();e.stopImmediatePropagation();parentRequest('CDQ_PC_CHECK');
      }else if(button.id==='cdqInstallUpdateButton'||button.closest('#cdqUpdateBanner')){
        e.preventDefault();e.stopImmediatePropagation();parentRequest('CDQ_PC_APPLY');
      }
    },true);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFrame,{once:true});else mountFrame();
    return;
  }
  let reg=null,checking=null,applying=false,latest=null,lastCheck=0,lastActivity=Date.now(),autoTimer=null,startupWindow=true;
  setTimeout(()=>{startupWindow=false;},120000);
  function safeIdle(){
    if(document.visibilityState!=='visible'||!startupWindow&&Date.now()-lastActivity<15000||pdfOpen())return false;
    const documents=[document,document.getElementById('app')?.contentDocument].filter(Boolean);
    return documents.every(d=>{
      if(d.querySelector('dialog[open],#legacy-pdf-reader,#cdqReaderFrame,[aria-busy="true"]'))return false;
      const active=d.activeElement;if(active?.matches?.('input,textarea,select,[contenteditable="true"]'))return false;
      if([...d.querySelectorAll('.modal,.cdq-modal,#invoiceModal,#inventoryModal')].some(el=>!el.hidden&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'))return false;
      const w=d.defaultView;
      try{if(w.cdqDriveMain23?.active()||w.cdqPdfSyncV2680?.active?.()||w.cdqPendingSaveV2691)return false;}catch{return false;}
      return true;
    });
  }
  async function transfersIdle(){try{const frame=document.getElementById('app')?.contentWindow;return !!frame?.cdqPcUpdateSafetyV2695&&await frame.cdqPcUpdateSafetyV2695();}catch{return false;}}
  function scheduleAutomatic(){
    if(autoTimer||applying||!state.available||legacyPath)return;
    autoTimer=setTimeout(async()=>{autoTimer=null;if(safeIdle()&&await transfersIdle())await apply(true);else scheduleAutomatic();},5000);
  }
  function activity(){lastActivity=Date.now();startupWindow=false;}
  for(const type of ['pointerdown','keydown','input','change'])document.addEventListener(type,activity,true);
  function trackFrame(){const d=document.getElementById('app')?.contentDocument;if(!d||d.__cdqAutoUpdateTrackedV2695)return;d.__cdqAutoUpdateTrackedV2695=true;for(const type of ['pointerdown','keydown','input','change'])d.addEventListener(type,activity,true);}
  function pdfOpen(){if(document.querySelector('#legacy-pdf-reader,#cdqReaderFrame'))return true;try{return !!document.getElementById('app')?.contentDocument?.querySelector('#cdqReaderFrame');}catch{return false;}}
  function post(){
    const frame=document.getElementById('app');
    if(frame?.contentWindow)frame.contentWindow.postMessage({type:'CDQ_PC_STATUS',state},origin);
  }
  function status(message,available=false,busy=false){state={message,available,checking:busy};post();if(available)scheduleAutomatic();}
  async function waiting(){
    if(reg?.waiting&&latest&&latest.release!==current){
      const expected=latest.release,worker=reg.waiting;
      const actual=await new Promise(resolve=>{const ports=new MessageChannel(),timer=setTimeout(()=>{ports.port1.close();resolve('');},4000);ports.port1.onmessage=e=>{clearTimeout(timer);ports.port1.close();resolve(e.data?.release);};worker.postMessage({type:'CDQ_PC_VERSION'},[ports.port2]);});
      if(actual!==expected||worker!==reg.waiting)return false;
      status('Mise à jour PC '+latest.version+' prête. Installation automatique lorsque vos documents sont fermés et que vous avez terminé.',true);return true;}
    return false;
  }
  async function check(force=false){
    if(checking)return checking;
    if(!force&&Date.now()-lastCheck<30000){post();return;}
    if(navigator.onLine===false){status('Hors ligne : connectez-vous à Internet pour vérifier les mises à jour.');return;}
    lastCheck=Date.now();status('Vérification de la mise à jour PC…',false,true);
    checking=(async()=>{
      try{
        if(legacyPath){
          const response=await fetch(new URL('release.json',canonicalBase),{cache:'no-store'});
          if(!response.ok)throw Error('Le nouveau canal PC ne répond pas. Réessayez.');
          latest=await response.json();
          status('Ancienne installation PC détectée. Ouvrez la nouvelle installation CDQ pour passer à V'+String(latest.version||'courante')+'.',true);
          return;
        }
        if(!('serviceWorker' in navigator))throw Error('Ce navigateur ne permet pas les mises à jour installables. Ouvrez CDQ dans Safari.');
        reg=reg||await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.href,updateViaCache:'none'});
        if(!reg.__cdqListening){
          reg.__cdqListening=true;
          reg.addEventListener('updatefound',()=>{
            const worker=reg.installing;if(!worker)return;
            worker.addEventListener('statechange',async()=>{
              if(worker.state==='installed'){if(!(await waiting())&&latest?.release===current)status('Version PC '+version+' à jour.');}
              if(worker.state==='redundant')status('La préparation de la mise à jour a échoué. Votre version actuelle reste disponible. Réessayez.');
            });
          });
        }
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
        try{
          const response=await fetch(new URL('release.json',base),{cache:'no-store',signal:controller.signal});
          if(!response.ok)throw Error('Le serveur de mise à jour ne répond pas. Réessayez.');
          latest=await response.json();
          if(!/^[a-f0-9]{64}$/.test(latest.release)||typeof latest.version!=='string')throw Error('Informations de mise à jour invalides.');
        }finally{clearTimeout(timer);}
        await reg.update();
        if(await waiting())return;
        if(latest.release===current)status('Version PC '+version+' à jour.');
        else status('Préparation de la mise à jour PC… Vous pouvez continuer à travailler.');
      }catch(error){status(error?.message||'Vérification impossible. Réessayez.');}
      finally{checking=null;}
    })();
    return checking;
  }
  async function apply(automatic=false){
    if(applying||automatic&&!safeIdle())return;
    if(pdfOpen()){status('Fermez le PDF avant de relancer la mise à jour.',true);return;}
    if(legacyPath){location.href=canonicalBase.href;return;}
    if(!automatic)await check(true);
    if(!reg?.waiting||!latest||latest.release===current){await waiting();return;}
    if(!(await waiting()))return;
    if(pdfOpen()){status('Fermez le PDF avant de relancer la mise à jour.',true);return;}
    if(automatic&&(!safeIdle()||!await transfersIdle())){scheduleAutomatic();return;}
    if(!automatic&&!confirm('Enregistrez et fermez vos documents avant la mise à jour.\n\nRedémarrer CDQ maintenant ?'))return;
    applying=true;status('Installation de la mise à jour PC…',false,true);
    reg.waiting.postMessage({type:'CDQ_PC_ACTIVATE',release:latest.release});
  }
  // Registered before the legacy updater, only for the real same-origin Selector.
  window.addEventListener('message',e=>{
    const frame=document.getElementById('app');
    if(e.origin!==origin||!frame||e.source!==frame.contentWindow)return;
    const type=e.data?.type;
    if(['CDQ_PC_CHECK','CDQ_CHECK_UPDATE'].includes(type)){e.stopImmediatePropagation();void check(true);}
    else if(['CDQ_PC_APPLY','CDQ_FORCE_UPDATE','CDQ_OPEN_SCRIPT_MANAGER'].includes(type)){e.stopImmediatePropagation();void apply();}
    else if(type==='CDQ_SELECTOR_READY'){trackFrame();post();void check();}
  },true);
  if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applying){if(pdfOpen()){applying=false;status('Mise à jour prête. Fermez le PDF avant de relancer.',true);return;}location.reload();}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void check();});
  window.addEventListener('online',()=>{void check(true);});
  window.addEventListener('load',()=>{void check();},{once:true});
  setInterval(()=>{trackFrame();if(document.visibilityState==='visible'){void check();scheduleAutomatic();}},60000);
  window.cdqPcUpdates={check:()=>check(true),apply,status:()=>({...state})};
})();
