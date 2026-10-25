(function(){
'use strict';
function createInteractionTimingV2764({now=()=>performance.now(),persist=()=>{}}={}){
  const active=new Map(),rows=[];let sequence=0;
  function save(){try{persist(rows.map(row=>({...row,phases:row.phases.slice()})));}catch{}}
  function start(kind){if(active.has(kind))finish(kind,'replaced');const row={sequence:++sequence,kind,started:now(),phases:[]};active.set(kind,row);return row.sequence;}
  function phase(kind,name){const row=active.get(kind);if(row&&row.phases.length<32)row.phases.push({phase:name,elapsedMs:Math.round(now()-row.started)});}
  function finish(kind,status='ready'){const row=active.get(kind);if(!row)return;active.delete(kind);rows.push({sequence:row.sequence,kind,status,elapsedMs:Math.round(now()-row.started),phases:row.phases});if(rows.length>30)rows.shift();save();}
  return {start,phase,finish,active:kind=>active.has(kind),snapshot:()=>({schema:'cdq-interaction-timing-v2764',clock:'performance.now',cacheState:'not-certified-cold',journeyIncludesSelectionTime:true,completed:rows.map(x=>({...x,phases:x.phases.slice()})),pending:[...active.values()].map(x=>({kind:x.kind,elapsedMs:Math.round(now()-x.started),phases:x.phases.slice()}))})};
}
if(typeof window==='undefined')return;
if(window.cdqInteractionTimingV2764)return;
const timing=createInteractionTimingV2764();
const paints=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));
const afterPaint=(kind,status='ready')=>paints(()=>timing.finish(kind,status));
window.cdqInteractionTimingV2764={...timing,afterPaint,clientPaint:()=>paints(()=>{
  timing.phase('journey','client-rendered');timing.finish('client');
}),folderPaint:()=>paints(()=>{timing.finish('folder');timing.finish('journey');})};
document.addEventListener('click',event=>{
 const target=event.target?.closest?.('button,.company-item,.folder-header,.cdq-desktop-folder-row,.bottom-nav-item');if(!target)return;
 if(target.matches('[data-workspace-route="dossier"]'))timing.start('journey');
 if(target.closest('.company-item')&&!event.target.closest('button')){if(!timing.active('journey'))timing.start('journey');timing.start('client');timing.phase('journey','client-click');}
 if(target.matches('.folder-header,.cdq-desktop-folder-row')&&!event.target.closest('button')){timing.start('folder');timing.phase('journey','folder-click');const folder=target.closest('.folder');paints(()=>{if(folder?.classList.contains('open')&&!folder.classList.contains('cdq-folder-loading')&&!folder.dataset.cdqLoadFailedV2627){timing.finish('folder');timing.finish('journey');}});}
},true);
window.addEventListener('cdq:reader-opening-metric-v2757',event=>timing.phase('pdf',String(event.detail?.phase||'unknown')));
window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')for(const kind of ['journey','client','folder','pdf'])timing.finish(kind,'access-changed');});
})();
