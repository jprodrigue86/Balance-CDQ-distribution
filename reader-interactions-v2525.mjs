// Interactions du lecteur, indépendantes du moteur et des calculs du PDF.
const clampScale = scale => Math.max(.35, Math.min(4, scale));
const distance = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
const middle = (a, b) => ({x:(a.clientX + b.clientX) / 2, y:(a.clientY + b.clientY) / 2});

export function installTouchNavigation({container, surface, getViewer, now = Date.now, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame}) {
  let gesture = null, suppressClickUntil = 0, inertia = 0, pinchFrame = 0;
  function stopInertia(){if(inertia)cancelFrame(inertia);inertia=0;}
  function cancelPinchFrame(){if(pinchFrame)cancelFrame(pinchFrame);pinchFrame=0;}
  function paintPinchPreview(state=gesture){
    if(!state||state.mode!=='pinch')return;
    const ratio=state.targetScale/state.scale,{start,mid,rect}=state;
    const x=mid.x-rect.left-(start.x-rect.left)*ratio;
    const y=mid.y-rect.top-(start.y-rect.top)*ratio;
    surface.style.willChange='transform';
    surface.style.transform=`translate3d(${x}px, ${y}px, 0) scale(${ratio})`;
  }
  function schedulePinchPreview(){
    if(pinchFrame)return;
    pinchFrame=requestFrame(()=>{pinchFrame=0;paintPinchPreview();});
  }
  function capturePinchAnchor(point){
    const pages=surface.querySelectorAll?.('.page');
    if(!pages?.length)return null;
    for(const page of pages){
      const rect=page.getBoundingClientRect?.();
      if(!rect||!rect.width||!rect.height)continue;
      if(point.x<rect.left||point.x>rect.right||point.y<rect.top||point.y>rect.bottom)continue;
      return {
        page,
        x:(point.x-rect.left)/rect.width,
        y:(point.y-rect.top)/rect.height
      };
    }
    return null;
  }
  function restorePinchAnchor(anchor,target){
    if(!anchor?.page?.getBoundingClientRect)return false;
    const rect=anchor.page.getBoundingClientRect();
    if(!rect?.width||!rect?.height)return false;
    const x=rect.left+anchor.x*rect.width;
    const y=rect.top+anchor.y*rect.height;
    const dx=x-target.x,dy=y-target.y;
    if(Math.abs(dx)>.25)container.scrollLeft+=dx;
    if(Math.abs(dy)>.25)container.scrollTop+=dy;
    return true;
  }
  function coast(previous){
    if(!previous.moved||now()-previous.sampleTime>90)return;
    let vx=Math.max(-7,Math.min(7,previous.vx||0)),vy=Math.max(-7,Math.min(7,previous.vy||0)),last=now();
    function frame(){
      const time=now(),dt=Math.min(32,Math.max(1,time-last));last=time;
      const x=container.scrollLeft,y=container.scrollTop;
      container.scrollLeft=x+vx*dt;container.scrollTop=y+vy*dt;
      if(Math.abs(container.scrollLeft-x)<.1)vx=0;if(Math.abs(container.scrollTop-y)<.1)vy=0;
      const friction=Math.exp(-dt/325);vx*=friction;vy*=friction;
      if(Math.hypot(vx,vy)>.035){suppressClickUntil=time+100;inertia=requestFrame(frame);}else inertia=0;
    }
    if(Math.hypot(vx,vy)>.08)inertia=requestFrame(frame);
  }
  const resetPreview = () => {
    cancelPinchFrame();
    surface.style.transform = '';
    surface.style.transformOrigin = '';
    surface.style.willChange = '';
  };
  function finish(commit = true) {
    const previous = gesture;
    gesture = null;
    cancelPinchFrame();
    if (!previous) {resetPreview();return;}
    if (previous.moved || previous.mode === 'pinch') suppressClickUntil = now() + 450;
    if(previous.mode==='pan'&&commit){resetPreview();coast(previous);return;}
    if (previous.mode !== 'pinch' || !commit){resetPreview();return;}
    const viewer = getViewer();
    if (!viewer){resetPreview();return;}
    // V25.59: lock the actual PDF point under the fingers. The preview is
    // positioned relative to the page, whereas PDF.js normally anchors relative
    // to the viewer container; after repeated zooms those coordinate systems
    // drift as the page is re-centered. When we have a page anchor, let PDF.js
    // adopt the scale first, then force-layout and restore that exact page point
    // beneath the final midpoint before the browser can paint.
    paintPinchPreview(previous);
    if(previous.anchor){
      viewer.updateScale({
        scaleFactor:previous.targetScale / previous.scale,
        drawingDelay:250,
      });
      resetPreview();
      restorePinchAnchor(previous.anchor,previous.mid);
    }else{
      viewer.updateScale({
        scaleFactor:previous.targetScale / previous.scale,
        origin:[previous.start.x, previous.start.y],
        pan:[previous.mid.x - previous.start.x, previous.mid.y - previous.start.y],
        drawingDelay:250,
      });
      resetPreview();
    }
  }
  function startPan(t) {
    gesture = {mode:'pan', x:t.clientX, y:t.clientY,
      left:container.scrollLeft, top:container.scrollTop, moved:false, sampleX:t.clientX,sampleY:t.clientY,sampleTime:now(),vx:0,vy:0};
  }
  function start(e) {
    stopInertia();
    if (e.touches.length === 1) {gesture=null;return;}
    else if (e.touches.length === 2 && getViewer()) {
      if (gesture?.mode === 'pinch') finish();
      const [a, b] = e.touches, mid = middle(a, b);
      const scale = Number(getViewer().currentScale) || 1;
      gesture = {mode:'pinch', distance:Math.max(1, distance(a, b)), scale,
        targetScale:scale, start:mid, mid, rect:surface.getBoundingClientRect(),
        anchor:capturePinchAnchor(mid)};
      surface.style.transformOrigin = '0 0';
      surface.style.willChange = '';
      e.preventDefault();
    } else finish(false);
  }
  function move(e) {
    if (!gesture) return;
    if (gesture.mode === 'pan' && e.touches.length === 1) {
      const t = e.touches[0], dx = t.clientX - gesture.x, dy = t.clientY - gesture.y;
      if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
      const time=now(),dt=time-gesture.sampleTime;
      if(dt>0){const weight=dt>80?1:.7;gesture.vx=(1-weight)*gesture.vx+weight*(gesture.sampleX-t.clientX)/dt;gesture.vy=(1-weight)*gesture.vy+weight*(gesture.sampleY-t.clientY)/dt;gesture.sampleX=t.clientX;gesture.sampleY=t.clientY;gesture.sampleTime=time;}
      gesture.moved = true;
      suppressClickUntil = now() + 450;
      e.preventDefault();
      container.scrollLeft = gesture.left - dx;
      container.scrollTop = gesture.top - dy;
    } else if (gesture.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = e.touches;
      gesture.mid = middle(a, b);
      gesture.targetScale = clampScale(gesture.scale * distance(a, b) / gesture.distance);
      // Touch hardware can deliver events faster than the screen refreshes.
      // Coalesce them to one compositor update per animation frame.
      schedulePinchPreview();
    }
  }
  function end(e) {
    finish(e.type !== 'touchcancel' && (gesture?.mode==='pinch'||e.touches.length===0));
    if(e.type==='touchcancel')stopInertia();
  }
  function click(e) {
    if (now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); }
  }
  const options = {passive:false, capture:true};
  container.addEventListener('touchstart', start, options);
  container.addEventListener('touchmove', move, options);
  container.addEventListener('touchend', end, options);
  container.addEventListener('touchcancel', end, options);
  container.addEventListener('click', click, {capture:true});
  return {reset:() => {stopInertia();finish(false)}};
}

