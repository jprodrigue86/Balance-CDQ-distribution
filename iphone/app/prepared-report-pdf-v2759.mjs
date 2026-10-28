// A prepared PDF is a durable companion to the exact field snapshot. The
// server still owns authorization, revision ordering and the Drive receipt.
const MAX_BYTES=16*1024*1024;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const digest=async bytes=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
export function canonicalReportFieldsV2759(value){
  if(Array.isArray(value))return value.map(canonicalReportFieldsV2759);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalReportFieldsV2759(value[key])]));
  return value;
}
export async function prepareReportPdfV2759(payload,source){
  if(source==null)return null;
  if(!payload?.requestId||!payload.reportId||!payload.template?.sha256||!payload.fields)throw Error('Le PDF préparé doit correspondre à une sauvegarde précise.');
  let bytes;
  if(source instanceof Blob)bytes=new Uint8Array(await source.arrayBuffer());
  else if(source instanceof Uint8Array)bytes=source.slice();
  else if(source instanceof ArrayBuffer)bytes=new Uint8Array(source.slice(0));
  else throw Error('Le contenu du PDF préparé est invalide.');
  if(bytes.length<8||bytes.length>MAX_BYTES||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('La taille ou la signature du PDF préparé est invalide.');
  let binary='';for(let at=0;at<bytes.length;at+=16384)binary+=String.fromCharCode(...bytes.subarray(at,at+16384));
  const [sha256,fieldsSha256]=await Promise.all([digest(bytes),digest(new TextEncoder().encode(JSON.stringify(canonicalReportFieldsV2759(payload.fields))))]);
  return {base64:btoa(binary),size:bytes.length,sha256,requestId:payload.requestId,reportId:payload.reportId,templateSha256:payload.template.sha256,fieldsSha256};
}


// Recovery downloads must use the exact saved artifact, never a template Blob
// which can precede the latest durable field snapshot.
export async function recoveryCopyPdfV2792(copy,owner){
  const fail=(message,code)=>{throw Object.assign(Error(message),{code});};
  if(!copy||!owner||copy.email!==owner)fail('Le compte de cette copie a changé.','RECOVERY_ACCOUNT_CHANGED');
  const engine=copy.reportEngineV2754,payload=copy.reportPayloadV2754,snapshot=copy.reportSnapshotV2754;
  if(!engine&&!snapshot&&!payload){
    if(!(copy.blob instanceof Blob)||copy.blob.size<8||copy.blob.size>32*1024*1024||await copy.blob.slice(0,5).text()!=='%PDF-')fail('La copie PDF conservée est invalide.','INVALID_RECOVERY_PDF');
    return copy.blob;
  }
  if(!engine||!payload||!snapshot||!payload.preparedPdfV2759)fail('Les réponses sont conservées. Ouvrez la copie puis utilisez Télécharger dans le lecteur pour produire le PDF rempli.','RECOVERY_READER_REQUIRED');
  const prepared=payload.preparedPdfV2759;
  if(payload.reportId!==engine.reportId||payload.clientId!==engine.clientId||payload.destinationId!==engine.destinationId||
    payload.template?.sha256!==engine.template?.sha256||payload.template?.modeleId!==engine.template?.modeleId||
    copy.uploadId!=='fields_'+payload.requestId||prepared.requestId!==payload.requestId||prepared.reportId!==payload.reportId||
    prepared.templateSha256!==payload.template?.sha256||
    JSON.stringify(canonicalReportFieldsV2759(snapshot))!==JSON.stringify(canonicalReportFieldsV2759(payload.fields)))
    fail('Le PDF de récupération ne correspond pas aux réponses conservées. Ouvrez la copie dans le lecteur.','INVALID_RECOVERY_BINDING');
  if(typeof prepared.base64!=='string'||prepared.base64.length>Math.ceil(MAX_BYTES/3)*4+4||
    !Number.isSafeInteger(prepared.size)||prepared.size<8||prepared.size>MAX_BYTES||!/^[a-f0-9]{64}$/.test(prepared.sha256||'')||!/^[a-f0-9]{64}$/.test(prepared.fieldsSha256||''))
    fail('Le PDF de récupération est incomplet. Les réponses restent conservées.','INVALID_RECOVERY_PDF');
  let bytes;try{bytes=Uint8Array.from(atob(prepared.base64),value=>value.charCodeAt(0));}catch{fail('Le PDF de récupération est illisible. Les réponses restent conservées.','INVALID_RECOVERY_PDF');}
  let verified;try{verified=await prepareReportPdfV2759(payload,bytes);}catch{fail('Le PDF de récupération est invalide. Les réponses restent conservées.','INVALID_RECOVERY_PDF');}
  if(verified.size!==prepared.size||verified.sha256!==prepared.sha256||verified.fieldsSha256!==prepared.fieldsSha256)
    fail('Le PDF de récupération ne confirme pas les réponses conservées. Ouvrez la copie dans le lecteur.','INVALID_RECOVERY_BINDING');
  return new Blob([bytes],{type:'application/pdf'});
}

export async function downloadRecoveryCopyV2792({read,download,owner,isCurrent=()=>true}){
  const current=()=>{if(!isCurrent())throw Object.assign(Error('Le compte ou l’accès a changé.'),{code:'RECOVERY_ACCOUNT_CHANGED'});};
  current();const copy=await read();current();const blob=await recoveryCopyPdfV2792(copy,owner);current();
  const latest=await read();current();
  if(latest?.email!==owner||latest.id!==copy.id||latest.uploadId!==copy.uploadId||latest.readerRequestId!==copy.readerRequestId||
    latest.reportPayloadV2754?.requestId!==copy.reportPayloadV2754?.requestId||latest.reportPayloadV2754?.preparedPdfV2759?.sha256!==copy.reportPayloadV2754?.preparedPdfV2759?.sha256)
    throw Object.assign(Error('Une nouvelle sauvegarde est disponible. Réessayez le téléchargement de la copie.'),{code:'RECOVERY_CHANGED'});
  return download(blob,latest.name);
}
