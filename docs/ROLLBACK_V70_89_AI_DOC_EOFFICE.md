# Rollback v70.89 AI Document Summary Phase 2 + e-Office

## Files To Revert

- `assets/js/modules/ai-document-summary.js`
- `assets/css/ai-document-summary.css`
- `assets/js/modules/e-office.js`
- `assets/css/e-office.css`
- `index.html`
- `sw.js`
- `Code.gs.txt`

## Database Rollback

If e-Office is not used, delete this sheet from the Google Sheet database:

- `EOfficeDocuments`

Keep this existing sheet unless you want to remove AI document summary history too:

- `AIDocumentSummaries`

If you want to clear only AI document summary test data, delete test rows from `AIDocumentSummaries` instead of deleting the whole sheet.

## Apps Script Rollback

Remove or revert these functions from `Code.gs.txt`:

- `deleteAIDocumentSummaryV788`
- `getEOfficeDocumentSheetV789_`
- `getEOfficeDocumentsV789`
- `saveEOfficeDocumentV789`
- `deleteEOfficeDocumentV789`
- `createEOfficeFromAISummaryV789`
- `bridgeWhitelistHealthCheckV789`
- the v70.89 `getAllowedBridgeFunctions_` wrapper

Also remove this constant if rolling back e-Office completely:

- `SHEET_E_OFFICE_DOCUMENTS`

## Cache Note

After rollback, bump `CACHE_NAME` in `sw.js` again so browsers do not keep the v70.89 files.
