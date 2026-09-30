/* Balance CDQ V26.18 — durable client/folder work context across Sheets/PDF handoffs. */
(() => {
  'use strict';
  if (window.cdqDocumentReturnV2618) return;

  const KEY = 'cdq_work_context_v2618';
  const MAX_AGE = 12 * 60 * 60 * 1000;
  let restoring = false;
  let restoreToken = 0;
  let lastSnapshotAt = 0;

  const esc = value => {
    try { return CSS.escape(String(value)); }
    catch (_) { return String(value).replace(/["\\]/g, '\\$&'); }
  };

  function currentClient() {
    try { return String(typeof compagnieSelectionnee === 'undefined' ? '' : compagnieSelectionnee || ''); }
    catch (_) { return ''; }
  }

  function currentEmail() {
    try { return String(typeof utilisateurCourantEmail === 'undefined' ? '' : utilisateurCourantEmail || '').trim().toLowerCase(); }
    catch (_) { return ''; }
  }

  function openFolders() {
    try {
      if (window.cdqFolderStateV2602?.current) return Array.from(window.cdqFolderStateV2602.current()).map(String).filter(Boolean);
    } catch (_) {}
    return Array.from(document.querySelectorAll('#filesContainer .folder.open[data-folder-id]'))
      .map(el => String(el.dataset.folderId || '')).filter(Boolean);
  }

  function activeFolderId() {
    try {
      const direct = String(typeof cdqDossierOuvertId === 'undefined' ? '' : cdqDossierOuvertId || '');
      if (direct) return direct;
    } catch (_) {}
    const rows = Array.from(document.querySelectorAll('#filesContainer .folder.open[data-folder-id]'));
    return rows.length ? String(rows[rows.length - 1].dataset.folderId || '') : '';
  }

  function snapshot(kind = '') {
    const clientId = currentClient();
    if (!clientId) return null;
    const state = {
      clientId,
      email: currentEmail(),
      open: openFolders(),
      activeFolderId: activeFolderId(),
      scrollY: Math.max(0, Math.round(window.scrollY || document.documentElement.scrollTop || 0)),
      filesScroll: Math.max(0, Math.round(document.getElementById('filesContainer')?.scrollTop || 0)),
      kind: String(kind || ''),
      modification: {
        fileId: String(sessionStorage.getItem('fichierEnModification') || ''),
        baseline: String(sessionStorage.getItem('ancienneDateModification') || ''),
        moment: String(sessionStorage.getItem('momentModification') || '')
      },
      savedAt: Date.now()
    };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    lastSnapshotAt = Date.now();
    return state;
  }

  function read() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state || !state.clientId || Date.now() - Number(state.savedAt || 0) > MAX_AGE) return null;
      const email = currentEmail();
      if (email && state.email && String(state.email).toLowerCase() !== email) return null;
      state.open = Array.isArray(state.open) ? state.open.map(String).filter(Boolean) : [];
      state.modification = state.modification && typeof state.modification === 'object'
        ? state.modification : { fileId:'', baseline:'', moment:'' };
      return state;
    } catch (_) { return null; }
  }

  function restoreModificationState(state) {
    const mod = state && state.modification;
    if (!mod || !mod.fileId) return false;
    try {
      sessionStorage.setItem('fichierEnModification', String(mod.fileId));
      if (mod.baseline) sessionStorage.setItem('ancienneDateModification', String(mod.baseline));
      if (mod.moment) sessionStorage.setItem('momentModification', String(mod.moment));
      return true;
    } catch (_) { return false; }
  }

  function restoreFolderState(state) {
    if (!state) return;
    try {
      if (window.cdqFolderStateV2602?.replace) {
        window.cdqFolderStateV2602.replace(new Set(state.open || []));
      }
    } catch (_) {}

    const delays = [0, 60, 140, 280, 520, 900, 1400];
    delays.forEach(delay => setTimeout(() => {
      try { window.cdqFolderStateV2602?.restoreSoon?.(); } catch (_) {}
      for (const id of (state.open || [])) {
        const el = document.querySelector('.folder[data-folder-id="' + esc(id) + '"]');
        if (!el || el.classList.contains('open')) continue;
        const header = el.querySelector(':scope > .folder-header');
        if (header) header.click();
      }
    }, delay));

    setTimeout(() => {
      try {
        const host = document.getElementById('filesContainer');
        if (host && state.filesScroll) host.scrollTop = state.filesScroll;
        if (state.scrollY) window.scrollTo({ top: state.scrollY, behavior: 'auto' });
      } catch (_) {}
    }, 650);
  }

  function immediateRefresh() {
    let triggered = false;
    let fileRefresh = false;

    // First refresh only the document that was just edited. This calls
    // obtenirMetaFichier(id) and updates the visible row/checkmark without
    // rebuilding the whole client tree.
    try {
      const a = window.actualiserApresModification;
      if (typeof a === 'function') {
        a();
        triggered = true;
        fileRefresh = true;
      } else if (a && typeof a === 'object') {
        for (const method of ['refresh','run','trigger','start','check','verifier']) {
          if (typeof a[method] === 'function') {
            a[method]();
            triggered = true;
            fileRefresh = true;
            break;
          }
        }
      }
    } catch (_) {}

    const call = name => {
      try {
        const fn = window[name];
        if (typeof fn === 'function') {
          fn(true);
          triggered = true;
          return true;
        }
      } catch (_) {}
      return false;
    };

    // Only fall back to a folder/client sync when the direct edited-file
    // refresh is unavailable. A delayed lightweight sync still reconciles
    // additions/deletions without blocking the technician's next file.
    if (!fileRefresh) {
      call('cdqLiveSyncFolderV2200') ||
        call('cdqRefreshActiveFolderV2603') ||
        call('actualiserDossierOuvert') ||
        call('actualiserContenuCompagnie') ||
        call('actualiserCompagnieSelectionnee');
    } else {
      setTimeout(() => { try { window.cdqLiveSyncFolderV2200?.(true); } catch (_) {} }, 1100);
    }

    try { window.dispatchEvent(new Event('focus')); } catch (_) {}
    try { document.dispatchEvent(new Event('visibilitychange')); } catch (_) {}
    try { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); } catch (_) {}

    try { window.cdqFolderStateV2602?.restoreSoon?.(); } catch (_) {}
    try { if (typeof mettreAJourInterface === 'function') mettreAJourInterface(); } catch (_) {}
    return triggered;
  }

  function findCompanyButton(clientId) {
    const selector = '[data-company-id="' + esc(clientId) + '"]';
    const candidates = Array.from(document.querySelectorAll(selector));
    return candidates.find(el => !el.hidden && getComputedStyle(el).display !== 'none') || candidates[0] || null;
  }

  function restore(state, token, attempt = 0) {
    if (!state || token !== restoreToken) return;
    if (attempt > 120) { restoring = false; return; }

    try {
      if (typeof cdqAccessState !== 'undefined' && cdqAccessState !== 'ready') {
        setTimeout(() => restore(state, token, attempt + 1), 100);
        return;
      }
    } catch (_) {}

    const selected = currentClient();
    if (selected !== String(state.clientId)) {
      const button = findCompanyButton(state.clientId);
      if (button) {
        try { button.click(); } catch (_) {}
      }
      setTimeout(() => restore(state, token, attempt + 1), button ? 90 : 120);
      return;
    }

    restoreModificationState(state);
    restoreFolderState(state);
    immediateRefresh();

    // Refresh twice more while Drive metadata settles. These are targeted,
    // preserving the visible client/folder tree.
    setTimeout(immediateRefresh, 220);
    setTimeout(immediateRefresh, 700);
    setTimeout(() => {
      restoreFolderState(state);
      snapshot(state.kind || '');
      restoring = false;
    }, 950);
  }

  function restoreAfterDocument(kind = '') {
    const state = read();
    if (!state) {
      immediateRefresh();
      return false;
    }
    if (kind) state.kind = String(kind);
    restoreToken += 1;
    restoring = true;
    restore(state, restoreToken, 0);
    return true;
  }

  window.cdqPersistDocumentContextV2618 = function(kind) {
    snapshot(kind || '');
    return true;
  };

  window.cdqNativeDocumentReturnedV2618 = function(kind) {
    restoreAfterDocument(kind || '');
    return true;
  };

  function scheduleSnapshot() {
    setTimeout(() => snapshot(''), 0);
    setTimeout(() => snapshot(''), 120);
  }

  document.addEventListener('click', scheduleSnapshot, true);
  document.addEventListener('change', scheduleSnapshot, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') snapshot('');
  }, { passive: true });
  window.addEventListener('pagehide', () => snapshot(''), { passive: true });

  // Keep the durable state warm while a technician works through many reports.
  setInterval(() => {
    if (document.visibilityState === 'visible' && currentClient() && Date.now() - lastSnapshotAt > 1200) snapshot('');
  }, 1500);

  // When the V26.02 folder tracker is available, mirror its state to localStorage.
  let hookAttempts = 0;
  const hook = () => {
    hookAttempts += 1;
    const api = window.cdqFolderStateV2602;
    if (!api) {
      if (hookAttempts < 80) setTimeout(hook, 100);
      return;
    }
    for (const name of ['remember','replace']) {
      const original = api[name];
      if (typeof original !== 'function' || original.__cdq2618) continue;
      const wrapped = function() {
        const result = original.apply(this, arguments);
        scheduleSnapshot();
        return result;
      };
      wrapped.__cdq2618 = true;
      api[name] = wrapped;
    }
  };
  hook();

  window.cdqDocumentReturnV2618 = {
    snapshot,
    read,
    restore: restoreAfterDocument,
    refresh: immediateRefresh,
    version: '26.18'
  };
})();