function normalizedName(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}

export function isAutomaticFieldName(name){
  const n=normalizedName(name);
  if(!n)return false;
  if((n.includes('type')&&n.includes('balance'))||n==='balance_type')return true;
  if(/(^|_)(tolerance|erreur|conforme|non_conforme|statut_conformite)($|_)/.test(n))return true;
  return false;
}

export function fieldRank(name) {
  const match = /^charge_point_(\d+)_(charge_utilisee|charge_contrainte|avant_correction|apres_correction)$/.exec(name || '');
  if (match) return ['charge_utilisee','charge_contrainte','avant_correction','apres_correction'].indexOf(match[2]) * 100 + Number(match[1]);
  if (name === 'charge_excentricite') return 1000;
  const corner = /^excentricite_(avant|apres)_(arriere_gauche|avant_gauche|arriere_droit|avant_droit)$/.exec(name || '');
  if (corner) return 1001 + (corner[1] === 'apres' ? 4 : 0) +
    ['arriere_gauche','avant_gauche','arriere_droit','avant_droit'].indexOf(corner[2]);
  return null;
}

function visualPosition(field){
  if(!field||typeof field.getBoundingClientRect!=='function')return null;
  const rect=field.getBoundingClientRect();
  if(!rect||![rect.top,rect.left,rect.width,rect.height].every(Number.isFinite))return null;
  const page=field.closest?.('.page');
  const pageRect=page&&typeof page.getBoundingClientRect==='function'?page.getBoundingClientRect():null;
  const pageNumber=Number(page?.dataset?.pageNumber||page?.getAttribute?.('data-page-number')||0);
  const width=Math.max(1,Number(pageRect?.width)||1),height=Math.max(1,Number(pageRect?.height)||1);
  return {
    page:Number.isFinite(pageNumber)?pageNumber:0,
    top:pageRect?(rect.top-pageRect.top)/height:rect.top,
    left:pageRect?(rect.left-pageRect.left)/width:rect.left,
    height:pageRect?rect.height/height:Math.max(1,rect.height)
  };
}

