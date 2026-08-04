(function () {
  'use strict';

  const VERSION = 'v70.135-dashboard-viewer-ui';

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html) node.innerHTML = html;
    return node;
  }

  function filterControls(panel) {
    return Array.from(panel.querySelectorAll('[data-view-filter],[data-public-filter]'));
  }

  function activeFilterCount(panel) {
    const active = new Set();
    filterControls(panel).forEach(control => {
      const key = control.dataset.viewFilter != null ? control.dataset.viewFilter : control.dataset.publicFilter;
      let hasValue = false;
      if (control.multiple) hasValue = Array.from(control.selectedOptions).some(option => option.value);
      else hasValue = String(control.value || '').trim() !== '';
      if (hasValue) active.add(String(key));
    });
    return active.size;
  }

  function clearFilters(panel) {
    const controls = filterControls(panel);
    controls.forEach(control => {
      if (control.multiple) Array.from(control.options).forEach(option => { option.selected = false; });
      else control.value = '';
    });
    if (controls[0]) controls[0].dispatchEvent(new Event('input', {bubbles:true}));
  }

  function stat(icon, label, value) {
    return `<div class="db-viewer-stat"><span class="db-viewer-stat-icon"><i class="bi ${icon}"></i></span><span><small>${label}</small><strong data-stat-value>${value}</strong></span></div>`;
  }

  function setup(options) {
    const root = document.getElementById(options.rootId);
    const canvas = document.getElementById(options.canvasId);
    const filters = document.getElementById(options.filtersId);
    if (!root || !canvas || !filters || root.dataset.viewerUiReady === '1') return null;

    root.dataset.viewerUiReady = '1';
    root.classList.add('db-viewer-enhanced');
    canvas.classList.add('db-viewer-canvas');
    filters.classList.add('db-viewer-filter-panel');

    const header = root.querySelector(options.headerSelector);
    if (header) header.classList.add('db-viewer-commandbar');

    const overview = el('div', 'db-viewer-overview');
    overview.setAttribute('aria-label', 'สรุป Dashboard');
    overview.innerHTML = [
      stat('bi-database-check', 'รายการที่แสดง', '<span data-visible-rows>0</span><em> / <span data-total-rows>0</span></em>'),
      stat('bi-grid-1x2', 'Widget', '<span data-widget-count>0</span>'),
      stat('bi-funnel', 'ตัวกรองที่ใช้', '<span data-active-filter-count>0</span>')
    ].join('');

    const filterBar = el('div', 'db-viewer-filterbar');
    filterBar.innerHTML = `<div class="db-viewer-filterbar-title"><i class="bi bi-sliders2"></i><span>ตัวกรองข้อมูล</span><span class="db-viewer-filter-badge" data-filter-badge>0</span></div><span class="db-grow"></span><span class="db-viewer-result" data-result-label aria-live="polite">แสดงข้อมูลทั้งหมด</span><button class="db-btn db-viewer-reset" type="button" data-viewer-reset title="ล้างค่าตัวกรอง"><i class="bi bi-arrow-counterclockwise"></i><span>ล้างค่า</span></button><button class="db-btn" type="button" data-viewer-filter-toggle aria-expanded="false"><i class="bi bi-chevron-down"></i><span>แสดงตัวกรอง</span></button>`;

    root.insertBefore(overview, filters);
    root.insertBefore(filterBar, filters);

    const fullscreen = el('button', 'db-btn db-viewer-fullscreen', '<i class="bi bi-arrows-fullscreen"></i><span>เต็มจอ</span>');
    fullscreen.type = 'button';
    fullscreen.title = 'เปิดโหมดนำเสนอเต็มหน้าจอ';
    if (header && options.rootId === 'dbPublicViewer') {
      const actions = el('div', 'db-viewer-head-actions');
      Array.from(header.children).filter(child => child.tagName === 'BUTTON').forEach(button => actions.appendChild(button));
      actions.appendChild(fullscreen);
      header.appendChild(actions);
    } else if (header) {
      header.appendChild(fullscreen);
    }

    const toggle = filterBar.querySelector('[data-viewer-filter-toggle]');
    const reset = filterBar.querySelector('[data-viewer-reset]');
    const resultLabel = filterBar.querySelector('[data-result-label]');
    const badge = filterBar.querySelector('[data-filter-badge]');
    let initialized = false;

    function decorateWidgets() {
      const icons = {kpi:'bi-speedometer2',bar:'bi-bar-chart',line:'bi-graph-up',pie:'bi-pie-chart',table:'bi-table'};
      canvas.querySelectorAll('.db-widget').forEach(card => {
        const headerTitle = card.querySelector('header > div:first-child');
        if (!headerTitle || headerTitle.classList.contains('db-widget-title')) return;
        headerTitle.classList.add('db-widget-title');
        const icon = el('span', 'db-widget-type-icon', `<i class="bi ${icons[card.dataset.widgetType] || 'bi-grid'}"></i>`);
        headerTitle.insertBefore(icon, headerTitle.firstChild);
      });
    }

    function setFiltersVisible(show) {
      filters.classList.toggle('is-collapsed', !show);
      toggle.setAttribute('aria-expanded', String(show));
      toggle.querySelector('i').className = `bi ${show ? 'bi-chevron-up' : 'bi-chevron-down'}`;
      toggle.querySelector('span').textContent = show ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง';
    }

    function syncFilterAvailability() {
      const hasFilters = filterControls(filters).length > 0;
      filterBar.classList.toggle('db-hidden', !hasFilters);
      if (hasFilters && !initialized) {
        initialized = true;
        setFiltersVisible(false);
      }
    }

    function update(detail) {
      detail = detail || {};
      const total = Number(detail.totalRows || 0);
      const visible = Number(detail.visibleRows == null ? total : detail.visibleRows);
      const widgets = Number(detail.widgetCount || 0);
      const active = Number(detail.activeFilters == null ? activeFilterCount(filters) : detail.activeFilters);
      overview.querySelector('[data-visible-rows]').textContent = visible.toLocaleString('th-TH');
      overview.querySelector('[data-total-rows]').textContent = total.toLocaleString('th-TH');
      overview.querySelector('[data-widget-count]').textContent = widgets.toLocaleString('th-TH');
      overview.querySelector('[data-active-filter-count]').textContent = active.toLocaleString('th-TH');
      badge.textContent = String(active);
      badge.classList.toggle('is-active', active > 0);
      reset.disabled = active === 0;
      resultLabel.textContent = active > 0 ? `พบ ${visible.toLocaleString('th-TH')} จาก ${total.toLocaleString('th-TH')} รายการ` : `แสดงทั้งหมด ${total.toLocaleString('th-TH')} รายการ`;
      syncFilterAvailability();
    }

    toggle.addEventListener('click', () => setFiltersVisible(filters.classList.contains('is-collapsed')));
    reset.addEventListener('click', () => clearFilters(filters));
    filters.addEventListener('input', () => update({
      totalRows: Number(canvas.dataset.totalRows || 0),
      visibleRows: Number(canvas.dataset.visibleRows || 0),
      widgetCount: Number(canvas.dataset.widgetCount || 0)
    }));
    filters.addEventListener('change', () => update({
      totalRows: Number(canvas.dataset.totalRows || 0),
      visibleRows: Number(canvas.dataset.visibleRows || 0),
      widgetCount: Number(canvas.dataset.widgetCount || 0)
    }));
    canvas.addEventListener('haos:dashboard-rendered', event => update(event.detail));

    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (root.requestFullscreen) await root.requestFullscreen();
        else root.classList.toggle('is-presentation');
      } catch (error) {
        root.classList.toggle('is-presentation');
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const active = document.fullscreenElement === root;
      root.classList.toggle('is-presentation', active);
      fullscreen.querySelector('i').className = `bi ${active ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'}`;
      fullscreen.querySelector('span').textContent = active ? 'ออกจากเต็มจอ' : 'เต็มจอ';
    });

    new MutationObserver(syncFilterAvailability).observe(filters, {childList:true, subtree:true});
    new MutationObserver(decorateWidgets).observe(canvas, {childList:true, subtree:true});
    syncFilterAvailability();
    decorateWidgets();
    update({});
    return {update, setFiltersVisible, clearFilters:() => clearFilters(filters)};
  }

  function boot() {
    setup({rootId:'dbViewerView', canvasId:'dbViewerCanvas', filtersId:'dbViewerFilters', headerSelector:'.db-toolbar'});
    setup({rootId:'dbPublicViewer', canvasId:'dbPublicViewerCanvas', filtersId:'dbPublicViewerFilters', headerSelector:'.db-public-viewer-head'});
  }

  window.HAOSDashboardViewerUI = {setup, activeFilterCount, clearFilters, version:VERSION};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
