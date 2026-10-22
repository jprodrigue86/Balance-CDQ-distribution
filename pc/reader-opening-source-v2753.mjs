// Only a normalization completed by this host in the current epoch can skip
// repair. Neither the old saved-document version flag nor a packaged source
// hash proves that every current repair is present in its widget appearances.
export async function readReaderOpeningBytesV2753({blob,preparedBlob,readerNormalizedV2730,preparedEpoch,work,epoch,checkCurrent=()=>{},onPrepared=()=>{}}){
  const guard=()=>{
    if(!work||work.stats().epoch!==epoch)throw Error('Le compte ou l’accès Drive a changé.');
    checkCurrent();
  };
  guard();
  const normalized=readerNormalizedV2730===true&&Number.isInteger(preparedEpoch)&&preparedEpoch===epoch;
  const direct=preparedBlob instanceof Blob&&normalized;
  if(!direct){
    const result=await work.requestBlob('open',blob,{summary:false},{epoch,valid:()=>{guard();return true;}});
    guard();onPrepared(result.info||{});guard();return result.bytes instanceof Uint8Array?result.bytes:new Uint8Array(result.bytes);
  }
  if(preparedBlob.size<8||preparedBlob.size>32*1024*1024)throw Error('PDF invalide (32 Mo maximum).');
  const bytes=new Uint8Array(await preparedBlob.arrayBuffer());
  guard();
  if(bytes.length!==preparedBlob.size||bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70||bytes[4]!==45)throw Error('PDF invalide (32 Mo maximum).');
  return bytes;
}
