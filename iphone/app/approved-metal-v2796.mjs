// CDQ 27.96 — layout synchronization for the exact approved black brushed-metal reference.
// Never creates client records, edits Drive data, changes PDF templates or calls RPC.
const root=document.documentElement;
const mobile=()=>root.classList.contains('cdq-mobile-layout')&&!root.classList.contains('cdq-desktop-v2676');
const selected=()=>root.dataset.cdqPalette==='metal'&&root.dataset.cdqBackgroundV2793==='brushed';
let queued=false,watching=null;
function sync(){
 queued=false;
 root.classList.toggle('cdq-metal-approved-v2796',mobile()&&selected());
 if(!mobile())return;
 // Keep all five backgrounds accessible without bringing back a visible
 // bottom Settings duplicate. Short tap keeps native create/rename behavior;
 // Android long-press on the upper-right pencil opens existing Réglages.
 const companyTool=document.getElementById('cdqCreateClientV2640');
 if(companyTool&&!companyTool.dataset.cdqSettingsLongpressV2796){
   companyTool.dataset.cdqSettingsLongpressV2796='1';
   companyTool.setAttribute('aria-description','Appui long : Réglages');
   companyTool.addEventListener('contextmenu',event=>{
     if(!mobile()||typeof window.cdqOpenSettingsV2294!=='function')return;
     event.preventDefault();
     event.stopPropagation();
     window.cdqOpenSettingsV2294();
   });
 }
 // A duplicate Settings tile was introduced in V27.93. The original four-action
 // bar still contains its settings node (hidden for layout/startup compatibility).
 // Remove only the bottom-navigation duplicate, never all settings functions.
 const nav=document.querySelector('.bottom-nav[data-cdq-sliding-nav="true"]');
 if(!nav)return;
 for(const button of [...nav.querySelectorAll(':scope > :is(#cdqSettingsNavButtonV2793,#displayModeButton,[data-workspace-route="settings"])')]){
   button.remove();
 }
 if(watching!==nav){
   watching=nav;
   new MutationObserver(records=>{
     if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&
       (node.matches?.('#cdqSettingsNavButtonV2793,#displayModeButton,[data-workspace-route="settings"]')
        ||node.querySelector?.('#cdqSettingsNavButtonV2793,#displayModeButton,[data-workspace-route="settings"]')))))schedule();
   }).observe(nav,{childList:true});
 }
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

