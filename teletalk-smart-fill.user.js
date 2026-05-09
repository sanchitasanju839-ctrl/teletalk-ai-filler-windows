// ==UserScript==
// @name         Teletalk Smart Fill AI
// @namespace    http://tampermonkey.net/
// @version      4.4
// @description  Smart form fill for Teletalk with autosave cache and force refresh
// @author       Codex
// @match        *://*.teletalk.com.bd/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @run-at       document-idle
// @allFrames    true
// ==/UserScript==

(function () {
  'use strict';

  if (window.__TELETALK_SMART_FILL_V41__) return;
  window.__TELETALK_SMART_FILL_V41__ = true;

  function countFillableFields(root) {
    return root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), select, textarea').length;
  }

  function thisFrameLooksLikeMainForm() {
    return countFillableFields(document) >= 10;
  }

  if (!thisFrameLooksLikeMainForm()) return;

  const PRIMARY_BACKEND_URL = 'http://127.0.0.1:3000';
  const FALLBACK_BACKEND_URL = 'http://localhost:3000';
  const CONTROLLER_URL = 'http://127.0.0.1:3001';

  function removeLegacyUIs() {
    const ids = [
      'teletalk-ai-bar',
      'teletalk-debug-log',
      'smart-fill-ai-host',
      'smart-fill-ai-shadow-root',
      'smart-fill-ai-btn',
      'emergency-btn',
      'nuclear-ui'
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function findMainForm() {
    const forms = Array.from(document.querySelectorAll('form'));
    if (forms.length === 0) return document;

    let best = forms[0];
    let bestCount = -1;
    for (const form of forms) {
      const count = countFillableFields(form);
      if (count > bestCount) {
        best = form;
        bestCount = count;
      }
    }
    return best;
  }

  function safeText(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getLabelFor(el) {
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) return safeText(label);
    }

    const parentLabel = el.closest('label');
    if (parentLabel) return safeText(parentLabel);

    const td = el.closest('td');
    if (td && td.previousElementSibling) return safeText(td.previousElementSibling);

    const tr = el.closest('tr');
    if (tr && tr.cells && tr.cells.length > 0) return safeText(tr.cells[0]);

    return '';
  }

  function scrapeFormStructure(root) {
    const fields = [];
    const nodes = root.querySelectorAll('input, select, textarea');

    nodes.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.type || tag).toLowerCase();

      if (['hidden', 'submit', 'button', 'file', 'image', 'reset'].includes(type)) return;

      const name = el.name || '';
      const id = el.id || '';
      const label = getLabelFor(el);

      const signature = `${name} ${id} ${label}`.toLowerCase();
      if (
        signature.includes('captcha') ||
        signature.includes('verification') ||
        signature.includes('validation') ||
        signature.includes('security code') ||
        signature.includes('code')
      ) {
        return;
      }

      const selector = name ? `[name="${name}"]` : (id ? `#${id}` : '');
      if (!selector) return;

      const field = {
        selector,
        id,
        name,
        type,
        tag,
        label,
        options: null
      };

      if (tag === 'select') {
        field.options = Array.from(el.options)
          .filter((o) => o.value !== '')
          .map((o) => ({ value: o.value, text: safeText(o) }));
      }

      fields.push(field);
    });

    return fields;
  }

  function cacheKey(formStructure) {
    const names = formStructure
      .map((f) => (f.name || f.id || f.selector || '').toLowerCase())
      .sort()
      .join('|');
    const scope = `${location.host}${location.pathname}`;
    return `teletalk-smartfill:v4.1:${scope}:${names}`;
  }

  function saveMappingCache(key, mapping) {
    const payload = {
      savedAt: Date.now(),
      mapping
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }

  function loadMappingCache(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.mapping) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function clearMappingCache(key) {
    localStorage.removeItem(key);
  }

  function setElementValue(el, value) {
    const tag = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();

    if (tag === 'select') {
      const str = String(value);
      let option = Array.from(el.options).find((o) => o.value === str);
      if (!option) {
        option = Array.from(el.options).find((o) => o.text.trim().toLowerCase() === str.trim().toLowerCase());
      }
      if (option) {
        el.value = option.value;
      } else {
        return false;
      }
    } else if (type === 'radio') {
      const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
      const str = String(value).toLowerCase();
      let picked = false;
      group.forEach((r) => {
        const rv = (r.value || '').toLowerCase();
        const rid = (r.id || '').toLowerCase();
        if (!picked && (rv === str || rid === str)) {
          r.checked = true;
          picked = true;
          r.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      return picked;
    } else if (type === 'checkbox') {
      const str = String(value).toLowerCase();
      const shouldCheck = ['1', 'true', 'yes', 'on'].includes(str);
      el.checked = shouldCheck;
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  function applyMapping(mapping) {
    let applied = 0;
    let missed = 0;

    Object.entries(mapping || {}).forEach(([selector, value]) => {
      if (value === undefined || value === null || String(value) === '') return;

      let el = null;
      try {
        el = document.querySelector(selector);
      } catch (_) {
        el = null;
      }

      if (!el && selector.startsWith('[name=')) {
        const name = selector.match(/\[name="?([^"\]]+)"?\]/)?.[1];
        if (name) el = document.querySelector(`[name="${CSS.escape(name)}"]`);
      }

      if (!el && selector.startsWith('#')) {
        el = document.getElementById(selector.slice(1));
      }

      if (!el) {
        missed++;
        return;
      }

      if (setElementValue(el, value)) applied++;
      else missed++;
    });

    return { applied, missed };
  }

  function requestBackendOnce(baseUrl, formStructure) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${baseUrl}/api/smart-fill`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ formStructure, userData: { fields: [] } }),
        timeout: 120000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (_) {
              reject(new Error('Invalid JSON from backend'));
            }
          } else {
            reject(new Error(`Backend HTTP ${res.status}`));
          }
        },
        onerror: () => reject(new Error(`Cannot reach backend at ${baseUrl}`)),
        ontimeout: () => reject(new Error('Backend request timeout'))
      });
    });
  }

  async function callBackend(formStructure, status) {
    let lastError = null;
    const quickPlan = [PRIMARY_BACKEND_URL, FALLBACK_BACKEND_URL, PRIMARY_BACKEND_URL];

    for (let i = 0; i < quickPlan.length; i++) {
      const baseUrl = quickPlan[i];
      try {
        if (status) status.textContent = i === 0 ? 'Connecting backend...' : 'Retrying backend...';
        return await requestBackendOnce(baseUrl, formStructure);
      } catch (error) {
        lastError = error;
        if (i < quickPlan.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    throw lastError || new Error('Backend is unreachable');
  }

  function callController(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: `${CONTROLLER_URL}${path}`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (_) {
              reject(new Error('Invalid controller JSON'));
            }
          } else {
            reject(new Error(`Controller HTTP ${res.status}`));
          }
        },
        onerror: () => reject(new Error('Controller unreachable')),
        ontimeout: () => reject(new Error('Controller timeout'))
      });
    });
  }

  function buildUI() {
    removeLegacyUIs();
    if (document.getElementById('teletalk-v4-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'teletalk-v4-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:2147483647',
      'background:#111',
      'color:#fff',
      'padding:10px 12px',
      'border:2px solid #2ecc71',
      'border-radius:10px',
      'font:12px/1.3 Arial, sans-serif',
      'box-shadow:0 8px 20px rgba(0,0,0,.35)',
      'min-width:260px'
    ].join(';');

    panel.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button id="teletalk-v4-fill" type="button" style="background:#2ecc71;color:#000;border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer;">Smart Fill</button>
        <button id="teletalk-v4-force" type="button" style="background:#f39c12;color:#000;border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer;">Force Fill</button>
        <button id="teletalk-v4-clear" type="button" style="background:#e74c3c;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer;">Clear Cache</button>
        <button id="teletalk-v4-start" type="button" style="background:#3498db;color:#fff;border:0;border-radius:8px;padding:6px 8px;font-weight:700;cursor:pointer;">Start</button>
        <button id="teletalk-v4-stop" type="button" style="background:#7f8c8d;color:#fff;border:0;border-radius:8px;padding:6px 8px;font-weight:700;cursor:pointer;">Stop</button>
        <button id="teletalk-v4-restart" type="button" style="background:#9b59b6;color:#fff;border:0;border-radius:8px;padding:6px 8px;font-weight:700;cursor:pointer;">Restart</button>
        <button id="teletalk-v4-fix" type="button" style="background:#16a085;color:#fff;border:0;border-radius:8px;padding:6px 8px;font-weight:700;cursor:pointer;">Fix Port</button>
        <span id="teletalk-v4-svc" style="display:inline-block;padding:2px 6px;border-radius:6px;background:#333;">Svc: ...</span>
        <span id="teletalk-v4-status" style="max-width:240px;display:inline-block;">Ready</span>
      </div>
    `;

    (document.body || document.documentElement).appendChild(panel);

    const btnFill = document.getElementById('teletalk-v4-fill');
    const btnForce = document.getElementById('teletalk-v4-force');
    const btnClear = document.getElementById('teletalk-v4-clear');
    const btnStart = document.getElementById('teletalk-v4-start');
    const btnStop = document.getElementById('teletalk-v4-stop');
    const btnRestart = document.getElementById('teletalk-v4-restart');
    const btnFix = document.getElementById('teletalk-v4-fix');
    const svc = document.getElementById('teletalk-v4-svc');
    const status = document.getElementById('teletalk-v4-status');

    function setSvcBadge(text, color) {
      svc.textContent = text;
      svc.style.background = color;
    }

    async function refreshServiceStatus() {
      try {
        const s = await callController('/status');
        if (s.active === 'active') setSvcBadge('Svc: Online', '#145a32');
        else setSvcBadge(`Svc: ${s.active}`, '#7f8c8d');
      } catch (_) {
        setSvcBadge('Svc: Ctrl Off', '#922b21');
      }
    }

    async function doServiceAction(actionPath, label) {
      btnStart.disabled = true;
      btnStop.disabled = true;
      btnRestart.disabled = true;
      btnFix.disabled = true;
      status.textContent = `${label}...`;
      try {
        await callController(actionPath, 'POST');
        await refreshServiceStatus();
        status.textContent = `${label} done`;
      } catch (e) {
        status.textContent = `${label} failed`;
      } finally {
        btnStart.disabled = false;
        btnStop.disabled = false;
        btnRestart.disabled = false;
        btnFix.disabled = false;
      }
    }

    async function runFill(forceRefresh) {
      btnFill.disabled = true;
      btnForce.disabled = true;
      btnClear.disabled = true;

      try {
        status.textContent = 'Scraping form...';
        const root = findMainForm();
        const formStructure = scrapeFormStructure(root);

        if (!formStructure.length) {
          throw new Error('No eligible fields found');
        }

        const key = cacheKey(formStructure);
        const cached = loadMappingCache(key);

        if (!forceRefresh && cached?.mapping) {
          const { applied, missed } = applyMapping(cached.mapping);
          status.textContent = `Cache: filled ${applied}, missed ${missed}`;
          console.log('[Teletalk Smart Fill] used cache', { key, applied, missed, savedAt: new Date(cached.savedAt).toISOString() });
          return;
        }

        status.textContent = forceRefresh ? 'Force refresh from backend...' : 'Fetching mapping...';

        // Fast path: proactively start backend if service is inactive.
        try {
          const state = await callController('/status');
          if (state?.active !== 'active') {
            status.textContent = 'Starting backend...';
            await callController('/start', 'POST');
            await refreshServiceStatus();
          }
        } catch (_) {
          // Controller might be unavailable; continue with direct backend attempt.
        }

        let payload;
        try {
          payload = await callBackend(formStructure, status);
        } catch (firstError) {
          status.textContent = 'Trying auto-fix port...';
          try {
            await callController('/fix-port', 'POST');
            await refreshServiceStatus();
            payload = await callBackend(formStructure, status);
          } catch (_) {
            throw firstError;
          }
        }
        const mapping = payload?.mapping || {};
        const { applied, missed } = applyMapping(mapping);

        if (Object.keys(mapping).length > 0) {
          saveMappingCache(key, mapping);
        }

        status.textContent = `${forceRefresh ? 'Force' : 'Fresh'}: filled ${applied}, missed ${missed}`;
        console.log('[Teletalk Smart Fill]', {
          source: forceRefresh ? 'force-backend' : 'backend',
          key,
          meta: payload?.meta,
          applied,
          missed,
          mappingCount: Object.keys(mapping).length
        });
      } catch (err) {
        const msg = err?.message || String(err);
        status.textContent = `Error: ${msg}`;
        console.error('[Teletalk Smart Fill] error', err);
        alert(msg);
      } finally {
        btnFill.disabled = false;
        btnForce.disabled = false;
        btnClear.disabled = false;
      }
    }

    btnFill.addEventListener('click', () => runFill(false));
    btnForce.addEventListener('click', () => runFill(true));
    btnStart.addEventListener('click', () => doServiceAction('/start', 'Start'));
    btnStop.addEventListener('click', () => doServiceAction('/stop', 'Stop'));
    btnRestart.addEventListener('click', () => doServiceAction('/restart', 'Restart'));
    btnFix.addEventListener('click', () => doServiceAction('/fix-port', 'Fix Port'));

    btnClear.addEventListener('click', () => {
      try {
        const root = findMainForm();
        const formStructure = scrapeFormStructure(root);
        const key = cacheKey(formStructure);
        clearMappingCache(key);
        status.textContent = 'Cache cleared for this form';
      } catch (_) {
        status.textContent = 'Could not clear cache';
      }
    });

    refreshServiceStatus();
    setInterval(refreshServiceStatus, 6000);
  }

  setTimeout(buildUI, 800);
})();
