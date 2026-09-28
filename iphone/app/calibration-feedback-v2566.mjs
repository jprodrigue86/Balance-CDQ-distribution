// Every acknowledgement comes from the authenticated server. Local drafts are never confirmations.
export const revisionOf=d=>d.method?.revision||'inventory-2566';
export function calibrationIdentity(){
  try{if(typeof cdqAccessState!=='undefined'&&cdqAccessState!=='ready')return {email:'',role:''};return {email:String(typeof utilisateurCourantEmail!=='undefined'?utilisateurCourantEmail:'').trim().toLowerCase(),role:typeof utilisateurCourantRole!=='undefined'?utilisateurCourantRole:''};}catch{return {email:'',role:''};}
}
export function calibrationRpc(name,...args){
  return new Promise((resolve,reject)=>{
    if(typeof cdqApiRun!=='function')return reject(Error('Connexion au serveur indisponible.'));
    let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(Error('Le serveur ne répond pas. Le retour reste en attente.'));}},25000);
    const done=(fn,value)=>{if(!settled){settled=true;clearTimeout(timer);fn(value);}};
    try{cdqApiRun().withSuccessHandler(v=>done(resolve,v)).withFailureHandler(e=>done(reject,Error(e?.message||String(e))))[name](...args);}catch(e){done(reject,e);}
  });
}
const storageKey=email=>'cdqCalibrationOutbox2566:'+email;
export function pendingFeedback(email=calibrationIdentity().email){try{return JSON.parse(localStorage.getItem(storageKey(email))||'[]');}catch{return [];}}
function save(email,items){localStorage.setItem(storageKey(email),JSON.stringify(items));}
export function queueFeedback(device,kind,comment){
  const {email,role}=calibrationIdentity();if(!email||!['admin','technicien'].includes(role))throw Error('Un compte technicien est nécessaire.');
  if(!['worked','problem'].includes(kind))throw Error('Retour invalide.');
  if(kind==='worked'&&!device.method)throw Error('Aucune méthode à confirmer pour ce modèle.');
  comment=String(comment||'').trim();if(kind==='problem'&&comment.length<8)throw Error('Décris le problème rencontré (au moins 8 caractères).');
  const item={requestId:crypto.randomUUID(),deviceKey:device.key,revision:revisionOf(device),kind,comment:comment.slice(0,1600),createdAt:new Date().toISOString()};
  const items=pendingFeedback(email);items.push(item);save(email,items);return item;
}
let sending=null;
export async function flushFeedback(){
  const owner=calibrationIdentity().email;if(!owner||navigator.onLine===false)return {pending:pendingFeedback(owner).length};
  if(sending)return sending;
  sending=(async()=>{for(const item of pendingFeedback(owner)){
    if(calibrationIdentity().email!==owner)break;
    const result=await calibrationRpc('cdqEnregistrerRetourCalibrationV2566',item);
    if(result?.ok!==true||result.requestId!==item.requestId)throw Error('Le serveur de calibration doit être mis à jour. Le retour est conservé sur cet appareil, non envoyé.');
    // Read again so a second tab or a newly queued report is not overwritten.
    save(owner,pendingFeedback(owner).filter(x=>x.requestId!==item.requestId));
  }return {pending:pendingFeedback(owner).length};})();
  try{return await sending;}finally{sending=null;}
}
