// A publication lease can move while Drive verifies an unchanged list.
// Only an authoritative, non-conflicting fresh read can replace that stale proof.
export function recoverableListReadV2878(result,clientId){
 if(result?.ok!==true||result.baselineComplete!==true||String(result.clientId)!==String(clientId)||result.reconciliationRequired===true||!Array.isArray(result.items)||!Number.isSafeInteger(result.revision)||result.revision<1)return false;
 const pdf=result.pdf;if(!pdf||pdf.errorCode||!Number.isSafeInteger(pdf.revision)||pdf.revision<0||pdf.revision>result.revision)return false;
 if(pdf.status==='confirmed')return !!pdf.fileId&&!!pdf.driveRevision&&pdf.revision===result.revision;
 if(!['pending','running'].includes(pdf.status))return false;
 return pdf.revision===0||!!pdf.fileId&&!!pdf.driveRevision;
}
