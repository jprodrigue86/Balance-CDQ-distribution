// PC: no automatic OAuth popup on opening or reopening Trash.
const READ='https://www.googleapis.com/auth/drive.readonly',WRITE='https://www.googleapis.com/auth/drive';
const normalized=v=>String(v||'').trim().toLowerCase();
const validId=id=>/^[A-Za-z0-9_-]{1,200}$/.test(String(id));
export function createDriveTrashClientV2713({identity,allowed,writable=allowed,native,oauth,clientId,fetcher=fetch,host=window}={}){
 let token=null,authorizing=null,generation=0;const pending=new Map();
 const parentHost=host.parent&&host.parent.location?.origin===host.location?.origin?host.parent:host;
 const session=parentHost.cdqPcTrashSessionV2717??={owner:'',token:null};
 function stored(owner){if(session.owner!==owner){session.owner=owner;session.token=null;}return session.token;}
 function remember(owner,value){session.owner=owner;session.token=value;}
 const account=()=>normalized(identity()),guard=owner=>{if(!owner||owner!==account()||!allowed())throw Error('Le compte ou l’accès Drive a changé.');};
 function reset(){generation++;token=null;authorizing=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Le compte a changé.'));}pending.clear();}
 host.cdqNativeTrashV2713=(id,result)=>{const p=pending.get(String(id));if(!p)return;pending.delete(String(id));clearTimeout(p.timer);try{guard(p.owner);if(result?.ok!==true)throw Error(result?.message||'Drive n’a pas pu terminer la demande.');if(normalized(result.account)!==p.owner)throw Error('Le compte Google ne correspond pas au compte choisi.');p.resolve(result);}catch(e){p.reject(e);}};
 function nativeCall(action,value=''){
  const owner=account();guard(owner);
  return new Promise((resolve,reject)=>{const id='trash-'+crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(Error('Drive ne répond pas. Touchez Actualiser pour réessayer.'));},60000);pending.set(id,{owner,timer,resolve,reject});try{native().driveTrashRequest(id,owner,action,String(value));}catch(e){pending.delete(id);clearTimeout(timer);reject(e);}});
 }
 async function json(path,owner,access,init={}){
  guard(owner);const stamp=generation,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);let response;try{response=await fetcher('https://www.googleapis.com/drive/v3/'+path,{...init,headers:{'Authorization':'Bearer '+access,'Content-Type':'application/json',...init.headers},cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer);}guard(owner);if(stamp!==generation)throw Error('Le compte a changé.');
  if(!response.ok){if(response.status===401){token=null;remember(owner,null);}throw Error(response.status===401?'L’autorisation Google a expiré. Touchez Actualiser.':response.status===403?'Google ne permet pas cette action avec ce compte.':response.status===404?'Ce fichier n’est plus dans la corbeille. Actualisez la liste.':'Impossible de joindre Drive. Réessayez.');}
  const result=await response.json();guard(owner);return result;
 }
 async function access(write=false,explicit=false){
  const owner=account(),stamp=generation;guard(owner);const scope=write?WRITE:READ;
  token=token||stored(owner);
  if(token?.owner===owner&&token.expires>Date.now()&&(token.scopes.has(WRITE)||token.scopes.has(scope)))return token.value;
  if(authorizing)throw Error('Une autorisation Google est déjà en cours.');
  if(!explicit)throw Error('Votre autorisation Drive doit être renouvelée. Touchez Actualiser pour connecter ce compte.');
  const api=oauth();if(!api?.initTokenClient||!clientId())throw Error('La connexion Google se prépare. Touchez Actualiser pour réessayer.');
  authorizing=new Promise((resolve,reject)=>{
   let settled=false;const done=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value);},timer=setTimeout(()=>done(reject,Error('Autorisation Google interrompue. Touchez Actualiser.')),60000);
   try{api.initTokenClient({client_id:clientId(),scope,login_hint:owner,prompt:'',include_granted_scopes:true,error_callback:()=>done(reject,Error('Autorisation Google annulée. Touchez Actualiser pour réessayer.')),callback:async result=>{
    try{guard(owner);if(stamp!==generation)throw Error('Le compte a changé.');if(result?.error||!result?.access_token)throw Error('Google n’a pas autorisé cet accès.');const scopes=new Set(String(result.scope||'').split(/\s+/));if(!scopes.has(scope)&&!scopes.has(WRITE))throw Error('L’autorisation Drive nécessaire n’a pas été accordée.');const about=await json('about?fields=user(emailAddress)',owner,result.access_token);if(normalized(about.user?.emailAddress)!==owner)throw Error('Le compte Google ne correspond pas au compte choisi.');guard(owner);if(stamp!==generation)throw Error('Le compte a changé.');token={owner,value:result.access_token,scopes,expires:Date.now()+Math.max(0,Number(result.expires_in||0)-30)*1000};remember(owner,token);done(resolve,token.value);}catch(e){done(reject,e);}
   }}).requestAccessToken({prompt:'',login_hint:owner});}catch(e){done(reject,e);}
  });
  const job=authorizing;try{return await job;}finally{if(authorizing===job)authorizing=null;}
 }
 async function list(next=''){
  const owner=account();guard(owner);let result;
  if(typeof native()?.driveTrashRequest==='function')result=await nativeCall('list',next);
  else{const accessToken=await access();guard(owner);const query=new URLSearchParams({q:'trashed = true',spaces:'drive',corpora:'user',supportsAllDrives:'true',includeItemsFromAllDrives:'true',pageSize:'100',orderBy:'modifiedTime desc',fields:'nextPageToken,files(id,name,mimeType,modifiedTime,trashed,capabilities(canUntrash))'});if(next)query.set('pageToken',String(next));const r=await json('files?'+query,owner,accessToken);result={files:r.files,next:r.nextPageToken};}
  guard(owner);return {files:(result.files||[]).filter(f=>validId(f.id)&&f.trashed!==false).map(f=>({id:String(f.id),name:String(f.name||'Sans nom'),mimeType:String(f.mimeType||''),folder:f.folder===true||f.mimeType==='application/vnd.google-apps.folder',canRestore:f.canRestore===true||f.capabilities?.canUntrash===true})),next:String(result.next||'')};
 }
 async function restore(id){
  if(!writable())throw Error('Accès en lecture seule.');if(!validId(id))throw Error('Fichier invalide.');const owner=account();guard(owner);
  if(typeof native()?.driveTrashRequest==='function')await nativeCall('restore',id);
  else{const accessToken=await access(true,true);guard(owner);const r=await json('files/'+encodeURIComponent(id)+'?supportsAllDrives=true&fields=id,trashed',owner,accessToken,{method:'PATCH',body:JSON.stringify({trashed:false})});if(r.id!==id||r.trashed!==false)throw Error('La restauration n’a pas été confirmée.');}
  guard(owner);return {id};
 }
 return {list,restore,reset,authorize:()=>access(false,true)};
}
