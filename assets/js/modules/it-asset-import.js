(function () {
  const PATCH = 'v70.111-it-asset-import';
  if (window.__HAOS_IT_ASSET_IMPORT__) return;
  window.__HAOS_IT_ASSET_IMPORT__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const getUser = () => {
    try { return window.user || user || {}; } catch (e) { return window.user || {}; }
  };

  function actor() {
    const u = getUser();
    return {
      phone: u.phone || u.userPhone || '',
      name: u.fullName || u.name || '',
      role: u.role || '',
      department: u.department || ''
    };
  }

  function canManageIT() {
    const data = window.haosITV702Data || window.haosITV703Data || {};
    if (data.permissions && data.permissions.canManageIT) return true;
    const u = getUser();
    const role = String(u.role || '');
    const dept = String(u.department || '');
    return /super\s*admin|admin/i.test(role) || role === 'Super Admin' || role === 'Admin' || dept.includes('สุขภาพดิจิทัล') || /digital\s*health/i.test(dept);
  }

  function gas(fn, args) {
    if (typeof window.gasRunPromise_ === 'function') return window.gasRunPromise_(fn, args || []);
    return new Promise((resolve, reject) => {
      try {
        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn].apply(google.script.run, args || []);
      } catch (e) { reject(e); }
    });
  }

  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-haos-xlsx]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.XLSX), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      script.dataset.haosXlsx = '1';
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error('โหลดตัวอ่าน Excel ไม่สำเร็จ'));
      document.head.appendChild(script);
    });
  }

  function pick(row, names) {
    for (const name of names) {
      if (row[name] !== undefined && row[name] !== null && clean(row[name]) !== '') return row[name];
    }
    const keys = Object.keys(row || {});
    for (const key of keys) {
      const normalized = key.replace(/\s+/g, '');
      for (const name of names) {
        if (normalized.includes(String(name).replace(/\s+/g, ''))) return row[key];
      }
    }
    return '';
  }

  function formatDateValue(value) {
    if (!value) return '';
    if (value instanceof Date && !isNaN(value)) {
      const pad = n => String(n).padStart(2, '0');
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    }
    return clean(value);
  }

  function isBlankRow(row) {
    return !row || row.every(value => clean(value) === '');
  }

  function findHeaderIndex(rows) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const line = (rows[i] || []).map(clean).join('|');
      if (line.includes('รหัสครุภัณฑ์') || line.includes('รายการครุภัณฑ์') || line.includes('Asset Code')) return i;
    }
    return 0;
  }

  function parseSheetRows(sheet, sheetName) {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    const headerIndex = findHeaderIndex(rows);
    const header = rows[headerIndex] || [];
    const sub = rows[headerIndex + 1] || [];
    const headers = header.map((value, index) => {
      const main = clean(value);
      const child = clean(sub[index]);
      if (main && child && !main.includes(child) && /รายการเสียหาย|วัน\/เดือน\/ปี|จำนวน/.test(main)) return `${main} ${child}`;
      return main || child || `col_${index + 1}`;
    });
    let start = headerIndex + 1;
    const subLine = sub.map(clean).join('|');
    if (/หน่วย|ที่ได้มา|ชำรุด|เสื่อมสภาพ/.test(subLine)) start = headerIndex + 2;
    const out = [];
    for (let r = start; r < rows.length; r++) {
      const row = rows[r] || [];
      if (isBlankRow(row)) continue;
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      const first = clean(row[0]);
      if (/^จำนวนเงินรวม|^รวม$/i.test(first)) continue;
      const asset = {
        sourceSheet: sheetName,
        assetCode: pick(obj, ['รหัสครุภัณฑ์', 'Asset Code']),
        assetNumber: pick(obj, ['หมายเลขทรัพย์ในระบบ GFMIS', 'GFMIS']),
        assetName: pick(obj, ['รายการครุภัณฑ์', 'ชื่อทรัพย์สิน']),
        spec: pick(obj, ['รายละเอียด', 'Spec']),
        category: pick(obj, ['ประเภทครุภัณฑ์', 'Category']),
        purchaseDate: formatDateValue(pick(obj, ['วัน/เดือน/ปี ที่ได้มา', 'วัน/เดือน/ปี', 'วันที่ได้มา'])),
        price: pick(obj, ['มูลค่าการได้มา', 'ราคา']),
        ownerDepartment: pick(obj, ['ผู้ใช้งาน', 'กลุ่มงาน']),
        damaged: pick(obj, ['รายการเสียหายใช้อยู่หรือไม่ได้ใช้ ชำรุด', 'ชำรุด']),
        deteriorated: pick(obj, ['รายการเสียหายใช้อยู่หรือไม่ได้ใช้ เสื่อมสภาพ', 'เสื่อมสภาพ']),
        remark: sheetName && /โปรแกรม/i.test(sheetName) ? 'นำเข้าจากชีตโปรแกรมคอมพิวเตอร์' : ''
      };
      if (clean(asset.assetName) || clean(asset.assetCode) || clean(asset.assetNumber)) out.push(asset);
    }
    return out;
  }

  async function readWorkbook(file) {
    const XLSX = await ensureXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const rows = [];
    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      rows.push(...parseSheetRows(sheet, name));
    });
    return rows;
  }

  async function openImportDialog() {
    if (!canManageIT()) {
      await Swal.fire('ไม่มีสิทธิ์นำเข้า', 'ปุ่มนำเข้าใช้ได้เฉพาะผู้มีสิทธิ์จัดการทะเบียนทรัพย์สิน IT Manager mode', 'warning');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        Swal.fire({ title: 'กำลังอ่านไฟล์...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const rows = await readWorkbook(file);
        if (!rows.length) throw new Error('ไม่พบรายการทรัพย์สินในไฟล์นี้');
        const sample = rows.slice(0, 6).map((row, index) => '<tr><td>' + (index + 1) + '</td><td>' + esc(row.assetCode || '-') + '</td><td>' + esc(row.assetName || '-') + '</td><td>' + esc(row.ownerDepartment || '-') + '</td></tr>').join('');
        const confirm = await Swal.fire({
          icon: 'question',
          title: 'นำเข้าทะเบียนทรัพย์สิน IT',
          html: '<div class="text-start"><p>พบรายการที่อ่านได้ <b>' + rows.length + '</b> รายการ ระบบจะเพิ่มใหม่หรืออัปเดตรายการเดิมจากรหัสครุภัณฑ์ / เลข GFMIS / Serial</p><div class="table-responsive"><table class="table table-sm"><thead><tr><th>#</th><th>รหัส</th><th>รายการ</th><th>หน่วยงาน</th></tr></thead><tbody>' + sample + '</tbody></table></div></div>',
          width: 760,
          showCancelButton: true,
          confirmButtonText: 'เริ่มนำเข้า',
          cancelButtonText: 'ยกเลิก'
        });
        if (!confirm.isConfirmed) return;
        Swal.fire({ title: 'กำลังนำเข้าฐานข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await gas('importITAssetsV7111', [rows, actor()]);
        if (!res || !res.success) throw new Error((res && res.message) || 'นำเข้าไม่สำเร็จ');
        await Swal.fire('นำเข้าสำเร็จ', `เพิ่มใหม่ ${res.inserted || 0} รายการ · อัปเดต ${res.updated || 0} รายการ · ข้าม ${res.skipped || 0} รายการ`, 'success');
        try { await window.loadITAssetModuleV70?.(); } catch (e) {}
        try { window.renderITAssetsV70?.(); } catch (e) {}
      } catch (err) {
        Swal.fire('นำเข้าไม่สำเร็จ', err.message || String(err), 'error');
      }
    }, { once: true });
    input.click();
  }

  function installButton() {
    const panel = document.getElementById('itAssetPanelV70');
    const target = panel && panel.querySelector('.card-header .d-flex.gap-2.flex-wrap');
    if (!target) return;
    let btn = document.getElementById('itAssetImportBtnV7111');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'itAssetImportBtnV7111';
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline-success fw-bold';
      btn.innerHTML = '<i class="bi bi-file-earmark-arrow-up"></i> นำเข้า Excel';
      btn.addEventListener('click', openImportDialog);
      target.insertBefore(btn, target.firstChild);
    }
    btn.style.display = canManageIT() ? '' : 'none';
  }

  function wrap(name) {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__haosImportWrapped) return;
    const wrapped = function () {
      const result = fn.apply(this, arguments);
      Promise.resolve(result).finally(() => setTimeout(installButton, 250));
      return result;
    };
    wrapped.__haosImportWrapped = true;
    window[name] = wrapped;
  }

  function boot() {
    installButton();
    ['openITAssetModuleV70', 'loadITAssetModuleV70', 'renderITAssetsV70'].forEach(wrap);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setInterval(installButton, 1500);
  console.info('HAOS ' + PATCH + ' loaded');
})();
