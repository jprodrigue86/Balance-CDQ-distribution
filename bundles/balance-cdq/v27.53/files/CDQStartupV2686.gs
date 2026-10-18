/* Expired records are rejected on every read. Global housekeeping can wait. */
function cdqStartupMaintenanceV2686(){
  verifierAcces_();
  const props=PropertiesService.getScriptProperties(),key='CDQ_SESSION_CLEANUP_V2686';
  const now=Date.now();
  if(now-Number(props.getProperty(key)||0)<60*60*1000)return {ok:true,skipped:true};
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(50))return {ok:true,skipped:true};
  try{
    if(now-Number(props.getProperty(key)||0)<60*60*1000)return {ok:true,skipped:true};
    nettoyerSessionsExpireesCDQ_();
    props.setProperty(key,String(now));
    return {ok:true};
  }finally{lock.releaseLock();}
}
