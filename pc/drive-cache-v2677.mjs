// Authorized folder metadata; pending reads are scoped to the current account.
export function createDriveCache({owner,allowed,fetchFolder,storage=globalThis.localStorage,now=Date.now,maxEntries=96,freshMs=120000}){
 const records=new Map(),jobs=new Map(),versions=new Map();let scope='',epoch=0,queue=[],workers=0;
 const key=(mode,id)=>mode+'|'+id,clone=value=>JSON.parse(JSON.stringify(value));
 function current(){const next=allowed()?String(owner()||''):'';if(next!==scope){scope=next;epoch++;records.clear();jobs.clear();versions.clear();queue=[];if(scope)try{const saved=JSON.parse(storage?.getItem('cdqDriveMetadataV2677:'+scope)||'null');if(saved?.owner===scope)for(const [k,v]of saved.entries||[])if(now()-v.at<21600000)records.set(k,v);}catch{}}return scope;}
 function persist(){if(!scope)return;while(records.size>maxEntries)records.delete(records.keys().next().value);try{const entries=[...records];while(entries.length&&JSON.stringify(entries).length>1500000)entries.shift();storage?.setItem('cdqDriveMetadataV2677:'+scope,JSON.stringify({owner:scope,entries}));}catch{}}
 function peek(id,mode='drive'){if(!current())return null;const hit=records.get(key(mode,id));return hit?{...clone(hit.data),fresh:now()-hit.at<freshMs}:null;}
 function request(id,mode='drive',{force=false}={}){
  const account=current();if(!account)return Promise.reject(Error('Accès Drive requis.'));
  const k=key(mode,id),hit=peek(id,mode);if(hit?.fresh&&!force)return Promise.resolve(hit);if(jobs.has(k))return jobs.get(k);
  const generation=epoch,version=versions.get(k)||0;
  const job=Promise.resolve().then(()=>fetchFolder(id,mode)).then(data=>{
   if(current()!==account||epoch!==generation||version!==(versions.get(k)||0))throw Error('Le contexte du dossier a changé.');
   const value={items:clone(data.items||[]),crumbs:clone(data.crumbs||[]),nextPageToken:String(data.nextPageToken||'')};records.delete(k);records.set(k,{at:now(),data:value});persist();return clone(value);
  }).finally(()=>{if(jobs.get(k)===job)jobs.delete(k);});jobs.set(k,job);return job;
 }
 function prefetch(items){if(!current()||globalThis.document?.hidden||globalThis.navigator?.onLine===false)return;for(const item of items||[])if(item.kind==='folder'&&!peek(item.id)?.fresh&&!queue.includes(item.id)&&queue.length<24)queue.push(item.id);pump();}
 function pump(){while(workers<2&&queue.length&&current()&&!globalThis.document?.hidden&&globalThis.navigator?.onLine!==false){const id=queue.shift();workers++;request(id).catch(()=>{}).finally(()=>{workers--;pump();});}}
 function invalidate(id){if(!current())return;for(const k of [...records.keys(),...jobs.keys()])if(!id||k===key('drive',id)||k.startsWith('favorites|')){records.delete(k);jobs.delete(k);versions.set(k,(versions.get(k)||0)+1);}persist();}
 function clear(){scope='';epoch++;records.clear();jobs.clear();versions.clear();queue=[];}
 return {peek,request,prefetch,invalidate,clear,busy:()=>workers>0||jobs.size>0};
}
