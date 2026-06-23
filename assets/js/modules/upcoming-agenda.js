(function () {
  'use strict';

  const PATCH = 'v70.87-upcoming-agenda';
  if (window.__HAOS_V787_UPCOMING_AGENDA__) return;
  window.__HAOS_V787_UPCOMING_AGENDA__ = true;

  const LOOKAHEAD_OPTIONS = [3];
  const LOOKAHEAD_KEY = 'haos_upcoming_agenda_lookahead_days_v796';
  function readLookaheadDays() {
    return 3;
  }
  let LOOKAHEAD_DAYS = readLookaheadDays();
  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();

  function api() {
    return window.HAOSScheduleCore || (window.HAOS && window.HAOS.schedule) || null;
  }

  function dateApi() {
    return window.HAOSDateDisplay || null;
  }

  function parseDate(value) {
    const D = dateApi();
    if (D && typeof D.parseDate === 'function') return D.parseDate(value);
    const A = api();
    if (A && typeof A.parseDate === 'function') return A.parseDate(value);
    const d = new Date(String(value || '').replace(' ', 'T'));
    return isNaN(d) ? null : d;
  }

  function startOfDay(value) {
    const d = value instanceof Date ? value : parseDate(value);
    if (!d) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function todayStart() {
    return startOfDay(new Date());
  }

  function diffDaysFromToday(date) {
    const target = startOfDay(date);
    const today = todayStart();
    if (!target || !today) return null;
    return Math.floor((target.getTime() - today.getTime()) / 86400000);
  }

  function titleOf(item) {
    return clean(item && (item.__title || item.eventName || item.title || item.name || item.subject)) || '-';
  }

  function locationOf(item) {
    return clean(item && (item.__location || item.location || item.eventLocation)) || '-';
  }

  function statusOf(item) {
    return clean(item && (item.__status || item.workStatus || item.status)) || '-';
  }

  function priorityOf(item) {
    const A = api();
    if (A && typeof A.priorityOf === 'function') return A.priorityOf(item);
    return clean(item && (item.__priority || item.priority || item.eventPriority || item.workPriority)) || 'ปกติ';
  }

  function scopeOf(item) {
    return clean(item && (item.__scope || item.scope || item.scheduleScope)) === 'dept' ? 'dept' : 'my';
  }

  function scheduleId(item) {
    return clean(item && (item.id || item.publicId || item.eventId || item.scheduleId));
  }

  function startDate(item) {
    return item && (item.__date || parseDate(item.rawStartTime || item.startTime || item.startDate || item.eventDate || item.date || item.start || item.createdAt));
  }

  function endDate(item) {
    return item && (item.__endDate || parseDate(item.rawEndTime || item.endTime || item.end));
  }

  function isActiveSchedule(item) {
    const s = statusOf(item).toLowerCase();
    if (!s || s === '-') return true;
    return !/(ดำเนินการแล้ว|ยกเลิก|cancel|closed|เสร็จสิ้น|completed)/i.test(s);
  }

  function allSchedules() {
    const A = api();
    let rows = [];
    try {
      if (A && typeof A.readAll === 'function') rows = A.readAll();
    } catch (e) {}
    if (!rows.length) {
      try { rows.push(...(window.mySchedulesGlobal || []).map((item, i) => Object.assign({ __scope: 'my', id: scheduleId(item) || `my_${i}` }, item))); } catch (e) {}
      try { rows.push(...(window.departmentSchedulesGlobal || []).map((item, i) => Object.assign({ __scope: 'dept', id: scheduleId(item) || `dept_${i}` }, item))); } catch (e) {}
    }
    const seen = new Set();
    return rows.filter(item => {
      if (!item || !isActiveSchedule(item)) return false;
      const d = startDate(item);
      if (!d) return false;
      const key = `${scheduleId(item) || titleOf(item)}|${scopeOf(item)}|${d.getTime()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getAgenda() {
    const today = todayStart();
    const list = allSchedules().map(item => {
      const start = startDate(item);
      const end = endDate(item);
      const diff = diffDaysFromToday(start);
      return Object.assign({}, item, {
        __agendaStart: start,
        __agendaEnd: end,
        __agendaDiff: diff,
        __agendaFullDays: diff == null ? null : Math.max(0, diff - 1)
      });
    }).filter(item => item.__agendaDiff != null && item.__agendaDiff >= 0 && item.__agendaDiff <= LOOKAHEAD_DAYS);

    list.sort((a, b) => {
      if (a.__agendaDiff !== b.__agendaDiff) return a.__agendaDiff - b.__agendaDiff;
      return (a.__agendaStart?.getTime() || 0) - (b.__agendaStart?.getTime() || 0);
    });

    return {
      today,
      todayItems: list.filter(item => item.__agendaDiff === 0),
      upcomingItems: list.filter(item => item.__agendaDiff > 0),
      all: list
    };
  }

  function formatDate(value) {
    const D = dateApi();
    if (D && typeof D.date === 'function') return D.date(value);
    const d = parseDate(value);
    return d ? d.toLocaleDateString('th-TH') : clean(value) || '-';
  }

  function formatTime(value) {
    const D = dateApi();
    if (D && typeof D.time === 'function') return D.time(value, value);
    const d = parseDate(value);
    return d ? `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')} น.` : '';
  }

  function timeRange(item) {
    const D = dateApi();
    if (D && typeof D.timeRange === 'function') return D.timeRange(item.__agendaStart, item.__agendaEnd || item.__agendaStart) || formatTime(item.__agendaStart);
    return [formatTime(item.__agendaStart), item.__agendaEnd ? formatTime(item.__agendaEnd) : ''].filter(Boolean).join(' ถึง ');
  }

  function relativeLabel(item) {
    const diff = item.__agendaDiff;
    if (diff === 0) return 'วันนี้';
    if (diff === 1) return 'พรุ่งนี้ · เหลือ 0 วันเต็ม';
    return `อีก ${Math.max(0, diff - 1)} วันเต็ม`;
  }

  function scopeBadge(item) {
    const dept = scopeOf(item) === 'dept';
    return `<span class="haos-v787-badge ${dept ? 'dept' : 'my'}"><i class="bi ${dept ? 'bi-people' : 'bi-person'}"></i>${dept ? 'กลุ่มงาน' : 'ส่วนตัว'}</span>`;
  }

  function priorityBadge(item) {
    const p = priorityOf(item);
    const urgent = /ด่วน|urgent|critical|high/i.test(p);
    return `<span class="haos-v787-badge ${urgent ? 'urgent' : ''}"><i class="bi bi-flag"></i>${esc(p || 'ปกติ')}</span>`;
  }

  function openSchedule(itemOrId) {
    const id = typeof itemOrId === 'string' ? itemOrId : scheduleId(itemOrId);
    if (!id) {
      openAgendaTab();
      return;
    }
    try { if (typeof window.viewScheduleDetail === 'function') return window.viewScheduleDetail(id); } catch (e) {}
    try { if (typeof window.showSchedulePopupDetailV749 === 'function') return window.showSchedulePopupDetailV749(id); } catch (e) {}
    try { document.getElementById('schedule-tab')?.click(); } catch (e) {}
  }

  function openAgendaTab() {
    ensureTab();
    const tab = $('upcoming-agenda-tab');
    try {
      if (window.bootstrap && bootstrap.Tab) bootstrap.Tab.getOrCreateInstance(tab).show();
      else tab?.click();
    } catch (e) {
      tab?.click();
    }
    setTimeout(render, 80);
  }

  function itemCard(item, mode) {
    const id = esc(scheduleId(item));
    const isToday = item.__agendaDiff === 0;
    return `<article class="haos-v787-item ${isToday ? 'today' : 'soon'}">
      <div class="haos-v787-datebox">
        <b>${esc(isToday ? 'วันนี้' : relativeLabel(item))}</b>
        <small>${esc(formatDate(item.__agendaStart))}</small>
      </div>
      <div class="haos-v787-main">
        <div class="haos-v787-title">${esc(titleOf(item))}</div>
        <div class="haos-v787-meta">
          <span><i class="bi bi-clock"></i>${esc(timeRange(item) || '-')}</span>
          <span><i class="bi bi-geo-alt"></i>${esc(locationOf(item))}</span>
          <span><i class="bi bi-check2-circle"></i>${esc(statusOf(item))}</span>
        </div>
        <div class="haos-v787-pills">${scopeBadge(item)}${priorityBadge(item)}</div>
      </div>
      <div class="haos-v787-actions">
        <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="window.HAOSUpcomingAgenda.openSchedule('${id}')"><i class="bi bi-box-arrow-up-right"></i> เปิดรายการ</button>
      </div>
    </article>`;
  }

  function emptyState(text) {
    return `<div class="haos-v787-empty"><i class="bi bi-calendar-check"></i><b>${esc(text)}</b><small>ระบบคำนวณจากตารางงานและนัดหมายที่โหลดอยู่ในขณะนี้</small></div>`;
  }

  function renderSection(title, icon, items, emptyText) {
    return `<section class="haos-v787-section">
      <div class="haos-v787-section-head"><div><i class="bi ${icon}"></i><b>${esc(title)}</b></div><span>${items.length} รายการ</span></div>
      <div class="haos-v787-list">${items.length ? items.map(itemCard).join('') : emptyState(emptyText)}</div>
    </section>`;
  }

  function render() {
    ensureTab();
    LOOKAHEAD_DAYS = readLookaheadDays();
    const body = $('upcomingAgendaBodyV787');
    if (!body) return;
    const data = getAgenda();
    body.innerHTML = `
      <div class="haos-v787-hero">
        <div>
          <span class="haos-v787-kicker"><i class="bi bi-calendar2-check"></i> กำหนดการวันนี้และใกล้ถึง</span>
          <h5>วันนี้ ${esc(formatDate(data.today))}</h5>
          <p>รวมกำหนดการวันนี้และงานที่จะถึงภายใน ${LOOKAHEAD_DAYS} วัน โดยนับ “วันเต็มที่เหลือระหว่างทาง” ตามที่ตั้งค่าไว้</p>
        </div>
        <div class="haos-v787-kpis">
          <button type="button" onclick="window.HAOSUpcomingAgenda.focusToday()" class="haos-v787-kpi today"><small>วันนี้</small><b>${data.todayItems.length}</b></button>
          <button type="button" onclick="window.HAOSUpcomingAgenda.focusUpcoming()" class="haos-v787-kpi soon"><small>ใกล้ถึง</small><b>${data.upcomingItems.length}</b></button>
        </div>
      </div>
      <div class="haos-v787-toolbar">
        <button type="button" class="btn btn-success fw-bold" onclick="goToScheduleForm&&goToScheduleForm()"><i class="bi bi-calendar-plus"></i> สร้างตารางงาน</button>
        <button type="button" class="btn btn-outline-primary fw-bold" onclick="window.HAOSUpcomingAgenda.reload()"><i class="bi bi-arrow-clockwise"></i> โหลดใหม่</button>
        <button type="button" class="btn btn-outline-secondary fw-bold" onclick="document.getElementById('schedule-tab')?.click()"><i class="bi bi-table"></i> ไปตารางงานรวม</button>
      </div>
      <div id="agendaTodaySectionV787">${renderSection('กำหนดการวันนี้', 'bi-sun', data.todayItems, 'วันนี้ยังไม่มีกำหนดการ')}</div>
      <div id="agendaUpcomingSectionV787">${renderSection(`กำหนดการที่จะถึงในอีก ${LOOKAHEAD_DAYS} วัน`, 'bi-hourglass-split', data.upcomingItems, 'ยังไม่มีกำหนดการใกล้ถึง')}</div>
    `;
    updateHeroCard(data);
    injectAgendaNotifications();
  }

  function focusToday() {
    openAgendaTab();
    setTimeout(() => $('agendaTodaySectionV787')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function focusUpcoming() {
    openAgendaTab();
    setTimeout(() => $('agendaUpcomingSectionV787')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function reload() {
    try { window.loadMySchedules && window.loadMySchedules(); } catch (e) {}
    try { window.loadDepartmentSchedules && window.loadDepartmentSchedules(); } catch (e) {}
    setTimeout(render, 700);
    setTimeout(render, 1500);
  }

  function ensureTab() {
    const nav = $('mainTab');
    const content = nav?.parentElement?.querySelector('.tab-content') || document.querySelector('.tab-content');
    const scheduleTab = $('schedule-tab');
    if (nav && scheduleTab && !$('upcoming-agenda-tab')) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.setAttribute('role', 'presentation');
      li.innerHTML = '<button class="nav-link" id="upcoming-agenda-tab" data-bs-toggle="tab" data-bs-target="#upcoming-agenda-pane" type="button" role="tab" onclick="window.HAOSUpcomingAgenda.render()"><i class="bi bi-calendar2-check"></i> กำหนดการวันนี้และใกล้ถึง</button>';
      scheduleTab.closest('li')?.insertAdjacentElement('afterend', li);
    }
    if (content && !$('upcoming-agenda-pane')) {
      const pane = document.createElement('div');
      pane.className = 'tab-pane fade';
      pane.id = 'upcoming-agenda-pane';
      pane.setAttribute('role', 'tabpanel');
      pane.innerHTML = '<div id="upcomingAgendaBodyV787"></div>';
      const schedulePane = $('schedule-pane');
      if (schedulePane && schedulePane.parentElement === content) schedulePane.insertAdjacentElement('afterend', pane);
      else content.appendChild(pane);
    }
  }

  function updateHeroCard(data) {
    data = data || getAgenda();
    const heroRow = $('dashboardHero')?.querySelector('.col-lg-5 .row.g-3');
    if (!heroRow) return;
    let wrap = $('haosAgendaHeroCardV787');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'col-12';
      wrap.id = 'haosAgendaHeroCardV787';
      heroRow.appendChild(wrap);
    }
    wrap.innerHTML = `<button type="button" class="haos-v787-hero-card" onclick="window.HAOSUpcomingAgenda.openAgendaTab()">
      <span><i class="bi bi-calendar2-check"></i> กำหนดการวันนี้และใกล้ถึง</span>
      <b>${data.todayItems.length}</b><small>วันนี้</small>
      <b>${data.upcomingItems.length}</b><small>ใกล้ถึง</small>
    </button>`;
  }

  function scheduleNotifications() {
    const data = getAgenda();
    const now = new Date();
    const items = [];
    if (data.todayItems.length) {
      items.push({
        id: 'virtual_agenda_today',
        virtual: true,
        module: 'schedule',
        message: `วันนี้มี ${data.todayItems.length} กำหนดการ`,
        time: now,
        type: 'กำหนดการวันนี้',
        priority: 'ด่วน',
        action: 'openUpcomingAgenda',
        today: true
      });
    }
    data.upcomingItems.slice(0, 8).forEach(item => {
      items.push({
        id: `virtual_agenda_${scheduleId(item) || titleOf(item)}`,
        virtual: true,
        module: 'schedule',
        entityId: scheduleId(item),
        message: `${titleOf(item)} ใกล้ถึงแล้ว · ${relativeLabel(item)}`,
        time: item.__agendaStart,
        type: 'กำหนดการใกล้ถึง',
        priority: item.__agendaDiff <= 1 ? 'ด่วน' : priorityOf(item),
        action: 'openSchedule',
        today: false
      });
    });
    return items;
  }

  function notifPass(n) {
    const q = String($('notifSearchV745')?.value || '').toLowerCase().trim();
    const mod = $('notifModuleV745')?.value || '';
    const pr = $('notifPriorityV745')?.value || '';
    if (mod && mod !== 'schedule') return false;
    if (pr && String(n.priority || '') !== pr) return false;
    if (q && !String(Object.values(n).join(' ')).toLowerCase().includes(q)) return false;
    const mainFilter = $('notifFilter')?.value || 'all';
    if (mainFilter === 'read') return false;
    return true;
  }

  function notifHtml(n) {
    const id = esc(n.entityId || '');
    const open = id ? `window.HAOSUpcomingAgenda.openSchedule('${id}')` : 'window.HAOSUpcomingAgenda.openAgendaTab()';
    const urgent = /ด่วน|urgent|critical/i.test(n.priority || '');
    return `<div class="list-group-item haos-v746-notif-card haos-v787-agenda-notif ${n.today ? 'haos-v749-notif-today' : ''}" data-module="schedule">
      <div class="d-flex gap-3 align-items-start">
        <div class="haos-v746-notif-icon"><i class="bi bi-calendar2-check"></i></div>
        <div class="flex-grow-1">
          <div class="haos-v746-notif-title">${esc(n.message)}</div>
          <div class="haos-v746-notif-meta">
            <span class="haos-v746-notif-pill module"><i class="bi bi-calendar2-check"></i>ตารางงาน</span>
            <span class="haos-v746-notif-pill"><i class="bi bi-calendar3"></i>${esc(formatDate(n.time))} ${esc(formatTime(n.time))}</span>
            <span class="haos-v746-notif-pill"><i class="bi bi-tag"></i>${esc(n.type)}</span>
            <span class="haos-v746-notif-pill ${urgent ? 'urgent' : ''}"><i class="bi bi-flag"></i>${esc(n.priority)}</span>
          </div>
        </div>
        <div class="haos-v746-notif-actions">
          <button class="btn btn-sm btn-primary" onclick="${open}"><i class="bi bi-box-arrow-up-right"></i> เปิดรายการ</button>
        </div>
      </div>
    </div>`;
  }

  let injecting = false;
  function injectAgendaNotifications() {
    if (injecting) return;
    const list = $('notificationCenterList');
    if (!list) return;
    injecting = true;
    try {
      qa('.haos-v787-agenda-notif', list).forEach(el => el.remove());
      const items = scheduleNotifications().filter(notifPass);
      if (items.length) {
        qa(':scope > .text-center.py-4.text-muted', list).forEach(el => el.remove());
        list.insertAdjacentHTML('afterbegin', items.map(notifHtml).join(''));
      }
    } finally {
      injecting = false;
    }
  }

  function wrapFunction(name, after) {
    const old = window[name];
    if (typeof old !== 'function' || old.__haosV787Agenda) return;
    const wrapped = function () {
      const result = old.apply(this, arguments);
      setTimeout(after, 250);
      setTimeout(after, 900);
      setTimeout(after, 1800);
      return result;
    };
    wrapped.__haosV787Agenda = true;
    window[name] = wrapped;
  }

  function installStyles() {
    if ($('haos-v787-upcoming-agenda-style')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="haos-v787-upcoming-agenda-style">
      .haos-v787-hero{border:1px solid rgba(14,165,233,.22);border-radius:8px;background:linear-gradient(135deg,#eff6ff,#ecfdf5);padding:22px;display:flex;justify-content:space-between;gap:18px;align-items:center;box-shadow:0 18px 44px rgba(15,23,42,.06);margin-bottom:16px}
      .haos-v787-kicker{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(37,99,235,.18);border-radius:999px;padding:6px 11px;background:#fff;color:#1d4ed8;font-weight:900;margin-bottom:8px}
      .haos-v787-hero h5{font-weight:950;color:#0f172a;margin:0 0 5px}.haos-v787-hero p{margin:0;color:#64748b;font-weight:650}
      .haos-v787-kpis{display:grid;grid-template-columns:repeat(2,minmax(110px,1fr));gap:10px}.haos-v787-kpi{border:0;border-radius:8px;background:#fff;padding:12px 16px;text-align:left;box-shadow:0 12px 28px rgba(15,23,42,.08)}
      .haos-v787-kpi small{display:block;color:#64748b;font-weight:850}.haos-v787-kpi b{font-size:2rem;line-height:1;color:#0f172a}.haos-v787-kpi.today b{color:#dc2626}.haos-v787-kpi.soon b{color:#0f766e}
      .haos-v787-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.haos-v787-section{border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#fff;overflow:hidden;margin-bottom:16px}
      .haos-v787-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#f8fafc;padding:14px 16px;border-bottom:1px solid rgba(148,163,184,.18);font-weight:950;color:#0f172a}.haos-v787-section-head div{display:flex;gap:8px;align-items:center}.haos-v787-section-head span{border-radius:999px;background:#e0f2fe;color:#0369a1;padding:5px 10px;font-weight:900;font-size:.86rem}
      .haos-v787-list{display:grid;gap:10px;padding:14px}.haos-v787-item{display:grid;grid-template-columns:190px 1fr auto;gap:14px;align-items:center;border:1px solid rgba(148,163,184,.22);border-left:8px solid #2563eb;border-radius:8px;background:linear-gradient(90deg,#eff6ff,#fff);padding:14px;box-shadow:0 12px 28px rgba(15,23,42,.05)}
      .haos-v787-item.soon{border-left-color:#059669;background:linear-gradient(90deg,#ecfdf5,#fff)}.haos-v787-datebox{display:grid;gap:4px}.haos-v787-datebox b{font-size:1.05rem;color:#0f172a}.haos-v787-datebox small{color:#64748b;font-weight:800}
      .haos-v787-title{font-weight:950;color:#1d4ed8;font-size:1.03rem;line-height:1.35}.haos-v787-meta{display:flex;gap:12px;flex-wrap:wrap;color:#475569;font-size:.9rem;margin-top:6px}.haos-v787-meta span{display:inline-flex;gap:5px;align-items:center}
      .haos-v787-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.haos-v787-badge{display:inline-flex;gap:5px;align-items:center;border-radius:999px;border:1px solid rgba(148,163,184,.25);background:#fff;color:#475569;padding:5px 9px;font-size:.82rem;font-weight:900}.haos-v787-badge.dept{background:#dcfce7;color:#047857}.haos-v787-badge.my{background:#dbeafe;color:#1d4ed8}.haos-v787-badge.urgent{background:#fff7ed;color:#c2410c;border-color:#fdba74}
      .haos-v787-empty{display:grid;place-items:center;text-align:center;color:#64748b;gap:5px;padding:28px}.haos-v787-empty i{font-size:2rem;color:#0ea5e9}.haos-v787-empty b{color:#0f172a}
      .haos-v787-hero-card{width:100%;border:1px solid rgba(14,165,233,.22);border-radius:8px;background:rgba(255,255,255,.82);padding:13px 16px;display:grid;grid-template-columns:1fr auto auto auto auto;gap:8px;align-items:center;text-align:left;color:#0f172a;box-shadow:0 12px 26px rgba(15,23,42,.08)}.haos-v787-hero-card span{font-weight:950;color:#0369a1}.haos-v787-hero-card b{font-size:1.45rem;color:#0f172a}.haos-v787-hero-card small{color:#64748b;font-weight:850}
      .haos-v787-agenda-notif{--tone:#2563eb;--soft:#eff6ff}
      @media(max-width:900px){.haos-v787-hero{display:block}.haos-v787-kpis{margin-top:14px}.haos-v787-item{grid-template-columns:1fr}.haos-v787-actions{justify-self:start}.haos-v787-hero-card{grid-template-columns:1fr auto auto}}
    </style>`);
  }

  function installObserver() {
    const list = $('notificationCenterList');
    if (!list || list.dataset.haosV787Observed) return;
    list.dataset.haosV787Observed = '1';
    const obs = new MutationObserver(() => {
      if (injecting) return;
      clearTimeout(window.__haosV787NotifTimer);
      window.__haosV787NotifTimer = setTimeout(injectAgendaNotifications, 80);
    });
    obs.observe(list, { childList: true, subtree: false });
  }

  function install() {
    installStyles();
    ensureTab();
    updateHeroCard();
    installObserver();
    wrapFunction('loadMySchedules', render);
    wrapFunction('loadDepartmentSchedules', render);
    wrapFunction('renderUnifiedScheduleV702', () => { render(); injectAgendaNotifications(); });
    wrapFunction('loadNotificationCenter', injectAgendaNotifications);
  }

  window.HAOSUpcomingAgenda = {
    PATCH,
    LOOKAHEAD_DAYS,
    install,
    render,
    reload,
    openAgendaTab,
    openSchedule,
    focusToday,
    focusUpcoming,
    getAgenda,
    injectAgendaNotifications
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  setTimeout(install, 700);
  setTimeout(render, 1400);
  setTimeout(render, 3000);
  console.info('HAOS ' + PATCH + ' loaded');
})();