// Les vrais champs du PDF suivent leur position visuelle: page par page,
// de haut en bas, puis de gauche à droite sur une même ligne. Pour les petits
// tests sans géométrie, conserver l’ordre CDQ historique comme repli.
export function orderFields(items, nameOf = item => item.name) {
  const enriched=items.map((item,index)=>({item,index,pos:visualPosition(item),rank:fieldRank(nameOf(item))}));
  const positioned=enriched.filter(x=>x.pos);
  if(positioned.length===enriched.length&&enriched.length){
    enriched.sort((a,b)=>{
      if(a.pos.page!==b.pos.page)return a.pos.page-b.pos.page;
      const rowTolerance=Math.max(.004,Math.min(a.pos.height,b.pos.height)*.45);
      const dy=a.pos.top-b.pos.top;
      if(Math.abs(dy)>rowTolerance)return dy;
      const dx=a.pos.left-b.pos.left;
      if(Math.abs(dx)>.001)return dx;
      return a.index-b.index;
    });
  }
  // V25.61 — les champs de mesure CDQ doivent former une séquence métier
  // continue. Les permuter dans leurs cases visuelles ne suffit pas: dans le
  // vrai PDF, les refresh de l'annotation layer peuvent rétablir un parcours
  // ligne-par-ligne. Insérer donc toute la séquence classée au premier champ
  // de mesure rencontré, puis ignorer les autres emplacements classés.
  const ranked=enriched.filter(x=>x.rank!==null).sort((a,b)=>a.rank-b.rank);
  if(!ranked.length)return enriched.map(x=>x.item);
  const result=[];let inserted=false;
  for(const x of enriched){
    if(x.rank!==null){
      if(!inserted){result.push(...ranked.map(y=>y.item));inserted=true;}
      continue;
    }
    result.push(x.item);
  }
  return result;
}

export function isEditable(field) {
  return !!field && !field.disabled && !field.readOnly && field.type !== 'hidden' &&
    !field.closest('[hidden]') && field.getClientRects().length > 0 &&
    getComputedStyle(field).visibility !== 'hidden';
}

export function isNavigableField(field){
  return isEditable(field)&&!field.dataset?.cdqChoiceSource&&!isAutomaticFieldName(field.name);
}

