import {
  VERSION,
  EVENT_ID,
  POLL_IDS,
  DEFAULT_EVENT,
  DEFAULT_POLLS,
  FIREBASE_SDK_VERSION,
  fb,
  featureEnabled,
  initFirebase,
  refs,
  esc,
  disabledPage,
  showFatal,
  renderLogin,
  adminSignIn,
  isAdminUser,
  participantUrl,
  stageUrl,
  qrImageUrl,
  copyText,
  loadSeed,
  buildCandidates,
  imageFallbackAttrs,
  normalizePoll,
  normalizeCandidates,
  votesFromSnapshot,
  calcScores,
  rankScores,
  formatDateTime,
  formatCountdown,
  safeUnsubscribe
} from "./core.js?v=70132";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
  MAX_SOURCE_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_BYTES,
  padCandidateNumber,
  normalizePollId,
  isValidPollId,
  nextCandidateNumber,
  buildCandidateId,
  candidateStoragePath,
  validateCandidateDrafts
} from "./admin-manager-utils.js?v=70132";

const root = document.getElementById("app");
const state = {
  user: null,
  event: null,
  polls: {},
  selectedPoll: "child-photo",
  allCandidates: [],
  candidates: [],
  votes: [],
  busy: false,
  pollDirty: false,
  candidateDirty: false,
  pendingRender: false,
  unsub: [],
  renderTimer: null,
  tick: null,
  hasManualPollSelection: false,
  autoSeededPolls: {}
};

function login() {
  const { auth } = initFirebase();
  renderLogin(root, async () => {
    try { await adminSignIn(auth); } catch (err) { alert(err.message); }
  }, "เข้าสู่ระบบเพื่อจัดการ Popular Vote");
}

function boot() {
  if (!featureEnabled()) return disabledPage(root);
  try {
    const { auth } = initFirebase();
    fb.onAuthStateChanged(auth, user => {
      state.user = user;
      state.unsub.forEach(safeUnsubscribe);
      state.unsub = [];
      clearInterval(state.tick);
      if (!user) return login();
      if (!isAdminUser(user)) {
        root.innerHTML = `
          <section class="pv-page pv-page-narrow">
            <div class="pv-empty pv-empty-danger">
              <h1>ไม่มีสิทธิ์จัดการ Popular Vote</h1>
              <p>บัญชีนี้ไม่ใช่ ${esc("wongnazaipot@gmail.com")}</p>
              <button class="pv-btn pv-btn-primary" id="pvSignOut">ออกจากระบบ</button>
            </div>
          </section>
        `;
        root.querySelector("#pvSignOut")?.addEventListener("click", () => fb.signOut(auth));
        return;
      }
      listenAdmin();
    });
  } catch (err) { showFatal(root, err); }
}

