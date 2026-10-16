'use strict';

const CDQ = {
  token: '',
  expiresAt: 0,
  tokenClient: null,
  currentProject: null,
  content: null,
  deployments: [],
  versions: [],
  scriptApiBase: '',
  grantedScopes: '',
};

const CDQ_GOOGLE_LOGIN_HINT_V46 = 'jprodrigue@groupecdq.com';

const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.deployments',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  // Only app-created diagnostic files, not general Drive write access.
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

function normalizeScriptId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const patterns = [
    /\/projects\/([A-Za-z0-9_-]+)/,
    /\/d\/([A-Za-z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) return m[1];
  }
  return raw.replace(/\s+/g, '');
}

function apiErrorPayload(text) {
  try { return text ? JSON.parse(text) : {}; }
  catch { return { raw: text }; }
}

function friendlyGoogleError(status, data) {
  const message = data?.error?.message || data?.error_description || data?.raw || `Erreur Google ${status}`;
  const disabled = /has not been used|hasn't been used|disabled|SERVICE_DISABLED/i.test(message);

  if (disabled && /(Google Drive API|drive\.googleapis\.com|drive\.googleapis)/i.test(message)) {
    return 'L’API Google Drive n’est pas activée dans le projet Google Cloud de ce Client ID. Active « Google Drive API » dans Balance CDQ, puis reconnecte Google.';
  }
  if (disabled && /(Apps Script API|script\.googleapis\.com|script\.googleapis)/i.test(message)) {
    return 'L’API Google Apps Script n’est pas activée dans le projet Google Cloud de ce Client ID.';
  }
  if (/insufficient.*scope|insufficient authentication scopes/i.test(message)) {
    return 'Google n’a pas accordé toutes les autorisations nécessaires. Déconnecte puis reconnecte Google.';
  }
  if (/read-only deployments may not be modified/i.test(message)) {
    return 'Ce déploiement est en lecture seule (HEAD/test). Choisis « Nouveau déploiement » ou un déploiement versionné existant.';
  }
  if (/permission|forbidden|not have permission/i.test(message)) {
    return 'Ton compte Google n’a pas la permission d’accéder à ce projet Apps Script.';
  }
  if (status === 401) return 'La session Google a expiré. Reconnecte-toi puis réessaie.';
  return message;
}

async function waitForGoogleIdentity() {
  for (let i = 0; i < 100; i++) {
    if (window.google?.accounts?.oauth2) return true;
    await new Promise(r => setTimeout(r, 60));
  }
  throw new Error('Le module de connexion Google ne s’est pas chargé. Ouvre l’application dans Google Chrome avec Internet.');
}

async function prepareGoogleClient(clientId) {
  await waitForGoogleIdentity();
  if (!clientId) throw new Error('OAuth Client ID manquant.');
  if (CDQ.tokenClient && CDQ.tokenClient.__clientId === clientId) return CDQ.tokenClient;
  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    include_granted_scopes: true,
    login_hint: CDQ_GOOGLE_LOGIN_HINT_V46,
    prompt: '',
    callback: () => {},
    error_callback: () => {},
  });
  client.__clientId = clientId;
  CDQ.tokenClient = client;
  return client;
}

async function requestGoogleToken(clientId, mode = 'reuse') {
  let client = (CDQ.tokenClient && CDQ.tokenClient.__clientId === clientId) ? CDQ.tokenClient : null;
  if (!client) client = await prepareGoogleClient(clientId);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutMs = mode === 'silent' ? 45000 : 10 * 60 * 1000;
    const timer = setTimeout(() => finishError({message: 'La connexion Google n’a pas répondu. Touche « Se connecter à Google » pour réessayer.'}), timeoutMs);
    const finishError = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const code = err?.type || err?.error || '';
      if (code === 'popup_failed_to_open') return reject(new Error('Chrome a bloqué la fenêtre Google. Vérifie que tu utilises bien Chrome et réessaie en touchant directement « Se connecter à Google ».'));
      if (code === 'popup_closed') return reject(new Error('La fenêtre Google a été fermée avant la fin de la connexion.'));
      reject(new Error(err?.message || err?.error_description || code || 'Connexion Google impossible.'));
    };
    client.callback = (response) => {
      if (settled) return;
      if (response?.error) return finishError(response);
      settled = true;
      clearTimeout(timer);
      CDQ.token = response.access_token || '';
      CDQ.grantedScopes = response.scope || '';
      const expiresIn = Number(response.expires_in || 3600);
      CDQ.expiresAt = Date.now() + Math.max(60, expiresIn - 60) * 1000;
      resolve(response);
    };
    client.error_callback = finishError;
    try {
      const override =
        mode === 'silent'
          ? { prompt: 'none', login_hint: CDQ_GOOGLE_LOGIN_HINT_V46 }
          : { prompt: '', login_hint: CDQ_GOOGLE_LOGIN_HINT_V46 };
      client.requestAccessToken(override);
    } catch (err) {
      finishError(err);
    }
  });
}

