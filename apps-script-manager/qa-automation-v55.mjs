// CDQ Script Manager V55 — economical, non-destructive test coordinator.
// No GitHub token, no project code, no Google files and no publication authority.
import {CDQ_V55_MODULES,CDQ_V55_GROUP_COUNTS,CDQ_V55_EXPECTED_TOTAL,runCDQLocalTestsV55}
  from './local-tests-v55.mjs';

export const CDQ_AUTOMATION_SCHEMA_V55='cdq-manager-automation-v2';
export const CDQ_AUTOMATION_TTL_V55=12*60*60*1000;
export const CDQ_AUTOMATION_ASSETS_V55=Object.freeze([
  ...CDQ_V55_MODULES,'apps-script-manager/local-tests-v55.mjs',
  'apps-script-manager/qa-automation-v55.mjs','apps-script-manager/version.json'
]);
const LOCAL_CACHE_KEY_V55='cdq-manager-readonly-checks-v55';
const hex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
const sha256=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const shaPattern=/^[a-f0-9]{64}$/;

export function validateReportV55(report){
  if(!report||report.schema!=='cdq-manager-local-tests-v2'||report.managerVersion!=='V55')
    return {ok:false,reason:'WRONG_SUITE_VERSION'};
  if(report.scope!=='published-shared-js-modules'||report.privacy!=='synthetic-fixtures-only'||
     report.driveE2E!==false||report.nativeAndroid!==false)
    return {ok:false,reason:'WRONG_TEST_SCOPE'};
  if(!Array.isArray(report.results)||report.results.length!==CDQ_V55_EXPECTED_TOTAL||
     report.total!==CDQ_V55_EXPECTED_TOTAL||report.passed!==CDQ_V55_EXPECTED_TOTAL||report.failed!==0)
    return {ok:false,reason:'INCOMPLETE_OR_FAILED_TESTS'};
  const counts={},names=new Set();
  for(const t of report.results){
    if(!t||t.status!=='passed'||typeof t.group!=='string'||typeof t.name!=='string'||
      t.error||t.kind||!Number.isFinite(t.ms)||t.ms<0)
      return {ok:false,reason:'INVALID_TEST_RESULT'};
    const id=t.group+'\u0000'+t.name;
    if(names.has(id))return {ok:false,reason:'DUPLICATE_CASE'};
    names.add(id);counts[t.group]=(counts[t.group]||0)+1;
  }
  if(Object.keys(counts).length!==Object.keys(CDQ_V55_GROUP_COUNTS).length||
     Object.entries(CDQ_V55_GROUP_COUNTS).some(([group,n])=>counts[group]!==n))
    return {ok:false,reason:'MISSING_REQUIRED_GROUP'};
  return {ok:true,reason:'LOCAL_CHECKS_ONLY'};
}

export function receiptReusableV55(entry,{fingerprint,environment,now=Date.now()}={}){
  if(!entry||entry.schema!==CDQ_AUTOMATION_SCHEMA_V55||
     entry.version!=='V55'||entry.status!=='passed'||
     !shaPattern.test(String(fingerprint||''))||entry.fingerprint!==fingerprint||
     typeof environment!=='string'||!environment||entry.environment!==environment||
     !Number.isFinite(entry.checkedAt)||entry.checkedAt>now||
     now-entry.checkedAt>CDQ_AUTOMATION_TTL_V55)
    return {ok:false,reason:'MISSING_STALE_OR_DIFFERENT_INPUT'};
  if(!entry.negativeControls||entry.negativeControls.checks!==6||entry.negativeControls.rejected!==6||
     !Array.isArray(entry.moduleHashes)||entry.moduleHashes.length!==CDQ_AUTOMATION_ASSETS_V55.length||
     entry.moduleHashes.some((item,i)=>item?.name!==CDQ_AUTOMATION_ASSETS_V55[i]||
       !shaPattern.test(String(item?.sha256||''))))
    return {ok:false,reason:'INCOMPLETE_PROVENANCE_OR_CANARY'};
  const verdict=validateReportV55(entry.report);
  if(!verdict.ok)return verdict;
  if(entry.appValidation!==false||entry.authenticatedDriveValidation!==false||
     entry.androidNativeValidation!==false||entry.publicationApproved!==false)
    return {ok:false,reason:'UNTRUSTWORTHY_RELEASE_ASSERTION'};
  return {ok:true,reason:'EXACT_LOCAL_SUITE_REUSABLE'};
}

