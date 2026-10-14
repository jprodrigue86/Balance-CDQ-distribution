import {calibrationIdentity,calibrationRpc} from './calibration-feedback-v2566.mjs';
const keys=['client_adresse','client_ville','client_code_postal','client_province','client_telephone'];
const cache=new Map();
for(const event of ['cdq:access-ready','cdq:drive-cleared-v2632'])window.addEventListener(event,()=>cache.clear());
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
export async function completeClientContext(values,clientId){
 const result={...values};if(result.client_adresse&&result.client_code_postal)return result;
 const owner=calibrationIdentity().email,guard=()=>{if(!owner||calibrationIdentity().email!==owner||!window.cdqDriveEntryV2632?.canRead())throw Error('Le compte n’a plus l’autorisation.');};guard();
 const key=owner+'|'+clientId,cached=cache.get(key);if(cached&&Date.now()-cached.at<300000){for(const field of keys)if(!result[field]&&cached.values[field])result[field]=cached.values[field];return result;}
 const files=await calibrationRpc('obtenirSourcesCoordonneesCDQV2638',clientId);guard();
 if(!files?.length)return result;await import('./vendor/pdf-lib-1.17.1.min.js');guard();const found={};
 for(const file of files){
  try{const meta=await calibrationRpc('obtenirPdfLecteurCDQV2520',file.id,'');guard();if(Number(meta.taille||meta.size||0)>12*1024*1024)continue;let bytes;
   if(meta.base64)bytes=Uint8Array.from(atob(meta.base64),c=>c.charCodeAt(0));
   else{const parts=[];let total=0;for(let i=0;i<meta.chunks;i++){const p=await calibrationRpc('obtenirChunkDocumentPdfCDQ',file.id,meta.revision,i);guard();const part=Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0));total+=part.length;if(total>12*1024*1024)throw Error('PDF trop volumineux pour lire les coordonnées.');parts.push(part);}bytes=new Uint8Array(await new Blob(parts).arrayBuffer());}
   const lib=globalThis.PDFLib,doc=await lib.PDFDocument.load(bytes,{updateMetadata:false}),form=doc.getForm();guard();
   for(const key of keys){const f=form.getFieldMaybe(key);const v=f instanceof lib.PDFTextField?f.getText():f instanceof lib.PDFDropdown?f.getSelected().join(', '):'';if(v?.trim())(found[key]||(found[key]=new Map())).set(norm(v),v.trim());}
  }catch(e){guard();if(/autorisation|autorisé|permission|droits/i.test(e.message||''))throw e;}
 }
 for(const key of keys)if(!result[key]&&found[key]?.size===1)result[key]=found[key].values().next().value;
 if(!result.client_code_postal&&result.client_adresse){const m=result.client_adresse.toUpperCase().match(/\b[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ]\s?\d[ABCEGHJKLMNPRSTVWXYZ]\d\b/);if(m)result.client_code_postal=m[0].replace(/\s/g,'').replace(/^(.{3})/,'$1 ');}
 guard();const values={};for(const field of keys)if(result[field])values[field]=result[field];cache.set(key,{at:Date.now(),values});while(cache.size>12)cache.delete(cache.keys().next().value);return result;
}
