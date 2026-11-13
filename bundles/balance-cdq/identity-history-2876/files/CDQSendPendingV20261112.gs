/**
 * CDQ — Gestion des envois en attente v20261112
 * Provenance : bilan Sani-marc, Apps Script v602.
 * Les états Gmail incertains ne sont jamais renvoyés automatiquement.
 * L'annulation d'un envoi déjà tenté exige une confirmation humaine distincte,
 * conservée par job, auteur, client et instant initial, sans effacer le reçu.
 */
var CDQ_PENDING_REVIEW_PREFIX_V20261112_='CDQ_SEND_REVIEW_V20261112:';
var CDQ_PENDING_REVIEW_LOG_PREFIX_V20261112_='CDQ_SEND_REVIEW_LOG_V20261112:';
var CDQ_PENDING_LEGACY_PREFIX_V20261112_='CDQ_SEND_QUEUE_V2826:';
var CDQ_PENDING_DELIVERY_PREFIX_V20261112_='CDQ_DELIVERY_V2825:';
var CDQ_PENDING_MODERN_PREFIX_V20261112_='CDQ_SP_JOB_20261103:';

function cdqPendingParseV20261112_(value) {
  if(!value)return null;
  try{var v=JSON.parse(value);return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}
  catch(_){return null;}
}
function cdqPendingActorV20261112_(clientId) {
  clientId=String(clientId||'').trim();
  if(!/^[A-Za-z0-9_-]{12,130}$/.test(clientId))throw Error('INVALID_SEND_CLIENT');
  verifierAcces_();
  var actor=verifierDroit_('envoi');
  var scope=cdqClientPortalScopeV20261028_(clientId);
  var address=normaliserEmailCDQ_(actor&&actor.email||'');
  if(!address||!scope||normaliserEmailCDQ_(scope.actor&&scope.actor.email||'')!==address)
    throw Error('SCOPE_MISMATCH');
  return {clientId:clientId,actor:address,role:String(actor.role||'').trim().toLowerCase()};
}
function cdqPendingJobKeyV20261112_(jobId){return CDQ_PENDING_LEGACY_PREFIX_V20261112_+String(jobId);}
function cdqPendingReviewKeyV20261112_(jobId){return CDQ_PENDING_REVIEW_PREFIX_V20261112_+String(jobId);}
function cdqPendingRecipientV20261112_(job,delivery) {
  var email=String((delivery&&delivery.email)||(job&&job.email)||'').trim();
  return email?normaliserEmailCDQ_(email):'';
}
/** Strictly validate an operator review; no global bypass or age-only expiry. */
function cdqSendReviewClosedV20261112_(job,delivery,receipt) {
  if(!job||typeof job.id!=='string'||!job.clientId||!job.actor)return false;
  var review=cdqPendingParseV20261112_(PropertiesService.getScriptProperties().getProperty(cdqPendingReviewKeyV20261112_(job.id)));
  if(!review||review.protocol!==20261112||
     !['closed_unconfirmed','cancelled_before_send','confirmed_sent'].includes(review.state)||
     review.jobId!==job.id||review.clientId!==job.clientId||
     review.actor!==normaliserEmailCDQ_(job.actor)||Number(review.originalAt)!==Number(job.at)||
     review.mailAttempted!==!!job.mailAttempted)return false;
  var original=cdqPendingRecipientV20261112_(job,delivery);
  if(original&&review.recipient!==original)return false;
  if(receipt&&receipt.phase==='sent'&&receipt.jobId===job.id)return true;
  return true;
}
/** Bypass a legacy ZIP key only when every linked uncertain job has a valid manual review. */
function cdqSendReviewAllowsSendKeyV20261112_(sendKey){
  if(typeof sendKey!=='string'||!/^CDQ_SEND_ZIP_V2823_[A-Za-z0-9_-]{20,120}$/.test(sendKey))return false;
  var all=PropertiesService.getScriptProperties().getProperties(),matched=0,unreviewed=0;
  Object.keys(all).forEach(function(key){
    if(key.indexOf(CDQ_PENDING_DELIVERY_PREFIX_V20261112_)!==0)return;
    var delivery=cdqPendingParseV20261112_(all[key]);
    if(!delivery||delivery.sendKey!==sendKey)return;
    var queue=cdqPendingParseV20261112_(all[cdqPendingJobKeyV20261112_(delivery.id)]);
    if(!queue||!cdqSendReviewClosedV20261112_(queue,delivery,
        cdqPendingParseV20261112_(all[sendKey])))unreviewed++;
    matched++;
  });
  // The current protocol may share a historical ZIP receipt key.
  Object.keys(all).forEach(function(key){
    if(key.indexOf(CDQ_PENDING_MODERN_PREFIX_V20261112_)!==0)return;
    var job=cdqPendingParseV20261112_(all[key]);
    if(!job||job.sendKey!==sendKey)return;
    matched++;
    if(!cdqSendReviewClosedV20261112_(job,null,cdqPendingParseV20261112_(all[sendKey])))
      unreviewed++;
  });
  return matched>0&&unreviewed===0;
}