export function negativeControlsV55(report,{fingerprint,environment,now}){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const tampered=clone(report);
  tampered.results[0].status='failed';tampered.failed=1;tampered.passed-=1;
  const missing=clone(report);missing.results.pop();missing.total--;
  const duplicate=clone(report);duplicate.results[1].name=duplicate.results[0].name;
  duplicate.results[1].group=duplicate.results[0].group;
  const receipt={schema:CDQ_AUTOMATION_SCHEMA_V55,version:'V55',status:'passed',fingerprint,
    environment,checkedAt:now,report,appValidation:false,authenticatedDriveValidation:false,
    androidNativeValidation:false,publicationApproved:false,
    negativeControls:{checks:6,rejected:6},
    moduleHashes:CDQ_AUTOMATION_ASSETS_V55.map(name=>({name,sha256:'b'.repeat(64)}))};
  const truth=receiptReusableV55(receipt,{fingerprint,environment,now});
  if(!truth.ok)throw Error('NEGATIVE_CONTROL_SETUP_INVALID: '+truth.reason);
  const wrongEnvironment={...receipt,environment:'different-browser'};
  const stale={...receipt,checkedAt:now-CDQ_AUTOMATION_TTL_V55-1};
  const falseClaim={...receipt,appValidation:true};
  // Every canary must fail for the INTENDED reason, not for a missing dependency.
  const rejected=[
    validateReportV55(tampered).reason==='INCOMPLETE_OR_FAILED_TESTS',
    validateReportV55(missing).reason==='INCOMPLETE_OR_FAILED_TESTS',
    validateReportV55(duplicate).reason==='DUPLICATE_CASE',
    receiptReusableV55(wrongEnvironment,{fingerprint,environment,now}).reason==='MISSING_STALE_OR_DIFFERENT_INPUT',
    receiptReusableV55(stale,{fingerprint,environment,now}).reason==='MISSING_STALE_OR_DIFFERENT_INPUT',
    receiptReusableV55(falseClaim,{fingerprint,environment,now}).reason==='UNTRUSTWORTHY_RELEASE_ASSERTION'
  ];
  if(rejected.some(v=>v!==true))throw Error('NEGATIVE_CONTROL_FAILED');
  return {checks:rejected.length,rejected:rejected.length};
}

