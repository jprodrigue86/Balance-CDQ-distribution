/* CDQ V26.38. Existing account/session/role and Drive ACL remain authoritative.
 * Jobs contain identities, never session tokens. Workers recheck live access.
 */
var CDQ_WS_RPC_PERMISSION_V2638_=null;
function cdqWsRpcPermissionV2638_(name,email){
 var entry=['obtenirPreferencesUtilisateurCDQV72','obtenirStyleIconesCDQV2514','verifierAccesDriveEmailCDQV2620','verifierJetonDriveGoogleCDQV2620','cdqDriveGateCapabilitiesV2620','deconnecterAppareil','cdqStartupMaintenanceV2686'];
 if(entry.indexOf(name)>=0)return null;
 var access=cdqVerifierCompteDriveV2620_(email);if(!access.ok)throw Error('Accès aux données ou modification non autorisé sans permission Drive.');
 return {email:email,ok:true};
}
var CDQ_WS_SYSTEM_V2638_='1baB1UcQYcZ3szDlJp3y1geGbRuHWs335';
var CDQ_WS_LIST_PREFIX_V2638_='CDQ38_LIST_';
function cdqWsTextV2638_(v,max){return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max||200);}
function cdqWsAccessV2638_(write){
  var u=verifierDroit_(write?'ecriture':'lecture');
  if(!(CDQ_WS_RPC_PERMISSION_V2638_&&CDQ_WS_RPC_PERMISSION_V2638_.email===u.email&&CDQ_WS_RPC_PERMISSION_V2638_.ok)&&!cdqVerifierCompteDriveV2620_(u.email).ok)throw Error('Accès Drive requis pour ces données.');
  return u;
}
function cdqWsActorV2638_(email){
  var u=trouverUtilisateurAutoriseParEmail_(email);
  if(!u||['admin','technicien'].indexOf(normaliserRoleCDQ_(u.role))<0||!cdqVerifierCompteDriveV2620_(email).ok)throw Error('L’autorisation du technicien a été retirée.');
  return u;
}
function cdqWsFolderV2638_(id){var s=cdqDriveScopeV2521_(id,{},[CONFIG.MASTER_FOLDER_ID]);if(s.meta.mimeType!=='application/vnd.google-apps.folder')throw Error('Choisissez un dossier client.');return s;}
function cdqWsInstallV2638_(){
  var triggers=ScriptApp.getProjectTriggers(),names=triggers.map(function(t){return t.getHandlerFunction();});
  if(names.indexOf('cdqWorkspaceWorkerV2638_')<0)ScriptApp.newTrigger('cdqWorkspaceWorkerV2638_').timeBased().everyMinutes(10).create();
  if(names.indexOf('cdqFacturesMonthV2638_')<0)ScriptApp.newTrigger('cdqFacturesMonthV2638_').timeBased().onMonthDay(1).atHour(0).nearMinute(0).inTimezone('America/Toronto').create();
}
function cdqWsStoreV2638_(create){
  var root=DriveApp.getFolderById(CDQ_WS_SYSTEM_V2638_),it=root.getFoldersByName('Opportunités'),folder=it.hasNext()?it.next():create?root.createFolder('Opportunités'):null;if(!folder)return null;
  var files=folder.getFilesByName('Opportunités.json');if(files.hasNext())return files.next();
  return create?folder.createFile(Utilities.newBlob('{"schema":1,"items":[]}','application/json','Opportunités.json')):null;
}
function cdqListerOpportunitesV2638(){cdqWsAccessV2638_(false);var f=cdqWsStoreV2638_(false),data=f?JSON.parse(f.getBlob().getDataAsString('UTF-8')):{items:[]};return {ok:true,items:data.items||[]};}
function cdqEnregistrerOpportuniteV2638(payload){
  var u=cdqWsAccessV2638_(true),p=payload||{},request=cdqWsTextV2638_(p.requestId,100);if(!/^op-[A-Za-z0-9-]{8,96}$/.test(request))throw Error('Identifiant d’opportunité invalide.');
  var stages=['À qualifier','Contact établi','Proposition','Négociation','Gagnée','Perdue'],stage=cdqWsTextV2638_(p.etape,40),title=cdqWsTextV2638_(p.titre,180);if(!title||stages.indexOf(stage)<0)throw Error('Titre ou étape invalide.');
  var amount=p.montant==null||String(p.montant).trim()===''?'':Number(String(p.montant).replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));if(amount!==''&&(!isFinite(amount)||amount<0||amount>100000000))throw Error('Montant invalide.');
  var clientId=cdqWsTextV2638_(p.clientId,200),client=clientId?cdqWsFolderV2638_(clientId):null;
  var date=cdqWsTextV2638_(p.suivi,10);if(date&&!/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(date))throw Error('Date de suivi invalide.');
  var lock=LockService.getScriptLock();lock.waitLock(15000);
  try{var f=cdqWsStoreV2638_(true),data=JSON.parse(f.getBlob().getDataAsString('UTF-8')),items=data.items||[],id=cdqWsTextV2638_(p.id,100),prior=id?items.filter(function(x){return x.id===id;})[0]:null;
    var retry=items.filter(function(x){return x.requestId===request;})[0];if(retry)return {ok:true,item:retry};
    if(id&&!prior)throw Error('Opportunité introuvable.');if(prior&&prior.revision!==String(p.expectedRevision))throw Error('Cette opportunité a changé. Actualisez avant de la modifier.');
    if(!prior&&items.length>=2000)throw Error('La limite des opportunités est atteinte.');
    var now=new Date().toISOString(),item={id:prior?prior.id:'op-'+Utilities.getUuid(),requestId:request,titre:title,clientId:clientId,clientNom:client?client.meta.name:cdqWsTextV2638_(p.clientNom,180),contact:cdqWsTextV2638_(p.contact,180),etape:stage,montant:amount,suivi:date,responsable:cdqWsTextV2638_(p.responsable,120),notes:String(p.notes||'').slice(0,2000),createdAt:prior?prior.createdAt:now,createdBy:prior?prior.createdBy:u.email,updatedBy:u.email,revision:Utilities.getUuid(),updatedAt:now};
    var next=[item].concat(items.filter(function(x){return x.id!==item.id;}));f.setContent(JSON.stringify({schema:1,items:next}));return {ok:true,item:item};
  }finally{lock.releaseLock();}
}
// Explicit labels only. A differing address in two recent forms is left blank.
function cdqWsLabelsV2638_(rows){
  var found={},labels={client:'client_nom',adresse:'client_adresse',ville:'client_ville','code postal':'client_code_postal',province:'client_province',telephone:'client_telephone','telephone client':'client_telephone'};
  rows.forEach(function(row){row.forEach(function(v,c){var key=cdq23Norm_(v).replace(/\s*:\s*$/,'');if(!labels[key])return;for(var i=c+1;i<Math.min(row.length,c+20);i++){var text=cdqWsTextV2638_(row[i],240);if(!text)continue;if(labels[cdq23Norm_(text).replace(/\s*:\s*$/,'')])break;found[labels[key]]=text;break;}});});
  if(found.client_code_postal){var postal=found.client_code_postal.toUpperCase().replace(/\s/g,'');if(/^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ]\d[ABCEGHJKLMNPRSTVWXYZ]\d$/.test(postal))found.client_code_postal=postal.slice(0,3)+' '+postal.slice(3);}
  if(!found.client_code_postal&&found.client_adresse){var match=found.client_adresse.toUpperCase().match(/\b[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ]\s?\d[ABCEGHJKLMNPRSTVWXYZ]\d\b/);if(match)found.client_code_postal=match[0].replace(/\s/g,'').replace(/^(.{3})/,'$1 ');}
  return found;
}
// V26.46: active equipment cards, never historical reports or unrelated folders.
function cdqWsBalanceDataV2646_(v){
  var t=cdqWsTextV2638_(v,160);
  return /^(?:[-–—]+|n\/?a|non renseign[eé]|true|false|vrai|faux)$/i.test(t)?'':t;
}
function cdqWsSheetBalanceV2638_(rows,meta){
  // Use the inspected legacy layout when its structural anchors agree.
  // Column headings in merged Sheets do not necessarily align with data cells.
  var floorBase=null,weightAnchor=false;
  rows.forEach(function(row,r){row.forEach(function(v,c){if(/^type\s*:$/.test(cdq23Norm_(v))){for(var k=c+1;k<Math.min(row.length,c+12);k++){if(cdqWsTextV2638_(row[k])){if(cdq23Norm_(row[k])==='balance de plancher')floorBase=r-22;break;}}}if(c===5&&cdq23Norm_(v)==='poids'&&cdq23Norm_(row[43])==='avant correction'&&cdq23Norm_(row[81])==='apres correction')weightAnchor=true;});});
  if(floorBase!==null&&floorBase>=0&&weightAnchor){var a=function(r,c){return cdqWsBalanceDataV2646_((rows[r]||[])[c]);},capacity=a(floorBase+28,46).match(/^\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*[x×]\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*$/i),units=[[14,'lb'],[18,'kg'],[23,'g'],[27,'oz']].filter(function(p){return /^(true|vrai)$/i.test(String((rows[floorBase+34]||[])[p[0]]||''));});var unit=units.length===1?units[0][1]:'';
    return {id:meta.id,source:meta.name,revision:meta.modifiedTime,fabricant:a(floorBase+25,40)||a(floorBase+25,10),modele:a(floorBase+26,40)||a(floorBase+26,10),identification:a(floorBase+28,10),capacite:capacity?capacity[1].trim()+' '+(capacity[2]||unit):'',echelon:capacity?capacity[3].trim()+' '+(capacity[4]||unit):''};
  }
  var values={},headers=[],baseHeaders=[],equipmentType=false,equipmentLabel=false;
  function label(v){return cdq23Norm_(v).replace(/\s*:\s*$/,'');}
  function field(n){
    if(/^(fabricant|manufacturier|marque)$/.test(n))return 'fabricant';
    if(n==='modele')return 'modele';
    if(/^identification(?: de la balance| balance)?$/.test(n)||/^(?:#|n[°º]|no|numero)\s*(?:de?\s*)?(?:l\s*)?equipement$/.test(n))return 'identification';
    if(/^(capacite(?: maximale)?|max)$/.test(n))return 'capacite';
    if(/^(echelon|increment|division|graduation)$/.test(n))return 'echelon';
    return '';
  }
  function data(v){return field(label(v))?'':cdqWsBalanceDataV2646_(v);}
  function at(r,c){return data((rows[r]||[])[c]);}
  function next(row,c){for(var j=c+1;j<Math.min(row.length,c+20);j++){if(field(label(row[j])))break;var t=data(row[j]);if(t)return t;}return '';}
  rows.forEach(function(row,r){row.forEach(function(v,c){var n=label(v);
    if(/^(indicateur|balance\s*\/\s*indicateur|balance)$/.test(n))headers.push({r:r,c:c});
    if(/^(base|base\s*[/ -]\s*balance|base de la balance)$/.test(n))baseHeaders.push({r:r,c:c});
    if(n==='type'&&/balance|bascule|batcher|cuve|tremie|convoyeur|camion|train/.test(cdq23Norm_(next(row,c))))equipmentType=true;
  });});
  function recent(items,r){return items.filter(function(h){return h.r<r&&r-h.r<=8;}).slice(-1)[0];}
  rows.forEach(function(row,r){row.forEach(function(v,c){var n=label(v),key=field(n);if(!key)return;
    if(key==='identification')equipmentLabel=true;
    if(key==='fabricant'||key==='modele'){
      var h=recent(headers,r),base=recent(baseHeaders,r);
      values[key]=(base?at(r,base.c):'')||(h?at(r,h.c):'')||next(row,c);
    }else values[key]=next(row,c);
  });});
  rows.forEach(function(row){row.forEach(function(v){var cap=String(v||'').match(/^\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*[x×]\s*([\d\s.,]+)\s*(mg|kg|g|lb|lbs|oz|t)?\s*$/i);
    if(cap){values.capacite=cap[1].trim()+(cap[2]?' '+cap[2]:'');values.echelon=cap[3].trim()+(cap[4]?' '+cap[4]:'');}
  });});
  var units=[];rows.forEach(function(row){row.forEach(function(v,c){if(/^(true|vrai)$/i.test(String(v||''))&&/^(mg|kg|g|lb|lbs|oz|t)$/.test(label(row[c+1])))units.push(label(row[c+1]).replace('lbs','lb'));});});
  units=units.filter(function(v,i){return units.indexOf(v)===i;});
  if(units.length===1)['capacite','echelon'].forEach(function(k){if(values[k]&&/^[\d\s.,]+$/.test(values[k]))values[k]+=' '+units[0];});
  if(!equipmentType&&!headers.length&&!(equipmentLabel&&(values.fabricant||values.modele||values.capacite)))return null;
  if(!values.fabricant&&!values.modele&&!values.identification&&!values.capacite)return null;
  return Object.assign({id:meta.id,source:meta.name,revision:meta.modifiedTime},values);
}
function cdqWsListClientV2646_(folderId){
  var scope=cdqWsFolderV2638_(folderId),client=scope.path&&scope.path[1];
  if(!client||client.id===CONFIG.MASTER_FOLDER_ID)throw Error('Choisissez un dossier client pour sa liste de balances.');
  return client.id===scope.meta.id?scope:cdqWsFolderV2638_(client.id);
}
function cdqWsListSourcesV2638_(folderId){
  var files=[],seen={},reportFolders=[];
  function read(id,root){var token='';
    do{var options={q:"'"+cdq23Quote_(id)+"' in parents and trashed=false",pageSize:100,fields:'nextPageToken,files(id,name,mimeType,modifiedTime,version,md5Checksum,sha256Checksum,parents)',supportsAllDrives:true,includeItemsFromAllDrives:true};if(token)options.pageToken=token;
      var result=Drive.Files.list(options);(result.files||[]).forEach(function(f){
        if(f.mimeType==='application/vnd.google-apps.folder'){
          if(root&&/^rapports? (?:d ?)?etalonnages?$/.test(cdq23Norm_(f.name)))reportFolders.push(f.id);
          return;
        }
        if(f.mimeType!=='application/vnd.google-apps.spreadsheet'&&!(root&&f.mimeType==='application/pdf'))return;
        if(/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/i.test(cdq23Norm_(f.name)))return;
        if(!seen[f.id]){seen[f.id]=true;files.push(f);}
      });token=result.nextPageToken||'';
      if(files.length>500)throw Error('Plus de 500 fiches actives : choisissez un dossier client plus précis.');
    }while(token);
  }
  read(folderId,true);reportFolders.forEach(function(id){read(id,false);});
  return files.sort(function(a,b){return a.id.localeCompare(b.id);});
}
function cdqWsSignatureV2638_(sources){return empreinteCDQ_(JSON.stringify(['v2660-active-equipment',sources.map(function(f){return [f.id,f.name,f.modifiedTime,String(f.version||''),f.md5Checksum||f.sha256Checksum||''];})]));}
function cdqWsListKeyV2638_(id){return CDQ_WS_LIST_PREFIX_V2638_+id;}
// V26.54: only short job-state mutations use the shared lock. Drive scans and
// PDF parsing never hold it. Existing list IDs remain available while working.
function cdqWsListResultV2654_(job){return job?{ok:true,status:job.status,fileId:job.fileId||'',folderId:job.folderId,count:job.count||0,checkedAt:job.checkedAt||'',signature:job.signature||'',updatedAt:job.updatedAt||'',revision:'v2665',message:job.error||'',warnings:job.warnings||[]}: {ok:true,status:'absent'};}
function cdqWsSoonV2654_(){if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='cdqWorkspaceSoonV2638_';}))ScriptApp.newTrigger('cdqWorkspaceSoonV2638_').timeBased().after(1000).create();}
function cdqDemanderListeBalanceV2638(folderId,force,sourceStamp){
  var u=cdqWsAccessV2638_(true),scope=cdqWsListClientV2646_(folderId),props=PropertiesService.getScriptProperties(),key=cdqWsListKeyV2638_(scope.meta.id),lock=LockService.getScriptLock(),job;
  if(!lock.tryLock(100)){job=JSON.parse(props.getProperty(key)||'null');var busy=cdqWsListResultV2654_(job);busy.status='busy';return busy;}
  try{
    job=JSON.parse(props.getProperty(key)||'null');
    if(!job)job={folderId:scope.meta.id,status:'pending',signature:'',fileId:'',count:0};
    var hint=sourceStamp?empreinteCDQ_(String(sourceStamp).slice(0,100000)):'',changed=!!hint&&hint!==job.clientStamp,working=job.workToken&&Number(job.leaseUntil||0)>Date.now();
    if(hint)job.clientStamp=hint;
    if(force)job.forceFresh=true;
    if(working){if(force||changed){job.requestVersion=Utilities.getUuid();job.recheck=true;job.actor=u.email;job.requestedAt=new Date().toISOString();}}
    else if(force||changed||job.listRevision!=='v2660'||job.status==='error'||job.status==='working'||Date.now()-Date.parse(job.checkedAt||0)>60000){job.status='pending';job.requestVersion=Utilities.getUuid();job.actor=u.email;job.folderName=scope.meta.name;job.requestedAt=new Date().toISOString();}
    if(!job.actor){job.actor=u.email;job.folderName=scope.meta.name;job.requestVersion=Utilities.getUuid();}
    props.setProperty(key,JSON.stringify(job));
  }finally{lock.releaseLock();}
  cdqWsInstallV2638_();if(job.status==='pending')cdqWsSoonV2654_();
  return cdqWsListResultV2654_(job);
}
function cdqEtatListeBalanceV2638(folderId){cdqWsAccessV2638_(false);var scope=cdqWsListClientV2646_(folderId);return cdqWsListResultV2654_(JSON.parse(PropertiesService.getScriptProperties().getProperty(cdqWsListKeyV2638_(scope.meta.id))||'null'));}
async function cdqWsPdfValuesV2638_(file,lib){
  var doc=await lib.PDFDocument.load(new Uint8Array(DriveApp.getFileById(file.id).getBlob().getBytes().map(function(b){return b&255;})),{updateMetadata:false,parseSpeed:Infinity}),form=doc.getForm();
  function value(name){var f=form.getFieldMaybe(name);if(!f)return '';try{if(f instanceof lib.PDFTextField)return cdqWsBalanceDataV2646_(f.getText());if(f instanceof lib.PDFDropdown)return cdqWsBalanceDataV2646_(f.getSelected().join(', '));}catch(e){}return '';}
  if(!form.getFieldMaybe('identification_balance')&&!(form.getFieldMaybe('capacite_maximale')&&(form.getFieldMaybe('base_balance_fabricant')||form.getFieldMaybe('indicateur_fabricant'))))return null;
  var unit=value('unite_mesure'),cap=value('capacite_maximale'),inc=value('echelon');
  var r={id:file.id,source:file.name,revision:file.modifiedTime,fabricant:value('base_balance_fabricant')||value('indicateur_fabricant'),modele:value('base_balance_modele')||value('indicateur_modele'),identification:value('identification_balance'),capacite:cap+(cap&&unit?' '+unit:''),echelon:inc+(inc&&unit?' '+unit:'')};
  return r;
}
function cdqWsRowsV2638_(records){
  var by={},rows=[];records.sort(function(a,b){return Date.parse(b.revision)-Date.parse(a.revision);});
  records.forEach(function(r){var id=cdq23Norm_(cdqWsBalanceDataV2646_(r.identification));if(id){if(by[id])return;by[id]=true;}rows.push(r);});
  return rows.sort(function(a,b){return String(a.identification||a.source).localeCompare(String(b.identification||b.source),'fr',{numeric:true});});
}
async function cdqWsListPdfV2638_(rows,folderName,technician,warnings,lib){
  var doc=await lib.PDFDocument.create(),font=await doc.embedFont(lib.StandardFonts.Helvetica),bold=await doc.embedFont(lib.StandardFonts.HelveticaBold),widths=[110,120,82,75,190,135],left=40,top=612,pages=0;
  function safe(v){return String(v==null?'':v).replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\xff\n]/g,'?');}
  function lines(v,width,size){var words=safe(v||'Non renseigné').split(/\s+/),result=[],line='';words.forEach(function(word){while(font.widthOfTextAtSize(word,size)>width&&word.length>1){if(line){result.push(line);line='';}var i=1;while(i<word.length&&font.widthOfTextAtSize(word.slice(0,i+1),size)<=width)i++;result.push(word.slice(0,i));word=word.slice(i);}var test=line?line+' '+word:word;if(font.widthOfTextAtSize(test,size)>width){result.push(line);line=word;}else line=test;});if(line)result.push(line);return result;}
  var page,y;function newPage(){page=doc.addPage([792,612]);pages++;page.drawRectangle({x:0,y:top-7,width:792,height:7,color:lib.rgb(0,.62,.75)});page.drawText('BALANCE CDQ',{x:left,y:top-43,size:12,font:bold,color:lib.rgb(0,.4,.5)});page.drawText('Liste de balance',{x:left,y:top-69,size:23,font:bold});var nameLines=lines(folderName,600,10);nameLines.slice(0,2).forEach(function(t,i){page.drawText(t,{x:left,y:top-88-i*12,size:10,font});});page.drawText('Actualisée : '+Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd HH:mm:ss')+'  |  '+rows.length+' balance(s)',{x:left,y:top-120,size:9,font});y=top-143;page.drawRectangle({x:left,y:y-25,width:712,height:27,color:lib.rgb(.08,.15,.19)});var x=left;['Fabricant','Modèle','Capacité','Échelon','Identification','Cellule de charge'].forEach(function(t,i){page.drawText(t,{x:x+(widths[i]-bold.widthOfTextAtSize(t,10))/2,y:y-16,size:10,font:bold,color:lib.rgb(1,1,1)});x+=widths[i];});y-=25;page.drawText('Technicien : '+safe(technician)+'  |  Page '+pages,{x:left,y:20,size:8,font,color:lib.rgb(.35,.35,.35)});}
  newPage();if(!rows.length)page.drawText('Aucune balance détectée dans ce dossier.',{x:left,y:y-28,size:12,font});
  rows.forEach(function(r,index){var values=[r.fabricant,r.modele,r.capacite,r.echelon,r.identification,''],wrapped=values.map(function(v,i){return i===5?[]:lines(v,widths[i]-16,10);}),height=Math.max(34,Math.max.apply(null,wrapped.map(function(a){return a.length;}))*13+16);if(y-height<65)newPage();if(index%2===0)page.drawRectangle({x:left,y:y-height,width:712,height:height,color:lib.rgb(.95,.97,.98)});var x=left;wrapped.forEach(function(a,i){a.forEach(function(t,j){page.drawText(t,{x:x+(widths[i]-font.widthOfTextAtSize(t,10))/2,y:y-height/2+(a.length-1)*6.5-3.59-j*13,size:10,font});});x+=widths[i];});page.drawLine({start:{x:left,y:y-height},end:{x:left+712,y:y-height},color:lib.rgb(.8,.85,.88),thickness:.5});y-=height;});
  if(warnings.length){if(y<120)newPage();page.drawText(warnings.length+' fichier(s) à vérifier : certaines données n’ont pas pu être lues.',{x:left,y:y-30,size:10,font:bold,color:lib.rgb(.6,.25,.1)});lines(warnings.slice(0,3).join(' | '),700,8).slice(0,3).forEach(function(t,i){page.drawText(t,{x:left,y:y-45-i*11,size:8,font});});}
  doc.setTitle('Liste de balance');doc.setAuthor(safe(technician));doc.setSubject(safe(folderName));return await doc.save({objectsPerTick:Infinity});
}
async function cdqWsUpdateListV2638_(job){
  cdqWsActorV2638_(job.actor);var scope=cdqWsListClientV2646_(job.folderId);
  if(scope.meta.id!==job.folderId){job.status='ignored';job.checkedAt=new Date().toISOString();job.error='';return;}
  var sources=cdqWsListSourcesV2638_(job.folderId),signature=empreinteCDQ_(cdqWsSignatureV2638_(sources)+'|'+scope.meta.name);
  if(!job.forceFresh&&job.listRevision==='v2660'&&job.signature===signature&&job.fileId){var existing=null;try{existing=Drive.Files.get(job.fileId,{fields:'id,trashed,parents',supportsAllDrives:true});}catch(e){}if(existing&&!existing.trashed&&(existing.parents||[]).indexOf(job.folderId)>=0){job.status='ready';job.listRevision='v2660';job.checkedAt=new Date().toISOString();job.error='';return;}}
  var records=[],warnings=[],lib=cdq25PdfLib_(),cache=CacheService.getScriptCache();
  for(var i=0;i<sources.length;i++){var f=sources[i],key='CDQ60_META_'+empreinteCDQ_(JSON.stringify([f.id,f.name,f.modifiedTime,String(f.version||''),f.md5Checksum||f.sha256Checksum||''])),r;
    try{var old=job.forceFresh?null:cache.get(key);if(old)r=JSON.parse(old);else if(f.mimeType==='application/pdf')r=await cdqWsPdfValuesV2638_(f,lib);else{var sheet=SpreadsheetApp.openById(f.id).getSheets()[0];r=cdqWsSheetBalanceV2638_(sheet.getRange(1,1,Math.max(1,Math.min(60,sheet.getLastRow())),Math.max(1,Math.min(100,sheet.getLastColumn()))).getDisplayValues(),f);}if(r){records.push(r);try{cache.put(key,JSON.stringify(r),21600);}catch(e){}}}catch(e){warnings.push(f.name+': '+String(e.message||e).slice(0,120));}
  }
  var rows=cdqWsRowsV2638_(records),profile=cdqObtenirProfilTechnicien_(job.actor),bytes=await cdqWsListPdfV2638_(rows,scope.meta.name,profile.nomRapport||job.actor,warnings,lib);
  cdqWsActorV2638_(job.actor);cdqWsFolderV2638_(job.folderId);
  if(empreinteCDQ_(cdqWsSignatureV2638_(cdqWsListSourcesV2638_(job.folderId))+'|'+scope.meta.name)!==signature)throw Error('Les rapports ont changé pendant la préparation. La liste sera réessayée.');
  if(job.workToken){var live=JSON.parse(PropertiesService.getScriptProperties().getProperty(cdqWsListKeyV2638_(job.folderId))||'null');if(!live||live.workToken!==job.workToken)throw Error('Cette actualisation a été remplacée.');}
  var files=DriveApp.getFolderById(job.folderId).getFilesByName('Liste de balance.pdf'),file=null;
  while(files.hasNext()){var candidate=files.next();if(candidate.getMimeType()==='application/pdf'){file=candidate;break;}}
  var blob=Utilities.newBlob(Array.from(bytes,function(b){return b>127?b-256:b;}),'application/pdf','Liste de balance.pdf'),description=JSON.stringify({cdqListeBalanceV2638:true,signature:signature,folderId:job.folderId,count:rows.length,checkedAt:new Date().toISOString()});
  if(file)Drive.Files.update({description:description},file.getId(),blob,{fields:'id',supportsAllDrives:true});else file=DriveApp.getFolderById(job.folderId).createFile(blob).setDescription(description);
  job.updatedAt=new Date().toISOString();job.fileId=file.getId();job.signature=signature;job.count=rows.length;job.warnings=warnings.slice(0,8);job.status='ready';job.listRevision='v2660';job.checkedAt=new Date().toISOString();job.error='';job.forceFresh=false;
  var clientId=scope.path.length>1?scope.path[1].id:job.folderId;invaliderCacheContenuClient_(clientId);invaliderCacheCompagnies_();
}
function cdqWsClaimV2654_(key){
  var lock=LockService.getScriptLock();if(!lock.tryLock(100))return null;
  try{var props=PropertiesService.getScriptProperties(),job=JSON.parse(props.getProperty(key)||'null');
    if(!job||job.status==='ignored'||job.status==='error'||job.workToken&&Number(job.leaseUntil||0)>Date.now())return null;
    if(job.status==='ready'&&Date.now()-Date.parse(job.checkedAt||0)<600000)return null;
    job.workToken=Utilities.getUuid();job.leaseUntil=Date.now()+360000;job.status='working';job.recheck=false;
    props.setProperty(key,JSON.stringify(job));return job;
  }finally{lock.releaseLock();}
}
function cdqWsFinishV2654_(key,job,version){
  var lock=LockService.getScriptLock();if(!lock.tryLock(100))return false;
  try{var props=PropertiesService.getScriptProperties(),live=JSON.parse(props.getProperty(key)||'null');if(!live||live.workToken!==job.workToken)return false;
    if(live.recheck||live.requestVersion!==version){var actor=live.actor,requestedAt=live.requestedAt,requestVersion=live.requestVersion,clientStamp=live.clientStamp,forceFresh=live.forceFresh;Object.assign(live,job,{actor:actor,requestedAt:requestedAt,requestVersion:requestVersion,clientStamp:clientStamp,forceFresh:forceFresh,status:'pending'});}else live=job;
    delete live.workToken;delete live.leaseUntil;delete live.recheck;props.setProperty(key,JSON.stringify(live));return live.status==='pending';
  }finally{lock.releaseLock();}
}
async function cdqWorkspaceWorkerV2638_(){
  var props=PropertiesService.getScriptProperties(),all=props.getProperties(),keys=Object.keys(all).filter(function(k){return k.indexOf(CDQ_WS_LIST_PREFIX_V2638_)===0;});
  var entries=keys.map(function(k){try{return {key:k,job:JSON.parse(all[k])};}catch(e){return null;}}).filter(Boolean).sort(function(a,b){return (a.job.status==='pending'?0:1)-(b.job.status==='pending'?0:1)||Date.parse(a.job.checkedAt||0)-Date.parse(b.job.checkedAt||0);}),processed=0;
  for(var i=0;i<entries.length&&processed<5;i++){
    var key=entries[i].key,job=cdqWsClaimV2654_(key);if(!job)continue;processed++;var version=job.requestVersion;
    try{await cdqWsUpdateListV2638_(job);}catch(e){job.status='error';job.error=String(e.message||e).slice(0,500);job.checkedAt=new Date().toISOString();}
    cdqWsFinishV2654_(key,job,version);
  }
}
async function cdqWorkspaceSoonV2638_(){try{await cdqWorkspaceWorkerV2638_();}finally{
  ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='cdqWorkspaceSoonV2638_';}).forEach(function(t){ScriptApp.deleteTrigger(t);});
  var all=PropertiesService.getScriptProperties().getProperties();if(Object.keys(all).some(function(k){if(k.indexOf(CDQ_WS_LIST_PREFIX_V2638_)!==0)return false;try{return JSON.parse(all[k]).status==='pending';}catch(e){return false;}}))cdqWsSoonV2654_();
}}
function cdqFacturesMonthV2638_(){
  var date=Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd');
  obtenirUtilisateursAutorises_().forEach(function(u){try{if(['admin','technicien'].indexOf(normaliserRoleCDQ_(u.role))<0)return;var p=cdqObtenirProfilTechnicien_(u.email);if(!p.nomRapport||p.actifRapports===false||!cdqVerifierCompteDriveV2620_(u.email).ok)return;cdqInvoiceDestinationV2590_(p.nomRapport,'Autre',date);}catch(e){console.warn('Dossier mensuel non créé pour '+u.email+': '+String(e.message||e));}});
}


