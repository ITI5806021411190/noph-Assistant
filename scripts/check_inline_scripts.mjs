import fs from 'node:fs';

const target = process.argv[2] || 'index.html';
const source = fs.readFileSync(target, 'utf8');
const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

let count = 0;
const failures = [];

for (const match of source.matchAll(re)) {
  count += 1;
  const code = String(match[1] || '').trim();
  if (!code) continue;
  try {
    new Function(code);
  } catch (error) {
    failures.push({
      index: count,
      line: source.slice(0, match.index).split(/\r?\n/).length,
      message: error && error.message ? error.message : String(error)
    });
  }
}

console.log(`${target}: inline scripts ${count}, bad ${failures.length}`);
if (failures.length) {
  console.log(JSON.stringify(failures.slice(0, 20), null, 2));
  process.exit(1);
}
