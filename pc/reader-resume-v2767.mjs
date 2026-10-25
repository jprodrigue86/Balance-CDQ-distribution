// A navigation checkpoint is not a save receipt. Never enqueue or publish it.
export function createReaderResumeV2767({storage=globalThis.localStorage,now=Date.now}={}){
 const prefix='cdq-reader-draft-v2767:';
 const identity=context=>context?.owner&&context?.sessionId&&context?.fileId?JSON.stringify([context.owner.toLowerCase(),context.sessionId,context.fileId]):'';
 const pointer=context=>'cdq-reader-pointer-v2767:'+JSON.stringify([context.owner.toLowerCase(),context.sessionId]);
 function read(context){try{const key=identity(context),v=key&&JSON.parse(storage.getItem(prefix+key)||'null');return v?.identity===key?v:null;}catch{return null;}}
 return {
  read,
  write(context,{fields=null,dirty=false,viewport=null}={}){
   const key=identity(context);if(!key)return false;
   const value={identity:key,context:{...context},fields:dirty?fields:null,dirty:!!dirty,viewport,at:now()};
   const bytes=JSON.stringify(value);if(bytes.length>1024*1024)throw Error('Le brouillon dépasse la taille locale autorisée. Enregistrez le rapport.');
   storage.setItem(prefix+key,bytes);storage.setItem(pointer(context),JSON.stringify({...context,at:value.at}));return true;
  },
  restore(context){const saved=read(context);if(!saved)return null;
   if(saved.context.revision!==context.revision)return {...saved,conflict:true,fields:null};
   return saved;
  },
  close(context){const key=identity(context);if(!key)return;storage.removeItem(prefix+key);
   try{const p=JSON.parse(storage.getItem(pointer(context))||'null');if(p?.fileId===context.fileId)storage.removeItem(pointer(context));}catch{}
  },
  pointer(context){try{const p=JSON.parse(storage.getItem(pointer(context))||'null');return p?.owner===context.owner&&p.sessionId===context.sessionId?p:null;}catch{return null;}}
 };
}
