import {
  VERSION,
  EVENT_ID,
  POLL_IDS,
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
  adminUrl,
  qrImageUrl,
  normalizePoll,
  normalizeCandidates,
  votesFromSnapshot,
  calcScores,
  rankScores,
  formatCountdown,
  formatDateTime,
  safeUnsubscribe
} from "./core.js";

const root = document.getElementById("app");
let state = { user: null, event: null, pollId: null, poll: null, polls: {}, candidates: [], votes: [], hideQr: false, unsub: [], renderTimer: null, tick: null };

function login() {
  const { auth } = initFirebase();
  renderLogin(root, async () => {
    try { await adminSignIn(auth); } catch (err) { alert(err.message); }
  }, "เข้าสู่ระบบเพื่อเปิดจอเวที Popular Vote");
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
        root.innerHTML = `<section class="pv-page pv-page-narrow"><div class="pv-empty pv-empty-danger"><h1>ไม่มีสิทธิ์เปิดจอเวที</h1><p>บัญชีนี้ไม่อยู่ในรายชื่อผู้ดูแล Popular Vote</p><button class="pv-btn pv-btn-primary" id="pvSignOut">ออกจากระบบ</button></div></section>`;
        root.querySelector("#pvSignOut")?.addEventListener("click", () => fb.signOut(auth));
        return;
      }
      listenAll();
    });
  } catch (err) { showFatal(root, err); }
}

function listenAll() {
  const { db } = initFirebase();
  const r = refs(db);
  state.unsub.push(fb.onSnapshot(r.eventRef, snap => {
    state.event = snap.exists() ? { id: snap.id, ...snap.data() } : { activePoll: null, title: "Back to School Popular Vote" };
    const next = state.event.activePoll || null;
    if (next !== state.pollId) listenPoll(next);
    scheduleRender();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(r.pollsCol, snap => {
    const polls = {};
    snap.docs.forEach(d => { polls[d.id] = normalizePoll(d.id, d.data()); });
    state.polls = polls;
    if (state.pollId && polls[state.pollId]) state.poll = polls[state.pollId];
    scheduleRender();
  }, err => showFatal(root, err)));
  state.tick = setInterval(scheduleRender, 1000);
}

function listenPoll(pollId) {
  state.unsub.splice(2).forEach(safeUnsubscribe);
  state.pollId = pollId;
  state.poll = pollId ? (state.polls[pollId] || null) : null;
  state.candidates = [];
  state.votes = [];
  if (!pollId) return scheduleRender();
  const { db } = initFirebase();
  const r = refs(db);
  state.unsub.push(fb.onSnapshot(fb.query(r.candidatesCol(pollId), fb.where("active", "==", true), fb.orderBy("sortOrder")), snap => {
    state.candidates = normalizeCandidates(snap);
    scheduleRender();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(r.votesCol(pollId), snap => {
    state.votes = votesFromSnapshot(snap);
    scheduleRender();
  }, err => showFatal(root, err)));
}

function scheduleRender() {
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(render, 300);
}

function render() {
  const scores = calcScores(state.candidates, state.votes);
  const ranked = rankScores(scores);
  const resultMode = state.event?.stageMode === "result" || state.poll?.status === "result";
  root.innerHTML = `
    <section class="pv-page pv-stage-page-inner">
      <header class="pv-hero">
        <div>
          <div class="pv-kicker">Popular Vote Stage</div>
          <h1>${esc(state.event?.title || "Back to School Popular Vote")}</h1>
          <p>${esc(state.poll?.title || "ยังไม่ได้เลือกหมวดโหวต")}</p>
        </div>
        <div class="pv-toolbar">
          <a class="pv-btn pv-btn-light" href="/">กลับ HAOS</a>
          <a class="pv-btn pv-btn-light" href="${esc(adminUrl())}">Admin</a>
          <button class="pv-btn pv-btn-light" id="pvFull">เต็มจอ</button>
        </div>
      </header>
      <div class="pv-stage-layout">
        <section class="pv-stage-canvas">
          ${resultMode ? renderResult(ranked) : renderLive(scores)}
        </section>
        <aside class="pv-stage-side">
          <div class="pv-card pv-admin-card">
            <h2>สถานะ</h2>
            <p>${esc(state.poll?.status || "-")} · ${esc(state.event?.stageMode || "gallery")}</p>
            <div class="pv-grid pv-grid-3" style="grid-template-columns: repeat(2, 1fr); margin-top: 14px;">
              <div class="pv-stat"><span>คะแนน</span><strong>${state.votes.length}</strong></div>
              <div class="pv-stat"><span>สิทธิ์ทั้งหมด</span><strong>${Number(state.poll?.totalEligibleVoters || 0)}</strong></div>
            </div>
            ${state.poll?.closesAt ? `<p class="pv-countdown">เหลือเวลา ${formatCountdown(state.poll.closesAt)}</p>` : ""}
            <p class="pv-muted">อัปเดต: ${formatDateTime(new Date())}</p>
          </div>
          <div class="pv-card pv-admin-card pv-qr-card">
            <div class="pv-section-head"><h2>QR โหวต</h2><button class="pv-btn pv-btn-outline" id="pvToggleQr">${state.hideQr ? "แสดง" : "ซ่อน"}</button></div>
            ${state.hideQr ? `<p class="pv-muted">ซ่อน QR อยู่</p>` : `<img src="${qrImageUrl(participantUrl(), 360)}" alt="QR Code"><p class="pv-muted">${esc(participantUrl())}</p>`}
          </div>
        </aside>
      </div>
    </section>
  `;
  root.querySelector("#pvFull")?.addEventListener("click", () => document.documentElement.requestFullscreen?.());
  root.querySelector("#pvToggleQr")?.addEventListener("click", () => { state.hideQr = !state.hideQr; render(); });
}

function renderLive(scores) {
  return `
    <div class="pv-section-head"><div><h2>Live Viewer</h2><p>โหมด live จะคงตำแหน่งผู้เข้าประกวด ไม่เรียงคะแนนใหม่</p></div></div>
    <div class="pv-live-grid">
      ${scores.map(s => `
        <article class="pv-live-item">
          <img src="${esc(s.imageUrl)}" alt="${esc(s.title)}">
          <strong>${esc(s.displayNumber)} ${esc(s.title)}</strong>
          <p>${s.votes} คะแนน</p>
          <div class="pv-bar"><span style="width:${Math.min(100, s.percent)}%"></span></div>
        </article>
      `).join("") || `<div class="pv-empty"><h2>ยังไม่มีรายชื่อผู้เข้าประกวด</h2></div>`}
    </div>
  `;
}

function renderResult(ranked) {
  return `
    <div class="pv-section-head"><div><h2>ผลคะแนน</h2><p>เรียงคะแนนพร้อมรองรับคะแนนเท่ากัน</p></div></div>
    <div class="pv-rank-list">
      ${ranked.map(s => `
        <article class="pv-rank-item">
          <span class="pv-rank">${s.rank}</span>
          <img src="${esc(s.imageUrl)}" alt="${esc(s.title)}">
          <div><strong>${esc(s.displayNumber)} ${esc(s.title)}</strong><p>${esc(s.subtitle)}</p><div class="pv-bar"><span style="width:${Math.min(100, s.percent)}%"></span></div></div>
          <strong>${s.votes} คะแนน · ${s.percent}%</strong>
        </article>
      `).join("") || `<div class="pv-empty"><h2>ยังไม่มีคะแนน</h2></div>`}
    </div>
  `;
}

window.addEventListener("beforeunload", () => {
  state.unsub.forEach(safeUnsubscribe);
  clearInterval(state.tick);
});

boot();