// V26.65: execute the requested client now; timer triggers are recovery only.
// The reservation is short. All Drive reads, PDF parsing and writes stay unlocked.
function cdqActualiserListeBalanceV2665(folderId,force,sourceStamp){
 var initial=cdqDemanderListeBalanceV2638(folderId,force,sourceStamp);
 if(initial.status==='busy'||initial.status==='ready')return initial;
 var key=cdqWsListKeyV2638_(initial.folderId),job=cdqWsClaimV2654_(key);if(!job)return initial;
 var version=job.requestVersion;
 // Return a serializable RPC result. The V8 microtask queue executes this
 // same-request PDF job immediately, without waiting for a timed trigger.
 cdqWsUpdateListV2638_(job).then(function(){cdqWsFinishV2654_(key,job,version);},function(e){
  job.error=String(e.message||e).slice(0,500);job.status=job.error.indexOf('Les rapports ont changé pendant la préparation.')===0?'pending':'error';job.checkedAt=new Date().toISOString();cdqWsFinishV2654_(key,job,version);
 });
 return cdqWsListResultV2654_(job);
}
function cdqRenommerClientV2665(clientId,nouveauNom){
 cdqWsAccessV2638_(true);var id=String(clientId||'').trim(),scope=cdqWsListClientV2646_(id);
 if(scope.meta.id!==id)throw Error('Choisissez le client à renommer.');
 return renommerDossier(id,nouveauNom,id);
}
