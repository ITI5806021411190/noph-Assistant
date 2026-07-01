(function () {
  const PATCH = 'v70.123-it-asset-category-override';
  if (window.__HAOS_IT_ASSET_IMPORT__) return;
  window.__HAOS_IT_ASSET_IMPORT__ = true;

  const PAGE_SIZE = 20;
  let assetPageV7121 = 1;
  let lastAssetFilterKeyV7121 = '';
  const selectedAssetIdsV7123 = new Set();

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

  const assetState = () => window.haosITAssetStateV7120 || window.haosITV702Data || window.haosITV703Data || { assets: [], maps: [] };

  function assetDateText(value) {
    try {
      if (!value) return '-';
      if (window.HAOSDateDisplay && window.HAOSDateDisplay.date) return window.HAOSDateDisplay.date(value);
      return clean(value) || '-';
    } catch (e) {
      return clean(value) || '-';
    }
  }

  function assetYear(value) {
    const raw = clean(value);
    if (!raw) return '';
    const m = raw.match(/(25\d{2}|20\d{2}|19\d{2})/);
    if (m) {
      let y = Number(m[1]);
      if (y && y < 2400) y += 543;
      return y ? String(y) : '';
    }
    const normalized = raw.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, (_, d, mo, y) => {
      let yy = Number(y);
      if (yy < 100) yy += yy > 40 ? 2500 : 2000;
      if (yy > 2400) yy -= 543;
      return `${yy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) return String(d.getFullYear() + 543);
    return '';
  }

  function fillSelect(id, values) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const uniq = [...new Set((values || []).map(clean).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'th'));
    const signature = uniq.join('\u001f');
    if (el.dataset.haosOptionsSignature === signature) return;
    el.dataset.haosOptionsSignature = signature;
    el.innerHTML = '<option value="">ทั้งหมด</option>' + uniq.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('');
    if (uniq.includes(current)) el.value = current;
  }

  function statusBadge(value) {
    if (typeof window.statusBadgeV70 === 'function') return window.statusBadgeV70(value);
    const text = clean(value) || 'ไม่ระบุ';
    let cls = 'info';
    if (/ใช้งาน|Active|Resolved|Closed|ดำเนินการแล้ว/.test(text)) cls = 'ok';
    if (/ซ่อม|Waiting|Expiring|New|Assigned|In Progress|รอ/.test(text)) cls = 'warn';
    if (/ชำรุด|Expired|Cancelled|เสีย|หมดอายุ/.test(text)) cls = 'bad';
    return '<span class="haos-v70-status ' + cls + '">' + esc(text) + '</span>';
  }

  function licenseCount(assetId) {
    const data = assetState();
    return (data.maps || []).filter(m => String(m.assetId) === String(assetId) && m.activationStatus !== 'Removed').length;
  }

  function categoryOptions() {
    const data = assetState();
    const defaults = [
      'คอมพิวเตอร์ตั้งโต๊ะ / PC',
      'Notebook',
      'เครื่องพิมพ์ / Printer',
      'Scanner',
      'จอภาพ / Monitor',
      'อุปกรณ์เครือข่าย',
      'Server / Storage',
      'UPS / ไฟฟ้าสำรอง',
      'Projector',
      'Software / License',
      'อุปกรณ์ต่อพ่วง / Accessory',
      'อื่นๆ / ต้องจัดหมวดเพิ่ม'
    ];
    const values = [
      ...(data.categoryOverrideOptions || data.filters?.categoryOverrideOptions || []),
      ...defaults,
      ...(data.assets || []).flatMap(a => [a.smartCategory, a.autoSmartCategory, a.manualCategory, a.category])
    ];
    return [...new Set(values.map(clean).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'th'));
  }

  function categorySelectHtml(id, selected) {
    const options = categoryOptions();
    const current = clean(selected);
    const hasCurrent = current && !options.includes(current);
    return '<select id="' + esc(id) + '" class="form-select">' +
      '<option value="">ใช้หมวดที่ระบบจัดให้อัตโนมัติ</option>' +
      (hasCurrent ? '<option value="' + esc(current) + '" selected>' + esc(current) + '</option>' : '') +
      options.map(v => '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(v) + '</option>').join('') +
      '</select>';
  }

  function assetById(assetId) {
    const data = assetState();
    return (data.assets || []).find(a => String(a.assetId) === String(assetId));
  }

  function syncAssetsAfterCategoryOverride(assetIds, manualCategory, cleared) {
    const ids = new Set((assetIds || []).map(String));
    [window.haosITAssetStateV7120, window.haosITV702Data, window.haosITV703Data].forEach(data => {
      if (!data || !Array.isArray(data.assets)) return;
      data.assets.forEach(asset => {
        if (!ids.has(String(asset.assetId))) return;
        const autoCategory = asset.autoSmartCategory || asset.smartCategory || asset.category || '';
        asset.autoSmartCategory = asset.autoSmartCategory || autoCategory;
        if (cleared || !manualCategory) {
          asset.manualCategory = '';
          asset.categoryOverridden = false;
          asset.smartCategory = asset.autoSmartCategory || asset.category || '';
          asset.finalCategory = asset.smartCategory;
        } else {
          asset.manualCategory = manualCategory;
          asset.categoryOverridden = true;
          asset.smartCategory = manualCategory;
          asset.finalCategory = manualCategory;
        }
      });
    });
  }

  async function saveCategoryOverride(assetIds, manualCategory, note) {
    const ids = (assetIds || []).map(String).filter(Boolean);
    const res = await gas('saveITAssetCategoryOverrideV7123', [{
      assetIds: ids,
      manualCategory: clean(manualCategory),
      note: clean(note),
      clearOverride: !clean(manualCategory)
    }, actor()]);
    if (!res || !res.success) throw new Error(res?.message || 'บันทึกหมวดย่อยไม่สำเร็จ');
    syncAssetsAfterCategoryOverride(ids, clean(manualCategory), !!res.cleared);
    return res;
  }

  window.openITAssetCategoryOverrideV7123 = async function (assetId) {
    if (!canManageIT()) {
      await Swal.fire('ไม่มีสิทธิ์', 'ใช้ได้เฉพาะผู้มีสิทธิ์จัดการทะเบียนทรัพย์สิน IT', 'warning');
      return;
    }
    const asset = assetById(assetId);
    if (!asset) {
      await Swal.fire('ไม่พบรายการ', 'ไม่พบทรัพย์สินที่ต้องการแก้หมวดย่อย', 'warning');
      return;
    }
    const result = await Swal.fire({
      title: 'แก้หมวดย่อยทรัพย์สิน',
      html: '<div class="text-start">' +
        '<div class="alert alert-info py-2"><b>' + esc(asset.assetName || '-') + '</b><br><small>' + esc(asset.assetCode || asset.assetNumber || '-') + '</small></div>' +
        '<label class="small fw-bold text-muted">หมวดที่ระบบจัดให้</label><input class="form-control mb-2" value="' + esc(asset.autoSmartCategory || asset.smartCategory || '-') + '" disabled>' +
        '<label class="small fw-bold text-muted">หมวดย่อยที่ต้องการใช้จริง</label>' + categorySelectHtml('itAssetManualCategoryV7123', asset.manualCategory || (asset.categoryOverridden ? asset.smartCategory : '')) +
        '<label class="small fw-bold text-muted mt-2">หมายเหตุ</label><textarea id="itAssetCategoryNoteV7123" class="form-control" rows="3" placeholder="เช่น ระบบเดาจากชื่อรายการผิด / จัดตามการใช้งานจริง">' + esc(asset.categoryOverrideNote || '') + '</textarea>' +
        '<div class="form-text">ถ้าเลือก “ใช้หมวดที่ระบบจัดให้อัตโนมัติ” ระบบจะล้างการแก้หมวดเองของรายการนี้</div>' +
      '</div>',
      width: 640,
      showCancelButton: true,
      confirmButtonText: 'บันทึกหมวดย่อย',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => ({
        manualCategory: document.getElementById('itAssetManualCategoryV7123')?.value || '',
        note: document.getElementById('itAssetCategoryNoteV7123')?.value || ''
      })
    });
    if (!result.isConfirmed) return;
    try {
      Swal.fire({ title: 'กำลังบันทึกหมวดย่อย...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await saveCategoryOverride([assetId], result.value.manualCategory, result.value.note);
      await Swal.fire({ icon: 'success', title: 'บันทึกหมวดย่อยแล้ว', timer: 1100, showConfirmButton: false });
      selectedAssetIdsV7123.delete(String(assetId));
      renderEnhancedAssetRows();
    } catch (err) {
      Swal.fire('ผิดพลาด', err.message || String(err), 'error');
    }
  };

  window.openITAssetBulkCategoryOverrideV7123 = async function () {
    if (!canManageIT()) {
      await Swal.fire('ไม่มีสิทธิ์', 'ใช้ได้เฉพาะผู้มีสิทธิ์จัดการทะเบียนทรัพย์สิน IT', 'warning');
      return;
    }
    const ids = [...selectedAssetIdsV7123].filter(id => assetById(id));
    if (!ids.length) {
      await Swal.fire('ยังไม่ได้เลือกรายการ', 'ติ๊กเลือกรายการทรัพย์สินที่ต้องการแก้หมวดย่อยก่อนครับ', 'info');
      return;
    }
    const result = await Swal.fire({
      title: 'แก้หมวดย่อยหลายรายการ',
      html: '<div class="text-start">' +
        '<div class="alert alert-warning py-2">กำลังแก้หมวดย่อย <b>' + ids.length + '</b> รายการ</div>' +
        '<label class="small fw-bold text-muted">หมวดย่อยที่ต้องการใช้จริง</label>' + categorySelectHtml('itAssetBulkManualCategoryV7123', '') +
        '<label class="small fw-bold text-muted mt-2">หมายเหตุ</label><textarea id="itAssetBulkCategoryNoteV7123" class="form-control" rows="3" placeholder="หมายเหตุสำหรับการแก้หมวดครั้งนี้"></textarea>' +
        '<div class="form-text">ถ้าเลือก “ใช้หมวดที่ระบบจัดให้อัตโนมัติ” ระบบจะล้างหมวดที่แก้เองของรายการที่เลือกทั้งหมด</div>' +
      '</div>',
      width: 640,
      showCancelButton: true,
      confirmButtonText: 'บันทึกทั้งหมด',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => ({
        manualCategory: document.getElementById('itAssetBulkManualCategoryV7123')?.value || '',
        note: document.getElementById('itAssetBulkCategoryNoteV7123')?.value || ''
      })
    });
    if (!result.isConfirmed) return;
    try {
      Swal.fire({ title: 'กำลังบันทึกหมวดย่อย...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await saveCategoryOverride(ids, result.value.manualCategory, result.value.note);
      selectedAssetIdsV7123.clear();
      await Swal.fire({ icon: 'success', title: 'บันทึกหมวดย่อยแล้ว', timer: 1100, showConfirmButton: false });
      renderEnhancedAssetRows();
    } catch (err) {
      Swal.fire('ผิดพลาด', err.message || String(err), 'error');
    }
  };

  function installAssetTools() {
    const panel = document.getElementById('itAssetPanelV70');
    const filter = panel && panel.querySelector('.haos-v70-filter');
    const row = filter && filter.querySelector('.row.g-2.align-items-end');
    if (!panel || !filter || !row) return;
    if (!document.getElementById('itAssetExtraFiltersV7120')) {
      row.insertAdjacentHTML('afterend',
        '<div id="itAssetExtraFiltersV7120" class="row g-2 align-items-end mt-2">' +
          '<div class="col-md-3"><label class="small fw-bold text-muted">กลุ่มงาน</label><select id="itAssetDeptV7120" class="form-select"></select></div>' +
          '<div class="col-md-3"><label class="small fw-bold text-muted">สถานที่ติดตั้ง</label><select id="itAssetLocationV7120" class="form-select"></select></div>' +
          '<div class="col-md-2"><label class="small fw-bold text-muted">ปีที่ได้มา</label><select id="itAssetYearV7120" class="form-select"></select></div>' +
          '<div class="col-md-2"><label class="small fw-bold text-muted">เรียงปีที่ได้มา</label><select id="itAssetYearSortV7120" class="form-select"><option value="">ค่าเดิม</option><option value="desc">มากไปน้อย</option><option value="asc">น้อยไปมาก</option></select></div>' +
          '<div class="col-md-3 d-flex gap-2 flex-wrap align-items-end"><button type="button" id="itAssetBulkCategoryV7123" class="btn btn-outline-success fw-bold flex-fill"><i class="bi bi-tags"></i> แก้หมวด</button><button type="button" id="itAssetExportV7120" class="btn btn-outline-primary fw-bold flex-fill"><i class="bi bi-download"></i> Export</button><button type="button" id="itAssetPrintV7120" class="btn btn-outline-secondary fw-bold flex-fill"><i class="bi bi-printer"></i> พิมพ์</button><button type="button" id="itAssetImageV7120" class="btn btn-outline-info fw-bold flex-fill"><i class="bi bi-image"></i> รูปภาพ</button></div>' +
        '</div>');
      ['itAssetDeptV7120', 'itAssetLocationV7120', 'itAssetYearV7120', 'itAssetYearSortV7120'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => {
          assetPageV7121 = 1;
          window.renderITAssetsV70 && window.renderITAssetsV70();
        });
      });
      document.getElementById('itAssetBulkCategoryV7123')?.addEventListener('click', () => window.openITAssetBulkCategoryOverrideV7123?.());
      document.getElementById('itAssetExportV7120')?.addEventListener('click', exportVisibleAssets);
      document.getElementById('itAssetPrintV7120')?.addEventListener('click', printVisibleAssets);
      document.getElementById('itAssetImageV7120')?.addEventListener('click', downloadAssetImage);
    }
    const bulkCategoryBtn = document.getElementById('itAssetBulkCategoryV7123');
    if (bulkCategoryBtn) bulkCategoryBtn.style.display = canManageIT() ? '' : 'none';
    const data = assetState();
    const assets = data.assets || [];
    fillSelect('itAssetDeptV7120', assets.map(a => a.ownerDepartment || a.department));
    fillSelect('itAssetLocationV7120', assets.map(a => a.location || a.installLocation));
    fillSelect('itAssetYearV7120', assets.map(a => assetYear(a.purchaseDate || a.acquiredDate)));
  }

  function visibleAssets() {
    const data = assetState();
    const assets = data.assets || [];
    const q = clean(document.getElementById('itAssetSearchV70')?.value).toLowerCase();
    const smart = document.getElementById('itAssetSmartCategoryV7116')?.value || '';
    const cat = document.getElementById('itAssetCategoryV70')?.value || '';
    const st = document.getElementById('itAssetStatusV70')?.value || '';
    const dept = document.getElementById('itAssetDeptV7120')?.value || '';
    const loc = document.getElementById('itAssetLocationV7120')?.value || '';
    const year = document.getElementById('itAssetYearV7120')?.value || '';
    const yearSort = document.getElementById('itAssetYearSortV7120')?.value || '';
    const list = assets.filter(a => {
      const ay = assetYear(a.purchaseDate || a.acquiredDate);
      const ownerDept = clean(a.ownerDepartment || a.department);
      const place = clean(a.location || a.installLocation);
      return (!smart || a.smartCategory === smart)
        && (!cat || a.category === cat)
        && (!st || a.status === st)
        && (!dept || ownerDept === dept)
        && (!loc || place === loc)
        && (!year || ay === year)
        && (!q || clean(Object.values(a).join(' ')).toLowerCase().includes(q));
    });
    if (yearSort) {
      list.sort((a, b) => {
        const av = Number(assetYear(a.purchaseDate || a.acquiredDate) || 0);
        const bv = Number(assetYear(b.purchaseDate || b.acquiredDate) || 0);
        return yearSort === 'asc' ? av - bv : bv - av;
      });
    }
    return list;
  }

  function assetFilterKey() {
    return [
      clean(document.getElementById('itAssetSearchV70')?.value).toLowerCase(),
      document.getElementById('itAssetSmartCategoryV7116')?.value || '',
      document.getElementById('itAssetCategoryV70')?.value || '',
      document.getElementById('itAssetStatusV70')?.value || '',
      document.getElementById('itAssetDeptV7120')?.value || '',
      document.getElementById('itAssetLocationV7120')?.value || '',
      document.getElementById('itAssetYearV7120')?.value || '',
      document.getElementById('itAssetYearSortV7120')?.value || ''
    ].join('\u001e');
  }

  function ensureAssetPager() {
    const panel = document.getElementById('itAssetPanelV70');
    const tableWrap = panel && panel.querySelector('.table-responsive');
    if (!panel || !tableWrap) return null;
    let pager = document.getElementById('itAssetPagerV7121');
    if (!pager) {
      tableWrap.insertAdjacentHTML('afterend', '<div id="itAssetPagerV7121" class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 small"></div>');
      pager = document.getElementById('itAssetPagerV7121');
    }
    return pager;
  }

  function renderAssetPager(total) {
    const pager = ensureAssetPager();
    if (!pager) return;
    if (!total || total <= PAGE_SIZE) {
      pager.innerHTML = total ? '<div class="text-muted fw-bold">แสดง ' + total + ' รายการทั้งหมด</div>' : '';
      return;
    }
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    assetPageV7121 = Math.min(Math.max(1, assetPageV7121), totalPages);
    const start = ((assetPageV7121 - 1) * PAGE_SIZE) + 1;
    const end = Math.min(assetPageV7121 * PAGE_SIZE, total);
    const first = Math.max(1, assetPageV7121 - 2);
    const last = Math.min(totalPages, assetPageV7121 + 2);
    const pageButtons = [];
    for (let page = first; page <= last; page++) {
      pageButtons.push('<button type="button" class="btn btn-sm ' + (page === assetPageV7121 ? 'btn-primary' : 'btn-outline-primary') + ' fw-bold" data-it-asset-page="' + page + '">' + page + '</button>');
    }
    pager.innerHTML =
      '<div class="text-muted fw-bold">แสดง ' + start + '-' + end + ' จาก ' + total + ' รายการ</div>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap">' +
        '<button type="button" class="btn btn-sm btn-outline-secondary fw-bold" data-it-asset-page="' + (assetPageV7121 - 1) + '" ' + (assetPageV7121 <= 1 ? 'disabled' : '') + '>ก่อนหน้า</button>' +
        pageButtons.join('') +
        '<button type="button" class="btn btn-sm btn-outline-secondary fw-bold" data-it-asset-page="' + (assetPageV7121 + 1) + '" ' + (assetPageV7121 >= totalPages ? 'disabled' : '') + '>ถัดไป</button>' +
      '</div>';
    pager.querySelectorAll('[data-it-asset-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = Number(btn.dataset.itAssetPage || 1);
        if (!page || page === assetPageV7121) return;
        assetPageV7121 = Math.min(Math.max(1, page), totalPages);
        renderEnhancedAssetRows();
      });
    });
  }

  window.setITAssetPageV7121 = function (page) {
    assetPageV7121 = Number(page) || 1;
    renderEnhancedAssetRows();
  };

  function renderEnhancedAssetRows() {
    installAssetTools();
    const tbody = document.getElementById('itAssetTableV70');
    if (!tbody) return;
    const data = assetState();
    if (!Array.isArray(data.assets) || !data.assets.length) return;
    const list = visibleAssets();
    const filterKey = assetFilterKey();
    if (filterKey !== lastAssetFilterKeyV7121) {
      assetPageV7121 = 1;
      lastAssetFilterKeyV7121 = filterKey;
    }
    window.haosITAssetVisibleRowsV7120 = list;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">ไม่พบข้อมูลตามตัวกรอง</td></tr>';
      renderAssetPager(0);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    assetPageV7121 = Math.min(Math.max(1, assetPageV7121), totalPages);
    const offset = (assetPageV7121 - 1) * PAGE_SIZE;
    const pageRows = list.slice(offset, offset + PAGE_SIZE);
    tbody.innerHTML = pageRows.map((a, idx) => {
      const code = a.assetCode || a.assetNumber || '-';
      const category = a.smartCategory || a.finalCategory || a.category || '-';
      const ownerDept = a.ownerDepartment || a.department || '';
      const place = a.location || a.installLocation || '-';
      const manage = canManageIT();
      const selected = selectedAssetIdsV7123.has(String(a.assetId)) ? ' checked' : '';
      const selectBox = manage ? '<input class="form-check-input me-2" type="checkbox" data-it-asset-select="' + esc(a.assetId) + '"' + selected + ' title="เลือกเพื่อแก้หมวดหลายรายการ">' : '';
      const manualBadge = a.categoryOverridden ? ' <span class="badge bg-success-subtle text-success border border-success-subtle">แก้หมวดเอง</span>' : '';
      const categoryAction = manage ? ' <button type="button" class="btn btn-sm btn-outline-success" onclick="openITAssetCategoryOverrideV7123(\'' + esc(a.assetId) + '\')" title="แก้หมวดย่อย"><i class="bi bi-tags"></i></button>' : '';
      return '<tr>' +
        '<td><div class="d-flex align-items-start gap-1"><div>' + selectBox + '</div><div class="flex-grow-1"><div class="fw-bold text-primary">' + esc(a.assetName || '-') + '</div><small class="text-muted">' + esc((offset + idx + 1) + '. ' + code) + ' • ' + esc(category) + manualBadge + '</small><br><small>' + esc([a.brand, a.model, a.serialNumber].filter(Boolean).join(' / ')) + '</small></div></div></td>' +
        '<td><b>' + esc(a.currentUserName || '-') + '</b><br><small class="text-muted">' + esc(ownerDept) + ' • ' + esc(place) + '</small></td>' +
        '<td>' + statusBadge(a.status) + '<br><small class="text-muted">' + esc(a.condition || '') + '</small><br><small class="text-muted">ได้มา ' + esc(assetDateText(a.purchaseDate || a.acquiredDate)) + '</small></td>' +
        '<td><span class="badge bg-info">' + licenseCount(a.assetId) + ' license</span><br><small class="text-muted">มูลค่า ' + esc(a.price || '-') + '</small><br><small class="text-muted">ประกันถึง ' + esc(assetDateText(a.warrantyEnd)) + '</small></td>' +
        '<td class="text-end">' + categoryAction + ' <button class="btn btn-sm btn-outline-primary" onclick="openITAssetDetailV70(\'' + esc(a.assetId) + '\')"><i class="bi bi-eye"></i></button> <button class="btn btn-sm btn-outline-warning text-dark" onclick="openITAssetFormV70(\'' + esc(a.assetId) + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" onclick="openITRepairTicketFormV70(\'' + esc(a.assetId) + '\')"><i class="bi bi-tools"></i></button></td>' +
      '</tr>';
    }).join('');
    tbody.querySelectorAll('[data-it-asset-select]').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = String(cb.dataset.itAssetSelect || '');
        if (!id) return;
        if (cb.checked) selectedAssetIdsV7123.add(id);
        else selectedAssetIdsV7123.delete(id);
      });
    });
    renderAssetPager(list.length);
  }

  function csvCell(value) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"';
  }

  function exportVisibleAssets() {
    const list = visibleAssets();
    const headers = ['ลำดับ', 'รหัสทรัพย์สิน', 'ชื่อทรัพย์สิน', 'หมวด', 'กลุ่มงาน', 'สถานที่ติดตั้ง', 'ผู้ใช้งาน', 'สถานะ', 'วันที่ได้มา', 'ปีที่ได้มา', 'มูลค่า', 'Serial'];
    const rows = list.map((a, i) => [
      i + 1,
      a.assetCode || a.assetNumber || '',
      a.assetName || '',
      a.smartCategory || a.category || '',
      a.ownerDepartment || a.department || '',
      a.location || a.installLocation || '',
      a.currentUserName || '',
      a.status || '',
      assetDateText(a.purchaseDate || a.acquiredDate),
      assetYear(a.purchaseDate || a.acquiredDate),
      a.price || '',
      a.serialNumber || ''
    ]);
    const csv = '\ufeff' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'haos-it-assets-' + Date.now() + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function printVisibleAssets() {
    const list = visibleAssets();
    const rows = list.map((a, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(a.assetCode || a.assetNumber || '-') + '</td><td>' + esc(a.assetName || '-') + '</td><td>' + esc(a.smartCategory || a.category || '-') + '</td><td>' + esc(a.ownerDepartment || a.department || '-') + '</td><td>' + esc(a.location || a.installLocation || '-') + '</td><td>' + esc(a.status || '-') + '</td><td>' + esc(assetDateText(a.purchaseDate || a.acquiredDate)) + '</td></tr>').join('');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>IT Assets</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:22px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#e0f2fe}</style></head><body><h1>ทะเบียนทรัพย์สิน IT และ Software License</h1><p>จำนวน ' + list.length + ' รายการ</p><table><thead><tr><th>#</th><th>รหัส</th><th>ชื่อทรัพย์สิน</th><th>หมวด</th><th>กลุ่มงาน</th><th>สถานที่</th><th>สถานะ</th><th>วันที่ได้มา</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>';
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
  }

  async function downloadAssetImage() {
    const target = document.querySelector('#itAssetPanelV70 .table-responsive') || document.getElementById('itAssetPanelV70');
    if (!target || typeof window.html2canvas !== 'function') {
      Swal.fire('ยังไม่พร้อม', 'ไม่พบเครื่องมือสร้างรูปภาพ กรุณาลองใหม่อีกครั้ง', 'warning');
      return;
    }
    const canvas = await window.html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'haos-it-assets-' + Date.now() + '.png';
    a.click();
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
      if (!clean(asset.assetCode) && row.length > 1) asset.assetCode = row[1];
      if (!clean(asset.assetNumber) && row.length > 2) asset.assetNumber = row[2];
      if (!clean(asset.assetName) && row.length > 3) asset.assetName = row[3];
      if (!clean(asset.spec) && row.length > 4) asset.spec = row[4];
      if (!clean(asset.category) && row.length > 5) asset.category = row[5];
      if (!clean(asset.purchaseDate) && row.length > 8) asset.purchaseDate = formatDateValue(row[8]);
      if (!clean(asset.price) && row.length > 9) asset.price = row[9];
      if (!clean(asset.ownerDepartment) && row.length > 10) asset.ownerDepartment = row[10];
      if (!clean(asset.damaged) && row.length > 12) asset.damaged = row[12];
      if (!clean(asset.deteriorated) && row.length > 13) asset.deteriorated = row[13];
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
      const parsed = parseSheetRows(sheet, name);
      rows.push(...parsed);
      rows._haosSheetSummary = rows._haosSheetSummary || [];
      rows._haosSheetSummary.push({ name, count: parsed.length });
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
        const sheetSummary = (rows._haosSheetSummary || [])
          .map(item => '<li><b>' + esc(item.name) + '</b>: ' + esc(item.count) + ' รายการ</li>')
          .join('');
        const sample = rows.slice(0, 6).map((row, index) => '<tr><td>' + (index + 1) + '</td><td>' + esc(row.assetCode || '-') + '</td><td>' + esc(row.assetName || '-') + '</td><td>' + esc(row.ownerDepartment || '-') + '</td></tr>').join('');
        const confirm = await Swal.fire({
          icon: 'question',
          title: 'นำเข้าทะเบียนทรัพย์สิน IT',
          html: '<div class="text-start"><p>พบรายการที่อ่านได้ <b>' + rows.length + '</b> รายการ ระบบจะเพิ่มใหม่หรืออัปเดตรายการเดิมจากรหัสครุภัณฑ์ / เลข GFMIS / Serial</p>' +
            (sheetSummary ? '<div class="alert alert-info py-2 mb-2"><div class="fw-bold mb-1">สรุปจากแต่ละชีต</div><ul class="mb-0 ps-3">' + sheetSummary + '</ul></div>' : '') +
            '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>#</th><th>รหัส</th><th>รายการ</th><th>หน่วยงาน</th></tr></thead><tbody>' + sample + '</tbody></table></div></div>',
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
    installAssetTools();
  }

  function wrap(name) {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__haosImportWrapped) return;
    const wrapped = function () {
      const result = fn.apply(this, arguments);
      Promise.resolve(result).finally(() => setTimeout(() => {
        installButton();
        if (name === 'renderITAssetsV70' || name === 'loadITAssetModuleV70' || name === 'openITAssetModuleV70') renderEnhancedAssetRows();
      }, 250));
      return result;
    };
    wrapped.__haosImportWrapped = true;
    window[name] = wrapped;
  }

  function boot() {
    installButton();
    ['openITAssetModuleV70', 'loadITAssetModuleV70', 'renderITAssetsV70'].forEach(wrap);
    const reset = window.resetITAssetFiltersV70;
    if (typeof reset === 'function' && !reset.__haosV7120Wrapped) {
      window.resetITAssetFiltersV70 = function () {
        ['itAssetDeptV7120', 'itAssetLocationV7120', 'itAssetYearV7120', 'itAssetYearSortV7120'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        const out = reset.apply(this, arguments);
        setTimeout(renderEnhancedAssetRows, 80);
        return out;
      };
      window.resetITAssetFiltersV70.__haosV7120Wrapped = true;
    }
    setTimeout(renderEnhancedAssetRows, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setInterval(installButton, 1500);
  console.info('HAOS ' + PATCH + ' loaded');
})();
