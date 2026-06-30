# Rollback v70.118 Schedule Popup Stable Actions

Scope:
- `index.html`: revert the edits inside the `haos-v70-117-schedule-multilink-script` block that changed `viewScheduleDetail` to use the v70.117 detail overlay directly, added the duplicate-open guard, and rebound `window.HAOS.scheduleThaiList.showDetail`.
- `sw.js`: restore the cache name to `haos-v70-117-schedule-multilink-actions`.

Safe rollback:
1. Restore `index.html` and `sw.js` from the commit before v70.118.
2. Hard refresh the browser or unregister the service worker once to clear the v70.118 cache.
3. No Google Apps Script or Google Sheet rollback is needed. This patch only changes frontend popup behavior.
