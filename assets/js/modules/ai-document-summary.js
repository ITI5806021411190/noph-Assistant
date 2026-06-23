(function () {
  'use strict';

  const PATCH = 'v70.93-ai-document-summary-phase2';
  if (window.__HAOS_V788_AI_DOCUMENT_SUMMARY__) return;
  window.__HAOS_V788_AI_DOCUMENT_SUMMARY__ = true;

  const MODES = [
    ['auto', 'อัตโนมัติ', 'ให้ AI เลือกรูปแบบตามเอกสาร'],
    ['short', 'สั้น', 'อ่านเร็ว ได้ใจความ'],
    ['detailed', 'ละเอียด', 'เก็บบริบทและรายละเอียดมากขึ้น'],
    ['executive', 'ผู้บริหาร', 'อ่าน 1 นาที พร้อมประเด็นตัดสินใจ'],
    ['officer', 'เจ้าหน้าที่', 'เน้นสิ่งที่ต้องดำเนินการต่อ']
  ];

  const state = {
    mode: safeLocalGet('haos.aiDoc.mode', 'auto'),
    result: null,
    history: [],
    filters: {
      mode: '',
      type: '',
      from: '',
      to: ''
    },
    busy: false
  };

  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

  function normalizeThaiYearDateTime(value) {
    const raw = clean(value);
    if (!raw) return '';
    let out = raw.replace(/\s+/g, 'T');
    const match = out.match(/^(\d{4})([-/])(\d{1,2})\2(\d{1,2})(?:T(\d{1,2}):(\d{2})(?::\d{2})?)?/);
    if (!match) return raw;
    let year = Number(match[1]);
    if (year >= 2400) year -= 543;
    const month = String(Number(match[3])).padStart(2, '0');
    const day = String(Number(match[4])).padStart(2, '0');
    const hour = match[5] != null ? String(Number(match[5])).padStart(2, '0') : '';
    const minute = match[6] || '';
    return `${year}-${month}-${day}${hour ? `T${hour}:${minute}` : ''}`;
  }

  function displayScheduleDateTime(value) {
    const normalized = normalizeThaiYearDateTime(value);
    if (!normalized) return '-';
    try {
      if (window.HAOSDateDisplay?.dateTime) {
        return window.HAOSDateDisplay.dateTime(normalized, { forceTime: normalized.includes('T') });
      }
    } catch (err) {}
    return normalized.replace('T', ' ');
  }

  function safeLocalGet(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (err) {
      return fallback;
    }
  }

  function safeLocalSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {}
  }

  function getUser() {
    try {
      if (typeof window.currentUser === 'function') return window.currentUser() || {};
    } catch (err) {}
    try {
      return window.user || {};
    } catch (err) {
      return window.user || {};
    }
  }

  function gas(fn, args) {
    if (typeof window.gasRunPromise_ === 'function') return window.gasRunPromise_(fn, args || []);
    return new Promise((resolve, reject) => {
      try {
        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn].apply(google.script.run, args || []);
      } catch (err) {
        reject(err);
      }
    });
  }

  function modeLabel(modeId) {
    return MODES.find(item => item[0] === modeId)?.[1] || 'อัตโนมัติ';
  }

  function ensureOverlay() {
    if ($('haosAiDocOverlayV788')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="haosAiDocOverlayV788" class="haos-ai-doc-overlay" aria-hidden="true">
        <div class="haos-ai-doc-shell">
          <div class="haos-ai-doc-header">
            <div>
              <h4><i class="bi bi-stars"></i> สรุปเอกสารด้วย AI</h4>
              <div class="small opacity-75">แนบ PDF/รูปภาพ หรือวางข้อความ แล้วให้ AI สรุปงานราชการพร้อมสิ่งที่ต้องดำเนินการ</div>
            </div>
            <button type="button" class="btn btn-light fw-bold" onclick="window.HAOSAiDocSummary.close()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="haos-ai-doc-body">
            <div class="row g-3">
              <div class="col-lg-5">
                <div class="haos-ai-doc-card p-3 mb-3">
                  <div class="haos-ai-doc-section-title"><i class="bi bi-upload"></i> แหล่งข้อมูล</div>
                  <label class="small fw-bold">แนบไฟล์ PDF / รูปภาพ</label>
                  <input id="haosAiDocFileV788" type="file" class="form-control mb-2" accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp">
                  <div class="small text-muted mb-3">ถ้าเป็น PDF ที่มีข้อความ ระบบจะอ่านเฉพาะข้อความก่อนเพื่อลดโควต้า AI ถ้าเป็นรูปภาพจะส่งให้ AI อ่านจากภาพ</div>
                  <label class="small fw-bold">หรือวางข้อความเอง</label>
                  <textarea id="haosAiDocTextV788" class="form-control" rows="9" placeholder="วางข้อความจากหนังสือราชการ ประกาศ รายงาน หรือข้อความถอดจากรูปภาพ..."></textarea>
                </div>

                <div class="haos-ai-doc-card p-3 mb-3">
                  <div class="haos-ai-doc-section-title"><i class="bi bi-sliders"></i> โหมดสรุป</div>
                  <div class="row g-2" id="haosAiDocModeBoxV788"></div>
                  <div class="d-grid mt-3">
                    <button id="haosAiDocAnalyzeBtnV788" type="button" class="btn btn-success btn-lg fw-bold" onclick="window.HAOSAiDocSummary.analyze()">
                      <i class="bi bi-magic"></i> เริ่มสรุปเอกสาร
                    </button>
                  </div>
                  <div id="haosAiDocStatusV788" class="small text-muted mt-2"></div>
                </div>

                <div class="haos-ai-doc-card p-3">
                  <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <div class="haos-ai-doc-section-title mb-0"><i class="bi bi-clock-history"></i> ประวัติสรุปเอกสาร</div>
                    <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="window.HAOSAiDocSummary.loadHistory()"><i class="bi bi-arrow-clockwise"></i></button>
                  </div>
                  <input id="haosAiDocHistorySearchV788" class="form-control form-control-sm mb-2" placeholder="ค้นหาประวัติ..." onkeydown="if(event.key==='Enter')window.HAOSAiDocSummary.loadHistory()">
                  <div class="haos-ai-doc-history-filters mb-2">
                    <select id="haosAiDocFilterModeV788" class="form-select form-select-sm" onchange="window.HAOSAiDocSummary.renderHistory()">
                      <option value="">ทุกโหมด</option>
                      <option value="auto">อัตโนมัติ</option>
                      <option value="short">สั้น</option>
                      <option value="detailed">ละเอียด</option>
                      <option value="executive">ผู้บริหาร</option>
                      <option value="officer">เจ้าหน้าที่</option>
                    </select>
                    <input id="haosAiDocFilterTypeV788" class="form-control form-control-sm" placeholder="ประเภทเอกสาร" oninput="window.HAOSAiDocSummary.renderHistory()">
                    <input id="haosAiDocFilterFromV788" type="date" class="form-control form-control-sm" onchange="window.HAOSAiDocSummary.renderHistory()">
                    <input id="haosAiDocFilterToV788" type="date" class="form-control form-control-sm" onchange="window.HAOSAiDocSummary.renderHistory()">
                    <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="window.HAOSAiDocSummary.clearFilters()" title="ล้างตัวกรอง"><i class="bi bi-x-circle"></i></button>
                  </div>
                  <div id="haosAiDocHistoryV788" class="d-grid gap-2"></div>
                </div>
              </div>

              <div class="col-lg-7">
                <div id="haosAiDocResultV788" class="haos-ai-doc-empty">
                  <i class="bi bi-file-earmark-text fs-1 d-block mb-2"></i>
                  เลือกไฟล์หรือวางข้อความ แล้วกด “เริ่มสรุปเอกสาร”
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    renderModeButtons();
  }

  function renderModeButtons() {
    const box = $('haosAiDocModeBoxV788');
    if (!box) return;
    box.innerHTML = MODES.map(item => `
      <div class="col-md-6 col-xl-4">
        <button type="button" class="btn btn-outline-primary w-100 text-start haos-ai-doc-mode ${state.mode === item[0] ? 'active' : ''}" data-mode="${esc(item[0])}">
          <span class="d-block">${esc(item[1])}</span>
          <span class="small d-block opacity-75">${esc(item[2])}</span>
        </button>
      </div>
    `).join('');
    qa('[data-mode]', box).forEach(btn => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode || 'auto';
        safeLocalSet('haos.aiDoc.mode', state.mode);
        renderModeButtons();
      });
    });
  }

  function setStatus(message, tone) {
    const el = $('haosAiDocStatusV788');
    if (!el) return;
    el.className = 'small mt-2 ' + (tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-muted');
    el.innerHTML = message || '';
  }

  function setBusy(busy, message) {
    state.busy = !!busy;
    const btn = $('haosAiDocAnalyzeBtnV788');
    if (btn) {
      btn.disabled = !!busy;
      btn.innerHTML = busy
        ? '<span class="spinner-border spinner-border-sm"></span> กำลังสรุปเอกสาร...'
        : '<i class="bi bi-magic"></i> เริ่มสรุปเอกสาร';
    }
    if (message) setStatus(busy ? `<span class="haos-ai-doc-loading"><span class="spinner-border spinner-border-sm"></span>${esc(message)}</span>` : message, busy ? 'muted' : 'success');
  }

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => resolve(String(event.target.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function extractPdfText(file) {
    if (!window.pdfjsLib || file.type !== 'application/pdf') return '';
    const pdfjs = window.pdfjsLib;
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const maxPages = Math.min(pdf.numPages, 8);
    const chunks = [];
    for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      chunks.push(content.items.map(item => item.str || '').join(' '));
    }
    let text = chunks.join('\n\n').trim();
    if (pdf.numPages > maxPages) text += `\n\n[อ่านเฉพาะ ${maxPages} หน้าแรกจากทั้งหมด ${pdf.numPages} หน้า]`;
    return text;
  }

  function normalizeHistoryItem(item) {
    return {
      summaryId: item.summaryId,
      title: item.title || 'สรุปเอกสารด้วย AI',
      documentType: item.documentType || 'เอกสารทั่วไป',
      summary: item.summary || '',
      executiveSummary: item.executiveSummary || '',
      officerSummary: item.officerSummary || '',
      keyPoints: item.keyPoints || [],
      actionItems: item.actionItems || [],
      deadlines: item.deadlines || [],
      stakeholders: item.stakeholders || [],
      extracted: item.extracted || {
        documentNo: item.documentNo || '',
        documentDate: item.documentDate || '',
        originAgency: item.originAgency || '',
        subject: item.title || '',
        meetingLink: item.meetingLink || '',
        otherLinks: []
      },
      drafts: item.drafts || {},
      scheduleDrafts: (item.scheduleDrafts || []).map(draft => ({
        ...draft,
        startTime: normalizeThaiYearDateTime(draft.startTime || draft.start_time || draft.date_time || ''),
        endTime: normalizeThaiYearDateTime(draft.endTime || draft.end_time || '')
      })),
      fileName: item.fileName || '',
      summaryMode: item.summaryMode || '',
      summaryModeLabel: modeLabel(item.summaryMode || 'auto'),
      docUrl: item.docUrl || '',
      pdfUrl: item.pdfUrl || '',
      createdAt: item.createdAt || ''
    };
  }

  async function analyze() {
    if (state.busy) return;
    ensureOverlay();
    const file = $('haosAiDocFileV788')?.files?.[0] || null;
    const typedText = $('haosAiDocTextV788')?.value || '';
    if (!file && !typedText.trim()) {
      return window.Swal?.fire('ยังไม่มีข้อมูล', 'กรุณาแนบไฟล์หรือวางข้อความก่อนให้ AI สรุป', 'warning');
    }
    if (file && !/^image\/|application\/pdf$/.test(file.type || '')) {
      return window.Swal?.fire('ชนิดไฟล์ไม่รองรับ', 'รองรับ PDF, PNG, JPG และ WebP เท่านั้น', 'warning');
    }
    if (file && file.size > 10 * 1024 * 1024) {
      return window.Swal?.fire('ไฟล์ใหญ่เกินไป', 'เวอร์ชันแรกแนะนำไฟล์ไม่เกิน 10 MB เพื่อป้องกัน Apps Script timeout', 'warning');
    }

    try {
      setBusy(true, 'กำลังเตรียมข้อมูลเอกสาร');
      let inputText = typedText.trim();
      let base64Data = '';
      if (file && file.type === 'application/pdf') {
        setBusy(true, 'กำลังอ่านข้อความจาก PDF');
        try {
          const pdfText = await extractPdfText(file);
          if (pdfText && pdfText.length >= 80) inputText = [inputText, pdfText].filter(Boolean).join('\n\n');
          else base64Data = await fileToBase64(file);
        } catch (err) {
          base64Data = await fileToBase64(file);
        }
      } else if (file) {
        setBusy(true, 'กำลังอ่านรูปภาพเพื่อส่งให้ AI');
        base64Data = await fileToBase64(file);
      }

      const me = getUser();
      setBusy(true, 'AI กำลังสรุปสาระสำคัญและแยกสิ่งที่ต้องดำเนินการ');
      const res = await gas('analyzeAIDocumentSummaryV788', [{
        actorPhone: me.phone || '',
        actorName: me.fullName || me.name || '',
        department: me.department || me.departmentName || '',
        summaryMode: state.mode,
        inputText,
        base64Data,
        fileName: file?.name || '',
        mimeType: file?.type || ''
      }]);
      if (!res || !res.success) throw new Error(res?.message || 'AI สรุปเอกสารไม่สำเร็จ');
      state.result = normalizeHistoryItem(res.data || {});
      renderResult();
      setStatus('สรุปเอกสารสำเร็จ', 'success');
      loadHistory();
    } catch (err) {
      const message = err?.message || String(err);
      setStatus(message, 'danger');
      window.Swal?.fire('สรุปไม่สำเร็จ', message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function metaChips(result) {
    const ex = result.extracted || {};
    const chips = [
      ['bi-file-earmark-text', result.documentType],
      ['bi-hash', ex.documentNo],
      ['bi-calendar3', ex.documentDate],
      ['bi-building', ex.originAgency],
      ['bi-link-45deg', ex.meetingLink]
    ].filter(item => clean(item[1]));
    return chips.map(item => `<span class="haos-ai-doc-chip"><i class="bi ${esc(item[0])}"></i>${esc(item[1])}</span>`).join('');
  }

  function listHtml(items) {
    if (!items || !items.length) return '<div class="text-muted small">ไม่พบข้อมูล</div>';
    return `<ul class="mb-0">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
  }

  function actionTable(items) {
    if (!items || !items.length) return '<div class="text-muted small">ไม่พบสิ่งที่ต้องดำเนินการชัดเจน</div>';
    return `<div class="table-responsive"><table class="table table-sm align-middle haos-ai-doc-action-table">
      <thead><tr><th>งานที่ต้องทำ</th><th>ผู้รับผิดชอบ</th><th>กำหนดเวลา</th><th>ระดับ</th></tr></thead>
      <tbody>${items.map(item => `<tr><td class="fw-bold">${esc(item.task || '-')}</td><td>${esc(item.owner || '-')}</td><td>${esc(item.deadline || '-')}</td><td>${esc(item.priority || '-')}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  function scheduleDraftHtml(items) {
    if (!items || !items.length) return '<div class="text-muted small">ยังไม่พบกำหนดการที่สร้างเป็นตารางงานได้ทันที</div>';
    return items.map((item, index) => `
      <div class="border rounded-4 p-3 mb-2 bg-light">
        <div class="d-flex justify-content-between gap-2 flex-wrap">
          <div>
            <div class="fw-bold text-primary">${esc(item.eventName || 'กำหนดการจากเอกสาร')}</div>
            <div class="small text-muted">${esc(displayScheduleDateTime(item.startTime))} ${item.endTime ? 'ถึง ' + esc(displayScheduleDateTime(item.endTime)) : ''} · ${esc(item.location || '-')}</div>
          </div>
          <button type="button" class="btn btn-sm btn-success fw-bold" onclick="window.HAOSAiDocSummary.createSchedule(${index})"><i class="bi bi-calendar-plus"></i> สร้างตารางงาน</button>
        </div>
      </div>
    `).join('');
  }

  function draftsHtml(result) {
    const drafts = result.drafts || {};
    return `
      <div class="row g-2">
        <div class="col-md-4"><label class="small fw-bold">ร่างแจ้งเวียน</label><textarea class="form-control" rows="7" readonly>${esc(drafts.circulation || '')}</textarea></div>
        <div class="col-md-4"><label class="small fw-bold">ร่างบันทึกเสนอ</label><textarea class="form-control" rows="7" readonly>${esc(drafts.memo || '')}</textarea></div>
        <div class="col-md-4"><label class="small fw-bold">ร่างข้อความ LINE</label><textarea class="form-control" rows="7" readonly>${esc(drafts.line || '')}</textarea></div>
      </div>
    `;
  }

  function renderResult() {
    const result = state.result;
    const box = $('haosAiDocResultV788');
    if (!box || !result) return;
    box.className = 'haos-ai-doc-card p-3';
    box.innerHTML = `
      <div class="haos-ai-doc-result-hero mb-3">
        <div class="d-flex justify-content-between gap-3 flex-wrap">
          <div>
            <div class="small opacity-75">${esc(result.documentType || 'เอกสารทั่วไป')} · โหมด ${esc(result.summaryModeLabel || modeLabel(result.summaryMode))}</div>
            <h4 class="fw-black mb-1">${esc(result.title || 'สรุปเอกสารด้วย AI')}</h4>
            <div class="small opacity-75">${result.fileName ? 'ไฟล์: ' + esc(result.fileName) : 'สรุปจากข้อความที่วางเอง'}</div>
          </div>
          <div class="d-flex gap-2 flex-wrap align-items-start">
            <button class="btn btn-light fw-bold" onclick="window.HAOSAiDocSummary.copy()"><i class="bi bi-clipboard"></i> คัดลอก</button>
            <button class="btn btn-warning fw-bold" onclick="window.HAOSAiDocSummary.createSchedule(0)"><i class="bi bi-calendar-plus"></i> สร้างตารางงาน</button>
            <button class="btn btn-success fw-bold" onclick="window.HAOSAiDocSummary.sendToEOffice()"><i class="bi bi-journal-check"></i> ส่งเข้า e-Office</button>
            <button class="btn btn-info fw-bold text-white" onclick="window.HAOSAiDocSummary.sendToNote()"><i class="bi bi-journal-plus"></i> ส่งเข้า Note</button>
            <button class="btn btn-outline-light fw-bold" onclick="window.HAOSAiDocSummary.createDoc()"><i class="bi bi-file-earmark-word"></i> Doc/PDF</button>
          </div>
        </div>
      </div>

      <div class="mb-3">${metaChips(result) || '<span class="text-muted small">ไม่พบ metadata สำคัญในเอกสาร</span>'}</div>

      <div class="row g-3">
        <div class="col-12">
          <div class="haos-ai-doc-section-title"><i class="bi bi-card-text"></i> สรุปสาระสำคัญ</div>
          <div class="haos-ai-doc-box">${esc(result.summary || '-')}</div>
        </div>
        <div class="col-md-6">
          <div class="haos-ai-doc-section-title"><i class="bi bi-lightning-charge"></i> ผู้บริหารอ่าน 1 นาที</div>
          <div class="haos-ai-doc-box">${esc(result.executiveSummary || result.summary || '-')}</div>
        </div>
        <div class="col-md-6">
          <div class="haos-ai-doc-section-title"><i class="bi bi-person-check"></i> เจ้าหน้าที่ต้องทำอะไรต่อ</div>
          <div class="haos-ai-doc-box">${esc(result.officerSummary || '-')}</div>
        </div>
        <div class="col-md-6">
          <div class="haos-ai-doc-section-title"><i class="bi bi-pin-angle"></i> ประเด็นสำคัญ</div>
          ${listHtml(result.keyPoints)}
        </div>
        <div class="col-md-6">
          <div class="haos-ai-doc-section-title"><i class="bi bi-people"></i> ผู้เกี่ยวข้อง</div>
          ${listHtml(result.stakeholders)}
        </div>
        <div class="col-12">
          <div class="haos-ai-doc-section-title"><i class="bi bi-list-check"></i> สิ่งที่ต้องดำเนินการ</div>
          ${actionTable(result.actionItems)}
        </div>
        <div class="col-12">
          <div class="haos-ai-doc-section-title"><i class="bi bi-calendar-event"></i> กำหนดการที่สร้างตารางงานได้</div>
          ${scheduleDraftHtml(result.scheduleDrafts)}
        </div>
        <div class="col-12">
          <div class="haos-ai-doc-section-title"><i class="bi bi-chat-square-text"></i> ร่างข้อความพร้อมใช้</div>
          ${draftsHtml(result)}
        </div>
      </div>
      ${result.docUrl || result.pdfUrl ? `<div class="alert alert-success mt-3 mb-0"><b>ไฟล์ที่สร้างแล้ว:</b> ${result.docUrl ? `<a href="${esc(result.docUrl)}" target="_blank" class="btn btn-sm btn-outline-primary ms-2">เปิด Google Doc</a>` : ''} ${result.pdfUrl ? `<a href="${esc(result.pdfUrl)}" target="_blank" class="btn btn-sm btn-outline-danger ms-2">เปิด PDF</a>` : ''}</div>` : ''}
    `;
  }

  function resultText(result) {
    result = result || state.result;
    if (!result) return '';
    const lines = [];
    lines.push('สรุปเอกสารด้วย AI');
    lines.push('เรื่อง: ' + (result.title || '-'));
    lines.push('ประเภท: ' + (result.documentType || '-'));
    const ex = result.extracted || {};
    if (ex.documentNo) lines.push('เลขที่หนังสือ: ' + ex.documentNo);
    if (ex.documentDate) lines.push('วันที่หนังสือ: ' + ex.documentDate);
    if (ex.originAgency) lines.push('หน่วยงานต้นเรื่อง: ' + ex.originAgency);
    if (ex.meetingLink) lines.push('ลิงก์ประชุม: ' + ex.meetingLink);
    lines.push('');
    lines.push('สรุปสาระสำคัญ');
    lines.push(result.summary || '-');
    lines.push('');
    lines.push('ประเด็นสำคัญ');
    (result.keyPoints || []).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push('');
    lines.push('สิ่งที่ต้องดำเนินการ');
    (result.actionItems || []).forEach((item, index) => lines.push(`${index + 1}. ${item.task || '-'}${item.owner ? ' | ผู้รับผิดชอบ: ' + item.owner : ''}${item.deadline ? ' | กำหนด: ' + item.deadline : ''}`));
    if (result.drafts?.line) {
      lines.push('');
      lines.push('ร่างข้อความ LINE');
      lines.push(result.drafts.line);
    }
    return lines.join('\n');
  }

  async function copyResult() {
    const text = resultText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      window.Swal?.fire({ icon: 'success', title: 'คัดลอกผลสรุปแล้ว', timer: 1000, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('คัดลอกไม่ได้', `<pre class="text-start small">${esc(text)}</pre>`, 'warning');
    }
  }

  function createSchedule(index) {
    const result = state.result;
    if (!result) return;
    const draft = (result.scheduleDrafts || [])[index || 0] || {};
    close(false);
    if (typeof window.openScheduleFormModal === 'function') window.openScheduleFormModal('create');
    else if (typeof window.goToScheduleForm === 'function') window.goToScheduleForm();
    setTimeout(() => {
      const set = (id, value) => {
        const el = $(id);
        if (el) el.value = value || '';
      };
      const ex = result.extracted || {};
      set('eventName', draft.eventName || result.title || 'กำหนดการจากเอกสาร');
      set('eventDetails', draft.details || [result.summary, result.officerSummary, resultText(result)].filter(Boolean).join('\n\n'));
      set('startTime', normalizeThaiYearDateTime(draft.startTime || ''));
      set('endTime', normalizeThaiYearDateTime(draft.endTime || ''));
      set('eventLocation', draft.location || '');
      set('meetingLink', draft.meetingLink || ex.meetingLink || '');
      if ($('eventPriority')) $('eventPriority').value = draft.priority || 'ปกติ';
      if ($('eventTags') && draft.tags && draft.tags.length) {
        const tags = draft.tags.map(clean);
        qa('option', $('eventTags')).forEach(option => { option.selected = tags.includes(option.value); });
      }
      window.Swal?.fire({ icon: 'success', title: 'เติมข้อมูลลงฟอร์มตารางงานแล้ว', text: 'ตรวจสอบข้อมูลอีกครั้งก่อนกดบันทึก', timer: 1600, showConfirmButton: false });
    }, 450);
  }

  async function createDoc() {
    const result = state.result;
    if (!result || !result.summaryId) {
      return window.Swal?.fire('ยังบันทึกไม่ได้', 'กรุณาวิเคราะห์เอกสารให้สำเร็จก่อน', 'warning');
    }
    try {
      window.Swal?.fire({ title: 'กำลังสร้าง Google Doc/PDF...', allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });
      const res = await gas('createAIDocumentSummaryDocV788', [result.summaryId, getUser().phone || '']);
      if (!res || !res.success) throw new Error(res?.message || 'สร้างเอกสารไม่สำเร็จ');
      state.result.docUrl = res.docUrl || '';
      state.result.pdfUrl = res.pdfUrl || '';
      renderResult();
      window.Swal?.fire({
        icon: 'success',
        title: 'สร้างไฟล์แล้ว',
        html: `${res.docUrl ? `<a class="btn btn-outline-primary m-1" target="_blank" href="${esc(res.docUrl)}">เปิด Google Doc</a>` : ''}${res.pdfUrl ? `<a class="btn btn-outline-danger m-1" target="_blank" href="${esc(res.pdfUrl)}">เปิด PDF</a>` : ''}`
      });
      loadHistory();
    } catch (err) {
      window.Swal?.fire('ผิดพลาด', err?.message || String(err), 'error');
    }
  }

  async function loadHistory() {
    const box = $('haosAiDocHistoryV788');
    if (!box) return;
    box.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm"></span> กำลังโหลดประวัติ...</div>';
    try {
      const me = getUser();
      const q = $('haosAiDocHistorySearchV788')?.value || '';
      const res = await gas('getAIDocumentSummaryHistoryV788', [me.phone || '', me.role || 'User', me.department || '', q, 100]);
      if (!res || !res.success) throw new Error(res?.message || 'โหลดประวัติไม่สำเร็จ');
      state.history = (res.data || []).map(normalizeHistoryItem);
      renderHistory();
    } catch (err) {
      box.innerHTML = `<div class="text-danger small">${esc(err?.message || String(err))}</div>`;
    }
  }

  function readHistoryFilters() {
    state.filters.mode = $('haosAiDocFilterModeV788')?.value || '';
    state.filters.type = clean($('haosAiDocFilterTypeV788')?.value || '').toLowerCase();
    state.filters.from = $('haosAiDocFilterFromV788')?.value || '';
    state.filters.to = $('haosAiDocFilterToV788')?.value || '';
    return state.filters;
  }

  function dateOnly(value) {
    if (!value) return '';
    const normalized = normalizeThaiYearDateTime(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  function renderHistory() {
    const box = $('haosAiDocHistoryV788');
    if (!box) return;
    const filters = readHistoryFilters();
    const items = state.history.map((item, index) => ({ item, index })).filter(entry => {
      const item = entry.item;
      if (filters.mode && String(item.summaryMode || '') !== filters.mode) return false;
      if (filters.type && String(item.documentType || '').toLowerCase().indexOf(filters.type) === -1) return false;
      const created = dateOnly(item.createdAt);
      if (filters.from && created && created < filters.from) return false;
      if (filters.to && created && created > filters.to) return false;
      return true;
    });
    if (!state.history.length) {
      box.innerHTML = '<div class="haos-ai-doc-empty p-3">ยังไม่มีประวัติสรุปเอกสาร</div>';
      return;
    }
    if (!items.length) {
      box.innerHTML = '<div class="haos-ai-doc-empty p-3">ไม่พบประวัติตามตัวกรอง</div>';
      return;
    }
    box.innerHTML = items.map(({ item, index }) => `
      <div class="haos-ai-doc-history-item" onclick="window.HAOSAiDocSummary.openHistory(${index})">
        <div class="d-flex justify-content-between gap-2">
          <div class="min-w-0">
            <div class="fw-bold text-primary">${esc(item.title || '-')}</div>
            <div class="small text-muted">${esc(item.documentType || '-')} · ${esc(item.fileName || 'ข้อความ')} · ${esc(item.summaryModeLabel || modeLabel(item.summaryMode))}</div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger haos-ai-doc-history-delete" onclick="window.HAOSAiDocSummary.deleteHistory(${index}, event)" title="ลบประวัติ"><i class="bi bi-trash"></i></button>
        </div>
        <div class="small text-muted mt-1">${esc(String(item.summary || '').slice(0, 110))}${String(item.summary || '').length > 110 ? '...' : ''}</div>
      </div>
    `).join('');
  }

  function clearFilters() {
    ['haosAiDocFilterModeV788', 'haosAiDocFilterTypeV788', 'haosAiDocFilterFromV788', 'haosAiDocFilterToV788'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
    renderHistory();
  }

  async function deleteHistory(index, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const item = state.history[index];
    if (!item || !item.summaryId) return;
    const ok = await window.Swal?.fire({
      icon: 'warning',
      title: 'ลบประวัติสรุปเอกสารนี้?',
      text: item.title || item.summaryId,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc3545'
    });
    if (ok && !ok.isConfirmed) return;
    try {
      const me = getUser();
      const res = await gas('deleteAIDocumentSummaryV788', [item.summaryId, me.phone || '', me.role || 'User']);
      if (!res || !res.success) throw new Error(res?.message || 'ลบประวัติไม่สำเร็จ');
      if (state.result?.summaryId === item.summaryId) {
        state.result = null;
        const resultBox = $('haosAiDocResultV788');
        if (resultBox) {
          resultBox.className = 'haos-ai-doc-empty';
          resultBox.innerHTML = '<i class="bi bi-file-earmark-text fs-1 d-block mb-2"></i>เลือกไฟล์หรือวางข้อความ แล้วกด “เริ่มสรุปเอกสาร”';
        }
      }
      await loadHistory();
      window.Swal?.fire({ icon: 'success', title: 'ลบประวัติแล้ว', timer: 1000, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('ลบไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  async function sendToEOffice() {
    const result = state.result;
    if (!result || !result.summaryId) {
      return window.Swal?.fire('ยังไม่มีผลสรุป', 'กรุณาสรุปเอกสารให้สำเร็จก่อนส่งเข้า e-Office', 'warning');
    }
    try {
      window.Swal?.fire({ title: 'กำลังส่งเข้า e-Office...', allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });
      const me = getUser();
      const res = await gas('createEOfficeFromAISummaryV789', [result.summaryId, me.phone || '', me.role || 'User']);
      if (!res || !res.success) throw new Error(res?.message || 'ส่งเข้า e-Office ไม่สำเร็จ');
      window.Swal?.fire({ icon: 'success', title: 'ส่งเข้า e-Office แล้ว', text: res.data?.documentNo || res.data?.documentId || '', timer: 1300, showConfirmButton: false });
      if (window.HAOSEOffice?.open) {
        setTimeout(() => window.HAOSEOffice.open(), 350);
      }
    } catch (err) {
      window.Swal?.fire('ส่งเข้า e-Office ไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  async function sendToNote() {
    const result = state.result;
    if (!result || !result.summaryId) {
      return window.Swal?.fire('ยังไม่มีผลสรุป', 'กรุณาสรุปเอกสารให้สำเร็จก่อนส่งเข้า Note', 'warning');
    }
    try {
      window.Swal?.fire({ title: 'กำลังส่งเข้า Note...', allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });
      const me = getUser();
      const files = [result.docUrl, result.pdfUrl, result.fileUrl].filter(Boolean).join('\n');
      const tags = ['สรุปเอกสาร', result.documentType || '', result.summaryModeLabel || ''].filter(Boolean).join(', ');
      const payload = {
        title: 'สรุปเอกสาร: ' + (result.title || result.fileName || 'เอกสาร'),
        content: resultText(result),
        scope: 'personal',
        tags,
        fileUrl: files,
        linkedType: 'ai_document',
        linkedId: result.summaryId,
        pinned: false
      };
      const res = await gas('saveUserNoteV790', [payload, me.phone || '', me.role || 'User']);
      if (!res || !res.success) throw new Error(res?.message || 'ส่งเข้า Note ไม่สำเร็จ');
      window.Swal?.fire({
        icon: 'success',
        title: 'ส่งเข้า Note แล้ว',
        showCancelButton: true,
        confirmButtonText: 'เปิดสมุด Note',
        cancelButtonText: 'ปิด'
      }).then(choice => {
        if (choice?.isConfirmed && window.HAOSNotes?.open) window.HAOSNotes.open();
      });
    } catch (err) {
      window.Swal?.fire('ส่งเข้า Note ไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  function openHistory(index) {
    state.result = state.history[index] || null;
    renderResult();
  }

  function open() {
    ensureOverlay();
    $('haosAiDocOverlayV788')?.classList.add('show');
    $('haosAiDocOverlayV788')?.setAttribute('aria-hidden', 'false');
    renderModeButtons();
    loadHistory();
  }

  function close(clearResult) {
    const overlay = $('haosAiDocOverlayV788');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (clearResult === true) {
      state.result = null;
      const box = $('haosAiDocResultV788');
      if (box) {
        box.className = 'haos-ai-doc-empty';
        box.innerHTML = '<i class="bi bi-file-earmark-text fs-1 d-block mb-2"></i>เลือกไฟล์หรือวางข้อความ แล้วกด “เริ่มสรุปเอกสาร”';
      }
    }
  }

  function installCard() {
    const pane = $('itservices-pane');
    if (!pane || $('aiDocumentSummaryCardV788')) return;
    const rows = qa('.row.g-3.mb-4,.row.g-3', pane);
    const row = rows.find(el => el.querySelector('.it-service-card,.card.h-100')) || rows[0];
    if (!row) return;
    const card = document.createElement('div');
    card.id = 'aiDocumentSummaryCardV788';
    card.className = 'col-md-4';
    card.dataset.moduleId = 'ai_document_summary';
    card.innerHTML = `
      <div class="card h-100 it-service-card">
        <div class="card-body p-4 d-flex flex-column">
          <div class="mb-3 d-inline-flex align-items-center justify-content-center rounded-4" style="width:54px;height:54px;background:#eef2ff;color:#4f46e5;font-size:1.55rem"><i class="bi bi-stars"></i></div>
          <h6 class="fw-bold">สรุปเอกสารด้วย AI</h6>
          <p class="text-muted small flex-grow-1">แนบ PDF/รูปภาพ หรือวางข้อความ ให้ AI สรุปประเด็นสำคัญ สิ่งที่ต้องดำเนินการ และสร้างตารางงานต่อได้ทันที</p>
          <button type="button" class="btn btn-primary btn-sm fw-bold" onclick="window.HAOSAiDocSummary.open()"><i class="bi bi-file-earmark-text"></i> เปิดเครื่องมือ</button>
        </div>
      </div>
    `;
    row.appendChild(card);
    try {
      if (typeof window.applyITHubLayoutV759 === 'function') window.applyITHubLayoutV759();
    } catch (err) {}
  }

  function boot() {
    ensureOverlay();
    installCard();
  }

  window.HAOSAiDocSummary = {
    open,
    close,
    analyze,
    copy: copyResult,
    createSchedule,
    createDoc,
    loadHistory,
    renderHistory,
    clearFilters,
    deleteHistory,
    sendToEOffice,
    sendToNote,
    openHistory,
    version: PATCH
  };
  window.openAIDocumentSummaryV788 = open;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  const observer = new MutationObserver(() => {
    clearTimeout(window.__haosAiDocInstallTimerV788);
    window.__haosAiDocInstallTimerV788 = setTimeout(installCard, 150);
  });
  try { observer.observe(document.body, { childList: true, subtree: true }); } catch (err) {}
  setInterval(installCard, 1800);
  console.info('HAOS ' + PATCH + ' loaded');
})();
