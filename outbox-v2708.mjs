// Three independent documents, with a slot reserved for a technician's PDF.
// The first pending action of each document always precedes its later edits.
export async function drainOutboxV2708({queue,process,commit,valid,allowed=()=>true,progress=()=>{},subscribe=()=>()=>{},concurrency=3}){
 const attempted=new Set(),failed=new Set(),active=new Map(),secondary=new Set();let completed=0,changes=0,wake;
 const unsubscribe=subscribe(()=>{changes++;wake?.()});
 const target=a=>String(a.targetId||a.articleId||a.id);
 const urgent=a=>/^pdf-(?:save-v2520|import)$/.test(a.kind||'');
 const headActions=pending=>{const heads=new Map();for(const a of pending)if(!heads.has(target(a)))heads.set(target(a),a);return [...heads.values()].sort((a,b)=>Number(urgent(b))-Number(urgent(a)));};
 async function start(a){
  const key=target(a);attempted.add(a.id);if(!urgent(a))secondary.add(key);
  const work=(async()=>{
   try{await process(a);if(!valid())return;await commit(a,null);completed++;}
   catch(error){if(!valid())return;failed.add(key);await commit(a,error);}
   finally{
    active.delete(key);secondary.delete(key);
    // Repainting rows and the status pill is secondary to the durable commit.
    // A slow or rejected repaint must not delay the next saved revision.
    if(valid())try{Promise.resolve(progress({completed,active:active.size})).catch(()=>{});}catch{}
   }
  })();active.set(key,work);
 }
 try{while(valid()&&allowed()){
  const observed=changes;
  const pending=await queue();if(!valid())break;
  for(const a of headActions(pending)){
   const key=target(a);
   if(!valid()||!allowed())break;
   if(active.size>=concurrency)break;
   // PDF jobs use the reserved slot; they do not consume the secondary quota.
   if(!urgent(a)&&secondary.size>=Math.max(1,concurrency-1))continue;
   if(attempted.has(a.id)||active.has(key)||failed.has(key))continue;
   await start(a);
  }
  if(changes!==observed)continue;
  if(!active.size)break;
  const changed=new Promise(resolve=>wake=resolve);
  await Promise.race([...active.values(),changed]);wake=null;
 }
 await Promise.allSettled(active.values());
 return {completed,failed:failed.size};
 }finally{await Promise.allSettled(active.values());wake=null;unsubscribe()}
}
