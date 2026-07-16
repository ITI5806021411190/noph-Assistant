import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const readProjectFile = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");

function withoutEmbeddedDefaultRounds(html) {
  return html.replace(/const ROUNDS = \[[\s\S]*?\];\s*\n/, "const ROUNDS = [];\n");
}

test("Jigsaw inline scripts remain valid JavaScript", async () => {
  const html = await readProjectFile("jigsaw/index.html");
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1])
    .filter(Boolean);

  assert.ok(inlineScripts.length > 0);
  inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `jigsaw-inline-${index}.js` }));
});

test("Jigsaw play flow asks and checks only what the picture is", async () => {
  const html = withoutEmbeddedDefaultRounds(await readProjectFile("jigsaw/index.html"));

  assert.match(html, /ภาพนี้คืออะไร\?/);
  assert.match(html, /const objOk=matches\(\$\("objectAnswer"\)\.value,round\.objectVariants\);\s*if\(objOk\)\{/);
  assert.match(html, /\$\("objectAnswer"\)\.addEventListener\("keydown",e=>\{if\(e\.key==="Enter"\)checkAnswer\(\)\}\)/);
  assert.doesNotMatch(html, /(?:id|for)="(?:placeAnswer|answerPlace|managerPlace|managerPlaceVariants)"/);
  assert.doesNotMatch(html, /\$\("(?:placeAnswer|answerPlace)"\)|placeOk|round\.placeVariants/);
});

test("Jigsaw manager stores only picture answers while accepting legacy round data", async () => {
  const source = await readProjectFile("jigsaw/game-manager.js");

  assert.match(source, /const CONFIG_VERSION = 2/);
  assert.match(source, /const object = String\(round && round\.object \|\| ""\)\.trim\(\)/);
  assert.match(source, /objectVariants: uniqueText\(\[object\]/);
  assert.doesNotMatch(source, /managerPlace|placeVariants|round\.place|ui\.place/);
});
