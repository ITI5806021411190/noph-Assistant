(function () {
  const PATCH = 'v70.76-session-restore';
  if (window.__HAOS_V776_SESSION_RESTORE__) return;
  window.__HAOS_V776_SESSION_RESTORE__ = true;

  const STATE_PREFIX = 'haos_last_workspace_state_v776_';
  const PREF_PREFIX = 'haos_restore_last_view_enabled_v776_';
  const AUTO_DEVICE_KEY = 'haos_auto_login_device_v731';
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const RESTORE_DELAY = 850;
  let saveTimer = null;
  let pendingExtra = {};
  let restoredForUser = '';
  let restoreTimer = null;

  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]));

  function cleanPhone(value) {
    return String(value || '').replace(/[^0-9]/g, '').trim();
  }

  function currentUser() {
    try {
      if (typeof window.currentUser === 'function') return window.currentUser() || {};
    } catch (_err) {}
    try {
      if (typeof window.getUser === 'function') return window.getUser() || {};
    } catch (_err) {}
    try {
      return window.user || user || {};
    } catch (_err) {
      return window.user || {};
    }
  }

  function savedDevicePhone() {
    try {
      const data = JSON.parse(localStorage.getItem(AUTO_DEVICE_KEY) || 'null');
      return cleanPhone(data && data.phone);
    } catch (_err) {
      return '';
    }
  }

  function userKey() {
    const u = currentUser();
    return cleanPhone(u.phone || u.userPhone || u.mobile || u.tel || u.username) || savedDevicePhone();
  }

  function stateKey(phone) {
    return STATE_PREFIX + cleanPhone(phone || userKey() || 'guest');
  }

  function prefKey(phone) {
    return PREF_PREFIX + cleanPhone(phone || userKey() || 'guest');
  }

  function restoreEnabled(phone) {
    try {
      return localStorage.getItem(prefKey(phone)) !== '0';
    } catch (_err) {
      return true;
    }
  }

  function setRestoreEnabled(enabled) {
    const key = userKey();
    if (!key) return;
    try {
      localStorage.setItem(prefKey(key), enabled ? '1' : '0');
    } catch (_err) {}
  }

  function readState(phone) {
    try {
      const data = JSON.parse(localStorage.getItem(stateKey(phone)) || 'null');
      if (!data || !data.updatedAt) return null;
      if (Date.now() - Number(data.updatedAt || 0) > TTL_MS) return null;
      return data;
    } catch (_err) {
      return null;
    }
  }

  function writeState(data) {
    const key = userKey();
    if (!key || !restoreEnabled(key)) return;
    try {
      localStorage.setItem(stateKey(key), JSON.stringify(Object.assign({}, data, {
        version: PATCH,
        updatedAt: Date.now()
      })));
    } catch (_err) {}
  }

  function activeTabState() {
    const active = document.querySelector('#mainTab .nav-link.active[data-bs-target], #mainTab .nav-link.active[href^="#"]');
    const target = active && (active.getAttribute('data-bs-target') || active.getAttribute('href'));
    return {
      tabId: active && active.id || '',
      tabTarget: target || ''
    };
  }

  function activeModuleFromDom(tabTarget) {
    const activeTarget = tabTarget || activeTabState().tabTarget;
    const visible = id => {
      const el = $(id);
      return !!(el && !el.classList.contains('d-none') && getComputedStyle(el).display !== 'none');
    };
    if (activeTarget === '#itservices-pane') {
      if (visible('itBookingPanel')) return 'itBooking';
      if (visible('itMinutesPanel')) return 'itMinutes';
      if (visible('itAssetPanelV70')) return 'itAsset';
      if (visible('itRepairPanelV70')) return 'itRepair';
      if (visible('itAssetDashboardPanelV702')) return 'itAssetDashboard';
      if (visible('itRepairDashboardPanelV702')) return 'itRepairDashboard';
      if (visible('eMeetingPanelV715') || visible('eMeetingPanelV714')) return 'eMeeting';
      return '';
    }
    if (activeTarget === '#schedule-pane') return 'schedule';
    return '';
  }

  function scheduleSnapshot() {
    const state = {};
    const mode = window.haosUnifiedScheduleModeV702 || '';
    const tab = window.haosScheduleCombinedTabV742 || '';
    if (mode) state.scheduleView = mode;
    if (tab) state.scheduleTab = tab;
    const fields = [
      'unifiedScheduleScopeV702',
      'unifiedScheduleStatusV702',
      'unifiedSchedulePeriodV702',
      'unifiedScheduleSortV702',
      'unifiedSchedulePriorityV706',
      'unifiedScheduleTagV706'
    ];
    state.scheduleFilters = {};
    fields.forEach(id => {
      const el = $(id);
      if (el) state.scheduleFilters[id] = el.value || '';
    });
    return state;
  }

  function capture(extra) {
    const key = userKey();
    const app = $('appSection');
    if (!key || !restoreEnabled(key) || (app && getComputedStyle(app).display === 'none')) return;
    const current = readState(key) || {};
    const extraData = extra || {};
    const tab = activeTabState();
    const hasExplicitModule = Object.prototype.hasOwnProperty.call(extraData, 'module');
    const data = Object.assign({}, current, tab, scheduleSnapshot(), {
      scrollY: Math.max(0, Math.round(window.scrollY || document.documentElement.scrollTop || 0)),
      module: hasExplicitModule ? extraData.module : activeModuleFromDom(tab.tabTarget)
    }, extraData);
    writeState(data);
    refreshProfileCard();
  }

  function scheduleCapture(extra) {
    pendingExtra = Object.assign({}, pendingExtra, extra || {});
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const data = pendingExtra;
      pendingExtra = {};
      capture(data);
    }, 220);
  }

  function showMainTab(target) {
    if (!target) return false;
    const btn = qa('#mainTab .nav-link').find(el => (el.getAttribute('data-bs-target') || el.getAttribute('href')) === target);
    if (!btn) return false;
    try {
      if (window.bootstrap && bootstrap.Tab) bootstrap.Tab.getOrCreateInstance(btn).show();
      else btn.click();
    } catch (_err) {
      try { btn.click(); } catch (_err2) {}
    }
    if (target === '#itservices-pane') {
      setTimeout(() => { try { window.initItServicesHub && window.initItServicesHub(); } catch (_err) {} }, 180);
    }
    return true;
  }

  function applyScheduleState(state) {
    if (!state) return;
    const filters = state.scheduleFilters || {};
    Object.keys(filters).forEach(id => {
      const el = $(id);
      if (el) el.value = filters[id] || '';
    });
    setTimeout(() => {
      try {
        if (state.scheduleTab && window.setScheduleCombinedTabV742) window.setScheduleCombinedTabV742(state.scheduleTab);
      } catch (_err) {}
      try {
        if (state.scheduleView && window.setUnifiedScheduleViewV702) window.setUnifiedScheduleViewV702(state.scheduleView);
      } catch (_err) {}
      try {
        if (window.renderUnifiedScheduleV702) window.renderUnifiedScheduleV702();
      } catch (_err) {}
    }, 450);
  }

  function openSavedModule(module) {
    if (!module) return;
    const openers = {
      itBooking: () => window.openItBookingModule && window.openItBookingModule(),
      itMinutes: () => window.openItMinutesModule && window.openItMinutesModule(),
      itAsset: () => window.openITAssetModuleV70 && window.openITAssetModuleV70(),
      itRepair: () => window.openITRepairModuleV70 && window.openITRepairModuleV70(),
      itAssetDashboard: () => window.openITAssetDashboardV702 && window.openITAssetDashboardV702(),
      itRepairDashboard: () => window.openITRepairDashboardV702 && window.openITRepairDashboardV702(),
      eMeeting: () => {
        const fn = window.openEMeetingModuleV715 || window.openEMeetingModuleV714;
        if (fn) fn();
      },
      workspaceList: () => {
        try { window.loadSharedWorkspaces && window.loadSharedWorkspaces(); } catch (_err) {}
      }
    };
    const fn = openers[module];
    if (!fn) return;
    setTimeout(() => {
      try { fn(); } catch (_err) {}
    }, 720);
  }

  function restoreLastView(force) {
    const key = userKey();
    if (!key || (!force && !restoreEnabled(key))) return false;
    const state = readState(key);
    if (!state) return false;
    if (!force && restoredForUser === key) return false;
    restoredForUser = key;
    if (state.tabTarget) showMainTab(state.tabTarget);
    if (state.tabTarget === '#schedule-pane') applyScheduleState(state);
    if (state.tabTarget === '#itservices-pane') setTimeout(() => { try { window.initItServicesHub && window.initItServicesHub(); } catch (_err) {} }, 280);
    openSavedModule(state.module);
    const y = Number(state.scrollY || 0);
    if (y > 0) {
      [1400, 2600].forEach(delay => setTimeout(() => {
        try { window.scrollTo({ top: y, behavior: delay > 2000 ? 'smooth' : 'auto' }); } catch (_err) { window.scrollTo(0, y); }
      }, delay));
    }
    return true;
  }

  function scheduleRestore() {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => restoreLastView(false), RESTORE_DELAY);
  }

  function wrapShowSection() {
    if (typeof window.showSection !== 'function' || window.showSection.__haosV776Wrapped) return;
    const previous = window.showSection;
    const wrapped = function (id) {
      const result = previous.apply(this, arguments);
      if (id === 'appSection') scheduleRestore();
      return result;
    };
    wrapped.__haosV776Wrapped = true;
    window.showSection = wrapped;
  }

  function wrapFunction(name, meta) {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__haosV776Wrapped) return false;
    const wrapped = function () {
      scheduleCapture(typeof meta === 'function' ? meta.apply(this, arguments) : meta);
      return fn.apply(this, arguments);
    };
    wrapped.__haosV776Wrapped = true;
    window[name] = wrapped;
    return true;
  }

  function wrapKnownOpeners() {
    wrapFunction('openItBookingModule', { tabTarget: '#itservices-pane', module: 'itBooking' });
    wrapFunction('openItMinutesModule', { tabTarget: '#itservices-pane', module: 'itMinutes' });
    wrapFunction('openITAssetModuleV70', { tabTarget: '#itservices-pane', module: 'itAsset' });
    wrapFunction('openITRepairModuleV70', { tabTarget: '#itservices-pane', module: 'itRepair' });
    wrapFunction('openITAssetDashboardV702', { tabTarget: '#itservices-pane', module: 'itAssetDashboard' });
    wrapFunction('openITRepairDashboardV702', { tabTarget: '#itservices-pane', module: 'itRepairDashboard' });
    wrapFunction('openEMeetingModuleV714', { tabTarget: '#itservices-pane', module: 'eMeeting' });
    wrapFunction('openEMeetingModuleV715', { tabTarget: '#itservices-pane', module: 'eMeeting' });
    wrapFunction('loadSharedWorkspaces', { tabTarget: '#schedule-pane', module: 'workspaceList' });
    wrapFunction('openWorkspaceEditor', { tabTarget: '#schedule-pane', module: 'workspaceList' });
    wrapFunction('openWorkspaceConfigEditorV737', { tabTarget: '#schedule-pane', module: 'workspaceList' });
    wrapFunction('setUnifiedScheduleViewV702', mode => ({ tabTarget: '#schedule-pane', module: 'schedule', scheduleView: mode || 'list' }));
    wrapFunction('setScheduleCombinedTabV742', tab => ({ tabTarget: '#schedule-pane', module: 'schedule', scheduleTab: tab || 'main' }));
    wrapFunction('toggleDeptScheduleViewV69', mode => ({ tabTarget: '#schedule-pane', module: 'schedule', deptScheduleView: mode || 'list' }));
  }

  function onDocumentClick(ev) {
    const tab = ev.target.closest('#mainTab .nav-link[data-bs-target], #mainTab .nav-link[href^="#"]');
    if (tab) {
      const target = tab.getAttribute('data-bs-target') || tab.getAttribute('href') || '';
      scheduleCapture({ tabId: tab.id || '', tabTarget: target });
      return;
    }
    const opener = ev.target.closest('[onclick]');
    const code = opener && opener.getAttribute('onclick') || '';
    if (!code) return;
    if (/openItBookingModule/.test(code)) scheduleCapture({ tabTarget: '#itservices-pane', module: 'itBooking' });
    else if (/openItMinutesModule/.test(code)) scheduleCapture({ tabTarget: '#itservices-pane', module: 'itMinutes' });
    else if (/openITAssetModuleV70/.test(code)) scheduleCapture({ tabTarget: '#itservices-pane', module: 'itAsset' });
    else if (/openITRepairModuleV70/.test(code)) scheduleCapture({ tabTarget: '#itservices-pane', module: 'itRepair' });
    else if (/openEMeetingModule/.test(code)) scheduleCapture({ tabTarget: '#itservices-pane', module: 'eMeeting' });
    else if (/openWorkspace|loadSharedWorkspaces/.test(code)) scheduleCapture({ tabTarget: '#schedule-pane', module: 'workspaceList' });
    else if (/setUnifiedScheduleViewV702/.test(code)) scheduleCapture({ tabTarget: '#schedule-pane', module: 'schedule' });
  }

  function onShownTab(ev) {
    const tab = ev.target;
    if (!tab || !tab.matches('#mainTab .nav-link')) return;
    scheduleCapture({
      tabId: tab.id || '',
      tabTarget: tab.getAttribute('data-bs-target') || tab.getAttribute('href') || ''
    });
  }

  function formatStateLabel(state) {
    if (!state) return 'ยังไม่มีตำแหน่งล่าสุดที่บันทึกไว้';
    const tab = state.tabTarget === '#schedule-pane' ? 'ตารางงาน & นัดหมาย' : (state.tabTarget === '#report-pane' ? 'รายงานการปฏิบัติงาน' : 'IT Services');
    const map = {
      itBooking: 'ระบบจองห้อง/Zoom',
      itMinutes: 'รายงานการประชุม',
      itAsset: 'ทะเบียนทรัพย์สิน IT',
      itRepair: 'แจ้งซ่อม IT',
      itAssetDashboard: 'Dashboard ทรัพย์สิน IT',
      itRepairDashboard: 'Dashboard แจ้งซ่อม IT',
      eMeeting: 'e-Meeting Manage',
      workspaceList: 'พื้นที่ทำงานร่วมกัน',
      schedule: 'ตารางงานรวม'
    };
    const mod = map[state.module] || '';
    const when = state.updatedAt ? new Date(state.updatedAt).toLocaleString('th-TH') : '';
    return [tab, mod, when ? 'บันทึกล่าสุด ' + when : ''].filter(Boolean).join(' • ');
  }

  function injectProfileCard() {
    const body = document.querySelector('#profileModal .modal-body');
    const key = userKey();
    if (!body || !key) return;
    let card = $('haosSessionRestoreCardV776');
    if (!card) {
      card = document.createElement('div');
      card.id = 'haosSessionRestoreCardV776';
      card.className = 'haos-v731-auto-card';
      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <div class="fw-bold text-primary"><i class="bi bi-clock-history"></i> กลับไปหน้าล่าสุดอัตโนมัติ</div>
            <div id="haosSessionRestoreStatusV776" class="small text-muted"></div>
          </div>
          <div class="form-check form-switch m-0">
            <input class="form-check-input" type="checkbox" id="haosSessionRestoreToggleV776">
          </div>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-2">
          <button type="button" class="btn btn-sm btn-outline-primary" id="haosSessionRestoreNowV776"><i class="bi bi-arrow-return-left"></i> กลับไปหน้าล่าสุดตอนนี้</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="haosSessionRestoreClearV776"><i class="bi bi-eraser"></i> ล้างตำแหน่งล่าสุด</button>
        </div>`;
      body.appendChild(card);
      $('haosSessionRestoreToggleV776')?.addEventListener('change', ev => {
        setRestoreEnabled(!!ev.currentTarget.checked);
        refreshProfileCard();
      });
      $('haosSessionRestoreNowV776')?.addEventListener('click', () => {
        capture({ manualSnapshot: true });
        restoreLastView(true);
      });
      $('haosSessionRestoreClearV776')?.addEventListener('click', () => {
        try { localStorage.removeItem(stateKey()); } catch (_err) {}
        refreshProfileCard();
      });
    }
    refreshProfileCard();
  }

  function refreshProfileCard() {
    const toggle = $('haosSessionRestoreToggleV776');
    const status = $('haosSessionRestoreStatusV776');
    const key = userKey();
    if (toggle && key) toggle.checked = restoreEnabled(key);
    if (status && key) status.textContent = formatStateLabel(readState(key));
  }

  function wrapProfileModal() {
    if (typeof window.openProfileModal !== 'function' || window.openProfileModal.__haosV776Wrapped) return;
    const previous = window.openProfileModal;
    const wrapped = function () {
      const result = previous.apply(this, arguments);
      setTimeout(injectProfileCard, 320);
      setTimeout(injectProfileCard, 900);
      return result;
    };
    wrapped.__haosV776Wrapped = true;
    window.openProfileModal = wrapped;
  }

  function install() {
    wrapShowSection();
    wrapKnownOpeners();
    wrapProfileModal();
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('shown.bs.tab', onShownTab, true);
    window.addEventListener('scroll', () => scheduleCapture(), { passive: true });
    window.addEventListener('beforeunload', () => capture({ leaving: true }));
    setInterval(() => {
      wrapShowSection();
      wrapKnownOpeners();
      wrapProfileModal();
    }, 1800);
    const app = $('appSection');
    if (app) {
      const observer = new MutationObserver(() => {
        if (getComputedStyle(app).display !== 'none') scheduleRestore();
      });
      try { observer.observe(app, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (_err) {}
    }
  }

  window.haosSessionRestoreV776 = {
    capture,
    restore: () => restoreLastView(true),
    clear: () => { try { localStorage.removeItem(stateKey()); } catch (_err) {} },
    state: () => readState(),
    enabled: restoreEnabled,
    setEnabled: setRestoreEnabled
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  console.info('HAOS ' + PATCH + ' loaded');
})();
