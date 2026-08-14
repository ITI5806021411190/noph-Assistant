(function () {
  'use strict';

  const VERSION = 'v70.138-dashboard-builder-stability';
  let drilldownState={rows:[],fields:[],title:'',exportName:'dashboard-detail'};

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

  function canvasDetail(canvas) {
    return {
      totalRows: Number(canvas.dataset.totalRows || 0),
      visibleRows: Number(canvas.dataset.visibleRows || 0),
      widgetCount: Number(canvas.dataset.widgetCount || 0),
      activeFilters: Number(canvas.dataset.activeFilterCount || 0)
    };
  }

  function clearFilters(panel) {
    const controls = filterControls(panel);
    controls.forEach(control => {
      if (control.multiple) Array.from(control.options).forEach(option => { option.selected = false; });
      else control.value = '';
    });
    if (controls[0]) controls[0].dispatchEvent(new Event('input', {bubbles:true}));
    panel.dispatchEvent(new CustomEvent('haos:dashboard-reset-interactions', {bubbles:true}));
  }

  function stat(icon, label, value) {
    return `<div class="db-viewer-stat"><span class="db-viewer-stat-icon"><i class="bi ${icon}"></i></span><span><small>${label}</small><strong data-stat-value>${value}</strong></span></div>`;
  }

  function ensureDrilldown(){
    let overlay=document.getElementById('dbDrilldownOverlay');if(overlay)return overlay;
    overlay=el('div','db-drilldown-overlay');overlay.id='dbDrilldownOverlay';overlay.innerHTML='<section class="db-drilldown-dialog" role="dialog" aria-modal="true" aria-labelledby="dbDrilldownTitle"><header><div><span class="db-widget-kind">DRILL-DOWN</span><h2 id="dbDrilldownTitle">รายละเอียดข้อมูล</h2><p data-drilldown-count></p></div><button type="button" data-drilldown-close title="ปิด"><i class="bi bi-x-lg"></i></button></header><div class="db-drilldown-tools"><input class="db-input" data-drilldown-search placeholder="ค้นหาในผลลัพธ์"><button class="db-btn" type="button" data-drilldown-export><i class="bi bi-download"></i> Export CSV</button></div><div class="db-drilldown-table" data-drilldown-table></div></section>';
    document.body.appendChild(overlay);overlay.querySelector('[data-drilldown-close]').addEventListener('click',()=>overlay.classList.remove('show'));overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.classList.remove('show');});overlay.querySelector('[data-drilldown-search]').addEventListener('input',drawDrilldown);overlay.querySelector('[data-drilldown-export]').addEventListener('click',()=>HAOSDashboardRenderer.downloadCsv(drilldownState.rows,drilldownState.fields,drilldownState.exportName));return overlay;
  }
  function drawDrilldown(){
    const overlay=ensureDrilldown();const esc=HAOSDashboardRenderer.esc;const query=overlay.querySelector('[data-drilldown-search]').value.trim().toLowerCase();const rows=query?drilldownState.rows.filter(row=>drilldownState.fields.some(field=>String(row[field]??'').toLowerCase().includes(query))):drilldownState.rows;const page=rows.slice(0,200);overlay.querySelector('[data-drilldown-count]').textContent=`พบ ${rows.length.toLocaleString('th-TH')} รายการ${rows.length>200?' • แสดง 200 รายการแรก':''}`;overlay.querySelector('[data-drilldown-table]').innerHTML=drilldownState.fields.length?`<table><thead><tr>${drilldownState.fields.map(field=>`<th>${esc(field)}</th>`).join('')}</tr></thead><tbody>${page.map(row=>`<tr>${drilldownState.fields.map(field=>`<td>${esc(row[field])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${drilldownState.fields.length}">ไม่พบข้อมูล</td></tr>`}</tbody></table>`:'<div class="db-empty-inline">ไม่มีคอลัมน์ที่ได้รับอนุญาตให้แสดง</div>';
  }
  function openDrilldown(payload){drilldownState={rows:Array.isArray(payload.rows)?payload.rows:[],fields:Array.isArray(payload.fields)?payload.fields:[],title:payload.title||'รายละเอียดข้อมูล',exportName:payload.exportName||'dashboard-detail'};const overlay=ensureDrilldown();overlay.querySelector('[data-drilldown-search]').value='';overlay.querySelector('#dbDrilldownTitle').textContent=drilldownState.title;drawDrilldown();overlay.classList.add('show');overlay.querySelector('[data-drilldown-search]').focus();}

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

    const fullscreen = el('button', 'db-btn db-viewer-fullscreen', '<i class="bi bi-easel2"></i><span>นำเสนอ</span>');
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

    const presentationDock = el('div', 'db-presentation-dock', '<button type="button" data-presentation-overview title="แสดงภาพรวม"><i class="bi bi-grid-1x2"></i><span>ภาพรวม</span></button><button type="button" data-presentation-prev title="Widget ก่อนหน้า"><i class="bi bi-chevron-left"></i></button><strong data-presentation-count>ภาพรวม</strong><button type="button" data-presentation-next title="Widget ถัดไป"><i class="bi bi-chevron-right"></i></button><button type="button" data-presentation-exit title="ออกจากโหมดนำเสนอ"><i class="bi bi-fullscreen-exit"></i><span>ออก</span></button>');
    root.appendChild(presentationDock);

    const toggle = filterBar.querySelector('[data-viewer-filter-toggle]');
    const reset = filterBar.querySelector('[data-viewer-reset]');
    const resultLabel = filterBar.querySelector('[data-result-label]');
    const badge = filterBar.querySelector('[data-filter-badge]');
    let initialized = false;
    let slideIndex = -1;

    function decorateWidgets() {
      const icons = {kpi:'bi-speedometer2',bar:'bi-bar-chart',horizontalBar:'bi-bar-chart-steps',line:'bi-graph-up',area:'bi-graph-up-arrow',pie:'bi-pie-chart',radar:'bi-bullseye',polarArea:'bi-circle-half',table:'bi-table'};
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
      if (root.classList.contains('is-presentation')) setSlide(slideIndex);
    }

    function presentationCards() { return Array.from(canvas.querySelectorAll('.db-widget')); }

    function setSlide(index) {
      const cards = presentationCards();
      if (!cards.length) index = -1;
      else index = Math.max(-1, Math.min(cards.length - 1, Number(index)));
      slideIndex = index;
      cards.forEach((card, cardIndex) => card.classList.toggle('is-presentation-focus', index >= 0 && cardIndex === index));
      root.classList.toggle('is-presentation-overview', index < 0);
      presentationDock.querySelector('[data-presentation-count]').textContent = index < 0 ? `ภาพรวม • ${cards.length} Widget` : `${index + 1} / ${cards.length}`;
      presentationDock.querySelector('[data-presentation-prev]').disabled = index < 0;
      presentationDock.querySelector('[data-presentation-next]').disabled = !cards.length || index >= cards.length - 1;
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }

    async function enterPresentation() {
      root.classList.add('is-presentation');
      setSlide(-1);
      try { if (!document.fullscreenElement && root.requestFullscreen) await root.requestFullscreen(); } catch (error) {}
    }

    async function exitPresentation() {
      root.classList.remove('is-presentation');
      setSlide(-1);
      try { if (document.fullscreenElement === root) await document.exitFullscreen(); } catch (error) {}
    }

    toggle.addEventListener('click', () => setFiltersVisible(filters.classList.contains('is-collapsed')));
    reset.addEventListener('click', () => clearFilters(filters));
    filters.addEventListener('input', () => update(canvasDetail(canvas)));
    filters.addEventListener('change', () => update(canvasDetail(canvas)));
    canvas.addEventListener('haos:dashboard-rendered', event => update(event.detail));

    fullscreen.addEventListener('click', () => root.classList.contains('is-presentation') ? exitPresentation() : enterPresentation());
    presentationDock.querySelector('[data-presentation-overview]').addEventListener('click', () => setSlide(-1));
    presentationDock.querySelector('[data-presentation-prev]').addEventListener('click', () => setSlide(slideIndex <= 0 ? -1 : slideIndex - 1));
    presentationDock.querySelector('[data-presentation-next]').addEventListener('click', () => setSlide(slideIndex < 0 ? 0 : slideIndex + 1));
    presentationDock.querySelector('[data-presentation-exit]').addEventListener('click', exitPresentation);
    document.addEventListener('keydown', event => {
      if (!root.classList.contains('is-presentation')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {event.preventDefault();setSlide(slideIndex < 0 ? 0 : slideIndex + 1);}
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {event.preventDefault();setSlide(slideIndex <= 0 ? -1 : slideIndex - 1);}
      if (event.key === 'Home') {event.preventDefault();setSlide(-1);}
      if (event.key === 'Escape' && !document.fullscreenElement) exitPresentation();
    });

    document.addEventListener('fullscreenchange', () => {
      const active = document.fullscreenElement === root;
      if (!document.fullscreenElement && root.classList.contains('is-presentation')) root.classList.remove('is-presentation');
      fullscreen.querySelector('i').className = `bi ${active ? 'bi-fullscreen-exit' : 'bi-easel2'}`;
      fullscreen.querySelector('span').textContent = active ? 'ออกจากนำเสนอ' : 'นำเสนอ';
      if (!active) setSlide(-1);
    });

    new MutationObserver(syncFilterAvailability).observe(filters, {childList:true, subtree:true});
    new MutationObserver(decorateWidgets).observe(canvas, {childList:true, subtree:true});
    syncFilterAvailability();
    decorateWidgets();
    update(canvasDetail(canvas));
    return {update, setFiltersVisible, clearFilters:() => clearFilters(filters)};
  }

  function boot() {
    setup({rootId:'dbViewerView', canvasId:'dbViewerCanvas', filtersId:'dbViewerFilters', headerSelector:'.db-toolbar'});
    setup({rootId:'dbPublicViewer', canvasId:'dbPublicViewerCanvas', filtersId:'dbPublicViewerFilters', headerSelector:'.db-public-viewer-head'});
  }

  window.HAOSDashboardViewerUI = {setup, activeFilterCount, clearFilters, openDrilldown, version:VERSION};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
