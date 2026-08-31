# Rollback v70.143 Workspace Main Tab

This patch changes navigation only. It does not migrate or rewrite Workspace rows, IDs, tokens, access policies, public links, forms, responses or Google Workspace files.

## Files

- `index.html`
- `assets/css/workspace-tab.css`
- `assets/js/modules/workspace-tab.js`
- `assets/js/modules/session-restore.js`
- `assets/js/modules/program-guide.js`
- `assets/js/modules/upcoming-agenda.js`
- `sw.js`
- `tests/workspace-tab/workspace-tab.test.mjs`

## Rollback

1. Revert the v70.143 frontend files above.
2. Restore the previous Service Worker cache name and remove the Workspace tab assets from `CORE`.
3. Run `pnpm run test:workspace-tab` and the schedule regression checks.
4. Confirm the original Workspace card is visible again inside `schedule-pane`.

No database rollback is required. Do not delete the Workspace sheet or public response data.
