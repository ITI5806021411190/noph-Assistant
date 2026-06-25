# Rollback v70.108 Help Live Chat Standalone Page

## Scope

This update stops rendering the Help Center / Live Chat admin settings inside the main `index.html` popup/overlay flow. The buttons now open a dedicated page:

- `help-live.html`
- `assets/js/modules/help-live-chat.js`
- `index.html`
- `sw.js`

No Google Apps Script update is required, and no database schema changes are required. The standalone page uses the existing Apps Script bridge functions:

- `getHelpSupportContactSettingsV713`
- `saveHelpSupportContactSettingsV713`
- `getHelpChatInboxV713`
- `getHelpChatMessagesV713`
- `sendHelpChatMessageV713`
- `closeHelpChatSessionV713`

## Rollback Steps

1. Remove `help-live.html`.
2. Revert `assets/js/modules/help-live-chat.js` so `openSettings()` calls `open("settings")` and `openInbox()` calls `open("inbox")`.
3. Revert the two inline wrappers in `index.html`:
   - `openHelpSupportSettingsV713()`
   - `openHelpChatInboxV713()`
4. Change the Help asset query strings in `index.html` back from `?v=70108` to the previous version.
5. Remove `/help-live.html` from `sw.js` and revert `CACHE_NAME` plus Help asset query strings.
6. Redeploy Vercel and hard refresh the browser so the old service-worker cache is replaced.

## Database Rollback

No database rollback is needed. This patch only changes the frontend route and how existing buttons open Help Center / Live Chat.
