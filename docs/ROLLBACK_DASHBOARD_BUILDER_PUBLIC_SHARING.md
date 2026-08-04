# Rollback Dashboard Builder Public Sharing v70.134

Public Sharing is isolated from existing Dashboard Builder projects and datasets. A rollback does not require deleting or restoring any existing Dashboard.

## Before rollback

1. Revoke active public links from Dashboard Builder when possible.
2. Export or copy the `DashboardPublicLinks` sheet if access history or link settings must be retained.
3. Record the Apps Script deployment version and Git commit currently in production.

## Code rollback

1. Revert the commit that introduces `v70.134-dashboard-public-sharing`.
2. Replace the Google Apps Script source with the reverted `Code.gs.txt` and deploy a new Web App version.
3. Push the reverted frontend files so Vercel deploys them.
4. Confirm `/`, Dashboard Builder, and existing authenticated Dashboard viewer routes still work.

Phase 6 runtime files introduced by this release:

- `dashboard-public.html`
- `assets/css/dashboard-public.css`
- `assets/js/dashboard-builder/public-viewer.js`

Files changed by this release:

- `Code.gs.txt`
- `dashboard-builder.html`
- `assets/css/dashboard-builder-enhancements.css`
- `assets/js/dashboard-builder/app.js`
- `vercel.json`
- `sw.js`
- `tests/dashboard-builder/dashboard-builder.test.mjs`
- Dashboard Builder documentation

## Database rollback

After the code rollback is deployed and a backup exists, `DashboardPublicLinks` may be deleted. Do not delete these existing sheets:

- `DashboardProjects`
- `DashboardDatasets`
- `DashboardDataChunks`
- `DashboardVersions`
- `DashboardAudit`

Keeping `DashboardPublicLinks` is also safe; reverted code will not read it. Existing Dashboard data, layouts, permissions, versions and authenticated links are unaffected.

## Verification

- `/dashboard/public/:old-token` no longer opens a public Dashboard after rollback.
- `/it-services/dashboard-builder` still lists and opens existing Dashboards.
- Private, group, selected-user and organization permissions still behave as before.
- `DashboardAudit` remains available for historical review.
