(function () {
  'use strict';

  const PATCH = 'v70.86-schedule-multi-ranges';
  if (window.__HAOS_V786_SCHEDULE_MULTI_RANGES__) return;
  window.__HAOS_V786_SCHEDULE_MULTI_RANGES__ = true;

  const MONTHS = {
    'มกราคม': 0, 'ม.ค.': 0, 'มค': 0,
    'กุมภาพันธ์': 1, 'ก.พ.': 1, 'กพ': 1,
    'มีนาคม': 2, 'มี.ค.': 2, 'มีค': 2,
    'เมษายน': 3, 'เม.ย.': 3, 'เมย': 3,
    'พฤษภาคม': 4, 'พ.ค.': 4, 'พค': 4,
    'มิถุนายน': 5, 'มิ.ย.': 5, 'มิย': 5,
    'กรกฎาคม': 6, 'ก.ค.': 6, 'กค': 6,
    'สิงหาคม': 7, 'ส.ค.': 7, 'สค': 7,
    'กันยายน': 8, 'ก.ย.': 8, 'กย': 8,
    'ตุลาคม': 9, 'ต.ค.': 9, 'ตค': 9,
    'พฤศจิกายน': 10, 'พ.ย.': 10, 'พย': 10,
    'ธันวาคม': 11, 'ธ.ค.': 11, 'ธค': 11
  };

  const $ = id => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();

  function toLocalInput(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function dateFromLocal(value) {
    if (!value) return null;
    const D = window.HAOSDateDisplay;
    if (D && typeof D.parseDate === 'function') return D.parseDate(value);
    const d = new Date(String(value).replace(' ', 'T'));
    return isNaN(d) ? null : d;
  }

  function fmtRange(start, end) {
    const D = window.HAOSDateDisplay;
    if (D && typeof D.range === 'function') return D.range(start, end);
    return `${start || '-'} - ${end || '-'}`;
  }

  function timeParts(value, fallback) {
    const d = dateFromLocal(value);
    if (!d) {
      const m = String(fallback || '08:30').match(/(\d{1,2})[:.](\d{2})/);
      return [Number(m?.[1] || 8), Number(m?.[2] || 30)];
    }
    return [d.getHours(), d.getMinutes()];
  }

  function currentRanges() {
    const box = $('scheduleMultiRangeListV786');
    if (!box) return [];
    return qa('[data-range-row]', box).map(row => ({
      startTime: row.querySelector('[data-range-start]')?.value || '',
      endTime: row.querySelector('[data-range-end]')?.value || ''
    })).filter(r => r.startTime);
  }

  function renderRanges(ranges) {
    const box = $('scheduleMultiRangeListV786');
    if (!box) return;
    if (!ranges.length) {
      box.innerHTML = '<div class="text-muted small py-2">ยังไม่มีช่วงเวลาเพิ่มเติม</div>';
      return;
    }
    box.innerHTML = ranges.map((r, i) => `
      <div class="haos-v786-range-row" data-range-row>
        <div class="haos-v786-range-index">${i + 1}</div>
        <div class="flex-grow-1">
          <div class="small fw-bold text-primary mb-1">${esc(fmtRange(r.startTime, r.endTime))}</div>
          <div class="row g-2">
            <div class="col-md-6"><input type="datetime-local" class="form-control form-control-sm" data-range-start value="${esc(r.startTime || '')}" onchange="window.HAOSScheduleMultiRanges.renderCurrent()"></div>
            <div class="col-md-6"><input type="datetime-local" class="form-control form-control-sm" data-range-end value="${esc(r.endTime || '')}" onchange="window.HAOSScheduleMultiRanges.renderCurrent()"></div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.HAOSScheduleMultiRanges.remove(${i})"><i class="bi bi-trash"></i></button>
      </div>
    `).join('');
  }

  function setFirstRange(ranges) {
    if (!ranges.length) return;
    if ($('startTime')) $('startTime').value = ranges[0].startTime || '';
    if ($('endTime')) $('endTime').value = ranges[0].endTime || ranges[0].startTime || '';
  }

  function addRange(startTime, endTime) {
    const ranges = currentRanges();
    const start = startTime || $('startTime')?.value || '';
    const end = endTime || $('endTime')?.value || start;
    if (!start) {
      Swal.fire('ยังไม่มีวันเริ่มต้น', 'กรุณาระบุวันเวลาเริ่มต้นก่อนเพิ่มช่วงเวลา', 'warning');
      return;
    }
    ranges.push({ startTime: start, endTime: end || start });
    $('scheduleMultiRangeToggleV786').checked = true;
    togglePanel(true);
    renderRanges(ranges);
  }

  function monthFromText(text) {
    const keys = Object.keys(MONTHS).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (re.test(text)) return MONTHS[key];
    }
    return null;
  }

  function yearFromText(text) {
    const y = Number((text.match(/\b(25|20)\d{2}\b/) || [])[0] || '');
    if (!y) return new Date().getFullYear();
    return y > 2400 ? y - 543 : y;
  }

  function parseTextToRanges(rawText) {
    const text = clean(rawText);
    if (!text) return [];
    const month = monthFromText(text);
    if (month == null) return [];
    const year = yearFromText(text);
    const [sh, sm] = timeParts($('startTime')?.value, '08:30');
    const [eh, em] = timeParts($('endTime')?.value, '16:30');
    const dayRanges = [];
    const seen = new Set();
    const re = /(^|[^\d])(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?(?!\d)/g;
    let match;
    while ((match = re.exec(text))) {
      const tokenStart = match.index + match[1].length;
      const before = text[tokenStart - 1] || '';
      const after = text[match.index + match[0].length] || '';
      if (before === ':' || before === '.' || after === ':' || after === '.') continue;
      const startDay = Number(match[2]);
      const endDay = Number(match[3] || match[2]);
      if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31 || endDay < startDay) continue;
      const key = `${startDay}-${endDay}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dayRanges.push([startDay, endDay]);
    }
    return dayRanges.map(([startDay, endDay]) => {
      const start = new Date(year, month, startDay, sh, sm);
      const end = new Date(year, month, endDay, eh, em);
      return { startTime: toLocalInput(start), endTime: toLocalInput(end) };
    });
  }

  function parseFromText() {
    const source = $('scheduleMultiRangeTextV786')?.value || $('lineTextPaste')?.value || '';
    const ranges = parseTextToRanges(source);
    if (!ranges.length) {
      Swal.fire('ยังแยกช่วงวันที่ไม่ได้', 'ลองใส่ข้อความที่มีเดือนและปี เช่น วันที่ 1-5 มิ.ย. 2569, 7, 13, 22-24 มิ.ย. 2569', 'info');
      return;
    }
    $('scheduleMultiRangeToggleV786').checked = true;
    togglePanel(true);
    setFirstRange(ranges);
    renderRanges(ranges);
    Swal.fire({ icon: 'success', title: 'แยกช่วงเวลาแล้ว', text: `พบ ${ranges.length} ช่วงเวลา`, timer: 1200, showConfirmButton: false });
  }

  function autoParseFromText(rawText) {
    const source = rawText || $('scheduleMultiRangeTextV786')?.value || $('lineTextPaste')?.value || '';
    const ranges = parseTextToRanges(source);
    if (ranges.length <= 1) return false;
    const textBox = $('scheduleMultiRangeTextV786');
    if (textBox && !textBox.value) textBox.value = source;
    $('scheduleMultiRangeToggleV786').checked = true;
    togglePanel(true);
    setFirstRange(ranges);
    renderRanges(ranges);
    return true;
  }

  function togglePanel(force) {
    const checked = force === true || !!$('scheduleMultiRangeToggleV786')?.checked;
    const panel = $('scheduleMultiRangeBodyV786');
    if (panel) panel.classList.toggle('d-none', !checked);
  }

  function collectForSave() {
    if (!$('scheduleMultiRangeToggleV786')?.checked) return [];
    return currentRanges().filter(r => r.startTime);
  }

  function gasCall(fn, payload) {
    return new Promise((resolve, reject) => {
      try {
        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn](payload);
      } catch (e) {
        reject(e);
      }
    });
  }

  function restoreButton(btn, isEdit) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = isEdit ? '<i class="bi bi-save"></i> อัปเดตกำหนดการ' : '<i class="bi bi-save"></i> บันทึกกำหนดการ';
  }

  async function submitMany(data, btn, ranges) {
    const isEdit = !!data.eventEditId;
    try {
      const payloads = ranges.map((range, index) => ({
        ...data,
        eventEditId: isEdit && index === 0 ? data.eventEditId : '',
        startTime: range.startTime,
        endTime: range.endTime || range.startTime,
        recurringEnabled: false
      }));
      let okCount = 0;
      for (let i = 0; i < payloads.length; i += 1) {
        const payload = payloads[i];
        const fn = payload.eventEditId ? 'updateScheduleV2' : 'saveScheduleV2';
        const res = await gasCall(fn, payload);
        if (!res || !res.success) throw new Error(res?.message || `บันทึกช่วงที่ ${i + 1} ไม่สำเร็จ`);
        okCount += 1;
      }
      restoreButton(btn, isEdit);
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: `บันทึก ${okCount} ช่วงเวลาแล้ว` });
      try { clearEventDraft && clearEventDraft(); } catch (e) {}
      try { cancelEditEvent && cancelEditEvent(); } catch (e) {}
      try { closeScheduleFormModal && closeScheduleFormModal(); } catch (e) {}
      try { loadMySchedules && loadMySchedules(); } catch (e) {}
      try { loadDepartmentSchedules && loadDepartmentSchedules(); } catch (e) {}
      try { loadNotifications && loadNotifications(); } catch (e) {}
      try { loadAnalyticsSummary && loadAnalyticsSummary(); } catch (e) {}
      try { loadMyRecurringRules && loadMyRecurringRules(); } catch (e) {}
      reset();
    } catch (err) {
      restoreButton(btn, isEdit);
      Swal.fire('บันทึกหลายช่วงเวลาไม่สำเร็จ', err.message || String(err), 'error');
    }
  }

  function installSubmitWrapper() {
    const oldSubmit = window.submitScheduleData;
    if (typeof oldSubmit !== 'function' || oldSubmit.__haosV786MultiRange) return;
    const wrapped = function (data, btn) {
      const ranges = collectForSave();
      if (!ranges.length) return oldSubmit.apply(this, arguments);
      if (ranges.length === 1) {
        data.startTime = ranges[0].startTime;
        data.endTime = ranges[0].endTime || ranges[0].startTime;
        return oldSubmit.call(this, data, btn);
      }
      return submitMany(data, btn, ranges);
    };
    wrapped.__haosV786MultiRange = true;
    window.submitScheduleData = wrapped;
  }

  function reset() {
    const toggle = $('scheduleMultiRangeToggleV786');
    if (toggle) toggle.checked = false;
    const text = $('scheduleMultiRangeTextV786');
    if (text) text.value = '';
    renderRanges([]);
    togglePanel(false);
  }

  function installUi() {
    const start = $('startTime');
    if (!start || $('scheduleMultiRangeV786')) return;
    const host = start.closest('.row');
    if (!host) return;
    host.insertAdjacentHTML('afterend', `
      <section id="scheduleMultiRangeV786" class="haos-v786-multi-range">
        <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
          <div>
            <div class="fw-bold text-success"><i class="bi bi-calendar-range"></i> หลายช่วงวันเวลา</div>
            <div class="small text-muted">ใช้เมื่อกิจกรรมเดียวกันเกิดหลายวัน เช่น 1-5, 7, 13, 22-24 มิ.ย. 2569</div>
          </div>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="scheduleMultiRangeToggleV786" onchange="window.HAOSScheduleMultiRanges.toggle()">
            <label class="form-check-label small fw-bold" for="scheduleMultiRangeToggleV786">เปิดใช้หลายช่วง</label>
          </div>
        </div>
        <div id="scheduleMultiRangeBodyV786" class="d-none mt-3">
          <textarea id="scheduleMultiRangeTextV786" class="form-control form-control-sm mb-2" rows="2" placeholder="วางข้อความให้ AI ช่วยแยกช่วงวันที่ เช่น วันที่ 1-5 มิ.ย. 2569, 7, 13, 15, 22-24 มิ.ย. 2569"></textarea>
          <div class="d-flex flex-wrap gap-2 mb-2">
            <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="window.HAOSScheduleMultiRanges.parse()"><i class="bi bi-robot"></i> AI วิเคราะห์หลายช่วง</button>
            <button type="button" class="btn btn-sm btn-outline-success fw-bold" onclick="window.HAOSScheduleMultiRanges.addCurrent()"><i class="bi bi-plus-circle"></i> เพิ่มช่วงจากช่องด้านบน</button>
            <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="window.HAOSScheduleMultiRanges.reset()"><i class="bi bi-arrow-counterclockwise"></i> ล้างช่วง</button>
          </div>
          <div id="scheduleMultiRangeListV786"></div>
          <div class="small text-muted mt-2">เมื่อบันทึกหลายช่วง ระบบจะสร้างตารางงานแยกตามแต่ละช่วงเวลา โดยใช้หัวข้อ รายละเอียด สถานที่ และผู้รับมอบหมายชุดเดียวกัน</div>
        </div>
      </section>
    `);
    renderRanges([]);
  }

  function installStyles() {
    if ($('haos-v786-schedule-multi-range-style')) return;
    document.head.insertAdjacentHTML('beforeend', `
      <style id="haos-v786-schedule-multi-range-style">
        .haos-v786-multi-range{border:1px solid rgba(16,185,129,.24);border-radius:18px;background:linear-gradient(135deg,#f0fdf4,#f8fafc);padding:14px;margin:-4px 0 16px}
        .haos-v786-range-row{display:flex;gap:10px;align-items:center;border:1px solid rgba(148,163,184,.22);border-radius:16px;background:#fff;padding:10px;margin-top:8px;box-shadow:0 8px 18px rgba(15,23,42,.05)}
        .haos-v786-range-index{width:34px;height:34px;border-radius:12px;background:#dcfce7;color:#047857;display:grid;place-items:center;font-weight:950;flex:0 0 auto}
      </style>
    `);
  }

  function install() {
    installStyles();
    installUi();
    installSubmitWrapper();
  }

  window.HAOSScheduleMultiRanges = {
    PATCH,
    install,
    toggle: () => togglePanel(),
    addCurrent: () => addRange(),
    parse: parseFromText,
    autoParseFromText,
    remove(index) {
      const ranges = currentRanges();
      ranges.splice(index, 1);
      renderRanges(ranges);
    },
    renderCurrent() {
      renderRanges(currentRanges());
    },
    reset,
    parseTextToRanges,
    collectForSave
  };

  const oldOpen = window.openScheduleFormModal;
  if (typeof oldOpen === 'function' && !oldOpen.__haosV786MultiRange) {
    const wrappedOpen = function () {
      const result = oldOpen.apply(this, arguments);
      setTimeout(install, 120);
      return result;
    };
    wrappedOpen.__haosV786MultiRange = true;
    window.openScheduleFormModal = wrappedOpen;
  }

  const oldCancel = window.cancelEditEvent;
  if (typeof oldCancel === 'function' && !oldCancel.__haosV786MultiRange) {
    const wrappedCancel = function () {
      const result = oldCancel.apply(this, arguments);
      setTimeout(reset, 80);
      return result;
    };
    wrappedCancel.__haosV786MultiRange = true;
    window.cancelEditEvent = wrappedCancel;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  setTimeout(install, 700);
  setTimeout(install, 1800);
  console.info('HAOS ' + PATCH + ' loaded');
})();
