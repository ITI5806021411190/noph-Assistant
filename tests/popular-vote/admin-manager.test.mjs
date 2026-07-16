import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePollId,
  isValidPollId,
  nextCandidateNumber,
  buildCandidateId,
  candidateStoragePath,
  validateCandidateDrafts
} from "../../popular-vote/assets/js/admin-manager-utils.js";

test("normalizes and validates poll ids", () => {
  assert.equal(normalizePollId(" Staff Choice 2569 "), "staff-choice-2569");
  assert.equal(isValidPollId("staff-choice-2569"), true);
  assert.equal(isValidPollId("หมวดใหม่"), false);
  assert.equal(isValidPollId("-bad-id"), false);
});

test("chooses the first available candidate number and a stable unique id", () => {
  const candidates = [{ number: 1 }, { number: 3 }];
  assert.equal(nextCandidateNumber(candidates), 2);
  assert.equal(buildCandidateId("staff-choice", 2, []), "staff-choice-02");
  assert.equal(buildCandidateId("staff-choice", 2, ["staff-choice-02"]), "staff-choice-02-2");
});

test("builds a storage path scoped to event, poll, and candidate", () => {
  assert.equal(
    candidateStoragePath("event/1", "staff choice", "candidate#2", 1234),
    "popular-vote/event-1/staff-choice/candidate-2/candidate-1234.jpg"
  );
});

test("validates candidate drafts and pads display numbers", () => {
  const rows = validateCandidateDrafts([
    { candidateId: "a", number: 1, title: "Alice", subtitle: "Team A", active: true, sortOrder: 1 },
    { candidateId: "b", number: 2, title: "Bob", subtitle: "Team B", active: false, sortOrder: 2 }
  ]);
  assert.equal(rows[0].displayNumber, "01");
  assert.equal(rows[1].active, false);
});

test("rejects duplicate numbers, blank names, and all-inactive ballots", () => {
  assert.throws(() => validateCandidateDrafts([
    { candidateId: "a", number: 1, title: "Alice", active: true },
    { candidateId: "b", number: 1, title: "Bob", active: true }
  ]), /หมายเลข 1 ซ้ำ/);
  assert.throws(() => validateCandidateDrafts([
    { candidateId: "a", number: 1, title: "", active: true }
  ]), /กรุณากรอกชื่อ/);
  assert.throws(() => validateCandidateDrafts([
    { candidateId: "a", number: 1, title: "Alice", active: false }
  ]), /อย่างน้อย 1 คน/);
});
