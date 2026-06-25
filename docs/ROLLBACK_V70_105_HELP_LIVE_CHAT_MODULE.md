# Rollback v70.105 Help Live Chat Module

## Scope

This update moves Help Center / Live Chat admin settings out of the old SweetAlert/table renderer and into a standalone frontend module:

- `assets/css/help-live-chat.css`
- `assets/js/modules/help-live-chat.js`
- `index.html` now loads the new Help module assets.
- `sw.js` cache name is bumped to `haos-v70-106-help-live-chat-cards`.
- `index.html` loads Help assets with `?v=70106` to avoid stale browser/service-worker cache.
- The old v70.104 inline Help settings rebuild block was removed from `index.html`.
- The legacy Super Admin Help card injector now returns early, so Help Center / Live Chat lives under Advanced System Tools only.

No Google Apps Script or database schema changes are required. The module still uses the existing Apps Script functions:

- `getHelpSupportContactSettingsV713`
- `saveHelpSupportContactSettingsV713`
- `getHelpChatInboxV713`
- `getHelpChatMessagesV713`
- `sendHelpChatMessageV713`
- `closeHelpChatSessionV713`

## Rollback Steps

1. Remove these asset references from `index.html`:
   - `assets/css/help-live-chat.css`
   - `assets/js/modules/help-live-chat.js`
2. Restore the previous service worker cache name and remove these files from `CORE`:
   - `/assets/css/help-live-chat.css`
   - `/assets/js/modules/help-live-chat.js`
3. Remove the `?v=70106` query strings from the Help CSS/JS references if returning to the previous v70.104 patch state.
4. If returning to the old Super Admin card, remove the early `return;` inside `injectAdminSupportToolsV713()`.
5. Redeploy Vercel and hard refresh/clear site data so the browser drops the v70.105 service worker cache.

## Notes

The new module also watches for the old SweetAlert settings title and closes it if a cached page or older button somehow tries to open it.
