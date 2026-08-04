# Dashboard Builder Phase 6.1 - Viewer Refresh

Version: `v70.135`

## Scope

Phase 6.1 improves the authenticated read view and the public read-only view without changing Dashboard data, permissions, public tokens, PIN settings, or Google Sheets storage.

## Changes

- Shared viewer UI for authenticated and public dashboards.
- Compact dashboard header and operational color system.
- Summary strip for visible rows, total rows, widgets, and active filters.
- Collapsible filter panel with reset action and result count.
- Fullscreen presentation mode.
- Clearer KPI, chart, and table hierarchy.
- Responsive tablet/mobile layout and print-friendly output.
- Renderer event `haos:dashboard-rendered` for UI statistics.

## Data impact

None. `Code.gs.txt`, Dashboard sheets, public-link records, and permission rules are unchanged.

## Deployment

Deploy the web files through GitHub/Vercel. No Google Apps Script deployment is required for this phase.

## Verification

1. Open an authenticated Dashboard and confirm summary counts.
2. Expand filters, apply values, and confirm visible-row counts update.
3. Reset filters and confirm all rows return.
4. Open fullscreen mode and exit with the button or Escape.
5. Open a public link with and without PIN as configured.
6. Confirm CSV export and existing edit/public-share controls still work.
7. Check desktop, tablet, mobile, and print preview.
