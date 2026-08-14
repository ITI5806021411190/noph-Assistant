# Dashboard Builder Google Sheet Sync v70.139

Phase 6.10 and 6.11 add manual and scheduled refresh for dashboards whose saved source type is `google`.

## User Flow

1. Open a Google Sheets-backed Dashboard that you can edit.
2. Select `ซิงก์ Google Sheet`.
3. Use `ซิงก์ตอนนี้` for an immediate refresh, or enable Scheduled Sync.
4. Choose 15 minutes, 30 minutes, 1 hour, 6 hours, or daily.
5. Optionally notify the Dashboard owner when a sync first enters a failed state.

The public Dashboard reads the active dataset pointer. It sees the refreshed data on its next page load or refresh. An already-open public page is not pushed live in this phase.

## Data Safety

- The source URL, selected sheet and header row come from the saved Dataset metadata.
- A sync stops with `SCHEMA_CHANGED` if source columns were added or removed. The owner must review the Dashboard before adopting a new schema.
- Rows are capped at 20,000 and stored in bounded chunks.
- The server writes a new Dataset and Version first, then switches the Dashboard pointer in one project-row write.
- A failed staged write is cleaned up and the prior Dataset remains active.
- Layout, widgets, filters, permissions and public-link settings are not rewritten.
- A script lock prevents concurrent Dataset switches.

## Database Sheets

The feature creates these sheets on first use. No manual migration is required.

- `DashboardSyncSettings`: one scheduling/status row per Dashboard.
- `DashboardSyncLog`: append-only success and failure history.

## Scheduler

The first enabled schedule creates one Apps Script time trigger for `runDashboardScheduledSyncV7139`. It wakes every 15 minutes, selects due dashboards, and processes at most three per run within a bounded runtime. Disabling the final schedule removes the trigger.

The Apps Script owner may be asked to authorize trigger access the first time Scheduled Sync is enabled.

## Deployment

1. Copy the v70.139 block from `Code.gs.txt` to the existing Google Apps Script project and deploy a new Web App version.
2. Commit and push the frontend files to the existing Vercel production branch.
3. Wait for the Vercel deployment to become Ready, then hard-refresh the browser.

No Firebase, Supabase, or separate database deployment is needed.
