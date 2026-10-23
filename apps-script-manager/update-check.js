'use strict';
// Read-only assistant: no deployment and no GitHub credential storage.
function updateCheckDecisionV52(report, now=Date.now()) {
  if (!report || !report.completedAt) return 'Lis le projet pour vérifier les versions.';
  const age=now-Date.parse(report.completedAt);
  if (!Number.isFinite(age) || age<0 || age>300000) return 'Actualise le diagnostic : ce relevé date de plus de cinq minutes ou sa date est invalide.';
  if (report.production?.status!=='content_verified') return 'La version Google déployée reste à confirmer. Relance la vérification avant toute publication.';
  if (report.production.matchesSource!==true) return 'La source Google diffère du déploiement. Vérifie les modifications prévues avant de choisir Écrire + Déployer.';
  if (report.issues?.length) return 'Examine les points signalés dans le diagnostic des versions avant de poursuivre.';
  return 'Source et déploiement Google identiques. Consulte les tests de la révision à publier ; ce diagnostic ne valide pas une publication.';
}
function updateCheckReceiptV52(value, expected) {
  const tests=['tests/rpc-session-context-v2751.test.mjs','tests/rpc-startup-performance-v2724.test.mjs','tests/historical-rpc-v2752.test.mjs'];
  if (!/^[a-f0-9]{40}$/.test(expected)) throw Error('Saisis les 40 caractères de la révision GitHub à vérifier.');
  if (!value || value.source!==expected) throw Error('Ce compte rendu ne correspond pas à la révision demandée.');
  if (!Array.isArray(value.results) || value.results.length!==tests.length ||
      new Set(value.results.map(x=>x.test)).size!==tests.length ||
      !value.results.every(x=>tests.includes(x.test)&&Number.isInteger(x.exitCode)))
    throw Error('Format de compte rendu économique non reconnu.');
  return value.status==='passed' && value.results.every(x=>x.exitCode===0)
    ? 'Trois suites RPC/session réussies pour cette révision selon le fichier importé. Les PDF, la vitesse réelle et la publication restent à qualifier.'
    : 'Au moins un contrôle a échoué. Consulte les journaux GitHub avant de poursuivre.';
}
(function(){
  const button=document.getElementById('updateCheckRun');
  if(!button)return;
  const text=document.getElementById('updateCheckNext');
  let busy=false;
  function render(){text.textContent=updateCheckDecisionV52(CDQ_DIAGNOSTIC_V43.report);}
  const oldRender=diagnosticRenderV43;
  diagnosticRenderV43=function(r){oldRender(r);render();};
  const oldInvalidate=invalidateVersionDiagnosticV43;
  invalidateVersionDiagnosticV43=function(){oldInvalidate();render();};
  button.addEventListener('click',async()=>{
    if(busy)return;
    if(S.deployBusy){text.textContent='Attends la fin de la publication en cours.';return;}
    if(!hasLiveToken()){text.textContent='Connecte Google, puis choisis le projet à vérifier.';return;}
    if(pendingChangeCount()>0){text.textContent='Des modifications sont en préparation. Utilise le diagnostic existant ou termine leur traitement avant de relire le projet.';return;}
    busy=true;button.disabled=true;text.textContent='Vérification des versions…';
    try{
      await readProject(projectSelect.value||scriptIdInput.value);
      // readProject starts the existing asynchronous diagnostic; render hook updates this panel.
      if(!CDQ_DIAGNOSTIC_V43.report)text.textContent='Projet lu. Vérification du déploiement et des versions publiées en cours…';
      else render();
    }catch(_){text.textContent='Vérification indisponible. Consulte la connexion Google et réessaie.';}
    finally{busy=false;button.disabled=false;}
  });
  document.getElementById('updateCheckReceipt').addEventListener('change',async event=>{
    const output=document.getElementById('updateCheckTests'),file=event.target.files?.[0];
    output.textContent='Aucun résultat vérifié.';
    if(!file)return;
    try{
      if(file.size>50000)throw Error('Le compte rendu est trop volumineux.');
      output.textContent=updateCheckReceiptV52(JSON.parse(await file.text()),document.getElementById('updateCheckSha').value.trim());
    }catch(error){output.textContent=error instanceof SyntaxError?'Le fichier JSON est invalide.':error.message;}
  });
  document.getElementById('updateCheckSha').addEventListener('input',()=>{
    document.getElementById('updateCheckTests').textContent='Révision modifiée : importe à nouveau le compte rendu correspondant.';
    document.getElementById('updateCheckReceipt').value='';
  });
  render();
})();
