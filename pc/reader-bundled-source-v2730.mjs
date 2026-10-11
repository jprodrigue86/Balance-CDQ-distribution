// The supplied catalog is the local, prepared build catalog. Remote metadata,
// names and PDF signatures alone never establish prepared provenance.
export async function recognizeBundledReaderSourceV2730(blob,catalog){
  if(!(blob instanceof Blob)||!catalog||typeof catalog!=='object'||Array.isArray(catalog))return null;
  const size=blob.size;
  if(!Number.isSafeInteger(size)||size<5)return null;
  const candidates=[];
  for(const [modeleId,entry]of Object.entries(catalog)){
    if(!entry||typeof entry!=='object'||Array.isArray(entry)||entry.readerPreparedVersion!==2730||
      !Number.isSafeInteger(entry.taille)||entry.taille!==size||
      typeof entry.sha256!=='string'||entry.sha256.length!==64||!/^[a-f0-9]{64}$/.test(entry.sha256))continue;
    candidates.push({modeleId,templateId:typeof entry.templateId==='string'?entry.templateId:undefined,sha256:entry.sha256});
  }
  // Ordinary saved reports normally have a different size. Do not read or hash
  // their complete source unless at least one prepared catalog entry can match.
  if(!candidates.length)return null;
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(bytes.byteLength!==size||bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70||bytes[4]!==45)return null;
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const sha256=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  const match=candidates.find(candidate=>candidate.sha256===sha256);
  return match?{readerPreparedVersion:2730,modeleId:match.modeleId,templateId:match.templateId,sha256,taille:size}:null;
}
