// Android confirms the public file write; a browser can only confirm a request.
const pending=new Map();
window.cdqNativePdfDownloadResultV2657=(id,result)=>pending.get(id)?.(result);
function nativeBridge(){
  let target=window;
  for(let depth=0;depth<8;depth++){
    try{if(typeof target.BalanceCDQNative?.downloadPdf==='function')return target.BalanceCDQNative;if(target===target.parent)break;target=target.parent;}catch{break;}
  }
  return null;
}
function encoded(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Impossible de préparer le PDF.'));reader.readAsDataURL(blob);});}
export async function downloadPdf(blob,name){
  const bridge=nativeBridge();
  if(bridge){
    const id='pdf-'+crypto.randomUUID();
    let timer;
    const completed=new Promise(resolve=>{pending.set(id,resolve);timer=setTimeout(()=>resolve({ok:false,message:'Le téléchargement n’a pas été confirmé. Réessayez.'}),300000);});
    try{
      const result=JSON.parse(bridge.downloadPdf(id,String(name||'Rapport.pdf'),await encoded(blob)));
      const receipt=result.pending?await completed:result;
      if(!receipt.ok)throw Error(receipt.message||'Impossible d’enregistrer le PDF dans le téléphone.');
      return receipt.message||'PDF enregistré dans Téléchargements : '+receipt.name;
    }finally{clearTimeout(timer);pending.delete(id);}
  }
  if(/BalanceCDQAndroid\//.test(navigator.userAgent))throw Error('La mise à jour Android est nécessaire pour enregistrer ce PDF dans le téléphone.');
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=String(name||'Rapport.pdf');document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  return 'Téléchargement demandé au navigateur.';
}
