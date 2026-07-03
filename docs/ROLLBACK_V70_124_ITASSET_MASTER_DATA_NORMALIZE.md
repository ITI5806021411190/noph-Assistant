# Rollback v70.124 IT Asset Master Data Normalize

## Scope

Patch v70.124 adjusts the IT Asset and Software License data pipeline so imports and exports align more closely with the master workbook:

- Robust acquisition date parsing for Thai Buddhist Era dates, short BE years, CE dates, and Excel serial dates.
- Preserve meaningful GFMIS values such as `ต่ำกว่าเกณฑ์` and `-` in `Asset Number`.
- Convert check marks in damaged/status columns into meaningful condition text, and keep `✓` out of user-facing remarks.
- Clean legacy auto remarks such as `นำเข้าจากชีตโปรแกรมคอมพิวเตอร์`.
- Treat software/program assets as at least one license when no license map exists.
- Improve smart category priority for Software, Server, Tablet/iPad, Notebook, PC, and other device types.

## Files Changed

- `Code.gs.txt`
- `index.html`
- `assets/js/modules/it-asset-import.js`
- `public.html`
- `sw.js`

## Rollback Steps

1. Revert the four files above to the commit before `v70.124-itasset-master-data-normalize`.
2. Deploy the reverted `Code.gs.txt` to Google Apps Script.
3. Upload the reverted web files to GitHub/Vercel.
4. Refresh the app with cache cleared, or wait for the service worker cache to update.

## Validation After Rollback

- Import IT asset workbook still opens.
- Public IT Asset dashboard still loads.
- Existing manual category override continues to work.
- Export CSV still downloads.

## Notes

Rollback will restore the older behavior, including the known issues where short BE years may display as the wrong Buddhist year, `✓` may appear in condition/remark, and `ต่ำกว่าเกณฑ์` may be lost on re-import.
