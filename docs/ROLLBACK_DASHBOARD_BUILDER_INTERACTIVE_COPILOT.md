# Rollback Dashboard Builder Interactive, Templates and Private Copilot v70.137

## Rollback boundary

Revert only the `v70.137` release commit with a normal Git revert. Do not reset or rewrite repository history.

Runtime files:

- `dashboard-builder.html`
- `dashboard-public.html`
- `assets/css/dashboard-builder-enhancements.css`
- `assets/js/dashboard-builder/app.js`
- `assets/js/dashboard-builder/renderer.js`
- `assets/js/dashboard-builder/viewer-ui.js`
- `assets/js/dashboard-builder/public-viewer.js`
- `Code.gs.txt`
- `sw.js`
- `package.json`

Supporting files:

- `tests/dashboard-builder/dashboard-builder.test.mjs`
- `docs/DASHBOARD_BUILDER_MVP.md`
- `docs/DASHBOARD_BUILDER_INTERACTIVE_COPILOT.md`
- this rollback document

## Safe rollback procedure

1. Record the final `v70.137` commit hash.
2. Create a revert commit:

```powershell
git revert <v70.137-commit-hash>
```

3. Push the revert and wait for Vercel Production to become Ready.
4. Restore the previous `Code.gs.txt` in Google Apps Script and create a new deployment version only if the v70.137 backend file was deployed.
5. Hard refresh the browser or unregister the old Service Worker if it retains v70.137 assets.
6. Run `npm run test:dashboard-builder` and verify authenticated and public Dashboard routes.

## Database impact

No sheet, row, or column is created, deleted, or renamed by this release. Dashboards saved during v70.137 may retain optional `layoutVersion: 3` and `interaction` fields in their existing config JSON. The v70.136 renderer ignores unknown optional fields, so database cleanup is not required.

Do not delete Dashboard projects, datasets, versions, audit records, or public links during rollback.
