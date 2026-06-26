# Rollback v70.112 Public IT Asset Detailed Read-only Dashboard

## Scope

This update adds a detailed read-only login mode to the public IT Asset / Software License dashboard.

Changed files:

- `Code.gs.txt`
- `public.html`
- `sw.js`

New Apps Script bridge functions:

- `getPublicITAssetDetailedDashboardV7112`
- `bridgeWhitelistHealthCheckV7112`

No database schema changes are required. The feature reads existing sheets only:

- `ITAssets`
- `ITSoftware`
- `ITLicenses`
- `ITAssetSoftwareMap`
- `ITRepairTickets`

## Rollback Steps

1. Remove the `v70.112` functions from `Code.gs.txt`:
   - `haosV7112PublicAssetLogin_`
   - `haosV7112CountBy_`
   - `haosV7112Unique_`
   - `haosV7112BuildAssetLicenseDetails_`
   - `getPublicITAssetDetailedDashboardV7112`
   - `bridgeWhitelistHealthCheckV7112`
2. Remove `getPublicITAssetDetailedDashboardV7112` and `bridgeWhitelistHealthCheckV7112` from `getAllowedBridgeFunctions_()`.
3. Remove the `v70.112` style and script blocks from `public.html`.
4. Revert `CACHE_NAME` in `sw.js` to the previous value.
5. Redeploy Vercel and update Google Apps Script.
6. Hard refresh the browser or unregister the service worker if an old cached page persists.

## Database Rollback

No database rollback is needed. This patch does not create, update, or delete database rows except writing an audit entry when a user opens the detailed public dashboard.
