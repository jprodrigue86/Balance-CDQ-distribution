/*
 * CDQ — transport Gmail délégué au technicien (candidat INACTIF).
 * This module intentionally exposes NO google.script.run entry point.
 * The caller must have already verified CDQ access, client scope, ZIP identity,
 * recipient, duplicate-send claim and job ownership.
 *
 * No fallback to GmailApp, no impersonation by display name, and no saved tokens.
 * OAuth consent requires gmail.send + userinfo.email for the signed-in CDQ actor.
 */
var CDQ_GMAIL_TECH_SCOPE_V20261112_ = 'https://www.googleapis.com/auth/gmail.send';
var CDQ_GMAIL_TECH_MAX_ZIP_V20261112_ = 18 * 1024 * 1024;

function cdqGmailTechEmailV20261112_(value) {
  var email=String(value||'').trim().toLowerCase();
  if(email.length>254 || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email) ||
     /[\r\n<>]/.test(email))throw Error('INVALID_GMAIL_TECH_EMAIL');
  return email;
}
function cdqGmailTechHeaderV20261112_(value,limit) {
  var text=String(value||'');
  if(text.length>(limit||250)||/[\r\n\x00-\x1f\x7f]/.test(text))
    throw Error('INVALID_GMAIL_TECH_HEADER');
  return text;
}
function cdqGmailTechB64V20261112_(text) {
  return Utilities.base64Encode(Utilities.newBlob(String(text)).getBytes());
}
function cdqGmailTechLinesV20261112_(value) {
  return String(value||'').replace(/.{1,76}/g,'$&\r\n').replace(/\r\n$/,'');
}
/* Verify the actual Google account behind the OAuth access token.
 * The UI must request https://www.googleapis.com/auth/userinfo.email as well.
 * Never fetch tokeninfo with the bearer token in a query string.
 */
function cdqGmailTechAccountV20261112_(accessToken,expectedActor) {
  var expected=cdqGmailTechEmailV20261112_(expectedActor);
  var token=String(accessToken||'');
  if(token.length<20 || token.length>8192 || /[\s\r\n]/.test(token))
    throw Error('GMAIL_TECH_CONSENT_REQUIRED');
  var response;
  try {
    response=UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo',{
      method:'get',headers:{Authorization:'Bearer '+token},
      followRedirects:false,muteHttpExceptions:true
    });
  }catch(_) {throw Error('GMAIL_TECH_IDENTITY_UNAVAILABLE');}
  if(response.getResponseCode()!==200)throw Error('GMAIL_TECH_CONSENT_REQUIRED');
  var profile;
  try{profile=JSON.parse(response.getContentText());}catch(_){
    throw Error('GMAIL_TECH_IDENTITY_UNAVAILABLE');
  }
  var actual=cdqGmailTechEmailV20261112_(profile&&profile.email);
  if(profile.email_verified!==true||actual!==expected)
    throw Error('GMAIL_TECH_ACCOUNT_MISMATCH');
  return actual;
}
/* RFC 5322 + MIME; binary ZIP encoded once as base64, raw message as base64url.
 * No CC/BCC; the authenticated Google mailbox itself is the sender.
 */
