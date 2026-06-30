# Rollback v70.119 Schedule Action Stability

Scope:
- `index.html`: revert the v70.119 edits inside the `haos-v70-117-schedule-multilink-script` block:
  - `PATCH='v70.119-schedule-action-stability'`
  - `installScheduleActionGuardV7118()`
  - `installScheduleRenderDebounceV7119()`
  - the added calls to those installers in `boot()`
- `sw.js`: restore the cache name to the previous version.

Why this patch exists:
- The schedule UI has several legacy and current renderers that create the same view/edit/delete buttons.
- When render calls happen close together while the user is moving toward an action button, the buttons can flicker or become hard to click.
- This patch guards repeated edit/delete clicks and debounces schedule re-rendering while action buttons are hovered or focused.

Safe rollback:
1. Restore `index.html` and `sw.js` from the commit before v70.119.
2. Remove this rollback note if you want a clean docs folder.
3. Hard refresh the browser or unregister the service worker once.
4. No Google Apps Script or database rollback is needed.
