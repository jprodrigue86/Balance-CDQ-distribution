// This adapter runs inside the authenticated Selector. Google sessions and
// server signing keys stay in their existing authority boundaries.
import {listConsultationDescriptorV2755} from './list-consultation-v2755.mjs';
export function createReportEngineSelectorV2754({rpc,owner,canRead,canWrite,epoch,currentClient=()=>'',post,instant,background,loadClient,loadTemplate,publish=()=>{},isOnline=()=>globalThis.navigator?.onLine!==false}){
  let capability=null,capabilityFlight=null,clientFlight=null,lease=0;const pendingReports=new Set(),legacyScopes=new Map();
  const valid=(email,stamp)=>email===owner()&&stamp===epoch()&&canRead();
  const fail=result=>{if(!result?.ok)throw Object.assign(Error(result?.error||result?.message||'Le moteur de rapports est indisponible.'),{code:result?.code});return result;};
  async function call(action,payload={}){const email=owner(),stamp=epoch();if(!email||!canRead())throw Error('Déverrouillez votre compte CDQ.');let result;try{result=fail(await rpc(action,payload));}catch(error){if(!error.code){const match=String(error.message||error).match(/^(?:Error:\s*)?([A-Za-z][A-Za-z0-9_]{2,80})\s*:/);if(match)error.code=match[1];}throw error;}if(!valid(email,stamp))throw Error('Le compte ou l’accès a changé.');return result;}
  async function capabilities(){if(capability)return capability;if(capabilityFlight)return capabilityFlight;const email=owner(),stamp=epoch();capabilityFlight=call('capabilities').then(result=>{if(valid(email,stamp))capability=result;return result;}).catch(()=>null).finally(()=>{capabilityFlight=null;});return capabilityFlight;}
  function changed(record){
    if(record.account!==owner()||!canRead())return;
    if(record.pending)pendingReports.add(record.context.reportId);else pendingReports.delete(record.context.reportId);
    background?.setPending?.('report-engine',pendingReports.size,record.account);
    if(record.deleted){publish('cdq:report-deleted-v2754',{owner:record.account,clientId:record.context.clientId,reportId:record.context.reportId,fileId:record.pdf?.fileId||record.context.fileId||'',pending:!!record.pending,confirmed:!!record.deleteAck&&!record.pending});return;}
    const context=record.context,pdf=record.pdf,confirmed=pdf?.status==='confirmed'&&Number(pdf.revision)===Number(record.serverRevision),detail={owner:record.account,clientId:context.clientId,reportId:context.reportId,sourceId:pdf?.fileId||context.fileId||context.reportId,saveId:record.payload?.requestId,name:record.name,fields:record.fields,revision:record.serverRevision,pdf,dataSaved:!!record.dataSaved,pending:!!record.pending};
    publish('cdq:report-data-saved-v2754',detail);
    if(confirmed){const file={id:pdf.fileId,fileId:pdf.fileId,nom:record.name,name:record.name,revision:pdf.driveRevision,modifiedTime:pdf.driveRevision,clientId:context.clientId,destinationId:context.destinationId,type:'PDF',reportIdV2754:context.reportId,reportRevisionV2754:record.serverRevision};instant?.confirm?.(file,context.clientId,context.destinationId,{type:'PDF'});publish('cdq:report-pdf-confirmed-v2754',{...detail,...file});}
  }
  async function client(){if(!clientFlight)clientFlight=loadClient().then(module=>module.createReportEngineClientV2754({rpc:call,getAccount:owner,canWrite,onChange:changed}));return clientFlight;}
  function contextOf(report){
    if(!report)return null;const snapshot=report.snapshot||report.payload||report;
    return {engine:2754,reportId:report.reportId||snapshot.reportId,clientId:report.clientId||snapshot.clientId,destinationId:report.destinationId||snapshot.destinationId,fileId:report.pdf?.fileId||report.fileId||snapshot.fileId||'',family:report.family||snapshot.family,template:report.template||snapshot.template,baseRevision:Number(report.revision||report.serverRevision||0),expectedDriveRevision:report.pdf?.driveRevision||report.driveRevision||snapshot.expectedDriveRevision||''};
  }
  async function recordForOpen(fileId,legacyRecord=null){
    const email=owner(),stamp=epoch(),engine=await client();let record=await engine.get({fileId:String(fileId)});if(!valid(email,stamp))throw Error('Le compte ou l’accès a changé.');
    const expectedClient=String(legacyRecord?.clientId||currentClient()),deleted=()=>{throw Object.assign(Error('Ce rapport a été supprimé. Ses réponses conservées ne seront pas renvoyées.'),{code:'REPORT_DELETED'});};
    async function rememberRead(result){
      if(result.deleted)deleted();
      const report=result.report||(result.snapshot?{...result,...result.snapshot,pdf:result.pdf,revision:result.revision}:null);if(!report)return null;
      const context=contextOf(report),fields=report.fields||report.snapshot?.fields||report.payload?.fields;
      if(!context||!fields)throw Object.assign(Error('Les réponses serveur de ce rapport sont incomplètes.'),{code:'INVALID_REPORT_RESPONSE'});
      if(expectedClient&&context.clientId!==expectedClient)throw Object.assign(Error('Le rapport appartient à un autre client.'),{code:'SCOPE_MISMATCH'});
      return engine.remember({context,fields,name:report.name||legacyRecord?.nom,pdf:report.pdf,serverRevision:report.revision});
    }
    if(record){
      if(record.deleted)deleted();
      if(expectedClient&&record.context.clientId!==expectedClient)throw Object.assign(Error('Le rapport appartient à un autre client.'),{code:'SCOPE_MISMATCH'});
      if(isOnline()){
        try{
          const result=await call('read',{reportId:record.context.reportId,clientId:record.context.clientId,...(record.context.fileId?{fileId:record.context.fileId}:{})});
          if(result.deleted)deleted();
          if(result.found===false){if(!(record.pending&&!record.dataSaved))throw Object.assign(Error('Ce rapport n’est plus présent sur le serveur.'),{code:'REPORT_NOT_FOUND'});}
          else{const refreshed=await rememberRead(result);if(!refreshed)throw Object.assign(Error('Les réponses serveur de ce rapport sont incomplètes.'),{code:'INVALID_REPORT_RESPONSE'});record=refreshed;}
        }catch(error){
          // Only a transport outage can use the durable local copy. Account,
          // permission, revision and deletion errors must remain visible.
          if(error.code||!/network|offline|réseau|failed to fetch|load failed|internet|timed?\s*out|timeout/i.test(String(error.message||'')))throw error;
        }
      }
    }
    if(!record){
      if(!(await capabilities())?.ready)return null;
      const result=await call('read',{fileId:String(fileId),clientId:expectedClient});if(result.deleted)deleted();
      const consultation=listConsultationDescriptorV2755(result,String(fileId),expectedClient);
      if(consultation){legacyScopes.delete(String(fileId));return consultation;}
      record=await rememberRead(result);if(!record){if(result.legacyScope)legacyScopes.set(String(fileId),result.legacyScope);return null;}
    }
    if(record.deleted)deleted();
    const context=record.context;if(expectedClient&&context.clientId!==expectedClient)throw Object.assign(Error('Le rapport appartient à un autre client.'),{code:'SCOPE_MISMATCH'});
    const template=await loadTemplate(context.template);if(!valid(email,stamp))throw Error('Le compte ou l’accès a changé.');
    return {...legacyRecord,id:String(fileId),clientId:context.clientId,folderId:context.destinationId,nom:record.name,blob:template.blob,revision:context.expectedDriveRevision,reportEngineV2754:context,reportSnapshotV2754:record.fields,readerPreparedVersion:2730};
  }
  async function save(context,fields,requestId,name){return (await client()).save(context,fields,requestId,name);}
  async function handle(data){
    if(data.type!=='CDQ_REPORT_ENGINE_SAVE_V2754'||data.email!==owner()||!canWrite())return false;
    const email=owner(),stamp=epoch(),attempt=++lease;
    const reply=(type,value)=>{if(valid(email,stamp))post({...value,type,email,requestId:data.requestId,uploadId:data.uploadId,reportId:data.payload.reportId});};
    publish('cdq:report-data-saved-v2754',{owner:email,clientId:data.payload.clientId,reportId:data.payload.reportId,sourceId:data.payload.fileId||data.payload.reportId,saveId:data.payload.requestId,name:data.payload.name,fields:data.payload.fields,dataSaved:false,pending:true});
    try{
      let result=await call('save',data.payload);reply('CDQ_REPORT_ENGINE_DATA_SAVED_V2754',{...result,reportRevision:result.revision});publish('cdq:report-data-saved-v2754',{owner:email,clientId:data.payload.clientId,reportId:data.payload.reportId,sourceId:result.pdf?.fileId||data.payload.fileId||data.requestId,saveId:data.payload.requestId,name:data.payload.name,fields:data.payload.fields,revision:result.revision,pdf:result.pdf,dataSaved:true,row:result.row});
      for(let n=0;n<50&&result.pdf?.status!=='confirmed';n++){
        if(['conflict','error'].includes(result.pdf?.status))throw Error(result.pdf.error||'La publication du PDF doit être reprise.');
        await new Promise(resolve=>setTimeout(resolve,1200));if(!valid(email,stamp))return true;
        result=await call('status',{reportId:data.payload.reportId,clientId:data.payload.clientId});
      }
      const expected=Number(result.revision);if(result.pdf?.status!=='confirmed'||Number(result.pdf.revision)!==expected)throw Error('Le PDF reste conservé; sa publication Drive est en attente.');
      const file={id:result.pdf.fileId,revision:result.pdf.driveRevision,name:data.payload.name,nom:data.payload.name,reportRevision:expected};
      instant?.confirm?.(file,data.payload.clientId,data.payload.destinationId,{type:'PDF'});reply('CDQ_REPORT_ENGINE_SAVE_V2754_RESULT',{ok:true,...file,pdf:result.pdf});publish('cdq:report-pdf-confirmed-v2754',{...file,owner:email,clientId:data.payload.clientId,reportId:data.payload.reportId,fields:data.payload.fields,pdf:result.pdf,revision:expected});
    }catch(error){reply('CDQ_REPORT_ENGINE_SAVE_V2754_RESULT',{ok:false,message:error.message,code:error.code||''});}
    return attempt>0;
  }
  async function resume(){if(canRead()){await capabilities();await (await client()).resume();}}
  function reset(){lease++;capability=null;capabilityFlight=null;pendingReports.clear();legacyScopes.clear();clientFlight?.then(value=>value.lock());background?.setPending?.('report-engine',0,owner());}
  function importContext(fileId){const scope=legacyScopes.get(String(fileId));return scope&&canRead()?{...scope,reportId:crypto.randomUUID(),baseRevision:0}:null;}
  return {call,client,capabilities,recordForOpen,importContext,save,handle,resume,reset,get enabled(){return capability?.ready===true;}};
}
