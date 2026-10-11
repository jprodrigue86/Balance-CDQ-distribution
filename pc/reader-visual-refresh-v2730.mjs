// PDF.js applies sandbox updates immediately. Only CDQ's repeated display scans
// share a timer; a reveal or save can synchronously flush the pending scan.
export function createReaderVisualRefreshV2730(refresh,{setTimer=setTimeout,clearTimer=clearTimeout,defer=()=>false}={}){
  let generation=0,pending=false,timer=null;
  function run(expected){
    if(expected!==generation||!pending)return;
    pending=false;timer=null;return refresh();
  }
  function schedule(){
    if(pending)return;
    pending=true;const expected=generation;
    // Opening applies the real PDF.js sandbox updates immediately, but keeps
    // CDQ display scans for the explicit flush before the editable reveal.
    if(!defer())timer=setTimer(()=>run(expected),0);
  }
  function flush(){
    if(!pending)return;
    clearTimer(timer);timer=null;return run(generation);
  }
  function reset(){generation++;pending=false;clearTimer(timer);timer=null;}
  return {schedule,flush,reset};
}
