import {
  VERSION,
  EVENT_ID,
  fb,
  featureEnabled,
  initFirebase,
  refs,
  esc,
  cleanText,
  disabledPage,
  showFatal,
  normalizePoll,
  normalizeCandidates,
  formatCountdown,
  safeUnsubscribe
} from "./core.js";

const root = document.getElementById("app");
let state = {
  user: null,
  event: null,
  poll: null,
  pollId: null,
  candidates: [],
  ownVote: null,
  selectedId: null,
  submitting: false,
  countdown: null,
  unsub: []
};

function header() {
  return `
    <header class="pv-hero pv-hero-participant">
      <div>
        <div class="pv-kicker">Health Assistant OS</div>
        <h1>${esc(state.event?.title || "Back to School Popular Vote")}</h1>
        <p>${esc(state.poll?.description || "สแกน QR Code แล้วร่วมโหวตได้ทันที")}</p>
      </div>
      <a class="pv-btn pv-btn-light" href="/">กลับเข้าสู่ระบบหลัก</a>
    </header>
  `;
}

function statusBadge() {
  const status = state.poll?.status || "draft";
  const text = {
    draft: "ยังไม่พร้อม",
    ready: "รอเปิดโหวต",
    open: "กำลังเปิดโหวต",
    closed: "ปิดรับคะแนนแล้ว",
    result: "ประกาศผลแล้ว"
  }[status] || status;
  return `<span class="pv-status pv-status-${esc(status)}">${esc(text)}</span>`;
}

function render() {
  if (!state.event) {
    root.innerHTML = `<section class="pv-page pv-page-narrow"><div class="pv-loading-card"><div class="pv-spinner"></div><h1>กำลังโหลดกิจกรรม</h1></div></section>`;
    return;
  }
  if (!state.pollId || !state.poll) {
    root.innerHTML = `<section class="pv-page">${header()}<div class="pv-empty"><h2>ยังไม่ได้เลือกหมวดโหวต</h2><p>รอผู้ดูแลเปิดหมวดโหวตจากหน้าควบคุม</p></div></section>`;
    return;
  }
  const status = state.poll.status;
  const already = Boolean(state.ownVote);
  const canVote = status === "open" && !already;
  root.innerHTML = `
    <section class="pv-page">
      ${header()}
      <section class="pv-panel pv-vote-panel">
        <div class="pv-section-head">
          <div>
            <h2>${esc(state.poll.title)}</h2>
            <p>${esc(state.poll.description || "เลือกได้ 1 รายการ และยืนยันแล้วแก้ไขไม่ได้")}</p>
          </div>
          <div class="pv-stack-end">
            ${statusBadge()}
            ${state.poll.closesAt ? `<strong class="pv-countdown">${formatCountdown(state.poll.closesAt)}</strong>` : ""}
          </div>
        </div>
        ${already ? renderThanks() : renderBody(status, canVote)}
      </section>
    </section>
  `;
  bindCandidateEvents(canVote);
}

function renderThanks() {
  const candidate = state.candidates.find(c => c.candidateId === state.ownVote?.candidateId);
  return `
    <div class="pv-empty pv-empty-success">
      <div class="pv-empty-icon">✓</div>
      <h2>ขอบคุณที่ร่วมลงคะแนน</h2>
      <p>คุณใช้สิทธิ์ในหมวดนี้แล้ว${candidate ? `: ${esc(candidate.displayNumber)} ${esc(candidate.title)}` : ""}</p>
    </div>
  `;
}

