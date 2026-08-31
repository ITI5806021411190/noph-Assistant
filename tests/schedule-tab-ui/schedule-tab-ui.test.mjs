import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

test('Schedule tab loads the v70.145 UI cleanup assets', () => {
  const index = read('index.html');
  const sw = read('sw.js');
  assert.match(index, /schedule-tab-ui\.css\?v=70145/);
  assert.match(index, /schedule-tab-ui\.js\?v=70145/);
  assert.match(sw, /schedule-tab-ui\.css\?v=70145/);
  assert.match(sw, /schedule-tab-ui\.js\?v=70145/);
});

test('Legacy duplicate action bar is suppressed while the v70.42 action bar remains', () => {
  const index = read('index.html');
  const source = read('assets/js/modules/schedule-tab-ui.js');
  const css = read('assets/css/schedule-tab-ui.css');
  assert.match(index, /id="haosScheduleActionBarV742"/);
  assert.match(source, /\$\('scheduleActionBar'\)/);
  assert.match(source, /haos-v7145-legacy-header/);
  assert.match(css, /#scheduleActionBar\.haos-v7145-legacy-header/);
});

test('Pending approvals move into the unified schedule and stay hidden when empty', () => {
  const source = read('assets/js/modules/schedule-tab-ui.js');
  const css = read('assets/css/schedule-tab-ui.css');
  assert.match(source, /haosScheduleApprovalMountV7145/);
  assert.match(source, /pendingList/);
  assert.match(source, /querySelector\('\.list-group-item'\)/);
  assert.match(source, /mount\.appendChild\(section\)/);
  assert.match(source, /haos-v7145-empty-approval/);
  assert.match(css, /approvalSection\.haos-v7145-empty-approval/);
});

test('Sticky main navigation behavior is left unchanged', () => {
  const source = read('assets/js/modules/schedule-tab-ui.js');
  const css = read('assets/css/schedule-tab-ui.css');
  assert.doesNotMatch(source, /mainTab|position\s*=\s*['"]static/);
  assert.doesNotMatch(css, /#mainTab|\.nav-tabs/);
});
