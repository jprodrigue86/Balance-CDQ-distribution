let active=null;
export const currentReader=()=>active;
let openQueue=Promise.resolve();
export function openReader(data){const result=openQueue.then(()=>openReaderInternal(data));openQueue=result.catch(()=>{});return result;}
async function openReaderInternal(data){
  if(active){
    await active.requestClose();
  }
  if(!(data.blob instanceof Blob)||data.blob.type!=='application/pdf'||!data.blob.size||data.blob.size>32*1024*1024)throw Error('PDF invalide.');
  const frame=document.createElement('iframe');frame.id='legacy-pdf-reader';frame.title='Lecteur PDF CDQ';
  frame.src=new URL('./reader-v2525.html',import.meta.url).href;frame.referrerPolicy='origin';
  frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#101820';
  const origin=new URL(frame.src).origin,saves=new Map();let closed=false,guard=false,ready=false,opened=false,prefillValues=null,closeWaiters=[],pendingClose=false,handle=null;
  let workspaceOwner=null;
  function layout(message){
    if(!data.workspaceSource)return;
    try{
      const source=data.workspaceSource,doc=source.document,root=doc.documentElement;
      if(!root.classList.contains('cdq-mobile-layout'))return;
      workspaceOwner??=root.dataset.cdqWorkspaceOwner||'';
      if(message&&(!message.canRead||workspaceOwner&&message.owner!==workspaceOwner)){close();return;}
      // Delayed report/list renders may change the workspace route. Only an
      // explicit close, an account change or revoked access closes this reader.
      frame.hidden=false;root.classList.add('cdq-workspace-reader-open');
      const bounds=source.frameElement?.getBoundingClientRect(),offset=bounds?.top||0,viewport=window.visualViewport?.height||innerHeight;
      const top=root.classList.contains('cdq-desktop-v2676')?(parseFloat(getComputedStyle(root).getPropertyValue('--cdq-pc-top'))||152):Math.max(0,offset+(doc.getElementById('appHeader')?.getBoundingClientRect().bottom||0)),bottom=root.classList.contains('cdq-desktop-v2676')?10:Math.max(0,viewport-offset-(doc.querySelector('.bottom-nav')?.getBoundingClientRect().top||viewport));
      frame.style.inset=top+'px 0 '+bottom+'px';frame.style.height=Math.max(0,viewport-top-bottom)+'px';
    }catch{}
  }
  const marker='cdq-reader-'+crypto.randomUUID();
  const tell=message=>{if(!closed)frame.contentWindow?.postMessage(message,origin)};
  function requestClose(){if(opened)tell({type:'CDQ_READER_REQUEST_CLOSE'});else pendingClose=true;}
  function pop(){if(closed)return;history.pushState({cdqReader:marker},'',location.href);tell({type:'CDQ_READER_REQUEST_CLOSE'});}
  function close(){
    if(closed)return;closed=true;if(active===handle)active=null;clearTimeout(timer);
    window.removeEventListener('message',receive);window.removeEventListener('popstate',pop);window.removeEventListener('resize',resize);window.removeEventListener('cdq:keyboard-insets-v2653',resize);window.visualViewport?.removeEventListener('resize',resize);frame.remove();
    try{data.workspaceSource?.document.documentElement.classList.remove('cdq-workspace-reader-open');data.workspaceSource?.cdqWorkspaceV2638?.readerClosed();data.workspaceSource?.cdqWorkspaceV2638?.measure();}catch{}
    // A delayed history.back() could otherwise reach and close the next PDF.
    if(guard&&history.state?.cdqReader===marker)history.replaceState(null,'',location.href);
    data.onClose?.();
    for(const waiter of closeWaiters){clearTimeout(waiter.timer);waiter.resolve();}closeWaiters=[];
  }
  async function receive(event){
    if(!closed&&data.workspaceSource&&event.source===data.workspaceSource&&event.origin===location.origin&&event.data?.type==='CDQ_WORKSPACE_LAYOUT_V2638'){layout(event.data);return;}
    if(!closed&&data.workspaceSource&&event.source===data.workspaceSource&&event.origin===location.origin&&event.data?.type==='CDQ_WORKSPACE_READER_HOME_V2640'){requestClose();return;}
    if(!closed&&data.workspaceSource&&event.source===data.workspaceSource&&event.origin===location.origin&&event.data?.type==='CDQ_WORKSPACE_READER_NAV_V2677'){requestClose();return;}
    if(closed||event.source!==frame.contentWindow||event.origin!==origin)return;
    const m=event.data||{};
    if(m.type==='CDQ_READER_READY'){
      ready=true;
      if(!guard&&!window.BalanceCDQNative&&!/BalanceCDQAndroid\//i.test(navigator.userAgent)){history.pushState({cdqReader:marker},'',location.href);guard=true;window.addEventListener('popstate',pop);}
      tell({type:'CDQ_READER_OPEN',blob:data.blob,name:data.name,theme:data.theme,fileId:data.onSave?String(data.fileId||'local-copy'):'',readOnly:!!data.readOnly,autoReportName:data.autoReportName===true});
    }
    if(m.type==='CDQ_READER_OPENED'){opened=true;clearTimeout(timer);data.onOpened?.();if(prefillValues)tell({type:'CDQ_READER_PREFILL_V2642',fileId:String(data.fileId||''),values:prefillValues});if(pendingClose)requestClose();}
    if(m.type==='CDQ_READER_CLOSE')close();
    if(m.type==='CDQ_READER_CLOSE_CANCELLED_V2640'){data.workspaceSource?.cdqWorkspaceV2638?.readerCancelled();for(const waiter of closeWaiters){clearTimeout(waiter.timer);waiter.reject(Error('Le rapport courant reste ouvert. Enregistrez-le ou fermez-le avant d’ouvrir le suivant.'));}closeWaiters=[];}
    if(m.type==='CDQ_READER_DISCARD'&&/^discard-[\w-]{8,80}$/.test(String(m.requestId||''))){
      try{await data.onDiscard?.();tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:true});}
      catch(e){tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:false,error:e.message||String(e)});}
    }
    if(m.type==='CDQ_READER_SAVE'&&data.onSave&&!data.readOnly){
      if(!/^save-[\w-]{8,80}$/.test(String(m.requestId||''))||!(m.blob instanceof Blob)||m.blob.type!=='application/pdf'||m.blob.size<8||m.blob.size>32*1024*1024)return;
      if(!saves.has(m.requestId))saves.set(m.requestId,Promise.resolve().then(()=>data.onSave(m.blob,m.requestId,m.name)));
      try{const result=await saves.get(m.requestId);tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:true,queued:!!result?.queued});}
      catch(e){saves.delete(m.requestId);tell({type:'CDQ_READER_SAVED',requestId:m.requestId,ok:false,error:e.message||String(e)});}
    }
  }
  const timer=setTimeout(()=>{if(!opened){close();data.onError?.(new Error('Le lecteur n’a pas ouvert le PDF. La copie reste conservée; réessayez son ouverture.'));}},30000);
  const resize=()=>layout();
  window.addEventListener('resize',resize);window.addEventListener('cdq:keyboard-insets-v2653',resize);window.visualViewport?.addEventListener('resize',resize);
  handle={fileId:String(data.fileId||''),requestClose:()=>new Promise((resolve,reject)=>{const waiter={resolve,reject,timer:null};waiter.timer=setTimeout(()=>{closeWaiters=closeWaiters.filter(w=>w!==waiter);reject(Error('Fermez le rapport courant avant d’ouvrir le suivant.'));},30000);closeWaiters.push(waiter);requestClose();}),prefill:values=>{prefillValues={...prefillValues,...values};if(opened)tell({type:'CDQ_READER_PREFILL_V2642',fileId:String(data.fileId||''),values:prefillValues});}};active=handle;window.addEventListener('message',receive);document.body.append(frame);layout();return handle;
}
