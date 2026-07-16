(() => {
  "use strict";

  const DB_NAME = "haos-jigsaw-game-manager";
  const DB_VERSION = 1;
  const STORE_NAME = "config";
  const CONFIG_KEY = "active-game";
  const CONFIG_VERSION = 1;
  const MAX_IMAGE_DIMENSION = 1600;
  const IMAGE_QUALITY = 0.86;

  const ui = {
    modal: document.getElementById("gameManagerModal"),
    openSetup: document.getElementById("openGameManagerSetup"),
    openGame: document.getElementById("openGameManagerGame"),
    close: document.getElementById("closeGameManager"),
    roundCount: document.getElementById("managerRoundCount"),
    roundList: document.getElementById("managerRoundList"),
    addRound: document.getElementById("managerAddRound"),
    resetDefaults: document.getElementById("managerResetDefaults"),
    editorEmpty: document.getElementById("managerEditorEmpty"),
    editorForm: document.getElementById("managerEditorForm"),
    editorTitle: document.getElementById("managerEditorTitle"),
    object: document.getElementById("managerObject"),
    place: document.getElementById("managerPlace"),
    objectVariants: document.getElementById("managerObjectVariants"),
    placeVariants: document.getElementById("managerPlaceVariants"),
    puzzleInput: document.getElementById("managerPuzzleImage"),
    answerInput: document.getElementById("managerAnswerImage"),
    puzzlePreview: document.getElementById("managerPuzzlePreview"),
    answerPreview: document.getElementById("managerAnswerPreview"),
    usePuzzleAsAnswer: document.getElementById("managerUsePuzzleAsAnswer"),
    status: document.getElementById("managerStatus"),
    save: document.getElementById("managerSave"),
    exportButton: document.getElementById("managerExport"),
    importButton: document.getElementById("managerImportButton"),
    importFile: document.getElementById("managerImportFile"),
    startGame: document.getElementById("startGame"),
    setupRoundSummary: document.getElementById("setupRoundSummary")
  };

  if (!ui.modal || typeof ROUNDS === "undefined" || !Array.isArray(ROUNDS)) {
    return;
  }

  const defaultRoundLibrary = cloneRounds(ROUNDS);
  let roundLibrary = cloneRounds(defaultRoundLibrary);
  let gameSettings = { activeRoundCount: roundLibrary.length };
  let draftRounds = [];
  let draftActiveRoundCount = roundLibrary.length;
  let selectedRoundIndex = 0;

  function uniqueText(items) {
    const found = new Set();
    return items.map(item => String(item || "").trim()).filter(item => {
      if (!item) return false;
      const key = item.toLocaleLowerCase("th-TH");
      if (found.has(key)) return false;
      found.add(key);
      return true;
    });
  }

  function normalizeRound(round, index) {
    const object = String(round && round.object || "").trim();
    const place = String(round && round.place || "").trim();
    return {
      round: index + 1,
      puzzleImage: String(round && round.puzzleImage || ""),
      answerImage: String(round && round.answerImage || round && round.puzzleImage || ""),
      object,
      place,
      objectVariants: uniqueText([object].concat(Array.isArray(round && round.objectVariants) ? round.objectVariants : [])),
      placeVariants: uniqueText([place].concat(Array.isArray(round && round.placeVariants) ? round.placeVariants : []))
    };
  }

  function cloneRounds(rounds) {
    return (rounds || []).map((round, index) => normalizeRound(round, index));
  }

  function clampRoundCount(value, libraryLength = roundLibrary.length) {
    if (!libraryLength) return 0;
    const parsed = Number.parseInt(value, 10);
    return Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : libraryLength, libraryLength));
  }

  function escapeHtmlText(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
    })[char]);
  }

  function setStatus(message, isError = false) {
    ui.status.textContent = message || "";
    ui.status.classList.toggle("error", Boolean(isError));
  }

  function placeholderImage(roundNumber) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0755a5"/><stop offset="1" stop-color="#19bbb0"/></linearGradient></defs>
      <rect width="1200" height="750" fill="url(#g)"/><text x="600" y="330" text-anchor="middle" font-size="110">🧩</text>
      <text x="600" y="450" text-anchor="middle" fill="white" font-family="sans-serif" font-size="52" font-weight="700">เพิ่มภาพสำหรับรอบ ${roundNumber}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("เบราว์เซอร์นี้ไม่รองรับการบันทึกชุดเกม"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("เปิดพื้นที่บันทึกไม่สำเร็จ"));
    });
  }

  async function readStoredConfig() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(CONFIG_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("อ่านชุดเกมไม่สำเร็จ"));
      transaction.oncomplete = () => db.close();
    });
  }

  async function writeStoredConfig(payload) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(payload, CONFIG_KEY);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error("บันทึกชุดเกมไม่สำเร็จ")); };
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error("พื้นที่บันทึกไม่เพียงพอ")); };
    });
  }

  async function deleteStoredConfig() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(CONFIG_KEY);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error("ล้างค่าที่บันทึกไม่สำเร็จ")); };
    });
  }

  function configuredRounds() {
    const count = clampRoundCount(gameSettings.activeRoundCount);
    return cloneRounds(roundLibrary.slice(0, count));
  }

  function applyConfiguredRounds() {
    const activeRounds = configuredRounds();
    if (!activeRounds.length) return;
    ROUNDS.splice(0, ROUNDS.length, ...activeRounds);
    updateSetupLabels();
  }

  function updateSetupLabels() {
    const count = clampRoundCount(gameSettings.activeRoundCount);
    if (ui.setupRoundSummary) ui.setupRoundSummary.textContent = `${count} รอบ`;
    if (ui.startGame) ui.startGame.textContent = `เริ่มเกม ${count} รอบ 🚀`;
    const pill = document.getElementById("roundPill");
    if (pill && document.getElementById("setupScreen").classList.contains("active")) {
      pill.textContent = `รอบที่ 1/${count}`;
    }
  }

  function splitVariants(value) {
    return uniqueText(String(value || "").split(/\r?\n|,/));
  }

  function commitEditorToDraft() {
    const round = draftRounds[selectedRoundIndex];
    if (!round || ui.editorForm.hidden) return;
    round.object = ui.object.value.trim();
    round.place = ui.place.value.trim();
    round.objectVariants = uniqueText([round.object].concat(splitVariants(ui.objectVariants.value)));
    round.placeVariants = uniqueText([round.place].concat(splitVariants(ui.placeVariants.value)));
  }

  function renderRoundList() {
    ui.roundCount.max = String(Math.max(1, draftRounds.length));
    draftActiveRoundCount = clampRoundCount(draftActiveRoundCount, draftRounds.length);
    ui.roundCount.value = String(draftActiveRoundCount);
    if (!draftRounds.length) {
      ui.roundList.innerHTML = '<div class="manager-empty">ยังไม่มีรอบ</div>';
      return;
    }
    ui.roundList.innerHTML = draftRounds.map((round, index) => `
      <div class="manager-round ${index === selectedRoundIndex ? "selected" : ""}" data-index="${index}">
        <img class="manager-thumb" data-round-thumb="${index}" alt="ภาพรอบ ${index + 1}">
        <div class="manager-round-main" data-action="select" tabindex="0" role="button" aria-label="แก้ไขรอบ ${index + 1}">
          <strong>รอบ ${index + 1}: ${escapeHtmlText(round.object || "ยังไม่ระบุสิ่งของ")}</strong>
          <span>${escapeHtmlText(round.place || "ยังไม่ระบุสถานที่")}</span>
        </div>
        <div class="manager-round-actions">
          <button class="manager-mini" type="button" data-action="up" title="เลื่อนขึ้น" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="manager-mini" type="button" data-action="down" title="เลื่อนลง" ${index === draftRounds.length - 1 ? "disabled" : ""}>↓</button>
          <button class="manager-mini" type="button" data-action="duplicate" title="ทำสำเนา">⧉</button>
          <button class="manager-mini danger" type="button" data-action="delete" title="ลบรอบ">✕</button>
        </div>
      </div>`).join("");
    ui.roundList.querySelectorAll("[data-round-thumb]").forEach(image => {
      const index = Number(image.dataset.roundThumb);
      image.src = draftRounds[index]?.puzzleImage || placeholderImage(index + 1);
    });
  }

  function loadEditor(index) {
    selectedRoundIndex = Math.max(0, Math.min(index, draftRounds.length - 1));
    const round = draftRounds[selectedRoundIndex];
    ui.editorEmpty.hidden = Boolean(round);
    ui.editorForm.hidden = !round;
    if (!round) return;
    ui.editorTitle.textContent = `แก้ไขรอบ ${selectedRoundIndex + 1}`;
    ui.object.value = round.object || "";
    ui.place.value = round.place || "";
    ui.objectVariants.value = (round.objectVariants || []).join("\n");
    ui.placeVariants.value = (round.placeVariants || []).join("\n");
    ui.puzzlePreview.src = round.puzzleImage || placeholderImage(selectedRoundIndex + 1);
    ui.answerPreview.src = round.answerImage || round.puzzleImage || placeholderImage(selectedRoundIndex + 1);
    ui.puzzleInput.value = "";
    ui.answerInput.value = "";
    renderRoundList();
  }

  function openManager() {
    ui.modal.classList.add("show");
    ui.modal.setAttribute("aria-busy", "true");
    setStatus("กำลังเตรียมรายการรอบและรูปภาพ…");
    requestAnimationFrame(() => {
      if (!ui.modal.classList.contains("show")) return;
      draftRounds = cloneRounds(roundLibrary);
      draftActiveRoundCount = clampRoundCount(gameSettings.activeRoundCount, draftRounds.length);
      selectedRoundIndex = 0;
      setStatus("แก้ไขแล้วกด “บันทึกชุดเกม” เพื่อเก็บไว้ในเครื่องนี้");
      loadEditor(0);
      ui.modal.removeAttribute("aria-busy");
      ui.close.focus();
    });
  }

  function closeManager() {
    ui.modal.classList.remove("show");
    ui.modal.removeAttribute("aria-busy");
  }

  function validateDraft() {
    if (!draftRounds.length) return "ต้องมีอย่างน้อย 1 รอบ";
    for (let i = 0; i < draftRounds.length; i++) {
      const round = draftRounds[i];
      if (!round.object) return `กรุณาระบุสิ่งของในรอบ ${i + 1}`;
      if (!round.place) return `กรุณาระบุสถานที่ในรอบ ${i + 1}`;
      if (!round.puzzleImage) return `กรุณาเลือกภาพปริศนาในรอบ ${i + 1}`;
      if (!round.answerImage) return `กรุณาเลือกภาพเฉลยในรอบ ${i + 1}`;
    }
    return "";
  }

  async function saveManagerConfig() {
    commitEditorToDraft();
    const validationError = validateDraft();
    if (validationError) {
      setStatus(validationError, true);
      return;
    }
    draftActiveRoundCount = clampRoundCount(ui.roundCount.value, draftRounds.length);
    const payload = {
      version: CONFIG_VERSION,
      updatedAt: new Date().toISOString(),
      activeRoundCount: draftActiveRoundCount,
      rounds: cloneRounds(draftRounds)
    };
    ui.save.disabled = true;
    setStatus("กำลังบันทึกชุดเกมและรูปภาพ…");
    try {
      await writeStoredConfig(payload);
      roundLibrary = cloneRounds(payload.rounds);
      gameSettings.activeRoundCount = payload.activeRoundCount;
      if (document.getElementById("setupScreen").classList.contains("active")) applyConfiguredRounds();
      else updateSetupLabels();
      setStatus("บันทึกเรียบร้อย การเปลี่ยนแปลงจะใช้เมื่อเริ่มเกมใหม่");
      setTimeout(closeManager, 550);
    } catch (error) {
      setStatus(`${error.message || "บันทึกไม่สำเร็จ"} — ลองส่งออก JSON เพื่อเก็บสำรอง`, true);
    } finally {
      ui.save.disabled = false;
    }
  }

  function addRound() {
    commitEditorToDraft();
    const index = draftRounds.length;
    draftRounds.push(normalizeRound({
      object: "",
      place: "",
      objectVariants: [],
      placeVariants: [],
      puzzleImage: "",
      answerImage: ""
    }, index));
    draftActiveRoundCount = draftRounds.length;
    loadEditor(index);
    setStatus(`เพิ่มรอบ ${index + 1} แล้ว กรุณาใส่คำตอบและเลือกรูปภาพ`);
  }

  function moveRound(index, direction) {
    commitEditorToDraft();
    const target = index + direction;
    if (target < 0 || target >= draftRounds.length) return;
    [draftRounds[index], draftRounds[target]] = [draftRounds[target], draftRounds[index]];
    loadEditor(target);
  }

  function duplicateRound(index) {
    commitEditorToDraft();
    const copy = normalizeRound(draftRounds[index], index + 1);
    draftRounds.splice(index + 1, 0, copy);
    draftActiveRoundCount = Math.min(draftActiveRoundCount + 1, draftRounds.length);
    loadEditor(index + 1);
    setStatus(`ทำสำเนารอบ ${index + 1} แล้ว`);
  }

  function deleteRound(index) {
    if (draftRounds.length <= 1) {
      setStatus("ต้องเหลืออย่างน้อย 1 รอบ", true);
      return;
    }
    if (!confirm(`ลบรอบ ${index + 1} ออกจากชุดเกมหรือไม่?`)) return;
    draftRounds.splice(index, 1);
    draftRounds = cloneRounds(draftRounds);
    draftActiveRoundCount = clampRoundCount(draftActiveRoundCount, draftRounds.length);
    loadEditor(Math.min(index, draftRounds.length - 1));
    setStatus("ลบรอบแล้ว กดบันทึกเพื่อยืนยันการเปลี่ยนแปลง");
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(?:jpeg|png|webp)$/i.test(file.type)) {
        reject(new Error("รองรับเฉพาะไฟล์ JPEG, PNG และ WebP"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, width, height);
          let dataUrl = canvas.toDataURL("image/webp", IMAGE_QUALITY);
          if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
          resolve(dataUrl);
        };
        image.onerror = () => reject(new Error("ไม่สามารถอ่านรูปภาพนี้ได้"));
        image.src = String(reader.result || "");
      };
      reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
      reader.readAsDataURL(file);
    });
  }

  async function replaceRoundImage(file, field) {
    const round = draftRounds[selectedRoundIndex];
    if (!round || !file) return;
    setStatus("กำลังย่อและบีบอัดรูปภาพ…");
    try {
      const dataUrl = await readImageFile(file);
      round[field] = dataUrl;
      if (field === "puzzleImage") ui.puzzlePreview.src = dataUrl;
      else ui.answerPreview.src = dataUrl;
      renderRoundList();
      setStatus(`เปลี่ยน${field === "puzzleImage" ? "ภาพปริศนา" : "ภาพเฉลย"}รอบ ${selectedRoundIndex + 1} แล้ว`);
    } catch (error) {
      setStatus(error.message || "เปลี่ยนรูปไม่สำเร็จ", true);
    }
  }

  function exportDraft() {
    commitEditorToDraft();
    draftActiveRoundCount = clampRoundCount(ui.roundCount.value, draftRounds.length);
    const payload = {
      app: "Health Assistant OS Jigsaw",
      version: CONFIG_VERSION,
      exportedAt: new Date().toISOString(),
      activeRoundCount: draftActiveRoundCount,
      rounds: cloneRounds(draftRounds)
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `haos-jigsaw-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("ส่งออกชุดเกมแล้ว ไฟล์นี้มีรูปภาพและคำตอบครบทุกรอบ");
  }

  async function importDraft(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const rounds = Array.isArray(data) ? data : data.rounds;
      if (!Array.isArray(rounds) || !rounds.length) throw new Error("ไม่พบรายการรอบในไฟล์ JSON");
      draftRounds = cloneRounds(rounds);
      draftActiveRoundCount = clampRoundCount(data.activeRoundCount || draftRounds.length, draftRounds.length);
      selectedRoundIndex = 0;
      loadEditor(0);
      setStatus(`นำเข้า ${draftRounds.length} รอบแล้ว กดบันทึกชุดเกมเพื่อใช้งาน`);
    } catch (error) {
      setStatus(error.message || "นำเข้าไฟล์ไม่สำเร็จ", true);
    } finally {
      ui.importFile.value = "";
    }
  }

  async function resetToDefaults() {
    if (!confirm("คืนค่ารอบและรูปภาพทั้งหมดเป็นชุดเริ่มต้นหรือไม่? ค่าที่เคยบันทึกในเครื่องนี้จะถูกลบ")) return;
    try {
      await deleteStoredConfig();
      roundLibrary = cloneRounds(defaultRoundLibrary);
      gameSettings.activeRoundCount = roundLibrary.length;
      draftRounds = cloneRounds(roundLibrary);
      draftActiveRoundCount = draftRounds.length;
      if (document.getElementById("setupScreen").classList.contains("active")) applyConfiguredRounds();
      else updateSetupLabels();
      loadEditor(0);
      setStatus("คืนค่าชุดเริ่มต้นแล้ว");
    } catch (error) {
      setStatus(error.message || "คืนค่าเริ่มต้นไม่สำเร็จ", true);
    }
  }

  ui.openSetup.addEventListener("click", openManager);
  ui.openGame.addEventListener("click", openManager);
  ui.close.addEventListener("click", closeManager);
  ui.modal.addEventListener("click", event => {
    if (event.target === ui.modal) event.stopImmediatePropagation();
  }, true);
  ui.modal.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key === "Escape") closeManager();
  });

  ui.roundCount.addEventListener("change", () => {
    draftActiveRoundCount = clampRoundCount(ui.roundCount.value, draftRounds.length);
    ui.roundCount.value = String(draftActiveRoundCount);
    setStatus(`เกมใหม่จะเล่น ${draftActiveRoundCount} รอบแรกตามลำดับรายการ`);
  });

  ui.roundList.addEventListener("click", event => {
    const row = event.target.closest(".manager-round");
    if (!row) return;
    const index = Number(row.dataset.index);
    const action = event.target.closest("[data-action]")?.dataset.action || "select";
    if (action === "select") {
      commitEditorToDraft();
      loadEditor(index);
    } else if (action === "up") moveRound(index, -1);
    else if (action === "down") moveRound(index, 1);
    else if (action === "duplicate") duplicateRound(index);
    else if (action === "delete") deleteRound(index);
  });

  ui.roundList.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest('[data-action="select"]');
    if (!target) return;
    event.preventDefault();
    target.click();
  });

  [ui.object, ui.place, ui.objectVariants, ui.placeVariants].forEach(input => {
    input.addEventListener("input", () => {
      commitEditorToDraft();
      if (input === ui.object || input === ui.place) renderRoundList();
    });
  });

  ui.puzzleInput.addEventListener("change", () => replaceRoundImage(ui.puzzleInput.files[0], "puzzleImage"));
  ui.answerInput.addEventListener("change", () => replaceRoundImage(ui.answerInput.files[0], "answerImage"));
  ui.usePuzzleAsAnswer.addEventListener("click", () => {
    const round = draftRounds[selectedRoundIndex];
    if (!round) return;
    round.answerImage = round.puzzleImage;
    ui.answerPreview.src = round.answerImage;
    setStatus(`ใช้ภาพปริศนาเป็นภาพเฉลยในรอบ ${selectedRoundIndex + 1} แล้ว`);
  });
  ui.addRound.addEventListener("click", addRound);
  ui.resetDefaults.addEventListener("click", resetToDefaults);
  ui.save.addEventListener("click", saveManagerConfig);
  ui.exportButton.addEventListener("click", exportDraft);
  ui.importButton.addEventListener("click", () => ui.importFile.click());
  ui.importFile.addEventListener("change", () => importDraft(ui.importFile.files[0]));

  ui.startGame.addEventListener("click", () => applyConfiguredRounds(), true);

  async function initializeManager() {
    ui.startGame.disabled = true;
    const originalStartText = ui.startGame.textContent;
    ui.startGame.textContent = "กำลังโหลดชุดเกม…";
    try {
      const stored = await readStoredConfig();
      if (stored && Array.isArray(stored.rounds) && stored.rounds.length) {
        roundLibrary = cloneRounds(stored.rounds);
        gameSettings.activeRoundCount = clampRoundCount(stored.activeRoundCount, roundLibrary.length);
      }
    } catch (error) {
      console.warn("Jigsaw manager storage unavailable:", error.message);
    } finally {
      applyConfiguredRounds();
      ui.startGame.disabled = false;
      if (!ui.startGame.textContent || ui.startGame.textContent === "กำลังโหลดชุดเกม…") {
        ui.startGame.textContent = originalStartText;
        updateSetupLabels();
      }
    }
  }

  window.HAOS_JIGSAW_MANAGER_READY = true;
  initializeManager();
})();
