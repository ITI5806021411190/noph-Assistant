# Rollback v70.125 IT Asset Custom Category Input

Patch v70.125 only changes the IT Asset frontend so IT Manager/Admin/Super Admin can type a new smart subcategory when overriding asset categories.

## Files Changed

- `index.html`
- `assets/js/modules/it-asset-import.js`
- `sw.js`

## Rollback

1. Revert `assets/js/modules/it-asset-import.js` to v70.124.
2. Change `index.html` script back to `assets/js/modules/it-asset-import.js?v=70124`.
3. Change `sw.js` cache name back to `haos-v70-124-itasset-master-data-normalize-v2` and cached module path back to `assets/js/modules/it-asset-import.js?v=70124`.

No database rollback is required. Existing manual categories already saved in `ITAssetCategoryOverrides` can remain; they are plain text values.
