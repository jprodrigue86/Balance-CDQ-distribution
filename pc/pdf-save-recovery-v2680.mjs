export function isPdfRevisionConflictV2680(error){
 return /ce pdf a ete modifie depuis son ouverture/.test(String(error?.message||error||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
}
// Recovery uses the existing guarded, idempotent copy endpoint. The original
// file's revision is never replaced with a freshly fetched revision to force a write.
export function createPdfSaveRecoveryV2680({get,put,rpc,guard,owner,original,clearSource}){
 return async function process(a){
  const email=owner();if(a.owner!==email)throw Error('Le compte a changé. Rouvrez le PDF.');
  const prior=a.predecessor?await get('pdf-save-receipt',a.predecessor):null;guard(email);
  const redirected=prior?.targetId&&prior.targetId!==a.targetId;
  const record=await get('document-pdf',a.targetId);guard(email);
  const source={...a,clientId:a.clientId||record?.clientId||''};
  const work=redirected?{...source,targetId:prior.targetId,expectedRevision:prior.revision,predecessor:'',fileName:prior.fileName||a.fileName,autoReportName:false}:source;
  let result,plan=await get('pdf-save-recovery-v2680',a.id);guard(email);
  async function recover(){
   if(!plan){
    const context=await rpc('obtenirContexteCopieCDQV2522',[work.targetId]);guard(email);
    if(context.id!==work.targetId||!context.parentId||!context.clientId)throw Error('Le dossier client de la sauvegarde doit être confirmé.');
    if(work.clientId&&work.clientId!==context.clientId)throw Error('Le PDF a changé de compagnie. Les réponses restent conservées sur cet appareil.');
    plan={sourceId:work.targetId,folderId:context.parentId,folderName:context.parentName||'',clientId:context.clientId,requestId:'copy-'+crypto.randomUUID(),owner:email};
    await put('pdf-save-recovery-v2680',a.id,plan);guard(email);
   }
   if(plan.owner!==email||plan.sourceId!==work.targetId)throw Error('La destination de récupération a changé.');
   if(!plan.targetId){
    const copied=await rpc('copierElementCDQV2522',[plan.sourceId,plan.folderId,plan.requestId]);guard(email);
    if(!copied?.ok||!copied.id||copied.id===plan.sourceId||copied.destinationId!==plan.folderId||copied.clientId!==plan.clientId)throw Error('La copie de récupération n’a pas été confirmée.');
    plan={...plan,targetId:copied.id,fileName:copied.nom};await put('pdf-save-recovery-v2680',a.id,plan);guard(email);
   }
   if(!plan.revision){
    const meta=await rpc('obtenirMetaDocumentPdfCDQ',[plan.targetId]);guard(email);
    if(meta.id!==plan.targetId||meta.clientId!==plan.clientId||!meta.revision)throw Error('La révision de la copie n’a pas été confirmée.');
    plan={...plan,revision:meta.revision,fileName:meta.nom||plan.fileName};await put('pdf-save-recovery-v2680',a.id,plan);guard(email);
   }
   return original({...work,targetId:plan.targetId,folderId:plan.folderId,expectedRevision:plan.revision,predecessor:'',fileName:plan.fileName,autoReportName:false});
  }
  if(plan)result=await recover();
  else try{result=await original(work);}catch(error){
   guard(email);if(!a.recoverConflictV2680||!isPdfRevisionConflictV2680(error))throw error;
   result=await recover();
  }
  guard(email);
  if(!result?.ok||!result.id||!result.revision)throw Error('La sauvegarde n’a pas été confirmée. Les réponses restent sur cet appareil.');
  await put('pdf-save-receipt',a.id,{revision:result.revision,targetId:result.id,fileName:result.nom,clientId:result.clientId});guard(email);
  if(result.id!==a.targetId)await clearSource(a.targetId,a.id);guard(email);
  return {...result,recovered:result.id!==a.targetId};
 };
}
