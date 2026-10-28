// CDQ Manager V59 — non-destructive browser/Node checks against real shared modules.
// Synthetic fixtures only. No Google account, client document or deployment is modified.
// This is NOT a substitute for Android native signing or an authenticated Drive E2E test.
'use strict';
import {MANAGER_CASES_V59,runManagerRegressionV59} from './regressions-v59.mjs';

const equal=(actual,expected)=>{
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw Error('Attendu '+JSON.stringify(expected)+'; obtenu '+JSON.stringify(actual));
  }
};
const ensure=(ok,message='Condition non respectée')=>{if(!ok)throw Error(message);};
// Important: an unrelated ReferenceError/timeout must NEVER count as a passing negative test.
export const expectRejectedV59=async(action,expected)=>{
  let captured=null;
  try{await action();}catch(error){captured=error;}
  ensure(captured,'Un cas invalide a été accepté');
  ensure(typeof expected==='function'&&expected(captured),'Rejet inattendu : '+String(captured?.message||captured));
};
const snap=rows=>({onglets:[{valeurs:rows}]});

export const CDQ_V59_GROUP_COUNTS=Object.freeze({
  'Décimales':18,'Tolérances':8,'Copies locales':12,'Sauvegarde et intégrité':17,
  'Drive — confirmations':13,'Liste de balances':7,
  'Conformité des feuilles':6,'Lecture PDF':2,'État des fichiers':10,'Moteur de rapports':10,'Avis de la liste':2,'Interface PC/mobile et factures':9,'Correctifs 27.84':MANAGER_CASES_V59.length
});
export const CDQ_V59_EXPECTED_TOTAL=Object.values(CDQ_V59_GROUP_COUNTS).reduce((sum,n)=>sum+n,0);