function cdqGmailTechMimeV20261112_(sender,recipient,subject,plain,html,zipName,zipBlob,inlineImages) {
  var from=cdqGmailTechEmailV20261112_(sender),to=cdqGmailTechEmailV20261112_(recipient);
  var topic=cdqGmailTechHeaderV20261112_(subject,400),filename=cdqGmailTechHeaderV20261112_(zipName,150);
  if(!/\.zip$/i.test(filename)||/[/\\<>;:"\r\n]/.test(filename)||filename.startsWith('.')||
     !/[\p{L}\p{N}]/u.test(filename))throw Error('INVALID_GMAIL_TECH_ZIP_NAME');
  var asciiName=filename.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
     .replace(/[^A-Za-z0-9 ._()-]/g,'_').slice(0,150);
  var safeFilename=encodeURIComponent(filename).replace(/['()*]/g,function(c){
    return '%'+c.charCodeAt(0).toString(16).toUpperCase();
  });
  if(!zipBlob||typeof zipBlob.getBytes!=='function')throw Error('INVALID_GMAIL_TECH_ATTACHMENT');
  var bytes=zipBlob.getBytes();
  if(!bytes.length||bytes.length>CDQ_GMAIL_TECH_MAX_ZIP_V20261112_)
    throw Error('GMAIL_TECH_ZIP_TOO_LARGE');
  var id=String(Utilities.getUuid()).replace(/[^0-9a-f-]/gi,''),
      outer='cdq_mixed_'+id,alternative='cdq_alt_'+id,related='cdq_related_'+id,E='\r\n';
  var img=inlineImages&&typeof inlineImages==='object'?inlineImages:{};
  var imageParts=[];
  Object.keys(img).forEach(function(cid){
    if(!/^[A-Za-z0-9._-]{1,64}$/.test(cid))throw Error('INVALID_GMAIL_TECH_CID');
    var blob=img[cid],type=blob&&blob.getContentType&&String(blob.getContentType()||'').toLowerCase();
    if(!['image/png','image/gif','image/jpeg'].includes(type)||typeof blob.getBytes!=='function')
      throw Error('INVALID_GMAIL_TECH_INLINE_IMAGE');
    var data=blob.getBytes();
    if(!data.length||data.length>2*1024*1024)throw Error('GMAIL_TECH_INLINE_TOO_LARGE');
    imageParts.push(['--'+related,'Content-Type: '+type,'Content-ID: <'+cid+'>',
      'Content-Disposition: inline','Content-Transfer-Encoding: base64','',
      cdqGmailTechLinesV20261112_(Utilities.base64Encode(data))].join(E));
  });
  var mixed=[
    'From: <'+from+'>',
    'To: <'+to+'>',
    'Subject: =?UTF-8?B?'+cdqGmailTechB64V20261112_(topic)+'?=',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="'+outer+'"',
    '',
    '--'+outer,
    'Content-Type: multipart/alternative; boundary="'+alternative+'"',
    '',
    '--'+alternative,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    cdqGmailTechLinesV20261112_(cdqGmailTechB64V20261112_(plain)),
    '--'+alternative
  ];
  if(imageParts.length)mixed.push('Content-Type: multipart/related; boundary="'+related+'"','','--'+related);
  mixed.push('Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',
    cdqGmailTechLinesV20261112_(cdqGmailTechB64V20261112_(html)));
  if(imageParts.length){
    imageParts.forEach(function(part){mixed.push(part);});
    mixed.push('--'+related+'--');
  }
  mixed.push('--'+alternative+'--','','--'+outer,
    'Content-Type: application/zip; name="'+asciiName+'"',
    'Content-Disposition: attachment; filename="'+asciiName+'"; filename*=UTF-8\'\''+safeFilename,
    'Content-Transfer-Encoding: base64','',
    cdqGmailTechLinesV20261112_(Utilities.base64Encode(bytes)),
    '--'+outer+'--','');
  return mixed.join(E);
}
/* Private transport primitive: only a job-bound and deduplicated caller may use.
 * Never auto-retry an uncertain Gmail API result. Do not log token or ZIP bytes.
 */
function cdqGmailTechSendV20261112_(input) {
  if(!input||typeof input!=='object')throw Error('GMAIL_TECH_INVALID_REQUEST');
  var from=cdqGmailTechAccountV20261112_(input.accessToken,input.expectedActor);
  var mime=cdqGmailTechMimeV20261112_(from,input.recipient,input.subject,
    input.plainText,input.htmlBody,input.zipName,input.zipBlob,input.inlineImages);
  var raw=Utilities.base64EncodeWebSafe(Utilities.newBlob(mime,'message/rfc822').getBytes()).replace(/=+$/,'');
  var response;
  try {
    response=UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
      method:'post',
      contentType:'application/json',
      payload:JSON.stringify({raw:raw}),
      headers:{Authorization:'Bearer '+String(input.accessToken)},
      followRedirects:false,muteHttpExceptions:true
    });
  }catch(_) {throw Error('GMAIL_TECH_SEND_UNCERTAIN');}
  var code=response.getResponseCode();
  if(code===401||code===403)throw Error('GMAIL_TECH_CONSENT_REQUIRED');
  if(code===400||code===413)throw Error('GMAIL_TECH_MESSAGE_REJECTED');
  if(code<200||code>=300)throw Error('GMAIL_TECH_SEND_UNCERTAIN');
  var result;
  try {result=JSON.parse(response.getContentText());}catch(_){
    throw Error('GMAIL_TECH_SEND_UNCERTAIN');
  }
  if(!result||!/^[A-Za-z0-9_-]{6,}$/.test(String(result.id||'')))
    throw Error('GMAIL_TECH_SEND_UNCERTAIN');
  return {ok:true,transport:'gmail-api-technician',sender:from,
    recipient:cdqGmailTechEmailV20261112_(input.recipient),
    gmailMessageId:String(result.id),sentByOwner:false};
}
