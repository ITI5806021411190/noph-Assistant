(function () {
  'use strict';

  const PATCH = 'v70.93-user-notes';
  if (window.__HAOS_V790_USER_NOTES__) return;
  window.__HAOS_V790_USER_NOTES__ = true;

  const state = {
    notes: [],
    editing: null,
    busy: false,
    tagOptions: [],
    loadingTags: null,
    selected: new Set()
  };

  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = value => String(value ?? '').trim();
  const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const splitTokens = value => String(value || '').split(/\n|,/).map(v => compact(v)).filter(Boolean);
  const unique = list => Array.from(new Set((list || []).map(compact).filter(Boolean)));

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

  function displayDateTime(value) {
    if (!value) return '-';
    try {
      if (window.HAOSDateDisplay?.dateTime) return window.HAOSDateDisplay.dateTime(value);
      if (window.HAOSDateDisplay?.date) return window.HAOSDateDisplay.date(value);
    } catch (err) {}
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('th-TH');
  }

  function mergeUrls() {
    return unique(Array.from(arguments).flatMap(splitTokens)).join('\n');
  }

  function renderFileButtons(value) {
    const urls = splitTokens(value);
    if (!urls.length) return '';
    return `<div class="haos-notes-file-links">${urls.map((url, index) => `<a class="btn btn-sm btn-outline-primary" href="${esc(url)}" target="_blank" rel="noopener"><i class="bi bi-paperclip"></i> ไฟล์แนบ ${index + 1}</a>`).join('')}</div>`;
  }

  function readFileBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(reader.error || new Error('อ่านไฟล์แนบไม่สำเร็จ'));
      reader.readAsDataURL(file);
    });
  }

  async function uploadFile(file) {
    const b64 = await readFileBase64(file);
    const res = await gas('uploadFileToDrive', [b64, file.name, file.type || 'application/octet-stream']);
    if (!res || !res.success) throw new Error(res?.message || `อัปโหลด ${file.name} ไม่สำเร็จ`);
    return res.url || '';
  }

  async function uploadSelectedFiles() {
    const inputs = [
      $('haosNotesFileUploadV790'),
      ...Array.from(document.querySelectorAll('.haos-notes-file-upload-extra-v794'))
    ].filter(Boolean);
    const files = inputs.flatMap(input => Array.from(input.files || []));
    if (!files.length) return [];
    const urls = [];
    for (const file of files) {
      urls.push(await uploadFile(file));
    }
    return urls.filter(Boolean);
  }

  function extraLinkValues() {
    return Array.from(document.querySelectorAll('.haos-notes-link-extra-v794'))
      .map(input => clean(input.value || ''))
      .filter(Boolean);
  }

  function addFileRow() {
    const wrap = $('haosNotesExtraFileRowsV794');
    if (!wrap) return;
    const row = document.createElement('div');
    row.className = 'haos-notes-extra-row';
    row.innerHTML = `
      <input type="file" class="form-control haos-notes-file-upload-extra-v794" multiple>
      <button type="button" class="btn btn-outline-danger" title="ลบช่องนี้" aria-label="ลบช่องนี้"><i class="bi bi-trash"></i></button>`;
    row.querySelector('button')?.addEventListener('click', () => row.remove());
    wrap.appendChild(row);
  }

  function addLinkRow(value) {
    const wrap = $('haosNotesExtraLinkRowsV794');
    if (!wrap) return;
    const row = document.createElement('div');
    row.className = 'haos-notes-extra-row';
    row.innerHTML = `
      <input class="form-control haos-notes-link-extra-v794" placeholder="วาง URL เพิ่มเติม" value="${esc(value || '')}">
      <button type="button" class="btn btn-outline-danger" title="ลบช่องนี้" aria-label="ลบช่องนี้"><i class="bi bi-trash"></i></button>`;
    row.querySelector('button')?.addEventListener('click', () => row.remove());
    wrap.appendChild(row);
  }

  function resetExtraRows() {
    const fileWrap = $('haosNotesExtraFileRowsV794');
    const linkWrap = $('haosNotesExtraLinkRowsV794');
    if (fileWrap) fileWrap.innerHTML = '';
    if (linkWrap) linkWrap.innerHTML = '';
  }

  function noteScopeLabel(scope) {
    return String(scope || 'personal').toLowerCase() === 'department' ? 'กลุ่มงาน' : 'ส่วนตัว';
  }

  function noteScopeIcon(scope) {
    return String(scope || 'personal').toLowerCase() === 'department' ? 'bi-people' : 'bi-person';
  }

  function noteTone(scope) {
    return String(scope || 'personal').toLowerCase() === 'department' ? 'dept' : 'personal';
  }

  function readFilters() {
    return {
      q: $('haosNotesSearchV790')?.value || '',
      scope: $('haosNotesScopeFilterV790')?.value || '',
      tag: $('haosNotesTagFilterV790')?.value || '',
      pinnedOnly: !!$('haosNotesPinnedFilterV790')?.checked,
      includeArchived: !!$('haosNotesArchiveFilterV790')?.checked
    };
  }

  async function loadTagOptions() {
    if (state.tagOptions.length) {
      populateTagOptions();
      return state.tagOptions;
    }
    if (state.loadingTags) return state.loadingTags;
    state.loadingTags = (async () => {
      try {
        let options = [];
        try {
          const res = await gas('getWorkTags', [false]);
          if (res && res.success) options = res.data || [];
        } catch (err) {}
        if (!options.length && Array.isArray(window.workTagOptionsGlobal)) options = window.workTagOptionsGlobal;
        state.tagOptions = unique(options.map(item => item && (item.name || item.tagName || item.title || item)).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'th'));
        populateTagOptions();
      } finally {
        state.loadingTags = null;
      }
      return state.tagOptions;
    })();
    return state.loadingTags;
  }

  function populateTagOptions() {
    const sel = $('haosNotesTagsSelectV790');
    if (!sel) return;
    const current = selectedTags();
    sel.innerHTML = state.tagOptions.map(tag => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('');
    Array.from(sel.options).forEach(opt => {
      opt.selected = current.includes(opt.value);
    });
  }

  function selectedTags() {
    const sel = $('haosNotesTagsSelectV790');
    const selected = sel ? Array.from(sel.selectedOptions).map(opt => opt.value) : [];
    const custom = splitTokens($('haosNotesTagsInputV790')?.value || '');
    return unique(selected.concat(custom));
  }

  function setTagsValue(value) {
    const tags = splitTokens(value);
    const sel = $('haosNotesTagsSelectV790');
    const known = new Set(state.tagOptions);
    const custom = [];
    if (sel) {
      Array.from(sel.options).forEach(opt => { opt.selected = false; });
      tags.forEach(tag => {
        if (known.has(tag)) {
          const option = Array.from(sel.options).find(opt => opt.value === tag);
          if (option) option.selected = true;
        } else {
          custom.push(tag);
        }
      });
    } else {
      custom.push(...tags);
    }
    setInput('haosNotesTagsInputV790', unique(custom).join(', '));
  }

  function noteKey(item, index) {
    if (item?.noteId) return String(item.noteId);
    return index === undefined || index === null ? '' : String(index);
  }

  function ensureEditorInBody() {
    const editor = $('haosNotesEditorV790');
    if (editor && editor.parentElement !== document.body) document.body.appendChild(editor);
  }

  function ensureModule() {
    if ($('haosNotesModuleV790')) {
      ensureEditorInBody();
      return;
    }
    const pane = $('itservices-pane') || document.body;
    pane.insertAdjacentHTML('beforeend', `
      <section id="haosNotesModuleV790" class="haos-notes-module" aria-hidden="true">
        <div class="haos-notes-shell">
          <div class="haos-notes-header">
            <div>
              <div class="haos-notes-kicker"><i class="bi bi-journal-richtext"></i> สมุด Note</div>
              <h4>บันทึกสั้น ๆ ที่หยิบใช้ต่อได้ทันที</h4>
              <p>จดส่วนตัวหรือแชร์ในกลุ่มงาน ปักหมุด ค้นหา ติดแท็ก และแนบลิงก์อ้างอิงงานสำคัญไว้ในที่เดียว</p>
            </div>
            <div class="haos-notes-header-actions">
              <button type="button" class="btn btn-light fw-bold" onclick="window.HAOSNotes.quickNote()"><i class="bi bi-pencil-square"></i> บันทึก Note</button>
              <button type="button" class="btn btn-outline-light fw-bold" onclick="window.HAOSNotes.close()"><i class="bi bi-x-lg"></i></button>
            </div>
          </div>
          <div class="haos-notes-body">
            <div class="haos-notes-toolbar">
              <button type="button" class="btn btn-success fw-bold" onclick="window.HAOSNotes.openEditor()"><i class="bi bi-plus-circle"></i> เพิ่ม Note</button>
              <button type="button" class="btn btn-outline-primary fw-bold" onclick="window.HAOSNotes.load()"><i class="bi bi-arrow-clockwise"></i> โหลดใหม่</button>
              <button type="button" class="btn btn-outline-secondary fw-bold" onclick="window.HAOSNotes.toggleFilters()"><i class="bi bi-funnel"></i> ตัวกรอง</button>
              <span id="haosNotesCountV790" class="haos-notes-count">0 รายการ</span>
              <span id="haosNotesBulkCountV790" class="haos-notes-count haos-notes-bulk-count d-none">เลือก 0 รายการ</span>
              <button id="haosNotesBulkDoneV790" type="button" class="btn btn-outline-success fw-bold d-none" onclick="window.HAOSNotes.bulkDone()"><i class="bi bi-check2-circle"></i> เสร็จสิ้นแล้ว</button>
              <button id="haosNotesBulkDeleteV790" type="button" class="btn btn-outline-danger fw-bold d-none" onclick="window.HAOSNotes.bulkDelete()"><i class="bi bi-trash"></i> ลบที่เลือก</button>
            </div>
            <div class="haos-notes-guide">
              <div><b><i class="bi bi-pin-angle"></i> ปักหมุดเรื่องสำคัญ</b><span>ทำให้ Note ที่ใช้บ่อยขึ้นก่อนรายการอื่นเสมอ</span></div>
              <div><b><i class="bi bi-tags"></i> ติดแท็กค้นเร็ว</b><span>ใช้คำอย่าง ประชุม, โทรกลับ, เอกสาร, ด่วน เพื่อค้นย้อนหลังง่ายขึ้น</span></div>
              <div><b><i class="bi bi-people"></i> แชร์ในกลุ่มงาน</b><span>เลือกขอบเขตเป็นกลุ่มงานเมื่ออยากให้ทีมเห็นข้อมูลเดียวกัน</span></div>
            </div>
            <div id="haosNotesFiltersV790" class="haos-notes-filters">
              <input id="haosNotesSearchV790" class="form-control" placeholder="ค้นหาหัวข้อ เนื้อหา แท็ก หรือผู้บันทึก..." onkeydown="if(event.key==='Enter')window.HAOSNotes.load()">
              <select id="haosNotesScopeFilterV790" class="form-select">
                <option value="">ทุกขอบเขต</option>
                <option value="personal">ส่วนตัว</option>
                <option value="department">กลุ่มงาน</option>
              </select>
              <input id="haosNotesTagFilterV790" class="form-control" placeholder="กรองด้วยแท็ก">
              <label class="haos-notes-check"><input id="haosNotesPinnedFilterV790" type="checkbox"> ปักหมุด</label>
              <label class="haos-notes-check"><input id="haosNotesArchiveFilterV790" type="checkbox"> รวมที่เก็บแล้ว</label>
              <button type="button" class="btn btn-primary fw-bold" onclick="window.HAOSNotes.load()"><i class="bi bi-search"></i> ค้นหา</button>
              <button type="button" class="btn btn-outline-secondary fw-bold" onclick="window.HAOSNotes.clearFilters()"><i class="bi bi-x-circle"></i></button>
            </div>
            <div id="haosNotesListV790" class="haos-notes-list"></div>
          </div>
        </div>
        <div id="haosNotesEditorV790" class="haos-notes-editor" aria-hidden="true">
          <div class="haos-notes-editor-panel">
            <div class="haos-notes-editor-head">
              <div>
                <h5 id="haosNotesEditorTitleV790">บันทึก Note</h5>
                <p>จดสิ่งที่ต้องจำ ลิงก์ที่เกี่ยวข้อง หรือข้อความที่ต้องนำไปใช้ต่อ</p>
              </div>
              <button type="button" class="btn btn-outline-secondary" onclick="window.HAOSNotes.closeEditor()"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label fw-bold">หัวข้อ</label>
                <input id="haosNotesTitleInputV790" class="form-control" placeholder="เช่น โทรกลับเรื่อง Zoom / ข้อสรุปประชุมเช้า">
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">ขอบเขต</label>
                <select id="haosNotesScopeInputV790" class="form-select">
                  <option value="personal">ส่วนตัว</option>
                  <option value="department">กลุ่มงาน</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">ประเภทงาน / Tags</label>
                <select id="haosNotesTagsSelectV790" class="form-select haos-notes-tag-select" multiple size="6"></select>
                <small class="haos-notes-field-help"><i class="bi bi-check2-square"></i> เลือกได้หลายรายการ ไม่ต้องกด Ctrl</small>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">แท็กเพิ่มเติม</label>
                <input id="haosNotesTagsInputV790" class="form-control" placeholder="พิมพ์เพิ่มและคั่นด้วย , เช่น โทรกลับ, ติดตาม">
                <small class="haos-notes-field-help">ใช้เมื่อต้องการแท็กที่ยังไม่มีในประเภทงานของระบบ</small>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">ไฟล์แนบประกอบ Note</label>
                <input id="haosNotesFileUploadV790" type="file" class="form-control" multiple>
                <div id="haosNotesExtraFileRowsV794" class="haos-notes-extra-rows"></div>
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold mt-2" onclick="window.HAOSNotes.addFileRow()"><i class="bi bi-plus-circle"></i> เพิ่มช่องไฟล์แนบ</button>
                <small class="haos-notes-field-help"><i class="bi bi-paperclip"></i> เลือกได้หลายไฟล์ ระบบจะอัปโหลดเข้า Google Drive แล้วแนบลิงก์ไว้กับ Note</small>
                <div id="haosNotesFileExistingV790" class="mt-2"></div>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">ลิงก์ไฟล์ / อ้างอิง</label>
                <input id="haosNotesFileInputV790" class="form-control" placeholder="วาง URL ถ้ามี">
                <div id="haosNotesExtraLinkRowsV794" class="haos-notes-extra-rows"></div>
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold mt-2" onclick="window.HAOSNotes.addLinkRow()"><i class="bi bi-plus-circle"></i> เพิ่มลิงก์อ้างอิง</button>
                <small class="haos-notes-field-help">วางลิงก์เองได้ หรือปล่อยให้ระบบเติมจากไฟล์แนบที่อัปโหลด</small>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">อ้างอิงโมดูล</label>
                <select id="haosNotesLinkedTypeInputV790" class="form-select">
                  <option value="">ไม่ระบุ</option>
                  <option value="schedule">ตารางงาน & นัดหมาย</option>
                  <option value="meeting_minutes">รายงานการประชุม</option>
                  <option value="e_office">e-Office</option>
                  <option value="helpdesk">แจ้งซ่อม IT / Helpdesk</option>
                  <option value="booking">จองห้องประชุม / Zoom</option>
                  <option value="ai_document">สรุปเอกสารด้วย AI</option>
                </select>
                <small class="haos-notes-field-help">ใช้เพื่อจัดหมวดและค้นหา Note ยังไม่สร้างรายการในโมดูลปลายทางอัตโนมัติ</small>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">รหัสอ้างอิง</label>
                <input id="haosNotesLinkedIdInputV790" class="form-control" placeholder="เช่น Schedule ID / เลขหนังสือ / รหัสงาน">
              </div>
              <div class="col-12">
                <label class="form-label fw-bold">รายละเอียด Note</label>
                <textarea id="haosNotesContentInputV790" class="form-control" rows="9" placeholder="พิมพ์ Note ที่นี่..."></textarea>
              </div>
              <div class="col-12">
                <label class="haos-notes-check strong"><input id="haosNotesPinnedInputV790" type="checkbox"> ปักหมุด Note นี้</label>
              </div>
            </div>
            <div class="haos-notes-editor-actions">
              <button type="button" class="btn btn-secondary fw-bold" onclick="window.HAOSNotes.closeEditor()">ยกเลิก</button>
              <button id="haosNotesSaveBtnV790" type="button" class="btn btn-success fw-bold" onclick="window.HAOSNotes.save()"><i class="bi bi-save"></i> บันทึก Note</button>
            </div>
          </div>
        </div>
      </section>
    `);
    ensureEditorInBody();
    ['haosNotesScopeFilterV790', 'haosNotesTagFilterV790', 'haosNotesPinnedFilterV790', 'haosNotesArchiveFilterV790'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('change', load);
    });
    $('haosNotesTagsSelectV790')?.addEventListener('mousedown', ev => {
      if (ev.target && ev.target.tagName === 'OPTION') {
        ev.preventDefault();
        ev.target.selected = !ev.target.selected;
        $('haosNotesTagsSelectV790')?.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    loadTagOptions();
  }

  function tagsHtml(item) {
    const tags = Array.isArray(item.tagsList) ? item.tagsList : compact(item.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    if (!tags.length) return '';
    return `<div class="haos-notes-tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>`;
  }

  function linkedLabel(type) {
    return {
      schedule: 'ตารางงาน & นัดหมาย',
      meeting_minutes: 'รายงานการประชุม',
      e_office: 'e-Office',
      helpdesk: 'แจ้งซ่อม IT / Helpdesk',
      booking: 'จองห้องประชุม / Zoom',
      ai_document: 'สรุปเอกสารด้วย AI'
    }[String(type || '')] || String(type || '');
  }

  function selectedManageItems() {
    return state.notes.filter((item, index) => state.selected.has(noteKey(item, index)) && item.canManage !== false);
  }

  function updateBulkUI() {
    const selectedCount = selectedManageItems().length;
    const count = $('haosNotesBulkCountV790');
    const done = $('haosNotesBulkDoneV790');
    const del = $('haosNotesBulkDeleteV790');
    [count, done, del].forEach(el => el?.classList.toggle('d-none', selectedCount < 1));
    if (count) count.textContent = `เลือก ${selectedCount} รายการ`;
  }

  function renderList() {
    const box = $('haosNotesListV790');
    const count = $('haosNotesCountV790');
    if (count) count.textContent = `${state.notes.length} รายการ`;
    if (!box) return;
    const validKeys = new Set(state.notes.map((item, index) => noteKey(item, index)));
    Array.from(state.selected).forEach(key => { if (!validKeys.has(key)) state.selected.delete(key); });
    if (!state.notes.length) {
      state.selected.clear();
      updateBulkUI();
      box.innerHTML = `
        <div class="haos-notes-empty">
          <i class="bi bi-journal-plus"></i>
          <b>ยังไม่มี Note ตามตัวกรองนี้</b>
          <span>กด “เพิ่ม Note” หรือใช้ปุ่ม “บันทึก Note” บนการ์ดหน้าแรกเพื่อจดเรื่องสำคัญได้ทันที</span>
        </div>`;
      return;
    }
    box.innerHTML = state.notes.map((item, index) => {
      const content = compact(item.content || '');
      const preview = content.length > 180 ? `${content.slice(0, 180)}...` : content;
      const canManage = item.canManage !== false;
      const key = noteKey(item, index);
      const checked = state.selected.has(key) ? 'checked' : '';
      const disabled = canManage ? '' : 'disabled';
      return `
        <article class="haos-notes-item ${noteTone(item.scope)} ${item.archived ? 'archived' : ''}">
          <div class="haos-notes-pin">
            <label class="haos-notes-select" title="เลือกเพื่อจัดการรวดเร็ว" onclick="event.stopPropagation()">
              <input type="checkbox" ${checked} ${disabled} onchange="window.HAOSNotes.toggleSelect('${esc(key)}', this.checked)">
            </label>
            <span>${item.pinned ? '<i class="bi bi-pin-angle-fill"></i>' : '<i class="bi bi-journal-text"></i>'}</span>
          </div>
          <div class="haos-notes-main">
            <div class="haos-notes-title-row">
              <h6>${esc(item.title || 'Note')}</h6>
              <span class="haos-notes-scope ${noteTone(item.scope)}"><i class="bi ${noteScopeIcon(item.scope)}"></i>${noteScopeLabel(item.scope)}</span>
            </div>
            <p>${esc(preview || '-')}</p>
            ${tagsHtml(item)}
            <div class="haos-notes-meta">
              <span><i class="bi bi-person"></i>${esc(item.ownerName || '-')}</span>
              <span><i class="bi bi-building"></i>${esc(item.department || '-')}</span>
              <span><i class="bi bi-clock"></i>${esc(displayDateTime(item.updatedAt || item.createdAt))}</span>
              ${item.fileUrl ? '<span><i class="bi bi-link-45deg"></i>มีลิงก์แนบ</span>' : ''}
            </div>
          </div>
          <div class="haos-notes-actions">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.HAOSNotes.view(${index})" title="ดู Note"><i class="bi bi-eye"></i></button>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.HAOSNotes.copy(${index})" title="คัดลอก"><i class="bi bi-clipboard"></i></button>
            ${canManage ? `<button type="button" class="btn btn-sm btn-outline-warning" onclick="window.HAOSNotes.togglePin(${index})" title="ปักหมุด"><i class="bi ${item.pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}"></i></button>` : ''}
            ${canManage ? `<button type="button" class="btn btn-sm btn-outline-success" onclick="window.HAOSNotes.openEditor(${index})" title="แก้ไข"><i class="bi bi-pencil"></i></button>` : ''}
            ${canManage ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="window.HAOSNotes.remove(${index})" title="ลบ"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </article>`;
    }).join('');
    updateBulkUI();
  }

  async function load() {
    ensureModule();
    const box = $('haosNotesListV790');
    if (box) box.innerHTML = '<div class="haos-notes-empty"><span class="spinner-border spinner-border-sm"></span><b>กำลังโหลด Note...</b></div>';
    try {
      const me = getUser();
      const res = await gas('getUserNotesV790', [me.phone || '', me.role || 'User', me.department || me.departmentName || '', readFilters()]);
      if (!res || !res.success) throw new Error(res?.message || 'โหลด Note ไม่สำเร็จ');
      state.notes = res.data || [];
      const validKeys = new Set(state.notes.map((item, index) => noteKey(item, index)));
      Array.from(state.selected).forEach(key => { if (!validKeys.has(key)) state.selected.delete(key); });
      renderList();
    } catch (err) {
      if (box) box.innerHTML = `<div class="text-danger p-3">${esc(err?.message || String(err))}</div>`;
    }
  }

  function clearFilters() {
    ['haosNotesSearchV790', 'haosNotesScopeFilterV790', 'haosNotesTagFilterV790'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
    ['haosNotesPinnedFilterV790', 'haosNotesArchiveFilterV790'].forEach(id => {
      const el = $(id);
      if (el) el.checked = false;
    });
    load();
  }

  function toggleFilters() {
    $('haosNotesFiltersV790')?.classList.toggle('show');
  }

  function setInput(id, value) {
    const el = $(id);
    if (el) {
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = value || '';
    }
  }

  function openEditor(index, preset) {
    ensureModule();
    const item = typeof index === 'number' ? state.notes[index] : null;
    const data = item || preset || {};
    state.editing = item || null;
    $('haosNotesEditorTitleV790').textContent = item ? 'แก้ไข Note' : 'บันทึก Note';
    populateTagOptions();
    setInput('haosNotesTitleInputV790', data.title || '');
    setInput('haosNotesScopeInputV790', data.scope || 'personal');
    setTagsValue(data.tags || '');
    setInput('haosNotesFileInputV790', data.fileUrl || '');
    setInput('haosNotesFileUploadV790', '');
    resetExtraRows();
    const existing = $('haosNotesFileExistingV790');
    if (existing) existing.innerHTML = data.fileUrl ? `<div class="small fw-bold text-muted mb-1">ไฟล์แนบเดิม</div>${renderFileButtons(data.fileUrl)}` : '';
    setInput('haosNotesLinkedTypeInputV790', data.linkedType || '');
    setInput('haosNotesLinkedIdInputV790', data.linkedId || '');
    setInput('haosNotesContentInputV790', data.content || '');
    setInput('haosNotesPinnedInputV790', !!data.pinned);
    ensureEditorInBody();
    $('haosNotesEditorV790')?.classList.add('show');
    $('haosNotesEditorV790')?.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('haosNotesTitleInputV790')?.focus(), 80);
    loadTagOptions().then(() => setTagsValue(data.tags || '')).catch(() => {});
  }

  function closeEditor() {
    $('haosNotesEditorV790')?.classList.remove('show');
    $('haosNotesEditorV790')?.setAttribute('aria-hidden', 'true');
    state.editing = null;
  }

  async function save() {
    if (state.busy) return;
    const title = clean($('haosNotesTitleInputV790')?.value || '');
    const content = clean($('haosNotesContentInputV790')?.value || '');
    if (!title && !content) return window.Swal?.fire('กรุณาระบุหัวข้อหรือรายละเอียด Note', '', 'warning');
    const old = state.editing || {};
    const me = getUser();
    const btn = $('haosNotesSaveBtnV790');
    const oldBtnHtml = btn?.innerHTML || '';
    try {
      state.busy = true;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังอัปโหลดไฟล์แนบ...';
      }
      const uploadedUrls = await uploadSelectedFiles();
      if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...';
      const manualLinks = [$('haosNotesFileInputV790')?.value || '', ...extraLinkValues()]
        .map(v => clean(v || ''))
        .filter(Boolean)
        .join('\n');
      const payload = {
        noteId: old.noteId || '',
        title,
        content,
        scope: $('haosNotesScopeInputV790')?.value || 'personal',
        tags: selectedTags().join(', '),
        fileUrl: mergeUrls(manualLinks, uploadedUrls.join('\n')),
        linkedType: $('haosNotesLinkedTypeInputV790')?.value || '',
        linkedId: $('haosNotesLinkedIdInputV790')?.value || '',
        pinned: !!$('haosNotesPinnedInputV790')?.checked
      };
      const res = await gas('saveUserNoteV790', [payload, me.phone || '', me.role || 'User']);
      if (!res || !res.success) throw new Error(res?.message || 'บันทึก Note ไม่สำเร็จ');
      closeEditor();
      open();
      await load();
      window.Swal?.fire({ icon: 'success', title: 'บันทึก Note แล้ว', timer: 1000, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('บันทึกไม่สำเร็จ', err?.message || String(err), 'error');
    } finally {
      state.busy = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldBtnHtml || '<i class="bi bi-save"></i> บันทึก Note';
      }
    }
  }

  function view(index) {
    const item = state.notes[index];
    if (!item) return;
    window.Swal?.fire({
      title: esc(item.title || 'Note'),
      width: 760,
      html: `
        <div class="haos-notes-view text-start">
          <div class="mb-2">
            <span class="haos-notes-scope ${noteTone(item.scope)}"><i class="bi ${noteScopeIcon(item.scope)}"></i>${noteScopeLabel(item.scope)}</span>
            ${item.pinned ? '<span class="haos-notes-scope pin"><i class="bi bi-pin-angle-fill"></i>ปักหมุด</span>' : ''}
            ${item.archived ? '<span class="haos-notes-scope muted"><i class="bi bi-archive"></i>เก็บแล้ว</span>' : ''}
          </div>
          <p class="text-muted small mb-2">${esc(item.ownerName || '-')} · ${esc(item.department || '-')} · ${esc(displayDateTime(item.updatedAt || item.createdAt))}</p>
          ${item.linkedType ? `<div class="alert alert-light border small fw-bold"><i class="bi bi-link-45deg"></i> อ้างอิง: ${esc(linkedLabel(item.linkedType))}${item.linkedId ? ' · ' + esc(item.linkedId) : ''}</div>` : ''}
          <div class="haos-notes-view-content">${esc(item.content || '-')}</div>
          ${tagsHtml(item)}
          <div class="d-flex gap-2 flex-wrap mt-3">
            ${renderFileButtons(item.fileUrl)}
            <button class="btn btn-sm btn-outline-secondary" onclick="window.HAOSNotes.copy(${index})"><i class="bi bi-clipboard"></i> คัดลอก</button>
          </div>
        </div>`
    });
  }

  async function copy(index) {
    const item = state.notes[index];
    if (!item) return;
    const text = [item.title, item.content, item.fileUrl].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      window.Swal?.fire({ icon: 'success', title: 'คัดลอก Note แล้ว', timer: 900, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('คัดลอกไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  async function togglePin(index) {
    const item = state.notes[index];
    if (!item) return;
    try {
      const me = getUser();
      const res = await gas('toggleUserNotePinV790', [item.noteId, me.phone || '', me.role || 'User', !item.pinned]);
      if (!res || !res.success) throw new Error(res?.message || 'อัปเดตปักหมุดไม่สำเร็จ');
      await load();
    } catch (err) {
      window.Swal?.fire('อัปเดตไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  async function remove(index) {
    const item = state.notes[index];
    if (!item) return;
    const ok = await window.Swal?.fire({
      icon: 'warning',
      title: 'ลบ Note นี้?',
      text: item.title || item.noteId,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc3545'
    });
    if (ok && !ok.isConfirmed) return;
    try {
      const me = getUser();
      const res = await gas('deleteUserNoteV790', [item.noteId, me.phone || '', me.role || 'User']);
      if (!res || !res.success) throw new Error(res?.message || 'ลบ Note ไม่สำเร็จ');
      await load();
      window.Swal?.fire({ icon: 'success', title: 'ลบ Note แล้ว', timer: 900, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('ลบไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  function toggleSelect(key, checked) {
    if (!key) return;
    if (checked) state.selected.add(String(key));
    else state.selected.delete(String(key));
    updateBulkUI();
  }

  async function bulkDone() {
    const items = selectedManageItems();
    if (!items.length) return;
    const ok = await window.Swal?.fire({
      icon: 'question',
      title: `ทำเครื่องหมายเสร็จสิ้น ${items.length} รายการ?`,
      text: 'รายการจะถูกย้ายไปสถานะเก็บแล้ว และสามารถดูได้เมื่อเปิดตัวกรอง “รวมที่เก็บแล้ว”',
      showCancelButton: true,
      confirmButtonText: 'เสร็จสิ้นแล้ว',
      cancelButtonText: 'ยกเลิก'
    });
    if (ok && !ok.isConfirmed) return;
    try {
      const me = getUser();
      for (const item of items) {
        const res = await gas('archiveUserNoteV790', [item.noteId, me.phone || '', me.role || 'User', true]);
        if (!res || !res.success) throw new Error(res?.message || `อัปเดต ${item.title || item.noteId} ไม่สำเร็จ`);
      }
      state.selected.clear();
      await load();
      window.Swal?.fire({ icon: 'success', title: 'อัปเดต Note ที่เลือกแล้ว', timer: 1000, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('อัปเดตไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  async function bulkDelete() {
    const items = selectedManageItems();
    if (!items.length) return;
    const ok = await window.Swal?.fire({
      icon: 'warning',
      title: `ลบ Note ${items.length} รายการ?`,
      text: 'การลบนี้จะนำรายการออกจากฐานข้อมูล',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc3545'
    });
    if (ok && !ok.isConfirmed) return;
    try {
      const me = getUser();
      for (const item of items) {
        const res = await gas('deleteUserNoteV790', [item.noteId, me.phone || '', me.role || 'User']);
        if (!res || !res.success) throw new Error(res?.message || `ลบ ${item.title || item.noteId} ไม่สำเร็จ`);
      }
      state.selected.clear();
      await load();
      window.Swal?.fire({ icon: 'success', title: 'ลบ Note ที่เลือกแล้ว', timer: 1000, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('ลบไม่สำเร็จ', err?.message || String(err), 'error');
    }
  }

  function open() {
    ensureModule();
    $('haosNotesModuleV790')?.classList.add('show');
    $('haosNotesModuleV790')?.setAttribute('aria-hidden', 'false');
    load();
    setTimeout(() => {
      try {
        $('haosNotesModuleV790')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {}
    }, 80);
  }

  function close() {
    $('haosNotesModuleV790')?.classList.remove('show');
    $('haosNotesModuleV790')?.setAttribute('aria-hidden', 'true');
  }

  function quickNote() {
    ensureModule();
    openEditor(null, { scope: 'personal', tags: 'ด่วน' });
  }

  function installCard() {
    const pane = $('itservices-pane');
    if (!pane || $('userNotesCardV790')) return;
    const rows = qa('.row.g-3.mb-4,.row.g-3', pane);
    const row = rows.find(el => el.querySelector('.it-service-card,.card.h-100')) || rows[0];
    if (!row) return;
    const card = document.createElement('div');
    card.id = 'userNotesCardV790';
    card.className = 'col-md-4';
    card.dataset.moduleId = 'user_notes';
    card.innerHTML = `
      <div class="card h-100 it-service-card">
        <div class="card-body p-4 d-flex flex-column">
          <div class="mb-3 d-inline-flex align-items-center justify-content-center rounded-4" style="width:54px;height:54px;background:#fff7ed;color:#c2410c;font-size:1.55rem"><i class="bi bi-journal-richtext"></i></div>
          <h6 class="fw-bold">สมุด Note</h6>
          <p class="text-muted small flex-grow-1">จดบันทึกส่วนตัวหรือกลุ่มงาน ปักหมุด ติดแท็ก ค้นย้อนหลัง และแนบลิงก์งานสำคัญไว้ใช้งานต่อได้ทันที</p>
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-warning btn-sm fw-bold" onclick="window.HAOSNotes.quickNote()"><i class="bi bi-pencil-square"></i> บันทึกเร็ว</button>
            <button type="button" class="btn btn-outline-primary btn-sm fw-bold" onclick="window.HAOSNotes.open()"><i class="bi bi-folder2-open"></i> เปิดสมุด Note</button>
          </div>
        </div>
      </div>`;
    row.appendChild(card);
    try {
      if (typeof window.applyITHubLayoutV759 === 'function') window.applyITHubLayoutV759();
    } catch (err) {}
  }

  function boot() {
    ensureModule();
    installCard();
  }

  window.HAOSNotes = {
    open,
    close,
    load,
    clearFilters,
    toggleFilters,
    addFileRow,
    addLinkRow,
    openEditor,
    closeEditor,
    quickNote,
    save,
    view,
    copy,
    togglePin,
    remove,
    toggleSelect,
    bulkDone,
    bulkDelete,
    version: PATCH
  };
  window.openUserNotesV790 = open;
  window.openQuickNoteV790 = quickNote;
  window.openQuickNoteHeroV790 = quickNote;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  const observer = new MutationObserver(() => {
    clearTimeout(window.__haosNotesInstallTimerV790);
    window.__haosNotesInstallTimerV790 = setTimeout(installCard, 150);
  });
  try { observer.observe(document.body, { childList: true, subtree: true }); } catch (err) {}
  setInterval(installCard, 2500);
  if (window.__haosPendingQuickNoteV790) {
    window.__haosPendingQuickNoteV790 = false;
    setTimeout(quickNote, 80);
  }
  console.info('HAOS ' + PATCH + ' loaded');
})();
