// Authenticated application only; never imported by the public client page.
export async function recoverPortalArchivesV2823({rpc,clientId,valid,progress}){
 const listing=await rpc('cdqClientPortalManagementV2804','listArchives',{clientId});
 if(!valid())return null;
 if(!listing||listing.ok!==true||!Array.isArray(listing.files)||listing.files.length>1000||listing.files.some(f=>!/^[A-Za-z0-9_-]{10,200}$/.test(f.id||''))||new Set(listing.files.map(f=>f.id)).size!==listing.files.length)throw Error('Liste des archives invalide.');
 const summary={total:listing.files.length,examined:0,copied:0,reused:0,failed:0,unconfirmed:0,pendingIds:[],interrupted:false,receipts:[]};
 progress(summary);
 for(let start=0;start<listing.files.length;start++){
  if(!valid())return null;
  const ids=[listing.files[start].id];
  let response;
  try{
   response=await rpc('cdqClientPortalManagementV2804','recoverArchives',{clientId,fileIds:ids});
   if(!response||response.ok!==true||!Array.isArray(response.results)||response.results.length!==ids.length||response.results.some((r,i)=>r.id!==ids[i]||r.ok===true&&(!/^[a-f0-9]{64}$/.test(r.documentId||'')||!/^[a-f0-9]{64}$/.test(r.sha256||'')||!Number.isSafeInteger(r.size)||r.size<8)))throw Error('Reçu de copie invalide.');
  }catch(error){
   // A timeout does not cancel Apps Script. Do not send another request or assume failure.
   summary.interrupted=true;summary.unconfirmed=ids.length;summary.pendingIds=ids;
   summary.error=error?.message||'Réponse non confirmée.';
   if(valid())progress(summary);
   return summary;
  }
  if(!valid())return null;
  for(const receipt of response.results){
   summary.examined++;
   if(receipt.ok===true){
    if(!/^[a-f0-9]{64}$/.test(receipt.documentId||'')||!/^[a-f0-9]{64}$/.test(receipt.sha256||'')||!Number.isSafeInteger(receipt.size)||receipt.size<8)throw Error('Reçu de copie invalide.');
    receipt.reused===true?summary.reused++:summary.copied++;
   }else summary.failed++;
   summary.receipts.push(receipt);
  }
  progress(summary);
 }
 return summary;
}
