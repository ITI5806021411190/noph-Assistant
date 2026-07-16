import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const VERSION = "v70.132-popular-vote-admin-manager";
export const FIREBASE_SDK_VERSION = "10.12.5";
export const EVENT_ID = "back-to-school-2569";
export const ADMIN_EMAIL = "wongnazaipot@gmail.com";
export const POLL_IDS = ["child-photo", "costume"];

export const firebaseConfig = {
  apiKey: "AIzaSyBCtg_SBp9p1MuLH5n_NJtVcG9PMkUuADI",
  authDomain: "haos-back-to-school-vote-2569.firebaseapp.com",
  projectId: "haos-back-to-school-vote-2569",
  storageBucket: "haos-back-to-school-vote-2569.firebasestorage.app",
  messagingSenderId: "713086973",
  appId: "1:713086973:web:4766b0ceb14b45c58c2b94",
  measurementId: "G-63XZY0FJVR"
};

export const DEFAULT_EVENT = {
  title: "Back to School Popular Vote 2569",
  activePoll: null,
  stageMode: "gallery",
  eventStatus: "draft"
};

export const DEFAULT_POLLS = {
  "child-photo": {
    id: "child-photo",
    title: "โหวตภาพถ่ายตอนเด็ก",
    description: "เลือกภาพถ่ายตอนเด็กที่ประทับใจที่สุด",
    status: "draft",
    showLiveResults: false,
    durationSeconds: 300,
    totalEligibleVoters: 0,
    candidateCount: 5,
    candidateSubtitle: "ภาพถ่ายตอนเด็ก"
  },
  costume: {
    id: "costume",
    title: "โหวตการแต่งกายตามธีม",
    description: "เลือกการแต่งกาย Back to School ที่โดดเด่นที่สุด",
    status: "draft",
    showLiveResults: false,
    durationSeconds: 300,
    totalEligibleVoters: 0,
    candidateCount: 5,
    candidateSubtitle: "แต่งกายตามธีม"
  }
};

let firebaseState = null;

export const fb = {
  initializeApp,
  getApps,
  getApp,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  getFirestore,
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
};

export function featureEnabled() {
  const local = window.POPULAR_VOTE_CONFIG || {};
  const features = window.HAOS_FEATURES || {};
  return local.enabled !== false && features.ENABLE_POPULAR_VOTE !== false;
}

export function initFirebase() {
  if (firebaseState) return firebaseState;
  if (!featureEnabled()) throw new Error("Popular Vote is disabled");
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  firebaseState = { app, auth, db };
  return firebaseState;
}

export function refs(db, eventId = EVENT_ID) {
  const eventRef = doc(db, "events", eventId);
  return {
    eventRef,
    pollRef: pollId => doc(db, "events", eventId, "polls", pollId),
    pollsCol: collection(db, "events", eventId, "polls"),
    candidatesCol: pollId => collection(db, "events", eventId, "polls", pollId, "candidates"),
    candidateRef: (pollId, candidateId) => doc(db, "events", eventId, "polls", pollId, "candidates", candidateId),
    votesCol: pollId => collection(db, "events", eventId, "polls", pollId, "votes"),
    voteRef: (pollId, uid) => doc(db, "events", eventId, "polls", pollId, "votes", uid)
  };
}

export function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function cleanText(value, fallback = "-") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

export function padCandidateNumber(number) {
  return String(Math.max(1, Number(number || 1))).padStart(2, "0");
}

export function placeholderImageUrl(pollId = "child-photo") {
  return pollId === "costume"
    ? "/popular-vote/assets/images/placeholder-costume.svg"
    : "/popular-vote/assets/images/placeholder-child.svg";
}

export function candidateAssetUrl(pollId, number) {
  return `/popular-vote/assets/${pollId}/${padCandidateNumber(number)}.png`;
}

