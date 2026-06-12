(function(){
  const PATCH = 'v70.69-shared-workspace-core-stabilizer';
  if (window.__HAOS_V769_SHARED_WORKSPACE_CORE__) return;
  window.__HAOS_V769_SHARED_WORKSPACE_CORE__ = true;

  const root = window.HAOS = window.HAOS || {};
  const previous = root.workspace || {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const choiceTypes = new Set(['dropdown', 'radio', 'checkbox']);
  const validTypes = new Set(['text', 'textarea', 'dropdown', 'radio', 'checkbox', 'image']);

  function splitOptions(value) {
    if (Array.isArray(value)) return value.map(clean).filter(Boolean);
    const seen = new Set();
    return String(value || '').split(/[,|]/).map(clean).filter(Boolean).filter(option => {
      const key = option.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function bool(value, fallback) {
    if (value === true || value === false) return value;
    if (value == null || value === '') return !!fallback;
    const text = String(value).trim().toLowerCase();
    if (/^(true|yes|y|1|on|required|จำเป็น)$/i.test(text)) return true;
    if (/^(false|no|n|0|off)$/i.test(text)) return false;
    return !!fallback;
  }

  function parseSpec(spec) {
    if (typeof window.parseWorkspaceFieldApp_ === 'function') {
      try {
        const parsed = window.parseWorkspaceFieldApp_(spec);
        if (parsed && parsed.label) return normalizeField(parsed, 0, spec);
      } catch (e) {}
    }
    const raw = String(spec || '').trim();
    const optionMatch = raw.match(/\[(?:dropdown|dropdownlist|select|radio|choice|checkbox|check):\s*([^\]]+)\]/i);
    const label = clean(raw.replace(/\[[^\]]+\]/g, '').replace(/\*\s*$/, '')) || raw || 'Field';
    const type = /radio|choice/i.test(raw) ? 'radio'
      : /dropdown|dropdownlist|select/i.test(raw) ? 'dropdown'
      : /checkbox|check/i.test(raw) ? 'checkbox'
      : /image|photo|picture|รูปภาพ/i.test(raw) ? 'image'
      : /textarea|longtext|paragraph|ยาว/i.test(raw) ? 'textarea'
      : 'text';
    return {
      index: 0,
      label,
      type,
      options: splitOptions(optionMatch && optionMatch[1]),
      required: /\[(?:required|require|\*|จำเป็น)\]/i.test(raw) || /\*\s*$/.test(raw)
    };
  }

  function normalizeField(field, index, spec) {
    field = field || {};
    const parsed = spec ? parseSpecWithoutExternal(spec) : {};
    const type = validTypes.has(String(field.type || parsed.type || 'text')) ? String(field.type || parsed.type || 'text') : 'text';
    const normalized = {
      index: Number.isFinite(Number(field.index)) ? Number(field.index) : index,
      label: clean(field.label || parsed.label || spec || ('Field ' + (index + 1))),
      type,
      options: splitOptions(field.options && field.options.length != null ? field.options : parsed.options),
      required: bool(field.required, parsed.required)
    };
    ['sectionId', 'points', 'correctAnswers', 'isQuizField', 'skipQuiz', 'quizSettings', 'quizShowScore', 'quizShowCorrect'].forEach(key => {
      if (field[key] !== undefined) normalized[key] = field[key];
    });
    if (!normalized.sectionId) normalized.sectionId = 's1';
    return normalized;
  }

  function parseSpecWithoutExternal(spec) {
    const raw = String(spec || '').trim();
    const optionMatch = raw.match(/\[(?:dropdown|dropdownlist|select|radio|choice|checkbox|check):\s*([^\]]+)\]/i);
    const type = /radio|choice/i.test(raw) ? 'radio'
      : /dropdown|dropdownlist|select/i.test(raw) ? 'dropdown'
      : /checkbox|check/i.test(raw) ? 'checkbox'
      : /image|photo|picture|รูปภาพ/i.test(raw) ? 'image'
      : /textarea|longtext|paragraph|ยาว/i.test(raw) ? 'textarea'
      : 'text';
    return {
      label: clean(raw.replace(/\[[^\]]+\]/g, '').replace(/\*\s*$/, '')) || raw,
      type,
      options: splitOptions(optionMatch && optionMatch[1]),
      required: /\[(?:required|require|\*|จำเป็น)\]/i.test(raw) || /\*\s*$/.test(raw)
    };
  }

  function specFromField(field) {
    if (typeof window.specFromFieldV737 === 'function') {
      try { return window.specFromFieldV737(field); } catch (e) {}
    }
    field = normalizeField(field || {}, Number(field && field.index) || 0);
    const opts = splitOptions(field.options).join(', ');
    let spec = field.label || 'Field';
    if (field.type === 'dropdown') spec += ' [dropdown: ' + (opts || 'Option 1, Option 2') + ']';
    else if (field.type === 'radio') spec += ' [radio: ' + (opts || 'Option 1, Option 2') + ']';
    else if (field.type === 'checkbox') spec += opts ? ' [checkbox: ' + opts + ']' : ' [checkbox]';
    else if (field.type === 'textarea') spec += ' [textarea]';
    else if (field.type === 'image') spec += ' [image]';
    if (field.required) spec += ' [required]';
    return spec;
  }

  function fieldsFromWorkspace(workspace) {
    workspace = workspace || current();
    const cols = Array.isArray(workspace && workspace.columns) ? workspace.columns : [];
    const cfg = Array.isArray(workspace && workspace.fieldConfig) ? workspace.fieldConfig : [];
    const max = Math.max(cols.length, cfg.length);
    const out = [];
    for (let i = 0; i < max; i++) {
      const parsed = parseSpecWithoutExternal(cols[i] || (cfg[i] && cfg[i].label) || '');
      out.push(normalizeField(Object.assign({}, parsed, cfg[i] || {}), i, cols[i]));
    }
    return out.filter(field => field.label);
  }

  function defaultFlow() {
    return {
      enabled: false,
      version: 'v1',
      mode: 'sections',
      sections: [{ id: 's1', title: 'Section 1' }],
      logicRules: []
    };
  }

  function normalizeFlow(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const sections = (Array.isArray(raw.sections) && raw.sections.length ? raw.sections : defaultFlow().sections)
      .map((section, index) => ({
        id: clean(section && section.id).replace(/[^\w-]/g, '') || ('s' + (index + 1)),
        title: clean(section && section.title) || ('Section ' + (index + 1))
      }));
    const ids = new Set(sections.map(section => section.id));
    const rules = (Array.isArray(raw.logicRules) ? raw.logicRules : []).map(rule => {
      const action = ['next', 'section', 'submit'].includes(String(rule && rule.action || 'next')) ? String(rule.action || 'next') : 'next';
      const targetSectionId = action === 'section' && ids.has(String(rule && rule.targetSectionId || '')) ? String(rule.targetSectionId || '') : '';
      return {
        fieldIndex: Number(rule && rule.fieldIndex),
        option: clean(rule && rule.option),
        action,
        targetSectionId
      };
    }).filter(rule => Number.isFinite(rule.fieldIndex) && rule.option);
    return {
      enabled: bool(raw.enabled, false),
      version: 'v1',
      mode: 'sections',
      sections,
      logicRules: rules
    };
  }

  function current() {
    try { return window.currentWorkspace || currentWorkspace || null; } catch (e) { return window.currentWorkspace || null; }
  }

  function list() {
    try { if (Array.isArray(window.sharedWorkspacesGlobal)) return window.sharedWorkspacesGlobal; } catch (e) {}
    try { if (Array.isArray(sharedWorkspacesGlobal)) return sharedWorkspacesGlobal; } catch (e) {}
    return [];
  }

  function responseRows(workspace) {
    workspace = workspace || current() || {};
    try {
      if (typeof window.collectWorkspaceRowsApp === 'function' && current() && workspace.id === current().id) {
        return window.collectWorkspaceRowsApp();
      }
    } catch (e) {}
    return Array.isArray(workspace.rows) ? workspace.rows : [];
  }

  function requiredMissing(fields, row, visibleIndexes) {
    const visible = Array.isArray(visibleIndexes) ? new Set(visibleIndexes.map(Number)) : null;
    row = Array.isArray(row) ? row : [];
    return (fields || []).filter(field => {
      if (!field.required) return false;
      if (visible && !visible.has(Number(field.index))) return false;
      if (field.index === 0 && /timestamp|เวลา|วันที่/i.test(field.label || '')) return false;
      const value = row[field.index];
      if (field.type === 'checkbox' && splitOptions(field.options).length) return !splitOptions(value).length;
      return !clean(value);
    }).map(field => field.label || ('Field ' + (Number(field.index) + 1)));
  }

  function answerText(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(answerText).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      if (value.text != null) return answerText(value.text);
      if (value.url != null) return answerText(value.url);
      return JSON.stringify(value);
    }
    return String(value).trim();
  }

  function buildExportMatrix(workspace, options) {
    workspace = workspace || current() || {};
    options = options || {};
    const fields = fieldsFromWorkspace(workspace);
    const rows = responseRows(workspace);
    const includeTimestamp = options.includeTimestamp !== false;
    const header = [];
    if (includeTimestamp) header.push('เวลาตอบ');
    fields.forEach(field => header.push(field.label));
    const body = rows.map((row, index) => {
      row = Array.isArray(row) ? row : [];
      const meta = (workspace.responseMeta || [])[index] || {};
      const out = [];
      if (includeTimestamp) out.push(answerText(meta.submittedAt || meta.timestamp || meta.createdAt || row[0] || ''));
      fields.forEach(field => out.push(answerText(row[field.index])));
      return out;
    });
    return { header, rows: body, fields };
  }

  function diagnostics() {
    const ws = current() || {};
    return {
      patch: PATCH,
      currentWorkspaceId: ws.id || '',
      workspaceCount: list().length,
      currentFields: fieldsFromWorkspace(ws).length,
      currentRows: responseRows(ws).length,
      flowEnabled: !!normalizeFlow(ws.workspaceFlow).enabled,
      globals: {
        openWorkspaceCreateModal: typeof window.openWorkspaceCreateModal,
        openWorkspaceConfigEditorV737: typeof window.openWorkspaceConfigEditorV737,
        renderWorkspaceEditorTable: typeof window.renderWorkspaceEditorTable,
        renderWorkspaceFormPublic: typeof window.renderWorkspaceFormPublic
      }
    };
  }

  root.workspace = Object.assign({}, previous, {
    version: PATCH,
    choiceTypes,
    validTypes,
    escape: esc,
    clean,
    splitOptions,
    parseSpec,
    normalizeField,
    fieldsFromWorkspace,
    specFromField,
    defaultFlow,
    normalizeFlow,
    current,
    list,
    responseRows,
    requiredMissing,
    answerText,
    buildExportMatrix,
    diagnostics
  });

  window.HAOSWorkspaceCore = root.workspace;
  window.haosWorkspaceDiagnosticsV769 = diagnostics;

  console.info('HAOS ' + PATCH + ' loaded');
})();
