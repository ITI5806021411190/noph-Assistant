// Meeting minutes audio analysis safety layer.
// Keeps large/long audio from being sent to Apps Script or Gemini as one huge payload.
(function(){
  const PATCH = 'v70.79-meeting-minutes-audio-queue';
  if (window.__HAOS_V778_MEETING_MINUTES_AUDIO_SAFE__) return;
  window.__HAOS_V778_MEETING_MINUTES_AUDIO_SAFE__ = true;

  const DIRECT_MAX_BYTES = 2.2 * 1024 * 1024;
  const DIRECT_MAX_SECONDS = 75;
  const AUTO_BACKGROUND_SPLIT_BYTES = 28 * 1024 * 1024;
  const MAX_DECODE_BYTES = 120 * 1024 * 1024;
  const CHUNK_SECONDS = 90;
  const TARGET_RATE = 8000;
  const MAX_AI_CHUNKS = 18;
  const SAFE_BASE64_CHARS = 3.1 * 1024 * 1024;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
  const formatMb = bytes => `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)} MB`;
  const normalizeBase64 = value => {
    const text = String(value || '');
    return text.includes(',') ? text.split(',').pop() : text;
  };
  const isAudioFile = file => {
    const type = String(file?.type || '').toLowerCase();
    const name = String(file?.name || '').toLowerCase();
    return type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|opus|webm|flac)$/i.test(name);
  };
  const isMemoryError = value => /out\s*of\s*memory|memory limit|maximum execution memory|exceeded memory/i.test(String(value || ''));
  const friendlyMemoryMessage = () => 'ไฟล์เสียงยาวหรือใหญ่เกินกว่าที่ Apps Script/Gemini จะวิเคราะห์ได้ในครั้งเดียว ระบบหยุดก่อนเพื่อไม่ให้โปรแกรมค้าง กรุณาแบ่งไฟล์เสียงเป็นช่วงสั้นลงประมาณ 5-10 นาที หรือวางข้อความถอดเสียงแล้วกด AI วิเคราะห์ข้อความแทน';

  function injectStyle() {
    if (document.getElementById('haos-v778-audio-safe-style')) return;
    const style = document.createElement('style');
    style.id = 'haos-v778-audio-safe-style';
    style.textContent = `
      .haos-v778-audio-note{border:1px solid rgba(14,165,233,.28);background:linear-gradient(135deg,#eff6ff,#f0fdfa);border-radius:8px;padding:8px 10px;color:#334155}
      .haos-v778-audio-note b{color:#075985}
      .haos-v778-audio-note .pill{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(37,99,235,.22);background:#fff;border-radius:999px;padding:2px 8px;margin:2px 4px 2px 0;font-weight:800;color:#2563eb}
      .haos-v779-audio-queue{border:1px solid rgba(16,185,129,.28);background:linear-gradient(135deg,#ecfdf5,#ffffff);border-radius:8px;padding:10px;margin-top:8px}
      .haos-v779-audio-queue .queue-item{display:flex;justify-content:space-between;gap:8px;align-items:center;border:1px solid rgba(148,163,184,.28);background:#fff;border-radius:8px;padding:7px 9px;margin-top:6px}
      .haos-v779-audio-queue .queue-item small{color:#64748b}
      .haos-v779-split-tools{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px}
      .haos-v779-split-tools .left{display:flex;flex-wrap:wrap;gap:8px}
      .haos-v779-time-unit{max-width:170px}
      #itmAiStatus{border-radius:8px;padding:6px 8px}
    `;
    document.head.appendChild(style);
  }

  function ensureAudioNote() {
    const input = document.getElementById('itmAudioFile');
    if (!input || document.getElementById('itmAudioSafeNoteV778')) return;
    input.insertAdjacentHTML('afterend', `
      <div id="itmAudioSafeNoteV778" class="haos-v778-audio-note small mt-2">
        <b><i class="bi bi-shield-check"></i> โหมดวิเคราะห์เสียงแบบปลอดหน่วยความจำ</b>
        <div>ไฟล์เสียงสั้นจะส่งให้ AI โดยตรง ส่วนไฟล์เสียงยาวระบบจะตรวจความยาวและแบ่งเป็นช่วงสั้นก่อนส่ง เพื่อป้องกัน Out of Memory</div>
        <div class="mt-1">
          <span class="pill">ตรง: ไม่เกิน ${Math.round(DIRECT_MAX_SECONDS)} วินาที</span>
          <span class="pill">แบ่งอัตโนมัติ: ช่วงละ ${CHUNK_SECONDS} วินาที</span>
          <span class="pill">ไฟล์เกิน 28 MB: ใช้ตัวแบ่งไฟล์ในพื้นหลัง</span>
        </div>
      </div>
    `);
    ensureAudioQueuePanel();
  }

  function setAudioStatus(message, type) {
    ensureAudioNote();
    let box = document.getElementById('itmAiStatus');
    if (!box) {
      const note = document.getElementById('itmAudioSafeNoteV778');
      const input = document.getElementById('itmAudioFile');
      (note || input)?.insertAdjacentHTML('afterend', '<div id="itmAiStatus" class="small mt-2"></div>');
      box = document.getElementById('itmAiStatus');
    }
    if (!box) return;
    box.className = `small mt-2 text-${type || 'primary'}`;
    box.innerHTML = message;
  }

  function audioQueue() {
    if (!Array.isArray(window.haosMeetingMinutesAudioQueueV779)) window.haosMeetingMinutesAudioQueueV779 = [];
    return window.haosMeetingMinutesAudioQueueV779;
  }

  function ensureAudioQueuePanel() {
    const note = document.getElementById('itmAudioSafeNoteV778');
    if (!note || document.getElementById('itmAudioQueueV779')) return;
    note.insertAdjacentHTML('afterend', `
      <div id="itmAudioQueueV779" class="haos-v779-audio-queue small">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <b><i class="bi bi-list-check text-success"></i> คิววิเคราะห์เสียงรายงานการประชุม</b>
            <div class="text-muted">เพิ่มไฟล์เสียงย่อยจากเครื่องมือแบ่งไฟล์เสียง แล้วกดเริ่มวิเคราะห์ได้ทันที</div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-sm btn-success" onclick="startMeetingMinutesAudioQueueV779()"><i class="bi bi-play-circle"></i> เริ่มวิเคราะห์ไฟล์เสียง</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearMeetingMinutesAudioQueueV779()"><i class="bi bi-x-circle"></i> ล้างคิว</button>
          </div>
        </div>
        <div id="itmAudioQueueListV779" class="mt-2"></div>
      </div>
    `);
    renderAudioQueue();
  }

  function renderAudioQueue() {
    const box = document.getElementById('itmAudioQueueListV779');
    if (!box) return;
    const queue = audioQueue();
    if (!queue.length) {
      box.innerHTML = '<div class="text-muted">ยังไม่มีไฟล์เสียงในคิว</div>';
      return;
    }
    box.innerHTML = queue.map((item, index) => `
      <div class="queue-item">
        <div>
          <b>${index + 1}. ${esc(item.fileName || 'audio_part.wav')}</b>
          <br><small>${formatMb(item.blob?.size || 0)}${item.start !== undefined ? ` • ${Math.floor(item.start / 60)}:${String(Math.floor(item.start % 60)).padStart(2, '0')} - ${Math.floor(item.end / 60)}:${String(Math.floor(item.end % 60)).padStart(2, '0')}` : ''}</small>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeMeetingMinutesAudioQueueItemV779(${index})"><i class="bi bi-trash"></i></button>
      </div>
    `).join('');
  }

  function openMinutesFormForQueue(note) {
    if (document.getElementById('itmAudioQueueV779')) {
      ensureAudioQueuePanel();
      renderAudioQueue();
      return;
    }
    if (typeof window.openItMinutesCreate === 'function') {
      window.openItMinutesCreate({}, note || 'เพิ่มไฟล์เสียงเข้าคิววิเคราะห์แล้ว');
      setTimeout(() => {
        ensureAudioNote();
        ensureAudioQueuePanel();
        renderAudioQueue();
      }, 400);
    }
  }

  function addPartsToQueue(parts, openForm) {
    const queue = audioQueue();
    const items = (Array.isArray(parts) ? parts : [parts]).filter(part => part && part.blob);
    items.forEach(part => {
      queue.push({
        blob: part.blob,
        fileName: part.fileName || `meeting_audio_part${queue.length + 1}.wav`,
        start: part.start,
        end: part.end
      });
    });
    ensureAudioQueuePanel();
    renderAudioQueue();
    if (openForm) openMinutesFormForQueue(`เพิ่มไฟล์เสียงเข้าคิว ${items.length} รายการแล้ว กด "เริ่มวิเคราะห์ไฟล์เสียง" เพื่อให้ AI สรุปรายงานประชุม`);
    return items.length;
  }

  window.queueSplitPartForMinutesV779 = function(partIndex, openForm) {
    const part = (window.itSplitParts_ || [])[Number(partIndex)];
    if (!part) return window.Swal?.fire('ไม่พบไฟล์ย่อย', 'กรุณาแบ่งไฟล์ใหม่อีกครั้ง', 'warning');
    const count = addPartsToQueue(part, !!openForm);
    if (!openForm) window.Swal?.fire({ icon: 'success', title: 'เพิ่มเข้าคิวแล้ว', text: `เพิ่มไฟล์เสียง ${count} รายการเข้าคิววิเคราะห์รายงานประชุม`, timer: 1200, showConfirmButton: false });
  };

  window.queueAllSplitPartsV779 = function() {
    const parts = window.itSplitParts_ || [];
    if (!parts.length) return window.Swal?.fire('ยังไม่มีไฟล์ย่อย', 'กรุณาแบ่งไฟล์เสียงก่อน', 'warning');
    addPartsToQueue(parts, true);
  };

  window.removeMeetingMinutesAudioQueueItemV779 = function(index) {
    audioQueue().splice(Number(index), 1);
    renderAudioQueue();
  };

  window.clearMeetingMinutesAudioQueueV779 = function() {
    window.haosMeetingMinutesAudioQueueV779 = [];
    renderAudioQueue();
    setAudioStatus('ล้างคิววิเคราะห์เสียงแล้ว', 'secondary');
  };

  function readFileBase64Safe(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('ไม่พบไฟล์ที่ต้องการอ่าน'));
      if (file.size > DIRECT_MAX_BYTES + 512 * 1024) {
        return reject(new Error('ไฟล์ช่วงนี้ยังใหญ่เกินไป กรุณาแบ่งให้สั้นลงก่อนส่ง AI'));
      }
      const reader = new FileReader();
      reader.onload = event => resolve(normalizeBase64(event.target?.result || ''));
      reader.onerror = () => reject(reader.error || new Error('อ่านไฟล์ไม่สำเร็จ'));
      reader.readAsDataURL(file);
    });
  }

  function getAudioDuration(file) {
    return new Promise(resolve => {
      try {
        const audio = document.createElement('audio');
        const url = URL.createObjectURL(file);
        let done = false;
        const finish = value => {
          if (done) return;
          done = true;
          URL.revokeObjectURL(url);
          resolve(Number.isFinite(value) && value > 0 ? value : 0);
        };
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => finish(audio.duration);
        audio.onerror = () => finish(0);
        setTimeout(() => finish(0), 5000);
        audio.src = url;
      } catch (err) {
        resolve(0);
      }
    });
  }

  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (offset, text) => {
      for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, samples[i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function createAudioChunksForAiSafe(file, requestedSeconds) {
    if (!file || !isAudioFile(file)) throw new Error('รองรับเฉพาะไฟล์เสียงเท่านั้น');
    if (file.size > MAX_DECODE_BYTES) {
      throw new Error(`ไฟล์เสียงนี้มีขนาด ${formatMb(file.size)} ซึ่งใหญ่เกินสำหรับแบ่งในเบราว์เซอร์อย่างปลอดภัย กรุณาแบ่งไฟล์จากเครื่องบันทึกเสียงก่อน แล้วอัปโหลดทีละช่วง`);
    }

    const chunkSeconds = Math.max(30, Math.min(Number(requestedSeconds || CHUNK_SECONDS), CHUNK_SECONDS));
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error('เบราว์เซอร์นี้ไม่รองรับการแบ่งไฟล์เสียงในหน้าเว็บ');

    const ctx = new AudioCtx();
    try {
      const buffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(buffer);
      const duration = audioBuffer.duration || 0;
      if (!duration) throw new Error('อ่านระยะเวลาไฟล์เสียงไม่สำเร็จ');

      const chunks = [];
      const sourceRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels || 1;
      const baseName = String(file.name || 'meeting_audio').replace(/\.[^.]+$/, '');

      for (let start = 0, index = 1; start < duration; start += chunkSeconds, index++) {
        const end = Math.min(start + chunkSeconds, duration);
        const startFrame = Math.floor(start * sourceRate);
        const endFrame = Math.floor(end * sourceRate);
        const frameCount = Math.max(1, endFrame - startFrame);
        const mono = new Float32Array(frameCount);

        for (let ch = 0; ch < channels; ch++) {
          const data = audioBuffer.getChannelData(ch);
          for (let frame = 0; frame < frameCount; frame++) {
            mono[frame] += (data[startFrame + frame] || 0) / channels;
          }
        }

        const ratio = sourceRate / TARGET_RATE;
        const targetLength = Math.max(1, Math.floor(frameCount / ratio));
        const down = new Float32Array(targetLength);
        for (let i = 0; i < targetLength; i++) down[i] = mono[Math.floor(i * ratio)] || 0;

        const blob = encodeWav(down, TARGET_RATE);
        chunks.push({
          blob,
          fileName: `${baseName}_ai_part${index}.wav`,
          start,
          end,
          duration: end - start
        });
      }
      return chunks;
    } finally {
      try { await ctx.close(); } catch (ignore) {}
    }
  }

  async function callMeetingAudioAi(file, label) {
    let base64 = await readFileBase64Safe(file);
    if (base64.length > SAFE_BASE64_CHARS) {
      base64 = '';
      throw new Error('ไฟล์เสียงช่วงนี้ยังใหญ่เกินสำหรับส่งเข้า AI กรุณาแบ่งให้สั้นลง');
    }
    const res = await window.gasRunPromise_('analyzeMeetingAudio', [base64, file.name || label || 'meeting_audio.wav', file.type || 'audio/wav']);
    base64 = '';
    if (!res || !res.success) {
      const message = res?.message || 'AI วิเคราะห์เสียงไม่สำเร็จ';
      throw new Error(isMemoryError(message) ? friendlyMemoryMessage() : message);
    }
    return res.data || {};
  }

  function mergeMinutesResults(items) {
    if (typeof window.itMergeMinutesResults_ === 'function') return window.itMergeMinutesResults_(items);
    const first = items.find(item => item && (item.title || item.date || item.location)) || {};
    const joinUnique = field => Array.from(new Set(items
      .map(item => String(item?.[field] || '').trim())
      .filter(Boolean)
      .join('\n')
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean))).join('\n');
    return {
      title: first.title || 'สรุปรายงานการประชุมจากไฟล์เสียง',
      date: first.date || '',
      location: first.location || '',
      chairman: first.chairman || '',
      attendees: joinUnique('attendees'),
      agenda: items.map((item, index) => `ช่วงที่ ${index + 1}:\n${String(item?.agenda || '-').trim()}`).join('\n\n'),
      conclusion: items.map((item, index) => `ช่วงที่ ${index + 1}:\n${String(item?.conclusion || '-').trim()}`).join('\n\n')
    };
  }

  async function analyzeAudioFileSmartSafe(file) {
    if (!file) throw new Error('กรุณาเลือกไฟล์เสียงก่อน');
    if (!isAudioFile(file)) throw new Error('รองรับเฉพาะไฟล์เสียงเท่านั้น');

    const duration = await getAudioDuration(file);
    const durationText = duration ? `${Math.ceil(duration / 60)} นาที` : 'ไม่ทราบความยาว';
    const safeDirectDuration = duration ? duration <= DIRECT_MAX_SECONDS : file.size <= 900 * 1024;
    if (file.size <= DIRECT_MAX_BYTES && safeDirectDuration) {
      setAudioStatus(`<span class="spinner-border spinner-border-sm"></span> AI กำลังวิเคราะห์ไฟล์เสียงสั้น (${formatMb(file.size)}, ${durationText})...`, 'primary');
      return callMeetingAudioAi(file, file.name);
    }

    const splitMessage = file.size > AUTO_BACKGROUND_SPLIT_BYTES
      ? `ไฟล์เกิน 28 MB ระบบกำลังใช้เครื่องมือแบ่งไฟล์เสียงในพื้นหลังอัตโนมัติ (${formatMb(file.size)}, ${durationText}) แล้วจะเข้าสู่โหมดวิเคราะห์เสียงให้เอง`
      : `กำลังแบ่งไฟล์เสียง (${formatMb(file.size)}, ${durationText}) เป็นช่วงละ ${CHUNK_SECONDS} วินาที`;
    setAudioStatus(`<span class="spinner-border spinner-border-sm"></span> ${splitMessage}...`, 'primary');
    const chunks = await createAudioChunksForAiSafe(file, CHUNK_SECONDS);
    if (!chunks.length) throw new Error('ไม่สามารถแบ่งไฟล์เสียงได้');

    const useChunks = chunks.slice(0, MAX_AI_CHUNKS);
    if (chunks.length > useChunks.length) {
      setAudioStatus(`ไฟล์เสียงยาวมาก ระบบจะวิเคราะห์ ${useChunks.length} ช่วงแรกจากทั้งหมด ${chunks.length} ช่วงก่อน เพื่อป้องกันโควต้าและหน่วยความจำเต็ม`, 'warning');
      await new Promise(resolve => setTimeout(resolve, 900));
    }

    const results = [];
    let lastError = '';
    for (let i = 0; i < useChunks.length; i++) {
      const part = useChunks[i];
      setAudioStatus(`<span class="spinner-border spinner-border-sm"></span> AI กำลังวิเคราะห์ช่วงที่ ${i + 1}/${useChunks.length} (${formatMb(part.blob.size)})...`, 'primary');
      try {
        const partFile = new File([part.blob], part.fileName, { type: 'audio/wav' });
        const data = await callMeetingAudioAi(partFile, part.fileName);
        if (data && Object.keys(data).length) results.push(data);
      } catch (err) {
        lastError = err.message || String(err);
        if (isMemoryError(lastError)) lastError = friendlyMemoryMessage();
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    if (!results.length) throw new Error(lastError || 'AI ไม่สามารถวิเคราะห์เสียงได้ กรุณาแบ่งไฟล์ให้สั้นลงหรือใช้ข้อความถอดเสียงแทน');
    return mergeMinutesResults(results);
  }

  async function startAudioQueueAnalysis() {
    ensureAudioNote();
    ensureAudioQueuePanel();
    const queue = audioQueue();
    if (!queue.length) {
      setAudioStatus('ยังไม่มีไฟล์เสียงในคิว กรุณาเพิ่มไฟล์เสียงย่อยจากเครื่องมือแบ่งไฟล์เสียงก่อน', 'warning');
      return;
    }
    const button = document.querySelector('#itmAudioQueueV779 .btn-success');
    if (button) button.disabled = true;
    const confirmButton = window.Swal?.getConfirmButton?.();
    if (confirmButton) confirmButton.disabled = true;
    try {
      const results = [];
      let lastError = '';
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        setAudioStatus(`<span class="spinner-border spinner-border-sm"></span> AI กำลังวิเคราะห์ไฟล์ในคิว ${i + 1}/${queue.length}: ${esc(item.fileName || '-')}`, 'primary');
        try {
          const file = new File([item.blob], item.fileName || `meeting_audio_part${i + 1}.wav`, { type: 'audio/wav' });
          const data = await callMeetingAudioAi(file, item.fileName);
          if (data && Object.keys(data).length) results.push(data);
        } catch (err) {
          lastError = err.message || String(err);
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      if (!results.length) throw new Error(lastError || 'AI ไม่สามารถวิเคราะห์ไฟล์เสียงในคิวได้');
      const merged = mergeMinutesResults(results);
      if (typeof window.itFillMinutesForm_ === 'function') window.itFillMinutesForm_(merged);
      window.haosMeetingMinutesAudioQueueV779 = [];
      renderAudioQueue();
      setAudioStatus('<i class="bi bi-check-circle"></i> วิเคราะห์ไฟล์เสียงในคิวสำเร็จและเติมข้อมูลลงแบบฟอร์มแล้ว', 'success');
    } catch (err) {
      setAudioStatus(`ผิดพลาด: ${esc(err.message || String(err))}`, 'danger');
    } finally {
      if (button) button.disabled = false;
      if (confirmButton) confirmButton.disabled = false;
    }
  }

  window.startMeetingMinutesAudioQueueV779 = startAudioQueueAnalysis;

  function installGasGuard() {
    if (window.__HAOS_V778_MEETING_AUDIO_GAS_GUARD__ || typeof window.gasRunPromise_ !== 'function') return;
    window.__HAOS_V778_MEETING_AUDIO_GAS_GUARD__ = true;
    const previousGasRunPromise = window.gasRunPromise_;
    window.gasRunPromise_ = function(fnName, args) {
      if (fnName !== 'analyzeMeetingAudio') return previousGasRunPromise.apply(this, arguments);
      const safeArgs = Array.isArray(args) ? args.slice() : [];
      safeArgs[0] = normalizeBase64(safeArgs[0]);
      if (safeArgs[0].length > SAFE_BASE64_CHARS) {
        return Promise.resolve({ success: false, message: friendlyMemoryMessage() });
      }
      return previousGasRunPromise.call(this, fnName, safeArgs).then(res => {
        if (res && res.success === false && isMemoryError(res.message)) {
          return Object.assign({}, res, { message: friendlyMemoryMessage() });
        }
        return res;
      }, err => {
        if (isMemoryError(err?.message || err)) return { success: false, message: friendlyMemoryMessage() };
        throw err;
      });
    };
  }

  function installEntryPoints() {
    window.itCreateAudioChunksForAi_ = createAudioChunksForAiSafe;
    window.itAnalyzeAudioFileSmart_ = analyzeAudioFileSmartSafe;
    window.itAnalyzeMinutesAudioInModal = async function() {
      const file = document.getElementById('itmAudioFile')?.files?.[0];
      if (!file) return setAudioStatus('กรุณาเลือกไฟล์เสียงก่อน', 'danger');
      const button = window.Swal?.getConfirmButton?.();
      if (button) button.disabled = true;
      try {
        ensureAudioNote();
        const data = await analyzeAudioFileSmartSafe(file);
        if (typeof window.itFillMinutesForm_ === 'function') window.itFillMinutesForm_(data || {});
        else setAudioStatus('AI วิเคราะห์สำเร็จ แต่ไม่พบตัวเติมแบบฟอร์ม', 'warning');
        setAudioStatus('<i class="bi bi-check-circle"></i> AI วิเคราะห์เสียงสำเร็จและเติมข้อมูลลงแบบฟอร์มแล้ว', 'success');
      } catch (err) {
        setAudioStatus(`ผิดพลาด: ${esc(err.message || String(err))}`, 'danger');
      } finally {
        if (button) button.disabled = false;
      }
    };
    window.itAnalyzeSplitPartAsMinutes_ = async function(partIndex) {
      const part = (window.itSplitParts_ || [])[partIndex];
      if (!part) return window.Swal?.fire('ไม่พบไฟล์ย่อย', 'กรุณาแบ่งไฟล์ใหม่อีกครั้ง', 'warning');
      if (part.blob.size > DIRECT_MAX_BYTES + 512 * 1024) {
        return window.Swal?.fire('ไฟล์ย่อยยังใหญ่เกินไป', 'กรุณาแบ่งไฟล์ให้สั้นลงก่อนส่งเข้า AI', 'warning');
      }
      window.Swal?.fire({ title: 'AI กำลังฟังไฟล์เสียงพาร์ตนี้...', html: `${esc(part.fileName)}<br><small class="text-muted">เมื่อวิเคราะห์เสร็จ ระบบจะเปิดฟอร์มรายงานการประชุมพร้อมข้อมูลที่เติมให้</small>`, allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });
      try {
        const file = new File([part.blob], part.fileName, { type: 'audio/wav' });
        const data = await callMeetingAudioAi(file, part.fileName);
        window.Swal?.close();
        if (typeof window.openItMinutesCreate === 'function') window.openItMinutesCreate(data || {}, `วิเคราะห์จากไฟล์ย่อย: ${part.fileName}`);
      } catch (err) {
        window.Swal?.fire('วิเคราะห์ไม่สำเร็จ', err.message || String(err), 'error');
      }
    };
  }

  function enhanceSplitModeLabel() {
    const mode = document.querySelector('input[name="itSplitMode"]:checked')?.value || 'size';
    const label = document.getElementById('itSplitValueLabel');
    const input = document.getElementById('itSplitValue');
    if (label && mode === 'time') label.textContent = 'ระบุระยะเวลาต่อไฟล์';
    if (!input) return;
    let unit = document.getElementById('itSplitTimeUnitV779');
    if (!unit) {
      input.insertAdjacentHTML('afterend', `
        <select id="itSplitTimeUnitV779" class="form-select mt-2 haos-v779-time-unit">
          <option value="seconds">วินาที</option>
          <option value="minutes">นาที</option>
        </select>
      `);
      unit = document.getElementById('itSplitTimeUnitV779');
    }
    unit.classList.toggle('d-none', mode !== 'time');
  }

  async function askSplitTimeUnit() {
    const selected = document.getElementById('itSplitTimeUnitV779')?.value || 'seconds';
    const result = await window.Swal.fire({
      icon: 'question',
      title: 'ต้องการแบ่งตามหน่วยใด?',
      html: '<div class="text-muted">ระบบจะนำค่าที่กรอกไปคำนวณเป็นระยะเวลาต่อไฟล์เสียงย่อย</div>',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'วินาที',
      denyButtonText: 'นาที',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: selected === 'minutes'
    });
    if (result.isConfirmed) return 'seconds';
    if (result.isDenied) return 'minutes';
    return '';
  }

  async function processAudioSplitEnhanced() {
    const file = document.getElementById('itSplitAudioInput')?.files?.[0];
    const mode = document.querySelector('input[name="itSplitMode"]:checked')?.value || 'size';
    const rawValue = parseFloat(document.getElementById('itSplitValue')?.value || '0');
    if (!file) return window.Swal?.fire('ยังไม่ได้เลือกไฟล์', 'กรุณาเลือกไฟล์เสียงก่อนครับ', 'warning');
    if (!rawValue || rawValue <= 0) return window.Swal?.fire('ระบุค่าไม่ถูกต้อง', 'กรุณาระบุค่าการแบ่งไฟล์ให้มากกว่า 0', 'warning');

    let timeUnit = document.getElementById('itSplitTimeUnitV779')?.value || 'seconds';
    if (mode === 'time') {
      timeUnit = await askSplitTimeUnit();
      if (!timeUnit) return;
      const unitEl = document.getElementById('itSplitTimeUnitV779');
      if (unitEl) unitEl.value = timeUnit;
    }

    const button = document.getElementById('btnItSplitAudio');
    if (button) button.disabled = true;
    window.Swal?.fire({ title: 'กำลังแบ่งไฟล์เสียง...', html: 'ระบบประมวลผลในเบราว์เซอร์ของคุณ', allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });
    let ctx;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('เบราว์เซอร์นี้ไม่รองรับการแบ่งไฟล์เสียง');
      ctx = new AudioCtx();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration || 0;
      const segments = [];
      if (mode === 'time') {
        const seconds = rawValue * (timeUnit === 'minutes' ? 60 : 1);
        for (let start = 0; start < duration; start += seconds) segments.push({ start, end: Math.min(start + seconds, duration) });
      } else if (mode === 'count') {
        const count = Math.max(1, Math.floor(rawValue));
        const part = duration / count;
        for (let i = 0; i < count; i++) segments.push({ start: i * part, end: Math.min((i + 1) * part, duration) });
      } else {
        const seconds = Math.max(30, (rawValue * 1024 * 1024) / 32000);
        for (let start = 0; start < duration; start += seconds) segments.push({ start, end: Math.min(start + seconds, duration) });
      }
      if (!segments.length) throw new Error('ไม่สามารถคำนวณช่วงไฟล์เสียงได้');
      if (typeof window.itCreateAudioParts_ !== 'function') throw new Error('ไม่พบตัวสร้างไฟล์เสียงย่อย');
      window.itCreateAudioParts_(audioBuffer, segments, file.name);
      window.Swal?.fire({ icon: 'success', title: 'แบ่งไฟล์สำเร็จ', text: 'ดาวน์โหลดหรือส่งไฟล์ย่อยเข้าคิววิเคราะห์รายงานประชุมได้ทันที', timer: 1600, showConfirmButton: false });
    } catch (err) {
      window.Swal?.fire('แบ่งไฟล์ไม่สำเร็จ', err.message || String(err), 'error');
    } finally {
      try { if (ctx) await ctx.close(); } catch (ignore) {}
      if (button) button.disabled = false;
    }
  }

  function augmentSplitResults() {
    const box = document.getElementById('itSplitResults');
    const list = document.getElementById('itSplitDownloadLinks');
    if (!box || !list || !Array.isArray(window.itSplitParts_)) return;
    if (!document.getElementById('itSplitQueueToolsV779')) {
      list.insertAdjacentHTML('beforebegin', `
        <div id="itSplitQueueToolsV779" class="haos-v779-split-tools">
          <div class="left">
            <button type="button" class="btn btn-sm btn-success" onclick="queueAllSplitPartsV779()"><i class="bi bi-list-check"></i> เข้าคิวทั้งหมด</button>
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="openMinutesFormForAudioQueueV779()"><i class="bi bi-journal-plus"></i> เปิดฟอร์มรายงานประชุม</button>
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearItSplitResultsV779()"><i class="bi bi-trash"></i> ล้างรายการ</button>
        </div>
      `);
    }
    Array.from(list.children).forEach((row, index) => {
      if (row.querySelector('.haos-v779-queue-part')) return;
      const controls = row.querySelector('.d-flex.flex-wrap.gap-2') || row;
      controls.insertAdjacentHTML('beforeend', `
        <button type="button" class="btn btn-sm btn-success haos-v779-queue-part" onclick="queueSplitPartForMinutesV779(${index}, false)"><i class="bi bi-list-check"></i> เพิ่มเข้าคิววิเคราะห์เสียง</button>
      `);
    });
    box.classList.remove('d-none');
  }

  function installSplitterQueueEnhancements() {
    if (typeof window.itUpdateSplitLabel === 'function' && !window.__HAOS_V779_SPLIT_LABEL_WRAP__) {
      window.__HAOS_V779_SPLIT_LABEL_WRAP__ = true;
      const previous = window.itUpdateSplitLabel;
      window.itUpdateSplitLabel = function() {
        const result = previous.apply(this, arguments);
        enhanceSplitModeLabel();
        return result;
      };
    }
    if (typeof window.itProcessAudioSplit === 'function' && !window.__HAOS_V779_SPLIT_PROCESS_WRAP__) {
      window.__HAOS_V779_SPLIT_PROCESS_WRAP__ = true;
      window.itProcessAudioSplit = processAudioSplitEnhanced;
    }
    if (typeof window.itCreateAudioParts_ === 'function' && !window.__HAOS_V779_CREATE_PARTS_WRAP__) {
      window.__HAOS_V779_CREATE_PARTS_WRAP__ = true;
      const previousCreate = window.itCreateAudioParts_;
      window.itCreateAudioParts_ = function() {
        const result = previousCreate.apply(this, arguments);
        setTimeout(augmentSplitResults, 0);
        return result;
      };
    }
    enhanceSplitModeLabel();
    augmentSplitResults();
  }

  window.openMinutesFormForAudioQueueV779 = function() {
    openMinutesFormForQueue('เปิดฟอร์มรายงานการประชุมพร้อมคิวไฟล์เสียงแล้ว');
  };

  window.clearItSplitResultsV779 = function() {
    try {
      (window.itSplitParts_ || []).forEach(part => {
        if (part?.url) URL.revokeObjectURL(part.url);
      });
    } catch (ignore) {}
    window.itSplitParts_ = [];
    const list = document.getElementById('itSplitDownloadLinks');
    if (list) list.innerHTML = '';
    document.getElementById('itSplitQueueToolsV779')?.remove();
    document.getElementById('itSplitResults')?.classList.add('d-none');
    const input = document.getElementById('itSplitAudioInput');
    if (input) input.value = '';
    const info = document.getElementById('itSplitFileInfo');
    if (info) info.textContent = '';
  };

  function bindAudioFileNote() {
    document.addEventListener('change', async event => {
      if (event.target?.id !== 'itmAudioFile') return;
      ensureAudioNote();
      const file = event.target.files?.[0];
      if (!file) return;
      const duration = await getAudioDuration(file);
      const durationText = duration ? `${Math.ceil(duration / 60)} นาที` : 'ไม่ทราบความยาว';
      const mode = file.size <= DIRECT_MAX_BYTES && (!duration || duration <= DIRECT_MAX_SECONDS) ? 'ส่งให้ AI โดยตรง' : 'แบ่งเป็นช่วงสั้นก่อนส่ง AI';
      setAudioStatus(`<i class="bi bi-music-note-beamed"></i> เลือกไฟล์ ${esc(file.name)} (${formatMb(file.size)}, ${durationText}) - ${mode}`, 'primary');
    }, true);
  }

  function boot() {
    injectStyle();
    installGasGuard();
    installEntryPoints();
    installSplitterQueueEnhancements();
    ensureAudioNote();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setTimeout(boot, 800);
  setInterval(boot, 2500);
  bindAudioFileNote();
  console.info('HAOS ' + PATCH + ' loaded');
})();
