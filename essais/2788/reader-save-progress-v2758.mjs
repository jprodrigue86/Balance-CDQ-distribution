// Progress is presentation only. It cannot save fields, clear dirty state,
// renew an edit lease, close a reader, or acknowledge another local write.
export function normalizeReaderSaveProgressV2758(detail){
  const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const text=value=>typeof value==='string'&&value.length>0&&value.length<=320;
  if(!detail||detail.dataSaved!==true||!text(detail.owner)||!text(detail.clientId)||!uuid(detail.reportId)||!uuid(detail.saveId)||!Number.isSafeInteger(detail.revision)||detail.revision<1)return null;
  const pdf=detail.pdf,confirmed=pdf?.status==='confirmed'&&detail.pending===false;
  if(confirmed&&(!text(pdf.fileId)||!text(pdf.driveRevision)||pdf.revision!==detail.revision))return null;
  return {type:'CDQ_READER_SAVE_PROGRESS_V2758',owner:detail.owner,clientId:detail.clientId,reportId:detail.reportId,requestId:'save-'+detail.saveId,revision:detail.revision,stage:confirmed?'drive':'server',fileId:text(pdf?.fileId)?pdf.fileId:'',driveRevision:confirmed?pdf.driveRevision:''};
}

export function createReaderSaveProgressV2758(){
  const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const text=value=>typeof value==='string'&&value.length>0&&value.length<=320;
  let identity=null,attempt=null,rendered='';
  function open({owner,readerRequestId,readerPhaseV2757=0}={}){
    identity=text(owner)&&text(readerRequestId)&&Number.isSafeInteger(readerPhaseV2757)&&readerPhaseV2757>=0?{owner,readerRequestId,readerPhaseV2757}:null;
    attempt=null;rendered='';
  }
  function begin(requestId,version,context){
    if(!identity||!/^save-/.test(requestId)||!uuid(requestId.slice(5))||!Number.isSafeInteger(version)||version<0||!uuid(context?.reportId)||!text(context.clientId)||!text(context.destinationId)||!Number.isSafeInteger(context.baseRevision)||context.baseRevision<0)return false;
    if(attempt?.requestId===requestId)return attempt.version===version&&attempt.reportId===context.reportId&&attempt.clientId===context.clientId;
    attempt={requestId,version,reportId:context.reportId,clientId:context.clientId,destinationId:context.destinationId,fileId:String(context.fileId||''),baseRevision:context.baseRevision,revision:null,local:false,stage:0};rendered='';return true;
  }
  function accept(message){
    if(!identity||!attempt||message?.type!=='CDQ_READER_SAVE_PROGRESS_V2758'||message.owner!==identity.owner||message.readerRequestId!==identity.readerRequestId||message.readerPhaseV2757!==identity.readerPhaseV2757||message.clientId!==attempt.clientId||message.reportId!==attempt.reportId||message.requestId!==attempt.requestId||!Number.isSafeInteger(message.revision)||message.revision<=attempt.baseRevision||!['server','drive'].includes(message.stage)||typeof message.fileId!=='string'||message.fileId.length>320)return null;
    if(attempt.revision!==null&&message.revision!==attempt.revision||attempt.fileId&&message.fileId&&message.fileId!==attempt.fileId)return null;
    if(message.stage==='drive'&&(!text(message.fileId)||!text(message.driveRevision)))return null;
    const stage=message.stage==='drive'?2:1;
    if(stage<=attempt.stage)return null;
    attempt.revision=message.revision;attempt.stage=stage;if(message.fileId)attempt.fileId=message.fileId;
    return {type:message.type,owner:identity.owner,readerRequestId:identity.readerRequestId,readerPhaseV2757:identity.readerPhaseV2757,clientId:attempt.clientId,reportId:attempt.reportId,requestId:attempt.requestId,revision:attempt.revision,stage:message.stage,fileId:attempt.fileId,driveRevision:message.stage==='drive'?message.driveRevision:''};
  }
  return {open,begin,accept,
    acknowledge(requestId,version){if(!attempt||attempt.requestId!==requestId||attempt.version!==version)return false;attempt.local=true;return true;},
    text({requestId,version,dirty=false,closed=false,opening=false,saving=false}={}){
      if(!attempt||!attempt.local||attempt.requestId!==requestId||attempt.version!==version||dirty||closed||opening||saving)return '';
      return attempt.stage===2?'✓ Essai conservé dans ce navigateur — aucun envoi Drive':attempt.stage===1?'Réponses conservées sur le serveur — confirmation du PDF en attente.':'Conservé sur cet appareil — synchronisation en attente.';
    },
    displayed(value){rendered=value;},lastDisplayed:()=>rendered,
    reset(){attempt=null;rendered='';},close(){identity=null;attempt=null;rendered='';}
  };
}
