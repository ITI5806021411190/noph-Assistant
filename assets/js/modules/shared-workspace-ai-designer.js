(function () {
  const PATCH = 'v70.126-workspace-ai-designer-phase1';
  if (window.__HAOS_V7126_WORKSPACE_AI_DESIGNER__) return;
  window.__HAOS_V7126_WORKSPACE_AI_DESIGNER__ = true;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const validTypes = new Set(['text', 'textarea', 'dropdown', 'radio', 'checkbox', 'image']);
  const choiceTypes = new Set(['dropdown', 'radio', 'checkbox']);

  function splitOptions(value) {
    if (Array.isArray(value)) return value.map(clean).filter(Boolean);
    const seen = new Set();
    return String(value || '')
      .split(/[,|]/)
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
    if (/^(true|yes|y|1|on|required|require|จำเป็น|ต้องกรอก)$/i.test(text)) return true;
    if (/^(false|no|n|0|off|ไม่|ไม่จำเป็น)$/i.test(text)) return false;
    return !!fallback;
  }

  function normalizeWorkspaceType(type, fallback) {
    const value = String(type || fallback || 'table').trim().toLowerCase();
    const map = {
      online_form: 'form',
      light_table: 'table',
      sheet: 'google_sheet',
      form_google: 'google_form',
      test: 'quiz',
      exam: 'quiz'
    };
    const normalized = map[value] || value;
    return ['table', 'checklist', 'form', 'quiz', 'google_sheet', 'google_form'].includes(normalized)
      ? normalized
      : (fallback || 'table');
  }

  function inferType(label, options, requested) {
    const raw = String(requested || '').trim().toLowerCase();
    const text = String(label || '').trim();
    const mapped = {
      select: 'dropdown',
      dropdownlist: 'dropdown',
      choice: 'radio',
      single_choice: 'radio',
      multiple_choice: 'checkbox',
      multi_choice: 'checkbox',
      longtext: 'textarea',
      paragraph: 'textarea',
      photo: 'image',
      picture: 'image',
      file: 'image'
    }[raw] || raw;
    if (validTypes.has(mapped)) return mapped;
    if (/รูป|ภาพ|แนบ|หลักฐานภาพ|ไฟล์ภาพ/i.test(text)) return 'image';
    if (/รายละเอียด|คำอธิบาย|หมายเหตุ|ข้อเสนอแนะ|ความเห็น|บรรยาย/i.test(text)) return 'textarea';
    if (/ดำเนินการแล้ว|เสร็จแล้ว|ยืนยัน|รับทราบ|ตรวจแล้ว/i.test(text)) return options.length ? 'checkbox' : 'checkbox';
    if (options.length) return /เพศ|ผลการ|เลือกได้หลาย|หลายข้อ/i.test(text) ? 'checkbox' : 'dropdown';
    return 'text';
  }

  function parseSpec(spec, index) {
    const raw = String(spec || '').trim();
    const optionMatch = raw.match(/\[(?:dropdown|dropdownlist|select|radio|choice|checkbox|check|ตัวเลือก|ดรอปดาวน์):\s*([^\]]+)\]/i);
    const options = splitOptions(optionMatch && optionMatch[1]);
    const type = /radio|choice|ตัวเลือกเดี่ยว/i.test(raw)
      ? 'radio'
      : /dropdown|dropdownlist|select|ดรอปดาวน์/i.test(raw)
        ? 'dropdown'
        : /checkbox|check|เลือกได้หลาย|หลายตัวเลือก/i.test(raw)
          ? 'checkbox'
          : /image|photo|picture|รูปภาพ|แนบรูป/i.test(raw)
            ? 'image'
            : /textarea|longtext|paragraph|ข้อความยาว|ยาว/i.test(raw)
              ? 'textarea'
              : inferType(raw, options, '');
    return {
      index,
      label: clean(raw.replace(/\[[^\]]+\]/g, '').replace(/\*\s*$/, '')) || ('ช่องข้อมูล ' + (index + 1)),
      type,
      options,
      required: /\[(?:required|require|\*|จำเป็น|ต้องกรอก)\]/i.test(raw) || /\*\s*$/.test(raw),
      sectionId: 's1'
    };
  }

  function normalizeField(field, index) {
    if (typeof field === 'string') return parseSpec(field, index);
    field = field || {};
    const label = clean(
      field.label ||
      field.name ||
      field.title ||
      field.question ||
      field.column ||
      field.header ||
      field.prompt ||
      ''
    );
    const options = splitOptions(field.options || field.choices || field.choiceOptions || field.values);
    const type = inferType(label, options, field.type || field.inputType || field.kind || field.fieldType);
    const out = {
      index,
      label: label || ('ช่องข้อมูล ' + (index + 1)),
      type,
      options,
      required: bool(field.required, false),
      sectionId: clean(field.sectionId || field.section || '') || 's1'
    };
    if (field.placeholder) out.placeholder = clean(field.placeholder);
    if (field.helpText || field.description) out.helpText = clean(field.helpText || field.description);
    if (field.correctAnswers || field.correctAnswer) out.correctAnswers = splitOptions(field.correctAnswers || field.correctAnswer);
    if (field.points != null) out.points = Number(field.points) || 0;
    const skipQuiz = bool(field.skipQuiz || field.notQuiz || field.excludeFromScore, false) || field.isQuizField === false;
    if (skipQuiz) {
      out.skipQuiz = true;
      out.isQuizField = false;
      out.points = 0;
      out.correctAnswers = [];
    }
    return out;
  }

  function specFromField(field) {
    const label = clean(field && field.label) || 'ช่องข้อมูล';
    const opts = splitOptions(field && field.options).join(', ');
    let spec = label;
    if (field.type === 'dropdown') spec += ' [dropdown: ' + (opts || 'ตัวเลือก 1, ตัวเลือก 2') + ']';
    else if (field.type === 'radio') spec += ' [radio: ' + (opts || 'ตัวเลือก 1, ตัวเลือก 2') + ']';
    else if (field.type === 'checkbox') spec += opts ? ' [checkbox: ' + opts + ']' : ' [checkbox]';
    else if (field.type === 'textarea') spec += ' [textarea]';
    else if (field.type === 'image') spec += ' [image]';
    if (field.required) spec += ' [required]';
    return spec;
  }

  function normalizeDraft(data) {
    data = data || {};
    const currentType = $('wsWorkspaceType')?.value || 'table';
    const type = normalizeWorkspaceType(data.workspaceType || data.suggestedWorkspaceType || data.type, currentType);
    let rawFields = [];
    if (Array.isArray(data.fieldConfig)) rawFields = data.fieldConfig;
    else if (Array.isArray(data.fields)) rawFields = data.fields;
    else if (Array.isArray(data.questions)) rawFields = data.questions;
    else if (Array.isArray(data.columns)) rawFields = data.columns;
    const fields = rawFields
      .map(normalizeField)
      .filter(field => field.label)
      .map((field, index) => Object.assign({}, field, { index }));
    const columns = fields.length ? fields.map(specFromField) : (Array.isArray(data.columns) ? data.columns.map(String) : []);
    return Object.assign({}, data, {
      workspaceType: type,
      suggestedWorkspaceType: type,
      fieldConfig: fields,
      columns,
      aiDesignerVersion: PATCH
    });
  }

  function typeLabel(type) {
    return {
      text: 'ข้อความ',
      textarea: 'ข้อความยาว',
      dropdown: 'รายการเลือก',
      radio: 'ตัวเลือกเดียว',
      checkbox: 'หลายตัวเลือก/ติ๊กถูก',
      image: 'รูปภาพ'
    }[type] || type;
  }

  function ensureDraftPanel() {
    let panel = $('workspaceAiDesignerDraftV7126');
    if (panel) return panel;
    const anchor = $('workspaceAiTextPaste')?.closest('.ai-paste-box') || $('wsBuilderV728');
    if (!anchor) return null;
    panel = document.createElement('div');
    panel.id = 'workspaceAiDesignerDraftV7126';
    panel.className = 'haos-v7126-ai-draft d-none';
    anchor.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function renderDraftPanel(draft) {
    const panel = ensureDraftPanel();
    if (!panel || !draft || !draft.fieldConfig || !draft.fieldConfig.length) return;
    const fields = draft.fieldConfig;
    const requiredCount = fields.filter(field => field.required).length;
    const choiceCount = fields.filter(field => choiceTypes.has(field.type)).length;
    const chips = fields.slice(0, 8).map(field => `
      <span class="haos-v7126-field-chip">
        ${esc(field.label)}
        <small>${esc(typeLabel(field.type))}${field.required ? ' / จำเป็น' : ''}</small>
      </span>
    `).join('');
    panel.classList.remove('d-none');
    panel.innerHTML = `
      <div class="haos-v7126-ai-head">
        <div>
          <b><i class="bi bi-stars"></i> ร่างพื้นที่จาก AI Designer</b>
          <div class="small text-muted">AI เติมร่างลงตัวออกแบบแล้ว ยังไม่บันทึกลงฐานข้อมูลจนกว่าจะกดสร้างพื้นที่</div>
        </div>
        <span class="haos-v7126-version">${esc(PATCH)}</span>
      </div>
      <div class="haos-v7126-ai-stats">
        <span><i class="bi bi-ui-checks-grid"></i> ${fields.length} ช่องข้อมูล</span>
        <span><i class="bi bi-asterisk"></i> จำเป็น ${requiredCount} ช่อง</span>
        <span><i class="bi bi-list-check"></i> ตัวเลือก ${choiceCount} ช่อง</span>
        <span><i class="bi bi-layout-text-window"></i> ${esc(typeLabel(draft.workspaceType))}</span>
      </div>
      <div class="haos-v7126-field-list">${chips}${fields.length > 8 ? '<span class="haos-v7126-field-chip muted">+' + (fields.length - 8) + ' ช่อง</span>' : ''}</div>
      ${draft.logicTips || draft.designNotes ? '<div class="haos-v7126-note"><i class="bi bi-lightbulb"></i> ' + esc(draft.logicTips || draft.designNotes) + '</div>' : ''}
    `;
  }

  function rowHtml(field, index) {
    const options = splitOptions(field.options).join(', ');
    const correct = splitOptions(field.correctAnswers).join(', ');
    const type = validTypes.has(field.type) ? field.type : 'text';
    return `<div class="haos-v728-col-row" data-ws-col-row data-v744-index="ช่องข้อมูล ${index + 1}">
      <div><label class="small fw-bold text-muted">ชื่อช่องข้อมูล</label><input class="form-control ws-col-label-v728" value="${esc(field.label || '')}" placeholder="เช่น ชื่อผู้ตอบ, หน่วยงาน, รายละเอียด" oninput="syncWorkspaceBuilderV728()"></div>
      <div><label class="small fw-bold text-muted">ชนิดข้อมูล</label><select class="form-select ws-col-type-v728" onchange="syncWorkspaceBuilderV728();refreshWorkspaceSampleV728&&refreshWorkspaceSampleV728();">
        <option value="text" ${type === 'text' ? 'selected' : ''}>ข้อความ</option>
        <option value="textarea" ${type === 'textarea' ? 'selected' : ''}>ข้อความยาว</option>
        <option value="dropdown" ${type === 'dropdown' ? 'selected' : ''}>รายการเลือก (Dropdown)</option>
        <option value="radio" ${type === 'radio' ? 'selected' : ''}>ตัวเลือกเดียว (Radio)</option>
        <option value="checkbox" ${type === 'checkbox' ? 'selected' : ''}>หลายตัวเลือก (Checkbox)</option>
        <option value="image" ${type === 'image' ? 'selected' : ''}>รูปภาพ</option>
      </select></div>
      <div class="ws-col-options-wrap-v728"><label class="small fw-bold text-muted">ตัวเลือก</label><input class="form-control ws-col-options-v728" value="${esc(options)}" placeholder="พิมพ์คั่นด้วย , หรือกด + เพื่อเพิ่มทีละข้อ" oninput="syncWorkspaceBuilderV728()"><div class="haos-v744-choice-note">ใช้กับ Dropdown / Radio / Checkbox</div></div>
      <label class="haos-v735-required-toggle"><input type="checkbox" class="form-check-input ws-col-required-v735" ${field.required ? 'checked' : ''} onchange="syncWorkspaceBuilderV728()"> จำเป็นต้องระบุ</label>
      <div class="haos-v744-quiz-controls">
        <label class="haos-v745-quiz-skip"><input type="checkbox" class="form-check-input ws-col-not-quiz-v745" ${field.skipQuiz || field.isQuizField === false ? 'checked' : ''}> ช่องนี้เป็นข้อมูลประกอบ ไม่คิดคะแนน</label>
        <div><label class="small fw-bold text-muted">เฉลย / คำตอบที่ถูก</label><input class="form-control form-control-sm ws-col-correct-v744" value="${esc(correct)}" placeholder="พิมพ์เฉลยคั่นด้วย ,"></div>
        <div><label class="small fw-bold text-muted">คะแนน</label><input type="number" min="0" step="0.5" class="form-control form-control-sm ws-col-points-v744" value="${esc(field.points || 1)}"></div>
      </div>
      <div class="d-flex gap-1">
        <button type="button" class="btn btn-light border" onclick="moveWorkspaceColumnV728(this,-1)" title="ย้ายขึ้น"><i class="bi bi-arrow-up"></i></button>
        <button type="button" class="btn btn-light border" onclick="moveWorkspaceColumnV728(this,1)" title="ย้ายลง"><i class="bi bi-arrow-down"></i></button>
        <button type="button" class="btn btn-outline-danger" onclick="removeWorkspaceColumnV728(this)" title="ลบ"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
  }

  function applyDraftToBuilder(draft) {
    if (!draft || !draft.fieldConfig || !draft.fieldConfig.length) return;
    try { window.installWorkspaceBuilderV728 && window.installWorkspaceBuilderV728(); } catch (e) {}
    if ($('wsWorkspaceType') && draft.workspaceType) $('wsWorkspaceType').value = draft.workspaceType;
    if ($('wsCreateColumns')) $('wsCreateColumns').value = draft.columns.join('\n');
    if ($('wsDefaultRows') && Array.isArray(draft.sampleRows)) {
      $('wsDefaultRows').value = draft.sampleRows
        .filter(row => Array.isArray(row) ? row.some(Boolean) : clean(row))
        .map(row => Array.isArray(row) ? row.map(clean).join(' | ') : clean(row))
        .join('\n');
    }
    const list = $('wsColumnListV728');
    if (list) {
      list.innerHTML = draft.fieldConfig.map(rowHtml).join('');
      list.querySelectorAll('.ws-col-options-wrap-v728').forEach(wrap => {
        const row = wrap.closest('[data-ws-col-row]');
        const type = row?.querySelector('.ws-col-type-v728')?.value || 'text';
        wrap.style.display = choiceTypes.has(type) ? '' : 'none';
      });
    }
    try { window.syncWorkspaceBuilderV728 && window.syncWorkspaceBuilderV728(); } catch (e) {}
    setTimeout(() => {
      try { window.syncWorkspaceBuilderV728 && window.syncWorkspaceBuilderV728(); } catch (e) {}
      renderDraftPanel(draft);
    }, 80);
  }

  function installStyle() {
    if ($('haos-v70-126-workspace-ai-designer-style')) return;
    const style = document.createElement('style');
    style.id = 'haos-v70-126-workspace-ai-designer-style';
    style.textContent = `
      .haos-v7126-ai-draft{border:1px solid rgba(14,165,233,.28);border-radius:8px;background:linear-gradient(135deg,#f0f9ff,#ecfeff);padding:13px 14px;margin-bottom:14px;box-shadow:0 12px 30px rgba(14,165,233,.08)}
      .haos-v7126-ai-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}
      .haos-v7126-ai-head b{color:#075985;font-weight:950}
      .haos-v7126-version{border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:.72rem;font-weight:950;padding:4px 9px;white-space:nowrap}
      .haos-v7126-ai-stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px}
      .haos-v7126-ai-stats span{display:inline-flex;align-items:center;gap:5px;border:1px solid #bae6fd;border-radius:999px;background:#fff;color:#0369a1;font-size:.78rem;font-weight:900;padding:5px 9px}
      .haos-v7126-field-list{display:flex;gap:7px;flex-wrap:wrap}
      .haos-v7126-field-chip{display:inline-flex;flex-direction:column;gap:2px;border:1px solid #bfdbfe;border-radius:8px;background:#fff;color:#0f172a;font-size:.78rem;font-weight:900;padding:7px 9px}
      .haos-v7126-field-chip small{color:#64748b;font-weight:850}
      .haos-v7126-field-chip.muted{color:#64748b;background:#f8fafc}
      .haos-v7126-note{border-top:1px dashed #7dd3fc;margin-top:10px;padding-top:9px;color:#0f766e;font-size:.84rem;font-weight:850}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    const previous = window.applyWorkspaceAiData_;
    if (typeof previous === 'function' && !previous.__haosV7126Wrapped) {
      const wrapped = function (data) {
        const draft = normalizeDraft(data || {});
        const result = previous.call(this, draft);
        window.haosWorkspaceAiDraftV7126 = draft;
        setTimeout(() => applyDraftToBuilder(draft), 90);
        return result;
      };
      wrapped.__haosV7126Wrapped = true;
      wrapped.__haosOriginal = previous;
      window.applyWorkspaceAiData_ = wrapped;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  setTimeout(install, 900);
  console.info('HAOS ' + PATCH + ' loaded');
})();
