// A single transform moves the painted PDF and its live form controls together.
// The 420 ms quiet window replaces the old 180 ms reflow + 250 ms raster timer.
// PDF.js adopts the final scale only after the input burst, in the same frame as
// removing the preview and restoring the point under the user's fingers.
const clamp=scale=>Math.max(.35,Math.min(4,scale));
export function createReaderZoomV2823({container,surface,getViewer,onScale=()=>{},onIdle=()=>{},quietMs=420,
 requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,setTimer=setTimeout,clearTimer=clearTimeout}){
 let state=null,checkpoint=null,frame=null,timer=null,held=false,generation=0;
 let renderOwner=null,deferredRefresh=null,pausedTasks=new Map();
 // The previous raster may still be rendering when the next pinch arrives.
 // Pause at PDF.js's public continuation boundary, retaining its one complete
 // displayed bitmap. No copied canvas, image cache, or additional display layer.
 function guardRendering(viewer){
  if(renderOwner?.viewer!==viewer){
   restoreRendering();
   const refresh=viewer.refresh,queue=viewer.renderingQueue,renderView=queue?.renderView;
   const guardedRefresh=function(...args){if(state&&getViewer()===viewer){deferredRefresh=args;return;}return refresh.apply(this,args);};
   const guardedRenderView=function(...args){if(state&&getViewer()===viewer)return false;return renderView.apply(this,args);};
   viewer.refresh=guardedRefresh;if(queue&&renderView)queue.renderView=guardedRenderView;
   renderOwner={viewer,refresh,guardedRefresh,queue,renderView,guardedRenderView};
  }
  for(let i=0;i<viewer.pagesCount;i++){
   const page=viewer.getPageView(i),task=page?.renderTask;if(!task||pausedTasks.has(task))continue;
   const record={page,task,original:task.onContinue,continuation:null};
   record.guarded=continuation=>{if(state&&getViewer()===viewer){record.continuation=continuation;return;}record.original?record.original(continuation):continuation();};
   task.onContinue=record.guarded;pausedTasks.set(task,record);
  }
 }
 function releaseRendering(){
  const pending=[...pausedTasks.values()];pausedTasks.clear();
  for(const r of pending){if(r.task.onContinue===r.guarded)r.task.onContinue=r.original;
   if(r.continuation&&r.page.renderTask===r.task){r.original?r.original(r.continuation):r.continuation();}}
 }
 function restoreRendering(){
  releaseRendering();deferredRefresh=null;
  if(!renderOwner)return;
  const r=renderOwner;renderOwner=null;
  if(r.viewer.refresh===r.guardedRefresh)r.viewer.refresh=r.refresh;
  if(r.queue?.renderView===r.guardedRenderView)r.queue.renderView=r.renderView;
 }

 function clearScheduled(){if(frame!==null)cancelFrame(frame);if(timer!==null)clearTimer(timer);frame=timer=null;}
 function clearPreview(){surface.style.transform='';surface.style.transformOrigin='';surface.style.willChange='';}
 function paint(){
  if(!state)return;
  surface.style.transformOrigin='0 0';surface.style.willChange='transform';
  surface.style.transform=`translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale/state.baseScale})`;
  onScale(state.scale);
 }
 function paintNow(){if(frame!==null)cancelFrame(frame);frame=null;paint();}
 function schedulePaint(){if(frame!==null)return;const version=generation;frame=requestFrame(()=>{frame=null;if(version===generation)paint();});}
 function origin(point){if(point)return {x:Number(point.x??point[0]),y:Number(point.y??point[1])};const r=container.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
 function capture(point){
  const pages=[...surface.querySelectorAll('.page')];
  let chosen=null,distance=Infinity;
  for(const page of pages){const rect=page.getBoundingClientRect();if(!rect.width||!rect.height)continue;
   const dx=Math.max(rect.left-point.x,0,point.x-rect.right),dy=Math.max(rect.top-point.y,0,point.y-rect.bottom),d=dx*dx+dy*dy;
   if(d<distance){distance=d;chosen={page,x:(point.x-rect.left)/rect.width,y:(point.y-rect.top)/rect.height,rect,single:pages.length===1};}
   if(d===0)break;
  }
  return chosen;
 }
 function begin(point){
  if(timer!==null)clearTimer(timer);timer=null;paintNow();
  const viewer=getViewer();if(!viewer||!Number.isFinite(viewer.currentScale)||viewer.currentScale<=0)return false;
  checkpoint=state?{...state}:null;held=true;
  const p=origin(point),r=surface.getBoundingClientRect(),ratio=state?state.scale/state.baseScale:1;
  const previous=state,anchor=capture(p),host=container.getBoundingClientRect();
  if(anchor){anchor.left=(anchor.rect.left-r.left)/ratio;anchor.top=(anchor.rect.top-r.top)/ratio;anchor.width=anchor.rect.width/ratio;anchor.height=anchor.rect.height/ratio;anchor.marginBottom=parseFloat(surface.ownerDocument?.defaultView?.getComputedStyle(anchor.page).marginBottom)||0;}
  state={viewer,document:viewer.pdfDocument,baseScale:previous?.baseScale??viewer.currentScale,scale:previous?.scale??viewer.currentScale,
   tx:previous?.tx??0,ty:previous?.ty??0,left:r.left-(previous?.tx??0),top:r.top-(previous?.ty??0),
   localX:(p.x-r.left)/ratio,localY:(p.y-r.top)/ratio,anchor,point:p,host:{left:host.left+(container.clientLeft||0),top:host.top+(container.clientTop||0),width:container.clientWidth||host.width,height:container.clientHeight||host.height}};
  guardRendering(viewer);return true;
 }
 function preview(scale,point){if(!state||!Number.isFinite(scale))return;
  const p=origin(point),ratio=clamp(scale)/state.baseScale;state.scale=clamp(scale);
  state.point=p;state.tx=p.x-state.left-state.localX*ratio;state.ty=p.y-state.top-state.localY*ratio;
  // A short page cannot scroll above its natural top; a narrow page stays
  // centered. Respect those same native bounds during the preview, so release
  // never snaps an impossible negative/oversized scroll back into range.
  const a=state.anchor,h=state.host;
  if(a?.single){
   const width=a.width*ratio,height=a.height*ratio,left=state.left+state.tx+a.left*ratio,top=state.top+state.ty+a.top*ratio;
   const wantedLeft=width<=h.width?h.left+(h.width-width)/2:Math.max(h.left+h.width-width,Math.min(h.left,left));
   const wantedTop=Math.max(h.top+Math.min(0,h.height-height-a.marginBottom),Math.min(h.top,top));
   state.tx+=wantedLeft-left;state.ty+=wantedTop-top;
  }
  schedulePaint();
 }
 function flush(){
  if(!state)return;
  preview(Math.round(state.scale*100)/100,state.point);
  paintNow();const final=state;clearScheduled();state=checkpoint=null;held=false;
  const viewer=getViewer();
  if(viewer!==final.viewer||viewer.pdfDocument!==final.document){clearPreview();restoreRendering();onIdle();return;}
  const before=final.anchor?.page?.getBoundingClientRect();
  const point=before?{x:before.left+final.anchor.x*before.width,y:before.top+final.anchor.y*before.height}:null;
  try{
   // Remove the compositor transform before PDF.js reads page geometry. Both
   // changes and anchor restoration remain synchronous in this one frame.
   clearPreview();
   const changed=Math.abs(final.scale-viewer.currentScale)>1e-7,pending=deferredRefresh;deferredRefresh=null;
   if(changed)viewer.updateScale({scaleFactor:final.scale/viewer.currentScale,drawingDelay:0});
   else if(pending)viewer.refresh(...pending);
  }finally{
   clearPreview();
   if(point&&final.anchor.page.isConnected!==false){const after=final.anchor.page.getBoundingClientRect();
    const dx=after.left+final.anchor.x*after.width-point.x,dy=after.top+final.anchor.y*after.height-point.y;
    if(Math.abs(dx)>.25)container.scrollLeft+=dx;if(Math.abs(dy)>.25)container.scrollTop+=dy;
   }
   releaseRendering();onScale(viewer.currentScale);onIdle();
  }
 }
 function end(){held=false;checkpoint=null;
  // Match PDF.js updateScale rounding before the final preview is painted.
  if(state)preview(Math.round(state.scale*100)/100,state.point);
  if(timer!==null)clearTimer(timer);const version=generation;
  if(state)timer=setTimer(()=>{timer=null;if(version===generation&&!held)flush();},quietMs);else onIdle();
 }
 function cancel(){clearScheduled();state=checkpoint;checkpoint=null;held=false;if(state){paint();end();}else{clearPreview();const pending=deferredRefresh;deferredRefresh=null;if(pending)renderOwner?.viewer.refresh(...pending);releaseRendering();onScale(getViewer()?.currentScale||1);onIdle();}}
 function reset(){generation++;clearScheduled();state=checkpoint=null;held=false;clearPreview();restoreRendering();}
 function zoom(factor,point){if(!Number.isFinite(factor)||factor<=0)return;const p=origin(point);if(!begin(p))return;preview(state.scale*factor,p);end();}
 return {begin,preview,end,cancel,zoom,flush,reset,get scale(){return state?.scale??getViewer()?.currentScale??1;},get active(){return !!state;}};
}
