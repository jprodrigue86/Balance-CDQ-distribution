// Isolated problem-menu viewport. One finger pans; two fingers zoom its contents.
// The PDF viewer and other choice dialogs keep their existing gesture handling.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const midpoint=touches=>({x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2});
const distance=touches=>Math.max(1,Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY));

export function installProblemGestures({viewport,target=viewport,now=Date.now}){
  let content=null,scale=1,gesture=null,suppressUntil=0;
  function point(p){const r=viewport.getBoundingClientRect();return {x:clamp(p.x-r.left-viewport.clientLeft,0,viewport.clientWidth),y:clamp(p.y-r.top-viewport.clientTop,0,viewport.clientHeight)};}
  function zoom(next,anchor,target=anchor){
    next=clamp(next,1,3);
    const x=(viewport.scrollLeft+anchor.x)/scale,y=(viewport.scrollTop+anchor.y)/scale;
    scale=next;content.style.zoom=String(scale);
    viewport.scrollLeft=x*scale-target.x;viewport.scrollTop=y*scale-target.y;
  }
  function begin(touches,continued=false){
    if(touches.length===2){
      gesture={mode:'pinch',distance:distance(touches),scale,point:point(midpoint(touches))};
      suppressUntil=now()+450;
    }else if(touches.length===1){
      const t=touches[0];gesture={mode:'pan',id:t.identifier,x:t.clientX,y:t.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:continued};
    }else gesture=null;
  }
  function start(e){
    if(!content)return;
    // A fresh tap must work immediately after a previous drag; only the synthetic
    // click belonging to the drag/pinch is swallowed.
    if(e.touches.length===1)suppressUntil=0;
    begin(e.touches);
    if(e.touches.length>1){suppressUntil=now()+450;e.preventDefault();}
  }
  function move(e){
    if(!content||!gesture)return;
    if(e.touches.length===2&&gesture.mode==='pinch'){
      e.preventDefault();
      const target=point(midpoint(e.touches));
      zoom(gesture.scale*distance(e.touches)/gesture.distance,gesture.point,target);
      gesture.point=target;gesture.distance=distance(e.touches);gesture.scale=scale;
      suppressUntil=now()+450;
    }else if(e.touches.length===1&&gesture.mode==='pan'){
      const t=e.touches[0];if(t.identifier!==gesture.id){begin(e.touches,true);return;}
      const dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
      if(!gesture.moved&&Math.hypot(dx,dy)<6)return;
      e.preventDefault();gesture.moved=true;suppressUntil=now()+450;
      viewport.scrollLeft=gesture.left-dx;viewport.scrollTop=gesture.top-dy;
    }
  }
  function end(e){
    if(!content)return;
    const moved=gesture?.mode==='pinch'||gesture?.moved;
    if(moved)suppressUntil=now()+450;
    gesture=null;
    if(e.type!=='touchcancel'&&e.touches.length)begin(e.touches,!!moved);
  }
  function click(e){if(content&&now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}}
  const options={capture:true,passive:false};
  target.addEventListener('touchstart',start,options);
  target.addEventListener('touchmove',move,options);
  target.addEventListener('touchend',end,options);
  target.addEventListener('touchcancel',end,options);
  target.addEventListener('click',click,true);
  return {
    open(){
      scale=1;gesture=null;suppressUntil=0;
      content=viewport.ownerDocument.createElement('div');content.className='choice-zoom-content';
      // Fix the unzoomed width so CSS zoom creates real overflow in both axes,
      // rather than reflowing the labels into a narrower column at each pinch.
      content.style.width=viewport.clientWidth+'px';
      content.append(...viewport.childNodes);viewport.append(content);
      viewport.classList.add('choice-touch-viewport');viewport.scrollLeft=0;viewport.scrollTop=0;
    },
    close(){content=null;gesture=null;scale=1;suppressUntil=0;viewport.classList.remove('choice-touch-viewport');},
  };
}