function hasLiveToken() {
  return Boolean(CDQ.token && Date.now() < CDQ.expiresAt);
}

async function ensureAuth(clientId) {
  if (hasLiveToken()) return CDQ.token;
  await requestGoogleToken(clientId, 'reuse');
  return CDQ.token;
}

function revokeGoogleToken() {
  const token = CDQ.token;
  CDQ.token = '';
  CDQ.expiresAt = 0;
  CDQ.grantedScopes = '';
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try { google.accounts.oauth2.revoke(token, () => {}); } catch {}
  }
}

const CDQ_SCRIPT_API_PRIMARY_V39 = 'https://scriptmanagement.googleapis.com/v1';
const CDQ_SCRIPT_API_FALLBACK_V39 = 'https://script.googleapis.com/v1';

function cdqSleepV39(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cdqScriptAlternateUrlV39(url) {
  url = String(url || '');
  if (url.startsWith(CDQ_SCRIPT_API_PRIMARY_V39)) {
    return CDQ_SCRIPT_API_FALLBACK_V39 + url.slice(CDQ_SCRIPT_API_PRIMARY_V39.length);
  }
  if (url.startsWith(CDQ_SCRIPT_API_FALLBACK_V39)) {
    return CDQ_SCRIPT_API_PRIMARY_V39 + url.slice(CDQ_SCRIPT_API_FALLBACK_V39.length);
  }
  return '';
}

async function cdqFetchOnceV39(url, options, headers, timeoutMs, label = 'Google') {
  const controller = new AbortController();
  const started = Date.now();
  const method = String(options.method || 'GET').toUpperCase();
  let phase = method === 'GET' ? 'Lecture ' + label : 'Envoi à ' + label;
  const notify = () => {
    if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('cdqsm:network-wait', {
      detail: {phase, elapsedSeconds: Math.floor((Date.now() - started) / 1000)}
    }));
  };
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error('Le délai de réponse Google est dépassé.');
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs || 30000);
  });
  const heartbeat = setInterval(notify, 1000);
  try {
    // Keep the deadline until the body is fully received, not only its headers.
    // The race also bounds transports which fail to honour AbortController.
    return await Promise.race([deadline, (async () => {
      const response = await fetch(url, {
        ...options, headers, signal: controller.signal, mode: 'cors',
        cache: 'no-store', credentials: 'omit', redirect: 'follow',
      });
      phase = 'Réception de la réponse ' + label;
      const text = await response.text();
      return {response, text};
    })()]);
  } finally {
    clearTimeout(timer);
    clearInterval(heartbeat);
  }
}

function cdqNetworkMessageV39(error) {
  const msg = String(error?.message || error || '');
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'délai réseau dépassé';
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) return 'connexion réseau interrompue';
  return msg || 'erreur réseau inconnue';
}

