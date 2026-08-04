import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

function loadDataConnector() {
  const context = { window: {}, console, Date, Set, Object, String, Number, Array, RegExp, Error };
  vm.createContext(context);
  vm.runInContext(read('assets/js/dashboard-builder/data-connectors.js'), context);
  return context.window.HAOSDashboardData;
}

test('CSV formula-like values are neutralized before storage', () => {
  const data = loadDataConnector();
  assert.equal(data.cleanCell('=HYPERLINK("bad")'), "'=HYPERLINK(\"bad\")");
  assert.equal(data.cleanCell('+SUM(1,2)'), "'+SUM(1,2)");
  assert.equal(data.cleanCell('normal'), 'normal');
});

test('header row and duplicate columns normalize predictably', () => {
  const data = loadDataConnector();
  const parsed = data.normalizeMatrix([['รายงาน'], ['ชื่อ', 'ชื่อ', 'คะแนน'], ['A', 'B', '10']], 2);
  assert.deepEqual(Array.from(parsed.header), ['ชื่อ', 'ชื่อ (2)', 'คะแนน']);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]['ชื่อ (2)'], 'B');
});

test('schema inference finds category and integer metrics', () => {
  const data = loadDataConnector();
  const rows = [{กลุ่ม:'A',คะแนน:'10'}, {กลุ่ม:'B',คะแนน:'20'}, {กลุ่ม:'A',คะแนน:'30'}];
  const schema = data.buildSchema(rows, ['กลุ่ม', 'คะแนน']);
  assert.equal(schema[0].type, 'Category');
  assert.equal(schema[1].type, 'Integer');
});

test('standalone route and frontend assets are wired', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const dashboardRoutes = vercel.rewrites.filter(item => item.source === '/it-services/dashboard-builder' || item.source === '/it-services/dashboard-builder/:path*');
  assert.equal(dashboardRoutes.length, 2);
  assert.ok(dashboardRoutes.every(item => item.destination === '/dashboard-builder'));
  assert.ok(dashboardRoutes.every(item => !item.destination.endsWith('.html')), 'cleanUrls destinations must omit .html');
  const index = read('index.html');
  assert.match(index, /dashboard-builder-entry\.js\?v=70132/);
  const page = read('dashboard-builder.html');
  assert.match(page, /Dashboard Builder/);
  assert.match(page, /data-step="5"/);
  assert.match(page, /data-list-scope="recent"/);
  assert.match(page, /id="dbGoogleHeaderRow"/);
  assert.match(page, /dashboard-builder\/app\.js\?v=70135/);
});

test('public Dashboard route opens the standalone read-only viewer', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const publicRoutes = vercel.rewrites.filter(item => item.source === '/dashboard/public' || item.source === '/dashboard/public/:token');
  assert.equal(publicRoutes.length, 2);
  assert.ok(publicRoutes.every(item => item.destination === '/dashboard-public'));
  assert.ok(publicRoutes.every(item => !item.destination.endsWith('.html')), 'cleanUrls destinations must omit .html');
  const page = read('dashboard-public.html');
  assert.match(page, /id="dbPublicViewerCanvas"/);
  assert.match(page, /id="dbPublicPinForm"/);
  assert.match(page, /noindex,nofollow,noarchive/);
  assert.doesNotMatch(page, /dbEditCurrent|dbSaveProject|dbDeleteProject/);
});

test('backend exposes signed session, permissions, datasets, versions and audit', () => {
  const code = read('Code.gs.txt');
  for (const marker of ['createDashboardBuilderSessionV7132','getDashboardBuilderBootstrapV7132','DashboardProjects','DashboardDatasets','DashboardDataChunks','DashboardVersions','DashboardAudit','haosDB7132CanView_','haosDB7132CanEdit_']) assert.match(code, new RegExp(marker));
  assert.match(code, /computeHmacSha256Signature/);
});