function listenAdmin() {
  const { db } = initFirebase();
  const r = refs(db);
  state.unsub.push(fb.onSnapshot(r.eventRef, snap => {
    state.event = snap.exists() ? { id: snap.id, ...snap.data() } : { ...DEFAULT_EVENT };
    if (!state.hasManualPollSelection && state.event.activePoll && state.event.activePoll !== state.selectedPoll) {
      state.selectedPoll = state.event.activePoll;
    }
    listenPollData();
    scheduleRender();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(r.pollsCol, snap => {
    const polls = {};
    snap.docs.forEach(docSnap => { polls[docSnap.id] = normalizePoll(docSnap.id, docSnap.data()); });
    state.polls = polls;
    maybeAutoSeedOpenPoll(state.selectedPoll);
    scheduleRender();
  }, err => showFatal(root, err)));
  state.tick = setInterval(scheduleRender, 1000);
}

function listenPollData() {
  state.unsub.splice(2).forEach(safeUnsubscribe);
  const pollId = state.selectedPoll;
  state.allCandidates = [];
  state.candidates = [];
  state.votes = [];
  if (!pollId) return;
  const { db } = initFirebase();
  const r = refs(db);
  state.unsub.push(fb.onSnapshot(fb.query(r.candidatesCol(pollId), fb.orderBy("sortOrder")), snap => {
    state.allCandidates = normalizeCandidates(snap, pollId, { includeInactive: true });
    state.candidates = state.allCandidates.filter(candidate => candidate.active !== false);
    maybeAutoSeedOpenPoll(pollId);
    scheduleRender();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(r.votesCol(pollId), snap => {
    state.votes = votesFromSnapshot(snap);
    scheduleRender();
  }, err => showFatal(root, err)));
}

function scheduleRender() {
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(() => {
    if (shouldDeferRender()) {
      state.pendingRender = true;
      return;
    }
    state.pendingRender = false;
    render();
  }, 250);
}

function shouldDeferRender() {
  if (state.busy || state.pollDirty || state.candidateDirty) return true;
  const active = document.activeElement;
  if (!active || !root.contains(active)) return false;
  if (active.id === "pvPollSelect") return false;
  return active.matches?.("input, select, textarea");
}

function releaseDraftLock() {
  if (!state.pollDirty && !state.candidateDirty && state.pendingRender) scheduleRender();
}

function currentPoll() {
  return state.polls[state.selectedPoll] || DEFAULT_POLLS[state.selectedPoll] || {
    id: state.selectedPoll,
    title: state.selectedPoll,
    description: "",
    status: "draft",
    durationSeconds: 300,
    totalEligibleVoters: 0,
    showLiveResults: false,
    candidateCount: 0
  };
}

function allPollIds() {
  return Array.from(new Set([...POLL_IDS, ...Object.keys(state.polls)])).filter(Boolean);
}

function maybeAutoSeedOpenPoll(pollId) {
  if (!pollId || state.candidates.length || state.autoSeededPolls[pollId]) return;
  if (currentPoll().status !== "open" || !POLL_IDS.includes(pollId)) return;
  state.autoSeededPolls[pollId] = true;
  ensureActiveCandidates(pollId).then(count => {
    if (count) scheduleRender();
  }).catch(err => console.warn("[Popular Vote] auto seed failed", err));
}

function pollOptions() {
  return allPollIds().map(id => {
    const title = state.polls[id]?.title || DEFAULT_POLLS[id]?.title || id;
    return `<option value="${esc(id)}" ${state.selectedPoll === id ? "selected" : ""}>${esc(title)}</option>`;
  }).join("");
}

function candidateCountInput() {
  const fallback = Math.max(1, Number(currentPoll().candidateCount || state.candidates.length || 5));
  return Math.max(1, Math.min(99, Number(root.querySelector("#pvSeedCount")?.value || fallback)));
}

function imageFolderHint(pollId) {
  const next = Array.from({ length: Math.min(6, candidateCountInput()) }, (_, index) => `${String(index + 1).padStart(2, "0")}.png`).join(", ");
  return `
    <div class="pv-help-box" id="pvLegacyImageHint">
      <strong>นำเข้าจากรูปเดิมในโฟลเดอร์</strong>
      <code>popular-vote/assets/${esc(pollId)}/</code>
      <span>ชื่อไฟล์ตามหมายเลข เช่น <code>${esc(next)}</code> ส่วนรูปใหม่สามารถอัปโหลดในบัตรผู้สมัครด้านล่างได้ทันที</span>
    </div>
  `;
}

function render() {
  const poll = currentPoll();
  const scores = calcScores(state.candidates, state.votes);
  const ranked = rankScores(scores);
  const activeCount = state.candidates.length;
  root.innerHTML = `
    <section class="pv-page">
      <header class="pv-hero">
        <div>
          <div class="pv-kicker">Popular Vote Admin</div>
          <h1>${esc(state.event?.title || "Back to School Popular Vote")}</h1>
          <p>จัดการหมวด ผู้สมัคร รูปภาพ เวที QR และคะแนนจากหน้าเดียว</p>
        </div>
        <div class="pv-toolbar">
          <a class="pv-btn pv-btn-light" href="/">กลับ HAOS</a>
          <a class="pv-btn pv-btn-light" href="${esc(stageUrl())}" target="_blank" rel="noopener">เปิด Stage</a>
          <button class="pv-btn pv-btn-light" id="pvSignOut">ออกจาก Google</button>
        </div>
      </header>

      <section class="pv-panel">
        <div class="pv-section-head">
          <div>
            <h2>แผงควบคุม Vote</h2>
            <p>Firebase SDK ${esc(FIREBASE_SDK_VERSION)} · ${esc(VERSION)} · event: ${esc(EVENT_ID)}</p>
          </div>
          <span class="pv-status pv-status-${esc(poll.status || "draft")}">${esc(poll.status || "draft")}</span>
        </div>

        <div class="pv-grid pv-grid-2">
          <div class="pv-card pv-admin-card">
            <h2>กิจกรรมและหมวดโหวต</h2>
            <div class="pv-grid pv-admin-form-stack">
              <div class="pv-admin-category-row">
                <label class="pv-field">เลือกหมวด
                  <select id="pvPollSelect">${pollOptions()}</select>
                </label>
                <details class="pv-admin-details">
                  <summary>+ เพิ่มหมวดใหม่</summary>
                  <div class="pv-grid pv-admin-details-body">
                    <label class="pv-field">รหัสหมวดภาษาอังกฤษ<input id="pvNewPollId" maxlength="48" placeholder="เช่น staff-choice"></label>
                    <label class="pv-field">ชื่อหมวด<input id="pvNewPollTitle" maxlength="120" placeholder="ชื่อที่ผู้ร่วมงานจะเห็น"></label>
                    <button class="pv-btn pv-btn-primary" data-action="createPoll">สร้างหมวด</button>
                  </div>
                </details>
              </div>

              <label class="pv-field">ชื่อหมวด<input id="pvPollTitle" data-poll-input maxlength="120" value="${esc(poll.title || state.selectedPoll)}"></label>
              <label class="pv-field">คำอธิบาย<textarea id="pvPollDescription" data-poll-input maxlength="500" rows="3">${esc(poll.description || "")}</textarea></label>

              <div class="pv-toolbar">
                <button class="pv-btn pv-btn-green" data-action="openPoll">เปิดโหวต</button>
                <button class="pv-btn pv-btn-amber" data-action="closePoll">ปิดโหวต</button>
                <button class="pv-btn pv-btn-outline" data-action="setActive">ตั้งเป็นหมวดปัจจุบัน</button>
              </div>
              <div class="pv-toolbar">
                <button class="pv-btn pv-btn-outline" data-mode="gallery">Stage: Gallery</button>
                <button class="pv-btn pv-btn-outline" data-mode="live">Stage: Live</button>
                <button class="pv-btn pv-btn-outline" data-mode="result">Stage: Result</button>
              </div>
              <div class="pv-grid pv-grid-3">
                <label class="pv-field">เวลาโหวต (วินาที)<input id="pvDuration" data-poll-input type="number" min="10" value="${Number(poll.durationSeconds || 300)}"></label>
                <label class="pv-field">จำนวนผู้มีสิทธิ์<input id="pvEligible" data-poll-input type="number" min="0" value="${Number(poll.totalEligibleVoters || 0)}"></label>
                <label class="pv-field">ผู้สมัครที่เปิดใช้<input value="${activeCount}" readonly aria-label="จำนวนผู้สมัครที่เปิดใช้"></label>
                <label class="pv-field">Live results<select id="pvShowLive" data-poll-input><option value="false" ${poll.showLiveResults ? "" : "selected"}>ซ่อน</option><option value="true" ${poll.showLiveResults ? "selected" : ""}>แสดง</option></select></label>
              </div>
              <button class="pv-btn pv-btn-primary" data-action="savePollSettings">บันทึกตั้งค่าหมวด</button>

              ${POLL_IDS.includes(state.selectedPoll) ? `
                <details class="pv-admin-details pv-admin-legacy">
                  <summary>เครื่องมือนำเข้ารูปเดิมจากโฟลเดอร์</summary>
                  <div class="pv-grid pv-admin-details-body">
                    <label class="pv-field">จำนวนที่ต้องการนำเข้า<input id="pvSeedCount" type="number" min="1" max="99" value="${Math.max(1, Number(poll.candidateCount || activeCount || 5))}"></label>
                    ${imageFolderHint(state.selectedPoll)}
                    <button class="pv-btn pv-btn-outline" data-action="seedAll">นำเข้ารายชื่อ/รูปเดิม</button>
                  </div>
                </details>
              ` : ""}
            </div>
          </div>

          <div class="pv-card pv-admin-card pv-qr-card">
            <h2>QR และลิงก์</h2>
            <img src="${qrImageUrl(participantUrl(), 360)}" alt="QR Code">
            <p class="pv-muted">${esc(participantUrl())}</p>
            <div class="pv-toolbar">
              <button class="pv-btn pv-btn-outline" data-action="copyParticipant">คัดลอกลิงก์</button>
              <a class="pv-btn pv-btn-outline" href="${qrImageUrl(participantUrl(), 720)}" download="haos-popular-vote-qr.png">ดาวน์โหลด QR</a>
              <button class="pv-btn pv-btn-outline" data-action="printQr">พิมพ์ QR</button>
            </div>
          </div>
        </div>
      </section>

      <section class="pv-grid pv-grid-3 pv-admin-stats">
        <div class="pv-stat"><span>หมวดปัจจุบัน</span><strong>${esc(state.event?.activePoll || "-")}</strong></div>
        <div class="pv-stat"><span>คะแนนในหมวดนี้</span><strong>${state.votes.length}</strong></div>
        <div class="pv-stat"><span>ปิดใน</span><strong>${poll.closesAt ? formatCountdown(poll.closesAt) : "--:--"}</strong></div>
      </section>

      <section class="pv-panel" id="pvCandidateManager">
        <div class="pv-section-head">
          <div>
            <h2>จัดการผู้สมัครและรูปภาพ</h2>
            <p>แก้ชื่อ หมายเลข คำอธิบาย สถานะ และอัปโหลดรูปได้จากหน้านี้ · เปิดใช้งาน ${activeCount} คน</p>
          </div>
          <div class="pv-toolbar">
            <button class="pv-btn pv-btn-outline" data-action="addCandidate">+ เพิ่มผู้สมัคร</button>
            <button class="pv-btn pv-btn-primary" data-action="saveCandidates">บันทึกผู้สมัครทั้งหมด</button>
          </div>
        </div>
        ${renderCandidateEditors()}
      </section>

      <section class="pv-panel">
        <div class="pv-section-head">
          <div><h2>คะแนนแบบ Realtime</h2><p>${esc(poll.title || state.selectedPoll)} · อัปเดตล่าสุด ${formatDateTime(new Date())}</p></div>
          <div class="pv-toolbar">
            <button class="pv-btn pv-btn-outline" data-action="exportCsv">Export CSV</button>
            <button class="pv-btn pv-btn-danger" data-action="resetVotes">ล้างคะแนนหมวดนี้</button>
          </div>
        </div>
        ${renderScores(ranked)}
      </section>
    </section>
  `;
  bind();
}

function renderCandidateEditors() {
  if (!state.allCandidates.length) {
    return `<div class="pv-empty"><div class="pv-empty-icon">+</div><h2>ยังไม่มีผู้สมัคร</h2><p>กด “เพิ่มผู้สมัคร” แล้วกรอกข้อมูลและอัปโหลดรูปได้ทันที</p></div>`;
  }
  return `<div class="pv-candidate-editor-grid">${state.allCandidates.map((candidate, index) => {
    const voteCount = state.votes.filter(vote => vote.candidateId === candidate.candidateId).length;
    return `
      <article class="pv-candidate-editor ${candidate.active ? "" : "is-inactive"}" data-candidate-id="${esc(candidate.candidateId)}" data-sort-order="${Number(candidate.sortOrder || index + 1)}" data-current-image="${esc(candidate.imageUrl)}" data-storage-path="${esc(candidate.storagePath || "")}">
        <div class="pv-candidate-editor-media">
          <img src="${esc(candidate.imageUrl)}" alt="${esc(candidate.title)}" ${imageFallbackAttrs(candidate.pollId || state.selectedPoll)}>
          <span class="pv-candidate-editor-number">#${esc(candidate.displayNumber)}</span>
          ${candidate.active ? "" : `<span class="pv-candidate-editor-state">ปิดใช้งาน</span>`}
        </div>
        <div class="pv-candidate-editor-body">
          <div class="pv-grid pv-candidate-editor-fields">
            <label class="pv-field">หมายเลข<input class="pv-candidate-number-input" type="number" min="1" max="99" value="${Number(candidate.number || index + 1)}"></label>
            <label class="pv-field pv-field-wide">ชื่อผู้สมัคร<input class="pv-candidate-title-input" maxlength="120" value="${esc(candidate.title)}"></label>
            <label class="pv-field pv-field-wide">คำอธิบาย<input class="pv-candidate-subtitle-input" maxlength="240" value="${esc(candidate.subtitle || "")}"></label>
            <label class="pv-field pv-field-wide">เปลี่ยนรูป
              <input class="pv-candidate-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/*">
              <small>ระบบย่อรูปอัตโนมัติก่อนอัปโหลด สูงสุดต้นฉบับ 20 MB</small>
            </label>
            <label class="pv-admin-check pv-field-wide"><input class="pv-candidate-active-input" type="checkbox" ${candidate.active ? "checked" : ""}> แสดงผู้สมัครคนนี้ในหน้าลงคะแนน</label>
          </div>
          <div class="pv-candidate-editor-footer">
            <span class="pv-muted">${voteCount} คะแนน · ID: ${esc(candidate.candidateId)}</span>
            <div class="pv-toolbar">
              <button class="pv-btn pv-btn-outline pv-btn-compact" data-candidate-action="moveUp" data-candidate-id="${esc(candidate.candidateId)}" ${index === 0 ? "disabled" : ""} aria-label="เลื่อนขึ้น">↑</button>
              <button class="pv-btn pv-btn-outline pv-btn-compact" data-candidate-action="moveDown" data-candidate-id="${esc(candidate.candidateId)}" ${index === state.allCandidates.length - 1 ? "disabled" : ""} aria-label="เลื่อนลง">↓</button>
              <button class="pv-btn pv-btn-danger pv-btn-compact" data-candidate-action="remove" data-candidate-id="${esc(candidate.candidateId)}">ลบ</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("")}</div>`;
}

function renderScores(ranked) {
  if (!ranked.length) return `<div class="pv-empty"><h2>ยังไม่มีผู้สมัครที่เปิดใช้งาน</h2><p>เพิ่มผู้สมัครหรือเปิดสถานะผู้สมัครจากส่วนจัดการด้านบน</p></div>`;
  return `<div>${ranked.map(score => `
    <div class="pv-score-row">
      <img class="pv-score-thumb" src="${esc(score.imageUrl)}" alt="${esc(score.title)}" ${imageFallbackAttrs(score.pollId || state.selectedPoll)}>
      <div><strong>#${esc(score.displayNumber)} ${esc(score.title)}</strong><p class="pv-muted">อันดับ ${score.rank} · ${score.percent}%</p><div class="pv-bar"><span style="width:${Math.min(100, score.percent)}%"></span></div></div>
      <strong>${score.votes} คะแนน</strong>
    </div>
  `).join("")}</div>`;
}

function bind() {
  root.querySelector("#pvSignOut")?.addEventListener("click", () => fb.signOut(initFirebase().auth));
  root.querySelector("#pvPollSelect")?.addEventListener("change", event => {
    if ((state.pollDirty || state.candidateDirty) && !window.confirm("มีข้อมูลที่ยังไม่บันทึก ต้องการทิ้งการแก้ไขและเปลี่ยนหมวดหรือไม่")) {
      event.target.value = state.selectedPoll;
      return;
    }
    state.pollDirty = false;
    state.candidateDirty = false;
    state.hasManualPollSelection = true;
    state.selectedPoll = event.target.value;
    listenPollData();
    render();
  });
  root.querySelectorAll("[data-poll-input]").forEach(input => {
    input.addEventListener("input", () => { state.pollDirty = true; });
    input.addEventListener("change", () => { state.pollDirty = true; });
  });
  root.querySelector("#pvSeedCount")?.addEventListener("input", () => {
    const box = root.querySelector("#pvLegacyImageHint");
    if (box) box.outerHTML = imageFolderHint(state.selectedPoll);
  });
  root.querySelectorAll(".pv-candidate-editor input").forEach(input => {
    input.addEventListener("input", () => { state.candidateDirty = true; });
    input.addEventListener("change", () => { state.candidateDirty = true; });
  });
  root.querySelectorAll(".pv-candidate-image-input").forEach(input => {
    input.addEventListener("change", () => previewCandidateImage(input));
  });
  root.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => runAction(button.dataset.action)));
  root.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => setStageMode(button.dataset.mode)));
  root.querySelectorAll("[data-candidate-action]").forEach(button => button.addEventListener("click", () => runCandidateAction(button.dataset.candidateAction, button.dataset.candidateId)));
}

function previewCandidateImage(input) {
  const file = input.files?.[0];
  const card = input.closest(".pv-candidate-editor");
  const image = card?.querySelector(".pv-candidate-editor-media img");
  if (!file || !image) return;
  if (!String(file.type || "").startsWith("image/")) {
    input.value = "";
    alert("กรุณาเลือกไฟล์รูปภาพ");
    return;
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    input.value = "";
    alert("รูปต้นฉบับต้องมีขนาดไม่เกิน 20 MB");
    return;
  }
  const url = URL.createObjectURL(file);
  image.src = url;
  image.onload = () => URL.revokeObjectURL(url);
}

async function runAction(action) {
  try {
    if (state.busy) return;
    state.busy = true;
    if (action === "createPoll") await createPoll();
    if (action === "seedAll") await seedCurrentPoll();
    if (action === "addCandidate") await addCandidate();
    if (action === "saveCandidates") await saveAllCandidates();
    if (action === "openPoll") await openPoll(state.selectedPoll);
    if (action === "closePoll") await closePoll(state.selectedPoll);
    if (action === "setActive") await setActivePoll(state.selectedPoll);
    if (action === "savePollSettings") await savePollSettings({ notify: true });
    if (action === "copyParticipant") { await copyText(participantUrl()); alert("คัดลอกลิงก์แล้ว"); }
    if (action === "printQr") printQr();
    if (action === "exportCsv") exportCsv();
    if (action === "resetVotes") await resetVotes();
  } catch (err) {
    alert(err?.message || "ทำรายการไม่สำเร็จ");
  } finally {
    state.busy = false;
    releaseDraftLock();
    scheduleRender();
  }
}

async function runCandidateAction(action, candidateId) {
  try {
    if (state.busy) return;
    state.busy = true;
    if (action === "moveUp") await moveCandidate(candidateId, -1);
    if (action === "moveDown") await moveCandidate(candidateId, 1);
    if (action === "remove") await removeCandidate(candidateId);
  } catch (err) {
    alert(err?.message || "จัดการผู้สมัครไม่สำเร็จ");
  } finally {
    state.busy = false;
    releaseDraftLock();
    scheduleRender();
  }
}

function meta() {
  return { updatedAt: fb.serverTimestamp(), updatedBy: state.user?.email || "admin" };
}

function ensureCandidateDraftsSaved() {
  if (state.candidateDirty) throw new Error("มีข้อมูลผู้สมัครที่ยังไม่บันทึก กรุณากด “บันทึกผู้สมัครทั้งหมด” ก่อน");
}

function ensurePollClosed(message = "กรุณาปิดโหวตก่อนจัดการรายชื่อผู้สมัคร") {
  if (currentPoll().status === "open") throw new Error(message);
}

async function createPoll() {
  const inputId = root.querySelector("#pvNewPollId");
  const pollId = normalizePollId(inputId?.value);
  const title = String(root.querySelector("#pvNewPollTitle")?.value || "").trim();
  if (inputId) inputId.value = pollId;
  if (!isValidPollId(pollId)) throw new Error("รหัสหมวดต้องเป็นภาษาอังกฤษ ตัวเลข หรือขีดกลาง ความยาว 2–48 ตัว");
  if (!title) throw new Error("กรุณากรอกชื่อหมวดใหม่");
  if (allPollIds().includes(pollId)) throw new Error("รหัสหมวดนี้มีอยู่แล้ว");
  const { db } = initFirebase();
  const r = refs(db);
  await fb.setDoc(r.eventRef, { ...DEFAULT_EVENT, ...(state.event || {}), ...meta() }, { merge: true });
  await fb.setDoc(r.pollRef(pollId), {
    id: pollId,
    title,
    description: "",
    status: "draft",
    showLiveResults: false,
    durationSeconds: 300,
    totalEligibleVoters: 0,
    candidateCount: 0,
    ...meta()
  });
  state.hasManualPollSelection = true;
  state.selectedPoll = pollId;
  state.pollDirty = false;
  state.candidateDirty = false;
  listenPollData();
  alert(`สร้างหมวด “${title}” แล้ว`);
}

async function seedCurrentPoll(options = {}) {
  const pollId = options.pollId || state.selectedPoll;
  if (!POLL_IDS.includes(pollId)) throw new Error("หมวดที่สร้างใหม่ให้เพิ่มผู้สมัครจากปุ่ม “เพิ่มผู้สมัคร”");
  if (!options.silent && !window.confirm("นำเข้ารายชื่อและรูปเดิมจากโฟลเดอร์ โดยจะไม่ทับข้อมูลที่แก้จากหน้า Admin ใช่หรือไม่")) return 0;
  const { db } = initFirebase();
  const r = refs(db);
  const count = candidateCountInput();
  const [seed, existing] = await Promise.all([loadSeed(pollId), fb.getDocs(r.candidatesCol(pollId))]);
  const generated = buildCandidates(pollId, count, seed.candidates || []);
  const existingByNumber = new Map(existing.docs.map(docSnap => [Number(docSnap.data()?.number || docSnap.data()?.sortOrder || 0), docSnap]));
  let added = 0;
  let restored = 0;
  const batch = fb.writeBatch(db);
  generated.forEach(candidate => {
    const current = existingByNumber.get(candidate.number);
    if (current) {
      if (current.data()?.active === false) {
        batch.set(current.ref, { active: true, ...meta() }, { merge: true });
        restored += 1;
      }
      return;
    }
    batch.set(r.candidateRef(pollId, candidate.candidateId), {
      ...candidate,
      createdAt: fb.serverTimestamp(),
      ...meta()
    });
    added += 1;
  });
  const activeExisting = existing.docs.filter(docSnap => docSnap.data()?.active !== false).length;
  const candidateCount = activeExisting + added + restored;
  batch.set(r.eventRef, { ...DEFAULT_EVENT, ...(state.event || {}), ...meta() }, { merge: true });
  batch.set(r.pollRef(pollId), {
    ...(DEFAULT_POLLS[pollId] || {}),
    ...(seed.poll || {}),
    candidateCount,
    ...meta()
  }, { merge: true });
  await batch.commit();
  if (!options.silent) alert(`นำเข้าเสร็จ: เพิ่ม ${added} คน${restored ? ` · เปิดใช้งานคืน ${restored} คน` : ""}`);
  return added + restored;
}

async function ensureActiveCandidates(pollId) {
  const { db } = initFirebase();
  const r = refs(db);
  const snap = await fb.getDocs(r.candidatesCol(pollId));
  if (snap.docs.some(docSnap => docSnap.data()?.active !== false)) return 0;
  if (!POLL_IDS.includes(pollId)) throw new Error("หมวดนี้ยังไม่มีผู้สมัคร กรุณาเพิ่มผู้สมัครก่อนเปิดโหวต");
  const count = await seedCurrentPoll({ pollId, silent: true });
  if (!count) throw new Error("หมวดนี้ยังไม่มีผู้สมัครที่เปิดใช้งาน");
  return count;
}

async function savePollSettings(options = {}) {
  const title = String(root.querySelector("#pvPollTitle")?.value || "").trim();
  const description = String(root.querySelector("#pvPollDescription")?.value || "").trim();
  if (!title) throw new Error("กรุณากรอกชื่อหมวด");
  const durationSeconds = Math.max(10, Number(root.querySelector("#pvDuration")?.value || 300));
  const totalEligibleVoters = Math.max(0, Number(root.querySelector("#pvEligible")?.value || 0));
  const showLiveResults = root.querySelector("#pvShowLive")?.value === "true";
  const { db } = initFirebase();
  await fb.setDoc(refs(db).pollRef(state.selectedPoll), {
    title,
    description,
    durationSeconds,
    totalEligibleVoters,
    candidateCount: state.candidates.length,
    showLiveResults,
    ...meta()
  }, { merge: true });
  state.pollDirty = false;
  if (options.notify) alert("บันทึกตั้งค่าหมวดแล้ว");
}

async function addCandidate() {
  ensureCandidateDraftsSaved();
  ensurePollClosed("กรุณาปิดโหวตก่อนเพิ่มผู้สมัคร");
  const number = nextCandidateNumber(state.allCandidates);
  const candidateId = buildCandidateId(state.selectedPoll, number, state.allCandidates.map(candidate => candidate.candidateId));
  const sortOrder = state.allCandidates.reduce((max, candidate) => Math.max(max, Number(candidate.sortOrder || 0)), 0) + 1;
  const { db } = initFirebase();
  const r = refs(db);
  const batch = fb.writeBatch(db);
  batch.set(r.candidateRef(state.selectedPoll, candidateId), {
    candidateId,
    pollId: state.selectedPoll,
    number,
    displayNumber: padCandidateNumber(number),
    title: `ผู้เข้าประกวดหมายเลข ${number}`,
    subtitle: currentPoll().candidateSubtitle || currentPoll().title || "",
    imageUrl: `/popular-vote/assets/${state.selectedPoll}/${padCandidateNumber(number)}.png`,
    active: true,
    sortOrder,
    createdAt: fb.serverTimestamp(),
    ...meta()
  });
  batch.set(r.pollRef(state.selectedPoll), { candidateCount: state.candidates.length + 1, ...meta() }, { merge: true });
  await batch.commit();
}

function collectCandidateDrafts() {
  return Array.from(root.querySelectorAll(".pv-candidate-editor")).map((card, index) => ({
    candidateId: card.dataset.candidateId,
    number: Number(card.querySelector(".pv-candidate-number-input")?.value),
    title: card.querySelector(".pv-candidate-title-input")?.value,
    subtitle: card.querySelector(".pv-candidate-subtitle-input")?.value,
    active: Boolean(card.querySelector(".pv-candidate-active-input")?.checked),
    sortOrder: Number(card.dataset.sortOrder || index + 1),
    imageUrl: card.dataset.currentImage || "",
    storagePath: card.dataset.storagePath || "",
    file: card.querySelector(".pv-candidate-image-input")?.files?.[0] || null
  }));
}

async function saveAllCandidates() {
  const drafts = validateCandidateDrafts(collectCandidateDrafts());
  const currentById = new Map(state.allCandidates.map(candidate => [candidate.candidateId, candidate]));
  drafts.forEach(draft => {
    const current = currentById.get(draft.candidateId);
    const votes = state.votes.filter(vote => vote.candidateId === draft.candidateId).length;
    if (current?.active && !draft.active && votes) {
      throw new Error(`ผู้สมัครหมายเลข ${draft.number} มี ${votes} คะแนน จึงยังปิดใช้งานไม่ได้ กรุณาล้างคะแนนก่อน`);
    }
  });
  if (currentPoll().status === "open" && !window.confirm("ขณะนี้กำลังเปิดโหวต การบันทึกจะเปลี่ยนหน้าลงคะแนนทันที ต้องการดำเนินการต่อหรือไม่")) return;

  const { app, db } = initFirebase();
  const r = refs(db);
  const storage = getStorage(app);
  for (const draft of drafts) {
    let nextImageUrl = draft.imageUrl;
    let nextStoragePath = draft.storagePath;
    let uploadedPath = "";
    try {
      if (draft.file) {
        const optimized = await optimizeCandidateImage(draft.file);
        uploadedPath = candidateStoragePath(EVENT_ID, state.selectedPoll, draft.candidateId);
        const fileRef = storageRef(storage, uploadedPath);
        await uploadBytes(fileRef, optimized, { contentType: "image/jpeg", cacheControl: "public,max-age=3600" });
        nextImageUrl = await getDownloadURL(fileRef);
        nextStoragePath = uploadedPath;
      }
      await fb.setDoc(r.candidateRef(state.selectedPoll, draft.candidateId), {
        candidateId: draft.candidateId,
        pollId: state.selectedPoll,
        number: draft.number,
        displayNumber: draft.displayNumber,
        title: draft.title,
        subtitle: draft.subtitle,
        imageUrl: nextImageUrl,
        storagePath: nextStoragePath,
        active: draft.active,
        sortOrder: draft.sortOrder,
        ...meta()
      }, { merge: true });
      if (uploadedPath && draft.storagePath && draft.storagePath !== uploadedPath) {
        deleteObject(storageRef(storage, draft.storagePath)).catch(err => console.warn("[Popular Vote] old image cleanup failed", err));
      }
    } catch (err) {
      if (uploadedPath) deleteObject(storageRef(storage, uploadedPath)).catch(() => {});
      throw err;
    }
  }
  const activeCount = drafts.filter(draft => draft.active).length;
  await fb.setDoc(r.pollRef(state.selectedPoll), { candidateCount: activeCount, ...meta() }, { merge: true });
  state.candidateDirty = false;
  alert(`บันทึกผู้สมัครแล้ว ${drafts.length} คน · เปิดใช้งาน ${activeCount} คน`);
}

async function optimizeCandidateImage(file) {
  if (!String(file?.type || "").startsWith("image/")) throw new Error("ไฟล์ที่เลือกไม่ใช่รูปภาพ");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error("รูปต้นฉบับต้องมีขนาดไม่เกิน 20 MB");
  const source = await loadImageSource(file);
  try {
    const longest = Math.max(source.width, source.height);
    const scale = Math.min(1, 1600 / Math.max(1, longest));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(source.image, 0, 0, width, height);
    let blob = await canvasToBlob(canvas, 0.88);
    if (blob.size > MAX_UPLOAD_IMAGE_BYTES) blob = await canvasToBlob(canvas, 0.72);
    if (blob.size > MAX_UPLOAD_IMAGE_BYTES) throw new Error("รูปยังมีขนาดใหญ่เกิน 4.5 MB หลังย่อ กรุณาเลือกรูปที่เล็กลง");
    return blob;
  } finally {
    source.cleanup();
  }
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { image: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปนี้ได้"));
  });
  return { image, width: image.naturalWidth, height: image.naturalHeight, cleanup: () => URL.revokeObjectURL(url) };
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error("ไม่สามารถย่อรูปได้"));
  }, "image/jpeg", quality));
}

async function moveCandidate(candidateId, direction) {
  ensureCandidateDraftsSaved();
  ensurePollClosed("กรุณาปิดโหวตก่อนเรียงลำดับผู้สมัคร");
  const index = state.allCandidates.findIndex(candidate => candidate.candidateId === candidateId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.allCandidates.length) return;
  const current = state.allCandidates[index];
  const next = state.allCandidates[nextIndex];
  const { db } = initFirebase();
  const r = refs(db);
  const batch = fb.writeBatch(db);
  batch.set(r.candidateRef(state.selectedPoll, current.candidateId), { sortOrder: Number(next.sortOrder || nextIndex + 1), ...meta() }, { merge: true });
  batch.set(r.candidateRef(state.selectedPoll, next.candidateId), { sortOrder: Number(current.sortOrder || index + 1), ...meta() }, { merge: true });
  await batch.commit();
}

async function removeCandidate(candidateId) {
  ensureCandidateDraftsSaved();
  ensurePollClosed("กรุณาปิดโหวตก่อนลบผู้สมัคร");
  const candidate = state.allCandidates.find(item => item.candidateId === candidateId);
  if (!candidate) return;
  const voteCount = state.votes.filter(vote => vote.candidateId === candidateId).length;
  if (voteCount) throw new Error(`ผู้สมัครคนนี้มี ${voteCount} คะแนน กรุณาล้างคะแนนก่อนลบ`);
  if (candidate.active && state.candidates.length <= 1) throw new Error("ต้องเหลือผู้สมัครที่เปิดใช้งานอย่างน้อย 1 คน");
  if (!window.confirm(`ลบผู้สมัคร #${candidate.displayNumber} ${candidate.title} ใช่หรือไม่`)) return;
  const { app, db } = initFirebase();
  const r = refs(db);
  await fb.deleteDoc(r.candidateRef(state.selectedPoll, candidateId));
  if (candidate.storagePath) {
    deleteObject(storageRef(getStorage(app), candidate.storagePath)).catch(err => console.warn("[Popular Vote] image cleanup failed", err));
  }
  const nextActiveCount = state.candidates.length - (candidate.active ? 1 : 0);
  await fb.setDoc(r.pollRef(state.selectedPoll), { candidateCount: Math.max(0, nextActiveCount), ...meta() }, { merge: true });
}

async function setActivePoll(pollId) {
  ensureCandidateDraftsSaved();
  await ensureActiveCandidates(pollId);
  const { db } = initFirebase();
  await fb.setDoc(refs(db).eventRef, { activePoll: pollId, ...meta() }, { merge: true });
}

async function openPoll(pollId) {
  ensureCandidateDraftsSaved();
  await savePollSettings();
  await ensureActiveCandidates(pollId);
  const { db } = initFirebase();
  const r = refs(db);
  const durationSeconds = Math.max(10, Number(root.querySelector("#pvDuration")?.value || state.polls[pollId]?.durationSeconds || 300));
  const closesAt = new Date(Date.now() + durationSeconds * 1000);
  await fb.setDoc(r.eventRef, { activePoll: pollId, eventStatus: "active", stageMode: "live", ...meta() }, { merge: true });
  await fb.setDoc(r.pollRef(pollId), { status: "open", openedAt: fb.serverTimestamp(), closesAt: fb.Timestamp.fromDate(closesAt), closedAt: null, ...meta() }, { merge: true });
}

async function closePoll(pollId) {
  const { db } = initFirebase();
  const r = refs(db);
  await fb.setDoc(r.pollRef(pollId), { status: "closed", closedAt: fb.serverTimestamp(), ...meta() }, { merge: true });
  await fb.setDoc(r.eventRef, { stageMode: "result", ...meta() }, { merge: true });
}

async function setStageMode(mode) {
  try {
    if (state.busy) return;
    state.busy = true;
    const { db } = initFirebase();
    await fb.setDoc(refs(db).eventRef, { stageMode: mode, ...meta() }, { merge: true });
  } catch (err) {
    alert(err?.message || "เปลี่ยนหน้า Stage ไม่สำเร็จ");
  } finally {
    state.busy = false;
    scheduleRender();
  }
}

function printQr() {
  const win = window.open("", "_blank", "width=720,height=900");
  if (!win) return;
  win.document.write(`<title>Popular Vote QR</title><body style="font-family:sans-serif;text-align:center;padding:32px"><h1>Popular Vote</h1><img src="${qrImageUrl(participantUrl(), 720)}" style="width:520px;max-width:100%"><p>${participantUrl()}</p><script>setTimeout(()=>print(),500)<\/script></body>`);
  win.document.close();
}

function exportCsv() {
  const scores = rankScores(calcScores(state.candidates, state.votes));
  const rows = [["rank", "candidateId", "number", "title", "votes", "percent", "pollId", "exportedAt"]];
  scores.forEach(score => rows.push([score.rank, score.candidateId, score.displayNumber, score.title, score.votes, score.percent, state.selectedPoll, new Date().toISOString()]));
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `popular-vote-${state.selectedPoll}-${Date.now()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

async function resetVotes() {
  const confirmOne = window.confirm(`ลบคะแนนทั้งหมดของหมวด ${state.selectedPoll} ใช่หรือไม่`);
  if (!confirmOne) return;
  const text = window.prompt("พิมพ์ RESET เพื่อยืนยันการลบคะแนนหมวดนี้");
  if (text !== "RESET") return;
  const { db } = initFirebase();
  const r = refs(db);
  const snap = await fb.getDocs(r.votesCol(state.selectedPoll));
  let batch = fb.writeBatch(db);
  let count = 0;
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    count += 1;
    if (count % 450 === 0) {
      await batch.commit();
      batch = fb.writeBatch(db);
    }
  }
  await batch.commit();
  alert(`ลบคะแนนแล้ว ${count} รายการ`);
}

window.addEventListener("beforeunload", event => {
  state.unsub.forEach(safeUnsubscribe);
  clearInterval(state.tick);
  if (state.pollDirty || state.candidateDirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

boot();
