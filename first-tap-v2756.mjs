export function installFirstTapV2756(document) {
  function keepTarget(event) {
    if(event.button!==0 || event.isPrimary===false)return;
    const active=document.activeElement,button=event.target?.closest?.('button,input[type="button"],input[type="submit"]');
    if(!button || button.disabled || button===active || button.hasAttribute('onpointerdown') || button.hasAttribute('ontouchstart'))return;
    if(!active?.matches?.('textarea,input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"])'))return;
    // Preserve geometry until the trusted click. Do not synthesize destructive
    // clicks on pointerdown, and do not turn scroll/cancel gestures into actions.
    event.preventDefault();
  }
  document.addEventListener('pointerdown',keepTarget,{capture:true,passive:false});
  return ()=>document.removeEventListener('pointerdown',keepTarget,true);
}
