// CDQ 27.96 — layout synchronization for the exact approved black brushed-metal reference.
// Never creates client records, edits Drive data, changes PDF templates or calls RPC.
const root=document.documentElement;
const mobile=()=>root.classList.contains('cdq-mobile-layout')&&!root.classList.contains('cdq-desktop-v2676');
const selected=()=>root.dataset.cdqPalette==='metal'&&root.dataset.cdqBackgroundV2793==='brushed';
let queued=false;
function sync(){
 queued=false;
 root.classList.toggle('cdq-metal-approved-v2796',mobile()&&selected());
 if(!mobile())return;
 // Settings belongs to the existing sliding navigation. Its creator in
 // background-v2793.mjs preserves the saved route order and original click action.
 // Do not remove navigation items or replace their handlers here.

}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync)}
new MutationObserver(records=>{
 if(records.some(x=>['data-cdq-palette','data-cdq-background-v2793','class'].includes(x.attributeName)))schedule();
}).observe(root,{attributes:true,attributeFilter:['data-cdq-palette','data-cdq-background-v2793','class']});
window.addEventListener('cdq:access-ready',schedule);
window.addEventListener('cdq:access-state-v2527',schedule);
document.addEventListener('DOMContentLoaded',schedule,{once:true});
if(document.readyState!=='loading')sync();
window.cdqApprovedMetalV2796=Object.freeze({sync,selected});

