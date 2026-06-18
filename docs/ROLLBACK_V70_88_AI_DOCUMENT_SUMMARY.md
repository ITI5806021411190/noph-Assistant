# Rollback V70.88 - AI Document Summary

## Scope

This patch adds the "สรุปเอกสารด้วย AI" module in IT Services Hub.

## Files Changed

- `index.html`
- `sw.js`
- `Code.gs.txt`
- `assets/css/ai-document-summary.css`
- `assets/js/modules/ai-document-summary.js`

## Google Apps Script Functions Added

- `analyzeAIDocumentSummaryV788`
- `getAIDocumentSummaryHistoryV788`
- `createAIDocumentSummaryDocV788`

## Database

New sheet:

- `AIDocumentSummaries`

The sheet stores AI summary history only. It does not modify existing schedules, users, or IT Services records.

## Rollback Steps

1. Remove these references from `index.html`:

   ```html
   <link rel="stylesheet" href="assets/css/ai-document-summary.css">
   <script src="assets/js/modules/ai-document-summary.js"></script>
   ```

2. Remove these entries from `sw.js`:

   ```js
   '/assets/css/ai-document-summary.css',
   '/assets/js/modules/ai-document-summary.js',
   ```

3. Revert `CACHE_NAME` in `sw.js` to the previous deployed cache name.

4. Remove the v70.88 AI Document Summary block from `Code.gs.txt`, and remove these names from the bridge whitelist:

   ```js
   analyzeAIDocumentSummaryV788
   getAIDocumentSummaryHistoryV788
   createAIDocumentSummaryDocV788
   ```

5. Optional database cleanup:

   Delete the `AIDocumentSummaries` sheet only if you do not need AI summary history.

