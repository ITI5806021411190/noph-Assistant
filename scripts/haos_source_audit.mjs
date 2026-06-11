import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (key.startsWith('--')) {
    const next = process.argv[i + 1];
    if (next && !next.startsWith('--')) {
      args.set(key, next);
      i += 1;
    } else {
      args.set(key, true);
    }
  }
}

const files = {
  index: path.join(root, 'index.html'),
  code: path.join(root, 'Code.gs.txt'),
  publicPage: path.join(root, 'public.html'),
  remotePage: path.join(root, 'remote.html')
};

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function lineCount(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function countRegex(text, regex) {
  return [...text.matchAll(regex)].length;
}

function blockInventory(html, tag) {
  const regex = new RegExp(`<${tag}\\b([^>]*)>[\\s\\S]*?<\\/${tag}>`, 'gi');
  const out = [];
  for (const match of html.matchAll(regex)) {
    const attrs = match[1] || '';
    const id = /id=["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    const src = /src=["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    const href = /href=["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    out.push({
      tag,
      id,
      src,
      href,
      line: lineNumberAt(html, match.index || 0),
      chars: match[0].length,
      lines: lineCount(match[0])
    });
  }
  return out;
}

function collectNames(text, patterns) {
  const counts = new Map();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function collectSheetRefs(code) {
  const refs = new Map();
  const add = (name, kind) => {
    if (!name) return;
    const current = refs.get(name) || new Set();
    current.add(kind);
    refs.set(name, current);
  };

  for (const match of code.matchAll(/const\s+(SHEET_[A-Z0-9_]+)\s*=\s*['"]([^'"]+)['"]/g)) {
    add(match[2], `const:${match[1]}`);
  }
  for (const match of code.matchAll(/(?:getSheetByName|getOrCreateSheet_)\(\s*['"]([^'"]+)['"]/g)) {
    add(match[1], 'literal');
  }
  for (const match of code.matchAll(/(?:getSheetByName|getOrCreateSheet_)\(\s*(SHEET_[A-Z0-9_]+)/g)) {
    add(match[1], 'constant-ref');
  }

  return [...refs.entries()]
    .map(([name, kinds]) => ({ name, kinds: [...kinds].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Health Assistant OS Source Audit');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## File sizes');
  lines.push('');
  lines.push('| File | Lines | Characters |');
  lines.push('| --- | ---: | ---: |');
  for (const file of report.files) {
    lines.push(`| ${file.name} | ${file.lines} | ${file.chars} |`);
  }
  lines.push('');
  lines.push('## Frontend patch blocks');
  lines.push('');
  lines.push(`- Script blocks: ${report.index.scriptBlocks.length}`);
  lines.push(`- External script files: ${report.index.scriptBlocks.filter(block => block.src).length}`);
  lines.push(`- Inline script blocks: ${report.index.scriptBlocks.filter(block => !block.src).length}`);
  lines.push(`- Style blocks: ${report.index.styleBlocks.length}`);
  lines.push(`- Stylesheet links are not counted as style blocks.`);
  lines.push('');
  lines.push('| Kind | ID/source | Line | Lines | Characters |');
  lines.push('| --- | --- | ---: | ---: | ---: |');
  [...report.index.styleBlocks, ...report.index.scriptBlocks]
    .sort((a, b) => a.line - b.line)
    .forEach(block => {
      lines.push(`| ${block.tag} | ${block.id || block.src || block.href || '-'} | ${block.line} | ${block.lines} | ${block.chars} |`);
    });
  lines.push('');
  lines.push('## Function pressure');
  lines.push('');
  lines.push(`- Apps Script named functions: ${report.code.namedFunctions}`);
  lines.push(`- Frontend inline named functions: ${report.index.namedFunctions}`);
  lines.push(`- Frontend window exports: ${report.index.windowExports}`);
  lines.push('');
  lines.push('### Duplicate backend function names');
  lines.push('');
  if (report.code.duplicateFunctions.length) {
    lines.push('| Function | Count |');
    lines.push('| --- | ---: |');
    report.code.duplicateFunctions.slice(0, 40).forEach(([name, count]) => lines.push(`| ${name} | ${count} |`));
  } else {
    lines.push('No duplicate backend function names detected.');
  }
  lines.push('');
  lines.push('## Sheet references found in Code.gs.txt');
  lines.push('');
  lines.push('| Sheet/reference | Source kinds |');
  lines.push('| --- | --- |');
  report.code.sheetRefs.forEach(ref => lines.push(`| ${ref.name} | ${ref.kinds.join(', ')} |`));
  lines.push('');
  lines.push('## First-pass risk notes');
  lines.push('');
  report.risks.forEach(risk => lines.push(`- ${risk}`));
  lines.push('');
  return lines.join('\n');
}

const [indexHtml, codeGs, publicHtml, remoteHtml] = await Promise.all([
  readIfExists(files.index),
  readIfExists(files.code),
  readIfExists(files.publicPage),
  readIfExists(files.remotePage)
]);

const report = {
  files: [
    { name: 'index.html', lines: lineCount(indexHtml), chars: indexHtml.length },
    { name: 'Code.gs.txt', lines: lineCount(codeGs), chars: codeGs.length },
    { name: 'public.html', lines: lineCount(publicHtml), chars: publicHtml.length },
    { name: 'remote.html', lines: lineCount(remoteHtml), chars: remoteHtml.length }
  ],
  index: {
    scriptBlocks: blockInventory(indexHtml, 'script'),
    styleBlocks: blockInventory(indexHtml, 'style'),
    namedFunctions: countRegex(indexHtml, /function\s+([A-Za-z_$][\w$]*)\s*\(/g),
    windowExports: countRegex(indexHtml, /window\.[A-Za-z_$][\w$]*\s*=/g),
    duplicateFunctions: collectNames(indexHtml, [
      /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
      /window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function/g
    ])
  },
  code: {
    namedFunctions: countRegex(codeGs, /function\s+([A-Za-z_$][\w$]*)\s*\(/g),
    duplicateFunctions: collectNames(codeGs, [/function\s+([A-Za-z_$][\w$]*)\s*\(/g]),
    sheetRefs: collectSheetRefs(codeGs)
  },
  risks: [
    'index.html is a patch-accumulated file; extraction should keep existing global function names stable until each module is proven.',
    'Code.gs.txt has repeated service implementations and repeated bridge whitelist overrides; backend refactor should start with shared read/cache helpers.',
    'Google Sheet cleanup must stay dry-run first. Never delete rows or sheets before a workbook copy and an audit diff exist.',
    'Large tables should be paginated and filtered server-side before UI refactor work.'
  ]
};

const markdown = renderMarkdown(report);
const output = args.get('--output');
if (output) {
  const outputPath = path.resolve(root, output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown, 'utf8');
  console.log(`Wrote ${outputPath}`);
} else if (args.has('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(markdown);
}
