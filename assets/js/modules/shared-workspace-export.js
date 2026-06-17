(function(){
  const PATCH = 'v70.71-shared-workspace-export-stabilizer';
  if (window.__HAOS_V771_SHARED_WORKSPACE_EXPORT__) return;
  window.__HAOS_V771_SHARED_WORKSPACE_EXPORT__ = true;

  const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const root = window.HAOS = window.HAOS || {};
  const core = () => window.HAOSWorkspaceCore || root.workspace || {};
  const previousExport = window.exportWorkspaceResponsesV737;
  const $ = id => document.getElementById(id);
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const answerText = value => {
    if (core().answerText) return core().answerText(value);
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(answerText).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      if (value.text != null) return answerText(value.text);
      if (value.url != null) return answerText(value.url);
      return JSON.stringify(value);
    }
    return String(value).replace(/\r?\n/g, '\n').trim();
  };

  function currentWorkspace() {
    try { return window.currentWorkspace || currentWorkspace || null; } catch (e) { return window.currentWorkspace || null; }
  }

  function fileNameSafe(value) {
    return String(value || 'haos').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 80);
  }

  function responseState() {
    const state = Object.assign({}, window.haosWorkspaceResponseStateV737 || {});
    ['question', 'answer', 'group', 'view'].forEach(key => {
      const el = $('wsResp' + key.charAt(0).toUpperCase() + key.slice(1) + 'V737');
      if (el) state[key] = el.value;
    });
    state.question = state.question == null ? '' : String(state.question);
    state.answer = state.answer == null ? '' : String(state.answer);
    state.group = state.group == null ? '' : String(state.group);
    return state;
  }

  function hasExplicitTimestamp(fields) {
    const first = (fields || []).find(field => Number(field.index) === 0);
    return !!(first && /timestamp|submitted|created|datetime|date time|เวลาส่ง|เวลาบันทึก|วันที่ส่ง|วันที่บันทึก/i.test(String(first.label || '')));
  }

  function showTimestamp(workspace) {
    try { return localStorage.getItem('haos_ws_show_time_v742_' + (workspace && workspace.id || 'global')) !== '0'; }
    catch (e) { return true; }
  }

  function responseTime(workspace, row, index, fields) {
    const meta = ((workspace && workspace.responseMeta) || [])[index] || {};
    if (meta.submittedAt || meta.timestamp || meta.createdAt) return meta.submittedAt || meta.timestamp || meta.createdAt;
    if (hasExplicitTimestamp(fields) && row && row[0]) return row[0];
    return '';
  }

  function collectRows(workspace) {
    if (core().responseRows) return core().responseRows(workspace);
    try {
      if (typeof window.collectWorkspaceRowsApp === 'function') return window.collectWorkspaceRowsApp();
    } catch (e) {}
    return (workspace && workspace.rows) || [];
  }

  function fields(workspace) {
    return core().fieldsFromWorkspace ? core().fieldsFromWorkspace(workspace) : [];
  }

  function buildExportRows(workspace) {
    workspace = workspace || currentWorkspace() || {};
    const allFields = fields(workspace);
    const explicitTimestamp = hasExplicitTimestamp(allFields);
    const state = responseState();
    const selectable = allFields.filter(field => !(explicitTimestamp && Number(field.index) === 0));
    const visibleFields = state.question !== ''
      ? selectable.filter(field => String(field.index) === String(state.question))
      : selectable;
    const groupField = selectable.find(field => String(field.index) === String(state.group));
    const query = clean(state.answer).toLowerCase();
    const sourceRows = collectRows(workspace);
    const rows = (sourceRows || []).map((row, index) => ({
      row: Array.isArray(row) ? row : [],
      index,
      time: responseTime(workspace, row, index, allFields)
    })).filter(packet => {
      if (!query) return true;
      return [packet.time].concat(packet.row || []).map(answerText).join(' ').toLowerCase().includes(query);
    });
    const header = [];
    if (groupField) header.push('กลุ่ม');
    if (showTimestamp(workspace)) header.push('เวลาตอบ');
    visibleFields.forEach(field => header.push(answerText(field.label || ('ช่องข้อมูล ' + (Number(field.index) + 1)))));

    const aoa = [
      [answerText(workspace.title || 'รายงานคำตอบ')],
      [answerText(workspace.description || '')],
      ['วันที่ส่งออก', window.HAOSDateDisplay ? window.HAOSDateDisplay.dateTime(new Date(), { forceTime: true }) : new Date().toLocaleString('th-TH'), 'จำนวนคำตอบ', String(rows.length)],
      [],
      header.length ? header : ['คำตอบ']
    ];
    rows.forEach(packet => {
      const out = [];
      if (groupField) out.push(answerText(packet.row[groupField.index] || 'ไม่ระบุ'));
      if (showTimestamp(workspace)) out.push(answerText(packet.time || ''));
      visibleFields.forEach(field => out.push(answerText(packet.row[field.index])));
      aoa.push(out);
    });
    return { aoa, header, rows, fields: visibleFields };
  }

  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (window.__HAOS_XLSX_LOADER__) return window.__HAOS_XLSX_LOADER__;
    window.__HAOS_XLSX_LOADER__ = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_SRC;
      script.async = true;
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('XLSX library not available'));
      script.onerror = () => reject(new Error('โหลดไลบรารี Excel ไม่สำเร็จ'));
      document.head.appendChild(script);
    });
    return window.__HAOS_XLSX_LOADER__;
  }

  function forceTextCells(XLSX, sheet) {
    const ref = sheet['!ref'] || 'A1:A1';
    const range = XLSX.utils.decode_range(ref);
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!sheet[addr]) sheet[addr] = { t: 's', v: '' };
        sheet[addr].t = 's';
        sheet[addr].v = answerText(sheet[addr].v);
        sheet[addr].z = '@';
      }
    }
  }

  function applyColumnWidths(sheet, aoa, colCount) {
    const widths = [];
    for (let c = 0; c < colCount; c += 1) {
      let max = 12;
      aoa.forEach(row => { max = Math.max(max, answerText(row && row[c]).length); });
      widths.push({ wch: Math.min(Math.max(max + 2, 12), 44) });
    }
    sheet['!cols'] = widths;
  }

  function downloadArrayBuffer(name, mime, buffer) {
    const blob = new Blob([buffer], { type: mime });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 800);
  }

  async function exportXlsx() {
    const workspace = currentWorkspace();
    if (!workspace) {
      return Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลพื้นที่ทำงานสำหรับส่งออก Excel', 'warning');
    }
    Swal.fire({
      title: 'กำลังสร้าง Excel...',
      text: 'ระบบกำลังสร้างไฟล์ .xlsx และคงเลข 0 นำหน้าให้ครบ',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    try {
      const XLSX = await ensureXlsx();
      const { aoa, header } = buildExportRows(workspace);
      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      forceTextCells(XLSX, sheet);
      const colCount = Math.max(header.length, 1);
      sheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(colCount - 1, 0) } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(colCount - 1, 0) } }
      ];
      applyColumnWidths(sheet, aoa, colCount);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, fileNameSafe(workspace.title || 'Responses').slice(0, 31) || 'Responses');
      const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      downloadArrayBuffer(
        fileNameSafe(workspace.title || 'workspace_responses') + '_' + Date.now() + '.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        out
      );
      if (window.Swal && Swal.isVisible()) Swal.close();
    } catch (error) {
      Swal.fire('ส่งออก Excel ไม่สำเร็จ', String(error && error.message ? error.message : error), 'error');
    }
  }

  window.exportWorkspaceResponsesV737 = function(kind, orientation) {
    if (kind === 'xls' || kind === 'xlsx') return exportXlsx();
    if (typeof previousExport === 'function') return previousExport.apply(this, arguments);
  };

  root.workspaceExport = {
    version: PATCH,
    buildExportRows,
    exportXlsx,
    diagnostics: () => {
      const workspace = currentWorkspace() || {};
      const matrix = buildExportRows(workspace);
      return {
        patch: PATCH,
        currentWorkspaceId: workspace.id || '',
        rows: matrix.rows.length,
        columns: matrix.header.length,
        core: core().version || ''
      };
    }
  };
  window.haosWorkspaceExportDiagnosticsV771 = root.workspaceExport.diagnostics;
  console.info('HAOS ' + PATCH + ' loaded');
})();
