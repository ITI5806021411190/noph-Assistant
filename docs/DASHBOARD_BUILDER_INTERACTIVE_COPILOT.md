# Dashboard Builder Phase 6.4, 6.6 and 6.9 v70.137

## Scope

This release extends the existing Dashboard Builder without adding a new database sheet or changing project ownership rules.

### Phase 6.4: Interactive Dashboard

- Click a chart value to add a cross-filter.
- Remove one cross-filter or clear all active cross-filters.
- Open authenticated drill-down details from a widget.
- Search and export the authorized drill-down rows locally.
- Public dashboards keep drill-down disabled and continue to respect visible-column and export permissions.

### Phase 6.6: Templates and Smart Layout

- Templates: Executive Brief, Operations Monitor, Data Story, and Compact Overview.
- Smart layouts: balanced, focus, and compact.
- Responsive preview widths: desktop, tablet, and mobile.
- Templates replace only the in-memory Dashboard configuration. Nothing is saved until the normal save action succeeds.

### Phase 6.9: Private Dashboard Copilot

- Interprets common instructions for template, layout, theme, and filter selection.
- Runs entirely in the browser with deterministic local rules.
- Does not transmit prompt text, dataset rows, samples, or column names to an external service.
- Keeps the existing cloud AI suggestion action unchanged for users who explicitly choose that action.

## Compatibility and security

- Existing Dashboard JSON is normalized to `layoutVersion: 3` at runtime.
- No Google Sheet migration is required.
- Existing projects, datasets, versions, audit records, public tokens, PINs, expirations, and column whitelists remain valid.
- Authenticated drill-down uses only rows already loaded through the existing authorized project endpoint.
- Anonymous public drill-down is intentionally unavailable.

## Verification

```powershell
npm run test:dashboard-builder
node --check assets/js/dashboard-builder/app.js
node --check assets/js/dashboard-builder/renderer.js
node --check assets/js/dashboard-builder/viewer-ui.js
node --check assets/js/dashboard-builder/public-viewer.js
node --check sw.js
```

Manual checks:

1. Apply each template and smart-layout mode, then save and reopen.
2. Switch desktop, tablet, and mobile preview widths.
3. Click chart values and remove the generated filter chips.
4. Open an authenticated drill-down, search, and export CSV.
5. Open a public Dashboard and confirm cross-filter works while drill-down remains unavailable.
6. Run Private Copilot with several prompts and confirm no network request is created by that action.

Rollback instructions are in `docs/ROLLBACK_DASHBOARD_BUILDER_INTERACTIVE_COPILOT.md`.
