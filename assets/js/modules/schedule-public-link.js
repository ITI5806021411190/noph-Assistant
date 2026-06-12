(function(){
  const PATCH = 'v70.74-schedule-public-link-status';
  if (window.__HAOS_V774_SCHEDULE_PUBLIC_LINK__) return;
  window.__HAOS_V774_SCHEDULE_PUBLIC_LINK__ = true;

  const $ = id => document.getElementById(id);
  const root = window.HAOS = window.HAOS || {};
  const LINK_TIMEOUT_MS = 45000;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function currentUser() {
    try { return window.user || user || {}; } catch (e) { return window.user || {}; }
  }

  function cleanPhone(value) {
    return String(value || '').replace(/'/g, '').trim();
  }

  function publicBaseUrl() {
    if (window.location && window.location.origin) return window.location.origin.replace(/\/+$/, '');
    if (window.PUBLIC_WEB_APP_URL) return String(window.PUBLIC_WEB_APP_URL).replace(/\/+$/, '');
    return '';
  }

  function publicScheduleUrl(publicId) {
    const base = publicBaseUrl() || String(window.location.href || '').split('?')[0].replace(/\/+$/, '');
    return base + '/public?publicId=' + encodeURIComponent(publicId || '');
  }

  function callGas(fn, args, timeoutMs) {
    timeoutMs = timeoutMs || LINK_TIMEOUT_MS;
    return new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error('TIMEOUT'));
      }, timeoutMs);

      function finish(cb, value) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cb(value);
      }

      try {
        if (!window.google || !google.script || !google.script.run) {
          throw new Error('ไม่พบตัวเชื่อม Google Apps Script');
        }
        google.script.run
          .withSuccessHandler(res => finish(resolve, res))
          .withFailureHandler(err => finish(reject, err))
          [fn].apply(google.script.run, args || []);
      } catch (err) {
        finish(reject, err);
      }
    });
  }

  function storageKey(publicId) {
    return 'haos_schedule_public_link_v774_' + String(publicId || '');
  }

  function rememberLink(publicId, data) {
    try {
      localStorage.setItem(storageKey(publicId), JSON.stringify(Object.assign({
        publicId,
        url: publicScheduleUrl(publicId),
        savedAt: new Date().toISOString()
      }, data || {})));
    } catch (e) {}
  }

  function rememberedLink(publicId) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(publicId)) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({ icon: 'success', title: 'คัดลอกลิงก์แล้ว', timer: 1300, showConfirmButton: false });
    } catch (e) {
      Swal.fire('คัดลอกอัตโนมัติไม่สำเร็จ', '<div class="text-break small">' + esc(text) + '</div>', 'info');
    }
  }

  function showLinkDialog(data, options) {
    options = options || {};
    const publicId = data.publicId || $('sdPublicId')?.value || '';
    const url = data.url || publicScheduleUrl(publicId);
    const enabled = data.enabled === true || String(data.enabled || '').toLowerCase() === 'true';
    const closed = data.enabled === false || data.closed === true;
    const state = closed ? '<span class="badge bg-danger">ปิดอยู่</span>' : (enabled ? '<span class="badge bg-success">เปิดใช้งาน</span>' : '<span class="badge bg-warning text-dark">ยังไม่ได้ยืนยันสถานะ</span>');
    const expires = data.expiresAt || data.expiresText || 'ไม่ทราบ/ไม่หมดอายุ';
    const note = options.note ? '<div class="alert alert-warning small mt-3 mb-0">' + options.note + '</div>' : '';
    Swal.fire({
      icon: closed ? 'warning' : 'info',
      title: 'ลิงก์สาธารณะของรายการนี้',
      width: 760,
      html: '<div class="text-start">' +
        '<div class="mb-2"><b>สถานะ:</b> ' + state + '</div>' +
        '<div class="mb-2"><b>หมดอายุ:</b> ' + esc(expires) + '</div>' +
        '<div class="border rounded p-3 bg-light text-break fw-bold">' + esc(url) + '</div>' +
        note +
      '</div>',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'คัดลอกลิงก์',
      denyButtonText: 'เปิดลิงก์',
      cancelButtonText: 'ปิด'
    }).then(result => {
      if (result.isConfirmed) copyText(url);
      if (result.isDenied) window.open(url, '_blank', 'noopener');
    });
  }

  function timeoutFallback(publicId, callback) {
    const url = publicScheduleUrl(publicId);
    const data = Object.assign({}, rememberedLink(publicId), {
      publicId,
      url,
      enabled: null,
      expiresAt: 'รอตรวจสอบจากระบบ'
    });
    rememberLink(publicId, data);
    const note = 'ระบบรอ Apps Script เกิน ' + Math.round(LINK_TIMEOUT_MS / 1000) + ' วินาที จึงหยุดการหมุนค้างให้ก่อน ลิงก์ด้านล่างสามารถคัดลอก/เปิดดูได้ทันที ถ้าเปิดแล้วยังไม่เห็นข้อมูล ให้รออีกครู่แล้วกดตรวจสถานะใหม่';
    if (typeof callback === 'function') {
      callback(url, data.expiresAt);
      return;
    }
    showLinkDialog(data, { note });
  }

  async function createPublicScheduleLink(callback) {
    const publicId = $('sdPublicId')?.value || '';
    if (!publicId) return Swal.fire('ไม่พบรหัสรายการ', 'กรุณาเปิดรายละเอียดงานอีกครั้ง', 'warning');

    const result = await Swal.fire({
      title: 'ตั้งค่าลิงก์สาธารณะ',
      input: 'select',
      inputOptions: {
        '1': 'หมดอายุใน 1 วัน',
        '7': 'หมดอายุใน 7 วัน',
        '30': 'หมดอายุใน 30 วัน',
        '0': 'ไม่หมดอายุ'
      },
      inputValue: '30',
      showCancelButton: true,
      confirmButtonText: 'สร้างลิงก์',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'กำลังสร้างลิงก์...',
      html: '<div class="small text-muted">กำลังเปิดสิทธิ์ลิงก์สาธารณะและบันทึกวันหมดอายุ</div>',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await callGas('getSchedulePublicUrlServer', [publicId, cleanPhone(currentUser().phone), Number(result.value)]);
      if (!res || res.success === false) throw new Error((res && res.message) || 'กรุณาลองใหม่อีกครั้ง');
      const data = {
        publicId,
        url: res.url || publicScheduleUrl(publicId),
        enabled: true,
        expiresAt: res.expiresAt || (Number(result.value) > 0 ? 'ตามวันที่ตั้งค่าไว้' : 'ไม่หมดอายุ'),
        patch: res.patch || PATCH
      };
      rememberLink(publicId, data);
      if (typeof callback === 'function') callback(data.url, data.expiresAt);
      else showLinkDialog(data);
    } catch (err) {
      const message = err && err.message ? err.message : String(err || '');
      if (message === 'TIMEOUT') return timeoutFallback(publicId, callback);
      Swal.fire({
        icon: 'error',
        title: 'สร้างลิงก์สาธารณะไม่สำเร็จ',
        html: '<div class="text-break text-start small">' + esc(message || 'กรุณาลองใหม่อีกครั้ง') + '</div>',
        confirmButtonText: 'ตกลง'
      });
    }
  }

  async function viewCurrentPublicLink() {
    const publicId = $('sdPublicId')?.value || '';
    if (!publicId) return Swal.fire('ไม่พบรหัสรายการ', 'กรุณาเปิดรายละเอียดงานอีกครั้ง', 'warning');
    const fallback = Object.assign({ publicId, url: publicScheduleUrl(publicId), enabled: null }, rememberedLink(publicId));
    Swal.fire({
      title: 'กำลังตรวจสถานะลิงก์...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });
    try {
      const res = await callGas('getSchedulePublicLinkStatus', [publicId, cleanPhone(currentUser().phone)], 20000);
      if (res && res.success) {
        const data = Object.assign({}, fallback, res.data || {}, { publicId, url: (res.data && res.data.url) || fallback.url });
        rememberLink(publicId, data);
        showLinkDialog(data);
      } else {
        showLinkDialog(fallback, { note: esc((res && res.message) || 'ตรวจสถานะจากระบบไม่สำเร็จ แสดงลิงก์จากรหัสรายการแทน') });
      }
    } catch (err) {
      showLinkDialog(fallback, { note: 'ตรวจสถานะจาก Apps Script ไม่ทันเวลา จึงแสดงลิงก์จากรหัสรายการแทน' });
    }
  }

  async function revokeCurrentPublicLink() {
    const publicId = $('sdPublicId')?.value || '';
    if (!publicId) return;
    const result = await Swal.fire({
      title: 'ปิดลิงก์สาธารณะนี้?',
      text: 'หลังปิดแล้ว ผู้ที่มีลิงก์จะเปิดดูรายการนี้ไม่ได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ปิดลิงก์',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;
    Swal.fire({ title: 'กำลังปิดลิงก์...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await callGas('revokePublicScheduleLink', [publicId, cleanPhone(currentUser().phone)], 25000);
      if (!res || res.success === false) throw new Error((res && res.message) || 'ปิดลิงก์ไม่สำเร็จ');
      rememberLink(publicId, { publicId, url: publicScheduleUrl(publicId), enabled: false, closed: true, expiresAt: '-' });
      Swal.fire('สำเร็จ', res.message || 'ปิดลิงก์สาธารณะแล้ว', 'success');
    } catch (err) {
      Swal.fire('ปิดลิงก์ไม่สำเร็จ', esc(err && err.message ? err.message : err), 'error');
    }
  }

  function ensureFooterButton() {
    const footer = document.querySelector('#scheduleDetailModal .modal-footer');
    if (!footer || footer.querySelector('.haos-v774-view-public-link')) return;
    const anchor = Array.from(footer.querySelectorAll('button')).find(btn => /copyPublicLink/.test(btn.getAttribute('onclick') || ''));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm mb-1 haos-v774-view-public-link';
    btn.innerHTML = '<i class="bi bi-box-arrow-up-right"></i> ดูลิงก์สาธารณะ';
    btn.onclick = viewCurrentPublicLink;
    if (anchor) anchor.insertAdjacentElement('afterend', btn);
    else footer.insertBefore(btn, footer.firstChild);
  }

  function boot() {
    ensureFooterButton();
    setTimeout(ensureFooterButton, 500);
  }

  window.getPublicScheduleUrl = function() {
    return publicScheduleUrl($('sdPublicId')?.value || '');
  };
  window.createPublicScheduleLink = createPublicScheduleLink;
  window.viewCurrentPublicLink = viewCurrentPublicLink;
  window.revokeCurrentPublicLink = revokeCurrentPublicLink;

  root.schedulePublicLink = {
    version: PATCH,
    publicScheduleUrl,
    callGas,
    viewCurrentPublicLink
  };
  window.haosSchedulePublicLinkDiagnosticsV774 = function() {
    return {
      patch: PATCH,
      hasGoogleRunner: !!(window.google && google.script && google.script.run),
      publicId: $('sdPublicId')?.value || '',
      baseUrl: publicBaseUrl()
    };
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  console.info('HAOS ' + PATCH + ' loaded');
})();
