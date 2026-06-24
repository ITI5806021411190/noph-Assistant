# Rollback: v70.96 Help Center + Upcoming Agenda Fixes

## Purpose

This patch fixes:

- Help Center / Live Chat contact settings popup table layout.
- Upcoming Agenda open-item behavior so it opens only the schedule detail popup.
- Upcoming Agenda lookahead selector for 3, 7, and 15 days.
- Service Worker cache bump for deployment refresh.

## Files changed

- `index.html`
- `assets/js/modules/upcoming-agenda.js`
- `sw.js`
- `docs/ROLLBACK_V70_96_HELP_UPCOMING_FIXES.md`

## No database changes

This patch does not change Google Sheets, Apps Script, or stored data.

## Rollback steps

1. In `index.html`, remove these blocks:
   - `<style id="haos-v70-96-help-upcoming-fixes-style"> ... </style>`
   - `<script id="haos-v70-96-help-upcoming-fixes-script"> ... </script>`

2. In `index.html`, restore `patchUpcomingAgendaV794()` so `agenda.openSchedule` calls `openScheduleFromNotificationV794(...)` if you need the previous behavior.

3. In `assets/js/modules/upcoming-agenda.js`, restore:

   ```js
   const LOOKAHEAD_OPTIONS = [3];
   function readLookaheadDays() {
     return 3;
   }
   ```

   Also remove `setLookaheadDays`, `lookaheadSelector`, and its toolbar/CSS/export additions.

4. In `sw.js`, restore:

   ```js
   const CACHE_NAME = 'haos-v70-95-popup-safety-audit';
   ```

5. Deploy:
   - `index.html`
   - `assets/js/modules/upcoming-agenda.js`
   - `sw.js`

6. Hard refresh or unregister the service worker if old cached UI remains.
