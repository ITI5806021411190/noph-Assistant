# Rollback v70.144 Dashboard HAOS Connectors

The connector reads analytics-safe fields from HAOS and stores a normal Dashboard Dataset snapshot. It does not edit the source modules.

## Privacy boundary

- Schedule titles, links, files and owner phone numbers are excluded.
- Workspace free-text, image and text-field answers are excluded. Only option counts and totals are used.
- Asset codes, GFMIS numbers, names, serials, users, phone numbers and links are excluded.
- Helpdesk requester identity, asset identity, attachments, titles and problem details are excluded.

## Files

- `Code.gs.txt`
- `dashboard-builder.html`
- `assets/js/dashboard-builder/app.js`
- `sw.js`
- `package.json`
- `tests/dashboard-builder/dashboard-builder.test.mjs`

## Rollback

1. Disable Scheduled Sync for Dashboard projects whose Dataset source type is `haos`.
2. Revert the v70.144 files above and upload the restored `Code.gs.txt` to Apps Script.
3. Existing Dashboard projects and Dataset snapshots can remain in place; they become read-only historical snapshots after the connector is removed.
4. Revoke public Dashboard links created from HAOS connector data when the snapshot should no longer be accessible.
5. Run `pnpm run test:dashboard-builder`.

No HAOS source sheet needs restoration because the connector never writes to those sheets.
