# Rollback v70.113 IT Asset Category Report

## Scope
v70.113 extends the public read-only IT Asset dashboard with:
- Smart asset categories derived from asset name/spec/category.
- Executive summary cards for public detail mode after phone/PIN login.
- Extra filters for smart category and raw category.
- Print/Save PDF, PNG snapshot, and CSV export buttons.

## Changed Files
- `Code.gs.txt`
- `public.html`
- `sw.js`
- `docs/ROLLBACK_V70_113_ITASSET_CATEGORY_REPORT.md`

## Database Impact
No schema change.

The update does not add, remove, or rename sheets/columns. It only calculates `smartCategory` at read time and returns additional summary fields in `getPublicITAssetDetailedDashboardV7112`.

## Rollback Steps
1. Restore `Code.gs.txt`, `public.html`, and `sw.js` from the commit before v70.113.
2. Redeploy Vercel after restoring `public.html` and `sw.js`.
3. Paste the restored `Code.gs.txt` into Google Apps Script and deploy/update the web app.
4. Hard refresh the browser or clear site data if the service worker still serves cached files.

## Quick Validation After Rollback
- Open `/public?module=itasset-dashboard`.
- Confirm the v70.112 read-only login still appears.
- Login with phone + PIN.
- Confirm the detailed asset table loads without smart category/export controls.
