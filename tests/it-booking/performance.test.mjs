import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const code = fs.readFileSync(path.join(root, 'Code.gs.txt'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing section: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `missing section end: ${end}`);
  return source.slice(from, to);
}

test('booking list reuses authorization and user data instead of reading sheets per row', () => {
  const list = section(code, 'function getITBookings(phone, role, department)', 'function saveITBooking(');
  assert.equal((list.match(/isITServiceStaff_\(targetPhone\)/g) || []).length, 1);
  assert.match(list, /itBookingRowToObject_\(data\[i\], map, userPositionMap\)/);
  assert.match(list, /item\.ownerPhone === targetPhone \|\| canSeeAll/);
  assert.match(list, /meta:\{serverMs:/);
});

test('booking row converter accepts preloaded header and position maps', () => {
  const converter = section(code, 'function itBookingRowToObject_(row, map, userPositionMap)', 'function saveITBooking(data)');
  assert.match(converter, /if \(!map\)/);
  assert.match(converter, /userPositionMap \? \(userPositionMap\[ownerPhone\]/);
});

test('initial booking list attaches only pending changes for already visible bookings', () => {
  const pending = section(code, 'function haosV7142PendingBookingChanges_(items)', 'var haosV748PrevGetITBookings_');
  assert.match(pending, /req\.status === 'Pending'/);
  assert.match(pending, /visibleIds\[String\(req\.bookingId\)\]/);
  const wrapper = section(code, 'var haosV748PrevGetITBookings_', 'function haosV748OtpSheet_');
  assert.match(wrapper, /haosV7142PendingBookingChanges_\(res\.data \|\| \[\]\)/);
  assert.doesNotMatch(wrapper, /getITBookingChangeRequestsV748\(phone\)/);
});

test('frontend deduplicates concurrent loads and keeps cached rows visible', () => {
  const frontend = section(html, 'let bookingLoadInFlightV7142=null;', 'window.renderItBookings=function()');
  assert.match(frontend, /if\(bookingLoadInFlightV7142\)return bookingLoadInFlightV7142/);
  assert.match(frontend, /if\(hadCached\)renderItBookings\(\)/);
  assert.match(frontend, /serverMs:res\.meta\?\.serverMs/);
  assert.match(frontend, /finally\{bookingLoadInFlightV7142=null;\}/);
});