async function googleFetch(url, clientId, options = {}) {
  await ensureAuth(clientId);

  if (CDQ.scriptApiBase && cdqScriptAlternateUrlV39(url)) {
    url = String(url).replace(/^https:\/\/(scriptmanagement|script)\.googleapis\.com\/v1/, CDQ.scriptApiBase);
  }

  const method = String(options.method || 'GET').toUpperCase();
  // A timed-out write may already have reached Google. Never replay it blindly.
  const safeToRetry = method === 'GET' || method === 'HEAD';
  const projectContentRead = safeToRetry && /\/projects\/[^/]+\/content(?:\?|$)/.test(String(url));
  const alternate = cdqScriptAlternateUrlV39(url);
  const candidates = safeToRetry && alternate ? [String(url), alternate] : [String(url)];
  let lastNetworkError = null;
  let tokenRefreshed = false;

  for (let hostIndex = 0; hostIndex < candidates.length; hostIndex++) {
    const target = candidates[hostIndex];
    // The Balance CDQ Apps Script project is multi-megabyte. On mobile/5G,
    // getContent can legitimately need longer than 30 s. Preserve the fresh
    // pre-write safety read, but give that one read extra time and a retry.
    const attempts = projectContentRead ? 2 : 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${CDQ.token}`);
      if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');

      let response, text;
      try {
        ({response, text} = await cdqFetchOnceV39(
          target,
          options,
          headers,
          safeToRetry ? (projectContentRead ? 90000 : 30000) : 90000,
          projectContentRead ? 'Google Apps Script — gros projet' : 'Google'
        ));
      } catch (error) {
        lastNetworkError = error;
        if (!safeToRetry) {
          const uncertain = new Error('Réponse Google non reçue : ' + cdqNetworkMessageV39(error) + '.');
          uncertain.writeUncertain = true;
          throw uncertain;
        }
        if (attempt + 1 < attempts) {
          await cdqSleepV39(projectContentRead ? 1500 : (attempt === 0 ? 450 : 1200));
          continue;
        }
        break;
      }

      if (response.status === 401 && !tokenRefreshed) {
        tokenRefreshed = true;
        CDQ.token = '';
        CDQ.expiresAt = 0;
        await ensureAuth(clientId);
        attempt--;
        continue;
      }

      const data = apiErrorPayload(text);
      if (!response.ok) {
        const error = new Error(friendlyGoogleError(response.status, data));
        error.status = response.status;
        error.writeUncertain = !safeToRetry && response.status >= 500;
        throw error;
      }
      if (cdqScriptAlternateUrlV39(target)) CDQ.scriptApiBase = new URL(target).origin + '/v1';
      return data;
    }

    // Si le premier domaine Apps Script a un problème de transport,
    // essayer le second domaine officiel avant d'abandonner.
    if (hostIndex + 1 < candidates.length) {
      await cdqSleepV39(250);
    }
  }

  throw new Error(
    'API Google Apps Script inaccessible après plusieurs essais (' +
    cdqNetworkMessageV39(lastNetworkError) +
    '). La connexion Google est active; réessaie dans quelques secondes.'
  );
}

function scriptApiUrl(path) {
  // Google documente maintenant scriptmanagement.googleapis.com pour
  // projects.get / getContent / updateContent. Le domaine historique
  // script.googleapis.com reste utilisé automatiquement comme secours.
  return `${CDQ_SCRIPT_API_PRIMARY_V39}${path}`;
}

async function listAppsScriptProjects(clientId) {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.script' and trashed=false");
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink,owners(displayName,emailAddress))');
  const orderBy = encodeURIComponent('modifiedTime desc');
  return googleFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=${orderBy}&pageSize=200`, clientId);
}

async function getProjectMetadata(scriptId, clientId) {
  return googleFetch(scriptApiUrl(`/projects/${encodeURIComponent(scriptId)}`), clientId);
}

async function getProjectContent(scriptId, clientId, versionNumber = null) {
  if(versionNumber !== null && (!Number.isInteger(versionNumber) || versionNumber < 1))throw new Error('Version Apps Script invalide.');
  const query = versionNumber === null ? '' : '?versionNumber=' + versionNumber;
  const content = await googleFetch(scriptApiUrl(`/projects/${encodeURIComponent(scriptId)}/content${query}`), clientId);
  // Reading an immutable deployed version must never replace the editable HEAD.
  if(versionNumber === null)CDQ.content = content;
  return content;
}

async function updateProjectContent(scriptId, files, clientId) {
  try {
    // Google otherwise echoes the complete multi-megabyte project. The caller
    // already performs a fresh, independent read to verify every written file.
    return await googleFetch(scriptApiUrl(`/projects/${encodeURIComponent(scriptId)}/content?fields=scriptId`), clientId, {
      method: 'PUT', body: JSON.stringify({ files }),
    });
  } catch (error) {
    if (!error.writeUncertain) throw error;
    let actual;
    try { actual = await getProjectContent(scriptId, clientId); }
    catch (_) { throw new Error('La réponse d’écriture et sa vérification sont indisponibles. La sauvegarde est conservée. Recharge le projet avant de reprendre; le code peut déjà être écrit.'); }
    const expected = new Map(files.map(f => [f.type + ':' + f.name, f.source || '']));
    const received = actual.files || [];
    if (received.length === expected.size && new Set(received.map(f => f.type + ':' + f.name)).size === expected.size &&
        received.every(f => expected.has(f.type + ':' + f.name) && expected.get(f.type + ':' + f.name) === (f.source || ''))) {
      return actual;
    }
    throw new Error('Google n’a pas confirmé le code attendu. La sauvegarde est conservée et aucun déploiement n’a été lancé. Recharge le projet avant de reprendre.');
  }
}