function assetUrlV55(file,root){
  if(!CDQ_AUTOMATION_ASSETS_V55.includes(file))throw Error('ASSET_NOT_ALLOWLISTED');
  const local=file.startsWith('apps-script-manager/');
  const url=new URL(local?'./'+file.slice('apps-script-manager/'.length):'../'+file,root);
  if(url.origin!==new URL(root).origin)throw Error('UNEXPECTED_ASSET_ORIGIN');
  // Network-only, even when an old PWA service worker is still controlling this page.
  // A cached/offline fallback cannot be counted as the current published source.
  url.searchParams.set('cdq_diag','v55');
  return url;
}
export async function inspectAssetsV55({
  fetcher=globalThis.fetch,root=import.meta.url,onProgress=()=>{}
}={}){
  if(typeof fetcher!=='function'||!crypto?.subtle)throw Error('WEB_CRYPTO_OR_FETCH_UNAVAILABLE');
  const records=[];
  // Limit concurrency to avoid overwhelming an Android phone and the Pages CDN.
  let next=0;
  async function worker(){
    for(;;){
      const n=next++;if(n>=CDQ_AUTOMATION_ASSETS_V55.length)return;
      const name=CDQ_AUTOMATION_ASSETS_V55[n],url=assetUrlV55(name,root);
      let response;
      try{response=await fetcher(url.href,{cache:'no-store'});}
      catch(_){throw Error('ASSET_UNAVAILABLE: '+name);}
      if(!response?.ok)throw Error('ASSET_HTTP_ERROR: '+name+' '+(response?.status||'unknown'));
      const body=await response.text();
      // A service-worker offline fallback must never masquerade as an ES module.
      if(typeof body!=='string'||body.length<75||/^\s*(?:<!doctype|<html|<head|<body)/i.test(body)||
        (/\.mjs$/.test(name)&&!/\bexport\s+(?:const|function|async|class|\{)/.test(body)))
        throw Error('WRONG_ASSET_OR_OFFLINE_FALLBACK: '+name);
      if(name.endsWith('/version.json')){
        let parsed;try{parsed=JSON.parse(body);}catch(_){throw Error('INVALID_MANAGER_VERSION');}
        if(parsed?.version!=='V55'||parsed?.testSchema!=='cdq-manager-local-tests-v2')
          throw Error('VERSION_CONFLICT: '+name);
      }
      records[n]={name,sha256:await sha256(body),bytes:new TextEncoder().encode(body).length};
      try{onProgress({verified:records.filter(Boolean).length,total:CDQ_AUTOMATION_ASSETS_V55.length});}catch(_){}
    }
  }
  await Promise.all(Array.from({length:Math.min(3,CDQ_AUTOMATION_ASSETS_V55.length)},worker));
  if(records.length!==CDQ_AUTOMATION_ASSETS_V55.length||records.some(r=>!r||!shaPattern.test(r.sha256)))
    throw Error('INCOMPLETE_DEPENDENCY_MANIFEST');
  return {schema:'cdq-manager-asset-proof-v1',files:records,
    fingerprint:await sha256(JSON.stringify(records.map(r=>[r.name,r.sha256,r.bytes])))};
}
export function sameManifestV55(a,b){
  return !!a&&!!b&&shaPattern.test(String(a.fingerprint||''))&&
    a.fingerprint===b.fingerprint&&Array.isArray(a.files)&&Array.isArray(b.files)&&
    JSON.stringify(a.files)===JSON.stringify(b.files);
}
const safeReadCache=()=>{
  try{const data=localStorage.getItem(LOCAL_CACHE_KEY_V55);return data?JSON.parse(data):null;}catch(_){return null;}
};
const safeWriteCache=value=>{
  try{localStorage.setItem(LOCAL_CACHE_KEY_V55,JSON.stringify(value));return true;}catch(_){return false;}
};
const safeClearCache=()=>{
  try{localStorage.removeItem(LOCAL_CACHE_KEY_V55);}catch(_){}
};
export function makeReceiptV55(report,manifest,environment,now=Date.now()){
  const check=validateReportV55(report);
  if(!check.ok)throw Error('INVALID_LOCAL_SUITE: '+check.reason);
  if(!shaPattern.test(String(manifest?.fingerprint||'')))throw Error('MISSING_SOURCE_FINGERPRINT');
  if(typeof environment!=='string'||!environment)throw Error('MISSING_BROWSER_ENVIRONMENT');
  const control=negativeControlsV55(report,{fingerprint:manifest.fingerprint,environment,now});
  return {
    schema:CDQ_AUTOMATION_SCHEMA_V55,version:'V55',status:'passed',checkedAt:now,
    fingerprint:manifest.fingerprint,environment,
    moduleCount:manifest.files.length,moduleHashes:manifest.files.map(({name,sha256})=>({name,sha256})),
    report,negativeControls:control,appValidation:false,
    authenticatedDriveValidation:false,androidNativeValidation:false,publicationApproved:false,
    nextAction:'NATIVE_AND_DRIVE_VALIDATION_WHEN_REQUIRED',
    summary:'Contrôles JavaScript locaux; pas de certification APK/Drive/production.'
  };
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const $=id=>document.getElementById(id);
  const button=$('cdqLocalChecksRunV55'),copy=$('cdqLocalChecksCopyV55'),
    status=$('cdqLocalChecksStatusV55'),progress=$('cdqLocalChecksProgressV55'),
    details=$('cdqLocalChecksDetailsV55');
  let running=null,last=null;
  const write=(node,value)=>{if(node)node.textContent=value;};
  function display(receipt,{reused=false}={}){
    last=receipt;
    const tests=receipt?.report;
    write(status,reused
      ?'86 tests locaux réutilisés : fichiers, environnement et version identiques.'
      :tests?.failed===0
        ?'86 tests locaux réussis — aucune donnée client utilisée.'
        :'Tests locaux incomplets ou en échec; aucune validation de publication.');
    write(progress,'Empreinte '+String(receipt?.fingerprint||'').slice(0,12)+
      ' • '+(reused?'résultat réutilisé':'contrôles exécutés')+' • Android/Drive réels non testés');
    write(details,tests?.results?.map(t=>(t.status==='passed'?'✓ ':'✕ ')+t.group+' — '+t.name+
      (t.error?' : '+t.error:'')).join('\n')||'Aucun test valide.');
    if(copy)copy.disabled=false;
  }
  async function run({force=false,reason='auto'}={}){
    if(running)return running;
    if(button)button.disabled=true;
    running=(async()=>{
      try{
        write(status,'Vérification des dépendances publiées (aucune donnée client)…');
        write(progress,'Contrôle des empreintes du code réel…');
        const first=await inspectAssetsV55();
        const environment=navigator.userAgent||'unknown-browser';
        const old=!force&&safeReadCache();
        const cache=receiptReusableV55(old,{
          fingerprint:first.fingerprint,environment
        });
        if(cache.ok){
          display(old,{reused:true});
          return {...old,reused:true,reason};
        }
        write(status,'Tests locaux des modules publiés en cours…');
        const suite=await runCDQLocalTestsV55({
          moduleToken:first.fingerprint,
          onProgress:p=>write(progress,p.completed+'/'+p.total+' cas locaux • '+p.failed+' échec(s)')
        });
        const valid=validateReportV55(suite);
        if(!valid.ok){
          safeClearCache(); // A failed forced check invalidates yesterday's green receipt.
          last={schema:CDQ_AUTOMATION_SCHEMA_V55,version:'V55',status:'failed',
            checkedAt:Date.now(),report:suite,reason:valid.reason,appValidation:false,
            authenticatedDriveValidation:false,androidNativeValidation:false,publicationApproved:false};
          write(status,'Tests locaux NON validés : '+valid.reason+' — aucun résultat réutilisé.');
          write(details,suite.results.filter(x=>x.status!=='passed').map(x=>x.group+' — '+x.name+' : '+x.error).join('\n'));
          if(copy)copy.disabled=false;
          return last;
        }
        // Double-read the same bytes after the run; otherwise an in-flight deploy
        // could lead to a misleading success against two different versions.
        const second=await inspectAssetsV55();
        if(!sameManifestV55(first,second))throw Error('SOURCE_CHANGED_DURING_CHECK');
        const receipt=makeReceiptV55(suite,second,environment);
        safeWriteCache(receipt);display(receipt);
        return {...receipt,reused:false,reason};
      }catch(error){
        safeClearCache(); // Offline/changed files must never inherit a previous pass.
        const message=String(error?.message||error).slice(0,240);
        last={schema:CDQ_AUTOMATION_SCHEMA_V55,version:'V55',status:'unverified',
          checkedAt:Date.now(),reason:message,appValidation:false,
          authenticatedDriveValidation:false,androidNativeValidation:false,publicationApproved:false};
        write(status,'Vérification locale non confirmée : '+message);
        write(progress,'Aucune conclusion positive; vérifier les fichiers ou la connexion.');
        write(details,'Erreur de configuration/environnement : '+message+
          '\nCe problème n’est pas une preuve de bogue dans les rapports CDQ.');
        if(copy)copy.disabled=false;
        return last;
      }finally{running=null;if(button)button.disabled=false;}
    })();
    return running;
  }
  window.CDQLocalAutomationV55={run,last:()=>last,validateReport:validateReportV55};
  if(button)button.addEventListener('click',()=>{void run({force:true,reason:'manual'});});
  if(copy)copy.addEventListener('click',()=>{
    if(last&&navigator.clipboard?.writeText)void navigator.clipboard.writeText(JSON.stringify(last,null,2));
  });
  window.addEventListener('cdq:manager-project-read-v55',()=>{void run({reason:'project-read'});});
  // On launch, run once in a nonblocking task; subsequent reads reuse the exact proof.
  setTimeout(()=>{void run({reason:'manager-opened'});},350);
}