function renderBody(status, canVote) {
  if (status === "ready" || status === "draft") {
    return `<div class="pv-empty"><h2>รอเปิดโหวต</h2><p>เมื่อผู้ดูแลเปิดโหวต รายชื่อผู้เข้าประกวดจะแสดงที่หน้านี้อัตโนมัติ</p></div>`;
  }
  if (status === "closed") {
    return `<div class="pv-empty"><h2>ปิดรับคะแนนแล้ว</h2><p>รอติดตามผลคะแนนจากหน้าจอเวที</p></div>`;
  }
  if (status === "result") {
    return `<div class="pv-empty"><h2>ประกาศผลแล้ว</h2><p>ขอบคุณทุกคะแนนโหวต</p></div>`;
  }
  if (!state.candidates.length) {
    return `<div class="pv-empty"><h2>ยังไม่มีผู้เข้าประกวด</h2><p>ผู้ดูแลสามารถ seed รายชื่อจากหน้า Admin</p></div>`;
  }
  return `
    <div class="pv-candidate-grid">
      ${state.candidates.map(c => `
        <article class="pv-candidate ${state.selectedId === c.candidateId ? "is-selected" : ""}" data-id="${esc(c.candidateId)}">
          <button class="pv-image-button" data-preview="${esc(c.candidateId)}" type="button">
            <img src="${esc(c.imageUrl)}" alt="${esc(c.title)}" loading="lazy">
          </button>
          <div class="pv-candidate-body">
            <span class="pv-number">${esc(c.displayNumber)}</span>
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.subtitle)}</p>
            <button class="pv-btn ${state.selectedId === c.candidateId ? "pv-btn-primary" : "pv-btn-outline"}" data-select="${esc(c.candidateId)}" type="button" ${canVote ? "" : "disabled"}>
              ${state.selectedId === c.candidateId ? "เลือกแล้ว" : "เลือก"}
            </button>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="pv-sticky-action">
      <button class="pv-btn pv-btn-primary pv-btn-lg" id="pvConfirmVote" ${state.selectedId && canVote && !state.submitting ? "" : "disabled"}>
        ${state.submitting ? "กำลังบันทึกคะแนน..." : "ยืนยันการโหวต"}
      </button>
    </div>
  `;
}

function bindCandidateEvents(canVote) {
  root.querySelectorAll("[data-select]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!canVote) return;
      state.selectedId = btn.dataset.select;
      render();
    });
  });
  root.querySelectorAll("[data-preview]").forEach(btn => {
    btn.addEventListener("click", () => showPreview(btn.dataset.preview));
  });
  root.querySelector("#pvConfirmVote")?.addEventListener("click", confirmVote);
}

function showPreview(id) {
  const c = state.candidates.find(item => item.candidateId === id);
  if (!c) return;
  const overlay = document.createElement("div");
  overlay.className = "pv-lightbox";
  overlay.innerHTML = `
    <button class="pv-lightbox-close" type="button" aria-label="ปิด">×</button>
    <img src="${esc(c.imageUrl)}" alt="${esc(c.title)}">
    <div><strong>${esc(c.displayNumber)} ${esc(c.title)}</strong><p>${esc(c.subtitle)}</p></div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay || event.target.closest(".pv-lightbox-close")) overlay.remove();
  });
  document.body.appendChild(overlay);
}

async function confirmVote() {
  if (!state.selectedId || state.submitting || state.ownVote) return;
  const candidate = state.candidates.find(c => c.candidateId === state.selectedId);
  if (!candidate) return;
  const ok = window.confirm(`ยืนยันโหวตหมายเลข ${candidate.displayNumber} ${candidate.title}\nหลังยืนยันแล้วไม่สามารถแก้ไขได้`);
  if (!ok) return;
  state.submitting = true;
  render();
  try {
    const { db } = initFirebase();
    const r = refs(db);
    const existing = await fb.getDoc(r.voteRef(state.pollId, state.user.uid));
    if (existing.exists()) {
      state.ownVote = existing.data();
      alert("คุณใช้สิทธิ์ในหมวดนี้แล้ว");
      return;
    }
    await fb.setDoc(r.voteRef(state.pollId, state.user.uid), {
      voterUid: state.user.uid,
      pollId: state.pollId,
      candidateId: candidate.candidateId,
      candidateNumber: candidate.number,
      createdAt: fb.serverTimestamp(),
      clientVersion: VERSION
    });
  } catch (err) {
    alert(err?.message || "บันทึกคะแนนไม่สำเร็จ");
  } finally {
    state.submitting = false;
    render();
  }
}

function clearPollListeners() {
  state.unsub.splice(1).forEach(safeUnsubscribe);
}

function listenPoll(pollId) {
  clearPollListeners();
  state.pollId = pollId;
  state.poll = null;
  state.candidates = [];
  state.ownVote = null;
  state.selectedId = null;
  const { db } = initFirebase();
  const r = refs(db);
  state.unsub.push(fb.onSnapshot(r.pollRef(pollId), snap => {
    state.poll = normalizePoll(pollId, snap.exists() ? snap.data() : {});
    render();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(fb.query(r.candidatesCol(pollId), fb.where("active", "==", true), fb.orderBy("sortOrder")), snap => {
    state.candidates = normalizeCandidates(snap);
    render();
  }, err => showFatal(root, err)));
  state.unsub.push(fb.onSnapshot(r.voteRef(pollId, state.user.uid), snap => {
    state.ownVote = snap.exists() ? snap.data() : null;
    render();
  }, err => showFatal(root, err)));
}

async function boot() {
  if (!featureEnabled()) return disabledPage(root);
  try {
    const { auth, db } = initFirebase();
    await fb.signInAnonymously(auth);
    fb.onAuthStateChanged(auth, user => {
      if (!user) return;
      state.user = user;
      const r = refs(db);
      state.unsub[0] = fb.onSnapshot(r.eventRef, snap => {
        state.event = snap.exists() ? { id: snap.id, ...snap.data() } : { title: "Back to School Popular Vote", activePoll: null };
        const nextPoll = cleanText(state.event.activePoll, "");
        if (nextPoll && nextPoll !== state.pollId) listenPoll(nextPoll);
        if (!nextPoll) {
          clearPollListeners();
          state.pollId = null;
          state.poll = null;
          render();
        }
      }, err => showFatal(root, err));
    });
    state.countdown = setInterval(() => {
      if (state.poll?.closesAt) render();
    }, 1000);
  } catch (err) {
    showFatal(root, err);
  }
}

window.addEventListener("beforeunload", () => {
  state.unsub.forEach(safeUnsubscribe);
  clearInterval(state.countdown);
});

boot();
