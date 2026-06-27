# Rollback v70.115 Public IT Asset Manager Edit

Use this note if v70.115 causes issues in the public IT Asset portal.

## Scope

- `public.html`
  - Revert the public IT Asset portal script from `v70.115-public-itasset-manager-edit` back to `v70.114-itasset-change-request`.
  - Remove direct edit buttons and per-item copy/export/print/image actions if needed.
  - Restore the detailed asset table to six columns if the new index column causes layout issues.

- `Code.gs.txt`
  - Remove `savePublicITAssetV7115`, `haosV7115NormalizeAssetFieldsForSave_`, `bridgeWhitelistHealthCheckV7115`, and the v70.115 bridge whitelist override.
  - Keep or remove `haosV7115CorrectAssetDateByFiscal_` depending on whether the date correction is desired. It is read-safe and only corrects clearly mismatched old Excel dates by fiscal year/asset number.

- `sw.js`
  - Restore `CACHE_NAME` to `haos-v70-114-itasset-change-request`.

## Data Impact

- No schema migration is required.
- v70.115 direct edits update existing `ITAssets` rows through the existing `saveITAssetV70` flow and audit log.
- Rolling back code does not automatically revert asset data that a manager edited from the public portal. Revert individual rows from backup/audit if needed.

## Verification After Rollback

1. Open `public.html?module=itasset-dashboard`.
2. Login with a normal user and confirm only "ขอแก้ไข" is available.
3. Login with IT Manager/Admin/Super Admin and confirm the page behaves like v70.114.
4. Clear browser cache or wait for the service worker cache name rollback to activate.
