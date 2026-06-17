# Rollback V70.87 - Upcoming Agenda

## Scope

This patch adds a frontend-only tab for "กำหนดการวันนี้และใกล้ถึง" and virtual Notification Center reminders.

No Google Apps Script update and no Google Sheet schema/data migration are required.

## Files Changed

- `index.html`
- `sw.js`
- `assets/js/modules/upcoming-agenda.js`

## Rollback Steps

1. Remove this script from `index.html`:

   ```html
   <script src="assets/js/modules/upcoming-agenda.js"></script>
   ```

2. Remove this cache entry from `sw.js`:

   ```js
   '/assets/js/modules/upcoming-agenda.js',
   ```

3. Revert `CACHE_NAME` in `sw.js` to the previous deployed cache name.

4. Delete or leave unused:

   ```text
   assets/js/modules/upcoming-agenda.js
   ```

## Database Rollback

No database rollback is needed. The module reads existing schedule data only and does not write daily notification rows.

