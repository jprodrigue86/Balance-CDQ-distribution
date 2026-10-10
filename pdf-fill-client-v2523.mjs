import {pdfWorkV2729} from './pdf-work-v2729.mjs';
export function fillInFrame(values,options={}){
  const worker=pdfWorkV2729();
  if(worker&&options.blob&&Object.keys(values||{}).every(name=>/^client_/.test(name)))return worker.requestBlob('prefill',options.blob,{values,strict:options.strict!==false,onlyEmpty:options.onlyEmpty===true}).then(result=>new Blob([result.bytes],{type:'application/pdf'}));
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe'),url=new URL('./pdf-fill-v2523.html',import.meta.url),requestId=crypto.randomUUID();
    frame.hidden=true;frame.title='Préparation du PDF';frame.src=url.href;
    const finish=(err,blob)=>{clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();err?reject(Error(err)):resolve(blob);};
    const timer=setTimeout(()=>finish('La préparation du PDF a expiré. Réessayez.'),60000);
    function receive(e){if(e.source!==frame.contentWindow||e.origin!==url.origin)return;const d=e.data||{};if(d.type==='CDQ_FILL_READY_V2523')frame.contentWindow.postMessage({type:'CDQ_FILL_V2523',requestId,values,blob:options.blob,strict:options.strict!==false,onlyEmpty:options.onlyEmpty===true},url.origin);if(d.type==='CDQ_FILLED_V2523'&&d.requestId===requestId)finish(d.error,d.blob);}
    window.addEventListener('message',receive);document.body.append(frame);
  });
}
