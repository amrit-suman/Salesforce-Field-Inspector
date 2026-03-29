/**
 * Salesforce Field Inspector - content.js
 * Hover over any field on a Salesforce Lightning record page to see full field metadata.
 */

const SFFieldInspector = (() => {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────
  const HOVER_DELAY_MS  = 800;
  const HIDE_DELAY_MS   = 350;
  const CACHE_TTL_MS    = 5 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 10000;

  // Salesforce API names: letters/digits/underscores, optional namespace suffix
  const SF_API_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,79}(__c|__mdt|__e|__b|__x|__Share|__History|__Feed)?$/;

  // Salesforce Inspector extension IDs (Chrome Web Store)
  const SF_INSPECTOR_ADVANCED_ID = 'dbfimaflmomgldabcphgolbeoamjogji'; // Salesforce Inspector Advanced
  const SF_INSPECTOR_RELOADED_ID = 'hpijlohoihegkfehhibggnkbjhoemldh'; // Salesforce Inspector Reloaded

  // ─── State ────────────────────────────────────────────────────────────────
  // Object.create(null) — no prototype, eliminates prototype-pollution risk
  const metaCache     = Object.create(null);
  const toolingCache  = Object.create(null);
  let   cachedInspectorId = undefined; // undefined = unchecked, null = neither installed
  let   apiVersion     = null;
  let   tooltipEl      = null;
  let   hoverTimer     = null;
  let   hideTimer      = null;
  let   currentApiName = null;
  let   lastFieldEl    = null;

  // ─── Fetch with timeout ───────────────────────────────────────────────────

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out. Check your network connection.');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Shadow DOM helpers ───────────────────────────────────────────────────

  /**
   * Pierce through nested shadow DOMs to get the deepest element at (x, y).
   * Required for Salesforce LWC which uses heavily nested shadow DOM.
   */
  function deepElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    if (!el) return null;
    let depth = 0;
    while (el.shadowRoot && depth < 20) {
      const deeper = el.shadowRoot.elementFromPoint(x, y);
      if (!deeper || deeper === el) break;
      el = deeper;
      depth++;
    }
    return el;
  }

  /**
   * Walk up the DOM tree crossing shadow DOM boundaries via getRootNode().host.
   * parentElement stops at shadow root boundaries — this does not.
   */
  function findFieldApiName(el) {
    let cur = el;
    let depth = 0;
    while (cur && depth < 40) {
      const tag = cur.tagName?.toLowerCase() ?? '';

      if (cur.dataset?.fieldApiName) return cur.dataset.fieldApiName;

      if (tag === 'lightning-output-field' || tag === 'lightning-input-field') {
        const fn = cur.getAttribute('field-name');
        if (fn) return fn;
      }

      if (tag === 'force-record-field') {
        const fn = cur.getAttribute('field-name');
        if (fn) return fn;
      }

      const tgt = cur.dataset?.targetSelectionName ?? '';
      if (tgt.includes('SfField::')) return tgt.split('SfField::')[1];

      if (cur.parentElement) {
        cur = cur.parentElement;
      } else {
        const root = cur.getRootNode();
        if (root instanceof ShadowRoot) {
          cur = root.host;
        } else {
          break;
        }
      }
      depth++;
    }
    return null;
  }

  // Classes Salesforce uses on field label elements
  const LABEL_CLASSES = [
    'test-id__field-label',
    'slds-form-element__label',
    'form-element__label',
  ];

  function cleanLabel(text) {
    return text?.trim().replace(/\s+/g, ' ').replace(/\s*\*+\s*$/, '').trim() ?? '';
  }

  /**
   * Returns label text only if el itself or a very close ancestor (≤4 levels)
   * is a Salesforce field label element. Tight scope prevents false positives
   * on blank space between fields.
   */
  function extractDirectLabel(el) {
    let cur = el;
    for (let i = 0; i < 4; i++) {
      if (!cur) break;
      const cls = cur.className?.toString() ?? '';
      if (LABEL_CLASSES.some(c => cls.includes(c))) {
        const text = cleanLabel(cur.textContent);
        if (text) return text;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  /**
   * Wider label scan — walks up through shadow DOM boundaries.
   * Only called after field identity is already confirmed (via apiName or directLabel)
   * to help match value-area hovers by label text.
   */
  function findLabelNear(el) {
    let cur = el;
    let depth = 0;
    while (cur && depth < 30) {
      const labelEl = cur.querySelector?.(
        '.slds-form-element__label, [class*="field-label"], .test-id__field-label, dt'
      );
      if (labelEl) {
        const text = cleanLabel(labelEl.textContent);
        if (text) return text;
      }
      if (cur.parentElement) {
        cur = cur.parentElement;
      } else {
        const root = cur.getRootNode();
        if (root instanceof ShadowRoot) {
          cur = root.host;
        } else {
          break;
        }
      }
      depth++;
    }
    return null;
  }

  // ─── Salesforce session / instance helpers ───────────────────────────────

  /**
   * Derives the REST API base URL dynamically from the current page hostname.
   * Lightning pages run on *.lightning.force.com; the REST API lives on *.my.salesforce.com.
   * Both org name and domain are extracted from window.location — never hardcoded.
   */
  function getInstanceUrl() {
    const h = window.location.hostname;
    if (h.endsWith('.lightning.force.com')) {
      return `https://${h.replace('.lightning.force.com', '')}.my.salesforce.com`;
    }
    return window.location.origin;
  }

  let cachedSid = null;

  /**
   * Ask the page bridge (MAIN world) for window.$A / window.sforce session ID.
   * This is the session Lightning is actively using — always valid when the page is loaded.
   */
  function getPageBridgeSid() {
    return new Promise((resolve) => {
      const nonce = crypto.randomUUID();
      const timer = setTimeout(() => resolve(null), 2000);

      window.addEventListener('sf-fi-sid-response', function handler(e) {
        if (e.detail?.nonce !== nonce) return;
        clearTimeout(timer);
        window.removeEventListener('sf-fi-sid-response', handler);
        resolve(e.detail?.sid ?? null);
      });

      window.dispatchEvent(new CustomEvent('sf-fi-get-sid', { detail: { nonce } }));
    });
  }

  /**
   * Read the `sid` cookie for a given URL via the background service worker.
   * Works even when the cookie is HttpOnly.
   */
  function getCookieSid(url) {
    if (!chrome.runtime?.sendMessage) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: 'SF_FI_GET_SID', instanceUrl: url },
          (response) => {
            if (chrome.runtime?.lastError) { resolve(null); return; }
            resolve(response?.sid ?? null);
          }
        );
      } catch { resolve(null); }
    });
  }

  /**
   * Get the Salesforce session ID — tries four strategies in order:
   *  1. Page bridge     — window.$A / window.sforce (Lightning's own live session — most reliable)
   *  2. my.salesforce.com cookie — background reads HttpOnly sid for the REST API domain
   *  3. lightning.force.com cookie — fallback when my.sf.com session is stale after refresh
   *  4. document.cookie — direct read (only works if sid is not HttpOnly)
   */
  async function getSid() {
    if (cachedSid) return cachedSid;

    // Strategy 1: page bridge — window.$A has the currently-active Lightning session.
    // Prioritised first: if the user can see the page, this SID is guaranteed valid.
    const bridgeSid = await getPageBridgeSid();
    if (bridgeSid) { cachedSid = bridgeSid; return cachedSid; }

    // Strategy 2: my.salesforce.com HttpOnly cookie (needed for REST API Bearer auth)
    const mySid = await getCookieSid(getInstanceUrl());
    if (mySid) { cachedSid = mySid; return cachedSid; }

    // Strategy 3: lightning.force.com HttpOnly cookie — Salesforce refreshes this on every
    // Lightning page load even when the my.salesforce.com session has gone stale.
    const lightningSid = await getCookieSid(window.location.origin);
    if (lightningSid) { cachedSid = lightningSid; return cachedSid; }

    // Strategy 4: document.cookie fallback (only works if sid is not HttpOnly)
    const cookieRow = document.cookie.split('; ').find(r => r.startsWith('sid='));
    if (cookieRow) {
      cachedSid = decodeURIComponent(cookieRow.split('=').slice(1).join('='));
      return cachedSid;
    }

    return null;
  }

  /**
   * Force-refresh the session ID by clearing the cache and re-fetching.
   * Called automatically on a 401 response.
   */
  async function refreshSid() {
    cachedSid = null;
    return getSid();
  }

  // ─── Salesforce REST API ──────────────────────────────────────────────────

  function getObjectApiNameFromUrl(url = window.location.href) {
    const m = url.match(/\/lightning\/r\/([^\/]+)\/[a-zA-Z0-9]{15,18}(?:\/|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function resolveApiVersion() {
    if (apiVersion) return apiVersion;
    try {
      const sid     = await getSid();
      const headers = { Accept: 'application/json' };
      if (sid) headers['Authorization'] = `Bearer ${sid}`;
      const res = await fetchWithTimeout(`${getInstanceUrl()}/services/data/`, { headers });
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (!Array.isArray(list)) throw new Error();
      apiVersion = list[list.length - 1]?.version ?? '60.0';
    } catch {
      apiVersion = '60.0';
    }
    return apiVersion;
  }

  /**
   * Fetch Salesforce object field metadata.
   * Automatically retries once with a fresh SID on a 401 response.
   */
  async function describeObject(objectApiName, isRetry = false) {
    // Guard: only allow valid Salesforce API names in the URL
    if (!SF_API_NAME_RE.test(objectApiName)) {
      throw new Error(`Invalid object name: ${objectApiName}`);
    }

    const cached = metaCache[objectApiName];
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

    const sid = await getSid();
    if (!sid) throw new Error('Session not found. Please refresh the Salesforce page.');

    const ver = await resolveApiVersion();
    const url = `${getInstanceUrl()}/services/data/v${ver}/sobjects/${objectApiName}/describe`;

    const res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${sid}` }
    });

    // On 401: clear the stale SID and retry once with a fresh one
    if (res.status === 401) {
      if (!isRetry) {
        await refreshSid();
        return describeObject(objectApiName, true);
      }
      throw new Error(SESSION_EXPIRED_MSG);
    }

    if (res.status === 403) throw new Error(`No access to describe ${objectApiName}.`);
    if (res.status === 404) throw new Error(`Object not found: ${objectApiName}.`);
    if (!res.ok)            throw new Error(`Describe failed (HTTP ${res.status}).`);

    const raw = await res.json();

    // Validate the response structure before processing
    if (!Array.isArray(raw?.fields)) {
      throw new Error('Unexpected response from Salesforce API.');
    }

    const byName  = new Map();
    const byLabel = new Map();
    raw.fields.forEach(f => {
      if (typeof f.name !== 'string' || typeof f.label !== 'string') return;
      byName.set(f.name.toLowerCase(), f);
      byLabel.set(f.label.toLowerCase().trim(), f);
    });

    const data = { fields: raw.fields, byName, byLabel };
    metaCache[objectApiName] = { data, ts: Date.now() };
    return data;
  }

  // ─── Tooling API — history tracking ──────────────────────────────────────

  /**
   * Fetch history-tracking status for a single field via the Tooling API.
   * Uses EntityParticle with a per-field WHERE clause as recommended by Salesforce.
   * Cached per object.field so repeat hovers on the same field are instant.
   * Silently returns null on any error so it never blocks the main tooltip.
   */
  async function describeTooling(objectApiName, fieldApiName) {
    // Validate both names before embedding in SOQL — prevents injection even from unexpected sources
    if (!SF_API_NAME_RE.test(objectApiName) || !SF_API_NAME_RE.test(fieldApiName)) return null;

    const cacheKey = `${objectApiName}.${fieldApiName}`;
    const cached   = toolingCache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

    const sid = await getSid();
    if (!sid) return null;

    const ver = await resolveApiVersion();
    const q   = `SELECT QualifiedApiName,IsFieldHistoryTracked FROM EntityParticle` +
                ` WHERE EntityDefinition.QualifiedApiName='${objectApiName}'` +
                ` AND QualifiedApiName='${fieldApiName}'`;
    const url = `${getInstanceUrl()}/services/data/v${ver}/tooling/query/?q=${encodeURIComponent(q)}`;

    try {
      const res = await fetchWithTimeout(url, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${sid}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data?.records) || data.records.length === 0) return null;

      const result = { isHistoryTracked: data.records[0].IsFieldHistoryTracked === true };
      toolingCache[cacheKey] = { data: result, ts: Date.now() };
      return result;
    } catch {
      return null;
    }
  }

  // ─── Salesforce Inspector detection ──────────────────────────────────────

  /**
   * Asks the background service worker which SF Inspector extension is installed.
   * Background can fetch chrome-extension:// URLs; content scripts cannot.
   * Falls back to Reloaded ID so the button always opens something if detection fails.
   * Result is cached for the lifetime of the page.
   */
  async function resolveInspectorExtId() {
    if (cachedInspectorId !== undefined) return cachedInspectorId;
    cachedInspectorId = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'SF_FI_RESOLVE_INSPECTOR' }, (response) => {
          if (chrome.runtime?.lastError) { resolve(null); return; }
          resolve(response?.extId ?? null);
        });
      } catch {
        resolve(null);
      }
    });
    return cachedInspectorId;
  }

  // ─── FLS SOQL builder ─────────────────────────────────────────────────────

  /**
   * Builds a FieldPermissions SOQL query for the given field.
   * Parent.IsOwnedByProfile distinguishes Profiles (true) from Permission Sets (false).
   * ORDER BY puts Profiles first, then alphabetical within each group.
   */
  function buildFlsSoql(objectApiName, fieldApiName) {
    // Validate both names before embedding in SOQL — prevents injection even from unexpected sources
    if (!SF_API_NAME_RE.test(objectApiName) || !SF_API_NAME_RE.test(fieldApiName)) return null;

    // Parent.Label = human-readable name for both Profiles and Permission Sets.
    // Parent.Name  = API name, which for profiles is an internal ID-like string — not useful.
    // Parent.IsOwnedByProfile: true = Profile, false = Permission Set / Permission Set Group.
    return [
      `SELECT Parent.Label, Parent.Profile.Name, Parent.IsOwnedByProfile, PermissionsRead, PermissionsEdit`,
      `FROM FieldPermissions`,
      `WHERE SobjectType = '${objectApiName}'`,
      `AND Field = '${objectApiName}.${fieldApiName}'`,
      `ORDER BY Parent.IsOwnedByProfile DESC, Parent.Profile.Name`,
    ].join('\n');
  }

  // ─── Field info formatting ────────────────────────────────────────────────

  const TYPE_LABELS = {
    string:          'Text',
    boolean:         'Checkbox',
    int:             'Number (Integer)',
    double:          'Number (Decimal)',
    date:            'Date',
    datetime:        'Date/Time',
    time:            'Time',
    textarea:        'Text Area',
    reference:       'Lookup / Master-Detail',
    picklist:        'Picklist',
    multipicklist:   'Multi-Select Picklist',
    currency:        'Currency',
    percent:         'Percent',
    url:             'URL',
    email:           'Email',
    phone:           'Phone',
    id:              'Record ID',
    base64:          'File (Base64)',
    encryptedstring: 'Encrypted Text',
    location:        'Geolocation',
    address:         'Address (Compound)',
    complexvalue:    'Complex Value',
    anytype:         'Any Type',
  };

  function humanType(field) {
    if (field.autoNumber) return 'Auto Number';
    if (field.calculated) return `Formula (${TYPE_LABELS[field.type] ?? field.type})`;
    if (field.type === 'reference') return field.cascadeDelete ? 'Master-Detail' : 'Lookup';
    return TYPE_LABELS[field.type] ?? field.type;
  }

  function buildRows(field, objectApiName) {
    const rows = [];
    const add = (label, value, opts = {}) => {
      if (value === null || value === undefined || value === '') return;
      rows.push({ label, value: String(value), ...opts });
    };

    add('API Name',  field.name,  { highlight: true });
    add('Label',     field.label);
    add('Type',      humanType(field));

    if (field.type === 'reference') {
      const refs    = (field.referenceTo ?? []).join(', ') || '—';
      const relType = field.cascadeDelete ? 'Master-Detail' : 'Lookup';
      add('Relationship Type',  relType);
      add('References Object',  refs);
      if (field.relationshipName) add('Relationship Name', field.relationshipName);
      if (field.cascadeDelete)    add('Cascade Delete',    'Yes');
    }

    if (field.calculated) {
      add('Formula', field.calculatedFormula || '(formula body unavailable)', { mono: true, block: true });
    }

    if (['currency', 'double', 'percent', 'int'].includes(field.type)) {
      if (field.precision != null) add('Precision (digits)', field.precision);
      if (field.scale     != null) add('Decimal Places',     field.scale);
    }

    if (['string', 'textarea', 'url', 'email', 'phone'].includes(field.type)) {
      if (field.length) add('Max Length', `${field.length} characters`);
    }

    if (['picklist', 'multipicklist'].includes(field.type)) {
      const active = (field.picklistValues ?? []).filter(v => v.active);
      if (active.length) {
        const shown   = active.slice(0, 8).map(v => v.label).join(', ');
        if (active.length > 8) {
          const setupUrl = objectApiName
            ? `${getInstanceUrl()}/lightning/setup/ObjectManager/${objectApiName}/FieldsAndRelationships/${field.name}/view`
            : null;
          rows.push({ label: 'Active Values', value: shown, surplus: active.length - 8, link: setupUrl });
        } else {
          add('Active Values', shown);
        }
      }
      if (field.restrictedPicklist) add('Restricted', 'Yes');
    }

    if (field.type === 'location' && field.scale != null) add('Decimal Places', field.scale);
    if (field.autoNumber && field.displayFormat)         add('Format',         field.displayFormat);

    add('Required',   !field.nillable  ? 'Yes' : 'No');
    add('Updateable',  field.updateable ? 'Yes' : 'No');
    add('Createable',  field.createable ? 'Yes' : 'No');
    if (field.unique)        add('Unique',        'Yes');
    if (field.externalId)    add('External ID',   'Yes');
    if (field.encrypted)     add('Encrypted',     'Yes');
    if (field.htmlFormatted) add('HTML Formatted','Yes');
    if (field.defaultValue != null && field.defaultValue !== '')
      add('Default Value', field.defaultValue);

    // Tooling API — populated by describeTooling()
    if (field.isHistoryTracked !== undefined) {
      add('History Tracked', field.isHistoryTracked ? 'Yes' : 'No');
    }

    return rows;
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sf-fi-tooltip';
    tooltipEl.style.cssText = [
      'position:fixed', 'z-index:2147483647', 'width:360px', 'max-height:560px',
      'overflow-y:auto', 'background:#0f172a', 'border:1.5px solid #0ea5e9',
      'border-radius:10px', 'font-family:Arial,sans-serif', 'font-size:12px',
      'color:#e2e8f0', 'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
      'opacity:0', 'transition:opacity 0.18s ease', 'pointer-events:none',
      'left:0px', 'top:0px'
    ].join(';');
    tooltipEl.addEventListener('mouseover',  () => { clearTimeout(hideTimer); hideTimer = null; });
    tooltipEl.addEventListener('mouseleave', () => {
      if (!hideTimer) {
        hideTimer = setTimeout(() => { hideTooltip(); hideTimer = null; }, HIDE_DELAY_MS);
      }
    });
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function showTooltip() {
    const el = ensureTooltip();
    el.classList.add('sf-fi-visible');
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }

  function hideTooltip() {
    const el = ensureTooltip();
    el.classList.remove('sf-fi-visible');
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    currentApiName = null;
  }

  function positionTooltip(x, y) {
    const el = ensureTooltip();
    // Reset to top-left so getBoundingClientRect reflects content size, not old position
    el.style.left = '0px';
    el.style.top  = '0px';
    requestAnimationFrame(() => {
      const { width, height } = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const PAD = 8;

      // Horizontal: prefer right of cursor, flip left if it overflows
      let left = x + 16;
      if (left + width > vw - PAD) left = x - width - 12;

      // Vertical: prefer below cursor, flip above if it overflows bottom
      let top = y + 16;
      if (top + height > vh - PAD) top = y - height - 12;

      // Hard clamp — keeps tooltip fully inside viewport even if taller than viewport
      left = Math.min(Math.max(PAD, left), vw - width  - PAD);
      top  = Math.min(Math.max(PAD, top),  vh - height - PAD);

      el.style.left = `${left}px`;
      el.style.top  = `${top}px`;
    });
  }

  function setContent(html) { ensureTooltip().innerHTML = html; }

  function renderLoading() {
    setContent(`
      <div class="sf-fi-header"><span class="sf-fi-icon">⚡</span> Salesforce Field Inspector</div>
      <div class="sf-fi-loading"><div class="sf-fi-spinner"></div>Fetching field metadata…</div>
    `);
  }

  const SESSION_EXPIRED_MSG = 'Session expired — please log in again and refresh the page.';

  function renderError(msg) {
    const isSessionError = msg === SESSION_EXPIRED_MSG ||
                           msg === 'Session not found. Please refresh the Salesforce page.';
    const extra = isSessionError
      ? `<div class="sf-fi-footer">
           <button class="sf-fi-btn" id="sf-fi-reload-btn">↺ Reload Page</button>
         </div>`
      : '';

    setContent(`
      <div class="sf-fi-header"><span class="sf-fi-icon">⚡</span> Salesforce Field Inspector</div>
      <div class="sf-fi-error">⚠ ${esc(msg)}</div>
      ${extra}
    `);

    if (isSessionError) {
      document.getElementById('sf-fi-reload-btn')?.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  function renderField(field, objectApiName, inspectorUrl) {
    const rows = buildRows(field, objectApiName);
    let rowsHtml = '';
    rows.forEach(row => {
      if (row.block) {
        rowsHtml += `<div class="sf-fi-row sf-fi-row-block">
          <div class="sf-fi-row-lbl">${esc(row.label)}</div>
          <div class="sf-fi-code">${esc(row.value)}</div>
        </div>`;
      } else {
        const hl   = row.highlight ? ' sf-fi-highlight' : '';
        const mono = row.mono      ? ' sf-fi-mono'      : '';
        const surplusHtml = row.surplus
          ? (row.link
              ? ` … <a class="sf-fi-link" href="${esc(row.link)}" target="_blank" rel="noopener noreferrer">+${row.surplus} more</a>`
              : ` … +${row.surplus} more`)
          : '';
        rowsHtml += `<div class="sf-fi-row">
          <span class="sf-fi-lbl">${esc(row.label)}</span>
          <span class="sf-fi-val${hl}${mono}">${esc(row.value)}${surplusHtml}</span>
        </div>`;
      }
    });

    const inspectorTitle = inspectorUrl
      ? 'Open FLS check in Salesforce Inspector'
      : 'Requires Salesforce Inspector or Salesforce Inspector Reloaded to be installed';

    setContent(`
      <div class="sf-fi-header">
        <span class="sf-fi-icon">⚡</span> Salesforce Field Inspector
        <button class="sf-fi-close" id="sf-fi-close-btn" title="Close">✕</button>
      </div>
      <div class="sf-fi-body">
        ${rowsHtml}
      </div>
      <div class="sf-fi-footer">
        <button class="sf-fi-btn" id="sf-fi-copy-btn" data-copy="${esc(field.name)}">Copy API Name</button>
        <button class="sf-fi-btn" id="sf-fi-open-inspector-btn"
                data-url="${esc(inspectorUrl ?? '')}"
                title="${esc(inspectorTitle)}">Check FLS ↗</button>
      </div>
    `);

    document.getElementById('sf-fi-close-btn')?.addEventListener('click', () => {
      clearTimeout(hideTimer);
      hideTooltip();
    });

    document.getElementById('sf-fi-copy-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (!btn) return;
      const name = btn.dataset?.copy;
      if (!name) return;
      try {
        await navigator.clipboard.writeText(name);
        btn.textContent = '✓ Copied!';
        btn.classList.add('sf-fi-btn-success');
        setTimeout(() => { if (btn) { btn.textContent = 'Copy API Name'; btn.classList.remove('sf-fi-btn-success'); } }, 2000);
      } catch {
        btn.textContent = '✗ Copy failed';
        setTimeout(() => { if (btn) btn.textContent = 'Copy API Name'; }, 2000);
      }
    });

    document.getElementById('sf-fi-open-inspector-btn')?.addEventListener('click', (e) => {
      const url = e.currentTarget?.dataset?.url;
      if (url && url.startsWith('chrome-extension://')) {
        window.open(url, '_blank');
      } else {
        alert('To use Check FLS, please install one of the following Chrome extensions:\n\n• Salesforce Inspector Advanced\n• Salesforce Inspector Reloaded');
      }
    });
  }

  // ─── Core inspection logic ────────────────────────────────────────────────

  async function inspectField(apiName, objectApiName, labelText, x, y) {
    currentApiName = apiName ?? labelText;
    renderLoading();
    showTooltip();
    positionTooltip(x, y);

    try {
      // Step 1: resolve field metadata (cached after first call per object)
      const { byName, byLabel } = await describeObject(objectApiName);

      let field = apiName ? byName.get(apiName.toLowerCase()) : null;
      if (!field && labelText) field = byLabel.get(labelText.toLowerCase());

      if (!field) {
        renderError(`Field not found${apiName ? ': ' + apiName : ''}. It may be a compound or system field.`);
        return;
      }

      // Step 2: history tracking + inspector detection in parallel (both cached after first call)
      const [tooling, inspectorExtId] = await Promise.all([
        describeTooling(objectApiName, field.name),
        resolveInspectorExtId(),
      ]);
      if (tooling) field = { ...field, isHistoryTracked: tooling.isHistoryTracked };

      const sfHost = new URL(getInstanceUrl()).hostname;
      const flsSoql = buildFlsSoql(objectApiName, field.name);
      const inspectorUrl = (inspectorExtId && flsSoql)
        ? `chrome-extension://${inspectorExtId}/data-export.html?host=${encodeURIComponent(sfHost)}&query=${encodeURIComponent(flsSoql)}`
        : null;

      renderField(field, objectApiName, inspectorUrl);
      positionTooltip(x, y);   // re-position now that full content is rendered
      showTooltip();
    } catch (err) {
      renderError(err.message);
      positionTooltip(x, y);
      showTooltip();
    }
  }

  // ─── Mouse event handling ─────────────────────────────────────────────────

  function handleMouseMove(e) {
    if (e.target.closest?.('#sf-fi-tooltip')) {
      clearTimeout(hideTimer);
      return;
    }

    const deepEl = deepElementFromPoint(e.clientX, e.clientY);
    if (!deepEl || deepEl.closest?.('#sf-fi-tooltip')) return;

    const apiName     = findFieldApiName(deepEl);
    const directLabel = extractDirectLabel(deepEl);

    // Only trigger on direct field elements — excludes blank space between fields
    const isField = !!(apiName || directLabel);

    if (!isField) {
      if (tooltipEl?.classList.contains('sf-fi-visible')) {
        clearTimeout(hoverTimer);
        if (!hideTimer) {
          hideTimer = setTimeout(() => { hideTooltip(); hideTimer = null; }, HIDE_DELAY_MS);
        }
      }
      return;
    }

    clearTimeout(hideTimer);
    hideTimer = null;

    const fieldKey = apiName ?? directLabel;
    if (fieldKey === currentApiName && tooltipEl?.classList.contains('sf-fi-visible')) return;

    if (deepEl !== lastFieldEl) {
      lastFieldEl = deepEl;
      clearTimeout(hoverTimer);

      const objectApiName = getObjectApiNameFromUrl();
      if (!objectApiName) return;

      const x = e.clientX, y = e.clientY;
      const labelText = directLabel ?? findLabelNear(deepEl);

      hoverTimer = setTimeout(() => {
        inspectField(apiName, objectApiName, labelText, x, y);
      }, HOVER_DELAY_MS);
    }
  }

  // ─── SPA navigation watch ─────────────────────────────────────────────────

  function watchNavigation() {
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        clearTimeout(hoverTimer);
        clearTimeout(hideTimer);
        lastFieldEl  = null;
        currentApiName = null;
        hideTooltip();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
  }

  // ─── Init / Cleanup ───────────────────────────────────────────────────────

  function handleOutsideClick(e) {
    if (tooltipEl && tooltipEl.classList.contains('sf-fi-visible') &&
        !tooltipEl.contains(e.target)) {
      clearTimeout(hoverTimer);
      clearTimeout(hideTimer);
      hideTimer = null;
      hideTooltip();
    }
  }

  function cleanup() {
    document.removeEventListener('mousemove',  handleMouseMove,   true);
    document.removeEventListener('mousedown',  handleOutsideClick, true);
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    tooltipEl?.remove();
    tooltipEl = null;
  }

  function init() {
    // passive: true — we never call preventDefault on mousemove, so marking it
    // passive improves scroll performance on the page
    document.addEventListener('mousemove',  handleMouseMove,    { capture: true, passive: true });
    // Hide immediately when clicking outside the tooltip
    document.addEventListener('mousedown',  handleOutsideClick, { capture: true });
    watchNavigation();
    window.addEventListener('beforeunload', cleanup, { once: true });
  }

  return { init };
})();

SFFieldInspector.init();
