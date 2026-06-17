# Rollback v70.86 Date Coverage + Schedule Multi Ranges

Last updated: 2026-06-17

## Scope

This update is frontend-only.

It adds:

- a late date display coverage layer for older modules that still render numeric dates
- Thai date display fallback for report history date pills
- schedule create/edit support for multiple date/time ranges
- a text parser for Thai multi-date ranges such as `1-5 Jun 2026, 7, 13, 22-24 Jun 2026`
- a frontend hook that lets the existing schedule AI analysis pass its pasted text to the multi-range parser
- service worker cache refresh for the new module files

No Google Apps Script or database schema change is required.

## Files Added

- `assets/js/modules/date-coverage.js`
- `assets/js/modules/schedule-multi-ranges.js`

## Files Changed

- `index.html`
- `sw.js`
- `assets/js/modules/date-display.js`
- `assets/js/modules/notifications.js`
- `assets/js/modules/meeting-minutes.js`

## Safe Rollback Steps

1. Remove these script tags from `index.html`:
   - `assets/js/modules/date-coverage.js`
   - `assets/js/modules/schedule-multi-ranges.js`
2. Remove the two files listed under "Files Added".
3. Revert `sw.js` to the previous cache name and remove the two new module paths from `CORE`.
4. Revert the small display-only changes in:
   - `assets/js/modules/date-display.js`
   - `assets/js/modules/notifications.js`
   - `assets/js/modules/meeting-minutes.js`
5. Redeploy the frontend through GitHub/Vercel.
6. Ask users to refresh once. If the browser still shows the old UI, clear site data or unregister the service worker.

## Database Rollback

No database rollback is needed.

The multi-range schedule feature saves each selected range as a normal schedule record through the existing save APIs. It does not create new sheets, columns, or settings.

## Google Apps Script Rollback

No Apps Script rollback is needed unless a separate backend change was deployed in the same release.
