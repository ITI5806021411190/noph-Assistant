// v70.109: Help Center / Live Chat entry only.
// The actual settings/inbox UI lives in /help-live.html to avoid legacy popup/CSS collisions.
(function () {
  const PATCH = "v70.109-help-live-legacy-cleanup";
  if (window.__HAOS_HELP_LIVE_CHAT_ENTRY__) return;
  window.__HAOS_HELP_LIVE_CHAT_ENTRY__ = true;

  const TOOL_CARD_ID = "haosHelpLiveChatToolCard";

  function currentUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser() || {};
    } catch (e) {}
    try {
      if (typeof window.currentUser === "function") return window.currentUser() || {};
    } catch (e) {}
    try {
      if (window.user) return window.user || {};
    } catch (e) {}
    return {};
  }

  function cleanPhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function helpLiveUrl(mode) {
    const user = currentUser();
    const params = new URLSearchParams();
    params.set("mode", mode === "inbox" ? "inbox" : "settings");
    params.set("v", "70109");
    const phone = cleanPhone(user.phone || user.userPhone || user.mobile || user.tel || "");
    if (phone) params.set("phone", phone);
    if (user.fullName || user.name || user.displayName) params.set("name", user.fullName || user.name || user.displayName);
    if (user.role || user.profileRole) params.set("role", user.role || user.profileRole);
    if (user.department || user.departmentName || user.group) params.set("department", user.department || user.departmentName || user.group);
    if (user.email) params.set("email", user.email);
    return "/help-live.html?" + params.toString();
  }

  function openStandalone(mode) {
    const url = helpLiveUrl(mode);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) window.location.href = url;
    return false;
  }

  function openSettings() {
    return openStandalone("settings");
  }

  function openInbox() {
    return openStandalone("inbox");
  }

  function removeLegacySurfaces() {
    [
      "helpSupportAdminCardV713",
      "haosAdvancedHelpLiveChatCardV102",
      "haosAdvancedHelpLiveChatCardV103",
      "haosAdvancedHelpLiveChatCardV104",
      "haosHelpLiveChatOverlay"
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function toolCardHtml() {
    return [
      '<div class="haos-v750-tool-card" id="', TOOL_CARD_ID, '" style="border-left:5px solid #0ea5e9">',
        '<h6><i class="bi bi-headset text-primary"></i> Help Center / Live Chat</h6>',
        '<p>จัดการผู้ติดต่อกลางและกล่องแชทช่วยเหลือในหน้าแยก ลดปัญหา popup และตารางเดิมซ้อนทับกัน</p>',
        '<div class="d-flex flex-wrap gap-2">',
          '<button type="button" class="btn btn-outline-primary btn-sm fw-bold" data-haos-help-open-settings><i class="bi bi-person-lines-fill"></i> ตั้งค่าผู้ติดต่อ</button>',
          '<button type="button" class="btn btn-primary btn-sm fw-bold" data-haos-help-open-inbox><i class="bi bi-box-arrow-up-right"></i> กล่องแชท</button>',
        '</div>',
      '</div>'
    ].join("");
  }

  function installAdvancedToolCard() {
    removeLegacySurfaces();
    Array.from(document.querySelectorAll(".haos-v750-tools-grid")).forEach((grid) => {
      if (!grid.querySelector("#" + TOOL_CARD_ID)) {
        grid.insertAdjacentHTML("beforeend", toolCardHtml());
      }
    });
  }

  function interceptLegacyClicks() {
    document.addEventListener("click", (event) => {
      const settingsButton = event.target.closest?.("[data-haos-help-open-settings],[onclick*='openHelpSupportSettingsV713']");
      const inboxButton = event.target.closest?.("[data-haos-help-open-inbox],[onclick*='openHelpChatInboxV713']");
      if (!settingsButton && !inboxButton) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (settingsButton) openSettings();
      else openInbox();
    }, true);
  }

  function overrideLegacyGlobals() {
    window.openHelpSupportSettingsV713 = openSettings;
    window.openHelpChatInboxV713 = openInbox;
    window.loadHelpChatInboxV713 = openInbox;
    window.selectHelpChatSessionV713 = openInbox;
    window.sendHelpChatAdminReplyV713 = openInbox;
    window.closeHelpChatSessionV713Ui = openInbox;
    window.HAOSHelpLiveChat = {
      version: PATCH,
      open: openStandalone,
      openSettings,
      openInbox,
      close: function () { removeLegacySurfaces(); }
    };
  }

  function wrapAdvancedToolOpener() {
    const original = window.openV66ControlCenter;
    if (typeof original !== "function" || original.__haosHelpLiveStandaloneWrapped) return;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      [80, 300, 800].forEach((delay) => setTimeout(installAdvancedToolCard, delay));
      return result;
    };
    wrapped.__haosHelpLiveStandaloneWrapped = true;
    window.openV66ControlCenter = wrapped;
  }

  function boot() {
    overrideLegacyGlobals();
    wrapAdvancedToolOpener();
    installAdvancedToolCard();
    removeLegacySurfaces();
  }

  interceptLegacyClicks();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
  setTimeout(boot, 600);
  setTimeout(boot, 1800);
  setInterval(boot, 4000);
  console.info("HAOS " + PATCH + " loaded");
})();
