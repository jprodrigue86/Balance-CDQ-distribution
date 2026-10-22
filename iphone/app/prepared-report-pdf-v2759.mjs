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
