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
      const isPostcode = signature.includes('postcode') || signature.includes('post code');
      if (
        !isPostcode && (
          signature.includes('captcha') ||
          signature.includes('verification') ||
          signature.includes('validation') ||
          signature.includes('security code') ||
          /\bcode\b/.test(signature)
        )
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
      // Special case for Masters applicable checkbox to trigger site logic
      if ((el.name === 'if_applicable_mas' || el.id === 'if_applicable_mas') && el.checked !== shouldCheck) {
        el.click();
        return true;
      }
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

  function callBackend(baseUrl, formStructure, deepseekMode) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${baseUrl}/api/smart-fill`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ formStructure, userData: { fields: [] }, deepseekMode }),
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

  async function connectBackend(formStructure, status, deepseekMode) {
    let lastError = null;
    const attempts = [PRIMARY_BACKEND_URL, FALLBACK_BACKEND_URL, PRIMARY_BACKEND_URL];

    for (let i = 0; i < attempts.length; i++) {
      const baseUrl = attempts[i];
      try {
        if (status) status.textContent = i === 0 ? 'Connecting to backend...' : 'Retrying...';
        return await callBackend(baseUrl, formStructure, deepseekMode);
      } catch (error) {
        lastError = error;
        if (i < attempts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    throw lastError || new Error('Backend is unreachable');
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
      'min-width:280px'
    ].join(';');

    panel.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button id="teletalk-v4-fill" type="button" style="background:#2ecc71;color:#000;border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer;">Smart Fill</button>
          <button id="teletalk-v4-force" type="button" style="background:#f39c12;color:#000;border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer;">Force Fill</button>
          <button id="teletalk-v4-clear" type="button" style="background:#e74c3c;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer;">Clear Cache</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-weight:700;color:#2ecc71;">Mode:</span>
          <select id="teletalk-v4-mode" style="background:#222;color:#fff;border:1px solid #444;border-radius:4px;padding:4px 6px;cursor:pointer;">
            <option value="instant" selected>DeepSeek Instant (V3)</option>
            <option value="expert">DeepSeek Expert (R1)</option>
          </select>
        </div>
        <span id="teletalk-v4-status" style="max-width:260px;display:inline-block;color:#aaa;">Ready</span>
      </div>
    `;

    (document.body || document.documentElement).appendChild(panel);

    const btnFill = document.getElementById('teletalk-v4-fill');
    const btnForce = document.getElementById('teletalk-v4-force');
    const btnClear = document.getElementById('teletalk-v4-clear');
    const modeSelect = document.getElementById('teletalk-v4-mode');
    const status = document.getElementById('teletalk-v4-status');

    async function runFill(forceRefresh) {
      btnFill.disabled = true;
      btnForce.disabled = true;
      btnClear.disabled = true;
      const deepseekMode = modeSelect.value;

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

        // Connect to backend and get mapping
        let payload;
        try {
          payload = await connectBackend(formStructure, status, deepseekMode);
        } catch (error) {
          throw error;
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
          mode: deepseekMode,
          meta: payload?.meta,
          applied,
          missed,
          mappingCount: Object.keys(mapping).length
        });
      } catch (err) {
        const msg = err?.message || String(err);
        let displayMsg = msg;
        
        // Provide helpful error messages
        if (msg.includes('Cannot reach backend') || msg.includes('3000')) {
          displayMsg = 'Backend not running. Please run START_BACKEND.bat to start the backend, then try again.';
        }
        
        status.textContent = `Error: ${displayMsg}`;
        console.error('[Teletalk Smart Fill] error', err);
        alert(displayMsg);
      } finally {
        btnFill.disabled = false;
        btnForce.disabled = false;
        btnClear.disabled = false;
      }
    }

    btnFill.addEventListener('click', () => runFill(false));
    btnForce.addEventListener('click', () => runFill(true));

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
  }

  setTimeout(buildUI, 800);
})();
