(function () {
  'use strict';

  const PATCH = 'v70.83-schedule-thai-list-public-booking-fix';
  if (window.__HAOS_V782_SCHEDULE_THAI_LIST__) return;
  window.__HAOS_V782_SCHEDULE_THAI_LIST__ = true;

  const root = window.HAOS = window.HAOS || {};
  const $ = (id) => document.getElementById(id);
  const qa = (sel, base = document) => Array.from((base || document).querySelectorAll(sel));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const phone = (value) => String(value || '').replace(/'/g, '').replace(/\D/g, '').trim();
  const jsArg = (value) => JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const thaiMonthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonths = thaiMonthsShort;
  const thaiMonthMap = thaiMonthsShort.concat(thaiMonthsFull).reduce((out, month, index) => {
    const monthIndex = index % 12;
    out[month.replace(/\./g, '')] = monthIndex;
    out[month] = monthIndex;
    return out;
  }, {});

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

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;
    if (typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d) ? null : d;
    }
    const text = clean(value);
    if (!text) return null;

    const thaiMatch = text.match(/^(\d{1,2})(?:\/|\s*•\s*)([ก-ฮ.]+)(?:\/|\s*•\s*)(\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
    if (thaiMatch) {
      const key = thaiMatch[2].replace(/\./g, '');
      const month = thaiMonthMap[key] ?? thaiMonthMap[thaiMatch[2]];
      if (month != null) {
        let year = Number(thaiMatch[3]);
        if (year > 2400) year -= 543;
        return new Date(year, month, Number(thaiMatch[1]), Number(thaiMatch[4] || 0), Number(thaiMatch[5] || 0));
      }
    }

    const dmy = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
    if (dmy) {
      let year = Number(dmy[3]);
      if (year > 2400) year -= 543;
      return new Date(year, Number(dmy[2]) - 1, Number(dmy[1]), Number(dmy[4] || 0), Number(dmy[5] || 0));
    }

    const normalized = text.replace(' ', 'T');
    const parsed = new Date(normalized);
    return isNaN(parsed) ? null : parsed;
  }

  function hasTime(value) {
    if (value instanceof Date) return value.getHours() !== 0 || value.getMinutes() !== 0;
    return /(?:T|\s)(?:[01]?\d|2[0-3])[:.][0-5]\d/.test(String(value || ''));
  }

  function startRaw(item) {
    return item && (item.rawStartTime || item.startDate || item.eventDate || item.date || item.start || item.startTime || item.createdAt);
  }

  function endRaw(item) {
    return item && (item.rawEndTime || item.endTime || item.endDate || item.end);
  }

  function dateOf(item) {
    if (!item) return null;
    if (item.__date instanceof Date && !isNaN(item.__date)) return item.__date;
    return parseDate(startRaw(item));
  }

  function endOf(item) {
    if (!item) return null;
    if (item.__endDate instanceof Date && !isNaN(item.__endDate)) return item.__endDate;
    return parseDate(endRaw(item));
  }

  function sameDay(a, b) {
    a = parseDate(a);
    b = parseDate(b);
    return !!(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
  }

  function formatThaiDate(value) {
    if (window.HAOSDateDisplay && window.HAOSDateDisplay.date) return window.HAOSDateDisplay.date(value);
    const d = parseDate(value);
    if (!d) return clean(value) || '-';
    return `${d.getDate()} • ${thaiMonthsFull[d.getMonth()]} • ${d.getFullYear() + 543}`;
  }

  function formatThaiTime(value, raw) {
    if (window.HAOSDateDisplay && window.HAOSDateDisplay.time) return window.HAOSDateDisplay.time(value, raw || value);
    const d = parseDate(value);
    if (!d) return '';
    if (!hasTime(raw || value)) return '';
    return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')} น.`;
  }

  function formatThaiDateTime(value) {
    const d = parseDate(value);
    if (!d) return clean(value) || '-';
    const time = formatThaiTime(d, value);
    return time ? `${formatThaiDate(d)} ${time}` : formatThaiDate(d);
  }

  function formatRangeParts(item) {
    const sRaw = startRaw(item);
    const eRaw = endRaw(item);
    const start = dateOf(item);
    const end = endOf(item);
    const startDate = start ? formatThaiDate(start) : (clean(sRaw) || '-');
    const startTime = start ? formatThaiTime(start, sRaw) : '';
    let endText = '';
    if (end) {
      const endTime = formatThaiTime(end, eRaw);
      const endDate = formatThaiDate(end);
      if (sameDay(start, end)) endText = endTime ? `ถึง ${endTime}` : '';
      else endText = `ถึง ${endDate}${endTime ? ' ' + endTime : ''}`;
    }
    return { startDate, startTime, endText };
  }

  function formatRangePlain(item) {
    const p = formatRangeParts(item);
    return [p.startDate, p.startTime, p.endText].filter(Boolean).join(' ');
  }

  function nativeId(item) {
    return clean(item && (item.id || item.publicId || item.eventId || item.scheduleId || item.__id));
  }

  function scopeOf(item) {
    const raw = clean(item && (item.__scope || item.scope || item.scheduleScope || item.visibility));
    if (/dept|department|group|กลุ่มงาน/i.test(raw)) return 'dept';
    if (/my|personal|private|ส่วนตัว/i.test(raw)) return 'my';
    return phone(item && (item.ownerPhone || item.createdByPhone || item.userPhone)) === userKey() ? 'my' : 'dept';
  }

  function pins() {
    try { return new Set(JSON.parse(localStorage.getItem('haos_schedule_pins_v737_' + userKey()) || '[]').map(String)); }
    catch (e) { return new Set(); }
  }

  function savePins(set) {
    try { localStorage.setItem('haos_schedule_pins_v737_' + userKey(), JSON.stringify(Array.from(set || []))); }
    catch (e) {}
  }

  function priorityOf(item) {
    return core().priorityOf ? core().priorityOf(item) : clean(item && (item.__priority || item.priority || item.eventPriority || item.workPriority)) || 'ปกติ';
  }

  function priorityTone(item) {
    return core().priorityTone ? core().priorityTone(item) : (/ด่วนมาก|critical|สูงมาก/i.test(priorityOf(item)) ? 'critical' : (/ด่วน|urgent|high/i.test(priorityOf(item)) ? 'urgent' : ''));
  }

  function tagsOf(item) {
    if (core().tagsOf) return core().tagsOf(item);
    const raw = item && (item.__tags || item.tags || item.eventTags || item.workTags || '');
    if (Array.isArray(raw)) return raw.map(clean).filter(Boolean);
    return String(raw || '').split(/\n|,/).map(clean).filter(Boolean);
  }

  function stripDeptPrefix(value) {
    try {
      if (typeof window.stripDepartmentPrefixV749 === 'function') return window.stripDepartmentPrefixV749(value);
      if (typeof window.stripDepartmentPrefixV748 === 'function') return window.stripDepartmentPrefixV748(value);
    } catch (e) {}
    return clean(String(value ?? '').replace(/(^|[\s([,|•])\d{1,3}[\s\u00a0]+(?=(?:กลุ่มงาน|สำนักงาน|นพ\.?\s*สสจ\.?\s*นย\.?|นพ\.สสจ\.นย\.|รอง|ผู้ช่วย))/gu, '$1').replace(/^\s*\d{1,3}[\s\u00a0]+/u, ''));
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

  function canEdit(item) {
    if (!item) return false;
    if (isAdmin()) return true;
    return scopeOf(item) === 'my' || phone(item.ownerPhone || item.createdByPhone || item.userPhone) === userKey();
  }

  function actionHtml(item) {
    const id = nativeId(item);
    if (!id) return '<span class="text-muted">-</span>';
    const pinned = pins().has(id);
    let html = `<button class="btn btn-sm ${pinned ? 'btn-warning' : 'btn-outline-warning'}" onclick='toggleSchedulePinV737(${jsArg(id)})' title="ปักหมุดงาน"><i class="bi ${pinned ? 'bi-star-fill' : 'bi-star'}"></i></button>`;
    html += `<button class="btn btn-outline-info btn-sm text-dark" onclick='viewScheduleDetail(${jsArg(id)})' title="ดูรายละเอียด"><i class="bi bi-eye"></i></button>`;
    if (canEdit(item) && typeof window.editSchedule === 'function') html += `<button class="btn btn-outline-warning btn-sm text-dark" onclick='editSchedule(${jsArg(id)})' title="แก้ไข"><i class="bi bi-pencil"></i></button>`;
    if (canEdit(item) && typeof window.handleDelete === 'function') html += `<button class="btn btn-outline-danger btn-sm" onclick='handleDelete(${jsArg(id)})' title="ลบ"><i class="bi bi-trash"></i></button>`;
    return `<div class="haos-v782-actions">${html}</div>`;
  }

  function chipHtml(item) {
    const scope = scopeOf(item);
    const tone = priorityTone(item);
    const priorityClass = tone === 'critical' ? 'priority-critical' : (tone === 'urgent' ? 'priority-urgent' : 'priority-normal');
    const scopeChip = `<span class="haos-v782-chip ${scope === 'dept' ? 'scope-dept' : 'scope-my'}"><i class="bi ${scope === 'dept' ? 'bi-people' : 'bi-person'}"></i>${scope === 'dept' ? 'กลุ่มงาน' : 'ส่วนตัว'}</span>`;
    const priorityChip = `<span class="haos-v782-chip ${priorityClass}"><i class="bi bi-flag"></i>${esc(priorityOf(item))}</span>`;
    const tagChips = tagsOf(item).map((tag) => `<span class="haos-v782-chip tag">${esc(tag)}</span>`).join('');
    return `<div class="haos-v782-chip-row">${scopeChip}${priorityChip}${tagChips}</div>`;
  }

  function ellipsis(text, limit) {
    const value = clean(text);
    if (!value || value.length <= limit) return value;
    return value.slice(0, Math.max(0, limit - 1)).trimEnd() + '...';
  }

  function titleHtml(item, options = {}) {
    const title = item.__title || item.eventName || item.title || item.name || '-';
    const details = ellipsis(item.details || item.detail || item.description || '', options.compact ? 68 : 130);
    const fileIcon = item.fileUrl ? '<i class="bi bi-paperclip text-primary ms-1" title="มีไฟล์แนบ"></i>' : '';
    const todayBadge = sameDay(dateOf(item), new Date()) ? '<span class="badge bg-primary ms-2">วันนี้</span>' : '';
    return `<div class="haos-v782-title">${esc(title)}${fileIcon}${todayBadge}</div>${details ? `<div class="haos-v782-subline">${esc(details)}</div>` : ''}${chipHtml(item)}`;
  }

  function timeHtml(item) {
    const p = formatRangeParts(item);
    return `<div class="haos-v782-date"><i class="bi bi-calendar3"></i> ${esc(p.startDate)}</div>${p.startTime ? `<div class="haos-v782-time"><i class="bi bi-clock"></i> ${esc(p.startTime)}</div>` : ''}${p.endText ? `<div class="haos-v782-end">${esc(p.endText)}</div>` : ''}`;
  }

  function rowHtml(item) {
    const scope = scopeOf(item);
    const tone = priorityTone(item);
    const id = nativeId(item);
    const rowClasses = [
      'haos-v782-row',
      scope === 'dept' ? 'haos-v782-row-dept' : 'haos-v782-row-my',
      tone === 'critical' ? 'haos-v782-row-critical' : (tone === 'urgent' ? 'haos-v782-row-urgent' : ''),
      sameDay(dateOf(item), new Date()) ? 'haos-v782-row-today' : '',
      pins().has(id) ? 'haos-v782-row-pinned' : ''
    ].filter(Boolean).join(' ');
    const location = stripDeptPrefix(item.__location || item.location || item.eventLocation || '-');
    const owner = item.__ownerName || item.ownerName || item.createdBy || item.assigneeName || '-';
    const dept = stripDeptPrefix(item.department || item.ownerDepartment || '');
    const status = item.__status || item.workStatus || item.status || '-';
    return `<tr class="${rowClasses}">
      <td>${titleHtml(item)}</td>
      <td><div class="haos-v782-location"><i class="bi bi-geo-alt"></i> ${esc(location)}</div></td>
      <td>${timeHtml(item)}</td>
      <td><div class="haos-v782-owner">${esc(owner)}</div>${dept ? `<small class="text-muted">${esc(dept)}</small>` : ''}</td>
      <td><span class="badge haos-v782-status ${badgeClass(status)}">${esc(status)}</span></td>
      <td class="text-end">${actionHtml(item)}</td>
    </tr>`;
  }

  function cardHtml(item) {
    const scope = scopeOf(item);
    const tone = priorityTone(item);
    const status = item.__status || item.workStatus || item.status || '-';
    const location = stripDeptPrefix(item.__location || item.location || item.eventLocation || '-');
    const owner = item.__ownerName || item.ownerName || item.createdBy || item.assigneeName || '-';
    const classes = ['haos-v782-card', scope === 'dept' ? 'is-dept' : '', tone === 'urgent' ? 'is-urgent' : '', tone === 'critical' ? 'is-critical' : ''].filter(Boolean).join(' ');
    return `<article class="${classes}">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>${titleHtml(item, { compact: true })}</div>
        <span class="badge haos-v782-status ${badgeClass(status)}">${esc(status)}</span>
      </div>
      <div class="haos-v782-card-meta">
        <div><small>วัน-เวลา</small>${timeHtml(item)}</div>
        <div><small>สถานที่</small>${esc(location)}</div>
        <div><small>ผู้สร้าง/เจ้าของ</small>${esc(owner)}</div>
      </div>
      ${actionHtml(item)}
    </article>`;
  }

  function pagerHtml(query) {
    if (!query || query.total <= query.pageSize) return '';
    return `<div class="haos-v739-pager"><span>แสดง ${query.start + 1}-${query.end} จาก ${query.total} รายการ</span><button type="button" class="btn btn-sm btn-outline-primary" ${query.page <= 1 ? 'disabled' : ''} onclick="setSchedulePageV739(${query.page - 1})"><i class="bi bi-chevron-left"></i></button><span>หน้า ${query.page}/${query.pages}</span><button type="button" class="btn btn-sm btn-outline-primary" ${query.page >= query.pages ? 'disabled' : ''} onclick="setSchedulePageV739(${query.page + 1})"><i class="bi bi-chevron-right"></i></button></div>`;
  }

  function summaryStrip(query) {
    const todayCount = (query.filtered || []).filter((item) => sameDay(dateOf(item), new Date())).length;
    return `<div class="haos-v737-today-strip"><i class="bi bi-calendar-check"></i> วันนี้มีงานตามตัวกรอง ${todayCount} รายการ</div>`;
  }

  function emptyHtml() {
    const status = $('unifiedScheduleStatusV702')?.value || '';
    if (status === inProgress()) {
      return '<div class="haos-v759-empty-note"><i class="bi bi-info-circle"></i> ตารางนี้แสดงเฉพาะงานสถานะ “อยู่ระหว่างการดำเนินการ” ถ้าว่างไม่ได้แปลว่างานหาย ให้กดแสดงตัวกรองแล้วเลือกสถานะทั้งหมด</div>';
    }
    return '<div class="text-muted small p-3">ไม่พบรายการตามเงื่อนไข</div>';
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
    qa('#unifiedScheduleViewToolsV702 .btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === mode));
  }

  function hideLegacyTables() {
    [$('scheduleListDiv')?.closest('.card'), $('departmentScheduleTable')?.closest('.card')].forEach((card) => {
      if (card) card.classList.add('d-none');
    });
    $('calendarDiv')?.classList.add('d-none');
  }

  function ensureLegend() {
    const tools = $('unifiedScheduleViewToolsV702');
    if (tools && !$('haosScheduleLegendV739')) {
      tools.insertAdjacentHTML('beforeend', '<span id="haosScheduleLegendV739" class="haos-v739-schedule-legend"><span class="my"><i></i> ส่วนตัว</span><span class="dept"><i></i> กลุ่มงาน</span></span>');
    }
    const scope = $('unifiedScheduleScopeV702');
    const legend = $('haosScheduleLegendV739');
    if (!scope || !legend) return;
    [['.my', 'my'], ['.dept', 'dept']].forEach(([sel, value]) => {
      const el = legend.querySelector(sel);
      if (!el) return;
      el.classList.toggle('active', scope.value === value);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.title = value === 'my' ? 'แสดงเฉพาะงานส่วนตัว' : 'แสดงเฉพาะงานกลุ่มงาน';
      if (el.dataset.haosV782LegendHook) return;
      el.dataset.haosV782LegendHook = '1';
      const run = () => {
        scope.value = scope.value === value ? '' : value;
        window.haosSchedulePageV739 = 1;
        render();
      };
      el.addEventListener('click', run);
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          run();
        }
      });
    });
  }

  function renderList(query) {
    const box = $('unifiedScheduleListV702');
    if (!box) return;
    const rows = query.items.length ? query.items.map(rowHtml).join('') : `<tr><td colspan="6" class="text-center text-muted py-4">${emptyHtml()}</td></tr>`;
    box.innerHTML = summaryStrip(query) + '<div class="table-responsive"><table class="table haos-v782-schedule-table align-middle small"><thead><tr><th>เรื่อง</th><th>สถานที่</th><th>ช่วงเวลา</th><th>ผู้สร้าง/เจ้าของ</th><th>สถานะ</th><th class="text-end">จัดการ</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + pagerHtml(query);
  }

  function renderCards(query) {
    const box = $('unifiedScheduleCardV702');
    if (!box) return;
    box.innerHTML = summaryStrip(query) + (query.items.length ? query.items.map(cardHtml).join('') : emptyHtml()) + pagerHtml(query);
  }

  function renderCalendar(query) {
    const box = $('unifiedScheduleCalendarV702');
    if (!box) return;
    box.innerHTML = '<div id="unifiedScheduleCalendarInnerV782"></div>';
    if (window.haosUnifiedScheduleCalendarV702) {
      try { window.haosUnifiedScheduleCalendarV702.destroy(); } catch (e) {}
      window.haosUnifiedScheduleCalendarV702 = null;
    }
    if (!window.FullCalendar) {
      box.innerHTML = '<div class="text-center text-muted py-4">ยังไม่พบเครื่องมือปฏิทิน กรุณาโหลดหน้าใหม่</div>';
      return;
    }
    const p = pins();
    const events = (query.sorted || []).map((item) => {
      const d = dateOf(item);
      const id = nativeId(item);
      if (!d) return null;
      const tone = priorityTone(item);
      const title = `${p.has(id) ? '★ ' : ''}${formatThaiTime(d, startRaw(item)) ? formatThaiTime(d, startRaw(item)) + ' ' : ''}${item.__title || item.eventName || item.title || '-'}`;
      return {
        title,
        start: d,
        end: endOf(item) || undefined,
        allDay: !formatThaiTime(d, startRaw(item)),
        backgroundColor: tone === 'critical' ? '#dc2626' : (tone === 'urgent' ? '#f97316' : (scopeOf(item) === 'dept' ? '#059669' : '#2563eb')),
        borderColor: 'transparent',
        extendedProps: { id }
      };
    }).filter(Boolean);
    const cal = new FullCalendar.Calendar($('unifiedScheduleCalendarInnerV782'), {
      initialView: 'dayGridMonth',
      locale: 'th',
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' },
      displayEventTime: false,
      events,
      eventClick: (info) => {
        info.jsEvent && info.jsEvent.preventDefault();
        const id = info.event.extendedProps && info.event.extendedProps.id;
        if (id) showSchedulePopupDetail(id);
      }
    });
    cal.render();
    window.haosUnifiedScheduleCalendarV702 = cal;
  }

  function state() {
    if (core().applyDomDefaults) core().applyDomDefaults();
    const s = core().stateFromDom ? core().stateFromDom() : { view: window.haosUnifiedScheduleModeV702 || 'list', page: window.haosSchedulePageV739 || 1, pageSize: 20 };
    const statusEl = $('unifiedScheduleStatusV702');
    if (statusEl) s.status = statusEl.value;
    const scopeEl = $('unifiedScheduleScopeV702');
    if (scopeEl) s.scope = scopeEl.value;
    const sortEl = $('unifiedScheduleSortV702');
    if (sortEl) s.sort = sortEl.value || 'upcoming';
    const priorityEl = $('unifiedSchedulePriorityV706');
    if (priorityEl) s.priority = priorityEl.value || '';
    const tagEl = $('unifiedScheduleTagV706');
    if (tagEl) s.tag = tagEl.value || '';
    return s;
  }

  function render() {
    const shell = $('haosUnifiedScheduleViewV702');
    if (!shell || !core().query) {
      if (typeof previousRender === 'function') return previousRender.apply(this, arguments);
      return false;
    }
    hideLegacyTables();
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

  function allSchedules() {
    if (core().readAll) return core().readAll();
    const list = [];
    try { (window.mySchedulesGlobal || []).forEach((item) => list.push(Object.assign({ __scope: 'my' }, item))); } catch (e) {}
    try { (window.departmentSchedulesGlobal || []).forEach((item) => list.push(Object.assign({ __scope: 'dept' }, item))); } catch (e) {}
    const seen = new Set();
    return list.filter((item, index) => {
      const key = nativeId(item) || JSON.stringify([item.eventName, startRaw(item), index]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function itemById(id) {
    return allSchedules().find((item) => String(nativeId(item)) === String(id));
  }

  function fileHtml(item) {
    if (!item.fileUrl) return 'ไม่มีไฟล์แนบ';
    return `<a href="${esc(item.fileUrl)}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark-text"></i> เปิดไฟล์เอกสาร</a>`;
  }

  function showSchedulePopupDetail(id) {
    const item = itemById(id);
    if (!item) return;
    $('haosScheduleDetailBackdropV782')?.remove();
    const title = item.__title || item.eventName || item.title || '-';
    const status = item.__status || item.workStatus || item.status || '-';
    const location = stripDeptPrefix(item.__location || item.location || item.eventLocation || '-');
    const details = item.details || item.detail || item.description || '-';
    const html = `<div id="haosScheduleDetailBackdropV782" class="haos-v782-detail-backdrop" onclick="if(event.target.id==='haosScheduleDetailBackdropV782')this.remove()">
      <article class="haos-v782-detail">
        <div class="haos-v782-detail-head">
          <div><h5>${esc(title)}</h5><div class="small opacity-75">${esc(formatRangePlain(item) || 'ไม่ระบุเวลา')}</div></div>
          <button type="button" class="haos-v782-detail-close" onclick="document.getElementById('haosScheduleDetailBackdropV782')?.remove()">×</button>
        </div>
        <div class="haos-v782-detail-body">
          <div class="haos-v782-detail-grid">
            <div><small>วัน-เวลา</small>${esc(formatRangePlain(item) || '-')}</div>
            <div><small>สถานที่</small>${esc(location)}</div>
            <div><small>สถานะ</small>${esc(status)}</div>
            <div><small>ผู้สร้าง/เจ้าของ</small>${esc(item.__ownerName || item.ownerName || item.createdBy || '-')}</div>
          </div>
          <div class="border rounded-4 p-3 bg-light"><b>รายละเอียด</b><div class="mt-2" style="white-space:pre-wrap">${esc(details)}</div></div>
          ${item.meetingLink ? `<div class="border rounded-4 p-3 bg-light mt-2"><b>ลิงก์ประชุม</b><div class="mt-2 text-break"><a href="${esc(item.meetingLink)}" target="_blank">${esc(item.meetingLink)}</a></div></div>` : ''}
          <div class="d-flex justify-content-end gap-2 mt-3"><button class="btn btn-outline-secondary" onclick="document.getElementById('haosScheduleDetailBackdropV782')?.remove()">ปิดรายละเอียด</button></div>
        </div>
      </article>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function viewScheduleDetail(id) {
    const item = itemById(id);
    if (!item) {
      if (typeof previousDetail === 'function') return previousDetail.apply(this, arguments);
      return window.Swal?.fire('ไม่พบข้อมูล', 'ไม่พบรายละเอียดตารางงานนี้ กรุณากดโหลดรายการใหม่อีกครั้ง', 'warning');
    }
    if (document.querySelector('.swal2-container.swal2-shown')) return showSchedulePopupDetail(id);
    const modal = $('scheduleDetailModal');
    if (!modal || !window.bootstrap) return showSchedulePopupDetail(id);
    const title = item.__title || item.eventName || item.title || '-';
    const status = item.__status || item.workStatus || item.status || 'อยู่ระหว่างการดำเนินการ';
    const location = item.__location || item.location || item.eventLocation || '-';
    $('sdTitle') && ($('sdTitle').innerHTML = '<i class="bi bi-calendar-event"></i> ' + esc(title));
    $('sdCaptureTitle') && ($('sdCaptureTitle').innerText = title);
    $('sdWorkStatus') && ($('sdWorkStatus').innerText = status);
    $('sdTime') && ($('sdTime').innerText = formatRangePlain(item) || '-');
    $('sdLocation') && ($('sdLocation').innerText = location);
    $('sdDetails') && ($('sdDetails').innerText = item.details || item.detail || item.description || '-');
    $('sdLink') && ($('sdLink').innerHTML = item.meetingLink ? `<a href="${esc(item.meetingLink)}" target="_blank" class="text-break">${esc(item.meetingLink)}</a>` : '-');
    $('sdFile') && ($('sdFile').innerHTML = fileHtml(item));
    $('sdPublicId') && ($('sdPublicId').value = item.publicId || item.id || nativeId(item));
    try {
      const instance = window.bootstrap.Modal.getOrCreateInstance(modal);
      instance.show();
    } catch (e) {
      showSchedulePopupDetail(id);
    }
  }

  function openCalendarPopup() {
    const renderPopup = () => {
      const list = allSchedules().filter((item) => dateOf(item)).sort((a, b) => dateOf(a) - dateOf(b));
      const upcoming = list.filter((item) => dateOf(item) >= new Date(Date.now() - 86400000)).slice(0, 14);
      const side = upcoming.length ? upcoming.map((item) => {
        const id = nativeId(item);
        return `<button type="button" class="haos-v745-calendar-item w-100 text-start border-0" onclick="window.HAOS.scheduleThaiList.showDetail(${jsArg(id)})"><b>${esc(item.__title || item.eventName || item.title || '-')}</b><div class="small text-muted"><i class="bi bi-clock"></i> ${esc(formatRangePlain(item) || '-')} | ${esc(item.__location || item.location || item.eventLocation || '-')}</div></button>`;
      }).join('') : '<div class="text-muted text-center py-3">ยังไม่มีตารางงานสำหรับแสดง</div>';
      const html = `<div class="haos-v745-calendar-wrap"><div id="haosSchedulePopupCalendarV782"></div><div class="haos-v745-calendar-list">${side}</div></div>`;
      window.Swal.fire({
        title: 'ปฏิทินตารางงาน & นัดหมาย',
        width: 1120,
        html,
        showCloseButton: true,
        confirmButtonText: 'ปิด',
        didOpen: () => {
          const el = $('haosSchedulePopupCalendarV782');
          if (!el || !window.FullCalendar) return;
          const events = list.map((item) => {
            const start = dateOf(item);
            if (!start) return null;
            const tone = priorityTone(item);
            const time = formatThaiTime(start, startRaw(item));
            return {
              title: `${time ? time + ' ' : ''}${item.__title || item.eventName || item.title || '-'}`,
              start,
              end: endOf(item) || undefined,
              allDay: !time,
              backgroundColor: tone === 'critical' ? '#dc2626' : (tone === 'urgent' ? '#f97316' : (scopeOf(item) === 'dept' ? '#059669' : '#2563eb')),
              borderColor: 'transparent',
              extendedProps: { id: nativeId(item) }
            };
          }).filter(Boolean);
          const cal = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth',
            locale: 'th',
            height: 560,
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' },
            displayEventTime: false,
            events,
            eventClick: (info) => {
              info.jsEvent && info.jsEvent.preventDefault();
              showSchedulePopupDetail(info.event.extendedProps.id);
            }
          });
          cal.render();
        }
      });
    };
    if (!allSchedules().length) {
      try {
        window.loadMySchedules && window.loadMySchedules();
        window.loadDepartmentSchedules && window.loadDepartmentSchedules();
      } catch (e) {}
      setTimeout(renderPopup, 900);
    } else {
      renderPopup();
    }
  }

  const previousRender = window.renderUnifiedScheduleV702;
  const previousSetView = window.setUnifiedScheduleViewV702;
  const previousDetail = window.viewScheduleDetail;
  const previousCalendarPopup = window.openScheduleCalendarPopupV745;

  window.renderUnifiedScheduleV702 = function renderUnifiedScheduleV782() {
    return render.apply(this, arguments);
  };

  window.setUnifiedScheduleViewV702 = function setUnifiedScheduleViewV782(mode) {
    window.haosUnifiedScheduleModeV702 = mode || 'list';
    window.haosSchedulePageV739 = 1;
    render();
  };

  window.setSchedulePageV739 = function setSchedulePageV782(page) {
    window.haosSchedulePageV739 = Number(page) || 1;
    render();
  };

  window.toggleSchedulePinV737 = function toggleSchedulePinV782(id) {
    const set = pins();
    const key = String(id || '');
    set.has(key) ? set.delete(key) : set.add(key);
    savePins(set);
    render();
  };

  window.viewScheduleDetail = viewScheduleDetail;
  window.showSchedulePopupDetailV749 = showSchedulePopupDetail;
  window.showSchedulePopupDetailV782 = showSchedulePopupDetail;
  window.openScheduleCalendarPopupV745 = openCalendarPopup;

  function wrapLoader(name) {
    const old = window[name];
    if (typeof old !== 'function' || old.__haosV782Wrapped) return;
    const wrapped = function () {
      const result = old.apply(this, arguments);
      setTimeout(() => { try { render(); } catch (e) {} }, 850);
      setTimeout(() => { try { render(); } catch (e) {} }, 1600);
      return result;
    };
    wrapped.__haosV782Wrapped = true;
    window[name] = wrapped;
  }

  function boot() {
    wrapLoader('loadMySchedules');
    wrapLoader('loadDepartmentSchedules');
    ensureLegend();
    render();
    qa('button[onclick*="toggleCalendarView"],button[onclick*="openScheduleCalendarPopupV745"]').filter((btn) => btn.querySelector('.bi-calendar3')).forEach((btn) => {
      btn.onclick = () => window.openScheduleCalendarPopupV745();
      btn.setAttribute('onclick', 'openScheduleCalendarPopupV745()');
    });
  }

  root.scheduleThaiList = {
    version: PATCH,
    formatThaiDate,
    formatThaiTime,
    formatThaiDateTime,
    formatRangePlain,
    parseDate,
    render,
    showDetail: showSchedulePopupDetail,
    diagnostics: () => ({
      patch: PATCH,
      previousRender: typeof previousRender,
      previousSetView: typeof previousSetView,
      previousDetail: typeof previousDetail,
      previousCalendarPopup: typeof previousCalendarPopup,
      core: core().version || '',
      count: allSchedules().length
    })
  };
  window.haosScheduleThaiListDiagnosticsV782 = root.scheduleThaiList.diagnostics;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setTimeout(boot, 1000);
  console.info('HAOS ' + PATCH + ' loaded');
})();
