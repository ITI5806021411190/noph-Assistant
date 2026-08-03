# Rollback Dashboard Builder MVP v70.132

## Routing hotfix v70.133

Vercel `cleanUrls` requires extensionless rewrite destinations. The routing hotfix changes the Dashboard Builder destination from `/dashboard-builder.html` to `/dashboard-builder` and aligns the Service Worker cache with that canonical URL.

The hotfix changes only:

- `vercel.json`
- `sw.js`
- `tests/dashboard-builder/dashboard-builder.test.mjs`

It does not change Google Apps Script or any database sheet. To roll back only this hotfix, revert those three files to the preceding commit and push to `main`. No Google Apps Script deployment or database cleanup is required.

Dashboard Builder is isolated from existing HAOS data. Its five sheets are created only after first use:

- `DashboardProjects`
- `DashboardDatasets`
- `DashboardDataChunks`
- `DashboardVersions`
- `DashboardAudit`

## Code rollback

1. Revert the commit that introduces `v70.132-dashboard-builder-mvp`.
2. Update `Code.gs.txt` in Google Apps Script with the reverted copy and deploy a new Web App version.
3. Push the reverted web files so Vercel redeploys and the Service Worker cache changes.

Files introduced by this release:

- `dashboard-builder.html`
- `assets/css/dashboard-builder.css`
- `assets/css/dashboard-builder-enhancements.css`
- `assets/js/dashboard-builder/`
- `assets/js/modules/dashboard-builder-entry.js`
- `tests/dashboard-builder/`

Files changed by this release:

- `Code.gs.txt`
- `index.html`
- `vercel.json`
- `sw.js`
- `package.json`

## Database rollback

Do not delete sheets before exporting a backup. Existing HAOS sheets are not modified by Dashboard Builder.

1. Export the five Dashboard Builder sheets or make a Google Sheets copy.
2. Remove the Dashboard Builder code and deploy it first.
3. Delete the five sheets only when no dashboard must be retained.

Deleting only the five sheets does not affect Users, schedules, reports, shared workspaces, IT assets, Popular Vote, or Jigsaw.

## MVP limits and known constraints

- CSV/XLS/XLSX file limit: 15 MB.
- Dataset limit: 20,000 rows. Upload chunks are sized dynamically below the Google Sheets cell limit.
- Preview limit: 500 rows.
- Google Sheets must be accessible to the account that owns/deploys the Apps Script Web App.
- Microsoft Access must be exported to CSV/XLSX first.
- Scheduled Google Sheets refresh and public dashboards are intentionally excluded from this MVP.
- Authentication reuses the existing HAOS user record and a 12-hour signed Dashboard Builder session. It does not introduce a second login system.
