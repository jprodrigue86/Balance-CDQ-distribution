/* Balance CDQ V26.27 — one document handoff, one restoration, one targeted refresh.
 * Public V26.18 bridge names remain compatible with installed Android shells. */
(() => {
  'use strict';
  if (window.cdqDocumentReturnV2618) return;
  const KEY = 'cdq_work_context_v2618', MAX_AGE = 12 * 60 * 60 * 1000;
  let restoring = false, pending = null, restoreToken = 0, snapshotTimer = 0;
  let lastHandled = '', lastRefreshAt = 0, interaction = 0;
  const currentClient = () => String(typeof compagnieSelectionnee === 'undefined' ? '' : compagnieSelectionnee || '');
  const currentEmail = () => String(typeof utilisateurCourantEmail === 'undefined' ? '' : utilisateurCourantEmail || '').trim().toLowerCase();
  const ready = () => typeof cdqAccessState === 'undefined' || cdqAccessState === 'ready';
  function openFolders() {
    try { return Array.from(window.cdqFolderStateV2602?.current?.() || []).map(String).filter(Boolean); }
    catch (_) { return Array.from(document.querySelectorAll('#filesContainer .folder.open[data-folder-id]')).map(el => el.dataset.folderId); }
  }
  function read() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state?.clientId || Date.now() - Number(state.savedAt || 0) > MAX_AGE) return null;
      if (currentEmail() && state.email && state.email.toLowerCase() !== currentEmail()) return null;
      state.open = Array.isArray(state.open) ? state.open.map(String).filter(Boolean) : [];
      return state;
    } catch (_) { return null; }
  }
  function snapshot(kind = '', handoff = false) {
    // Never replace the departure snapshot while Sheets/PDF or restoration is active.
    if ((restoring || pending) && !handoff) return pending || read();
    const clientId = currentClient();
    if (!clientId || !currentEmail()) return null;
    const state = {
      clientId, email: currentEmail(), open: openFolders(),
      activeFolderId: String(typeof cdqDossierOuvertId === 'undefined' ? '' : cdqDossierOuvertId || ''),
      activeFolderName: String(typeof cdqDossierOuvertNom === 'undefined' ? '' : cdqDossierOuvertNom || ''),
      scrollY: Math.max(0, window.scrollY || 0),
      filesScroll: Math.max(0, document.getElementById('filesContainer')?.scrollTop || 0),
      kind: String(kind || ''), savedAt: Date.now(),
      handoffId: handoff ? Date.now() + ':' + Math.random().toString(36).slice(2) : '',
      modification: {
        fileId: String(sessionStorage.getItem('fichierEnModification') || ''),
        baseline: String(sessionStorage.getItem('ancienneDateModification') || ''),
        moment: String(sessionStorage.getItem('momentModification') || '')
      }
    };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    if (handoff) pending = state;
    return state;
  }
  function immediateRefresh() {
    if (!ready() || !currentClient() || navigator.onLine === false) return false;
    if (Date.now() - lastRefreshAt < 500) return false;
    const a = window.actualiserApresModification;
    if (a?.active && !a.active.done) return true;
    try {
      if (typeof a === 'function') { lastRefreshAt = Date.now(); a(); return true; }
      for (const method of ['refresh', 'run', 'trigger', 'start', 'check', 'verifier']) {
        if (typeof a?.[method] === 'function') { lastRefreshAt = Date.now(); a[method](); return true; }
      }
      // Existing periodic sync still handles folder additions/deletions.
      for (const name of ['cdqLiveSyncFolderV2200', 'cdqRefreshActiveFolderV2603']) {
        if (typeof window[name] === 'function') { lastRefreshAt = Date.now(); window[name](true); return true; }
      }
    } catch (_) {}
    return false;
  }
  function restoreModification(state) {
    const mod = state.modification;
    if (!mod?.fileId) return;
    sessionStorage.setItem('fichierEnModification', mod.fileId);
    if (mod.baseline) sessionStorage.setItem('ancienneDateModification', mod.baseline);
    if (mod.moment) sessionStorage.setItem('momentModification', mod.moment);
  }
  function restoreScrollAfterRecreation(state, startedInteraction) {
    let finished = false, timeout;
    const finish = () => { finished = true; clearTimeout(timeout); window.removeEventListener('cdq:folder-render-v2627', apply); };
    const apply = () => {
      if (finished || startedInteraction !== interaction || currentClient() !== state.clientId || currentEmail() !== state.email) { finish(); return; }
      const host = document.getElementById('filesContainer');
      if (!host || !window.cdqStableFoldersV2627?.hasTree()) return;
      const wanted = new Set(state.open);
      for (const el of host.querySelectorAll('.folder[data-folder-id]')) if (wanted.has(el.dataset.folderId)) wanted.delete(el.dataset.folderId);
      if (wanted.size || host.querySelector('.cdq-folder-loading')) return;
      host.scrollTop = state.filesScroll || 0;
      window.scrollTo({top: state.scrollY || 0, left: 0, behavior: 'instant'});
      finish();
    };
    window.addEventListener('cdq:folder-render-v2627', apply);
    timeout = setTimeout(finish, 5000);
    apply();
  }
  function restoreAfterDocument(kind = '') {
    const state = pending || read();
    if (!state) { immediateRefresh(); return false; }
    const identity = state.handoffId || String(state.savedAt);
    if (restoring || identity === lastHandled) return true;
    const token = ++restoreToken, startedInteraction = interaction;
    const rebuilding = !currentClient() || !window.cdqStableFoldersV2627?.hasTree();
    restoring = true;
    let selectedOnce = false;
    const finish = (handled = true) => {
      if (token !== restoreToken) return;
      if (handled) lastHandled = identity;
      pending = null; restoring = false;
    };
    function attempt(n) {
      if (token !== restoreToken) return;
      if (n > 120 || startedInteraction !== interaction) { finish(); return; }
      if (!ready() || !currentEmail()) { setTimeout(() => attempt(n + 1), 100); return; }
      if (state.email && state.email.toLowerCase() !== currentEmail()) { finish(); return; }
      const selected = currentClient();
      // A new client chosen by the technician always wins over an old handoff.
      if (selected && selected !== state.clientId) { finish(); return; }
      if (!selected) {
        if (!selectedOnce) {
          const button = Array.from(document.querySelectorAll('[data-company-id]')).find(el => el.dataset.companyId === state.clientId);
          if (button) { selectedOnce = true; button.click(); }
        }
        setTimeout(() => attempt(n + 1), 100); return;
      }
      restoreModification(state);
      window.cdqFolderStateV2602?.replace?.(new Set(state.open));
      try { cdqDossierOuvertId = state.activeFolderId || null; cdqDossierOuvertNom = state.activeFolderName || ''; } catch (_) {}
      window.cdqStableFoldersV2627?.restore();
      if (!window.cdqStableFoldersV2627) window.cdqFolderStateV2602?.restoreSoon?.();
      if (rebuilding) restoreScrollAfterRecreation(state, startedInteraction);
      immediateRefresh();
      finish();
    }
    attempt(0);
    return true;
  }
  function scheduleSnapshot() {
    if (restoring || pending || document.visibilityState === 'hidden') return;
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => snapshot(''), 80);
  }
  window.cdqPersistDocumentContextV2618 = kind => { snapshot(kind || '', true); return true; };
  window.cdqNativeDocumentReturnedV2618 = kind => { restoreAfterDocument(kind || ''); return true; };
  document.addEventListener('pointerdown', () => { interaction++; }, {capture:true, passive:true});
  document.addEventListener('click', scheduleSnapshot, true);
  document.addEventListener('change', scheduleSnapshot, true);
  window.addEventListener('scroll', scheduleSnapshot, {passive:true});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (!pending) snapshot(''); }
  }, {passive:true});
  window.addEventListener('pagehide', () => { if (!pending) snapshot(''); }, {passive:true});
  // pageshow/focus remain real browser events: never synthesize them to force a refresh.
  window.cdqDocumentReturnV2618 = {snapshot, read, restore:restoreAfterDocument, refresh:immediateRefresh, version:'26.27'};
})();
