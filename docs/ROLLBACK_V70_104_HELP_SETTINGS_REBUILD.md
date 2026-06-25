# Rollback v70.104 Help Settings Rebuild

## Scope

This patch rebuilds the Help Center / Live Chat settings popup at its original source.

Changed files:

- `index.html`
- `sw.js`

No Google Apps Script or database migration is required.

## What changed

- Rebuilt `supportSettingsHtmlV713()` so it no longer creates the old `<table>` layout.
- Rebuilt `filterHelpSupportUsersV713()`, `selectDefaultSupportV713()`, and `saveHelpSupportSettingsV713()` to read from the new card/grid rows.
- Removed the failed `v70.103` runtime block.
- Added `haos-v70-104-help-settings-rebuild` for:
  - Help settings CSS.
  - Moving the Help Center / Live Chat card into Advanced System Tools.
  - Hiding the legacy Super Admin Help card.
  - Closing stale shared-workspace response popups before edit.
- Bumped the service worker cache to `haos-v70-104-help-settings-rebuild`.

## Rollback Steps

1. Revert `index.html` to the previous committed version.
2. Revert `sw.js` to the previous committed version.
3. Redeploy to Vercel.
4. Clear site data or hard refresh to leave the v70.104 service worker cache.

## Verification

- Open Advanced System Tools.
- Click Help Center / Live Chat settings.
- The popup should show a stable grid/list layout, not the old table.
- Wait at least 3 seconds. The layout should not collapse into narrow text.
- Save selected contacts and confirm the status text appears in the same popup.
