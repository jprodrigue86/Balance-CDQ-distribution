/* CDQ sign-in and permission to browse client documents are independent. */
(() => {
  'use strict';
  if (window.cdqDriveEntryV2632) return;
  let epoch = 0, allowed = '', checking = false, checkingEmail = '', checkPromise = null;
  let assignedRole = '', roleAccount = '', sessionConfirmed = false;
  let accessStatus = 'pending';
  const email = () => String(typeof utilisateurCourantEmail !== 'undefined' ? utilisateurCourantEmail : '').trim().toLowerCase();
  const ready = () => typeof cdqAccessState !== 'undefined' && cdqAccessState === 'ready' && !!email();
  const confirmed = () => ready() && sessionConfirmed && roleAccount === email();
  const canRead = () => confirmed() && allowed === email();
  const originalClients = window.chargerClients;
  const originalRun = window.cdqApiRun;
  // Preview only needs sign-in and the current account's presentation settings.
  // All other server data operations require Drive access, including future modules.
  const entryMethods = new Set([
    'reprendreActivationCDQ','creerDefiConnexionGoogleCDQ','verifierJetonGoogleCDQ','obtenirEtatAcces',
    'connecterAvecCodeAcces','definirNip4ApresActivation','deverrouillerAvecNip','restaurerSessionApresBiometrie',
    'reprendreSessionCourteCDQV2524','obtenirPreferencesUtilisateurCDQV72','obtenirStyleIconesCDQV2514','deconnecterAppareil'
  ]);
  const protectedMethod = name => !entryMethods.has(String(name));

  function syncAdminSettings(admin) {
    const button = document.getElementById('cdqAdminSettingsButton');
    if (!admin) {
      button?.remove();
      document.getElementById('cdqDiagnosticSettingsButton')?.remove();
      const modal = document.getElementById('adminModalOverlay');
      if (modal) modal.style.display = 'none';
      for (const id of ['adminUserList', 'adminCodesOutput']) {
        const el = document.getElementById(id);
        if (el) { el.replaceChildren(); if ('value' in el) el.value = ''; }
      }
      return;
    }
    if (button) return;
    const panel = document.getElementById('cdq-settings-panel-advanced');
    const share = panel?.querySelector('#cdqInstallShareSettingsButton');
    if (!share) return;
    const action = document.createElement('button');
    action.id = 'cdqAdminSettingsButton'; action.type = 'button';
    action.className = 'cdq-admin-settings-button cdq-user-management-settings-v2614';
    action.textContent = 'Gestion des utilisateurs';
    action.onclick = () => {
      if (canRead() && assignedRole === 'admin' && typeof ouvrirGestionUtilisateurs === 'function') ouvrirGestionUtilisateurs();
    };
    share.insertAdjacentElement('afterend', action);
  }

  function applyRole() {
    if (!ready()) return;
    if (typeof utilisateurCourantRole !== 'undefined') utilisateurCourantRole = canRead() && roleAccount === email() ? assignedRole : 'lecture';
    try { if (typeof appliquerDroitsRoleInterface === 'function') appliquerDroitsRoleInterface(); } catch (_) {}
    const admin = canRead() && assignedRole === 'admin';
    syncAdminSettings(admin);
    for (const id of ['adminButton','headerAdminButton']) {
      const el = document.getElementById(id); if (el) el.style.display = admin ? (id === 'headerAdminButton' ? 'grid' : 'block') : 'none';
    }
  }

  function clearClientView() {
    try { if (typeof deselectionnerCompagnie === 'function') deselectionnerCompagnie(); } catch (_) {}
    if (typeof toutesLesCompagnies !== 'undefined') toutesLesCompagnies = [];
    if (typeof cacheContenuCompagnies !== 'undefined') cacheContenuCompagnies = Object.create(null);
    if (typeof cacheDerniereVerificationCompagnies !== 'undefined') cacheDerniereVerificationCompagnies = Object.create(null);
    if (typeof rafraichissementsEnCours !== 'undefined') rafraichissementsEnCours = Object.create(null);
    for (const id of ['companyList', 'filesContainer']) {
      const el = document.getElementById(id); if (el) el.replaceChildren();
    }
    try { sessionStorage.removeItem('cdq_drive_gate_email_v2620'); } catch (_) {}
    // Close client-data panels so an old account's rendered documents cannot remain.
    for (const name of ['cdqDriveV2521', 'cdqCopyV2522', 'cdqCreateV2523']) {
      try { window[name]?.close?.(); } catch (_) {}
    }
    try { window.cdqInventoryModernV2592?.close?.(); window.cdqFacturesV2590?.close?.(); } catch (_) {}
    for (const id of ['cdqDriveDialogV2521', 'cdqCopyV2522', 'cdqCreateDialogV2523', 'noteModalOverlay', 'cdqDocumentPrepare']) {
      const el = document.getElementById(id);
      if (el?.open && typeof el.close === 'function') el.close();
      else if (el) el.style.display = 'none';
    }
    window.dispatchEvent(new Event('cdq:drive-cleared-v2632'));
  }

  function paint(message, busy = false) {
    const files = document.getElementById('filesContainer');
    if (!files?.parentNode) return;
    let card = document.getElementById('cdqDriveStatusV2632');
    if (!card) {
      card = document.createElement('section'); card.id = 'cdqDriveStatusV2632';
      card.setAttribute('role', 'status');
      const title = document.createElement('strong'); title.textContent = 'Compte CDQ connecté — lecture seule';
      const text = document.createElement('p');
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = 'Actualiser l’accès'; button.onclick = () => check(true);
      card.append(title, text, button); files.parentNode.insertBefore(card, files);
    }
    card.hidden = !ready() || canRead() || accessStatus === 'pending';
    card.querySelector('strong').textContent = accessStatus === 'error'
      ? 'Accès Drive à vérifier'
      : 'Compte CDQ connecté — lecture seule';
    card.querySelector('p').textContent = message;
    card.querySelector('button').disabled = busy;
    const legacy = document.getElementById('cdqDriveGateV2620');
    if (legacy) { legacy.classList.remove('show'); legacy.style.display = 'none'; }
  }

  function deny(message, error = false) {
    accessStatus = error ? 'error' : 'denied';
    allowed = ''; applyRole(); clearClientView();
    paint(message || 'Vous pouvez consulter l’interface. Les clients, les fichiers et l’inventaire restent masqués, et les modifications sont désactivées. Ajoutez cette adresse CDQ au partage Drive pour activer les accès prévus par votre rôle.');
  }

  function check(force = false) {
    if (!confirmed()) return Promise.resolve(false);
    if (checking && checkingEmail === email() && !force) return checkPromise;
    const account = email(), token = ++epoch;
    accessStatus = 'pending';
    allowed = ''; checking = true; checkingEmail = account; applyRole(); clearClientView();
    paint('Vérification de vos permissions sur les dossiers clients…', true);
    checkPromise = new Promise(resolve => {
      let finished = false;
      const current = () => token === epoch && ready() && account === email();
      const finish = (result, error) => {
        if (finished) return; finished = true; clearTimeout(timeout);
        if (!current()) { resolve(false); return; }
        checking = false; checkPromise = null;
        if (result?.ok === true && String(result.email || '').trim().toLowerCase() === account) {
          accessStatus = 'allowed';
          allowed = account; applyRole(); paint('');
          // Only read account-scoped client caches after the Drive permission check.
          if (typeof originalClients === 'function') originalClients.call(window, !!force);
          window.dispatchEvent(new Event('cdq:drive-ready-v2632'));
          resolve(true);
        } else {
          deny(error ? 'Les permissions Drive n’ont pas pu être vérifiées. Vous pouvez utiliser l’application et réessayer plus tard.' : undefined, error);
          resolve(false);
        }
      };
      const timeout = setTimeout(() => finish(null, true), 15000);
      try {
        // Existing authenticated CDQ RPC checks this CDQ email's explicit Drive ACL.
        // It does not launch Google OAuth or depend on the PDF/Sheets account setting.
        originalRun().withSuccessHandler(r => finish(r, false)).withFailureHandler(() => finish(null, true))
          .verifierAccesDriveEmailCDQV2620(account);
      } catch (_) { finish(null, true); }
    });
    return checkPromise;
  }

  function guardedRun() {
    let success = null, failure = null, userObject, hasUserObject = false, proxy;
    const chain = {
      withSuccessHandler(fn) { success = fn; return proxy; },
      withFailureHandler(fn) { failure = fn; return proxy; },
      withUserObject(obj) { userObject = obj; hasUserObject = true; return proxy; }
    };
    proxy = new Proxy(chain, { get(target, name) {
      if (name in target) return target[name];
      if (typeof name !== 'string') return undefined;
      return (...args) => {
        const restricted = protectedMethod(name), account = email(), token = epoch;
        if (restricted && !canRead()) {
          paint('Mode lecture seule : clients, fichiers et inventaire masqués. Aucun changement de données n’est autorisé sans accès Drive.');
          if (typeof failure === 'function') failure(new Error('Accès aux données ou modification non autorisé sans permission Drive.'), userObject);
          return;
        }
        const current = () => !restricted || (token === epoch && account === email() && canRead());
        const onSuccess=success,onFailure=failure;let settled=false;
        const cleanup=()=>window.removeEventListener('cdq:drive-cleared-v2632',cancel);
        const cancel=()=>{if(settled)return;settled=true;cleanup();if(typeof onFailure==='function')onFailure(new Error('Le compte ou l’accès Drive a changé. La sauvegarde reste en attente de confirmation.'),userObject);};
        const finish=(handler,values)=>{if(settled)return;if(!current()){cancel();return;}settled=true;cleanup();if(typeof handler==='function')handler(...values);};
        if(restricted)window.addEventListener('cdq:drive-cleared-v2632',cancel);
        try{
          let runner = originalRun();
          runner = runner.withSuccessHandler((...values) => finish(onSuccess,values));
          runner = runner.withFailureHandler((...values) => finish(onFailure,values));
          if (hasUserObject) runner = runner.withUserObject(userObject);
          return runner[name](...args);
        }catch(error){settled=true;cleanup();throw error;}
      };
    } });
    return proxy;
  }
  window.cdqApiRun = guardedRun;

  // Prevent manual refresh, favorites, and offline caches from bypassing the check.
  for (const name of ['choisirCompagnie', 'chargerFichiers', 'chargerContenuServeurRapide', 'afficherContenu', 'remplirListeCompagnies', 'actualiserCompagnieEnArrierePlan', 'planifierActualisationCompagnie']) {
    const original = window[name];
    if (typeof original === 'function') window[name] = function (...args) {
      if (!canRead()) return;
      return original.apply(this, args);
    };
  }
  for (const name of ['lireCachePersistantClient', 'lireCachePersistantCompagnies']) {
    const original = window[name];
    if (typeof original === 'function') window[name] = function (...args) {
      if (!canRead()) return Promise.resolve(null);
      const token = epoch, account = email();
      return Promise.resolve(original.apply(this, args)).then(result => token === epoch && account === email() && canRead() ? result : null);
    };
  }
  window.chargerClients = function (force, ...args) {
    if (force || !canRead()) return check(!!force);
    return originalClients?.call(this, false, ...args);
  };
  window.cdqDriveEntryV2632 = Object.freeze({ version: '26.58', canRead, status: () => accessStatus, refresh: () => check(true), approvedEmail: () => canRead() ? allowed : '' });
  // Preserve the historical login call site, while replacing the blocking gate.
  window.cdqDriveAccessGateV2620 = Object.freeze({
    version: '26.33', afterLogin: (_companies, state) => {
      // A biometric/local ticket reveals only a provisional, read-only frame.
      // Wait for the actual server session before checking Drive or storing a role.
      ++epoch; allowed = ''; checking = false; checkingEmail = ''; checkPromise = null;
      accessStatus = 'pending';
      roleAccount = email();
      sessionConfirmed = state?.autorise === true && String(state.email || '').trim().toLowerCase() === roleAccount &&
        !state.cdqReadOnlyStartupV2539 && !state.cdqWarmReadOnlyV2540;
      const role = String(state?.role || '').trim().toLowerCase();
      assignedRole = sessionConfirmed && ['admin', 'technicien', 'lecture'].includes(role) ? role : 'lecture';
      if (!confirmed()) {
        applyRole(); clearClientView();
        paint('Vérification de votre connexion…', true);
        return Promise.resolve(false);
      }
      const initial=state?.cdqDriveAccessV2638;
      const age=Date.now()-Number(initial?.checkedAt||0);
      if(initial&&initial.email===roleAccount&&age>=-5000&&age<30000&&typeof initial.ok==='boolean'){
        if(initial.ok){
          accessStatus='allowed';allowed=roleAccount;applyRole();paint('');
          if(Array.isArray(state.compagniesInitiales)&&typeof toutesLesCompagnies!=='undefined')toutesLesCompagnies=state.compagniesInitiales;
          if(typeof originalClients==='function')originalClients.call(window,false,state.compagniesInitiales);
          window.dispatchEvent(new Event('cdq:drive-ready-v2632'));return Promise.resolve(true);
        }
        deny();return Promise.resolve(false);
      }
      return check();
    }, retry: () => check(true), chooseOther: () => check(true),
    googleResult: () => check(true), approvedEmail: () => canRead() ? allowed : '', applicationLogin: 'email-code-pin'
  });
  window.cdqNativeDriveGateV2620 = () => {}; // A late native callback cannot grant client access.
  window.__cdqDriveGateGooglePendingV2620 = false;
  window.__cdqDriveGateNativeRequestV2620 = '';
  window.addEventListener('cdq:access-state-v2527', event => {
    if (event.detail !== 'ready') {
      ++epoch; allowed = ''; assignedRole = ''; roleAccount = ''; sessionConfirmed = false; checking = false; checkPromise = null;
      accessStatus = 'pending';
      syncAdminSettings(false);
      clearClientView(); paint('');
    }
  });
})();
