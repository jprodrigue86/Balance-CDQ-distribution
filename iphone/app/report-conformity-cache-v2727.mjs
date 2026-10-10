import {pdfReportConformitySnapshotV2727} from './report-conformity-v2727.mjs';
import {sheetReportConformityV2727} from './sheet-report-conformity-v2727.mjs';

const statuses=new Set(['nonconforming','conforming','unknown']);
const text=value=>String(value??'').trim();
const email=value=>text(typeof value==='object'?value?.email:value).toLowerCase();
const clone=value=>value?JSON.parse(JSON.stringify(value)):null;
export const reportConformityStampV2727=file=>JSON.stringify([
 text(file?.modifiedTime),text(file?.dateModification),text(file?.revision),
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

export function createReportConformityTrackerV2727({identity,library,loadPdf,loadSheet,storage=globalThis.localStorage,now=Date.now,onChange=()=>{},snapshotPdf=pdfReportConformitySnapshotV2727,snapshotSheet=sheetReportConformityV2727,maxReports=2000,retryMs=30000}){
 let owner='',epoch=0,data={reports:{},saves:{},sequence:0},scan=null;
 const analyses=new Map(),failures=new Map();
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
  const version=reportConformityStampV2727(file);if(record.stamp===version||record.confirmed&&(record.sourceStamp===version||Array.isArray(record.sourceStamps)&&record.sourceStamps.includes(version)))return true;
  const listed=Date.parse(file?.modifiedTime||file?.dateModification||''),confirmed=Date.parse(record.metadata?.modifiedTime||record.metadata?.dateModification||'');
  return !!record.confirmed&&Number.isFinite(listed)&&Number.isFinite(confirmed)&&listed<confirmed;
 }
 function state(file,clientId){sync();if(!owner||!text(clientId)||!text(file?.id))return 'unknown';const record=data.reports[key(clientId,file.id)];return currentRecord(record,file)&&statuses.has(record.state)?record.state:'unknown';}
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
   if(file._cdqPendingSaveV2660||currentRecord(old,file)||failed?.stamp===version&&now()-failed.at<retryMs)continue;
   try{let result;const expected=text(file.modifiedTime||file.dateModification||file.revision);if(kind(file)==='sheet'){const sheet=await loadSheet(file.id,client,expected);if(!current())break;validateReportReadV2729(sheet,file,{owner:account,clientId:client,sheet:true});result=await snapshotSheet(sheet);}else{const rec=await loadPdf(file.id,client,expected);if(!current())break;validateReportReadV2729(rec,file,{owner:account,clientId:client});result=await snapshotPdf(rec?.blob||rec,await library());}
    if(!current())break;if(version!==reportConformityStampV2727(file)||data.reports[k]!==old)continue;
    failures.delete(k);data.reports[k]={state:statuses.has(result)?result:'unknown',stamp:version,metadata:metadata(file),verifiedReadV2729:true,at:now()};count++;changed();
   }catch{if(current()&&version===reportConformityStampV2727(file)&&data.reports[k]===old)failures.set(k,{stamp:version,at:now()});}
  }};
  const task=Promise.all([worker(),worker()]).then(()=>count);scan=task;try{return await task;}finally{if(scan===task)scan=null;}
 }
 return {noteSave,acknowledge,localSaved,retire,awaitSave,inspect,state,owner:()=>sync(),busy:()=>!!scan};
}
