# Rollback Dashboard Builder Phase 6.2-6.3 v70.136

## Rollback boundary

Revert only the `v70.136` release commit. Do not reset or rewrite repository history.

Runtime files in this release:

- `dashboard-builder.html`
- `dashboard-public.html`
- `assets/css/dashboard-builder-enhancements.css`
- `assets/css/dashboard-viewer.css`
- `assets/js/dashboard-builder/app.js`
- `assets/js/dashboard-builder/renderer.js`
- `assets/js/dashboard-builder/viewer-ui.js`
- `Code.gs.txt`
- `sw.js`
- `package.json`

Supporting files:

- `tests/dashboard-builder/dashboard-builder.test.mjs`
- `docs/DASHBOARD_BUILDER_MVP.md`
- `docs/DASHBOARD_BUILDER_LAYOUT_PRESENTATION.md`
- this rollback document

## Safe rollback procedure

1. Record the `v70.136` commit hash after it is committed.
2. Create a normal Git revert commit:

```powershell
git revert <v70.136-commit-hash>
```

3. Push the revert commit and wait for the Vercel Production deployment to become Ready.
4. Copy the reverted `Code.gs.txt` to Google Apps Script and create a new deployment version only if the v70.136 backend was previously deployed.
5. Hard refresh or unregister the old Service Worker if a browser retains v70.136 assets.
6. Run `npm run test:dashboard-builder` and open authenticated/public Dashboard routes.

## Database impact

No sheet, row, or column is created by this release. Existing dashboards saved during v70.136 may retain optional config fields (`layoutVersion`, `theme`, `density`, widget `height`). The previous renderer ignores unknown optional fields, so database cleanup is not required for rollback.

Do not delete Dashboard projects, datasets, versions, audit records, or public links during rollback.
