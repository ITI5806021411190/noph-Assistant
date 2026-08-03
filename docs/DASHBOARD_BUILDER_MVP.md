# Dashboard Builder MVP v70.132

Dashboard Builder is a standalone HAOS tool at `/it-services/dashboard-builder`. It reuses the current HAOS account, then exchanges it for a signed 12-hour module session. It does not add another login form.

## Routes

- `/it-services/dashboard-builder` - dashboard list and recent work.
- `/it-services/dashboard-builder/new` - create a dashboard.
- `/it-services/dashboard-builder/view/:id` - read-only viewer, subject to backend permission.
- `/it-services/dashboard-builder/edit/:id` - editor, subject to backend permission.

Vercel rewrites these routes to `dashboard-builder.html`; direct refresh therefore does not return 404.

## MVP workflow

1. Create dashboard metadata or choose a template.
2. Import CSV, XLS, XLSX, or a Google Sheets URL. Workbooks and Google Sheets support sheet selection and a custom header row.
3. Review inferred column types and exclude or rename columns.
4. Build a responsive dashboard from KPI, bar, line, pie/donut, table, and filter widgets. Data tables include search, sorting, page size, pagination, and safe CSV export.
5. Set visibility to private, group, selected users, or organization, then save.

Microsoft Access is intentionally not parsed in the browser. Export Access data to CSV or XLSX first.

## Storage model

The module creates these sheets on first use only:

| Sheet | Purpose |
| --- | --- |
| `DashboardProjects` | Metadata, owner, permissions, status, current dataset and JSON layout |
| `DashboardDatasets` | Source information, schema and row/chunk counts |
| `DashboardDataChunks` | Sanitized data in size-aware JSON chunks |
| `DashboardVersions` | Dashboard configuration snapshots |
| `DashboardAudit` | Create, update, view, data update, duplicate and delete events |

New data is staged under a new dataset ID. The project switches to it only after all chunks have been counted and finalized, so an interrupted upload does not replace the previous usable dataset.

The original upload file is not retained in this MVP. The system stores sanitized rows, source metadata, inferred schema and dashboard configuration. Google Sheets imports keep the spreadsheet ID, selected sheet and header row as metadata.

## Configuration shape

The project configuration is JSON and has one rendering path for preview and saved dashboards:

```json
{
  "version": 1,
  "widgets": [
    {
      "id": "widget-id",
      "type": "kpi|bar|line|pie|table|filter",
      "title": "Widget title",
      "dimension": "column-name",
      "metric": "column-name",
      "aggregation": "sum|average|count|min|max",
      "width": 3
    }
  ]
}
```

Dataset metadata records the source type/name, spreadsheet and sheet details when applicable, row and chunk counts, schema JSON, creator and timestamps. Dataset rows are split into bounded JSON chunks to remain below the Google Sheets cell-size limit.

## AI assistance

The AI action sends only column metadata and a small sample, then returns a proposed widget configuration. The proposal remains editable and is not saved until the user confirms the wizard. Raw full datasets are not sent by the Dashboard Builder AI action.

## Extension points

- Add a chart type in `assets/js/dashboard-builder/renderer.js`, then expose it in the widget type control in `dashboard-builder.html`. Keep the same JSON widget contract so preview and viewer remain identical.
- Add a browser data connector in `assets/js/dashboard-builder/data-connectors.js`. Connectors should return normalized `headers`, `rows`, `schema` and `source` metadata.
- Add a server-side connector as an Apps Script function in `Code.gs.txt`, whitelist it in the Vercel bridge, and enforce the signed module session and source-specific permission checks there.

## Permissions

- **Private:** owner and administrators.
- **Group:** users in the owner department, owner and administrators.
- **Selected users:** explicit viewers/editors, owner and administrators.
- **Organization:** all active HAOS users; editing remains owner/editor/admin only.
- Deleting requires owner or administrator permission.

Both the frontend and Apps Script validate permissions. Frontend checks are for usability; the backend is authoritative.

## Security and limits

- Files are limited to 15 MB and datasets to 20,000 rows.
- Preview and schema inspection use at most 500 rows; the separate preview window uses at most 5,000 rows.
- Formula-like CSV values beginning with `=`, `+`, `-`, or `@` are neutralized before storage.
- Table CSV export neutralizes formula-like values again before download.
- Dashboard config, schema and data chunks are capped below the Google Sheets 50,000-character cell limit.
- Google Sheets import uses the Apps Script deployer's access. A sheet the deployer cannot open is rejected.
- Public anonymous dashboards, scheduled refresh and direct Access connections are outside this MVP.

## Files

New runtime files:

- `dashboard-builder.html`
- `assets/css/dashboard-builder.css`
- `assets/css/dashboard-builder-enhancements.css`
- `assets/js/dashboard-builder/data-connectors.js`
- `assets/js/dashboard-builder/renderer.js`
- `assets/js/dashboard-builder/app.js`
- `assets/js/modules/dashboard-builder-entry.js`

Integration files changed: `Code.gs.txt`, `index.html`, `vercel.json`, `sw.js` and `package.json`.

## Known MVP constraints

- Anonymous/public links are not implemented; every viewer must be an active HAOS user.
- Scheduled refresh, external REST/database connectors and direct Microsoft Access import are not implemented.
- Dashboard PDF/image export and server-side chart rendering are not implemented. Table data can be exported safely to CSV.
- Upload parsing runs in the browser; the 15 MB and 20,000-row limits protect browser and Google Sheets performance.
- Google Sheets access follows the Apps Script deployer account, not a separate per-user Google OAuth connection.

## Verification

Run:

```powershell
npm run test:dashboard-builder
```

Also copy `Code.gs.txt` to a temporary `.js` file and run `node --check` before deploying Apps Script.

Rollback steps are in `docs/ROLLBACK_DASHBOARD_BUILDER_MVP.md`.