async function listDeployments(scriptId, clientId) {
  const deployments = [];
  const seen = new Set();
  let pageToken = '';
  do {
    const query = pageToken ? '?pageToken=' + encodeURIComponent(pageToken) : '';
    const data = await googleFetch(scriptApiUrl(`/projects/${encodeURIComponent(scriptId)}/deployments${query}`), clientId);
    deployments.push(...(data.deployments || []));
    pageToken = data.nextPageToken || '';
    if(pageToken && (seen.has(pageToken) || seen.size >= 100))throw new Error('Liste des déploiements incomplète.');
    seen.add(pageToken);
  } while(pageToken);
  CDQ.deployments = deployments;
  return deployments;
}

async function createProjectVersion(scriptId, description, clientId) {
  return googleFetch(scriptApiUrl(`/projects/${encodeURIComponent(scriptId)}/versions`), clientId, {
    method: 'POST',
    body: JSON.stringify({ description: description || 'Mise à jour CDQ' }),
  });
}

async function createDeployment(scriptId, versionNumber, description, clientId) {
  return googleFetch(scriptApiUrl(`/projects/${encodeURIComponent(scriptId)}/deployments`), clientId, {
    method: 'POST',
    body: JSON.stringify({
      versionNumber,
      manifestFileName: 'appsscript',
      description: description || `Version ${versionNumber}`,
    }),
  });
}

async function updateDeployment(scriptId, deploymentId, versionNumber, description, clientId) {
  return googleFetch(scriptApiUrl(`/projects/${encodeURIComponent(scriptId)}/deployments/${encodeURIComponent(deploymentId)}`), clientId, {
    method: 'PUT',
    body: JSON.stringify({
      deploymentConfig: {
        scriptId,
        versionNumber,
        manifestFileName: 'appsscript',
        description: description || 'Mise à jour CDQ',
      },
    }),
  });
}

