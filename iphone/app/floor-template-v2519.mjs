// PDF approuvé : octets inchangés, aucun accès Drive.
const meta=Object.freeze({"modeleId":"plancher","templateId":"cdq-complete-plancher-71507049912061a8","name":"Balance de plancher.pdf","sha256":"71507049912061a88a973f184ccae05b5061f3860874237aa3284e4a53483c8a","taille":517413,"modifieLe":1792972800000});
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
