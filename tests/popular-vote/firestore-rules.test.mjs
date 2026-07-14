// Popular Vote Firestore rules scaffold.
// Run after installing @firebase/rules-unit-testing and firebase emulator tooling.
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";

const projectId = "haos-back-to-school-vote-2569-test";
const EVENT_ID = "back-to-school-2569";
const ADMIN_EMAIL = "wongnazaipot@gmail.com";

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") }
  });

  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "events", EVENT_ID), { activePoll: "child-photo", stageMode: "live", eventStatus: "active" });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "child-photo"), { status: "open" });
    await setDoc(doc(db, "events", EVENT_ID, "polls", "child-photo", "candidates", "child-01"), { active: true, number: 1, sortOrder: 1 });
  });

  const voter = testEnv.authenticatedContext("anon-voter-1", { firebase: { sign_in_provider: "anonymous" } }).firestore();
  await assertSucceeds(setDoc(doc(voter, "events", EVENT_ID, "polls", "child-photo", "votes", "anon-voter-1"), {
    voterUid: "anon-voter-1",
    pollId: "child-photo",
    candidateId: "child-01",
    candidateNumber: 1,
    createdAt: serverTimestamp(),
    clientVersion: "test"
  }));
  await assertFails(getDoc(doc(voter, "events", EVENT_ID, "polls", "child-photo", "votes", "someone-else")));

  const admin = testEnv.authenticatedContext("admin-uid", { email: ADMIN_EMAIL, email_verified: true }).firestore();
  await assertSucceeds(getDoc(doc(admin, "events", EVENT_ID, "polls", "child-photo", "votes", "anon-voter-1")));
  await assertSucceeds(deleteDoc(doc(admin, "events", EVENT_ID, "polls", "child-photo", "votes", "anon-voter-1")));

  await testEnv.cleanup();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
