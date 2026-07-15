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
} from "./core.js";

const root = document.getElementById("app");
let state = {
  user: null,
  event: null,
  polls: {},
  selectedPoll: "child-photo",
  candidates: [],
  votes: [],
  busy: false,
  unsub: [],
  renderTimer: null,
  tick: null
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
    if (state.event.activePoll && state.event.activePoll !== state.selectedPoll) state.selectedPoll = state.event.activePoll;
    listenPollData();
    scheduleRender();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(r.pollsCol, snap => {
    const polls = {};
    snap.docs.forEach(d => { polls[d.id] = normalizePoll(d.id, d.data()); });
    state.polls = polls;
    scheduleRender();
  }, err => showFatal(root, err)));
  state.tick = setInterval(scheduleRender, 1000);
}

function listenPollData() {
  state.unsub.splice(2).forEach(safeUnsubscribe);
  const pollId = state.selectedPoll;
  if (!pollId) return;
  const { db } = initFirebase();
  const r = refs(db);
  state.unsub.push(fb.onSnapshot(fb.query(r.candidatesCol(pollId), fb.orderBy("sortOrder")), snap => {
    state.candidates = normalizeCandidates(snap, pollId);
    scheduleRender();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(r.votesCol(pollId), snap => {
    state.votes = votesFromSnapshot(snap);
    scheduleRender();
  }, err => showFatal(root, err)));
}

function scheduleRender() {
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(render, 250);
}

function pollOptions() {
  return POLL_IDS.map(id => `<option value="${esc(id)}" ${state.selectedPoll === id ? "selected" : ""}>${esc(state.polls[id]?.title || DEFAULT_POLLS[id]?.title || id)}</option>`).join("");
}

function candidateCountValue(poll) {
  return Math.max(1, Math.min(99, Number(poll?.candidateCount || DEFAULT_POLLS[state.selectedPoll]?.candidateCount || 5)));
}

function candidateCountInput() {
  return Math.max(1, Math.min(99, Number(root.querySelector("#pvCandidateCount")?.value || 5)));
}

function imageFolderHint(pollId) {
  const next = Array.from({ length: Math.min(6, candidateCountInput()) }, (_, index) => `${String(index + 1).padStart(2, "0")}.png`).join(", ");
  return `
    <div class="pv-help-box">
      <strong>รูปของหมวดนี้ให้วางไว้ที่</strong>
      <code>popular-vote/assets/${esc(pollId)}/</code>
      <span>ตั้งชื่อไฟล์ตามหมายเลข เช่น <code>${esc(next)}</code> แล้วกด “อัปเดตรายชื่อ/รูปหมวดนี้” ระบบจะจับรูปตามหมายเลขให้อัตโนมัติ</span>
    </div>
  `;
}

function render() {
  const poll = state.polls[state.selectedPoll] || DEFAULT_POLLS[state.selectedPoll] || {};
  const candidateCount = candidateCountValue(poll);
  const scores = calcScores(state.candidates, state.votes);
  const ranked = rankScores(scores);
  root.innerHTML = `
    <section class="pv-page">
      <header class="pv-hero">
        <div>
          <div class="pv-kicker">Popular Vote Admin</div>
          <h1>Back to School Popular Vote</h1>
          <p>จัดการหมวดโหวต รูปผู้เข้าประกวด เวที QR และผลคะแนนแบบ Realtime</p>
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
            <h2>แผงควบคุม</h2>
            <p>Firebase SDK ${esc(FIREBASE_SDK_VERSION)} · ${esc(VERSION)} · event: ${esc(EVENT_ID)}</p>
          </div>
          <span class="pv-status pv-status-${esc(poll.status || "draft")}">${esc(poll.status || "draft")}</span>
        </div>

        <div class="pv-grid pv-grid-2">
          <div class="pv-card pv-admin-card">
            <h2>กิจกรรมและหมวดโหวต</h2>
            <div class="pv-grid" style="margin-top:14px;">
              <label class="pv-field">เลือกหมวด
                <select id="pvPollSelect">${pollOptions()}</select>
              </label>
              <div class="pv-toolbar">
                <button class="pv-btn pv-btn-primary" data-action="seedAll">อัปเดตรายชื่อ/รูปหมวดนี้</button>
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
                <label class="pv-field">เวลาโหวต (วินาที)<input id="pvDuration" type="number" min="10" value="${Number(poll.durationSeconds || 300)}"></label>
                <label class="pv-field">จำนวนผู้มีสิทธิ์<input id="pvEligible" type="number" min="0" value="${Number(poll.totalEligibleVoters || 0)}"></label>
                <label class="pv-field">จำนวนผู้เข้าประกวด<input id="pvCandidateCount" type="number" min="1" max="99" value="${candidateCount}"></label>
                <label class="pv-field">Live results<select id="pvShowLive"><option value="false" ${poll.showLiveResults ? "" : "selected"}>ซ่อน</option><option value="true" ${poll.showLiveResults ? "selected" : ""}>แสดง</option></select></label>
              </div>
              ${imageFolderHint(state.selectedPoll)}
              <button class="pv-btn pv-btn-primary" data-action="savePollSettings">บันทึกตั้งค่า Poll</button>
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

      <section class="pv-grid pv-grid-3" style="margin-top:16px;">
        <div class="pv-stat"><span>หมวดปัจจุบัน</span><strong>${esc(state.event?.activePoll || "-")}</strong></div>
        <div class="pv-stat"><span>คะแนนในหมวดนี้</span><strong>${state.votes.length}</strong></div>
        <div class="pv-stat"><span>ปิดใน</span><strong>${poll.closesAt ? formatCountdown(poll.closesAt) : "--:--"}</strong></div>
      </section>

      <section class="pv-panel">
        <div class="pv-section-head">
          <div><h2>คะแนนแบบ Realtime</h2><p>${esc(poll.title || state.selectedPoll)} · อัปเดตล่าสุด ${formatDateTime(new Date())}</p></div>
          <div class="pv-toolbar">
            <button class="pv-btn pv-btn-outline" data-action="exportCsv">Export CSV</button>
            <button class="pv-btn pv-btn-danger" data-action="resetVotes">Reset test votes</button>
          </div>
        </div>
        ${renderScores(ranked)}
      </section>
    </section>
  `;
  bind();
}

function renderScores(ranked) {
  if (!ranked.length) return `<div class="pv-empty"><h2>ยังไม่มีรายชื่อผู้เข้าประกวด</h2><p>กำหนดจำนวนผู้เข้าประกวด แล้วกด “อัปเดตรายชื่อ/รูปหมวดนี้”</p></div>`;
  return `<div>${ranked.map(s => `
    <div class="pv-score-row">
      <img class="pv-score-thumb" src="${esc(s.imageUrl)}" alt="${esc(s.title)}" ${imageFallbackAttrs(s.pollId || state.selectedPoll)}>
      <div><strong>#${esc(s.displayNumber)} ${esc(s.title)}</strong><p class="pv-muted">อันดับ ${s.rank} · ${s.percent}%</p><div class="pv-bar"><span style="width:${Math.min(100, s.percent)}%"></span></div></div>
      <strong>${s.votes} คะแนน</strong>
    </div>
  `).join("")}</div>`;
}

function bind() {
  root.querySelector("#pvSignOut")?.addEventListener("click", () => fb.signOut(initFirebase().auth));
  root.querySelector("#pvPollSelect")?.addEventListener("change", event => {
    state.selectedPoll = event.target.value;
    listenPollData();
    render();
  });
  root.querySelector("#pvCandidateCount")?.addEventListener("input", () => {
    const box = root.querySelector(".pv-help-box");
    if (box) box.outerHTML = imageFolderHint(state.selectedPoll);
  });
  root.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => runAction(btn.dataset.action)));
  root.querySelectorAll("[data-mode]").forEach(btn => btn.addEventListener("click", () => setStageMode(btn.dataset.mode)));
}

