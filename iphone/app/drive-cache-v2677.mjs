// Authorized folder metadata; pending reads are scoped to the current account.
export function createDriveCache({owner,allowed,fetchFolder,storage=globalThis.localStorage,now=Date.now,maxEntries=96,freshMs=120000,scheduleIdle=callback=>globalThis.requestIdleCallback?globalThis.requestIdleCallback(callback,{timeout:1500}):setTimeout(callback,50),cancelIdle=handle=>globalThis.cancelIdleCallback?globalThis.cancelIdleCallback(handle):clearTimeout(handle),lifecycle=globalThis,document=globalThis.document,navigator=globalThis.navigator}){
 const records=new Map(),jobs=new Map(),versions=new Map(),foreground=new Set(),background=new Set();let scope='',epoch=0,queue=[],dirty=false,persistTask=null,prefetchTask=null;
 const key=(mode,id)=>mode+'|'+id,clone=value=>JSON.parse(JSON.stringify(value));
 function cancel(task){if(task)try{cancelIdle(task.handle);}catch{}}
 function reset(){cancel(persistTask);cancel(prefetchTask);persistTask=prefetchTask=null;dirty=false;records.clear();jobs.clear();versions.clear();foreground.clear();background.clear();queue=[];}
 function current(){const next=allowed()?String(owner()||''):'';if(next!==scope){scope=next;epoch++;reset();if(scope)try{const saved=JSON.parse(storage?.getItem('cdqDriveMetadataV2677:'+scope)||'null');if(saved?.owner===scope)for(const [k,v]of saved.entries||[])if(now()-v.at<21600000)records.set(k,v);}catch{}}return scope;}
 function trim(){while(records.size>maxEntries)records.delete(records.keys().next().value);}
 function flush(){const account=current();if(!account||!dirty)return false;cancel(persistTask);persistTask=null;trim();try{const parts=[];let length=2;for(const entry of [...records].reverse()){const part=JSON.stringify(entry),next=length+part.length+(parts.length?1:0);if(next>1500000)break;parts.push(part);length=next;}storage?.setItem('cdqDriveMetadataV2677:'+account,'{"owner":'+JSON.stringify(account)+',"entries":['+parts.reverse().join(',')+']}');dirty=false;return true;}catch{return false;}}
 function persistLater(){dirty=true;if(persistTask)return;const task={account:scope,generation:epoch,handle:null};persistTask=task;task.handle=scheduleIdle(()=>{if(persistTask!==task)return;persistTask=null;if(current()===task.account&&epoch===task.generation)flush();});}
 function fresh(k){const hit=records.get(k);return !!hit&&now()-hit.at<freshMs;}
 function peek(id,mode='drive'){if(!current())return null;const hit=records.get(key(mode,id));return hit?{...clone(hit.data),fresh:now()-hit.at<freshMs}:null;}
 function canPrefetch(){return !!scope&&!foreground.size&&!document?.hidden&&navigator?.onLine!==false;}
 function deferPrefetch(){if(prefetchTask||background.size||!queue.length||!current()||!canPrefetch())return;const task={account:scope,generation:epoch,handle:null};prefetchTask=task;task.handle=scheduleIdle(()=>{if(prefetchTask!==task)return;prefetchTask=null;if(current()===task.account&&epoch===task.generation&&canPrefetch())pump();});}
 function read(id,mode='drive',{force=false}={},anticipating=false){
  const account=current();if(!account)return Promise.reject(Error('Accès Drive requis.'));
  const k=key(mode,id),hit=records.get(k);if(hit&&fresh(k)&&!force)return Promise.resolve({...clone(hit.data),fresh:true});if(jobs.has(k)){const job=jobs.get(k);if(!anticipating){foreground.add(job);cancel(prefetchTask);prefetchTask=null;}return job;}
  const generation=epoch,version=versions.get(k)||0;
  const valid=()=>current()===account&&epoch===generation&&version===(versions.get(k)||0);
  const job=Promise.resolve().then(()=>{if(!valid())throw Error('Le contexte du dossier a changé.');if(anticipating&&!foreground.has(job)&&!canPrefetch()){if(!queue.includes(id)&&queue.length<24)queue.unshift(id);throw Error('Lecture anticipée suspendue.');}return fetchFolder(id,mode);}).then(data=>{
   if(!valid())throw Error('Le contexte du dossier a changé.');
   const value={items:clone(data.items||[]),crumbs:clone(data.crumbs||[]),nextPageToken:String(data.nextPageToken||'')};records.delete(k);records.set(k,{at:now(),data:value});trim();persistLater();return clone(value);
  }).finally(()=>{if(jobs.get(k)===job)jobs.delete(k);foreground.delete(job);background.delete(job);deferPrefetch();});jobs.set(k,job);if(anticipating)background.add(job);else{foreground.add(job);cancel(prefetchTask);prefetchTask=null;}return job;
 }
 function request(id,mode='drive',options={}){return read(id,mode,options);}
 function prefetch(items){if(!current()||document?.hidden||navigator?.onLine===false)return;for(const item of items||[])if(item.kind==='folder'&&!fresh(key('drive',item.id))&&!queue.includes(item.id)&&!jobs.has(key('drive',item.id))&&queue.length<24)queue.push(item.id);deferPrefetch();}
 function pump(){if(background.size||!queue.length||!current()||!canPrefetch())return;const id=queue.shift();read(id,'drive',{},true).catch(()=>{});}
 function invalidate(id){if(!current())return;for(const k of new Set([...records.keys(),...jobs.keys()]))if(!id||k===key('drive',id)||k.startsWith('favorites|')){records.delete(k);jobs.delete(k);versions.set(k,(versions.get(k)||0)+1);}queue=id?queue.filter(value=>value!==id):[];dirty=true;flush();}
 function clear(){scope='';epoch++;reset();}
 document?.addEventListener?.('visibilitychange',()=>{if(document.hidden){flush();cancel(prefetchTask);prefetchTask=null;}else{current();if(dirty)persistLater();deferPrefetch();}});
 lifecycle?.addEventListener?.('pagehide',flush);
 lifecycle?.addEventListener?.('online',()=>{current();deferPrefetch();});
 lifecycle?.addEventListener?.('offline',()=>{cancel(prefetchTask);prefetchTask=null;});
 return {peek,request,prefetch,invalidate,clear,flush,busy:()=>background.size>0||jobs.size>0};
}
