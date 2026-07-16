export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_IMAGE_BYTES = 4_500_000;

export function padCandidateNumber(value) {
  return String(Math.max(1, Number(value || 1))).padStart(2, "0");
}

export function normalizePollId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function isValidPollId(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(String(value || ""));
}

export function nextCandidateNumber(candidates = []) {
  const used = new Set(candidates.map(candidate => Number(candidate?.number || 0)).filter(Boolean));
  for (let number = 1; number <= 99; number += 1) {
    if (!used.has(number)) return number;
  }
  throw new Error("หมวดนี้มีหมายเลขผู้สมัครครบ 99 หมายเลขแล้ว");
}

export function buildCandidateId(pollId, number, existingIds = []) {
  const used = new Set(existingIds.map(String));
  const base = `${pollId}-${padCandidateNumber(number)}`;
  if (!used.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidateId = `${base}-${suffix}`;
    if (!used.has(candidateId)) return candidateId;
  }
  throw new Error("ไม่สามารถสร้างรหัสผู้สมัครใหม่ได้");
}

export function candidateStoragePath(eventId, pollId, candidateId, timestamp = Date.now()) {
  const safe = value => String(value || "").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `popular-vote/${safe(eventId)}/${safe(pollId)}/${safe(candidateId)}/candidate-${Number(timestamp)}.jpg`;
}

export function validateCandidateDrafts(drafts = []) {
  if (!Array.isArray(drafts) || !drafts.length) throw new Error("ต้องมีผู้สมัครอย่างน้อย 1 คน");
  const numbers = new Set();
  const normalized = drafts.map((draft, index) => {
    const candidateId = String(draft?.candidateId || "").trim();
    const number = Number(draft?.number);
    const title = String(draft?.title || "").trim();
    const subtitle = String(draft?.subtitle || "").trim();
    const active = draft?.active !== false;
    if (!candidateId) throw new Error(`ผู้สมัครลำดับที่ ${index + 1} ไม่มีรหัส`);
    if (!Number.isInteger(number) || number < 1 || number > 99) {
      throw new Error(`หมายเลขของผู้สมัครลำดับที่ ${index + 1} ต้องเป็น 1–99`);
    }
    if (numbers.has(number)) throw new Error(`หมายเลข ${number} ซ้ำกัน กรุณาแก้ก่อนบันทึก`);
    if (!title) throw new Error(`กรุณากรอกชื่อผู้สมัครหมายเลข ${number}`);
    if (title.length > 120) throw new Error(`ชื่อผู้สมัครหมายเลข ${number} ยาวเกิน 120 ตัวอักษร`);
    if (subtitle.length > 240) throw new Error(`คำอธิบายผู้สมัครหมายเลข ${number} ยาวเกิน 240 ตัวอักษร`);
    numbers.add(number);
    return {
      ...draft,
      candidateId,
      number,
      displayNumber: padCandidateNumber(number),
      title,
      subtitle,
      active,
      sortOrder: Number(draft?.sortOrder || index + 1)
    };
  });
  if (!normalized.some(draft => draft.active)) throw new Error("ต้องเปิดใช้งานผู้สมัครอย่างน้อย 1 คน");
  return normalized;
}
