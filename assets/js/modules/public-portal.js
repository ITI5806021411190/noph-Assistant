(function () {
  const PATCH = 'v70.75-public-main-link';
  if (window.__HAOS_V775_PUBLIC_PORTAL__) return;
  window.__HAOS_V775_PUBLIC_PORTAL__ = true;

  const LINK_ID = 'haosPublicMainLinkV775';

  function mainUrl() {
    try {
      if (location.protocol === 'file:') return 'index.html';
      return location.origin.replace(/\/+$/, '') + '/';
    } catch (_err) {
      return '/';
    }
  }

  function ensureMainLink() {
    if (!document.body) return;
    let link = document.getElementById(LINK_ID);
    if (!link) {
      link = document.createElement('a');
      link.id = LINK_ID;
      link.className = 'haos-public-main-link';
      link.innerHTML = '<i class="bi bi-house-door" aria-hidden="true"></i><span class="haos-public-main-link-label">กลับเข้าสู่ระบบหลัก</span>';
      document.body.appendChild(link);
    }
    link.href = mainUrl();
    link.setAttribute('aria-label', 'กลับเข้าสู่ระบบหลัก Health Assistant OS');
    link.setAttribute('title', 'กลับเข้าสู่ระบบหลัก');
  }

  function startObserver() {
    if (window.__HAOS_V775_PUBLIC_PORTAL_OBSERVER__) return;
    window.__HAOS_V775_PUBLIC_PORTAL_OBSERVER__ = true;
    const observer = new MutationObserver(function () {
      if (!document.getElementById(LINK_ID)) ensureMainLink();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function boot() {
    ensureMainLink();
    startObserver();
    setTimeout(ensureMainLink, 400);
    setTimeout(ensureMainLink, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.haosPublicPortalDiagnosticsV775 = function () {
    return {
      patch: PATCH,
      linkPresent: Boolean(document.getElementById(LINK_ID)),
      href: document.getElementById(LINK_ID)?.href || mainUrl()
    };
  };

  console.info('HAOS ' + PATCH + ' loaded');
})();
