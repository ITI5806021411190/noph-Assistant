(function () {
  'use strict';

  const PATCH = 'v70.89-e-office';
  if (window.__HAOS_V789_E_OFFICE__) return;
  window.__HAOS_V789_E_OFFICE__ = true;

  const state = {
    docs: [],
    editing: null,
    busy: false
  };

  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

  function getUser() {
    try {
      if (typeof window.currentUser === 'function') return window.currentUser() || {};
    } catch (err) {}
    return window.user || {};
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

  function normalizeDate(value) {
    const raw = clean(value);
    if (!raw) return '';
    const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!match) {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? raw : d.toISOString().slice(0, 10);
    }
    let year = Number(match[1]);
    if (year >= 2400) year -= 543;
    return `${year}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  }

  function displayDate(value) {
    const date = normalizeDate(value);
    if (!date) return '-';
    try {
      if (window.HAOSDateDisplay?.date) return window.HAOSDateDisplay.date(date);
    } catch (err) {}
    return date;
  }

  function statusBadge(status) {
    const raw = clean(status) || 'รอตรวจสอบ';
    const tone = raw.includes('เสร็จ') || raw.includes('อนุมัติ') ? 'success'
      : raw.includes('ยกเลิก') ? 'danger'
      : raw.includes('เสนอ') || raw.includes('เซ็น') ? 'warning'
      : 'info';
    return `<span class="haos-eoffice-badge ${tone}">${esc(raw)}</span>`;
  }

  function priorityBadge(priority) {
    const raw = clean(priority) || 'ปกติ';
    const tone = raw.includes('ด่วนมาก') ? 'danger' : raw.includes('ด่วน') ? 'warning' : 'success';
    return `<span class="haos-eoffice-badge ${tone}"><i class="bi bi-flag"></i>${esc(raw)}</span>`;
  }

  function readFilters() {
    return {
      q: $('haosEOfficeSearchV789')?.value || '',
      status: $('haosEOfficeStatusFilterV789')?.value || '',
      type: $('haosEOfficeTypeFilterV789')?.value || '',
      direction: $('haosEOfficeDirectionFilterV789')?.value || '',
      priority: $('haosEOfficePriorityFilterV789')?.value || ''
    };
  }

  function ensureOverlay() {
    if ($('haosEOfficeOverlayV789')) return;
    const pane = $('itservices-pane');
    const host = pane || document.body;
    host.insertAdjacentHTML('beforeend', `
      <div id="haosEOfficeOverlayV789" class="haos-eoffice-overlay" aria-hidden="true">
        <div class="haos-eoffice-shell">
          <div class="haos-eoffice-header">
            <div>
              <div class="haos-eoffice-kicker"><i class="bi bi-journal-check"></i> e-Office</div>
              <h4>สารบัญเอกสาร</h4>
              <p>รับเรื่อง ตรวจสอบ เสนอเซ็น ติดตามงาน และเชื่อมผลสรุปเอกสารด้วย AI ไว้ในที่เดียว</p>
            </div>
            <button type="button" class="btn btn-light fw-bold" onclick="window.HAOSEOffice.close()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="haos-eoffice-body">
            <div class="haos-eoffice-toolbar">
              <button type="button" class="btn btn-success fw-bold" onclick="window.HAOSEOffice.openEditor()"><i class="bi bi-plus-circle"></i> เพิ่มเอกสาร</button>
              <button type="button" class="btn btn-outline-primary fw-bold" onclick="window.HAOSEOffice.load()"><i class="bi bi-arrow-clockwise"></i> โหลดใหม่</button>
              <button type="button" class="btn btn-outline-secondary fw-bold" onclick="window.HAOSEOffice.toggleFilters()"><i class="bi bi-funnel"></i> ตัวกรอง</button>
              <span id="haosEOfficeCountV789" class="haos-eoffice-count">0 รายการ</span>
            </div>
            <div class="haos-eoffice-guide">
              <div><b><i class="bi bi-1-circle"></i> สรุปจาก AI</b><span>กดส่งเข้า e-Office จากโมดูลสรุปเอกสารได้ทันที</span></div>
              <div><b><i class="bi bi-2-circle"></i> ติดตามสถานะ</b><span>รอตรวจสอบ เสนอเซ็น ดำเนินการ เสร็จสิ้น หรือยกเลิก</span></div>
              <div><b><i class="bi bi-3-circle"></i> ค้นย้อนหลัง</b><span>ค้นจากเลขหนังสือ เรื่อง หน่วยงาน ผู้รับผิดชอบ และสรุป</span></div>
            </div>
            <div id="haosEOfficeFiltersV789" class="haos-eoffice-filters">
              <input id="haosEOfficeSearchV789" class="form-control" placeholder="ค้นหาเลขหนังสือ เรื่อง หน่วยงาน..." onkeydown="if(event.key==='Enter')window.HAOSEOffice.load()">
              <select id="haosEOfficeStatusFilterV789" class="form-select"><option value="">ทุกสถานะ</option><option>รอตรวจสอบ</option><option>เสนอเซ็น</option><option>ดำเนินการ</option><option>เสร็จสิ้น</option><option>ยกเลิก</option></select>
              <select id="haosEOfficeDirectionFilterV789" class="form-select"><option value="">ทุกทิศทาง</option><option>รับเข้า</option><option>ส่งออก</option><option>ภายใน</option></select>
              <select id="haosEOfficePriorityFilterV789" class="form-select"><option value="">ทุกระดับ</option><option>ปกติ</option><option>ด่วน</option><option>ด่วนมาก</option></select>
              <input id="haosEOfficeTypeFilterV789" class="form-control" placeholder="ประเภทเอกสาร">
              <button type="button" class="btn btn-primary fw-bold" onclick="window.HAOSEOffice.load()"><i class="bi bi-search"></i> ค้นหา</button>
              <button type="button" class="btn btn-outline-secondary fw-bold" onclick="window.HAOSEOffice.clearFilters()"><i class="bi bi-x-circle"></i></button>
            </div>
            <div id="haosEOfficeListV789" class="haos-eoffice-list"></div>
          </div>
        </div>
        <div id="haosEOfficeEditorV789" class="haos-eoffice-editor" aria-hidden="true">
          <div class="haos-eoffice-editor-panel">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h5 id="haosEOfficeEditorTitleV789" class="fw-bold mb-1">เพิ่มเอกสาร</h5>
                <div class="small text-muted">ใช้สำหรับลงรับ/ลงทะเบียนเอกสาร ติดตามการเสนอเซ็น และผูกกับผลสรุป AI</div>
              </div>
              <button type="button" class="btn btn-outline-secondary" onclick="window.HAOSEOffice.closeEditor()"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="row g-3">
              <div class="col-md-8"><label class="form-label fw-bold">เรื่อง</label><input id="haosEOfficeTitleInputV789" class="form-control"></div>
              <div class="col-md-4"><label class="form-label fw-bold">เลขที่หนังสือ</label><input id="haosEOfficeNoInputV789" class="form-control"></div>
              <div class="col-md-4"><label class="form-label fw-bold">วันที่หนังสือ</label><input id="haosEOfficeDocDateInputV789" type="date" class="form-control"></div>
              <div class="col-md-4"><label class="form-label fw-bold">หน่วยงานต้นเรื่อง</label><input id="haosEOfficeOriginInputV789" class="form-control"></div>
              <div class="col-md-4"><label class="form-label fw-bold">ประเภทเอกสาร</label><input id="haosEOfficeTypeInputV789" class="form-control" placeholder="หนังสือเวียน / ประชุม / อบรม"></div>
              <div class="col-md-3"><label class="form-label fw-bold">ทิศทาง</label><select id="haosEOfficeDirectionInputV789" class="form-select"><option>รับเข้า</option><option>ส่งออก</option><option>ภายใน</option></select></div>
              <div class="col-md-3"><label class="form-label fw-bold">สถานะ</label><select id="haosEOfficeStatusInputV789" class="form-select"><option>รอตรวจสอบ</option><option>เสนอเซ็น</option><option>ดำเนินการ</option><option>เสร็จสิ้น</option><option>ยกเลิก</option></select></div>
              <div class="col-md-3"><label class="form-label fw-bold">ระดับ</label><select id="haosEOfficePriorityInputV789" class="form-select"><option>ปกติ</option><option>ด่วน</option><option>ด่วนมาก</option></select></div>
              <div class="col-md-3"><label class="form-label fw-bold">กำหนดติดตาม</label><input id="haosEOfficeDueInputV789" type="date" class="form-control"></div>
              <div class="col-md-6"><label class="form-label fw-bold">ผู้รับผิดชอบ</label><input id="haosEOfficeAssigneeInputV789" class="form-control"></div>
              <div class="col-md-6"><label class="form-label fw-bold">ลิงก์ไฟล์ / เอกสาร</label><input id="haosEOfficeFileInputV789" class="form-control"></div>
              <div class="col-md-6"><label class="form-label fw-bold">ลิงก์ประชุม</label><input id="haosEOfficeMeetingInputV789" class="form-control"></div>
              <div class="col-md-6"><label class="form-label fw-bold">หมายเหตุ</label><input id="haosEOfficeNotesInputV789" class="form-control"></div>
              <div class="col-12"><label class="form-label fw-bold">สรุปสาระสำคัญ</label><textarea id="haosEOfficeSummaryInputV789" class="form-control" rows="4"></textarea></div>
            </div>
            <div class="d-flex justify-content-end gap-2 mt-4">
              <button type="button" class="btn btn-secondary fw-bold" onclick="window.HAOSEOffice.closeEditor()">ยกเลิก</button>
              <button type="button" class="btn btn-success fw-bold" onclick="window.HAOSEOffice.save()"><i class="bi bi-save"></i> บันทึก</button>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  function renderList() {
    const box = $('haosEOfficeListV789');
    const count = $('haosEOfficeCountV789');
    if (count) count.textContent = `${state.docs.length} รายการ`;
    if (!box) return;
    if (!state.docs.length) {
      box.innerHTML = '<div class="haos-eoffice-empty"><i class="bi bi-inbox"></i><b>ยังไม่มีรายการสารบัญเอกสาร</b><span>เริ่มจากเพิ่มเอกสาร หรือกด “ส่งเข้า e-Office” จากผลสรุปเอกสารด้วย AI</span></div>';
      return;
    }
    box.innerHTML = state.docs.map((item, index) => `
      <article class="haos-eoffice-item">
        <div class="haos-eoffice-main">
          <div class="haos-eoffice-docno">${esc(item.documentNo || item.documentId || '-')}</div>
          <h6>${esc(item.title || '-')}</h6>
          <div class="haos-eoffice-meta">
            <span><i class="bi bi-calendar3"></i>${esc(displayDate(item.documentDate))}</span>
            <span><i class="bi bi-building"></i>${esc(item.originAgency || '-')}</span>
            <span><i class="bi bi-person"></i>${esc(item.assignee || item.ownerName || '-')}</span>
          </div>
          <p>${esc(String(item.summaryText || item.notes || '').slice(0, 180))}${String(item.summaryText || item.notes || '').length > 180 ? '...' : ''}</p>
        </div>
        <div class="haos-eoffice-side">
          <div class="d-flex gap-1 flex-wrap justify-content-end">${statusBadge(item.status)}${priorityBadge(item.priority)}<span class="haos-eoffice-badge neutral">${esc(item.direction || '-')}</span></div>
          <div class="small text-muted mt-2">กำหนดติดตาม: ${esc(displayDate(item.dueDate))}</div>
          <div class="haos-eoffice-actions">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.HAOSEOffice.view(${index})"><i class="bi bi-eye"></i></button>
            <button type="button" class="btn btn-sm btn-outline-success" onclick="window.HAOSEOffice.openEditor(${index})"><i class="bi bi-pencil"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.HAOSEOffice.remove(${index})"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </article>
    `).join('');
  }

  async function load() {
    ensureOverlay();
    const box = $('haosEOfficeListV789');
    if (box) box.innerHTML = '<div class="haos-eoffice-empty"><span class="spinner-border spinner-border-sm"></span><b>กำลังโหลดสารบัญเอกสาร...</b></div>';
    try {
      const me = getUser();
      const res = await gas('getEOfficeDocumentsV789', [me.phone || '', me.role || 'User', me.department || me.departmentName || '', readFilters()]);
      if (!res || !res.success) throw new Error(res?.message || 'โหลดสารบัญเอกสารไม่สำเร็จ');
      state.docs = res.data || [];
      renderList();
    } catch (err) {
      if (box) box.innerHTML = `<div class="text-danger p-3">${esc(err?.message || String(err))}</div>`;
    }
  }

  function clearFilters() {
    ['haosEOfficeSearchV789', 'haosEOfficeStatusFilterV789', 'haosEOfficeDirectionFilterV789', 'haosEOfficePriorityFilterV789', 'haosEOfficeTypeFilterV789'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
    load();
  }

  function toggleFilters() {
    $('haosEOfficeFiltersV789')?.classList.toggle('show');
  }

  function setInput(id, value) {
    const el = $(id);
    if (el) el.value = value || '';
  }

  function openEditor(index) {
    ensureOverlay();
    const item = typeof index === 'number' ? state.docs[index] : null;
    state.editing = item || null;
    $('haosEOfficeEditorTitleV789').textContent = item ? 'แก้ไขเอกสาร' : 'เพิ่มเอกสาร';
    setInput('haosEOfficeTitleInputV789', item?.title || '');
    setInput('haosEOfficeNoInputV789', item?.documentNo || '');
    setInput('haosEOfficeDocDateInputV789', normalizeDate(item?.documentDate || ''));
    setInput('haosEOfficeOriginInputV789', item?.originAgency || '');
    setInput('haosEOfficeTypeInputV789', item?.documentType || '');
    setInput('haosEOfficeDirectionInputV789', item?.direction || 'รับเข้า');
    setInput('haosEOfficeStatusInputV789', item?.status || 'รอตรวจสอบ');
    setInput('haosEOfficePriorityInputV789', item?.priority || 'ปกติ');
    setInput('haosEOfficeDueInputV789', normalizeDate(item?.dueDate || ''));
    setInput('haosEOfficeAssigneeInputV789', item?.assignee || '');
    setInput('haosEOfficeFileInputV789', item?.fileUrl || '');
    setInput('haosEOfficeMeetingInputV789', item?.meetingLink || '');
    setInput('haosEOfficeNotesInputV789', item?.notes || '');
    setInput('haosEOfficeSummaryInputV789', item?.summaryText || '');
    $('haosEOfficeEditorV789')?.classList.add('show');
    $('haosEOfficeEditorV789')?.setAttribute('aria-hidden', 'false');
  }

  function closeEditor() {
    $('haosEOfficeEditorV789')?.classList.remove('show');
    $('haosEOfficeEditorV789')?.setAttribute('aria-hidden', 'true');
    state.editing = null;
  }

  async function save() {
    if (state.busy) return;
    const title = clean($('haosEOfficeTitleInputV789')?.value || '');
    if (!title) return window.Swal?.fire('กรุณาระบุเรื่องเอกสาร', '', 'warning');
    const old = state.editing || {};
    const me = getUser();
    const payload = {
      documentId: old.documentId || '',
      title,
      documentNo: $('haosEOfficeNoInputV789')?.value || '',
      documentDate: $('haosEOfficeDocDateInputV789')?.value || '',
      originAgency: $('haosEOfficeOriginInputV789')?.value || '',
      documentType: $('haosEOfficeTypeInputV789')?.value || '',
      direction: $('haosEOfficeDirectionInputV789')?.value || '',
      status: $('haosEOfficeStatusInputV789')?.value || '',
      priority: $('haosEOfficePriorityInputV789')?.value || '',
      dueDate: $('haosEOfficeDueInputV789')?.value || '',
      assignee: $('haosEOfficeAssigneeInputV789')?.value || '',
      fileUrl: $('haosEOfficeFileInputV789')?.value || '',
      meetingLink: $('haosEOfficeMeetingInputV789')?.value || '',
      notes: $('haosEOfficeNotesInputV789')?.value || '',
      summaryText: $('haosEOfficeSummaryInputV789')?.value || '',
      summaryId: old.summaryId || ''
    };
    try {
      state.busy = true;
      const res = await gas('saveEOfficeDocumentV789', [payload, me.phone || '', me.role || 'User']);
      if (!res || !res.success) throw new Error(res?.message || 'บันทึกไม่สำเร็จ');
      closeEditor();
      await load();
      window.Swal?.fire({ icon: 'success', title: 'บันทึกสารบัญเอกสารแล้ว', timer: 1100, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('บันทึกไม่สำเร็จ', err?.message || String(err), 'error');
    } finally {
      state.busy = false;
    }
  }

  function view(index) {
    const item = state.docs[index];
    if (!item) return;
    window.Swal?.fire({
      title: esc(item.title || '-'),
      width: 760,
      html: `
        <div class="text-start">
          <div class="mb-2">${statusBadge(item.status)} ${priorityBadge(item.priority)} <span class="haos-eoffice-badge neutral">${esc(item.direction || '-')}</span></div>
          <p><b>เลขที่หนังสือ:</b> ${esc(item.documentNo || '-')}</p>
          <p><b>วันที่หนังสือ:</b> ${esc(displayDate(item.documentDate))}</p>
          <p><b>หน่วยงานต้นเรื่อง:</b> ${esc(item.originAgency || '-')}</p>
          <p><b>ผู้รับผิดชอบ:</b> ${esc(item.assignee || item.ownerName || '-')}</p>
          <p><b>กำหนดติดตาม:</b> ${esc(displayDate(item.dueDate))}</p>
          <hr>
          <p style="white-space:pre-wrap">${esc(item.summaryText || item.notes || '-')}</p>
          <div class="d-flex gap-2 flex-wrap">
            ${item.fileUrl ? `<a class="btn btn-sm btn-outline-primary" href="${esc(item.fileUrl)}" target="_blank"><i class="bi bi-box-arrow-up-right"></i> เปิดไฟล์</a>` : ''}
            ${item.meetingLink ? `<a class="btn btn-sm btn-outline-success" href="${esc(item.meetingLink)}" target="_blank"><i class="bi bi-camera-video"></i> ลิงก์ประชุม</a>` : ''}
          </div>
        </div>`
    });
  }

  async function remove(index) {
    const item = state.docs[index];
    if (!item) return;
    const ok = await window.Swal?.fire({
      icon: 'warning',
      title: 'ลบรายการสารบัญเอกสารนี้?',
      text: item.title || item.documentNo || item.documentId,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc3545'
    });
    if (ok && !ok.isConfirmed) return;
    try {
      const me = getUser();
      const res = await gas('deleteEOfficeDocumentV789', [item.documentId, me.phone || '', me.role || 'User']);
      if (!res || !res.success) throw new Error(res?.message || 'ลบไม่สำเร็จ');
      await load();
      window.Swal?.fire({ icon: 'success', title: 'ลบรายการแล้ว', timer: 1000, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('ลบไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  function open() {
    ensureOverlay();
    $('haosEOfficeOverlayV789')?.classList.add('show');
    $('haosEOfficeOverlayV789')?.setAttribute('aria-hidden', 'false');
    load();
    setTimeout(() => {
      try {
        $('haosEOfficeOverlayV789')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {}
    }, 80);
  }

  function close() {
    $('haosEOfficeOverlayV789')?.classList.remove('show');
    $('haosEOfficeOverlayV789')?.setAttribute('aria-hidden', 'true');
  }

  function installCard() {
    const pane = $('itservices-pane');
    if (!pane || $('eOfficeCardV789')) return;
    const rows = qa('.row.g-3.mb-4,.row.g-3', pane);
    const row = rows.find(el => el.querySelector('.it-service-card,.card.h-100')) || rows[0];
    if (!row) return;
    const card = document.createElement('div');
    card.id = 'eOfficeCardV789';
    card.className = 'col-md-4';
    card.dataset.moduleId = 'e_office';
    card.innerHTML = `
      <div class="card h-100 it-service-card">
        <div class="card-body p-4 d-flex flex-column">
          <div class="mb-3 d-inline-flex align-items-center justify-content-center rounded-4" style="width:54px;height:54px;background:#ecfdf5;color:#047857;font-size:1.55rem"><i class="bi bi-journal-check"></i></div>
          <h6 class="fw-bold">e-Office / สารบัญเอกสาร</h6>
          <p class="text-muted small flex-grow-1">ลงรับเอกสาร ติดตามเสนอเซ็น กำหนดผู้รับผิดชอบ และเชื่อมผลสรุปเอกสารด้วย AI เพื่อค้นย้อนหลังได้ง่าย</p>
          <button type="button" class="btn btn-success btn-sm fw-bold" onclick="window.HAOSEOffice.open()"><i class="bi bi-folder2-open"></i> เปิด e-Office</button>
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

  window.HAOSEOffice = {
    open,
    close,
    load,
    clearFilters,
    toggleFilters,
    openEditor,
    closeEditor,
    save,
    view,
    remove,
    version: PATCH
  };
  window.openEOfficeV789 = open;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  const observer = new MutationObserver(() => {
    clearTimeout(window.__haosEOfficeInstallTimerV789);
    window.__haosEOfficeInstallTimerV789 = setTimeout(installCard, 150);
  });
  try { observer.observe(document.body, { childList: true, subtree: true }); } catch (err) {}
  setInterval(installCard, 2000);
  console.info('HAOS ' + PATCH + ' loaded');
})();
