// Keep display scans out of scrolling/pinch frames. PDF.js calculations continue
// immediately; explicit save/open flushes still apply every pending display scan.
export function createReaderMotionRefreshV2820(refresh,{
  container,defer=()=>false,isBusy=()=>false,quietMs=120,
  now=()=>performance.now(),requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,
  setTimer=setTimeout,clearTimer=clearTimeout
}={}){
  let pending=false,frame=null,timer=null,touching=false,lastMotion=-Infinity,generation=0;
  function cancel(){if(frame!==null)cancelFrame(frame);if(timer!==null)clearTimer(timer);frame=timer=null;}
  function queue(){
    if(!pending||defer()||touching||frame!==null||timer!==null)return;
    const remaining=quietMs-(now()-lastMotion),expected=generation;
    if(remaining>0||isBusy()){
      timer=setTimer(()=>{timer=null;if(expected===generation)queue();},Math.max(16,remaining, isBusy()?quietMs:0));
    }else frame=requestFrame(()=>{
      frame=null;if(expected!==generation||!pending)return;
      if(defer()||touching||isBusy()||now()-lastMotion<quietMs){queue();return;}
      pending=false;refresh();
    });
  }
  function schedule(){pending=true;queue();}
  function motion(){lastMotion=now();cancel();queue();}
  function start(){touching=true;motion();}
  function end(event){touching=event.type!=='touchcancel'&&event.touches.length>0;motion();}
  function reset(){generation++;pending=false;touching=false;lastMotion=-Infinity;cancel();}
  function flush(){if(!pending)return;cancel();pending=false;return refresh();}
  const passive={passive:true};
  container.addEventListener('scroll',motion,passive);
  container.addEventListener('touchstart',start,passive);
  container.addEventListener('touchend',end,passive);
  container.addEventListener('touchcancel',end,passive);
  return {schedule,flush,reset,dispose(){reset();container.removeEventListener('scroll',motion);container.removeEventListener('touchstart',start);container.removeEventListener('touchend',end);container.removeEventListener('touchcancel',end);}};
}
