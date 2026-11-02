// A single transform moves the painted PDF and its live form controls together.
// PDF.js adopts the final scale only after the input burst, in the same frame as
// removing the preview and restoring the point under the user's fingers.
const clamp=scale=>Math.max(.35,Math.min(4,scale));
export function createReaderZoomV2821({container,surface,getViewer,onScale=()=>{},onIdle=()=>{},quietMs=180,
 requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,setTimer=setTimeout,clearTimer=clearTimeout}){
 let state=null,checkpoint=null,frame=null,timer=null,held=false,generation=0;
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
  return true;
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
  paintNow();const final=state;clearScheduled();state=checkpoint=null;held=false;
  const viewer=getViewer();
  if(viewer!==final.viewer||viewer.pdfDocument!==final.document){clearPreview();onIdle();return;}
  const before=final.anchor?.page?.getBoundingClientRect();
  const point=before?{x:before.left+final.anchor.x*before.width,y:before.top+final.anchor.y*before.height}:null;
  try{
   if(Math.abs(final.scale-viewer.currentScale)>1e-7)viewer.updateScale({scaleFactor:final.scale/viewer.currentScale,drawingDelay:250});
  }finally{
   clearPreview();
   if(point&&final.anchor.page.isConnected!==false){const after=final.anchor.page.getBoundingClientRect();
    const dx=after.left+final.anchor.x*after.width-point.x,dy=after.top+final.anchor.y*after.height-point.y;
    if(Math.abs(dx)>.25)container.scrollLeft+=dx;if(Math.abs(dy)>.25)container.scrollTop+=dy;
   }
   onScale(viewer.currentScale);onIdle();
  }
 }
 function end(){held=false;checkpoint=null;
  // Match PDF.js updateScale rounding before the final preview is painted.
  if(state)preview(Math.round(state.scale*100)/100,state.point);
  if(timer!==null)clearTimer(timer);const version=generation;
  if(state)timer=setTimer(()=>{timer=null;if(version===generation&&!held)flush();},quietMs);else onIdle();
 }
 function cancel(){clearScheduled();state=checkpoint;checkpoint=null;held=false;if(state){paint();end();}else{clearPreview();onScale(getViewer()?.currentScale||1);onIdle();}}
 function reset(){generation++;clearScheduled();state=checkpoint=null;held=false;clearPreview();}
 function zoom(factor,point){if(!Number.isFinite(factor)||factor<=0)return;const p=origin(point);if(!begin(p))return;preview(state.scale*factor,p);end();}
 return {begin,preview,end,cancel,zoom,flush,reset,get scale(){return state?.scale??getViewer()?.currentScale??1;},get active(){return !!state;}};
}