export function installFormNavigation({surface, toolbar, previous, next, done, owner = document, reveal,openChoice,choiceIsOpen=()=>false,validate=()=>true}) {
  const selector = '.textWidgetAnnotation input, .textWidgetAnnotation textarea, .choiceWidgetAnnotation select, button[data-cdq-choice]';
  let active = null,autoChoice = null;
  const isChoice = field => field?.tagName === 'SELECT' && field.matches?.('.choiceWidgetAnnotation select');
  function openChoicePicker(field){
    if(!isChoice(field))return false;
    autoChoice=field;
    try{
      if(typeof field.showPicker==='function'){field.showPicker();return true;}
    }catch(_){}
    try{
      if(typeof field.click==='function'){field.click();return true;}
    }catch(_){}
    return false;
  }
  const fields = () => orderFields(Array.from(surface.querySelectorAll(selector)).filter(isNavigableField));
  function update() {
    const list = fields(), index = list.indexOf(active);
    toolbar.hidden = index < 0;
    owner.body.classList.toggle('form-navigation', index >= 0);
    previous.disabled = index <= 0;
    next.disabled = index < 0 || index === list.length - 1;
  }
  function revealTarget(target){
    if(typeof reveal==='function'){reveal(target);return;}
    try{target.scrollIntoView({block:'nearest', inline:'nearest', behavior:'instant'});}catch(_){}
  }
  function go(step, from = active) {
    if(choiceIsOpen())return false;
    if(!validate(from))return true; // handled: keep native Tab/Enter from leaving an invalid reading
    const list = fields(), index = list.indexOf(from), target = list[index + step];
    if (index < 0 || !target) return false;
    autoChoice=null;
    target.focus({preventScroll:true});
    revealTarget(target);
    if(target.dataset?.cdqChoice){openChoice?.(target);return true;}
    if(step>0&&isChoice(target))openChoicePicker(target);
    return true;
  }
  function refresh() {
    const navigable=fields(), navSet=new Set(navigable);
    let index=0;
    for (const field of surface.querySelectorAll(selector)) {
      const auto=isAutomaticFieldName(field.name);
      field.tabIndex = navSet.has(field) ? 0 : -1;
      if(auto){
        field.dataset.cdqAutoField='true';
        field.setAttribute?.('aria-readonly','true');
      }else{
        delete field.dataset.cdqAutoField;
        field.removeAttribute?.('aria-readonly');
      }
      if(navSet.has(field))field.dataset.cdqNavIndex=String(index++);
      else delete field.dataset.cdqNavIndex;
      if (field.tagName !== 'TEXTAREA'&&navSet.has(field)) field.enterKeyHint = 'next';
    }
    if(active&&!navSet.has(active))active=null;
    update();
  }
  surface.addEventListener('pointerdown',e=>{
    if(isChoice(e.target)&&e.target!==autoChoice)autoChoice=null;
  },{capture:true});
  surface.addEventListener('focusin', e => {
    if (!e.target.matches(selector) || !isNavigableField(e.target)) return;
    active = e.target; update();
  });
  owner.addEventListener('focusin', e => {
    if(choiceIsOpen())return;
    if (!surface.contains(e.target) && !toolbar.contains(e.target)) {active = null; update();}
  });
  surface.addEventListener('keydown', e => {
    if (e.isComposing || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter' && isNavigableField(e.target) && e.target.tagName === 'INPUT') {
      if (go(e.shiftKey ? -1 : 1, e.target)) {e.preventDefault(); e.stopPropagation();}
    }
  }, {capture:true});
  surface.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.isComposing && e.target.matches(selector) && isNavigableField(e.target) && go(e.shiftKey ? -1 : 1, e.target)) e.preventDefault();
  });
  surface.addEventListener('change', e => {
    if(e.target.dataset?.cdqChoiceSource)return;
    if (!e.target.matches('.choiceWidgetAnnotation select') || !isNavigableField(e.target)) return;
    const continueChain=autoChoice===e.target;
    autoChoice=null;
    active = e.target; update();
    if(continueChain)queueMicrotask(()=>go(1,e.target));
  });
  for (const button of [previous, next]) button.addEventListener('pointerdown', e => e.preventDefault());
  previous.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  done.addEventListener('click', () => {autoChoice=null;done.focus({preventScroll:true}); active = null; update();});
  return {refresh,advance:field=>go(1,field),reset:() => {autoChoice=null;active = null; update();}, fields};
}

export function installNativeTextInput(surface){
  const composing=new WeakSet();
  const editable=e=>e.target?.matches?.('.textWidgetAnnotation input,.textWidgetAnnotation textarea');
  surface.addEventListener('compositionstart',e=>{if(editable(e))composing.add(e.target)},{capture:true});
  surface.addEventListener('compositionend',e=>{composing.delete(e.target)},{capture:true});
  surface.addEventListener('beforeinput',e=>{
    if(!editable(e))return;
    if(e.target.dataset.cdqNativeInput==='true'||e.isComposing||composing.has(e.target)||!e.cancelable||/Composition|Replacement|FromPaste|FromDrop|historyUndo|historyRedo/.test(e.inputType))e.stopImmediatePropagation();
  },{capture:true});
  return {configure(fields){
    for(const input of surface.querySelectorAll('.textWidgetAnnotation input,.textWidgetAnnotation textarea')){
      const fieldActions=(fields?.get?.(input.name)||fields?.[input.name])?.[0]?.actions;const actions=fieldActions?.get?.('Keystroke')||fieldActions?.Keystroke;
      if(actions?.length&&actions.every(code=>code.includes('CDQDecimalPrecisionV2695')||/^\s*if\(event\.willCommit && (?:event\.commitKey===2|\(event\.commitKey===2 \|\| event\.commitKey===3\))/.test(code)&&code.includes('_cdqNavigationTimer')))input.dataset.cdqNativeInput='true';
    }
  }};
}