async function runAction(action) {
  try {
    if (state.busy) return;
    state.busy = true;
    if (action === "seedAll") await seedCurrentPoll();
    if (action === "openPoll") await openPoll(state.selectedPoll);
    if (action === "closePoll") await closePoll(state.selectedPoll);
    if (action === "setActive") await setActivePoll(state.selectedPoll);
    if (action === "savePollSettings") await savePollSettings();
    if (action === "copyParticipant") { await copyText(participantUrl()); alert("คัดลอกลิงก์แล้ว"); }
    if (action === "printQr") printQr();
    if (action === "exportCsv") exportCsv();
    if (action === "resetVotes") await resetVotes();
  } catch (err) {
    alert(err?.message || "ทำรายการไม่สำเร็จ");
  } finally {
    state.busy = false;
  }
}

function meta() {
  return { updatedAt: fb.serverTimestamp(), updatedBy: state.user?.email || "admin" };
}

async function seedCurrentPoll() {
  const { db } = initFirebase();
  const r = refs(db);
  const pollId = state.selectedPoll;
  const candidateCount = candidateCountInput();
  const seed = await loadSeed(pollId);
  const candidates = buildCandidates(pollId, candidateCount, seed.candidates || []);
  const activeIds = new Set(candidates.map(candidate => candidate.candidateId));

  await fb.setDoc(r.eventRef, { ...DEFAULT_EVENT, ...(state.event || {}), updatedAt: fb.serverTimestamp(), updatedBy: state.user.email }, { merge: true });
  await fb.setDoc(r.pollRef(pollId), {
    ...DEFAULT_POLLS[pollId],
    ...(seed.poll || {}),
    candidateCount,
    ...meta()
  }, { merge: true });

  const existing = await fb.getDocs(r.candidatesCol(pollId));
  let batch = fb.writeBatch(db);
  candidates.forEach(candidate => {
    batch.set(r.candidateRef(pollId, candidate.candidateId), {
      ...candidate,
      createdAt: fb.serverTimestamp(),
      updatedAt: fb.serverTimestamp()
    }, { merge: true });
  });
  existing.docs.forEach(docSnap => {
    if (!activeIds.has(docSnap.id)) {
      batch.set(docSnap.ref, { active: false, updatedAt: fb.serverTimestamp(), updatedBy: state.user?.email || "admin" }, { merge: true });
    }
  });
  await batch.commit();
  alert(`อัปเดตรายชื่อ/รูปของหมวดนี้แล้ว ${candidateCount} รายการ`);
}

