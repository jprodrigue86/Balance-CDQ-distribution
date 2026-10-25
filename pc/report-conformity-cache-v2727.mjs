import {pdfReportConformitySnapshotV2727,reportConformityFieldsV2770} from './report-conformity-v2727.mjs';
import {sheetReportConformityV2727} from './sheet-report-conformity-v2727.mjs';

const statuses=new Set(['nonconforming','conforming','unknown']);
// An unknown summary is not proof that the embedded PDF/Sheet was inspected.
// Keep valid conformity results, but recheck unknown outcomes after a bounded
// interval instead of permanently suppressing red badges.
const UNKNOWN_RECHECK_MS_V2774=15*60*1000;
const text=value=>String(value??'').trim();
const email=value=>text(typeof value==='object'?value?.email:value).toLowerCase();
const clone=value=>value?JSON.parse(JSON.stringify(value)):null;
export const reportConformityStampV2727=file=>JSON.stringify([
 text(file?.modifiedTime||file?.dateModification||file?.revision),
 text(file?.version),text(file?.md5Checksum||file?.sha256Checksum)
]);
const metadata=file=>Object.fromEntries(['modifiedTime','dateModification','revision','version','md5Checksum','sha256Checksum'].filter(name=>text(file?.[name])).map(name=>[name,text(file[name])]));
const key=(clientId,fileId)=>JSON.stringify([text(clientId),text(fileId)]);
const kind=file=>['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(file?.mimeType||file?.type)?'sheet':['PDF','application/pdf'].includes(file?.mimeType||file?.type)?'pdf':'';

// A folder revision describes the bytes to inspect, not merely the moment of
// inspection. Never promote an older shared download to that newer revision.
export function validateReportReadV2729(record,file,{owner='',clientId='',sheet=false}={}){
 if(!record||typeof record!=='object')throw Error('Rapport absent.');
 const expected=text(file?.modifiedTime||file?.dateModification||file?.revision),actual=text(record.revision||record.modifiedTime||record.dateModification);
 if(expected&&actual!==expected)throw Error('La révision du rapport a changé.');
 const id=text(file?.id);if(sheet&&!text(record.id||record.fileId)||['id','fileId'].some(name=>text(record[name])&&text(record[name])!==id))throw Error('Le rapport ne correspond pas au fichier demandé.');
 if(owner&&record.owner&&email(record.owner)!==email(owner)||clientId&&text(record.clientId)&&text(record.clientId)!==text(clientId))throw Error('Le compte ou le client du rapport a changé.');
 if(text(file?.version)&&text(record.version)&&text(file.version)!==text(record.version))throw Error('La version du rapport a changé.');
 for(const name of ['md5Checksum','sha256Checksum'])if(text(file?.[name])&&text(record[name])&&text(file[name])!==text(record[name]))throw Error('Le contenu du rapport a changé.');
 if(sheet&&record.kind==='cdq-conformity-summary-v2775'){
  // Already verified above: exact file ID, Drive revision, account and client.
  // A partial result must NEVER become a red or green indicator.
  if(record.complete!==true||!statuses.has(record.conformity)||text(record.onglets))throw Error('Résumé de conformité incomplet.');
  return record;
 }
 if(sheet){
  const partial=value=>value?.charge===false||value?.complete===false||value?.tronque===true||value?.truncated===true||value?.incomplete===true||value?.partial===true||!!text(value?.nextPageToken);
  if(partial(record)||!Array.isArray(record.onglets)||!record.onglets.length)throw Error('Snapshot de feuille incomplet.');
  // The legacy endpoint silently stops after twenty tabs. At that boundary,
  // only an explicit matching total proves that no later conclusion is missing.
  const total=record.totalOnglets;
  if(Object.prototype.hasOwnProperty.call(record,'totalOnglets')?!Number.isSafeInteger(total)||total<0||total!==record.onglets.length:record.onglets.length>=20)throw Error('Nombre d’onglets de la feuille non confirmé.');
  for(const tab of record.onglets){const rows=tab?.valeurs;if(partial(tab)||!Array.isArray(rows)||rows.some(row=>!Array.isArray(row)))throw Error('Snapshot de feuille incomplet.');const columns=rows.reduce((max,row)=>Math.max(max,row.length),0),expectedColumns=Math.max(Number(tab.colonnesOriginales)||0,Number(tab.colonnes)||0);if(Number(tab.lignesOriginales)>rows.length||Number(tab.colonnesOriginales)>columns||Number(tab.lignes)>rows.length||Number(tab.colonnes)>columns||rows.some(row=>row.length<expectedColumns))throw Error('Snapshot de feuille tronqué.');}
 }
 return record;
}

// Only visit folder contents already supplied by the authorised Drive listing.
export function reportConformitySourcesV2727(tree){
 const files=new Map(),seen=new Set();
 function visit(node){if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);for(const file of node.fichiers||[])if(text(file?.id)&&kind(file))files.set(text(file.id),file);for(const child of node.dossiers||[])visit(child);}
 visit(tree);return [...files.values()];
}

