// Preserve the actual field state; autofill must not impose a cyan palette.
export function installAutofillPaletteV2871(surface){
 const apply=el=>{if(!el.matches?.('input,textarea,select'))return;const color=el.style.backgroundColor;const wanted=color&&color!=='transparent'&&color!=='rgba(0, 0, 0, 0)'?color:'#fff';if(el.style.getPropertyValue('--cdq-authored-field-background')!==wanted)el.style.setProperty('--cdq-authored-field-background',wanted);};
 const refresh=()=>surface.querySelectorAll('input,textarea,select').forEach(apply);
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))refresh();for(const r of records)if(r.type==='attributes')apply(r.target);});
 refresh();observer.observe(surface,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});return()=>observer.disconnect();
}
