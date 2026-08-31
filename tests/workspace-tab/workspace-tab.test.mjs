import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

test('Shared Workspace has its own main tab and pane without a standalone route', () => {
  const index = read('index.html');
  const vercel = JSON.parse(read('vercel.json'));
  assert.match(index, /id="workspace-tab"[^>]+data-bs-target="#workspace-pane"/);
  assert.match(index, /id="workspace-pane"[^>]+aria-labelledby="workspace-tab"/);
  assert.match(index, /workspace-tab\.js\?v=70143/);
  assert.equal(vercel.rewrites.some(route => /workspace/i.test(route.source)), false);
});

test('Workspace card is moved rather than cloned and loads lazily on first tab open', () => {
  const source = read('assets/js/modules/workspace-tab.js');
  assert.match(source, /body\.closest\('\.card'\)/);
  assert.match(source, /host\.appendChild\(card\)/);
  assert.match(source, /let loaded = false/);
  assert.match(source, /shown\.bs\.tab/);
  assert.match(source, /loadWorkspaceOnce/);
  assert.doesNotMatch(source, /cloneNode/);
});

test('Workspace restore state no longer points to the schedule pane', () => {
  const restore = read('assets/js/modules/session-restore.js');
  const bindings = restore.match(/wrapFunction\('(?:loadSharedWorkspaces|openWorkspaceEditor|openWorkspaceConfigEditorV737)'[^\n]+/g) || [];
  assert.equal(bindings.length, 3);
  bindings.forEach(binding => assert.match(binding, /#workspace-pane/));
  bindings.forEach(binding => assert.doesNotMatch(binding, /#schedule-pane/));
  assert.match(restore, /activeTarget === '#workspace-pane'\) return 'workspaceList'/);
});

test('Schedule filter and Workspace filter are independent', () => {
  const index = read('index.html');
  const source = read('assets/js/modules/workspace-tab.js');
  const scheduleFilter = index.slice(index.indexOf('window.ensureScheduleGlobalFilterV49_'), index.indexOf('window.ensureScheduleAttachmentInputsV49_'));
  assert.match(scheduleFilter, /ตัวกรองตารางงาน/);
  assert.doesNotMatch(scheduleFilter, /ตัวกรองรวม ตารางงาน & พื้นที่ทำงานร่วมกัน/);
  assert.match(source, /workspaceTabSearchV7143/);
});

test('Program guide includes the dedicated Workspace tab', () => {
  const guide = read('assets/js/modules/program-guide.js');
  assert.match(guide, /workspace=\$\('workspace-tab'\)/);
  assert.match(guide, /พื้นที่ทำงานร่วมกัน/);
  assert.match(guide, /Form\/Quiz/);
});