/** Resume only verifiably unsent jobs in phases accepted by their actual worker. */
function cdqPendingCanResumeV20261112_(job,modern,active,sent,reviewed,receipt) {
  if(!job||!job.blocked||!!job.mailAttempted||active||sent||reviewed||
     (receipt&&['sending','sent'].includes(receipt.phase)))return false;
  if(modern)return job.protocol===20261103&&['prepare','package','activate','mail'].includes(job.phase);
  return job.pipelineVersion===2831&&['prepare','package','send','publish'].includes(job.phase);
}
function cdqPendingRowsV20261112_(clientId,actor,role) {
  var all=PropertiesService.getScriptProperties().getProperties(),jobs={};
  Object.keys(all).forEach(function(key) {
    var kind=key.indexOf(CDQ_PENDING_LEGACY_PREFIX_V20261112_)===0?'legacy':
      key.indexOf(CDQ_PENDING_DELIVERY_PREFIX_V20261112_)===0?'delivery':
      key.indexOf(CDQ_PENDING_MODERN_PREFIX_V20261112_)===0?'modern':'';
    if(!kind)return;
    var item=cdqPendingParseV20261112_(all[key]);
    if(!item||item.clientId!==clientId)return;
    var id=String(item.id||key.slice(key.indexOf(':')+1));
    if(!/^[a-f0-9-]{32,64}$/i.test(id))return;
    var r=jobs[id]||(jobs[id]={id:id});
    r[kind]=item;
  });
  var result=Object.keys(jobs).map(function(id) {
    var x=jobs[id],job=x.legacy||x.modern||x.delivery,delivery=x.delivery;
    // The original guard scans all client jobs, including older jobs created
    // under a different operator account. Administrators must see those blockers.
    var owner=normaliserEmailCDQ_(job&&job.actor||'');
    if(!owner||(owner!==actor&&role!=='admin'))return null;
    var receiptKey=(delivery&&delivery.sendKey)||job.sendKey||'';
    var receipt=receiptKey?cdqPendingParseV20261112_(all[receiptKey]):null;
    var receiptSent=!!(receipt&&receipt.phase==='sent'&&receipt.jobId===id);
    var reviewed=cdqSendReviewClosedV20261112_(job,delivery,receipt);
    var review=reviewed?cdqPendingParseV20261112_(all[cdqPendingReviewKeyV20261112_(id)]):null;
    var attempted=!!job.mailAttempted,leaseUntil=Number(job.leaseUntil||0),active=leaseUntil>Date.now();
    // A completed portal/archive is NOT a confirmed Gmail send receipt. The
    // old list incorrectly said 'confirmed' while the actual preflight refused.
    var uncertainLegacy=!!x.legacy&&attempted&&!receiptSent&&!reviewed;
    var uncertainModern=!!x.modern&&attempted&&!x.modern.mailSent&&!receiptSent&&!reviewed;
    var receiptSending=!!(receipt&&receipt.phase==='sending'&&!reviewed);
    var uncertain=uncertainLegacy||uncertainModern||receiptSending;
    var sent=receiptSent||!!(x.modern&&x.modern.mailSent);
    var state=reviewed?(review.state==='confirmed_sent'?'envoye_confirme':
      review.state==='cancelled_before_send'?'annule':'clos_apres_verification'):
      uncertain?'a_verifier':sent?'envoye_confirme':
      job.blocked?'bloque':job.phase==='complete'?'termine':'en_cours';
    if(job.historyHiddenAtV2874&&!active&&!uncertain&&['annule','clos_apres_verification','envoye_confirme','termine'].includes(state))return null;
    return {jobId:id,protocol:x.modern?20261103:2826,clientId:clientId,
      recipient:cdqPendingRecipientV20261112_(job,delivery)||'Non identifiable',
      owner:owner,preflightMayBlock:uncertain,receiptConfirmed:receiptSent,
      createdAt:Number(job.at)||0,phase:String(job.phase||'preparation').slice(0,36),
      count:Math.max(0,Math.min(1000,Number(job.count)||0)),status:state,
      mailAttempted:attempted,mailSent:sent,active:active,
      canCancel:!!(x.legacy||x.modern)&&!attempted&&!active&&!sent&&!receiptSending&&!reviewed,
      canResume:cdqPendingCanResumeV20261112_(job,!!x.modern&&!x.legacy,active,sent,reviewed,receipt),
      needsConfirmation:!!(x.legacy||x.modern)&&!active&&!reviewed&&!sent&&
        (attempted||(receiptSending&&receipt.jobId===id)),
      reviewedAt:review?.reviewedAt||0};
  }).filter(Boolean);
  result.sort(function(a,b){return Number(cdqPendingHistoryTerminalV2874_(a))-Number(cdqPendingHistoryTerminalV2874_(b))||b.createdAt-a.createdAt||b.jobId.localeCompare(a.jobId);});
  return result;
}
/** Read-only task list; no Gmail request, no job or receipt mutation. */
function cdqEnvoisEnAttenteV20261112(clientId) {
  var ctx=cdqPendingActorV20261112_(clientId);
  return {ok:true,version:20261112,clientId:ctx.clientId,
    tasks:cdqPendingRowsV20261112_(ctx.clientId,ctx.actor,ctx.role).slice(0,150),readOnly:true};
}
function cdqPendingLegacyJobV20261112_(ctx,id) {
  var props=PropertiesService.getScriptProperties(),legacy=cdqPendingParseV20261112_(props.getProperty(cdqPendingJobKeyV20261112_(id))),modern=cdqPendingParseV20261112_(props.getProperty(CDQ_PENDING_MODERN_PREFIX_V20261112_+id)),job=legacy||modern;
  if(!job||job.id!==id||job.clientId!==ctx.clientId||
     !normaliserEmailCDQ_(job.actor||'')||
     (normaliserEmailCDQ_(job.actor||'')!==ctx.actor&&ctx.role!=='admin'))
     throw Error('SEND_TASK_NOT_OWNED');
  var delivery=cdqPendingParseV20261112_(props.getProperty(CDQ_PENDING_DELIVERY_PREFIX_V20261112_+id));
  var sendKey=delivery&&delivery.sendKey||job.sendKey||'';
  var receipt=sendKey?cdqPendingParseV20261112_(props.getProperty(sendKey)):null;
  return {job:job,delivery:delivery,receipt:receipt,modern:!!modern&&!legacy};
}
function cdqPendingEvidenceV20261112_(job,delivery) {
  if(!delivery&&job&&job.sendKey&&typeof cdqSpSentEvidence_==='function'&&typeof cdqSpReadRequest_==='function'){
    var request=cdqSpReadRequest_(job);
    return {checked:true,found:!!cdqSpSentEvidence_(job,request)};
  }
  if(!delivery||delivery.id!==job.id||!delivery.subject||!delivery.email||
     !/^[a-f0-9]{64}$/i.test(delivery.zipHash||''))return {checked:false,found:false};
  // Gmail proof requires the exact recipient + subject + ZIP attachment digest.
  if(typeof cdqDeliverySentEvidenceV2825_!=='function')return {checked:false,found:false};
  return {checked:true,found:!!cdqDeliverySentEvidenceV2825_(delivery)};
}
/**
 * Explicit, audited operator action. A manual closure can mean "possibly sent";
 * it NEVER asserts delivery and NEVER invokes GmailApp.sendEmail.
 */
