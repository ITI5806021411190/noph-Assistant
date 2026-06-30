# Rollback v70.121 IT Asset Pagination / Import Audit

## Scope
- `assets/js/modules/it-asset-import.js`
  - Adds 20-row pagination to the main IT Asset table.
  - Adds Excel import per-sheet preview counts.
  - Adds column-position fallback for the standard asset workbook layout.
- `Code.gs.txt`
  - Adds `haosV7111ImportKey_()` so placeholder keys such as `-` are not used for duplicate matching.
  - Applies the same key cleanup to existing-row indexes during import.
- `sw.js`
  - Bumps cache to `haos-v70-121-itasset-pagination-import-audit`.

## Rollback
Restore these files from v70.120:
- `assets/js/modules/it-asset-import.js`
- `Code.gs.txt`
- `sw.js`

No database deletion is required. If records were imported after v70.121 and need to be removed, use the existing database repair/cleanup tools or restore from a backup snapshot.

## Verification
- Open IT Asset Registry in the main app.
- Confirm table shows 20 records per page with paging controls.
- Re-import the asset Excel file and confirm the preview reads 320 computer rows plus 1 program row before confirming import.
