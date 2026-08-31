# Rollback v70.145 Schedule Tab UI

This patch removes the duplicate Schedule action bar and places pending approvals inside the unified Schedule panel. It does not change Schedule, recurring-rule or approval data.

## Files

- `assets/css/schedule-tab-ui.css`
- `assets/js/modules/schedule-tab-ui.js`
- `index.html`
- `sw.js`
- `package.json`
- `tests/schedule-tab-ui/schedule-tab-ui.test.mjs`

## Rollback

1. Remove the v70.145 CSS and JavaScript references from `index.html` and `sw.js`.
2. Delete the two v70.145 frontend assets and their test.
3. Restore the previous package version and Service Worker cache name.
4. Run the Schedule and Dashboard regression tests.

No database or Google Apps Script rollback is required.
