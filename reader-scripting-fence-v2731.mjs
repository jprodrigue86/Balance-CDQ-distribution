// _visitedPages is a pinned PDF.js 6.3.289 action-promise map, not a ready flag.
export const READER_SCRIPTING_PDFJS_V2731='6.3.289';

export async function dispatchReaderSandboxEventV2731(sandboxReady,event,{schedule=setTimeout}={}){
  const sandbox=await sandboxReady;
  if(typeof sandbox?.dispatchEvent!=='function')throw Error('Le moteur de calcul PDF n’est pas disponible.');
  // Keep PDF.js's next-task dispatch. Completion follows the captured sandbox
  // call, including its real error; it never waits for readiness or destruction.
  return new Promise((resolve,reject)=>{
    schedule(()=>{try{resolve(sandbox.dispatchEvent(event));}catch(error){reject(error);}},0);
  });
}

export async function awaitReaderPageActionsV2731(scripting,pageNumber,{pdfjsVersion,checkLease=()=>{}}={}){
  checkLease();
  if(pdfjsVersion!==READER_SCRIPTING_PDFJS_V2731)throw Error('Le moteur de calcul PDF n’est pas compatible.');
  const visited=scripting?._visitedPages;
  if(!(visited instanceof Map)||!Number.isInteger(pageNumber)||pageNumber<1)throw Error('Les actions de la page PDF ne sont pas disponibles.');
  const actions=visited.get(pageNumber);
  if(!actions||typeof actions.then!=='function')throw Error('Les actions de la page PDF ne sont pas encore prêtes.');
  // Wait only for the page captured by this opening. The caller owns its lease
  // and retains the visual flush and animation-frame barriers after this wait.
  await actions;
  checkLease();
}
