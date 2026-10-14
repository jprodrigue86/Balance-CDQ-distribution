export const CLIENT_CACHE_TTL_V2746=12*60*60*1000;

export function protectedClientCacheRecordV2746(record){
  return !!(record?.offlineSelected||record?.pendingSaveId||record?.pendingCreateId||record?.pendingDeleteId||record?.unsavedChanges||record?.driveUploadErrorV2740||record?.status==='pending'||record?.status==='syncing'||record?.status==='local');
}

export function expiredClientCacheRecordV2746(record,now=Date.now()){
  return !!record?.cacheExpiresAtV2746&&!protectedClientCacheRecordV2746(record)&&Number(record.cacheExpiresAtV2746)<=now;
}

// One fixed window per account/client. Hits never postpone its expiration.
// This store contains temporary cache policy only, never the synchronization outbox.
export function createClientDayCacheV2746({owner,allowed,read,write,now=Date.now,onExpire=()=>{}}){
  const windows=new Map(),jobs=new Map();let scope='',epoch=0;
  function current(){const next=allowed()?String(owner()||'').trim().toLowerCase():'';if(scope!==next){scope=next;epoch++;windows.clear();jobs.clear();}return scope;}
  function valid(account,generation){if(current()!==account||epoch!==generation)throw Error('Le compte ou l’accès a changé.');}
  function isWindow(record,account,client){return record?.owner===account&&record?.clientId===client&&Number.isFinite(record.openedAt)&&record.openedAt<=now()&&record.expiresAt===record.openedAt+CLIENT_CACHE_TTL_V2746;}
  async function load(client,{open=false}={}){
    client=String(client||'');const account=current(),generation=epoch;if(!account||!client)return null;
    const key=account+'|'+client;
    if(jobs.has(key)){const pending=await jobs.get(key);valid(account,generation);if(pending||!open)return pending;return load(client,{open:true});}
    const job=(async()=>{
      let record=windows.get(key)||await read(client);valid(account,generation);
      if(!isWindow(record,account,client)||record.expiresAt<=now()){
        windows.delete(key);
        if(record){await onExpire(client,account);valid(account,generation);}
        if(!open)return null;
        record={owner:account,clientId:client,openedAt:now(),expiresAt:now()+CLIENT_CACHE_TTL_V2746};
        record.expiresAt=record.openedAt+CLIENT_CACHE_TTL_V2746;
        await write(client,record);valid(account,generation);
      }
      windows.set(key,record);return {...record};
    })();jobs.set(key,job);
    try{return await job;}finally{if(jobs.get(key)===job)jobs.delete(key);}
  }
  function peek(client){const account=current(),record=windows.get(account+'|'+String(client));return isWindow(record,account,String(client))&&record.expiresAt>now()?{...record}:null;}
  async function stamp(record,prior){
    if(!record)return record;
    const client=String(record.clientId||prior?.clientId||'');
    if(!client||protectedClientCacheRecordV2746(record))return {...record,cacheExpiresAtV2746:prior?.cacheExpiresAtV2746||record.cacheExpiresAtV2746};
    const account=current(),generation=epoch;let window;
    try{window=await load(client,{open:true});}catch(error){valid(account,generation);return {...record,cacheExpiresAtV2746:undefined};}
    valid(account,generation);
    return window?{...record,cacheOwnerV2746:account,cacheClientIdV2746:client,cacheOpenedAtV2746:window.openedAt,cacheExpiresAtV2746:window.expiresAt}:record;
  }
  function reset(){scope='';epoch++;windows.clear();jobs.clear();}
  return {load,open:client=>load(client,{open:true}),peek,stamp,reset,ttl:CLIENT_CACHE_TTL_V2746};
}
