import {pdfWorkV2729} from './pdf-work-v2729.mjs';
export function createFieldWorkV2729({now=Date.now,onIdle=()=>{}}={}){
 let active=0,until=0,timer=0,disposed=false;const listeners=new Set();
 function notify(){clearTimeout(timer);timer=0;if(disposed||active)return;const left=until-now();if(left>0){timer=setTimeout(notify,left+1);return;}onIdle();for(const fn of listeners)fn();}
 function pulse(ms=400){if(disposed)return;until=Math.max(until,now()+ms);clearTimeout(timer);timer=setTimeout(notify,until-now()+1);}
 function begin(){if(disposed)throw Error('Traitement secondaire arrêté.');active++;let done=false;return()=>{if(done)return;done=true;active--;pulse(80);};}
 const available=()=>!disposed&&!active&&now()>=until;
 async function wait(valid=()=>true){while(!available()){if(disposed)throw Error('Traitement secondaire arrêté.');if(!valid())throw Error('Lecture secondaire suspendue.');await new Promise(resolve=>setTimeout(resolve,active?100:Math.min(100,Math.max(15,until-now()))));}if(!valid())throw Error('Le contexte a changé.');}
 return {begin,pulse,available,wait,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},state:()=>({active,until}),dispose(){disposed=true;clearTimeout(timer);listeners.clear();}};
}
let local;
export function fieldWorkV2729(){
 if(typeof window==='undefined')return null;
 try{if(window.parent!==window&&window.parent.location.origin===location.origin&&window.parent.cdqFieldWorkV2729)return window.parent.cdqFieldWorkV2729;}catch{}
 if(!local){local=createFieldWorkV2729();window.cdqFieldWorkV2729=local;}return local;
}
if(typeof window!=='undefined'){
 const work=fieldWorkV2729();window.cdqFieldWorkV2729=work;window.cdqPdfWorkV2729=pdfWorkV2729();
 document.addEventListener('pointerdown',()=>work.pulse(),{capture:true,passive:true});
 document.addEventListener('keydown',()=>work.pulse(200),{capture:true,passive:true});
 window.addEventListener('cdq:drive-cleared-v2632',()=>pdfWorkV2729().clear());
 window.addEventListener('cdq:access-state-v2527',event=>{if(event.detail!=='ready')pdfWorkV2729().clear();});
 if(window.parent!==window)work.subscribe(()=>window.dispatchEvent(new Event('cdq:field-idle-v2729')));
}
