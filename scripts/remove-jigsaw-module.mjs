import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const manifestPath = path.join(root, 'docs', 'jigsaw', 'install-manifest.json');

function resolveOwnedPath(relativePath) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('..')) {
    throw new Error(`Unsafe path in manifest: ${relativePath}`);
  }
  const absolutePath = path.resolve(root, relativePath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (!absolutePath.startsWith(rootWithSep)) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }
  return absolutePath;
}

async function exists(absolutePath) {
  try {
    return await fs.stat(absolutePath);
  } catch {
    return null;
  }
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const createdFiles = Array.isArray(manifest.createdFiles) ? manifest.createdFiles : [];
  const modifiedFiles = Array.isArray(manifest.modifiedFiles) ? manifest.modifiedFiles : [];

  console.log('Health Assistant OS Jigsaw module uninstall');
  console.log('');
  console.log('Files this script may delete:');
  createdFiles.forEach(file => console.log(`- ${file}`));
  console.log('');
  console.log('Shared files that require manual rollback:');
  modifiedFiles.forEach(file => console.log(`- ${file}`));
  console.log('');
  console.log('This script deletes only exact module-owned files listed in install-manifest.json.');
  console.log('It does not edit index.html, sw.js, or vercel.json.');
  console.log('');

  const confirmedByFlag = process.argv.includes('--confirm');
  if (!confirmedByFlag) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question('Type REMOVE-JIGSAW to delete module-owned files: ');
    rl.close();
    if (answer !== 'REMOVE-JIGSAW') {
      console.log('Cancelled. No files were deleted.');
      return;
    }
  }

  for (const file of createdFiles) {
    const absolutePath = resolveOwnedPath(file);
    const stat = await exists(absolutePath);
    if (!stat) {
      console.log(`skip missing: ${file}`);
      continue;
    }
    if (!stat.isFile()) {
      console.log(`skip non-file: ${file}`);
      continue;
    }
    await fs.rm(absolutePath, { force: true });
    console.log(`deleted: ${file}`);
  }

  for (const folder of ['jigsaw', path.join('docs', 'jigsaw')]) {
    const absolutePath = resolveOwnedPath(folder);
    try {
      await fs.rmdir(absolutePath);
      console.log(`removed empty folder: ${folder}`);
    } catch {
      console.log(`folder kept because it is not empty or does not exist: ${folder}`);
    }
  }

  console.log('');
  console.log('Next manual steps:');
  console.log('1. Remove the jigsaw script tag from index.html.');
  console.log('2. Remove /jigsaw rewrites from vercel.json.');
  console.log('3. Remove /jigsaw skip and jigsaw module cache entry from sw.js.');
  console.log('4. Test Health Assistant OS and deploy Preview before Production.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
