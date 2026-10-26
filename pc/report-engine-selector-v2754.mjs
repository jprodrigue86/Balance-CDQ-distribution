// This adapter runs inside the authenticated Selector. Google sessions and
// server signing keys stay in their existing authority boundaries.
import {listConsultationDescriptorV2755} from './list-consultation-v2755.mjs';
export function createReportEngineSelectorV2754({rpc,owner,canRead,canWrite,epoch,currentClient=()=>'',post,instant,background,loadClient,loadTemplate,readLocal=async()=>null,publish=()=>{},isOnline=()=>globalThis.navigator?.onLine!==false}){
  let capability=null,capabilityFlight=null,clientFlight=null,lease=0;const pendingReports=new Set(),legacyScopes=new Map(),receiptFlightsV2757=new Map();
  const valid=(email,stamp)=>email===owner()&&stamp===epoch()&&canRead();
  const fail=result=>{if(!result?.ok)throw Object.assign(Error(result?.error||result?.message||'Le moteur de rapports est indisponible.'),{code:result?.code});return result;};
  async function call(action,payload={}){const email=owner(),stamp=epoch();if(!email||!canRead())throw Error('Déverrouillez votre compte CDQ.');let result;try{result=fail(await rpc(action,payload));}catch(error){if(!error.code){const match=String(error.message||error).match(/^(?:Error:\s*)?([A-Za-z][A-Za-z0-9_]{2,80})\s*:/);if(match)error.code=match[1];}throw error;}if(!valid(email,stamp))throw Error('Le compte ou l’accès a changé.');return result;}
  async function capabilities(){if(capability)return capability;if(capabilityFlight)return capabilityFlight;const email=owner(),stamp=epoch();capabilityFlight=call('capabilities').then(result=>{if(valid(email,stamp))capability=result;return result;}).catch(()=>null).finally(()=>{capabilityFlight=null;});return capabilityFlight;}
  function changed(record){
    if(record.account!==owner()||!canRead())return;
    if(record.pending)pendingReports.add(record.context.reportId);else pendingReports.delete(record.context.reportId);
    background?.setPending?.('report-engine',pendingReports.size,record.account);
    if(record.deleted){publish('cdq:report-deleted-v2754',{owner:record.account,clientId:record.context.clientId,reportId:record.context.reportId,fileId:record.pdf?.fileId||record.context.fileId||'',pending:!!record.pending,confirmed:!!record.deleteAck&&!record.pending});return;}
    const context=record.context,pdf=record.pdf,confirmed=record.dataSaved===true&&!record.pending&&pdf?.status==='confirmed'&&Number(pdf.revision)===Number(record.serverRevision),detail={owner:record.account,clientId:context.clientId,reportId:context.reportId,sourceId:pdf?.fileId||context.fileId||context.reportId,saveId:record.payload?.requestId,name:record.name,fields:record.fields,revision:record.serverRevision,pdf,dataSaved:!!record.dataSaved,pending:!!record.pending,localDurable:true,savedAt:record.savedAt};
    if(record.pending&&context.fileId&&Number.isFinite(record.savedAt))instant?.confirm?.({id:context.fileId,nom:record.name,type:'PDF',_cdqPendingSaveV2660:record.payload.requestId,_cdqLocalSavedAtV2772:record.savedAt},context.clientId,context.destinationId,{type:'PDF'});
    publish('cdq:report-data-saved-v2754',detail);
    if(confirmed){const file={id:pdf.fileId,fileId:pdf.fileId,nom:record.name,name:record.name,revision:pdf.driveRevision,modifiedTime:pdf.driveRevision,clientId:context.clientId,destinationId:context.destinationId,type:'PDF',reportIdV2754:context.reportId,reportRevisionV2754:record.serverRevision,_cdqCommittedUploadV2660:record.payload.requestId,_cdqLocalSavedAtV2772:0};instant?.confirm?.(file,context.clientId,context.destinationId,{type:'PDF'});publish('cdq:report-pdf-confirmed-v2754',{...detail,...file,revision:record.serverRevision});}
  }
  async function client(){
    if(!clientFlight){
      const flight=Promise.resolve().then(loadClient).then(module=>module.createReportEngineClientV2754({rpc:call,getAccount:owner,canWrite,onChange:changed}));
      clientFlight=flight;
      flight.catch(()=>{if(clientFlight===flight)clientFlight=null;});
    }
    return clientFlight;
  }
  function contextOf(report){
    if(!report)return null;const snapshot=report.snapshot||report.payload||report;
    return {engine:2754,reportId:report.reportId||snapshot.reportId,clientId:report.clientId||snapshot.clientId,destinationId:report.destinationId||snapshot.destinationId,fileId:report.pdf?.fileId||report.fileId||snapshot.fileId||'',family:report.family||snapshot.family,template:report.template||snapshot.template,baseRevision:Number(report.revision||report.serverRevision||0),expectedDriveRevision:report.pdf?.driveRevision||report.driveRevision||snapshot.expectedDriveRevision||''};
  }
  async function recordForOpen(fileId,legacyRecord=null,{localOnly=false,requireFresh=false,checkCurrent=()=>{},onPhase=()=>{}}={}){
    const phase=name=>{checkCurrent();try{onPhase(name);}catch{}};
    phase('lookup-start');
    if(requireFresh&&!isOnline())throw Object.assign(Error('La connexion est nécessaire pour vérifier la dernière version. La copie reste en consultation.'),{code:'REPORT_ENGINE_OFFLINE'});
    const email=owner(),stamp=epoch(),expectedClient=String(legacyRecord?.clientId||currentClient());
    // A fresh authorized read can overlap local storage; editing still awaits it.
    let freshRead=null;
    if(requireFresh&&!localOnly){phase('read-start');freshRead=call('read',{fileId:String(fileId),clientId:expectedClient});freshRead.catch(()=>{});}
    const engine=await client();let record=await engine.get({fileId:String(fileId)});checkCurrent();phase('lookup-ready');if(!valid(email,stamp))throw Error('Le compte ou l’accès a changé.');
    const deleted=()=>{throw Object.assign(Error('Ce rapport a été supprimé. Ses réponses conservées ne seront pas renvoyées.'),{code:'REPORT_DELETED'});};
    async function rememberRead(result){
      checkCurrent();if(result.deleted)deleted();
      const report=result.report||(result.snapshot?{...result,...result.snapshot,pdf:result.pdf,revision:result.revision}:null);if(!report)return null;
      const context=contextOf(report),fields=report.fields||report.snapshot?.fields||report.payload?.fields;
      if(!context||!fields)throw Object.assign(Error('Les réponses serveur de ce rapport sont incomplètes.'),{code:'INVALID_REPORT_RESPONSE'});
      if(expectedClient&&context.clientId!==expectedClient)throw Object.assign(Error('Le rapport appartient à un autre client.'),{code:'SCOPE_MISMATCH'});
      phase('snapshot-start');const remembered=await engine.remember({context,fields,name:report.name||legacyRecord?.nom,pdf:report.pdf,serverRevision:report.revision});phase('snapshot-ready');return remembered;
    }
    if(record){
      if(record.deleted)deleted();
      const movedClient=expectedClient&&record.context.clientId!==expectedClient;
      if(movedClient&&(record.pending||record.blocked||record.dataSaved===false))throw Object.assign(Error('Ce rapport a changé de dossier alors que des réponses locales sont en attente. Elles restent conservées; terminez leur vérification avant de rouvrir le fichier.'),{code:'REPORT_LOCATION_CONFLICT'});
      if(movedClient&&localOnly)return null;
      if(movedClient&&!isOnline())throw Object.assign(Error('Connectez-vous pour vérifier le nouvel emplacement de ce rapport.'),{code:'SCOPE_MISMATCH'});
      if(!localOnly&&isOnline()){
        try{
          if(!freshRead)phase('read-start');const result=await (freshRead||call('read',{...(movedClient?{}:{reportId:record.context.reportId}),clientId:expectedClient||record.context.clientId,fileId:String(fileId)}));
          checkCurrent();phase('read-ready');if(result.deleted)deleted();
          if(result.found===false){if(requireFresh||!(record.pending&&!record.dataSaved))throw Object.assign(Error('Ce rapport n’est plus présent sur le serveur.'),{code:'REPORT_NOT_FOUND'});}
          else{const refreshed=await rememberRead(result);if(!refreshed)throw Object.assign(Error('Les réponses serveur de ce rapport sont incomplètes.'),{code:'INVALID_REPORT_RESPONSE'});record=refreshed;}
        }catch(error){
          // Only a transport outage can use the durable local copy. Account,
          // permission, revision and deletion errors must remain visible.
          if(requireFresh||movedClient||error.code||!/network|offline|réseau|failed to fetch|load failed|internet|timed?\s*out|timeout/i.test(String(error.message||'')))throw error;
        }
      }
    }
    if(!record){
      if(localOnly)return null;
      if(!freshRead){
        phase('capability-start');const capable=await capabilities();checkCurrent();phase('capability-ready');
        if(!capable?.ready){if(requireFresh)throw Object.assign(Error('Le moteur de rapports ne répond pas. La copie locale reste en consultation.'),{code:'REPORT_ENGINE_UNAVAILABLE'});return null;}
        phase('read-start');
      }
      const result=await (freshRead||call('read',{fileId:String(fileId),clientId:expectedClient}));checkCurrent();phase('read-ready');if(result.deleted)deleted();
      const consultation=listConsultationDescriptorV2755(result,String(fileId),expectedClient);
      if(consultation){legacyScopes.delete(String(fileId));return consultation;}
      record=await rememberRead(result);if(!record){
        const scope=result.legacyScope;if(scope)legacyScopes.set(String(fileId),scope);
        const local=await readLocal(String(fileId))||legacyRecord;checkCurrent();const own=local?.reportEngineV2754;
        if(local?.pendingSaveId&&local.reportSnapshotOwnerV2757===email&&local.reportSnapshotV2754&&own?.baseRevision===0&&own.fileId===String(fileId)&&scope?.fileId===own.fileId&&scope.clientId===own.clientId&&scope.destinationId===own.destinationId){
          if(scope.expectedDriveRevision!==own.expectedDriveRevision)throw Object.assign(Error('Le PDF a changé. Les nouvelles réponses restent conservées sur cet appareil.'),{code:'REPORT_LOCAL_REVISION_CONFLICT'});
          record={context:own,fields:local.reportSnapshotV2754,name:local.nom};
        }else return null;
      }
    }
    if(record.deleted)deleted();
    // The Android editor's durable copy owns newly saved fields; its PDF blob
    // can still be the preceding support PDF while publication is in flight.
    const local=await readLocal(String(fileId))||legacyRecord;checkCurrent();
    if(local?.reportSnapshotV2754&&local.reportSnapshotOwnerV2757===email){
      const own=local.reportEngineV2754,remote=record.context;
      if(own?.reportId===remote.reportId&&own.clientId===remote.clientId&&own.destinationId===remote.destinationId&&own.fileId===String(fileId)&&own.template?.sha256===remote.template?.sha256){
        const pending=!!local.pendingSaveId,localRevision=Number(own.baseRevision),remoteRevision=Number(remote.baseRevision);
        if(pending&&remoteRevision>localRevision&&JSON.stringify(record.fields)!==JSON.stringify(local.reportSnapshotV2754))throw Object.assign(Error('Une autre révision existe. Vos nouvelles réponses restent conservées sur cet appareil.'),{code:'REPORT_LOCAL_REVISION_CONFLICT'});
        if(pending&&remoteRevision<=localRevision||localRevision>remoteRevision)record={...record,context:own,fields:local.reportSnapshotV2754,name:local.nom||record.name};
      }
    }
    const context=record.context;if(expectedClient&&context.clientId!==expectedClient)throw Object.assign(Error('Le rapport appartient à un autre client.'),{code:'SCOPE_MISMATCH'});
    const checkTemplateCurrent=()=>{checkCurrent();if(!valid(email,stamp))throw Error('Le compte ou l’accès a changé.');};
    phase('template-start');const template=await loadTemplate(context.template,{family:context.family,checkCurrent:checkTemplateCurrent});checkTemplateCurrent();phase('template-ready');
    return {...legacyRecord,id:String(fileId),clientId:context.clientId,folderId:context.destinationId,nom:record.name,blob:template.blob,revision:context.expectedDriveRevision,reportEngineV2754:context,reportSnapshotV2754:record.fields,readerPreparedVersion:2730};
  }
  async function save(context,fields,requestId,name,preparedPdf){return (await client()).save(context,fields,requestId,name,preparedPdf);}
  async function handle(data){
    if(data.type!=='CDQ_REPORT_ENGINE_SAVE_V2754'||data.email!==owner()||!canWrite()||!data.payload)return false;
    const email=owner(),stamp=epoch(),attempt=++lease,payload=data.payload;
    const flightKey=JSON.stringify([email,stamp,payload.clientId,payload.reportId,payload.requestId,data.uploadId]);
    if(receiptFlightsV2757.has(flightKey))return receiptFlightsV2757.get(flightKey);
    const flight=(async()=>{
      const reply=(type,value)=>{if(valid(email,stamp))post({...value,type,email,requestId:data.requestId,uploadId:data.uploadId,reportId:payload.reportId,clientId:payload.clientId,saveRequestIdV2757:payload.requestId});};
      let expected=data.statusOnlyV2757?data.acceptedRevisionV2757:null;
      function receipt(result,first=false){
        if(!Number.isSafeInteger(result?.revision)||result.revision<1||result.deleted||result.reportId&&result.reportId!==payload.reportId||result.row?.clientId&&result.row.clientId!==payload.clientId||result.clientId&&result.clientId!==payload.clientId)throw Object.assign(Error('La réponse du serveur ne correspond pas à ce rapport.'),{code:'INVALID_REPORT_RECEIPT'});
        if(first&&expected===null){if(result.dataSaved!==true)throw Error('Les données ne sont pas encore confirmées sur le serveur.');expected=result.revision;}
        if(result.revision!==expected)throw Object.assign(Error('Une autre révision du rapport a été enregistrée. Les réponses locales restent conservées.'),{code:'revision_conflict'});
        if(result.pdf?.status==='confirmed'&&(result.pdf.revision!==expected||typeof result.pdf.fileId!=='string'||!result.pdf.fileId))throw Object.assign(Error('Confirmation Drive invalide.'),{code:'INVALID_REPORT_RECEIPT'});
        reply('CDQ_REPORT_ENGINE_DATA_SAVED_V2754',{...result,reportRevision:expected});
        publish('cdq:report-data-saved-v2754',{owner:email,clientId:payload.clientId,reportId:payload.reportId,sourceId:result.pdf?.fileId||payload.fileId||data.requestId,saveId:payload.requestId,name:payload.name,fields:payload.fields,revision:expected,pdf:result.pdf,dataSaved:true,pending:result.pdf?.status!=='confirmed',row:result.row});
        return result;
      }
      try{
        if(data.statusOnlyV2757&&(!Number.isSafeInteger(expected)||expected<1))throw Object.assign(Error('Reçu de données local invalide.'),{code:'INVALID_REPORT_RECEIPT'});
        if(!data.statusOnlyV2757)publish('cdq:report-data-saved-v2754',{owner:email,clientId:payload.clientId,reportId:payload.reportId,sourceId:payload.fileId||payload.reportId,saveId:payload.requestId,name:payload.name,fields:payload.fields,dataSaved:false,pending:true});
        let result=receipt(await call(data.statusOnlyV2757?'status':'save',data.statusOnlyV2757?{reportId:payload.reportId,clientId:payload.clientId}:payload),true);
        for(let n=0;n<50&&result.pdf?.status!=='confirmed';n++){
          if(['conflict','error'].includes(result.pdf?.status))throw Object.assign(Error(result.pdf.message||result.pdf.error||'La publication du PDF doit être reprise.'),{code:result.pdf.status==='conflict'?'revision_conflict':''});
          await new Promise(resolve=>setTimeout(resolve,1200));if(!valid(email,stamp))return true;
          result=receipt(await call('status',{reportId:payload.reportId,clientId:payload.clientId}));
        }
        if(result.pdf?.status!=='confirmed')throw Error('Données synchronisées. La mise à jour du PDF dans Drive reste en cours.');
        const file={id:result.pdf.fileId,revision:result.pdf.driveRevision,name:payload.name,nom:payload.name,reportRevision:expected,reportIdV2754:payload.reportId,reportRevisionV2754:expected,_cdqCommittedUploadV2660:data.uploadId};
        instant?.confirm?.(file,payload.clientId,payload.destinationId,{type:'PDF'});reply('CDQ_REPORT_ENGINE_SAVE_V2754_RESULT',{ok:true,...file,pdf:result.pdf});publish('cdq:report-pdf-confirmed-v2754',{...file,owner:email,clientId:payload.clientId,reportId:payload.reportId,sourceId:payload.fileId||result.pdf.fileId,saveId:payload.requestId,fields:payload.fields,pdf:result.pdf,revision:expected});
      }catch(error){reply('CDQ_REPORT_ENGINE_SAVE_V2754_RESULT',{ok:false,message:error.message,code:error.code||''});}
      return attempt>0;
    })();
    receiptFlightsV2757.set(flightKey,flight);
    try{return await flight;}finally{if(receiptFlightsV2757.get(flightKey)===flight)receiptFlightsV2757.delete(flightKey);}
  }
  async function resume(){if(canRead()){await capabilities();await (await client()).resume();}}
  function reset(){lease++;receiptFlightsV2757.clear();capability=null;capabilityFlight=null;pendingReports.clear();legacyScopes.clear();clientFlight?.then(value=>value.lock()).catch(()=>{});background?.setPending?.('report-engine',0,owner());}
  function importContext(fileId){const scope=legacyScopes.get(String(fileId));return scope&&canRead()?{...scope,reportId:crypto.randomUUID(),baseRevision:0}:null;}
  return {call,client,capabilities,recordForOpen,importContext,save,handle,resume,reset,get enabled(){return capability?.ready===true;}};
}