export const CDQ_V59_MODULES=Object.freeze([
  'reader-decimals-v2695.mjs','reader-precision-excentricity-v2726.mjs',
  'local-report-hygiene-v2714.mjs','pdf-session-storage-v2664.mjs',
  'drive-transfer-v2751.mjs','list-consultation-v2755.mjs',
  'sheet-report-conformity-v2727.mjs','pdf-metadata-v2724.mjs','file-operation-state-v2782.mjs','report-engine-client-v2754.mjs','balance-list-renderer-v2728.mjs','ui-regressions-v2783.mjs'
]);
export async function runCDQLocalTestsV59({onProgress=()=>{},moduleToken='',sources,document=globalThis.document,makeFixture,loadModule=file=>import('../pc/'+file)}={}){
  const started=Date.now();
  // Token comes from independently hashed LIVE module bytes, never from the DOM.
  if(moduleToken&&!/^[a-f0-9]{64}$/.test(moduleToken))throw Error('INVALID_SOURCE_FINGERPRINT');
  const suffix=moduleToken?'?cdq_qa='+moduleToken.slice(0,16):'';
  const [dec,precision,local,session,transfer,list,sheet,metadata,state,reportEngine,renderer,ui]=await Promise.all(
    CDQ_V59_MODULES.map(loadModule)
  );
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
    await expectRejectedV59(()=>transfer.pdfActionBlobV2751({}),e=>/réponses locales/.test(String(e?.message||'')));
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
    await expectRejectedV59(()=>list.listConsultationDescriptorV2755(conflicted,'list.pdf','clientB'),e=>e?.code==='INVALID_LIST_RESPONSE');
  });
  add('Liste de balances','Autre document refusé',async()=>{
    await expectRejectedV59(()=>list.listConsultationDescriptorV2755(conflicted,'autre.pdf','clientA'),e=>e?.code==='INVALID_LIST_RESPONSE');
  });
  add('Liste de balances','Révision absente refusée',async()=>{
    await expectRejectedV59(()=>list.listConsultationDescriptorV2755({...conflicted,observedPdf:{fileId:'list.pdf'}},'list.pdf','clientA'),e=>e?.code==='INVALID_LIST_RESPONSE');
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
    await expectRejectedV59(()=>list.loadListConsultationV2755(descriptor,{
      rpc:async()=>({id:'list.pdf',clientId:'clientA',revision:'ancienne'}),
      valid:()=>{},decode:()=>new Uint8Array()
    }),e=>e?.code==='LIST_CHANGED_DURING_READ');
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

  const stamp=Date.parse('2026-10-24T10:00:00Z'),f={dateModification:'2026-10-24T10:00:00Z',type:'PDF'};
  add('État des fichiers','Consulter ne reclasse pas le PDF',()=>equal(state.fileSortTimeV2782({...f,_cdqConfirmedAt2530:Date.now()}),stamp));
  add('État des fichiers','Modification locale réellement en attente',()=>equal(state.fileSortTimeV2782({...f,_cdqPendingSaveV2660:'save',_cdqLocalSavedAtV2772:stamp+1}),stamp+1));
  add('État des fichiers','Feuille Google : date réelle',()=>equal(state.fileSortTimeV2782({...f,mimeType:'application/vnd.google-apps.spreadsheet',_cdqPendingSaveV2660:'save',_cdqLocalSavedAtV2772:stamp+1}),stamp));
  const sig=state.reportValueSignatureV2782;
  add('État des fichiers','Format seul sans nouvelle sauvegarde',()=>equal(sig({x:{value:'2',formattedValue:'2 kg'}}),sig({x:{value:'2',formattedValue:'2.0 kg'}})));
  add('État des fichiers','Valeur modifiée détectée',()=>ensure(sig({x:{value:'2'}})!==sig({x:{value:'3'}})));
  add('État des fichiers','Case cochée détectée',()=>ensure(sig({x:{value:'Yes',widgets:[{id:'x',value:false}]}})!==sig({x:{value:'Yes',widgets:[{id:'x',value:true}]}})));
  add('État des fichiers','Ordre des champs sans faux changement',()=>equal(sig({a:{value:1},b:{value:2}}),sig({b:{value:2},a:{value:1}})));
  add('État des fichiers','Synchronisation distincte des erreurs',()=>{const m=state.balanceListMessagesV2782({localPending:true});equal(m.warnings.length,0);equal(m.notes.length,1);});
  add('État des fichiers','Nom et cause de la lecture impossible',()=>equal(state.balanceListMessagesV2782({warnings:[{name:'Cuve.pdf',message:'Accès refusé'}]}).warnings,['Cuve.pdf : Accès refusé']));
  add('État des fichiers','Double suppression : identité stable et compte isolé',()=>{const key=state.deletionSelectionKeyV2782,a={fileIds:['b','a','a']},b={fileIds:['a','b']};equal(key('a','c',a),key('a','c',b));ensure(key('b','c',a)!==key('a','c',a));});

  const ctx={reportId:'c730a371-f0e5-444c-b777-2c654f583993',clientId:'synthetic-client',destinationId:'synthetic-folder',family:'plancher',template:{modeleId:'plancher',sha256:'a'.repeat(64),version:2754},baseRevision:0};
  const tick=()=>new Promise(r=>setTimeout(r,0));
  async function until(check){for(let n=0;n<100;n++){if(await check())return;await tick();}throw Error('État local non atteint');}
  function fixture(options={}){const rows=new Map();let online=false,account='qa@example.invalid';const calls=[];
    const storage={get:async k=>structuredClone(rows.get(k)||null),all:async()=>[...rows.values()].map(x=>structuredClone(x)),commit:async record=>{rows.set(record.key,structuredClone(record));return record;}};
    const client=reportEngine.createReportEngineClientV2754({storage,getAccount:()=>account,isOnline:()=>online,rpc:async(a,p)=>{calls.push({a,p});return options.rpc?.(a,p);}});
    return {client,rows,calls,online:v=>online=v,account:v=>account=v};
  }
  const fields=v=>({measurement:{value:v}}),request=()=> 'save-'+crypto.randomUUID();
  add('Moteur de rapports','Réponses exactes conservées hors ligne',async()=>{const h=fixture();try{await h.client.save(ctx,fields('1000.000'),request(),'Essai.pdf');equal((await h.client.get(ctx)).fields.measurement.value,'1000.000');equal(h.calls.length,0);}finally{h.client.lock();}});
  add('Moteur de rapports','Identité de requête réutilisée sans doublon',async()=>{const h=fixture(),id=request();try{await h.client.save(ctx,fields('1'),id,'Essai.pdf');await h.client.save(ctx,fields('1'),id,'Essai.pdf');equal(h.rows.size,1);}finally{h.client.lock();}});
  add('Moteur de rapports','Identité identique avec réponses différentes refusée',async()=>{const h=fixture(),id=request();try{await h.client.save(ctx,fields('1'),id,'Essai.pdf');await expectRejectedV59(()=>h.client.save(ctx,fields('2'),id,'Essai.pdf'),e=>/déjà utilisé/.test(e.message));}finally{h.client.lock();}});
  add('Moteur de rapports','Compte différent sans accès aux réponses locales',async()=>{const h=fixture();try{await h.client.save(ctx,fields('1'),request(),'Essai.pdf');h.account('other@example.invalid');equal(await h.client.get(ctx),null);}finally{h.client.lock();}});
  add('Moteur de rapports','Lecture distante ne remplace pas les réponses en attente',async()=>{const h=fixture();try{await h.client.save(ctx,fields('local'),request(),'Essai.pdf');await h.client.remember({context:{...ctx,baseRevision:3},fields:fields('remote'),name:'Essai.pdf',serverRevision:3,pdf:{status:'confirmed',revision:3,fileId:'drive'}});equal((await h.client.get(ctx)).fields.measurement.value,'local');}finally{h.client.lock();}});
  add('Moteur de rapports','Confirmation des données sans faux crochet Drive',async()=>{const h=fixture({rpc:async()=>({ok:true,engine:2754,reportId:ctx.reportId,revision:1,dataSaved:true,pdf:{status:'pending',revision:1}})});try{h.online(true);await h.client.save(ctx,fields('1'),request(),'Essai.pdf');await until(async()=> (await h.client.get(ctx)).dataSaved);equal((await h.client.get(ctx)).pending,true);}finally{h.client.lock();}});
  add('Moteur de rapports','Nouvelle suppression sans lecture réseau préalable',async()=>{const h=fixture({rpc:async()=>new Promise(()=>{})});try{h.online(true);await h.client.remove(ctx);await until(()=>h.calls.length);equal(h.calls.map(x=>x.a),['delete']);}finally{h.client.lock();}});
  add('Moteur de rapports','Suppression conserve les réponses locales',async()=>{const h=fixture();try{await h.client.save(ctx,fields('17.25'),request(),'Essai.pdf');await h.client.remove(ctx);const x=await h.client.get(ctx);equal(x.fields.measurement.value,'17.25');equal(x.deleted,true);equal(x.pending,true);}finally{h.client.lock();}});
  add('Moteur de rapports','Reprise ciblée sans envoyer un autre rapport',async()=>{const h=fixture({rpc:async()=>new Promise(()=>{})});try{await h.client.save(ctx,fields('1'),request(),'Essai.pdf');await h.client.save({...ctx,reportId:crypto.randomUUID()},fields('2'),request(),'Autre.pdf');h.online(true);await h.client.resume({reportIds:[ctx.reportId]});await until(()=>h.calls.length);equal(h.calls.length,1);equal(h.calls[0].p.reportId,ctx.reportId);}finally{h.client.lock();}});
  add('Moteur de rapports','Valeur non finie rejetée précisément',()=>expectRejectedV59(()=>reportEngine.reportFieldsV2754({x:{value:Infinity}}),e=>/Valeur de champ invalide/.test(e.message)));
  async function listTexts(warnings,notes){const texts=[],font={widthOfTextAtSize:(s,n)=>s.length*n/2},page={drawText:s=>texts.push(s),drawRectangle(){},drawLine(){}};const doc={embedFont:async()=>font,addPage:()=>page,setTitle(){},setAuthor(){},setSubject(){},save:async()=>new Uint8Array([1])};await renderer.renderBalanceListV2728([],'Client','',warnings,{PDFDocument:{create:async()=>doc},StandardFonts:{Helvetica:'H',HelveticaBold:'B'},rgb:()=>0},notes);return texts;}
  add('Avis de la liste','Attente Drive ne compte pas un fichier illisible',async()=>{const m=state.balanceListMessagesV2782({localPending:true}),texts=await listTexts(m.warnings,m.notes);ensure(!texts.some(s=>s.includes('fichier(s) à vérifier')));ensure(texts.some(s=>s.includes('liste en attente')));});
  add('Avis de la liste','Chaque fichier illisible apparaît, même après trois erreurs',async()=>{const texts=await listTexts(['A.pdf : accès','B.pdf : format','C.pdf : réseau','D.pdf : lecture'],[]);for(const name of ['A.pdf','B.pdf','C.pdf','D.pdf'])ensure(texts.some(s=>s.includes(name)));});

  // A missing suite is a harness configuration error, not a green result.
  for(const name of ui.UI_CASES_V2783)add('Interface PC/mobile et factures',name,()=>ui.runUiRegressionV2783(name,{sources,document,makeFixture}));
  for(const name of MANAGER_CASES_V59)add('Correctifs 27.84',name,()=>runManagerRegressionV59(name,{sources,document,makeFixture,loadModule}));
  const counts={};const ids=new Set();
  for(const item of tests){
    counts[item.group]=(counts[item.group]||0)+1;
    const id=item.group+'|'+item.name;
    if(ids.has(id))throw Error('CHECK_CATALOG_DUPLICATE: '+id);
    ids.add(id);
  }
  if(tests.length!==CDQ_V59_EXPECTED_TOTAL||Object.keys(counts).length!==Object.keys(CDQ_V59_GROUP_COUNTS).length||
      Object.entries(CDQ_V59_GROUP_COUNTS).some(([key,n])=>counts[key]!==n))
    throw Error('CHECK_CATALOG_INCOMPLETE: '+JSON.stringify(counts));
  const results=[];
  for(const item of tests){
    const begin=Date.now();let timeout;
    try{
      await Promise.race([
        Promise.resolve().then(()=>item.fn()),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('CHECK_TIMEOUT: '+item.group+' — '+item.name)),10000);})
      ]);
      results.push({group:item.group,name:item.name,status:'passed',ms:Date.now()-begin});
    }catch(error){
      results.push({group:item.group,name:item.name,status:'failed',
        ms:Date.now()-begin,error:String(error?.message||error).slice(0,300),
        kind:String(error?.message||'').startsWith('CHECK_TIMEOUT:')?'harness-timeout':'assertion'});
    }finally{clearTimeout(timeout);}
    // UI observer errors must not falsify the result.
    try{onProgress({completed:results.length,total:tests.length,failed:results.filter(r=>r.status==='failed').length});}catch(_){}
  }
  return {schema:'cdq-manager-local-tests-v2',managerVersion:'V59',
    scope:'published-shared-js-modules',privacy:'synthetic-fixtures-only',driveE2E:false,
    nativeAndroid:false,startedAt:new Date(started).toISOString(),
    completedAt:new Date().toISOString(),elapsedMs:Date.now()-started,
    total:results.length,passed:results.filter(r=>r.status==='passed').length,
    failed:results.filter(r=>r.status==='failed').length,results};
}

