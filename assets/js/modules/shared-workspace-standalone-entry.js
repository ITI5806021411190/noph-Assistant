// v70.110: Shared Workspace standalone entry.
// The actual workspace UI lives in /workspace.html to avoid legacy modal/table collisions.
(function () {
  const PATCH = "v70.110-workspace-standalone-entry";
  if (window.__HAOS_WORKSPACE_STANDALONE_ENTRY__) return;
  window.__HAOS_WORKSPACE_STANDALONE_ENTRY__ = true;

  function currentUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser() || {};
    } catch (e) {}
    try {
      if (window.user) return window.user || {};
    } catch (e) {}
    try {
      if (window.currentUser) return window.currentUser || {};
    } catch (e) {}
    return {};
  }

  function cleanPhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function buildWorkspaceUrl(options) {
    options = options || {};
    const user = currentUser();
    const params = new URLSearchParams();
    params.set("v", "70110");
    if (options.action) params.set("action", options.action);
    if (options.id) params.set("id", options.id);
    const phone = cleanPhone(user.phone || user.userPhone || user.mobile || user.tel || "");
    if (phone) params.set("phone", phone);
    const name = user.fullName || user.name || user.displayName || "";
    const role = user.role || user.profileRole || "";
    const department = user.department || user.departmentName || user.group || "";
    if (name) params.set("name", name);
    if (role) params.set("role", role);
    if (department) params.set("department", department);
    if (user.email) params.set("email", user.email);
    return "/workspace.html?" + params.toString();
  }

  function openStandalone(options) {
    const url = buildWorkspaceUrl(options);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) window.location.href = url;
    return false;
  }

  function openCreate() {
    return openStandalone({ action: "create" });
  }

  function openList() {
    return openStandalone({});
  }

  function openWorkspace(id) {
    return openStandalone({ action: "open", id: id || "" });
  }

  function openConfig(id) {
    return openStandalone({ action: "config", id: id || "" });
  }

  function installLauncherCard() {
    const tbody = document.getElementById("workspaceTableBody");
    if (!tbody) return;
    const card = tbody.closest(".card");
    if (!card || card.dataset.haosWorkspaceStandalone === "1") return;
    card.dataset.haosWorkspaceStandalone = "1";

    const headerActions = card.querySelector(".card-header .d-flex.gap-2");
    if (headerActions) {
      headerActions.innerHTML = [
        '<button class="btn btn-sm btn-success fw-bold" type="button" data-haos-workspace-create><i class="bi bi-plus-circle"></i> สร้างพื้นที่</button>',
        '<button class="btn btn-sm btn-outline-success fw-bold" type="button" data-haos-workspace-open><i class="bi bi-box-arrow-up-right"></i> เปิดหน้าพื้นที่</button>'
      ].join("");
    }

    const body = card.querySelector(".card-body");
    if (body) {
      body.className = "card-body";
      body.innerHTML = [
        '<div class="p-3 p-md-4 rounded-4 border border-success border-opacity-25 bg-success bg-opacity-10">',
          '<div class="d-flex flex-wrap justify-content-between align-items-center gap-3">',
            '<div>',
              '<div class="fw-bold text-success mb-1"><i class="bi bi-window-stack"></i> เปิดพื้นที่ทำงานร่วมกันในหน้าเฉพาะ</div>',
              '<div class="small text-muted">ลดปัญหา popup ซ้อนและแก้ไขผิดรายการ โดยแยกการจัดการพื้นที่ออกจากหน้าหลัก</div>',
            '</div>',
            '<div class="d-flex flex-wrap gap-2">',
              '<button class="btn btn-success btn-sm fw-bold" type="button" data-haos-workspace-create><i class="bi bi-plus-circle"></i> สร้างพื้นที่</button>',
              '<button class="btn btn-outline-success btn-sm fw-bold" type="button" data-haos-workspace-open><i class="bi bi-box-arrow-up-right"></i> เปิดหน้าพื้นที่</button>',
            '</div>',
          '</div>',
        '</div>'
      ].join("");
    }
  }

  function interceptClicks() {
    document.addEventListener("click", function (event) {
      const createBtn = event.target.closest?.("[data-haos-workspace-create],[onclick*='openWorkspaceCreateModal']");
      const openBtn = event.target.closest?.("[data-haos-workspace-open],[onclick*='loadSharedWorkspaces']");
      const editBtn = event.target.closest?.("[onclick*='openWorkspaceEditor']");
      const configBtn = event.target.closest?.("[onclick*='openWorkspaceConfigEditorV737']");
      if (!createBtn && !openBtn && !editBtn && !configBtn) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (configBtn) {
        const id = String(configBtn.getAttribute("onclick") || "").match(/openWorkspaceConfigEditorV737\(['"]([^'"]+)['"]\)/)?.[1] || "";
        openConfig(id);
      } else if (editBtn) {
        const id = String(editBtn.getAttribute("onclick") || "").match(/openWorkspaceEditor\(['"]([^'"]+)['"]\)/)?.[1] || "";
        openWorkspace(id);
      } else if (createBtn) {
        openCreate();
      } else {
        openList();
      }
    }, true);
  }

  function overrideLegacyGlobals() {
    window.openWorkspaceCreateModal = openCreate;
    window.openWorkspaceEditor = openWorkspace;
    window.openWorkspaceConfigEditorV737 = openConfig;
    window.copyWorkspaceLink = function (id) {
      return openWorkspace(id);
    };
    window.copyCurrentWorkspaceLink = function () {
      return openList();
    };
    window.loadSharedWorkspaces = function () {
      installLauncherCard();
      return false;
    };
    window.HAOSWorkspaceStandaloneEntry = {
      version: PATCH,
      open: openStandalone,
      openCreate,
      openList,
      openWorkspace,
      openConfig
    };
  }

  function boot() {
    overrideLegacyGlobals();
    installLauncherCard();
  }

  interceptClicks();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
  setTimeout(boot, 700);
  setTimeout(boot, 1800);
  setInterval(installLauncherCard, 5000);
  console.info("HAOS " + PATCH + " loaded");
})();