/* CDQ corporate API V50 */
const CDQ_CORPORATE_SERVER_V50 = Object.freeze({
  scriptId:'1udMG-jQcBAwBAwk6kSEZ660JWo5n7nVvnq24lp2T4RDV5pfXe8QDlPdf',
  productionDeploymentId:'AKfycbx8NuvklaL-azJBIVyCMKjPk_Hd9z62Q_2-NPl3vqw2kJRpI5wy63J8xkBN5toOFxEw',
  versionNumber:540,email:'jprodrigue@groupecdq.com',access:'ANYONE_ANONYMOUS',executeAs:'USER_DEPLOYING',
});
const cdqCorporateFlightsV50=new Set();
async function verifyCorporatePrincipalV50(clientId){
  if(!hasLiveToken())throw Error('Connectez le compte professionnel à Google.');
  const token=CDQ.token;
  const result=await googleFetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,permissionId)',clientId);
  if(token!==CDQ.token||!hasLiveToken())throw Error('La session Google a changé pendant la vérification du compte.');
  const email=String(result?.user?.emailAddress||'').trim().toLowerCase(),permissionId=String(result?.user?.permissionId||'').trim();
  if(email!==CDQ_CORPORATE_SERVER_V50.email||!permissionId||permissionId.length>200||/\s/.test(permissionId))throw Error('Le compte professionnel jprodrigue@groupecdq.com n’a pas été confirmé par Google Drive.');
  return {email,permissionId,token};
}
async function createCorporateDeploymentV50({scriptId,versionNumber,productionDeploymentId,clientId,stillCurrent,storage,onProgress=()=>{}}){
  const spec=CDQ_CORPORATE_SERVER_V50;
  if(scriptId!==spec.scriptId||versionNumber!==spec.versionNumber||productionDeploymentId!==spec.productionDeploymentId||typeof stillCurrent!=='function')throw Error('Projet ou version de migration non autorisé.');
  const flight=scriptId+'|'+versionNumber;
  if(cdqCorporateFlightsV50.has(flight))throw Error('La création professionnelle est déjà en cours.');
  cdqCorporateFlightsV50.add(flight);
  try{
    const initial=await verifyCorporatePrincipalV50(clientId),token=initial.token;
    const guard=()=>{if(!stillCurrent()||token!==CDQ.token||!hasLiveToken())throw Error('Le compte, le projet ou les modifications en attente ont changé.');};
    guard();onProgress('Compte Google Drive confirmé : '+initial.email+'.');
    async function principal(){guard();const p=await verifyCorporatePrincipalV50(clientId);guard();if(p.permissionId!==initial.permissionId)throw Error('L’identité Google Drive a changé.');return p;}
    async function deployments(){
      guard();const rows=[],seen=new Set(),pages=new Set();let page='';
      do{
        const data=await googleFetch(scriptApiUrl('/projects/'+encodeURIComponent(scriptId)+'/deployments'+(page?'?pageToken='+encodeURIComponent(page):'')),clientId);guard();
        if(!Array.isArray(data?.deployments))throw Error('La liste complète des déploiements n’a pas été reçue.');
        for(const d of data.deployments){if(!d?.deploymentId||seen.has(d.deploymentId))throw Error('Liste des déploiements ambiguë.');seen.add(d.deploymentId);rows.push(d);}
        page=String(data.nextPageToken||'');if(page&&(pages.has(page)||pages.size>=100))throw Error('Pagination des déploiements non confirmée.');pages.add(page);
      }while(page);
      return rows;
    }
    function webConfig(d,label){
      const entries=d?.entryPoints?.filter(e=>e.entryPointType==='WEB_APP')||[];
      if(entries.length!==1||!entries[0].webApp?.entryPointConfig)throw Error(label+' : configuration d’entrée Web absente ou ambiguë.');
      const web=entries[0].webApp,c=web.entryPointConfig;
      if(c.executeAs!==spec.executeAs||c.access!==spec.access)throw Error(label+' : exécution ou accès Web différent du manifeste publié.');
      const expected='https://script.google.com/macros/s/'+d.deploymentId+'/exec';
      if(web.url!==expected)throw Error(label+' : URL Web non confirmée.');
      return expected;
    }
    onProgress('Lecture des déploiements et du manifeste immuable Apps Script v540…');
    const before=await deployments(),published=before.filter(d=>d.deploymentId===productionDeploymentId);
    if(published.length!==1||published[0].deploymentConfig?.versionNumber!==versionNumber||published[0].deploymentConfig?.scriptId!==scriptId||published[0].deploymentConfig?.manifestFileName!=='appsscript')throw Error('Le déploiement historique ne confirme pas exactement le projet et la version publiée v540.');
    const source=await getProjectContent(scriptId,clientId,versionNumber);guard();
    const manifests=source?.files?.filter(f=>f.type==='JSON'&&f.name==='appsscript')||[];
    if(source?.scriptId!==scriptId||manifests.length!==1)throw Error('Le manifeste immuable v540 n’a pas été confirmé.');
    let manifest;try{manifest=JSON.parse(manifests[0].source);}catch{throw Error('Le manifeste immuable v540 est invalide.');}
    if(manifest.webapp?.executeAs!==spec.executeAs||manifest.webapp?.access!==spec.access)throw Error('Le manifeste v540 doit confirmer USER_DEPLOYING et ANYONE_ANONYMOUS.');
    onProgress('Manifeste v540 confirmé : USER_DEPLOYING / ANYONE_ANONYMOUS.');
    webConfig(published[0],'Déploiement historique v540');
    onProgress('Configuration Web du déploiement historique confirmée.');
    const marker='CDQ_CORPORATE_V50|'+initial.email+'|'+initial.permissionId+'|'+scriptId+'|v'+versionNumber;
    const key='cdqsm_corporate_deployment_v50:'+scriptId+':'+versionNumber+':'+initial.permissionId;
    function matches(rows){const found=rows.filter(d=>d.deploymentConfig?.description===marker);if(found.length>1)throw Error('Plusieurs déploiements professionnels portent le même marqueur. Vérification manuelle requise.');return found[0]||null;}
    function validate(d){
      const c=d?.deploymentConfig;
      if(!d?.deploymentId||d.deploymentId===productionDeploymentId||c?.description!==marker||c.scriptId!==scriptId||c.versionNumber!==versionNumber||c.manifestFileName!=='appsscript')throw Error('Le nouveau déploiement ne correspond pas à la demande professionnelle.');
      return {deploymentId:d.deploymentId,url:webConfig(d,'Nouveau déploiement'),versionNumber,email:initial.email,permissionId:initial.permissionId,provisional:true};
    }
    function save(value){if(!storage?.getItem||!storage?.setItem)throw Error('Journal local indisponible : aucune création envoyée.');storage.setItem(key,JSON.stringify(value));if(storage.getItem(key)!==JSON.stringify(value))throw Error('Journal local non confirmé : aucune création envoyée.');}
    let journal;try{journal=JSON.parse(storage?.getItem(key)||'null');}catch{throw Error('Journal de création illisible. Aucune nouvelle demande envoyée.');}
    if(journal&&(journal.marker!==marker||!['sent','confirmed','rejected'].includes(journal.phase)))throw Error('Journal de création incohérent.');
    const existing=matches(before);
    if(existing){const result=validate(existing);if(journal?.deploymentId&&journal.deploymentId!==result.deploymentId)throw Error('Le journal et le déploiement professionnel ne correspondent pas.');await principal();save({marker,phase:'confirmed',deploymentId:result.deploymentId});return {...result,alreadyExisted:true};}
    if(journal&&journal.phase!=='rejected')throw Error('Une demande professionnelle a déjà été émise mais son résultat n’est pas encore visible. Aucune nouvelle création envoyée. Réessayez la lecture plus tard.');
    await principal();
    const lastList=await deployments(),lastPublished=lastList.filter(d=>d.deploymentId===productionDeploymentId);
    if(lastPublished.length!==1||lastPublished[0].deploymentConfig?.versionNumber!==versionNumber)throw Error('Le déploiement historique a changé pendant la préparation.');
    webConfig(lastPublished[0],'Déploiement historique v540');
    const appeared=matches(lastList);
    if(appeared){const result=validate(appeared);await principal();save({marker,phase:'confirmed',deploymentId:result.deploymentId});return {...result,alreadyExisted:true};}
    guard();save({marker,phase:'sent'});
    onProgress('Création unique du déploiement professionnel depuis v540…');
    guard();
    let created,error;
    try{
      const headers=new Headers({'Authorization':'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'});
      const response=await cdqFetchOnceV39('https://script.googleapis.com/v1/projects/'+encodeURIComponent(scriptId)+'/deployments',{method:'POST',body:JSON.stringify({versionNumber,manifestFileName:'appsscript',description:marker})},headers,90000,'Création du serveur professionnel');
      const data=apiErrorPayload(response.text);
      if(!response.response.ok){const e=Error('Google HTTP '+response.response.status+' : '+String(data?.error?.message||data?.error_description||data?.raw||'Création refusée.').slice(0,1500));e.status=response.response.status;e.writeUncertain=response.response.status>=500;throw e;}
      created=data;
    }catch(e){error=e;}
    guard();await principal();
    if(error&&!error.writeUncertain&&error.status>=400&&error.status<500){save({marker,phase:'rejected'});throw error;}
    onProgress('Recherche du résultat Google par son marqueur unique…');
    const after=await deployments(),found=matches(after);
    if(!found)throw Error((error?.message||'Réponse Google non confirmée.')+' Aucune nouvelle création ne sera rejouée ; la demande reste à vérifier.');
    const result=validate(found);
    if(created?.deploymentId&&created.deploymentId!==result.deploymentId)throw Error('La réponse Google et la liste des déploiements ne désignent pas le même résultat.');
    await principal();save({marker,phase:'confirmed',deploymentId:result.deploymentId});
    return {...result,reconciled:!!error,alreadyExisted:false};
  }finally{cdqCorporateFlightsV50.delete(flight);}
}
/* end CDQ corporate API V50 */

function apiNameFromDisplayName(displayName) {
  const name = String(displayName || '').trim();
  if (/^appsscript\.json$/i.test(name)) return { name: 'appsscript', type: 'JSON' };
  if (/\.gs$/i.test(name)) return { name: name.replace(/\.gs$/i, ''), type: 'SERVER_JS' };
  if (/\.html?$/i.test(name)) return { name: name.replace(/\.html?$/i, ''), type: 'HTML' };
  return { name, type: 'SERVER_JS' };
}

function displayNameForFile(file) {
  if (file.type === 'JSON' && file.name === 'appsscript') return 'appsscript.json';
  if (file.type === 'SERVER_JS') return `${file.name}.gs`;
  if (file.type === 'HTML') return `${file.name}.html`;
  return file.name;
}

function findFile(files, displayName) {
  const spec = apiNameFromDisplayName(displayName);
  return files.find(f => f.type === spec.type && String(f.name).toLowerCase() === spec.name.toLowerCase());
}
