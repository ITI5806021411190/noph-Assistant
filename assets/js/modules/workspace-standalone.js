(function () {
  const VERSION = "v70.110-workspace-standalone";
  const $ = (id) => document.getElementById(id);
  const q = (sel, root) => (root || document).querySelector(sel);
  const qa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const core = () => window.HAOSWorkspaceCore || {};

  const params = new URLSearchParams(location.search);
  const state = {
    actor: {
      phone: cleanPhone(params.get("phone") || ""),
      name: params.get("name") || "",
      role: params.get("role") || "User",
      department: params.get("department") || "",
      email: params.get("email") || ""
    },
    workspaces: [],
    current: null,
    currentToken: "",
    editingId: "",
    fields: [],
    busy: false
  };

  function cleanPhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  function text(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    if (typeof value === "object") return value.url || value.text || JSON.stringify(value);
    return String(value);
  }

  function compact(value, limit) {
    const clean = String(value || "").replace(/\s+/g, " ").trim();
    return clean.length > limit ? clean.slice(0, Math.max(0, limit - 1)) + "..." : clean;
  }

  function notify(message, type) {
    const el = $("toast");
    if (!el) {
      alert(message);
      return;
    }
    el.textContent = message;
    el.className = "toast show " + (type === "err" ? "err" : type === "ok" ? "ok" : "");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { el.className = "toast"; }, 3200);
  }

  function setStatus(message, type) {
    const el = $("statusText");
    if (!el) return;
    el.textContent = message || "";
    el.className = "status " + (type === "err" ? "err" : type === "ok" ? "ok" : "");
  }

  async function gas(fn, args) {
    const response = await fetch("/api/gas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fn, args: Array.isArray(args) ? args : [] })
    });
    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (err) {
      throw new Error(raw || err.message || "API response is not JSON");
    }
    if (!response.ok || data.__bridgeError) {
      throw new Error(data.message || data.error || "API error");
    }
    return data;
  }

  function currentUserLabel() {
    const parts = [
      state.actor.name || "ผู้ใช้งาน",
      state.actor.department || "",
      state.actor.role || ""
    ].filter(Boolean);
    return parts.join(" • ");
  }

  function requireActorPhone() {
    if (state.actor.phone) return true;
    const phone = cleanPhone(prompt("กรุณากรอกเบอร์โทรผู้ใช้งานเพื่อโหลดพื้นที่ทำงานร่วมกัน") || "");
    if (!phone) {
      notify("ยังไม่ได้ระบุเบอร์โทร จึงโหลดรายการไม่ได้", "err");
      return false;
    }
    state.actor.phone = phone;
    const next = new URL(location.href);
    next.searchParams.set("phone", phone);
    history.replaceState(null, "", next.toString());
    updateActorLabel();
    return true;
  }

  function updateActorLabel() {
    const el = $("actorLabel");
    if (!el) return;
    el.textContent = state.actor.phone
      ? currentUserLabel() + " • " + state.actor.phone
      : "ยังไม่ได้ระบุเบอร์ผู้ใช้งาน";
  }

  function workspaceTypeLabel(type) {
    return ({
      table: "ตารางเบา",
      form: "แบบฟอร์มออนไลน์",
      quiz: "แบบทดสอบ",
      checklist: "Checklist",
      google_sheet: "Google Sheet",
      google_form: "Google Form"
    })[type || "table"] || type || "ตารางเบา";
  }

  function scopeLabel(scope) {
    return scope === "department" ? "กลุ่มงาน" : "ส่วนตัว";
  }

  function tokenFromUrl(url) {
    try {
      return new URL(url || "", location.origin).searchParams.get("token") || "";
    } catch (e) {
      return "";
    }
  }

  function workspaceIdFromUrl(url) {
    try {
      return new URL(url || "", location.origin).searchParams.get("workspaceId") || "";
    } catch (e) {
      return "";
    }
  }

  function workspacePublicUrl(ws) {
    if (!ws) return "";
    if (ws.url) return ws.url;
    if (ws.id && ws.token) return "/api/share?workspaceId=" + encodeURIComponent(ws.id) + "&token=" + encodeURIComponent(ws.token);
    return "";
  }

  function isGoogleWorkspace(ws) {
    return ws && (ws.workspaceType === "google_sheet" || ws.workspaceType === "google_form");
  }

  function defaultFields(type) {
    if (type === "form") {
      return [
        { label: "ชื่อ-นามสกุล", type: "text", options: "", required: true },
        { label: "หน่วยงานของท่าน", type: "text", options: "", required: true },
        { label: "เบอร์โทร", type: "text", options: "", required: false },
        { label: "หมายเหตุ", type: "textarea", options: "", required: false }
      ];
    }
    if (type === "quiz") {
      return [
        { label: "ชื่อ-นามสกุล", type: "text", options: "", required: true },
        { label: "คำถามที่ 1", type: "radio", options: "ก, ข, ค, ง", required: true }
      ];
    }
    if (type === "checklist") {
      return [
        { label: "ลำดับ", type: "text", options: "", required: false },
        { label: "รายการ", type: "text", options: "", required: true },
        { label: "ผู้รับผิดชอบ", type: "text", options: "", required: false },
        { label: "สถานะ", type: "dropdown", options: "ยังไม่เริ่ม, กำลังทำ, เสร็จแล้ว", required: false },
        { label: "หมายเหตุ", type: "textarea", options: "", required: false }
      ];
    }
    return [
      { label: "ลำดับ", type: "text", options: "", required: false },
      { label: "หัวข้อ", type: "text", options: "", required: true },
      { label: "รายละเอียด", type: "textarea", options: "", required: false },
      { label: "ผู้รับผิดชอบ", type: "text", options: "", required: false },
      { label: "สถานะ", type: "dropdown", options: "ยังไม่เริ่ม, กำลังทำ, เสร็จแล้ว", required: false }
    ];
  }

  function splitOptions(value) {
    const helper = core().splitOptions;
    if (typeof helper === "function") return helper(value);
    return String(value || "").split(/[,|]/).map((x) => x.trim()).filter(Boolean);
  }

  function fieldToSpec(field) {
    const helper = core().specFromField;
    if (typeof helper === "function") {
      try { return helper(field); } catch (e) {}
    }
    let spec = String(field.label || "ช่องข้อมูล").trim();
    const opts = splitOptions(field.options).join(", ");
    if (field.type === "dropdown") spec += " [dropdown: " + (opts || "ตัวเลือก 1, ตัวเลือก 2") + "]";
    else if (field.type === "radio") spec += " [radio: " + (opts || "ตัวเลือก 1, ตัวเลือก 2") + "]";
    else if (field.type === "checkbox") spec += " [checkbox: " + (opts || "ตัวเลือก 1, ตัวเลือก 2") + "]";
    else if (field.type === "textarea") spec += " [textarea]";
    else if (field.type === "image") spec += " [image]";
    if (field.required) spec += " [required]";
    return spec;
  }

  function fieldsFromColumns(columns) {
    const helper = core().parseSpec;
    return (Array.isArray(columns) ? columns : []).map((spec, index) => {
      if (typeof helper === "function") {
        try {
          const parsed = helper(spec);
          return {
            label: parsed.label || spec || ("ช่องข้อมูล " + (index + 1)),
            type: parsed.type || "text",
            options: splitOptions(parsed.options).join(", "),
            required: !!parsed.required
          };
        } catch (e) {}
      }
      return { label: String(spec || ("ช่องข้อมูล " + (index + 1))).replace(/\[[^\]]+\]/g, "").trim(), type: "text", options: "", required: false };
    });
  }

  function filterWorkspaces() {
    const search = ($("searchInput")?.value || "").trim().toLowerCase();
    const scope = $("scopeFilter")?.value || "";
    const type = $("typeFilter")?.value || "";
    return state.workspaces.filter((ws) => {
      if (scope && ws.scope !== scope) return false;
      if (type && ws.workspaceType !== type) return false;
      if (!search) return true;
      return [ws.title, ws.description, ws.ownerName, ws.department, ws.workspaceType, ws.scope]
        .join(" ").toLowerCase().includes(search);
    });
  }

  function renderList() {
    const list = $("workspaceList");
    const count = $("listCount");
    if (!list) return;
    const items = filterWorkspaces();
    if (count) count.textContent = items.length + " รายการ";
    if (!items.length) {
      list.innerHTML = '<div class="empty">ยังไม่มีพื้นที่ทำงานร่วมกันตามตัวกรองนี้</div>';
      return;
    }
    list.innerHTML = items.map((ws) => {
      const expired = ws.expired ? " expired" : "";
      const active = state.current && state.current.id === ws.id ? " active" : "";
      const externalUrl = ws.googleSheetUrl || ws.googleFormUrl || ws.responseSheetUrl || "";
      return [
        '<article class="workspace-card', active, expired, '" data-ws-id="', esc(ws.id), '">',
          '<h4>', esc(ws.title || "พื้นที่ทำงานร่วมกัน"), '</h4>',
          '<p>', esc(compact(ws.description || "ไม่มีคำอธิบาย", 130)), '</p>',
          '<div class="chips" style="margin-bottom:12px">',
            '<span class="badge ', ws.scope === "department" ? "green" : "", '">', esc(scopeLabel(ws.scope)), '</span>',
            '<span class="badge">', esc(workspaceTypeLabel(ws.workspaceType)), '</span>',
            ws.canManage ? '<span class="badge green">แก้ไขได้</span>' : '<span class="badge gray">ดูได้</span>',
            ws.expired ? '<span class="badge red">หมดอายุ</span>' : '',
          '</div>',
          '<p style="font-size:.92rem">เจ้าของ: ', esc(ws.ownerName || "-"), ' • ', esc(ws.department || "-"), '<br>อัปเดต: ', esc(ws.updatedAt || "-"), '</p>',
          '<div class="button-row">',
            isGoogleWorkspace(ws)
              ? '<button class="btn primary" type="button" data-open-external="' + esc(externalUrl || ws.url || "") + '">เปิดไฟล์</button>'
              : '<button class="btn primary" type="button" data-open-workspace="' + esc(ws.id) + '">ดูคำตอบ</button>',
            '<button class="btn outline" type="button" data-copy-workspace="' + esc(ws.id) + '">คัดลอกลิงก์</button>',
            ws.canManage && !isGoogleWorkspace(ws) ? '<button class="btn outline" type="button" data-config-workspace="' + esc(ws.id) + '">แก้ไขพื้นที่</button>' : '',
            ws.canManage ? '<button class="btn danger" type="button" data-delete-workspace="' + esc(ws.id) + '">ลบ</button>' : '',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  async function loadWorkspaces(openId) {
    if (!requireActorPhone()) return;
    setStatus("กำลังโหลดพื้นที่ทำงานร่วมกัน...");
    $("workspaceList").innerHTML = '<div class="empty"><span class="loading"></span> กำลังโหลด...</div>';
    try {
      const res = await gas("getMySharedWorkspaces", [state.actor.phone]);
      if (!res.success) throw new Error(res.message || "โหลดรายการไม่สำเร็จ");
      state.workspaces = Array.isArray(res.data) ? res.data : [];
      setStatus("โหลดพื้นที่ทำงานแล้ว " + state.workspaces.length + " รายการ", "ok");
      renderList();
      const targetId = openId || params.get("id") || params.get("workspaceId");
      const action = params.get("action") || "";
      if (targetId && state.workspaces.some((ws) => ws.id === targetId)) {
        if (action === "config") openConfig(targetId);
        else openWorkspace(targetId);
      } else if (action === "create") {
        openCreate();
      }
    } catch (err) {
      setStatus(err.message || "โหลดรายการไม่สำเร็จ", "err");
      $("workspaceList").innerHTML = '<div class="empty">โหลดรายการไม่สำเร็จ</div>';
    }
  }

  function renderDetailEmpty() {
    $("detailActions").innerHTML = "";
    $("detailBody").innerHTML = '<div class="empty">เลือกพื้นที่จากรายการด้านซ้ายเพื่อดูข้อมูล แก้ไข หรือจัดการคำตอบ</div>';
  }

  async function openWorkspace(id) {
    const ws = state.workspaces.find((item) => item.id === id);
    if (!ws) return notify("ไม่พบพื้นที่ที่เลือก", "err");
    if (isGoogleWorkspace(ws)) {
      window.open(ws.googleFormUrl || ws.googleSheetUrl || ws.url, "_blank", "noopener");
      return;
    }
    const token = tokenFromUrl(ws.url);
    if (!token) return notify("ไม่พบ token ของลิงก์สาธารณะ", "err");
    setStatus("กำลังเปิดพื้นที่ " + (ws.title || id) + "...");
    $("detailBody").innerHTML = '<div class="empty"><span class="loading"></span> กำลังโหลดคำตอบ...</div>';
    try {
      const res = await gas("getPublicWorkspace", [id, token]);
      if (!res.success) throw new Error(res.message || "เปิดพื้นที่ไม่สำเร็จ");
      state.current = Object.assign({}, ws, res.data || {});
      state.currentToken = token;
      setStatus("เปิดพื้นที่แล้ว", "ok");
      renderList();
      renderDetail();
    } catch (err) {
      setStatus(err.message || "เปิดพื้นที่ไม่สำเร็จ", "err");
      $("detailBody").innerHTML = '<div class="empty">เปิดพื้นที่ไม่สำเร็จ</div>';
    }
  }

  function renderDetail() {
    const ws = state.current;
    if (!ws) return renderDetailEmpty();
    const canEditRows = !!ws.canManage && !["form", "quiz"].includes(ws.workspaceType);
    $("detailActions").innerHTML = [
      '<button class="btn outline" type="button" data-copy-current>คัดลอกลิงก์</button>',
      ws.canManage ? '<button class="btn outline" type="button" data-config-workspace="' + esc(ws.id) + '">แก้ไขพื้นที่</button>' : '',
      canEditRows ? '<button class="btn outline" type="button" data-add-row>เพิ่มแถว</button>' : '',
      canEditRows ? '<button class="btn success" type="button" data-save-rows>บันทึกแถว</button>' : '',
      '<button class="btn" type="button" data-close-detail>ปิด</button>'
    ].join("");

    const columns = Array.isArray(ws.columns) ? ws.columns : [];
    const rows = Array.isArray(ws.rows) ? ws.rows : [];
    $("detailBody").innerHTML = [
      '<section class="detail-summary">',
        '<h4>', esc(ws.title || "พื้นที่ทำงานร่วมกัน"), '</h4>',
        '<p>', esc(ws.description || "ไม่มีคำอธิบาย"), '</p>',
        '<div class="chips" style="margin-top:12px">',
          '<span class="badge ', ws.scope === "department" ? "green" : "", '">', esc(scopeLabel(ws.scope)), '</span>',
          '<span class="badge">', esc(workspaceTypeLabel(ws.workspaceType)), '</span>',
          '<span class="badge gray">', rows.length, ' คำตอบ/แถว</span>',
          ws.expiresAt ? '<span class="badge amber">หมดอายุ ' + esc(ws.expiresAt) + '</span>' : '',
        '</div>',
      '</section>',
      renderRowsTable(columns, rows, canEditRows)
    ].join("");
  }

  function renderRowsTable(columns, rows, editable) {
    if (!columns.length) return '<div class="empty">พื้นที่นี้ยังไม่มีช่องข้อมูล</div>';
    const header = columns.map((col) => '<th>' + esc(displayColumnLabel(col)) + '</th>').join("");
    const body = (rows.length ? rows : [[]]).map((row, rIndex) => {
      const cells = columns.map((col, cIndex) => {
        const value = Array.isArray(row) ? row[cIndex] : "";
        return '<td>' + renderCellInput(value, cIndex, rIndex, editable, col) + '</td>';
      }).join("");
      return '<tr data-row-index="' + rIndex + '">' + cells + '</tr>';
    }).join("");
    return '<div class="table-wrap"><table><thead><tr>' + header + '</tr></thead><tbody id="rowsEditorBody">' + body + '</tbody></table></div>';
  }

  function displayColumnLabel(spec) {
    const parsed = fieldsFromColumns([spec])[0] || {};
    return parsed.label || spec || "ช่องข้อมูล";
  }

  function renderCellInput(value, cIndex, rIndex, editable, spec) {
    const field = fieldsFromColumns([spec])[0] || { type: "text", options: "" };
    if (!editable) {
      const url = typeof value === "string" && /^https?:\/\//i.test(value);
      return url ? '<a href="' + esc(value) + '" target="_blank" rel="noopener">' + esc(compact(value, 80)) + '</a>' : esc(text(value) || "-");
    }
    const common = 'class="cell-input" data-cell="' + cIndex + '" data-row="' + rIndex + '"';
    if (field.type === "textarea") {
      return '<textarea ' + common + ' rows="2">' + esc(text(value)) + '</textarea>';
    }
    if (field.type === "dropdown" || field.type === "radio") {
      const opts = splitOptions(field.options);
      return '<select ' + common + '><option value=""></option>' + opts.map((opt) => '<option value="' + esc(opt) + '"' + (String(value) === opt ? " selected" : "") + '>' + esc(opt) + '</option>').join("") + '</select>';
    }
    if (field.type === "checkbox") {
      const opts = splitOptions(field.options);
      if (opts.length) {
        const selected = splitOptions(value);
        return '<div class="chips">' + opts.map((opt) => {
          const checked = selected.includes(opt) ? " checked" : "";
          return '<label class="badge green"><input type="checkbox" data-checkbox-cell="' + cIndex + '" data-row="' + rIndex + '" value="' + esc(opt) + '"' + checked + '> ' + esc(opt) + '</label>';
        }).join("") + "</div>";
      }
      return '<label class="badge green"><input type="checkbox" ' + common + (String(value).toLowerCase() === "true" || value === true ? " checked" : "") + '> เลือกแล้ว</label>';
    }
    if (field.type === "image") {
      const current = text(value);
      return [
        current ? '<a href="' + esc(current) + '" target="_blank" rel="noopener">เปิดไฟล์</a>' : '<span class="text-muted">ยังไม่มีไฟล์</span>',
        '<input class="cell-input" type="file" accept="image/*" data-upload-cell="' + cIndex + '" data-row="' + rIndex + '">',
        '<input type="hidden" data-cell="' + cIndex + '" data-row="' + rIndex + '" value="' + esc(current) + '">'
      ].join("");
    }
    return '<input ' + common + ' type="text" value="' + esc(text(value)) + '">';
  }

  function collectRows() {
    const columns = Array.isArray(state.current?.columns) ? state.current.columns : [];
    const rows = [];
    qa("#rowsEditorBody tr").forEach((tr) => {
      const row = new Array(columns.length).fill("");
      qa("[data-cell]", tr).forEach((el) => {
        const index = Number(el.getAttribute("data-cell"));
        if (el.type === "checkbox") row[index] = el.checked ? "TRUE" : "";
        else row[index] = el.value || "";
      });
      const grouped = {};
      qa("[data-checkbox-cell]", tr).forEach((el) => {
        const index = Number(el.getAttribute("data-checkbox-cell"));
        grouped[index] = grouped[index] || [];
        if (el.checked) grouped[index].push(el.value);
      });
      Object.keys(grouped).forEach((index) => { row[Number(index)] = grouped[index].join(", "); });
      rows.push(row);
    });
    return rows;
  }

  function addRow() {
    if (!state.current) return;
    const rows = collectRows();
    rows.push(new Array((state.current.columns || []).length).fill(""));
    state.current.rows = rows;
    renderDetail();
  }

  async function saveRows() {
    if (!state.current) return;
    if (!state.current.canManage) return notify("คุณไม่มีสิทธิ์บันทึกพื้นที่นี้", "err");
    setStatus("กำลังบันทึกแถว...");
    try {
      const rows = collectRows();
      const res = await gas("updateSharedWorkspaceRows", [state.current.id, rows, state.actor.phone]);
      if (!res.success) throw new Error(res.message || "บันทึกไม่สำเร็จ");
      state.current.rows = rows;
      notify("บันทึกแถวแล้ว", "ok");
      setStatus("บันทึกแถวแล้ว", "ok");
      await loadWorkspaces(state.current.id);
    } catch (err) {
      notify(err.message || "บันทึกไม่สำเร็จ", "err");
      setStatus(err.message || "บันทึกไม่สำเร็จ", "err");
    }
  }

  async function handleUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const hidden = input.parentElement.querySelector("input[type='hidden'][data-cell]");
    if (!hidden) return;
    setStatus("กำลังอัปโหลดไฟล์...");
    const base64 = await readAsBase64(file);
    try {
      const res = await gas("uploadFileToDrive", [base64, file.name, file.type || "application/octet-stream"]);
      if (!res.success) throw new Error(res.message || "อัปโหลดไม่สำเร็จ");
      hidden.value = res.url || res.fileUrl || "";
      notify("อัปโหลดไฟล์แล้ว", "ok");
      setStatus("อัปโหลดไฟล์แล้ว อย่าลืมกดบันทึกแถว", "ok");
    } catch (err) {
      notify(err.message || "อัปโหลดไม่สำเร็จ", "err");
      setStatus(err.message || "อัปโหลดไม่สำเร็จ", "err");
    }
  }

  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(reader.error || new Error("อ่านไฟล์ไม่สำเร็จ"));
      reader.readAsDataURL(file);
    });
  }

  function openCreate() {
    state.editingId = "";
    $("workspaceModalTitle").textContent = "สร้างพื้นที่ทำงานร่วมกัน";
    $("workspaceModalSubtitle").textContent = "ตั้งค่าพื้นที่และออกแบบช่องข้อมูลในหน้าต่างเฉพาะ";
    $("wsTitle").value = "";
    $("wsDescription").value = "";
    $("wsType").value = "table";
    $("wsScope").value = "personal";
    $("wsAccessMode").value = "view";
    $("wsRequireLogin").value = "false";
    $("wsExpiresAt").value = "";
    state.fields = defaultFields("table");
    renderFields();
    showModal(true);
  }

  function openConfig(id) {
    const ws = state.workspaces.find((item) => item.id === id) || state.current;
    if (!ws || ws.id !== id) return notify("ไม่พบพื้นที่ที่ต้องการแก้ไข", "err");
    if (!ws.canManage) return notify("คุณไม่มีสิทธิ์แก้ไขพื้นที่นี้", "err");
    if (isGoogleWorkspace(ws)) return notify("พื้นที่ Google จริงให้แก้ไขในไฟล์ Google โดยตรง", "err");
    state.editingId = id;
    $("workspaceModalTitle").textContent = "แก้ไขพื้นที่ทำงานร่วมกัน";
    $("workspaceModalSubtitle").textContent = "แก้ชื่อ คำอธิบาย สิทธิ์ วันหมดอายุ และช่องข้อมูล";
    $("wsTitle").value = ws.title || "";
    $("wsDescription").value = ws.description || "";
    $("wsType").value = ws.workspaceType || "table";
    $("wsScope").value = ws.scope || "personal";
    $("wsAccessMode").value = ws.accessMode || "view";
    $("wsRequireLogin").value = String(!!ws.requireLoginToEdit);
    $("wsExpiresAt").value = normalizeDateForInput(ws.expiresAt || "");
    const source = state.current && state.current.id === id && Array.isArray(state.current.columns)
      ? state.current.columns
      : [];
    state.fields = source.length ? fieldsFromColumns(source) : defaultFields(ws.workspaceType || "table");
    if (!source.length) {
      openWorkspace(id).then(() => {
        if (state.current && state.current.id === id) {
          state.fields = fieldsFromColumns(state.current.columns || []);
          renderFields();
        }
      }).catch(() => {});
    }
    renderFields();
    showModal(true);
  }

  function normalizeDateForInput(value) {
    const textValue = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) return textValue;
    const m = textValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      let year = Number(m[3]);
      if (year > 2400) year -= 543;
      return String(year).padStart(4, "0") + "-" + String(m[2]).padStart(2, "0") + "-" + String(m[1]).padStart(2, "0");
    }
    return "";
  }

  function showModal(show) {
    $("workspaceModal")?.classList.toggle("show", !!show);
  }

  function renderFields() {
    const list = $("fieldBuilderList");
    if (!list) return;
    if (!state.fields.length) state.fields = defaultFields($("wsType")?.value || "table");
    list.innerHTML = state.fields.map((field, index) => [
      '<div class="field-builder" data-field-index="', index, '">',
        '<div><label>ชื่อช่อง ', index + 1, '</label><input class="field" data-field-label value="', esc(field.label || ""), '"></div>',
        '<div><label>ชนิดข้อมูล</label><select class="select" data-field-type>',
          optionHtml("text", "ข้อความ", field.type),
          optionHtml("textarea", "ข้อความยาว", field.type),
          optionHtml("dropdown", "รายการเลือก (Dropdown)", field.type),
          optionHtml("radio", "ตัวเลือกเดียว (Radio)", field.type),
          optionHtml("checkbox", "เลือกได้หลายข้อ (Checkbox)", field.type),
          optionHtml("image", "รูปภาพ/ไฟล์ภาพ", field.type),
        '</select></div>',
        '<div><label>ตัวเลือก</label><input class="field" data-field-options value="', esc(field.options || ""), '" placeholder="คั่นด้วย , เช่น ก, ข, ค"></div>',
        '<label class="badge amber" style="align-self:center"><input type="checkbox" data-field-required', field.required ? " checked" : "", '> จำเป็น</label>',
        '<button class="btn danger" type="button" data-remove-field="', index, '">ลบ</button>',
      '</div>'
    ].join("")).join("");
  }

  function optionHtml(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (value === selected ? " selected" : "") + '>' + esc(label) + '</option>';
  }

  function syncFieldsFromDom() {
    state.fields = qa(".field-builder").map((row) => ({
      label: q("[data-field-label]", row)?.value.trim() || "",
      type: q("[data-field-type]", row)?.value || "text",
      options: q("[data-field-options]", row)?.value || "",
      required: !!q("[data-field-required]", row)?.checked
    })).filter((field) => field.label);
  }

  function createPayload() {
    syncFieldsFromDom();
    const type = $("wsType").value || "table";
    const fields = state.fields.length ? state.fields : defaultFields(type);
    const columns = fields.map(fieldToSpec);
    let rows = [];
    if (type === "table") rows = [new Array(columns.length).fill("")];
    if (type === "checklist") rows = [["1", "เตรียมข้อมูล", state.actor.name || "", "ยังไม่เริ่ม", ""]];
    return {
      title: $("wsTitle").value.trim(),
      description: $("wsDescription").value.trim(),
      workspaceType: type,
      scope: $("wsScope").value || "personal",
      accessMode: $("wsAccessMode").value || "view",
      requireLoginToEdit: $("wsRequireLogin").value === "true",
      expiresAt: $("wsExpiresAt").value || "",
      columns,
      rows,
      fieldConfig: fields.map((field, index) => ({
        index,
        label: field.label,
        type: field.type,
        options: splitOptions(field.options),
        required: !!field.required,
        sectionId: "s1"
      }))
    };
  }

  function validatePayload(payload) {
    if (!payload.title) return "กรุณาระบุชื่อพื้นที่";
    if (!payload.columns.length) return "กรุณาเพิ่มช่องข้อมูลอย่างน้อย 1 ช่อง";
    return "";
  }

  function previewPayload() {
    const payload = createPayload();
    const message = [
      "ชื่อพื้นที่: " + (payload.title || "-"),
      "ชนิด: " + workspaceTypeLabel(payload.workspaceType),
      "ขอบเขต: " + scopeLabel(payload.scope),
      "ช่องข้อมูล: " + payload.columns.map(displayColumnLabel).join(", ")
    ].join("\n");
    alert(message);
  }

  async function saveWorkspace() {
    if (!requireActorPhone()) return;
    const payload = createPayload();
    const invalid = validatePayload(payload);
    if (invalid) return notify(invalid, "err");
    $("saveWorkspaceBtn").disabled = true;
    setStatus(state.editingId ? "กำลังบันทึกการแก้ไข..." : "กำลังสร้างพื้นที่...");
    try {
      let res;
      if (state.editingId) {
        res = await gas("updateSharedWorkspaceConfigV737", [state.editingId, state.actor.phone, payload]);
      } else if (payload.workspaceType === "google_sheet") {
        res = await gas("createGoogleSheetWorkspace", [payload, state.actor.phone]);
      } else if (payload.workspaceType === "google_form") {
        res = await gas("createGoogleFormWorkspace", [payload, state.actor.phone]);
      } else {
        res = await gas("createSharedWorkspace", [payload, state.actor.phone]);
      }
      if (!res.success) throw new Error(res.message || "บันทึกไม่สำเร็จ");
      showModal(false);
      notify(state.editingId ? "บันทึกการแก้ไขแล้ว" : "สร้างพื้นที่แล้ว", "ok");
      setStatus("บันทึกสำเร็จ", "ok");
      await loadWorkspaces(res.id || state.editingId);
    } catch (err) {
      notify(err.message || "บันทึกไม่สำเร็จ", "err");
      setStatus(err.message || "บันทึกไม่สำเร็จ", "err");
    } finally {
      $("saveWorkspaceBtn").disabled = false;
    }
  }

  async function deleteWorkspace(id) {
    const ws = state.workspaces.find((item) => item.id === id);
    if (!ws) return;
    if (!confirm("ต้องการลบ/ปิดพื้นที่ \"" + (ws.title || id) + "\" ใช่ไหม?")) return;
    setStatus("กำลังลบพื้นที่...");
    try {
      const res = await gas("deleteSharedWorkspace", [id, state.actor.phone]);
      if (!res.success) throw new Error(res.message || "ลบไม่สำเร็จ");
      if (state.current && state.current.id === id) {
        state.current = null;
        renderDetailEmpty();
      }
      notify("ลบพื้นที่แล้ว", "ok");
      await loadWorkspaces();
    } catch (err) {
      notify(err.message || "ลบไม่สำเร็จ", "err");
      setStatus(err.message || "ลบไม่สำเร็จ", "err");
    }
  }

  async function copyWorkspace(id) {
    const ws = state.workspaces.find((item) => item.id === id) || state.current;
    const url = workspacePublicUrl(ws);
    if (!url) return notify("ไม่พบลิงก์สำหรับคัดลอก", "err");
    try {
      await navigator.clipboard.writeText(new URL(url, location.origin).href);
      notify("คัดลอกลิงก์แล้ว", "ok");
    } catch (e) {
      prompt("คัดลอกลิงก์นี้", new URL(url, location.origin).href);
    }
  }

  function bindEvents() {
    $("createWorkspaceBtn")?.addEventListener("click", openCreate);
    $("createWorkspaceTopBtn")?.addEventListener("click", openCreate);
    $("reloadBtn")?.addEventListener("click", () => loadWorkspaces());
    $("clearFilterBtn")?.addEventListener("click", () => {
      $("searchInput").value = "";
      $("scopeFilter").value = "";
      $("typeFilter").value = "";
      renderList();
    });
    ["searchInput", "scopeFilter", "typeFilter"].forEach((id) => {
      $(id)?.addEventListener(id === "searchInput" ? "input" : "change", renderList);
    });
    $("wsType")?.addEventListener("change", () => {
      if (!state.editingId) {
        state.fields = defaultFields($("wsType").value);
        renderFields();
      }
    });
    $("addFieldBtn")?.addEventListener("click", () => {
      syncFieldsFromDom();
      state.fields.push({ label: "ช่องข้อมูล " + (state.fields.length + 1), type: "text", options: "", required: false });
      renderFields();
    });
    $("previewWorkspaceBtn")?.addEventListener("click", previewPayload);
    $("saveWorkspaceBtn")?.addEventListener("click", saveWorkspace);
    document.addEventListener("click", (event) => {
      const close = event.target.closest("[data-close-modal]");
      if (close) showModal(false);
      const open = event.target.closest("[data-open-workspace]");
      if (open) openWorkspace(open.getAttribute("data-open-workspace"));
      const external = event.target.closest("[data-open-external]");
      if (external) window.open(external.getAttribute("data-open-external"), "_blank", "noopener");
      const copy = event.target.closest("[data-copy-workspace]");
      if (copy) copyWorkspace(copy.getAttribute("data-copy-workspace"));
      const copyCurrent = event.target.closest("[data-copy-current]");
      if (copyCurrent && state.current) copyWorkspace(state.current.id);
      const config = event.target.closest("[data-config-workspace]");
      if (config) openConfig(config.getAttribute("data-config-workspace"));
      const del = event.target.closest("[data-delete-workspace]");
      if (del) deleteWorkspace(del.getAttribute("data-delete-workspace"));
      const remove = event.target.closest("[data-remove-field]");
      if (remove) {
        syncFieldsFromDom();
        state.fields.splice(Number(remove.getAttribute("data-remove-field")), 1);
        renderFields();
      }
      if (event.target.closest("[data-add-row]")) addRow();
      if (event.target.closest("[data-save-rows]")) saveRows();
      if (event.target.closest("[data-close-detail]")) {
        state.current = null;
        renderList();
        renderDetailEmpty();
      }
    });
    document.addEventListener("change", (event) => {
      const upload = event.target.closest("[data-upload-cell]");
      if (upload) handleUpload(upload);
    });
  }

  function boot() {
    updateActorLabel();
    bindEvents();
    loadWorkspaces();
    console.info("HAOS " + VERSION + " loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
