# Rollback v70.122 - IT Asset Import Primary Code

## Scope

This patch changes only the Google Apps Script backend import behavior in `Code.gs.txt`.

## What Changed

- Treat `assetCode` / รหัสครุภัณฑ์ as the primary import key.
- If an incoming row has an `assetCode`, the import updates only the same `assetCode`; it no longer falls back to duplicate GFMIS/asset number keys.
- GFMIS placeholder values such as `-`, `ต่ำกว่าเกณฑ์`, `ไม่มี`, `ไม่ระบุ`, and similar empty markers are ignored as import keys.
- Import response and audit detail now include match counters for `matchedById`, `matchedByCode`, `matchedByNumber`, and `matchedBySerial`.

## Why

The source Excel has 321 unique asset codes, but many rows share placeholder or repeated GFMIS values. Previous import logic used GFMIS fallback too broadly, so rows were updated over each other instead of appended. This caused imports to end with 94 or 217 rows instead of 321.

## Validation

Using the attached files:

- Source workbook: 321 unique asset codes
- Current exported data: 217 unique asset codes
- Simulated v70.122 re-import:
  - Updated existing: 217
  - Inserted missing: 104
  - Expected total after re-import: 321

## Rollback

Restore `Code.gs.txt` from the previous stable version, `v70.121-it-asset-pagination-import-audit`, then deploy Google Apps Script again.

No Vercel or `sw.js` rollback is required for this patch because it does not change frontend assets.
