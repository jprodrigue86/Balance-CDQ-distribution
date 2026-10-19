// Deletion and sending share the same report identity/revision as the data
// engine. A cached blank template is never a deliverable attachment.
export function createReportEngineActionsV2754({engine,owner,canWrite,guard=()=>{},sendGuard=()=>{},post=()=>{},readLocal=async()=>null,getTree=()=>null,prepareListSend=async()=>null,listSendState=()=>null,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=50}={}){
  const saves=new Map();
  const failure=(message,code)=>Object.assign(Error(message),{code});
  const check=(email,clientId='')=>{guard(email,clientId);if(email!==owner()||!canWrite())throw failure('Le compte ou l’accès a changé.','CDQ_DELETE_ACCOUNT_CHANGED');};
  const contextOf=result=>{const report=result.report||result,snapshot=report.snapshot||report.payload||report;return {engine:2754,reportId:report.reportId||snapshot.reportId,clientId:report.clientId||snapshot.clientId,destinationId:report.destinationId||snapshot.destinationId,family:report.family||snapshot.family,template:report.template||snapshot.template,fileId:report.pdf?.fileId||report.fileId||snapshot.fileId||'',baseRevision:Number(report.revision||snapshot.baseRevision||0),expectedDriveRevision:report.pdf?.driveRevision||snapshot.expectedDriveRevision||''};};
  function track(data){if(data.type==='CDQ_REPORT_ENGINE_SAVE_V2754'&&data.email===owner()&&canWrite()&&data.payload?.reportId){saves.set(data.payload.reportId,data.payload);while(saves.size>500)saves.delete(saves.keys().next().value);}}
  async function find(fileId,clientId){
    const email=owner(),client=await engine.client();check(email,clientId);const cached=await client.get({fileId});check(email,clientId);if(cached){if(cached.context.clientId!==clientId)throw failure('Ce rapport appartient à un autre client.','SCOPE_MISMATCH');return cached;}
    const result=await engine.call('read',{fileId,clientId});check(email,clientId);
    if(result.classification==='legacy-list'&&result.kind==='legacy-list'){
      if(result.engine!==2754||result.clientId!==clientId||result.fileId!==fileId||!result.driveRevision)throw failure('La liste historique ne correspond pas au fichier sélectionné.','SCOPE_MISMATCH');return {kind:'legacy-list',context:result};
    }
    if(!result.found&&!result.snapshot&&!result.report)return null;
    if(result.kind==='list'){
      if(result.engine!==2754||result.clientId!==clientId||!result.reportId||result.pdf?.fileId!==fileId)throw failure('Cette liste ne correspond pas au fichier sélectionné.','SCOPE_MISMATCH');
      return {kind:'list',context:{kind:'list',reportId:result.reportId,clientId,destinationId:result.destinationId,fileId},pdf:result.pdf,serverRevision:result.revision};
    }
    const context=contextOf(result);if(context.clientId&&context.clientId!==clientId)throw failure('Ce rapport appartient à un autre client.','SCOPE_MISMATCH');
    return {context,deleted:result.deleted===true,deleteAck:result.deleted===true,pending:result.deleted?result.drivePending!==false:false,pdf:result.pdf,serverRevision:result.revision,fields:result.snapshot?.fields||result.report?.fields};
  }
  async function remove(context){
    const email=owner();check(email,context.clientId);const client=await engine.client();check(email,context.clientId);
    await client.remove(context);check(email,context.clientId);
    for(let n=0;n<attempts;n++){
      const record=await client.get({reportId:context.reportId});check(email,context.clientId);
      if(record?.blocked)throw failure(record.error||'La suppression Drive doit être vérifiée.','CDQ_DELETE_UNCONFIRMED');
      if(record?.deleted&&record.deleteAck&&!record.pending)return {ok:true,reportId:context.reportId,revision:record.serverRevision,context:record.context,deleted:true,drivePending:false,pdf:record.pdf};
      await client.resume();await wait(1200);check(email,context.clientId);
    }
    throw failure('La suppression Drive reste en attente. La demande est conservée.','CDQ_DELETE_UNCONFIRMED');
  }
  async function handle(data){
    if(data.type!=='CDQ_REPORT_ENGINE_DELETE_V2754'||data.email!==owner()||!canWrite())return false;
    const email=owner();try{const result=await remove(data.context);check(email,data.context.clientId);post({type:data.type+'_RESULT',email,requestId:data.requestId,uploadId:data.uploadId,...result});}
    catch(error){if(email===owner())post({type:data.type+'_RESULT',email,requestId:data.requestId,uploadId:data.uploadId,ok:false,message:error.message,code:error.code||''});}return true;
  }
  function folderScope(clientId,selection){
    const selected=new Set(selection.folderIds.map(String)),folders=new Map([...selected].map(id=>[id,id]));
    const visit=(node,ancestor='')=>{if(!node)return;const source=selected.has(String(node.id))?String(node.id):ancestor;if(source)folders.set(String(node.id),source);for(const child of node.dossiers||[])visit(child,source);};visit(getTree(clientId));return folders;
  }
  async function deleteSelection(selection,{clientId,descendantIds=[]}={},legacy){
    const email=owner();clientId=String(clientId||'');check(email,clientId);
    const capability=await engine.capabilities();check(email,clientId);
    if(!capability?.ready){if(capability?.configured===false)return legacy(selection);throw failure('Le moteur de rapports doit être joignable pour vérifier la suppression.','CDQ_DELETE_UNCONFIRMED');}
    const targets=new Map(),lists=new Map(),managedFiles=new Set(),files=[...new Set([...selection.fileIds,...descendantIds].map(String))];
    for(const fileId of files){const record=await find(fileId,clientId);check(email,clientId);if(record?.kind==='list')lists.set(fileId,record.context);else if(record&&record.kind!=='legacy-list'){targets.set(record.context.reportId,record);managedFiles.add(fileId);}}
    if(selection.folderIds.length){
      const folders=folderScope(clientId,selection),listing=await engine.call('list',{clientId});check(email,clientId);
      for(const record of await (await engine.client()).all())if(record.context.clientId===clientId&&folders.has(record.context.destinationId))targets.set(record.context.reportId,record);
      for(const payload of saves.values())if(payload.clientId===clientId&&folders.has(payload.destinationId)){const prior=targets.get(payload.reportId);targets.set(payload.reportId,{...prior,context:{...contextOf(payload),...prior?.context,fields:payload.fields,name:payload.name}});}
      for(const managed of listing.managedReports||[])if(folders.has(managed.destinationId)&&!targets.has(managed.reportId)){
        const read=await engine.call('read',{clientId,reportId:managed.reportId});check(email,clientId);if(read.found)targets.set(managed.reportId,{context:contextOf(read),deleted:read.deleted,deleteAck:read.deleted,pending:read.drivePending!==false,pdf:read.pdf});
      }
      for(const record of targets.values()){const restoredFolderId=folders.get(record.context.destinationId);if(restoredFolderId)record.context={...record.context,restoredFolderId};}
    }
    for(const record of targets.values()){
      if(record.deleted&&record.deleteAck&&!record.pending)continue;
      if(record.context.template){const result=await remove(record.context);record.context={...result.context,...(record.context.restoredFolderId?{restoredFolderId:record.context.restoredFolderId}:{})};}
      else {const result=await engine.call('status',{reportId:record.context.reportId,clientId});check(email,clientId);if(!result.deleted||result.drivePending!==false)throw failure('La suppression du rapport reste à confirmer.','CDQ_DELETE_UNCONFIRMED');}
    }
    check(email,clientId);const remainder={fileIds:selection.fileIds.filter(id=>!managedFiles.has(String(id))),folderIds:selection.folderIds};
    const result=remainder.fileIds.length||remainder.folderIds.length?await legacy(remainder):{ok:true,fichiers:[],dossiers:[]};check(email,clientId);
    const confirmed=new Set([...(result.fichiers||result.ids||[]),...(result.dossiers||[])]),folders=folderScope(clientId,selection),confirmedLists=[...lists.values()].filter(list=>confirmed.has(list.fileId)||confirmed.has(folders.get(list.destinationId))).map(list=>({...list,...(folders.get(list.destinationId)?{restoredFolderId:folders.get(list.destinationId)}:{})}));
    return {...result,fichiers:[...new Set([...(result.fichiers||result.ids||[]),...selection.fileIds.filter(id=>managedFiles.has(String(id)))])],dossiers:result.dossiers||[],engineDeletionV2754:targets.size>0||confirmedLists.length>0,engineReportsV2754:[...targets.values()].map(record=>record.context),engineListsV2754:confirmedLists};
  }
  async function restoreSelection(receipt,legacy){
    const email=owner(),clientId=String(receipt.clientId||'');check(email,clientId);if(receipt.owner!==email)throw failure('Le compte de cette restauration a changé.','CDQ_DELETE_ACCOUNT_CHANGED');
    const reports=Array.isArray(receipt.engineReportsV2754)?receipt.engineReportsV2754:[],lists=Array.isArray(receipt.engineListsV2754)?receipt.engineListsV2754:[],managedIds=new Set([...reports,...lists].map(report=>report.fileId).filter(Boolean));
    // A restored parent also makes its children visible. Refuse an obsolete
    // list identity before any legacy parent/file mutation, then recheck under
    // the server restore lock after the original destination is available.
    for(const list of lists){if(list.clientId!==clientId)throw failure('Cette liste appartient à un autre client.','SCOPE_MISMATCH');const checked=await engine.call('status',{kind:'list',reportId:list.reportId,fileId:list.fileId,clientId,restore:true});check(email,clientId);if(checked?.kind!=='list'||checked.reportId!==list.reportId||checked.clientId!==clientId||checked.pdf?.fileId!==list.fileId)throw failure('La restauration de cette liste ne peut pas être confirmée.','CONFLICT_LIST_FILE');}
    const remainder={...receipt,ids:receipt.ids.filter(id=>!managedIds.has(id))};
    // Restore folders first, so their exact original destinations exist before
    // an unpublished report is authorized to resume its PDF publication.
    const result=remainder.ids.length||remainder.folderIds.length?await legacy(remainder):{ok:true,fichiers:[],dossiers:[]};check(email,clientId);
    if(result?.ok===false)return result;
    const confirmedFolders=new Set(result.dossiers||[]);if(remainder.folderIds.some(id=>!confirmedFolders.has(id)))return result;
    const restored=[];for(const context of reports){
      const record=await (await engine.client()).restore({...context,...(receipt.folderIds.length?{restoredFolderId:context.restoredFolderId||receipt.folderIds[0]}:{})});check(email,clientId);if(record.deleted||record.context.reportId!==context.reportId&&record.restoredFromReportId!==context.reportId)throw failure('La restauration du rapport n’a pas été confirmée.','RESTORE_UNCONFIRMED');if(context.fileId)restored.push(context.fileId);saves.delete(context.reportId);
    }
    for(const list of lists){const result=await engine.call('restore',{kind:'list',reportId:list.reportId,fileId:list.fileId,clientId});check(email,clientId);if(!result?.ok||!result.restored||result.kind!=='list'||result.reportId!==list.reportId||result.clientId!==clientId||result.pdf?.fileId!==list.fileId)throw failure('La restauration de la liste n’a pas été confirmée.','RESTORE_UNCONFIRMED');restored.push(list.fileId);}
    return {...result,fichiers:[...new Set([...(result.fichiers||[]),...receipt.ids.filter(id=>restored.includes(id))])],dossiers:result.dossiers||[]};
  }
  async function snapshotList(fileId,list,verify){
    const payload={kind:'list',reportId:list.reportId,fileId,clientId:list.clientId},client=await engine.client();verify();
    const pendingLocal=async()=>{const records=await client.all();verify();return records.some(record=>record.context?.clientId===list.clientId&&record.pending&&!record.dataSaved);};
    for(let n=0;n<attempts;n++){
      const records=await client.all();verify();const prepared=await prepareListSend(list.clientId,{...list,acceptedSaves:records.filter(record=>record.context?.clientId===list.clientId&&record.dataSaved&&!record.deleted).map(record=>({reportId:record.context.reportId,requestId:record.payload?.requestId}))});verify();
      await client.resume();verify();
      if(!prepared?.ready||await pendingLocal()){await wait(1200);verify();continue;}
      const read=await engine.call('status',payload);verify();
      if(!read?.ok||read.engine!==2754||read.kind!=='list'||!Number.isSafeInteger(read.revision)||read.revision<1||read.reportId!==list.reportId||read.clientId!==list.clientId||read.pdf?.fileId!==fileId)throw failure('La liste sélectionnée a été remplacée.','CONFLICT_LIST_FILE');
      if(read.pdf.status!=='confirmed'||Number(read.pdf.revision)!==Number(read.revision)){await wait(1200);verify();continue;}
      let result;try{result=await engine.call('export',payload);}catch(error){if(error.code==='PDF_PENDING'){await wait(1200);verify();continue;}throw error;}verify();
      if(!result?.ok||result.engine!==2754||result.kind!=='list'||result.reportId!==list.reportId||result.clientId!==list.clientId||result.fileId!==fileId||!Number.isSafeInteger(result.revision)||result.revision<read.revision||typeof result.driveRevision!=='string'||!result.driveRevision||result.mimeType!=='application/pdf'||typeof result.base64!=='string'||!/^[a-f0-9]{64}$/i.test(result.sha256||''))throw failure('Le PDF reçu ne confirme pas la dernière liste.','INVALID_EXPORT');
      const bytes=Uint8Array.from(atob(result.base64),char=>char.charCodeAt(0));
      if(bytes.length!==result.size||bytes.length>32*1024*1024||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw failure('PDF reçu incomplet.','INVALID_EXPORT');
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');verify();if(hash!==result.sha256.toLowerCase())throw failure('Empreinte du PDF reçu invalide.','INVALID_EXPORT');
      const latest=listSendState(list.clientId);verify();if(!latest?.ready||latest.stamp!==prepared.stamp||await pendingLocal()){await wait(1200);verify();continue;}
      return Object.freeze({blob:new Blob([bytes],{type:'application/pdf'}),nom:String(result.name||'Liste de balance.pdf'),kind:'list',reportId:list.reportId,fileId,revision:result.revision,driveRevision:result.driveRevision});
    }
    throw failure('La dernière liste est encore en préparation. Réessayez après sa confirmation Drive.','PDF_PENDING');
  }
  async function snapshot(fileId,context,legacy){
    const email=owner(),clientId=context.clientId,verify=()=>{check(email,clientId);sendGuard(context);if(context.owner!==email)throw failure('Le compte de cet envoi a changé.','CDQ_DELETE_ACCOUNT_CHANGED');};verify();
    // Identify lists before touching the offline attachment cache. Their PDF
    // is a server projection and must be exported from its current Drive ID.
    let known=await find(fileId,clientId);verify();
    if(known?.kind==='list')return snapshotList(fileId,known.context,verify);
    if(known?.kind==='legacy-list'){
      const result=await legacy(fileId,context,{forceFresh:true,scope:known.context});verify();const current=await find(fileId,clientId);verify();
      if(current?.kind!=='legacy-list'||current.context.driveRevision!==known.context.driveRevision||result.driveRevision!==known.context.driveRevision)throw failure('La liste a changé pendant sa lecture.','CONFLICT_LIST_FILE');return result;
    }
    const local=await readLocal(fileId);verify();
    if(local?.clientId&&String(local.clientId)!==clientId)throw failure('Ce PDF appartient à un autre client.','SCOPE_MISMATCH');
    if(!known&&!local?.reportEngineV2754)return legacy(fileId,context);
    const reportId=known?.context.reportId||local.reportEngineV2754.reportId,client=await engine.client();
    for(let n=0;n<attempts;n++){
      verify();const cached=await client.get({reportId});verify();
      if(cached?.deleted||known?.deleted)throw failure('Ce rapport a été supprimé.','REPORT_DELETED');
      if(cached?.blocked)throw failure(cached.error||'La publication Drive doit être vérifiée.','PDF_CONFLICT');
      await client.resume();verify();
      const read=await engine.call('read',{reportId,clientId});verify();if(read.deleted)throw failure('Ce rapport a été supprimé.','REPORT_DELETED');
      const currentLocal=await readLocal(fileId);verify();
      const desired=saves.get(reportId),snapshot=read.snapshot||read.report?.snapshot||read.report||{},waitingLocal=cached?.pending&&!cached.dataSaved&&snapshot.requestId!==cached.payload?.requestId;
      const waitingCopy=desired&&snapshot.requestId!==desired.requestId||currentLocal?.pending&&currentLocal.reportSnapshotV2754&&JSON.stringify(snapshot.fields)!==JSON.stringify(currentLocal.reportSnapshotV2754);
      if(waitingLocal||waitingCopy||read.pdf?.status!=='confirmed'||Number(read.pdf.revision)!==Number(read.revision)){await wait(1200);continue;}
      let result;try{result=await engine.call('export',{reportId,clientId});}catch(error){if(error.code==='PDF_PENDING'){await wait(1200);continue;}throw error;}verify();
      const latest=await client.get({reportId});verify();
      if(latest?.deleted)throw failure('Ce rapport a été supprimé.','REPORT_DELETED');
      if(saves.get(reportId)!==desired||latest?.pending&&!latest.dataSaved&&latest.payload?.requestId!==snapshot.requestId){await wait(1200);continue;}
      if(!result.ok||result.reportId!==reportId||result.fileId!==fileId||Number(result.revision)<Number(read.revision)||typeof result.base64!=='string'||!/^[a-f0-9]{64}$/i.test(result.sha256||''))throw failure('Le PDF reçu ne confirme pas la dernière révision.','INVALID_EXPORT');
      const bytes=Uint8Array.from(atob(result.base64),char=>char.charCodeAt(0));
      if(bytes.length!==result.size||bytes.length>32*1024*1024||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw failure('PDF reçu incomplet.','INVALID_EXPORT');
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');verify();if(hash!==result.sha256.toLowerCase())throw failure('Empreinte du PDF reçu invalide.','INVALID_EXPORT');
      return Object.freeze({blob:new Blob([bytes],{type:'application/pdf'}),nom:String(result.name||local?.nom||'Rapport.pdf'),reportId,revision:result.revision,driveRevision:result.driveRevision});
    }
    throw failure('Le PDF correspondant aux dernières réponses est encore en préparation. Réessayez l’envoi après sa confirmation Drive.','PDF_PENDING');
  }
  return {track,handle,remove,deleteSelection,restoreSelection,snapshot,reset(){saves.clear();}};
}
