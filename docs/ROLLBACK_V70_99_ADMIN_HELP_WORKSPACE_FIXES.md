# Rollback v70.99 Admin Help + Workspace Fixes

Patch: `haos-v70-99-admin-help-workspace-fixes`

## Scope

This patch adds a final safety layer for two issues:

- Help Center / Live Chat contact settings popup: prevents the old table renderer from reopening or overwriting the stable renderer.
- Shared Workspace edit action: resolves the clicked workspace from the row/id before opening the edit popup, so a stale `currentWorkspace` cannot open the wrong workspace.

It also bumps the service worker cache name to:

```js
haos-v70-99-admin-help-workspace-fixes
```

## Files Changed

- `index.html`
- `sw.js`

## Rollback Steps

1. In `index.html`, remove these blocks near the end of the file:

```html
<style id="haos-v70-99-admin-help-workspace-fixes-style">
...
</style>
<script id="haos-v70-99-admin-help-workspace-fixes-script">
...
</script>
```

2. In `sw.js`, change the cache name back to the previous value:

```js
const CACHE_NAME = 'haos-v70-98-help-live-chat-stable-render';
```

3. Redeploy to GitHub/Vercel and hard refresh the browser once, or unregister the old service worker if the browser still serves cached assets.

## Verification After Rollback

- Super Admin > Help Center / Live Chat opens the previous settings popup behavior.
- Shared Workspace edit buttons return to the previous edit flow.
- `scripts/check_inline_scripts.mjs index.html` passes.
- `node --check sw.js` passes.