test('public sharing is isolated, signed, revocable and filters columns server-side', () => {
  const code = read('Code.gs.txt');
  for (const marker of ['DashboardPublicLinks','getDashboardPublicShareSettingsV7134','saveDashboardPublicShareV7134','getDashboardPublicBootstrapV7134','openDashboardPublicV7134','PUBLIC_REVOKE','PUBLIC_REGENERATE','PUBLIC_VIEW']) assert.match(code, new RegExp(marker));
  assert.match(code, /computeHmacSha256Signature/);
  assert.match(code, /visible\.forEach\(function\(name\)\{clean\[name\]=row\[name\]/);
  assert.match(code, /defaultEnabled:false/);
  assert.match(code, /project\.status!==['"]active['"]/);
});

test('dashboard renderer supports required MVP widgets', () => {
  const source = read('assets/js/dashboard-builder/renderer.js');
  for (const type of ["'kpi'", "'table'", "'line'", "'pie'"]) assert.match(source, new RegExp(type));
  assert.match(source, /draggable=true/);
  assert.match(source, /data-table-search/);
  assert.match(source, /data-table-size/);
  assert.match(source, /data-table-export/);
  assert.match(source, /data-sort-field/);
});

test('dashboard HTML has unique ids and app references existing controls', () => {
  const page = read('dashboard-builder.html');
  const app = read('assets/js/dashboard-builder/app.js');
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate HTML id found');
  const referenced = [...app.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  const missing = [...new Set(referenced)].filter(id => !ids.includes(id));
  assert.deepEqual(missing, []);
});

test('public viewer HTML has unique ids and its script references existing controls', () => {
  const page = read('dashboard-public.html');
  const app = read('assets/js/dashboard-builder/public-viewer.js');
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate public viewer HTML id found');
  const referenced = [...app.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  const missing = [...new Set(referenced)].filter(id => !ids.includes(id));
  assert.deepEqual(missing, []);
  assert.match(app, /openDashboardPublicV7134/);
  assert.match(app, /getDashboardPublicBootstrapV7134/);
});

test('Dashboard owner controls expose PIN, expiry, export and visible-column settings', () => {
  const page = read('dashboard-builder.html');
  const app = read('assets/js/dashboard-builder/app.js');
  for (const id of ['dbPublicEnabled','dbPublicExpiresAt','dbPublicRequirePin','dbPublicPin','dbPublicAllowExport','dbPublicColumns','dbPublicRevoke','dbPublicRegenerate','dbPublicSave']) assert.match(page, new RegExp(`id="${id}"`));
  assert.match(app, /data-project-public/);
  assert.match(app, /saveDashboardPublicShareV7134/);
  assert.match(app, /getDashboardPublicShareSettingsV7134/);
});

test('Google Sheets import supports sheet selection and custom header rows', () => {
  const page = read('dashboard-builder.html');
  const app = read('assets/js/dashboard-builder/app.js');
  const backend = read('Code.gs.txt');
  assert.match(page, /<select id="dbGoogleSheetName"/);
  assert.match(app, /result\.sheetNames/);
  assert.match(app, /dbGoogleHeaderRow/);
  assert.match(backend, /getSheetByName\(sheetName\)/);
  assert.match(backend, /Number\(headerRow\|\|1\)/);
});

test('large datasets use bounded chunks and staged finalization', () => {
  const app = read('assets/js/dashboard-builder/app.js');
  const backend = read('Code.gs.txt');
  assert.match(app, /JSON\.stringify\(candidate\)\.length>40000/);
  assert.match(backend, /json\.length>45000/);
  assert.match(backend, /uploadedRows!==Math\.min\(Number\(rowCount\|\|0\),20000\)/);
  assert.match(backend, /previousDatasetId/);
  assert.match(backend, /stagedDatasetId/);
});

test('renderer filtering handles text, number, multi-select and date range', () => {
  const context = { window:{}, console, Date, Set, Map, WeakMap, Object, String, Number, Array, RegExp, Error, Intl };
  vm.createContext(context);
  vm.runInContext(read('assets/js/dashboard-builder/renderer.js'), context);
  const filter = context.window.HAOSDashboardRenderer.filteredRows;
  const rows = [{name:'Alpha',score:10,group:'A',date:'2026-01-10'}, {name:'Beta',score:20,group:'B',date:'2026-02-10'}];
  assert.equal(filter(rows,[{field:'name',type:'search',value:'alp'}]).length,1);
  assert.equal(filter(rows,[{field:'score',type:'number',value:15}]).length,1);
  assert.equal(filter(rows,[{field:'group',type:'multi',value:['B']}]).length,1);
  assert.equal(filter(rows,[{field:'date',type:'date',value:{from:'2026-02-01',to:'2026-02-28'}}]).length,1);
});

test('Phase 6.1 viewer UI is shared by authenticated and public dashboards', () => {
  const builder = read('dashboard-builder.html');
  const publicPage = read('dashboard-public.html');
  const viewerUi = read('assets/js/dashboard-builder/viewer-ui.js');
  const viewerCss = read('assets/css/dashboard-viewer.css');
  const renderer = read('assets/js/dashboard-builder/renderer.js');
  for (const page of [builder, publicPage]) {
    assert.match(page, /dashboard-viewer\.css\?v=70135/);
    assert.match(page, /dashboard-builder\/viewer-ui\.js\?v=70135/);
  }
  assert.match(viewerUi, /data-viewer-filter-toggle/);
  assert.match(viewerUi, /requestFullscreen/);
  assert.match(viewerUi, /data-visible-rows/);
  assert.match(viewerCss, /\.db-viewer-overview/);
  assert.match(viewerCss, /@media print/);
  assert.match(renderer, /haos:dashboard-rendered/);
  assert.match(renderer, /activeFilterCount/);
});
