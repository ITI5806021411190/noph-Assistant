// Rollback helper: removes standalone Popular Vote files.
// Shared files still need manual restore from Git because they contain other modules too.
import { rmSync, existsSync } from "node:fs";
const targets = [
  "popular-vote",
  "assets/js/modules/popular-vote-module.js",
  "docs/popular-vote",
  "tests/popular-vote",
  "scripts/popular-vote-load-test.mjs"
];
for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`removed ${target}`);
  }
}
console.log("Manual shared-file rollback: restore index.html, sw.js, vercel.json, firebase.json/firestore.rules if this project does not use them elsewhere.");
