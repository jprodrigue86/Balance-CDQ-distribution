// Equipment metadata only. No PDF bytes, report answers, network requests or timers.
const clean=v=>typeof v==='string'?v.trim().slice(0,160):'';
const usable=v=>!!v&&!/^(?:[-–—]+|n\/?a|s\/?o|aucun|true|false)$/i.test(v);
const ownerId=v=>clean(v).toLowerCase();
export function sanitizeCalibrationItems(items){
 return (Array.isArray(items)?items:[]).slice(0,20000).flatMap(i=>{
  const manufacturer=clean(i?.manufacturer),model=clean(i?.model),fileId=clean(i?.fileId);
  return usable(manufacturer)&&usable(model)&&['indicator','bench'].includes(i?.category)?[{category:i.category,manufacturer,model,fileId,source:clean(i.source),revision:clean(i.revision),saveId:clean(i.saveId)}]:[];
 });
}
export function createCalibrationDiscovery({storage,owner,changed=()=>{}}){
 let current='',items=[],persisted=true;
 const key=id=>'cdqCalibrationDetectedV2658:'+id;
 const itemKey=i=>[i.fileId,i.category,i.manufacturer.toLowerCase(),i.model.toLowerCase()].join('|');
 function sync(){const id=ownerId(owner());if(id===current)return;current=id;items=[];persisted=true;if(id)try{items=sanitizeCalibrationItems(JSON.parse(storage.getItem(key(id))||'[]'));}catch{persisted=false;}changed(items);}
 function write(next){items=next;try{storage.setItem(key(current),JSON.stringify(items));persisted=true;}catch{persisted=false;}changed(items);return {retained:true,persisted,count:items.length};}
 function retain(incoming){sync();if(!current)return {retained:false,persisted:false};const index=new Map(items.map(i=>[itemKey(i),i]));for(const i of sanitizeCalibrationItems(incoming))index.set(itemKey(i),i);return write([...index.values()]);}
 function saved(detail){sync();if(!current||ownerId(detail?.owner)!==current||!clean(detail.fileId)||!clean(detail.saveId))return {retained:false,persisted:false};
  const fileId=clean(detail.fileId),saveId=clean(detail.saveId);
  const next=sanitizeCalibrationItems(detail.items).map(i=>({...i,fileId,source:clean(detail.name),revision:clean(detail.revision)||saveId,saveId}));
  // The successful saved snapshot replaces this file's old equipment, even
  // when a technician cleared the fields. Duplicate acknowledgements are inert.
  if(items.some(i=>i.fileId===fileId&&i.saveId===saveId))return {retained:true,persisted,count:items.length};
  return write([...items.filter(i=>i.fileId!==fileId),...next]);
 }
 function confirmed(detail){sync();if(!current||!detail?.sourceId||!detail?.id||!detail?.saveId)return;
  const matches=items.filter(i=>i.fileId===String(detail.sourceId)&&i.saveId===String(detail.saveId));if(!matches.length)return;
  return write(items.map(i=>matches.includes(i)?{...i,fileId:String(detail.id),revision:clean(detail.revision)||i.revision,source:clean(detail.nom)||i.source}:i));
 }
 return {sync,retain,saved,confirmed,snapshot(){sync();return {owner:current,items:items.map(i=>({...i})),persisted};}};
}
