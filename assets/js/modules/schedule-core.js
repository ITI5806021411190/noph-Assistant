(function(){
  const PATCH = 'v70.69-schedule-core-stabilizer';
  if (window.__HAOS_V769_SCHEDULE_CORE__) return;
  window.__HAOS_V769_SCHEDULE_CORE__ = true;

  const root = window.HAOS = window.HAOS || {};
  const previous = root.schedule || {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const phone = value => String(value || '').replace(/'/g, '').replace(/\D/g, '').trim();
  const getUser = () => {
    try { return window.user || user || {}; } catch (e) { return window.user || {}; }
  };

  const STATUS_IN_PROGRESS = 'อยู่ระหว่างการดำเนินการ';
  const DEFAULT_STATE = Object.freeze({
    q: '',
    scope: '',
    status: STATUS_IN_PROGRESS,
    period: '',
    priority: '',
    tag: '',
    sort: 'dateDesc',
    page: 1,
    pageSize: 20,
    view: 'list'
  });

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;
    const text = String(value || '').trim();
    if (!text) return null;
    const normalized = text
      .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, (m, d, mo, y) => {
        const year = Number(y) > 2400 ? Number(y) - 543 : Number(y);
        return `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      })
      .replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!isNaN(parsed)) return parsed;
    const fallback = new Date(text);
    return isNaN(fallback) ? null : fallback;
  }

  function dateValue(item) {
    return parseDate(item && (item.rawStartTime || item.startDate || item.eventDate || item.date || item.start || item.startTime || item.createdAt));
  }

  function endDateValue(item) {
    return parseDate(item && (item.rawEndTime || item.endTime || item.end));
  }

  function sameDay(a, b) {
    a = parseDate(a); b = parseDate(b);
    return !!(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
  }

  function scopeOf(item) {
    const raw = clean(item && (item.__scope || item.scope || item.scheduleScope || item.visibility));
    if (/dept|department|group|กลุ่มงาน/i.test(raw)) return 'dept';
    if (/my|personal|private|ส่วนตัว/i.test(raw)) return 'my';
    return item && item.ownerPhone && phone(item.ownerPhone) === phone(getUser().phone) ? 'my' : 'dept';
  }

  function idOf(item, index) {
    return clean(item && (item.id || item.publicId || item.eventId || item.scheduleId)) || `schedule_${index}`;
  }

  function titleOf(item) {
    return clean(item && (item.eventName || item.title || item.name || item.subject)) || '-';
  }

  function priorityOf(item) {
    return clean(item && (item.priority || item.eventPriority || item.workPriority)) || 'ปกติ';
  }

  function tagsOf(item) {
    const raw = item && (item.tags || item.eventTags || item.workTags || '');
    if (Array.isArray(raw)) return raw.map(clean).filter(Boolean);
    return String(raw || '').split(/\n|,/).map(clean).filter(Boolean);
  }

  function priorityTone(item) {
    const text = priorityOf(item).toLowerCase();
    if (text.includes('ด่วนมาก') || text.includes('critical') || text.includes('สูงมาก')) return 'critical';
    if (text.includes('ด่วน') || text.includes('urgent') || text.includes('high')) return 'urgent';
    return '';
  }

  function normalize(item, index, forcedScope) {
    item = item || {};
    const scope = forcedScope || scopeOf(item);
    return Object.assign({}, item, {
      id: idOf(item, index),
      __scope: scope,
      __title: titleOf(item),
      __date: dateValue(item),
      __endDate: endDateValue(item),
      __status: clean(item.workStatus || item.status || ''),
      __priority: priorityOf(item),
      __tags: tagsOf(item),
      __ownerPhone: phone(item.ownerPhone || item.createdByPhone || item.userPhone),
      __ownerName: clean(item.ownerName || item.createdBy || item.assigneeName),
      __location: clean(item.location || item.eventLocation),
      __tone: priorityTone(item)
    });
  }

  function readAll() {
    const rows = [];
    try { (window.mySchedulesGlobal || []).forEach((item, i) => rows.push(normalize(item, i, 'my'))); } catch (e) {}
    try { (window.departmentSchedulesGlobal || []).forEach((item, i) => rows.push(normalize(item, i, 'dept'))); } catch (e) {}
    const seen = new Set();
    return rows.filter((item, index) => {
      const key = `${item.id}|${item.__scope}|${item.__date ? item.__date.getTime() : index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function periodPass(item, period) {
    if (!period) return true;
    const d = item.__date || dateValue(item);
    if (!d) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((target - today) / 86400000);
    if (period === 'today') return diff === 0;
    if (period === 'week') return diff >= 0 && diff <= 7;
    if (period === 'month') return diff >= 0 && diff <= 30;
    if (period === 'past') return diff < 0;
    return true;
  }

  function pins() {
    try {
      const key = 'haos_schedule_pins_v737_' + (phone(getUser().phone) || 'anon');
      return new Set(JSON.parse(localStorage.getItem(key) || '[]').map(String));
    } catch (e) {
      return new Set();
    }
  }

  function normalizeState(input) {
    return Object.assign({}, DEFAULT_STATE, input || {});
  }

  function filter(list, state) {
    state = normalizeState(state);
    const q = clean(state.q).toLowerCase();
    return (Array.isArray(list) ? list : []).filter(item => {
      item = item && item.__title ? item : normalize(item);
      if (state.scope && item.__scope !== state.scope) return false;
      if (state.status && clean(item.__status) !== clean(state.status)) return false;
      if (state.priority && clean(item.__priority) !== clean(state.priority)) return false;
      if (state.tag && item.__tags.indexOf(state.tag) < 0) return false;
      if (!periodPass(item, state.period)) return false;
      if (q) {
        const hay = [
          item.__title, item.details, item.description, item.__location, item.__ownerName,
          item.__status, item.__priority, item.__tags.join(' '), item.startTime
        ].map(clean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sort(list, state) {
    state = normalizeState(state);
    const pinned = pins();
    const today = new Date();
    return (Array.isArray(list) ? list.slice() : []).sort((a, b) => {
      const pa = pinned.has(String(a.id || a.publicId || '')) ? 1 : 0;
      const pb = pinned.has(String(b.id || b.publicId || '')) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ta = sameDay(a.__date || dateValue(a), today) ? 1 : 0;
      const tb = sameDay(b.__date || dateValue(b), today) ? 1 : 0;
      if (ta !== tb) return tb - ta;
      if (state.sort === 'name') return titleOf(a).localeCompare(titleOf(b), 'th');
      const da = (a.__date || dateValue(a) || 0).getTime ? (a.__date || dateValue(a)).getTime() : 0;
      const db = (b.__date || dateValue(b) || 0).getTime ? (b.__date || dateValue(b)).getTime() : 0;
      if (state.sort === 'dateAsc' || state.sort === 'oldest') return da - db;
      return db - da;
    });
  }

  function paginate(list, state) {
    state = normalizeState(state);
    const total = Array.isArray(list) ? list.length : 0;
    const pageSize = Math.max(1, Number(state.pageSize || 20));
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, Number(state.page || 1)), pages);
    const start = (page - 1) * pageSize;
    return { items: (list || []).slice(start, start + pageSize), total, page, pageSize, pages, start, end: Math.min(total, start + pageSize) };
  }

  function stateFromDom() {
    const byId = id => document.getElementById(id);
    return normalizeState({
      q: byId('unifiedScheduleSearchV702')?.value || byId('scheduleSearch')?.value || '',
      scope: byId('unifiedScheduleScopeV702')?.value || '',
      status: byId('unifiedScheduleStatusV702')?.value || byId('scheduleStatusFilter')?.value || STATUS_IN_PROGRESS,
      period: byId('unifiedSchedulePeriodV702')?.value || byId('schedulePeriodFilter')?.value || '',
      priority: byId('unifiedSchedulePriorityV706')?.value || '',
      tag: byId('unifiedScheduleTagV706')?.value || '',
      sort: byId('unifiedScheduleSortV702')?.value || byId('scheduleSort')?.value || 'dateDesc',
      page: window.haosSchedulePageV739 || 1,
      view: window.haosUnifiedScheduleModeV702 || 'list'
    });
  }

  function query(state) {
    const base = readAll();
    const filtered = filter(base, state);
    const sorted = sort(filtered, state);
    return Object.assign({ all: base, filtered, sorted }, paginate(sorted, state));
  }

  function applyDomDefaults() {
    const status = document.getElementById('unifiedScheduleStatusV702');
    if (status && !status.value && !status.dataset.haosCoreDefaulted) {
      status.value = STATUS_IN_PROGRESS;
      status.dataset.haosCoreDefaulted = '1';
      status.title = 'ค่าเริ่มต้นแสดงเฉพาะงานที่อยู่ระหว่างการดำเนินการ หากรายการว่างให้เปิดตัวกรองแล้วเลือกสถานะทั้งหมด';
    }
    ['unifiedScheduleSortV702', 'scheduleSort'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = 'dateDesc';
    });
  }

  function diagnostics() {
    const names = ['loadMySchedules', 'loadDepartmentSchedules', 'renderUnifiedScheduleV702', 'openScheduleCalendarPopupV745', 'viewScheduleDetail'];
    return {
      patch: PATCH,
      globals: Object.fromEntries(names.map(name => [name, typeof window[name]])),
      counts: {
        personal: (window.mySchedulesGlobal || []).length || 0,
        department: (window.departmentSchedulesGlobal || []).length || 0,
        combined: readAll().length
      },
      state: stateFromDom()
    };
  }

  function boot() {
    applyDomDefaults();
  }

  root.schedule = Object.assign({}, previous, {
    version: PATCH,
    STATUS_IN_PROGRESS,
    normalize,
    readAll,
    stateFromDom,
    query,
    filter,
    sort,
    paginate,
    parseDate,
    sameDay,
    priorityOf,
    tagsOf,
    priorityTone,
    escape: esc,
    applyDomDefaults,
    diagnostics
  });

  window.HAOSScheduleCore = root.schedule;
  window.haosScheduleDiagnosticsV769 = diagnostics;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setTimeout(boot, 800);
  console.info('HAOS ' + PATCH + ' loaded');
})();