async function savePollSettings() {
  const { db } = initFirebase();
  const r = refs(db);
  const durationSeconds = Math.max(10, Number(root.querySelector("#pvDuration")?.value || 300));
  const totalEligibleVoters = Math.max(0, Number(root.querySelector("#pvEligible")?.value || 0));
  const candidateCount = candidateCountInput();
  const showLiveResults = root.querySelector("#pvShowLive")?.value === "true";
  await fb.setDoc(r.pollRef(state.selectedPoll), { durationSeconds, totalEligibleVoters, candidateCount, showLiveResults, ...meta() }, { merge: true });
}

async function setActivePoll(pollId) {
  const { db } = initFirebase();
  await fb.setDoc(refs(db).eventRef, { activePoll: pollId, updatedAt: fb.serverTimestamp(), updatedBy: state.user.email }, { merge: true });
}

async function openPoll(pollId) {
  await savePollSettings();
  const { db } = initFirebase();
  const r = refs(db);
  const durationSeconds = Math.max(10, Number(root.querySelector("#pvDuration")?.value || state.polls[pollId]?.durationSeconds || 300));
  const closesAt = new Date(Date.now() + durationSeconds * 1000);
  await fb.setDoc(r.eventRef, { activePoll: pollId, eventStatus: "active", stageMode: "live", updatedAt: fb.serverTimestamp(), updatedBy: state.user.email }, { merge: true });
  await fb.setDoc(r.pollRef(pollId), { status: "open", openedAt: fb.serverTimestamp(), closesAt: fb.Timestamp.fromDate(closesAt), closedAt: null, ...meta() }, { merge: true });
}

async function closePoll(pollId) {
  const { db } = initFirebase();
  const r = refs(db);
  await fb.setDoc(r.pollRef(pollId), { status: "closed", closedAt: fb.serverTimestamp(), ...meta() }, { merge: true });
  await fb.setDoc(r.eventRef, { stageMode: "result", updatedAt: fb.serverTimestamp(), updatedBy: state.user.email }, { merge: true });
}

async function setStageMode(mode) {
  const { db } = initFirebase();
  await fb.setDoc(refs(db).eventRef, { stageMode: mode, updatedAt: fb.serverTimestamp(), updatedBy: state.user.email }, { merge: true });
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
  scores.forEach(s => rows.push([s.rank, s.candidateId, s.displayNumber, s.title, s.votes, s.percent, state.selectedPoll, new Date().toISOString()]));
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `popular-vote-${state.selectedPoll}-${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

async function resetVotes() {
  const confirmOne = window.confirm(`ลบคะแนนทดสอบของหมวด ${state.selectedPoll} ใช่หรือไม่`);
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

window.addEventListener("beforeunload", () => {
  state.unsub.forEach(safeUnsubscribe);
  clearInterval(state.tick);
});

boot();
