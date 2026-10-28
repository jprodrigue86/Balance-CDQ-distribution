// A folder archive is assembled by the server. Local answers must cross the
// data boundary before that server is allowed to choose its Drive revisions.
export function createReportEngineArchiveV2754({engine,owner,canWrite,guard,nativeState,listPrepare=async()=>null,listState=()=>null,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=50}){
 const saves=new Map(),failure=(message,code)=>Object.assign(Error(message),{code});
 const check=(email,context)=>{guard(context);if(email!==owner()||context.owner!==email||!canWrite())throw failure('Le compte, le client ou l’accès a changé.','ARCHIVE_SCOPE_CHANGED');};
 function track(data){if(data.email!==owner()||!canWrite())return;if(data.type==='CDQ_REPORT_ENGINE_SAVE_V2754'&&data.payload?.reportId)saves.set(data.payload.reportId,data.payload);while(saves.size>500)saves.delete(saves.keys().next().value);}
 function acknowledged(detail){const desired=saves.get(detail.reportId);if(detail.owner!==owner()||!desired||!detail.saveId)return;if(!detail.dataSaved&&detail.saveId!==desired.requestId)saves.set(detail.reportId,{...desired,requestId:detail.saveId,fields:detail.fields});else if(detail.dataSaved&&desired.requestId===detail.saveId)saves.delete(detail.reportId);}
 async function prepare(folderIds,context,expected=null){
  const email=owner(),clientId=String(context.clientId||''),folders=[...new Set(folderIds.map(String))].sort();check(email,context);if(!folders.length)return null;
  if(folders.length>500)throw failure('Trop de dossiers sélectionnés.','ARCHIVE_SCOPE_CHANGED');
  const client=await engine.client();check(email,context);
  for(let n=0;n<attempts;n++){
   const records=(await (client.metadata?client.metadata({clientId}):client.all())).filter(record=>record.context?.clientId===clientId);check(email,context);
   const native=await nativeState(clientId);check(email,context);if(!Array.isArray(native)||native.length>500||native.some(record=>record.context?.clientId!==clientId||!record.context.reportId||!record.context.destinationId))throw failure('Les copies locales ne peuvent pas être vérifiées.','ARCHIVE_LOCAL_STATE');
   const tracked=[...saves.values()].filter(payload=>payload.clientId===clientId),destinations=[...new Set([...records.map(record=>record.context.destinationId),...native.map(record=>record.context.destinationId),...tracked.map(payload=>payload.destinationId)].filter(Boolean))].sort();
   let result=await engine.call('archiveStatus',{clientId,folderIds:folders,candidateDestinations:destinations,...(!expected?{compact:true}:{})});check(email,context);
   if(result?.compact===true&&result.ready===true){result=await engine.call('archiveStatus',{clientId,folderIds:folders,candidateDestinations:destinations});check(email,context);if(result?.compact===true)throw failure('Le contrôle final de cette archive est incomplet.','ARCHIVE_SCOPE_CHANGED');}
   if(!result?.ok||result.engine!==2754||result.kind!=='archive'||result.clientId!==clientId||!Array.isArray(result.folderIds)||JSON.stringify([...result.folderIds].sort())!==JSON.stringify(folders)||!Array.isArray(result.destinations)||!Array.isArray(result.targets)||result.targets.some(target=>!['report','list'].includes(target.kind)||!target.reportId||!result.destinations.includes(target.destinationId))||!/^[a-f0-9]{64}$/i.test(result.stamp||''))throw failure('La portée de cette archive n’a pas été confirmée.','ARCHIVE_SCOPE_CHANGED');
   const scoped=new Set(result.destinations),selected=records.filter(record=>scoped.has(record.context.destinationId)),copies=native.filter(record=>scoped.has(record.context.destinationId)),desired=new Map();
   for(const payload of tracked)if(scoped.has(payload.destinationId))desired.set(payload.reportId,{context:payload,requestId:payload.requestId});
   for(const copy of copies)if(copy.pending||copy.deleted)desired.set(copy.context.reportId,copy);
   let pending=selected.some(record=>record.pending&&(record.deleted?!record.deleteAck:!record.dataSaved))||result.targets.some(target=>target.deleted?target.drivePending!==false:!Number.isSafeInteger(target.revision)||target.revision<1||target.pdf?.status!=='confirmed'||target.pdf.revision!==target.revision||!target.pdf.driveRevision);
   if(selected.some(record=>record.blocked))throw failure('Un rapport sélectionné nécessite une vérification Drive.','PDF_CONFLICT');
   for(const [reportId,record]of desired){
    const read=await engine.call('read',{reportId,clientId});check(email,context);
    if(record.deleted){if(!read.deleted)pending=true;continue;}
    if(read.deleted)throw failure('Un rapport sélectionné a été supprimé.','REPORT_DELETED');
    if(!record.requestId||(read.snapshot||read.report?.snapshot||read.report||{}).requestId!==record.requestId)pending=true;
    else if(saves.get(reportId)?.requestId===record.requestId)saves.delete(reportId);
   }
   const lists=[];for(const target of result.targets)if(target.kind==='list'){const prepared=await listPrepare(clientId,target);check(email,context);lists.push(prepared);if(!prepared?.ready)pending=true;}
   const freshNative=await nativeState(clientId);check(email,context);const nativeVersion=rows=>JSON.stringify(rows.map(record=>[record.context?.reportId,record.context?.destinationId,record.requestId,!!record.deleted]).sort());if(!Array.isArray(freshNative)||freshNative.some(record=>record.context?.clientId!==clientId))throw failure('Les copies locales ont changé de portée.','ARCHIVE_LOCAL_STATE');if(nativeVersion(freshNative)!==nativeVersion(native))continue;
   if([...saves.values()].some(payload=>payload.clientId===clientId&&scoped.has(payload.destinationId)&&!tracked.some(old=>old.reportId===payload.reportId&&old.requestId===payload.requestId)))continue;
   const localStamp=JSON.stringify([folders,selected.map(record=>[record.context.reportId,record.context.destinationId,!!record.deleted,record.pending&&!record.dataSaved?record.payload?.requestId:'']).sort(),copies.map(record=>[record.context.reportId,record.context.destinationId,record.requestId,!!record.deleted]).sort(),[...saves.values()].filter(payload=>payload.clientId===clientId&&scoped.has(payload.destinationId)).map(payload=>[payload.reportId,payload.requestId,payload.destinationId]).sort(),lists.map(list=>list?.stamp)]);
   if(expected&&(expected.stamp!==result.stamp||expected.localStamp!==localStamp))throw failure('La sélection a changé pendant la préparation. Rouvrez son envoi.','ARCHIVE_CHANGED');
   const localRecords=(await (client.metadata?client.metadata({clientId}):client.all())).filter(record=>record.context?.clientId===clientId);check(email,context);const recordVersion=rows=>JSON.stringify(rows.map(record=>[record.context.reportId,record.context.destinationId,record.serverRevision,!!record.deleted,!!record.deleteAck,record.pending&&!record.dataSaved?record.payload?.requestId:'']).sort());if(recordVersion(localRecords)!==recordVersion(records))continue;if(localRecords.some(record=>scoped.has(record.context.destinationId)&&record.pending&&(record.deleted?!record.deleteAck:!record.dataSaved)))pending=true;
   if(!pending&&result.ready===true){for(let i=0;i<lists.length;i++)if(listState(clientId)?.stamp!==lists[i].stamp)pending=true;if(!pending)return Object.freeze({stamp:result.stamp,localStamp,folderIds:folders});}
   if(expected)throw failure('Les dernières réponses de cette sélection sont encore en préparation.','PDF_PENDING');
   const ids=[...new Set([...selected.filter(record=>record.pending).map(record=>record.context.reportId),...desired.keys()])];await client.resume({reportIds:ids});check(email,context);await nativeState(clientId,ids);check(email,context);await wait(1200);check(email,context);
  }
  throw failure('Les derniers PDF de ces dossiers sont encore en préparation. Réessayez après leur confirmation Drive.','PDF_PENDING');
 }
 return {track,acknowledged,prepare,reset(){saves.clear();}};
}
