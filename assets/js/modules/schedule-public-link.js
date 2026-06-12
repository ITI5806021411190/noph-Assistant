(function(){
  const PATCH = 'v70.73-schedule-public-link-timeout';
  if (window.__HAOS_V773_SCHEDULE_PUBLIC_LINK__) return;
  window.__HAOS_V773_SCHEDULE_PUBLIC_LINK__ = true;

  const $ = id => document.getElementById(id);
  const root = window.HAOS = window.HAOS || {};

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

  function callPublicLinkServer(publicId, phone, days, timeoutMs) {
    timeoutMs = timeoutMs || 25000;
    return new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error('TIMEOUT'));
      }, timeoutMs);

      function finish(fn, value) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        fn(value);
      }

      try {
        if (!window.google || !google.script || !google.script.run) {
          throw new Error('ไม่พบตัวเชื่อม Google Apps Script');
        }
        google.script.run
          .withSuccessHandler(res => finish(resolve, res))
          .withFailureHandler(err => finish(reject, err))
          .getSchedulePublicUrlServer(publicId, phone, days);
      } catch (err) {
        finish(reject, err);
      }
    });
  }

  function showPublicLinkError(err) {
    const message = err && err.message ? err.message : String(err || '');
    const isTimeout = message === 'TIMEOUT';
    Swal.fire({
      icon: 'error',
      title: isTimeout ? 'สร้างลิงก์ไม่สำเร็จในเวลาที่กำหนด' : 'สร้างลิงก์สาธารณะไม่สำเร็จ',
      html: isTimeout
        ? '<div class="text-start">ระบบรอ Apps Script เกิน 25 วินาที จึงหยุดการหมุนค้างให้ก่อนครับ<br><small class="text-muted">ให้ลองกดใหม่อีกครั้ง ถ้ายังเป็นซ้ำให้ตรวจว่าอัปเดต Google Apps Script v70.73 แล้วหรือยัง</small></div>'
        : '<div class="text-break text-start small">' + String(message || 'กรุณาลองใหม่อีกครั้ง') + '</div>',
      confirmButtonText: 'ตกลง'
    });
  }

  async function createPublicScheduleLink(callback) {
    const publicId = $('sdPublicId')?.value || '';
    if (!publicId) {
      return Swal.fire('ไม่พบรหัสรายการ', 'กรุณาเปิดรายละเอียดงานอีกครั้ง', 'warning');
    }
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
      const res = await callPublicLinkServer(publicId, cleanPhone(currentUser().phone), Number(result.value));
      if (!res || res.success === false) {
        throw new Error((res && res.message) || 'กรุณาลองใหม่อีกครั้ง');
      }
      const url = res.url || publicScheduleUrl(publicId);
      const expiresAt = res.expiresAt || (Number(result.value) > 0 ? 'ตามวันที่ตั้งค่าไว้' : 'ไม่หมดอายุ');
      if (typeof callback === 'function') callback(url, expiresAt);
      else {
        Swal.fire({
          icon: 'success',
          title: 'สร้างลิงก์สาธารณะแล้ว',
          html: '<div class="text-break small">' + url + '</div><div class="small text-muted mt-2">หมดอายุ: ' + expiresAt + '</div>',
          confirmButtonText: 'ตกลง'
        });
      }
    } catch (err) {
      showPublicLinkError(err);
    }
  }

  window.getPublicScheduleUrl = function() {
    return publicScheduleUrl($('sdPublicId')?.value || '');
  };
  window.createPublicScheduleLink = createPublicScheduleLink;

  root.schedulePublicLink = {
    version: PATCH,
    publicScheduleUrl,
    callPublicLinkServer
  };
  window.haosSchedulePublicLinkDiagnosticsV773 = function() {
    return {
      patch: PATCH,
      hasGoogleRunner: !!(window.google && google.script && google.script.run),
      publicId: $('sdPublicId')?.value || '',
      baseUrl: publicBaseUrl()
    };
  };

  console.info('HAOS ' + PATCH + ' loaded');
})();
