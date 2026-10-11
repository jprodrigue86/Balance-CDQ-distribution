import {createPdfWorkEngineV2729} from './pdf-work-engine-v2729.mjs';
const engine=createPdfWorkEngineV2729({worker:true,limit:80*1024*1024}),queue=[];let running=false;
async function pump(){
 if(running)return;running=true;
 try{while(queue.length){queue.sort((a,b)=>a.priority-b.priority||a.order-b.order);const job=queue.shift();
  try{postMessage({id:job.id,started:true});const result=await engine.run(job.type,job.payload);result.stats=engine.stats();postMessage({id:job.id,ok:true,result},result.bytes?[result.bytes.buffer]:[]);}
  catch(error){postMessage({id:job.id,ok:false,error:error.message||String(error)});}
 }}finally{running=false;}
}
let order=0;
self.onmessage=event=>{const job=event.data;if(!job||typeof job.id!=='string')return;if(job.type==='cancel'){const index=queue.findIndex(waiting=>waiting.id===job.id);if(index!==-1)queue.splice(index,1);return;}if(job.type==='promote'){const waiting=queue.find(item=>item.id===job.id);if(waiting&&Number.isInteger(job.priority)&&job.priority>=0&&job.priority<=3)waiting.priority=Math.min(waiting.priority,job.priority);return;}if(!['warm','open','save','inspect','list','prefill'].includes(job.type))return;queue.push({...job,priority:job.payload?.prime?3:['open','save','prefill'].includes(job.type)?0:job.type==='list'?1:2,order:order++});void pump();};
