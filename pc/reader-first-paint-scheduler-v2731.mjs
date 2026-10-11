// Scratch candidate. Only a captured, still-owned page may use this scheduler.
export function captureFirstPaintLeaseV2731({document,page,pageView,generation,epoch,getDocument,getPage,getPageView,getGeneration,getEpoch,isClosed,isOpening,surface,pdfjsVersion}){
 if(pdfjsVersion!=='6.3.289'||!document||!page||page.pageNumber!==1||pageView?.pdfPage!==page||!pageView.div||typeof surface?.contains!=='function')return null;
 let revoked=false;
 const current=()=>!revoked&&getDocument()===document&&getPage()===page&&getPageView()===pageView&&surface.contains(pageView.div)&&getGeneration()===generation&&getEpoch()===epoch&&!isClosed();
 const masked=()=>isOpening()&&surface?.inert===true&&surface.style?.opacity==='0';
 return Object.freeze({document,page,pageIndex:0,generation,epoch,current,masked,revoke:()=>{revoked=true;}});
}

export function installFirstPageRenderLeaseV2731(options){
 const lease=captureFirstPaintLeaseV2731(options);
 if(!lease||typeof options.page.render!=='function')return ()=>{};
 const page=options.page,original=page.render,eligibleAtCapture=lease.current()&&lease.masked();let used=false;
 const wrapped=function(params){
  if(this!==page)return original.call(this,params);
  if(!lease.current()){const ErrorType=options.RenderingCancelledException||Error;throw new ErrorType('Rendering cancelled: the captured report or account changed.');}
  if(used||!eligibleAtCapture||!lease.masked()||(params?.intent&&params.intent!=='display'))return original.call(this,params);
  used=true;
  return original.call(this,{...params,cdqFirstPaintLeaseV2731:lease});
 };
 page.render=wrapped;
 return ()=>{lease.revoke();if(page.render===wrapped)page.render=original;};
}

export function createFirstPaintSchedulerV2731({lease,pageIndex,displayIntent,run,cancel,scheduleNormal,isCancelled,makeChannel=typeof MessageChannel==='function'?()=>new MessageChannel():null,observe=()=>{}}){
 // No adoption of an opening after task construction, or of a later document.
 if(!displayIntent||pageIndex!==0||lease?.pageIndex!==0||!lease?.document||lease?.page?.pageNumber!==1||typeof lease.current!=='function'||typeof lease.masked!=='function'||typeof makeChannel!=='function'||!lease.current()||!lease.masked())return null;
 let channel=null,pending=false,disposed=false,token=0,burst=0;
 const note=event=>{try{observe(event);}catch{}};
 function dispose(){if(disposed)return;disposed=true;pending=false;token++;if(channel){try{channel.port1.onmessage=null;}catch{}try{channel.port1.close();}catch{}try{channel.port2.close();}catch{}channel=null;}note({kind:'disposed'});}
 function owned(){if(isCancelled()){dispose();return false;}let current;try{current=lease.current();}catch(error){dispose();cancel(error);return false;}if(!current){dispose();cancel();return false;}return true;}
 function checkCurrent(){return owned();}
 function schedule(){
  if(disposed)return false;
  if(!owned())return true;
  let masked;try{masked=lease.masked();}catch(error){dispose();cancel(error);return true;}
  if(!masked){dispose();return false;}
  if(pending)return true;
  // Every third continuation retains PDF.js's actual animation-frame yield.
  if(burst===2){burst=0;note({kind:'raf'});return false;}
  if(!channel){
   try{channel=makeChannel();
   channel.port1.onmessage=event=>{
    if(disposed||!pending||event.data!==token)return;
    pending=false;
    if(!owned())return;
    let masked;try{masked=lease.masked();}catch(error){dispose();cancel(error);return;}
    if(!masked){dispose();scheduleNormal();return;}
    note({kind:'message-run'});
    try{run();}catch(error){dispose();cancel(error);}
   };
   channel.port1.start?.();
   }catch{dispose();return false;}
  }
  burst++;pending=true;token++;note({kind:'message-scheduled'});try{channel.port2.postMessage(token);}catch{dispose();return false;}return true;
 }
 return {schedule,checkCurrent,dispose};
}
