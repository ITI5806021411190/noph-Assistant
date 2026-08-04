# Rollback - Dashboard Builder Phase 6.1 Viewer Refresh

Version: `v70.135`

This phase has no database migration. Rollback only affects static frontend files.

## Preferred rollback

Revert the commit that introduces `v70.135-dashboard-viewer-ui`, then push the revert to the production branch.

## Manual rollback scope

1. Remove:
   - `assets/css/dashboard-viewer.css`
   - `assets/js/dashboard-builder/viewer-ui.js`
2. Restore `dashboard-builder.html` and `dashboard-public.html` asset references from `v=70135` to `v=70134` and remove the two viewer asset references.
3. Restore `sw.js` cache name and Dashboard asset list to `v70.134`.
4. Restore `assets/js/dashboard-builder/renderer.js` by removing the render statistics event and `activeFilterCount` export.
5. Restore the Dashboard Builder regression test expectations to `v=70134`.

## Database rollback

Not required. Do not remove or edit Dashboard sheets, public links, audit records, or Apps Script functions.
