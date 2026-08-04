# Dashboard Builder Public Sharing v70.134

Phase 6 adds optional read-only public links to Dashboard Builder. Public sharing is disabled by default and does not change the existing HAOS viewer/editor permissions.

## Workflow

1. The owner or an Admin opens a saved Dashboard with status `active`.
2. Open **Public** and choose the columns that may be disclosed.
3. Optionally set a 4-8 digit PIN, an expiry date/time, and CSV export permission.
4. Save and distribute the generated `/dashboard/public/:token` link.
5. Revoke the link or regenerate it at any time. Regeneration invalidates the previous link immediately.

The public page has no edit controls and does not require a HAOS account. It renders only the whitelisted columns, compatible widgets, and compatible filters returned by Apps Script.

## Security model

- Only the Dashboard owner, Admin, or Super Admin can manage a public link.
- A Dashboard must be active before its public link can be enabled.
- Links use a signed, versioned token and cannot be derived from a Dashboard ID alone.
- Revoking or regenerating a link is enforced by Apps Script, not only by the browser.
- Public rows are rebuilt server-side with only the allowed columns.
- Widgets and filters referencing hidden columns are removed or reduced server-side.
- Optional PIN failures are rate-limited for ten minutes.
- A PIN-protected link does not reveal the Dashboard title, description, department, rows, or schema before the PIN is accepted.
- Each successful public view is recorded in `DashboardAudit` as `PUBLIC_VIEW`.
- Search engines are instructed not to index or archive the public viewer.

## Storage

The release creates one isolated sheet on first use:

| Sheet | Purpose |
| --- | --- |
| `DashboardPublicLinks` | Link state, expiry, PIN hash, export permission, visible columns, access count and token version |

No columns are added to `DashboardProjects`, `DashboardDatasets`, `DashboardDataChunks`, or `DashboardVersions`.

## Routes

- `/dashboard/public/:token` - canonical public viewer.
- `/dashboard/public?token=...` - query-string fallback.

Both routes are rewritten to `dashboard-public.html`, so opening a link directly or refreshing it works on Vercel.

## Limits

- Public sharing inherits the Dashboard Builder limit of 20,000 rows.
- CSV export appears only when the owner explicitly enables it.
- Disabling CSV export removes the built-in export action; it cannot prevent a viewer from manually copying information already visible in their browser.
- The public page is read-only. Comments, edits, and anonymous data submission are not part of Phase 6.
- A public link is still sensitive information. Use a PIN and expiry when the Dashboard contains internal information.

## Deployment

1. Copy the updated `Code.gs.txt` to Google Apps Script and deploy a new Web App version.
2. Commit and push the web files to the Vercel production branch.
3. Wait for the deployment to be Ready, then hard-refresh the Dashboard Builder.
4. Create a test Dashboard with non-sensitive data and verify enable, PIN, expiry, export, regenerate, and revoke.

Rollback steps are in `docs/ROLLBACK_DASHBOARD_BUILDER_PUBLIC_SHARING.md`.
