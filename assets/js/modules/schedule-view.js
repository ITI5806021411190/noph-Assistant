(function(){
  const PATCH = 'v70.84-schedule-upcoming-sort';
  if (window.__HAOS_V770_SCHEDULE_VIEW__) return;
  window.__HAOS_V770_SCHEDULE_VIEW__ = true;

  const root = window.HAOS = window.HAOS || {};
  const $ = id => document.getElementById(id);
  const qa = (sel, base = document) => Array.from(base.querySelectorAll(sel));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const phone = value => String(value || '').replace(/'/g, '').replace(/\D/g, '').trim();
  const jsArg = value => JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  const getUser = () => {
    try { return window.user || user || {}; } catch (e) { return window.user || {}; }
  };
  const core = () => window.HAOSScheduleCore || root.schedule || {};
  const userKey = () => phone(getUser().phone) || 'anon';
  const inProgress = () => core().STATUS_IN_PROGRESS || 'อยู่ระหว่างการดำเนินการ';

  function isAdmin() {
    const role = String(getUser().role || '').toLowerCase();
    return role.includes('admin') || role.includes('super');
  }

  function nativeId(item) {
    return clean(item && (item.id || item.publicId || item.eventId || item.scheduleId || item.__id));
  }

  function dateOf(item) {
    if (!item) return null;
    if (item.__date instanceof Date && !isNaN(item.__date)) return item.__date;
    const parser = core().parseDate || (v => {
      const d = new Date(v);
      return isNaN(d) ? null : d;
    });
    return parser(item.rawStartTime || item.startDate || item.eventDate || item.date || item.start || item.startTime || item.createdAt);
  }

  function hasClock(value) {
    return /(?:[01]?\d|2[0-3])[:.][0-5]\d/.test(String(value || ''));
  }

  function formatDateTime(item) {
    const raw = item && (item.startTime || item.start || item.rawStartTime || item.startDate || item.eventDate || item.date);
    const text = clean(raw);
    if (text && hasClock(text)) return text;
    const d = dateOf(item);
    if (!d) return text || '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear() + 543;
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  }

  function timeOnly(item) {
    const text = formatDateTime(item);
    const match = text.match(/(?:[01]?\d|2[0-3])[:.][0-5]\d/);
    return match ? match[0].replace('.', ':') : '';
  }

  function pins() {
    try { return new Set(JSON.parse(localStorage.getItem('haos_schedule_pins_v737_' + userKey()) || '[]').map(String)); }
    catch (e) { return new Set(); }
  }

  function savePins(set) {
    try { localStorage.setItem('haos_schedule_pins_v737_' + userKey(), JSON.stringify(Array.from(set || []))); }
    catch (e) {}
  }

  function sameDay(a, b) {
    return core().sameDay ? core().sameDay(a, b) : false;
  }

  function badgeClass(status) {
    try {
      if (typeof window.getScheduleBadgeClass === 'function') return window.getScheduleBadgeClass(status);
    } catch (e) {}
    const s = clean(status);
    if (/ยกเลิก|cancel/i.test(s)) return 'bg-danger';
    if (/ดำเนินการแล้ว|เสร็จ|done|complete/i.test(s)) return 'bg-success';
    return 'bg-info text-dark';
  }

  function priorityOf(item) {
    return core().priorityOf ? core().priorityOf(item) : clean(item && (item.priority || item.eventPriority || item.workPriority)) || 'ปกติ';
  }

  function tagsOf(item) {
    return core().tagsOf ? core().tagsOf(item) : String(item && (item.tags || item.eventTags || item.workTags || '')).split(/\n|,/).map(clean).filter(Boolean);
  }

  function priorityTone(item) {
    return core().priorityTone ? core().priorityTone(item) : '';
  }

  function canEdit(item) {
    if (!item) return false;
    if (isAdmin()) return true;
    return item.__scope === 'my' || phone(item.ownerPhone || item.createdByPhone || item.userPhone) === userKey();
  }

  function setSelectOptions(id, values, label, preferred) {
    const el = $(id);
    if (!el) return;
    const old = el.value;
    const unique = Array.from(new Set((values || []).map(clean).filter(Boolean)));
    const html = [`<option value="">${esc(label || 'ทั้งหมด')}</option>`].concat(unique.map(v => `<option value="${esc(v)}">${esc(v)}</option>`)).join('');
    if (el.innerHTML !== html) el.innerHTML = html;
    if (old && unique.includes(old)) el.value = old;
    else if (preferred && unique.includes(preferred)) el.value = preferred;
  }

  function ensureSortOptions() {
    const labels = [
      ['upcoming', 'วันที่ที่จะถึง'],
      ['dateDesc', 'วันที่มากไปน้อย'],
      ['dateAsc', 'วันที่น้อยไปมาก'],
      ['newest', 'ล่าสุดก่อน'],
      ['oldest', 'เก่าสุดก่อน'],
      ['name', 'ชื่องาน']
    ];
    ['unifiedScheduleSortV702', 'scheduleSort'].forEach(id => {
      const el = $(id);
      if (!el) return;
      if (!el.dataset.haosV770SortOptions) {
        el.innerHTML = labels.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
        el.dataset.haosV770SortOptions = '1';
      }
      if (!el.dataset.haosV770UserTouched && el.value !== 'upcoming') el.value = 'upcoming';
      if (!el.dataset.haosV770TouchHook) {
        el.dataset.haosV770TouchHook = '1';
        el.addEventListener('change', () => { el.dataset.haosV770UserTouched = '1'; });
      }
    });
  }

  function ensureStatusDefault() {
    const el = $('unifiedScheduleStatusV702');
    if (!el) return;
    el.title = 'ค่าเริ่มต้นแสดงเฉพาะงานสถานะอยู่ระหว่างการดำเนินการ ถ้าตารางว่างให้เปิดตัวกรองแล้วเลือกสถานะทั้งหมด';
    if (!el.dataset.haosV770UserTouched && !el.value) el.value = inProgress();
    if (!el.dataset.haosV770TouchHook) {
      el.dataset.haosV770TouchHook = '1';
      el.addEventListener('change', () => { el.dataset.haosV770UserTouched = '1'; });
    }
  }

  function ensureMetaFilters() {
    const row = document.querySelector('#haosUnifiedScheduleViewV702 .haos-v702-filter .row');
    if (row && !$('unifiedSchedulePriorityV706')) {
      const reset = row.querySelector('.d-grid');
      const html = [
        '<div class="col-md-2"><label class="small fw-bold text-muted">ความสำคัญ</label><select id="unifiedSchedulePriorityV706" class="form-select"></select></div>',
        '<div class="col-md-2"><label class="small fw-bold text-muted">ประเภทงาน / Tags</label><select id="unifiedScheduleTagV706" class="form-select"></select></div>'
      ].join('');
      if (reset) reset.insertAdjacentHTML('beforebegin', html);
      else row.insertAdjacentHTML('beforeend', html);
    }
    const all = core().readAll ? core().readAll() : [];
    const priorities = ['ปกติ', 'ต่ำ', 'ด่วน', 'ด่วนมาก'].concat(all.map(priorityOf));
    const tags = [].concat(...all.map(tagsOf), (window.workTagOptionsGlobal || []).map(t => t && (t.name || t))).map(clean).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));
    setSelectOptions('unifiedSchedulePriorityV706', priorities, 'ทั้งหมด');
    setSelectOptions('unifiedScheduleTagV706', tags, 'ทั้งหมด');
    ['unifiedScheduleSearchV702','unifiedScheduleScopeV702','unifiedScheduleStatusV702','unifiedSchedulePeriodV702','unifiedScheduleSortV702','unifiedSchedulePriorityV706','unifiedScheduleTagV706'].forEach(id => {
      const el = $(id);
      if (!el || el.dataset.haosV770FilterHook) return;
      el.dataset.haosV770FilterHook = '1';
      const evt = id === 'unifiedScheduleSearchV702' ? 'input' : 'change';
      el.addEventListener(evt, () => {
        window.haosSchedulePageV739 = 1;
        if (id === 'unifiedScheduleStatusV702' || id === 'unifiedScheduleSortV702') el.dataset.haosV770UserTouched = '1';
        setTimeout(() => window.renderUnifiedScheduleV702 && window.renderUnifiedScheduleV702(), 0);
      });
    });
  }

  function ensureLegend() {
    const tools = $('unifiedScheduleViewToolsV702');
    if (tools && !$('haosScheduleLegendV739')) {
      tools.insertAdjacentHTML('beforeend', '<span id="haosScheduleLegendV739" class="haos-v739-schedule-legend"><span class="my"><i></i> ส่วนตัว</span><span class="dept"><i></i> กลุ่มงาน</span></span>');
    }
    const scope = $('unifiedScheduleScopeV702');
    const legend = $('haosScheduleLegendV739');
    if (!scope || !legend) return;
    [['.my','my'],['.dept','dept']].forEach(([sel, value]) => {
      const el = legend.querySelector(sel);
      if (!el) return;
      el.classList.toggle('active', scope.value === value);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.title = value === 'my' ? 'แสดงเฉพาะงานส่วนตัว' : 'แสดงเฉพาะงานกลุ่มงาน';
      if (el.dataset.haosV770LegendHook) return;
      el.dataset.haosV770LegendHook = '1';
      const run = () => {
        scope.value = scope.value === value ? '' : value;
        window.haosSchedulePageV739 = 1;
        window.renderUnifiedScheduleV702();
      };
      el.addEventListener('click', run);
      el.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          run();
        }
      });
    });
  }

  function setBoxes(mode) {
    const boxes = { list: $('unifiedScheduleListV702'), card: $('unifiedScheduleCardV702'), calendar: $('unifiedScheduleCalendarV702') };
    Object.entries(boxes).forEach(([name, el]) => {
      if (!el) return;
      const on = name === mode;
      el.hidden = !on;
      el.classList.toggle('d-none', !on);
      el.style.display = on ? '' : 'none';
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    qa('#unifiedScheduleViewToolsV702 .btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
  }

  function hideLegacyTables() {
    [$('scheduleListDiv')?.closest('.card'), $('departmentScheduleTable')?.closest('.card')].forEach(card => {
      if (card) card.classList.add('d-none');
    });
    $('calendarDiv')?.classList.add('d-none');
  }

  function actionHtml(item) {
    const id = nativeId(item);
    if (!id) return '<span class="text-muted">-</span>';
    const p = pins();
    let html = `<button class="btn btn-sm ${p.has(id) ? 'btn-warning' : 'btn-outline-warning'} me-1" onclick='toggleSchedulePinV737(${jsArg(id)})' title="ปักหมุดงาน"><i class="bi ${p.has(id) ? 'bi-star-fill' : 'bi-star'}"></i></button>`;
    if (typeof window.viewScheduleDetail === 'function') html += `<button class="btn btn-outline-info btn-sm text-dark me-1" onclick='viewScheduleDetail(${jsArg(id)})' title="ดูรายละเอียด"><i class="bi bi-eye"></i></button>`;
    if (canEdit(item) && typeof window.editSchedule === 'function') html += `<button class="btn btn-outline-warning btn-sm text-dark me-1" onclick='editSchedule(${jsArg(id)})' title="แก้ไข"><i class="bi bi-pencil"></i></button>`;
    if (canEdit(item) && typeof window.handleDelete === 'function') html += `<button class="btn btn-outline-danger btn-sm" onclick='handleDelete(${jsArg(id)})' title="ลบ"><i class="bi bi-trash"></i></button>`;
    return html;
  }

  function tagChips(item) {
    const tags = tagsOf(item).map(t => `<span class="haos-v706-chip tag">${esc(t)}</span>`).join('');
    return tags + `<span class="haos-v706-chip priority-normal"><i class="bi bi-flag"></i>${esc(priorityOf(item))}</span>`;
  }

  function titleCell(item) {
    const id = nativeId(item);
    const p = pins();
    const tone = priorityTone(item);
    const d = dateOf(item);
    const icon = tone === 'critical' ? 'bi-exclamation-octagon-fill' : (tone === 'urgent' ? 'bi-exclamation-triangle-fill' : (p.has(id) ? 'bi-star-fill' : 'bi-calendar-event'));
    const urgent = tone ? `<span class="haos-v740-urgent-mark ${tone === 'critical' ? 'critical' : ''}"><i class="bi bi-lightning-charge-fill"></i>${tone === 'critical' ? 'ด่วนมาก ต้องเร่งดำเนินการ' : 'ด่วน ควรรีบดำเนินการ'}</span>` : '';
    return `<div class="haos-v706-title-wrap"><span class="haos-v706-title-icon"><i class="bi ${icon}"></i></span><div><div class="haos-v706-title-main">${esc(item.__title || item.eventName || item.title || '-')}</div><div class="haos-v706-title-sub"><span><i class="bi bi-geo-alt"></i> ${esc(item.__location || item.location || item.eventLocation || '-')}</span>${sameDay(d, new Date()) ? '<span class="badge bg-primary">วันนี้</span>' : ''}</div>${urgent}</div></div>`;
  }

  function rowHtml(item) {
    const d = dateOf(item);
    const tone = priorityTone(item);
    const id = nativeId(item);
    const p = pins();
    const scopeCls = item.__scope === 'dept' ? 'haos-v738-scope-dept' : 'haos-v738-scope-my';
    const priorityCls = tone === 'critical' ? 'haos-v740-priority-critical' : (tone === 'urgent' ? 'haos-v740-priority-urgent' : '');
    const todayCls = sameDay(d, new Date()) ? 'haos-v737-schedule-today' : '';
    const pinCls = p.has(id) ? 'haos-v737-schedule-pin' : '';
    return `<tr class="${scopeCls} ${priorityCls} ${todayCls} ${pinCls}">
      <td>${titleCell(item)}</td>
      <td><div class="haos-v706-time"><i class="bi bi-clock"></i> ${esc(formatDateTime(item))}</div></td>
      <td><span class="haos-v702-kind ${item.__scope === 'dept' ? 'dept' : 'my'}">${item.__scope === 'dept' ? 'กลุ่มงาน' : 'ส่วนตัว'}</span></td>
      <td>${tagChips(item)}</td>
      <td>${esc(item.__ownerName || item.ownerName || item.createdBy || item.assigneeName || '-')}</td>
      <td><span class="badge ${badgeClass(item.__status || item.workStatus || item.status)}">${esc(item.__status || item.workStatus || item.status || '-')}</span></td>
      <td class="text-end action-menu">${actionHtml(item)}</td>
    </tr>`;
  }

  function cardHtml(item) {
    const d = dateOf(item);
    const tone = priorityTone(item);
    const id = nativeId(item);
    const p = pins();
    const priorityCls = tone === 'critical' ? 'haos-v740-priority-critical' : (tone === 'urgent' ? 'haos-v740-priority-urgent' : '');
    const urgent = tone ? `<span class="haos-v740-urgent-mark ${tone === 'critical' ? 'critical' : ''}"><i class="bi bi-lightning-charge-fill"></i>${tone === 'critical' ? 'ด่วนมาก ต้องเร่งดำเนินการ' : 'ด่วน ควรรีบดำเนินการ'}</span>` : '';
    return `<article class="haos-v702-card ${item.__scope === 'dept' ? 'haos-v738-scope-dept' : 'haos-v738-scope-my'} ${priorityCls} ${sameDay(d, new Date()) ? 'haos-v737-schedule-today' : ''} ${p.has(id) ? 'haos-v737-schedule-pin' : ''}">
      <div class="d-flex justify-content-between gap-2 mb-2"><span class="haos-v702-kind ${item.__scope === 'dept' ? 'dept' : 'my'}">${item.__scope === 'dept' ? 'กลุ่มงาน' : 'ส่วนตัว'}</span><span class="badge ${badgeClass(item.__status || item.workStatus || item.status)}">${esc(item.__status || item.workStatus || item.status || '-')}</span></div>
      <div class="title">${esc(item.__title || item.eventName || item.title || '-')}</div>${urgent}
      <div class="meta"><span><i class="bi bi-clock"></i> ${esc(formatDateTime(item))}</span><span><i class="bi bi-geo-alt"></i> ${esc(item.__location || item.location || item.eventLocation || '-')}</span></div>
      <div>${tagChips(item)}</div>
      <div class="text-end mt-2">${actionHtml(item)}</div>
    </article>`;
  }

  function pagerHtml(query) {
    if (!query || query.total <= query.pageSize) return '';
    return `<div class="haos-v739-pager"><span>แสดง ${query.start + 1}-${query.end} จาก ${query.total} รายการ</span><button type="button" class="btn btn-sm btn-outline-primary" ${query.page <= 1 ? 'disabled' : ''} onclick="setSchedulePageV739(${query.page - 1})"><i class="bi bi-chevron-left"></i></button><span>หน้า ${query.page}/${query.pages}</span><button type="button" class="btn btn-sm btn-outline-primary" ${query.page >= query.pages ? 'disabled' : ''} onclick="setSchedulePageV739(${query.page + 1})"><i class="bi bi-chevron-right"></i></button></div>`;
  }

  function summaryStrip(query) {
    const todayCount = (query.filtered || []).filter(item => sameDay(dateOf(item), new Date())).length;
    const pinCount = pins().size;
    return `<div class="haos-v737-today-strip"><i class="bi bi-calendar-check"></i> วันนี้มีงานตามตัวกรอง ${todayCount} รายการ${pinCount ? ` • ปักหมุดไว้ ${pinCount} งาน` : ''}</div>`;
  }

  function emptyHtml() {
    const status = $('unifiedScheduleStatusV702')?.value || '';
    if (status === inProgress()) {
      return '<div class="haos-v759-empty-note"><i class="bi bi-info-circle"></i> ยังไม่พบงานในสถานะอยู่ระหว่างการดำเนินการ ถ้างานหายไปให้กดแสดงตัวกรองแล้วเปลี่ยนสถานะเป็นทั้งหมด</div>';
    }
    return '<div class="text-muted small p-3">ไม่พบรายการตามเงื่อนไข</div>';
  }

  function renderList(query) {
    const box = $('unifiedScheduleListV702');
    if (!box) return;
    const rows = query.items.length ? query.items.map(rowHtml).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">${emptyHtml()}</td></tr>`;
    box.innerHTML = summaryStrip(query) + '<table class="table haos-v702-table haos-v706-table align-middle small"><thead><tr><th>ชื่องาน</th><th>เวลาเริ่ม</th><th>ประเภท</th><th>Priority / Tags</th><th>ผู้สร้าง/เจ้าของ</th><th>สถานะ</th><th class="text-end">จัดการ</th></tr></thead><tbody>' + rows + '</tbody></table>' + pagerHtml(query);
  }

  function renderCards(query) {
    const box = $('unifiedScheduleCardV702');
    if (!box) return;
    box.innerHTML = summaryStrip(query) + (query.items.length ? query.items.map(cardHtml).join('') : emptyHtml()) + pagerHtml(query);
  }

  function renderCalendar(query) {
    const box = $('unifiedScheduleCalendarV702');
    if (!box) return;
    box.innerHTML = '<div id="unifiedScheduleCalendarInnerV770"></div>';
    if (window.haosUnifiedScheduleCalendarV702) {
      try { window.haosUnifiedScheduleCalendarV702.destroy(); } catch (e) {}
      window.haosUnifiedScheduleCalendarV702 = null;
    }
    if (!window.FullCalendar) {
      box.innerHTML = '<div class="text-center text-muted py-4">ยังไม่พบเครื่องมือปฏิทิน กรุณาโหลดหน้าใหม่</div>';
      return;
    }
    const p = pins();
    const events = (query.sorted || []).map(item => {
      const d = dateOf(item);
      const id = nativeId(item);
      if (!d) return null;
      const tone = priorityTone(item);
      const title = `${p.has(id) ? '★ ' : ''}${timeOnly(item) ? timeOnly(item) + ' ' : ''}${item.__title || item.eventName || item.title || '-'}`;
      return {
        title,
        start: d,
        allDay: !hasClock(formatDateTime(item)),
        backgroundColor: tone === 'critical' ? '#dc2626' : (tone === 'urgent' ? '#f97316' : (item.__scope === 'dept' ? '#059669' : '#2563eb')),
        borderColor: 'transparent',
        extendedProps: { id }
      };
    }).filter(Boolean);
    const cal = new FullCalendar.Calendar($('unifiedScheduleCalendarInnerV770'), {
      initialView: 'dayGridMonth',
      locale: 'th',
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' },
      displayEventTime: true,
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      events,
      eventClick: info => {
        info.jsEvent && info.jsEvent.preventDefault();
        const id = info.event.extendedProps && info.event.extendedProps.id;
        if (id && typeof window.viewScheduleDetail === 'function') window.viewScheduleDetail(id);
      }
    });
    cal.render();
    window.haosUnifiedScheduleCalendarV702 = cal;
  }

  function state() {
    if (core().applyDomDefaults) core().applyDomDefaults();
    ensureSortOptions();
    ensureStatusDefault();
    return core().stateFromDom ? core().stateFromDom() : { view: window.haosUnifiedScheduleModeV702 || 'list', page: window.haosSchedulePageV739 || 1, pageSize: 20 };
  }

  function render() {
    const shell = $('haosUnifiedScheduleViewV702');
    if (!shell || !core().query) return false;
    hideLegacyTables();
    ensureSortOptions();
    ensureStatusDefault();
    ensureMetaFilters();
    ensureLegend();
    const mode = window.haosUnifiedScheduleModeV702 || 'list';
    const s = Object.assign({}, state(), { view: mode, page: window.haosSchedulePageV739 || 1, pageSize: 20 });
    const query = core().query(s);
    window.haosSchedulePageV739 = query.page;
    setBoxes(mode);
    const current = $('unifiedScheduleCurrentViewV702');
    if (current) current.textContent = 'กำลังดู: ' + ({ list: 'รายการ', card: 'การ์ด', calendar: 'ปฏิทิน' }[mode] || 'รายการ');
    if (mode === 'card') renderCards(query);
    else if (mode === 'calendar') renderCalendar(query);
    else renderList(query);
    ensureLegend();
    return true;
  }

  const previousRender = window.renderUnifiedScheduleV702;
  window.renderUnifiedScheduleV702 = function(){
    if (!$('haosUnifiedScheduleViewV702') && typeof previousRender === 'function') return previousRender.apply(this, arguments);
    return render();
  };

  window.setUnifiedScheduleViewV702 = function(mode){
    window.haosUnifiedScheduleModeV702 = mode || 'list';
    window.haosSchedulePageV739 = 1;
    render();
  };

  window.setSchedulePageV739 = function(page){
    window.haosSchedulePageV739 = Number(page) || 1;
    render();
  };

  window.toggleSchedulePinV737 = function(id){
    const set = pins();
    const key = String(id || '');
    set.has(key) ? set.delete(key) : set.add(key);
    savePins(set);
    render();
  };

  window.resetUnifiedScheduleFiltersV702 = function(){
    ['unifiedScheduleSearchV702','unifiedScheduleScopeV702','unifiedSchedulePeriodV702','unifiedSchedulePriorityV706','unifiedScheduleTagV706'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
    const status = $('unifiedScheduleStatusV702');
    if (status) {
      status.value = inProgress();
      delete status.dataset.haosV770UserTouched;
    }
    const sort = $('unifiedScheduleSortV702');
    if (sort) {
      sort.value = 'upcoming';
      delete sort.dataset.haosV770UserTouched;
    }
    window.haosSchedulePageV739 = 1;
    render();
  };

  function wrapLoader(name) {
    const old = window[name];
    if (typeof old !== 'function' || old.__haosV770Wrapped) return;
    const wrapped = function(){
      const result = old.apply(this, arguments);
      setTimeout(() => { try { render(); } catch (e) {} }, 700);
      setTimeout(() => { try { render(); } catch (e) {} }, 1400);
      return result;
    };
    wrapped.__haosV770Wrapped = true;
    window[name] = wrapped;
  }

  function boot() {
    wrapLoader('loadMySchedules');
    wrapLoader('loadDepartmentSchedules');
    ensureSortOptions();
    ensureStatusDefault();
    ensureMetaFilters();
    ensureLegend();
    render();
  }

  root.scheduleView = {
    version: PATCH,
    render,
    diagnostics: () => ({
      patch: PATCH,
      core: core().version || '',
      counts: core().diagnostics ? core().diagnostics().counts : {},
      state: core().stateFromDom ? core().stateFromDom() : {}
    })
  };
  window.haosScheduleViewDiagnosticsV770 = root.scheduleView.diagnostics;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setTimeout(boot, 900);
  console.info('HAOS ' + PATCH + ' loaded');
})();
