# Rollback v70.110 Workspace Standalone

## Scope

This update separates Shared Workspace management from the legacy `index.html`
popup/table renderer by adding:

- `workspace.html`
- `assets/js/modules/workspace-standalone.js`
- `assets/js/modules/shared-workspace-standalone-entry.js`
- one script include in `index.html`
- cache entries in `sw.js`

No Google Sheet database migration and no Google Apps Script change are required.

## Rollback Steps

1. Remove this script include from `index.html`:

```html
<script src="assets/js/modules/shared-workspace-standalone-entry.js?v=70110"></script>
```

2. Remove these entries from `sw.js`:

```js
'/workspace.html'
'/assets/js/modules/workspace-standalone.js?v=70110'
'/assets/js/modules/shared-workspace-standalone-entry.js?v=70110'
```

3. Change `CACHE_NAME` in `sw.js` to a new rollback cache name, for example:

```js
const CACHE_NAME = 'haos-v70-110-workspace-standalone-rollback';
```

4. Optional cleanup after confirming rollback:

- Delete `workspace.html`
- Delete `assets/js/modules/workspace-standalone.js`
- Delete `assets/js/modules/shared-workspace-standalone-entry.js`

## Database Rollback

No database rollback is needed because this phase only changes the frontend
entry point and uses the existing Apps Script functions:

- `getMySharedWorkspaces`
- `getPublicWorkspace`
- `createSharedWorkspace`
- `createGoogleSheetWorkspace`
- `createGoogleFormWorkspace`
- `updateSharedWorkspaceRows`
- `updateSharedWorkspaceConfigV737`
- `deleteSharedWorkspace`

Existing public workspace links remain unchanged.
