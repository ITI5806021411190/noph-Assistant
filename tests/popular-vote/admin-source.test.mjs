import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const adminPath = resolve(root, "popular-vote/assets/js/admin.js");
const adminSource = await readFile(adminPath, "utf8");

function matches(pattern, source = adminSource) {
  return Array.from(source.matchAll(pattern), match => match[1]);
}

test("every rendered admin action has a handler", () => {
  const rendered = new Set(matches(/data-action="([^"]+)"/g));
  const handled = new Set(matches(/action === "([^"]+)"/g));
  assert.deepEqual([...rendered].filter(action => !handled.has(action)), []);
});

test("every candidate action has a handler", () => {
  const rendered = new Set(matches(/data-candidate-action="([^"]+)"/g));
  const handled = new Set(matches(/action === "([^"]+)"/g));
  assert.deepEqual([...rendered].filter(action => !handled.has(action)), []);
});

test("all relative JavaScript imports exist", async () => {
  const relativeImports = matches(/from\s+"(\.\/[^"]+)"/g);
  await Promise.all(relativeImports.map(specifier => access(resolve(dirname(adminPath), specifier.replace(/\?.*$/, "")))));
});

test("admin page cache versions match the module imports", async () => {
  const html = await readFile(resolve(root, "popular-vote/admin/index.html"), "utf8");
  assert.match(html, /admin\.js\?v=70132/);
  assert.match(html, /popular-vote\.css\?v=70132/);
  assert.match(adminSource, /core\.js\?v=70132/);
  assert.match(adminSource, /admin-manager-utils\.js\?v=70132/);
});

test("storage rules scope image writes to verified admin", async () => {
  const rules = await readFile(resolve(root, "storage.rules"), "utf8");
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /request\.resource\.size <= 5 \* 1024 \* 1024/);
  assert.match(rules, /image\/\(jpeg\|png\|webp\)/);
});
