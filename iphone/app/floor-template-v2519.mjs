// PDF approuvé : octets inchangés, aucun accès Drive.
const meta=Object.freeze({"modeleId":"plancher","templateId":"cdq-visual-plancher-d855110eb8c14435","name":"Balance de plancher.pdf","sha256":"d855110eb8c144356dc9963944e9f5e8a7a87222e99c79d60298f4b1a9cc33ac","taille":527809,"modifieLe":1792972800000});
const asset=new URL("./assets/templates/plancher.pdf",import.meta.url);
let ready;
function floorTemplate(){
  if(!ready)ready=(async()=>{
    const response=await fetch(asset);if(!response.ok)throw Error('Le modèle intégré est indisponible.');
    const bytes=new Uint8Array(await response.arrayBuffer());
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(bytes.length!==meta.taille||hash!==meta.sha256)throw new Error('Le modèle intégré est incomplet.');
    return Object.freeze({...meta,blob:new Blob([bytes],{type:'application/pdf'})});
  })().catch(e=>{ready=null;throw e;});
  return ready;
}
export {floorTemplate,meta};
