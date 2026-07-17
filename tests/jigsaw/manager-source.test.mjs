import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");

test("Jigsaw manager assets use stable absolute paths for the clean /jigsaw URL", async () => {
  const html = await readProjectFile("jigsaw/index.html");

  assert.match(html, /href="\/jigsaw\/manifest\.webmanifest\?v=4"/);
  assert.match(html, /serviceWorker\.register\("\/jigsaw\/sw\.js\?v=5",\{scope:"\/jigsaw\/"\}\)/);
  assert.match(html, /src="\/jigsaw\/game-manager\.js\?v=5"/);
  assert.doesNotMatch(html, /(?:href|src)="\.\/(?:manifest\.webmanifest|game-manager\.js)"/);
  assert.doesNotMatch(html, /serviceWorker\.register\("\.\/sw\.js"/);
});

test("Jigsaw manager signals readiness and defers image-heavy rendering until the modal is visible", async () => {
  const source = await readProjectFile("jigsaw/game-manager.js");

  assert.match(source, /window\.HAOS_JIGSAW_MANAGER_READY = true/);
  assert.match(source, /data-round-thumb="\$\{index\}"/);
  assert.match(source, /ui\.modal\.classList\.add\("show"\);[\s\S]*requestAnimationFrame/);
});

test("Jigsaw manager requires a six-digit PIN gate before opening edit controls", async () => {
  const html = await readProjectFile("jigsaw/index.html");
  const source = await readProjectFile("jigsaw/game-manager.js");

  assert.match(html, /id="managerPinModal"/);
  assert.match(html, /id="managerPinInput"[^>]*inputmode="numeric"[^>]*maxlength="6"/);
  assert.match(html, /id="lockGameManager"/);
  assert.match(source, /const MANAGER_PIN_HASH = "[a-f0-9]{64}"/);
  assert.doesNotMatch(source, /["']235689["']/);
  assert.match(source, /ui\.openSetup\.addEventListener\("click", requestManagerAccess\)/);
  assert.match(source, /ui\.openGame\.addEventListener\("click", requestManagerAccess\)/);
  assert.match(source, /MANAGER_MAX_ATTEMPTS = 5/);
  assert.match(source, /MANAGER_LOCK_DURATION_MS = 60 \* 1000/);
});

test("Jigsaw service worker caches and handles both /jigsaw and nested asset routes", async () => {
  const source = await readProjectFile("jigsaw/sw.js");

  assert.match(source, /haos-jigsaw-manager-v5/);
  assert.match(source, /const BASE_PATH = "\/jigsaw"/);
  assert.match(source, /url\.pathname !== BASE_PATH && !url\.pathname\.startsWith\(`\$\{BASE_PATH\}\/`\)/);
  assert.match(source, /caches\.match\("\/jigsaw\/index\.html"\)/);
});
