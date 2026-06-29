# Rollback v70.116 IT Asset Date / Export / Main Module Alignment

## Scope

Rollback note for changes after `v70.115 public IT asset manager edit`.

Changed files:

- `Code.gs.txt`
- `public.html`
- `index.html`
- `sw.js`

## What v70.116 changed

- Corrects IT asset acquired dates that were imported/displayed as early Buddhist years such as `2507` when the asset code indicates fiscal year `/64`.
- Uses all asset identity hints (`assetCode`, `assetNumber`, name, category, spec, fiscal year) instead of only `assetNumber` when correcting acquired dates.
- Adds a Thai display-date parser for values like `6 • พฤษภาคม • 2507` so legacy malformed values can be corrected while loading.
- Adds `smartCategory`, executive summary, and public-dashboard-style filters to `getITAssetModuleDataV70`.
- Updates the main IT Asset module table to show smart category, acquired date, value, and a smart category filter.
- Restricts the bulk `Export CSV` button in the public IT Asset portal to users with IT Asset manager/admin/super admin permission.
- Bumps the service worker cache key to `haos-v70-116-itasset-date-export-main`.

## Rollback steps

1. Restore `Code.gs.txt`, `public.html`, `index.html`, and `sw.js` from the commit immediately before v70.116.
2. Redeploy Vercel/GitHub files.
3. Update Google Apps Script only if `Code.gs.txt` had already been pasted/deployed.
4. Ask users to hard refresh once, or wait for the service worker cache to rotate.

## Data safety

This change does not migrate or delete spreadsheet rows. It corrects display/normalization while loading and saving IT asset records.