function cdqGererEnvoiEnAttenteV20261112(clientId,jobId,action,confirmation) {
  var ctx=cdqPendingActorV20261112_(clientId);
  var id=String(jobId||'').trim(),act=String(action||'');
  if(act==='effacer_historique'&&id==='historique')return cdqClearSendHistoryV2874_(ctx,String(confirmation||''));
  if(!/^[a-f0-9-]{32,64}$/i.test(id)||!['verifier','annuler','reprendre','clore_apres_verification'].includes(act))
    throw Error('INVALID_SEND_REVIEW_ACTION');
  var start=cdqPendingLegacyJobV20261112_(ctx,id),job=start.job;
  if(cdqSendReviewClosedV20261112_(job,start.delivery,start.receipt))
    return {ok:true,jobId:id,state:'deja_resolu',noMailSent:true};
  // This can read Gmail for a single known message, never create/send one.
  var evidence=act==='verifier'||act==='clore_apres_verification'?
    cdqPendingEvidenceV20261112_(job,start.delivery):{checked:false,found:false};
  if(act==='verifier'&&!evidence.found)return {ok:true,jobId:id,state:'a_verifier',
    evidenceChecked:evidence.checked,evidenceFound:false,noMailSent:true};
  if(act==='verifier'&&evidence.found){
    var verifyLock=LockService.getScriptLock();verifyLock.waitLock(10000);
    try{
      var checked=cdqPendingLegacyJobV20261112_(ctx,id);
      if(checked.receipt&&checked.receipt.phase==='sent'&&checked.receipt.jobId===id)
        return {ok:true,jobId:id,state:'courriel_deja_envoye',noMailSent:true};
      if(checked.job.at!==job.at||Number(checked.job.leaseUntil||0)>Date.now())
        throw Error('SEND_TASK_CHANGED_DURING_REVIEW');
      var reviewSent={protocol:20261112,jobId:id,clientId:ctx.clientId,
        actor:normaliserEmailCDQ_(checked.job.actor),operator:ctx.actor,
        recipient:cdqPendingRecipientV20261112_(checked.job,checked.delivery),originalAt:Number(checked.job.at),
        mailAttempted:!!checked.job.mailAttempted,state:'confirmed_sent',reviewedAt:Date.now(),
        gmailEvidenceChecked:true,gmailEvidenceFound:true,possibleDuplicate:false,noAutomaticResend:true};
      var propsSent=PropertiesService.getScriptProperties();
      propsSent.setProperty(cdqPendingReviewKeyV20261112_(id),JSON.stringify(reviewSent));
      propsSent.setProperty(CDQ_PENDING_REVIEW_LOG_PREFIX_V20261112_+id+':'+reviewSent.reviewedAt,JSON.stringify(reviewSent));
      if(!cdqSendReviewClosedV20261112_(checked.job,checked.delivery,checked.receipt))
        throw Error('SEND_REVIEW_READBACK_UNCONFIRMED');
      return {ok:true,jobId:id,state:'courriel_deja_envoye',evidenceChecked:true,evidenceFound:true,
        noMailSent:true,recorded:true};
    }finally{verifyLock.releaseLock();}
  }
  if(evidence.found&&act==='clore_apres_verification')
    return {ok:false,jobId:id,state:'courriel_deja_envoye',message:'Envoi Gmail identifié. Vérifiez le message avant de créer un nouveau lot.',noMailSent:true};
  if(act==='clore_apres_verification'&&String(confirmation)!=='JE_CONFIRME_VERIFICATION_ET_RISQUE_DE_DOUBLON')
    throw Error('CONFIRMATION_DUPLICATE_RISK_REQUIRED');
  var props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var fresh=cdqPendingLegacyJobV20261112_(ctx,id),current=fresh.job;
    if(cdqSendReviewClosedV20261112_(current,fresh.delivery,fresh.receipt))
      return {ok:true,jobId:id,state:'deja_resolu',noMailSent:true};
    if(Number(current.at)!==Number(job.at)||current.phase!==job.phase||
       !!current.mailAttempted!==!!job.mailAttempted)throw Error('SEND_TASK_CHANGED_DURING_REVIEW');
    if(Number(current.leaseUntil||0)>Date.now()||Number(current.at)>Date.now()||
       Date.now()-Number(current.at||0)<600000)throw Error('SEND_TASK_STILL_ACTIVE');
    if(fresh.receipt&&fresh.receipt.phase==='sent'&&fresh.receipt.jobId===id)
      throw Error('SEND_ALREADY_CONFIRMED');
    if(act==='annuler'&&(current.mailAttempted||(fresh.receipt&&fresh.receipt.phase==='sending'&&fresh.receipt.jobId===id)))
      throw Error('SEND_CONFIRMATION_REQUIRED');
    if(act==='reprendre'&&!cdqPendingCanResumeV20261112_(current,fresh.modern,false,false,false,fresh.receipt))
      throw Error('SEND_RESTART_UNSAFE');
    if(act==='clore_apres_verification'&&!current.mailAttempted&&
       !(fresh.receipt&&fresh.receipt.phase==='sending'&&fresh.receipt.jobId===id))throw Error('SEND_USE_CANCEL_BEFORE_EMAIL');
    if(act==='reprendre'){
      current.blocked=false;current.attempts=0;current.error='';current.nextAt=Date.now();
      props.setProperty(fresh.modern?CDQ_PENDING_MODERN_PREFIX_V20261112_+id:cdqPendingJobKeyV20261112_(id),JSON.stringify(current));
      if(fresh.modern&&typeof cdqSpActive_==='function')cdqSpActive_(current,false);
      return {ok:true,jobId:id,state:'reprise_demandee',noMailSent:true};
    }
    current.blocked=true;current.nextAt=0;current.error=act==='annuler'?
      'CANCELLED_BEFORE_EMAIL_V20261112':'MAIL_UNCONFIRMED_MANUALLY_CLOSED_V20261112';
    props.setProperty(fresh.modern?CDQ_PENDING_MODERN_PREFIX_V20261112_+id:cdqPendingJobKeyV20261112_(id),JSON.stringify(current));
    if(fresh.modern&&typeof cdqSpActive_==='function')cdqSpActive_(current,false);
    var review={protocol:20261112,jobId:id,clientId:ctx.clientId,
      actor:normaliserEmailCDQ_(current.actor),operator:ctx.actor,
      recipient:cdqPendingRecipientV20261112_(current,fresh.delivery),originalAt:Number(current.at),
      mailAttempted:!!current.mailAttempted,state:act==='annuler'?'cancelled_before_send':'closed_unconfirmed',
      reviewedAt:Date.now(),gmailEvidenceChecked:evidence.checked,gmailEvidenceFound:evidence.found,
      possibleDuplicate:act!=='annuler',noAutomaticResend:true};
    props.setProperty(cdqPendingReviewKeyV20261112_(id),JSON.stringify(review));
    // Append-only audit key; never remove the original job or delivery receipt.
    props.setProperty(CDQ_PENDING_REVIEW_LOG_PREFIX_V20261112_+id+':'+review.reviewedAt,
      JSON.stringify(review));
    if(!cdqSendReviewClosedV20261112_(current,fresh.delivery,fresh.receipt))
      throw Error('SEND_REVIEW_READBACK_UNCONFIRMED');
    return {ok:true,jobId:id,state:review.state,possibleDuplicate:review.possibleDuplicate,
      noMailSent:true};
  }finally{lock.releaseLock();}
}

