// Short-lived, account-scoped authorized reads for the next visible reports.
// This is an in-memory optimization, never an offline authority or save receipt.
export function createReportOpenPrewarmV2835({request,scope,promote=()=>{},loadTemplate=async()=>{},now=()=>Date.now(),ttlMs=5000,maxReports=6}={}){
  const limit=Math.max(1,Math.min(6,Number(maxReports)||6));
  const ttl=Math.max(1,Math.min(5000,Number(ttlMs)||5000));
  const records=new Map();
  let current='',generation=0,batch=null;
  const string=value=>String(value??'');
  const error=(code,message)=>Object.assign(Error(message),{code});
  function identity(){
    const s=scope()||{};
    return s.enabled&&s.online!==false&&s.account&&s.clientId
      ?JSON.stringify([string(s.account),string(s.epoch),string(s.clientId)]):'';
  }
  function sync(){
    const key=identity();
    if(key!==current){generation++;records.clear();batch?.controller.abort();batch=null;current=key;}
    return key;
  }
  function reset(){generation++;records.clear();batch?.controller.abort();batch=null;current=identity();}
  function invalidate({reportId,fileId}={}){
    // Invalidate claimed in-flight grants too, even after take removed the key.
    // Six small snapshots are cheaper to refresh than a stale edit to recover.
    reset();
  }
  function reportOf(result){return result?.report||(result?.snapshot?{...result,...result.snapshot,pdf:result.pdf,revision:result.revision}:null);}
  function validate(result,entry){
    if(!result||string(result.reportId)!==entry.reportId)return null;
    // Metadata divergences need the ordinary read/reconciliation path. A
    // background refusal is never converted into an authorized snapshot.
    if(result.ok!==true||result.reconciliationRequired||result.kind==='list')return null;
    if(result.deleted===true)return {ok:true,reportId:entry.reportId,deleted:true};
    if(result.found===false)return {ok:true,reportId:entry.reportId,found:false};
    const report=reportOf(result),snapshot=report?.snapshot||report?.payload||report;
    const reportId=string(report?.reportId||snapshot?.reportId),clientId=string(report?.clientId||snapshot?.clientId);
    const destination=string(report?.destinationId||snapshot?.destinationId);
    const fileId=string(report?.pdf?.fileId||report?.fileId||snapshot?.fileId);
    const revision=Number(report?.revision||report?.serverRevision);
    const template=report?.template||snapshot?.template;
    if(!report||reportId!==entry.reportId||clientId!==entry.clientId||!Number.isSafeInteger(revision)||revision<1||!/^[a-f0-9]{64}$/.test(template?.sha256||''))return null;
    if(entry.destinationId&&destination!==entry.destinationId)return null;
    if(fileId!==entry.fileId)return null;
    if(entry.revision&&revision<entry.revision)return null;
    if(entry.templateSha&&template.sha256!==entry.templateSha)return null;
    if(!(report.fields||report.snapshot?.fields||report.payload?.fields))return null;
    return result;
  }
  function compatible(entry,meta){
    if(meta?.clientId&&string(meta.clientId)!==entry.clientId)return false;
    const own=meta?.reportEngineV2754;
    const reportId=meta?.reportIdV2754||own?.reportId;
    if(reportId&&string(reportId)!==entry.reportId)return false;
    const destination=meta?.destinationId||meta?.folderId||own?.destinationId;
    if(destination&&entry.destinationId&&string(destination)!==entry.destinationId)return false;
    const revision=Number(meta?.reportRevisionV2754||own?.baseRevision||0);
    if(revision&&entry.revision&&revision!==entry.revision)return false;
    const sha=own?.template?.sha256;
    return !sha||!entry.templateSha||sha===entry.templateSha;
  }
  function take(fileId,meta={}){
    const key=sync(),entry=records.get(string(fileId));
    if(!key||!entry||entry.key!==key||entry.generation!==generation||!compatible(entry,meta))return null;
    records.delete(string(fileId)); // A grant is claimed once, never reused for another opening.
    if(now()-entry.startedAt>ttl)return null;
    // The existing RPC budget promotes a queued read, never dispatches a copy.
    if(!entry.batch.settled)try{promote(entry.batch.payload);}catch{}
    return entry.promise.then(result=>{
      if(identity()!==key||generation!==entry.generation||now()-entry.startedAt>ttl)return null;
      if(result?.ok===false)throw error(result.code,result.message);
      const report=reportOf(result),revision=Number(report?.revision||report?.serverRevision||0);
      const expected=Number(meta?.reportRevisionV2754||meta?.reportEngineV2754?.baseRevision||0);
      if(expected&&revision&&revision<expected)return null;
      if(meta?.reportEngineV2754?.template?.sha256&&(report?.template||report?.snapshot?.template||report?.payload?.template)?.sha256!==meta.reportEngineV2754.template.sha256)return null;
      return result?structuredClone(result):null;
    });
  }
  function warm(items=[]){
    const key=sync();
    if(!key)return Promise.resolve({count:0});
    if(batch)return batch.promise;
    const s=scope(),stamp=generation,selected=[],seen=new Set(),startedAt=now();
    let destination=null,candidates=0;
    for(const item of items){
      const fileId=string(item?.id||item?.fileId),reportId=string(item?.reportIdV2754||item?.reportId);
      const clientId=string(item?.clientId||s.clientId);
      if(!fileId||!reportId||clientId!==string(s.clientId)||seen.has(reportId)||item?._cdqLocalReportV2713||item?._cdqPendingSaveV2660||item?.deleted)continue;
      const destinationId=string(item?.destinationId||item?.folderId);
      if(!destinationId)continue;
      if(destination===null)destination=destinationId;
      if(destinationId!==destination)continue;
      seen.add(reportId);
      if(candidates++===limit)break;
      const rawRevision=Number(item?.reportRevisionV2754||item?.revision||0);
      const revision=Number.isSafeInteger(rawRevision)&&rawRevision>0?rawRevision:0;
      const existing=records.get(fileId);
      if(existing&&existing.revision===revision&&now()-existing.startedAt<=ttl)continue;
      selected.push({fileId,reportId,clientId,destinationId,revision,templateSha:string(item?.templateSha||item?.template?.sha256),key,generation:stamp,startedAt});
      if(selected.length===limit)break;
    }
    if(!selected.length)return Promise.resolve({count:0});
    const flight={controller:new AbortController(),settled:false,payload:{clientId:string(s.clientId),destinationId:destination,reports:selected.map(({reportId,fileId})=>({reportId,fileId}))}};
    const response=Promise.resolve().then(()=>{
      if(identity()!==key||generation!==stamp)return null;
      return request('readMany',flight.payload,{signal:flight.controller.signal});
    }).catch(()=>null);
    for(const entry of selected){
      entry.batch=flight;
      entry.promise=response.then(result=>{
        if(identity()!==key||generation!==stamp||!result?.ok||string(result.clientId)!==entry.clientId||!Array.isArray(result.reports))return null;
        const matching=result.reports.filter(value=>string(value?.reportId)===entry.reportId);
        if(matching.length!==1)return null;
        const accepted=validate(matching[0],entry),report=reportOf(accepted);
        if(report&&now()-startedAt<=ttl){
          const snapshot=report.snapshot||report.payload||report;
          const template=report.template||snapshot.template,family=report.family||snapshot.family;
          // The pin loader already deduplicates immutable masters. No answers
          // are persisted or made editable by this background operation.
          Promise.resolve().then(()=>{
            if(identity()!==key||generation!==stamp)return;
            return loadTemplate(template,{family,checkCurrent:()=>{if(identity()!==key||generation!==stamp)throw error('REPORT_PREWARM_CANCELLED','Le dossier a changé.');}});
          }).catch(()=>{});
        }
        return accepted;
      });
      while(records.size>=limit)records.delete(records.keys().next().value);
      records.set(entry.fileId,entry);
    }
    flight.promise=response.then(()=>({count:selected.length})).finally(()=>{flight.settled=true;if(batch===flight)batch=null;});
    batch=flight;return flight.promise;
  }
  return {warm,take,invalidate,reset,state:()=>{sync();return{size:records.size,active:!!batch,generation,ttlMs:ttl,maxReports:limit};}};
}
