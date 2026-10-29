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
  const decoded=new Map();let preparing,preparingScope,completedGeneration,completedScope;
  const homeScope=()=>window.cdqDriveEntryV2632?.canRead()===true?String(typeof utilisateurCourantEmail==='undefined'?'':utilisateurCourantEmail).trim().toLowerCase()+'|'+String(typeof utilisateurCourantRole==='undefined'?'':utilisateurCourantRole):'locked';
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
    const promise=(async()=>{const img=new Image();let timer;try{img.src=src;await Promise.race([img.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Image trop lente')),5000);})]);if(!img.naturalWidth)throw Error('Image non chargée');return true;}catch(error){document.documentElement.dataset.cdqStartupArtworkDegradedV2797='true';return false;}finally{clearTimeout(timer);}})();
    decoded.set(src,promise);promise.catch(()=>decoded.delete(src));return promise;
  }
  function snapshot(){
    const nav=[...document.querySelectorAll('.bottom-nav > .bottom-nav-item')];
    const locked=document.documentElement.dataset.cdqWorkspaceUnlocked==='false'&&document.documentElement.dataset.cdqConnectingV2648!=='true';
    const laidOut=el=>!!el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0;
    const shown=locked?laidOut:visible;
    // 27.94: accept Settings and user-customized order; reject duplicates/unknown routes.
    const expected=new Map(routes.map((route,i)=>[route,labels[i]]));
    if(nav.some(button=>button.dataset.workspaceRoute==='settings'))expected.set('settings','Réglages');
    const ready=nav.length===expected.size
      &&new Set(nav.map(button=>button.dataset.workspaceRoute)).size===nav.length
      &&nav.every(button=>expected.has(button.dataset.workspaceRoute)
        &&shown(button)&&shown(button.querySelector('small'))
        &&button.querySelector('small').textContent.trim()===expected.get(button.dataset.workspaceRoute)
        &&button.querySelector(':scope > span'))
      &&(() => {
        const topActions=[...document.querySelectorAll('#cdqTopActionsV2204 > button')];
        const portal=topActions.filter(button=>button.id==='cdqClientPortalButton20261028');
        // Four original actions plus one optional client portal.
        // A missing optional portal must not make all CDQ inaccessible.
        return portal.length<=1&&topActions.length===4+portal.length;
      })();
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
    await window.cdqStartupPerformanceV2751.waitForHomeClients();
    let last=prepared.ready?prepared.signature:'',started=performance.now();
    for(;;){
      await Promise.all(urls().map(decode));
      await paints();
      await window.cdqStartupPerformanceV2751.waitForHomeClients();
      const state=snapshot();
      if(!state.ready){if(performance.now()-started>10000)throw Error('Interface incomplète');last='';continue;}
      if(state.signature===last){document.documentElement.dataset.cdqStartupReadyV2652='true';return;}
      last=state.signature;
    }
  }
  function wait(){
    const scope=homeScope();
    if(!preparing||preparingScope!==scope){preparingScope=scope;preparing=prepare().then(()=>{preparingScope=homeScope();}).catch(error=>{preparing=null;parent.postMessage({type:'CDQ_INTERFACE_FAILED_V2652',reason:error.message},location.origin);throw error;});}
    return preparing;
  }
  window.cdqStartupFrameV2652={wait};
  addEventListener('message',async event=>{
    if(event.source!==parent||event.origin!==location.origin||event.data?.type!==ARM)return;
    const generation=Number(event.data.generation)||0;
    if(completedGeneration===generation&&completedScope===homeScope()){parent.postMessage({type:READY,generation},location.origin);return;}
    try{await wait();completedGeneration=generation;completedScope=homeScope();parent.postMessage({type:READY,generation},location.origin);}catch(_){}
  });
})();
