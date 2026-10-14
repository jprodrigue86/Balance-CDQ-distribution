import {calibrationIcon} from './calibration-icon-v2566.mjs';
import {workspaceIcon} from './workspace-v2638.mjs';
export const navigationIconsV2651=[
  {label:'Accueil',key:'home',index:0,color:'#45d6ff'},
  {label:'Dossier',key:'folder',index:2,color:'#ff6285'},
  {label:'Calibration',key:'calibration',color:'#63edcf'},
  {label:'Calcul',key:'calcul',color:'#ffb64d'},
  {label:'Inventaire',key:'inventory',index:3,color:'#d783ff'},
  {label:'Factures',key:'invoices',index:4,color:'#6be9a9'},
  {label:'Opportunités',key:'opportunities',color:'#65eda4'},
  {label:'Corbeille',key:'trash',index:5,color:'#ff6262'}
];
function fill(preview,style){
  if(preview.dataset.previewStyle===style)return;
  preview.dataset.previewStyle=style;preview.setAttribute('aria-label','Aperçu des icônes, défilement horizontal');
  preview.tabIndex=0;
  for(const icon of navigationIconsV2651){
    const item=document.createElement('span');item.className='cdq-preview-item-v2651';item.dataset.previewIcon=icon.key;
    const art=document.createElement('span');art.className='cdq-preview-art-v2651';art.style.color=icon.color;art.setAttribute('aria-hidden','true');
    if(icon.key==='calibration')art.innerHTML=calibrationIcon(style,38);
    else if(['calcul','opportunities'].includes(icon.key))art.innerHTML=workspaceIcon(icon.key,style);
    else if(style==='current')art.innerHTML=window.cdqHomeIconsV2571.icons[icon.key];
    else {art.classList.add('cdq-icon-sample-v2514');window.cdqIconThemesV2514.sprite(art,style,icon.index);}
    const label=document.createElement('small');label.textContent=icon.label;item.append(art,label);preview.append(item);
  }
  // Native touch panning plus mouse dragging. A swipe inspects the preview and
  // must not select another theme when the pointer is released.
  let start=null,moved=false;
  preview.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,scroll:preview.scrollLeft};moved=false;});
  preview.addEventListener('pointermove',e=>{
    if(!start)return;if(Math.abs(e.clientX-start.x)>8||Math.abs(e.clientY-start.y)>8)moved=true;
    if(moved&&e.pointerType==='mouse'){preview.scrollLeft=start.scroll+start.x-e.clientX;e.preventDefault();}
  });
  preview.addEventListener('pointercancel',()=>{moved=true;start=null;});
  preview.addEventListener('pointerup',()=>{start=null;});
  preview.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
  preview.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();preview.scrollBy({left:e.key==='ArrowRight'?148:-148,behavior:'smooth'});}
  });
}
function mount(){document.querySelectorAll('.cdq-icon-choice-v2514').forEach(button=>{const preview=button.querySelector('.cdq-icon-preview-v2514');if(preview)fill(preview,button.dataset.iconStyle);});}
window.cdqIconPreviewsV2651={fill,mount};mount();
new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))mount();}).observe(document.body,{childList:true,subtree:true});
