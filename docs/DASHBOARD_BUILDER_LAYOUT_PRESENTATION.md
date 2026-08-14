# Dashboard Builder Phase 6.2-6.3 v70.136

## Scope

This release improves Dashboard composition and presentation without changing the Dashboard database sheets.

### Phase 6.2

- Drag widgets from the dedicated grip handle.
- Resize widget width and height from the lower-right handle.
- Select HAOS, Executive, Civic, or Midnight theme.
- Select comfortable or compact density.
- Persist layout in the existing Dashboard config JSON.

### Phase 6.3

- Executive presentation theme and chart palette.
- Presentation Mode for authenticated and public viewers.
- Overview and one-widget-at-a-time navigation.
- Keyboard navigation and fullscreen support.
- New chart types: horizontal bar, area, radar, and polar area.

## Compatibility

- No Google Sheet migration is required.
- Old dashboards receive defaults at read/render time: `layoutVersion: 2`, `theme: "haos"`, `density: "comfortable"`, and a safe height based on widget type.
- New optional config values remain inside the existing JSON cell.
- Unsupported theme/density values are normalized before render and public sharing.
- Existing public tokens, column whitelists, PINs, expiry dates, and export permissions are unchanged.

## Verification

```powershell
npm run test:dashboard-builder
node --check assets/js/dashboard-builder/app.js
node --check assets/js/dashboard-builder/renderer.js
node --check assets/js/dashboard-builder/viewer-ui.js
node --check assets/js/dashboard-builder/public-viewer.js
node --check sw.js
```

Also verify on desktop and mobile:

1. Open an existing Dashboard and confirm it still renders.
2. Drag and resize a widget, save, reopen, and confirm order/size.
3. Switch all themes and both density modes.
4. Create each new chart type.
5. Enter Presentation Mode, navigate widgets, and exit.
6. Open a public Dashboard and repeat Presentation Mode checks.

Rollback instructions are in `docs/ROLLBACK_DASHBOARD_BUILDER_LAYOUT_PRESENTATION.md`.
