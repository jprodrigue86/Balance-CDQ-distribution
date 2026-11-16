// Payloads stay binary in the existing account-scoped durable outbox. Legacy
// base64 and its text digest retain their own encoding and acknowledgement.
const pdfHashesV2751=new WeakMap(),pdfBase64V2751=new WeakMap();
export async function pdfActionBlobV2751(action){
 if(action?.blob instanceof Blob)return action.blob;
 if(action?.pdfBytesV2664 instanceof ArrayBuffer)return new Blob([action.pdfBytesV2664],{type:'application/pdf'});
 if(typeof action?.data==='string'&&action.data){const raw=atob(action.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:'application/pdf'});}
 throw Error('Les réponses locales ne sont pas disponibles. L’envoi reste en attente.');
}
export async function pdfByteSha256V2751(blob){
 if(!pdfHashesV2751.has(blob))pdfHashesV2751.set(blob,blob.arrayBuffer().then(bytes=>crypto.subtle.digest('SHA-256',bytes)).then(hash=>Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('')));
 return pdfHashesV2751.get(blob);
}
export async function pdfActionBase64V2751(action){
 if(typeof action?.data==='string'&&action.data)return action.data;
 const blob=await pdfActionBlobV2751(action);
 if(!pdfBase64V2751.has(blob))pdfBase64V2751.set(blob,blob.arrayBuffer().then(buffer=>{const bytes=new Uint8Array(buffer);let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return btoa(raw);}));
 return pdfBase64V2751.get(blob);
}
export function confirmedBinaryPdfSaveV2751(receipt,action,email,hash){
 return !!(receipt?.ok&&receipt.id===action.targetId&&receipt.owner===email&&receipt.revision&&receipt.byteSha256===hash&&receipt.sha256Encoding==='hex-bytes-v1'&&receipt.uploadId===action.id);
}
export function createDriveTransferV2751({rpc,get,put,owner,guard,context=()=>0,fetch:fetcher=globalThis.fetch,flight=(_id,run)=>run(),historicalReceipt}){
 const caps=new Map();
 const same=(a,b)=>a&&a.owner===b.owner&&a.uploadId===b.uploadId&&a.operation===b.operation&&a.fileId===b.fileId&&a.clientId===b.clientId&&a.destinationId===b.destinationId&&a.expectedRevision===b.expectedRevision&&a.name===b.name&&a.sha256===b.sha256&&a.size===b.size&&a.sourceId===b.sourceId&&a.family===b.family&&a.sha256Encoding===b.sha256Encoding;
 function scope(){const email=owner(),epoch=context();const valid=()=>{guard(email);if(epoch!==context()||owner()!==email)throw Error('Le compte ou l’accès a changé.');};valid();return {email,valid};}
 async function capabilities(){
  const {email,valid}=scope(),key=email+'|'+context();
  if(!caps.has(key))caps.set(key,Promise.resolve().then(()=>rpc('cdqTransportCapabilitiesV2751',[])).catch(error=>{caps.delete(key);throw error;}));
  const result=await caps.get(key);valid();return result;
 }
 async function write(action,{legacy}={}){
  const {email,valid}=scope();if(action.owner!==email)throw Error('Cette sauvegarde appartient à un autre compte.');
  const blob=await pdfActionBlobV2751(action);valid();
  if(blob.type!=='application/pdf'||blob.size<8||blob.size>32*1024*1024||await blob.slice(0,5).text()!=='%PDF-')throw Error('PDF invalide.');valid();
  const capability=await capabilities();valid();
  if(capability?.ok!==true||capability.binaryStaging!==true||capability.provider!=='cloudflare-r2'||capability.sha256Encoding!=='hex-bytes-v1')throw Error(capability?.message||'La capacité de sauvegarde Drive n’a pas été confirmée.');
  if(capability.maxBytes&&blob.size>capability.maxBytes)throw Error('Le PDF dépasse la taille autorisée.');
  const hash=await pdfByteSha256V2751(blob);valid();
  if(action.byteSha256&&action.byteSha256!==hash)throw Error('Les réponses locales ont changé. L’envoi reste en attente.');
  const meta={owner:email,uploadId:action.id,operation:action.operation||'save',fileId:action.targetId||'',clientId:action.clientId||'',destinationId:action.folderId||'',expectedRevision:action.expectedRevision||'',name:action.fileName||'Rapport.pdf',sha256:hash,sha256Encoding:'hex-bytes-v1',size:blob.size,sourceId:action.sourceId||'',family:action.modeleId||''};
  return flight(action.id,async()=>{
   valid();let state=await get('pdf-transfer-v2751',action.id);valid();
   if(state&&!same(state,meta))throw Error('Cet envoi appartient à un autre contenu ou une autre destination.');
   function receipt(result){
    valid();if(!result?.ok||!result.id||!result.revision||String(result.name||result.nom||'')!==meta.name||result.uploadId!==meta.uploadId||result.sha256Encoding!=='hex-bytes-v1'||result.sha256!==hash||Number(result.size)!==blob.size||meta.clientId&&String(result.clientId)!==String(meta.clientId)||meta.destinationId&&String(result.destinationId)!==String(meta.destinationId)||meta.operation==='save'&&String(result.id)!==String(meta.fileId))throw Error('La sauvegarde Drive n’a pas été confirmée.');
    return {...result,owner:email,byteSha256:hash};
   }
   if(state?.receipt)return receipt(state.receipt);
   async function persist(value){valid();if(await put('pdf-transfer-v2751',action.id,value)===false)throw Error('Le PDF n’a pas pu être conservé. L’envoi reste en attente.');valid();state=value;}
   if(!state)await persist({...meta,phase:'prepared'});
   async function finalize(){const result=receipt(await rpc('cdqFinalizeUploadV2751',[meta.uploadId]));valid();await persist({...meta,phase:'confirmed',receipt:result});return result;}
   if(state.phase==='uploaded'||state.phase==='put-started'){
    try{return await finalize();}catch(error){valid();const message=String(error?.message||error);if(!/(?:UPLOAD_INCOMPLETE|UPLOAD_EXPIRED|CDQ_UPLOAD_PENDING_V2751|staging.*(?:incomplet|absent))/i.test(message))throw error;}
   }
   const begun=await rpc('cdqBeginUploadV2751',[meta]);valid();
   if(begun?.receipt||begun?.committed){const result=receipt(begun.receipt||begun);await persist({...meta,phase:'confirmed',receipt:result});return result;}
   if(!begun?.ok||begun.uploadId!==meta.uploadId)throw Error('La préparation de l’envoi Drive n’a pas été confirmée.');
   if(begun.uploaded===true){await persist({...meta,phase:'uploaded'});return finalize();}
   let url;try{url=new URL(begun.uploadUrl);}catch{throw Error('La destination temporaire Drive est invalide.');}
   if(url.origin!=='https://cdq-report-engine.balance-cdq.workers.dev'||url.pathname!=='/v2/app/pdf-upload-bytes'||url.username||url.password||url.hash||[...url.searchParams.keys()].length!==2||! /^[a-f0-9]{64}$/.test(url.searchParams.get('key')||'')||! /^[a-f0-9]{64}$/.test(url.searchParams.get('token')||''))throw Error('La destination temporaire Drive est invalide.');
   await persist({...meta,phase:'put-started'});valid();
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);let response;
   let transportError;
   try{response=await fetcher(url.href,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:blob,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:controller.signal});}catch(error){transportError=error;}finally{clearTimeout(timer);}valid();
   if(transportError||!response?.ok){
    // Drive may have committed the bytes even when its PUT response is lost.
    // Reconcile this exact durable upload once; only a validated receipt wins.
    // Keep put-started on failure so a later retry checks before sending again.
    try{return await finalize();}catch(error){valid();throw error;}
   }
   await persist({...meta,phase:'uploaded'});return finalize();
  });
 }
 return {capabilities,write,reset(){caps.clear();}};
}
