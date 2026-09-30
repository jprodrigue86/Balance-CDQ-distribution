/**
 * Balance CDQ V26.19 — séparation authentification CDQ / Google Drive.
 *
 * L'accès à Balance CDQ reste régi par la liste d'utilisateurs, le code
 * d'activation à 6 chiffres et le NIP/jeton appareil existants. Google n'est
 * plus une preuve d'identité requise pour activer l'application.
 *
 * Les mécanismes Google existants restent présents et inchangés pour Drive,
 * Sheets et les documents.
 */

function cdqAuthCapabilitiesV2619(){
  return {
    ok:true,
    version:'26.19',
    applicationIdentity:'email-code-pin',
    googleRequiredForApplicationLogin:false,
    googleAccountReservedForDrive:true
  };
}

function cdqAuthStateWithoutGoogleV2619_(etat){
  etat=etat&&typeof etat==='object'?etat:{};
  if(!etat.connexionGoogleRequise)return etat;
  const rep={};
  Object.keys(etat).forEach(function(k){rep[k]=etat[k];});
  rep.connexionGoogleRequise=false;
  rep.connexionRequise=true;
  rep.message='Entrez votre adresse courriel autorisée et votre code d’activation.';
  if(!rep.emailSuggere)rep.emailSuggere='';
  return rep;
}

function obtenirEtatAccesV2619(jetonAppareil){
  try{
    return cdqAuthStateWithoutGoogleV2619_(obtenirEtatAcces(String(jetonAppareil||''),''));
  }catch(error){
    const message=String(error&&error.message||error||'');
    if(/google/i.test(message)){
      return {
        autorise:false,
        connexionRequise:true,
        connexionGoogleRequise:false,
        message:'Entrez votre adresse courriel autorisée et votre code d’activation.',
        emailSuggere:'',
        oublierJeton:false,
        versionBackend:'V26.19'
      };
    }
    throw error;
  }
}

function cdqAuthNeutralizeGoogleThrowsV2619_(source){
  source=String(source||'');
  let count=0;
  const re=/throw\s+(?:new\s+)?Error\s*\(([\s\S]{0,900}?)\)\s*;?/g;
  const patched=source.replace(re,function(full,arg){
    const text=String(arg||'');
    if(!/google/i.test(text))return full;
    if(!/(reconnect|confirm|compte|account|connexion|connect)/i.test(text))return full;
    count++;
    return 'void 0;';
  });
  return {source:patched,count:count};
}

function cdqAuthActivationFunctionV2619_(){
  const source=String(connecterAvecCodeAcces);
  if(!/^function\s+connecterAvecCodeAcces\s*\(/.test(source)){
    throw new Error('Le moteur d’activation CDQ actuel n’est pas compatible avec V26.19.');
  }
  const patched=cdqAuthNeutralizeGoogleThrowsV2619_(source);
  if(!patched.count){
    return connecterAvecCodeAcces;
  }
  let fn;
  try{
    fn=eval('('+patched.source+')');
  }catch(error){
    throw new Error('La séparation Google/CDQ n’a pas pu être préparée. '+String(error&&error.message||error||''));
  }
  if(typeof fn!=='function')throw new Error('Le moteur d’activation CDQ V26.19 est invalide.');
  return fn;
}

function connecterAvecCodeAccesV2619(email,code,jetonAppareil){
  email=String(email||'').trim().toLowerCase();
  code=String(code||'').replace(/\D/g,'').trim();
  jetonAppareil=String(jetonAppareil||'');

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    throw new Error('Entrez une adresse courriel valide.');
  }
  if(!/^\d{6}$/.test(code)){
    throw new Error('Entrez le code d’activation à 6 chiffres.');
  }

  // On réutilise volontairement le moteur d'activation existant afin de
  // conserver la même liste d'utilisateurs, les mêmes codes, les mêmes rôles,
  // le même jeton d'activation et le même NIP. La seule différence est que les
  // erreurs qui imposaient une preuve Google sont neutralisées.
  const fn=cdqAuthActivationFunctionV2619_();
  const rep=fn(email,code,'',jetonAppareil);
  if(rep&&typeof rep==='object'){
    rep.connexionGoogleRequise=false;
    rep.authApplication='email-code-v2619';
  }
  return rep;
}

function cdqAuthPatchDiagnosticV2619(){
  verifierDroit_('admin');
  const prepared=cdqAuthNeutralizeGoogleThrowsV2619_(String(connecterAvecCodeAcces));
  return {
    ok:true,
    googleThrowsNeutralized:prepared.count,
    sourceRecognized:/^function\s+connecterAvecCodeAcces\s*\(/.test(String(connecterAvecCodeAcces)),
    version:'26.19'
  };
}
