# Rollback v70.101 Advanced Help + Workspace Modal

## Scope
- Moves Help Center / Live Chat settings out of the Super Admin card grid and into Advanced System Tools.
- Replaces Help contact settings with a stable non-table renderer to avoid legacy table layout mutation.
- Prevents the old workspace response modal from staying behind the workspace edit popup.
- Bumps service worker cache to `haos-v70-101-advanced-help-workspace-modal`.

## Rollback
1. In `index.html`, remove these blocks:
   - `<style id="haos-v70-101-advanced-help-workspace-modal-style"> ... </style>`
   - `<script id="haos-v70-101-advanced-help-workspace-modal-script"> ... </script>`
2. In `sw.js`, change:
   - `haos-v70-101-advanced-help-workspace-modal`
   - back to `haos-v70-100-help-workspace-hardening`
3. Redeploy GitHub/Vercel and hard refresh the browser.

## Notes
- This rollback does not touch Google Apps Script or database sheets.
- No database schema changes were added in this patch.
