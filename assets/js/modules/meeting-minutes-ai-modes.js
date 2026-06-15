(function () {
  'use strict';

  const PATCH = 'v70.81-meeting-minutes-ai-modes';
  const MODE_KEY = 'haos.itMinutes.textAnalysisMode';
  const MODES = [
    {
      id: 'auto',
      title: 'อัตโนมัติ',
      desc: 'ให้ AI เลือกความละเอียดตามความยาวและเนื้อหาการประชุม'
    },
    {
      id: 'concise',
      title: 'สั้นและกระชับ',
      desc: 'เน้นหัวใจสำคัญ มติ และงานที่ต้องติดตาม'
    },
    {
      id: 'detailed',
      title: 'ยาวและละเอียด',
      desc: 'เหมาะกับรายงานทางการ มีบริบท ประเด็นอภิปราย และข้อเสนอแนะ'
    }
  ];

  function safeGetMode() {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (MODES.some((mode) => mode.id === saved)) return saved;
    } catch (err) {}
    return 'auto';
  }

  function setMode(mode) {
    const next = MODES.some((item) => item.id === mode) ? mode : 'auto';
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch (err) {}
    document.querySelectorAll('[data-itm-ai-mode-v781]').forEach((button) => {
      const active = button.getAttribute('data-itm-ai-mode-v781') === next;
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('btn-outline-primary', !active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const hidden = document.getElementById('itmTextAnalysisModeV781');
    if (hidden) hidden.value = next;
  }

  function getMode() {
    const hidden = document.getElementById('itmTextAnalysisModeV781');
    return hidden?.value || safeGetMode();
  }

  function injectModePicker() {
    const raw = document.getElementById('itmRawText');
    if (!raw || document.getElementById('itmTextAiModePanelV781')) return;

    const wrap = document.createElement('div');
    wrap.id = 'itmTextAiModePanelV781';
    wrap.className = 'border rounded-4 bg-light p-3 mb-3';
    wrap.innerHTML = `
      <input type="hidden" id="itmTextAnalysisModeV781" value="${safeGetMode()}">
      <div class="d-flex flex-column flex-xl-row gap-3 align-items-xl-center justify-content-between">
        <div>
          <div class="fw-bold text-primary"><i class="bi bi-magic"></i> รูปแบบการวิเคราะห์ข้อความ</div>
          <div class="small text-muted">เลือกความละเอียดก่อนกด AI วิเคราะห์ข้อความ</div>
        </div>
        <div class="d-flex flex-column flex-md-row gap-2">
          ${MODES.map((mode) => `
            <button type="button" class="btn btn-sm btn-outline-primary text-start px-3 py-2" data-itm-ai-mode-v781="${mode.id}">
              <span class="fw-bold d-block">${mode.title}</span>
              <span class="small d-block opacity-75">${mode.desc}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div id="itmTextAiStatusV781" class="small text-muted mt-2"></div>
    `;

    const host = raw.closest('.mb-2') || raw.parentElement;
    if (host) host.insertAdjacentElement('afterend', wrap);
    wrap.querySelectorAll('[data-itm-ai-mode-v781]').forEach((button) => {
      button.addEventListener('click', () => setMode(button.getAttribute('data-itm-ai-mode-v781')));
    });
    setMode(safeGetMode());
  }

  function setStatus(message, tone) {
    const status = document.getElementById('itmTextAiStatusV781');
    if (!status) return;
    status.className = 'small mt-2 ' + (tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-muted');
    status.textContent = message || '';
  }

  function fillMinutesForm(data) {
    if (typeof window.itFillMinutesForm_ === 'function') {
      window.itFillMinutesForm_(data || {});
      return;
    }
    const map = {
      title: 'itmTitle',
      date: 'itmDate',
      location: 'itmLocation',
      chairman: 'itmChairman',
      attendees: 'itmAttendees',
      agenda: 'itmAgenda',
      conclusion: 'itmConclusion'
    };
    Object.keys(map).forEach((key) => {
      const el = document.getElementById(map[key]);
      if (el && data && data[key] != null) el.value = data[key];
    });
  }

  window.itAnalyzeMinutesTextInModal = async function itAnalyzeMinutesTextInModalV781() {
    injectModePicker();
    const text = document.getElementById('itmRawText')?.value || '';
    if (!text.trim()) {
      const message = 'กรุณาวางข้อความก่อน';
      if (window.Swal?.showValidationMessage) Swal.showValidationMessage(message);
      else alert(message);
      return;
    }

    const mode = getMode();
    const modeLabel = MODES.find((item) => item.id === mode)?.title || 'อัตโนมัติ';
    const confirmButton = window.Swal?.getConfirmButton?.();
    const analyzeButton = document.querySelector('button[onclick="itAnalyzeMinutesTextInModal()"]');

    try {
      if (confirmButton) confirmButton.disabled = true;
      if (analyzeButton) analyzeButton.disabled = true;
      setStatus(`กำลังวิเคราะห์ข้อความแบบ${modeLabel}...`, 'muted');
      if (window.Swal?.showLoading) Swal.showLoading();

      const res = await window.gasRunPromise_('analyzeMeetingMinutesText', [text, mode]);
      if (!res || !res.success) throw new Error(res?.message || 'AI วิเคราะห์ไม่สำเร็จ');

      fillMinutesForm(res.data || {});
      if (window.Swal?.hideLoading) Swal.hideLoading();
      setStatus(`วิเคราะห์ข้อความแบบ${modeLabel}สำเร็จ เติมข้อมูลลงฟอร์มแล้ว`, 'success');
    } catch (err) {
      if (window.Swal?.hideLoading) Swal.hideLoading();
      const message = err?.message || String(err);
      setStatus(message, 'danger');
      if (window.Swal?.showValidationMessage) Swal.showValidationMessage(message);
      else alert(message);
    } finally {
      if (confirmButton) confirmButton.disabled = false;
      if (analyzeButton) analyzeButton.disabled = false;
    }
  };

  const observer = new MutationObserver(injectModePicker);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', injectModePicker);
  setInterval(injectModePicker, 1200);

  window.HAOS_MEETING_MINUTES_AI_MODES_PATCH = PATCH;
})();
