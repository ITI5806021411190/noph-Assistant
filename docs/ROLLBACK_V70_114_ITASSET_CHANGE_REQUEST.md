# Rollback v70.114 IT Asset Change Request

## Scope

- Fix IT Asset date normalization/display for Buddhist Era input and public dashboard display.
- Add `ITAssetChangeRequests` sheet for user/head change requests.
- Add public dashboard buttons for "ขอแก้ไข" and IT/admin review.
- Bump service worker cache to `haos-v70-114-itasset-change-request`.

## Files

- `Code.gs.txt`
- `public.html`
- `sw.js`
- `docs/ROLLBACK_V70_114_ITASSET_CHANGE_REQUEST.md`

## Rollback Steps

1. Restore `Code.gs.txt`, `public.html`, and `sw.js` from the previous stable commit/tag before v70.114.
2. If no request data must be kept, remove the Google Sheet tab `ITAssetChangeRequests`.
3. If request history should be retained for audit, keep `ITAssetChangeRequests`; the old UI will ignore it.
4. Redeploy Google Apps Script after restoring `Code.gs.txt`.
5. Push restored frontend files to GitHub/Vercel and hard refresh the browser once.

## Data Safety

Approving a request updates the real `ITAssets` row. Pending or rejected requests do not change `ITAssets`.
