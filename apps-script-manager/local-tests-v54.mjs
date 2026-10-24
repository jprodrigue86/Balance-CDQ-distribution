// CDQ Manager V54 — non-destructive browser/Node checks against real shared modules.
// Synthetic fixtures only. No Google account, client document or deployment is modified.
// This is NOT a substitute for Android native signing or an authenticated Drive E2E test.
'use strict';

const equal=(actual,expected)=>{
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw Error('Attendu '+JSON.stringify(expected)+'; obtenu '+JSON.stringify(actual));
  }
};
const ensure=(ok,message='Condition non respectée')=>{if(!ok)throw Error(message);};
const rejects=async action=>{
  let rejected=false;
  try{await action();}catch(_){rejected=true;}
  ensure(rejected,'Un cas invalide a été accepté');
};
const snap=rows=>({onglets:[{valeurs:rows}]});

export async function runCDQLocalTestsV54({onProgress=()=>{}}={}){
  const started=Date.now();
  // Import source modules used by the published app, not copied test implementations.
  const [dec,precision,local,session,transfer,list,sheet,outbox,metadata]=await Promise.all([
    import('../reader-decimals-v2695.mjs'),
    import('../reader-precision-excentricity-v2726.mjs'),
    import('../local-report-hygiene-v2714.mjs'),
    import('../pdf-session-storage-v2664.mjs'),
    import('../drive-transfer-v2751.mjs'),
    import('../list-consultation-v2755.mjs'),
    import('../sheet-report-conformity-v2727.mjs'),
    import('../outbox-v2708.mjs'),
    import('../pdf-metadata-v2724.mjs')
  ]);
  const tests=[];
  const add=(group,name,fn)=>tests.push({group,name,fn});

  for(const [reading,step] of [
    ['20.0000','0.0001'],['20,0000','0,0001'],['-4.5','0.1'],
    ['0','1'],['','0.001'],['1000.000','0.001']
  ])add('Décimales','Valeur valide '+JSON.stringify([reading,step]),()=>{
    equal(dec.decimalPrecisionErrorV2695(reading,step),'');
  });
  for(const [reading,step] of [
    ['20.000','0.0001'],['20.05','0.001'],['20.0001','0.001'],
    ['20,1.2','0.1'],['20.00','-1'],['bonjour','0.01']
  ])add('Décimales','Rejet '+JSON.stringify([reading,step]),()=>{
    ensure(!!dec.decimalPrecisionErrorV2695(reading,step));
  });
  for(const [field,expected] of [
    ['charge_point_1_avant_correction',true],
    ['charge_point_9_apres_correction_2',true],
    ['excentricite_avant_avant_gauche',true],
    ['B4_Charge_AvantCorrection',true],
    ['capacite_maximale',false],
    ['charge_point_1_charge_utilisee',false]
  ])add('Décimales','Champ de mesure '+field,()=>{
    equal(dec.isCorrectionReadingV2695(field),expected);
  });

  for(const [label,name,state,active,expected] of [
    ['Format 3e','tolerance_excentricite',{value:'3',formattedValue:''},true,'±3e'],
    ['Arrondi 2,8e','tolerance_excentricite',{value:'2,8',formattedValue:''},true,'±3e'],
    ['État vide','tolerance_excentricite',{value:'',formattedValue:'±2e'},true,''],
    ['Autre famille','tolerance_excentricite',{value:'3',formattedValue:''},false,''],
    ['Autre champ','charge_point_1_tolerance',{value:'3',formattedValue:''},true,''],
    ['Valeur négative','tolerance_excentricite',{value:'-1',formattedValue:''},true,''],
    ['Texte invalide','tolerance_excentricite',{value:'abc',formattedValue:''},true,''],
    ['Valeur déjà formatée','tolerance_excentricite',{value:'3',formattedValue:'±3e'},true,'±3e']
  ])add('Tolérances',label,()=>{
    const out=precision.precisionToleranceDisplayV2726(name,state,active);
    equal(out.formattedValue,expected);
  });

  const localSample={readerRequestId:'req',kind:'report',removed:false};
  for(const [label,value,expected] of [
    ['Archive disponible',localSample,true],
    ['En attente sans requête',{kind:'report'},false],
    ['Modèle préparé',{...localSample,kind:'prepared'},false],
    ['Feuille',{...localSample,kind:'sheet'},false],
    ['Supprimé',{...localSample,removed:true},false],
    ['Déjà sur Drive',{...localSample,driveId:'pdf1'},false]
  ])add('Copies locales',label,()=>equal(local.localReportVisibleV2714(value),expected));
  for(const [message,expected] of [
    ['PDF introuvable ou invalide.',true],
    ['Error: PDF introuvable ou invalide.',true],
    ['Permission refusée',false],
    ['Réseau interrompu',false]
  ])add('Copies locales','Erreur distante '+message,()=>{
    equal(local.invalidRemotePdfV2714(message),expected);
  });
  add('Copies locales','Retrait sans perte de champs',()=>{
    const r=local.retiredLocalReportV2714({id:'x',commentaire:'important'},'user',10);
    equal([r.id,r.commentaire,r.removed,r.status,r.retiredAt],['x','important',true,'retired',10]);
  });
  add('Copies locales','Nettoyage limité aux identifiants inactifs',()=>{
    const tree={fichiers:[{id:'cdq-local-a'},{id:'normal'}],dossiers:[{fichiers:[{id:'cdq-local-b'}],dossiers:[]}]};
    equal(local.pruneLocalReportRowsV2714(tree,new Set(['b'])),['cdq-local-a']);
    equal(tree.fichiers.map(x=>x.id),['normal']);
    equal(tree.dossiers[0].fichiers.map(x=>x.id),['cdq-local-b']);
  });

  const saved={driveId:'pdf1',status:'synced',uploadId:'save2',syncedUploadId:'save2'};
  const engine={...saved,reportEngineV2754:true,
    enginePdfV2754:{status:'confirmed',fileId:'pdf1',revision:2},reportRevisionV2754:2};
  for(const [label,record,expected] of [
    ['Copie ordinaire confirmée',saved,true],
    ['Copie moteur confirmée',engine,true],
    ['Révision moteur divergente',{...engine,reportRevisionV2754:1},false],
    ['PDF moteur encore en attente',{...engine,enginePdfV2754:{status:'pending',fileId:'pdf1',revision:2}},false],
    ['Autre fichier confirmé',{...engine,enginePdfV2754:{status:'confirmed',fileId:'autre',revision:2}},false],
    ['Sauvegarde non synchronisée',{...saved,status:'pending'},false],
    ['Identifiant chargement différent',{...saved,syncedUploadId:'save1'},false],
    ['Pas de fichier Drive',{...saved,driveId:''},false],
    ['Copie retirée',{...saved,removed:true},false],
    ['Erreur sauvegarde',{...saved,error:'réseau'},false],
    ['Révision non entière',{...engine,reportRevisionV2754:'0'},false]
  ])add('Sauvegarde et intégrité',label,()=>{
    equal(session.confirmedLocalCopyV2755(record),expected);
  });
  for(const [label,record,expected] of [
    ['Copie terminée',saved,true],
    ['Copie préparée',{...saved,kind:'prepared'},false],
    ['Feuille de calcul',{...saved,kind:'sheet'},false],
    ['Mode hors ligne sélectionné',{...saved,offlineSelected:true},false],
    ['Mode hors ligne préparé',{...saved,offlinePrepared:true},false]
  ])add('Sauvegarde et intégrité',label,()=>{
    equal(session.completedWorkCopyV2664(record),expected);
  });
  add('Sauvegarde et intégrité','Encodage/décodage PDF en mémoire',async()=>{
    const src=new Blob(['%PDF-1.7\nfixture'],{type:'application/pdf'});
    const coded=await session.encodePdfRecordV2664({id:'test',blob:src,templateBlob:src});
    ensure(coded.pdfBytesV2664 instanceof ArrayBuffer);
    equal(coded.templateSameV2664,true);
    const restored=session.decodePdfRecordV2664(coded);
    equal(await restored.blob.text(),await src.text());
    ensure(restored.templateBlob===restored.blob);
  });

  const action={id:'save2',targetId:'pdf1'};
  const receipt={ok:true,id:'pdf1',owner:'tech@example.test',revision:'r3',byteSha256:'abcdef',
    sha256Encoding:'hex-bytes-v1',uploadId:'save2'};
  for(const [label,change,expected] of [
    ['Accusé exact',{},true],['Autre utilisateur',{owner:'autre@example.test'},false],
    ['Autre PDF',{id:'pdf2'},false],['Autre empreinte',{byteSha256:'000'},false],
    ['Autre format empreinte',{sha256Encoding:'legacy'},false],
    ['Ancienne opération',{uploadId:'save1'},false],['Sans révision',{revision:''},false],
    ['Erreur serveur',{ok:false},false]
  ])add('Drive — confirmations','Accusé '+label,()=>{
    equal(transfer.confirmedBinaryPdfSaveV2751({...receipt,...change},action,'tech@example.test','abcdef'),expected);
  });
  add('Drive — confirmations','Blob binaire intact',async()=>{
    const blob=new Blob(['%PDF-1.7\nfixture'],{type:'application/pdf'});
    ensure(await transfer.pdfActionBlobV2751({blob})===blob);
  });
  add('Drive — confirmations','Octets récupérés depuis ArrayBuffer',async()=>{
    const bytes=new TextEncoder().encode('%PDF-1.7');
    const blob=await transfer.pdfActionBlobV2751({pdfBytesV2664:bytes.buffer});
    equal(await blob.text(),'%PDF-1.7');
  });
  add('Drive — confirmations','Base64 historique décodé sans conversion distante',async()=>{
    const b64=btoa('%PDF-1.7');
    const blob=await transfer.pdfActionBlobV2751({data:b64});
    equal(await blob.text(),'%PDF-1.7');
    equal(await transfer.pdfActionBase64V2751({blob}),b64);
  });
  add('Drive — confirmations','Sans octets : échec explicite',async()=>{
    await rejects(()=>transfer.pdfActionBlobV2751({}));
  });
  add('Drive — confirmations','SHA-256 calculé sur les vrais octets',async()=>{
    const hash=await transfer.pdfByteSha256V2751(new Blob(['abc']));
    equal(hash,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  const conflicted={kind:'list',readOnly:true,reconciliationRequired:true,ok:true,found:true,
    engine:2754,clientId:'clientA',destinationId:'folderA',reportId:'listA',
    observedPdf:{fileId:'list.pdf',driveRevision:'r2'},
    pdf:{fileId:'list.pdf',status:'conflict',errorCode:'CONFLICT_EXTERNAL_DRIVE'}};
  add('Liste de balances','Aucune consultation en dehors du mode conflit',()=>{
    equal(list.listConsultationDescriptorV2755({kind:'report'},'list.pdf','clientA'),null);
  });
  add('Liste de balances','Conflit rendu en lecture seule',()=>{
    const desc=list.listConsultationDescriptorV2755(conflicted,'list.pdf','clientA');
    ensure(Object.isFrozen(desc));
    equal([desc.readOnlyListV2755,desc.destinationId,desc.revision],[true,'folderA','r2']);
  });
  add('Liste de balances','Autre client refusé',async()=>{
    await rejects(()=>list.listConsultationDescriptorV2755(conflicted,'list.pdf','clientB'));
  });
  add('Liste de balances','Autre document refusé',async()=>{
    await rejects(()=>list.listConsultationDescriptorV2755(conflicted,'autre.pdf','clientA'));
  });
  add('Liste de balances','Révision absente refusée',async()=>{
    await rejects(()=>list.listConsultationDescriptorV2755({...conflicted,observedPdf:{fileId:'list.pdf'}},'list.pdf','clientA'));
  });
  add('Liste de balances','Lecture de liste vérifie la révision avant/après',async()=>{
    const descriptor=list.listConsultationDescriptorV2755(conflicted,'list.pdf','clientA');
    const text='%PDF-1.7';
    const calls=[];
    const rpc=async(name)=>{calls.push(name);
      if(name==='obtenirPdfLecteurCDQV2520')return {id:'list.pdf',clientId:'clientA',revision:'r2',taille:8,base64:btoa(text)};
      return {id:'list.pdf',clientId:'clientA',revision:'r2',taille:8};
    };
    const result=await list.loadListConsultationV2755(descriptor,{
      rpc,valid:()=>{},decode:b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0))
    });
    equal([result.readOnlyListV2755,result.blob.size,calls.length],[true,8,2]);
  });
  add('Liste de balances','Révision qui change : lecture refusée',async()=>{
    const descriptor=list.listConsultationDescriptorV2755(conflicted,'list.pdf','clientA');
    await rejects(()=>list.loadListConsultationV2755(descriptor,{
      rpc:async()=>({id:'list.pdf',clientId:'clientA',revision:'ancienne'}),
      valid:()=>{},decode:()=>new Uint8Array()
    }));
  });

  for(const [label,rows,expected] of [
    ['Final conforme',[['Conclusion','Conforme',true,'Non conforme',false]],'conforming'],
    ['Final non conforme',[['Conclusion','Conforme',false,'Non conforme',true]],'nonconforming'],
    ['Aucune case cochée',[['Conclusion','Conforme',false,'Non conforme',false]],'unknown'],
    ['Deux cases cochées',[['Conclusion','Conforme',true,'Non conforme',true]],'nonconforming'],
    ['Aucune conclusion',[['Conforme',true,'Non conforme',false]],'unknown'],
    ['Feuille vide',[],'unknown']
  ])add('Conformité des feuilles',label,()=>{
    equal(sheet.sheetReportConformityV2727(snap(rows)),expected);
  });

  add('File d’envoi','PDF prioritaire sur tâche secondaire',async()=>{
    let pending=[{id:'meta',targetId:'b',kind:'metadata'},{id:'pdf',targetId:'a',kind:'pdf-save-v2520'}],order=[];
    const result=await outbox.drainOutboxV2708({
      queue:async()=>pending,process:async a=>{order.push(a.id);},
      commit:async a=>{pending=pending.filter(x=>x.id!==a.id);},
      valid:()=>true,concurrency:1
    });
    equal([order[0],result.completed,result.failed],['pdf',2,0]);
  });
  add('File d’envoi','Deux modifications du même PDF sont ordonnées',async()=>{
    let pending=[{id:'save1',targetId:'same',kind:'pdf-save-v2520'},
      {id:'save2',targetId:'same',kind:'pdf-save-v2520'}],order=[];
    const result=await outbox.drainOutboxV2708({
      queue:async()=>pending,process:async a=>{order.push(a.id);},
      commit:async a=>{pending=pending.filter(x=>x.id!==a.id);},
      valid:()=>true,concurrency:2
    });
    equal([order,result.completed],[['save1','save2'],2]);
  });
  add('File d’envoi','Erreur sur un document sans perte du reste',async()=>{
    let pending=[{id:'bad',targetId:'x',kind:'pdf-save-v2520'},
      {id:'ok',targetId:'y',kind:'pdf-save-v2520'}];
    const result=await outbox.drainOutboxV2708({
      queue:async()=>pending,process:async a=>{if(a.id==='bad')throw Error('Réponse rejetée');},
      commit:async a=>{pending=pending.filter(x=>x.id!==a.id);},
      valid:()=>true,concurrency:2
    });
    equal([result.completed,result.failed],[1,1]);
  });
  add('Lecture PDF','Annotations ordonnées malgré exécution concurrente',async()=>{
    const doc={numPages:2,getFieldObjects:async()=>({}),getJSActions:async()=>({}),
      getPage:async page=>({getAnnotations:async()=>[
        {fieldName:'x',fieldType:'Tx',defaultAppearanceData:{fontSize:page*10}}
      ]})};
    const result=await metadata.readReaderMetadataV2724(doc);
    equal([result.typography.get('x'),result.firstPageHasAnnotations],[20,true]);
  });
  add('Lecture PDF','Document sans annotation indiqué explicitement',async()=>{
    const doc={numPages:1,getFieldObjects:async()=>({}),getJSActions:async()=>({}),
      getPage:async()=>({getAnnotations:async()=>[]})};
    const result=await metadata.readReaderMetadataV2724(doc);
    equal([result.typography.size,result.firstPageHasAnnotations],[0,false]);
  });

  const results=[];
  for(const item of tests){
    const begin=Date.now();
    try{
      await item.fn();
      results.push({group:item.group,name:item.name,status:'passed',ms:Date.now()-begin});
    }catch(error){
      results.push({group:item.group,name:item.name,status:'failed',
        ms:Date.now()-begin,error:String(error?.message||error).slice(0,300)});
    }
    onProgress({completed:results.length,total:tests.length,failed:results.filter(r=>r.status==='failed').length});
  }
  return {schema:'cdq-manager-local-tests-v1',managerVersion:'V54',
    scope:'published-shared-js-modules',privacy:'synthetic-fixtures-only',driveE2E:false,
    nativeAndroid:false,startedAt:new Date(started).toISOString(),
    completedAt:new Date().toISOString(),elapsedMs:Date.now()-started,
    total:results.length,passed:results.filter(r=>r.status==='passed').length,
    failed:results.filter(r=>r.status==='failed').length,results};
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const button=document.getElementById('cdqLocalChecksRunV54');
  const status=document.getElementById('cdqLocalChecksStatusV54');
  const progress=document.getElementById('cdqLocalChecksProgressV54');
  const details=document.getElementById('cdqLocalChecksDetailsV54');
  const copy=document.getElementById('cdqLocalChecksCopyV54');
  let pending=null,last=null;
  async function run({force=false}={}){
    if(pending)return pending;
    if(last&&!force)return last;
    if(button)button.disabled=true;
    if(status)status.textContent='Contrôles locaux en cours — aucun rapport client modifié.';
    if(progress)progress.textContent='Chargement des modules CDQ…';
    pending=(async()=>{
      try{
        const report=await runCDQLocalTestsV54({
          onProgress:p=>{if(progress)progress.textContent=p.completed+'/'+p.total+' contrôles effectués';}
        });
        last=report;
        if(status)status.textContent=report.failed?
          report.failed+' anomalie(s) sur '+report.total+' contrôles locaux — vérification requise.':
          report.passed+'/'+report.total+' contrôles locaux réussis en '+report.elapsedMs+' ms.';
        if(details)details.textContent=report.results.map(r=>
          (r.status==='passed'?'✓ ':'✕ ')+r.group+' — '+r.name+
          (r.error?' : '+r.error:'')).join('\n');
        if(copy)copy.disabled=false;
        return report;
      }catch(error){
        if(status)status.textContent='Contrôles incomplets : '+String(error?.message||error).slice(0,240);
        if(details)details.textContent='Les tests ne sont pas validés. Vérifier la disponibilité des modules.';
        throw error;
      }finally{pending=null;if(button)button.disabled=false;}
    })();
    return pending;
  }
  window.CDQLocalChecksV54={run,last:()=>last};
  if(button)button.addEventListener('click',()=>{void run({force:true}).catch(()=>{});});
  if(copy)copy.addEventListener('click',()=>{
    if(last&&navigator.clipboard?.writeText)void navigator.clipboard.writeText(JSON.stringify(last,null,2));
  });
}
