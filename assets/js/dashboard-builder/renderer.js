(function () {
  'use strict';
  const chartByBody = new WeakMap();
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const numeric = value => { const number = Number(String(value == null ? '' : value).replace(/,/g, '')); return Number.isFinite(number) ? number : 0; };

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
    const tableState = {query:'',sortField:'',sortDirection:1,page:1,pageSize:Number(widget.limit || 20)};
    body.innerHTML = `<div class="db-table-tools"><input class="db-input" data-table-search placeholder="ค้นหาในตาราง" aria-label="ค้นหาในตาราง"><select class="db-select" data-table-size aria-label="จำนวนแถวต่อหน้า"><option value="10">10 แถว</option><option value="20">20 แถว</option><option value="50">50 แถว</option><option value="100">100 แถว</option></select><button class="db-btn" type="button" data-table-export title="ส่งออกข้อมูลที่ผ่านตัวกรอง"><i class="bi bi-download"></i> CSV</button></div><div class="db-table-wrap" data-table-wrap></div><div class="db-table-pager" data-table-pager></div>`;
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

  function renderWidget(card, widget, rows) {
    const body = card.querySelector('[data-widget-body]');
    if (widget.type === 'kpi') {
      const value = aggregate(rows, widget.metric, widget.aggregation || 'count');
      body.innerHTML = `<div class="db-kpi-value">${new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(value)}</div><div class="db-kpi-caption">${esc(widget.caption || widget.metric || 'จำนวนรายการ')}</div>`;
      return;
    }
    if (widget.type === 'table') { renderTableWidget(body, widget, rows); return; }
    const grouped = group(rows, widget.dimension, widget.metric, widget.aggregation);
    body.innerHTML = '<canvas aria-label="กราฟ Dashboard"></canvas>';
    if (!window.Chart) { body.innerHTML = '<div class="db-empty-inline">ยังโหลดเครื่องมือกราฟไม่สำเร็จ</div>'; return; }
    const old = chartByBody.get(body); if (old) old.destroy();
    const type = widget.type === 'line' ? 'line' : widget.type === 'pie' ? 'doughnut' : 'bar';
    const palette = ['#1677ff','#0aa577','#f59e0b','#ef4444','#8b5cf6','#0891b2','#ec4899','#64748b'];
    chartByBody.set(body, new Chart(body.querySelector('canvas'), {type,data:{labels:grouped.map(item=>item.label),datasets:[{label:widget.title || 'ข้อมูล',data:grouped.map(item=>item.value),backgroundColor:type==='doughnut'?palette:(type==='bar'?'#1483a3':'rgba(8,125,120,.14)'),borderColor:type==='line'?'#087d78':undefined,borderWidth:2,borderRadius:type==='bar'?5:0,tension:.25,fill:type==='line'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='doughnut',position:'bottom'}},scales:type==='doughnut'?{}:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(92,112,128,.14)'}}}}}));
  }

  function render(container, project, rows, options) {
    options = options || {};
    const config = project.config || {widgets:[],filters:[]};
    const visibleRows = filteredRows(rows || [], options.filters || []);
    emitRendered(container, {
      totalRows: (rows || []).length,
      visibleRows: visibleRows.length,
      widgetCount: (config.widgets || []).length,
      activeFilters: activeFilterCount(options.filters || [])
    });
    container.innerHTML = '';
    if (!config.widgets || !config.widgets.length) { container.innerHTML = '<div class="db-empty"><strong>Dashboard ยังไม่มี Widget</strong><span>เปิดโหมดแก้ไขแล้วเพิ่ม KPI, กราฟ หรือตาราง</span></div>'; return; }
    const grid = document.createElement('div'); grid.className = 'db-widget-grid';
    config.widgets.slice().sort((a,b)=>(a.order||0)-(b.order||0)).forEach(widget => {
      const card = document.createElement('article'); card.className='db-widget'; card.dataset.widgetId=widget.id; card.dataset.widgetType=widget.type; card.dataset.widgetWidth=String(Math.max(3,Math.min(12,Number(widget.width||6))));
      card.innerHTML = `<header><div><span class="db-widget-kind">${esc(String(widget.type).toUpperCase())}</span><h3>${esc(widget.title||'Widget')}</h3></div>${options.editor?`<div class="db-widget-actions"><button type="button" data-widget-edit="${esc(widget.id)}" title="แก้ไข"><i class="bi bi-pencil"></i></button><button type="button" data-widget-duplicate="${esc(widget.id)}" title="ทำสำเนา"><i class="bi bi-copy"></i></button><button type="button" data-widget-delete="${esc(widget.id)}" title="ลบ"><i class="bi bi-trash"></i></button></div>`:''}</header><div class="db-widget-body" data-widget-body></div>`;
      if (options.editor) { card.draggable=true; card.addEventListener('dragstart',event=>event.dataTransfer.setData('text/plain',widget.id)); card.addEventListener('dragover',event=>event.preventDefault()); card.addEventListener('drop',event=>{event.preventDefault();const source=event.dataTransfer.getData('text/plain');if(source&&source!==widget.id&&options.onMove)options.onMove(source,widget.id);}); }
      grid.appendChild(card); renderWidget(card,widget,visibleRows);
    });
    container.appendChild(grid);
  }
  window.HAOSDashboardRenderer={render,aggregate,group,filteredRows,activeFilterCount,esc,csvCell,downloadCsv};
})();
