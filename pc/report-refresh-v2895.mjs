// Refresh reads remain scoped to the selected account/client and exact revision.
// Metadata alone does not prove client membership; callers must verify the new
// revision through the scoped summary before adopting it in the visible tree.
export const reportRefreshStampV2895=file=>JSON.stringify([
 String(file?.modifiedTime||file?.dateModification||file?.revision||''),
 String(file?.version||''),String(file?.md5Checksum||file?.sha256Checksum||''),
 String(file?._cdqPendingSaveV2660||'')
]);
export function reportReadCodeV2895(error){
 for(const value of [error?.code,error?.message])if(typeof value==='string'&&/^[A-Z][A-Z0-9_]{2,70}$/.test(value))return value;
 return '';
}
export function permanentReportReadFailureV2895(error){
 const code=reportReadCodeV2895(error);
 return error?.status===403||error?.statusCode===403||code==='SHEET_REVISION_CHANGED'||
  /(?:^|_)(?:FORBIDDEN|NOT_AUTHORIZED|ACCESS_DENIED)$/.test(code)||
  ['DRIVE_SCOPE_MISMATCH','CLIENT_SCOPE_MISMATCH','SESSION_EXPIRED','AUTH_REQUIRED','AUTHORIZATION_REQUIRED'].includes(code);
}
export function refreshedSheetSourceV2895(file,meta){
 const before=String(file?.modifiedTime||file?.dateModification||file?.revision||''),revision=String(meta?.dateModification||''),after=Date.parse(revision),previous=Date.parse(before);
 if(String(meta?.id||'')!==String(file?.id||'')||meta?.type!=='GOOGLE_SHEETS'||!Number.isFinite(after)||revision===before||Number.isFinite(previous)&&after<previous)
  throw Object.assign(Error('La nouvelle révision du rapport n’a pas été confirmée.'),{code:'SHEET_REVISION_UNCONFIRMED'});
 return {...file,...meta,modifiedTime:revision,dateModification:revision,revision};
}

export function readInteractiveReportMetadataV2895(id,{api,stillCurrent=()=>true,timeoutMs=25000}={}){
 return new Promise((resolve,reject)=>{
  if(typeof api!=='function'||!stillCurrent())return reject(Error('Le compte ou le client a changé.'));
  const controller=new AbortController();let settled=false;
  const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(!stillCurrent())return reject(Error('Le compte ou le client a changé.'));fn(value);};
  const timer=setTimeout(()=>{controller.abort();finish(reject,Object.assign(Error('La lecture des métadonnées a dépassé son délai.'),{code:'REPORT_METADATA_TIMEOUT'}));},timeoutMs);
  try{
   let runner=api().withSuccessHandler(value=>finish(resolve,value)).withFailureHandler(error=>finish(reject,error instanceof Error?error:Object.assign(Error(error?.message||String(error)),{code:error?.code})));
   if(api.cdqInteractiveReadV2893)runner=runner.withInteractiveReadV2893();
   if(api.cdqReadQueueCancellationV2792)runner=runner.withQueuedReadSignalV2792(controller.signal);
   runner.obtenirMetaFichier(String(id));
  }catch(error){finish(reject,error);}
 });
}

// Revision changes invalidate an old pass, not just its DOM. The newest changed
// source is first in the next serial pass, ahead of the rest of a visible batch.
export function createReportInspectionPlanV2895(){
 let context='',observed=new Map(),priorities=new Map(),sequence=0,lastTarget='';
 return function plan({owner,clientId,files,visible,targetId=''}){
  const next=JSON.stringify([String(owner),String(clientId)]);
  if(next!==context){context=next;observed.clear();priorities.clear();sequence=0;lastTarget='';}
  const entries=(files||[]).filter(file=>visible.has(String(file.id))).map((file,index)=>({file,index,id:String(file.id),stamp:reportRefreshStampV2895(file),rank:visible.get(String(file.id))}));
  for(const entry of entries){if(observed.has(entry.id)&&observed.get(entry.id)!==entry.stamp)priorities.set(entry.id,++sequence);observed.set(entry.id,entry.stamp);}
  const target=entries.find(entry=>entry.id===String(targetId)),targetKey=target?JSON.stringify([target.id,target.stamp]):'';
  if(targetKey&&targetKey!==lastTarget)priorities.set(target.id,++sequence);lastTarget=targetKey;
  const ids=new Set(entries.map(entry=>entry.id));for(const id of observed.keys())if(!ids.has(id)){observed.delete(id);priorities.delete(id);}
  const scope=JSON.stringify([context,entries.map(({id,stamp,rank})=>[id,stamp,rank]),sequence]);
  entries.sort((a,b)=>(priorities.get(b.id)||0)-(priorities.get(a.id)||0)||a.rank-b.rank||a.index-b.index);
  return {scope,files:entries.slice(0,24).map(entry=>entry.file)};
 };
}
