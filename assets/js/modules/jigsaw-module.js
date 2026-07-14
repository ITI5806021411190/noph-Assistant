(function () {
  const PATCH = 'v70.127-jigsaw-game-module';
  const MODULE_ID = 'jigsaw_game';
  const FLAG = 'ENABLE_JIGSAW_GAME';

  window.HAOS_FEATURES = window.HAOS_FEATURES || {};
  if (typeof window.HAOS_FEATURES[FLAG] === 'undefined') {
    window.HAOS_FEATURES[FLAG] = true;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentUser() {
    try {
      if (typeof window.currentUser === 'function') return window.currentUser() || {};
    } catch (err) {}
    try {
      if (typeof window.getUser === 'function') return window.getUser() || {};
    } catch (err) {}
    try {
      return window.user || user || {};
    } catch (err) {
      return window.user || {};
    }
  }

  function hasAdminAccess() {
    try {
      if (typeof window.isSuper === 'function' && window.isSuper()) return true;
      if (typeof window.isAdmin === 'function' && window.isAdmin()) return true;
    } catch (err) {}
    const u = currentUser();
    const role = String(u.role || u.profileRole || '').toLowerCase();
    return role.includes('super') || role.includes('admin');
  }

  function featureEnabled() {
    return window.HAOS_FEATURES[FLAG] !== false && window.HAOS_FEATURES.jigsawGame !== false;
  }

  function injectStyle() {
    if (document.getElementById('haosJigsawModuleStyle')) return;
    const style = document.createElement('style');
    style.id = 'haosJigsawModuleStyle';
    style.textContent = `
      #haosJigsawGameCard .haos-jigsaw-icon {
        width: 54px;
        height: 54px;
        border-radius: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #eef2ff, #dcfce7);
        color: #2563eb;
        font-size: 1.8rem;
      }
      #haosJigsawGameCard .it-service-card {
        border-color: rgba(37, 99, 235, .32) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function findHubRow() {
    const pane = document.getElementById('itservices-pane');
    if (!pane) return null;
    const rows = Array.from(pane.querySelectorAll('.row.g-3.mb-4, .row.g-3'));
    return rows.find(row => row.querySelector('.it-service-card, .card.h-100')) || null;
  }

  function removeCard() {
    const card = document.getElementById('haosJigsawGameCard');
    if (card) card.remove();
  }

  function openJigsawGame() {
    window.location.href = '/jigsaw/';
  }

  function installCard() {
    if (!featureEnabled() || !hasAdminAccess()) {
      removeCard();
      return;
    }
    if (document.getElementById('haosJigsawGameCard')) return;
    const row = findHubRow();
    if (!row) return;
    injectStyle();
    const card = document.createElement('div');
    card.id = 'haosJigsawGameCard';
    card.className = 'col-md-4';
    card.dataset.moduleId = MODULE_ID;
    card.innerHTML = `
      <div class="card h-100 it-service-card">
        <div class="card-body p-4 d-flex flex-column">
          <div class="haos-jigsaw-icon mb-3" aria-hidden="true">🧩</div>
          <h6 class="fw-bold">เกม Jigsaw ทายภาพ</h6>
          <p class="text-muted small flex-grow-1">กิจกรรม Back to School • 7 รอบ • กระดาน 5×5</p>
          <button type="button" class="btn btn-primary btn-sm fw-bold" onclick="window.HAOSJigsawModule.open()">
            <i class="bi bi-box-arrow-up-right"></i> เปิดเกม
          </button>
        </div>
      </div>
    `;
    row.appendChild(card);
    try {
      if (typeof window.applyITHubLayoutV759 === 'function') window.applyITHubLayoutV759();
      if (typeof window.applyITHubLayoutV746 === 'function') window.applyITHubLayoutV746();
    } catch (err) {}
  }

  function boot() {
    installCard();
    setTimeout(installCard, 700);
  }

  const previousInit = window.initItServicesHub;
  if (typeof previousInit === 'function' && !previousInit.__haosJigsawWrapped) {
    const wrapped = function () {
      const result = previousInit.apply(this, arguments);
      setTimeout(installCard, 250);
      return result;
    };
    wrapped.__haosJigsawWrapped = true;
    window.initItServicesHub = wrapped;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.HAOSJigsawModule = {
    version: PATCH,
    featureFlag: FLAG,
    enabled: featureEnabled,
    render: installCard,
    open: openJigsawGame
  };
})();