export function imageFallbackAttrs(pollId = "child-photo") {
  const placeholder = placeholderImageUrl(pollId);
  return `onerror="const s=Number(this.dataset.fallbackStep||0);const e=['.jpg','.jpeg','.webp'];if(s<e.length){this.dataset.fallbackStep=String(s+1);this.src=this.src.replace(/\\.(png|jpg|jpeg|webp)(\\?.*)?$/i,e[s]+'$2');}else{this.onerror=null;this.src='${placeholder}';this.classList.add('is-missing-image')}"`;
}

function inferPollId(row = {}, fallbackPollId = "") {
  if (fallbackPollId) return fallbackPollId;
  const id = String(row.pollId || row.candidateId || "");
  if (id.startsWith("costume-")) return "costume";
  if (id.startsWith("child-")) return "child-photo";
  return "child-photo";
}

function candidateNumberFrom(row = {}) {
  const direct = Number(row.number || row.sortOrder || 0);
  if (direct > 0) return direct;
  const match = String(row.displayNumber || row.candidateId || "").match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function isPlaceholderUrl(value) {
  return /\/popular-vote\/assets\/images\/placeholder-(child|costume)\.svg/i.test(String(value || ""));
}

function resolveCandidateImageUrl(row = {}, pollId, number) {
  const raw = String(row.imageUrl || "").trim();
  if (raw && !isPlaceholderUrl(raw)) return raw;
  return candidateAssetUrl(pollId, number || candidateNumberFrom(row) || 1);
}

export function buildCandidate(pollId, number, seed = {}) {
  const displayNumber = padCandidateNumber(seed.displayNumber || number);
  const defaults = DEFAULT_POLLS[pollId] || {};
  return {
    candidateId: seed.candidateId || `${pollId}-${displayNumber}`,
    pollId,
    number: Number(number),
    displayNumber,
    title: cleanText(seed.title, `ผู้เข้าประกวดหมายเลข ${Number(number)}`),
    subtitle: cleanText(seed.subtitle, defaults.candidateSubtitle || defaults.title || ""),
    imageUrl: candidateAssetUrl(pollId, number),
    active: true,
    sortOrder: Number(seed.sortOrder || number)
  };
}

export function buildCandidates(pollId, count = 5, seeds = []) {
  const safeCount = Math.max(1, Math.min(99, Number(count || 5)));
  const seedByNumber = new Map(
    (Array.isArray(seeds) ? seeds : []).map(seed => [candidateNumberFrom(seed), seed])
  );
  return Array.from({ length: safeCount }, (_, index) => {
    const number = index + 1;
    return buildCandidate(pollId, number, seedByNumber.get(number) || {});
  });
}

export function disabledPage(root) {
  root.innerHTML = `
    <section class="pv-page pv-page-narrow">
      <div class="pv-empty">
        <div class="pv-empty-icon">ปิด</div>
        <h1>Popular Vote ยังไม่เปิดใช้งาน</h1>
        <p>ผู้ดูแลระบบสามารถเปิด feature flag <code>ENABLE_POPULAR_VOTE</code> ได้เมื่อต้องการทดสอบ</p>
        <a class="pv-btn pv-btn-primary" href="/">กลับเข้าสู่ Health Assistant OS</a>
      </div>
    </section>
  `;
}

export function showFatal(root, err, title = "เกิดข้อผิดพลาด") {
  root.innerHTML = `
    <section class="pv-page pv-page-narrow">
      <div class="pv-empty pv-empty-danger">
        <div class="pv-empty-icon">!</div>
        <h1>${esc(title)}</h1>
        <p>${esc(err?.message || err || "ไม่สามารถเปิดโมดูลได้")}</p>
        <a class="pv-btn pv-btn-primary" href="/">กลับเข้าสู่ Health Assistant OS</a>
      </div>
    </section>
  `;
}

export function participantUrl() {
  return `${window.location.origin}/popular-vote/`;
}

export function stageUrl() {
  return `${window.location.origin}/popular-vote/stage/`;
}

export function adminUrl() {
  return `${window.location.origin}/popular-vote/admin/`;
}

export function qrImageUrl(value = participantUrl(), size = 520) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=18&data=${encodeURIComponent(value)}`;
}

export async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const ok = document.execCommand("copy");
  input.remove();
  return ok;
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTime(dateLike) {
  const date = toDate(dateLike);
  if (!date) return "-";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) + " น.";
}

export function formatDateTime(dateLike) {
  const date = toDate(dateLike);
  if (!date) return "-";
  return `${date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })} ${formatTime(date)}`;
}

export function formatCountdown(target) {
  const date = toDate(target);
  if (!date) return "--:--";
  const diff = Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
  const min = Math.floor(diff / 60);
  const sec = diff % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function normalizePoll(pollId, data = {}) {
  return { ...(DEFAULT_POLLS[pollId] || {}), ...data, id: data.id || pollId };
}

export function normalizeCandidates(snapshotOrArray, pollId = "", options = {}) {
  const rows = Array.isArray(snapshotOrArray)
    ? snapshotOrArray
    : snapshotOrArray.docs.map(d => ({ candidateId: d.id, ...d.data() }));
  return rows
    .filter(row => row && (options.includeInactive || row.active !== false))
    .map(row => {
      const resolvedPollId = inferPollId(row, pollId);
      const number = candidateNumberFrom(row);
      return {
        candidateId: cleanText(row.candidateId || row.id),
        pollId: resolvedPollId,
        number,
        displayNumber: cleanText(row.displayNumber || number || row.sortOrder || ""),
        title: cleanText(row.title, "ผู้เข้าประกวด"),
        subtitle: cleanText(row.subtitle, ""),
        imageUrl: resolveCandidateImageUrl(row, resolvedPollId, number),
        storagePath: String(row.storagePath || "").trim(),
        active: row.active !== false,
        sortOrder: Number(row.sortOrder || number || 999)
      };
    })
    .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.number - b.number));
}

export function votesFromSnapshot(snapshot) {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function calcScores(candidates, votes) {
  const byId = new Map(candidates.map(c => [c.candidateId, { ...c, votes: 0, percent: 0 }]));
  votes.forEach(vote => {
    const item = byId.get(vote.candidateId);
    if (item) item.votes += 1;
  });
  const total = votes.length;
  return Array.from(byId.values()).map(item => ({
    ...item,
    percent: total ? Math.round((item.votes / total) * 1000) / 10 : 0
  }));
}

export function rankScores(scores) {
  let lastVotes = null;
  let rank = 0;
  let index = 0;
  return [...scores]
    .sort((a, b) => (b.votes - a.votes) || (a.sortOrder - b.sortOrder))
    .map(item => {
      index += 1;
      if (item.votes !== lastVotes) rank = index;
      lastVotes = item.votes;
      return { ...item, rank };
    });
}

export async function loadSeed(pollId) {
  const res = await fetch(`/popular-vote/data/${pollId}.json?v=70132`, { cache: "no-store" });
  if (!res.ok) throw new Error(`โหลด seed ${pollId} ไม่สำเร็จ`);
  return res.json();
}

export function isAdminUser(user) {
  return Boolean(user?.emailVerified && String(user.email || "").toLowerCase() === ADMIN_EMAIL);
}

export function renderLogin(root, onLogin, message = "กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล") {
  root.innerHTML = `
    <section class="pv-page pv-page-narrow">
      <div class="pv-card pv-login-card">
        <div class="pv-logo">🗳️</div>
        <h1>Popular Vote Admin</h1>
        <p>${esc(message)}</p>
        <button class="pv-btn pv-btn-primary" id="pvGoogleLogin">เข้าสู่ระบบด้วย Google</button>
        <a class="pv-btn pv-btn-ghost" href="/">กลับเข้าสู่ Health Assistant OS</a>
      </div>
    </section>
  `;
  root.querySelector("#pvGoogleLogin")?.addEventListener("click", onLogin);
}

export async function adminSignIn(auth) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  if (!isAdminUser(result.user)) {
    await signOut(auth);
    throw new Error("บัญชีนี้ไม่มีสิทธิ์จัดการ Popular Vote");
  }
  return result.user;
}

export function safeUnsubscribe(fn) {
  try { if (typeof fn === "function") fn(); } catch (err) {}
}
