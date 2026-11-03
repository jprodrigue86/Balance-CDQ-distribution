// Manager-only synthetic storage and journal. No browser IndexedDB, account,
// client document, Google operation or persistent user state is touched.
export function createManagerReportFixtureV20261103({createClient,guard,options={}}){
 const rows=new Map(),drafts=new Map(),requests=new Map(),bindings=new Map(),calls=[],editors=new Map(),pending=new Set();
 let online=false,account='qa@example.invalid';
 const copy=value=>value==null?value:structuredClone(value),token=guard.recordTokenV2816;
 const storage={get:async key=>copy(rows.get(key)||null),all:async()=>[...rows.values()].map(copy),
  commit:async(record,pending,expected)=>{if(expected===undefined||token(rows.get(record.key)||null)!==token(expected))throw guard.conflictV2816();rows.set(record.key,copy(record));return copy(record);}};
 const journal={preserve:async record=>{const request=record.key+'|'+record.payload.requestId,digest=token(record.payload),key=request+'|'+digest;
   const prior=requests.get(request);drafts.set(key,copy(record));if(!prior)requests.set(request,digest);return{key,reused:!!prior&&prior!==digest};},
  mark:async()=>{},markRequest:async()=>{},claim:async()=>true,release:async()=>true,
  bindWire:async record=>{const key=record.key+'|'+record.payload.requestId,digest=token(record.payload),old=bindings.get(key);if(old&&old!==digest)return false;bindings.set(key,digest);return true;}};
 const raw=createClient({storage,journal,getAccount:()=>account,isOnline:()=>online,
  onChange:options.onChange||(()=>{}),rpc:async(a,p)=>{
   calls.push({a,p:copy(p)});let cancel;
   const stopped=new Promise(resolve=>cancel=resolve);pending.add(cancel);
   try{return await Promise.race([Promise.resolve().then(()=>options.rpc?.(a,p)),stopped]);}
   finally{pending.delete(cancel);}
  }});
 const client={...raw,lock(){raw.lock();editors.clear();for(const cancel of pending)cancel();pending.clear();},save:async(context,fields,requestId,name,prepared)=>{
  if(context.localOpeningV2816)return raw.save(context,fields,requestId,name,prepared);
  const key=account+'|'+context.reportId;
  let editor=editors.get(key);
  if(!editor){const record=await raw.get(context);editor=await raw.beginEditV2816({context:record?.context||context,fields:record?.fields,name:record?.name||name,imported:!record});editors.set(key,editor);}
  return raw.save(editor,fields,requestId,name,prepared);
 }};
 return {client,raw,storage,journal,rows,drafts,bindings,calls,online:value=>online=value,account:value=>account=value};
}
