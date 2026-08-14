(function () {
  'use strict';
  const VERSION = 'v70.141-dashboard-editor-layout';
  const chartByBody = new WeakMap();
  const tableStateByWidget = new Map();
  const WIDTHS = [3, 4, 6, 8, 12];
  const THEMES = {
    haos: {accent:'#1483a3', line:'#087d78', palette:['#1677ff','#0aa577','#f59e0b','#ef4444','#8b5cf6','#0891b2','#ec4899','#64748b'], grid:'rgba(92,112,128,.14)', text:'#34475a'},
    executive: {accent:'#0b6b57', line:'#b7791f', palette:['#0b6b57','#b7791f','#274c77','#7c3f58','#53868b','#5f6b7a','#9a6b2f','#2f766d'], grid:'rgba(67,79,88,.14)', text:'#263238'},
    civic: {accent:'#176b87', line:'#a33d5d', palette:['#176b87','#16856a','#a33d5d','#d17a22','#5667a9','#68737d','#b99a28','#3196a1'], grid:'rgba(75,98,112,.14)', text:'#304657'},
    midnight: {accent:'#38bdf8', line:'#34d399', palette:['#38bdf8','#34d399','#fbbf24','#fb7185','#a78bfa','#22d3ee','#f472b6','#94a3b8'], grid:'rgba(148,163,184,.18)', text:'#dbeafe'}
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const numeric = value => { const number = Number(String(value == null ? '' : value).replace(/,/g, '')); return Number.isFinite(number) ? number : 0; };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
  const defaultHeight = type => type === 'table' ? 440 : type === 'kpi' ? 240 : 320;
  const nearestWidth = value => WIDTHS.reduce((best, width) => Math.abs(width - value) < Math.abs(best - value) ? width : best, 6);

  function activeFilterCount(filters) {
    return (filters || []).filter(filter => {
      const value = filter && filter.value;
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === 'object') return Object.values(value).some(item => String(item || '').trim() !== '');
      return value === 0 || String(value || '').trim() !== '';
    }).length;
  }

  function emitRendered(container, detail) {
    container.dataset.totalRows = String(detail.totalRows);
    container.dataset.visibleRows = String(detail.visibleRows);
    container.dataset.widgetCount = String(detail.widgetCount);
    container.dataset.activeFilters = String(detail.activeFilters);
    container.dispatchEvent(new CustomEvent('haos:dashboard-rendered', {detail, bubbles:true}));
  }

  function destroyCharts(container) {
    container.querySelectorAll('[data-widget-body]').forEach(body => {
      const chart = chartByBody.get(body);
      if (!chart) return;
      try { chart.destroy(); } catch (_error) {}
      chartByBody.delete(body);
    });
  }

  function aggregate(rows, field, method) {
    const values = rows.map(row => row[field]).filter(value => value !== '' && value != null);
    if (method === 'count') return rows.length;
    if (method === 'distinct') return new Set(values.map(String)).size;
    const numbers = values.map(numeric);
    if (!numbers.length) return 0;
    if (method === 'avg') return numbers.reduce((a,b) => a + b, 0) / numbers.length;
    if (method === 'min') return Math.min(...numbers);
    if (method === 'max') return Math.max(...numbers);
    return numbers.reduce((a,b) => a + b, 0);
  }

  function group(rows, dimension, metric, method) {
    const groups = new Map();
    rows.forEach(row => {
      const key = String(row[dimension] == null || row[dimension] === '' ? 'ไม่ระบุ' : row[dimension]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return Array.from(groups.entries()).slice(0, 30).map(([label, items]) => ({ label, value:aggregate(items, metric, method || (metric ? 'sum' : 'count')) }));
  }

  function filteredRows(rows, filters) {
    return (rows || []).filter(row => (filters || []).every(filter => {
      if (!filter.value && filter.value !== 0) return true;
      const value = row[filter.field];
      if (filter.type === 'search') return String(value || '').toLowerCase().includes(String(filter.value).toLowerCase());
      if (filter.type === 'number') {
        if (typeof filter.value === 'object') {
          const number = numeric(value); const min = filter.value.min === '' ? -Infinity : numeric(filter.value.min); const max = filter.value.max === '' ? Infinity : numeric(filter.value.max);
          return number >= min && number <= max;
        }
        return numeric(value) >= numeric(filter.value);
      }
      if (filter.type === 'multi') return (filter.value || []).includes(String(value));
      if (filter.type === 'date') { const time=Date.parse(String(value||''));const from=filter.value&&filter.value.from?Date.parse(filter.value.from):-Infinity;const to=filter.value&&filter.value.to?Date.parse(filter.value.to)+86400000:Infinity;return Number.isFinite(time)&&time>=from&&time<to; }
      return String(value) === String(filter.value);
    }));
  }

  function csvCell(value) {
    let text = String(value == null ? '' : value);
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv(rows, fields, name) {
    const content = '\ufeff' + [fields.map(csvCell).join(','), ...rows.map(row => fields.map(field => csvCell(row[field])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = String(name || 'dashboard-data').replace(/[\\/:*?"<>|]+/g, '-') + '.csv';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderTableWidget(body, widget, rows) {
    const fields = (widget.fields && widget.fields.length ? widget.fields : Object.keys(rows[0] || {})).slice(0, 12);
    const stateKey = String(widget.id || widget.title || 'dashboard-table');
    const tableState = tableStateByWidget.get(stateKey) || {query:'',sortField:'',sortDirection:1,page:1,pageSize:Number(widget.limit || 20)};
    tableStateByWidget.set(stateKey, tableState);
    body.innerHTML = `<div class="db-table-tools"><input class="db-input" data-table-search placeholder="ค้นหาในตาราง" aria-label="ค้นหาในตาราง"><select class="db-select" data-table-size aria-label="จำนวนแถวต่อหน้า"><option value="10">10 แถว</option><option value="20">20 แถว</option><option value="50">50 แถว</option><option value="100">100 แถว</option></select><button class="db-btn" type="button" data-table-export title="ส่งออกข้อมูลที่ผ่านตัวกรอง"><i class="bi bi-download"></i> CSV</button></div><div class="db-table-wrap" data-table-wrap></div><div class="db-table-pager" data-table-pager></div>`;
    body.querySelector('[data-table-search]').value = tableState.query;
    body.querySelector('[data-table-size]').value = String(tableState.pageSize);
    const draw = () => {
      const query = tableState.query.toLowerCase();
      let visible = query ? rows.filter(row => fields.some(field => String(row[field] == null ? '' : row[field]).toLowerCase().includes(query))) : rows.slice();
      if (tableState.sortField) visible.sort((a,b) => String(a[tableState.sortField] == null ? '' : a[tableState.sortField]).localeCompare(String(b[tableState.sortField] == null ? '' : b[tableState.sortField]), 'th', {numeric:true}) * tableState.sortDirection);
      const pages = Math.max(1, Math.ceil(visible.length / tableState.pageSize)); tableState.page = Math.min(tableState.page, pages);
      const start = (tableState.page - 1) * tableState.pageSize; const pageRows = visible.slice(start, start + tableState.pageSize);
      body.querySelector('[data-table-wrap]').innerHTML = fields.length ? `<table><thead><tr>${fields.map(field => `<th><button type="button" class="db-table-sort" data-sort-field="${esc(field)}">${esc(field)}${tableState.sortField===field?(tableState.sortDirection===1?' ↑':' ↓'):''}</button></th>`).join('')}</tr></thead><tbody>${pageRows.map(row => `<tr>${fields.map(field => `<td>${esc(row[field])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${fields.length}">ไม่พบข้อมูล</td></tr>`}</tbody></table>` : '<div class="db-empty-inline">ไม่มีคอลัมน์สำหรับแสดงผล</div>';
      body.querySelector('[data-table-pager]').innerHTML = `<span>${visible.length.toLocaleString('th-TH')} รายการ • หน้า ${tableState.page}/${pages}</span><div><button class="db-btn" type="button" data-table-prev ${tableState.page<=1?'disabled':''} title="หน้าก่อน"><i class="bi bi-chevron-left"></i></button><button class="db-btn" type="button" data-table-next ${tableState.page>=pages?'disabled':''} title="หน้าถัดไป"><i class="bi bi-chevron-right"></i></button></div>`;
      body.querySelectorAll('[data-sort-field]').forEach(button => button.addEventListener('click', () => {const field=button.dataset.sortField;if(tableState.sortField===field)tableState.sortDirection*=-1;else{tableState.sortField=field;tableState.sortDirection=1;}tableState.page=1;draw();}));
      body.querySelector('[data-table-prev]').addEventListener('click', () => {tableState.page=Math.max(1,tableState.page-1);draw();});
      body.querySelector('[data-table-next]').addEventListener('click', () => {tableState.page=Math.min(pages,tableState.page+1);draw();});
      body.querySelector('[data-table-export]').onclick = () => downloadCsv(visible, fields, widget.title || 'dashboard-data');
    };
    let searchTimer;
    body.querySelector('[data-table-search]').addEventListener('input', event => {clearTimeout(searchTimer);searchTimer=setTimeout(()=>{tableState.query=event.target.value;tableState.page=1;draw();},180);});
    body.querySelector('[data-table-size]').addEventListener('change', event => {tableState.pageSize=Number(event.target.value||20);tableState.page=1;draw();});
    draw();
  }

  function chartDefinition(widget, theme) {
    const colors = THEMES[theme] || THEMES.haos;
    const definition = {type:'bar', indexAxis:'x', fill:false, legend:false, colors};
    if (widget.type === 'line') Object.assign(definition, {type:'line'});
    if (widget.type === 'area') Object.assign(definition, {type:'line', fill:true});
    if (widget.type === 'pie') Object.assign(definition, {type:'doughnut', legend:true});
    if (widget.type === 'horizontalBar') Object.assign(definition, {type:'bar', indexAxis:'y'});
    if (widget.type === 'radar') Object.assign(definition, {type:'radar', legend:true});
    if (widget.type === 'polarArea') Object.assign(definition, {type:'polarArea', legend:true});
    return definition;
  }

  function renderWidget(card, widget, rows, theme, options) {
    const body = card.querySelector('[data-widget-body]');
    if (widget.type === 'kpi') {
      const value = aggregate(rows, widget.metric, widget.aggregation || 'count');
      body.innerHTML = `<div class="db-kpi-value">${new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(value)}</div><div class="db-kpi-caption">${esc(widget.caption || widget.metric || 'จำนวนรายการ')}</div>`;
      return;
    }
    if (widget.type === 'table') { renderTableWidget(body, widget, rows); return; }
    if (!widget.dimension) { body.innerHTML = '<div class="db-empty-inline">กรุณาเลือกคอลัมน์สำหรับแบ่งกลุ่มข้อมูล</div>'; return; }
    const grouped = group(rows, widget.dimension, widget.metric, widget.aggregation);
    body.innerHTML = '<canvas aria-label="กราฟ Dashboard"></canvas>';
    if (!window.Chart) { body.innerHTML = '<div class="db-empty-inline">ยังโหลดเครื่องมือกราฟไม่สำเร็จ</div>'; return; }
    const old = chartByBody.get(body); if (old) old.destroy();
    const definition = chartDefinition(widget, theme);
    const colors = definition.colors;
    const radial = definition.type === 'radar' || definition.type === 'polarArea';
    const multiColor = definition.type === 'doughnut' || definition.type === 'polarArea';
    const dataset = {label:widget.title || 'ข้อมูล',data:grouped.map(item=>item.value),backgroundColor:multiColor?colors.palette:(definition.type==='bar'?colors.accent:(definition.fill?`${colors.line}33`:`${colors.line}1f`)),borderColor:multiColor?colors.palette:colors.line,borderWidth:2,borderRadius:definition.type==='bar'?5:0,tension:.28,fill:definition.fill};
    const scales = radial ? {r:{beginAtZero:true,grid:{color:colors.grid},angleLines:{color:colors.grid},pointLabels:{color:colors.text}}} : definition.type === 'doughnut' ? {} : {x:{grid:{display:false},ticks:{color:colors.text}},y:{beginAtZero:true,grid:{color:colors.grid},ticks:{color:colors.text}}};
    const interactive=options&&!options.editor&&options.interactive&&options.interactive.crossFilter!==false&&widget.dimension&&typeof options.onChartFilter==='function';
    if(interactive)body.classList.add('is-chart-interactive');
    chartByBody.set(body, new Chart(body.querySelector('canvas'), {type:definition.type,data:{labels:grouped.map(item=>item.label),datasets:[dataset]},options:{responsive:true,maintainAspectRatio:false,indexAxis:definition.indexAxis,onClick:interactive?function(_event,elements){if(!elements.length)return;const item=grouped[elements[0].index];if(!item)return;const detail={field:widget.dimension,value:item.label,widgetId:widget.id,title:widget.title};if(options.onChartFilter)options.onChartFilter(detail);}:undefined,plugins:{legend:{display:definition.legend,position:'bottom',labels:{color:colors.text}}},scales}}));
  }

  function setupEditorDrag(card, widget, options) {
    const handle = card.querySelector('[data-widget-drag]');
    if (!handle) return;
    handle.draggable=true;
    handle.addEventListener('dragstart', event => {
      card.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', widget.id);
    });
    handle.addEventListener('dragend', () => card.classList.remove('is-dragging'));
    card.addEventListener('dragover', event => {event.preventDefault();event.dataTransfer.dropEffect='move';card.classList.add('is-drop-target');});
    card.addEventListener('dragleave', () => card.classList.remove('is-drop-target'));
    card.addEventListener('drop', event => {
      event.preventDefault();
      card.classList.remove('is-drop-target');
      const source = event.dataTransfer.getData('text/plain');
      if (source && source !== widget.id && options.onMove) options.onMove(source, widget.id);
    });
  }

  function setupEditorResize(card, grid, widget, options) {
    const handle = card.querySelector('[data-widget-resize]');
    if (!handle || !options.onResize) return;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = card.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      const gap = 12;
      const unit = Math.max(1, (gridRect.width - gap * 11) / 12);
      let width = nearestWidth(Number(widget.width || 6));
      let height = clamp(widget.height || defaultHeight(widget.type), 220, 720);
      let finished = false;
      card.classList.add('is-resizing');
      if (handle.setPointerCapture) {
        try { handle.setPointerCapture(event.pointerId); } catch (_error) {}
      }
      const move = moveEvent => {
        const targetColumns = (startRect.width + (moveEvent.clientX - startX) + gap) / (unit + gap);
        if (window.innerWidth > 640) width = nearestWidth(targetColumns);
        height = Math.round(clamp((widget.height || startRect.height) + (moveEvent.clientY - startY), 220, 720) / 20) * 20;
        card.dataset.widgetWidth = String(width);
        card.style.setProperty('--db-widget-height', `${height}px`);
        const label = card.querySelector('[data-widget-size-label]');
        if (label) label.textContent = `${width}/12 • ${height}px`;
      };
      const end = () => {
        if (finished) return;
        finished = true;
        card.classList.remove('is-resizing');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        options.onResize(widget.id, {width, height});
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  }

  function render(container, project, rows, options) {
    options = options || {};
    const config = project.config || {widgets:[],filters:[]};
    const theme = THEMES[config.theme] ? config.theme : 'haos';
    const density = config.density === 'compact' ? 'compact' : 'comfortable';
    const visibleRows = filteredRows(rows || [], options.filters || []);
    container.dataset.dashboardTheme = theme;
    container.dataset.dashboardDensity = density;
    container.dataset.layoutVersion = String(config.layoutVersion || 1);
    const renderDetail = {
      totalRows: (rows || []).length,
      visibleRows: visibleRows.length,
      widgetCount: (config.widgets || []).length,
      activeFilters: activeFilterCount(options.filters || [])
    };
    container.dataset.totalRows = String(renderDetail.totalRows);
    container.dataset.visibleRows = String(renderDetail.visibleRows);
    container.dataset.widgetCount = String(renderDetail.widgetCount);
    container.dataset.activeFilterCount = String(renderDetail.activeFilters);
    destroyCharts(container);
    container.innerHTML = '';
    if (!config.widgets || !config.widgets.length) {
      container.innerHTML = '<div class="db-empty"><strong>Dashboard ยังไม่มี Widget</strong><span>เปิดโหมดแก้ไขแล้วเพิ่ม KPI, กราฟ หรือตาราง</span></div>';
      emitRendered(container, renderDetail);
      return;
    }
    const grid = document.createElement('div'); grid.className = 'db-widget-grid';
    config.widgets.slice().sort((a,b)=>(a.order||0)-(b.order||0)).forEach(widget => {
      const width = nearestWidth(Number(widget.width || 6));
      const height = clamp(widget.height || defaultHeight(widget.type), 220, 720);
      const card = document.createElement('article'); card.className='db-widget'; card.dataset.widgetId=widget.id; card.dataset.widgetType=widget.type; card.dataset.widgetWidth=String(width);card.style.setProperty('--db-widget-height',`${height}px`);
      const editorControls=options.editor?`<div class="db-widget-editor-tools"><button class="db-widget-drag" type="button" data-widget-drag title="ลากเพื่อย้ายตำแหน่ง" aria-label="ลากเพื่อย้าย ${esc(widget.title||'Widget')}"><i class="bi bi-grip-vertical"></i></button><button class="db-widget-order" type="button" data-widget-move-step="-1" data-widget-id="${esc(widget.id)}" title="เลื่อนไปก่อนหน้า" aria-label="เลื่อน ${esc(widget.title||'Widget')} ไปก่อนหน้า"><i class="bi bi-arrow-left"></i></button><button class="db-widget-order" type="button" data-widget-move-step="1" data-widget-id="${esc(widget.id)}" title="เลื่อนไปถัดไป" aria-label="เลื่อน ${esc(widget.title||'Widget')} ไปถัดไป"><i class="bi bi-arrow-right"></i></button><span data-widget-size-label>${width}/12 • ${height}px</span></div>`:'';
      const drilldown=!options.editor&&options.interactive&&options.interactive.drilldown!==false&&options.onDrilldown?`<button type="button" data-widget-drilldown title="ดูข้อมูลเบื้องหลัง"><i class="bi bi-search"></i></button>`:'';
      const actions=options.editor?`<div class="db-widget-actions"><button type="button" data-widget-edit="${esc(widget.id)}" title="แก้ไข"><i class="bi bi-pencil"></i></button><button type="button" data-widget-duplicate="${esc(widget.id)}" title="ทำสำเนา"><i class="bi bi-copy"></i></button><button type="button" data-widget-delete="${esc(widget.id)}" title="ลบ"><i class="bi bi-trash"></i></button></div>`:drilldown?`<div class="db-widget-actions db-widget-view-actions">${drilldown}</div>`:'';
      card.innerHTML = `<header>${editorControls}<div class="db-widget-heading"><span class="db-widget-kind">${esc(String(widget.type).toUpperCase())}</span><h3>${esc(widget.title||'Widget')}</h3></div>${actions}</header><div class="db-widget-body" data-widget-body></div>${options.editor?'<button class="db-widget-resize" type="button" data-widget-resize title="ลากเพื่อปรับขนาด" aria-label="ปรับขนาด Widget"><i class="bi bi-arrows-angle-expand"></i></button>':''}`;
      grid.appendChild(card);
      if(options.editor){
        setupEditorDrag(card,widget,options);
        setupEditorResize(card,grid,widget,options);
        [
          ['[data-widget-edit]',options.onEdit],
          ['[data-widget-duplicate]',options.onDuplicate],
          ['[data-widget-delete]',options.onDelete]
        ].forEach(([selector,handler])=>{
          const button=card.querySelector(selector);
          if(!button||typeof handler!=='function')return;
          button.addEventListener('click',event=>{
            event.preventDefault();
            event.stopPropagation();
            handler(widget.id);
          });
        });
      }
      const drillButton=card.querySelector('[data-widget-drilldown]');if(drillButton)drillButton.addEventListener('click',()=>options.onDrilldown({widgetId:widget.id,title:widget.title||'รายละเอียดข้อมูล',fields:(widget.fields||[]).slice(0,12)}));
      renderWidget(card,widget,visibleRows,theme,options);
    });
    container.appendChild(grid);
    emitRendered(container, renderDetail);
  }
  window.HAOSDashboardRenderer={render,aggregate,group,filteredRows,activeFilterCount,esc,csvCell,downloadCsv,chartDefinition,version:VERSION};
})();
