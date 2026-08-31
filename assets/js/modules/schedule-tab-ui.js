(function () {
  'use strict';

  const PATCH = 'v70.145-schedule-tab-ui';
  if (window.__HAOS_V7145_SCHEDULE_TAB_UI__) return;
  window.__HAOS_V7145_SCHEDULE_TAB_UI__ = true;

  const $ = id => document.getElementById(id);
  let observer = null;
  let queued = false;

  function hideLegacyActionBar() {
    const legacy = $('scheduleActionBar');
    if (!legacy) return;
    legacy.classList.add('haos-v7145-legacy-header');
    legacy.setAttribute('aria-hidden', 'true');
  }

  function approvalHasItems() {
    return !!$('pendingList')?.querySelector('.list-group-item');
  }

  function syncApprovalVisibility() {
    const section = $('approvalSection');
    if (!section) return;
    const hasItems = approvalHasItems();
    section.classList.toggle('haos-v7145-empty-approval', !hasItems);
    section.classList.toggle('d-none', !hasItems);
    section.setAttribute('aria-hidden', String(!hasItems));
  }

  function ensureApprovalMount() {
    const shell = $('haosUnifiedScheduleViewV702');
    const section = $('approvalSection');
    if (!shell || !section) return;

    let mount = $('haosScheduleApprovalMountV7145');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'haosScheduleApprovalMountV7145';
      const tabs = $('haosScheduleTabsV742');
      if (tabs && tabs.parentElement === shell) tabs.insertAdjacentElement('afterend', mount);
      else shell.insertAdjacentElement('afterbegin', mount);
    }
    if (section.parentElement !== mount) mount.appendChild(section);
  }

  function install() {
    hideLegacyActionBar();
    ensureApprovalMount();
    syncApprovalVisibility();
  }

  function queueInstall() {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      install();
    }, 40);
  }

  function boot() {
    install();
    const pane = $('schedule-pane');
    if (pane && !observer) {
      observer = new MutationObserver(queueInstall);
      observer.observe(pane, { childList: true, subtree: true });
    }
    $('schedule-tab')?.addEventListener('shown.bs.tab', queueInstall);
    [300, 900, 1800, 3200].forEach(delay => setTimeout(install, delay));
  }

  window.syncScheduleTabUiV7145 = install;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  console.info('HAOS ' + PATCH + ' loaded');
})();
