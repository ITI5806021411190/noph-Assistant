(function () {
  const PATCH = "v70.128-popular-vote-firestore";
  const MODULE_ID = "popular_vote";
  const FLAG = "ENABLE_POPULAR_VOTE";

  window.HAOS_FEATURES = window.HAOS_FEATURES || {};
  if (typeof window.HAOS_FEATURES[FLAG] === "undefined") window.HAOS_FEATURES[FLAG] = true;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function currentUser() {
    try { if (typeof window.currentUser === "function") return window.currentUser() || {}; } catch (err) {}
    try { if (typeof window.getUser === "function") return window.getUser() || {}; } catch (err) {}
    try { return window.user || user || {}; } catch (err) { return window.user || {}; }
  }

  function hasAdminAccess() {
    try {
      if (typeof window.isSuper === "function" && window.isSuper()) return true;
      if (typeof window.isAdmin === "function" && window.isAdmin()) return true;
    } catch (err) {}
    const u = currentUser();
    const role = String(u.role || u.profileRole || u.userRole || "").toLowerCase();
    return role.includes("super") || role.includes("admin");
  }

  function featureEnabled() {
    return window.HAOS_FEATURES[FLAG] !== false && window.HAOS_FEATURES.popularVote !== false;
  }

  function injectStyle() {
    if (document.getElementById("haosPopularVoteModuleStyle")) return;
    const style = document.createElement("style");
    style.id = "haosPopularVoteModuleStyle";
    style.textContent = `
      #haosPopularVoteCard .haos-popular-vote-icon {
        width: 54px; height: 54px; border-radius: 18px; display: inline-flex;
        align-items: center; justify-content: center; font-size: 1.7rem;
        background: linear-gradient(135deg, #dbeafe, #dcfce7); color: #2563eb;
      }
      #haosPopularVoteCard .popular-vote-actions { display:flex; flex-wrap:wrap; gap:.5rem; }
    `;
    document.head.appendChild(style);
  }

  function findHubRow() {
    const pane = document.getElementById("itservices-pane");
    if (!pane) return null;
    const rows = Array.from(pane.querySelectorAll(".row.g-3.mb-4, .row.g-3"));
    return rows.find(row => row.querySelector(".it-service-card, .card.h-100")) || null;
  }

  function removeCard() {
    document.getElementById("haosPopularVoteCard")?.remove();
  }

  function open(path) {
    window.open(path || "/popular-vote/", "_blank", "noopener");
  }

  function installCard() {
    if (!featureEnabled() || !hasAdminAccess()) {
      removeCard();
      return;
    }
    if (document.getElementById("haosPopularVoteCard")) return;
    const row = findHubRow();
    if (!row) return;
    injectStyle();
    const card = document.createElement("div");
    card.id = "haosPopularVoteCard";
    card.className = "col-md-4";
    card.dataset.moduleId = MODULE_ID;
    card.innerHTML = `
      <div class="card h-100 it-service-card">
        <div class="card-body p-4 d-flex flex-column">
          <div class="haos-popular-vote-icon mb-3" aria-hidden="true">🗳️</div>
          <h6 class="fw-bold">Popular Vote</h6>
          <p class="text-muted small flex-grow-1">โหวตภาพถ่ายตอนเด็กและการแต่งกายตามธีม แยกฐานข้อมูลบน Firebase Firestore</p>
          <div class="popular-vote-actions">
            <button type="button" class="btn btn-primary btn-sm fw-bold" onclick="window.HAOSPopularVote.open('/popular-vote/')">หน้าโหวต</button>
            <button type="button" class="btn btn-outline-primary btn-sm fw-bold" onclick="window.HAOSPopularVote.open('/popular-vote/admin/')">ควบคุม</button>
            <button type="button" class="btn btn-outline-success btn-sm fw-bold" onclick="window.HAOSPopularVote.open('/popular-vote/stage/')">Stage</button>
          </div>
        </div>
      </div>
    `;
    row.appendChild(card);
    try {
      if (typeof window.applyITHubLayoutV759 === "function") window.applyITHubLayoutV759();
      if (typeof window.applyITHubLayoutV746 === "function") window.applyITHubLayoutV746();
    } catch (err) {}
  }

  function boot() {
    installCard();
    setTimeout(installCard, 700);
  }

  const previousInit = window.initItServicesHub;
  if (typeof previousInit === "function" && !previousInit.__haosPopularVoteWrapped) {
    const wrapped = function () {
      const result = previousInit.apply(this, arguments);
      setTimeout(installCard, 250);
      return result;
    };
    wrapped.__haosPopularVoteWrapped = true;
    window.initItServicesHub = wrapped;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.HAOSPopularVote = { version: PATCH, featureFlag: FLAG, enabled: featureEnabled, render: installCard, open };
})();
