# Rollback v70.102 Help + Workspace Canonical Cleanup

## Scope
- Removed runtime patches that overlapped and conflicted:
  - `haos-v70-96-help-upcoming-fixes`
  - `haos-v70-97-help-live-chat-table-fix`
  - `haos-v70-98-help-live-chat-stable-render`
  - `haos-v70-99-admin-help-workspace-fixes`
  - `haos-v70-100-help-workspace-hardening`
  - `haos-v70-101-advanced-help-workspace-modal`
- Added one canonical patch:
  - `haos-v70-102-help-workspace-canonical`
- Bumped service worker cache to:
  - `haos-v70-102-help-workspace-canonical`

## What Changed
- Help Center / Live Chat settings no longer live in the Super Admin card grid.
- Help Center / Live Chat is added as a card in Advanced System Tools.
- The Help contact settings popup uses one stable list renderer instead of the legacy table plus multiple table mutation patches.
- Workspace edit closes the response modal before opening the edit popup to prevent stale workspace modals from sitting behind the edit form.
- The Word Cloud leak in IT Services Hub is still hidden, but now handled by the single canonical patch.

## Rollback
1. In `index.html`, remove:
   - `<style id="haos-v70-102-help-workspace-canonical-style"> ... </style>`
   - `<script id="haos-v70-102-help-workspace-canonical-script"> ... </script>`
2. In `sw.js`, change:
   - `haos-v70-102-help-workspace-canonical`
   - back to the previous cache name you want to restore.
3. Restore the removed older patch blocks only if you intentionally want the old behavior back.

## Database / Apps Script
- No database schema changes.
- No Google Apps Script update required.
