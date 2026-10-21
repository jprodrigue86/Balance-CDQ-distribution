// A conflicting generated list remains readable. This path never imports the
// PDF as a report, changes a Drive receipt, or overwrites a local draft/cache.
export function listConsultationDescriptorV2755(result,fileId,clientId){
  if(result?.kind!=='list'||result.readOnly!==true||result.reconciliationRequired!==true)return null;
  const observed=result.observedPdf;
  if(result.ok!==true||result.found!==true||result.engine!==2754||result.clientId!==clientId||
    !clientId||typeof result.destinationId!=='string'||!result.destinationId||
    observed?.fileId!==fileId||result.pdf?.fileId!==fileId||
    typeof observed.driveRevision!=='string'||!observed.driveRevision||
    result.pdf.status!=='conflict'||result.pdf.errorCode!=='CONFLICT_EXTERNAL_DRIVE')
    throw Object.assign(Error('La liste reçue ne correspond pas au client et au fichier demandés.'),{code:'INVALID_LIST_RESPONSE'});
  return Object.freeze({id:fileId,clientId,destinationId:result.destinationId,reportId:result.reportId,
    revision:observed.driveRevision,readOnlyListV2755:true,reconciliationRequired:true});
}

export async function loadListConsultationV2755(descriptor,{rpc,valid,decode,maxBytes=32*1024*1024}){
  const fail=message=>{throw Object.assign(Error(message),{code:'LIST_CHANGED_DURING_READ'});};
  if(descriptor?.readOnlyListV2755!==true||!descriptor.id||!descriptor.clientId||!descriptor.revision)
    fail('La liste à consulter est invalide.');
  valid();
  const meta=await rpc('obtenirPdfLecteurCDQV2520',[descriptor.id,'']);valid();
  if(meta?.id!==descriptor.id||meta.clientId!==descriptor.clientId||meta.revision!==descriptor.revision||
    meta.unchanged||!Number.isSafeInteger(meta.taille)||meta.taille<8||meta.taille>maxBytes)
    fail('La liste a changé. Rouvrez sa version actuelle.');
  const parts=[];
  if(meta.base64)parts.push(decode(meta.base64));
  else{
    if(!Number.isSafeInteger(meta.chunks)||meta.chunks<1||meta.chunks>32)fail('La lecture de la liste est incomplète.');
    for(let i=0;i<meta.chunks;i+=3){
      const group=await Promise.all(Array.from({length:Math.min(3,meta.chunks-i)},(_,n)=>rpc('obtenirChunkDocumentPdfCDQ',[descriptor.id,meta.revision,i+n])));valid();
      for(const part of group){if(part?.revision!==meta.revision)fail('La liste a changé pendant sa lecture.');parts.push(decode(part.base64));}
    }
  }
  const blob=new Blob(parts,{type:'application/pdf'});
  if(blob.size!==meta.taille||await blob.slice(0,5).text()!=='%PDF-')fail('Le PDF reçu est incomplet.');valid();
  const after=await rpc('obtenirMetaDocumentPdfCDQ',[descriptor.id]);valid();
  if(after?.id!==descriptor.id||after.clientId!==descriptor.clientId||after.revision!==meta.revision||after.taille!==blob.size)
    fail('La liste a changé pendant sa lecture.');
  return {id:descriptor.id,clientId:descriptor.clientId,folderId:descriptor.destinationId,
    destinationId:descriptor.destinationId,nom:String(meta.nom||'Liste de balance.pdf'),blob,
    revision:meta.revision,readOnlyListV2755:true,reconciliationRequired:true};
}
