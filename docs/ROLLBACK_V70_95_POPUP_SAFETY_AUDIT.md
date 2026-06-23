# Rollback: v70.95 Popup Safety Audit

## Purpose

This patch audits and stabilizes popup layering across Health Assistant OS:

- SweetAlert2 confirmation dialogs
- Bootstrap modals and backdrops
- Schedule/calendar detail popups
- Notification Center open-item behavior
- Focus trap behavior when SweetAlert is shown above a Bootstrap modal

## Files changed

- `index.html`
- `sw.js`
- `docs/ROLLBACK_V70_95_POPUP_SAFETY_AUDIT.md`

## No database changes

This patch does not change Google Sheet structure, Google Apps Script, or stored data.

## Rollback steps

1. In `index.html`, remove these blocks:
   - `<style id="haos-v70-95-popup-safety-audit-style"> ... </style>`
   - `<script id="haos-v70-95-popup-safety-audit-script"> ... </script>`

2. In `sw.js`, restore the cache name:

   ```js
   const CACHE_NAME = 'haos-v70-95-calendar-booking-register-hotfix';
   ```

3. Upload/deploy only:
   - `index.html`
   - `sw.js`

4. Hard refresh the browser or unregister the old service worker if the old UI is still cached.

## Expected restored state

The system returns to `haos-v70-95-calendar-booking-register-hotfix`, keeping the public booking to register hotfix but removing the popup-layer safety patch.
