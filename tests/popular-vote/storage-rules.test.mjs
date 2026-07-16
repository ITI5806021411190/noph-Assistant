import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { getStorage, ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";

const projectId = "haos-back-to-school-vote-2569";
const adminEmail = "wongnazaipot@gmail.com";
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    storage: { rules: await readFile(new URL("../../storage.rules", import.meta.url), "utf8") }
  });
});

after(async () => {
  await testEnv?.cleanup();
});

function storageFor(uid, claims = {}) {
  return getStorage(testEnv.authenticatedContext(uid, claims).app);
}

test("verified admin can upload and delete a supported image", async () => {
  const storage = storageFor("admin-upload", { email: adminEmail, email_verified: true });
  const imageRef = ref(storage, "popular-vote/event/poll/candidate/admin-image.jpg");
  await assertSucceeds(uploadBytes(imageRef, new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" }));
  await assertSucceeds(deleteObject(imageRef));
});

test("non-admin cannot upload a candidate image", async () => {
  const storage = storageFor("other-user", { email: "other@example.com", email_verified: true });
  const imageRef = ref(storage, "popular-vote/event/poll/candidate/other-image.jpg");
  await assertFails(uploadBytes(imageRef, new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" }));
});

test("admin cannot upload unsupported or oversized content", async () => {
  const storage = storageFor("admin-validation", { email: adminEmail, email_verified: true });
  await assertFails(uploadBytes(
    ref(storage, "popular-vote/event/poll/candidate/file.txt"),
    new TextEncoder().encode("not an image"),
    { contentType: "text/plain" }
  ));
  await assertFails(uploadBytes(
    ref(storage, "popular-vote/event/poll/candidate/too-large.jpg"),
    new Uint8Array((5 * 1024 * 1024) + 1),
    { contentType: "image/jpeg" }
  ));
});

test("uploaded candidate images are readable for the public voting page", async () => {
  const adminStorage = storageFor("admin-public-read", { email: adminEmail, email_verified: true });
  const path = "popular-vote/event/poll/candidate/public-image.jpg";
  await assertSucceeds(uploadBytes(ref(adminStorage, path), new Uint8Array([7, 8, 9]), { contentType: "image/jpeg" }));
  const publicStorage = getStorage(testEnv.unauthenticatedContext().app);
  await assertSucceeds(getBytes(ref(publicStorage, path)));
});
