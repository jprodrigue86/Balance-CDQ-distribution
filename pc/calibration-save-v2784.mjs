import {sanitizeCalibrationItems} from './calibration-discovery-v2784.mjs';
// Capture BEFORE awaiting the save; retain only AFTER its successful durable
// result. A disabled/missing catalogue or full storage never changes that result.
export function captureSavedCalibration({owner,fileId,saveId,name,items,readOnly=false}){
 if(readOnly||!owner||!saveId||!Array.isArray(items))return null;
 return {owner:String(owner),fileId:String(fileId||'calibration-save:'+saveId),saveId:String(saveId),name:String(name||''),items:sanitizeCalibrationItems(items)};
}
export function retainSavedCalibration(snapshot,{currentOwner,retain,isCurrent=()=>true,result}={}){
 if(!snapshot||!isCurrent()||snapshot.owner!==String(currentOwner||''))return false;
 try{const pending=retain?.({...snapshot,fileId:String(result?.id||result?.fileId||result?.reportEngineV2754?.fileId||snapshot.fileId),revision:String(result?.revision||'')});Promise.resolve(pending).catch(()=>{});return !!retain;}catch{return false;}
}

export function calibrationSavedFileId({fileId,copy}={}){return String(copy?.driveId||copy?.filledDriveId||(copy?.id&&copy.kind!=='prepared'&&copy.kind!=='sheet'?'cdq-local-'+copy.id:fileId)||'');}