export function createReportConformityTrackerV2727({identity,library,loadPdf,loadSheet,storage=globalThis.localStorage,now=Date.now,onChange=()=>{},snapshotPdf=pdfReportConformitySnapshotV2727,snapshotSheet=sheetReportConformityV2727,maxReports=2000,retryMs=30000,cachedState=()=>null,concurrency=2}){
 let owner='',epoch=0,data={reports:{},saves:{},sequence:0},scan=null;
 const analyses=new Map(),failures=new Map(),diagnostics=[];
 const diagnostic=(kind,state,error='')=>{diagnostics.push({at:now(),kind,state,error:/revision|révision/i.test(error)?'revision':/session|accès|compte|permission/i.test(error)?'access':/expir|délai|ne répond pas|timeout/i.test(error)?'timeout':/tronqu|incomplet/i.test(error)?'incomplete':error?'read-failed':''});if(diagnostics.length>32)diagnostics.shift();};
 const storageKey=()=> 'cdqReportConformityV2727:'+owner;
 function sync(){const next=email(identity());if(next===owner)return owner;owner=next;epoch++;failures.clear();try{const saved=owner?JSON.parse(storage?.getItem(storageKey())||'null'):null;data=saved?.owner===owner&&saved.version===1&&saved.reports&&saved.saves?saved:{reports:{},saves:{},sequence:0};}catch{data={reports:{},saves:{},sequence:0};}if(!Number.isSafeInteger(data.sequence))data.sequence=0;return owner;}
 function persist(){if(!owner||owner!==email(identity()))return;const reports=Object.entries(data.reports).sort(([,a],[,b])=>(b.at||0)-(a.at||0));data.reports=Object.fromEntries(reports.slice(0,maxReports));data.saves=Object.fromEntries(Object.entries(data.saves).sort(([,a],[,b])=>(b.sequence||0)-(a.sequence||0)).slice(0,1000));try{storage?.setItem(storageKey(),JSON.stringify({...data,owner,version:1}));}catch{}}
 function changed(){persist();onChange();}
 function valid(account,generation){return sync()===account&&epoch===generation&&!!account;}
 function latest(save){return data.reports[key(save.clientId,save.sourceId)]?.saveId===save.saveId;}
 function currentRecord(record,file){
  if(!record)return false;
  if(record.local)return !data.saves[record.saveId]?.retired;
  if(!record.verifiedReadV2729)return false;
  const version=reportConformityStampV2727(file);if(record.stamp===version||record.metadata&&reportConformityStampV2727(record.metadata)===version||record.confirmed&&(record.sourceStamp===version||Array.isArray(record.sourceStamps)&&record.sourceStamps.includes(version)))return true;
  const listed=Date.parse(file?.modifiedTime||file?.dateModification||''),confirmed=Date.parse(record.metadata?.modifiedTime||record.metadata?.dateModification||'');
  return !!record.confirmed&&Number.isFinite(listed)&&Number.isFinite(confirmed)&&listed<confirmed;
 }
 function sharedState(file,clientId){try{const result=cachedState(file,clientId);return result==='nonconforming'||result==='conforming'?result:null;}catch{return null;}}
 function state(file,clientId){sync();if(!owner||!text(clientId)||!text(file?.id))return 'unknown';const record=data.reports[key(clientId,file.id)];
  if(currentRecord(record,file)){
   // Never override an unsaved local edit with an older server/list indicator.
   if(record.local)return statuses.has(record.state)?record.state:'unknown';
   if(record.state==='nonconforming'||record.state==='conforming')return record.state;
  }
  // An old verified 'unknown' may represent a timed-out legacy scan, not
  // proof of conformity; an exact-revision equipment signature is stronger.
  return sharedState(file,clientId)||'unknown';
 }
 function failedState(file,clientId){
  sync();if(!owner||!text(clientId)||!text(file?.id))return '';
  const f=failures.get(key(clientId,file.id));return f?.stamp===reportConformityStampV2727(file)?f.retryAt?'retry':'manual':'';
 }
 function retryFailed(files,clientId){
  sync();if(!owner||!text(clientId))return;
  for(const file of files||[]){const k=key(clientId,file?.id),f=failures.get(k);
   if(f?.stamp===reportConformityStampV2727(file)&&!f.retryAt)failures.delete(k);
  }
 }
 function nextRetryDelay(files,clientId){
  sync();if(!owner||!text(clientId))return null;let delay=null;
  for(const file of files||[]){const f=failures.get(key(clientId,file?.id));
   if(f?.stamp!==reportConformityStampV2727(file)||!f.retryAt)continue;
   const due=Math.max(0,f.retryAt-now());delay=delay===null?due:Math.min(delay,due);
  }
  return delay;
 }
 function engineLocal(detail){
  sync();const d=detail||{},clientId=text(d.clientId),fileId=text(d.sourceId),saveId=text(d.saveId);
  if(!owner||email(d.owner)!==owner||!clientId||!fileId||!saveId||d.localDurable!==true||d.pending!==true||!Number.isFinite(d.savedAt)||!d.fields)return false;
  const k=key(clientId,fileId),old=data.reports[k];if(old?.engineLocalAt>d.savedAt||old?.engineReportId&&old.engineReportId!==d.reportId&&old.local)return false;
  data.reports[k]={...old,state:reportConformityFieldsV2770(d.fields),local:true,saveId,engineReportId:d.reportId,engineLocalAt:d.savedAt,at:now()};changed();return true;
 }
 function engineConfirmed(detail){
  sync();const d=detail||{},pdf=d.pdf,clientId=text(d.clientId),fileId=text(pdf?.fileId);
  if(!owner||email(d.owner)!==owner||!clientId||!fileId||pdf?.status!=='confirmed'||!text(pdf.driveRevision)||!Number.isSafeInteger(pdf.revision)||pdf.revision!==d.revision||!d.fields)return false;
  const k=key(clientId,fileId),old=data.reports[k],driveRevision=text(pdf.driveRevision);
  if(old?.local&&!(old.engineReportId===d.reportId&&old.saveId===text(d.saveId))||old?.engineReportId===d.reportId&&Number.isSafeInteger(old.engineRevision)&&old.engineRevision>pdf.revision)return false;
  const before=Date.parse(old?.metadata?.modifiedTime||old?.metadata?.dateModification||old?.metadata?.revision||''),after=Date.parse(driveRevision);
  if(Number.isFinite(before)&&Number.isFinite(after)&&before>after)return false;
  const meta={modifiedTime:driveRevision},state=reportConformityFieldsV2770(d.fields),stamp=reportConformityStampV2727(meta);
  if(old?.stamp===stamp&&old.state===state&&old.engineRevision===pdf.revision)return true;
  data.reports[k]={state,stamp,metadata:meta,confirmed:true,verifiedReadV2729:true,engineReportId:d.reportId,engineRevision:pdf.revision,at:now()};failures.delete(k);changed();return true;
 }
 function previousRecord(save){let previous=save.previous,depth=0;while(previous?.local&&data.saves[previous.saveId]?.retired&&depth++<1000)previous=data.saves[previous.saveId].previous;return clone(previous);}
 function restore(save){const k=key(save.clientId,save.sourceId),previous=previousRecord(save);if(previous)data.reports[k]=previous;else delete data.reports[k];}
 function applyAcknowledgement(save){
  if(!save.acknowledged||save.retired||!latest(save)||!save.ready)return;
  const sourceKey=key(save.clientId,save.sourceId),source=data.reports[sourceKey],targetId=text(save.ack.id||save.ack.fileId||save.sourceId),targetKey=key(save.clientId,targetId);
  const newer=data.reports[targetKey];if(targetId!==save.sourceId&&newer?.sequence>save.sequence)return;
  const meta={...source.metadata,...metadata(save.ack)};
  const record={...source,metadata:meta,stamp:reportConformityStampV2727(meta),sourceStamp:targetId===save.sourceId?source.sourceStamp:'',sourceStamps:targetId===save.sourceId?source.sourceStamps||[]:[],confirmed:true,local:false,verifiedReadV2729:true,at:now()};
  if(targetId!==save.sourceId)restore(save);
  data.reports[targetKey]=record;save.targetId=targetId;
 }
 function noteSave(rec,blob,saveId){
  sync();const account=owner,generation=epoch,clientId=text(rec?.clientId),sourceId=text(rec?.id||rec?.fileId),token=text(saveId);
  if(!account||!clientId||!sourceId||!token||rec?.owner&&email(rec.owner)!==account)return Promise.resolve('unknown');
  const k=key(clientId,sourceId),old=data.reports[k],sequence=++data.sequence;
  const save={saveId:token,clientId,sourceId,sequence,previous:clone(old),at:now(),ready:false,acknowledged:false,retired:false};data.saves[token]=save;
  const sourceStamps=[...new Set([...(Array.isArray(old?.sourceStamps)?old.sourceStamps:[]),old?.sourceStamp,old?.stamp,reportConformityStampV2727(rec)].filter(Boolean))].slice(-8);
  data.reports[k]={...old,state:old?.state||'unknown',local:true,saveId:token,sequence,metadata:{...old?.metadata,...metadata(rec)},sourceStamp:old?.stamp||old?.sourceStamp||reportConformityStampV2727(rec),sourceStamps,at:now()};changed();
  const job=(async()=>{try{const result=await snapshotPdf(blob,await library());if(!valid(account,generation)||data.saves[token]!==save||save.retired)return 'unknown';save.ready=true;save.state=statuses.has(result)?result:'unknown';if(latest(save)){data.reports[k]={...data.reports[k],state:save.state,at:now()};applyAcknowledgement(save);changed();}return save.state;}catch{if(valid(account,generation)&&data.saves[token]===save){save.ready=true;save.state='unknown';if(latest(save)){data.reports[k]={...data.reports[k],state:'unknown',at:now()};applyAcknowledgement(save);changed();}}return 'unknown';}})();
  analyses.set(token,{owner:account,job});job.finally(()=>{if(analyses.get(token)?.job===job)analyses.delete(token);}).catch(()=>{});return job;
 }
 function acknowledge(saveId,detail={}){
  sync();const token=text(saveId),save=data.saves[token];if(!owner||detail.owner&&email(detail.owner)!==owner||!save||save.retired||text(detail.clientId)!==save.clientId)return false;
  if(detail.sourceId&&text(detail.sourceId)!==save.sourceId)return false;
  save.acknowledged=true;save.ack={...detail};if(latest(save)){applyAcknowledgement(save);changed();}else persist();return true;
 }
 function localSaved(saveId,detail={}){sync();const save=data.saves[text(saveId)];if(!owner||detail.owner&&email(detail.owner)!==owner||!save||text(detail.clientId)!==save.clientId)return false;if(detail.pending===false)return acknowledge(saveId,detail);return !save.retired;}
 function retire(saveId,detail={}){sync();const save=data.saves[text(saveId)];if(!owner||detail.owner&&email(detail.owner)!==owner||!save||detail.clientId&&text(detail.clientId)!==save.clientId)return false;if(save.acknowledged)return false;save.retired=true;if(latest(save))restore(save);changed();return true;}
 async function awaitSave(saveId){sync();const analysis=analyses.get(text(saveId));if(analysis?.owner===owner)await analysis.job;}
 async function inspect(files,stillCurrent=()=>true,clientId){
  sync();if(scan)return scan;const account=owner,generation=epoch,client=text(clientId);if(!account||!client)return 0;
  const list=[...new Map((files||[]).filter(f=>text(f?.id)&&kind(f)).map(f=>[text(f.id),f])).values()];let cursor=0,count=0;
  const current=()=>valid(account,generation)&&stillCurrent();
  const worker=async()=>{while(cursor<list.length&&current()){
   const file=list[cursor++],k=key(client,file.id),old=data.reports[k],version=reportConformityStampV2727(file),failed=failures.get(k);
   const verifiedKnown=currentRecord(old,file)&&old?.state!=='unknown';
    const localUnconfirmed=old?.local&&currentRecord(old,file);
    const knownFromList=sharedState(file,client);
    // Legacy 27.70-27.74 unknown entries have no compact-reader marker.
    // Re-inspect each once after upgrading instead of silencing its red dot
    // for another 15 minutes. Keep the bounded interval after this version.
    const recentUnknown=currentRecord(old,file)&&old?.state==='unknown'&&old.checkedByCompactV2775===true&&knownFromList===null&&now()-Number(old.at||0)<UNKNOWN_RECHECK_MS_V2774;
    if(file._cdqPendingSaveV2660||verifiedKnown||localUnconfirmed||recentUnknown||failed?.stamp===version&&(!failed.retryAt||now()<failed.retryAt))continue;
   diagnostic(kind(file),'start');try{let result=knownFromList;const expected=text(file.modifiedTime||file.dateModification||file.revision);if(result!==null){/* exact-version summary already verified by the list tracker */}else if(kind(file)==='sheet'){const sheet=await loadSheet(file.id,client,expected);if(!current())break;validateReportReadV2729(sheet,file,{owner:account,clientId:client,sheet:true});result=sheet.kind==='cdq-conformity-summary-v2775'?sheet.conformity:await snapshotSheet(sheet);}else{const rec=await loadPdf(file.id,client,expected);if(!current())break;validateReportReadV2729(rec,file,{owner:account,clientId:client});result=await snapshotPdf(rec?.blob||rec,await library());}
    if(!current())break;if(version!==reportConformityStampV2727(file)||data.reports[k]!==old)continue;
    diagnostic(kind(file),result);failures.delete(k);data.reports[k]={state:statuses.has(result)?result:'unknown',stamp:version,metadata:metadata(file),verifiedReadV2729:true,checkedByCompactV2775:true,at:now()};count++;changed();
   }catch(error){diagnostic(kind(file),'failed',String(error?.message||''));if(current()&&version===reportConformityStampV2727(file)&&data.reports[k]===old){
     const previous=failures.get(k),attempts=previous?.stamp===version?previous.attempts+1:1;
     failures.set(k,{stamp:version,at:now(),attempts,retryAt:attempts<3?now()+Math.min(60000,retryMs*(attempts===1?1:4)):0});
    }}
  }};
  const task=Promise.all(Array.from({length:Math.max(1,Math.min(2,Math.floor(concurrency)||1))},()=>worker())).then(()=>count);scan=task;try{return await task;}finally{if(scan===task)scan=null;}
 }
 return {diagnostics:()=>diagnostics.slice(),engineLocal,engineConfirmed,noteSave,acknowledge,localSaved,retire,awaitSave,inspect,state,failedState,retryFailed,nextRetryDelay,owner:()=>sync(),busy:()=>!!scan};
}
