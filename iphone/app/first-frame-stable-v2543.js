/* V26.52: prepare the complete local interface before revealing the Selector.
 * The same readiness barrier serves pending authorization and approved access.
 * It never restores an identity, fetches Drive data or calls preference RPCs. */
(() => {
  'use strict';
  if(window.top===window)return;
  const ARM='CDQ_FIRST_FRAME_ARM_V2543',READY='CDQ_FIRST_FRAME_STABLE_V2543';
  const routes=['home','dossier','calibration','calcul','inventory','catalog','invoices','opportunities','trash'];
  const labels=['Accueil','Dossier','Calibration','Calcul','Inventaire','Catalogue','Factures','Opportunités','Corbeille'];
  const paints=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const domReady=document.readyState==='loading'?new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true})):Promise.resolve();
  const decoded=new Map();let preparing,completedGeneration;
  function visible(el){if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0;}
  function controls(){return [...document.querySelectorAll('#appHeader,#cdqTopActionsV2204,.bottom-nav')];}
  function urls(){
    const found=new Set();
    for(const control of controls())for(const node of [control,...control.querySelectorAll('*')]){
      if(node instanceof HTMLImageElement&&node.getAttribute('src'))found.add(node.currentSrc||node.src);
      if(node.dataset.cdqArtSrcV2685)found.add(node.dataset.cdqArtSrcV2685);
      for(const pseudo of [null,'::before','::after']){
        const style=getComputedStyle(node,pseudo);
        for(const value of [style.backgroundImage,style.maskImage])for(const match of value.matchAll(/url\(["']?([^"')]+)["']?\)/g))found.add(new URL(match[1],location.href).href);
      }
    }
    return [...found];
  }
  function decode(src){
    if(decoded.has(src))return decoded.get(src);
    const promise=(async()=>{const img=new Image();img.src=src;await img.decode();if(!img.naturalWidth)throw Error('Image non chargée');})();
    decoded.set(src,promise);promise.catch(()=>decoded.delete(src));return promise;
  }
  function snapshot(){
    const nav=[...document.querySelectorAll('.bottom-nav > .bottom-nav-item')];
    const locked=document.documentElement.dataset.cdqWorkspaceUnlocked==='false'&&document.documentElement.dataset.cdqConnectingV2648!=='true';
    const laidOut=el=>!!el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0;
    const shown=locked?laidOut:visible;
    const ready=nav.length===routes.length&&nav.every((button,i)=>button.dataset.workspaceRoute===routes[i]&&shown(button)&&shown(button.querySelector('small'))&&button.querySelector('small').textContent.trim()===labels[i]&&button.querySelector(':scope > span'))&&document.querySelectorAll('#cdqTopActionsV2204 > button').length===4;
    const signature=controls().map(control=>[control,...control.querySelectorAll('*')].map(node=>{
      const r=node.getBoundingClientRect(),s=getComputedStyle(node);
      return [node.tagName,node.getAttribute('class'),node.getAttribute('src'),node.textContent,r.x,r.y,r.width,r.height,s.font,s.color,s.display,s.visibility,s.backgroundImage].join('|');
    }).join('~')).join('##');
    return {ready,signature};
  }
  function permissionsReady(){
    return new Promise(resolve=>{
      let timer,done=false;
      const events=['cdq:access-state-v2527','cdq:access-ready','cdq:drive-ready-v2632','cdq:drive-cleared-v2632'];
      const pending=()=>typeof cdqAccessState!=='undefined'&&(cdqAccessState==='pending'||cdqAccessState==='ready'&&window.cdqDriveEntryV2632?.status?.()==='pending');
      const check=()=>{
        clearTimeout(timer);
        if(pending()){timer=setTimeout(check,1000);return;}
        done=true;for(const name of events)window.removeEventListener(name,wake);resolve();
      };
      const wake=()=>{if(done)return;clearTimeout(timer);timer=setTimeout(check,0);};
      for(const name of events)window.addEventListener(name,wake);
      check();
    });
  }
  async function prepare(){
    // DOMContentLoaded includes completion of the deferred navigation modules.
    await domReady;
    if(!window.cdqWorkspaceV2638?.prepareNavigation||!window.cdqCalibrationV2565?.prepareNavigation||!window.cdqIconThemesV2514?.refresh)throw Error('Navigation indisponible');
    window.cdqWorkspaceV2638.prepareNavigation();
    window.cdqIconThemesV2514.refresh();
    window.cdqCalibrationV2565.prepareNavigation();
    window.cdqWorkspaceV2638.prepareNavigation();
    window.cdqMobileLayout?.apply?.();
    // Fetch and decode the complete selected artwork while the current account
    // and its Drive access are being checked. The final barrier still verifies
    // the actual palette, labels and geometry before revealing anything.
    const artwork=paints().then(async()=>{await window.cdqPrepareNavigationArtV2685();await Promise.all(urls().map(decode));});
    const fonts=document.fonts?document.fonts.ready:Promise.resolve();
    artwork.catch(()=>{});
    await Promise.all([artwork,fonts]);
    await paints();
    const prepared=snapshot();
    await permissionsReady();
    // Client rows load independently after authorization; they no longer hold the whole interface behind the splash.
    let last=prepared.ready?prepared.signature:'',started=performance.now();
    for(;;){
      await Promise.all(urls().map(decode));
      await paints();
      const state=snapshot();
      if(!state.ready){if(performance.now()-started>10000)throw Error('Interface incomplète');last='';continue;}
      if(state.signature===last){document.documentElement.dataset.cdqStartupReadyV2652='true';return;}
      last=state.signature;
    }
  }
  function wait(){
    if(!preparing)preparing=prepare().catch(error=>{preparing=null;parent.postMessage({type:'CDQ_INTERFACE_FAILED_V2652',reason:error.message},location.origin);throw error;});
    return preparing;
  }
  window.cdqStartupFrameV2652={wait};
  addEventListener('message',async event=>{
    if(event.source!==parent||event.origin!==location.origin||event.data?.type!==ARM)return;
    const generation=Number(event.data.generation)||0;
    if(completedGeneration===generation){parent.postMessage({type:READY,generation},location.origin);return;}
    try{await wait();completedGeneration=generation;parent.postMessage({type:READY,generation},location.origin);}catch(_){}
  });
})();
