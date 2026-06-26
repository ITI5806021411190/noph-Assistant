(function () {
  const PATCH = 'v70.111-schedule-overdue-reminder';
  if (window.__HAOS_SCHEDULE_OVERDUE_REMINDER__) return;
  window.__HAOS_SCHEDULE_OVERDUE_REMINDER__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const phone = value => String(value || '').replace(/'/g, '').replace(/\D/g, '').trim();
  const getUser = () => {
    try { return window.user || user || {}; } catch (e) { return window.user || {}; }
  };

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;
    const text = String(value || '').trim();
    if (!text) return null;
    const normalized = text.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, (m, d, mo, y) => {
      const year = Number(y) > 2400 ? Number(y) - 543 : Number(y);
      return `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }).replace(' ', 'T');
    const parsed = new Date(normalized);
    return isNaN(parsed) ? null : parsed;
  }

  function dateOf(item) {
    return parseDate(item && (item.rawEndTime || item.endTime || item.end || item.rawStartTime || item.startTime || item.start || item.date));
  }

  function localInput(date) {
    date = parseDate(date);
    if (!date) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function thaiDate(date) {
    date = parseDate(date);
    if (!date) return '-';
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function statusOf(item) {
    return clean(item && (item.workStatus || item.status || ''));
  }

  function isInProgress(item) {
    const status = statusOf(item).toLowerCase();
    if (!status) return true;
    if (/done|complete|closed|cancel|ยกเลิก|ดำเนินการแล้ว|เสร็จ/.test(status)) return false;
    return /in\s*progress|ระหว่าง|ดำเนิน/.test(status);
  }

  function idOf(item) {
    return clean(item && (item.id || item.publicId || item.eventId || item.scheduleId));
  }

  function allSchedules() {
    try {
      if (window.HAOSScheduleCore && typeof window.HAOSScheduleCore.readAll === 'function') {
        return window.HAOSScheduleCore.readAll();
      }
    } catch (e) {}
    const out = [];
    try { (window.mySchedulesGlobal || []).forEach((item, i) => out.push(Object.assign({ __scope: 'my', id: idOf(item) || `my_${i}` }, item))); } catch (e) {}
    try { (window.departmentSchedulesGlobal || []).forEach((item, i) => out.push(Object.assign({ __scope: 'dept', id: idOf(item) || `dept_${i}` }, item))); } catch (e) {}
    return out;
  }

  function promptKey() {
    const u = getUser();
    const p = phone(u.phone || u.userPhone || u.mobile || '');
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return `haos_overdue_schedule_prompt_v1_${p || 'anon'}_${day}`;
  }

  function promptedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(promptKey()) || '[]').map(String)); } catch (e) { return new Set(); }
  }

  function markPrompted(ids) {
    const set = promptedSet();
    (ids || []).forEach(id => id && set.add(String(id)));
    try { localStorage.setItem(promptKey(), JSON.stringify(Array.from(set).slice(-300))); } catch (e) {}
  }

  function overdueItems() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const seen = new Set();
    return allSchedules().filter(item => {
      const id = idOf(item);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      const d = dateOf(item);
      if (!d) return false;
      const dateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return dateStart < todayStart && isInProgress(item);
    }).sort((a, b) => dateOf(a) - dateOf(b));
  }

  function gas(fn, args) {
    if (typeof window.gasRunPromise_ === 'function') return window.gasRunPromise_(fn, args || []);
    return new Promise((resolve, reject) => {
      try {
        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn].apply(google.script.run, args || []);
      } catch (e) { reject(e); }
    });
  }

  function payloadFromItem(item) {
    const u = getUser();
    const start = parseDate(item.rawStartTime || item.startTime || item.start || item.date) || new Date();
    const end = parseDate(item.rawEndTime || item.endTime || item.end) || start;
    return {
      eventEditId: idOf(item),
      eventName: item.eventName || item.title || item.name || '-',
      startTime: localInput(start),
      endTime: localInput(end),
      meetingLink: item.meetingLink || '',
      visibility: item.visibility || '',
      email: item.email || item.userEmail || '',
      chatId: item.chatId || item.telegramChatId || '',
      leadTime: item.leadTime || item.notifyLeadTime || 30,
      workStatus: 'ดำเนินการแล้ว',
      ownerPhone: phone(item.ownerPhone || item.createdByPhone || u.phone || ''),
      ownerName: item.ownerName || item.createdBy || u.fullName || u.name || '',
      resourceId: item.resourceId || '',
      details: item.details || item.description || '',
      location: item.location || item.eventLocation || '',
      scheduleScope: /dept/i.test(item.__scope || item.scheduleScope || '') ? 'Department' : 'Personal',
      ownerDepartment: item.ownerDepartment || item.department || u.department || '',
      priority: item.priority || 'ปกติ',
      tags: item.tags || ''
    };
  }

  async function completeItems(items) {
    for (const item of items) {
      const res = await gas('updateScheduleV2', [payloadFromItem(item)]);
      if (!res || !res.success) throw new Error((res && res.message) || 'อัปเดตสถานะไม่สำเร็จ');
    }
    try { await window.loadMySchedules?.(); } catch (e) {}
    try { await window.loadDepartmentSchedules?.(); } catch (e) {}
    try { window.renderUnifiedScheduleV702?.(); } catch (e) {}
    try { window.HAOSUpcomingAgenda?.render?.(); } catch (e) {}
  }

  let queued = false;
  async function runPrompt() {
    if (queued) return;
    queued = true;
    try {
      const set = promptedSet();
      const due = overdueItems().filter(item => !set.has(idOf(item))).slice(0, 10);
      if (!due.length) return;
      const ids = due.map(idOf);
      if (!window.Swal) {
        if (confirm(`มีงานเลยกำหนด ${due.length} รายการ ต้องการเปลี่ยนรายการแรกเป็นดำเนินการแล้วหรือไม่?`)) {
          await completeItems([due[0]]);
        }
        markPrompted(ids);
        return;
      }
      const html = '<div class="text-start" style="display:grid;gap:10px">' + due.map((item, index) => {
        const d = dateOf(item);
        const days = Math.max(1, Math.floor((new Date().setHours(0,0,0,0) - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000));
        return '<label style="display:flex;gap:10px;align-items:flex-start;border:1px solid #dbeafe;border-radius:14px;padding:10px;background:#f8fbff">' +
          '<input type="checkbox" data-overdue-index="' + index + '" checked style="margin-top:5px">' +
          '<span><b>' + esc(item.eventName || item.title || '-') + '</b><br><small>' + esc(thaiDate(d)) + ' · เลยมาแล้ว ' + days + ' วัน · ' + esc(statusOf(item) || '-') + '</small></span>' +
          '</label>';
      }).join('') + '</div><p class="text-muted mt-3 mb-0">ระบบจะแจ้งเตือนรายการชุดนี้เพียงวันละครั้ง เพื่อลดการรบกวนผู้ใช้งาน</p>';
      const result = await Swal.fire({
        icon: 'warning',
        title: 'พบงานหรือกำหนดการที่เลยกำหนด',
        html,
        width: 760,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'เปลี่ยนสถานะรายการที่เลือก',
        denyButtonText: 'ไว้ก่อนวันนี้',
        cancelButtonText: 'ปิด',
        preConfirm: () => Array.from(Swal.getPopup()?.querySelectorAll('[data-overdue-index]:checked') || [])
          .map(input => Number(input.dataset.overdueIndex))
      });
      markPrompted(ids);
      if (result.isConfirmed) {
        const selected = (result.value || []).map(index => due[index]).filter(Boolean);
        if (selected.length) {
          await completeItems(selected);
          Swal.fire('อัปเดตแล้ว', `เปลี่ยนสถานะ ${selected.length} รายการเป็นดำเนินการแล้ว`, 'success');
        }
      }
    } catch (err) {
      console.warn('HAOS overdue schedule reminder failed', err);
    } finally {
      queued = false;
    }
  }

  function scheduleRun(delay) {
    setTimeout(runPrompt, delay || 1800);
  }

  ['loadMySchedules', 'loadDepartmentSchedules', 'renderUnifiedScheduleV702'].forEach(name => {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__haosOverdueWrapped) return;
    const wrapped = function () {
      const result = fn.apply(this, arguments);
      Promise.resolve(result).finally(() => scheduleRun(1200));
      return result;
    };
    wrapped.__haosOverdueWrapped = true;
    window[name] = wrapped;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleRun(4000), { once: true });
  } else {
    scheduleRun(4000);
  }

  console.info('HAOS ' + PATCH + ' loaded');
})();
