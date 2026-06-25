(function () {
  const PATCH = "v70.108-help-live-standalone-page";
  if (window.__HAOS_HELP_LIVE_CHAT_MODULE__) return;
  window.__HAOS_HELP_LIVE_CHAT_MODULE__ = true;

  const OVERLAY_ID = "haosHelpLiveChatOverlay";
  const TOOL_CARD_ID = "haosHelpLiveChatToolCard";
  const CRITICAL_STYLE_ID = "haosHelpLiveChatCriticalStylesV107";
  const LEGACY_SETTING_TITLE = "ตั้งค่าผู้ติดต่อ Help Center / Live Chat";
  let activeTab = "settings";
  let settingsRows = [];
  let settingsLoaded = false;
  let inboxLoaded = false;
  let currentSessionId = "";
  let inboxTimer = null;
  let closingLegacy = false;
  let legacyClickInterceptInstalled = false;
  let legacySwalObserverInstalled = false;

  const $ = (id) => document.getElementById(id);
  const qa = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
  const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  function currentUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser() || {};
    } catch (e) {}
    try {
      if (window.user) return window.user || {};
    } catch (e) {}
    return {};
  }

  function actor() {
    const user = currentUser();
    return {
      phone: user.phone || user.userPhone || user.mobile || user.tel || "",
      name: user.fullName || user.name || user.displayName || "",
      fullName: user.fullName || user.name || user.displayName || "",
      role: user.role || "User",
      department: user.department || user.group || ""
    };
  }

  function standaloneUrl(tab) {
    const user = currentUser();
    const a = actor();
    const params = new URLSearchParams();
    params.set("mode", tab === "inbox" ? "inbox" : "settings");
    params.set("v", "70108");
    if (a.phone) params.set("phone", a.phone);
    if (a.name || a.fullName) params.set("name", a.name || a.fullName);
    if (a.role) params.set("role", a.role);
    if (a.department) params.set("department", a.department);
    if (user.email) params.set("email", user.email);
    return "/help-live.html?" + params.toString();
  }

  function openStandalone(tab) {
    const url = standaloneUrl(tab);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) window.location.href = url;
    return false;
  }

  function gasRun(fn, args) {
    if (typeof window.gasRunPromise_ === "function") {
      return window.gasRunPromise_(fn, args || []);
    }
    return new Promise((resolve, reject) => {
      try {
        if (!window.google || !google.script || !google.script.run) {
          reject(new Error("ไม่พบ Google Apps Script bridge"));
          return;
        }
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)[fn]
          .apply(google.script.run, args || []);
      } catch (err) {
        reject(err);
      }
    });
  }

  function dateTimeText(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    try {
      if (window.HAOSDateDisplay && typeof window.HAOSDateDisplay.dateTime === "function") {
        return window.HAOSDateDisplay.dateTime(date, { forceTime: true });
      }
    } catch (e) {}
    return date.toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function ensureCriticalStyles() {
    if ($(CRITICAL_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = CRITICAL_STYLE_ID;
    style.textContent = [
      "#haosHelpLiveChatOverlay #haosHelpLiveSettingsList .haos-help-live-row{display:block!important;min-width:0!important;overflow:visible!important;margin:0 0 12px!important;padding:14px 16px!important;border:1px solid rgba(148,163,184,.22)!important;border-left:7px solid #0ea5e9!important;border-radius:18px!important;background:linear-gradient(135deg,#fff,#f8fbff)!important;box-shadow:0 14px 34px rgba(15,23,42,.07)!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-contact-top{display:flex!important;flex-wrap:wrap!important;gap:8px!important;justify-content:space-between!important;align-items:center!important;margin-bottom:12px!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-check{display:inline-flex!important;gap:8px!important;align-items:center!important;margin:0!important;border:1px solid rgba(37,99,235,.18)!important;border-radius:999px!important;background:#eff6ff!important;color:#1d4ed8!important;padding:7px 10px!important;font-weight:950!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-check.chat{border-color:rgba(16,185,129,.22)!important;background:#ecfdf5!important;color:#047857!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-contact-main{display:grid!important;grid-template-columns:minmax(220px,.85fr) minmax(0,1.8fr)!important;gap:14px!important;align-items:stretch!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-contact-grid{display:grid!important;grid-template-columns:repeat(4,minmax(130px,1fr))!important;gap:10px!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-contact-grid>div{min-width:0!important;border:1px solid rgba(148,163,184,.18)!important;border-radius:14px!important;background:#fff!important;padding:10px 12px!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-contact-grid small{display:block!important;margin-bottom:4px!important;color:#64748b!important;font-size:.78rem!important;font-weight:900!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-contact-grid b{display:block!important;color:#0f172a!important;font-weight:900!important;line-height:1.35!important;overflow-wrap:anywhere!important;}",
      "#haosHelpLiveChatOverlay .haos-help-live-person{display:flex!important;flex-direction:column!important;gap:4px!important;align-items:flex-start!important;}",
      "@media(max-width:980px){#haosHelpLiveChatOverlay .haos-help-live-contact-main,#haosHelpLiveChatOverlay .haos-help-live-contact-grid{grid-template-columns:1fr!important;}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function stabilizeSettingsLayout() {
    const list = $("haosHelpLiveSettingsList");
    if (!list) return;
    ensureCriticalStyles();
    qa(".haos-help-live-head", list).forEach((el) => el.remove());
    qa(".haos-help-live-row", list).forEach((row) => {
      row.style.setProperty("display", "block", "important");
      row.style.setProperty("min-width", "0", "important");
      row.style.setProperty("overflow", "visible", "important");
      row.style.setProperty("padding", "14px 16px", "important");
      row.style.setProperty("margin-bottom", "12px", "important");
      const top = row.querySelector(".haos-help-live-contact-top");
      if (top) {
        top.style.setProperty("display", "flex", "important");
        top.style.setProperty("flex-wrap", "wrap", "important");
        top.style.setProperty("gap", "8px", "important");
        top.style.setProperty("justify-content", "space-between", "important");
      }
      const main = row.querySelector(".haos-help-live-contact-main");
      if (main) {
        main.style.setProperty("display", "grid", "important");
        main.style.setProperty("grid-template-columns", "minmax(220px,.85fr) minmax(0,1.8fr)", "important");
        main.style.setProperty("gap", "14px", "important");
      }
      const grid = row.querySelector(".haos-help-live-contact-grid");
      if (grid) {
        grid.style.setProperty("display", "grid", "important");
        grid.style.setProperty("grid-template-columns", "repeat(4,minmax(130px,1fr))", "important");
        grid.style.setProperty("gap", "10px", "important");
      }
    });
  }

  function closeLegacySwalIfNeeded() {
    const title = document.querySelector(".swal2-title");
    if (!title || !clean(title.textContent).includes(LEGACY_SETTING_TITLE)) return false;
    if (closingLegacy) return true;
    closingLegacy = true;
    try {
      if (window.Swal) window.Swal.close();
    } catch (e) {}
    setTimeout(() => {
      closingLegacy = false;
      openSettings();
    }, 30);
    return true;
  }

  function ensureOverlay() {
    ensureCriticalStyles();
    let overlay = $(OVERLAY_ID);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "haos-help-live-overlay";
    overlay.innerHTML = [
      '<div class="haos-help-live-shell" role="dialog" aria-modal="true" aria-label="Help Center Live Chat">',
        '<div class="haos-help-live-header">',
          '<div>',
            '<h3><i class="bi bi-headset me-2"></i>Help Center / Live Chat</h3>',
            '<p>จัดการผู้ติดต่อกลางและกล่องแชทช่วยเหลือในหน้าต่างเฉพาะ ไม่ใช้ popup ตารางเดิม</p>',
          '</div>',
          '<button type="button" class="haos-help-live-close" data-haos-help-close aria-label="Close"><i class="bi bi-x-lg"></i></button>',
        '</div>',
        '<div class="haos-help-live-tabs">',
          '<button type="button" class="haos-help-live-tab" data-haos-help-tab="settings"><i class="bi bi-person-lines-fill me-1"></i> ตั้งค่าผู้ติดต่อ</button>',
          '<button type="button" class="haos-help-live-tab" data-haos-help-tab="inbox"><i class="bi bi-chat-dots me-1"></i> กล่องแชทช่วยเหลือ</button>',
        '</div>',
        '<div class="haos-help-live-body">',
          '<section class="haos-help-live-panel" data-haos-help-panel="settings">',
            '<div class="haos-help-live-notice" id="haosHelpLiveSettingsNotice"><i class="bi bi-info-circle me-1"></i> กำลังโหลดสถานะผู้ติดต่อ...</div>',
            '<div class="haos-help-live-toolbar">',
              '<input id="haosHelpLiveSearch" class="form-control" placeholder="ค้นหาชื่อ เบอร์ บทบาท กลุ่มงาน หรืออีเมล...">',
              '<button type="button" class="btn btn-outline-info fw-bold" data-haos-help-recommended><i class="bi bi-stars"></i> เลือกกลุ่มแนะนำ</button>',
              '<button type="button" class="btn btn-primary fw-bold" data-haos-help-save><i class="bi bi-save"></i> บันทึกผู้ติดต่อ</button>',
            '</div>',
            '<div id="haosHelpLiveStatus" class="haos-help-live-status"></div>',
            '<div class="haos-help-live-list" id="haosHelpLiveSettingsList">',
              '<div class="text-center text-muted py-5 fw-bold">กำลังโหลดรายชื่อ...</div>',
            '</div>',
          '</section>',
          '<section class="haos-help-live-panel" data-haos-help-panel="inbox">',
            '<div class="haos-help-live-chat-layout">',
              '<div class="haos-help-live-chat-list">',
                '<div class="p-3 border-bottom d-flex justify-content-between align-items-center gap-2">',
                  '<b><i class="bi bi-inboxes me-1"></i> ห้องแชท</b>',
                  '<button type="button" class="btn btn-sm btn-outline-primary fw-bold" data-haos-help-refresh><i class="bi bi-arrow-clockwise"></i></button>',
                '</div>',
                '<div id="haosHelpLiveSessions" class="p-3 text-muted fw-bold">กำลังโหลด...</div>',
              '</div>',
              '<div class="haos-help-live-chat-main">',
                '<div id="haosHelpLiveChatHeader" class="haos-help-live-chat-header text-muted">เลือกห้องแชทเพื่อดูรายละเอียด</div>',
                '<div id="haosHelpLiveMessages" class="haos-help-live-messages"></div>',
                '<div class="haos-help-live-compose">',
                  '<textarea id="haosHelpLiveReply" class="form-control" rows="3" placeholder="ตอบกลับผู้ใช้งาน..."></textarea>',
                  '<div class="d-flex justify-content-between flex-wrap gap-2 mt-2">',
                    '<button type="button" class="btn btn-outline-danger fw-bold" data-haos-help-close-session><i class="bi bi-check2-circle"></i> ปิดงานแชท</button>',
                    '<button type="button" class="btn btn-primary fw-bold" data-haos-help-send><i class="bi bi-send"></i> ส่งตอบกลับ</button>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',
          '</section>',
        '</div>',
      '</div>'
    ].join("");
    document.body.appendChild(overlay);
    stabilizeSettingsLayout();

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-haos-help-close]")) close();
      const tab = event.target.closest("[data-haos-help-tab]");
      if (tab) showTab(tab.dataset.haosHelpTab);
      if (event.target.closest("[data-haos-help-recommended]")) selectRecommended();
      if (event.target.closest("[data-haos-help-save]")) saveSettings();
      if (event.target.closest("[data-haos-help-refresh]")) loadInbox(true);
      if (event.target.closest("[data-haos-help-send]")) sendReply();
      if (event.target.closest("[data-haos-help-close-session]")) closeSession();
      const session = event.target.closest("[data-haos-session-id]");
      if (session) selectSession(session.dataset.haosSessionId);
    });

    overlay.addEventListener("input", (event) => {
      if (event.target && event.target.id === "haosHelpLiveSearch") filterSettings();
    });
    return overlay;
  }

  function showTab(tab) {
    activeTab = tab === "inbox" ? "inbox" : "settings";
    const overlay = ensureOverlay();
    qa("[data-haos-help-tab]", overlay).forEach((el) => {
      el.classList.toggle("active", el.dataset.haosHelpTab === activeTab);
    });
    qa("[data-haos-help-panel]", overlay).forEach((el) => {
      el.classList.toggle("active", el.dataset.haosHelpPanel === activeTab);
    });
    if (activeTab === "settings" && !settingsLoaded) loadSettings();
    if (activeTab === "inbox" && !inboxLoaded) loadInbox(true);
    if (activeTab === "inbox" && !inboxTimer) {
      inboxTimer = setInterval(() => loadInbox(false), 7000);
    }
    if (activeTab !== "inbox" && inboxTimer) {
      clearInterval(inboxTimer);
      inboxTimer = null;
    }
  }

  function open(tab = "settings") {
    return openStandalone(tab);
  }

  function openSettings() {
    return openStandalone("settings");
  }

  function openInbox() {
    return openStandalone("inbox");
  }

  function close() {
    const overlay = $(OVERLAY_ID);
    if (overlay) overlay.classList.remove("show");
    document.body.classList.remove("haos-help-live-open");
    if (inboxTimer) {
      clearInterval(inboxTimer);
      inboxTimer = null;
    }
  }

  function normalizeUser(user, index) {
    return {
      fullName: clean(user.fullName || user.name || user.contactName || "-"),
      phone: clean(user.phone || user.userPhone || ""),
      role: clean(user.role || "-"),
      department: clean(user.department || "-"),
      email: clean(user.email || "-"),
      selected: !!user.selected,
      chatEnabled: user.chatEnabled !== false,
      sortOrder: Number(user.sortOrder || index + 1)
    };
  }

  function rowHtml(user, index) {
    const row = normalizeUser(user, index);
    const search = [row.fullName, row.phone, row.role, row.department, row.email].join(" ").toLowerCase();
    return [
      '<div class="haos-help-live-row" data-phone="', esc(row.phone), '" data-role="', esc(row.role), '" data-dept="', esc(row.department), '" data-search="', esc(search), '">',
        '<div class="haos-help-live-contact-top">',
          '<label class="haos-help-live-check"><input class="form-check-input" type="checkbox" data-support-select ', row.selected ? "checked" : "", "> <span>แสดงใน Help</span></label>",
          '<label class="haos-help-live-check chat"><input class="form-check-input" type="checkbox" data-support-chat ', row.chatEnabled ? "checked" : "", "> <span>Live Chat</span></label>",
        "</div>",
        '<div class="haos-help-live-contact-main">',
          '<div class="haos-help-live-person"><b>', esc(row.fullName), '</b><small><i class="bi bi-telephone me-1"></i>', esc(row.phone || "-"), "</small></div>",
          '<div class="haos-help-live-contact-grid">',
            '<div><small>บทบาท</small><b>', esc(row.role || "-"), "</b></div>",
            '<div><small>กลุ่มงาน</small><b>', esc(row.department || "-"), "</b></div>",
            '<div><small>Email</small><b>', esc(row.email || "-"), "</b></div>",
            '<div><small>ลำดับ</small><input class="form-control form-control-sm" type="number" min="1" data-support-sort value="', esc(row.sortOrder), '"></div>',
          "</div>",
        "</div>",
      "</div>"
    ].join("");
  }

  function settingRowElements() {
    return qa("#haosHelpLiveSettingsList .haos-help-live-row");
  }

  async function loadSettings(force = false) {
    if (settingsLoaded && !force) return;
    const list = $("haosHelpLiveSettingsList");
    const notice = $("haosHelpLiveSettingsNotice");
    const status = $("haosHelpLiveStatus");
    if (status) status.innerHTML = "";
    if (list) {
      list.innerHTML = '<div class="text-center text-muted py-5 fw-bold">กำลังโหลดรายชื่อ...</div>';
    }
    try {
      const user = currentUser();
      const res = await gasRun("getHelpSupportContactSettingsV713", [user.phone || user.userPhone || ""]);
      if (!res || !res.success) throw new Error((res && res.message) || "โหลดข้อมูลไม่สำเร็จ");
      settingsRows = res.users || [];
      if (notice) {
        notice.innerHTML = '<i class="bi bi-info-circle me-1"></i> ' + (res.hasCustomSettings
          ? "ระบบใช้รายชื่อผู้ติดต่อที่ Super Admin กำหนดแล้ว"
          : "ยังไม่เคยกำหนดรายชื่อ ระบบจะแนะนำ Admin / Super Admin / กลุ่มงานสุขภาพดิจิทัลเป็นค่าเริ่มต้น");
      }
      if (list) {
        list.innerHTML = settingsRows.length
          ? settingsRows.map(rowHtml).join("")
          : '<div class="text-center text-muted py-5 fw-bold">ไม่พบรายชื่อผู้ใช้งานสำหรับตั้งค่าผู้ติดต่อ</div>';
      }
      settingsLoaded = true;
      stabilizeSettingsLayout();
      filterSettings();
      [100, 500, 1200].forEach((delay) => setTimeout(stabilizeSettingsLayout, delay));
    } catch (err) {
      if (list) list.innerHTML = '<div class="alert alert-danger m-3 fw-bold">' + esc(err.message || String(err)) + "</div>";
    }
  }

  function filterSettings() {
    const query = clean($("haosHelpLiveSearch") && $("haosHelpLiveSearch").value).toLowerCase();
    settingRowElements().forEach((row) => {
      row.hidden = !!(query && !String(row.dataset.search || "").includes(query));
    });
    stabilizeSettingsLayout();
  }

  function selectRecommended() {
    settingRowElements().forEach((row) => {
      const hay = (String(row.dataset.role || "") + " " + String(row.dataset.dept || "")).toLowerCase();
      const pick = hay.includes("super") || hay.includes("admin") || hay.includes("สุขภาพดิจิทัล") || hay.includes("digital");
      const selected = row.querySelector("[data-support-select]");
      const chat = row.querySelector("[data-support-chat]");
      if (selected) selected.checked = pick;
      if (chat) chat.checked = pick;
    });
  }

  async function saveSettings() {
    const status = $("haosHelpLiveStatus");
    const rows = settingRowElements();
    const contacts = rows
      .filter((row) => row.querySelector("[data-support-select]")?.checked)
      .map((row, index) => ({
        phone: row.dataset.phone || "",
        chatEnabled: row.querySelector("[data-support-chat]")?.checked !== false,
        sortOrder: Number(row.querySelector("[data-support-sort]")?.value || index + 1)
      }));
    if (status) status.innerHTML = '<span class="text-primary"><span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...</span>';
    try {
      const user = currentUser();
      const res = await gasRun("saveHelpSupportContactSettingsV713", [user.phone || user.userPhone || "", contacts]);
      if (!res || !res.success) throw new Error((res && res.message) || "บันทึกไม่สำเร็จ");
      if (status) status.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> บันทึกแล้ว ' + contacts.length + " รายชื่อ</span>";
      settingsLoaded = false;
      await loadSettings(true);
    } catch (err) {
      if (status) status.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> ' + esc(err.message || String(err)) + "</span>";
    }
  }

  function sessionHtml(session) {
    const active = session.id === currentSessionId ? " active" : "";
    return [
      '<button type="button" class="haos-help-live-session', active, '" data-haos-session-id="', esc(session.id || ""), '">',
        '<b>', esc(session.userName || session.userPhone || "-"), "</b>",
        '<small>', esc(session.department || "-"), "</small>",
        '<small>', esc(session.status || "Open"), " · ", esc(dateTimeText(session.lastMessageAt || session.createdAt)), "</small>",
      "</button>"
    ].join("");
  }

  async function loadInbox(force = false) {
    const list = $("haosHelpLiveSessions");
    if (!list) return;
    if (!inboxLoaded || force) list.innerHTML = '<div class="p-3 text-muted fw-bold">กำลังโหลด...</div>';
    try {
      const res = await gasRun("getHelpChatInboxV713", [actor().phone || ""]);
      if (!res || !res.success) throw new Error((res && res.message) || "โหลดกล่องแชทไม่สำเร็จ");
      const sessions = res.sessions || [];
      if (!currentSessionId && sessions[0]) currentSessionId = sessions[0].id || "";
      list.innerHTML = sessions.length
        ? sessions.map(sessionHtml).join("")
        : '<div class="text-center text-muted p-4 fw-bold">ยังไม่มีห้องแชท</div>';
      inboxLoaded = true;
      if (currentSessionId) selectSession(currentSessionId, true);
    } catch (err) {
      list.innerHTML = '<div class="alert alert-danger small m-2">' + esc(err.message || String(err)) + "</div>";
    }
  }

  async function selectSession(id, quiet = false) {
    currentSessionId = id || "";
    qa(".haos-help-live-session").forEach((el) => {
      el.classList.toggle("active", el.dataset.haosSessionId === currentSessionId);
    });
    const box = $("haosHelpLiveMessages");
    const header = $("haosHelpLiveChatHeader");
    if (!box || !currentSessionId) return;
    if (!quiet) box.innerHTML = '<div class="text-center text-muted py-4 fw-bold">กำลังโหลดข้อความ...</div>';
    try {
      const res = await gasRun("getHelpChatMessagesV713", [currentSessionId, actor()]);
      if (!res || !res.success) throw new Error((res && res.message) || "โหลดข้อความไม่สำเร็จ");
      if (header) {
        header.innerHTML = '<i class="bi bi-chat-dots text-primary me-1"></i>' +
          esc(res.session?.userName || res.session?.userPhone || "-") +
          ' <span class="badge bg-info text-dark ms-2">' + esc(res.session?.status || "Open") + "</span>";
      }
      box.innerHTML = (res.messages || []).length
        ? (res.messages || []).map((msg) => '<div class="haos-help-live-bubble ' + (msg.isAdmin ? "admin" : "user") + '"><div class="meta">' + esc(msg.senderName || "-") + " · " + esc(dateTimeText(msg.timestamp)) + "</div>" + esc(msg.message || "") + "</div>").join("")
        : '<div class="text-center text-muted py-5 fw-bold">ยังไม่มีข้อความในห้องนี้</div>';
      box.scrollTop = box.scrollHeight;
    } catch (err) {
      box.innerHTML = '<div class="alert alert-danger small">' + esc(err.message || String(err)) + "</div>";
    }
  }

  async function sendReply() {
    const input = $("haosHelpLiveReply");
    const message = clean(input && input.value);
    if (!currentSessionId || !message) return;
    input.disabled = true;
    try {
      const res = await gasRun("sendHelpChatMessageV713", [currentSessionId, actor(), message]);
      if (!res || !res.success) throw new Error((res && res.message) || "ส่งข้อความไม่สำเร็จ");
      input.value = "";
      await selectSession(currentSessionId, true);
      await loadInbox(false);
    } catch (err) {
      showError("ส่งข้อความไม่สำเร็จ", err);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  async function closeSession() {
    if (!currentSessionId) return;
    try {
      const res = await gasRun("closeHelpChatSessionV713", [currentSessionId, actor().phone || ""]);
      if (!res || !res.success) throw new Error((res && res.message) || "ปิดห้องแชทไม่สำเร็จ");
      currentSessionId = "";
      await loadInbox(true);
    } catch (err) {
      showError("ปิดห้องแชทไม่สำเร็จ", err);
    }
  }

  function showError(title, err) {
    if (window.Swal) {
      Swal.fire(title, err.message || String(err), "error");
    } else {
      alert(title + "\n" + (err.message || String(err)));
    }
  }

  function removeLegacySurfaces() {
    qa("#helpSupportAdminCardV713,#haosAdvancedHelpLiveChatCardV102,#haosAdvancedHelpLiveChatCardV103,#haosAdvancedHelpLiveChatCardV104").forEach((el) => el.remove());
  }

  function toolCardHtml() {
    return [
      '<div class="haos-v750-tool-card haos-help-live-tool-card" id="', TOOL_CARD_ID, '">',
        '<h6><i class="bi bi-headset text-primary"></i> Help Center / Live Chat</h6>',
        '<p>กำหนดผู้ติดต่อกลาง ปุ่ม Help และเปิดกล่องแชทช่วยเหลือในโมดูลเฉพาะ</p>',
        '<div class="d-flex flex-wrap gap-2">',
          '<button type="button" class="btn btn-outline-primary btn-sm fw-bold" data-haos-help-open-settings><i class="bi bi-person-lines-fill"></i> ตั้งค่าผู้ติดต่อ</button>',
          '<button type="button" class="btn btn-primary btn-sm fw-bold" data-haos-help-open-inbox><i class="bi bi-chat-dots"></i> กล่องแชท</button>',
        '</div>',
      '</div>'
    ].join("");
  }

  function installAdvancedToolCard() {
    removeLegacySurfaces();
    qa(".haos-v750-tools-grid").forEach((grid) => {
      if (!grid.querySelector("#" + TOOL_CARD_ID)) {
        grid.insertAdjacentHTML("beforeend", toolCardHtml());
      }
    });
  }

  function interceptLegacyClicks() {
    if (legacyClickInterceptInstalled) return;
    legacyClickInterceptInstalled = true;
    document.addEventListener("click", (event) => {
      const settingButton = event.target.closest?.("[data-haos-help-open-settings],[onclick*='openHelpSupportSettingsV713']");
      const inboxButton = event.target.closest?.("[data-haos-help-open-inbox],[onclick*='openHelpChatInboxV713']");
      if (!settingButton && !inboxButton) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (settingButton) openSettings();
      else openInbox();
    }, true);
  }

  function installWorkspaceEditGuard() {
    const base = window.openWorkspaceConfigEditorV737;
    if (typeof base !== "function" || base.__haosHelpLiveWorkspaceGuard) return;
    const wrapped = function (id) {
      try {
        const modal = $("workspaceTableModal");
        if (modal && window.bootstrap) {
          const inst = bootstrap.Modal.getInstance(modal) || bootstrap.Modal.getOrCreateInstance(modal);
          inst.hide();
        }
        qa(".modal-backdrop").forEach((el) => el.remove());
        document.body.classList.remove("modal-open");
      } catch (e) {}
      return base.apply(this, arguments);
    };
    wrapped.__haosHelpLiveWorkspaceGuard = true;
    window.openWorkspaceConfigEditorV737 = wrapped;
  }

  function overrideLegacyGlobals() {
    window.openHelpSupportSettingsV713 = openSettings;
    window.openHelpChatInboxV713 = openInbox;
    window.loadHelpChatInboxV713 = () => loadInbox(true);
    window.selectHelpChatSessionV713 = selectSession;
    window.sendHelpChatAdminReplyV713 = sendReply;
    window.closeHelpChatSessionV713Ui = closeSession;
  }

  function observeLegacySwal() {
    if (legacySwalObserverInstalled) return;
    legacySwalObserverInstalled = true;
    const observer = new MutationObserver(() => closeLegacySwalIfNeeded());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    ensureCriticalStyles();
    overrideLegacyGlobals();
    interceptLegacyClicks();
    installAdvancedToolCard();
    installWorkspaceEditGuard();
    observeLegacySwal();
    stabilizeSettingsLayout();
    setInterval(() => {
      overrideLegacyGlobals();
      installAdvancedToolCard();
      removeLegacySurfaces();
      closeLegacySwalIfNeeded();
      if ($(OVERLAY_ID)?.classList.contains("show")) stabilizeSettingsLayout();
    }, 1200);
  }

  window.HAOSHelpLiveChat = {
    version: PATCH,
    open,
    openSettings,
    openInbox,
    close,
    loadSettings: () => loadSettings(true),
    saveSettings,
    selectRecommended,
    filterSettings,
    loadInbox: () => loadInbox(true),
    selectSession,
    sendReply,
    closeSession
  };

  const oldOpenV66 = window.openV66ControlCenter;
  if (typeof oldOpenV66 === "function" && !oldOpenV66.__haosHelpLiveWrapped) {
    const wrapped = function () {
      const result = oldOpenV66.apply(this, arguments);
      [80, 300, 800].forEach((delay) => setTimeout(installAdvancedToolCard, delay));
      return result;
    };
    wrapped.__haosHelpLiveWrapped = true;
    window.openV66ControlCenter = wrapped;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
  setTimeout(boot, 600);
  setTimeout(boot, 1800);
  console.info("HAOS " + PATCH + " loaded");
})();
