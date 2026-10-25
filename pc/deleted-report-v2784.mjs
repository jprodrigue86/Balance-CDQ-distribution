// Only an authenticated scoped server code is deletion proof. A missing Drive
// file, network error or matching filename alone must never retire local work.
export const DELETED_REPORT_MESSAGE_V2784='Rapport supprimé côté serveur. Copie locale conservée. Récupérez-la dans un nouveau rapport.';
export const isDeletedReportV2784=error=>String(error?.code||'').toUpperCase()==='REPORT_DELETED';
export function recoveryContextV2784(context,reportId){
 if(!context?.reportId||reportId===context.reportId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId||''))throw Error('Identité de récupération invalide.');
 const {restoredFolderId,...source}=context;
 return {...source,reportId,fileId:'',baseRevision:0,expectedDriveRevision:''};
}
export const recoveryNameV2784=name=>String(name||'Rapport').replace(/\.pdf$/i,'').slice(0,190)+' — copie récupérée.pdf';
