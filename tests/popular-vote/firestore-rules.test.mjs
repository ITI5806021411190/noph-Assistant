import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { readFileSync } from "node:fs";

const projectId = "haos-back-to-school-vote-2569-test";
const EVENT_ID = "back-to-school-2569";
const ADMIN_EMAIL = "wongnazaipot@gmail.com";

let passed = 0;
let failed = 0;
const failures = [];

async function runTest(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, message: err?.message || String(err) });
    console.error(`FAIL ${name}`);
    console.error(err);
  }
}

function anon(testEnv, uid) {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: "anonymous" }
  }).firestore();
}

function googleUser(testEnv, uid, email, verified = true) {
  return testEnv.authenticatedContext(uid, {
    email,
    email_verified: verified,
    firebase: { sign_in_provider: "google.com" }
  }).firestore();
}

function unauth(testEnv) {
  return testEnv.unauthenticatedContext().firestore();
}

function paths(db, pollId = "child-photo", uid = "anon-voter-1", candidateId = "child-01") {
  return {
    event: doc(db, "events", EVENT_ID),
    poll: doc(db, "events", EVENT_ID, "polls", pollId),
    candidate: doc(db, "events", EVENT_ID, "polls", pollId, "candidates", candidateId),
    vote: doc(db, "events", EVENT_ID, "polls", pollId, "votes", uid),
    otherVote: doc(db, "events", EVENT_ID, "polls", pollId, "votes", "someone-else")
  };
}

function validVote(uid, overrides = {}) {
  return {
    voterUid: uid,
    pollId: "child-photo",
    candidateId: "child-01",
    candidateNumber: 1,
    createdAt: serverTimestamp(),
    clientVersion: "test",
    ...overrides
  };
}

