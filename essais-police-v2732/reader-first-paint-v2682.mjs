// The static canvas and interactive artwork must be ready in the same reveal.
export function firstReaderPaintV2682(eventBus){
 let canvas=false,annotations=false,error=null,waiter=null,timer=null;
 function cleanup(){clearTimeout(timer);eventBus.off('pagerendered',paint);eventBus.off('annotationlayerrendered',annotate);}
 function finish(){if(!waiter)return;if(error){cleanup();waiter.reject(error);waiter=null;}else if(canvas&&(!waiter.required||annotations)){cleanup();waiter.resolve();waiter=null;}}
 function paint(e){if(e.pageNumber!==1)return;canvas=true;if(e.error)error=e.error;finish();}
 function annotate(e){if(e.pageNumber!==1)return;annotations=true;if(e.error)error=e.error;finish();}
 eventBus.on('pagerendered',paint);eventBus.on('annotationlayerrendered',annotate);
 return {wait(required){return new Promise((resolve,reject)=>{waiter={required,resolve,reject};timer=setTimeout(()=>{error=Error('Le rendu du PDF n’a pas terminé. Réessayez son ouverture.');finish();},15000);finish();});},dispose:cleanup};
}
