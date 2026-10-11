// The restored panorama owns the door logo; never enlarge the old 27x19 crop.
export const truckPhotoShaV2730='74b16cca4b4262cf5dd5356204da6d78a06d9acb7ce7344da4a0d7d100dbe2c9';
const paint='q 0 0 1 1 re W n 1 0 0 2.843137254901961 0 -0.9019607843137255 cm /Camion95 Do Q\n';
let imagePromise;
export async function normalizeTruckPhotoV2730(pdf,L,{truckSourceBytes}={}){
 const N=L.PDFName.of,form=pdf.getForm();
 if(!form.getFieldMaybe('B4_Aller_P6_AvantCorrection')||!form.getFieldMaybe('B4_Retour_P6_ApresCorrection'))return false;
 const targets=pdf.context.enumerateIndirectObjects().filter(([,o])=>{
  if(!(o instanceof L.PDFRawStream)||o.dict.get(N('Subtype'))!==N('Form'))return false;
  return new TextDecoder().decode(L.decodePDFRawStream(o).decode()).includes('/Camion95 Do');
 });
 if(!targets.length)return false;
 if(targets.length!==1)throw Error('Photographie du camion inattendue.');
 const [ref,container]=targets[0];
 if(container.dict.has(N('CDQTruckPhotoV2730')))return false;
 // Only the audited image container is replaced. The page matrix, fields,
 // widgets, values, formulas and every other content stream stay unchanged.
 const source=new TextDecoder().decode(L.decodePDFRawStream(container).decode());
 if(!source.startsWith(paint.trim()))throw Error('Cadrage de la photographie du camion inattendu.');
 if(!truckSourceBytes){
  imagePromise??=fetch(new URL('./assets/report-art-v2730/truck-photo.pdf',import.meta.url)).then(async r=>{
   if(!r.ok)throw Error('Photographie restaurée du camion indisponible.');
   return new Uint8Array(await r.arrayBuffer());
  }).catch(e=>{imagePromise=undefined;throw e;});
  truckSourceBytes=await imagePromise;
 }
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',truckSourceBytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==truckPhotoShaV2730)throw Error('Photographie restaurée du camion non reconnue.');
 const sourcePdf=await L.PDFDocument.load(truckSourceBytes,{updateMetadata:false}),image=sourcePdf.catalog.lookup(N('CDQTruckPhotoSourceV2730'),L.PDFRawStream);
 if(image.dict.lookup(N('Width'),L.PDFNumber).asNumber()!==2170||image.dict.lookup(N('Height'),L.PDFNumber).asNumber()!==725||!image.dict.has(N('DecodeParms')))throw Error('Dimensions de la photographie restaurée inattendues.');
 // Copy the already losslessly compressed pixels instead of PNG decoding and
 // re-running predictors in the reader's opening/saving path.
 const imageRef=pdf.context.register(L.PDFObjectCopier.for(sourcePdf.context,pdf.context).copy(image));
 const stream=pdf.context.flateStream(paint,{Type:'XObject',Subtype:'Form',BBox:[0,0,1,1],Resources:{XObject:{Camion95:imageRef}},CDQTruckDoorV2704:true,CDQTruckPhotoV2730:true});
 const candidates=new Set();
 const collect=(o,seen)=>{
  if(o instanceof L.PDFRef){const id=String(o);if(seen.has(id))return;seen.add(id);collect(pdf.context.lookup(o),seen);}
  else if(o instanceof L.PDFRawStream)collect(o.dict,seen);
  else if(o instanceof L.PDFDict)for(const[,value]of o.entries())collect(value,seen);
  else if(o instanceof L.PDFArray)for(const value of o.asArray())collect(value,seen);
 };
 collect(container.dict.lookup(N('Resources'),L.PDFDict).lookup(N('XObject'),L.PDFDict),candidates);
 pdf.context.assign(ref,stream);
 const retained=new Set();
 for(const value of Object.values(pdf.context.trailerInfo))collect(value,retained);
 // Delete only the now-unused old photo/logo subtree. Shared fonts and every
 // object reachable from the report remain intact; no duplicate 2 MB image.
 for(const[objectRef]of pdf.context.enumerateIndirectObjects())if(candidates.has(String(objectRef))&&!retained.has(String(objectRef)))pdf.context.delete(objectRef);
 return true;
}
