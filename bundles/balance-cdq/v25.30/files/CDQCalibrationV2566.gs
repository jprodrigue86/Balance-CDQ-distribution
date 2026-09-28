var CDQ_CALIBRATION_MODELS_V2566_ = {"western-scale::m1":{"method":true},"rice-lake::680":{"method":true},"rice-lake::720i":{"method":true},"rice-lake::420he":{"method":true},"rice-lake::sct2200":{"method":true},"rice-lake::120":{"method":true},"mettler-toledo::ind360":{"method":false},"mettler-toledo::ind700":{"method":false},"mettler-toledo::ind560":{"method":true},"mettler-toledo::ind246":{"method":true},"mettler-toledo::ind226":{"method":true},"mettler-toledo::ind236":{"method":true},"mettler-toledo::ind780":{"method":false},"mettler-toledo::panther":{"method":true},"a-d::ad4321":{"method":false},"avery-weigh-tronix::zm305-sd1":{"method":false},"cardinal::210-fe":{"method":false},"totalcomp::twp":{"method":true},"adam-equipment::cpw-plus-35":{"method":true},"adam-equipment::cpw-plus-6":{"method":true},"vwr::vwr-224tc":{"method":false},"mettler-toledo::ml104t-31":{"method":true},"mettler-toledo::sw":{"method":false},"cem::smart-6":{"method":true},"ohaus::rc31p30":{"method":true},"ohaus::r31p30":{"method":true},"ohaus::rc31p3":{"method":true},"ohaus::v12p6":{"method":true},"ohaus::i-dt33p":{"method":true},"myweigh::kd-8000":{"method":true},"sartorius::practum2102-1s":{"method":true},"sartorius::entris":{"method":false},"kilotech::kin1000":{"method":true},"a-d::gp-30k":{"method":true},"kilotech::kwd-500-05":{"method":false},"anyload::ocs-l":{"method":true},"kilotech::khs-200-30":{"method":false},"kilotech::kws-sw-12":{"method":false},"digi::sm-5600b":{"method":false},"camry::acs-30-je51":{"method":false},"uwe::afw":{"method":false},"rice-lake::iq-710-2a":{"method":false}};
/* Shared calibration feedback. No client document is modified. */
function cdqCalibrationLockV2566_(fn) {
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{return fn();}finally{lock.releaseLock();}
}
function cdqCalibrationFileV2566_(create) {
  var props=PropertiesService.getScriptProperties(),id=props.getProperty('CDQ_CALIBRATION_LEDGER_V2566');
  if(id){var existing=DriveApp.getFileById(id);if(existing.isTrashed())throw new Error('Le registre de calibration est à la corbeille.');return existing;}
  if(!create)return null;
  // A private system folder under the existing authorized master, never a client folder.
  var root=DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID),folders=root.getFoldersByName('_CDQ_CALIBRATION');
  var folder=folders.hasNext()?folders.next():root.createFolder('_CDQ_CALIBRATION');
  var files=folder.getFilesByName('retours-calibration-v1.json');
  var file=files.hasNext()?files.next():folder.createFile('retours-calibration-v1.json',JSON.stringify({schema:1,events:[]}),MimeType.PLAIN_TEXT);
  props.setProperty('CDQ_CALIBRATION_LEDGER_V2566',file.getId());return file;
}
function cdqCalibrationReadV2566_(file) {
  if(!file)return {schema:1,events:[]};
  var data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(data.schema!==1||!Array.isArray(data.events))throw new Error('Registre de calibration invalide.');return data;
}
function cdqCalibrationTextV2566_(value,max) {return String(value||'').trim().slice(0,max);}
function cdqEnregistrerRetourCalibrationV2566(input) {
  var user=verifierDroit_('ecriture');input=input||{};
  var id=cdqCalibrationTextV2566_(input.requestId,80),key=cdqCalibrationTextV2566_(input.deviceKey,120),rev=cdqCalibrationTextV2566_(input.revision,100);
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(id)||!/^[a-z0-9-]+::[a-z0-9-]+$/.test(key)||!/^[a-zA-Z0-9._-]{1,100}$/.test(rev))throw new Error('Référence de calibration invalide.');
  var model=CDQ_CALIBRATION_MODELS_V2566_[key];if(!model)throw new Error('Modèle de calibration inconnu.');
  var kind=String(input.kind||''),comment=cdqCalibrationTextV2566_(input.comment,1600);
  if(kind!=='worked'&&kind!=='problem')throw new Error('Retour invalide.');
  if(kind==='worked'&&!model.method)throw new Error('Aucune méthode à confirmer pour ce modèle.');
  if(kind==='problem'&&comment.length<8)throw new Error('Décrivez le problème rencontré.');
  return cdqCalibrationLockV2566_(function(){
    var file=cdqCalibrationFileV2566_(true),data=cdqCalibrationReadV2566_(file);
    var duplicate=data.events.filter(function(e){return e.requestId===id&&e.email===user.email;})[0];
    if(duplicate)return {ok:true,requestId:id,eventId:duplicate.id};
    var event={id:Utilities.getUuid(),requestId:id,deviceKey:key,revision:rev,kind:kind,comment:comment,email:user.email,at:new Date().toISOString(),status:kind==='problem'?'open':'confirmed'};
    data.events.push(event);var json=JSON.stringify(data);
    if(json.length>5000000)throw new Error('Le registre est plein; l’administrateur doit l’archiver. Retour non enregistré.');
    file.setContent(json);return {ok:true,requestId:id,eventId:event.id};
  });
}
function cdqObtenirRetoursCalibrationV2566(deviceKey,revision) {
  verifierDroit_('lecture');var key=String(deviceKey||'');
  if(!CDQ_CALIBRATION_MODELS_V2566_[key])throw new Error('Modèle inconnu.');
  var events=cdqCalibrationReadV2566_(cdqCalibrationFileV2566_(false)).events.filter(function(e){return e.deviceKey===key;});
  var people={};events.forEach(function(e){if(e.kind==='worked'&&e.revision===revision)people[e.email]=true;});
  return {ok:true,confirmations:Object.keys(people).length,openProblems:events.filter(function(e){return e.kind==='problem'&&e.status==='open';}).length};
}
function cdqListerAlertesCalibrationV2566() {
  verifierDroit_('administration');
  return {ok:true,alerts:cdqCalibrationReadV2566_(cdqCalibrationFileV2566_(false)).events.filter(function(e){return e.kind==='problem'&&e.status==='open';})};
}
function cdqResoudreAlerteCalibrationV2566(id,note) {
  var user=verifierDroit_('administration');note=cdqCalibrationTextV2566_(note,1600);
  if(note.length<8)throw new Error('Décrivez la correction ou la conclusion avant de fermer le signalement.');
  return cdqCalibrationLockV2566_(function(){
    var file=cdqCalibrationFileV2566_(false),data=cdqCalibrationReadV2566_(file);
    var event=data.events.filter(function(e){return e.id===id&&e.kind==='problem';})[0];
    if(!event)throw new Error('Signalement introuvable.');
    if(event.status==='resolved')return {ok:true};
    event.status='resolved';event.resolution={note:note,email:user.email,at:new Date().toISOString()};file.setContent(JSON.stringify(data));return {ok:true};
  });
}
