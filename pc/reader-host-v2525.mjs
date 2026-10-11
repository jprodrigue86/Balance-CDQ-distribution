import {recognizeBundledReaderSourceV2730} from './reader-bundled-source-v2730.mjs';

let active=null;
export const currentReader=()=>active;
let openQueue=Promise.resolve();
let parkedReaderV2730=null,pendingReaderV2730=null,poolEpochV2730=0;
let secondEngineTimerV2731=null;
let preparedReaderV2730=window.cdqPreparedReaderV2729||null;
function retireReaderSlotV2730(prepared){prepared?.cancel?.();prepared?.frame?.remove();}
// The legacy menu prewarm writes this public slot directly. Adopt that write
// before its append, retiring the idle LRU so an active reader cannot gain a
// third iframe even when the initial prewarm is retried after a failure.
Object.defineProperty(window,'cdqPreparedReaderV2729',{configurable:true,get:()=>preparedReaderV2730,set:prepared=>{
  if(prepared===preparedReaderV2730)return;
  const prior=preparedReaderV2730;preparedReaderV2730=prepared;
  if(!prepared)return;
  if(prior){
    if(active||pendingReaderV2730)retireReaderSlotV2730(prior);
    else{retireReaderSlotV2730(parkedReaderV2730);parkedReaderV2730=prior;prior.frame.id='cdq-reader-parked-v2730';}
  }
  if(active||pendingReaderV2730){retireReaderSlotV2730(parkedReaderV2730);parkedReaderV2730=null;}
}});
function retirePreparedReaderV2730(){
  clearTimeout(secondEngineTimerV2731);secondEngineTimerV2731=null;
  poolEpochV2730++;
  const retained=new Set([preparedReaderV2730,parkedReaderV2730,pendingReaderV2730]);
  preparedReaderV2730=parkedReaderV2730=pendingReaderV2730=null;
  // Access checks may temporarily suspend the workspace. Retire every idle
  // cache, but keep the active form and its unsaved answers under its existing
  // layout/access contract. The epoch still fences queued replacement opens.
  for(const prepared of retained)retireReaderSlotV2730(prepared);
}
for(const type of ['pagehide','cdq:drive-cleared-v2632'])window.addEventListener(type,retirePreparedReaderV2730);
window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')retirePreparedReaderV2730();});
function readerRouteV2730(data,sourceBlob){
  if(data.readerPreparedVersion===2730&&data.initialValues&&Object.values(data.initialValues).some(value=>String(value??'').trim()))return 'draft:'+sourceBlob.size;
  return data.fileId?'file:'+String(data.fileId):null;
}
function prepareClosedReaderV2730(frame,route){
  if(preparedReaderV2730){retireReaderSlotV2730(parkedReaderV2730);parkedReaderV2730=preparedReaderV2730;parkedReaderV2730.frame.id='cdq-reader-parked-v2730';}
  frame.hidden=true;frame.id='cdq-reader-prewarm-v2554';frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0';
  let settle,timer,finished=false;const prepared={frame,route,ready:false,readyPromise:new Promise(resolve=>{settle=resolve;})};
  const done=ready=>{if(finished)return;finished=true;clearTimeout(timer);window.removeEventListener('message',receive);prepared.ready=ready;settle(ready);if(!ready){if(preparedReaderV2730===prepared)preparedReaderV2730=null;if(parkedReaderV2730===prepared)parkedReaderV2730=null;frame.remove();}};
  const receive=event=>{if(event.source!==frame.contentWindow||event.origin!==location.origin)return;if(event.data?.type==='CDQ_READER_READY')done(true);if(event.data?.type==='CDQ_READER_RESET_FAILED_V2730')done(false);};
  prepared.cancel=()=>done(false);timer=setTimeout(()=>done(false),8000);window.addEventListener('message',receive);preparedReaderV2730=prepared;
}
function prepareSecondEngineV2731(owner,ownerFrame,valid){
  if(secondEngineTimerV2731!==null||preparedReaderV2730||parkedReaderV2730||pendingReaderV2730)return;
  // Compile only the empty worker/sandbox after the current report is editable.
  // No PDF bytes, fields or canvas are requested until a later explicit open.
  secondEngineTimerV2731=setTimeout(()=>{
    secondEngineTimerV2731=null;
    if(!valid()||!ownerFrame.isConnected||pendingReaderV2730||(active&&active!==owner))return;
    const frames=new Set([ownerFrame,preparedReaderV2730?.frame,parkedReaderV2730?.frame].filter(frame=>frame?.isConnected));
    if(frames.size>=2)return;
    const frame=document.createElement('iframe');frame.id='cdq-reader-prewarm-v2554';frame.title='Lecteur PDF CDQ';
    frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.referrerPolicy='origin';
    frame.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0';
    frame.src=new URL('./reader-v2525.html',import.meta.url).href;
    let settle,timer,finished=false;const prepared={frame,ready:false,readyPromise:new Promise(resolve=>{settle=resolve;})};
    const done=ready=>{if(finished)return;finished=true;clearTimeout(timer);window.removeEventListener('message',receive);prepared.ready=ready;settle(ready);if(!ready){if(preparedReaderV2730===prepared)preparedReaderV2730=null;if(parkedReaderV2730===prepared)parkedReaderV2730=null;frame.remove();}};
    const receive=event=>{if(event.source!==frame.contentWindow||event.origin!==location.origin)return;if(!valid())return done(false);if(event.data?.type==='CDQ_READER_READY')done(true);if(event.data?.type==='CDQ_READER_INIT_FAILED_V2731')done(false);};
    prepared.cancel=()=>done(false);timer=setTimeout(()=>done(false),8000);window.addEventListener('message',receive);
    window.cdqPreparedReaderV2729=prepared;document.body.append(frame);
  },320);
}
export function openReader(data){
  // Bind provenance, access mode and the flat identity sidecar to the same
  // immutable Blob before queuing or hashing. The caller may refresh its record.
  const request={...data};
  if(request.initialValues&&typeof request.initialValues==='object')request.initialValues={...request.initialValues};
  const work=window.cdqPdfWorkV2729,context={sourceBlob:request.blob,poolEpoch:poolEpochV2730,work,workEpoch:work?.stats().epoch};
  const result=openQueue.then(()=>openReaderInternal(request,context));openQueue=result.catch(()=>{});return result;
}
async function openReaderInternal(data,context){
  const valid=()=>context.poolEpoch===poolEpochV2730&&(!context.work||(window.cdqPdfWorkV2729===context.work&&context.work.stats().epoch===context.workEpoch));
  const guardContext=()=>{if(!valid())throw Error('Le compte ou l’accès Drive a changé.');};
  guardContext();
  // Metadata refreshes and duplicate open messages must not replace this form.
  if(data.fileId&&active&&active.fileId===String(data.fileId))return active;
  if(active){
    await active.requestClose();
    guardContext();
  }
  const {sourceBlob}=context;
  if(!(sourceBlob instanceof Blob)||sourceBlob.type!=='application/pdf'||!sourceBlob.size||sourceBlob.size>32*1024*1024)throw Error('PDF invalide.');
  // Prepare the PDF while the retained viewer/worker/sandbox is becoming ready,
  // rather than starting this only after the iframe's READY round trip.
  const {work,workEpoch}=context,route=readerRouteV2730(data,sourceBlob);
  const pdfPreparation=data.readerPreparedVersion===2730?Promise.resolve({blob:sourceBlob,preparedVersion:2730}):(async()=>{
    // Only the packaged catalog can establish missing local provenance. A
    // remote name, revision or metadata flag never substitutes for these bytes.
    const {REPORT_TEMPLATES}=await import('./report-templates-v2636.mjs');guardContext();
    const canonical=await recognizeBundledReaderSourceV2730(sourceBlob,REPORT_TEMPLATES);guardContext();
    if(canonical)return {blob:sourceBlob,preparedVersion:2730};
    if(!work)return null;
    const result=await work.requestBlob('open',sourceBlob,{summary:false},{epoch:workEpoch,valid});guardContext();
    return {blob:new Blob([result.bytes],{type:'application/pdf'}),normalized:true};
  })().catch(error=>({error}));
  let prepared=null;
  if(route&&preparedReaderV2730?.route===route){prepared=preparedReaderV2730;preparedReaderV2730=null;}
  else if(route&&parkedReaderV2730?.route===route){prepared=parkedReaderV2730;parkedReaderV2730=null;}
  else if(preparedReaderV2730&&!Object.hasOwn(preparedReaderV2730,'route')){prepared=preparedReaderV2730;preparedReaderV2730=null;}
  else if(parkedReaderV2730){prepared=parkedReaderV2730;parkedReaderV2730=null;}
  // With only a different MRU retained, create the second frame. Once both
  // slots exist, the parked LRU above is recycled instead of allocating more.
  pendingReaderV2730=prepared;
  if(prepared?.readyPromise&&!prepared.ready)await prepared.readyPromise;
  if(!valid()){if(pendingReaderV2730===prepared)pendingReaderV2730=null;retireReaderSlotV2730(prepared);guardContext();}
  const reused=!!prepared?.ready&&prepared.frame?.isConnected;
  if(prepared&&!reused)retireReaderSlotV2730(prepared);
  const frame=reused?prepared.frame:document.createElement('iframe');frame.id='legacy-pdf-reader';frame.title='Lecteur PDF CDQ';
  pendingReaderV2730={frame};
  if(!reused)frame.src=new URL('./reader-v2525.html',import.meta.url).href;frame.referrerPolicy='origin';frame.removeAttribute('aria-hidden');
  frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#101820';
  frame.hidden=false;
  const origin=new URL(frame.src).origin,saves=new Map();let closed=false,guard=false,ready=false,opened=false,prefillValues=null,closeWaiters=[],pendingClose=false,handle=null;
  let workspaceOwner=null,lastWorkspaceLayout=null;
  function layout(message){
    if(!data.workspaceSource)return;
    if(message)lastWorkspaceLayout=message;
    else message=lastWorkspaceLayout;
    try{
      const source=data.workspaceSource,doc=source.document,root=doc.documentElement;
      if(!root.classList.contains('cdq-mobile-layout')&&!root.classList.contains('cdq-desktop-v2676'))return;
      workspaceOwner??=root.dataset.cdqWorkspaceOwner||'';
      // Access checks temporarily blank the public identity. Keep the document
      // and its fields alive; genuine loss of access suspends their display.
      const state=message?.accessState||'ready',pending=['pending','checking'].includes(state);
      const account=String(message?.account||message?.owner?.split('|')[0]||'');
      const original=String(workspaceOwner||'').split('|')[0];
      if(message&&((account&&original&&account!==original)||(!pending&&!message.canRead))){
        frame.hidden=true;return;
      }
      // Delayed report/list renders may change the workspace route. Access loss
      // suspends the reader; only an explicit close destroys its form.
      frame.hidden=false;root.classList.add('cdq-workspace-reader-open');
      root.dataset.cdqReaderSessionV2679=marker;
      const bounds=source.frameElement?.getBoundingClientRect(),offset=bounds?.top||0,viewport=window.visualViewport?.height||innerHeight;
      const top=root.classList.contains('cdq-desktop-v2676')?(parseFloat(getComputedStyle(root).getPropertyValue('--cdq-pc-top'))||152):Math.max(0,offset+(doc.getElementById('appHeader')?.getBoundingClientRect().bottom||0)),bottom=root.classList.contains('cdq-desktop-v2676')?10:Math.max(0,viewport-offset-(doc.querySelector('.bottom-nav')?.getBoundingClientRect().top||viewport));
      if(root.classList.contains('cdq-desktop-v2676')){
        source.cdqDesktopModel2?.layout();
        const safeTop=Math.max(top,Math.ceil(offset+(doc.getElementById('appHeader')?.getBoundingClientRect().bottom||0)+12));
        const left=(bounds?.left||0)+(parseFloat(getComputedStyle(root).getPropertyValue('--cdq-pc-left'))||232);
        for(const [key,value]of Object.entries({top:safeTop+'px',left:left+'px',right:'10px',bottom:'10px',width:Math.max(0,innerWidth-left-10)+'px',height:Math.max(0,viewport-safeTop-10)+'px'}))frame.style.setProperty(key,value,'important');
        document.documentElement.style.setProperty('--cdq-pc-shell-top',safeTop+'px');document.documentElement.style.setProperty('--cdq-pc-shell-left',left+'px');
      }else{frame.style.inset=top+'px 0 '+bottom+'px';frame.style.height=Math.max(0,viewport-top-bottom)+'px';}
    }catch{}
  }
  const marker='cdq-reader-'+crypto.randomUUID();
  const tell=message=>{if(!closed)frame.contentWindow?.postMessage(message,origin)};
  function requestClose(){if(opened)tell({type:'CDQ_READER_REQUEST_CLOSE'});else pendingClose=true;}
  function pop(){if(closed)return;history.pushState({cdqReader:marker},'',location.href);tell({type:'CDQ_READER_REQUEST_CLOSE'});}
  function close(reusable=false,failure=null){
    if(closed)return;closed=true;if(active===handle)active=null;clearTimeout(timer);
    window.removeEventListener('message',receive);window.removeEventListener('popstate',pop);window.removeEventListener('resize',resize);window.removeEventListener('cdq:keyboard-insets-v2653',resize);window.visualViewport?.removeEventListener('resize',resize);if(reusable&&opened&&valid())prepareClosedReaderV2730(frame,route);else frame.remove();
    try{const root=data.workspaceSource?.document.documentElement;if(root?.dataset.cdqReaderSessionV2679===marker)delete root.dataset.cdqReaderSessionV2679;root?.classList.remove('cdq-workspace-reader-open');data.workspaceSource?.cdqWorkspaceV2638?.readerClosed();data.workspaceSource?.cdqWorkspaceV2638?.measure();}catch{}
    // A delayed history.back() could otherwise reach and close the next PDF.
    if(guard&&history.state?.cdqReader===marker)history.replaceState(null,'',location.href);
    data.onClose?.();
    try{data.workspaceSource?.dispatchEvent?.(new CustomEvent('cdq:reader-closed-v2703'));}catch{}
    for(const waiter of closeWaiters){clearTimeout(waiter.timer);if(failure)waiter.reject(failure);else waiter.resolve();}closeWaiters=[];
  }
  function openingFailed(error){
    // A failed parse/sandbox must release the new-report request immediately,
    // rather than keeping the workspace busy until the 30-second watchdog.
    try{data.onError?.(error);}finally{close(false,error);}
  }
  async function receive(event){
    if(!closed&&data.workspaceSource&&event.source===data.workspaceSource&&event.origin===location.origin&&event.data?.type==='CDQ_WORKSPACE_LAYOUT_V2638'){layout(event.data);return;}
    if(!closed&&data.workspaceSource&&event.source===data.workspaceSource&&event.origin===location.origin&&['CDQ_WORKSPACE_READER_HOME_V2640','CDQ_WORKSPACE_READER_NAV_V2677'].includes(event.data?.type)){
      if(event.data.userInitiated===true&&event.data.readerSession===marker)requestClose();return;
    }
    if(closed||event.source!==frame.contentWindow||event.origin!==origin)return;
    const m=event.data||{};
    if(!opened&&((m.type==='CDQ_READER_OPEN_FAILED_V2731'&&m.readerRequestId===marker)||(m.type==='CDQ_READER_INIT_FAILED_V2731'&&!ready))){
      openingFailed(new Error(String(m.error||'Le lecteur n’a pas pu ouvrir ce PDF. Réessayez son ouverture.').slice(0,500)));return;
    }
    if(m.type==='CDQ_READER_READY'){
      if(ready)return;
      ready=true;
      if(!guard&&!window.BalanceCDQNative&&!/BalanceCDQAndroid\//i.test(navigator.userAgent)){history.pushState({cdqReader:marker},'',location.href);guard=true;window.addEventListener('popstate',pop);}
      const result=pdfPreparation?await pdfPreparation:null;if(closed)return;if(result?.error){openingFailed(result.error);return;}
      if(!valid()){openingFailed(Error('Le compte ou l’accès Drive a changé.'));return;}
      tell({type:'CDQ_READER_OPEN',readerRequestId:marker,blob:sourceBlob,preparedBlob:result?.blob,readerPreparedVersion:result?.preparedVersion===2730?2730:undefined,readerNormalizedV2730:result?.normalized===true,preparedEpoch:workEpoch,initialValues:data.initialValues,name:data.name,theme:data.theme,fileId:data.onSave?String(data.fileId||'local-copy'):'',readOnly:!!data.readOnly,autoReportName:data.autoReportName===true,desktop:!!data.workspaceSource?.document.documentElement.classList.contains('cdq-desktop-v2676')});
    }
    if(m.type==='CDQ_READER_OPENED'&&m.readerRequestId===marker){opened=true;clearTimeout(timer);data.onOpened?.();if(prefillValues)tell({type:'CDQ_READER_PREFILL_V2642',fileId:String(data.fileId||''),values:prefillValues});if(pendingClose)requestClose();prepareSecondEngineV2731(handle,frame,valid);}
    if(m.type==='CDQ_READER_CLOSE')close(m.reusable===true);
    if(m.type==='CDQ_READER_CLOSE_CANCELLED_V2640'){data.workspaceSource?.cdqWorkspaceV2638?.readerCancelled();for(const waiter of closeWaiters){clearTimeout(waiter.timer);waiter.reject(Error('Le rapport courant reste ouvert. Enregistrez-le ou fermez-le avant d’ouvrir le suivant.'));}closeWaiters=[];}
    if(m.type==='CDQ_READER_DISCARD'&&/^discard-[\w-]{8,80}$/.test(String(m.requestId||''))){
      try{await data.onDiscard?.();tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:true});}
      catch(e){tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:false,error:e.message||String(e)});}
    }
    if(m.type==='CDQ_READER_SAVE'&&data.onSave&&!data.readOnly){
      if(!/^save-[\w-]{8,80}$/.test(String(m.requestId||''))||!(m.blob instanceof Blob)||m.blob.type!=='application/pdf'||m.blob.size<8||m.blob.size>32*1024*1024)return;
      if(!saves.has(m.requestId))saves.set(m.requestId,Promise.resolve().then(()=>data.onSave(m.blob,m.requestId,m.name,{readerPreparedVersion:m.readerPreparedVersion===2730?2730:undefined})));
      try{const result=await saves.get(m.requestId);tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:true,queued:!!result?.queued});}
      catch(e){saves.delete(m.requestId);tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:false,error:e.message||String(e)});}
    }
  }
  const timer=setTimeout(()=>{if(!opened)openingFailed(new Error('Le lecteur n’a pas ouvert le PDF. La copie reste conservée; réessayez son ouverture.'));},30000);
  const resize=()=>layout();
  window.addEventListener('resize',resize);window.addEventListener('cdq:keyboard-insets-v2653',resize);window.visualViewport?.addEventListener('resize',resize);
  handle={fileId:String(data.fileId||''),requestClose:()=>closed?Promise.resolve():new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:null};waiter.timer=setTimeout(()=>{closeWaiters=closeWaiters.filter(w=>w!==waiter);reject(Error('Fermez le rapport courant avant d’ouvrir le suivant.'));},30000);closeWaiters.push(waiter);requestClose();}),prefill:values=>{prefillValues={...prefillValues,...values};if(opened)tell({type:'CDQ_READER_PREFILL_V2642',fileId:String(data.fileId||''),values:prefillValues});}};active=handle;pendingReaderV2730=null;window.addEventListener('message',receive);layout();if(!reused)document.body.append(frame);if(reused)queueMicrotask(()=>receive({source:frame.contentWindow,origin,data:{type:'CDQ_READER_READY'}}));return handle;
}
