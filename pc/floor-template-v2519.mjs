// PDF approuvé : octets inchangés, aucun accès Drive.
const meta=Object.freeze({"modeleId":"plancher","templateId":"cdq-app-plancher-v2587-042e5a9a54fae6172d89","name":"Balance de plancher.pdf","sha256":"042e5a9a54fae6172d89f5baca7e469bb66e8d4a3309f792b9fcdb14811929ff","taille":298388,"modifieLe":1790624517159});
const asset=new URL("./assets/startup-v2681/floor-042e5a9a54fae6172d89f5baca7e469bb66e8d4a3309f792b9fcdb14811929ff.pdf",import.meta.url);
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
