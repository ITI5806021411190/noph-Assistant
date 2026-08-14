# Rollback Dashboard Builder Google Sync v70.139

## Application Rollback

1. Revert the v70.139 frontend and `Code.gs.txt` commit.
2. Deploy the reverted Google Apps Script code as a new Web App version.
3. Push the reverted frontend to the existing Vercel production branch.
4. In Apps Script `Triggers`, delete `runDashboardScheduledSyncV7139` if it remains.

Existing Dashboard projects and active datasets remain valid because this feature does not alter their sheet schemas.

## Optional Database Cleanup

Keep `DashboardSyncSettings` and `DashboardSyncLog` for audit history by default. If the feature is permanently retired and the trigger is deleted, those two sheets can be archived or removed. Do not delete `DashboardProjects`, `DashboardDatasets`, `DashboardDataChunks`, `DashboardVersions`, `DashboardAudit`, or `DashboardPublicLinks`.

## Data Recovery

Each successful refresh creates a new Dataset and Version. Reverting application code does not automatically point a Dashboard back to its previous Dataset. If a data-level rollback is needed, use the recorded `Previous Dataset ID` in `DashboardSyncLog` and restore that pointer only after verifying the Dataset and its chunks still exist.
