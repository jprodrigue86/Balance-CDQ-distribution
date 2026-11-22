// Each account keeps two optional images on this device.
const dbName='cdq-personal-images', slots=['startup','background'];
const urls=new Map(), versions=new Map();
let connection;
function db(){
 if(!connection)connection=new Promise((resolve,reject)=>{
  const request=indexedDB.open(dbName,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('images');
  request.onsuccess=()=>{const database=request.result;database.onversionchange=()=>{database.close();connection=null;};resolve(database);};
  request.onerror=()=>{connection=null;reject(request.error);};
 });
 return connection;
}
async function record(key,change){
 const database=await db(),tx=database.transaction('images',change===undefined?'readonly':'readwrite');
 const store=tx.objectStore('images');
 const req=change===undefined?store.get(key):change===null?store.delete(key):store.put(change,key);
 return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve(req.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Stockage indisponible'));});
}
function keyFor(owner,slot){return dbName+':'+slot+':'+owner;}
function clear(slot){
 const previous=urls.get(slot);
 if(slot==='startup'){
  const el=document.querySelector('#loading .music-wall-image');
  for(const name of ['background-image','background-position','background-size'])el?.style.removeProperty(name);
 } else {
  const style=document.documentElement.style;
  for(const key of ['--cdq-personal-image','--cdq-personal-fit'])style.removeProperty(key);
 }
 if(previous){URL.revokeObjectURL(previous.url);urls.delete(slot);}
}
export async function displayImage(owner,slot){
 const key=keyFor(owner,slot),version=(versions.get(slot)||0)+1;versions.set(slot,version);
 if(urls.get(slot)?.key===key)return;
 clear(slot);
 if(!owner)return;
 try{
  if(!localStorage.getItem(key))return;
  const saved=await record(key);
  if(versions.get(slot)!==version||!(saved?.blob instanceof Blob))return;
  const url=URL.createObjectURL(saved.blob),image='url("'+url+'")',fit=saved.fit==='contain'?'contain':'cover';
  urls.set(slot,{key,url});
  if(slot==='startup'){
   const el=document.querySelector('#loading .music-wall-image');if(!el)return;
   el.style.setProperty('background-image',image,'important');el.style.setProperty('background-size',fit,'important');el.style.setProperty('background-position','center','important');
  }else{
   const style=document.documentElement.style;style.setProperty('--cdq-personal-fit',fit);
   style.setProperty('--cdq-personal-image','linear-gradient(#10131955,#10131955),'+image);
  }
 }catch{}
}
async function prepare(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choisissez une image JPEG, PNG ou WebP.');
 const bitmap=await createImageBitmap(file);
 try{
  const ratio=Math.min(1,2048/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image illisible.')),'image/webp',0.85));
 }finally{bitmap.close();}
}
function element(tag,text){
 const node=document.createElement(tag);
 if(text)node.textContent=text;
 return node;
}
function imageControl(slot,user,owner,selectBackground){
 const title=slot==='startup'?'Écran de démarrage':'Fond de l’application';
 const group=element('fieldset'),preview=element('img'),input=element('input');
 const choose=element('button','Choisir une image'),fit=element('select'),save=element('button','Appliquer');
 const reset=element('button',slot==='startup'?'Rétablir le mur de musique':'Retirer ma photo');
 const status=element('span'),actions=element('div'),fitLabel=element('label','Cadrage ');
 for(const button of [choose,save,reset])button.type='button';
 actions.className='personal-actions';preview.alt='Aperçu · '+title;preview.hidden=true;
 input.type='file';input.accept='image/jpeg,image/png,image/webp';input.hidden=true;input.setAttribute('aria-label',title);
 for(const [value,label] of [['cover','Remplir et centrer'],['contain','Image entière']])fit.add(new Option(label,value));
 fitLabel.append(fit);actions.append(save,reset);status.setAttribute('role','status');
 group.append(element('legend',title),preview,choose,input,status,fitLabel,actions);
 const key=keyFor(user,slot),current=()=>group.isConnected&&owner()===user;
 let saved=null,draft=null,busy=false,revision=0;
 function refresh(){
  const candidate=draft||saved;
  choose.disabled=busy;save.disabled=busy||!candidate||(!draft&&saved.fit===fit.value);
  reset.disabled=busy||!saved;fit.disabled=busy||!candidate;
  preview.style.objectFit=fit.value;
 }
 function show(value){
  if(!value){preview.removeAttribute('src');preview.hidden=true;return;}
  const url=URL.createObjectURL(value.blob);
  // Revoke each decoded preview, including superseded loads.
  const decoded=new Image();
  decoded.onload=()=>{if(current()&&(draft||saved)===value){preview.src=url;preview.hidden=false;preview.decode().catch(()=>{}).finally(()=>URL.revokeObjectURL(url));}else URL.revokeObjectURL(url);};
  decoded.onerror=()=>URL.revokeObjectURL(url);decoded.src=url;
 }
 choose.onclick=()=>input.click();
 input.onchange=async()=>{
  const file=input.files[0];if(!file)return;
  const token=++revision;input.value='';busy=true;refresh();
  try{const blob=await prepare(file);if(!current()||token!==revision)return;
   draft={blob,name:file.name};show(draft);status.textContent=file.name;
  }catch(error){if(current())status.textContent=error.message;}
  finally{if(current()&&token===revision){busy=false;refresh();}}
 };
 fit.onchange=refresh;
 async function commit(remove){
  if(busy||!current())return;
  const value=remove?null:{...(draft||saved),fit:fit.value};
  busy=true;refresh();
  try{
   await record(key,value);
   if(value)localStorage.setItem(key,'1');else localStorage.removeItem(key);
   if(!current())return;
   saved=value;draft=null;clear(slot);
   if(slot==='background')selectBackground(value?'personal':'current');
   else await displayImage(user,slot);
   if(!current())return;
   if(!value){fit.value='cover';show(null);}
   status.textContent=value?'Image enregistrée.':'Image retirée.';
  }catch(e){if(current())status.textContent='Enregistrement impossible. '+e.message;}
  finally{if(current()){busy=false;refresh();}}
 }
 save.onclick=()=>commit(false);reset.onclick=()=>commit(true);
 busy=true;refresh();
 record(key).then(value=>{
  if(!current())return;
  saved=value?.blob instanceof Blob?value:null;
  fit.value=saved?.fit==='contain'?'contain':'cover';show(saved);
  status.textContent=saved?(saved.name||'Image enregistrée sur cet appareil.'):'Aucune image choisie.';
 }).catch(()=>{if(current())status.textContent='Impossible de lire l’image enregistrée.';})
 .finally(()=>{if(current()){busy=false;refresh();}});
 return group;
}
export function mountImages(panel,owner,selectBackground){
 if(!panel)return;
 const user=owner(),existing=panel.querySelector('[data-personal-images]');
 if(existing&&existing.dataset.personalImages===user&&user)return;
 existing?.remove();if(!user)return;
 const section=element('section');section.dataset.personalImages=user;
 section.append(element('h3','Mes images'));
 for(const slot of slots)section.append(imageControl(slot,user,owner,selectBackground));
 panel.append(section);
}
