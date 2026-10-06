// Bind a durable acknowledgement to this account, document and exact payload.
export async function pdfSaveHashV2691(data){
 const bytes=new TextEncoder().encode(String(data));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
}
export function confirmedPdfSaveV2691(receipt,action,email,hash){
 return !!(receipt?.ok&&receipt.id===action.targetId&&receipt.owner===email&&receipt.dataHashV2691===hash&&receipt.revision);
}
