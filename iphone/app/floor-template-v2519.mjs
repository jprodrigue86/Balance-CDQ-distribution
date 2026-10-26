// PDF approuvé : octets inchangés, aucun accès Drive.
const meta=Object.freeze({"modeleId":"plancher","templateId":"cdq-t05-plancher-19d6f984615009e0","name":"Balance de plancher.pdf","sha256":"19d6f984615009e01c8ce797242bfdbfb2716984e689774d8c9b54d05f04840b","taille":493574,"modifieLe":1792972800000});
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
