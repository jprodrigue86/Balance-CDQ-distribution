// At most two independent documents; revisions of one document stay ordered.
export async function drainOutboxV2708({queue,process,commit,valid,allowed=()=>true,progress=()=>{},subscribe=()=>()=>{},concurrency=2}){
 const attempted=new Set(),failed=new Set(),active=new Map();let completed=0,changes=0,wake;
 const unsubscribe=subscribe(()=>{changes++;wake?.()});
 const target=a=>String(a.targetId||a.articleId||a.id);
 async function start(a){
  const key=target(a);attempted.add(a.id);
  const work=(async()=>{
   try{await process(a);if(!valid())return;await commit(a,null);completed++;}
   catch(error){if(!valid())return;failed.add(key);await commit(a,error);}
   finally{active.delete(key);if(valid())await progress({completed,active:active.size});}
  })();active.set(key,work);
 }
 try{while(valid()&&allowed()){
  const observed=changes;
  const pending=await queue();if(!valid())break;
  for(const a of pending){
   const key=target(a);
   if(!valid()||!allowed())break;
   if(active.size>=concurrency)break;
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