function cdqPendingHistoryTerminalV2874_(row){
  return !!row&&!row.active&&!row.preflightMayBlock&&
    ['annule','clos_apres_verification','envoye_confirme','termine'].includes(row.status);
}
function cdqClearSendHistoryV2874_(ctx,confirmation){
  if(confirmation!=='EFFACER_HISTORIQUE_TERMINE')throw Error('HISTORY_CONFIRMATION_REQUIRED');
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var rows=cdqPendingRowsV20261112_(ctx.clientId,ctx.actor,ctx.role),count=0;
    var props=PropertiesService.getScriptProperties();
    rows.forEach(function(row){
      if(!cdqPendingHistoryTerminalV2874_(row))return;
      var key=[CDQ_PENDING_LEGACY_PREFIX_V20261112_,CDQ_PENDING_MODERN_PREFIX_V20261112_,CDQ_PENDING_DELIVERY_PREFIX_V20261112_]
        .map(function(prefix){return prefix+row.jobId;}).filter(function(candidate){return !!props.getProperty(candidate);})[0];
      var job=cdqPendingParseV20261112_(props.getProperty(key));
      if(!job||job.clientId!==ctx.clientId||normaliserEmailCDQ_(job.actor)!==row.owner||
         (row.owner!==ctx.actor&&ctx.role!=='admin')||Number(job.leaseUntil||0)>Date.now())throw Error('HISTORY_CONTEXT_CHANGED');
      // Jobs, receipts and review records remain intact for duplicate checks.
      // Only the shared history visibility is changed; no file is removed.
      job.historyHiddenAtV2874=Date.now();
      job.historyHiddenByV2874=ctx.actor;
      props.setProperty(key,JSON.stringify(job));count++;
    });
    return {ok:true,clientId:ctx.clientId,cleared:count,noMailSent:true};
  }finally{lock.releaseLock();}
}