async function seedBase(testEnv) {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "events", EVENT_ID), {
      title: "Back to School Popular Vote 2569",
      activePoll: "child-photo",
      stageMode: "live",
      eventStatus: "active"
    });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "child-photo"), {
      id: "child-photo",
      status: "open",
      title: "Child Photo"
    });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "closed-poll"), {
      id: "closed-poll",
      status: "closed",
      title: "Closed Poll"
    });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "child-photo", "candidates", "child-01"), {
      candidateId: "child-01",
      active: true,
      number: 1,
      sortOrder: 1
    });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "child-photo", "candidates", "child-inactive"), {
      candidateId: "child-inactive",
      active: false,
      number: 99,
      sortOrder: 99
    });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "closed-poll", "candidates", "child-01"), {
      candidateId: "child-01",
      active: true,
      number: 1,
      sortOrder: 1
    });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "child-photo", "votes", "seed-owner"), {
      voterUid: "seed-owner",
      pollId: "child-photo",
      candidateId: "child-01",
      candidateNumber: 1,
      createdAt: new Date(),
      clientVersion: "seed"
    });
  });
}

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") }
  });

  await seedBase(testEnv);

  await runTest("unauthenticated user cannot read event", async () => {
    await assertFails(getDoc(paths(unauth(testEnv)).event));
  });

  await runTest("anonymous user can read event", async () => {
    await assertSucceeds(getDoc(paths(anon(testEnv, "anon-read-event")).event));
  });

  await runTest("anonymous user can read poll", async () => {
    await assertSucceeds(getDoc(paths(anon(testEnv, "anon-read-poll")).poll));
  });

  await runTest("anonymous user can read active candidate", async () => {
    await assertSucceeds(getDoc(paths(anon(testEnv, "anon-read-candidate")).candidate));
  });

  await runTest("admin can create event", async () => {
    const db = googleUser(testEnv, "admin-create", ADMIN_EMAIL, true);
    await assertSucceeds(setDoc(doc(db, "events", "admin-created-event"), {
      title: "Admin Created",
      updatedAt: serverTimestamp(),
      updatedBy: ADMIN_EMAIL
    }));
  });

  await runTest("admin can update poll", async () => {
    const db = googleUser(testEnv, "admin-update", ADMIN_EMAIL, true);
    await assertSucceeds(updateDoc(paths(db).poll, { status: "open", updatedAt: serverTimestamp(), updatedBy: ADMIN_EMAIL }));
  });

  await runTest("non-admin google user cannot update event", async () => {
    const db = googleUser(testEnv, "not-admin", "someone@example.com", true);
    await assertFails(updateDoc(paths(db).event, { eventStatus: "finished" }));
  });

  await runTest("unverified admin email cannot update event", async () => {
    const db = googleUser(testEnv, "admin-unverified", ADMIN_EMAIL, false);
    await assertFails(updateDoc(paths(db).event, { eventStatus: "finished" }));
  });

  await runTest("anonymous user can create one valid vote for own uid", async () => {
    const uid = "anon-valid-vote";
    const db = anon(testEnv, uid);
    await assertSucceeds(setDoc(paths(db, "child-photo", uid).vote, validVote(uid)));
  });

  await runTest("anonymous user can read own vote", async () => {
    const uid = "anon-read-own";
    const db = anon(testEnv, uid);
    await assertSucceeds(setDoc(paths(db, "child-photo", uid).vote, validVote(uid)));
    await assertSucceeds(getDoc(paths(db, "child-photo", uid).vote));
  });

  await runTest("anonymous user cannot read another user's vote", async () => {
    const db = anon(testEnv, "anon-read-other");
    await assertFails(getDoc(paths(db, "child-photo", "anon-read-other").otherVote));
  });

  await runTest("anonymous user cannot create vote with another document id", async () => {
    const db = anon(testEnv, "anon-doc-mismatch");
    await assertFails(setDoc(paths(db, "child-photo", "different-doc-id").vote, validVote("anon-doc-mismatch")));
  });

  await runTest("anonymous user cannot create vote with mismatched voterUid", async () => {
    const uid = "anon-voter-mismatch";
    const db = anon(testEnv, uid);
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote("someone-else")));
  });

  await runTest("anonymous user cannot create vote with mismatched pollId", async () => {
    const uid = "anon-poll-mismatch";
    const db = anon(testEnv, uid);
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote(uid, { pollId: "costume" })));
  });

  await runTest("anonymous user cannot create vote when poll is closed", async () => {
    const uid = "anon-closed-poll";
    const db = anon(testEnv, uid);
    await assertFails(setDoc(paths(db, "closed-poll", uid).vote, validVote(uid, { pollId: "closed-poll" })));
  });

  await runTest("anonymous user cannot create vote for missing candidate", async () => {
    const uid = "anon-missing-candidate";
    const db = anon(testEnv, uid);
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote(uid, { candidateId: "missing", candidateNumber: 1 })));
  });

  await runTest("anonymous user cannot create vote for inactive candidate", async () => {
    const uid = "anon-inactive-candidate";
    const db = anon(testEnv, uid);
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote(uid, { candidateId: "child-inactive", candidateNumber: 99 })));
  });

  await runTest("anonymous user cannot create vote with mismatched candidateNumber", async () => {
    const uid = "anon-number-mismatch";
    const db = anon(testEnv, uid);
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote(uid, { candidateNumber: 2 })));
  });

  await runTest("anonymous user cannot create vote with extra fields", async () => {
    const uid = "anon-extra-field";
    const db = anon(testEnv, uid);
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote(uid, { ipAddress: "127.0.0.1" })));
  });

  await runTest("anonymous user cannot update existing vote", async () => {
    const uid = "anon-update-vote";
    const db = anon(testEnv, uid);
    await assertSucceeds(setDoc(paths(db, "child-photo", uid).vote, validVote(uid)));
    await assertFails(updateDoc(paths(db, "child-photo", uid).vote, { candidateNumber: 2 }));
  });

  await runTest("anonymous user cannot delete own vote", async () => {
    const uid = "anon-delete-own";
    const db = anon(testEnv, uid);
    await assertSucceeds(setDoc(paths(db, "child-photo", uid).vote, validVote(uid)));
    await assertFails(deleteDoc(paths(db, "child-photo", uid).vote));
  });

  await runTest("anonymous user cannot overwrite duplicate vote", async () => {
    const uid = "anon-duplicate";
    const db = anon(testEnv, uid);
    await assertSucceeds(setDoc(paths(db, "child-photo", uid).vote, validVote(uid)));
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote(uid)));
  });

  await runTest("google user cannot create participant vote", async () => {
    const uid = "google-voter";
    const db = googleUser(testEnv, uid, "normal@example.com", true);
    await assertFails(setDoc(paths(db, "child-photo", uid).vote, validVote(uid)));
  });

  await runTest("admin can read any vote", async () => {
    const db = googleUser(testEnv, "admin-read-vote", ADMIN_EMAIL, true);
    await assertSucceeds(getDoc(paths(db, "child-photo", "admin-read-vote").otherVote));
  });

  await runTest("admin can delete vote for reset", async () => {
    const db = googleUser(testEnv, "admin-delete-vote", ADMIN_EMAIL, true);
    await assertSucceeds(deleteDoc(doc(db, "events", EVENT_ID, "polls", "child-photo", "votes", "seed-owner")));
  });

  await testEnv.cleanup();

  console.log(`RESULT passed=${passed} failed=${failed} total=${passed + failed}`);
  if (failed > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
