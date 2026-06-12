(function(){
  const PATCH = 'v70.72-shared-workspace-builder-stabilizer';
  if (window.__HAOS_V772_SHARED_WORKSPACE_BUILDER__) return;
  window.__HAOS_V772_SHARED_WORKSPACE_BUILDER__ = true;

  const root = window.HAOS = window.HAOS || {};
  const $ = id => document.getElementById(id);
  const qa = (sel, scope = document) => Array.from((scope || document).querySelectorAll(sel));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const choiceTypes = new Set(['dropdown', 'radio', 'checkbox']);
  const validTypes = new Set(['text', 'textarea', 'dropdown', 'radio', 'checkbox', 'image']);
  const typeLabels = {
    text: '\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21 (Text)',
    textarea: '\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e22\u0e32\u0e27 (Textarea)',
    dropdown: '\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e40\u0e25\u0e37\u0e2d\u0e01 (Dropdown)',
    radio: '\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e14\u0e35\u0e22\u0e27 (Radio)',
    checkbox: '\u0e2b\u0e25\u0e32\u0e22\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01 (Checkbox)',
    image: '\u0e23\u0e39\u0e1b\u0e20\u0e32\u0e1e (Image)'
  };

  function core() {
    return window.HAOSWorkspaceCore || root.workspace || {};
  }

  function splitOptions(value) {
    if (core().splitOptions) return core().splitOptions(value);
    const seen = new Set();
    return (Array.isArray(value) ? value : String(value || '').split(/[,|]/))
      .map(clean)
      .filter(Boolean)
      .filter(option => {
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
    if (/^(true|yes|y|1|on|required)$/i.test(text)) return true;
    if (/^(false|no|n|0|off)$/i.test(text)) return false;
    return !!fallback;
  }

  function normalizeType(type) {
    type = String(type || 'text').trim().toLowerCase();
    if (type === 'select' || type === 'dropdownlist') return 'dropdown';
    if (type === 'choice') return 'radio';
    if (type === 'photo' || type === 'picture') return 'image';
    return validTypes.has(type) ? type : 'text';
  }

  function normalizeField(field, index) {
    field = field || {};
    let base;
    try {
      base = core().normalizeField ? core().normalizeField(field, index) : null;
    } catch (e) {
      base = null;
    }
    const normalized = Object.assign({}, base || {}, field, {
      index: Number.isFinite(Number(field.index)) ? Number(field.index) : index,
      label: clean(field.label || (base && base.label) || ('Field ' + (index + 1))),
      type: normalizeType(field.type || (base && base.type)),
      options: splitOptions(field.options != null ? field.options : (base && base.options)),
      required: bool(field.required, base && base.required)
    });
    [
      'sectionId',
      'points',
      'correctAnswers',
      'isQuizField',
      'skipQuiz',
      'quizSettings',
      'quizShowScore',
      'quizShowCorrect'
    ].forEach(key => {
      if (field[key] !== undefined) normalized[key] = field[key];
    });
    if (!normalized.sectionId) normalized.sectionId = 's1';
    normalized.correctAnswers = splitOptions(normalized.correctAnswers);
    if (normalized.skipQuiz || normalized.isQuizField === false) {
      normalized.isQuizField = false;
      normalized.skipQuiz = true;
      normalized.points = 0;
      normalized.correctAnswers = [];
    } else if (choiceTypes.has(normalized.type) && normalized.points != null) {
      normalized.points = Number(normalized.points) || 0;
    }
    return normalized;
  }

  function specFromField(field) {
    try {
      if (core().specFromField) return core().specFromField(field);
    } catch (e) {}
    const label = clean(field && field.label) || 'Field';
    const opts = splitOptions(field && field.options).join(', ');
    let spec = label;
    if (field.type === 'dropdown') spec += ' [dropdown: ' + (opts || 'Option 1, Option 2') + ']';
    else if (field.type === 'radio') spec += ' [radio: ' + (opts || 'Option 1, Option 2') + ']';
    else if (field.type === 'checkbox') spec += opts ? ' [checkbox: ' + opts + ']' : ' [checkbox]';
    else if (field.type === 'textarea') spec += ' [textarea]';
    else if (field.type === 'image') spec += ' [image]';
    if (field.required) spec += ' [required]';
    return spec;
  }

  function builderRows() {
    return qa('[data-ws-col-row]');
  }

  function editRows(scope = document) {
    return qa('[data-ws-edit-field]', scope);
  }

  function readCreateField(row, index) {
    const type = normalizeType(row.querySelector('.ws-col-type-v728')?.value || 'text');
    const skipQuiz = !!row.querySelector('.ws-col-not-quiz-v745')?.checked;
    const field = {
      index,
      label: clean(row.querySelector('.ws-col-label-v728')?.value || ''),
      type,
      options: splitOptions(row.querySelector('.ws-col-options-v728')?.value || ''),
      required: !!row.querySelector('.ws-col-required-v735')?.checked,
      sectionId: row.querySelector('.ws-col-section-v768')?.value || row.dataset.v768Section || 's1'
    };
    if (choiceTypes.has(type)) {
      field.correctAnswers = splitOptions(row.querySelector('.ws-col-correct-v744')?.value || '');
      field.points = Number(row.querySelector('.ws-col-points-v744')?.value || 1) || 0;
      if (skipQuiz) {
        field.skipQuiz = true;
        field.isQuizField = false;
      }
    }
    return normalizeField(field, index);
  }

  function readEditField(row, index) {
    const type = normalizeType(row.querySelector('.ws-edit-type-v737')?.value || 'text');
    const skipQuiz = !!row.querySelector('.ws-edit-not-quiz-v745')?.checked;
    const field = {
      index,
      label: clean(row.querySelector('.ws-edit-label-v737')?.value || ''),
      type,
      options: splitOptions(row.querySelector('.ws-edit-options-v737')?.value || ''),
      required: !!row.querySelector('.ws-edit-required-v737')?.checked,
      sectionId: row.querySelector('.ws-edit-section-v768')?.value || 's1'
    };
    if (choiceTypes.has(type)) {
      field.correctAnswers = splitOptions(row.querySelector('.ws-edit-correct-v745')?.value || '');
      field.points = Number(row.querySelector('.ws-edit-points-v745')?.value || 1) || 0;
      if (skipQuiz) {
        field.skipQuiz = true;
        field.isQuizField = false;
      }
    }
    return normalizeField(field, index);
  }

  function collectCreateFields() {
    return builderRows()
      .map(readCreateField)
      .filter(field => field.label);
  }

  function collectEditFields() {
    return editRows(document)
      .map(readEditField)
      .filter(field => field.label);
  }

  function setTypeLabels(select) {
    if (!select) return;
    Array.from(select.options || []).forEach(option => {
      const label = typeLabels[normalizeType(option.value)];
      if (label && option.textContent !== label) option.textContent = label;
    });
  }

  function updateChoiceVisibility(row) {
    const type = normalizeType(row.querySelector('.ws-col-type-v728,.ws-edit-type-v737')?.value || 'text');
    const visible = choiceTypes.has(type);
    qa('.ws-col-options-wrap-v728,.haos-v736-option-box,.ws-edit-options-wrap-v737,.haos-v736-edit-option-box', row).forEach(el => {
      el.style.display = visible ? '' : 'none';
    });
    row.classList.toggle('haos-v772-choice-field', visible);
    row.classList.toggle('haos-v772-non-choice-field', !visible);
  }

  function installStyle() {
    if ($('haos-v70-72-workspace-builder-style')) return;
    const style = document.createElement('style');
    style.id = 'haos-v70-72-workspace-builder-style';
    style.textContent = [
      '#wsColumnListV728 [data-ws-col-row],.haos-v741-workspace-edit-popup [data-ws-edit-field]{transition:border-color .15s ease,box-shadow .15s ease}',
      '#wsColumnListV728 [data-ws-col-row].haos-v772-choice-field,.haos-v741-workspace-edit-popup [data-ws-edit-field].haos-v772-choice-field{border-color:#93c5fd!important;box-shadow:0 12px 28px rgba(37,99,235,.08)!important}',
      '#wsColumnListV728 [data-ws-col-row].haos-v772-non-choice-field,.haos-v741-workspace-edit-popup [data-ws-edit-field].haos-v772-non-choice-field{border-color:#e2e8f0!important}',
      '.haos-v772-field-note{font-size:.76rem;font-weight:800;color:#64748b;margin-top:5px}',
      '.haos-v772-stability-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#ecfeff;color:#0f766e;border:1px solid #99f6e4;padding:4px 9px;font-size:.75rem;font-weight:900}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function enhanceRow(row) {
    if (!row) return;
    setTypeLabels(row.querySelector('.ws-col-type-v728,.ws-edit-type-v737'));
    updateChoiceVisibility(row);
    row.querySelectorAll('.ws-col-type-v728,.ws-edit-type-v737,.ws-col-options-v728,.ws-edit-options-v737').forEach(input => {
      if (input.dataset.haosV772Hook) return;
      input.dataset.haosV772Hook = '1';
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
        setTimeout(() => updateChoiceVisibility(row), 0);
      });
    });
    const labelWrap = row.querySelector('.ws-col-label-v728,.ws-edit-label-v737')?.closest('div');
    if (labelWrap && !labelWrap.querySelector('.haos-v772-field-note')) {
      const note = document.createElement('div');
      note.className = 'haos-v772-field-note';
      note.textContent = '\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e41\u0e1a\u0e1a Dropdown / Radio / Checkbox \u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e04\u0e31\u0e48\u0e19\u0e14\u0e49\u0e27\u0e22 , \u0e2b\u0e23\u0e37\u0e2d\u0e01\u0e14 + \u0e44\u0e14\u0e49';
      labelWrap.appendChild(note);
    }
  }

  function enhanceDom() {
    installStyle();
    builderRows().forEach(enhanceRow);
    editRows(document).forEach(enhanceRow);
  }

  function normalizePayload(payload, source) {
    payload = Object.assign({}, payload || {});
    const domFields = source === 'edit' ? collectEditFields() : collectCreateFields();
    const rawFields = domFields.length ? domFields : (Array.isArray(payload.fieldConfig) ? payload.fieldConfig : []);
    const fields = rawFields.map(normalizeField).filter(field => field.label);
    fields.forEach((field, index) => { field.index = index; });
    if (fields.length) {
      payload.fieldConfig = fields;
      payload.columns = fields.map(specFromField);
    }
    if (payload.workspaceFlow && core().normalizeFlow) {
      try { payload.workspaceFlow = core().normalizeFlow(payload.workspaceFlow); } catch (e) {}
    }
    if (payload.workspaceType === 'quiz') {
      payload.rows = [];
      payload.accessMode = payload.accessMode || 'edit';
      payload.requireLoginToEdit = false;
      const settings = payload.quizSettings || fields.find(field => field.quizSettings)?.quizSettings || {};
      payload.quizSettings = {
        showScore: settings.showScore !== false,
        showCorrect: settings.showCorrect === true
      };
      fields.forEach(field => {
        field.quizSettings = payload.quizSettings;
        field.quizShowScore = payload.quizSettings.showScore;
        field.quizShowCorrect = payload.quizSettings.showCorrect;
      });
    }
    if (payload.workspaceType === 'checklist') {
      payload.workspaceMode = payload.workspaceMode || 'table_checklist_template';
    }
    payload.builderPatch = PATCH;
    return payload;
  }

  function scheduleEnhance() {
    setTimeout(enhanceDom, 0);
    setTimeout(enhanceDom, 180);
    setTimeout(enhanceDom, 650);
  }

  function wrapCreatePayload() {
    const previous = window.getWorkspaceCreatePayload;
    if (typeof previous !== 'function' || previous.__haosV772Wrapped) return;
    function wrappedGetWorkspaceCreatePayload() {
      const base = previous.apply(this, arguments);
      return normalizePayload(base, 'create');
    }
    wrappedGetWorkspaceCreatePayload.__haosV772Wrapped = true;
    window.getWorkspaceCreatePayload = wrappedGetWorkspaceCreatePayload;
  }

  function wrapUiHooks() {
    [
      'openWorkspaceCreateModal',
      'applyWorkspaceTypeTemplate',
      'syncWorkspaceBuilderV728',
      'openWorkspaceConfigEditorV737',
      'addWorkspaceColumnV728',
      'haosV745DuplicateCreateField',
      'haosV745DuplicateEditField'
    ].forEach(name => {
      const previous = window[name];
      if (typeof previous !== 'function' || previous.__haosV772Wrapped) return;
      const wrapped = function() {
        const result = previous.apply(this, arguments);
        scheduleEnhance();
        return result;
      };
      wrapped.__haosV772Wrapped = true;
      window[name] = wrapped;
    });
  }

  function wrapGas() {
    const previous = window.gas;
    if (typeof previous === 'function' && !previous.__haosV772Wrapped) {
      const wrappedGas = function(fn, args) {
        if (fn === 'updateSharedWorkspaceConfigV737' && Array.isArray(args) && args[2]) {
          args = args.slice();
          args[2] = normalizePayload(args[2], 'edit');
        }
        return previous.call(this, fn, args);
      };
      wrappedGas.__haosV772Wrapped = true;
      window.gas = wrappedGas;
    }
    const runner = window.google && window.google.script && window.google.script.run;
    if (runner && typeof runner.updateSharedWorkspaceConfigV737 === 'function' && !runner.updateSharedWorkspaceConfigV737.__haosV772Wrapped) {
      const previousUpdate = runner.updateSharedWorkspaceConfigV737;
      const wrappedUpdate = function() {
        const args = Array.from(arguments);
        if (args[2]) args[2] = normalizePayload(args[2], 'edit');
        return previousUpdate.apply(this, args);
      };
      wrappedUpdate.__haosV772Wrapped = true;
      runner.updateSharedWorkspaceConfigV737 = wrappedUpdate;
    }
  }

  function diagnostics() {
    return {
      patch: PATCH,
      createRows: builderRows().length,
      editRows: editRows(document).length,
      getWorkspaceCreatePayload: typeof window.getWorkspaceCreatePayload,
      gasWrapped: !!(window.gas && window.gas.__haosV772Wrapped),
      core: core().version || ''
    };
  }

  function boot() {
    wrapCreatePayload();
    wrapUiHooks();
    wrapGas();
    scheduleEnhance();
  }

  root.workspaceBuilder = Object.assign({}, root.workspaceBuilder || {}, {
    version: PATCH,
    enhanceDom,
    normalizePayload,
    collectCreateFields,
    collectEditFields,
    diagnostics
  });
  window.HAOSSharedWorkspaceBuilder = root.workspaceBuilder;
  window.haosWorkspaceBuilderDiagnosticsV772 = diagnostics;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setTimeout(boot, 700);
  setTimeout(boot, 1600);
  console.info('HAOS ' + PATCH + ' loaded');
})();
