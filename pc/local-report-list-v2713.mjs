export function installLocalReportListV2713({host=window,fromPwa,owner,allowed,confirm,remove,post,reportError}){
 const seen=new Map();
 host.addEventListener('message',e=>{
  if(!fromPwa(e)||!allowed())return;const d=e.data||{},email=owner();if(d.email!==email)return;
  if(d.type==='CDQ_LOCAL_REPORT_ERROR_V2713'){reportError(d.message);return;}
  if(d.type!=='CDQ_LOCAL_REPORT_UPDATED_V2713'||!/^[\w-]{8,100}$/.test(d.localId)||!d.clientId||!(d.blob instanceof Blob))return;
  const localId='cdq-local-'+d.localId,key=email+'|'+d.localId,old=seen.get(key);if(old&&Number(old.version)>Number(d.editVersion||0))return;
  if(d.driveId){remove(d.clientId,localId);seen.set(key,{version:Number(d.editVersion||0),driveId:d.driveId});return;}
  if(old?.driveId)return;seen.set(key,{version:Number(d.editVersion||0),driveId:''});
  confirm({id:localId,nom:String(d.name||'Rapport.pdf'),type:'PDF',_cdqLocalReportV2713:d.localId,_cdqPendingSaveV2660:String(d.uploadId||d.localId)},String(d.clientId),String(d.folderId||d.clientId));
 });
 return {open(id){if(!String(id).startsWith('cdq-local-'))return false;if(!allowed())throw Error('Accès Drive requis.');post({type:'CDQ_LOCAL_REPORT_OPEN_V2713',email:owner(),localId:String(id).slice(10)});return true;},reset(){seen.clear();}};
}
