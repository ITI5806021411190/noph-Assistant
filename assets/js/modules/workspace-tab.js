(function () {
  'use strict';

  const PATCH = 'v70.143-workspace-main-tab';
  if (window.__HAOS_V7143_WORKSPACE_MAIN_TAB__) return;
  window.__HAOS_V7143_WORKSPACE_MAIN_TAB__ = true;

  const $ = id => document.getElementById(id);
  let loaded = false;

  function workspaceCard() {
    const body = $('workspaceTableBody');
    return body && body.closest('.card');
  }

  function filterRows() {
    const query = String($('workspaceTabSearchV7143')?.value || '').trim().toLowerCase();
    document.querySelectorAll('#workspaceTableBody tr').forEach(row => {
      row.style.display = !query || String(row.textContent || '').toLowerCase().includes(query) ? '' : 'none';
    });
  }

  function resetFilter() {
    const input = $('workspaceTabSearchV7143');
    if (input) input.value = '';
    filterRows();
  }

  function ensureWorkspacePane() {
    const mount = $('workspaceTabMountV7143');
    const card = workspaceCard();
    if (!mount || !card) return false;

    if (!$('workspaceTabShellV7143')) {
      mount.innerHTML = `
        <section id="workspaceTabShellV7143">
          <div class="haos-workspace-tab-hero">
            <div>
              <h4><i class="bi bi-kanban"></i> พื้นที่ทำงานร่วมกัน</h4>
              <p>สร้างและจัดการตาราง Checklist แบบฟอร์ม Quiz หรือ Google Workspace พร้อมกำหนดผู้ดู ผู้แก้ไข Public Link และ AI Designer</p>
            </div>
            <button class="btn btn-success fw-bold" type="button" onclick="openWorkspaceCreateModal()"><i class="bi bi-plus-circle"></i> สร้างพื้นที่ใหม่</button>
          </div>
          <div class="haos-workspace-tab-toolbar">
            <input id="workspaceTabSearchV7143" class="form-control" type="search" placeholder="ค้นหาชื่อพื้นที่ ขอบเขต ชนิด หรือเจ้าของ">
            <div class="d-flex gap-2">
              <button id="workspaceTabResetV7143" class="btn btn-outline-secondary" type="button"><i class="bi bi-arrow-counterclockwise"></i> ล้าง</button>
              <button class="btn btn-outline-success" type="button" onclick="loadSharedWorkspaces()"><i class="bi bi-arrow-clockwise"></i> โหลดใหม่</button>
            </div>
          </div>
          <div id="workspaceTabCardHostV7143"></div>
        </section>`;
      $('workspaceTabSearchV7143').addEventListener('input', filterRows);
      $('workspaceTabResetV7143').addEventListener('click', resetFilter);
    }

    const host = $('workspaceTabCardHostV7143');
    if (host && card.parentElement !== host) host.appendChild(card);
    card.classList.add('workspace-table-card');
    card.querySelector('.card-header')?.classList.add('d-none');
    return true;
  }

  function loadWorkspaceOnce(force) {
    if (loaded && !force) return;
    loaded = true;
    try {
      if (typeof window.loadSharedWorkspaces === 'function') window.loadSharedWorkspaces();
    } catch (error) {
      loaded = false;
      console.warn('[HAOS v70.143] workspace load failed', error);
    }
  }

  function showWorkspaceTab(options) {
    options = options || {};
    ensureWorkspacePane();
    const tab = $('workspace-tab');
    if (tab) {
      try {
        if (window.bootstrap && bootstrap.Tab) bootstrap.Tab.getOrCreateInstance(tab).show();
        else tab.click();
      } catch (_error) {
        tab.click();
      }
    }
    if (options.load !== false) setTimeout(() => loadWorkspaceOnce(!!options.force), 80);
    return false;
  }

  function wrapWorkspaceOpeners() {
    ['openWorkspaceEditor', 'openWorkspaceConfigEditorV737'].forEach(name => {
      const previous = window[name];
      if (typeof previous !== 'function' || previous.__haosV7143Wrapped) return;
      const wrapped = function () {
        ensureWorkspacePane();
        return previous.apply(this, arguments);
      };
      wrapped.__haosV7143Wrapped = true;
      window[name] = wrapped;
    });
  }

  function boot() {
    ensureWorkspacePane();
    wrapWorkspaceOpeners();
    $('workspace-tab')?.addEventListener('shown.bs.tab', () => loadWorkspaceOnce(false));
    $('workspace-tab')?.addEventListener('click', () => setTimeout(() => {
      ensureWorkspacePane();
      loadWorkspaceOnce(false);
    }, 80), true);
  }

  window.openWorkspaceTabV7143 = showWorkspaceTab;
  window.filterWorkspaceTabV7143 = filterRows;
  window.resetWorkspaceTabFilterV7143 = resetFilter;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  console.info('HAOS ' + PATCH + ' loaded');
})();
