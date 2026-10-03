/* Navigation belongs to the open app, never to a later cold launch. */
(() => {
  'use strict';
  let root = window;
  try { if (window.top && window.top.location.origin === location.origin) root = window.top; } catch (_) {}
  if (root.cdqAppSessionV2661) { window.cdqAppSessionV2661 = root.cdqAppSessionV2661; return; }
  let id = '';
  try {
    const native = window.BalanceCDQNative || root.BalanceCDQNative;
    if (typeof native?.navigationSessionId === 'function') id = String(native.navigationSessionId() || '');
  } catch (_) {}
  if (!id) id = 'web:' + (window.crypto?.randomUUID?.() || Date.now() + ':' + Math.random().toString(36).slice(2));
  root.cdqAppSessionV2661 = window.cdqAppSessionV2661 = Object.freeze({id});
})();
