# Rollback v70.123: IT asset category override

## Scope

Patch `v70.123-it-asset-category-override` adds a manual subcategory override layer for IT assets.

Changed files:

- `Code.gs.txt`
- `assets/js/modules/it-asset-import.js`
- `sw.js`

Google Sheet side effect:

- Creates `ITAssetCategoryOverrides` automatically on first use.

## Rollback steps

1. Restore `Code.gs.txt`, `assets/js/modules/it-asset-import.js`, and `sw.js` from the previous stable version, currently `v70.122 fix IT asset import primary code matching`.
2. Redeploy Google Apps Script after restoring `Code.gs.txt`.
3. Redeploy GitHub/Vercel after restoring frontend files.
4. Clear browser cache or wait for the restored `sw.js` cache name to activate.

## Database cleanup

If the feature is rolled back permanently, the sheet `ITAssetCategoryOverrides` can be deleted or hidden.

Keeping the sheet is also safe because this patch does not overwrite the original IT asset category. It only overlays a manual category at read time.

## Verification after rollback

- IT asset list loads normally.
- Excel import still imports all rows from `v70.122`.
- Public IT Asset dashboard still opens and exports according to permissions.
- No "แก้หมวด" button appears in the main IT asset table.
