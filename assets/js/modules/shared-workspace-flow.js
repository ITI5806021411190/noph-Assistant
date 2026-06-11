(function(){
  const PATCH = 'v70.68-shared-workspace-flow';
  if (window.__HAOS_V768_SHARED_WORKSPACE_FLOW__) return;
  window.__HAOS_V768_SHARED_WORKSPACE_FLOW__ = true;

  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const choiceTypes = new Set(['dropdown', 'radio', 'checkbox']);
  const splitOptions = value => {
    const seen = new Set();
    return String(value || '').split(/[,|]/).map(x => x.trim()).filter(Boolean).filter(x => {
      const key = x.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const currentWs = () => {
    try { return window.currentWorkspace || currentWorkspace || null; } catch (e) { return window.currentWorkspace || null; }
  };
  const parseField = spec => {
    if (typeof window.parseWorkspaceFieldApp_ === 'function') return window.parseWorkspaceFieldApp_(spec);
    const raw = String(spec || '').trim();
    const opt = (raw.match(/\[(?:dropdown|select|radio|choice|checkbox):\s*([^\]]+)\]/i) || [])[1] || '';
    const label = raw.replace(/\[[^\]]+\]/g, '').replace(/\*\s*$/, '').trim() || raw;
    return {
      label,
      type: /radio|choice/i.test(raw) ? 'radio' : /dropdown|select/i.test(raw) ? 'dropdown' : /checkbox/i.test(raw) ? 'checkbox' : /image|photo|รูปภาพ/i.test(raw) ? 'image' : /textarea|paragraph/i.test(raw) ? 'textarea' : 'text',
      options: splitOptions(opt),
      required: /\[(?:required|require|\*)\]/i.test(raw) || /\*\s*$/.test(raw)
    };
  };
  const specFromField = field => {
    if (typeof window.specFromFieldV737 === 'function') return window.specFromFieldV737(field);
    const label = String(field.label || '').trim() || 'Field';
    const opts = splitOptions(field.options).join(', ');
    let spec = label;
    if (field.type === 'dropdown') spec += ' [dropdown: ' + (opts || 'Option 1, Option 2') + ']';
    else if (field.type === 'radio') spec += ' [radio: ' + (opts || 'Option 1, Option 2') + ']';
    else if (field.type === 'checkbox') spec += opts ? ' [checkbox: ' + opts + ']' : ' [checkbox]';
    else if (field.type === 'textarea') spec += ' [textarea]';
    else if (field.type === 'image') spec += ' [image]';
    if (field.required) spec += ' [required]';
    return spec;
  };
  const defaultFlow = () => ({
    enabled: false,
    version: 'v1',
    mode: 'sections',
    sections: [{ id: 's1', title: 'ส่วนที่ 1' }],
    logicRules: []
  });
  const normalizeFlow = raw => {
    const flow = raw && typeof raw === 'object' ? raw : {};
    const sections = Array.isArray(flow.sections) && flow.sections.length
      ? flow.sections.map((s, i) => ({ id: String(s.id || ('s' + (i + 1))), title: String(s.title || ('ส่วนที่ ' + (i + 1))).trim() || ('ส่วนที่ ' + (i + 1)) }))
      : [{ id: 's1', title: 'ส่วนที่ 1' }];
    const ids = new Set(sections.map(s => s.id));
    const logicRules = (Array.isArray(flow.logicRules) ? flow.logicRules : []).map(r => ({
      fieldIndex: Number(r.fieldIndex),
      option: String(r.option || ''),
      action: ['next', 'section', 'submit'].includes(String(r.action || 'next')) ? String(r.action || 'next') : 'next',
      targetSectionId: ids.has(String(r.targetSectionId || '')) ? String(r.targetSectionId || '') : ''
    })).filter(r => Number.isFinite(r.fieldIndex) && r.option);
    return {
      enabled: flow.enabled === true || String(flow.enabled || '').toLowerCase() === 'true' || String(flow.enabled || '') === '1',
      version: 'v1',
      mode: 'sections',
      sections,
      logicRules
    };
  };
  const flowTypes = () => new Set(['form', 'quiz']);
  const builderRows = () => qa('[data-ws-col-row]');
  const editRows = () => qa('[data-ws-edit-field]');
  const activeType = () => $('wsWorkspaceType')?.value || '';

  function getCreateFlowState() {
    if (!window.haosWorkspaceFlowDraftV768) window.haosWorkspaceFlowDraftV768 = defaultFlow();
    return normalizeFlow(window.haosWorkspaceFlowDraftV768);
  }
  function setCreateFlowState(flow) {
    window.haosWorkspaceFlowDraftV768 = normalizeFlow(flow);
  }
  function sectionOptions(sections, selected) {
    return sections.map(s => `<option value="${esc(s.id)}" ${String(selected || '') === String(s.id) ? 'selected' : ''}>${esc(s.title)}</option>`).join('');
  }
  function actionOptions(action) {
    return [
      ['next', 'ไปส่วนถัดไป'],
      ['section', 'ไปยังส่วนที่กำหนด'],
      ['submit', 'จบและส่งข้อมูล']
    ].map(([v, t]) => `<option value="${v}" ${String(action || 'next') === v ? 'selected' : ''}>${t}</option>`).join('');
  }
  function renderSections(prefix, flow) {
    const box = $(prefix + 'FlowSectionsV768');
    if (!box) return;
    box.innerHTML = flow.sections.map((s, i) => `
      <div class="haos-v768-section-row" data-flow-section="${esc(s.id)}">
        <div class="haos-v768-section-id">Section ${i + 1}</div>
        <input class="form-control ${prefix}-flow-section-title-v768" value="${esc(s.title)}" placeholder="ชื่อส่วน">
        <button type="button" class="btn btn-outline-danger" data-flow-remove="${esc(s.id)}" ${flow.sections.length <= 1 ? 'disabled' : ''}><i class="bi bi-trash"></i></button>
      </div>
    `).join('');
    box.querySelectorAll('[data-flow-remove]').forEach(btn => btn.addEventListener('click', () => {
      const next = collectPanelFlow(prefix);
      next.sections = next.sections.filter(s => s.id !== btn.dataset.flowRemove);
      if (!next.sections.length) next.sections = [{ id: 's1', title: 'ส่วนที่ 1' }];
      next.logicRules = next.logicRules.map(r => next.sections.some(s => s.id === r.targetSectionId) ? r : Object.assign({}, r, { action: 'next', targetSectionId: '' }));
      if (prefix === 'wsCreate') setCreateFlowState(next);
      renderFlowPanel(prefix, next);
      enhanceCreateBuilder();
      enhanceEditPopup();
    }));
  }
  function panelHtml(prefix, flow) {
    flow = normalizeFlow(flow);
    return `<section id="${prefix}FlowPanelV768" class="haos-v768-flow-panel ${flow.enabled ? '' : 'is-off'}">
      <div class="haos-v768-flow-title">
        <b><i class="bi bi-diagram-3"></i> Smart Flow / Section Logic</b>
        <label class="form-check fw-bold m-0"><input id="${prefix}FlowEnabledV768" class="form-check-input" type="checkbox" ${flow.enabled ? 'checked' : ''}> เปิดใช้การข้ามส่วนตามคำตอบ</label>
      </div>
      <div class="haos-v768-flow-help">ใช้กับแบบฟอร์มออนไลน์และ Quiz: แบ่งคำถามเป็นส่วน แล้วกำหนดว่า Dropdown / Radio / Checkbox แต่ละตัวเลือกจะไปส่วนไหนหรือจบการส่งข้อมูล</div>
      <div class="haos-v768-flow-body">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <span class="fw-bold text-primary"><i class="bi bi-layout-text-window"></i> ส่วนของแบบฟอร์ม</span>
          <button type="button" id="${prefix}AddSectionV768" class="btn btn-sm btn-outline-primary"><i class="bi bi-plus-circle"></i> เพิ่ม Section</button>
        </div>
        <div id="${prefix}FlowSectionsV768" class="haos-v768-section-list"></div>
        <div class="small text-muted fw-bold">เลือก Section ให้แต่ละช่องข้อมูล และตั้ง Smart Logic ในช่องชนิด Dropdown / Radio / Checkbox</div>
      </div>
    </section>`;
  }
  function collectPanelFlow(prefix) {
    const fallback = prefix === 'wsCreate' ? getCreateFlowState() : normalizeFlow(window.haosEditWorkspaceFlowV768 || {});
    const enabled = !!$(prefix + 'FlowEnabledV768')?.checked;
    const sections = qa('.' + prefix + '-flow-section-title-v768').map((el, i) => ({
      id: el.closest('[data-flow-section]')?.dataset.flowSection || ('s' + (i + 1)),
      title: (el.value || '').trim() || ('ส่วนที่ ' + (i + 1))
    }));
    return normalizeFlow(Object.assign({}, fallback, { enabled, sections: sections.length ? sections : fallback.sections }));
  }
  function renderFlowPanel(prefix, flow) {
    const panel = $(prefix + 'FlowPanelV768');
    if (!panel) return;
    flow = normalizeFlow(flow);
    panel.classList.toggle('is-off', !flow.enabled);
    const enabled = $(prefix + 'FlowEnabledV768');
    if (enabled) enabled.checked = flow.enabled;
    renderSections(prefix, flow);
    const add = $(prefix + 'AddSectionV768');
    if (add && !add.dataset.v768Hook) {
      add.dataset.v768Hook = '1';
      add.addEventListener('click', () => {
        const next = collectPanelFlow(prefix);
        const id = 's' + (next.sections.length + 1);
        next.sections.push({ id, title: 'ส่วนที่ ' + (next.sections.length + 1) });
        if (prefix === 'wsCreate') setCreateFlowState(next);
        else window.haosEditWorkspaceFlowV768 = next;
        renderFlowPanel(prefix, next);
        enhanceCreateBuilder();
        enhanceEditPopup();
      });
    }
    if (enabled && !enabled.dataset.v768Hook) {
      enabled.dataset.v768Hook = '1';
      enabled.addEventListener('change', () => {
        const next = collectPanelFlow(prefix);
        if (prefix === 'wsCreate') setCreateFlowState(next);
        else window.haosEditWorkspaceFlowV768 = next;
        renderFlowPanel(prefix, next);
      });
    }
    qa('.' + prefix + '-flow-section-title-v768', panel).forEach(el => {
      if (el.dataset.v768Hook) return;
      el.dataset.v768Hook = '1';
      el.addEventListener('input', () => {
        const next = collectPanelFlow(prefix);
        if (prefix === 'wsCreate') setCreateFlowState(next);
        else window.haosEditWorkspaceFlowV768 = next;
        enhanceCreateBuilder();
        enhanceEditPopup();
      });
    });
  }
  function ensureCreatePanel() {
    if (!$('workspaceCreateModal') || $('wsCreateFlowPanelV768')) return;
    const anchor = $('wsBuilderV728') || $('wsCreateColumns')?.closest('.mb-3') || $('workspaceCreateModal .modal-body');
    if (!anchor) return;
    anchor.insertAdjacentHTML('afterend', panelHtml('wsCreate', getCreateFlowState()));
    renderFlowPanel('wsCreate', getCreateFlowState());
  }
  function ensureTypeNote() {
    const sel = $('wsWorkspaceType');
    if (!sel) return;
    const checklist = sel.querySelector('option[value="checklist"]');
    if (checklist) checklist.textContent = 'ตารางเบา: Checklist (Template)';
    let note = $('wsTypeNoteV768');
    if (!note && sel.closest('.row')) {
      sel.closest('.row').insertAdjacentHTML('afterend', '<div id="wsTypeNoteV768" class="haos-v768-type-note"></div>');
      note = $('wsTypeNoteV768');
    }
    const type = activeType();
    if (!note) return;
    if (type === 'checklist') note.innerHTML = '<i class="bi bi-info-circle"></i> Checklist จะถูกดูแลเป็น Template ของตารางเบาในระบบ เพื่อไม่ให้ฟังก์ชันซ้ำซ้อนกับตารางเบา';
    else if (type === 'google_sheet' || type === 'google_form') note.innerHTML = '<i class="bi bi-google"></i> Google Sheet/Form จริงจะใช้ field builder เดียวกันเพื่อสร้างไฟล์ และเก็บ metadata ไว้ใน HAOS สำหรับ audit/sync ต่อไป';
    else if (flowTypes().has(type)) note.innerHTML = '<i class="bi bi-diagram-3"></i> แบบฟอร์มออนไลน์และ Quiz รองรับ Section Logic แบบ Google Form ได้';
    else note.innerHTML = '<i class="bi bi-table"></i> ตารางเบาในระบบจะใช้ field builder กลางร่วมกับแบบฟอร์ม เพื่อให้ dropdown/radio/checkbox/required ทำงานเหมือนกัน';
  }
  function matchingRule(rules, fieldIndex, option) {
    return rules.find(r => Number(r.fieldIndex) === Number(fieldIndex) && String(r.option) === String(option)) || {};
  }
  function collectCreateFieldsFallback() {
    return builderRows().map((row, i) => ({
      index: i,
      label: row.querySelector('.ws-col-label-v728')?.value.trim() || '',
      type: row.querySelector('.ws-col-type-v728')?.value || 'text',
      options: splitOptions(row.querySelector('.ws-col-options-v728')?.value || ''),
      required: !!row.querySelector('.ws-col-required-v735')?.checked
    })).filter(f => f.label);
  }
  function syncRowLogic(row, index, flow) {
    const type = row.querySelector('.ws-col-type-v728')?.value || 'text';
    const options = splitOptions(row.querySelector('.ws-col-options-v728')?.value || '');
    let section = row.querySelector('.haos-v768-field-section');
    if (!section) {
      const target = row.querySelector('.haos-v744-quiz-controls') || row.querySelector('.d-flex.gap-1') || row.lastElementChild;
      target?.insertAdjacentHTML('beforebegin', '<div class="haos-v768-field-section"><label class="small">Section ของช่องนี้</label><select class="form-select form-select-sm ws-col-section-v768"></select></div>');
      section = row.querySelector('.haos-v768-field-section');
    }
    const select = row.querySelector('.ws-col-section-v768');
    if (select) {
      const previous = select.value || row.dataset.v768Section || (flow.sections[0] && flow.sections[0].id) || 's1';
      select.innerHTML = sectionOptions(flow.sections, previous);
      select.onchange = () => { row.dataset.v768Section = select.value; };
    }
    let box = row.querySelector('.haos-v768-logic-box');
    if (!box) {
      row.insertAdjacentHTML('beforeend', '<div class="haos-v768-logic-box"><div class="haos-v768-logic-head"><i class="bi bi-signpost-split"></i> Smart Logic ของตัวเลือก</div><div class="haos-v768-logic-list"></div></div>');
      box = row.querySelector('.haos-v768-logic-box');
    }
    box.classList.toggle('is-hidden', !(flow.enabled && choiceTypes.has(type) && options.length));
    const list = box.querySelector('.haos-v768-logic-list');
    if (list) {
      list.innerHTML = options.map(opt => {
        const rule = matchingRule(flow.logicRules, index, opt);
        return `<div class="haos-v768-logic-row" data-field-index="${index}" data-option="${esc(opt)}">
          <div class="haos-v768-logic-option">${esc(opt)}</div>
          <select class="form-select form-select-sm ws-flow-action-v768">${actionOptions(rule.action || 'next')}</select>
          <select class="form-select form-select-sm ws-flow-target-v768">${sectionOptions(flow.sections, rule.targetSectionId)}</select>
        </div>`;
      }).join('');
      list.querySelectorAll('.ws-flow-action-v768').forEach(sel => sel.addEventListener('change', () => {
        const rowEl = sel.closest('.haos-v768-logic-row');
        rowEl.querySelector('.ws-flow-target-v768').disabled = sel.value !== 'section';
      }));
      list.querySelectorAll('.haos-v768-logic-row').forEach(rowEl => {
        const action = rowEl.querySelector('.ws-flow-action-v768');
        const target = rowEl.querySelector('.ws-flow-target-v768');
        if (target) target.disabled = action?.value !== 'section';
      });
    }
  }
  function collectFlowFromBuilder(baseFlow, rows, fields) {
    const flow = normalizeFlow(baseFlow);
    const logicRules = [];
    rows.forEach((row, i) => {
      const sectionId = row.querySelector('.ws-col-section-v768')?.value || flow.sections[0]?.id || 's1';
      if (fields[i]) fields[i].sectionId = sectionId;
      qa('.haos-v768-logic-row', row).forEach(ruleRow => {
        const action = ruleRow.querySelector('.ws-flow-action-v768')?.value || 'next';
        const targetSectionId = action === 'section' ? (ruleRow.querySelector('.ws-flow-target-v768')?.value || '') : '';
        logicRules.push({ fieldIndex: i, option: ruleRow.dataset.option || '', action, targetSectionId });
      });
    });
    return normalizeFlow(Object.assign({}, flow, { logicRules }));
  }
  function enhanceCreateBuilder() {
    ensureCreatePanel();
    ensureTypeNote();
    const type = activeType();
    const flow = getCreateFlowState();
    const panel = $('wsCreateFlowPanelV768');
    if (panel) panel.style.display = flowTypes().has(type) ? '' : 'none';
    builderRows().forEach((row, i) => syncRowLogic(row, i, flow));
  }
  function editFieldType(row) {
    return row.querySelector('.ws-edit-type-v737')?.value || 'text';
  }
  function editFieldOptions(row) {
    return splitOptions(row.querySelector('.ws-edit-options-v737')?.value || '');
  }
  function ensureEditPanel(workspace) {
    const popup = document.querySelector('.haos-v741-workspace-edit-popup');
    if (!popup || $('wsEditFlowPanelV768')) return;
    window.haosEditWorkspaceFlowV768 = normalizeFlow(workspace?.workspaceFlow || workspace?.flow || {});
    const anchor = popup.querySelector('#swalWorkspaceFieldsV737')?.closest('section') || popup.querySelector('#swalWorkspaceFieldsV737') || popup.querySelector('.text-start');
    if (anchor) anchor.insertAdjacentHTML('afterend', panelHtml('wsEdit', window.haosEditWorkspaceFlowV768));
    renderFlowPanel('wsEdit', window.haosEditWorkspaceFlowV768);
  }
  function syncEditRowLogic(row, index, flow) {
    let section = row.querySelector('.haos-v768-edit-section-select');
    if (!section) {
      row.insertAdjacentHTML('beforeend', '<div class="haos-v768-edit-section-select mt-2"><label class="small">Section ของช่องนี้</label><select class="form-select form-select-sm ws-edit-section-v768"></select></div><div class="haos-v768-logic-box"><div class="haos-v768-logic-head"><i class="bi bi-signpost-split"></i> Smart Logic ของตัวเลือก</div><div class="haos-v768-logic-list"></div></div>');
      section = row.querySelector('.haos-v768-edit-section-select');
    }
    const select = row.querySelector('.ws-edit-section-v768');
    if (select) {
      const label = row.querySelector('.ws-edit-label-v737')?.value || '';
      const existing = candidateFlowField(label, index).sectionId || select.value || flow.sections[0]?.id || 's1';
      select.innerHTML = sectionOptions(flow.sections, existing);
    }
    const type = editFieldType(row);
    const options = editFieldOptions(row);
    const box = row.querySelector('.haos-v768-logic-box');
    box?.classList.toggle('is-hidden', !(flow.enabled && choiceTypes.has(type) && options.length));
    const list = box?.querySelector('.haos-v768-logic-list');
    if (list) {
      list.innerHTML = options.map(opt => {
        const rule = matchingRule(flow.logicRules, index, opt);
        return `<div class="haos-v768-logic-row" data-field-index="${index}" data-option="${esc(opt)}">
          <div class="haos-v768-logic-option">${esc(opt)}</div>
          <select class="form-select form-select-sm ws-flow-action-v768">${actionOptions(rule.action || 'next')}</select>
          <select class="form-select form-select-sm ws-flow-target-v768">${sectionOptions(flow.sections, rule.targetSectionId)}</select>
        </div>`;
      }).join('');
      qa('.haos-v768-logic-row', list).forEach(ruleRow => {
        const action = ruleRow.querySelector('.ws-flow-action-v768');
        const target = ruleRow.querySelector('.ws-flow-target-v768');
        if (target) target.disabled = action?.value !== 'section';
        action?.addEventListener('change', () => { if (target) target.disabled = action.value !== 'section'; });
      });
    }
  }
  function candidateFlowField(label, index) {
    const ws = currentWs() || {};
    const fields = Array.isArray(ws.fieldConfig) ? ws.fieldConfig : [];
    return fields[index] || fields.find(f => String(f.label || '').trim() === String(label || '').trim()) || {};
  }
  function collectEditFieldsForFlow() {
    return editRows().map((row, i) => ({
      index: i,
      label: row.querySelector('.ws-edit-label-v737')?.value.trim() || '',
      type: editFieldType(row),
      options: editFieldOptions(row),
      required: !!row.querySelector('.ws-edit-required-v737')?.checked,
      sectionId: row.querySelector('.ws-edit-section-v768')?.value || 's1'
    })).filter(f => f.label);
  }
  function collectFlowFromEdit(baseFlow, fields) {
    const flow = normalizeFlow(baseFlow);
    const logicRules = [];
    editRows().forEach((row, i) => {
      if (fields[i]) fields[i].sectionId = row.querySelector('.ws-edit-section-v768')?.value || flow.sections[0]?.id || 's1';
      qa('.haos-v768-logic-row', row).forEach(ruleRow => {
        const action = ruleRow.querySelector('.ws-flow-action-v768')?.value || 'next';
        logicRules.push({
          fieldIndex: i,
          option: ruleRow.dataset.option || '',
          action,
          targetSectionId: action === 'section' ? (ruleRow.querySelector('.ws-flow-target-v768')?.value || '') : ''
        });
      });
    });
    return normalizeFlow(Object.assign({}, flow, { logicRules }));
  }
  function enhanceEditPopup() {
    const popup = document.querySelector('.haos-v741-workspace-edit-popup');
    if (!popup) return;
    const flow = normalizeFlow(window.haosEditWorkspaceFlowV768 || currentWs()?.workspaceFlow || {});
    renderFlowPanel('wsEdit', flow);
    editRows().forEach((row, i) => syncEditRowLogic(row, i, flow));
  }

  const prevOpenCreate = window.openWorkspaceCreateModal;
  if (typeof prevOpenCreate === 'function') {
    window.openWorkspaceCreateModal = function() {
      const r = prevOpenCreate.apply(this, arguments);
      setTimeout(enhanceCreateBuilder, 160);
      setTimeout(enhanceCreateBuilder, 650);
      return r;
    };
  }
  const prevApplyTemplate = window.applyWorkspaceTypeTemplate;
  if (typeof prevApplyTemplate === 'function') {
    window.applyWorkspaceTypeTemplate = function() {
      const r = prevApplyTemplate.apply(this, arguments);
      setTimeout(enhanceCreateBuilder, 0);
      return r;
    };
  }
  const prevSyncBuilder = window.syncWorkspaceBuilderV728;
  if (typeof prevSyncBuilder === 'function') {
    window.syncWorkspaceBuilderV728 = function() {
      const r = prevSyncBuilder.apply(this, arguments);
      setTimeout(enhanceCreateBuilder, 0);
      return r;
    };
  }
  const prevGetPayload = window.getWorkspaceCreatePayload;
  if (typeof prevGetPayload === 'function') {
    window.getWorkspaceCreatePayload = function() {
      const base = prevGetPayload.apply(this, arguments) || {};
      const rows = builderRows();
      const fields = Array.isArray(base.fieldConfig) && base.fieldConfig.length ? base.fieldConfig : collectCreateFieldsFallback();
      const flow = collectFlowFromBuilder(collectPanelFlow('wsCreate'), rows, fields);
      base.fieldConfig = fields;
      base.columns = fields.map(specFromField);
      base.workspaceFlow = flow;
      if (base.workspaceType === 'checklist') base.workspaceMode = 'table_checklist_template';
      return base;
    };
  }
  const prevOpenEdit = window.openWorkspaceConfigEditorV737;
  if (typeof prevOpenEdit === 'function') {
    window.openWorkspaceConfigEditorV737 = function(id) {
      const r = prevOpenEdit.apply(this, arguments);
      let tries = 0;
      const timer = setInterval(() => {
        tries++;
        const popup = document.querySelector('.haos-v741-workspace-edit-popup');
        if (popup) {
          ensureEditPanel(currentWs());
          enhanceEditPopup();
        }
        if (tries > 40 || (popup && $('wsEditFlowPanelV768'))) clearInterval(timer);
      }, 140);
      return r;
    };
  }
  const prevGas = window.gas;
  if (typeof prevGas === 'function' && !prevGas.__haosV768Wrapped) {
    window.gas = function(fn, args) {
      if (fn === 'updateSharedWorkspaceConfigV737' && Array.isArray(args) && args[2] && document.querySelector('.haos-v741-workspace-edit-popup')) {
        const fields = collectEditFieldsForFlow();
        const flow = collectFlowFromEdit(collectPanelFlow('wsEdit'), fields);
        args = args.slice();
        args[2] = Object.assign({}, args[2], { fieldConfig: fields, columns: fields.map(specFromField), workspaceFlow: flow });
      }
      return prevGas.call(this, fn, args);
    };
    window.gas.__haosV768Wrapped = true;
  }

  function fieldsForPayload(data) {
    const fields = Array.isArray(data.fieldConfig) ? data.fieldConfig : [];
    return fields.map((f, i) => Object.assign({ index: i }, f));
  }
  function sectionFields(fields, sectionId) {
    return fields.filter(f => String(f.sectionId || 's1') === String(sectionId || 's1'));
  }
  function previewInputHtml(f) {
    const opts = splitOptions(f.options);
    const label = `<label class="form-label fw-bold">${esc(f.label)}${f.required ? '<span class="text-danger ms-1">*</span>' : ''}</label>`;
    if (f.type === 'dropdown') return `<div class="haos-v735-public-field">${label}<select class="form-select haos-v768-preview-input" data-c="${f.index}"><option value="">-- เลือก --</option>${opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'radio') return `<div class="haos-v735-public-field">${label}<div class="haos-v744-public-choice">${opts.map(o => `<label><input type="radio" class="haos-v768-preview-input me-1" name="preview_${f.index}" data-c="${f.index}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div></div>`;
    if (f.type === 'checkbox' && opts.length) return `<div class="haos-v735-public-field">${label}<div class="haos-v744-public-choice">${opts.map(o => `<label><input type="checkbox" class="haos-v768-preview-check me-1" data-c="${f.index}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div></div>`;
    if (f.type === 'checkbox') return `<div class="haos-v735-public-field">${label}<label class="form-check"><input type="checkbox" class="form-check-input haos-v768-preview-input" data-c="${f.index}" value="✓"> <span class="form-check-label">เลือกช่องนี้</span></label></div>`;
    if (f.type === 'textarea') return `<div class="haos-v735-public-field">${label}<textarea class="form-control haos-v768-preview-input" data-c="${f.index}" rows="3"></textarea></div>`;
    if (f.type === 'image') return `<div class="haos-v735-public-field">${label}<input type="file" class="form-control" disabled><small class="text-muted">พรีวิวไม่อัปโหลดไฟล์จริง</small></div>`;
    return `<div class="haos-v735-public-field">${label}<input class="form-control haos-v768-preview-input" data-c="${f.index}"></div>`;
  }
  function collectPreviewValues(row) {
    qa('.haos-v768-preview-input').forEach(el => {
      const c = Number(el.dataset.c);
      if (el.type === 'radio' && !el.checked) return;
      if (el.type === 'checkbox') { row[c] = el.checked ? '✓' : ''; return; }
      row[c] = (el.value || '').trim();
    });
    const grouped = {};
    qa('.haos-v768-preview-check').forEach(el => {
      const c = Number(el.dataset.c);
      grouped[c] = grouped[c] || [];
      if (el.checked) grouped[c].push(el.value);
    });
    Object.keys(grouped).forEach(c => row[Number(c)] = grouped[c].join(', '));
  }
  function missingInSection(fields, row) {
    return fields.filter(f => f.required && f.type !== 'image' && !String(row[f.index] || '').trim()).map(f => f.label || ('ช่อง ' + (f.index + 1)));
  }
  function nextSectionId(flow, fields, row, currentId) {
    for (const f of fields) {
      if (!choiceTypes.has(f.type)) continue;
      const values = splitOptions(row[f.index]);
      for (const value of values) {
        const rule = flow.logicRules.find(r => Number(r.fieldIndex) === Number(f.index) && String(r.option) === String(value));
        if (!rule) continue;
        if (rule.action === 'submit') return '__submit__';
        if (rule.action === 'section' && rule.targetSectionId) return rule.targetSectionId;
      }
    }
    const idx = flow.sections.findIndex(s => s.id === currentId);
    return flow.sections[idx + 1]?.id || '__submit__';
  }
  function runFlowPreview(data) {
    return new Promise(resolve => {
      const fields = fieldsForPayload(data);
      const flow = normalizeFlow(data.workspaceFlow);
      const row = new Array(fields.length).fill('');
      const visited = new Set();
      let current = flow.sections[0]?.id || 's1';
      function render() {
        const section = flow.sections.find(s => s.id === current) || flow.sections[0];
        const sf = sectionFields(fields, section.id);
        visited.add(section.id);
        Swal.fire({
          title: data.workspaceType === 'quiz' ? 'พรีวิวแบบทดสอบแบบมีเงื่อนไข' : 'พรีวิวแบบฟอร์มแบบมีเงื่อนไข',
          width: 920,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'ยกเลิก',
          html: `<div class="haos-v768-public-flow text-start">
            <div><h5 class="fw-bold mb-1">${esc(data.title || '')}</h5><div class="text-muted">${esc(data.description || '')}</div></div>
            <div class="haos-v768-progress">${flow.sections.map(s => `<span class="haos-v768-step-pill ${s.id === section.id ? 'active' : ''}">${esc(s.title)}</span>`).join('')}</div>
            <section class="haos-v768-public-section"><h5>${esc(section.title)}</h5>${sf.map(previewInputHtml).join('')}</section>
            <div class="haos-v768-public-actions"><button type="button" class="btn btn-secondary" id="haosV768PreviewBack">ย้อนกลับ</button><button type="button" class="btn btn-primary fw-bold" id="haosV768PreviewNext">ต่อไป</button></div>
          </div>`,
          didOpen: () => {
            $('haosV768PreviewBack').disabled = flow.sections.findIndex(s => s.id === current) <= 0;
            $('haosV768PreviewBack').onclick = () => {
              const idx = Math.max(0, flow.sections.findIndex(s => s.id === current) - 1);
              current = flow.sections[idx].id;
              render();
            };
            $('haosV768PreviewNext').onclick = () => {
              collectPreviewValues(row);
              const missing = missingInSection(sf, row);
              if (missing.length) return Swal.showValidationMessage('กรุณากรอก: ' + missing.join(', '));
              const next = nextSectionId(flow, sf, row, current);
              if (next === '__submit__') {
                Swal.close();
                resolve({ row, visibleIndexes: fields.filter(f => visited.has(f.sectionId || 's1')).map(f => f.index) });
                return;
              }
              current = next;
              render();
            };
          }
        }).then(r => { if (r.dismiss) resolve(null); });
      }
      render();
    });
  }
  const prevPreview = window.previewWorkspaceCreate;
  const prevCreateUI = window.createWorkspaceUI;
  if (typeof prevPreview === 'function') {
    window.previewWorkspaceCreate = async function() {
      const data = window.getWorkspaceCreatePayload ? window.getWorkspaceCreatePayload() : {};
      const flow = normalizeFlow(data.workspaceFlow);
      if (!flow.enabled || !flowTypes().has(data.workspaceType)) return prevPreview.apply(this, arguments);
      const tested = await runFlowPreview(data);
      if (!tested) return;
      const confirm = await Swal.fire({
        title: 'ยืนยันหลังพรีวิว',
        text: 'ทดสอบเส้นทางคำตอบเรียบร้อยแล้ว ต้องการสร้างพื้นที่นี้เลยหรือไม่',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันสร้างพื้นที่',
        cancelButtonText: 'กลับไปแก้ไข'
      });
      if (confirm.isConfirmed && typeof prevCreateUI === 'function') return prevCreateUI.call(window, true);
    };
  }
  if (typeof prevCreateUI === 'function') {
    window.createWorkspaceUI = function(skipPreview) {
      const data = window.getWorkspaceCreatePayload ? window.getWorkspaceCreatePayload() : {};
      const flow = normalizeFlow(data.workspaceFlow);
      if (skipPreview === true || !flow.enabled || !flowTypes().has(data.workspaceType)) return prevCreateUI.apply(this, arguments);
      return window.previewWorkspaceCreate();
    };
  }

  function publicFields() {
    const cols = window.workspaceState?.columns || [];
    const cfg = Array.isArray(window.workspaceState?.fieldConfig) ? window.workspaceState.fieldConfig : [];
    return cols.map((c, i) => Object.assign({ index: i }, parseField(c), cfg[i] || {}));
  }
  function publicFlow() {
    return normalizeFlow(window.workspaceState?.workspaceFlow || {});
  }
  function publicFormFieldHtml(f) {
    const opts = splitOptions(f.options);
    const label = `<label class="form-label small fw-bold">${esc(f.label)}${f.required ? '<span class="text-danger ms-1">*</span>' : ''}</label>`;
    if (f.type === 'dropdown') return `<div class="haos-v735-public-field">${label}<select class="form-select workspace-form-field" data-c="${f.index}"><option value="">-- เลือก --</option>${opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'radio') return `<div class="haos-v735-public-field">${label}<div class="haos-v744-public-choice">${opts.map(o => `<label><input type="radio" class="workspace-form-field me-1" name="wsf_${f.index}" data-c="${f.index}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div></div>`;
    if (f.type === 'checkbox' && opts.length) return `<div class="haos-v735-public-field">${label}<div class="haos-v744-public-choice">${opts.map(o => `<label><input type="checkbox" class="workspace-form-check-multi me-1" data-c="${f.index}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div><div class="small text-muted mt-2">เลือกได้มากกว่า 1 ข้อ</div></div>`;
    if (f.type === 'checkbox') return `<div class="haos-v735-public-field">${label}<label class="form-check"><input type="checkbox" class="form-check-input workspace-form-field" data-c="${f.index}" value="✓"> <span class="form-check-label">เลือกช่องนี้</span></label></div>`;
    if (f.type === 'image') return `<div class="haos-v735-public-field">${label}<input type="file" class="form-control workspace-form-file" data-c="${f.index}" accept="image/*"></div>`;
    if (f.type === 'textarea') return `<div class="haos-v735-public-field">${label}<textarea class="form-control workspace-form-field" rows="3" data-c="${f.index}"></textarea></div>`;
    return `<div class="haos-v735-public-field">${label}<input class="form-control workspace-form-field" data-c="${f.index}"></div>`;
  }
  function collectPublicRow(base) {
    const row = base || new Array((window.workspaceState?.columns || []).length).fill('');
    qa('.workspace-form-field').forEach(el => {
      const c = Number(el.dataset.c);
      if (el.type === 'radio' && !el.checked) return;
      if (el.type === 'checkbox') { row[c] = el.checked ? '✓' : ''; return; }
      row[c] = (el.value || '').trim();
    });
    const grouped = {};
    qa('.workspace-form-check-multi').forEach(el => {
      const c = Number(el.dataset.c);
      grouped[c] = grouped[c] || [];
      if (el.checked) grouped[c].push(el.value);
    });
    Object.keys(grouped).forEach(c => row[Number(c)] = grouped[c].join(', '));
    return row;
  }
  function activePublicMissing(fields, row) {
    return fields.filter(f => f.required && f.type !== 'image' && !String(row[f.index] || '').trim()).map(f => f.label);
  }
  function renderPublicFlowForm() {
    const table = $('workspaceTable');
    const flow = publicFlow();
    if (!table || !flow.enabled || !flowTypes().has(window.workspaceState?.workspaceType)) return false;
    const fields = publicFields().filter(f => !(f.index === 0 && /timestamp/i.test(f.label || '')));
    const row = window.haosPublicFlowRowV768 || new Array((window.workspaceState?.columns || []).length).fill('');
    window.haosPublicFlowRowV768 = row;
    window.haosPublicFlowVisitedV768 = window.haosPublicFlowVisitedV768 || new Set();
    window.haosPublicFlowCurrentV768 = window.haosPublicFlowCurrentV768 || flow.sections[0]?.id || 's1';
    const section = flow.sections.find(s => s.id === window.haosPublicFlowCurrentV768) || flow.sections[0];
    const sf = sectionFields(fields, section.id);
    window.haosPublicFlowVisitedV768.add(section.id);
    table.innerHTML = `<tbody><tr><td><div class="haos-v768-public-flow text-start p-2">
      <div class="haos-v768-progress">${flow.sections.map(s => `<span class="haos-v768-step-pill ${s.id === section.id ? 'active' : ''}">${esc(s.title)}</span>`).join('')}</div>
      <section class="haos-v768-public-section"><h5>${esc(section.title)}</h5>${sf.map(publicFormFieldHtml).join('')}</section>
      <div class="haos-v768-public-actions"><button type="button" class="btn btn-outline-secondary" onclick="haosV768PublicBack()">ย้อนกลับ</button><button type="button" class="btn btn-success fw-bold" onclick="haosV768PublicNext()">ต่อไป / ส่งข้อมูล</button></div>
      ${(window.workspaceState.rows || []).length ? `<div class="haos-v735-public-summary"><i class="bi bi-check-circle"></i> มีข้อมูลที่ส่งแล้ว ${window.workspaceState.rows.length} รายการ</div>` : ''}
    </div></td></tr></tbody>`;
    return true;
  }
  window.haosV768PublicBack = function() {
    const flow = publicFlow();
    const idx = flow.sections.findIndex(s => s.id === window.haosPublicFlowCurrentV768);
    window.haosPublicFlowCurrentV768 = flow.sections[Math.max(0, idx - 1)]?.id || flow.sections[0]?.id || 's1';
    renderPublicFlowForm();
  };
  async function uploadPublicFiles(row) {
    if (typeof readFileBase64Public_ !== 'function' || typeof gasRunPromisePublic_ !== 'function') return row;
    const fileInputs = qa('.workspace-form-file').filter(el => el.files && el.files.length);
    for (const input of fileInputs) {
      const file = input.files[0];
      const base64 = await readFileBase64Public_(file);
      const up = await gasRunPromisePublic_('uploadFileToDrive', [base64, file.name, file.type || 'image/png']);
      if (!up || !up.success) throw new Error(up && up.message ? up.message : 'อัปโหลดไฟล์ไม่สำเร็จ');
      row[Number(input.dataset.c)] = up.url;
    }
    return row;
  }
  window.haosV768PublicNext = async function() {
    const flow = publicFlow();
    const fields = publicFields().filter(f => !(f.index === 0 && /timestamp/i.test(f.label || '')));
    const section = flow.sections.find(s => s.id === window.haosPublicFlowCurrentV768) || flow.sections[0];
    const sf = sectionFields(fields, section.id);
    const row = collectPublicRow(window.haosPublicFlowRowV768 || []);
    const missing = activePublicMissing(sf, row);
    if (missing.length) return Swal.fire('กรุณากรอกข้อมูลให้ครบ', 'ช่องจำเป็นที่ยังไม่ได้กรอก: ' + missing.join(', '), 'warning');
    const next = nextSectionId(flow, sf, row, section.id);
    if (next !== '__submit__') {
      window.haosPublicFlowCurrentV768 = next;
      return renderPublicFlowForm();
    }
    try {
      window.__HAOS_PUBLIC_SUBMITTING__ = true;
      const btn = document.querySelector('button[onclick="haosV768PublicNext()"]');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังส่งข้อมูล...'; }
      await uploadPublicFiles(row);
      const visibleIndexes = fields.filter(f => window.haosPublicFlowVisitedV768.has(f.sectionId || 's1')).map(f => f.index);
      const payload = { values: row, visibleIndexes };
      const res = await new Promise((resolve, reject) => google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).submitPublicWorkspaceForm(window.workspaceState.id, window.workspaceState.token, payload));
      if (!res || !res.success) throw new Error(res && res.message ? res.message : 'ส่งข้อมูลไม่สำเร็จ');
      Swal.fire({ icon: 'success', title: 'ส่งข้อมูลแล้ว', text: res.message || '', timer: 1600, showConfirmButton: false });
      window.workspaceState.rows = window.workspaceState.rows || [];
      window.workspaceState.rows.push(row);
      window.haosPublicFlowRowV768 = null;
      window.haosPublicFlowVisitedV768 = new Set();
      window.haosPublicFlowCurrentV768 = flow.sections[0]?.id || 's1';
      renderPublicFlowForm();
    } catch (err) {
      Swal.fire('ผิดพลาด', err.message || String(err), 'error');
    } finally {
      window.__HAOS_PUBLIC_SUBMITTING__ = false;
    }
  };
  const prevRenderPublic = window.renderWorkspaceFormPublic;
  if (typeof prevRenderPublic === 'function') {
    window.renderWorkspaceFormPublic = function() {
      if (renderPublicFlowForm()) return;
      return prevRenderPublic.apply(this, arguments);
    };
  }
  const prevLoadPublic = window.loadPublicWorkspace;
  if (typeof prevLoadPublic === 'function') {
    window.loadPublicWorkspace = function(workspaceId, token) {
      const r = prevLoadPublic.apply(this, arguments);
      setTimeout(() => {
        if (!window.google || !google.script || !google.script.run) return;
        google.script.run.withSuccessHandler(res => {
          if (res && res.success && res.data) {
            window.workspaceState = Object.assign(window.workspaceState || {}, {
              fieldConfig: res.data.fieldConfig || window.workspaceState.fieldConfig || [],
              workspaceFlow: res.data.workspaceFlow || {},
              branding: res.data.branding || window.workspaceState.branding
            });
            if (renderPublicFlowForm()) return;
          }
        }).withFailureHandler(() => {}).getPublicWorkspace(workspaceId, token || '');
      }, 900);
      return r;
    };
  }
  function boot() {
    enhanceCreateBuilder();
    ensureTypeNote();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setTimeout(boot, 1000);
  document.addEventListener('change', ev => {
    if (ev.target && (ev.target.id === 'wsWorkspaceType' || ev.target.classList?.contains('ws-col-type-v728') || ev.target.classList?.contains('ws-edit-type-v737'))) {
      setTimeout(() => { enhanceCreateBuilder(); enhanceEditPopup(); }, 0);
    }
  }, true);
  document.addEventListener('input', ev => {
    if (ev.target && (ev.target.classList?.contains('ws-col-options-v728') || ev.target.classList?.contains('ws-edit-options-v737') || ev.target.classList?.contains('ws-col-label-v728') || ev.target.classList?.contains('ws-edit-label-v737'))) {
      clearTimeout(window.__haosV768FlowTimer);
      window.__haosV768FlowTimer = setTimeout(() => { enhanceCreateBuilder(); enhanceEditPopup(); }, 180);
    }
  }, true);
  console.info('HAOS ' + PATCH + ' loaded');
})();
