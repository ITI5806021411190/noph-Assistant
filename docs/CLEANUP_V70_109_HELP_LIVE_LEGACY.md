# Cleanup v70.109 Help Live Chat Legacy Patches

## Goal

Clean up failed/obsolete frontend remnants from the Help Center / Live Chat patch sequence:

- `V70_96_HELP_UPCOMING_FIXES`
- `haos-v70-97-help-live-chat-table-fix`
- `haos-v70-98-help-live-chat-stable-render`
- `v70.99-admin-help-workspace-fixes`
- `v70.100-help-workspace-hardening`
- `V70_102_HELP_WORKSPACE_CANONICAL`
- `v70.103-help-workspace-single-source`
- `Rebuild Help Center settings renderer v70.104`
- `Move Help Center Live Chat to standalone module v70.105`
- `Fix Help Center contact layout with card renderer v70.106`
- `Stabilize Help Live Chat contact cards v70.107`

## Removed From Runtime

- Deleted `assets/css/help-live-chat.css`.
- Removed the Help CSS reference from `index.html`.
- Removed the Help CSS cache entry from `sw.js`.
- Replaced `assets/js/modules/help-live-chat.js` with a small standalone-page entry module.
- Removed the old v70.104 Help settings table/card renderer functions from `index.html`.
- Removed the old admin Help inbox popup renderer functions from `index.html`.
- Removed the old inactive Super Admin Help card insertion body from `index.html`.

## Kept Intentionally

- `help-live.html`: current v70.108+ standalone Help settings/inbox page.
- Existing Apps Script functions such as `getHelpSupportContactSettingsV713`, `saveHelpSupportContactSettingsV713`, and Help chat APIs.
- User-facing `openHelpLiveChatV713()` in `index.html`, because the normal Help button still uses it for user live chat.
- Legacy global function names in `index.html` and `assets/js/modules/help-live-chat.js`, but only as redirects to `help-live.html`. These prevent old buttons or cached markup from throwing errors.
- Old rollback docs in `docs/`, because they are audit/reference material and are not loaded by the app.

## Database / Apps Script

No database changes and no Google Apps Script changes are required for this cleanup.

## Rollback

Rollback is frontend-only:

1. Restore `assets/js/modules/help-live-chat.js` from the previous commit.
2. Restore the Help CSS reference in `index.html` and `/assets/css/help-live-chat.css` if returning to v70.105-v70.107.
3. Restore the `sw.js` cache name and cached Help CSS path.
4. Redeploy Vercel and hard refresh the browser.
