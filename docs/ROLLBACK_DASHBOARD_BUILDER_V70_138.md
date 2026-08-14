# Dashboard Builder v70.138 rollback

## Baseline

- Stable source before this hardening pass: commit `a437170` (`v70.137`).
- This pass does not change Google Apps Script functions or database sheets.

## Scope

- Dashboard renderer lifecycle and Chart cleanup.
- Viewer summary recovery when rendering finishes before Viewer UI initialization.
- Table interaction state across dashboard re-renders.
- Touch-safe widget ordering and resize cancellation.
- Legacy schema compatibility and atomic Private Copilot layout updates.
- Dashboard asset cache version `70138`.
- Local browser regression harness for repeated render, filters, tables, charts and responsive layout.

## Rollback

After the v70.138 changes are committed, prefer reverting that single commit from GitHub Desktop or with:

```powershell
git revert <v70.138-commit>
```

Before the commit exists, restore only the files listed by `git diff --name-only` from baseline `a437170`. Do not reset the repository or overwrite unrelated work.

No Google Sheet migration or GAS rollback is required for this version.
