# Rollback v70.103 Help + Workspace Single Source

## Scope

This patch replaces the failed Help Center / Live Chat patch stack with one runtime source of truth.

Changed files:

- `index.html`
- `sw.js`

No Google Apps Script or database migration is required.

## What changed

- Removed the old `v70.102` Help + Workspace canonical runtime block.
- Added `haos-v70-103-help-workspace-single-source`.
- Bumped the service worker cache to `haos-v70-103-help-workspace-single-source`.
- Help Center / Live Chat settings now use a div/grid renderer instead of the unstable table renderer.
- If an older Help settings table is opened by legacy code, the new runtime detects and converts it back to the stable renderer.
- The old Help card in the Super Admin grid remains hidden and the Help card is installed inside Advanced System Tools.
- Workspace edit still closes the stale response modal before opening the edit modal.

## Rollback Steps

1. In `index.html`, remove these blocks near the end of the file:
   - `<style id="haos-v70-103-help-workspace-single-source-style"> ... </style>`
   - `<script id="haos-v70-103-help-workspace-single-source-script"> ... </script>`
2. In `sw.js`, change:
   - `haos-v70-103-help-workspace-single-source`
   - back to the previous cache name.
3. Redeploy to Vercel and hard refresh the browser or clear site data.

## Verification

- Open Advanced System Tools and click Help Center / Live Chat settings.
- Wait at least 3 seconds. The list should stay in the stable grid layout.
- Open a workspace response popup, then edit a different workspace. The stale response popup should close before the edit popup appears.
