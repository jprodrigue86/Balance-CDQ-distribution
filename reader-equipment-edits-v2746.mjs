// The reader supplies field values only. Owner, client and source identity are
// attached by the trusted opener after validating its current frame/session.
export const READER_EQUIPMENT_FIELDS_V2746=Object.freeze([
 'base_balance_fabricant','base_balance_modele','base_balance_numero_serie',
 'indicateur_fabricant','indicateur_modele','indicateur_numero_serie',
 'capacite_maximale','echelon','unite_mesure','identification_balance',
 'Statut_conformite','Bouton_Conforme','Bouton_NonConforme'
]);
export function validateReaderEquipmentValuesV2746(values){
 const names=READER_EQUIPMENT_FIELDS_V2746;
 if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length!==names.length||Object.keys(values).some(name=>!names.includes(name)))return null;
 const result={};
 for(const name of names){const value=values[name];if(typeof value!=='string'||value.length>1000)return null;result[name]=value;}
 return result;
}
export function createReaderEquipmentEmitterV2746({surface,getValue,canEmit,send,schedule=callback=>setTimeout(callback,16),cancel=clearTimeout}){
 let readerSession='',sequence=0,last='',timer=null;
 function reset(){if(timer!==null)cancel(timer);timer=null;readerSession='';sequence=0;last='';}
 function flush(){
  timer=null;if(!readerSession||!canEmit())return false;
  const values={};for(const name of READER_EQUIPMENT_FIELDS_V2746){const value=getValue(name);values[name]=String(Array.isArray(value)?value.join(', '):value??'').slice(0,1000);}
  const signature=JSON.stringify(values);if(signature===last)return false;
  last=signature;send({type:'CDQ_READER_EQUIPMENT_EDIT_V2746',readerSession,sequence:++sequence,values});return true;
 }
 function changed(){if(readerSession&&canEmit()&&timer===null)timer=schedule(flush);}
 function input(event){if(READER_EQUIPMENT_FIELDS_V2746.includes(event.target?.name)&&surface.contains(event.target))changed();}
 surface.addEventListener('input',input);surface.addEventListener('change',input);
 return {configure(session){reset();if(typeof session==='string'&&session.length>=8&&session.length<=160)readerSession=session;},changed,flush,reset,dispose(){reset();surface.removeEventListener('input',input);surface.removeEventListener('change',input);}};
}
export function createReaderEquipmentGateV2746({readerSession,sourceId,canReceive,onEdit=()=>{},onEnd=()=>{}}){
 let sequence=0,ended=false;
 function accept(message){
  if(ended||!canReceive()||message?.type!=='CDQ_READER_EQUIPMENT_EDIT_V2746'||message.readerSession!==readerSession||!sourceId||!Number.isSafeInteger(message.sequence)||message.sequence<=sequence)return false;
  const values=validateReaderEquipmentValuesV2746(message.values);if(!values)return false;
  sequence=message.sequence;onEdit({sourceId,readerSession,sequence,values});return true;
 }
 function end(reason='close'){if(ended)return false;ended=true;onEnd({sourceId,readerSession,sequence,reason});return true;}
 return {accept,end};
}
export function createLocalReaderEquipmentRelayV2746({isTrusted,owner,validateOwner,canEdit,publish}){
 const sessions=new Map(),saved=new Map();let account='';
 return event=>{
  if(!isTrusted(event))return false;
  const d=event.data||{},edited=d.type==='CDQ_LOCAL_REPORT_EQUIPMENT_EDIT_V2746',ended=d.type==='CDQ_LOCAL_REPORT_EQUIPMENT_EDIT_ENDED_V2746',durable=d.type==='CDQ_LOCAL_REPORT_UPDATED_V2713'&&!d.driveId;if(!edited&&!ended&&!durable)return false;
  let email;try{email=owner();validateOwner(email);}catch{return false;}
  if(account!==email){sessions.clear();saved.clear();account=email;}
  if(durable){
   if(!canEdit()||d.email!==email||typeof d.clientId!=='string'||!d.clientId||typeof d.localId!=='string'||!d.localId||typeof d.uploadId!=='string'||!d.uploadId||typeof d.equipmentSignature!=='string')return false;
   let values;try{values=JSON.parse(d.equipmentSignature);}catch{return false;}
   if(!Array.isArray(values)||values.length!==6||!values.slice(0,5).every(value=>typeof value==='string'&&value.length<=320)||!['conforming','nonconforming','unknown'].includes(values[5]))return false;
   const key=JSON.stringify([email,d.localId,d.uploadId]);if(saved.has(key))return false;saved.set(key,true);if(saved.size>500)saved.delete(saved.keys().next().value);
   const sourceId='cdq-local-'+d.localId;
   publish('cdq:pdf-local-saved',{owner:email,clientId:d.clientId,localId:d.localId,id:sourceId,sourceId,saveId:d.uploadId,name:String(d.name||''),pending:true,equipmentSignature:d.equipmentSignature});return true;
  }
  if(d.email!==email||typeof d.clientId!=='string'||!d.clientId||typeof d.localId!=='string'||!d.localId||typeof d.sourceId!=='string'||!d.sourceId||typeof d.readerSession!=='string'||d.readerSession.length<8||d.readerSession.length>160||!Number.isSafeInteger(d.sequence)||d.sequence<0)return false;
  const key=JSON.stringify([email,d.localId,d.readerSession]),prior=sessions.get(key);
  if(ended){
   if(!prior||prior.ended||d.sequence<prior.sequence)return false;
   sessions.set(key,{...prior,ended:true});publish('cdq:report-equipment-edit-ended-v2746',{owner:email,clientId:d.clientId,localId:d.localId,sourceId:prior.sourceId,readerSession:d.readerSession,reason:['saved','discard','close'].includes(d.reason)?d.reason:'close'});return true;
  }
  if(!canEdit()||prior?.ended||prior&&d.sequence<=prior.sequence)return false;
  const values=validateReaderEquipmentValuesV2746(d.values);if(!values)return false;
  if(prior&&prior.sourceId!==d.sourceId)publish('cdq:report-equipment-edit-ended-v2746',{owner:email,clientId:d.clientId,localId:d.localId,sourceId:prior.sourceId,readerSession:d.readerSession,reason:'identity-confirmed'});
  sessions.set(key,{sequence:d.sequence,sourceId:d.sourceId,ended:false});if(sessions.size>500)sessions.delete(sessions.keys().next().value);
  publish('cdq:report-equipment-edited-v2746',{owner:email,clientId:d.clientId,localId:d.localId,sourceId:d.sourceId,readerSession:d.readerSession,sequence:d.sequence,values});return true;
 };
}
